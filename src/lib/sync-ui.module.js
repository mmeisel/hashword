const angular = require('angular')
const sync = require('./sync.module')
const SyncStatusController = require('./sync-status.controller')
const syncStatusTemplate = require('./sync-status.tmpl.html')
const SyncOptionsController = require('./sync-options.controller')
const syncOptionsTemplate = require('./sync-options.tmpl.html')

angular.module('sync-ui', [sync])

.component('syncStatus', {
  bindings: {
    providedOptions: '<?options'
  },
  controller: ['$scope', 'syncService', SyncStatusController],
  template: syncStatusTemplate
})

.component('syncStatusDisplay', {
  bindings: {
    syncStatus: '<',
    options: '<'
  },
  template: syncStatusTemplate
})

.component('syncOptions', {
  bindings: {
    options: '<',
    onChange: '&?'
  },
  controller: ['$scope', 'syncService', SyncOptionsController],
  template: syncOptionsTemplate
})

module.exports = 'sync-ui'
