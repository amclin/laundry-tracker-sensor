var tap = require('tap')
var sensor = require('../index.js')

tap.equal(sensor().foo, 'bar')

tap.pass('tests passed.')
