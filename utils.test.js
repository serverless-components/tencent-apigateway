const test = require('tape')
const { Validate } = require('./utils')

test('Validate() - Minimal config', (t) => {
  t.plan(1)

  const config = {
    serviceName: 'test',
    endpoints: []
  }

  const expected = {
    protocols: ['http'],
    serviceName: 'test',
    endpoints: [],
    region: 'ap-guangzhou',
    environment: 'release'
  }

  t.deepEqual(Validate(config), expected)
})

test('Validate() - Protocols - Multiple', (t) => {
  t.plan(1)

  const config = {
    serviceName: 'test',
    protocols: ['http', 'https'],
    endpoints: []
  }

  const expected = {
    serviceName: 'test',
    endpoints: [],
    region: 'ap-guangzhou',
    protocols: ['http', 'https'],
    environment: 'release'
  }

  t.deepEqual(Validate(config), expected)
})

test('Validate() - Protocols - Invalid', (t) => {
  t.plan(1)

  const config = {
    protocols: ['foo'],
    serviceName: 'test',
    endpoints: []
  }

  t.throws(() => Validate(config), /value "foo" fails/)
})
