/* global hwStorage */

angular.module('options', [])

.component('optionsForm', {
  controller: 'OptionsFormController',
  templateUrl: 'options-form.html'
})

.controller('OptionsFormController', [
  '$scope', 'syncService',
  function ($scope, syncService) {
    this.options = {}

    hwStorage.getOptions().then(options => {
      console.log(options)
      this.options = options || { useServer: false }
      $scope.$apply()
    })
    .catch(err => console.log(err))
    // TODO: handle errors

    this.saveOptions = function () {
      hwStorage.setOptions(this.options)
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
