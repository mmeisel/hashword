/* eslint-env mocha */
/* global expect, inject, hw, hwRules, hwStorage, sinon */

const sandbox = sinon.createSandbox()

describe('popup', () => {
  const invalidProtocols = ['file', 'chrome']
  const validProtocols = ['http', 'https']

  beforeEach(module('popup'))

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

  validProtocols.forEach(protocol => {
    describe(`on a new ${protocol} site`, () => {
      let popupService

      beforeEach(() => {
        // For getActiveTab()
        chrome.tabs.query.yields([{ id: 1, url: `${protocol}://example.com` }])
        // For getSettings()
        sandbox.stub(hwStorage, 'get').returns(Promise.resolve({}))
        // For checkActive()
        chrome.tabs.executeScript.yields(null)
      })

      beforeEach(inject(_popupService_ => (popupService = _popupService_)))

      it('should initialize correctly', () => {
        expect(popupService.mode).to.equal('LOADING')

        return popupService.initPromise.then(() => {
          expect(popupService.tabId).to.equal(1)
          expect(popupService.domainInfo).to.deep.equal({ name: 'example.com', tld: 'example.com' })
          expect(popupService.mode).to.equal('READY')
          expect(popupService.foundPasswordField).to.equal(false)
          expect(popupService.activeDomain).to.equal('example.com')
          expect(popupService.hasSubdomain()).to.equal(false)
        })
      })

      it('should save with default settings and reset rules', () => {
        const setOneStub = sandbox.stub(hwStorage, 'setOne').returns(Promise.resolve())
        const resetRulesStub = sandbox.stub(hwRules, 'resetRules')
        const expectedSettings = new hw.Settings()

        expectedSettings.saveRevision()

        return popupService.initPromise
          .then(() => popupService.saveSettings())
          .then(() => {
            expect(resetRulesStub.calledOnce).to.equal(true)
            expect(setOneStub.calledOnce).to.equal(true)

            const setOneArgs = setOneStub.getCalls()[0].args
            // Check the create date, then steal it from the object for comparison. Calling
            // expectedSettings.setCreateDate() would use the current time, which wouldn't match.
            expect(setOneArgs[1].createDate).to.be.a('number').that.is.closeTo(new Date().getTime(), 60000)
            expectedSettings.createDate = setOneArgs[1].createDate
            expect(setOneArgs).to.deep.equal(['example.com', expectedSettings])
          })
      })
    })
  })
})

afterEach(() => sandbox.restore())
