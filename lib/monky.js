/**
 * Monky constructor
 *
 * # Usage
 *
 *    // Require mongoose and monky
 *    var mongoose = require('mongoose')
 *      , Monky = require('monky');
 *
 *    // Initialize instance
 *    var monky = new Monky(mongoose);
 *
 *    // Create factory
 *    monky.factory('User', { username: '#n name' });
 *
 *    // Use factory to build/create document
 *    monky.build('User', function(err, user) {
 *      // user ==> unsaved mongoose doc
 *    });
 */

var arrayHelper = require('../helpers/arrays');
var _each = require('../helpers/each');

function Monky(mongoose) {
  this.mongoose = mongoose;
  this.sequences = {};
  this.factories = {};
}

/**
 * Set up factory for given `model`
 *
 * @param {String}    model     Mongoose model name, needs to be initialized first using `mongoose.model`
 * @param {Object}    options   Factory options for paths
 * @param {Function}  cb        Callback, optional (throws if no cb given)
 */

Monky.prototype.factory = function(model, options, cb) {
  try {
    var Model = this.mongoose.model(model);
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

/**
 * Returns sequence number for given `path` in `model`
 *
 * @param {String}  model  Mongoose model name to return sequence number for
 * @param {String}  path   Model path to return sequence number for
 * @return {Number} Sequence number
 */

Monky.prototype.sequence = function(model, path) {
  if (!this.sequences[model]) {
    this.sequences[model] = {};
  }

  if (!this.sequences[model][path]) {
    return this.sequences[model][path] = 1;
  }

  this.sequences[model][path]++;

  return this.sequences[model][path];
}

/**
 * Builds mongoose doc for `model`
 *
 * @param {String}    model Mongoose model to build
 * @param {Mixed}  userParams  User Custom params / Callback (err, doc)
 * @param {Function}  cb    Callback (err, doc)
 */

Monky.prototype.build = function(model, userParams, cb) {
  var Model     = this.mongoose.model(model)
    , instance  = new Model()
    , options   = this.factories[model]
    , self      = this;

  if (typeof(userParams) == 'function') {
    cb = userParams;
    userParams = undefined;
  } else {
    options = arrayHelper.extend({}, options, userParams);
  }

  if (!options) {
    return cb(null, instance);
  }

  _each(Object.keys(options), function(option, eachDone) {
    if (options.hasOwnProperty(option)) {
      self.set(model, instance, option, options[option], eachDone);
    }
  }, function(err) {
    cb(err, instance);
  });
};

/**
 * Same as build but accepts a number as second parameter
 * which then builds the given amount of model and returns an
 * array instead of a single model
 *
 * @param {String}    model Mongoose model to create
 * @param {Number}    count How many models to build?
 * @param {Function}  cb    Callback
 */

Monky.prototype.buildList = function(model, count, cb) {
  var instances = [];
  for (var i = 0; i < count; i++) {
    this.build(model, function(err, instance) {
      if (err) {
        return cb(err, null);
      }

      instances.push(instance);
    });
  }

  cb(null, instances);
}

/**
 * Same as buildList but returns an array of saved instances
 *
 * @param {String}    model Mongoose model to create
 * @param {Number}    count How many models to build?
 * @param {Function}  cb    Callback
 */

Monky.prototype.createList = function(model, count, cb) {
  var instances = [];
  var self = this;

  function range(i) {
    return i ? range(i-1).concat(i) : [];
  };

  _each(range(count), function(_, eachDone) {
    self.create(model, function(err, instance) {
      if (err) return cb(err, null);
      instances.push(instance);
      eachDone();
    });
  }, function(err) {
    return cb(err, instances);
  });
}

/**
 * Builds mongoose doc for `model` and saves it. Returns saved version
 *
 * @param {String}    model Mongoose model to create
 * @param {Mixed}     userParams User Custom params / Callback (err, doc)
 * @param {Function}  cb    Callback
 */

Monky.prototype.create = function(model, userParams, cb) {

  if (typeof(userParams) == 'function') {
    cb = userParams;
    userParams = {}
  }

  this.build(model, userParams, function(err, doc) {
    if (err) {
      return cb(err);
    }

    doc.save(cb);
  });
};

/**
 * Sets `value` for `path` in `instance` of type `model`
 *
 * @param {String}    model     Mongoose model name
 * @param {Object}    instance  Model instance to change
 * @param {String}    path      Path to change
 * @param {Mixed}     value     Value to set for `path`
 * @param {Function}  cb        Callback(err)
 */

Monky.prototype.set = function(model, instance, path, value, cb) {
  var self = this;

  function sequence(value) {
    // If `value` has a '#n' in it, replace it with sequence number
    if ('string' == typeof value && value.match(/#n/)) {
      value = value.replace('#n', self.sequence(model, path));
    }

    return value;
  }

  if ('function' === typeof value) {
    value = value.bind(instance)();
  } else if (value instanceof Array) {
    // Embedded document / Array handling
    value.forEach(function(sub) {
      Object.keys(sub).forEach(function(path) {
        if (sub.hasOwnProperty(path)) {
          sub[path] = sequence(sub[path]);
        }
      });
    });
  } else if ('_' == path.charAt(0)) {
    // Reference
    this.build(value, function(err, result) {
      if (err) return cb(err);

      value = result;
      instance.populated(path, value);
    });
  }

  instance[path] = sequence(value);
  cb(null);
}

/**
 * Resets defined factories
 *
 * @param {String}    factory Factory to reset
 * @return {Function} Monky instance
 */

Monky.prototype.reset = function(factory) {
  if (factory) {
    delete this.factories[factory];
  } else {
    this.factories = {};
  }

  return this;
}

/**
 * Expose module
 */

module.exports = Monky;
