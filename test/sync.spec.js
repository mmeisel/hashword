/* eslint-env mocha */
/* global expect, hwStorage, inject, sinon */

const sandbox = sinon.createSandbox()

describe('syncService', () => {
  let $httpBackend
  let syncService

  beforeEach(module('sync'))

  beforeEach(inject($injector => {
    $httpBackend = $injector.get('$httpBackend')
    syncService = $injector.get('syncService')
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  it('should do nothing when useServer is false', () => {
    const getOptionsStub = sandbox.stub(hwStorage, 'getOptions').returns(Promise.resolve({
      useServer: false
    }))
    const getAllStub = sandbox.stub(hwStorage, 'getAll').returns(Promise.resolve({}))
    const setStub = sandbox.stub(hwStorage, 'set').returns(Promise.resolve())

    return syncService.sync().then(result => {
      expect(getOptionsStub.calledOnce).to.equal(true)
      expect(getAllStub.called).to.equal(false)
      expect(setStub.called).to.equal(false)
      expect(result).to.equal(false)
    })
  })

  it('should save changes from the server', () => {
    const localSites = {
      'example.com': {
        history: ['00000000'],
        id: undefined,
        userId: undefined,
        domain: undefined,
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
        id: undefined,
        userId: undefined,
        domain: undefined,
        accessDate: 1516754869000,
        createDate: 1516754869000,
        deleteDate: null,
        generation: 1,
        pwLength: 16,
        symbols: true,
        notes: '',
        rev: '22222222'
      }
    }

    const stubs = setUpStubs(localSites, remoteSites)

    $httpBackend.whenPATCH('http://localhost/sites').respond({
      accepted: [],
      rejected: {},
      changed: remoteSites
    })
    setTimeout(() => $httpBackend.flush(), 0)

    return syncService.sync().then(() => {
      expect(stubs.storageGetAll.calledOnce).to.equal(true)
      expect(stubs.storageGetOptions.calledOnce).to.equal(true)

      expect(stubs.storageSet.calledOnce).to.equal(true)
      expect(stubs.storageSet.getCalls()[0].args).to.deep.equal([remoteSites])
    })
  })

  it('should not send sites to the server when the rev and accessDate are the same', () => {
    const localSites = {
      'example.com': {
        history: ['00000000', '11111111'],
        id: undefined,
        userId: undefined,
        domain: undefined,
        accessDate: 1516754869000,
        createDate: 1516754869000,
        deleteDate: null,
        generation: 1,
        pwLength: 16,
        symbols: true,
        notes: '',
        rev: '22222222'
      }
    }

    const remoteSites = {
      'example.com': {
        history: ['00000000', '11111111'],
        id: undefined,
        userId: undefined,
        domain: undefined,
        accessDate: 1516754869000,
        createDate: 1516754869000,
        deleteDate: null,
        generation: 1,
        pwLength: 16,
        symbols: true,
        notes: '',
        rev: '22222222'
      }
    }

    const stubs = setUpStubs(localSites, remoteSites)

    return syncService.sync().then(result => {
      expect(result).to.equal(true)
      expect(stubs.storageSet.called).to.equal(false)
    })
  })

  function setUpStubs (localSites, remoteSites) {
    const stubs = {
      storageGetOptions: sandbox.stub(hwStorage, 'getOptions').returns(Promise.resolve({
        useServer: true,
        serverUrl: 'http://localhost'
      })),
      storageGetAll: sandbox.stub(hwStorage, 'getAll').returns(Promise.resolve(localSites)),
      storageSet: sandbox.stub(hwStorage, 'set').returns(Promise.resolve())
    }

    $httpBackend.whenGET('http://localhost/sites').respond(remoteSites)

    // A flush for the GET request -- the PATCH will need a second one
    setTimeout(() => $httpBackend.flush(), 0)

    return stubs
  }
})

afterEach(() => sandbox.restore())
