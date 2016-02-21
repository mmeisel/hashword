/*global angular */

angular.module('components')
.component('hwSettingsEditor', {
    templateUrl: 'settings-editor.html',
    bindings: {
        settings: '=',
        notes: '@'
    }
});
