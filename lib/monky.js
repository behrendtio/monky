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
 * @param {String,Object} model     Mongoose model name, needs to be initialized first using `mongoose.model`
 * @param {Object}        options   Factory options for paths
 * @param {Function}      cb        Callback, optional (throws if no cb given)
 */

Monky.prototype.factory = function(model, options, cb) {
  try {
    var name = model;

    if ('object' == typeof model) {
      name = model.name;
      model = model.model;
    }

    var Model = this.mongoose.model(model);
    if (this.factories[name]) {
      throw new Error('Factory with name ' + name + ' is already defined');
    }

    this.factories[name] = { model: model, options: options };
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
 * @param {String}    model       Mongoose model to build
 * @param {Mixed}     userParams  User Custom params / Callback (err, doc)
 * @param {Boolean}   saveRelated Whether or not to save relations
 * @param {Function}  cb          Callback (err, doc)
 */

Monky.prototype.build = function(model, userParams, saveRelated, cb) {
  if (this.factories[model]) {
    var options = this.factories[model].options
    model = this.factories[model].model;
  }

  var Model     = this.mongoose.model(model)
    , instance  = new Model()
    , self      = this;

  if (!cb) {
    cb = saveRelated;
    saveRelated = false;
  }

  if (typeof(userParams) == 'function') {
    cb = userParams;
    userParams = undefined;
  }

  if (!options) {
    return cb(null, instance);
  }

  options = arrayHelper.extend({}, options, userParams);

  _each(Object.keys(options), function(option, eachDone) {
    if (options.hasOwnProperty(option)) {
      self.set(model, instance, option, options[option], saveRelated, eachDone);
    }
  }, function(err) {
    if (err) return cb(err);

    instance.validate(function(validationError) {
      cb(validationError, instance);
    });
  });
};


/**
 * Internal helper function for `buildList` and `createList`
 *
 * @param {String}    model       Mongoose model to create
 * @param {Number}    count       How many models to build?
 * @param {Mixed}     userParams  User custom params
 * @param [Boolean]   create      Whether or not to use `create` instead of `build`
 * @param {Function}  cb          Callback
 */

Monky.prototype._doList = function(model, count, userParams, create, cb) {
  var instances = [];
  var self = this;

  function range(i) {
    return i ? range(i-1).concat(i) : [];
  };

  if ('function' == typeof(userParams)) {
    cb = userParams;
    userParams = {};
  }

  var fn = this.build;
  if (create) fn = this.create;

  _each(range(count), function(_, eachDone) {
    fn.bind(self)(model, userParams, function(err, instance) {
      if (err) return cb(err, null);
      instances.push(instance);
      eachDone();
    });
  }, function(err) {
    return cb(err, instances);
  });
}

/**
 * Same as `build` but accepts a number as second parameter
 * which then builds the given amount of model and returns an
 * array instead of a single model
 *
* @param {String}    model       Mongoose model to create
* @param {Number}    count       How many models to build?
* @param [Mixed]     userParams  User custom params
* @param {Function}  cb          Callback
 */

Monky.prototype.buildList = function(model, count, userParams, cb) {
  this._doList(model, count, userParams, false, cb);
}

/**
 * Same as `buildList` but returns an array of saved instances
 *
 * @param {String}    model Mongoose model to create
 * @param {Number}    count How many models to build?
 * @param [Mixed]     userParams  User custom params
 * @param {Function}  cb    Callback
 */

Monky.prototype.createList = function(model, count, userParams, cb) {
  this._doList(model, count, userParams, true, cb);
}

/**
 * Builds mongoose doc for `model` and saves it. Returns saved version
 *
 * @param {String}    model       Mongoose model to create
 * @param [Mixed]     userParams  User custom params
 * @param {Function}  cb          Callback
 */

Monky.prototype.create = function(model, userParams, cb) {
  if (typeof(userParams) == 'function') {
    cb = userParams;
    userParams = {}
  }

  this.build(model, userParams, true, function(err, doc) {
    if (err) {
      return cb(err);
    }

    doc.save(cb);
  });
};

/**
 * Sets `value` for `path` in `instance` of type `model`
 *
 * @param {String}    model       Mongoose model name
 * @param {Object}    instance    Model instance to change
 * @param {String}    path        Path to change
 * @param {Mixed}     value       Value to set for `path`
 * @param {Boolean}   saveRelated Whether or not to save relations
 * @param {Function}  cb          Callback(err)
 */

Monky.prototype.set = function(model, instance, path, value, saveRelated, cb) {
  var self = this;

  function sequence(value) {
    // If `value` has a '#n' in it, replace it with sequence number
    if ('string' == typeof value && value.match(/#n/)) {
      value = value.replace('#n', self.sequence(model, path));
    }

    return value;
  }

  if ('function' === typeof value) {
    instance[path] = sequence(value.bind(instance)());
    cb(null);
  } else if (value instanceof Array) {
    // Embedded document / Array handling
    value.forEach(function(sub) {
      Object.keys(sub).forEach(function(path) {
        if (sub.hasOwnProperty(path)) {
          sub[path] = sequence(sub[path]);
        }
      });
    });

    instance[path] = value;
    cb(null);
  } else if ('_' == path.charAt(0)) {
    // Reference
    var fn = this.build;
    if (saveRelated) fn = this.create;

    fn.bind(this)(value, function(err, result) {
      if (err) return cb(err);

      instance.populated(path, result);
      instance[path] = result;
      cb(null);
    });
  } else {
    instance[path] = sequence(value);
    cb(null);
  }
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
