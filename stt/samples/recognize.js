const av = require('av')
const { credentials } = require('@grpc/grpc-js')
const fs = require('fs')
const { hideBin } = require('yargs/helpers')
const pcmConvert = require('pcm-convert')
const speech = require('@google-cloud/speech')
const yargs = require('yargs/yargs')

async function main (argv) {
  // Read audio file
  const audioData = fs.readFileSync(argv.path)
  const audio = av.Asset.fromBuffer(audioData)
  const float32Array = await new Promise((resolve) => audio.decodeToBuffer(resolve))
  const int16Array = pcmConvert(float32Array, 'float32', 'int16')
  const buffer = Buffer.from(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength)

  let sampleRate = audio.format.sampleRate
  if (audio.format.channelsPerFrame != 1) {
    console.warn('AIQ.STT supports mono audio only. Please converts input audio to mono.')
    sampleRate *= audio.format.channelsPerFrame
  }

  // Recognize audio
  const clientConfig = {
      apiEndpoint: argv.host,
      port: argv.port,
      projectId: 'aiq'
  }
  if (argv.insecure) {
    clientConfig['sslCreds'] = credentials.createInsecure()
  }
  const client = new speech.SpeechClient(clientConfig)
  const [response] = await client.recognize({
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: sampleRate,
      languageCode: 'ko-KR'
    },
    audio: {
      content: buffer.toString('base64')
    }
  }, {
    otherArgs: {
      headers: {
        'x-api-key': argv.apiKey
      }
    }
  })

  // Print transcription
  const transcription = response.results
    .map((result) => result.alternatives[0].transcript)
    .join('\n')
  console.log(`Transcription: ${transcription}`)
}

yargs(hideBin(process.argv))
  .command(['recognize [path]', '$0'], 'recognize given audio file', (yargs) => {
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
