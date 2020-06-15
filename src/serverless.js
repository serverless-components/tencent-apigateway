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

    const apigw = new Apigw(credentials)

    inputs.oldState = this.state
    const deployRes = await apigw.deploy(inputs)
    this.state = deployRes

    // TODO: change to apigw outputs
    const outputs = {}

    return outputs
  }

  async remove() {
    console.log(`Removing API Gateway...`)

    // get tencent cloud credentials
    const credentials = this.getCredentials()

    const cdn = new Apigw(credentials)
    await cdn.remove({ domain })
    this.state = {}
    return {}
  }
}

module.exports = ServerlessComponent
