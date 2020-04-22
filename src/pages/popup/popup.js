const angular = require('angular')
const clipboard = require('../../lib/clipboard.module')
const filters = require('../../lib/filters')
const settingsEditor = require('../../lib/settings-editor.module')
const popupService = require('./popup.service')
const popupFormTemplate = require('./popup-form.tmpl.html')
const PopupPasswordFormController = require('./popup-password-form.controller')
const popupPasswordFormTemplate = require('./popup-password-form.tmpl.html')
const popupSettingsFormTemplate = require('./popup-settings-form.tmpl.html')

angular.module('popup', [clipboard, filters, settingsEditor])

  .service('popupService', popupService)

  .component('popupForm', {
    controller: ['$scope', 'popupService', function ($scope, popupService) {
      $scope.service = popupService
      popupService.initPromise.then(() => $scope.$apply())
    }],
    template: popupFormTemplate
  })

  .component('popupPasswordForm', {
    controller: ['$scope', 'popupService', PopupPasswordFormController],
    template: popupPasswordFormTemplate
  })

  .component('popupSettingsForm', {
    controller: ['$scope', 'popupService', function ($scope, popupService) {
      this.saveSettings = saveSettings

      $scope.service = popupService
      $scope.settings = angular.copy(popupService.settings)

      function saveSettings () {
        popupService.saveSettings($scope.settings)
        popupService.hideSettings()
      }
    }],
    template: popupSettingsFormTemplate
  })
