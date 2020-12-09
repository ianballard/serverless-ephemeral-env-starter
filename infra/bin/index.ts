import cdk = require('@aws-cdk/core');
import { StaticSite } from '../lib/static-site';

const env = {
    // Stack must be in us-east-1, because the ACM certificate for a
    // global CloudFront distribution must be requested in us-east-1.
    region: 'us-east-1',
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
}

/**
 * This stack relies on getting the domain name from CDK context.
 * Use 'cdk synth -c domain=mystaticsite.com -c subdomain=www'
 * Or add the following to cdk.json:
 * {
 *   "context": {
 *     "domain": "mystaticsite.com",
 *     "subdomain": "www"
 *   }
 * }
 **/
class StaticSiteStack extends cdk.Stack {
    constructor(parent: cdk.App, parentStackName: string, props: cdk.StackProps) {
        super(parent, parentStackName, props);
        const domainName = this.node.tryGetContext('domain');
        const siteSubDomain = this.node.tryGetContext('subdomain')
        let stackName = `${domainName}`;
        if (siteSubDomain) {
            stackName = `${siteSubDomain}-${stackName}`;
        }
        stackName = stackName.replace(/\./g,'-') + '-' + parentStackName
        const stackProps = {
            stackName: stackName,
            env: env
        }
        new StaticSite(this, stackName, stackProps,{
            domainName,
            siteSubDomain,
            excludeCDN: this.node.tryGetContext('excludeCDN') || false,
            reusableCDN: this.node.tryGetContext('reusableCDN') || false
        });
    }
}

const app = new cdk.App();

new StaticSiteStack(app, 'StaticSite', { env: env});

app.synth();
