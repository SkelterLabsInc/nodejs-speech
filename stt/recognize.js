const fs = require('fs')

const speech = require('@google-cloud/speech')
const { credentials } = require('@grpc/grpc-js')
const av = require('av')
const { GoogleAuth, grpc } = require('google-gax')
const pcmConvert = require('pcm-convert')
const { hideBin } = require('yargs/helpers')
const yargs = require('yargs/yargs')

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

  // Recognize audio
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

  const client = new speech.SpeechClient(clientConfig)
  const [response] = await client.recognize(
    {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: sampleRate,
        languageCode: 'ko-KR'
      },
      audio: {
        content: buffer.toString('base64')
      }
    },
    {
      otherArgs: {
        headers: {
          'x-api-key': argv.apiKey
        }
      }
    }
  )

  // Print transcription
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
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
