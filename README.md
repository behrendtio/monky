[![Build Status](https://secure.travis-ci.org/mbehrendt/monky.png?branch=master)](https://travis-ci.org/mbehrendt/monky)

# Monky

[Mongoose](http://mongoosejs.com) fixtures library inspired by [factory_girl](https://github.com/thoughtbot/factory_girl)

# Philosophy

Inspired by factory_girl this library tries to bring similar functionality to [node](http://nodejs.org). The purpose is to avoid boilerplate code in your tests by creating models again and again, which can lead to very messy test suites when it comes to model with quite some columns.

# Installation

```bash
$ npm install monky
```

Or put `monky` into your project's `package.json` file.

# Usage

`monky` is separated into two steps: set up a factory (once) and use the factories to create models (unlimited).

## Create factory

In order to build/create new documents, a factory needs to be set up for each model that will be used. This should be done in some kind of pre-test-suite-file or maybe in a global `before()`-function.

```js
var monky = new Monky();

monky.factory('User', { username: 'name' }, function(err) {
  // ..
});

// Set up factory without callback (throws)
monky.factory('User', { username: 'name' });
```

The above code set's up a new factory for the model named _User_. Each model that will be created from this factory will have an _username_ which is set to _name_. All other paths will be empty.

Of course this is not enough to make documents valid. Therefore `monky` comes with a sequence function which replaces the String "#n" with a sequence number. So in order to have a unique username, one could use the following example:

```js
monky.factory('User', { username: '#n name' });
```

This will lead to users with _usernames_ like "1 name", "2 name" and so on.

## Use factories to build/create mongoose documents

### Build

The `build` function builds new mongoose models based on the set up factories **without saving them**.

```js
monky.build('User', function(err, user) {
  // user ==> mongoose user model with pre set data
});
```

### Create

`create` uses `build` to set up a new model instance and actually saves it.

```js
monky.create('User', function(err, user) {
  // user ==> saved mongoose user model instance
});
```

## Complete example using mocha

```js
// model.js
var mongoose = require('mongoose');
var Schema = new mongoose.Schema({ username: { type: 'string', unique: true, required: true }});

mongoose.model('User', Schema);

// Pre-test file (setup)
var monky = require('monky');
monky.factory('User', { username: '#n name' });

// Actual test
describe('User', function() {
  it('should not save without username', function(done) {
    monky.build('User', function(err, user) {
      user.name = undefined;
      user.save(function(err) {
        // Expect err
      });
    });
  });

  it('should save user with valid data', function(done) {
    monky.build('User', function(err, user) {
      user.save(done);
    });
  });

  it('should return computed amount of order', function(done) {
    monky.create('User', function(err, user) {
      var amount = user.getComputedOrderAmount();
      // Do some checks here...
    });
  });
});

// Alternatively one can create a new user using before hook
describe('User', function() {
  beforeEach(function(done) {
    var suite = this;
    monky.create('User', function(err, user) {
      if (err) return done(err);
      suite.user = user;
      done();
    );
  });
});
```

# Running tests

Install dev dependencies and run the tests.

```bash
$ npm install
$ make test
```

# License

(The MIT License)

Copyright (c) 2012 Mario Behrendt <info@mario-behrendt.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
