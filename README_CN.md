# 腾讯云API网关组件

## 简介
该组件是serverless-tencent组件库中的基础组件之一。通过API网关组件，可以快速，方便的创建，配置和管理腾讯云的API网关产品。

## 快速开始
&nbsp;

通过API网关组件，对一个API服务/接口进行完整的创建，配置，部署和删除等操作。支持命令如下：

1. [安装](#1-安装)
2. [创建](#2-创建)
3. [配置](#3-配置)
4. [部署](#4-部署)
5. [移除](#5-移除)

&nbsp;

### 1. 安装

通过npm安装serverless

```console
$ npm install -g serverless
```

### 2. 创建

本地创建 `serverless.yml` 和 `.env` 两个文件

```console
$ touch serverless.yml
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的APPID，SecretId和SecretKey信息并保存

如果没有腾讯云账号，可以在此[注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在[API密钥管理
](https://console.cloud.tencent.com/cam/capi)中获取`APPID`, `SecretId` 和`SecretKey`.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
TENCENT_APP_ID=123
```
### 3. 配置

在serverless.yml中进行如下配置

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

### 4. 部署

通过如下命令进行部署，并查看部署过程中的信息
```console
$ serverless --debug
```

### 5. 移除

通过以下命令移除部署的API网关
```console
$ serverless remove --debug
```

### 测试案例
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
### 还支持哪些组件？

可以在 [Serverless Components](https://github.com/serverless/components) repo 中查询更多组件的信息。
