# Monky

Mongoose fixtures library inspired by factory_girl

# Installation

# Usage

## Create factory

```js
var monky = new Monky();

// Set up factory and check callback error
monky.factory('User', { username: '#n name' }, function(err, mock) {
  // ...
});

// Set up factory without callback (throws)
monky.factory('User', { username: '#n name' });
```

## Use them

```js
// Build object but don't save it
// Async version
monky.build('User', function(err, user) {
  // ...
});

// Sync version (throws)
var user = monky.build('User');

// Build and save object to mongo
// Async version
monky.create('User', function(err, user) {
  // ...
});

// Sync version (throws)
var user = monky.create('User');
```

# Running tests

# License

(The MIT License)

Copyright (c) 2012 Mario Behrendt <info@mario-behrendt.de>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
