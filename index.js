console.log('Starting laundry sensor service.')

var rpio = require('rpio')
const config = require('./config.json')

// rpio.init({mock: 'raspi-3'})

/**
 * Loops through the configured list of pins and sets
 * them to a read state
 */
var initSensors = function (sensors) {
  sensors.forEach(function (el) {
    rpio.open(el.pin, rpio.INPUT)
    rpio.pud(el.pin, rpio.PULL_DOWN)
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
  console.log('Reading Sensors:', sensors.length)

  var sensorStates = []

  sensors.forEach(function (el) {
    sensorStates.push({
      pin: el.pin,
      state: readSensorBuffer(el.pin, config.sampleSize, config.sampleWindow)
    })
  })

  console.log('Done reading sensors.')

  return sensorStates
}

/**
 * Read from a sensor using a buffer
 * because the sensor used has instant feedback
 *
 * @param number Pin to sample
 * @param number amount of samples to take to check state
 * @param number time in ms to wait for sample buffer to fill
 **/
var readSensorBuffer = function (pin, sampleSize, sampleDuration) {
  console.log('Reading pin:', pin)

  // Collect some samples
  var samples = Buffer.alloc(sampleSize, 0)
  rpio.readbuf(pin, samples)

  // Pause to give some time to fill a buffer with data
  var logger = setInterval(function () {
    process.stdout.write('.')
  }, 100)
  rpio.msleep(sampleDuration)
  clearInterval(logger)

  // Respond with the state
  var state = samples.includes(1)
  var message = (state) ? '\x1b[32m[On]\x1b[0m' : '\x1b[33m[Off]\x1b[0m'
  console.log(message)
  return state
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
 * Send the current data to the remote gateway
 */
var publishData = function (data) {
  // Allow for a debug mode by configuration where we don't post
  // to a remote server
  if (!config.publishing) {
    return
  }

  var request = require('request')
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
 * Blinks the LED a designated number of times
 *
 * @param count
 **/
async function blinkLED (count) {
  var led = config.indicatorPin
  var off = rpio.LOW
  var on = rpio.HIGH
  function sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Turn off LED so we can blink
  rpio.write(led, off)
  await sleep(400)

  // Blink the LED
  for (var x = 0; x < count; x++) {
    rpio.write(led, on)
    await sleep(200)
    rpio.write(led, off)
    await sleep(200)
  }

  await sleep(400)
  // Restore LED to on
  rpio.write(led, on)
}

/**
 * Initialization sequence
 **/
async function initIndicator () {
  rpio.open(config.indicatorPin, rpio.OUTPUT, rpio.LOW)

  // blink on/off for a few seconds to indicate started
  var interval = 600
  var state = rpio.HIGH

  var loopIndicator = function () {
    rpio.write(config.indicatorPin, state)

    // Stop the blinking in on state
    if (interval < 0.01) {
      rpio.write(config.indicatorPin, rpio.HIGH)
    } else {
      // toggle state for next interval
      state = (state === rpio.HIGH) ? rpio.LOW : rpio.HIGH
      // Loop the blinking, decreasing the interval each
      // blink so it speeds up
      interval = interval * 0.9
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
  initIndicator()
  initSensors(config.sensors)

  function loop () {
    var states = readSensors(config.sensors)
    var data = prepareRequestData(states)
    // Blink the LED for each machine that's on
    blinkLED(data.states.filter((el) => { return el.state }).length)
    // Send the data to the cloud
    publishData(data)
    // Wait before running again
    setTimeout(loop, config.publishInterval)
  }

  // Start the loop after initial delay to give
  // time for the startup blink and init to run
  setTimeout(loop, config.publishInterval)
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
