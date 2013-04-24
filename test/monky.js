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
      expect(user.isNew).to.be(true);
      expect(user.username).to.match(/\d name/);
      done();
    });
  });

  it('does not replace #s or #m', function(done) {
    var value = '#m and #s name';
    monky.factory('User', { username: value });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.username).to.be(value);
      done();
    });
  });

  it('should leave hash sign when using ##n', function(done) {
    monky.factory('User', { username: 'my ##n name' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
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
      expect(user.isNew).to.be(true);
      expect(user.username).to.be('active')
      done();
    });
  });

  it('saves build instance to mongo db', function(done) {
    monky.factory('User', { username: '#n username long enough' });
    monky.create('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(false);
      expect(user).to.have.property('_id');
      done();
    });
  });

  it('increases number used by sequence method', function(done) {
    monky.factory('User', { username: '#n username long enough' });
    monky.build('User', function(err, first) {
      if (err) return done(err);
      expect(first.isNew).to.be(true);

      monky.build('User', function(err, second) {
        if (err) return done(err);
        expect(first.isNew).to.be(true);
        expect(first.username).to.not.be(second.username);
        done();
      });
    });
  });

  it('replaces #n within embedded documents', function(done) {
    monky.factory('User', { addresses: [{ street: 'Avenue #n' }] });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.addresses.length).to.be(1);
      expect(user.addresses[0].street).to.match(/Avenue \d/);
      done();
    });
  })

  it('returns a list of built models', function(done) {
    monky.factory('User', { username: 'build_list' });
    monky.buildList('User', 3, function(err, users) {
      if (err) return done(err);
      expect(users).to.be.an(Array);
      expect(users.length).to.be(3);
      users.forEach(function(user) {
        expect(user.isNew).to.be(true);
        expect(user).to.have.property('username');
        expect(user.username).to.be('build_list');
      });
      done();
    });
  });

  it('returns a list of created models', function(done) {
    monky.factory('User', { username: 'create_list' });
    monky.createList('User', 3, function(err, users) {
      if (err) return done(err);
      expect(users).to.be.an(Array);
      expect(users.length).to.be(3);
      users.forEach(function(user) {
        expect(user.isNew).to.be(false);
        expect(user).to.have.property('username');
        expect(user.username).to.be('create_list');
      });
      done();
    });
  });
});
