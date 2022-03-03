const av = require('av')
const { credentials, Metadata } = require('grpc')
const pcmConvert = require('pcm-convert')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')

const { SpeechClient } = require('./google/speech/v1/cloud_speech_grpc_pb')
const {
  RecognitionConfig,
  SpeechContext,
  StreamingRecognitionConfig,
  StreamingRecognizeRequest
} = require('./google/speech/v1/cloud_speech_pb')
const ru = require('./recognizeUtil.js')

async function main (argv) {
  // Read audio file
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

  // Prepare authorization
  const sslCreds = argv.insecure ? credentials.createInsecure() : credentials.createSsl()

  // Add api key header
  const metadata = new Metadata()
  metadata.add('x-api-key', argv.apiKey)

  // Create gRPC client
  const client = new SpeechClient(`${argv.host}:${argv.port}`, sslCreds)

  const speechContext = argv.speechContextPhrases.map((phrase) => new SpeechContext(phrase))
  const recognitionConfig = new RecognitionConfig()
    .setEncoding(RecognitionConfig.AudioEncoding.LINEAR16)
    .setSampleRateHertz(sampleRate)
    .setLanguageCode('ko-KR')
    .setSpeechContextsList(speechContext)
    .setEnableWordTimeOffsets(argv.enableWordTimeOffsets)

  const streamingRecognitionConfig = new StreamingRecognitionConfig()
    .setConfig(recognitionConfig)
    .setInterimResults(false)

  const streamingRequestInit = new StreamingRecognizeRequest().setStreamingConfig(
    streamingRecognitionConfig
  )

  // Recognize audio
  const recognizeStream = client
    .streamingRecognize(metadata)
    .on('error', (error) => {
      /* eslint-disable no-console */
      console.error(error)
      /* eslint-enable no-console */
      process.exit(1)
    })
    .on('data', (data) => {
      // Print transcription
      const deserializedResponse = data.toObject()
      if (deserializedResponse) {
        const transcription = deserializedResponse.resultsList
          .map((result) => ru.convertResultToFormatted(result))
          .join('\n')
        /* eslint-disable no-console */
        console.log(`Transcription: ${transcription}`)
        /* eslint-enable no-console */
      } else {
        /* eslint-disable no-console */
        console.log('Empty result.')
        /* eslint-enable no-console */
      }
    })

  recognizeStream.write(streamingRequestInit)

  let streamingEnd
  audio.on('data', (float32Array) => {
    const int16Array = pcmConvert(float32Array, 'float32', 'int16')
    const buffer = Buffer.from(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength)

    const streamingRequest = new StreamingRecognizeRequest().setAudioContent(buffer)

    recognizeStream.write(streamingRequest)
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
  .command(
    ['recognize [path]', '$0'],
    'recognize given audio file',
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
    default: 'aiq.epo-just-dev.svc.skelterlabs.com'
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
  .option('speech-context-phrases', {
    type: 'array',
    default: []
  })
  .option('enable-word-time-offsets', {
    type: 'boolean',
    default: false
  })
  .help()
  .parse()
