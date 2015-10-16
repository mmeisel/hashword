/*global angular */

angular.module('site-settings', [])
.directive('hwSettingsEditor', function () {
    return {
        templateUrl: 'site-settings.html',
        replace: true,
        scope: {
            settings: '=hwSettingsEditor',
            notes: '@'
        }
    };
});
