
var ArrayHelper = function() {
  var slice  = Array.prototype.slice;

  this.extend =  function(obj) {
    var objects =  slice.call(arguments, 1);
    for (var i = 0; i < objects.length; i++) {
      var source = objects[i];
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    };
    return obj;
  } 

}

module.exports = new ArrayHelper();
