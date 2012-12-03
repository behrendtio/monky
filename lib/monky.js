var crypto    = require('crypto')
  , mongoose  = require('mongoose');

function Monky() {
  this.sequences = {};
  this.factories = {};
}

Monky.prototype.factory = function(model, options, cb) {
  try {
    var Model = mongoose.model(model);
    if (this.factories[model]) {
      throw new Error('Factory for model ' + model + ' is already defined');
    }

    this.factories[model] = options;
    if (cb) cb(null);
  } catch (err) {
    if (!cb) throw err;
    cb(err);
  }
};

Monky.prototype.sequence = function(model, path) {
  if (!this.sequences[model]) {
    this.sequences[model] = {};
  }

  if (!this.sequences[model][path]) {
    this.sequences[model][path] = 1;
  } else {
    this.sequences[model][path]++;
  }

  return this.sequences[model][path];
}

Monky.prototype.build = function(model, cb) {
  var Model     = mongoose.model(model)
    , instance  = new Model()
    , options   = this.factories[model];

  if (!options) {
    if (!cb) return instance;
    cb(null, instance);
  }

  try {
    for (var option in options) {
      if (options.hasOwnProperty(option)) {
        this.set(model, instance, option, options[option]);
      }
    }

    if (!cb) return instance;
    return cb(null, instance);
  } catch (err) {
    if (!cb) throw err;
    cb(err);
  }
};

Monky.prototype.set = function(model, instance, path, value) {
  if ('function' === typeof value) {
    value = value.bind(instance)();
  }

  if (!this.pathExists(instance, path)) {
    throw new Error('Path ' + path + ' does not exist on model ' + model);
  }

  if ('string' == typeof value && value.match(/#n/)) {
    value = value.replace('#n', this.sequence(model, path));
  }

  return instance[path] = value;
}

Monky.prototype.pathExists = function(instance, path) {
  return instance.schema.paths[path];
}

Monky.prototype.create = function(model, cb) {
  this.build(model, function(err, doc) {
    if (err) {
      if (!cb) throw err;
      return cb(err);
    }

    doc.save(function(err, doc) {
      if (err) {
        if (!cb) throw err;
        return cb(err);
      }

      if (!cb) {
        return doc;
      }

      cb(null, doc);
    });
  });
};

Monky.prototype.reset = function() {
  this.factories = {};
}

module.exports = Monky;
