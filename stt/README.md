# AIQ.TALK STT Node.js Example

The AIQ.TALK STT API is mostly compatible with the Google Cloud Speech API,
so you can use
[Google Cloud Speech Node.js Client](https://github.com/googleapis/nodejs-speech)
to use AIQ.TALK STT API.

This repository contains simple example CLI programs that recognizes the given
`resources/.wav` audio file.

## Install Google Cloud SDK

See [Installing Cloud SDK](https://cloud.google.com/sdk/docs/install) to install
Google Cloud SDK, and finalize installing process. After installation, make sure
you've followed the steps with a Google account. This step is required only for
resolving dependencies; not for actually calling an API on Google Cloud.

```shell
$ gcloud init
$ gcloud auth application-default login
```

## Before you begin

Before running the samples, make sure you've followed the steps.

```shell
$ npm install
```

NOTE. Ignore speaker@0.3.1 build failure because it is optional dependency
of av module.

```shell
> speaker@0.3.1 install .../nodejs-speech/stt/samples/node_modules/av/node_modules/speaker
> node-gyp rebuild
...
../src/binding.cc:30:38: error: too few arguments to function call, single argument 'context' was not specified
  ao->channels = info[1]->Int32Value(); /* channels */
...
```

Get your AIQ API key from the
[AIQ Console](https://aiq.skelterlabs.com/console).

## Samples

NOTE. We support mono audio only now.

### Synchronously transcribe a local file

Perform synchronous transcription on a local audio file.
Synchronous request supports ~1 minute audio length.

```shell
$ node recognize.js --api-key=<your API key> resources/hello.wav
```

### Streaming speech recognition

Perform streaming request on a local audio file.

```shell
$ node streamingRecognize.js --api-key=<your API key> resources/hello.wav
```
