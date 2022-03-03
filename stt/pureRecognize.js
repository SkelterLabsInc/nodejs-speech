const fs = require('fs')
const util = require('util')

const av = require('av')
const { credentials, Metadata } = require('grpc')
const pcmConvert = require('pcm-convert')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')

const { SpeechClient } = require('./google/speech/v1/cloud_speech_grpc_pb')
const {
  RecognitionConfig,
  RecognitionAudio,
  RecognizeRequest,
  SpeechContext
} = require('./google/speech/v1/cloud_speech_pb')
const ru = require('./recognizeUtil.js')

async function main (argv) {
  // Read audio file
  const audioData = fs.readFileSync(argv.path)
  const audio = av.Asset.fromBuffer(audioData)
  const float32Array = await new Promise((resolve) => audio.decodeToBuffer(resolve))
  const int16Array = pcmConvert(float32Array, 'float32', 'int16')
  const buffer = Buffer.from(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength)

  let sampleRate = audio.format.sampleRate
  if (audio.format.channelsPerFrame !== 1) {
    /* eslint-disable no-console */
    console.warn('AIQ.STT supports mono audio only. Please converts input audio to mono.')
    /* eslint-enable no-console */
    sampleRate *= audio.format.channelsPerFrame
  }

  // Prepare authorization
  const sslCreds = argv.insecure ? credentials.createInsecure() : credentials.createSsl()

  // Build request
  const speechContext = argv.speechContextPhrases.map((phrase) => new SpeechContext(phrase))
  const recognitionConfig = new RecognitionConfig()
    .setEncoding(RecognitionConfig.AudioEncoding.LINEAR16)
    .setSampleRateHertz(sampleRate)
    .setLanguageCode('ko-KR')
    .setSpeechContextsList(speechContext)
    .setEnableWordTimeOffsets(argv.enableWordTimeOffsets)
  const recognitionAudio = new RecognitionAudio().setContent(buffer.toString('base64'))
  const recognizeRequest = new RecognizeRequest()
    .setConfig(recognitionConfig)
    .setAudio(recognitionAudio)

  // Create gRPC client
  const client = new SpeechClient(`${argv.host}:${argv.port}`, sslCreds)

  // Add api key header
  const metadata = new Metadata()
  metadata.add('x-api-key', argv.apiKey)

  // Send request for recognizing audio
  const recognizeAsync = util.promisify(client.recognize).bind(client)
  const response = await recognizeAsync(recognizeRequest, metadata)
  const transcription = response
    .toObject()
    .resultsList.map((result) => ru.convertResultToFormatted(result))
    .join('\n')
  /* eslint-disable no-console */
  console.log(`Transcription: ${transcription}`)
  /* eslint-enable no-console */
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
