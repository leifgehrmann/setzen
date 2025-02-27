![SETZEN](setzen.png)

𝐒𝐄𝐓𝐙𝐄𝐍 is a multiplayer collaborative canvas where you place tiles on a globe
consisting of a million 'trixels'. It is a remix of Reddit’s [April Fools experiment r/place](https://en.wikipedia.org/wiki/R/place).

You can find an archived demo at [setzen.leifgehrmann.com](https://setzen.leifgehrmann.com/), which no longer is multiplayer, but the interactivity still works.

# Server

SETZEN exclusively uses the AWS Serverless Application Model.

## Deployment

In this guide we use [AWS SAM CLI] to deploy the application.

### Installing the CLI

Amazon has their own guide for [installing the AWS SAM CLI].

But if you have Docker installed, you can use the `Dockerfile` without
installing AWS SAM CLI on your host machine.

```
$ cd server
$ make build
```

Once the image has built, you will be able to start a shell using the following commands.

```
$ make aws-shell
```

### Credentials

Once you are in the interactive shell, you will need to configure aws-cli so
that it has the correct credentials. These instructions will guide you on how
to create a user with programmatic access. **Once the application is deployed,
it's recommend to revoke the credentials.** Basically, anyone with these
credentials could nuke your account, so be very careful. (I don't know really
if this is how you are _supposed_ to use CloudFormation, but it really does
not feel safe. 😅)

1. In the AWS Console, navigate to IAM and create a new user:
   https://us-east-1.console.aws.amazon.com/iam/home#/users$new?step=details
2. For the "Details" step:
    * Enter a user name. (Example: `setzen`)
    * Select "Access key - Programmatic access" as the AWS access type.
    * Proceed to "Permissions" step.
3. For the Permissions step:
    * Click "Create group":
        * Enter a group name. (Example: `Setzen`)
        * Under policies, check the following permission policies:
           * "IAMFullAccess"
           * "AmazonS3FullAccess"
           * "AmazonDynamoDBFullAccess"
           * "AmazonAPIGatewayAdministrator"
           * "AWSCloudFormationFullAccess"
           * "AWSLambda_FullAccess"
        * Click "Create group".
    * Proceed to the "Tags" step.
4. Optionally add tags to help with remembering details about this IAM user.
   Proceed to the "Review" step.
5. Confirm the details and proceed to the next step.
6. Make sure to copy the "Access key ID" and the "Secret access key" and
   store it in a secure location. After this step, if you have forgotten
   to copy the credentials you will need to delete and recreate the user.

With the credentials, you can now configure by running `aws configure`
and supplying the credentials in the prompts.

```
$ aws configure
AWS Access Key ID [None]: your_access_key_id
AWS Secret Access Key [None]: your_secret_access_key
Default region name [None]: 
Default output format [None]: 
```

### Guided deploy

Finally, you can deploy the application using `sam deploy`.

```
$ sam deploy --guided
```

The first time you deploy, you will be prompted for some deployment
configurations.

* Stack Name (Example: `setzen-websockets-app`)
* AWS Region
* Parameters (The name of the dynamoDB tables)
* Confirm changes before deploy (Y is recommended)
* Allow SAM CLI IAM role creation (Y is recommended)
* Disable rollback (N is recommended)
* Save arguments to configuration file (Y is recommended)
* SAM configuration file
* SAM configuration environment

Once complete, you should see in the output the deployed WebSocketURI.
Keep a note of this for later when setting up the client.

### Testing the websocket

```
$ cd test-wscast
$ npm install
$ npx wscat -c wss://{YOUR-API-ID}.execute-api.{YOUR-REGION}.amazonaws.com/Prod
> { "action": "sendmessage", "data": {"type": "readChunkInfo" } }
< {"type":"queue","data":{"positions":[],"colorIds":[],"times":[]}}
```

# Client

In a console, change to the `client` directory.

With NPM installed, run the following commands:

**Install dependencies**

```
$ npm install
```

**To configure**

`SETZEN_WEBSOCKET_URL` is the only variable that must be defined for the
application to function. The rest of the details are merely presentational,
but useful if you want to customise the info page.

```
$ export SETZEN_WEBSOCKET_URL='wss://xxxxxxxxxx.execute-api.xx-xxx-x.amazonaws.com/Prod'
$ export SETZEN_WEBAPP_HOST='example.com'
$ export SETZEN_CONTACT_EMAIL='admin@example.com'
$ export SETZEN_CONTACT_URL='https://example.com/admin'
$ export SETZEN_CONTACT_ISSUES_URL='https://example.com/setzen/issues'
$ export SETZEN_CONTACT_PROJECT_URL='https://example.com/setzen'
```

To use the app in an archived mode, set the variables as:

```
$ export SETZEN_ARCHIVE_URL='https://example.com/archive/'
```

**To view**

```
$ npm run build
$ npm run preview
```

**To develop**

```
$ npm run dev
```

**To develop with archived mode**

```
$ export SETZEN_ARCHIVE_URL='http://localhost:5173/archive-2025-02-02/'
$ npm run dev
```

# Attribution

Websocket code originally based on [simple-websockets-chat-app].

[simple-websockets-chat-app]: https://github.com/aws-samples/simple-websockets-chat-app
[AWS SAM CLI]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-reference.html
[installing the AWS SAM CLI]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html
[correct credentials]: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-getting-started-set-up-credentials.html
