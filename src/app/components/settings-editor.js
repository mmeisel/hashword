/*global angular */

angular.module('components')
.directive('hwSettingsEditor', function () {
    return {
        templateUrl: 'settings-editor.html',
        replace: true,
        scope: {
            settings: '=hwSettingsEditor',
            notes: '@'
        }
    };
});
