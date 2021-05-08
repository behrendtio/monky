const Promise = require('mpromise')
const _each = require('../helpers/each')
const _ = require('lodash')

class Monky {
  constructor(mongoose) {
    this.mongoose = mongoose
    this.sequences = {}
    this.factories = {}
  }

  /**
   * Set up factory for given `model`
   *
   * @param {String,Object} model     Mongoose model name, needs to be initialized first using `mongoose.model`
   * @param {Object}        options   Factory options for paths
   * @param {Function}      cb        Callback, optional (throws if no cb given)
   */
  factory(model, options, cb) {
    try {
      let name = model

      if (_.isObject(model)) {
        name = model.name
        model = model.model
      }

      const Model = this.mongoose.model(model)
      if (this.factories[name]) {
        throw new Error('Factory with name ' + name + ' is already defined')
      }

      this.factories[name] = { model: model, options: options }
      if (cb) cb(null)
    } catch (err) {
      if (!cb) throw err
      cb(err)
    }
  }

  /**
   * Returns an instance of MonkyRef for given `model` and optional `path`
   *
   * @param {String} model   Mongoose model name, needs to be initialized first using `mongoose.model`
   * @param {String} path    Path, optional
   */
  ref(model, path) {
    return new MonkyRef(model, path)
  }

  /**
   * Returns sequence number for given `path` in `model`
   *
   * @param {String}  model  Mongoose model name to return sequence number for
   * @param {String}  path   Model path to return sequence number for
   * @return {Number} Sequence number
   */
  sequence(model, path) {
    if (!this.sequences[model]) {
      this.sequences[model] = {}
    }

    if (!this.sequences[model][path]) {
      return this.sequences[model][path] = 1
    }

    this.sequences[model][path]++

    return this.sequences[model][path]
  }

  /**
   * Builds mongoose doc for `model`
   *
   * @param {String}    model       Mongoose model to build
   * @param {Mixed}     userParams  User Custom params / Callback (err, doc)
   * @param {Boolean}   saveRelated Whether or not to save relations
   * @param {Function}  cb          Callback (err, doc)
   */
  build(model, userParams, saveRelated, cb) {
    let options = null

    if (this.factories[model]) {
      // Copy options
      options = _.merge({}, this.factories[model].options)
      model = this.factories[model].model
    }

    if (!cb) {
      cb = saveRelated
      saveRelated = false
    }

    if (_.isFunction(userParams)) {
      cb = userParams
      userParams = undefined
    }

    const promise = new Promise(cb)

    if (!this.mongoose.models.hasOwnProperty(model)) {
      return promise.reject(new Error('Invalid model: ' + model))
    }

    const Model   = this.mongoose.model(model)
      , instance  = new Model()
      , self      = this

    if (!options) {
      return promise.fulfill(instance)
    }

    options = _.assign(options, userParams)

    _each(Object.keys(options), (option, eachDone) => {
      if (options.hasOwnProperty(option)) {
        self.set(model, instance, option, options[option], saveRelated, eachDone)
      }
    }, (err) => {
      if (err) return promise.reject(err)
      promise.resolve(null, instance)
    })

    return promise
  }


  /**
   * Internal helper function for `buildList` and `createList`
   *
   * @param {String}    model       Mongoose model to create
   * @param {Number}    count       How many models to build?
   * @param {Mixed}     userParams  User custom params
   * @param [Boolean]   create      Whether or not to use `create` instead of `build`
   * @param {Function}  cb          Callback
   */
  _doList(model, count, userParams, create, cb) {
    let instances = []
    const self = this

    const range = (i) => {
      return i ? range(i-1).concat(i) : []
    }

    if (_.isFunction(userParams)) {
      cb = userParams
      userParams = {}
    }

    const promise = new Promise(cb)
    let fn = this.build
    if (create) fn = this.create

    _each(range(count), (_, eachDone) => {
      fn.bind(self)(model, userParams, (err, instance) => {
        if (err) return promise.reject(err)
        instances.push(instance)
        eachDone()
      })
    }, (err) => {
      promise.resolve(err, instances)
    })

    return promise
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
  buildList(model, count, userParams, cb) {
    return this._doList(model, count, userParams, false, cb)
  }

  /**
   * Same as `buildList` but returns an array of saved instances
   *
   * @param {String}    model Mongoose model to create
   * @param {Number}    count How many models to build?
   * @param [Mixed]     userParams  User custom params
   * @param {Function}  cb    Callback
   */
  createList(model, count, userParams, cb) {
    return this._doList(model, count, userParams, true, cb)
  }

  /**
   * Builds mongoose doc for `model` and saves it. Returns saved version
   *
   * @param {String}    model       Mongoose model to create
   * @param [Mixed]     userParams  User custom params
   * @param {Function}  cb          Callback
   */
  create(model, userParams, cb) {
    if (_.isFunction(userParams)) {
      cb = userParams
      userParams = {}
    }

    const promise = new Promise(cb)

    this.build(model, userParams, true, (err, doc) => {
      if (err) {
        return promise.reject(err)
      }

      doc.save((err, doc) => {
        promise.resolve(err, doc)
      })
    })

    return promise
  }

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
  set(model, instance, path, value, saveRelated, cb) {
    const self = this

    const sequence = (value) => {
      // If `value` has a '#n' in it, replace it with sequence number
      if (_.isString(value) && value.match(/#n/)) {
        value = value.replace('#n', self.sequence(model, path))
      }

      return value
    }

    const handleMonkyRef = (model, callback) => {
      let fn = self.build
      if (saveRelated) fn = self.create

      fn.bind(self)(model.model, (err, result) => {
        if (err) return cb(err)

        if (_.isString(model.path)) {
          _.set(instance, path, result[model.path])
        } else {
          instance.populated(path, result)
          _.set(instance, path, result)
        }
        return callback(null)
      })
    }

    if (_.isFunction(value)) {
      _.set(instance, path, sequence(value.bind(instance)()))
      cb(null)
    } else if (value instanceof Array) {
      // Embedded document / Array handling
      let index = 0
      _each(value, (sub, eachDone) => {
        self.set(model, instance, `${path}.${index}`, sub, saveRelated, eachDone)
        index += 1
      }, cb)
    } else if (value instanceof MonkyRef) {
      handleMonkyRef(value, cb)
    } else if (value && 'ObjectID' === value.constructor.name) {
      _.set(instance, path, value)
      cb(null)
    } else if (value && 'model' === value.constructor.name) {
      instance.populated(path, value)
      _.set(instance, path, value)
      cb(null)
    } else if (value && _.isPlainObject(value)) {
      if (!_.get(instance, path)) {
        _.set(instance, path, {})
      }
      _each(Object.keys(value), (key, eachDone) => {
        if (value.hasOwnProperty(key)) {
          self.set(model, instance, `${path}.${key}`, value[key], saveRelated, eachDone)
        }
      }, cb)
    } else {
      _.set(instance, path, sequence(value))
      cb(null)
    }
  }

  /**
   * Resets defined factories
   *
   * @param {String}    factory Factory to reset
   * @return {Function} Monky instance
   */
  reset(factory) {
    if (factory) {
      delete this.factories[factory]
      delete this.sequences[factory]
    } else {
      this.factories = {}
      this.sequences = {}
    }

    return this
  }
}

/**
 * MonkyRef constructor
 */
class MonkyRef {
  constructor(model, path) {
    this.model = model
    this.path = path
  }
}

module.exports = Monky
