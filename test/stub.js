var sinon     = require('sinon')
  , mongoose  = require('mongoose');

sinon.stub(mongoose.Model.prototype, 'save', function(cb) {
  var model = this;
  this.validate(function(err) {
    cb(err, model);
  });
});
