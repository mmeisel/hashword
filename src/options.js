const angular = require('angular')
const storage = require('./common/storage')
const sync = require('./common/sync')

angular.module('options', [sync])

.component('optionsForm', {
  controller: 'OptionsFormController',
  templateUrl: 'options-form.html'
})

.controller('OptionsFormController', [
  '$scope', 'syncService',
  function ($scope, syncService) {
    this.options = {}

    storage.getOptions().then(options => {
      console.log(options)
      this.options = options || { useServer: false }
      $scope.$apply()
    })
    .catch(err => console.log(err))
    // TODO: handle errors

    this.saveOptions = function () {
      storage.setOptions(this.options)
      // TODO: Indicate successful save to user
      .then(() => {
        console.log(this.options, 'saved')
        // TODO: enable periodic sync
      })
      .catch(err => console.log(err))
      // TODO: handle errors
    }

    this.sync = function () {
      syncService.sync()
      // TODO: make user wait
    }
  }
])
