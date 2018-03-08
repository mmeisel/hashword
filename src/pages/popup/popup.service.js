const angular = require('angular')
const hw = require('../../lib/hashword')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')

function popupService ($timeout, PopupModes) {
  const svc = this

  angular.extend(svc, {
    tabId: null,
    mode: PopupModes.LOADING,
    error: null,
    domainInfo: null,
    allSettings: null,
    activeDomain: null,
    foundPasswordField: null,
    settings: null,
    hasSubdomain,
    changeDomain,
    showSettings,
    hideSettings,
    saveSettings,
    updateAccessDate
  })

  svc.initPromise = getActiveTab()
    .then(() => Promise.all([getSettings(), checkActive()]))
    .then(() => (svc.mode = PopupModes.READY))
    .catch(setError)

  function setError (err) {
    console.error(err.message)
    svc.mode = PopupModes.ERROR
    svc.error = typeof (err.message) === 'string' ? err.message : 'Something went wrong!'
  }

  function getActiveTab () {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
          svc.tabId = tabs[0].id
          svc.domainInfo = hw.getDomainInfo(tabs[0].url)
          resolve()
        } else {
          reject(new Error('Hashword cannot be used on this page.'))
        }
      })
    })
  }

  function getSettings () {
    const allDomains = [svc.domainInfo.name]

    if (svc.domainInfo.tld !== svc.domainInfo.name) {
      allDomains.push(svc.domainInfo.tld)
    }

    return storage.get(allDomains).then(items => {
      svc.allSettings = {}
      allDomains.forEach(domain => {
        svc.allSettings[domain] = new Settings(items[domain])
      })

      // Only use the full hostname as the key if there are already settings for it,
      // otherwise fall back to the effective TLD. In other words, the effective TLD
      // is the default unless the user specifically selects the full hostname
      // (or did so in the past).
      changeDomain(items[svc.domainInfo.name] ? svc.domainInfo.name : svc.domainInfo.tld)
    })
  }

  function checkActive () {
    return new Promise(resolve => {
      // Ask the page to tell us if there's a password field focused on it or not
      chrome.tabs.executeScript(svc.tabId,
        {
          file: 'inject/check-active.js',
          allFrames: true
        },
        results => {
          if (!chrome.runtime.lastError && results) {
            svc.foundPasswordField = results.reduce((prev, cur) => prev || cur)
          } else {
            svc.foundPasswordField = false
          }
          resolve()
        })
    })
  }

  function hasSubdomain () {
    return svc.domainInfo && svc.domainInfo.tld !== svc.domainInfo.name &&
            ('www.' + svc.domainInfo.tld) !== svc.domainInfo.name
  }

  function changeDomain (newDomain) {
    svc.activeDomain = newDomain
    svc.settings = svc.allSettings[newDomain]
  }

  function showSettings () {
    svc.mode = PopupModes.EDITING
  }

  function hideSettings () {
    svc.mode = PopupModes.READY
  }

    // Save settings, sets createDate for new domains.
  function saveSettings (newSettings) {
    if (newSettings != null) {
      const newSettingsCopy = angular.copy(newSettings)

      svc.allSettings[svc.activeDomain] = newSettingsCopy
      svc.settings = newSettingsCopy
    }

    const isNewDomain = svc.settings.createDate == null

    if (isNewDomain) {
      svc.settings.setCreateDate()
    }
    svc.settings.saveRevision()

    return storage.setOne(svc.activeDomain, svc.settings).then(() => {
      // TODO: handle errors
      // If it's a new domain, reset the rules for which icon to show
      if (isNewDomain) {
        rules.resetRules()
      }
    })
  }

  function updateAccessDate () {
    svc.settings.setAccessDate()
    saveSettings()
  }
}

module.exports = popupService