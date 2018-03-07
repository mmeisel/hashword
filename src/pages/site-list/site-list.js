const angular = require('angular')
const clipboard = require('../../lib/clipboard')
const filters = require('../../lib/filters')
const hw = require('../../lib/hashword')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')
const settingsEditor = require('../../lib/settings-editor')
const uiBootstrap = require('angular-ui-bootstrap')

angular.module('site-list', [clipboard, filters, settingsEditor, uiBootstrap])
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

      edited.settings.saveRevision()
      $scope.editing = null

      return storage.setOne(edited.domain, edited.settings).then(() => {
        // TODO: surface errors
        const match = $scope.allSites.find(site => site.domain === edited.domain)

        if (match != null) {
          match.settings = edited.settings
        }
        $scope.$apply()
      })
    }
  }

  function cancelEditing () {
    $scope.editing = null
  }

  function deleteEditing () {
    if ($scope.editing) {
      const edited = $scope.editing
      const modal = $uibModal.open({
        scope: $scope,
        size: 'sm',
        templateUrl: 'delete-modal.html'
      })

      modal.result.then(() => {
        edited.settings.setDeleteDate()
        saveEditing().then(() => {
          $scope.allSites = $scope.allSites.filter(site => site.domain !== edited.domain)
          rules.resetRules()
        })
      })
    }
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
    return storage.getAll().then(items => {
      // TODO: surface errors
      $scope.allSites = Object.keys(items).map(domain => {
        return { domain, settings: new Settings(items[domain]) }
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

            // TODO: if this is old data, it may need to be upgraded
            imported.data.forEach(site => {
              converted[site.domain] = new hw.Storage(site.settings)
            })

            storage.set(converted).then(() => {
              // TODO: surface errors
              rules.resetRules()
              $scope.loadAllSites()
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
