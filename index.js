// var rpio = require('rpio')
var fs = require('fs')

// Get settings from config file
console.log('Reading sensor configs from file.')
var contents = fs.readFileSync('config.json')
var config = JSON.parse(contents)

console.log(config)

module.exports = function () {
  config.foo = 'bar'
  return config
}
