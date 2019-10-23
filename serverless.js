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
  DescribeUsagePlan
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
    this.state.region = region
    await this.save()

    const serviceInputs = { 
      Region: region, 
      serviceDesc: description, 
      // Up to 50 characters，(a-z,A-Z,0-9,_)
      serviceName, 
      protocol: protocol.toLowerCase() 
    }

    let subDomain = '';
    if (!serviceId) {
      this.context.debug(`Service ID not found in state. Creating a new Service.`)
      const serviceMsg = await CreateService({ apig, ...serviceInputs })
      this.context.debug(`Service with ID ${serviceMsg.serviceId} created.`)
      serviceId = serviceMsg.serviceId
      subDomain = serviceMsg.subDomain
    } else {
      this.context.debug(`Updating Service with serviceId ${serviceId}.`)
      await ModifyService({ apig, serviceId, ...serviceInputs })
      const serviceMsg = await DescribeService({ apig, Region: region, serviceId })
      this.context.debug(`Service with ID ${serviceId} Updated.`)
      subDomain = serviceMsg.subDomain
    }

    const apiAuthSetting = async (ctx, region, apiClient, endpoint) => {

      let usagePlan = endpoint.usagePlan
      if (usagePlan == null) {
        usagePlan = {}
        ctx.context.debug(`UsagePlan is empty.`)
      }

      const usageInputs = {
        Region: region,
        usagePlanName: usagePlan.usagePlanName || '',
        usagePlanDesc: usagePlan.usagePlanDesc || '',
        maxRequestNumPreSec: usagePlan.maxRequestNumPreSec,
        maxRequestNum: usagePlan.maxRequestNum
      }

      let usagePlanId = null;
      if (!usagePlan.usagePlanId) {
        ctx.context.debug(`Creating a new UsagePlan.`)
        usagePlanId = await CreateUsagePlan({ apig: apiClient, ...usageInputs })
        ctx.context.debug(`UsagePlan with ID ${usagePlanId} created.`)
      } else {
        await DescribeUsagePlan({apig: apiClient, usagePlanId, Region: region})

        ctx.context.debug(`Updating UsagePlan with usagePlanId ${usagePlanId}.`)
        usagePlanId = await ModifyUsagePlan({ apig: apiClient, usagePlanId, ...usageInputs })
        ctx.context.debug(`UsagePlan with ID ${usagePlanId} Updated.`)
      }

      let secretIds = endpoint.auth.secretIds;
      if (!endpoint.auth.secretIds) {
        ctx.context.debug(`Secretkey List not found in state. Creating a new Secretkey.`)
        const secretMsg = await CreateApiKey({
          apig: apiClient,
          Region: region,
          secretName: endpoint.auth.secretName || `secretName_${endpoint.apiId.split('api-')[1]}`,
          type: 'auto'
        })
        ctx.context.debug(
          `Secretkey with ID ${secretMsg.secretId} and KEY ${secretMsg.secretKey} Updated.`
        )
        ctx.state.secretId = secretMsg.secretId
        secretIds = [secretMsg.secretId]
        ctx.state.secretIds = secretIds
        await ctx.save()
      }

      return {
        usagePlanId,
        secretIds
      }

    }

    const outputs = [];
    const len = endpoints.length;
    for (let i = 0; i < len; i++) {
      const endpoint = endpoints[i];

      const requestConfig = {
        path: endpoint.path,
        method: endpoint.method
      }

      const output = {
        protocol,
        serviceId,
        subDomain,
        environment,
        requestConfig
      }

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
      let apiId = null;
      if (!endpoint.apiId) {
        this.context.debug(`API ID not found in state. Creating a new API.`)
        apiId = await CreateApi({ apig, ...apiInputs })
        this.context.debug(`API with ID ${apiId} created.`)
      } else {
        this.context.debug(`Updating api with apiId ${apiId}.`)
        apiId = await ModifyApi({ apig, apiId, ...apiInputs })
        this.context.debug(`Service with ID ${apiId} Updated.`)
      }
      output.apiId = apiId;

      let secretIds;
      if (endpoint.auth) {
        const result = await apiAuthSetting(this, region, apig, endpoint)
        this.context.debug(`Binding Secretkey to UsagePlan with ID ${result.usagePlanId}.`)

        await BindSecretIds({ apig, Region: region, 
                          secretIds: result.secretIds, 
                          usagePlanId: result.usagePlanId })
        this.context.debug(`Binding sucessed.`)
        this.context.debug(
          `Binding UsagePlan with ID ${result.usagePlanId} to Api with path ${endpoint.method}:${endpoint.path}.`
        )

        await BindEnvironment({
          apig,
          Region: region,
          usagePlanIds: [result.usagePlanId],
          serviceId,
          environment, 
          bindType,
          apiIds: [apiId]
        })
        secretIds = result.secretIds
        this.context.debug(`Binding sucessed.`)
        output.usagePlanId = result.usagePlanId
      }
      output.secretIds = secretIds

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
      
      outputs.push(output)
    }
    
    this.state.apis = outputs
    await this.save()

    return outputs;
  }

  async remove(inputs = {}) {

    if (!this.state.apis) {
      this.context.debug(`Aborting removal. Function name not found in state.`)
      return
    }
    const apig = new Capi({
      SecretId: this.context.credentials.tencent.SecretId,
      SecretKey: this.context.credentials.tencent.SecretKey,
      serviceType: 'apigateway'
    })

    const region = this.state.region;
    const apisLen = this.state.apis.length;
    for (let i = 0; i < apisLen; i++) {
      const endpoint = this.state.apis[i]
      if (!endpoint.apiId) continue

      if (endpoint.usagePlanId) {
        await UnBindSecretIds({ apig, Region: region, 
                    secretIds: endpoint.secretIds, usagePlanId: endpoint.usagePlanId })
        this.context.debug(`Unbinding Secretkey to UsagePlan with ID ${endpoint.usagePlanId}.`)
        await UnBindEnvironment({
          apig,
          Region: region,
          serviceId: endpoint.serviceId,
          usagePlanIds: [endpoint.usagePlanId],
          environment: endpoint.environment,
          bindType,
          apiIds: [endpoint.apiId]
        })
        this.context.debug(
          `Unbinding UsagePlan with ID ${endpoint.usagePlanId} to Service with ID ${endpoint.serviceId}.`
        )
        await DeleteUsagePlan({ apig, Region: region, usagePlanId: endpoint.usagePlanId })
      }

      this.context.debug(`Removing any previously deployed usagePlanIds.`)
      if (endpoint.secretIds instanceof Array && endpoint.secretIds.length > 0) {
        endpoint.secretIds.map(async (secretId) => {
          await DisableApiKey({ apig, Region: region, secretId })
          await DeleteApiKey({ apig, Region: region, secretId })
        })
      }
      this.context.debug(`Removing any previously deployed SecretKey.`)
      await DeleteApi({ apig, Region: region, 
                apiId: endpoint.apiId, serviceId: endpoint.serviceId})
      this.context.debug(`Removing any previously deployed API.`)
      await UnReleaseService({
        apig,
        Region: region,
        serviceId: endpoint.serviceId,
        environmentName: endpoint.environment,
        unReleaseDesc: 'Serverless Api-gateway Component Offline'
      })
    }
    const outputs = this.state.apis
    this.state = {}
    await this.save()
    return outputs
  }
}

module.exports = TencentApiGateway
