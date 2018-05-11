const angular = require('angular')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')
const sync = require('../../lib/sync.module')

const BACKGROUND_SYNC_ALARM_NAME = 'BACKGROUND_SYNC'
const BACKGROUND_SYNC_INTERVAL_MINUTES = 30

class BackgroundService {
  constructor (syncService) {
    this.syncService = syncService
  }

  upgradeData (items) {
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

      // Add revision data for sync. This is done automatically by the Settings constructor.
      // This will also normalize the revisable fields.
      if (settings.rev == null) {
        Object.assign(settings, new Settings(settings))
        upgraded = true
      }

      return upgraded
    })

    storage.set(items)
      .catch(error => console.error(error))
  }

  onInstalled (details) {
    if (details.reason === 'update') {
      console.info('Upgrade detected, checking data format...')

      // Upgrade stored data to a new format when a new version is installed.
      // Delay installing the rules until the data is upgraded in case the new rules code relies
      // on the new format.
      storage.getAll(true)
        .then(items => {
          this.upgradeData(items)
          console.info('Data upgraded, adding declarativeContent rules')
          rules.resetRules()
        })
        .catch(error => console.error(error))
    } else {
      console.info('Adding declarativeContent rules for new install')
      rules.resetRules()
    }
  }

  onStartup () {
    // Sometimes chrome doesn't seem to load these on startup as the documentation claims
    rules.resetRules()
    this.syncService.syncNow()
  }

  onMessage (message) {
    if (message.type === storage.SETTINGS_UPDATED_MESSAGE_TYPE) {
      this.onSettingsUpdated(message.payload)
    }
  }

  onAlarm (alarm) {
    if (alarm.name === BACKGROUND_SYNC_ALARM_NAME) {
      console.info('Requesting background sync')
      this.syncService.requestSync()
      chrome.alarms.create(BACKGROUND_SYNC_ALARM_NAME, { delayInMinutes: BACKGROUND_SYNC_INTERVAL_MINUTES })
    }
  }

  onSettingsUpdated (updated) {
    console.info('Settings updated, syncing')
    this.syncService.syncNow()
  }

  init () {
    chrome.runtime.onInstalled.addListener(this.onInstalled.bind(this))
    chrome.runtime.onStartup.addListener(this.onStartup.bind(this))
    chrome.runtime.onMessage.addListener(this.onMessage.bind(this))
    chrome.alarms.onAlarm.addListener(this.onAlarm.bind(this))
    chrome.alarms.create(BACKGROUND_SYNC_ALARM_NAME, { delayInMinutes: BACKGROUND_SYNC_INTERVAL_MINUTES })
  }
}

angular.module('background', [sync])
.run(['backgroundService', backgroundService => backgroundService.init()])
.service('backgroundService', ['syncService', BackgroundService])
