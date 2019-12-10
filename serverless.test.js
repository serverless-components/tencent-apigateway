const test = require('tape')
const Component = require('./serverless')

test('getProtocolString()', (t) => {
  t.plan(4)

  const comp = new Component()
  t.equal(comp.getProtocolString(['http']), 'http')
  t.equal(comp.getProtocolString(['https']), 'https')
  t.equal(comp.getProtocolString(['http', 'https']), 'http&https')
  t.equal(comp.getProtocolString(['HTTP', 'hTTpS']), 'http&https')
})
