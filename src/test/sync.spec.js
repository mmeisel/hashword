/* eslint-env mocha */
/* global expect, inject, sinon */

const angular = require('angular')

require('angular-mocks')

const ClientOptions = require('../lib/client-options')
const rules = require('../lib/rules')
const storage = require('../lib/storage')
const sync = require('../lib/sync.module')

const sandbox = sinon.createSandbox()

describe('syncService', () => {
  let $httpBackend
  let $timeout
  let syncService

  beforeEach(angular.mock.module(sync))

  beforeEach(inject($injector => {
    $httpBackend = $injector.get('$httpBackend')
    $timeout = $injector.get('$timeout')
    syncService = $injector.get('syncService')
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  describe('#checkServerStatus()', () => {
    it('should report OFF status when serverType is NONE', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({ serverType: 'NONE' })))

      // Should not be called
      $httpBackend.whenGET('http://localhost/api/user').respond({})

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'OFF')
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should use the hard-coded URL when serverType is OFFICIAL', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({ serverType: 'OFFICIAL' })))

      $httpBackend.whenGET('https://hashword.org/api/user').respond(403, {})
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should use the customServerUrl URL when serverType is CUSTOM', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))

      $httpBackend.whenGET('http://localhost/api/user').respond(403, {})
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should report CONNECTED status when the server responds with a 200', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))
      const user = { name: 'Michael' }

      $httpBackend.whenGET('http://localhost/api/user').respond(user)
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'CONNECTED')
        expect(result).to.have.property('user').that.deep.equals(user)
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should report AUTH_REQUIRED status when the server responds with a 401', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))

      $httpBackend.whenGET('http://localhost/api/user').respond(401, {})
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'AUTH_REQUIRED')
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should report CONNECTED status when the server responds with a 200', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))
      const user = { name: 'Michael' }

      $httpBackend.whenGET('http://localhost/api/user').respond(user)
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'CONNECTED')
        expect(result).to.have.property('user').that.deep.equals(user)
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should report SERVER_UNAVAILABLE status when the server responds with a non-403 error', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))

      $httpBackend.whenGET('http://localhost/api/user').respond(500, {})
      setTimeout(() => $httpBackend.flush(), 0)

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'SERVER_UNAVAILABLE')
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })

    it('should report SERVER_UNAVAILABLE status when the request times out', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions')
        .returns(Promise.resolve(new ClientOptions({
          serverType: 'CUSTOM',
          customServerUrl: 'http://localhost'
        })))

      $httpBackend.whenGET('http://localhost/api/user').respond({})
      setTimeout(() => $timeout.flush(5001), 0)

      return syncService.checkServerStatus().then(result => {
        expect(result).to.have.property('status', 'SERVER_UNAVAILABLE')
        expect(getOptionsStub.calledOnce).to.equal(true)
      })
    })
  })

  describe('#getDomainsToSync()', () => {
    const options = new ClientOptions({
      serverType: 'CUSTOM',
      customServerUrl: 'http://localhost'
    })

    it('should not select domains where the rev and accessDate match the server', () => {
      const sites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '22222222'
        }
      }
      const stubs = setUpStubs(sites, sites)

      return syncService.getDomainsToSync(options).then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(toSync).to.deep.equal({})
      })
    })

    it('should select domains where the rev matches but accessDate does not', () => {
      const localSites = {
        'example.com': {
          accessDate: 1519447920000,
          rev: '22222222'
        }
      }

      const remoteSites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '22222222'
        }
      }

      const stubs = setUpStubs(localSites, remoteSites)

      return syncService.getDomainsToSync(options).then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(toSync).to.deep.equal(localSites)
      })
    })

    it('should select domains where the rev does not match', () => {
      const localSites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '33333333'
        }
      }

      const remoteSites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '22222222'
        }
      }

      const stubs = setUpStubs(localSites, remoteSites)

      return syncService.getDomainsToSync(options).then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(toSync).to.deep.equal(localSites)
      })
    })

    it('should select any domains not on both client and server', () => {
      const localSites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '33333333'
        }
      }

      const remoteSites = {
        'google.com': {
          accessDate: 1516754869000,
          rev: '22222222'
        }
      }

      const stubs = setUpStubs(localSites, remoteSites)

      return syncService.getDomainsToSync(options).then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(toSync).to.deep.equal(Object.assign({ 'google.com': null }, localSites))
      })
    })

    it('should include deleted domains', () => {
      const localSites = {
        'example.com': {
          accessDate: 1516754869000,
          deleteDate: 1516754879000,
          rev: '33333333'
        }
      }

      const remoteSites = {
        'example.com': {
          accessDate: 1516754869000,
          deleteDate: null,
          rev: '22222222'
        }
      }

      const stubs = setUpStubs(localSites, remoteSites)

      return syncService.getDomainsToSync(options).then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(stubs.storageGetAll.getCalls()[0].args).to.deep.equal([true])
        expect(toSync).to.deep.equal(localSites)
      })
    })

    function setUpStubs (localSites, remoteSites) {
      const stubs = {
        storageGetAll: sandbox.stub(storage, 'getAll').returns(Promise.resolve(localSites)),
        syncDomains: sandbox.stub(syncService, 'syncDomains').returns(Promise.resolve(localSites))
      }

      $httpBackend.whenGET(`${options.serverUrl}/api/sites`).respond(remoteSites)
      setTimeout(() => $httpBackend.flush(), 0)

      return stubs
    }
  })

  describe('#syncDomains()', () => {
    const options = new ClientOptions({
      serverType: 'CUSTOM',
      customServerUrl: 'http://localhost'
    })

    it('should save changes from the server', () => {
      const localSites = {
        'example.com': {
          history: ['00000000'],
          accessDate: 1516754869000,
          createDate: 1516754869000,
          deleteDate: null,
          generation: 1,
          pwLength: 16,
          symbols: true,
          notes: '',
          rev: '11111111'
        }
      }

      const remoteSites = {
        'example.com': {
          history: ['00000000', '11111111'],
          accessDate: 1519447920000,
          createDate: 1516754869000,
          deleteDate: null,
          generation: 2,
          pwLength: 16,
          symbols: true,
          notes: '',
          rev: '22222222'
        }
      }

      const syncResult = {
        accepted: [],
        rejected: {},
        changed: remoteSites
      }

      const stubs = setUpStubs(syncResult)

      return syncService.syncDomains(options, localSites).then(results => {
        expect(stubs.storageHandleSyncResult.calledOnce).to.equal(true)

        const handleSyncResultArgs = stubs.storageHandleSyncResult.getCalls()[0].args
        expect(handleSyncResultArgs.length).to.equal(1)
        expect(handleSyncResultArgs[0]).to.have.property('data').that.deep.equals(syncResult)
        expect(handleSyncResultArgs[0]).to.have.property('timestamp').that.is.a('number')
        expect(handleSyncResultArgs[0]).to.have.property('serverUrl').that.equals(options.serverUrl)
        expect(stubs.resetRules.calledOnce).to.equal(true)
        expect(results).to.have.property('data').that.deep.equals(syncResult)
      })
    })

    function setUpStubs (response) {
      const stubs = {
        storageHandleSyncResult: sandbox.stub(storage, 'handleSyncResult').returns(Promise.resolve()),
        resetRules: sandbox.stub(rules, 'resetRules').returns(Promise.resolve())
      }

      $httpBackend.whenPATCH(`${options.serverUrl}/api/sites`).respond(response)
      setTimeout(() => $httpBackend.flush(), 0)

      return stubs
    }
  })

  describe('#syncNow()', () => {
    it('should do nothing when serverType is NONE', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions').returns(Promise.resolve({
        serverType: 'NONE'
      }))
      const getDomainsStub = sandbox.stub(syncService, 'getDomainsToSync').returns(Promise.resolve({}))
      const syncDomainsStub = sandbox.stub(syncService, 'syncDomains').returns(Promise.resolve({}))

      return syncService.syncNow().then(result => {
        expect(getOptionsStub.calledOnce).to.equal(true)
        expect(getDomainsStub.called).to.equal(false)
        expect(syncDomainsStub.called).to.equal(false)
        expect(result).to.deep.equal({})
      })
    })

    it('should call syncDomains with the results of getDomainsToSync', () => {
      const localSites = {
        'example.com': {
          accessDate: 1519447920000,
          rev: '22222222'
        }
      }
      const options = new ClientOptions({
        serverType: 'CUSTOM',
        customServerUrl: 'http://localhost'
      })

      const getOptionsStub = sandbox.stub(storage, 'getOptions').returns(Promise.resolve(options))
      const getDomainsStub = sandbox.stub(syncService, 'getDomainsToSync').returns(Promise.resolve(localSites))
      const syncDomainsStub = sandbox.stub(syncService, 'syncDomains')
        .returns(Promise.resolve({ data: localSites }))

      return syncService.syncNow().then(result => {
        expect(getOptionsStub.calledOnce).to.equal(true)
        expect(getDomainsStub.calledOnce).to.equal(true)
        expect(syncDomainsStub.calledOnce).to.equal(true)
        expect(syncDomainsStub.getCalls()[0].args).to.deep.equal([options, localSites])
        expect(result).to.deep.equal({ data: localSites })
      })
    })
  })

  describe('#requestSync()', () => {
    const options = new ClientOptions({
      serverType: 'CUSTOM',
      customServerUrl: 'http://localhost'
    })

    it('should run a new sync if there was not one recently', () => {
      const lastSyncResult = {
        data: {},
        serverUrl: options.serverUrl,
        timestamp: Date.now() - 90000
      }
      const nextSyncResult = {
        data: {},
        serverUrl: options.serverUrl,
        timestamp: Date.now()
      }
      const stubs = setUpStubs(lastSyncResult, nextSyncResult)

      return syncService.requestSync(options).then(syncResult => {
        expect(stubs.getLastSyncResult.calledOnce).to.equal(true)
        expect(stubs.syncNow.calledOnce).to.equal(true)
        expect(syncResult).to.equal(nextSyncResult)
      })
    })

    it('should return cached results if there was a sync recently', () => {
      const result = {
        data: {},
        serverUrl: options.serverUrl,
        timestamp: Date.now()
      }
      const stubs = setUpStubs(result, result)

      return syncService.requestSync(options).then(syncResult => {
        expect(stubs.getLastSyncResult.calledOnce).to.equal(true)
        expect(stubs.syncNow.called).to.equal(false)
        expect(syncResult).to.equal(result)
      })
    })

    it('should always run a new sync when the serverUrl has changed', () => {
      const lastSyncResult = {
        data: {},
        serverUrl: 'http://some-other-server.com',
        timestamp: Date.now() - 1000
      }
      const nextSyncResult = {
        data: {},
        serverUrl: options.serverUrl,
        timestamp: Date.now()
      }
      const stubs = setUpStubs(lastSyncResult, nextSyncResult)

      return syncService.requestSync(options).then(syncResult => {
        expect(stubs.getLastSyncResult.calledOnce).to.equal(true)
        expect(stubs.syncNow.calledOnce).to.equal(true)
        expect(syncResult).to.equal(nextSyncResult)
      })
    })

    function setUpStubs (lastSyncResult, nextSyncResult) {
      const stubs = {
        syncNow: sandbox.stub(syncService, 'syncNow').returns(Promise.resolve(nextSyncResult)),
        getLastSyncResult: sandbox.stub(syncService, 'getLastSyncResult').returns(Promise.resolve(lastSyncResult))
      }

      return stubs
    }
  })
})

// TODO: Test login and bearer token
// TODO: test error states/propagation

afterEach(() => sandbox.restore())
