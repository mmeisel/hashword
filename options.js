/*global angular, hw */

angular.module('options', ['siteSettings'])
.controller('OptionsCtrl', ['$scope', function ($scope) {
    $scope.edit = function (site) {
        $scope.editing = angular.copy(site);
    };
    
    $scope.saveEditing = function () {
        if ($scope.editing) {
            var edited = $scope.editing;
            var items = {};
            
            items[edited.domain] = edited.settings;
            $scope.editing = null;
            
            chrome.storage.local.set(items, function () {
                if (!chrome.runtime.lastError) {
                    $scope.allSites.forEach(function (site) {
                        if (site.domain == edited.domain) {
                            site.settings = edited.settings;
                        }
                    });
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
                    $scope.allSites = $scope.allSites.filter(function (site) {
                        return site.domain != domain;
                    });
                }
                $scope.$digest();
            });
        }
        $scope.editing = null;
    };
    
    $scope.predicate = ['domain'];
    $scope.reverse = false;
    
    chrome.storage.local.get(null, function (items) {
        $scope.allSites = Object.keys(items).map(function (domain) {
            return { domain: domain, settings: items[domain] };
        });
        $scope.$digest();
    });
}])

.filter('hwDate', ['$filter', function ($filter) {
    // Display '2013' for sites with no create/access date. Otherwise, pass the date on to
    // angular's built-in date filter.
    return function (d) {
        return d === 0 ? '2013' : $filter('date')(d);
    };
}])

.directive('hwSortTrigger', function () {
    var SECONDARY_SORT = 'domain';
    
    return {
        transclude: true,
        templateUrl: 'sort-trigger.html',
        scope: {
            sortBy: '@hwSortTrigger'
        },
        controller: ['$scope', function ($scope) {
            $scope.setSort = function () {
                var parent = $scope.$parent;
                
                parent.reverse = parent.predicate[0] == $scope.sortBy && !parent.reverse;
                parent.predicate = [$scope.sortBy];
                if ($scope.sortBy != SECONDARY_SORT) {
                    // Secondary sort should always be ascending
                    parent.predicate.push((parent.reverse ? '-' : '') + SECONDARY_SORT);
                }
            };
        }]
    };
});
