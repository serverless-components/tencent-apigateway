const { generateId, getServerlessSdk } = require('./lib/utils')

const appId = process.env.TENCENT_APP_ID
const endpoints = [
  {
    path: '/test',
    protocol: 'HTTP',
    method: 'GET',
    apiName: 'indextest',
    function: {
      functionName: 'serverless-unit-test'
    },
    usagePlan: {
      usagePlanName: 'slscmp',
      usagePlanDesc: 'sls create',
      maxRequestNum: 1000
    },
    auth: { secretName: 'secret' }
  },
  {
    path: '/ws-scf',
    protocol: 'WEBSOCKET',
    method: 'GET',
    apiName: 'WS-SCF-API',
    function: {
      transportFunctionName: 'serverless-unit-test',
      registerFunctionName: 'serverless-unit-test',
      cleanupFunctionName: 'serverless-unit-test'
    }
  },
  {
    path: '/ws',
    protocol: 'WEBSOCKET',
    apiName: 'WS-WS-API',
    method: 'GET',
    serviceType: 'WEBSOCKET',
    serviceConfig: {
      url: 'ws://test.com',
      path: '/',
      method: 'GET'
    }
  },
  {
    path: '/mo',
    protocol: 'HTTP',
    method: 'GET',
    apiName: 'mo',
    serviceType: 'MOCK',
    serviceMockReturnMessage: 'test mock response'
  },
  {
    path: '/auto',
    protocol: 'HTTP',
    apiName: 'HTTP-PROXY',
    method: 'GET',
    serviceType: 'HTTP',
    serviceConfig: {
      url: 'http://www.test.com',
      path: '/test',
      method: 'GET'
    }
  },
  {
    path: '/base64',
    protocol: 'HTTP',
    method: 'GET',
    apiName: 'base64',
    function: {
      functionName: 'serverless-unit-test'
    },
    isBase64Encoded: true,
    isBase64Trigger: true,
    base64EncodedTriggerRules: [
      {
        name: 'Accept',
        value: ['image/jpeg']
      },
      {
        name: 'Content_Type',
        value: ['image/jpeg']
      }
    ]
  },
  // below two api is for oauth2.0 test
  {
    path: '/oauth',
    protocol: 'HTTP',
    method: 'GET',
    apiName: 'oauthapi',
    authType: 'OAUTH',
    businessType: 'OAUTH',
    serviceType: 'HTTP',
    serviceConfig: {
      method: 'GET',
      path: '/check',
      url: 'http://127.0.0.1:9090'
    },
    oauthConfig: {
      loginRedirectUrl: 'http://127.0.0.1:9090/code',
      publicKey: '{"e":"AQAB","kty":"RSA","n":"xxxxxxxx"}',
      tokenLocation: 'authorization'
      // tokenLocation: 'method.req.header.cookie',
    }
  },
  {
    path: '/oauthwork',
    protocol: 'HTTP',
    method: 'GET',
    apiName: 'business',
    authType: 'OAUTH',
    businessType: 'NORMAL',
    authRelationApi: {
      path: '/oauth',
      method: 'GET'
    },
    serviceType: 'MOCK',
    serviceMockReturnMessage: 'helloworld'
  }
]
const instanceYaml = {
  org: appId,
  app: 'appDemo',
  component: 'apigateway@dev',
  name: `apigateway-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    // region: 'ap-guangzhou'
    protocols: ['http', 'https'],
    serviceName: 'sls_apigw_test',
    environment: 'release',
    endpoints
  }
}

const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY
  }
}

const sdk = getServerlessSdk(instanceYaml.org, appId)

it('deploy apigateway service', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.environment).toEqual(instanceYaml.environment)

  expect(instance.state).toBeDefined()
  expect(instance.state.serviceName).toEqual(instanceYaml.inputs.serviceName)

  // outputs
  expect(instance.outputs).toBeDefined()
  const { outputs, state } = instance
  const { serviceId, apis } = outputs
  const stateApiList = state.apiList
  expect(serviceId).toBeDefined()

  instanceYaml.inputs.serviceId = serviceId

  expect(apis).toBeDefined()
  expect(apis.length).toEqual(endpoints.length)
  expect(apis[0].path).toEqual(endpoints[0].path)
  expect(apis[0].method).toEqual(endpoints[0].method)

  expect(stateApiList).toBeDefined()
  expect(stateApiList.length).toEqual(endpoints.length)

  // scf api
  expect(stateApiList[0].usagePlan).toBeDefined()
  expect(stateApiList[0].usagePlan.secrets).toBeDefined()
  expect(stateApiList[0].usagePlan.usagePlanId).toBeDefined()

  endpoints[0].usagePlan.usagePlanId = stateApiList[0].usagePlan.usagePlanId

  // ws api
  expect(stateApiList[1].apiName).toEqual(endpoints[1].apiName)
  expect(stateApiList[1].path).toEqual(endpoints[1].path)
  expect(stateApiList[1].method).toEqual(endpoints[1].method)

  expect(stateApiList[2].apiName).toEqual(endpoints[2].apiName)
  expect(stateApiList[2].path).toEqual(endpoints[2].path)
  expect(stateApiList[2].method).toEqual(endpoints[2].method)

  // mock api
  expect(stateApiList[3].apiName).toEqual(endpoints[3].apiName)
  expect(stateApiList[3].path).toEqual(endpoints[3].path)
  expect(stateApiList[3].method).toEqual(endpoints[3].method)

  // backend http api
  expect(stateApiList[4].apiName).toEqual(endpoints[4].apiName)
  expect(stateApiList[4].path).toEqual(endpoints[4].path)
  expect(stateApiList[4].method).toEqual(endpoints[4].method)

  // base64 api
  expect(stateApiList[5].apiName).toEqual(endpoints[5].apiName)
  expect(stateApiList[5].path).toEqual(endpoints[5].path)
  expect(stateApiList[5].method).toEqual(endpoints[5].method)
  expect(stateApiList[5].isBase64Encoded).toEqual(endpoints[5].isBase64Encoded)

  // oauth api
  expect(stateApiList[6].apiName).toEqual(endpoints[6].apiName)
  expect(stateApiList[6].path).toEqual(endpoints[6].path)
  expect(stateApiList[6].method).toEqual(endpoints[6].method)
  expect(stateApiList[6].authType).toEqual(endpoints[6].authType)
  expect(stateApiList[6].businessType).toEqual(endpoints[6].businessType)

  // oauth business api
  expect(stateApiList[7].apiName).toEqual(endpoints[7].apiName)
  expect(stateApiList[7].path).toEqual(endpoints[7].path)
  expect(stateApiList[7].method).toEqual(endpoints[7].method)
  expect(stateApiList[7].authType).toEqual(endpoints[7].authType)
  expect(stateApiList[7].businessType).toEqual(endpoints[7].businessType)
  expect(stateApiList[7].authRelationApiId).toEqual(stateApiList[6].apiId)
})

it('remove apigateway service', async () => {
  await sdk.remove(instanceYaml, credentials)
  const result = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  expect(result.instance.instanceStatus).toEqual('inactive')
})
