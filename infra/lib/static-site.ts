import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/core');
import targets = require('@aws-cdk/aws-route53-targets/lib');
import {Construct, Duration} from '@aws-cdk/core';
import {LambdaEdgeEventType} from "@aws-cdk/aws-cloudfront";
import {Code, Function, Runtime} from '@aws-cdk/aws-lambda';
import {CompositePrincipal, ManagedPolicy, Role, ServicePrincipal} from "@aws-cdk/aws-iam";
import acm = require('@aws-cdk/aws-certificatemanager');

export interface StaticSiteProps {
  domainName: string;
  siteSubDomain: string;
  excludeCDN: boolean;
  reusableCDN: boolean;
}


export class StaticSite extends cdk.Stack {
  constructor(parent: Construct, name: string, stackProps: cdk.StackProps, staticSiteProps: StaticSiteProps) {
    super(parent, name, stackProps);

    let siteDomain = staticSiteProps.domainName;
    if (staticSiteProps.siteSubDomain) {
      siteDomain = staticSiteProps.siteSubDomain + '.' + siteDomain;
    }
    siteDomain = siteDomain.toLowerCase()

    // Content bucket
    const siteBucket = new s3.Bucket(this, siteDomain + '-SiteBucket', {
      bucketName: siteDomain,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // index for SPA, error for non-SPA,
      publicReadAccess: true
    });
    new cdk.CfnOutput(this, 'Bucket', { value: siteBucket.bucketName });

    new cdk.CfnOutput(this, 'BucketWebsiteDomainName', { value: siteBucket.bucketWebsiteDomainName});

    if (!staticSiteProps.excludeCDN) {

      new cdk.CfnOutput(this, 'Site', { value: 'https://' + siteDomain });

      const zone = route53.HostedZone.fromLookup(this, 'Zone', { domainName: staticSiteProps.domainName });

      let behavior = {isDefaultBehavior: true}

      if (staticSiteProps.reusableCDN) {

        const modifyOriginRequestFunction = new Function(this, 'ModifyOriginRequest', {
          code: Code.fromInline(
          `
                'use strict';

                exports.handler = (event, context, callback) => {
                    const request = event.Records[0].cf.request;
                    const headers = request.headers;
                    const origin = request.origin;
                    console.log('URI: ' + request.uri);
                    if (headers.cookie) {
                        for (let i = 0; i < headers.cookie.length; i++) {
                            if (headers.cookie[i].value.includes('origin')) {
                                console.log('Origin cookie found: ' + headers.cookie[i].value);
                                let target = headers.cookie[i].value.replace('origin=', '') + ".${staticSiteProps.domainName}.s3.amazonaws.com"
                                headers['host'] = [{key: 'host',          value: target}];
                                origin.s3.domainName = target;
                                console.log('Modified target: ' + target);
                                break;
                            }
                        }
                    }
                
                    callback(null, request);
                };

               `),
          handler: 'index.handler',
          runtime: Runtime.NODEJS_12_X,
          role: new Role(this, 'LambdaEdgeRole', {
            assumedBy: new CompositePrincipal(
                new ServicePrincipal('lambda.amazonaws.com'),
                new ServicePrincipal('edgelambda.amazonaws.com'),
            ),
            managedPolicies: [
              ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")
            ],
          })
        });

        behavior = {
          isDefaultBehavior: true,
          // @ts-ignore
          defaultTtl: Duration.seconds(0),
          forwardedValues: {
            cookies: {
              forward: 'whitelist',
              whitelistedNames: ['origin']
            },
            queryString: false
          },
          lambdaFunctionAssociations: [
            {
              eventType: LambdaEdgeEventType.ORIGIN_REQUEST,
              lambdaFunction: {
                edgeArn: modifyOriginRequestFunction.currentVersion.functionArn
              }
            }
          ]
        }

      }

      // TLS certificate
      const certificateArn = new acm.DnsValidatedCertificate(this, siteDomain + '-SiteCertificate', {
        domainName: siteDomain,
        hostedZone: zone,
        region: 'us-east-1', // Cloudfront only checks this region for certificates.
      }).certificateArn;
      new cdk.CfnOutput(this, 'Certificate', { value: certificateArn });

      // CloudFront distribution that provides HTTPS
      const distribution = new cloudfront.CloudFrontWebDistribution(this, siteDomain + '-SiteDistribution', {
        aliasConfiguration: {
          acmCertRef: certificateArn,
          names: [ siteDomain ],
          sslMethod: cloudfront.SSLMethod.SNI,
          securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2019,
        },
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: siteBucket
            },
            behaviors : [ behavior ],
          }
        ],
        //for SPA apps with routing
        errorConfigurations: [
          {
            errorCachingMinTtl: 0,
            errorCode: 403,
            responseCode: 200,
            responsePagePath: '/index.html'
          }
        ]
      });
      new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

      new cdk.CfnOutput(this, 'DistributionDomainName', { value: distribution.distributionDomainName });

      // Route53 alias record for the CloudFront distribution
      new route53.ARecord(this, siteDomain + '-SiteAliasRecord', {
        recordName: siteDomain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone
      });
    }

  }
}
