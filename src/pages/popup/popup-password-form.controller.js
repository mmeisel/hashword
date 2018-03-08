const hw = require('../../lib/hashword')

function PopupPasswordFormController ($scope, popupService) {
  $scope.PopupModes = popupService.PopupModes
  $scope.state = {
    domain: popupService.activeDomain,
    password: ''
  }

  $scope.service = popupService

  this.copyPassword = function (closeWindow) {
    const pw = hw.getHashword(
          popupService.activeDomain,
          $scope.state.password,
          popupService.settings
      )

    $scope.clipboardApi.copy(pw)

    popupService.updateAccessDate()

    if (closeWindow) {
      window.close()
    }
  }

  this.onSubmit = function () {
    // In case the user hit enter really fast, make sure we wait to find out if a password
    // field is present and take the correct action.
    popupService.initPromise.then(() => {
      (popupService.foundPasswordField ? this.insertPassword : this.copyPassword)()
      window.close()
    })
  }

  this.insertPassword = function () {
    const pw = hw.getHashword(
          popupService.activeDomain,
          $scope.state.password,
          popupService.settings
      )

    // Populate field, then trigger the input event so hopefully the scripts on the page
    // will register that we've entered something.
    const script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
          'document.activeElement.dispatchEvent(' +
              'new Event("input", { bubbles: true, cancelable: true })' +
          ');'

    chrome.tabs.executeScript(popupService.tabId, {
      code: script,
      allFrames: true
    })

    popupService.updateAccessDate()
  }
}

module.exports = PopupPasswordFormController
