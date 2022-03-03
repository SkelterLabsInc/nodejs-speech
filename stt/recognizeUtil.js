/**
 * Convert google.proto.Duration object to text showing seconds.
 *
 * @param duration: google.proto.Duration object
 * @returns {`${string}.${string}s`} a formatted seconds in string
 */
const timeToSeconds = function timeToSeconds (duration) {
  return `${duration.seconds}.${duration.nanos}s`
}

/**
 * Convert a single recognition result into formatted text.
 *
 * @param result: A single result item of RecognizeResponse/StreamingRecognizeResponse
 * @returns {string|*} a formatted text. The text will be:
 *      a transcript string if enable_word_timestamp is false
 *      a transcript string with timestamp offsets if enable_word_timestamp is true.
 */
const convertResultToFormatted = function convertResultToFormatted (result) {
  const words = result.alternativesList[0].wordsList
  if (words.length > 0) {
    const startSeconds = timeToSeconds(words[0].startTime)
    const endSeconds = timeToSeconds(words[0].endTime)
    return `[${startSeconds} ~ ${endSeconds}] ${words[0].word}`
  }
  return result.alternativesList[0].transcript
}

module.exports = {
  convertResultToFormatted
}
