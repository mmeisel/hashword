const angular = require('angular')
const uiBootstrap = require('angular-ui-bootstrap')
const clipboard = require('../../lib/clipboard.module')
const filters = require('../../lib/filters')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')
const settingsEditor = require('../../lib/settings-editor.module')
const sync = require('../../lib/sync.module')
const syncUi = require('../../lib/sync-ui.module')
const SiteListContainerController = require('./site-list-container.controller')
const siteListContainerTemplate = require('./site-list-container.tmpl.html')
const SiteTableController = require('./site-table.controller')
const siteTableTemplate = require('./site-table.tmpl.html')
const SiteDetailsController = require('./site-details.controller')
const siteDetailsTemplate = require('./site-details.tmpl.html')
const SyncUiWrapperController = require('./sync-ui-wrapper.controller')
const syncUiWrapperTemplate = require('./sync-ui-wrapper.tmpl.html')

angular.module('site-list', [clipboard, filters, settingsEditor, sync, syncUi, uiBootstrap])

  .component('siteListContainer', {
    controller: ['$scope', SiteListContainerController],
    template: siteListContainerTemplate
  })

  .component('siteTable', {
    bindings: {
      allSites: '<',
      editing: '<',
      onEdit: '&'
    },
    controller: ['$scope', SiteTableController],
    template: siteTableTemplate
  })

  .component('siteDetails', {
    bindings: {
      editing: '<',
      onCancel: '&',
      onDelete: '&',
      onSave: '&'
    },
    controller: ['$scope', '$uibModal', SiteDetailsController],
    template: siteDetailsTemplate
  })

  .component('syncUiWrapper', {
    bindings: {
      allSites: '<',
      onSync: '&'
    },
    controller: ['$scope', 'syncService', '$uibModal', SyncUiWrapperController],
    template: syncUiWrapperTemplate
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
                converted[site.domain] = new Settings(site.settings)
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
