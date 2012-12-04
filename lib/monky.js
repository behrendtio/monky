/**
 * Require dependencies
 */

var mongoose = require('mongoose');

/**
 * Monky constructor
 *
 * # Usage
 *
 *    // Require monky
 *    var Monky = require('monky');
 *
 *    // Initialize instance
 *    var monky = new Monky();
 *
 *    // Create factory
 *    monky.factory('User', { username: '#n name' });
 *
 *    // Use factory to build/create document
 *    monky.build('User', function(err, user) {
 *      // user ==> mongoose doc
 *    });
 */

function Monky() {
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
 * @param {Function}  cb    Callback (err, doc)
 */

Monky.prototype.build = function(model, cb) {
  var Model     = mongoose.model(model)
    , instance  = new Model()
    , options   = this.factories[model];

  if (!options) {
    cb(null, instance);
  }

  try {
    for (var option in options) {
      if (options.hasOwnProperty(option)) {
        this.set(model, instance, option, options[option]);
      }
    }

    cb(null, instance);
  } catch (err) {
    cb(err);
  }
};

/**
 * Builds mongoose doc for `model` and saves it. Returns saved version
 *
 * @param {String}    model Mongoose model to create
 * @param {Function}  cb    Callback, optional (throws if not given)
 * @return {Object}   Mongoose doc or nothing if `cb` is given
 */

Monky.prototype.create = function(model, cb) {
  this.build(model, function(err, doc) {
    if (err) {
      return cb(err);
    }

    doc.save(cb);
  });
};

/**
 * Sets `value` for `path` in `instance` of type `model`
 *
 * @param {String}  model     Mongoose model name
 * @param {Object}  instance  Model instance to change
 * @param {String}  path      Path to change
 * @param {Mixed}   value     Value to set for `path`
 * @return {Object} Updated mongoose `instance`
 */

Monky.prototype.set = function(model, instance, path, value) {
  if ('function' === typeof value) {
    value = value.bind(instance)();
  }

  if (!this.pathExists(instance, path)) {
    throw new Error('Path ' + path + ' does not exist on model ' + model);
  }

  // If `value` has a '#n' in it, replace it with sequence number
  if ('string' == typeof value && value.match(/#n/)) {
    value = value.replace('#n', this.sequence(model, path));
  }

  return instance[path] = value;
}

/**
 * Returns true if `path` exists for `instance`'s schema
 *
 * @param {Object}    instance  Model instance to check
 * @param {String}    path      Path to check
 * @return {Boolean}  True if path exists
 */

Monky.prototype.pathExists = function(instance, path) {
  return instance.schema.paths[path];
}

/**
 * Resets defined factories
 *
 * @return {Function} Monky instance
 */

Monky.prototype.reset = function() {
  this.factories = {};
  return this;
}

/**
 * Expose module
 */

module.exports = Monky;
