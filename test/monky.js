var mongoose  = require('mongoose')
  , expect    = require('expect.js')
  , Monky     = require('../')
  , monky     = new Monky(mongoose);

describe('Monky', function() {
  function createUserSchema(done) {
    var Address = new mongoose.Schema({
      street: { type: 'string' }
    });

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
      email:  { type: 'string' },
      addresses: [Address]
    });

    mongoose.model('User', UserSchema);
    done();
  };

  before(function(done) {
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

  it('replaces #n within embedded documents', function(done) {
    monky.factory('User', { addresses: [{ street: 'Avenue #n' }] });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.addresses.length).to.be(1);
      expect(user.addresses[0].street).to.match(/Avenue \d/);
      done();
    });
  })
});
