import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Infra from '../lib/static-site';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Infra.StaticSite(app, 'MyTestStack',
        {},
        {
            domainName: 'test.com',
            siteSubDomain: 'www',
            excludeCDN: false,
            reusableCDN: false
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
