const angular = require('angular')
const ClientOptions = require('./client-options')
const storage = require('./storage')
const sync = require('./sync.module')
const syncStatusTemplate = require('./sync-status.tmpl.html')

angular.module('sync-ui', [sync])

.component('syncStatus', {
  controller: ['$scope', 'syncService', syncStatusController],
  template: syncStatusTemplate
})

.component('syncOptions', {
  controller: ['$scope', 'syncService', syncOptionsController]
})

function syncStatusController ($scope, syncService) {
  this.options = null
  this.status = null
  this.user = null
  this.editing = false

  $scope.SyncStatus = syncService.SyncStatus

  storage.getOptions().then(options => {
    this.options = options
    $scope.form = { serverType: options.serverType }

    return syncService.checkStatus().then(result => {
      this.status = result.status
      this.user = result.user
    })
  })
  .then(() => $scope.$apply())
  .catch(error => {
    $scope.form.error = error.message
    $scope.$apply()
  })
}

function syncOptionsController ($scope, syncService) {
  this.resetForm = () => {
    $scope.form = { serverType: this.options.serverType }
    this.editing = false
  }

  this.save = () => {
    const newOptions = new ClientOptions(Object.assign({}, this.options, $scope.form))

    $scope.form.working = true

    if (newOptions.serverType !== ClientOptions.ServerType.NONE) {
      return syncService.login(newOptions.serverUrl).then(token => {
        newOptions.accessToken = token

        return syncService.checkServerStatus(newOptions).then(result => {
          this.status = result.status
          this.user = result.user
          return this.saveOptions(newOptions).then(() => $scope.$apply())
        })
      })
      .catch(error => {
        Object.assign($scope.form, {
          error: error.message,
          working: false
        })
        $scope.$apply()
      })
    } else {
      return this.saveOptions(newOptions).then(() => $scope.$apply())
    }
  }

  this.saveOptions = newOptions => {
    return storage.setOptions(newOptions).then(() => {
      this.options = newOptions
      this.resetForm()
    })
  }
}

module.exports = 'sync-ui'
