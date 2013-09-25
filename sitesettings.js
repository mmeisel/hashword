/*global angular */

angular.module('siteSettings', [])
.directive('hwSettingsEditor', function () {
    return {
        templateUrl: 'sitesettings.html',
        replace: true,
        scope: { settings: '=hwSettingsEditor' }
    };
});
