/* global hw, hwRules */

'use strict'

angular.module('site-list', ['clipboard', 'filters', 'settings-editor', 'ui.bootstrap'])
.controller('SiteListController', ['$scope', '$uibModal', function ($scope, $uibModal) {
  angular.extend($scope, {
    predicate: ['domain'],
    reverse: false,
    search: {},
    edit,
    saveEditing,
    cancelEditing,
    deleteEditing,
    copyPassword,
    loadAllSites
  })

  return loadAllSites()

  function edit (site) {
    $scope.editing = angular.copy(site)
  }

  function saveEditing () {
    if ($scope.editing) {
      const edited = $scope.editing
      const items = {}

      items[edited.domain] = edited.settings
      $scope.editing = null

      chrome.storage.local.set(items, function () {
        if (!chrome.runtime.lastError) {
          $scope.allSites.forEach((site) => {
            if (site.domain === edited.domain) {
              site.settings = edited.settings
            }
          })
          $scope.$apply()
        }
      })
    }
  }

  function cancelEditing () {
    $scope.editing = null
  }

  function deleteEditing () {
    const domain = $scope.editing.domain

    if (!domain) {
      return
    }

    const modal = $uibModal.open({
      scope: $scope,
      size: 'sm',
      templateUrl: 'delete-modal.html'
    })

    modal.result.then(function () {
      $scope.editing = null

      chrome.storage.local.remove(domain, function () {
        if (!chrome.runtime.lastError) {
          $scope.allSites = $scope.allSites.filter((site) => site.domain !== domain)

          // Reset the rules for which icon to show
          hwRules.resetRules()
        }
        $scope.$apply()
      })
    })
  }

  function copyPassword () {
    const modal = $uibModal.open({
      size: 'sm',
      templateUrl: 'password-modal.html'
    })

    modal.result.then(function (masterPassword) {
      const pw = hw.getHashword($scope.editing.domain, masterPassword, $scope.editing.settings)

      $scope.clipboardApi.copy(pw)
    })
  }

  function loadAllSites () {
    chrome.storage.local.get(null, function (items) {
      $scope.allSites = Object.keys(items).map((domain) => {
        return { domain, settings: items[domain] }
      })
      $scope.$apply()
    })
  }
}])

.directive('hwSortTrigger', function () {
  const SECONDARY_SORT = 'domain'

  return {
    transclude: true,
    templateUrl: 'sort-trigger.html',
    scope: {
      sortBy: '@hwSortTrigger'
    },
    controller: ['$scope', function ($scope) {
      $scope.setSort = function () {
        const parent = $scope.$parent

        parent.reverse = parent.predicate[0] === $scope.sortBy && !parent.reverse
        parent.predicate = [$scope.sortBy]
        if ($scope.sortBy !== SECONDARY_SORT) {
          // Secondary sort should always be ascending
          parent.predicate.push((parent.reverse ? '-' : '') + SECONDARY_SORT)
        }
      }
    }]
  }
})

.directive('hwExport', function () {
  const EXPORT_DEFAULT_FILENAME = 'hashword-site-list.json'

  return function ($scope, $element) {
    $element
        .attr('download', EXPORT_DEFAULT_FILENAME)
        .on('click', (e) => {
          const output = JSON.stringify({
            hashwordVersion: chrome.runtime.getManifest().version,
            data: $scope.allSites
          })

          $element.attr('href', window.URL.createObjectURL(new window.Blob([output]),
                                                      'application/json;charset=UTF-8'))
        })
  }
})

.directive('hwImport', function () {
  return function ($scope, $element) {
    const fileInput = angular.element('<input type="file"/>')
    // Wrap in a form so we can reset the content after an upload, see
    // http://stackoverflow.com/questions/21132971
    const form = angular.element('<form/>').append(fileInput)

    fileInput.on('change', function () {
      const file = fileInput[0].files[0]

      if (file != null) {
        const fileReader = new window.FileReader()

        fileReader.onload = function (e) {
          const imported = getConfirmedImport(e.target.result)

          if (imported) {
            const converted = {}

            imported.data.forEach((site) => (converted[site.domain] = site.settings))

            chrome.storage.local.set(converted, function () {
              if (!chrome.runtime.lastError) {
                hwRules.resetRules()
                $scope.loadAllSites()
              }
            })
          }
        }
        fileReader.readAsText(file, 'UTF-8')
      }

      form[0].reset()
    })

    $element.on('click', function (e) {
      e.preventDefault()
      fileInput[0].click()
    })
  }

  function getConfirmedImport (fileData) {
    try {
      const imported = JSON.parse(fileData)

      if (!imported.hashwordVersion || !imported.data) {
        window.alert('This file is not a hashword site list file.')
      } else if (window.confirm('This will overwrite all of your settings, are you sure?')) {
        return imported
      }
    } catch (ex) {
      window.alert('Import failed: ' + ex)
    }

    return null
  }
})
