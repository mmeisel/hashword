angular.module('settings-editor', ['templates'])
.component('hwSettingsEditor', {
    templateUrl: 'settings-editor.html',
    bindings: {
        settings: '=',
        notes: '@'
    }
});
