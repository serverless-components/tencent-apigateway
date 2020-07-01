const { generateId, getServerlessSdk } = require('./utils')

// set enough timeout for deployment to finish
jest.setTimeout(300000)

// the yaml file we're testing against
const instanceYaml = {
  org: 'orgDemo',
  app: 'appDemo',
  component: 'apigateway@dev',
  name: `apigateway-integration-tests-${generateId()}`,
  stage: 'dev',
  inputs: {
    // region: 'ap-guangzhou'
    protocols: ['HTTP'],
    serviceName: 'sls_apigw_test',
    environment: 'release',
    endpoints: [
      {
        path: '/test',
        protocol: 'HTTP',
        method: 'GET',
        apiName: 'indextest',
        function: {
          functionName: 'myRestAPI'
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
          transportFunctionName: 'myFunction',
          registerFunctionName: 'myFunction',
          cleanupFunctionName: 'myFunction'
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
      }
    ]
  }
}

// get credentials from process.env but need to init empty credentials object
const credentials = {
  tencent: {}
}

// get serverless construct sdk
const sdk = getServerlessSdk(instanceYaml.org)

it('should successfully deploy apigateway service', async () => {
  const instance = await sdk.deploy(instanceYaml, { tencent: {} })

  expect(instance).toBeDefined()
  expect(instance.instanceName).toEqual(instanceYaml.name)
  expect(instance.environment).toEqual(instanceYaml.environment)

  expect(instance.state).toBeDefined()
  expect(instance.state.serviceName).toEqual(instanceYaml.inputs.serviceName)

  expect(instance.outputs).toBeDefined()
  expect(instance.outputs.serviceId).toBeDefined()
  instanceYaml.inputs.serviceId = instance.outputs.serviceId

  expect(instance.outputs.apis).toBeDefined()
  expect(instance.outputs.apis.length).toEqual(instanceYaml.inputs.endpoints.length)
  expect(instance.outputs.apis[0].path).toEqual(instanceYaml.inputs.endpoints[0].path)
  expect(instance.outputs.apis[0].method).toEqual(instanceYaml.inputs.endpoints[0].method)

  expect(instance.state.apiList).toBeDefined()
  expect(instance.state.apiList.length).toEqual(instanceYaml.inputs.endpoints.length)
  expect(instance.state.apiList[0].bindType).toEqual('API')
  expect(instance.state.apiList[0].usagePlan).toBeDefined()
  expect(instance.state.apiList[0].usagePlan.secrets).toBeDefined()
  expect(instance.state.apiList[0].usagePlan.usagePlanId).toBeDefined()
  instanceYaml.inputs.endpoints[0].usagePlan.usagePlanId =
    instance.state.apiList[0].usagePlan.usagePlanId

  expect(instance.state.apiList[1].apiName).toEqual(instanceYaml.inputs.endpoints[1].apiName)
  expect(instance.state.apiList[1].path).toEqual(instanceYaml.inputs.endpoints[1].path)
  expect(instance.state.apiList[1].method).toEqual(instanceYaml.inputs.endpoints[1].method)
  expect(instance.state.apiList[2].apiName).toEqual(instanceYaml.inputs.endpoints[2].apiName)
  expect(instance.state.apiList[2].path).toEqual(instanceYaml.inputs.endpoints[2].path)
  expect(instance.state.apiList[2].method).toEqual(instanceYaml.inputs.endpoints[2].method)
  expect(instance.state.apiList[3].apiName).toEqual(instanceYaml.inputs.endpoints[3].apiName)
  expect(instance.state.apiList[3].path).toEqual(instanceYaml.inputs.endpoints[3].path)
  expect(instance.state.apiList[3].method).toEqual(instanceYaml.inputs.endpoints[3].method)
  expect(instance.state.apiList[4].apiName).toEqual(instanceYaml.inputs.endpoints[4].apiName)
  expect(instance.state.apiList[4].path).toEqual(instanceYaml.inputs.endpoints[4].path)
  expect(instance.state.apiList[4].method).toEqual(instanceYaml.inputs.endpoints[4].method)
})

it('should successfully remove apigateway service', async () => {
  await sdk.remove(instanceYaml, credentials)
  result = await sdk.getInstance(
    instanceYaml.org,
    instanceYaml.stage,
    instanceYaml.app,
    instanceYaml.name
  )

  expect(result.instance.instanceStatus).toEqual('inactive')
})
