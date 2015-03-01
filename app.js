var express    = require('express');
var http       = require('http');
var path       = require('path');
var bodyParser = require('body-parser');

var uploadedFileData = require('./uploaded_file_data');
var getZipImages     = require('./get_zip_images');
var photoMosaic      = require('./photo_mosaic');

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  res.render('application/index', { title: 'Photo Mosaic' });
});

app.post('/create', function(req, res) {
  uploadedFileData(req, function(uploadedFileData) {
    getZipImages(uploadedFileData.tiles.buffer, function(tiles) {
      photoMosaic({
        source: uploadedFileData.source.buffer,
        tiles: tiles,
        tileSize: req.body.tile_size
      }).then(function(image) {
        image.toBuffer('png', function(err, buffer) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Length', buffer.length);
          res.send(buffer);
        });
      });
    });
  });
});

http.createServer(app).listen(app.get('port'));
