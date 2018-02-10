/* global hw, hwRules, hwStorage */

angular.module('popup', ['clipboard', 'filters', 'settings-editor'])

.constant('PopupModes', {
  LOADING: 'LOADING',
  ERROR: 'ERROR',
  READY: 'READY',
  EDITING: 'EDITING'
})

.service('popupService', ['$timeout', 'PopupModes', function ($timeout, PopupModes) {
  const svc = this

  angular.extend(svc, {
    tabId: null,
    mode: PopupModes.LOADING,
    error: null,
    domainInfo: null,
    allSettings: null,
    activeDomain: null,
    foundPasswordField: null,
    settings: null,
    hasSubdomain,
    changeDomain,
    showSettings,
    hideSettings,
    saveSettings,
    updateAccessDate
  })

  svc.initPromise = getActiveTab()
    .then(() => Promise.all([getSettings(), checkActive()]))
    .then(() => (svc.mode = PopupModes.READY))
    .catch(setError)

  function setError (err) {
    console.error(err.message)
    svc.mode = PopupModes.ERROR
    svc.error = typeof (err.message) === 'string' ? err.message : 'Something went wrong!'
  }

  function getActiveTab () {
    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
          svc.tabId = tabs[0].id
          svc.domainInfo = hw.getDomainInfo(tabs[0].url)
          resolve()
        } else {
          reject(new Error('Hashword cannot be used on this page.'))
        }
      })
    })
  }

  function getSettings () {
    const allDomains = [svc.domainInfo.name]

    if (svc.domainInfo.tld !== svc.domainInfo.name) {
      allDomains.push(svc.domainInfo.tld)
    }

    return hwStorage.get(allDomains).then(items => {
      svc.allSettings = {}
      allDomains.forEach(domain => {
        svc.allSettings[domain] = new hw.Settings(items[domain])
      })

      // Only use the full hostname as the key if there are already settings for it,
      // otherwise fall back to the effective TLD. In other words, the effective TLD
      // is the default unless the user specifically selects the full hostname
      // (or did so in the past).
      changeDomain(items[svc.domainInfo.name] ? svc.domainInfo.name : svc.domainInfo.tld)
    })
  }

  function checkActive () {
    return new Promise(resolve => {
      // Ask the page to tell us if there's a password field focused on it or not
      chrome.tabs.executeScript(svc.tabId,
        {
          file: 'check-active.js',
          allFrames: true
        },
        results => {
          if (!chrome.runtime.lastError && results) {
            svc.foundPasswordField = results.reduce((prev, cur) => prev || cur)
          } else {
            svc.foundPasswordField = false
          }
          resolve()
        })
    })
  }

  function hasSubdomain () {
    return svc.domainInfo && svc.domainInfo.tld !== svc.domainInfo.name &&
            ('www.' + svc.domainInfo.tld) !== svc.domainInfo.name
  }

  function changeDomain (newDomain) {
    svc.activeDomain = newDomain
    svc.settings = svc.allSettings[newDomain]
  }

  function showSettings () {
    svc.mode = PopupModes.EDITING
  }

  function hideSettings () {
    svc.mode = PopupModes.READY
  }

    // Save settings, sets createDate for new domains.
  function saveSettings (newSettings) {
    if (newSettings != null) {
      const newSettingsCopy = angular.copy(newSettings)

      svc.allSettings[svc.activeDomain] = newSettingsCopy
      svc.settings = newSettingsCopy
    }

    const isNewDomain = svc.settings.createDate == null

    if (isNewDomain) {
      svc.settings.setCreateDate()
    }
    svc.settings.saveRevision()

    return hwStorage.setOne(svc.activeDomain, svc.settings).then(() => {
      // TODO: handle errors
      // If it's a new domain, reset the rules for which icon to show
      if (isNewDomain) {
        hwRules.resetRules()
      }
    })
  }

  function updateAccessDate () {
    svc.settings.setAccessDate()
    saveSettings()
  }
}])

.component('popupForm', {
  controller: ['$scope', 'popupService', function ($scope, popupService) {
    $scope.service = popupService
    popupService.initPromise.then(() => $scope.$apply())
  }],
  templateUrl: 'popup-form.html'
})

.component('popupPasswordForm', {
  controller: 'PopupPasswordFormController',
  templateUrl: 'popup-password-form.html'
})

.component('popupSettingsForm', {
  controller: 'PopupSettingsFormController',
  templateUrl: 'popup-settings-form.html'
})

.controller('PopupPasswordFormController', [
  '$scope', 'popupService', 'PopupModes',
  function ($scope, popupService, PopupModes) {
    $scope.PopupModes = PopupModes
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
])

.controller('PopupSettingsFormController', [
  '$scope', 'popupService',
  function ($scope, popupService) {
    this.saveSettings = saveSettings

    $scope.service = popupService
    $scope.settings = angular.copy(popupService.settings)

    function saveSettings () {
      popupService.saveSettings($scope.settings)
      popupService.hideSettings()
    }
  }
])
