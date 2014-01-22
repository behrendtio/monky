module.exports = {
  extend: function(obj) {
    var objects = Array.prototype.slice.call(arguments, 1);

    for (var i = 0; i < objects.length; i++) {
      var source = objects[i];
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    }

    return obj;
  }
};
