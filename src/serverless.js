const { Component } = require('@serverless/core')
const { Apigw } = require('tencent-component-toolkit')
const { TypeError } = require('tencent-component-toolkit/src/utils/error')

class ServerlessComponent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new TypeError(
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

  async deploy(inputs) {
    console.log(`Deploying API Gateway...`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const apigw = new Apigw(credentials, inputs.region)

    inputs.oldState = this.state
    inputs.serviceId = this.state.serviceId
    const deployRes = await apigw.deploy(inputs)
    this.state = deployRes

    const apiOutput = []
    if (deployRes.apiList && deployRes.apiList.length > 0) {
      deployRes.apiList.forEach((api) => {
        const output = {
          path: api.path,
          method: api.method,
          apiId: api.apiId,
          internalDomain: api.internalDomain || undefined,
          usagePlanId: api.usagePlan && api.usagePlan.usagePlanId,
          secretIds:
            api.usagePlan &&
            api.usagePlan.secrets &&
            api.usagePlan.secrets.secretIds.length > 0 &&
            api.usagePlan.secrets.secretIds.join(',')
        }
        apiOutput.push(output)
      })
    }

    const outputs = {
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
        outputs.customDomains.push({
          domain: domain.subDomain,
          cname: domain.cname
        })
      })
    }

    return outputs
  }

  async remove() {
    console.log(`Removing API Gateway...`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const { state } = this
    const apigw = new Apigw(credentials, state.region)
    await apigw.remove(state)
    this.state = {}
    return {}
  }
}

module.exports = ServerlessComponent
