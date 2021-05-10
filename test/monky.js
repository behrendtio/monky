const mongoose = require('mongoose')
const expect   = require('expect.js')
const Monky    = require('../')
const monky    = new Monky(mongoose)

describe('Monky', () => {
  const createUserSchema = done => {
    const AddressSchemaWtihInstance = new mongoose.Schema({
      addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' }
    })

    const AddressSchema = new mongoose.Schema({
      street: { type: 'string' }
    })

    const UserSchema = new mongoose.Schema({
      username: {
        type: 'string',
        required: true,
        unique: true, // This is not being enforced bc docs are never written to db
        validate: v => {
          return v && v.length > 10
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
      addressSchemaWtihInstance: [AddressSchemaWtihInstance],
      team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      }
    })

    const MessageSchema = new mongoose.Schema({
      body: 'string',
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    })

    const OrganisationSchema = new mongoose.Schema({
      name: 'string'
    })

    const TeamSchema = new mongoose.Schema({
      name: {
        type: 'string',
        required : true,
        validate: v => {
          return v && v.length > 10
        }
      },
      organisation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organisation'
      }
    })

    mongoose.model('User', UserSchema)
    mongoose.model('Message', MessageSchema)
    mongoose.model('Address', AddressSchema)
    mongoose.model('Team', TeamSchema)
    mongoose.model('Organisation', OrganisationSchema)

    done()
  }

  before(done => {
    createUserSchema(done)
  })

  afterEach(done => {
    monky.reset()
    done()
  })

  it('does not validate the model on build', done => {
    monky.factory('User', { active: true })

    monky.build('User', done)
  })

  it('resets factories with fluent interface', done => {
    monky.factory('User', { username: '#n' })
    expect(Object.keys(monky.factories).length).to.be(1)

    monky.reset()

    expect(Object.keys(monky.factories).length).to.be(0)
    done()
  })

  it('resets a certain factory only', done => {
    monky.factory('User', { username: '#n' })
    monky.factory('Message', { body: 'Foo' })

    expect(Object.keys(monky.factories).length).to.be(2)

    monky.reset('Message')

    expect(Object.keys(monky.factories)).to.eql(['User'])
    done()
  })

  it('fails to save factory since factory is already defined', done => {
    monky.factory('User', { username: 'me' })
    expect(() => {
      monky.factory('User', { username: 'me' })
    }).to.throwError()
    done()
  })

  it('resets sequences with fluent interface', done => {
    monky.factory('User', { username: '#n' })
    expect(Object.keys(monky.sequences).length).to.be(0)
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(Object.keys(monky.sequences).length).to.be(1)
      expect(monky.sequences.User.username).to.be(1)
      monky.reset()
      expect(Object.keys(monky.sequences).length).to.be(0)
      done()
    })
  })

  it('resets a certan sequence only', done => {
    monky.factory('User', { username: '#n' })
    monky.factory('Message', { body: 'Foo #n' })
    expect(Object.keys(monky.sequences).length).to.be(0)

    monky.build('User', (err, user) => {
      monky.build('Message', (err, message) => {
        if (err) return done(err)
        expect(Object.keys(monky.sequences).length).to.be(2)
        expect(monky.sequences.User.username).to.be(1)
        expect(monky.sequences.Message.body).to.be(1)
        monky.reset('User')
        expect(Object.keys(monky.sequences).length).to.be(1)
        expect(monky.sequences.Message.body).to.be(1)
        done()
      })
    })
  })

  it('replaces #n with sequence', done => {
    monky.factory('User', { username: '#n my username' })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.username).to.match(/\d my username/)
      done()
    })
  })

  it('replaces #n with sequence in arrays', done => {
    monky.factory('User', { emails: ['#n@example.org'] })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.emails[0]).to.match(/\d@example\.org/)
      done()
    })
  })

  it('replaces #n with sequence in nested objects', done => {
    monky.factory('User', {
      username: 'nested obj test',
      country: { iso: 'DE', number: 'country #n', capital: { name: 'Berlin', number: 'capital #n' }}
    })

    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.country.number).to.match(/country \d/)
      expect(user.country.capital.number).to.match(/capital \d/)
      done()
    })
  })

  it('should correctly initialize a mixed path', done => {
    const data = {
      one: 1,
      two: 2,
      three: 3
    }
    monky.factory('User', {
      username: 'mixed path test',
      data: data
    })

    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.data).to.eql(data)
      done()
    })
  })

  it('should correctly initialize nested objects', done => {
    monky.factory('User', {
      username: 'nested objects test',
      notification: {
        sns: {
          account: 'test account'
        }
      }
    })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.notification.email).to.be(true)
      expect(user.notification.sns).to.eql({ account: 'test account', enabled: false })
      done()
    })
  })

  it('does not replace #s or #m', done => {
    const value = '#m and #s name'
    monky.factory('User', { username: value })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.username).to.be(value)
      done()
    })
  })

  it('should leave hash sign when using ##n', done => {
    monky.factory('User', { username: 'my ##n username' })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.username).to.match(/my #\d username/)
      done()
    })
  })

  it('uses return value of function if one is given as value', done => {
    const condition = function() {
      if (this.active) {
        return 'active user'
      }
      return 'inactive user'
    }

    monky.factory('User', { active: true, username: condition })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.username).to.be('active user')
      done()
    })
  })

  it('saves build instance to mongo db', done => {
    monky.factory('User', { username: '#n username long enough' })
    monky.create('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(false)
      expect(user).to.have.property('_id')
      done()
    })
  })

  it('increases number used by sequence method', done => {
    monky.factory('User', { username: '#n username long enough' })
    monky.build('User', (err, first) => {
      if (err) return done(err)
      expect(first.isNew).to.be(true)

      monky.build('User', (err, second) => {
        if (err) return done(err)
        expect(first.isNew).to.be(true)
        expect(first.username).to.not.be(second.username)
        done()
      })
    })
  })

  it('replaces #n within embedded documents', done => {
    monky.factory('User', { username: 'Embedded user', addresses: [{ street: 'Avenue #n' }] })
    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.addresses.length).to.be(1)
      expect(user.addresses[0].street).to.match(/Avenue \d/)
      done()
    })
  })

  it('returns a list of built models', done => {
    monky.factory('User', { username: 'build_list user' })
    monky.buildList('User', 3, (err, users) => {
      if (err) return done(err)
      expect(users).to.be.an(Array)
      expect(users.length).to.be(3)
      users.forEach(user => {
        expect(user.isNew).to.be(true)
        expect(user).to.have.property('username')
        expect(user.username).to.be('build_list user')
      })
      done()
    })
  })

  it('returns a list of created models', done => {
    monky.factory('User', { username: 'create_list user' })
    monky.createList('User', 3, (err, users) => {
      if (err) return done(err)
      expect(users).to.be.an(Array)
      expect(users.length).to.be(3)
      users.forEach(user => {
        expect(user.isNew).to.be(false)
        expect(user).to.have.property('username')
        expect(user.username).to.be('create_list user')
      })
      done()
    })
  })

  it('throws error if related factory is not present', done => {
    monky.factory('Message', { body: 'Hi!', user: monky.ref('Person') })

    monky.build('Message', err => {
      expect(err).to.be.an(Error)
      expect(err.message).to.match(/Invalid model/)
      done()
    })
  })

  it('allows to use created objects as reference', done => {
    const username = 'a-different-username'

    monky.factory('User', { username: 'username' })
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') })

    monky.create('User', { username: username }, (err, user) => {
      if (err) return done(err)
      monky.create('Message', { user: user }, (err, message) => {
        if (err) return done(err)
        expect(message.user.username).to.be(username)
        message.save(done)
      })
    })
  })

  it('allows to use created object ids as reference', done => {
    const username = 'a-different-username'

    monky.factory('User', { username: 'username' })
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') })

    monky.create('User', { username: username }, (err, user) => {
      if (err) return done(err)
      monky.create('Message', { user: user._id }, (err, message) => {
        if (err) return done(err)
        expect(message.user).to.be(user._id)
        message.save(done)
      })
    })
  })

  it('allows to unset a related object', done => {
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') })

    monky.create('Message', { user: null }, (err, message) => {
      if (err) return done(err)
      expect(message.user).to.be(null)
      message.save(done)
    })
  })

  it('creates related document if factory is present', done => {
    const username = 'referenced_name'

    monky.factory('User', { username: username })
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User') })

    monky.build('Message', (err, message) => {
      if (err) return done(err)
      expect(message.user.username).to.be(username)

      message.save(done)
    })
  })

  it('creates related document and obtains the specific path', done => {
    monky.factory('User', { username: 'referenced_path_name' })
    monky.factory('Message', { body: 'Hi!', user: monky.ref('User', 'id') })

    monky.build('Message', (err, message) => {
      if (err) return done(err)
      expect(message.user).to.match(/^[0-9a-fA-F]{24}$/)

      message.save(done)
    })
  })

  it('builds documents with custom user params', done => {
    const username = 'Bobs username'
    const customUser = 'Teds username'

    monky.factory('User', { username: username })

    monky.build('User', { username: customUser }, (err, user) => {
      if(err) throw err
      expect(user.username).to.be(customUser)
      done()
    })
  })

  it('creates documents with custom user params', done => {
    const username = 'Bob'
    const customUser = 'MyCustomUser'

    monky.factory('User', { username: username })

    monky.create('User', { username: customUser }, (err, user) => {
      if(err) throw err
      expect(user.username).to.be(customUser)
      done()
    })
  })

  it('does not replace default factories options reference when using custom values', done => {
    const username = 'myusernametest'

    monky.factory('User', { username: username })

    monky.create('User', { username: 'mycustomusername' }, (err, customUser) => {
      monky.create('User', (err, defaultUser) => {
        expect(defaultUser.username).to.be(username)
        done()
      })
    })
  })

  it('builds lists of documents with custom user params', done => {
    const username = 'Bobs username'
    const customUser = 'Teds username'

    monky.factory('User', { username: username })

    monky.buildList('User', 3, { username: customUser }, (err, users) => {
      if(err) throw err

      expect(users.length).to.equal(3)
      users.forEach(user => {
        expect(user.username).to.be(customUser)
      })

      done()
    })
  })

  it('creates lists of documents with custom user params', done => {
    const username = 'Bob'
    const customUser = 'MyCustomUser'

    monky.factory('User', { username: username })

    monky.createList('User', 3, { username: customUser }, (err, users) => {
      if(err) throw err

      expect(users.length).to.equal(3)
      users.forEach(user => {
        expect(user.username).to.be(customUser)
      })

      done()
    })
  })

  it('allows setting a specific name to access the factory later on', done => {
    const username = 'administrator'
    monky.factory({ name: 'Admin', model: 'User' }, { username: username })

    monky.build('Admin', (err, admin) => {
      expect(admin.username).to.be(username)
      done()
    })
  })

  it('handles array as a value', done => {
    monky.factory('User', { username: 'user with emails', emails: ['one@example.org', 'two@example.org'] })

    monky.build('User', (err, user) => {
      if (err) return done(err)
      expect(user.isNew).to.be(true)
      expect(user.emails.length).to.be(2)
      done()
    })
  })

  it('returns promise if no callback was given for build', done => {
    const name = 'promise for build'

    monky.factory('User', { username: name })

    monky.build('User').then(user => {
      expect(user.username).to.be(name)
      done()
    }).end()
  })

  it('returns promise if no callback was given for create', done => {
    const name = 'promise for create'

    monky.factory('User', { username: name })

    monky.create('User').then(user => {
      expect(user.username).to.be(name)
      done()
    }).end()
  })

  it('returns promise if no callback was given for buildList', done => {
    const name = 'promise for buildList'

    monky.factory('User', { username: name })

    monky.buildList('User', 5).then(users => {
      expect(users.length).to.be(5)
      users.forEach(user => {
        expect(user.username).to.be(name)
      })
      done()
    }).end()
  })

  it('returns promise if no callback was given for createList', done => {
    const name = 'promise for createList'

    monky.factory('User', { username: name })

    monky.createList('User', 5).then(users => {
      expect(users.length).to.be(5)
      users.forEach(user => {
        expect(user.username).to.be(name)
      })
      done()
    }).end()
  })

  it('returns rejected promise on failure', done => {
    const name = 'rejected'

    monky.factory('User', { username: name })

    monky.create('User').then(user => {
      // On success...
    }, err => {
      expect(err).to.be.an(Error)
      done()
    }).end()
  })

  it('keeps the source options unmodified', done => {
    monky.factory('User', {
      username: 'nested options',
      details: [{ value: 1 }]
    })

    monky.build('User', (err, user) => {
      if (err) return done(err)

      expect(user.details[0].value).to.be(1)
      user.details[0].value = 2

      monky.build('User', (err, user) => {
        if (err) return done(err)
        expect(user.details[0].value).to.be(1)
        done()
      })
    })
  })

  it('handles dates correctly', done => {
    const date = new Date()

    monky.factory('User', { username: '#n username with date', date: date })
    monky.create('User', (err, user) => {
      if (err) return done(err)
      expect(user.date).to.be(date)
      done()
    })
  })

  it('handles arrays of monky refs correctly', done => {
    const street = 'Baker street'

    monky.factory('Address', { street: street })
    monky.factory('User', { username: 'arrayrefuser', addressInstances: [monky.ref('Address')] })

    monky.create('User', (err, user) => {
      if (err) return done(err)
      expect(user.addressInstances.length).to.be(1)
      expect(user.addressInstances[0].street).to.be(street)
      expect(user.addressInstances[0]._id).match(/^[0-9a-fA-F]{24}$/)
      done()
    })
  })


  it('handles arrays of subdocuments with monky refs correctly', done => {
    const street = 'Baker street'

    monky.factory('Address', { street: street })
    monky.factory('User', {
      username: 'arrayrefuser',
      addressSchemaWtihInstance: [{addressId: monky.ref('Address')}]
    })

    monky.create('User', (err, user) => {
      if (err) return done(err)
      expect(user.addressSchemaWtihInstance.length).to.be(1)
      expect(user.addressSchemaWtihInstance[0].addressId._id).match(/^[0-9a-fA-F]{24}$/)
      done()
    })
  })

  // A regression test to catch a bug where promises where not rejecting appropriately for monky._doList
  it('correctly returns errors when using promises with createList or buildList', done => {
    const name = 'ateamname'
    const count = 2
    const model = 'Team'

    monky.factory(model, { 
      name: () => "#n name"
    })

    const expectedErr = 'ValidationError: Team validation failed: name: Validator failed for path `name` with value `ateamname`'

    monky.createList(model, count, { name: name }).then(docs => {
      expect(!docs) // This should not succeed
    })
    .catch(err => {
      expect(err.message === expectedErr)
      done()
    })
    .end()
  })

  it('creates relationships for several layers', done => {
    const orgName = 'Org 1'

    monky.factory('Organisation', { name: orgName })
    monky.factory('Team', {
      name: 'Super Team 1',
      organisation: monky.ref('Organisation')
    })
    monky.factory('User', { team: monky.ref('Team') })

    monky.create('User', { username: 'multilayertest' }, (err, user) => {
      expect(user.team.organisation.name).to.equal(orgName)
      done()
    })
  })

  it('uses given path for relationships as well', done => {
    monky.factory('Organisation')
    monky.factory('Team', {
      name: 'Super Team 1',
      organisation: monky.ref('Organisation', 'id', {
        name: 'Super Org 1'
      })
    })

    monky.create('Team', { name: 'Team Rocket' }, (err, team) => {
      expect(team.organisation).to.match(/^[0-9a-fA-F]{24}$/)
      done()
    })
  })
})
