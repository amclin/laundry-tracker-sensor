var tap = require('tap')
var sensor = require('../index.js')

// Loads the config object
tap.equal(typeof sensor().config, 'object')
