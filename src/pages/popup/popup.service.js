const angular = require('angular')
const hw = require('../../lib/hashword')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')

const PopupModes = {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  READY: 'READY',
  EDITING: 'EDITING'
}

class PopupService {
  constructor () {
    Object.assign(this, {
      tabId: null,
      mode: PopupModes.LOADING,
      error: null,
      domainInfo: null,
      allSettings: null,
      activeDomain: null,
      foundPasswordField: null,
      settings: null,
      PopupModes
    })

    this.initPromise = this.getActiveTab()
      .then(() => Promise.all([this.getSettings(), this.checkActive()]))
      .then(() => (this.mode = PopupModes.READY))
      .catch(this.setError.bind(this))
  }

  setError (err) {
    console.error(err.message)
    this.mode = PopupModes.ERROR
    this.error = typeof (err.message) === 'string' ? err.message : 'Something went wrong!'
  }

  getActiveTab () {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
          this.tabId = tabs[0].id
          this.domainInfo = hw.getDomainInfo(tabs[0].url)
          resolve()
        } else {
          reject(new Error('Hashword cannot be used on this page.'))
        }
      })
    })
  }

  getSettings () {
    const allDomains = [this.domainInfo.name]

    if (this.domainInfo.tld !== this.domainInfo.name) {
      allDomains.push(this.domainInfo.tld)
    }

    return storage.get(allDomains).then(items => {
      this.allSettings = {}
      allDomains.forEach(domain => {
        this.allSettings[domain] = new Settings(items[domain])
      })

      // Only use the full hostname as the key if there are already settings for it,
      // otherwise fall back to the effective TLD. In other words, the effective TLD
      // is the default unless the user specifically selects the full hostname
      // (or did so in the past).
      this.changeDomain(items[this.domainInfo.name] ? this.domainInfo.name : this.domainInfo.tld)
    })
  }

  checkActive () {
    return new Promise(resolve => {
      // Ask the page to tell us if there's a password field focused on it or not
      chrome.tabs.executeScript(this.tabId,
        {
          file: 'inject/check-active.js',
          allFrames: true
        },
        results => {
          if (!chrome.runtime.lastError && results) {
            this.foundPasswordField = results.reduce((prev, cur) => prev || cur)
          } else {
            this.foundPasswordField = false
          }
          resolve()
        })
    })
  }

  hasSubdomain () {
    return this.domainInfo && this.domainInfo.tld !== this.domainInfo.name &&
            ('www.' + this.domainInfo.tld) !== this.domainInfo.name
  }

  changeDomain (newDomain) {
    this.activeDomain = newDomain
    this.settings = this.allSettings[newDomain]
  }

  showSettings () {
    this.mode = PopupModes.EDITING
  }

  hideSettings () {
    this.mode = PopupModes.READY
  }

  // Save settings, sets createDate for new domains.
  saveSettings (newSettings) {
    if (newSettings != null) {
      const newSettingsCopy = angular.copy(newSettings)

      this.allSettings[this.activeDomain] = newSettingsCopy
      this.settings = newSettingsCopy
    }

    const isNewDomain = this.settings.createDate == null

    console.log(this.settings, isNewDomain)

    if (isNewDomain) {
      this.settings.setCreateDate()
    }
    this.settings.saveRevision()

    return storage.setOne(this.activeDomain, this.settings).then(() => {
      // TODO: handle errors
      // If it's a new domain, reset the rules for which icon to show
      if (isNewDomain) {
        rules.resetRules()
      }
    })
  }

  updateAccessDate () {
    this.settings.setAccessDate()
    this.saveSettings()
  }
}

module.exports = PopupService
