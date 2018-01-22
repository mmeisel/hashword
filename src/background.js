/* global hw, hwRules, hwStorage */

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'update') {
    console.info('Upgrade detected, checking data format...')

    // Upgrade stored data to a new format when a new version is installed.
    // Delay installing the rules until the data is upgraded in case the new rules code relies
    // on the new format.
    hwStorage.getAll(true)
      .catch(error => console.error(error))
      .then(items => {
        upgradeData(items)
        console.info('Data upgraded, adding declarativeContent rules')
        hwRules.resetRules()
      })
  } else {
    console.info('Adding declarativeContent rules for new install')
    hwRules.resetRules()
  }

  function upgradeData (items) {
    Object.keys(items).filter(domain => {
      let settings = items[domain]
      let upgraded = false

      // For data from previous versions that doesn't have the create/access dates.
      // We'll use 0 as a special value to indicate that the date is not known. This will
      // allow us to know that these sites already have hashwords created for them, as
      // well as show a special string in the options page for such cases.
      if (settings.createDate == null) {
        settings.createDate = 0
        settings.accessDate = 0
        upgraded = true
      }

      // At some point, some password lengths got written as strings. These should always be
      // numbers. Fix this.
      if (settings.pwLength !== +settings.pwLength) {
        settings.pwLength = +settings.pwLength
        upgraded = true
      }

      // Add revision data for sync. This is done automatically by the hw.Settings constructor.
      // This will also normalize the revisable fields.
      if (settings.rev == null) {
        Object.assign(settings, new hw.Settings(settings))
        upgraded = true
      }

      return upgraded
    })

    hwStorage.set(items)
      .catch(error => console.error(error))
  }
})

// Just in case
chrome.runtime.onStartup.addListener(hwRules.resetRules)
