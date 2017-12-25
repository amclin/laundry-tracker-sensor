var rpio = require('rpio')
var config = {}

rpio.init({mock: 'raspi-3'})

/**
 * Loads the config from a file
 *
 * @return Object config object
 **/
var loadConfig = function (file) {
  file = file || 'config.json'
  var fs = require('fs')
  var contents = fs.readFileSync(file)
  var config = JSON.parse(contents)
  console.log('Reading sensor configs from file:', config)
  return config
}

/**
 * Loops through the configured list of pins and sets
 * them to a read state
 */
var initSensors = function (sensors) {
  sensors.forEach(function (el) {
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
  console.log('Reading Sensors:', sensors)

  var sensorStates = []

  sensors.forEach(function (el) {
    sensorStates.push({
      pin: el.pin,
      state: rpio.read(el.pin)
    })
  })

  return sensorStates
}

/**
 * Send the current states to the remote gateway
 */
var publishStates = function () {
  var request = require('request')
  var states = readSensors(config.sensors)
  var data = {
    form: {
      states: states
    }
  }

  console.log('Publishing sensor states to ', config.gateway, states)
  request.post(config.gateway, data, (err, res, body) => {
    if (err) { console.error(err) }
  })
}

/**
 * Starts watching the sensors and running the publish loop
 **/
function start () {
  config = loadConfig()
  initSensors(config.sensors)

  setInterval(() => {
    publishStates()
  }, config.publishInterval)
}

module.exports = function () {
  return {
    config: config,
    readSensors: readSensors,
    initSensors: initSensors,
    rpio: rpio
  }
}

module.exports.start = start

if (require.main === module) {
  start()
}
