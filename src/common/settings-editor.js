const angular = require('angular')
const template = require('./settings-editor.tmpl.html')

const settingsEditor = angular.module('settings-editor', [template])

settingsEditor.component('hwSettingsEditor', {
  templateUrl: template,
  bindings: {
    settings: '=',
    notes: '@'
  }
})

module.exports = 'settings-editor'
