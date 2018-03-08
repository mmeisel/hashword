/* eslint-env mocha */
/* global expect, inject, sinon */

const angular = require('angular')

require('angular-mocks')

const rules = require('../lib/rules')
const storage = require('../lib/storage')
const sync = require('../lib/sync.module')

const sandbox = sinon.createSandbox()

describe('syncService', () => {
  let $httpBackend
  let syncService

  beforeEach(angular.mock.module(sync))

  beforeEach(inject($injector => {
    $httpBackend = $injector.get('$httpBackend')
    syncService = $injector.get('syncService')
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  describe('#getDomainsToSync()', () => {
    it('should not select domains where the rev and accessDate match the server', () => {
      const sites = {
        'example.com': {
          accessDate: 1516754869000,
          rev: '22222222'
        }
      }

      const stubs = setUpStubs(sites, sites)

      return syncService.getDomainsToSync('http://localhost').then(toSync => {
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

      return syncService.getDomainsToSync('http://localhost').then(toSync => {
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

      return syncService.getDomainsToSync('http://localhost').then(toSync => {
        expect(stubs.storageGetAll.calledOnce).to.equal(true)
        expect(toSync).to.deep.equal(localSites)
      })
    })

    function setUpStubs (localSites, remoteSites) {
      const stubs = {
        storageGetAll: sandbox.stub(storage, 'getAll').returns(Promise.resolve(localSites)),
        syncDomains: sandbox.stub(syncService, 'syncDomains').returns(Promise.resolve(localSites))
      }

      $httpBackend.whenGET('http://localhost/sites').respond(remoteSites)
      setTimeout(() => $httpBackend.flush(), 0)

      return stubs
    }
  })

  describe('#syncDomains()', () => {
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

      const stubs = setUpStubs(localSites, remoteSites, {
        accepted: [],
        rejected: {},
        changed: remoteSites
      })

      return syncService.syncDomains('http://localhost', localSites).then(results => {
        expect(stubs.storageSet.calledOnce).to.equal(true)
        expect(stubs.storageSet.getCalls()[0].args).to.deep.equal([remoteSites])
        expect(stubs.resetRules.calledOnce).to.equal(true)
        expect(results).to.deep.equal(localSites)
      })
    })

    function setUpStubs (localSites, remoteSites, response) {
      const stubs = {
        storageSet: sandbox.stub(storage, 'set').returns(Promise.resolve()),
        resetRules: sandbox.stub(rules, 'resetRules').returns(Promise.resolve())
      }

      $httpBackend.whenPATCH('http://localhost/sites').respond(response)
      setTimeout(() => $httpBackend.flush(), 0)

      return stubs
    }
  })

  describe('#sync()', () => {
    it('should do nothing when useServer is false', () => {
      const getOptionsStub = sandbox.stub(storage, 'getOptions').returns(Promise.resolve({
        useServer: false
      }))
      const getDomainsStub = sandbox.stub(syncService, 'getDomainsToSync').returns(Promise.resolve({}))
      const syncDomainsStub = sandbox.stub(syncService, 'syncDomains').returns(Promise.resolve({}))

      return syncService.sync().then(result => {
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

      const getOptionsStub = sandbox.stub(storage, 'getOptions').returns(Promise.resolve({
        useServer: true,
        serverUrl: 'http://localhost'
      }))
      const getDomainsStub = sandbox.stub(syncService, 'getDomainsToSync').returns(Promise.resolve(localSites))
      const syncDomainsStub = sandbox.stub(syncService, 'syncDomains').returns(Promise.resolve(localSites))

      return syncService.sync().then(result => {
        expect(getOptionsStub.calledOnce).to.equal(true)
        expect(getDomainsStub.calledOnce).to.equal(true)
        expect(syncDomainsStub.calledOnce).to.equal(true)
        expect(syncDomainsStub.getCalls()[0].args).to.deep.equal(['http://localhost', localSites])
        expect(result).to.deep.equal(localSites)
      })
    })
  })
})

// TODO: test error states/propagation

afterEach(() => sandbox.restore())
