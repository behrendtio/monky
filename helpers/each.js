module.exports = function _each(collection, iterator, cb) {
  var done = 0;

  collection.forEach(function(item) {
    iterator(item, function() {
      done += 1;

      if (done >= collection.length) {
        cb();
      }
    })
  })
};
