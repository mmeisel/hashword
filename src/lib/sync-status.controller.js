const storage = require('./storage')

class SyncStatusController {
  constructor ($scope, syncService) {
    Object.assign(this, {
      scope: $scope,
      syncService,
      syncStatus: null
    })
  }

  $onInit () {
    this.checkStatus()
  }

  $onChanges (changes) {
    if (changes.options) {
      this.checkStatus()
    }
  }

  checkStatus () {
    // options may have been provided through bindings.
    const optionsPromise = this.providedOptions ? Promise.resolve(this.providedOptions) : storage.getOptions()

    optionsPromise.then(options => {
      this.options = options

      if (options == null) {
        // In case we haven't been properly initialized
        return Promise.resolve(null)
      }

      return this.syncService.checkStatus(options).then(result => {
        this.syncStatus = result
        this.scope.$apply()
      })
    })
    .catch(error => {
      this.error = error.message
      this.scope.$apply()
    })
  }
}

module.exports = SyncStatusController
