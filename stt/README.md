# AIQ.STT Node.js Example

This repository contains simple example CLI programs that recognizes the given
`resources/.wav` audio file.

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

## Build proto files

This is an optional step for running pure gRPC scripts.
```shell
$ cd ./proto && make # Make sure grpc-tools is installed on local node_modules
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
