const storage = require('../../lib/storage')
const syncOptionsModalTemplate = require('./sync-options-modal.tmpl.html')

class SyncUiWrapperController {
  constructor ($scope, syncService, $uibModal) {
    this.scope = $scope
    this.syncService = syncService
    this.modal = $uibModal
    this.modalIsReady = false
  }

  $onInit () {
    storage.getOptions().then(options => this.updateOptions(options))
  }

  updateOptions (newOptions) {
    this.options = newOptions
    this.updateServerStatus()
  }

  updateServerStatus () {
    this.syncService.checkStatus(this.options)
      .then(serverStatus => (this.serverStatus = serverStatus))
      .catch(error => console.error('Could not update sync status', error.message))
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
