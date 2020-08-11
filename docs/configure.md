# 配置文档

## 完整配置

```yml
# serverless.yml

component: apigateway # (必填) 组件名称，此处为 apigateway
name: apigwDemo # (必填) 实例名称
org: orgDemo # (可选) 用于记录组织信息，默认值为您的腾讯云账户 appid
app: appDemo # (可选) 该应用名称
stage: dev # (可选) 用于区分环境信息，默认值为 dev

inputs:
  serviceId: service-8dsikiq6
  region: ap-shanghai
  protocols:
    - http
    - https
  serviceName: serverless
  description: the serverless service
  environment: release
  netTypes:
    - OUTER
    - INNER
  customDomain:
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
        # 前端类型为WEBSOCKET且后端为SCF时, transportFunctionName 为必填
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
      method: GET
      description: Serverless REST API
      enableCORS: TRUE
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
        isIntegratedResponse: TRUE
        functionQualifier: $LATEST
        functionName: myFunction
      usagePlan:
        usagePlanId: 1111
        usagePlanName: slscmp
        usagePlanDesc: sls create
        maxRequestNum: 1000
      auth:
        secretName: secret
        secretIds:
          - AKIDNSdvdFcJ8GJ9th6qeZH0ll8r7dE6HHaSuchJ
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
```

## 配置说明

### 主要函数说明

| 参数         | 必填/可选 | 参数类型 |     默认值     | 描述                                                                                   |
| ------------ | :-------: | :------: | :------------: | :------------------------------------------------------------------------------------- |
| serviceId    |   可选    |  string  |                | 服务的全局唯一 ID，由系统生成                                                          |
| region       |   必填    |  string  | `ap-guangzhou` | 服务的部署区域，默认为广州（ap-guangzhou）                                             |
| protocols    |   必填    | string[] |   `['http']`   | 服务的前端请求类型，例如 HTTP，HTTPS，HTTP 和 HTTPS。 （http / https）                 |
| serviceName  |   可选    |  string  |                | 用户自定义的服务名称。 如果该参数未传递，则由系统自动生成一个唯一名称                  |
| netTypes     |   可选    | string[] |  `['OUTER']`   | 网络类型列表，用于指定支持的访问类型，INNER 为内网访问，OUTER 为外网访问。             |
| description  |   可选    |  string  |                | 用户自定义的服务描述说明                                                               |
| environment  |   必填    |  string  |                | 服务要发布的环境的名称，支持三种环境: test（测试）、prepub（预发布）、 release（发布） |
| endpoints    |   必填    | object[] |                | API，配置参数参考[API 参数说明](#api-参数说明)                                         |
| customDomain |   可选    | object[] |      `[]`      | 自定义 API 域名，配置参数参考[customDomain 参数说明](#customdomain-参数说明)           |

### API 参数说明

| 参数                     | 必填/可选 | 默认值  | 描述                                                                                 |
| ------------------------ | :-------: | :-----: | :----------------------------------------------------------------------------------- |
| apiId                    |   可选    |         | API 的唯一 ID                                                                        |
| protocol                 |   可选    | `HTTP`  | 指定的前端 API 类型， 默认为`HTTP`，如要创建 websocket 类型的 API，请设为`WEBSOCKET` |
| path                     |   必填    |         | API 路径                                                                             |
| method                   |   必填    |         | 请求方法                                                                             |
| serviceType              |   可选    |  `SCF`  | 指定的后端类型，默认为 `SCF`，如要创建 mock 或 http 的类型，可设为 `MOCK`或`HTTP`    |
| description              |   可选    |         | API 描述                                                                             |
| enableCORS               |   可选    | `false` | 是否启用跨域访问。 true：启用， false：不启用                                        |
| function                 |   必填    |         | 对应的 Serverless 云函数，配置参数参考[function 参数说明](#function-参数说明)        |
| usagePlan                |   可选    |         | 基于 API 维度的使用计划，配置参数参考[usagePlan 参数说明](#usageplan-参数说明)       |
| auth                     |   可选    |         | API 鉴权设置，配置参数参考[auth 参数说明](#auth-参数说明)                            |
| serviceTimeout           |   可选    |         | API 的后端服务超时时间，单位为秒                                                     |
| responseType             |   可选    |         | 返回类型: HTML、JSON、TEST、BINARY、XML                                              |
| param                    |   可选    |         | 前端请求参数，配置参数参考[param 参数说明](#param-参数说明)                          |
| serviceConfig            |   可选    |         | API 的后端服务配置，配置参数参考[serviceConfig 参数说明](#serviceconfig-参数说明)    |
| serviceMockReturnMessage |   可选    |         | Mock 接口类型返回结果，如果 `serviceType` 设置为 `MOCK`，此参数必填                  |

- API 类型补充说明

| 前端 API 类型 (参数:protocol) | 后端服务类型 (参数:serviceType) |
| ----------------------------- | ------------------------------- |
| HTTP (默认)                   | SCF (默认)                      |
|                               | HTTP                            |
|                               | MOCK                            |
| WEBSOCKET                     | SCF (默认)                      |
|                               | WEBSOCKET                       |

### function 参数说明

> （当后端类型为`SCF`时生效且必填）

| 参数                  | 描述                                                                  |
| --------------------- | :-------------------------------------------------------------------- |
| isIntegratedResponse  | 是否开启响应集成，当前端类型为`HTTP`时生效                            |
| functionQualifier     | scf 函数版本                                                          |
| functionName          | API 的后端服务的 SCF 函数的名称，当前端类型为`HTTP`时生效且为必填     |
| transportFunctionName | API 的后端服务的传输函数的名称，当前端类型为`WEBSOCKET`时生效且为必填 |
| registerFunctionName  | API 的后端服务的注册函数的名称，当前端类型为`WEBSOCKET`时生效         |
| cleanupFunctionName   | API 的后端服务的清理函数的名称，当前端类型为`WEBSOCKET`时生效         |

### serviceConfig 参数说明

> （当后端类型为`HTTP`或`WEBSOCKET`时生效且必填）

| 参数   | 描述                   |
| ------ | :--------------------- |
| url    | API 的后端服务 url     |
| path   | API 的后端服务路径     |
| method | API 的后端服务请求方法 |

### usagePlan 参数说明

| 参数          | 描述                                                                                       |
| ------------- | :----------------------------------------------------------------------------------------- |
| usagePlanId   | 用户自定义的基于 API 的使用计划 ID                                                         |
| usagePlanName | 用户自定义的基于 API 的使用计划名称                                                        |
| usagePlanDesc | 用户自定义的基于 API 的使用计划描述                                                        |
| maxRequestNum | 允许的请求总数。不传该参数时默认为 1000 次，若其保留为空，则默认情况下将使用-1，表示已禁用 |

### auth 参数说明

| 参数       | 描述                                                                                  |
| ---------- | :------------------------------------------------------------------------------------ |
| secretName | 用户自定义的密钥名称                                                                  |
| secretIds  | 用户自定义的 secretID。当类型为手动时需要。 它可以包含 5 到 50 个字母，数字和下划线。 |

### param 参数说明

| 参数         | 描述                                          |
| ------------ | :-------------------------------------------- |
| name         | 请求参数名称                                  |
| position     | 参数位置，仅支持`PATH`，`QUERY`和`HEADER`类型 |
| type         | 参数类型，如 String 和 int.                   |
| defaultValue | 参数默认值                                    |
| required     | 参数是否必填， true: 必填; false: 可选        |
| desc         | 参数备注/描述                                 |

### customDomain 参数说明

| 参数             | 必填/可选 | 默认值 | 描述                                                                                                                     |
| ---------------- | :-------: | :----: | :----------------------------------------------------------------------------------------------------------------------- |
| domain           |   必填    |        | 需要绑定的自定义域名                                                                                                     |
| certificateId    |   可选    |        | 自定义域名的证书，如果设置为 https，则为必需。                                                                           |
| isDefaultMapping |   可选    | `true` | 是否使用默认路径映射。 如果要自定义路径映射，请设为`false`                                                               |
| pathMappingSet   |   可选    |  `[]`  | 自定义路径映射, 当 `isDefaultMapping` 为 `false` 时必填，配置参数参考[pathMappingSet 参数说明](#pathMappingSet-参数说明) |
| protocols        |   可选    |        | 绑定自定义域协议类型，例如 HTTP，HTTPS，HTTP 和 HTTPS，默认与前端协议相同                                                |

### pathMappingSet 参数说明

| 参数        | 描述           |
| ----------- | :------------- |
| path        | 自定义映射路径 |
| environment | 自定义映射环境 |
