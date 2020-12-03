# 腾讯云 API 网关组件

## 简介

通过 API 网关组件，可以快速，方便的创建，配置和管理腾讯云的 API 网关产品。

快速开始：

1. [安装](#1-安装)
2. [配置](#2-配置)
3. [部署](#3-部署)
4. [查看状态](#4-查看状态)
5. [移除](#5-移除)

### 1. 安装

通过 npm 安装最新版本的 Serverless Framework

```bash
$ npm install -g serverless
```

### 2. 配置

本地创建 `serverless.yml` 文件，在其中进行如下配置

```bash
$ touch serverless.yml
```

```yml
# serverless.yml

org: orgDemo
app: appDemo
stage: dev
component: apigateway
name: apigwDemo

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

点此查看[全量配置及配置说明](https://github.com/serverless-components/tencent-apigateway/tree/master/docs/configure.md)

### 3. 部署

如您的账号未[登陆](https://cloud.tencent.com/login)或[注册](https://cloud.tencent.com/register)腾讯云，您可以直接通过`微信`扫描命令行中的二维码进行授权登陆和注册。

通过`sls`命令进行部署，并可以添加`--debug`参数查看部署过程中的信息

```bash
$ sls deploy
```

### 4. 查看状态

在`serverless.yml`文件所在的目录下，通过如下命令查看部署状态：

```
$ serverless info
```

### 5. 移除

通过以下命令移除部署的 API 网关

```bash
$ sls remove
```

### 账号配置（可选）

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

```bash
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存

如果没有腾讯云账号，可以在此[注册新账号](https://cloud.tencent.com/register)。

如果已有腾讯云账号，可以在[API 密钥管理](https://console.cloud.tencent.com/cam/capi)中获取 `SecretId` 和`SecretKey`.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

## License

MIT License

Copyright (c) 2020 Tencent Cloud, Inc.
