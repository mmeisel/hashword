const storage = require('../../lib/storage')
const syncOptionsModalTemplate = require('./sync-options-modal.tmpl.html')

class SyncUiWrapperController {
  constructor ($scope, syncService, $uibModal) {
    this.scope = $scope
    this.syncService = syncService
    this.modal = $uibModal
    this.modalIsReady = false

    this.syncService.getLastSyncResult()
      .then(result => (this.syncResult = result))
      .then(() => this.scope.$apply())
  }

  $onInit () {
    storage.getOptions().then(options => this.updateOptions(options))
  }

  updateOptions (newOptions) {
    this.options = newOptions

    this.syncService.checkServerStatus(this.options)
      .then(serverStatus => {
        this.serverStatus = serverStatus

        if (serverStatus.status === this.syncService.ServerStatus.CONNECTED) {
          return this.syncService.requestSync(this.options)
            .then(result => {
              this.syncResult = result
              this.onSync({ result })
            })
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
}

module.exports = SyncUiWrapperController
