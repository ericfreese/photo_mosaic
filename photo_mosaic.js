var Q        = require('q'),
    lwip     = require('lwip');

var averagePixelRGB = function(image, x, y, width, height) {
  var pixelColors = [];

  x      = x || 0;
  y      = y || 0;
  width  = width  || image.width();
  height = height || image.height();

  for (var curX = x; curX < x + width; curX++) {
    for (var curY = y; curY < y + height; curY++) {
      pixelColors.push(image.getPixel(curX, curY));
    }
  }

  var avg = pixelColors.reduce(function(a, b) {
    return {
      r: a.r + b.r,
      g: a.g + b.g,
      b: a.b + b.b
    };
  });

  avg.r = Math.round(avg.r / pixelColors.length);
  avg.g = Math.round(avg.g / pixelColors.length);
  avg.b = Math.round(avg.b / pixelColors.length);

  return avg;
};

var Tiles = function() {
  this.tiles = [];
};

Tiles.prototype.addTile = function(image, rgb) {
  this.tiles.push({
    image: image,
    rgb: rgb
  });
};

// NNS Problem http://en.wikipedia.org/wiki/Nearest_neighbor_search
// TODO Use k-d tree? https://github.com/justinethier/node-kdtree
Tiles.prototype.bestTileForRGB = function(rgb) {
  var bestDiff, bestTile;

  var rgbDiff = function(rgb1, rgb2) {
    return Math.abs(rgb1.r - rgb2.r) +
           Math.abs(rgb1.g - rgb2.g) +
           Math.abs(rgb1.b - rgb2.b);
  };

  this.tiles.forEach(function(tile) {
    var diff = rgbDiff(rgb, tile.rgb);

    if (bestDiff === undefined || diff < bestDiff) {
      bestDiff = diff;
      bestTile = tile;
    }
  });

  return bestTile;
};

var processTiles = function(tiles, tileSize) {
  return Q.promise(function(resolve) {
    var t = new Tiles(),
        promises = [];

    console.log('Processing tiles');

    tiles.forEach(function(tile) {
      var deferred = Q.defer();
      promises.push(deferred.promise);

      lwip.open(tile, 'jpg', function(err, image) {
        if (!!err) {
          console.error(err);
          return;
        }

        image.cover(tileSize, tileSize, function(err, image) {
          process.stdout.write('.');
          t.addTile(image, averagePixelRGB(image));
          deferred.resolve();
        });
      });
    });

    Q.all(promises).then(function() {
      console.log('done');
      resolve(t);
    });
  });
};

module.exports = function(opts) {
  if (!opts.tiles || !opts.source) {
    console.log('Invalid options');
    return;
  }

  return Q.promise(function(resolve) {
    opts.tileSize = opts.tileSize || 30

    processTiles(opts.tiles, opts.tileSize).then(function(tiles) {

      console.log('Generating mosaic');

      lwip.open(opts.source, 'jpg', function(err, image) {
        if (!!err) {
          console.error(err);
          return;
        }

        var newWidth = image.width() - (image.width() % opts.tileSize),
            newHeight = image.height() - (image.height() % opts.tileSize);

        image.cover(newWidth, newHeight, function(err, image) {
          var batch = image.batch(),
              averageRGB, bestTile;
          
          for (var y = 0; y < image.height(); y += opts.tileSize) {
            process.stdout.write('.');

            for (var x = 0; x < image.width(); x += opts.tileSize) {
              averageRGB = averagePixelRGB(image, x, y, opts.tileSize, opts.tileSize);
              bestTile = tiles.bestTileForRGB(averageRGB);

              batch.paste(x, y, bestTile.image);
            }
          }

          batch.exec(function(err, image) {
            if (!!err) {
              console.error(err);
              return;
            }

            console.log('done');

            resolve(image);
          });
        });
      });
    });
  });
};
