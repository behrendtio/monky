module.exports = function _each(collection, iterator, cb) {
  var done = 0;

  if (collection.length === 0) {
    return cb();
  }

  collection.forEach(function(item) {
    iterator(item, function(err) {
      done += 1;

      if (done >= collection.length) {
        cb(err);
      }
    })
  })
};
