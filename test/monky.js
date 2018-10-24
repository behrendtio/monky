var mongoose  = require('mongoose')
  , expect    = require('expect.js')
  , Monky     = require('../')
  , monky     = new Monky(mongoose);

describe('Monky', function() {
  function createUserSchema(done) {
    var AddressSchemaWtihInstance = new mongoose.Schema({
      addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' }
    });

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
      addresses: [AddressSchema],
      date: { type: Date },
      data: {},
      notification: {
        email: { type: 'boolean', 'default': true },
        sns: {
          account: { type: 'string' },
          enabled: { type: 'boolean', 'default': false }
        }
      },
      addressInstances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Address' }],
      addressSchemaWtihInstance: [AddressSchemaWtihInstance]
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
    mongoose.model('Address', AddressSchema);
    done();
  };

  before(function(done) {
    createUserSchema(done);
  });

  afterEach(function(done) {
    monky.reset();
    done();
  });

  it('does not validate the model on build', function(done) {
    monky.factory('User', { active: true });

    monky.build('User', done);
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

  it('resets sequences with fluent interface', function (done) {
    monky.factory('User', { username: '#n' });
    expect(Object.keys(monky.sequences).length).to.be(0);
    monky.build('User', function (err, user) {
      if (err) return done(err);
      expect(Object.keys(monky.sequences).length).to.be(1);
      expect(monky.sequences.User.username).to.be(1);
      monky.reset();
      expect(Object.keys(monky.sequences).length).to.be(0);
      done();
    })
  });

  it('resets a certan sequence only', function (done) {
    monky.factory('User', { username: '#n' });
    monky.factory('Message', { body: 'Foo #n' });
    expect(Object.keys(monky.sequences).length).to.be(0);

    monky.build('User', function (err, user) {
      monky.build('Message', function (err, message) {
        if (err) return done(err);
        expect(Object.keys(monky.sequences).length).to.be(2);
        expect(monky.sequences.User.username).to.be(1);
        expect(monky.sequences.Message.body).to.be(1);
        monky.reset('User');
        expect(Object.keys(monky.sequences).length).to.be(1);
        expect(monky.sequences.Message.body).to.be(1);
        done();
      });
    })
  })

  it('replaces #n with sequence', function(done) {
    monky.factory('User', { username: '#n my username' });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.isNew).to.be(true);
      expect(user.username).to.match(/\d my username/);
      done();
    });
  });

  it('replaces #n with sequence in arrays', function(done) {
    monky.factory('User', { emails: ['#n@example.org'] });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.emails[0]).to.match(/\d@example\.org/)
      done();
    })
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

  it('should correctly initialize a mixed path', function(done) {
    var data = {
      one: 1,
      two: 2,
      three: 3
    };
    monky.factory('User', {
      username: 'mixed path test',
      data: data
    });

    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.data).to.eql(data);
      done();
    });
  });

  it('should correctly initialize nested objects', function(done) {
    monky.factory('User', {
      username: 'nested objects test',
      notification: {
        sns: {
          account: 'test account'
        }
      }
    });
    monky.build('User', function(err, user) {
      if (err) return done(err);
      expect(user.notification.email).to.be(true);
      expect(user.notification.sns).to.eql({ account: 'test account', enabled: false });
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
    monky.factory('Message', { body: 'Hi!', user: monky.ref('Person') });

    monky.build('Message', function(err) {
      expect(err).to.be.an(Error);
      expect(err.message).to.match(/Invalid model/);
      done();
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

  it('allows to use created object ids as reference', function(done) {
    var username = 'a-different-username';

    monky.factory('User', { username: 'username' });
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') });

    monky.create('User', { username: username }, function(err, user) {
      if (err) return done(err);
      monky.create('Message', { user: user._id }, function(err, message) {
        if (err) return done(err);
        expect(message.user).to.be(user._id);
        message.save(done);
      });
    });
  });

  it('allows to unset a related object', function(done) {
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') });

    monky.create('Message', { user: null }, function(err, message) {
      if (err) return done(err);
      expect(message.user).to.be(null);
      message.save(done);
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

  it('returns promise if no callback was given for build', function(done) {
    var name = 'promise for build';

    monky.factory('User', { username: name });

    monky.build('User').then(function(user) {
      expect(user.username).to.be(name);
      done();
    }).end();
  });

  it('returns promise if no callback was given for create', function(done) {
    var name = 'promise for create';

    monky.factory('User', { username: name });

    monky.create('User').then(function(user) {
      expect(user.username).to.be(name);
      done();
    }).end();
  });

  it('returns promise if no callback was given for buildList', function(done) {
    var name = 'promise for buildList';

    monky.factory('User', { username: name });

    monky.buildList('User', 5).then(function(users) {
      expect(users.length).to.be(5);
      users.forEach(function(user) {
        expect(user.username).to.be(name);
      });
      done();
    }).end();
  });

  it('returns promise if no callback was given for createList', function(done) {
    var name = 'promise for createList';

    monky.factory('User', { username: name });

    monky.createList('User', 5).then(function(users) {
      expect(users.length).to.be(5);
      users.forEach(function(user) {
        expect(user.username).to.be(name);
      });
      done();
    }).end();
  });

  it('returns rejected promise on failure', function(done) {
    var name = 'rejected';

    monky.factory('User', { username: name });

    monky.create('User').then(function(user) {
      // On success...
    }, function(err) {
      expect(err).to.be.an(Error);
      done();
    }).end();
  });

  it('keeps the source options unmodified', function(done) {
    monky.factory('User', {
      username: 'nested options',
      details: [{ value: 1 }]
    });

    monky.build('User', function(err, user) {
      if (err) return done(err);

      expect(user.details[0].value).to.be(1);
      user.details[0].value = 2;

      monky.build('User', function(err, user) {
        if (err) return done(err);
        expect(user.details[0].value).to.be(1);
        done();
      });
    });
  });

  it('handles dates correctly', function(done) {
    var date = new Date();

    monky.factory('User', { username: '#n username with date', date: date });
    monky.create('User', function(err, user) {
      if (err) return done(err);
      expect(user.date).to.be(date);
      done();
    });
  });

  it('handles arrays of monky refs correctly', function(done) {
    var street = 'Baker street';

    monky.factory('Address', { street: street });
    monky.factory('User', { username: 'arrayrefuser', addressInstances: [monky.ref('Address')] });

    monky.create('User', function(err, user) {
      if (err) return done(err);
      expect(user.addressInstances.length).to.be(1);
      expect(user.addressInstances[0].street).to.be(street);
      done();
    });
  });


  // it.only('handles arrays of subdocuments with monky refs correctly', function(done) {
  //   var street = 'Baker street';

  //   monky.factory('Address', { street: street });
  //   monky.factory('User', { username: 'arrayrefuser', addressSchemaWtihInstance: [{addressId: monky.ref('Address')}] });

  //   monky.create('User', function(err, user) {
  //     console.log(user)
  //     if (err) return done(err);
  //     expect(user.addressInstances.length).to.be(1);
  //     expect(user.addressInstances[0].street).to.be(street);
  //     done();
  //   });
  // });
});
