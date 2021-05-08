const sinon = require('sinon')
const mongoose = require('mongoose')

sinon.stub(mongoose.Model.prototype, 'save').callsFake(function(cb) {
  var model = this

  this.validate(err => {
    if (!err) {
      model.isNew = false
    }
    cb(err, model)
  })
})
