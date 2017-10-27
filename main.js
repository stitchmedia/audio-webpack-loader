const loaderUtils = require('loader-utils');
var ffmpeg = require('fluent-ffmpeg');
var through2 = require('through2');
var concat = require('concat-stream');

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

    var doFfmpeg = (format, codec) => {
        return new Promise((resolve, reject)=>{
            var input = through2();
            input.end(content);
            input.isStream = true; // hack, but seems to work
            ffmpeg()
              .on('error', reject)
              .input(input)
              .audioBitrate('128k')
              .audioFrequency(44100)
              .audioChannels(1)
              .format(format)
              .audioCodec(codec)
              .output(makeOutput(format, resolve))
              .run();
          });
    }

    Promise.all([
        doFfmpeg('mp3', 'libmp3lame'),
        doFfmpeg('m4a', 'aac'),
        doFfmpeg('ogg', 'libvorbis')
    ]).then(outputs=>{
        var finaloutput = "module.exports = [" + outputs.join(',') + "];";
        callback(null, finaloutput);
    }).catch(error=>{
        callback(error);
    });

    return;

};

module.exports.sourceMap = false;
module.exports.raw = true;
