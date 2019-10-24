var Capi = require('qcloudapi-sdk')
const { Component } = require('@serverless/core')

const {
  CreateApi,
  ModifyApi,
  CreateService,
  CreateUsagePlan,
  ModifyUsagePlan,
  CreateApiKey,
  BindSecretIds,
  BindEnvironment,
  ReleaseService,
  ModifyService,
  DescribeService,
  DeleteApi,
  UnBindSecretIds,
  UnBindEnvironment,
  DeleteUsagePlan,
  DeleteApiKey,
  UnReleaseService,
  DisableApiKey,
  Validate,
  DescribeUsagePlan,
  DescribeApiKeysStatus,
  DescribeUsagePlanSecretIds,
  DeleteService,
  CheckExistsFromError,
  DescribeApi
} = require('./utils')

const serviceType    = 'SCF'
const serviceTimeout = 15
const bindType       = 'API'


class TencentApiGateway extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')
    
    inputs.apiName = this.id.split('Template.')[1]

    const params = Validate(inputs);
    let {
      region,
      serviceId,
      description,
      serviceName,
      apiName,
      protocol,
      usagePlan,
      environment,
      endpoints
    } = params

    this.context.debug(
      `Starting API Gateway deployment with name ${apiName} in the ${region} region`
    )

    const apig = new Capi({
      SecretId: this.context.credentials.tencent.SecretId,
      SecretKey: this.context.credentials.tencent.SecretKey,
      serviceType: 'apigateway'
    })

    const serviceInputs = { 
      Region: region, 
      serviceDesc: description, 
      // Up to 50 characters，(a-z,A-Z,0-9,_)
      serviceName, 
      protocol: protocol.toLowerCase() 
    }

    let subDomain = '';
    let serviceCreated = true;

    if (serviceId) {
      try {
        const serviceMsg = await DescribeService({ apig, Region: region, serviceId })
        serviceCreated = false;
        subDomain = serviceMsg.subDomain
      } catch (e) {
        this.context.debug(`DescribeService ${e.message}`)
        if (!CheckExistsFromError(e)) {
          this.context.debug(`Service ID ${serviceId} not found. Creating a new Service.`)
          serviceId = null;
        }
      }
    }

    if (!serviceId) {
      const serviceMsg = await CreateService({ apig, ...serviceInputs })
      this.context.debug(`Service with ID ${serviceMsg.serviceId} created.`)
      serviceId = serviceMsg.serviceId
      subDomain = serviceMsg.subDomain
    }

    const state = {
      protocol,
      subDomain,
      environment,
      region,
      service: {
        value: serviceId,
        created: serviceCreated
      }
    }

    const apiAuthSetting = async (ctx, region, apiClient, endpoint) => {

      let usagePlan = endpoint.usagePlan
      if (usagePlan == null) 
        usagePlan = {}

      const usageInputs = {
        Region: region,
        usagePlanName: usagePlan.usagePlanName || '',
        usagePlanDesc: usagePlan.usagePlanDesc || '',
        maxRequestNumPreSec: usagePlan.maxRequestNumPreSec,
        maxRequestNum: usagePlan.maxRequestNum
      }

      let usagePlanId = {
        created: false,
        value: usagePlan.usagePlanId
      }

      if (usagePlan.usagePlanId) {
        try {
          await DescribeUsagePlan({apig: apiClient, usagePlanId: usagePlan.usagePlanId, Region: region})
        } catch (e) {
          this.context.debug(`DescribeUsagePlan ${e.message}`)
          if (!CheckExistsFromError(e)) {
            this.context.debug(`UsagePlan ID ${usagePlan.usagePlanId} not found. Creating a new UsagePlan.`)
            usagePlan.usagePlanId = null;
          }
        }
      }

      if (!usagePlan.usagePlanId) {
        usagePlanId.value = await CreateUsagePlan({ apig: apiClient, ...usageInputs })
        usagePlanId.created = true;
        ctx.context.debug(`UsagePlan with ID ${usagePlanId.value} created.`)
      } else {
        ctx.context.debug(`Updating UsagePlan with usagePlanId ${usagePlan.usagePlanId}.`)
        await ModifyUsagePlan({ apig: apiClient, usagePlanId: usagePlan.usagePlanId, ...usageInputs })
      }

      let secretIds = {
        created: false,
        value: endpoint.auth.secretIds
      }
      if (!endpoint.auth.secretIds) {
        ctx.context.debug(`Creating a new Secretkey.`)
        const secretMsg = await CreateApiKey({
          apig: apiClient,
          Region: region,
          secretName: endpoint.auth.secretName,
          type: 'auto'
        })
        ctx.context.debug(
          `Secretkey with ID ${secretMsg.secretId} and KEY ${secretMsg.secretKey} Updated.`
        )
        secretIds.value = [secretMsg.secretId]
        secretIds.created = true
      } else {

        // get all secretId, check local secretId exists
        const apiKeyResponse = await DescribeApiKeysStatus({ apig: apiClient, secretIds: endpoint.auth.secretIds, Region: region })
        const len = endpoint.auth.secretIds.length
        const existKeysLen = apiKeyResponse.apiKeyStatusSet.length

        const ids = []
        for (let i = 0; i < len; i++) {
          const secretId = endpoint.auth.secretIds[i]
          let found = false
          for (let n = 0; n < existKeysLen; n++) {
            if (apiKeyResponse.apiKeyStatusSet[n] && secretId == apiKeyResponse.apiKeyStatusSet[n].secretId) {
              found = true
              break
            }
          } 

          if (!found)
            ctx.context.debug(`Secretkey ID ${secretId} does't exist`)
          else 
            ids.push(secretId)

         secretIds.value = ids
        }
      }

      return {
        usagePlanId,
        secretIds
      }

    }

    const apis = [];
    const outputs = [];
    const len = endpoints.length;
    for (let i = 0; i < len; i++) {
      const endpoint = endpoints[i];

      const requestConfig = {
        path: endpoint.path,
        method: endpoint.method
      }

      const output = {
        path: requestConfig.path,
        method: requestConfig.method
      }

      const api = requestConfig

      const apiInputs = {
        Region: region,
        serviceId,
        apiName,
        apiDesc: endpoint.description,
        apiType: 'NORMAL',
        authRequired: endpoint.auth ? 'TRUE' : 'FALSE',
        enableCORS: endpoint.enableCORS ? 'TRUE' : 'FALSE',
        requestConfig,
        serviceType,
        serviceTimeout,
        serviceScfFunctionName: endpoint.function.functionName,
        serviceScfIsIntegratedResponse: endpoint.function.isIntegratedResponse ? 'TRUE' : 'FALSE',
        serviceScfFunctionQualifier: endpoint.function.functionQualifier ? 'TRUE' : 'FALSE'
      }
      let apiId = {
        value: null,
        created: true
      }
      if (endpoint.apiId) {
        try {
          await DescribeApi({ apig, serviceId, apiId: endpoint.apiId, Region: region })
        } catch (e) {
          this.context.debug(`DescribeApi ${e.message}`)
          if (!CheckExistsFromError(e)) {
            this.context.debug(`API ID ${endpoint.apiId} not found. Creating a new API.`)
            endpoint.apiId = null;
          }
        }
      }

      if (!endpoint.apiId) {
        apiId.value = await CreateApi({ apig, ...apiInputs })
        this.context.debug(`API with ID ${apiId.value} created.`)
      } else {
        this.context.debug(`Updating api with apiId ${endpoint.apiId}.`)
        apiId.value = await ModifyApi({ apig, apiId: endpoint.apiId, ...apiInputs })
        apiId.created = false
        this.context.debug(`Service with ID ${apiId.value} Updated.`)
      }
      api.apiId = apiId;
      output.apiId = apiId.value

      if (endpoint.auth) {
        const result = await apiAuthSetting(this, region, apig, endpoint)
        this.context.debug(`Binding Secretkey ${result.secretIds.value} to UsagePlan with ID ${result.usagePlanId.value}.`)

        await BindSecretIds({ apig, Region: region, 
                          secretIds: result.secretIds.value, 
                          usagePlanId: result.usagePlanId.value })
        this.context.debug(`Binding sucessed.`)
        this.context.debug(
          `Binding UsagePlan with ID ${result.usagePlanId.value} to Api with path ${endpoint.method}:${endpoint.path}.`
        )

        await BindEnvironment({
          apig,
          Region: region,
          usagePlanIds: [result.usagePlanId.value],
          serviceId,
          environment, 
          bindType,
          apiIds: [apiId.value]
        })
        this.context.debug(`Binding sucessed.`)

        api.usagePlanId = result.usagePlanId
        api.secretIds   = result.secretIds

        output.usagePlanId = result.usagePlanId.value
        output.secretIds   = result.secretIds.value.join(',')
      }

      this.context.debug(`Deploying service with ID ${serviceId}.`)
      await ReleaseService({
        apig,
        Region: region,
        serviceId,
        environmentName: environment,
        releaseDesc: 'Serverless Api-gateway Component Deploy'
      })
      this.context.debug(
        `Deployment successful for the API named ${apiName} in the ${region} region.`
      )
      
      apis.push(api)
      outputs.push(output)
    }
    state.apis = apis
    this.state = state
    await this.save()

    return {
      protocol,
      subDomain,
      environment,
      region,
      serviceId,
      apis: outputs
    };
  }

  async remove(inputs = {}) {
    this.context.status('Removing')
    if (!this.state.apis) {
      this.context.debug(`Aborting removal. Function name not found in state.`)
      return
    }
    const apig = new Capi({
      SecretId: this.context.credentials.tencent.SecretId,
      SecretKey: this.context.credentials.tencent.SecretKey,
      serviceType: 'apigateway'
    })

    const state   = this.state
    const region  = state.region
    const apisLen = state.apis.length
    for (let i = 0; i < apisLen; i++) {
      const endpoint = state.apis[i]
      if (!endpoint.apiId) continue
      if (endpoint.usagePlanId) {
        await UnBindSecretIds({ apig, Region: region, 
                    secretIds: endpoint.secretIds.value, 
                    usagePlanId: endpoint.usagePlanId.value })
        this.context.debug(`Unbinding secret key to UsagePlan with ID ${endpoint.usagePlanId.value}.`)
        await UnBindEnvironment({
          apig,
          Region: region,
          serviceId: state.service.value,
          usagePlanIds: [endpoint.usagePlanId.value],
          environment: state.environment,
          bindType,
          apiIds: [endpoint.apiId.value]
        })
        this.context.debug(
          `Unbinding UsagePlan with ID ${endpoint.usagePlanId.value} to service with ID ${endpoint.serviceId}.`
        )

        if (endpoint.usagePlanId.created == true) {
          this.context.debug(`Removing any previously deployed usagePlanIds ${endpoint.usagePlanId.value}`)
          await DeleteUsagePlan({ apig, Region: region, usagePlanId: endpoint.usagePlanId.value })
        }
      }

      if (endpoint.secretIds && endpoint.secretIds.created == true) {
        endpoint.secretIds.value.map(async (secretId) => {
          await DisableApiKey({ apig, Region: region, secretId })
          await DeleteApiKey({ apig, Region: region, secretId })
          this.context.debug(`Removing any previously deployed secret key. ${secretId}`)
        })
      }
      if (endpoint.apiId && endpoint.apiId.created == true) {
        await DeleteApi({ apig, Region: region, 
                  apiId: endpoint.apiId.value, serviceId: state.service.value})
        this.context.debug(`Removing any previously deployed API. ${endpoint.apiId.value}`)
      }
    }

    await UnReleaseService({
      apig,
      Region: region,
      serviceId: state.service.value,
      environmentName: state.environment,
      unReleaseDesc: 'Serverless api-gateway component offline'
    })

    if (state.service.created == true) {
      this.context.debug(`Removing any previously deployed service. ${state.service.value}`)
      await DeleteService({
        apig, serviceId: state.service.value, Region: region
      })
    }
    const outputs = state.apis
    this.state = {}
    await this.save()
    return outputs
  }
}

module.exports = TencentApiGateway
