const CONFIGS = {
  compName: 'apigateway',
  compFullname: 'Apigateway',
  region: 'ap-guangzhou',
  serviceName: 'serverless',
  protocols: ['http'],
  environment: 'release',
  serviceDesc: 'Created by Serverless Component',
  tokenLocationMap: {
    authorization: 'method.req.header.authorization',
    cookie: 'method.req.header.cookie'
  }
}

module.exports = CONFIGS
