const { Component } = require('@serverless/core')
const { Apigw } = require('tencent-component-toolkit')

class ServerlessComponent extends Component {
  getCredentials() {
    const { tmpSecrets } = this.credentials.tencent

    if (!tmpSecrets || !tmpSecrets.TmpSecretId) {
      throw new Error(
        'Cannot get secretId/Key, your account could be sub-account or does not have access, please check if SLS_QcsRole role exists in your account, and visit https://console.cloud.tencent.com/cam to bind this role to your account.'
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
    const deployRes = await apigw.deploy(inputs)
    this.state = deployRes

    let apiOutput = []
    if (deployRes.apiList && deployRes.apiList.length > 0) {
      for (let api of deployRes.apiList) {
        const output = {
          path: api.path,
          method: api.method,
          apiId: api.apiId,
          internalDomain: api.internalDomain || undefined,
          usagePlanId: api.usagePlan && api.usagePlan.usagePlanId,
          secretIds: api.usagePlan && api.usagePlan.secrets && api.usagePlan.secrets.secretIds.length > 0
            && api.usagePlan.secrets.secretIds.join(',')
        }
        apiOutput.push(output)
      }
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
      outputs.customDomains = [];
      for (let domain of deployRes.customDomains) {
        outputs.customDomains.push({
          domain: domain.subDomain,
          cname: domain.cname
        })
      }

    }

    return outputs
  }

  async remove() {
    console.log(`Removing API Gateway...`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const apigw = new Apigw(credentials, this.state.region)
    await apigw.remove(this.state)
    this.state = {}
    return {}
  }
}

module.exports = ServerlessComponent
