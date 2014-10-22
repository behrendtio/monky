var mongoose  = require('mongoose')
  , expect    = require('expect.js')
  , Monky     = require('../')
  , monky     = new Monky(mongoose);

describe('Monky', function() {
  function createUserSchema(done) {
    var AddressSchema = new mongoose.Schema({
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
      country: {
        iso: { type: 'string' },
        number: { type: 'string' },
        capital: {
          name: { type: 'string' },
          number: { type: 'string' },
        }
      },
      active: { type: 'boolean' },
      street: { type: 'string' },
      city:   { type: 'string' },
      emails: [String],
      addresses: [AddressSchema]
    });

    var MessageSchema = new mongoose.Schema({
      body: 'string',
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    });

    mongoose.model('User', UserSchema);
    mongoose.model('Message', MessageSchema);
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

    monky.reset();

    expect(Object.keys(monky.factories).length).to.be(0);
    done();
  });

  it('resets a certain factory only', function(done) {
    monky.factory('User', { username: '#n' });
    monky.factory('Message', { body: 'Foo' });

    expect(Object.keys(monky.factories).length).to.be(2);

    monky.reset('Message');

    expect(Object.keys(monky.factories)).to.eql(['User']);
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
    monky.factory('User', { username: '#n my username' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.username).to.match(/\d my username/);
      done();
    });
  });

  it('replaces #n with sequence in nested objects', function(done) {
    monky.factory('User', {
      username: 'nested obj test',
      country: { iso: 'DE', number: 'country #n', capital: { name: 'Berlin', number: 'capital #n' }}
    });

    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.country.number).to.match(/country \d/);
      expect(user.country.capital.number).to.match(/capital \d/);
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
    monky.factory('User', { username: 'my ##n username' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.username).to.match(/my #\d username/);
      done();
    });
  });

  it('uses return value of function if one is given as value', function(done) {
    function condition() {
      if (this.active) {
        return 'active user';
      }
      return 'inactive user';
    };

    monky.factory('User', { active: true, username: condition });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.username).to.be('active user')
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
    monky.factory('User', { username: 'Embedded user', addresses: [{ street: 'Avenue #n' }] });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.addresses.length).to.be(1);
      expect(user.addresses[0].street).to.match(/Avenue \d/);
      done();
    });
  })

  it('returns a list of built models', function(done) {
    monky.factory('User', { username: 'build_list user' });
    monky.buildList('User', 3, function(err, users) {
      if (err) return done(err);
      expect(users).to.be.an(Array);
      expect(users.length).to.be(3);
      users.forEach(function(user) {
        expect(user.isNew).to.be(true);
        expect(user).to.have.property('username');
        expect(user.username).to.be('build_list user');
      });
      done();
    });
  });

  it('returns a list of created models', function(done) {
    monky.factory('User', { username: 'create_list user' });
    monky.createList('User', 3, function(err, users) {
      if (err) return done(err);
      expect(users).to.be.an(Array);
      expect(users.length).to.be(3);
      users.forEach(function(user) {
        expect(user.isNew).to.be(false);
        expect(user).to.have.property('username');
        expect(user.username).to.be('create_list user');
      });
      done();
    });
  });

  it('throws error if related factory is not present', function(done) {
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') });

    monky.build('Message', function(err) {
      expect(err).to.not.be(null);
      done();
    });
  });

  it('creates related document if factory is present', function(done) {
    var username = 'referenced_name';

    monky.factory('User', { username: username });
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') });

    monky.build('Message', function(err, message) {
      if (err) return done(err);
      expect(message.user.username).to.be(username)

      message.save(done);
    });
  });

  it('allows to use created objects as reference', function(done) {
    var username = 'a-different-username';

    monky.factory('User', { username: 'username' });
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') });

    monky.create('User', { username: username }, function(err, user) {
      if (err) return done(err);
      monky.create('Message', { user: user }, function(err, message) {
        if (err) return done(err);
        expect(message.user.username).to.be(username);
        message.save(done);
      });
    });
  });

  it('creates related document and obtains the specific path', function(done) {
    monky.factory('User', { username: 'referenced_path_name' });
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User', 'id') });

    monky.build('Message', function(err, message) {
      if (err) return done(err);
      expect(message.user).to.match(/^[0-9a-fA-F]{24}$/)

      message.save(done);
    });
  });

  it('builds documents with custom user params', function(done) {
    var username = 'Bobs username';
    var customUser = 'Teds username';

    monky.factory('User', { username: username });

    monky.build('User', { username: customUser }, function(err, user) {
      if(err) throw err;
      expect(user.username).to.be(customUser)
      done();
    });
  });

  it('creates documents with custom user params', function(done) {
    var username = 'Bob';
    var customUser = 'MyCustomUser';

    monky.factory('User', { username: username });

    monky.create('User', { username: customUser }, function(err, user) {
      if(err) throw err;
      expect(user.username).to.be(customUser);
      done();
    });
  });

  it('does not replace default factories options reference when using custom values', function(done) {
    var username = 'myusernametest';

    monky.factory('User', { username: username });

    monky.create('User', { username: 'mycustomusername' }, function(err, customUser) {
      monky.create('User', function(err, defaultUser) {
        expect(defaultUser.username).to.be(username);
        done();
      });
    })
  });

  it('builds lists of documents with custom user params', function(done) {
    var username = 'Bobs username';
    var customUser = 'Teds username';

    monky.factory('User', { username: username });

    monky.buildList('User', 3, { username: customUser }, function(err, users) {
      if(err) throw err;

      expect(users.length).to.equal(3);
      users.forEach(function(user) {
        expect(user.username).to.be(customUser)
      });

      done();
    });
  });

  it('creates lists of documents with custom user params', function(done) {
    var username = 'Bob';
    var customUser = 'MyCustomUser';

    monky.factory('User', { username: username });

    monky.createList('User', 3, { username: customUser }, function(err, users) {
      if(err) throw err;

      expect(users.length).to.equal(3);
      users.forEach(function(user) {
        expect(user.username).to.be(customUser)
      });

      done();
    });
  });

  it('allows setting a specific name to access the factory later on', function(done) {
    var username = 'administrator';
    monky.factory({ name: 'Admin', model: 'User' }, { username: username });

    monky.build('Admin', function(err, admin) {
      expect(admin.username).to.be(username);
      done();
    });
  });

  it('handles array as a value', function(done) {
    monky.factory('User', { username: 'user with emails', emails: ['one@example.org', 'two@example.org'] });

    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.emails.length).to.be(2);
      done();
    });
  });
});
