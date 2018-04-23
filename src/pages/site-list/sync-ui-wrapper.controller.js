const storage = require('../../lib/storage')
const syncOptionsModalTemplate = require('./sync-options-modal.tmpl.html')

class SyncUiWrapperController {
  constructor ($scope, $uibModal) {
    this.scope = $scope
    this.modal = $uibModal
    this.ready = false

    storage.getOptions().then(options => {
      this.options = options
      this.scope.$apply()
    })
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
      .then(() => {
        console.log(this, this.newOptions)
        this.options = this.newOptions
        // this.scope.$apply()
      })
  }

  handleOptionsChange (newOptions) {
    this.newOptions = newOptions
    this.ready = !!newOptions
  }
}

module.exports = SyncUiWrapperController
