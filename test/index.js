var tap = require('tap')
var sensor = require('../index')

// Loads the config object
tap.equal(typeof sensor().config, 'object')

// initSensors opens all the pins in read mode
sensor().initSensors(sensor().config.sensors)

// Loops through all configured sensors to read states
tap.equal(sensor().readSensors().length, sensor().config.sensors.length)
