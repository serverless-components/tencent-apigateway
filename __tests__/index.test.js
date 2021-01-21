const { generateId, getServerlessSdk } = require('./lib/utils')

const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'apigateway@dev',
  name: `apigateway-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    // region: 'ap-guangzhou'
    protocols: ['http'],
    serviceName: 'sls_apigw_test',
    environment: 'release',
    endpoints: [
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
          },
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
          url: 'http://127.0.0.1:9090',
        },
        oauthConfig: {
          loginRedirectUrl: 'http://127.0.0.1:9090/code',
          publicKey: process.env.API_PUBLIC_KEY,
          tokenLocation: 'authorization',
          // tokenLocation: 'method.req.header.cookie',
        },
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
          method: 'GET',
        },
        serviceType: 'MOCK',
        serviceMockReturnMessage: 'helloworld',
      },

    ]
  }
}

const credentials = {
  tencent: {
    SecretId: process.env.TENCENT_SECRET_ID,
    SecretKey: process.env.TENCENT_SECRET_KEY,
  }
}

const sdk = getServerlessSdk(instanceYaml.org)

it('deploy apigateway service', async () => {
  const instance = await sdk.deploy(instanceYaml, credentials)

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.environment).toEqual(instanceYaml.environment)

  expect(instance.state).toBeDefined()
  expect(instance.state.serviceName).toEqual(instanceYaml.inputs.serviceName)

  // outputs
  expect(instance.outputs).toBeDefined()
  expect(instance.outputs.serviceId).toBeDefined()
  instanceYaml.inputs.serviceId = instance.outputs.serviceId
  expect(instance.outputs.apis).toBeDefined()
  expect(instance.outputs.apis.length).toEqual(instanceYaml.inputs.endpoints.length)
  expect(instance.outputs.apis[0].path).toEqual(instanceYaml.inputs.endpoints[0].path)
  expect(instance.outputs.apis[0].method).toEqual(instanceYaml.inputs.endpoints[0].method)

  expect(instance.state.apiList).toBeDefined()
  expect(instance.state.apiList.length).toEqual(instanceYaml.inputs.endpoints.length)

  // scf api
  expect(instance.state.apiList[0].usagePlan).toBeDefined()
  expect(instance.state.apiList[0].usagePlan.secrets).toBeDefined()
  expect(instance.state.apiList[0].usagePlan.usagePlanId).toBeDefined()
  instanceYaml.inputs.endpoints[0].usagePlan.usagePlanId =
    instance.state.apiList[0].usagePlan.usagePlanId

  // ws api
  expect(instance.state.apiList[1].apiName).toEqual(instanceYaml.inputs.endpoints[1].apiName)
  expect(instance.state.apiList[1].path).toEqual(instanceYaml.inputs.endpoints[1].path)
  expect(instance.state.apiList[1].method).toEqual(instanceYaml.inputs.endpoints[1].method)
  expect(instance.state.apiList[2].apiName).toEqual(instanceYaml.inputs.endpoints[2].apiName)
  expect(instance.state.apiList[2].path).toEqual(instanceYaml.inputs.endpoints[2].path)
  expect(instance.state.apiList[2].method).toEqual(instanceYaml.inputs.endpoints[2].method)

  // mock api
  expect(instance.state.apiList[3].apiName).toEqual(instanceYaml.inputs.endpoints[3].apiName)
  expect(instance.state.apiList[3].path).toEqual(instanceYaml.inputs.endpoints[3].path)
  expect(instance.state.apiList[3].method).toEqual(instanceYaml.inputs.endpoints[3].method)

  // backend http api
  expect(instance.state.apiList[4].apiName).toEqual(instanceYaml.inputs.endpoints[4].apiName)
  expect(instance.state.apiList[4].path).toEqual(instanceYaml.inputs.endpoints[4].path)
  expect(instance.state.apiList[4].method).toEqual(instanceYaml.inputs.endpoints[4].method)

  // base64 api
  expect(instance.state.apiList[5].apiName).toEqual(instanceYaml.inputs.endpoints[5].apiName)
  expect(instance.state.apiList[5].path).toEqual(instanceYaml.inputs.endpoints[5].path)
  expect(instance.state.apiList[5].method).toEqual(instanceYaml.inputs.endpoints[5].method)
  expect(instance.state.apiList[5].isBase64Encoded).toEqual(instanceYaml.inputs.endpoints[5].isBase64Encoded)

  // oauth api
  expect(instance.state.apiList[6].apiName).toEqual(instanceYaml.inputs.endpoints[6].apiName)
  expect(instance.state.apiList[6].path).toEqual(instanceYaml.inputs.endpoints[6].path)
  expect(instance.state.apiList[6].method).toEqual(instanceYaml.inputs.endpoints[6].method)
  expect(instance.state.apiList[6].authType).toEqual(instanceYaml.inputs.endpoints[6].authType)
  expect(instance.state.apiList[6].businessType).toEqual(instanceYaml.inputs.endpoints[6].businessType)

  // oauth business api
  expect(instance.state.apiList[7].apiName).toEqual(instanceYaml.inputs.endpoints[7].apiName)
  expect(instance.state.apiList[7].path).toEqual(instanceYaml.inputs.endpoints[7].path)
  expect(instance.state.apiList[7].method).toEqual(instanceYaml.inputs.endpoints[7].method)
  expect(instance.state.apiList[7].authType).toEqual(instanceYaml.inputs.endpoints[7].authType)
  expect(instance.state.apiList[7].businessType).toEqual(instanceYaml.inputs.endpoints[7].businessType)
  expect(instance.state.apiList[7].authRelationApiId).toEqual(instance.state.apiList[6].apiId)
})

it('remove apigateway service', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  expect(result.instance.instanceStatus).toEqual('inactive')
})
