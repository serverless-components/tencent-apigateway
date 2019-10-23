# tencent-apigateway

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
  component: "@serverless/tencent-apigateway"
  inputs:

    serviceId: service-8dsikiq6 
    # default ap-guangzhou
    region: ap-shanghai  
    # http | https | http&https
    protocol: http 
    # Up to 50 characters，(a-z,A-Z,0-9,_)
    serviceName: sls
    description: the sls service 
    environment: release 
    endpoints:
      - path: /users  # required
        method: POST  # required
        function:
          functionName: aaa # required
      - path: /test
        apiId: api-id
        method: GET
        description: Serverless REST API # api apiDesc
        enableCORS: TRUE 
        function:
          isIntegratedResponse: TRUE 
          functionQualifier: $LATEST 
          functionName: fist # required
        usagePlan:
          usagePlanId: 1111
          usagePlanName: slscmp
          usagePlanDesc: sls create
          maxRequestNum: 1000
        auth:
          serviceTimeout: 15
          secretName: secret  # required
          # secretIds:
          #   - AKIDNSdvdFcJ8GJ9th6qeZH0ll8r7dE6HHaSuchJ


```

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### Test
```text
tongtingting:tencent-apigateway tongtingting$ sls

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
