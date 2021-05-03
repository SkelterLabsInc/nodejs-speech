const av = require('av')
const { credentials } = require('@grpc/grpc-js')
const fs = require('fs')
const { hideBin } = require('yargs/helpers')
const pcmConvert = require('pcm-convert')
const speech = require('@google-cloud/speech')
const yargs = require('yargs/yargs')

async function main (argv) {
  const audio = av.Asset.fromFile(argv.path)
  const format = await new Promise((resolve) => {
    audio.get('format', resolve)
  })

  let sampleRate = format.sampleRate
  if (format.channelsPerFrame != 1) {
    console.warn('AIQ.STT supports mono audio only. Please converts input audio to mono.')
    sampleRate *= format.channelsPerFrame
  }

  const clientConfig = {
      apiEndpoint: argv.host,
      port: argv.port,
      projectId: 'aiq'
  }
  if (argv.insecure) {
    clientConfig['sslCreds'] = credentials.createInsecure()
  }
  // Recognize audio
  const client = new speech.SpeechClient(clientConfig)
  client.initialize()
  // Quick workaround for https://github.com/googleapis/nodejs-speech/pull/724.
  const streamingRecognize = client.innerApiCalls['streamingRecognize']
  client.innerApiCalls['streamingRecognize'] = (request, options) => {
    if (request) {
      options = request
      request = null
    }
    return streamingRecognize(request, options)
  }
  const recognizeStream = client.streamingRecognize({
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: sampleRate,
      languageCode: 'ko-KR',
    },
    interimResults: false
  }, {
    otherArgs: {
      headers: {
        'x-api-key': argv.apiKey
      }
    }
  })
    .on('error', (error) => {
      console.error(error)
      process.exit(1)
    })
    .on('data', (data) => {
      // Print transcription
      const transcription = data.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n')
      console.log(`Transcription: ${transcription}`)
    })

  let streamingEnd = undefined
  audio
    .on('data', (float32Array) => {
      const int16Array = pcmConvert(float32Array, 'float32', 'int16')
      const buffer = Buffer.from(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength)
      recognizeStream.write(buffer)
      // Workaround to detect the end of streaming.
      // The 'progress' or 'buffered' property is updated before emit 'data' event.
      // https://github.com/audiocogs/aurora.js/blob/master/src/sources/node/file.coffee#L34
      if (audio.buffered >= 100) {
        if (streamingEnd !== undefined) {
          clearTimeout(streamingEnd)
        }
        streamingEnd = setTimeout(() => {
          recognizeStream.end()
        }, 1000)
      }
    })
  audio.start()
}

yargs(hideBin(process.argv))
  .command(['recognize [path]', '$0'], 'recognize given audio file (streaming mode)', (yargs) => {
    return yargs
      .positional('path', {
        description: 'audio file',
        default: 'resources/hello.wav'
      })
  }, main)
  .option('host', {
    type: 'string',
    default: 'aiq.skelterlabs.com'
  })
  .option('port', {
    type: 'number',
    default: 443
  })
  .option('api-key', {
    type: 'string'
  })
  .demandOption('api-key')
  .option('insecure', {
    type: 'boolean',
    default: false
  })
  .help()
  .argv
