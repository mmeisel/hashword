var PopupCtrl = ['$scope', function ($scope) {
    $scope.popup = { showSettings: false };
    
    $scope.hasSubdomain = function () {
        return $scope.domainInfo && $scope.domainInfo.tld != $scope.domainInfo.name &&
            ('www.' + $scope.domainInfo.tld) != $scope.domainInfo.name;
    };
    
    $scope.closeWindow = function () {
        window.close();
    };
    
    var _init = function (bgPage, tab) {
        $scope.domainInfo = bgPage.hw.getDomainInfo(tab.url);
        
        $scope.insertPassword = function () {
            bgPage.hw.insertPassword(tab.id, $scope.popup.domain, 
                $scope.popup.password, $scope.settings);
            window.close();
        };
        
        $scope.changeDomain = function () {
            $scope.settings = $scope.allSettings[$scope.popup.domain] ||
                bgPage.hw.getDefaultSettings();
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
            $scope.$digest();
        });
    };
    
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.runtime.getBackgroundPage(function (bgPage) {
            if (tabs.length && tabs[0].url) _init(bgPage, tabs[0]);
            else $scope.popup.error = 'Hashword cannot be used on this page.';
            
            $scope.$digest();
        });
    });
}];
