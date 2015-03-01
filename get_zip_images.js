var Q = require('q');
var unzip = require('unzip');
var stream = require('stream');

module.exports = function(zip, callback) {
  var bufferStream = new stream.Transform();
  var promises = [];

  bufferStream.push(zip);

  bufferStream.pipe(unzip.Parse()).on('entry', function(e) {
    if (e.type === 'File' && e.path.match(/(^|\/)[^\.][^\/]*\.jpe?g/)) {
      var deferred = Q.defer(),
          entryChunks = [];

      promises.push(deferred.promise);

      e.on('data', function(data) {
        entryChunks.push(data);
      });

      e.on('end', function() {
        deferred.resolve(Buffer.concat(entryChunks));
      });
    } else {
      e.autodrain();
    }
  })._flush(function() {
    Q.allSettled(promises).then(function(results) {
      callback(results.map(function(r) { return r.value; }));
    });
  });
};
