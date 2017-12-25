var rpio = require('rpio')

/**
 * Loads the config from a file
 *
 * @return Object config object
 **/
var loadConfig = function () {
  var fs = require('fs')
  var contents = fs.readFileSync('config.json')
  var config = JSON.parse(contents)
  console.log('Reading sensor configs from file:', config)
  return config
}

/**
 * Loops through the configured list of pins and sets
 * them to a read state
 */
var initSensors = function () {
  config.sensors.forEach(function (el) {
    rpio.open(el.pin, rpio.INPUT)
  })
}

/**
 * Loops through the configured sensors and returns
 * their current state
 *
 * @param Array List of sensors to ready
 * @return Array List of objects containing sensors and their states
 **/
var readSensors = function (sensors) {
  var sensorStates = []

  sensors.forEach(function (el) {
    sensorStates.push({
      pin: el.pin,
      state: rpio.read(el.pin)
    })
  })

  return sensorStates
}

var config = loadConfig()

module.exports = function () {
  return {
    config: config,
    readSensors: readSensors,
    initSensors: initSensors
  }
}
