/*global angular, hw */

angular.module('options', ['siteSettings'])
.controller('OptionsCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
	$scope.edit = function (domain) {
		$scope.editing = { domain: domain, settings: angular.copy($scope.allSettings[domain]) };
	};
	
	$scope.saveEditing = function () {
		if ($scope.editing) {
			var edited = $scope.editing;
			var items = {};
			
			items[edited.domain] = edited.settings;
			$scope.editing = null;
			
			chrome.storage.local.set(items, function () {
				if (!chrome.runtime.lastError) {
					$scope.allSettings[edited.domain] = edited.settings;
					$scope.$digest();
				}
			});
		}
	};
	
	$scope.cancelEditing = function () {
		$scope.editing = null;
	};
	
	$scope.deleteEditing = function () {
		var domain = $scope.editing.domain;
		
		if (domain) {
			chrome.storage.local.remove(domain, function () {
				if (!chrome.runtime.lastError) {
					delete $scope.allSettings[domain];
				}
				$scope.$digest();
			});
		}
		$scope.editing = null;
	};
    
    chrome.storage.local.get(null, function (items) {
        $scope.allSettings = items;
        $scope.$digest();
    });
}]);
