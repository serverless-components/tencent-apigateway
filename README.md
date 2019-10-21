# tencent-api-gateway

Easily provision Tencent API Gateway using [Serverless Components](https://github.com/serverless/components).

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create the following simple boilerplate:

```shell
$ touch serverless.yml 
$ touch .env           # your Tencent api keys
```

```
# .env
TENCENT_SECRET_ID=XXX
TENCENT_SECRET_KEY=XXX
```

### 3. Configure

```yml
# serverless.yml

restApi:
  component: "@serverless/tencent-api-gateway"
  inputs:
    Region: ap-guangzhou # is required,default value is ap-guangzhou
    description: Serverless REST API 
    serviceName: serviceName
    serviceDesc: This is a service description
    environment: release # is required,default value is release
    authRequired: TRUE # is required,default value is TRUE
    enableCORS: TRUE # is required,default value is TRUE
    serviceTimeout: 15 # is required,default value is 15
    protocol: HTTP # is required,default value is HTTP
    serviceScf:
      IsIntegratedResponse: TRUE # is required,default value is TRUEs
      FunctionQualifier: $LATEST # is required,default value is $LATEST
      FunctionName: aaa # is required
      FunctionNamespace: aaa # is required
    requestConfig: # is required
      path: /frontend/path
      method: GET

```

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### Test
```text
tongtingting:tencent-api-gateway tongtingting$ sls

restApi: 
    protocol:      HTTP
    serviceId:     service-********
    subDomain:     service-********-**********.ap-guangzhou.apigateway.myqcloud.com
    requestConfig: 
      path:   /frontend/path
      method: GET
    identity: 
      secretIds: 
        - AKID************************

  16s › restApi › done
  
tongtingting:tencent-api-gateway tongtingting$ sls remove

  19s › restApi › done

```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
