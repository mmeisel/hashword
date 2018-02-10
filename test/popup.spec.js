/* eslint-env mocha */
/* global expect, inject, hw, hwRules, hwStorage, sinon */

const sandbox = sinon.createSandbox()

describe('popup', () => {
  beforeEach(module('popup'))

  const invalidProtocols = ['file', 'chrome']

  invalidProtocols.forEach(protocol => {
    describe(`on a ${protocol} tab`, () => {
      let popupService

      beforeEach(() => {
        // For getActiveTab()
        chrome.tabs.query.yields([{ id: 1, url: `${protocol}://ignore-me` }])
        // For getSettings() (shouldn't be used)
        sandbox.stub(hwStorage, 'get').returns(Promise.resolve({}))
        // For checkActive() (shouldn't be used)
        chrome.tabs.executeScript.yields(null)
      })

      beforeEach(inject(_popupService_ => (popupService = _popupService_)))

      it('should enter the ERROR state', () => {
        expect(popupService.mode).to.equal('LOADING')

        return popupService.initPromise.then(() => {
          expect(popupService.mode).to.equal('ERROR')
          expect(popupService.error).to.contain('cannot be used')
        })
      })
    })
  })

  const validNoSubdomain = [
    { protocol: 'http', domain: 'example.com', normalized: 'example.com', isNewDomain: true },
    { protocol: 'https', domain: 'example.com', normalized: 'example.com', isNewDomain: true },
    { protocol: 'https', domain: 'example.com', normalized: 'example.com', isNewDomain: false },
    { protocol: 'http', domain: 'www.independent.co.uk', normalized: 'independent.co.uk', isNewDomain: false }
  ]

  validNoSubdomain.forEach(data => {
    const newDescriptor = data.isNewDomain ? 'new' : 'existing'
    const resetRulesDescriptor = data.isNewDomain ? '' : 'not '
    const expectedSettings = new hw.Settings(data.isNewDomain ? {} : {
      symbols: false,
      generation: 2,
      createDate: new Date().getTime()
    })
    const storageResponse = {}

    expectedSettings.saveRevision()

    if (!data.isNewDomain) {
      storageResponse[data.normalized] = expectedSettings
    }

    describe(`on ${data.protocol}://${data.domain} (${newDescriptor}, no subdomain)`, () => {
      let popupService

      beforeEach(() => {
        // For getActiveTab()
        chrome.tabs.query.yields([{ id: 1, url: `${data.protocol}://${data.domain}` }])
        // For getSettings()
        sandbox.stub(hwStorage, 'get').returns(Promise.resolve(storageResponse))
        // For checkActive()
        chrome.tabs.executeScript.yields(null)
      })

      beforeEach(inject(_popupService_ => (popupService = _popupService_)))

      it('should initialize correctly', () => {
        expect(popupService.mode).to.equal('LOADING')

        return popupService.initPromise.then(() => {
          expect(popupService.hasSubdomain()).to.equal(false)
          expect(popupService).to.deep.include({
            tabId: 1,
            domainInfo: { name: data.domain, tld: data.normalized },
            mode: 'READY',
            foundPasswordField: false,
            activeDomain: data.normalized
          })
        })
      })

      it(`should save with expected settings and ${resetRulesDescriptor}reset rules`, () => {
        const setOneStub = sandbox.stub(hwStorage, 'setOne').returns(Promise.resolve())
        const resetRulesStub = sandbox.stub(hwRules, 'resetRules')

        return popupService.initPromise
          .then(() => popupService.saveSettings())
          .then(() => {
            expect(resetRulesStub.callCount).to.equal(data.isNewDomain ? 1 : 0)
            expect(setOneStub.callCount).to.equal(1)

            const setOneArgs = setOneStub.getCalls()[0].args

            if (data.isNewDomain) {
              // Check the create date, then steal it from the object for comparison. Calling
              // expectedSettings.setCreateDate() would use the current time, which wouldn't match.
              // createDate should also not affect the rev.
              expect(setOneArgs[1].createDate).to.be.a('number').that.is.closeTo(new Date().getTime(), 60000)
              expectedSettings.createDate = setOneArgs[1].createDate
            }
            expect(setOneArgs).to.deep.equal([data.normalized, expectedSettings])
          })
      })
    })
  })

  describe('on https://sub.example.com (new, subdomain)', () => {
    let popupService

    beforeEach(() => {
      // For getActiveTab()
      chrome.tabs.query.yields([{ id: 1, url: 'https://sub.example.com' }])
      // For getSettings()
      sandbox.stub(hwStorage, 'get').returns(Promise.resolve({}))
      // For checkActive()
      chrome.tabs.executeScript.yields(null)
    })

    beforeEach(inject(_popupService_ => (popupService = _popupService_)))

    it('should initialize with the TLD', () => {
      expect(popupService.mode).to.equal('LOADING')

      return popupService.initPromise.then(() => {
        expect(popupService.hasSubdomain()).to.equal(true)
        expect(popupService).to.deep.include({
          tabId: 1,
          domainInfo: { name: 'sub.example.com', tld: 'example.com' },
          mode: 'READY',
          foundPasswordField: false,
          activeDomain: 'example.com'
        })
      })
    })

    it('should change to the subdomain when changeDomain() is called', () => {
      return popupService.initPromise.then(() => {
        popupService.changeDomain('sub.example.com')

        expect(popupService.activeDomain).to.equal('sub.example.com')
        expect(popupService.settings).to.equal(popupService.allSettings['sub.example.com'])
      })
    })
  })

  describe('on https://sub.example.com (only subdomain has settings)', () => {
    const expectedSettings = new hw.Settings({
      symbols: false,
      generation: 2,
      createDate: new Date().getTime()
    })

    let popupService

    beforeEach(() => {
      // For getActiveTab()
      chrome.tabs.query.yields([{ id: 1, url: 'https://sub.example.com' }])
      // For getSettings()
      sandbox.stub(hwStorage, 'get').returns(Promise.resolve({ 'sub.example.com': expectedSettings }))
      // For checkActive()
      chrome.tabs.executeScript.yields(null)
    })

    beforeEach(inject(_popupService_ => (popupService = _popupService_)))

    it('should initialize with the subdomain', () => {
      expect(popupService.mode).to.equal('LOADING')

      return popupService.initPromise.then(() => {
        expect(popupService.hasSubdomain()).to.equal(true)
        expect(popupService).to.deep.include({
          tabId: 1,
          domainInfo: { name: 'sub.example.com', tld: 'example.com' },
          mode: 'READY',
          foundPasswordField: false,
          activeDomain: 'sub.example.com',
          settings: expectedSettings
        })
      })
    })

    it('should change to the tld', () => {
      return popupService.initPromise.then(() => {
        popupService.changeDomain('example.com')

        expect(popupService.activeDomain).to.equal('example.com')
        expect(popupService.settings).to.equal(popupService.allSettings['example.com'])
      })
    })
  })

  describe('on https://sub.example.com (both subdomain and tld have settings)', () => {
    const expectedSubSettings = new hw.Settings({
      symbols: false,
      generation: 3,
      createDate: new Date().getTime()
    })

    const expectedTldSettings = new hw.Settings({
      generation: 2,
      createDate: new Date().getTime()
    })

    let popupService

    beforeEach(() => {
      // For getActiveTab()
      chrome.tabs.query.yields([{ id: 1, url: 'https://sub.example.com' }])
      // For getSettings()
      sandbox.stub(hwStorage, 'get').returns(Promise.resolve({
        'example.com': expectedTldSettings,
        'sub.example.com': expectedSubSettings
      }))
      // For checkActive()
      chrome.tabs.executeScript.yields(null)
    })

    beforeEach(inject(_popupService_ => (popupService = _popupService_)))

    it('should initialize with the subdomain', () => {
      expect(popupService.mode).to.equal('LOADING')

      return popupService.initPromise.then(() => {
        expect(popupService.hasSubdomain()).to.equal(true)
        expect(popupService).to.deep.include({
          tabId: 1,
          domainInfo: { name: 'sub.example.com', tld: 'example.com' },
          mode: 'READY',
          foundPasswordField: false,
          activeDomain: 'sub.example.com',
          settings: expectedSubSettings
        })
      })
    })

    it('should change to the tld and restore saved settings', () => {
      return popupService.initPromise.then(() => {
        popupService.changeDomain('example.com')

        expect(popupService.activeDomain).to.equal('example.com')
        expect(popupService.settings).to.deep.equal(expectedTldSettings)
      })
    })

    it('should save the active domain with current settings', () => {
      const setOneStub = sandbox.stub(hwStorage, 'setOne').returns(Promise.resolve())

      return popupService.initPromise
        .then(() => popupService.saveSettings())
        .then(() => {
          expect(setOneStub.callCount).to.equal(1)

          expect(setOneStub.getCalls()[0].args).to.deep.equal(['sub.example.com', expectedSubSettings])
        })
    })

    it('should save the active domain with provided settings', () => {
      const setOneStub = sandbox.stub(hwStorage, 'setOne').returns(Promise.resolve())

      return popupService.initPromise
        .then(() => popupService.saveSettings(expectedTldSettings))
        .then(() => {
          expect(setOneStub.callCount).to.equal(1)

          expect(setOneStub.getCalls()[0].args).to.deep.equal(['sub.example.com', expectedTldSettings])
        })
    })
  })
})

afterEach(() => sandbox.restore())
