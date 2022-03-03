const speech = require('@google-cloud/speech')
const { credentials } = require('@grpc/grpc-js')
const av = require('av')
const { GoogleAuth, grpc } = require('google-gax')
const pcmConvert = require('pcm-convert')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')

async function main (argv) {
  const audio = av.Asset.fromFile(argv.path)
  const format = await new Promise((resolve) => {
    audio.get('format', resolve)
  })

  let sampleRate = format.sampleRate
  if (format.channelsPerFrame !== 1) {
    /* eslint-disable no-console */
    console.warn('AIQ.STT supports mono audio only. Please converts input audio to mono.')
    /* eslint-enable no-console */
    sampleRate *= format.channelsPerFrame
  }

  const clientConfig = {
    apiEndpoint: argv.host,
    port: argv.port,
    projectId: 'aiq'
  }

  // Build GoogleAuth credential object
  // from the suggestion https://github.com/googleapis/nodejs-speech/issues/19#issuecomment-648343356
  const googleAuth = new GoogleAuth()
  const authClient = googleAuth.fromAPIKey(argv.apiKey)
  clientConfig.sslCreds = grpc.credentials.combineChannelCredentials(
    argv.insecure ? credentials.createInsecure() : credentials.createSsl(),
    grpc.credentials.createFromGoogleCredential(authClient)
  )

  // Recognize audio
  const client = new speech.SpeechClient(clientConfig)
  client.initialize()
  // Quick workaround for https://github.com/googleapis/nodejs-speech/pull/724.
  const streamingRecognize = client.innerApiCalls.streamingRecognize
  client.innerApiCalls.streamingRecognize = (request, options) => {
    if (request) {
      options = request
      request = null
    }
    return streamingRecognize(request, options)
  }
  const recognizeStream = client
    .streamingRecognize(
      {
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: sampleRate,
          languageCode: 'ko-KR'
        },
        interimResults: false
      },
      {
        otherArgs: {
          headers: {
            'x-api-key': argv.apiKey
          }
        }
      }
    )
    .on('error', (error) => {
      /* eslint-disable no-console */
      console.error(error)
      /* eslint-enable no-console */
      process.exit(1)
    })
    .on('data', (data) => {
      // Print transcription
      const transcription = data.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n')
      /* eslint-disable no-console */
      console.log(`Transcription: ${transcription}`)
      /* eslint-enable no-console */
    })

  let streamingEnd
  audio.on('data', (float32Array) => {
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

yargs(hideBin(process.argv)) // eslint-disable-line
  .command(
    ['recognize [path]', '$0'],
    'recognize given audio file (streaming mode)',
    (y) => {
      return y.positional('path', {
        description: 'audio file',
        default: 'resources/hello.wav'
      })
    },
    main
  )
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
  .parse()
