const angular = require('angular')
const template = require('./settings-editor.tmpl.html')

const settingsEditor = angular.module('settings-editor', [])

settingsEditor.component('hwSettingsEditor', {
  template,
  bindings: {
    settings: '=',
    notes: '@'
  }
})

module.exports = 'settings-editor'
