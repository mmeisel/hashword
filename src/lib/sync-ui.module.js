const angular = require('angular')
const sync = require('./sync.module')
const syncStatusTemplate = require('./sync-status.tmpl.html')
const SyncOptionsController = require('./sync-options.controller')
const syncOptionsTemplate = require('./sync-options.tmpl.html')

angular.module('sync-ui', [sync])

.component('syncStatus', {
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
