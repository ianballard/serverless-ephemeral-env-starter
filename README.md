# serverless-ephemeral-env-starter

### Use this repo to set up ephemeral testing environments for your AWS serverless app
**Note**: This repo is meant for serverless apps deployed in AWS only.

This repo is a template that you can use to enhance your development lifecycle. The project is a React frontend, 
with an [aws sam](https://aws.amazon.com/serverless/sam/)
Python 3 backend but is kept as bare-bones as possible; it is meant to be fairly interchangeable. 
- **Note**: you can swap out React, and Python if you wish. ie the frontend could just as easily be Angular, 
and the backend Node.js.

At the core of this project is a fairly simple CDK app influenced by this aws-cdk
[static-site](https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/static-site) app and a few
[github actions](https://docs.github.com/en/free-pro-team@latest/actions).

The key github action workflow is as follows:
1. A pull request is opened
    - Deploys a new ephemeral environment
2. A pull request is synchronized
    - Deploys to the existing ephemeral environment
3. A pull request is merged
    - Deletes the ephemeral environment
    - Deploys to master

### What is an ephemeral environment?
An ephemeral environment is just a short-lived environment used for testing features independently before merging them 
into a longer-lived branch/ environment (develop, master, etc.).

### Why use ephemeral environments?
Ephemeral environments allow projects achieve a higher rates of agility as many features can be tested simultaneously 
without having to first merge the features into a long-lived branch. When code is merged into a long-lived branch, you 
are no longer able to *easily* pull individual features out if priorities change, the feature is not working, or any other 
reason; the possibilities for this are endless. 

### Live Sites
 - [master](http://serverless-ephemeral-env-starter.s3-website-us-east-1.amazonaws.com/)
 - [feature/A-1](http://a-1.serverless-ephemeral-env-starter.s3-website-us-east-1.amazonaws.com/)

### Prerequisites
1. [aws account](https://aws.amazon.com/free)
    - Take note of your access and secret keys. You will need them later.
2. [aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
3. [configure aws-cli](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)
4. [aws-cdk](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html)
5. [aws sam](https://aws.amazon.com/serverless/sam/)
6. [npm](https://www.npmjs.com/get-npm)


## How to use this project
1. Click the "Use this template" button
2. Enter the Repository name of your choosing. 
3. Clone your new repo locally
4. Update your Repository secrets
    - Navigate to your repo on github and select Settings > Secrets > New repository secret 
    - AWS_ACCESS_KEY_ID - your aws account access key id
    - AWS_SECRET_ACCESS_KEY - your secret access key
    - DOMAIN_NAME - your website name 
    - BASE_STACK_NAME - your website name but replace all '.' with '-'.
    This will be used for [cloud formation stacks](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacks.html) that will 
    allow us to easily build, update, and destroy ephemeral environments.
    - SAM_BUCKET - the bucket aws sam will upload its templates to
        - If this is your first time using sam, you will need to 
        [create a bucket](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/create-bucket.html) first
        - Edit the bucket policy. Go to the bucket > Permissions > Bucket Policy > Edit:
        ```
        {
            "Version": "2008-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "serverlessrepo.amazonaws.com"
                    },
                    "Action": "s3:GetObject",
                    "Resource": "<your sam bucket arn>/*"
                }
            ]
        }
        ```
    - EXCLUDE_EPHEMERAL_CDN - set this to true if you do not want to deploy your ephemeral site to cloud front. 
    Otherwise, do not add it to the secrets.
        - **Note**  deploying to cloudfront has many dependencies that require validation and can increase deployment 
        times to upwards of 30 minutes, and in some cases can cause timeouts.
    - REUSABLE_CDN - set this to true if you do want to reuse the same cloudfront distribution for all ephemeral environments.
      Otherwise, do not add it to the secrets. 
        - **Note**  Setting this will create a Lambda@Edge function that is run at each cloudfront edge location upon 
          each origin(s3 bucket hosting the frontend code) request and will route to the origin specified by a cookie 
          called "origin". In other words, set the origin cookie in your browser to be routed to the origin of your 
          choosing. Note, you may need to clear your browser cache each time you change the cookie's value.

5. Create your main Static Site Stack (this should be a one time operation)
    - Navigate to ./infra
    - run `npm run build`
    - If you have a registered domain and wish to deploy to cloudfront (if you want to reuse the same cloudfront 
      distribution, add the `-c reusableCDN=true` to the following commands).
        - If wish to deploy to 
        [cloudfront](https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-https-requests-s3/) you need 
        to have this registered with a domain registrar like 
        ([route 53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html)).
        - run `cdk diff -c domain=<your website domain>`
        - run `cdk deploy -c domain=<your website domain> --all`
    - If you do not have a registered domain or do not wish to deploy to cloudfront 
    (this will only use [s3 site hosting](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html))
        - run `cdk diff -c domain=<your website domain> -c excludeCDN=true`
        - run `cdk deploy -c domain=<your website domain> -c excludeCDN=true --all`
6. Build and deploy your main backend (master)
    - Check out master locally
    - Navigate to ./backend/app
    - On line 17, change "hello world" to any message you want
    - Push this change to the remote master branch. This will kick off the Main CI/CD github action.
        - You can view the status of your action in your project repo and select the Actions tab.
    - After this completes your "prod" environment is up and running.
7. Create a feature branch off of master. You can use gitflow naming conventions or just any old name you want.
    - Navigate to ./backend/app
    - Once again, on line 17, change the message.
    - Push this change to the remote feature branch. 
    - Open a pull request for this branch to be merged into master. 
        - This will kick off the Create Ephemeral Env CI/CD github action.
        - You can view the status of your action in your project repo and select the Actions tab.
        - If you have EXCLUDE_EPHEMERAL_CDN set to true in your repository secrets, this process can take 3-5 minutes. 
        After it is done your ephemeral environment is up and running. You can navigate to it by entering 
        http://{{branch name (lowercase & exclude gitflow prefix)}}.{{your domain name}}.s3-website-us-east-1.amazonaws.com
        in your browser.
            - EX: branch name= feature/A-1 
                - *http://a-1.serverless-ephemeral-env-starter.s3-website-us-east-1.amazonaws.com*
            - You can also find it by going to the AWS console > CloudFormation > {{your base name}}-StaticSite stack > BucketWebsiteDomainName value
        - If you don't have EXCLUDE_EPHEMERAL_CDN set to true in your repository secrets, this process can take upwards 
        of 30+ minutes. After it is done there may be some DNS propagation that needs to occur before you can see your site live.
        Eventually, you can see it by entering your ephemeral site in your browser.
    - Make sure the message you changed in the backend is displayed on your site.
8. Make another change to the backend message on line 17 in ./backend/app and push it to the remote branch
    - This will kick off the Update Ephemeral Env CI/CD github action.
    - You can view the status of your action in your project repo and select the Actions tab.
    - After it is done your ephemeral environment you can make sure the message you changed in the backend is 
    displayed on your ephemeral site.
9. Merge the pull request into master
    - This will kick off the Delete Ephemeral Env CI/CD github action.
    - This will also kick off the Main CI/CD github action and deploy the branch to prod.
    - Make sure the message you changed in the backend is displayed on your prod site.
    
