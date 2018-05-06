const angular = require('angular')
const sync = require('./sync.module')
const serverStatusTemplate = require('./server-status.tmpl.html')
const SyncOptionsController = require('./sync-options.controller')
const syncOptionsTemplate = require('./sync-options.tmpl.html')

angular.module('sync-ui', [sync])

.component('serverStatus', {
  bindings: {
    status: '<',
    options: '<'
  },
  template: serverStatusTemplate
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
