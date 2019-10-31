# tencent-apigateway

Easily provision Tencent API Gateway using [Serverless Components](https://github.com/serverless/components).

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)
5. [Remove](#5-Remove)

### 1. Install

Install the Serverless Framework:
```shell
$ npm install -g serverless
```

### 2. Create

Just create the following simple boilerplate:

```shell
$ touch serverless.yml 
$ touch .env           # your Tencent api keys
```

Add the access keys of a [Tencent CAM Role](https://console.cloud.tencent.com/cam/capi) with `AdministratorAccess` in the `.env` file, using this format: 

```
# .env
TENCENT_SECRET_ID=XXX
TENCENT_SECRET_KEY=XXX
TENCENT_APP_ID=123
```
* If you don't have a Tencent Cloud account, you could [sign up](https://intl.cloud.tencent.com/register) first. 

### 3. Configure

```yml
# serverless.yml

restApi:
  component: "@serverless/tencent-apigateway"
  inputs:
    region: ap-shanghai
    protocol: http
    serviceName: serverless
    environment: release
    endpoints:
      - path: /users
        method: POST
        function:
          functionName: myFunction
```

* [Click here to view the configuration document](https://github.com/serverless-tencent/tencent-apigateway/blob/master/docs/configure.md)


### 4. Deploy

```shell
$ sls --debug

  DEBUG ─ Resolving the template's static variables.
  DEBUG ─ Collecting components from the template.
  DEBUG ─ Downloading any NPM components found in the template.
  DEBUG ─ Analyzing the template's components dependencies.
  DEBUG ─ Creating the template's components graph.
  DEBUG ─ Syncing template state.
  DEBUG ─ Executing the template's components graph.
  DEBUG ─ Starting API-Gateway deployment with name restApi in the ap-shanghai region
  DEBUG ─ Service with ID service-g1ihx7c7 created.
  DEBUG ─ API with id api-4dv8r7wg created.
  DEBUG ─ Deploying service with id service-g1ihx7c7.
  DEBUG ─ Deployment successful for the api named restApi in the ap-shanghai region.

  restApi: 
    protocol:    http
    subDomain:   service-g1ihx7c7-1300415943.ap-shanghai.apigateway.myqcloud.com
    environment: release
    region:      ap-shanghai
    serviceId:   service-g1ihx7c7
    apis: 
      - 
        path:   /users
        method: POST
        apiId:  api-4dv8r7wg

  24s › restApi › done

```

&nbsp;

### 5. Remove
```text
$ sls remove --debug

  DEBUG ─ Flushing template state and removing all components.
  DEBUG ─ Removing any previously deployed API. api-4dv8r7wg
  DEBUG ─ Removing any previously deployed service. service-g1ihx7c7

  13s › restApi › done

```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
