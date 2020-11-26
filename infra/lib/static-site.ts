import cloudfront = require('@aws-cdk/aws-cloudfront');
import route53 = require('@aws-cdk/aws-route53');
import s3 = require('@aws-cdk/aws-s3');
import acm = require('@aws-cdk/aws-certificatemanager');
import cdk = require('@aws-cdk/core');
import targets = require('@aws-cdk/aws-route53-targets/lib');
import { Construct } from '@aws-cdk/core';

export interface StaticSiteProps {
  domainName: string;
  siteSubDomain: string;
  excludeCDN: boolean;
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

      // TLS certificate
      const certificateArn = new acm.DnsValidatedCertificate(this, siteDomain + '-SiteCertificate', {
        domainName: siteDomain,
        hostedZone: zone,
        region: 'us-east-1', // Cloudfront only checks this region for certificates.
      }).certificateArn;
      new cdk.CfnOutput(this, 'Certificate', { value: certificateArn });

      // CloudFront distribution that provides HTTPS
      const distribution = new cloudfront.CloudFrontWebDistribution(this, siteDomain + '- SiteDistribution', {
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
            behaviors : [ {isDefaultBehavior: true}],
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

      // Route53 alias record for the CloudFront distribution
      new route53.ARecord(this, siteDomain + '-SiteAliasRecord', {
        recordName: siteDomain,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
        zone
      });
    }

  }
}
