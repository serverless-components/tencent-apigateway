const { Component } = require('@serverless/core')
const { Apigw } = require('tencent-component-toolkit')
const { ApiTypeError } = require('tencent-component-toolkit/lib/utils/error')
const CONFIGS = require('./config')

class ServerlessComponent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new ApiTypeError(
        'CREDENTIAL',
        'Cannot get secretId/Key, your account could be sub-account and does not have the access to use SLS_QcsRole, please make sure the role exists first, then visit https://cloud.tencent.com/document/product/1154/43006, follow the instructions to bind the role to your account.'
      )
    }

    return {
      SecretId: tmpSecrets.TmpSecretId,
      SecretKey: tmpSecrets.TmpSecretKey,
      Token: tmpSecrets.Token
    }
  }

  getDefaultProtocol(protocols) {
    return String(protocols).includes('https') ? 'https' : 'http'
  }

  async deploy(inputs) {
    console.log(`Deploying API Gateway`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const apigw = new Apigw(credentials, inputs.region)

    inputs.oldState = this.state
    inputs.serviceId = inputs.serviceId || this.state.serviceId

    // make default config
    inputs.region = inputs.region || CONFIGS.region
    inputs.serviceName = inputs.serviceName || CONFIGS.serviceName
    inputs.protocols = inputs.protocols || CONFIGS.protocols
    inputs.environment = inputs.environment || CONFIGS.environment
    inputs.serviceDesc = inputs.serviceDesc || CONFIGS.serviceDesc
    inputs.endpoints = inputs.endpoints.map((item) => {
      if (item.oauthConfig) {
        item.oauthConfig.tokenLocation =
          CONFIGS.tokenLocationMap[item.oauthConfig.tokenLocation] || item.oauthConfig.tokenLocation
      }
      return item
    })

    const deployRes = await apigw.deploy(inputs)
    this.state = deployRes

    const apiOutput = []
    if (deployRes.apiList && deployRes.apiList.length > 0) {
      deployRes.apiList.forEach((api) => {
        const output = {
          path: api.path,
          method: api.method,
          apiId: api.apiId,
          authType: api.authType,
          businessType: api.businessType,
          internalDomain: api.internalDomain || undefined,
          isBase64Encoded: api.isBase64Encoded,
          usagePlanId: api.usagePlan && api.usagePlan.usagePlanId,
          secretIds:
            api.usagePlan &&
            api.usagePlan.secrets &&
            api.usagePlan.secrets.secretIds &&
            api.usagePlan.secrets.secretIds.length > 0 &&
            api.usagePlan.secrets.secretIds.join(',')
        }
        if (api.authRelationApiId) {
          output.authRelationApiId = api.authRelationApiId
        }
        apiOutput.push(output)
      })
    }

    const outputs = {
      url: `${this.getDefaultProtocol(deployRes.protocols)}://${deployRes.subDomain}/${
        deployRes.environment
      }/`,
      protocols: deployRes.protocols,
      subDomain: deployRes.subDomain,
      environment: deployRes.environment,
      region: inputs.region,
      serviceId: deployRes.serviceId,
      apis: apiOutput
    }

    if (deployRes.customDomains && deployRes.customDomains.length > 0) {
      outputs.customDomains = []
      deployRes.customDomains.forEach((domain) => {
        if (domain.isBinded === false) {
          outputs.customDomains.push({
            domain: domain.subDomain,
            cname: domain.cname,
            message: domain.message
          })
        } else {
          outputs.customDomains.push({
            domain: domain.subDomain,
            cname: domain.cname
          })
        }
      })
    }

    return outputs
  }

  async remove(inputs) {
    console.log(`Removing API Gateway`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const { state } = this
    const apigw = new Apigw(credentials, state.region)

    // support force delete api gateway by command param: --inputs force=true
    if (inputs.force === true) {
      try {
        state.created = true
        if (state.apiList && state.apiList.length > 0) {
          state.apiList = state.apiList.map((item) => {
            item.created = true
            if (item.usagePlan) {
              item.usagePlan.created = true
              if (item.usagePlan.secrets) {
                item.usagePlan.secrets = item.usagePlan.secrets.map((up) => {
                  up.created = true
                  return up
                })
              }
            }
            return item
          })
        }
      } catch (e) {}
    }
    if (state && state.serviceId) {
      await apigw.remove(state)
    }
    this.state = {}
    return {}
  }
}

module.exports = ServerlessComponent
