const loaderUtils = require('loader-utils');
var ffmpeg = require('fluent-ffmpeg');
var through2 = require('through2');
var concat = require('concat-stream');

// executes an array of promises in sequence, and returns an array of all their outputs
// mostly copied from https://hackernoon.com/functional-javascript-resolving-promises-sequentially-7aac18c4431e
const promiseSerial = promises =>
    promises.reduce((reduced, promise) =>
        promise.then(result => promise.then(Array.prototype.concat.bind(result))),
        Promise.resolve([]));

module.exports = function(content) {
    const options = loaderUtils.getOptions(this);

    const context = options.context || this.options.context;

    var outputPattern = options.name || "[name]-[hash].[ext]";
    this.cacheable();
    var callback = this.async();

// stream to buffer
    var makeOutput = (format, resolve)=>{
        // arrow functions to preserve "this"
        return concat((buf)=>{
            var filename = loaderUtils.interpolateName(this, outputPattern.replace('[ext]', format), {context: context, content: buf});
            this.emitFile(filename, buf);
            var stringToReturn = "__webpack_public_path__ + " + JSON.stringify(filename);
            resolve(stringToReturn);
        });
    }

    var doFfmpeg = (format) => {
        return new Promise((resolve, reject)=>{
            var input = through2();
            input.end(content);
            input.isStream = true; // hack, but seems to work
            ffmpeg()
            //   .on('start', function(commandLine) {
            //     console.log('Spawned Ffmpeg with command: ' + commandLine);
            //   })
            //   .on('codecData', function(data) {
            //     console.log('Input is ' + data.audio + ' audio ' + 'with ' + data.video + ' video');
            //   })
            //   .on('progress', function(progress) {
            //     console.log('Processing: ' + progress.percent + '% done');
            //   })
            //   .on('stderr', function(stderrLine) {
            //     console.log('Stderr output: ' + stderrLine);
            //   })
            //   .on('end', function(stdout, stderr) {
            //     console.log('Transcoding succeeded !');
            //   })
              .on('error', function(err, stdout, stderr) {
                  emitError('Cannot process audio: ' + err.message);
                  reject(err);
              })
              .input(input)
              .audioBitrate('128k')
              .audioFrequency(44100)
              .audioChannels(1)
              .format(format)
              .output(makeOutput(format, resolve))
              .run();
          });
    }

    promiseSerial([doFfmpeg('mp3'), doFfmpeg('ogg')]).then(outputs=>{
        var finaloutput = "module.exports = [" + outputs.join(',') + "];";
        callback(null, finaloutput);
    });

};

module.exports.sourceMap = false;
module.exports.raw = true;
