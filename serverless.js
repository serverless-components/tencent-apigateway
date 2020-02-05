const Capi = require('qcloudapi-sdk')
const tencentAuth = require('serverless-tencent-auth-tool')
const _ = require('lodash')
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
  DescribeApisStatus,
  ModifyService
} = require('./utils')

const serviceType = 'SCF'
const serviceTimeout = 15
const bindType = 'API'

class TencentApiGateway extends Component {
  getProtocolString(protocols) {
    return protocols.join('&').toLowerCase()
  }

  async default(inputs = {}) {
    // login
    const auth = new tencentAuth()
    this.context.credentials.tencent = await auth.doAuth(this.context.credentials.tencent, {
      client: 'tencent-apigateway',
      remark: inputs.fromClientRemark,
      project: this.context.instance ? this.context.instance.id : undefined,
      action: 'default'
    })

    this.context.status('Deploying')

    inputs.apiName = this.id.split('Template.')[1]
    inputs.serviceName = inputs.serviceName ? inputs.serviceName : 'serverless'
    const params = Validate(inputs)
    let { serviceId } = params
    const {
      region,
      description,
      serviceName,
      apiName,
      protocols,
      usagePlan,
      environment,
      endpoints
    } = params

    const protocol = this.getProtocolString(protocols)

    this.context.debug(
      `Starting API-Gateway deployment with name ${apiName} in the ${region} region`
    )
    const apig = new Capi({
      SecretId: this.context.credentials.tencent.SecretId,
      SecretKey: this.context.credentials.tencent.SecretKey,
      serviceType: 'apigateway',
      Token: this.context.credentials.tencent.token
    })

    const serviceInputs = {
      Region: region,
      serviceDesc: description,
      // Up to 50 characters，(a-z,A-Z,0-9,_)
      serviceName: serviceName,
      protocol
    }

    if (region == 'ap-beijing') {
      serviceInputs.exclusiveSetName = 'APIGW_FOR_SCF_SET1'
    }

    let subDomain = ''
    let serviceCreated = true

    if (serviceId) {
      const serviceMsg = await DescribeService({
        apig,
        Region: region,
        serviceId
      })
      serviceCreated = false
      subDomain = serviceMsg.subDomain
    } else {
      if (this.state && this.state.service && this.state.service.value) {
        serviceId = this.state.service.value
        this.context.debug(`Using last time deploy service id ${serviceId}`)
        try {
          const serviceMsg = await DescribeService({ apig, Region: region, serviceId })
          // serviceCreated = false
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
    } else {
      this.context.debug(`Updating service with serviceId ${serviceId}.`)
      await ModifyService({ apig, serviceId, ...serviceInputs })
    }

    const state = {
      protocols,
      subDomain: subDomain,
      environment: environment,
      region: region,
      service: {
        value: serviceId,
        created: serviceCreated
      }
    }

    const apiAuthSetting = async (ctx, region, apiClient, endpoint) => {
      let usagePlan = endpoint.usagePlan
      if (usagePlan == null) {
        usagePlan = {}
      }

      const usageInputs = {
        Region: region,
        usagePlanName: usagePlan.usagePlanName || '',
        usagePlanDesc: usagePlan.usagePlanDesc || '',
        maxRequestNumPreSec: usagePlan.maxRequestNumPreSec,
        maxRequestNum: usagePlan.maxRequestNum
      }

      const usagePlanId = {
        created: false,
        value: usagePlan.usagePlanId
      }

      if (!usagePlan.usagePlanId) {
        if (this.state && this.state.apis && _.isArray(this.state.apis)) {
          const oldApi = _.find(this.state.apis, (api) => {
            if (
              api.method.toLowerCase() == endpoint.method.toLowerCase() &&
              api.path == endpoint.path
            ) {
              return api
            }
          })
          if (!_.isEmpty(oldApi)) {
            this.context.debug(`Using last time deploy usage plan id ${oldApi.usagePlanId.value}.`)
            usagePlan.usagePlanId = oldApi.usagePlanId.value
            usagePlanId.created = oldApi.usagePlanId.created
            usagePlanId.value = oldApi.usagePlanId.value
          }
        }
      }

      if (!usagePlan.usagePlanId) {
        usagePlanId.value = await CreateUsagePlan({ apig: apiClient, ...usageInputs })
        usagePlanId.created = true
        ctx.context.debug(`Usage plan with ID ${usagePlanId.value} created.`)
      } else {
        await DescribeUsagePlan({
          apig: apiClient,
          usagePlanId: usagePlan.usagePlanId,
          Region: region
        })
        ctx.context.debug(`Updating usage plan with id ${usagePlan.usagePlanId}.`)
        await ModifyUsagePlan({
          apig: apiClient,
          usagePlanId: usagePlan.usagePlanId,
          ...usageInputs
        })
      }

      const secretIds = {
        created: false,
        value: endpoint.auth.secretIds
      }

      if (_.isEmpty(endpoint.auth.secretIds)) {
        ctx.context.debug(`Creating a new Secret key.`)
        const secretMsg = await CreateApiKey({
          apig: apiClient,
          Region: region,
          secretName: endpoint.auth.secretName,
          type: 'auto'
        })
        ctx.context.debug(
          `Secret key with ID ${secretMsg.secretId} and key ${secretMsg.secretKey} updated.`
        )
        secretIds.value = [secretMsg.secretId]
        secretIds.created = true
      } else {
        endpoint.auth.secretIds = _.uniq(endpoint.auth.secretIds)

        const len = endpoint.auth.secretIds.length
        // get all secretId, check local secretId exists
        const apiKeyResponse = await DescribeApiKeysStatus({
          apig: apiClient,
          secretIds: endpoint.auth.secretIds,
          Region: region,
          limit: len
        })
        const existKeysLen = apiKeyResponse.apiKeyStatusSet.length

        const ids = []
        for (let i = 0; i < len; i++) {
          const secretId = endpoint.auth.secretIds[i]
          let found = false
          let disable = false
          for (let n = 0; n < existKeysLen; n++) {
            if (
              apiKeyResponse.apiKeyStatusSet[n] &&
              secretId == apiKeyResponse.apiKeyStatusSet[n].secretId
            ) {
              if (apiKeyResponse.apiKeyStatusSet[n].status == 1) {
                found = true
              } else {
                disable = true
                ctx.context.debug(`There is a disabled secret key: ${secretId}, cannot be bound`)
              }
              break
            }
          }
          if (!found) {
            if (!disable) {
              ctx.context.debug(`Secret key id ${secretId} does't exist`)
            }
          } else {
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

    const filterUsagePlanSecretId = async (ctx, apig, region, usagePlanId, localSecretIds) => {
      const limit = 100
      const result = await DescribeUsagePlanSecretIds({
        apig: apig,
        Region: region,
        usagePlanId: usagePlanId,
        limit: limit,
        offset: 0
      })

      const localSecretIdsState = {}

      const filterSecretId = (onlineSecretIds, localSecretIds, localSecretIdsState) => {
        const len = _.size(localSecretIds)

        for (let i = 0; i < len; i++) {
          const localSecretId = localSecretIds[i]
          if (_.isUndefined(localSecretIdsState[localSecretId])) {
            localSecretIdsState[localSecretId] = 0
          }

          const findRet = _.find(onlineSecretIds, (onlineSecretIdObj) => {
            if (localSecretId == onlineSecretIdObj.secretId) {
              return onlineSecretIdObj.secretId
            }
          })
          if (findRet) {
            localSecretIdsState[localSecretId]++
            ctx.context.debug(`Usage plan ${usagePlanId} secret id ${localSecretId} already bound`)
          }
        }
      }

      let total = result.totalCount
      let offset = _.size(result.secretIdList)

      total -= offset

      filterSecretId(result.secretIdList, localSecretIds, localSecretIdsState)
      while (total > 0) {
        const resultPart = await DescribeUsagePlanSecretIds({
          apig: apig,
          Region: region,
          usagePlanId: usagePlanId,
          limit: limit,
          offset: offset
        })
        filterSecretId(resultPart.secretIdList, localSecretIds, localSecretIdsState)

        offset += _.size(resultPart.secretIdList)
        total -= _.size(resultPart.secretIdList)
      }

      const ids = []
      _.map(localSecretIdsState, (state, id) => {
        if (state == 0) {
          ids.push(id)
        }
      })
      return ids
    }

    // get service all api list
    const oldApis = await DescribeApisStatus({
      apig: apig,
      Region: region,
      serviceId: serviceId,
      // api max response 100 row
      limit: 100
    })

    const apis = []
    const outputs = []
    const len = endpoints.length
    for (let i = 0; i < len; i++) {
      const endpoint = endpoints[i]

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
        protocol: endpoint.protocol || 'HTTP',
        Region: region,
        serviceId: serviceId,
        apiName: apiName,
        apiDesc: endpoint.description,
        apiType: 'NORMAL',
        authRequired: endpoint.auth ? 'TRUE' : 'FALSE',
        enableCORS: endpoint.enableCORS ? 'TRUE' : 'FALSE',
        serviceType: serviceType,
        requestConfig: requestConfig,
        serviceTimeout: endpoint.serviceTimeout || serviceTimeout,
        responseType: endpoint.responseType || 'HTML'
      }

      const funcName = endpoint.function.functionName
      const funcQualifier = endpoint.function.functionQualifier
        ? endpoint.function.functionQualifier
        : '$LATEST'
        ? endpoint.function.functionQualifier
        : '$LATEST'

      if (endpoint.protocol === 'WEBSOCKET') {
        if (!endpoint.function.transportFunctionName) {
          throw new Error('"endpoints.function.transportFunctionName" is required')
        }
        apiInputs.serviceWebsocketTransportFunctionName = endpoint.function.transportFunctionName
        apiInputs.serviceWebsocketTransportFunctionQualifier = funcQualifier

        apiInputs.serviceWebsocketRegisterFunctionName = endpoint.function.registerFunctionName
        apiInputs.serviceWebsocketRegisterFunctionQualifier = funcQualifier

        apiInputs.serviceWebsocketCleanupFunctionName = endpoint.function.cleanupFunctionName
        apiInputs.serviceWebsocketCleanupFunctionQualifier = funcQualifier
      } else {
        if (!funcName) {
          throw new Error('"endpoints.function.functionName" is required')
        }
        apiInputs.serviceScfFunctionName = funcName
        ;(apiInputs.serviceScfIsIntegratedResponse = endpoint.function.isIntegratedResponse
          ? 'TRUE'
          : 'FALSE'),
          (apiInputs.serviceScfFunctionQualifier = funcQualifier)
      }

      if (endpoint.param) {
        apiInputs.requestParameters = endpoint.param
      }
      const apiId = {
        value: null,
        created: false
      }

      if (!endpoint.apiId) {
        const oldApi = _.find(oldApis.apiIdStatusSet, (api) => {
          if (
            api.method.toLowerCase() == endpoint.method.toLowerCase() &&
            api.path == endpoint.path
          ) {
            return api
          }
        })

        if (!_.isEmpty(oldApi)) {
          endpoint.apiId = oldApi.apiId

          this.context.debug(
            `Endpoint ${endpoint.method} ${endpoint.path} already exists with id ${oldApi.apiId}.`
          )

          const localApi = _.find(this.state.apis, (api) => {
            if (
              api.method.toLowerCase() == oldApi.method.toLowerCase() &&
              api.path == oldApi.path
            ) {
              return api
            }
          })
          if (!_.isEmpty(localApi)) {
            apiId.created = localApi.apiId.created
          }
        }
      }

      if (!endpoint.apiId) {
        apiId.value = await CreateApi({ apig, ...apiInputs })
        apiId.created = true
        this.context.debug(`API with id ${apiId.value} created.`)
        // if websocket, get internalDemain by DescribeApi
        if (endpoint.protocol === 'WEBSOCKET') {
          const { internalDomain } = await DescribeApi({
            apig,
            serviceId,
            apiId: apiId.value,
            Region: region
          })
          apiId.internalDomain = internalDomain
          output.internalDomain = internalDomain
        }
      } else {
        const { internalDomain } = await DescribeApi({
          apig,
          serviceId,
          apiId: endpoint.apiId,
          Region: region
        })

        this.context.debug(`Updating api with api id ${endpoint.apiId}.`)
        await ModifyApi({ apig, apiId: endpoint.apiId, ...apiInputs })
        apiId.value = endpoint.apiId

        if (endpoint.protocol === 'WEBSOCKET') {
          apiId.internalDomain = internalDomain
          output.internalDomain = internalDomain
        }
        this.context.debug(`Service with id ${apiId.value} updated.`)
      }

      api.apiId = apiId
      output.apiId = apiId.value

      if (endpoint.auth) {
        const result = await apiAuthSetting(this, region, apig, endpoint)
        if (!_.isEmpty(result.secretIds.value)) {
          const unboundSecretIds = await filterUsagePlanSecretId(
            this,
            apig,
            region,
            result.usagePlanId.value,
            result.secretIds.value
          )
          if (!_.isEmpty(unboundSecretIds)) {
            this.context.debug(
              `Binding secret key ${unboundSecretIds} to usage plan with id ${result.usagePlanId.value}.`
            )
            await BindSecretIds({
              apig,
              Region: region,
              secretIds: unboundSecretIds,
              usagePlanId: result.usagePlanId.value
            })
            this.context.debug('Binding secret key successed.')
          }
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
          if (usagePlan.usagePlanId == result.usagePlanId.value) {
            return usagePlan
          }
        })

        if (_.isEmpty(oldUsagePlan)) {
          this.context.debug(
            `Binding usage plan with id ${result.usagePlanId.value} to api id ${apiId.value} path ${endpoint.method} ${endpoint.path}.`
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
          this.context.debug(
            `Usage plan with id ${result.usagePlanId.value} already bind to api id ${apiId.value} path ${endpoint.method} ${endpoint.path}.`
          )
        }

        api.usagePlanId = result.usagePlanId
        api.secretIds = result.secretIds

        output.usagePlanId = result.usagePlanId.value
        output.secretIds = result.secretIds.value.join(',')
      }

      this.context.debug(`Deploying service with id ${serviceId}.`)
      await ReleaseService({
        apig: apig,
        Region: region,
        serviceId: serviceId,
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
      protocols,
      subDomain,
      environment,
      region,
      serviceId,
      apis: outputs
    }
  }

  async remove(inputs = {}) {
    // login
    const auth = new tencentAuth()
    this.context.credentials.tencent = await auth.doAuth(this.context.credentials.tencent, {
      client: 'tencent-apigateway',
      remark: inputs.fromClientRemark,
      project: this.context.instance ? this.context.instance.id : undefined,
      action: 'remove'
    })

    this.context.status('Removing')
    if (!this.state.apis) {
      this.context.debug(`Aborting removal. function name not found in state.`)
      return
    }

    const apig = new Capi({
      SecretId: this.context.credentials.tencent.SecretId,
      SecretKey: this.context.credentials.tencent.SecretKey,
      serviceType: 'apigateway',
      Token: this.context.credentials.tencent.token
    })

    const state = this.state
    const region = state.region
    const apisLen = state.apis.length

    // get service all api list
    const oldApis = await DescribeApisStatus({
      apig: apig,
      Region: region,
      serviceId: state.service.value,
      // api max response 100 row
      limit: 100
    })

    for (let i = 0; i < apisLen; i++) {
      const endpoint = state.apis[i]
      if (!endpoint.apiId) {
        continue
      }
      const oldEndpoint = _.find(oldApis.apiIdStatusSet, (item) => {
        if (endpoint.apiId.value == item.apiId) {
          return item
        }
      })

      if (_.isEmpty(oldEndpoint)) {
        this.context.debug(`Api resource dont't exixts ID ${endpoint.apiId.value}.`)
        continue
      }

      if (endpoint.usagePlanId) {
        if (!_.isEmpty(endpoint.secretIds.value)) {
          // await UnBindSecretIds({ apig, Region: region,
          //           secretIds: endpoint.secretIds.value,
          //           usagePlanId: endpoint.usagePlanId.value })
          await UnBindSecretIds({
            apig: apig,
            Region: region,
            secretIds: endpoint.secretIds.value,
            usagePlanId: endpoint.usagePlanId.value
          })
          this.context.debug(
            `Unbinding secret key to usage plan with ID ${endpoint.usagePlanId.value}.`
          )
        }

        await UnBindEnvironment({
          apig: apig,
          Region: region,
          serviceId: state.service.value,
          usagePlanIds: [endpoint.usagePlanId.value],
          environment: state.environment,
          bindType: bindType,
          apiIds: [endpoint.apiId.value]
        })
        this.context.debug(
          `Unbinding usage plan with ID ${endpoint.usagePlanId.value} to service with ID ${state.service.value}.`
        )

        if (endpoint.usagePlanId.created == true) {
          this.context.debug(
            `Removing any previously deployed usage plan ids ${endpoint.usagePlanId.value}`
          )
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
        await DeleteApi({
          apig: apig,
          Region: region,
          apiId: endpoint.apiId.value,
          serviceId: state.service.value
        })
        this.context.debug(`Removing any previously deployed API. ${endpoint.apiId.value}`)
      }
    }

    await UnReleaseService({
      apig: apig,
      Region: region,
      serviceId: state.service.value,
      environmentName: state.environment,
      unReleaseDesc: 'Serverless API-Gateway component offline'
    })

    if (state.service.created == true) {
      this.context.debug(`Removing any previously deployed service. ${state.service.value}`)
      await DeleteService({
        apig: apig,
        serviceId: state.service.value,
        Region: region
      })
    }
    const outputs = state.apis
    this.state = {}
    await this.save()
    return outputs
  }
}

module.exports = TencentApiGateway
