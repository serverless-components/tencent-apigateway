# tencent-apigateway

[简体中文](./README.md) ｜ English

- [请点击这里查看中文版部署文档](./README.md)

Easily provision Tencent API Gateway using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)
5. [Remove](#5-Remove)

### 1. Install

Install the Serverless Framework:

```bash
$ npm install -g serverless
```

### 2. Create

Just create the following simple boilerplate:

```bash
$ touch serverless.yml
$ touch .env           # your Tencent api keys
```

Add the access keys of a [Tencent CAM Role](https://console.cloud.tencent.com/cam/capi) with `AdministratorAccess` in the `.env` file, using this format:

```
# .env
TENCENT_SECRET_ID=XXX
TENCENT_SECRET_KEY=XXX
```

- If you don't have a Tencent Cloud account, you could [sign up](https://intl.cloud.tencent.com/register) first.

### 3. Configure

```yml
# serverless.yml

component: apigateway # (required) component name, this one is apigateway
name: apigwDemo # (required) instance name
org: orgDemo # (optional) for record organizational info, default value is your tencent cloud account appid
app: appDemo # (optional) this application name
stage: dev # (optional) for different env info, default: dev

inputs:
  region: ap-guangzhou
  protocols:
    - http
    - https
  serviceName: serverless
  environment: release
  endpoints:
    - path: /
      protocol: HTTP
      method: GET
      apiName: index
      function:
        functionName: myFunction
```

- [Click here to view the configuration document](./docs/configure.md)

### 4. Deploy

```bash
$ sls deploy
```

&nbsp;

### 5. Remove

```text
$ sls remove
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
