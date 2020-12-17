# 配置文档

## 完整配置

```yml
# serverless.yml

org: orgDemo #（可选） 用于记录组织信息，默认值为您的腾讯云账户 appid
app: appDemo #（可选） 该应用名称
stage: dev #（可选） 用于区分环境信息，默认值为 dev
component: apigateway # (必填) 组件名称，此处为 apigateway
name: apigwDemo # (必填) 实例名称

inputs:
  serviceId: service-8dsikiq6
  region: ap-shanghai
  protocols:
    - http
    - https
  serviceName: serverless
  serviceDesc: the serverless service
  environment: release
  netTypes:
    - OUTER
    - INNER
  customDomains:
    - domain: abc.com
      # 如要添加https，需先行在腾讯云-SSL证书进行认证获取cettificateId
      certificateId: abcdefg
      # 如要设置自定义路径映射，请设置为 false
      isDefaultMapping: false
      pathMappingSet:
        - path: /
          environment: release
      protocols:
        - http
        - https
  endpoints:
    # 前端类型: WEBSOCKET, 后端类型: SCF
    - path: /
      method: GET
      protocol: WEBSOCKET
      function:
        # 前端类型为WEBSOCKET且后端为SCF时, transportFunctionName 为是
        transportFunctionName: myFunction
        registerFunctionName: myFunction
        cleanupFunctionName: myFunction
    # 前端类型: WEBSOCKET, 后端类型: HTTP
    - path: /ws
      protocol: WEBSOCKET
      apiName: 'test-ws'
      method: GET
      serviceType: WEBSOCKET
      serviceConfig:
        url: 'ws://www.test.com'
        path: /
        method: GET
    # 前端类型: HTTP, 后端类型: SCF
    - path: /test/{abc}/{cde}
      apiId: api-id
      apiDesc: Serverless REST API
      method: GET
      enableCORS: true
      responseType: HTML
      serviceTimeout: 10
      param:
        - name: abc
          position: PATH
          required: 'TRUE'
          type: string
          defaultValue: abc
          desc: mytest
        - name: cde
          position: PATH
          required: 'TRUE'
          type: string
          defaultValue: abc
          desc: mytest
      function:
        isIntegratedResponse: true
        functionQualifier: $LATEST
        functionName: myFunction
      usagePlan:
        usagePlanId: 1111
        usagePlanName: slscmp
        usagePlanDesc: sls create
        maxRequestNum: -1
        maxRequestNumPreSec: 1000
      auth:
        secretName: secret
        secretIds:
          - xxx
    # 前端类型: HTTP, 后端类型: MOCK
    - path: /mo
      protocol: HTTP
      method: GET
      apiName: 'mock-api'
      serviceType: MOCK
      serviceMockReturnMessage: 'mock response content'
    # 前端类型: HTTP, 后端类型: HTTP
    - path: /rest
      protocol: HTTP
      apiName: 'test-http'
      method: GET
      serviceType: HTTP
      serviceConfig:
        url: 'http://www.test.com'
        path: /test
        method: GET
    # 下面两个为互相关联的 oauth2.0 接口示例
    # 参考文档 https://cloud.tencent.com/document/product/628/38393
    - path: '/oauth'
      protocol: 'HTTP'
      method: 'GET'
      apiName: 'oauthapi'
      authType: 'OAUTH'
      businessType: 'OAUTH'
      serviceType: 'HTTP'
      serviceConfig:
        method: 'GET'
        path: '/check'
        url: 'http://10.64.47.103:9090'
      oauthConfig:
        loginRedirectUrl: 'http://10.64.47.103:9090/code'
        publicKey: '{"e":"AQAB","kty":"RSA","n":"dkdd"}'
        tokenLocation: 'method.req.header.authorization'
        # // tokenLocation: 'method.req.header.cookie',
    - path: '/oauthwork'
      protocol: 'HTTP'
      method: 'GET'
      apiName: 'business'
      authType: 'OAUTH'
      businessType: 'NORMAL'
      authRelationApi:
        path: '/oauth'
        method: 'GET'
      serviceType: 'MOCK'
      serviceMockReturnMessage: 'helloworld'
```

## 配置说明

### 主要函数说明

| 参数          | 必选 |            参数类型             |     默认值     | 描述                                                                       |
| ------------- | :--: | :-----------------------------: | :------------: | :------------------------------------------------------------------------- |
| serviceId     |  否  |             string              |                | 网关服务 ID                                                                |
| region        |  是  |             string              | `ap-guangzhou` | 服务的部署区域                                                             |
| protocols     |  是  |            string[]             |   `['http']`   | 服务的前端请求类型，http 和 https                                          |
| serviceName   |  否  |             string              |  `serverless`  | 用户自定义的服务名称。 如果该参数未传递，则由系统自动生成一个唯一名称      |
| netTypes      |  否  |            string[]             |  `['OUTER']`   | 网络类型列表，用于指定支持的访问类型，INNER 为内网访问，OUTER 为外网访问。 |
| serviceDesc   |  否  |             string              |                | 用户自定义的服务描述说明                                                   |
| environment   |  是  |             string              |   `release`    | 服务要发布的环境的名称，支持三种环境: test、prepub、 release               |
| endpoints     |  是  |     [Endpoint](#Endpoint)[]     |                | API，配置参数参考、                                                        |
| customDomains |  否  | [CustomDomain](#CustomDomain)[] |      `[]`      | 自定义域名                                                                 |

### Endpoint

API 参数说明

| 参数                     | 必选 |                 类型                  |  默认值  | 描述                                                                                                              |
| ------------------------ | :--: | :-----------------------------------: | :------: | :---------------------------------------------------------------------------------------------------------------- |
| apiId                    |  否  |                string                 |          | API 的唯一 ID                                                                                                     |
| protocol                 |  否  |                string                 |  `HTTP`  | 指定的前端 API 类型，支持 `HTTP`、`WEBSOCKET`                                                                     |
| path                     |  是  |                string                 |          | API 路径                                                                                                          |
| method                   |  是  |                string                 |          | 请求方法                                                                                                          |
| serviceType              |  否  |                string                 |  `SCF`   | 指定的后端类型，支持：`SCF`、`HTTP`、MOCK                                                                         |
| description              |  否  |                string                 |          | API 描述                                                                                                          |
| enableCORS               |  否  |                boolean                | `false`  | 是否启用跨域访问。 true：启用， false：不启用                                                                     |
| function                 |  是  |         [Function](#Function)         |          | 对应的 Serverless 云函数                                                                                          |
| usagePlan                |  否  |        [UsagePlan](#UsagePlan)        |          | 基于 API 维度的使用计划                                                                                           |
| auth                     |  否  |       [SecretAuth](#SecretAuth)       |          | API 密钥鉴权设置                                                                                                  |
| serviceTimeout           |  否  |                number                 |   `15`   | API 的后端服务超时时间，单位为秒                                                                                  |
| responseType             |  否  |                string                 |          | 返回类型: `HTML`、`JSON`、`TEST`、`BINARY`、`XML`                                                                 |
| param                    |  否  | [RequestParameter](#RequestParameter) |          | 前端请求参数                                                                                                      |
| serviceConfig            |  否  |    [ServiceConfig](#ServiceConfig)    |          | API 的后端服务配置                                                                                                |
| serviceMockReturnMessage |  否  |                string                 |          | Mock 接口类型返回结果，如果 `serviceType` 设置为 `MOCK`，此参数必须                                               |
| authType                 |  否  |                string                 |  `NONE`  | 鉴权类型，支持：`NONE`(免鉴权)、`SECRET`(密钥对)，`OAUTH`(Oauth2.0)                                               |
| businessType             |  否  |                string                 | `NORMAL` | 业务类型，支持：`NORMAL`、`OAUTH`                                                                                 |
| oauthConfig              |  否  |      [OauthConfig](#OauthConfig)      |          | Oauth2.0 鉴权，授业 API 后端配置，当 `authType` 为 `OAUTH`, 并且 businessType 为 `OAUTH` 时，此参数必须           |
| authRelationApi          |  否  |  [AuthRelationApi](#AuthRelationApi)  |          | Oauth2.0 鉴权，业务 API 关联授业 API 配置，当 `authType` 为 `OAUTH`, 并且 businessType 为 `NORMAL` 时，此参数必须 |

- API 类型补充说明

| 前端 API 类型 (参数:protocol) | 后端服务类型 (参数:serviceType) |
| ----------------------------- | ------------------------------- |
| HTTP (默认)                   | SCF (默认)                      |
|                               | HTTP                            |
|                               | MOCK                            |
| WEBSOCKET                     | SCF (默认)                      |
|                               | WEBSOCKET                       |

### Function

关联云函数参数配置

> 此时 `serviceType` 必须为 `SCF`

| 参数                  | 必选 |  类型   |   默认值   | 描述                                             |
| --------------------- | :--: | :-----: | :--------: | :----------------------------------------------- |
| isIntegratedResponse  |  否  | boolean |  `false`   | 是否开启响应集成，当前端类型为`HTTP`时生效       |
| functionQualifier     |  否  | string  | `$DEFAULT` | scf 函数版本                                     |
| functionName          |  是  | string  |            | 云函数的名称                                     |
| transportFunctionName |  否  | string  |            | 传输函数的名称，`protocol` 为 `WEBSOCKET` 时必须 |
| registerFunctionName  |  否  | string  |            | 注册函数的名称，`protocol` 为 `WEBSOCKET` 时必须 |
| cleanupFunctionName   |  否  | string  |            | 清理函数的名称，`protocol` 为 `WEBSOCKET` 时必须 |

### ServiceConfig

API 的后端服务配置

| 参数   | 必选 |  类型  | 默认值 | 描述                                                               |
| ------ | :--: | :----: | :----: | :----------------------------------------------------------------- |
| url    |  是  | string |        | API 的后端服务 url，如果 `serviceType` 是 `HTTP`，则此参数必传     |
| path   |  是  | string |        | API 的后端服务路径，如果 `serviceType` 是 `HTTP`，则此参数必传     |
| method |  是  | string |        | API 的后端服务请求方法，如果 `serviceType` 是 `HTTP`，则此参数必传 |

### UsagePlan

使用计划参数说明

| 参数                | 必选 |  类型  | 默认值 | 描述                                            |
| ------------------- | :--: | :----: | :----: | :---------------------------------------------- |
| usagePlanId         |  是  | string |        | 用户自定义的基于 API 的使用计划 ID              |
| usagePlanName       |  是  | string |        | 用户自定义的基于 API 的使用计划名称             |
| usagePlanDesc       |  是  | string |        | 用户自定义的基于 API 的使用计划描述             |
| maxRequestNum       |  是  | number |  `-1`  | 允许的请求总数。默认情况下将使用 `-1`，表示禁用 |
| maxRequestNumPreSec |  是  | number |  `-1`  | 每秒最大请求数。默认情况下将使用 `-1`，表示禁用 |

### SecretAuth

密钥鉴权参数说明

| 参数       | 必选 |   类型   | 默认值 | 描述                  |
| ---------- | :--: | :------: | :----: | :-------------------- |
| secretName |  是  |  string  |        | 用户自定义的密钥名称  |
| secretIds  |  否  | string[] |        | 用户自定义的 SecretId |

### RequestParameter

前端请求参数说明

| 参数         | 必选 |  类型   | 默认值 | 描述                                          |
| ------------ | :--: | :-----: | :----: | :-------------------------------------------- |
| name         |  是  | string  |        | 请求参数名称                                  |
| position     |  是  | string  |        | 参数位置，仅支持`PATH`，`QUERY`和`HEADER`类型 |
| type         |  是  | string  |        | 参数类型，如 String 和 int.                   |
| defaultValue |  是  | string  |        | 参数默认值                                    |
| required     |  是  | boolean |        | 参数是否是， true: 是; false: 否              |
| desc         |  是  | string  |        | 参数备注/描述                                 |

### CustomDomain

自定义域名

| 参数             | 必选 |         类型          |   默认值   |                                                                 | 描述 |
| ---------------- | :--: | :-------------------: | :--------: | :-------------------------------------------------------------- | ---- |
| domain           |  是  |        string         |            | 需要绑定的自定义域名                                            |
| certificateId    |  否  |        string         |            | 自定义域名的证书，如果设置为 https，则为必需。                  |
| isDefaultMapping |  否  |        boolean        |   `true`   | 是否使用默认路径映射。 如果要自定义路径映射，请设为`false`      |
| pathMappingSet   |  否  | [PathMap](#PathMap)[] |    `[]`    | 自定义路径映射, 当 `isDefaultMapping` 为 `false` 时，此参数必须 |
| protocols        |  否  |       string[]        | `['http']` | 绑定自定义域协议类型，支持 http 和 https                        |

### PathMap

| 参数        | 必选 |  类型  | 默认值 | 描述           |
| ----------- | :--: | :----: | :----: | :------------- |
| path        |  是  | string |        | 自定义映射路径 |
| environment |  是  | string |        | 自定义映射环境 |

### OauthConfig

| 参数             | 必选 |  类型  | 默认值 | 描述                                                                                |
| ---------------- | :--: | :----: | :----: | :---------------------------------------------------------------------------------- |
| loginRedirectUrl |  是  | string |        | 重定向地址，用于引导用户登录操作                                                    |
| publicKey        |  是  | string |        | 公钥，用于验证用户 token                                                            |
| tokenLocation    |  是  | string |        | token 传递位置，支持: `method.req.header.authorization`、`method.req.header.cookie` |

有关授业 API 的公钥生成，参考腾讯云官方文档：https://cloud.tencent.com/document/product/628/38393

### AuthRelationApi

Oauth2.0 鉴权，业务 API 关联授业 API 配置，当 `authType` 为 `OAUTH`, 并且 businessType 为 `NORMAL` 时，此参数必须

| 参数   | 必选 |  类型  | 默认值 | 描述                       |
| ------ | :--: | :----: | :----: | :------------------------- |
| path   |  是  | string |        | 关联 `授业 API` 的请求路径 |
| method |  是  | string |        | 关联 `授业 API` 的请求路径 |
