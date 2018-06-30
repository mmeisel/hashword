const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')
const resolveConflictsModalTemplate = require('./resolve-conflicts-modal.tmpl.html')
const syncOptionsModalTemplate = require('./sync-options-modal.tmpl.html')

class SyncUiWrapperController {
  constructor ($scope, syncService, $uibModal) {
    this.scope = $scope
    this.syncService = syncService
    this.modal = $uibModal
    this.modalIsReady = false
    this.selectLocal = []
    this.selectRemote = []
    this.settingParams = [
      { key: 'pwLength', name: 'Password Length' },
      { key: 'symbols', name: 'Use Symbols' },
      { key: 'generation', name: 'Generation' },
      { key: 'notes', name: 'Notes' }
    ]

    this.syncService.getLastSyncResult()
      .then(result => (this.syncResult = result))
      .then(() => this.scope.$apply())
  }

  $onInit () {
    storage.getOptions().then(options => this.updateOptions(options))
  }

  handleSyncResult (result) {
    this.syncResult = result
    this.onSync({ result })
  }

  updateOptions (newOptions) {
    this.options = newOptions

    this.syncService.checkServerStatus(this.options)
      .then(serverStatus => {
        this.serverStatus = serverStatus

        if (serverStatus.status === this.syncService.ServerStatus.CONNECTED) {
          return this.syncService.requestSync(this.options)
            .then(this.handleSyncResult.bind(this))
        }
        return Promise.resolve()
      })
      .then(() => this.scope.$apply())
  }

  openSyncOptions () {
    const modal = this.modal.open({
      size: 'md',
      backdrop: 'static',
      scope: this.scope,
      template: syncOptionsModalTemplate
    })

    modal.result
      .then(() => storage.setOptions(this.newOptions))
      .then(() => this.updateOptions(this.newOptions))
  }

  handleNewOptionsChange (newOptions) {
    this.newOptions = newOptions
    this.modalIsReady = !!newOptions
  }

  resolveConflicts () {
    this.conflicts = this.getConflicts()
    this.conflictPage = 0

    const modal = this.modal.open({
      size: 'md',
      backdrop: 'static',
      scope: this.scope,
      template: resolveConflictsModalTemplate
    })

    modal.result
      .then(() => {
        const changes = this.conflicts.reduce((result, site) => {
          if (site.choice != null) {
            result[site.domain] = site.choice
          }
          return result
        }, {})
        storage.set(changes)
      })
      .then(() => this.syncService.syncNow(this.options))
      .then(this.handleSyncResult.bind(this))
  }

  getConflicts () {
    if (!this.syncResult || !this.syncResult.data.rejected || !Object.keys(this.syncResult.data.rejected).length) {
      return []
    }

    return Object.keys(this.syncResult.data.rejected).map(domain => {
      const localSite = this.allSites.find(site => site.domain === domain)

      return {
        domain,
        local: localSite ? localSite.settings : null,
        remote: this.syncResult.data.rejected[domain]
      }
    })
  }

  currentLocal () {
    return this.conflicts[this.conflictPage].local
  }

  currentRemote () {
    return this.conflicts[this.conflictPage].remote
  }

  currentDomain () {
    return this.conflicts[this.conflictPage].domain
  }

  hasSettingChanged (settingKey) {
    // Return false if either one is deleted since we won't actually show the diff in that case
    return this.currentLocal().deleteDate == null && this.currentRemote().deleteDate == null &&
      this.currentLocal()[settingKey] !== this.currentRemote[settingKey]
  }

  chooseLocal () {
    this.selectLocal[this.conflictPage] = true
    this.selectRemote[this.conflictPage] = false

    // For the local, we need to use the server's rev and history with a new revision added so that it
    // knows the conflict is resolved
    const newSettings = new Settings(this.currentLocal())

    newSettings.rev = this.currentRemote().rev
    newSettings.history = this.currentRemote().history
    newSettings.saveRevision()
    this.conflicts[this.conflictPage].choice = newSettings
  }

  chooseRemote () {
    this.selectLocal[this.conflictPage] = false
    this.selectRemote[this.conflictPage] = true
    // For the remote, we can just accept their version
    this.conflicts[this.conflictPage].choice = this.currentRemote()
  }
}

module.exports = SyncUiWrapperController
