/*global angular, hw, hwRules */

angular.module('popup', ['common', 'siteSettings'])
.controller('PopupCtrl', ['$scope', function ($scope) {
    $scope.popup = { showSettings: false };
    
    $scope.hasSubdomain = function () {
        return $scope.domainInfo && $scope.domainInfo.tld != $scope.domainInfo.name &&
            ('www.' + $scope.domainInfo.tld) != $scope.domainInfo.name;
    };
    
    $scope.closeWindow = function () {
        window.close();
    };
    
    // Update dates and save settings. We need to update a copy of the object in the
    // scope so we don't cause another digest cycle when we're trying to close the window.
    function _updateAndSaveSettings() {
        var items = {};
        var settings = angular.copy($scope.settings);
        var isNewDomain = settings.createDate == null;
        
        settings.accessDate = new Date().getTime();
        if (settings.accessDate == null) {
            settings.createDate = settings.accessDate;
        }
        items[$scope.popup.domain] = settings;
        chrome.storage.local.set(items, function () {
            // If it's a new domain, reset the rules for which icon to show
            if (isNewDomain) {
                hwRules.resetRules();
            }
        });
    }
    
    function _init(tab) {
        $scope.domainInfo = hw.getDomainInfo(tab.url);
        
        $scope.insertPassword = function () {
            var pw = hw.getHashword($scope.popup.domain, $scope.popup.password, $scope.settings);
    
            // Populate field
            chrome.tabs.executeScript(tab.id, {
                code: 'document.activeElement.value=' + JSON.stringify(pw),
                allFrames: true
            });
    
            _updateAndSaveSettings();
            window.close();
        };
        
        $scope.changeDomain = function () {
            $scope.settings = $scope.allSettings[$scope.popup.domain] ||
                hw.getDefaultSettings();
        };
        
        chrome.storage.local.get([$scope.domainInfo.name, $scope.domainInfo.tld], function (items) {
            // Only use the full hostname as the key if there are already settings for it,
            // otherwise fall back to the effective TLD. In other words, the effective TLD
            // is the default unless the user specifically selects the full hostname
            // (or did so in the past).
            $scope.allSettings = items;
            $scope.popup.domain = items[$scope.domainInfo.name] ?
                    $scope.domainInfo.name : $scope.domainInfo.tld;
            $scope.changeDomain();
            $scope.$apply();
        });
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) _init(tabs[0]);
        else $scope.popup.error = 'Hashword cannot be used on this page.';
   
        $scope.$apply();
    });
}]);
