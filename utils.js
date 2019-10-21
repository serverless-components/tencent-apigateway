const CreateService = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'CreateService',
        ...inputs
      },
      function(err, data) {
        if (err) {
          reject(err)
        }
        resolve(data.data)
      }
    )
  })
}

const DescribeService = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'DescribeService',
        ...inputs
      },
      function(err, data) {
        if (err) {
          reject(err)
        }
        resolve(data)
      }
    )
  })
}

const CreateApi = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'CreateApi',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data.apiId)
      }
    )
  })
}

const ModifyApi = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'ModifyApi',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data.apiId)
      }
    )
  })
}

const ModifyService = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'ModifyService',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data.serviceId)
      }
    )
  })
}

const CreateUsagePlan = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'CreateUsagePlan',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data.usagePlanId)
      }
    )
  })
}

const ModifyUsagePlan = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'ModifyUsagePlan',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data.usagePlanId)
      }
    )
  })
}

const CreateApiKey = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'CreateApiKey',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const BindSecretIds = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'BindSecretIds',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const BindEnvironment = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'BindEnvironment',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const ReleaseService = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'ReleaseService',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const UnReleaseService = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'UnReleaseService',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const DeleteApi = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'DeleteApi',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const UnBindSecretIds = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'UnBindSecretIds',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const UnBindEnvironment = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'UnBindEnvironment',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const DeleteUsagePlan = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'DeleteUsagePlan',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const DeleteApiKey = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'DeleteApiKey',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

const DisableApiKey = ({ apig, ...inputs }) => {
  return new Promise((resolve) => {
    apig.request(
      {
        Action: 'DisableApiKey',
        ...inputs
      },
      function(err, data) {
        if (err) {
          throw Error(err.message)
        } else if (data.code !== 0) {
          throw Error(data.message)
        }
        resolve(data)
      }
    )
  })
}

module.exports = {
  CreateService,
  CreateApi,
  ModifyApi,
  ModifyService,
  CreateUsagePlan,
  ModifyUsagePlan,
  CreateApiKey,
  BindSecretIds,
  BindEnvironment,
  ReleaseService,
  DescribeService,
  UnReleaseService,
  DeleteApi,
  UnBindSecretIds,
  UnBindEnvironment,
  DeleteUsagePlan,
  DeleteApiKey,
  DisableApiKey
}
