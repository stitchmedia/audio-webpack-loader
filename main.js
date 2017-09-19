const loaderUtils = require('loader-utils');
var ffmpeg = require('fluent-ffmpeg');
var through2 = require('through2');
var concat = require('concat-stream');

module.exports = function(content) {
    const options = loaderUtils.getOptions(this);

    var outputPattern = options.name || "[name]-[hash].[ext]";
    var callback = this.async();

// stream to buffer
    var makeOutput = (format, resolve)=>{
        // arrow functions to preserve "this"
        return concat((buf)=>{
            var filename = loaderUtils.interpolateName(this, outputPattern.replace('[ext]', format), { content: buf});
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
              .on('error', function(err, stdout, stderr) {
                    console.log('An error occurred: ' + err.message, err, stderr);
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

    Promise.all([doFfmpeg('mp3'), doFfmpeg('ogg')]).then(outputs=>{
        var finaloutput = "module.exports = [" + outputs.join(',') + "];";
        callback(null, finaloutput);
    });

};

module.exports.sourceMap = false;
module.exports.raw = true;