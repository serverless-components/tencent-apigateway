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
  DisableApiKey
} = require('./utils')

const defaults = {
  Region: 'ap-guangzhou',
  protocol: 'http',
  maxRequestNumPreSec: 1000,
  maxRequestNum: -1,
  authRequired: 'TRUE', // 是否需要签名认证，TRUE表示需要，FALSE 表示不需要。默认为 TRUE。如果需要开放在云市场的 API，必须选择 TRUE。
  enableCORS: 'TRUE',
  serviceScfFunctionQualifier: '$LATEST',
  serviceScfIsIntegratedResponse: 'FALSE',
  serviceTimeout: 15,
  environment: 'release'
}

class TencentApiGateway extends Component {
  async default(inputs = {}) {
    this.context.status('Deploying')
    const config = {
      ...defaults,
      ...inputs,
      serviceType: 'SCF',
      apiType: 'NORMAL',
      bindType: 'API'
    }
    config.apiName = this.id.split('Template.')[1]
    let {
      Region,
      apiId,
      serviceId,
      serviceDesc,
      serviceName,
      apiName,
      apiDesc,
      apiType,
      authRequired,
      enableCORS,
      requestConfig,
      serviceType,
      serviceTimeout,
      serviceScf,
      protocol,
      usagePlanId,
      usagePlanName,
      usagePlanDesc,
      maxRequestNumPreSec,
      maxRequestNum,
      secretIds,
      secretName,
      environment,
      bindType
    } = config

    this.context.debug(
      `Starting API Gateway deployment with name ${apiName} in the ${Region} region`
    )

    const apig = new Capi({
      SecretId: this.context.credentials.tencent.tencent_secret_id,
      SecretKey: this.context.credentials.tencent.tencent_secret_key,
      serviceType: 'apigateway'
    })
    this.state.Region = Region
    await this.save()

    const serviceInputs = { Region, serviceDesc, serviceName, protocol: protocol.toLowerCase() }
    if (!serviceId) {
      this.context.debug(`Service ID not found in state. Creating a new Service.`)
      const serviceMsg = await CreateService({ apig, ...serviceInputs })
      this.context.debug(`Service with ID ${serviceMsg.serviceId} created.`)
      serviceId = serviceMsg.serviceId
      console.log(serviceMsg)
      this.state.serviceId = serviceMsg.serviceId
      this.state.subDomain = serviceMsg.subDomain
      await this.save()
    } else {
      this.context.debug(`Updating Service with serviceId ${serviceId}.`)
      await ModifyService({ apig, serviceId, ...serviceInputs })
      const serviceMsg = await DescribeService({ apig, Region, serviceId })
      this.context.debug(`Service with ID ${serviceId} Updated.`)
      this.state.serviceId = serviceMsg.serviceId
      this.state.subDomain = serviceMsg.subDomain
      await this.save()
    }

    const apiInputs = {
      Region,
      serviceId,
      apiName,
      apiDesc,
      apiType,
      authRequired: authRequired.toString().toLocaleUpperCase(),
      enableCORS: enableCORS.toString().toLocaleUpperCase(),
      requestConfig,
      serviceType,
      serviceTimeout,
      serviceScfFunctionName: serviceScf.FunctionName,
      serviceScfIsIntegratedResponse: serviceScf.IsIntegratedResponse.toString().toLocaleUpperCase(),
      serviceScfFunctionQualifier: serviceScf.FunctionQualifier.toString().toLocaleUpperCase()
    }

    if (!apiId) {
      this.context.debug(`API ID not found in state. Creating a new API.`)
      apiId = await CreateApi({ apig, ...apiInputs })
      this.context.debug(`API with ID ${apiId} created.`)
      this.state.apiId = apiId
      await this.save()
    } else {
      this.context.debug(`Updating api with apiId ${apiId}.`)
      apiId = await ModifyApi({ apig, apiId, ...apiInputs })
      this.context.debug(`Service with ID ${apiId} Updated.`)
      this.state.apiId = apiId
      await this.save()
    }

    if (authRequired) {
      const usageInputs = {
        Region,
        usagePlanName: usagePlanName || `usagePlanName_${apiId.split('api-')[1]}`,
        usagePlanDesc,
        maxRequestNumPreSec,
        maxRequestNum
      }
      if (!usagePlanId) {
        this.context.debug(`UsagePlan ID not found in state. Creating a new UsagePlan.`)
        usagePlanId = await CreateUsagePlan({ apig, ...usageInputs })
        this.context.debug(`UsagePlan with ID ${usagePlanId} created.`)
        this.state.usagePlanId = usagePlanId
        await this.save()
      } else {
        this.context.debug(`Updating UsagePlan with usagePlanId ${usagePlanId}.`)
        usagePlanId = await ModifyUsagePlan({ apig, usagePlanId, ...usageInputs })
        this.context.debug(`UsagePlan with ID ${usagePlanId} Updated.`)
        this.state.usagePlanId = usagePlanId
        await this.save()
      }

      if (!secretIds) {
        this.context.debug(`Secretkey List not found in state. Creating a new Secretkey.`)
        const SecretMsg = await CreateApiKey({
          apig,
          Region,
          secretName: secretName || `secretName_${apiId.split('api-')[1]}`,
          type: 'auto'
        })
        this.context.debug(
          `Secretkey with ID ${SecretMsg.secretId} and KEY ${SecretMsg.secretKey} Updated.`
        )
        this.state.secretId = SecretMsg.secretId
        secretIds = [SecretMsg.secretId]
        this.state.secretIds = secretIds
        await this.save()
      }
      this.context.debug(`Binding Secretkey to UsagePlan with ID ${usagePlanId}.`)
      this.state.secretIds = secretIds
      this.state.environment = environment
      await this.save()
      await BindSecretIds({ apig, Region, secretIds, usagePlanId })
      this.context.debug(`Binding sucessed.`)
      this.context.debug(
        `Binding UsagePlan with ID ${usagePlanId} to Service with ID ${serviceId}.`
      )
      await BindEnvironment({
        apig,
        Region,
        usagePlanIds: [usagePlanId],
        serviceId,
        environment,
        bindType,
        apiIds: [apiId]
      })
      this.context.debug(`Binding sucessed.`)
    }
    this.context.debug(`Deploying service with ID ${serviceId}.`)
    await ReleaseService({
      apig,
      Region,
      serviceId,
      environmentName: environment,
      releaseDesc: '由Serverless Api-gateway Component自动发布'
    })
    this.context.debug(
      `Deployment successful for the API named ${apiName} in the ${Region} region.`
    )
    const outputs = {
      protocol,
      serviceId,
      subDomain: this.state.subDomain,
      requestConfig
    }
    if (authRequired) {
      outputs.identity = { secretIds: secretIds || [this.state.secretId] }
    }
    this.context.debug(`${JSON.stringify(outputs)}`)

    return outputs
  }

  async remove(inputs = {}) {
    const { Region, apiId, serviceId, secretIds, usagePlanId, apiName, environment } = this.state
    this.context.status('Removing')
    this.context.debug(
      `Starting API Gateway deployment with name ${apiName} in the ${Region} region`
    )

    const apig = new Capi({
      SecretId: this.context.credentials.tencent.tencent_secret_id,
      SecretKey: this.context.credentials.tencent.tencent_secret_key,
      serviceType: 'apigateway'
    })

    if (this.state.apiId) {
      this.context.debug(
        `API ID ${this.state.id} found in state. Removing from the ${this.state.Region}.`
      )
      await UnBindSecretIds({ apig, Region, secretIds, usagePlanId })
      this.context.debug(`Unbinding Secretkey to UsagePlan with ID ${usagePlanId}.`)
      await UnBindEnvironment({
        apig,
        Region,
        serviceId,
        usagePlanIds: [usagePlanId],
        environment,
        bindType: 'API',
        apiIds: [apiId]
      })
      this.context.debug(
        `Unbinding UsagePlan with ID ${usagePlanId} to Service with ID ${serviceId}.`
      )
      await DeleteUsagePlan({ apig, Region, usagePlanId })
      this.context.debug(`Removing any previously deployed usagePlanIds.`)
      if (secretIds instanceof Array && secretIds.length > 0) {
        secretIds.map(async (secretId) => {
          await DisableApiKey({ apig, Region, secretId })
          await DeleteApiKey({ apig, Region, secretId })
        })
      }
      this.context.debug(`Removing any previously deployed SecretKey.`)
      await DeleteApi({ apig, Region, apiId, serviceId })
      this.context.debug(`Removing any previously deployed API.`)
      await UnReleaseService({
        apig,
        Region,
        serviceId,
        environmentName: environment,
        unReleaseDesc: '由Serverless Api-gateway Component自动下线'
      })
    } else {
      this.context.debug(`No API ID found in state.`)
    }
    const outputs = {
      Region,
      apiId,
      serviceId,
      secretIds,
      usagePlanId,
      environment
    }

    this.context.debug(`Flushing state for the API Gateway component.`)
    this.state = {}
    await this.save()
    this.context.debug(`${JSON.stringify(outputs)}`)
    return outputs
  }
}

module.exports = TencentApiGateway
