[![Build Status](https://secure.travis-ci.org/behrendtio/monky.png?branch=master)](https://travis-ci.org/behrendtio/monky)

# Monky

[Mongoose](http://mongoosejs.com) fixtures library inspired by
[factory_girl](https://github.com/thoughtbot/factory_girl)

# Philosophy

Inspired by factory_girl this library tries to bring similar functionality to
[node](http://nodejs.org). The purpose is to avoid boilerplate code in your
tests by creating models again and again, which can lead to very messy test
suites when it comes to model with quite some columns.

# Installation

```bash
$ npm install monky
```

Or put `monky` into your project's `package.json` file.

# Usage

`monky` is separated into two steps: set up a factory (once) and use the
factories to create models (unlimited).

## Create factory

In order to build/create new documents, a factory needs to be set up for each
model that will be used. This should be done in some kind of pre-test-suite-file
or maybe in a global `before()`-function.

```js
const mongoose = require('mongoose')
const Monky    = require('monky')
const monky    = new Monky(mongoose)

monky.factory('User', { username: 'name' }, err => {
  // ..
})

// Set up factory without callback (throws)
monky.factory('User', { username: 'name' })
```

The above code set's up a new factory for the model named _User_. Each model
that will be created from this factory will have an _username_ which is set to
_name_. All other paths will be empty.

Of course this is not enough to make documents valid. Therefore `monky` comes
with a sequence function which replaces the String "#n" with a sequence number.
So in order to have a unique username, one could use the following example:

```js
monky.factory('User', { username: '#n name' })
```

This will lead to users with _usernames_ like "1 name", "2 name" and so on.
Embedded documents are also supported.

### References

Monky also supports references between documents:

```js
monky.factory('User', { username: 'foo' })
monky.factory('Message', { user: monky.ref('User') })

monky.build('Message', message => {
  console.log(message.user.username) // 'foo'
})
```

Referring to the specific path is also supported:

```js
monky.factory('User', { username: 'bar' })
monky.factory('Message', { user_id: monky.ref('User', 'id') })

monky.build('Message', message => {
  console.log(message.user_id) // 53c6e964002c233e013ff4f8
})
```

As well as passing options to the reference factory:

```js
// Omitting `path`
monky.factory('Organisation', { name: 'Super org 1' })
monky.factory('Team', {
  name: 'Super Team 1', organisation: monky.ref('Organisation')
})
monky.factory('User', { team: monky.ref('Team') })

// With `path`
monky.factory('Team', {
  name: 'Super Team 1',
  organisation: monky.ref('Organisation', 'id', {
    name: 'Super Org 1'
  })
})
```

The according factory must be defined before it can be used in a reference.

### Passing reference instances as values

If you have an existing instance you can pass it as value to `build`/`create`:

```js
monky.create('User', (err, user) => {
  monky.create('Message', { user: user }, (err, message) => {
    console.log(message.user.username) // ==> equals user.username
  })
})
```

If you don't need the child instance to be populated but only saved, you can
pass
the `ObjectID` instead:

```js
monky.create('User', (err, user) => {
  monky.create('Message', { user: user._id }, (err, message) => {
    console.log(message.user) // ==> equals user.id
  })
})
```

## Use factories to build/create mongoose documents

### Build

The `build` function builds new mongoose models based on the set up factories
**without saving them**.

```js
monky.build('User', (err, user) => {
  // user ==> mongoose user model with pre set data
})
```

You can also set attributes when building, to replace default values

```js
monky.build('User', { city: 'California', email: 'custom@email.com' }, (err, user) => {
  // user ==> mongoose user model with pre set data but with custom values
})
```

### Create

`create` uses `build` to set up a new model instance and actually saves it.

```js
monky.create('User', (err, user) => {
  // user ==> saved mongoose user model instance
})
```

You can also set attributes when creating, to replace default values

```js
monky.create('User', { city: 'California', email: 'custom@email.com' }, (err, user) => {
  // user ==> saved mongoose user model with custom values
})
```

### Build and create lists

As of version 0.0.4 one can build and create lists of documents:

```js
monky.buildList('User', 5, (err, users) => {
  // users ==> array of 5 unsaved documents
})

monky.createList('User', 5, (err, users) => {
  // users ==> array of 5 saved documents
})
```

## Reset factories

Since overwriting factories is not allowed, factories can be reset either
completely or for a certain factory only:

```js
monky.reset() // Reset all
monky.reset('User') // Reset only 'User' factory
```

## Defining named factories

Monky uses the given factory name and maps it to the according model in
mongoose. If you, however, want to access factories with a different name, you
can tell monky which model to use:

```js
monky.factory({ name: 'Admin', model: 'User' }, { username: username })
monky.build('Admin', (err, admin) => {
  // admin ==> is a User, accessed as Admin
})
```

## Complete example using mocha

```js
/*
 * Model file
 */
const mongoose = require('mongoose')
const Schema = new mongoose.Schema({
  username: { type: 'string', unique: true, required: true
}})
mongoose.model('User', Schema)

/*
 * Pre-test file (setup)
 */
const mongoose = require('mongoose')
const Monky    = require('monky')
const monky    = new Monky(mongoose)

monky.factory('User', { username: '#n name' })

// Mongoose connect and other setup stuff

module.exports.monky = monky

/*
 * Actual test
 */
const monky = require('../setup').monky

describe('User', () => {
  it('should not save without username', done => {
    monky.build('User', (err, user) => {
      user.name = undefined
      user.save(err => {
        // Expect err
      })
    })
  })

  it('should save user with valid data', done => {
    monky.build('User', (err, user) => {
      user.save(done)
    })
  })

  it('should return computed amount of order', done => {
    monky.create('User', (err, user) => {
      const amount = user.getComputedOrderAmount()
      // Do some checks here...
    })
  })
})

// Alternatively one can create a new user using before hook
describe('User', () => {
  beforeEach(done => {
    const suite = this
    monky.create('User', (err, user) => {
      if (err) return done(err)
      suite.user = user
      done()
    )
  })
})
```

## Promises

As of version `0.6.0` Monky also fully supports promises for all public facing
build/create functions, e.g.:

```javascript
monky.build('User').then(user => {
  // user ==> built doc
}, err => {
  // err ==> triggered error
})
```

**Note**: Monky uses `mpromise` for promise handling, as does `mongoose`. The
current implementation of `mpromise` uses node 0.10.x APIs, making the promise
part of `Monky` not suitable for prior versions. If you're still using node
0.8.x, use the callback interface instead.

# Running tests

Install dev dependencies and run the tests.

```bash
$ npm i
$ make test
```

# License

(The MIT License)

Copyright (c) 2012 Mario Behrendt <info@mario-behrendt.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the 'Software'), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
