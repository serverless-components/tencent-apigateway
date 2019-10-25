const Capi = require('qcloudapi-sdk')
const _    = require('lodash')
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
  DescribeApiUsagePlan,
  DeleteService,
  CheckExistsFromError,
  DescribeApi,
  DescribeApisStatus
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

    let subDomain = ''
    let serviceCreated = true

    if (serviceId) {
        const serviceMsg = await DescribeService({ apig, Region: region, serviceId })
        serviceCreated = false
        subDomain = serviceMsg.subDomain
    } else {
      if (this.state && this.state.service && this.state.service.value) {
        serviceId = this.state.service.value
        this.context.debug(`Using last time deploy service id ${serviceId}`)
        try {
          const serviceMsg = await DescribeService({ apig, Region: region, serviceId })
          serviceCreated = false
          subDomain = serviceMsg.subDomain
        } catch (e) {
          if (!CheckExistsFromError(e)) {
            this.context.debug(`Service ID ${serviceId} not found. Creating a new Service.`)
            serviceId = null
          } else {
            throw e
          }
        }
      }
    }

    if (!serviceId) {
      const serviceMsg = await CreateService({ apig, ...serviceInputs })
      serviceCreated = true
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

      if (!usagePlan.usagePlanId) {
        usagePlanId.value = await CreateUsagePlan({ apig: apiClient, ...usageInputs })
        usagePlanId.created = true;
        ctx.context.debug(`UsagePlan with ID ${usagePlanId.value} created.`)
      } else {

        await DescribeUsagePlan({apig: apiClient, usagePlanId: usagePlan.usagePlanId, Region: region})
        ctx.context.debug(`Updating UsagePlan with usagePlanId ${usagePlan.usagePlanId}.`)
        await ModifyUsagePlan({ apig: apiClient, usagePlanId: usagePlan.usagePlanId, ...usageInputs })
      }

      let secretIds = {
        created: false,
        value: endpoint.auth.secretIds
      }
      
      if (_.isEmpty(endpoint.auth.secretIds)) {
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

        endpoint.auth.secretIds = _.uniq(endpoint.auth.secretIds)

        const len = endpoint.auth.secretIds.length
        // get all secretId, check local secretId exists
        const apiKeyResponse = await DescribeApiKeysStatus({ apig: apiClient, 
          secretIds: endpoint.auth.secretIds, Region: region, limit: len })
        const existKeysLen = apiKeyResponse.apiKeyStatusSet.length
        
        const ids = []
        for (let i = 0; i < len; i++) {
          const secretId = endpoint.auth.secretIds[i]
          let found = false
          for (let n = 0; n < existKeysLen; n++) {
            if (apiKeyResponse.apiKeyStatusSet[n] && secretId == apiKeyResponse.apiKeyStatusSet[n].secretId) {
              if (apiKeyResponse.apiKeyStatusSet[n].status == 1) {
                found = true
              } else {
                ctx.context.debug(`There is a disabled secret key: ${secretId}, cannot be bound`)
              }
              break
            }
          } 

          if (!found) {
            ctx.context.debug(`Secret key id ${secretId} does't exist`)
          }else {
            ids.push(secretId)
          }

          secretIds.value = ids
        }
      }

      return {
        usagePlanId,
        secretIds
      }
    }

    // get service all api list
    const oldApis = await DescribeApisStatus({
      apig: apig, 
      Region: region,
      serviceId: serviceId,
      // api max response 100 row
      limit: 100
    })

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

      if (!endpoint.apiId) {
        const oldApi = _.find(oldApis.apiIdStatusSet, (api) => {
          if (api.method.toLowerCase() == endpoint.method.toLowerCase() && 
            api.path == endpoint.path)
            return api
        })

        if (!_.isEmpty(oldApi)) {
          this.context.debug(`Endpoint ${endpoint.method} ${endpoint.path} already exists with id ${oldApi.apiId}.`)
          endpoint.apiId = oldApi.apiId
        }
      }

      if (!endpoint.apiId) {
        apiId.value = await CreateApi({ apig, ...apiInputs })
        this.context.debug(`API with id ${apiId.value} created.`)
      } else {
        await DescribeApi({ apig, serviceId, apiId: endpoint.apiId, Region: region })
        this.context.debug(`Updating api with api id ${endpoint.apiId}.`)
        await ModifyApi({ apig, apiId: endpoint.apiId, ...apiInputs })
        apiId.value   = endpoint.apiId
        apiId.created = false
        this.context.debug(`Service with id ${apiId.value} updated.`)
      }

      api.apiId    = apiId;
      output.apiId = apiId.value

      if (endpoint.auth) {
        const result = await apiAuthSetting(this, region, apig, endpoint)
        if (!_.isEmpty(result.secretIds.value)) {
          this.context.debug(`Binding secret key ${result.secretIds.value} to usage plan with id ${result.usagePlanId.value}.`)

          // todo check secret already bind
          await BindSecretIds({ apig, Region: region, 
                          secretIds: result.secretIds.value, 
                          usagePlanId: result.usagePlanId.value })

          this.context.debug('Binding secret key successed.')
        } else {
          this.context.debug('The auth valid secret key is empty.')
        }

        const apiUsagePlans = await DescribeApiUsagePlan({
          apig: apig,
          serviceId: serviceId,
          Region: region,
          apiIds: [apiId.value]
        })

        const oldUsagePlan = _.find(apiUsagePlans.usagePlanList, (usagePlan) => {
          if (usagePlan.usagePlanId == result.usagePlanId.value)
            return usagePlan
        })

        if (_.isEmpty(oldUsagePlan)) {
          this.context.debug(
            `Binding usage plan with id ${result.usagePlanId.value} to api id ${endpoint.apiId} path ${endpoint.method} ${endpoint.path}.`
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
          this.context.debug('Binding successed.')
        } else {
          this.context.debug(`Usage plan with id ${result.usagePlanId.value} already bind to api id ${endpoint.apiId} path ${endpoint.method} ${endpoint.path}.`) 
        }

        api.usagePlanId = result.usagePlanId
        api.secretIds   = result.secretIds

        output.usagePlanId = result.usagePlanId.value
        output.secretIds   = result.secretIds.value.join(',')
      }

      this.context.debug(`Deploying service with id ${serviceId}.`)
      await ReleaseService({
        apig,
        Region: region,
        serviceId,
        environmentName: environment,
        releaseDesc: 'Serverless api-gateway component deploy'
      })
      this.context.debug(
        `Deployment successful for the api named ${apiName} in the ${region} region.`
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
      this.context.debug(`Aborting removal. function name not found in state.`)
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
        this.context.debug(`Unbinding secret key to usage plan with ID ${endpoint.usagePlanId.value}.`)
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
          `Unbinding usage plan with ID ${endpoint.usagePlanId.value} to service with ID ${endpoint.serviceId}.`
        )

        if (endpoint.usagePlanId.created == true) {
          this.context.debug(`Removing any previously deployed usage plan ids ${endpoint.usagePlanId.value}`)
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
