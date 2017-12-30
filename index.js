var rpio = require('rpio')
var config = {}

// rpio.init({mock: 'raspi-3'})

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
  var streams = {}

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
    var sensorBuffer = Buffer.alloc(config.sampleSize)
    sensorStates.push({
      pin: el.pin,
      state: readSensorBuffer(el.pin, config.sampleSize)
    })
  })

  console.log('Sensor values:', sensorStates)

  return sensorStates 
}

/**
 * Read from a sensor using a buffer
 * because the sensor used has instant feedback
 *
 * @param number Pin to sample
 * @param number amount of samples to take to check state
 **/
var readSensorBuffer = function(pin, sampleSize) {
  var samples = new Buffer.alloc(sampleSize, 1)

  // Collect some samples
  rpio.readbuf(pin, samples);

  // If sensor was closed at any point in the last sampleCount
  // consider the sensor triggered
  return !samples.includes(0);
}

/**
 * Prepare the data object that will be sent to the gateway
 *
 * @param object sensorData containing an array of pins and results
 * @return object formatted data ready to send to API
 **/
var prepareRequestData = function (sensorData) {
  var data = {}
  var time = new Date().getTime() / 1000 | 0

  // Loop through the sensors and match to the IDs
  data = sensorData.map(function (sensor, idx) {
    var machine = config.sensors.find(function (el) {
      return (el.pin === sensor.pin)
    })

    return {
      machine: machine.id,
      pin: sensor.pin,
      state: sensor.state
    }
  })

  return {
    location: config.locationid,
    timestamp: time.toString(),
    states: data
  }
}

/**
 * Send the current states to the remote gateway
 */
var publishStates = function () {
  var request = require('request')
  var states = readSensors(config.sensors)
  var data = prepareRequestData(states)

  var options = {
    method: 'POST',
    baseUrl: config.gateway,
    url: '/events',
    'x-api-key': config.apikey,
    json: true,
    body: data
  }

  function callback (error, response, body) {
    if (!error && response.statusCode === 200) {
      console.log('Data published')
    } else {
      console.log('Publish failed:', error, response)
    }
  }

  console.log('Publishing sensor states to ', config.gateway, data)

  request(options, callback)
}

/**
 * Initialization sequence
 **/
function initIndicator () {
  rpio.open(config.indicatorPin, rpio.OUTPUT, rpio.LOW)

  // blink on/off for a few seconds to indicate started
  var interval = 1000
  var state = rpio.HIGH;

  var loopIndicator = function() {
    // toggle state for next interval
    state = (state === rpio.HIGH) ? rpio.LOW : rpio.HIGH
    rpio.write(config.indicatorPin, state)

    // Stop the blinking in on state
    if (interval < .0001) {
      rpio.write(config.indicatorPin, rpio.HIGH)
    } else {
      // Loop the blinking, decreasing the interval each
      // blink so it speeds up
      interval = interval * .9;
      setTimeout(loopIndicator, interval)
    }
  }

  // Start the blink
  rpio.write(config.indicatorPin, rpio.HIGH)
  setTimeout(loopIndicator, interval)
}

/**
 * Starts watching the sensors and running the publish loop
 **/
function start () {
  config = loadConfig()
  initIndicator()
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
