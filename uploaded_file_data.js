var Busboy = require('busboy');

module.exports = function(req, callback) {
  var busboy = new Busboy({ headers: req.headers }),
      uploadedFileData = {};

  busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
    uploadedFileData[fieldname] = {
      mimetype:   mimetype,
      filename:   filename,
      encoding:   encoding,
      fileChunks: []
    };

    file.on('data', function(data) {
      uploadedFileData[fieldname].fileChunks.push(data);
    });

    file.on('end', function() {
      uploadedFileData[fieldname].buffer = Buffer.concat(uploadedFileData[fieldname].fileChunks);
    });
  });

  busboy.on('finish', function() {
    callback(uploadedFileData);
  });

  req.pipe(busboy);
};
