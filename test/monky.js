var mongoose  = require('mongoose')
  , Monky     = require('../')
  , monky     = new Monky();

describe('Monky', function() {
  function createUserSchema(done) {
    var UserSchema = new mongoose.Schema({
      username: {
        type: 'string',
        required: true,
        unique: true,
        validate: function(v) {
          return v && v.length > 10;
        }
      },
      active: { type: 'boolean' },
      street: { type: 'string' },
      city:   { type: 'string' },
      email:  { type: 'string' }
    });

    var Model = mongoose.model('User', UserSchema);
    Model.collection.drop(done);
  };

  function connect() {
    mongoose.connect('mongodb://localhost/monky_test', function(err) {
      if (err) throw err;
    });
  };

  before(function(done) {
    connect();
    createUserSchema(done);
  });

  afterEach(function(done) {
    monky.reset();
    done();
  });

  it('resets factories with fluent interface', function(done) {
    monky.factory('User', { username: '#n' });
    expect(Object.keys(monky.factories).length).to.be(1);

    var result = monky.reset();

    expect(result).to.be.a('object');
    expect(Object.keys(monky.factories).length).to.be(0);
    done();
  });

  it('fails to save factory since factory is already defined', function(done) {
    monky.factory('User', { username: 'me' });
    expect(function() {
      monky.factory('User', { username: 'me' })
    }).to.throwError();
    done();
  });

  it('fails to create instance due to invalid paths given', function(done) {
    monky.factory('User', { notexisting: true });
    monky.build('User', function(err) {
      expect(err).to.not.be(null);
      done();
    });
  });

  it('replaces #n with sequence', function(done) {
    monky.factory('User', { username: '#n name' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.username).to.match(/\d name/);
      done();
    });
  });

  it('does not replace #s or #m', function(done) {
    var value = '#m and #s name';
    monky.factory('User', { username: value });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.username).to.be(value);
      done();
    });
  });

  it('should leave hash sign when using ##n', function(done) {
    monky.factory('User', { username: 'my ##n name' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.username).to.match(/my #\d name/);
      done();
    });
  });

  it('uses return value of function is one is given as value', function(done) {
    function condition() {
      if (this.active) {
        return 'active';
      }
      return 'inactive';
    };

    monky.factory('User', { active: true, username: condition });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.username).to.be('active')
      done();
    });
  });

  it('saves build instance to mongo db', function(done) {
    monky.factory('User', { username: '#n username long enough' });
    monky.create('User', function(err, user) {
      if (err) return done(err);
      expect(user).to.have.property('_id');
      done();
    });
  });

  it('increases number used by sequence method', function(done) {
    monky.factory('User', { username: '#n username long enough' });
    monky.build('User', function(err, first) {
      if (err) return done(err);

      monky.build('User', function(err, second) {
        if (err) return done(err);
        expect(first.username).to.not.be(second.username);
        done();
      });
    });
  });

  it('supports sync version of build', function(done) {
    var value = 'something';
    monky.factory('User', { username: value });

    var user = monky.build('User');

    expect(user).to.have.property('username');
    expect(user.username).to.be(value);
    done();
  });

  it('throws error on sync build', function(done) {
    monky.factory('User', { invalidkey: true });
    expect(function() {
      monky.build('User');
    }).to.throwError();
    done();
  });

  it('supports sync version of create')
    //var value = 'something something';
    //monky.factory('User', { username: value });

    //var user = monky.create('User');

    //expect(user).to.have.property('username');
    //expect(user).to.have.property('_id');
    //expect(user.username).to.be(value);
    //done();

  it('throws error on sync create', function(done) {
    monky.factory('User', { invalidkey: true });
    expect(function() {
      monky.build('User');
    }).to.throwError();
    done();
  });
});
