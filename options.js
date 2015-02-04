/*jshint eqnull:true */
/*global angular, hw */

angular.module('options', ['common', 'siteSettings'])
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
                    $scope.$apply();
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
                $scope.$apply();
            });
        }
        $scope.editing = null;
    };
    
    $scope.loadAllSites = function () {
        chrome.storage.local.get(null, function (items) {
            $scope.allSites = Object.keys(items).map(function (domain) {
                return { domain: domain, settings: items[domain] };
            });
            $scope.$apply();
        });
    };
    
    $scope.predicate = ['domain'];
    $scope.reverse = false;
    $scope.search = {};
    $scope.loadAllSites();
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
})

.directive('hwExport', function () {
    var EXPORT_DEFAULT_FILENAME = 'hashword-options.json';
    
    return function ($scope, $element) {
        $element
        .attr('download', EXPORT_DEFAULT_FILENAME)
        .on('click', function (e) {
            var output = JSON.stringify({
                hashwordVersion: chrome.runtime.getManifest().version,
                data: $scope.allSites
            });

            $element.attr('href', URL.createObjectURL(new Blob([output]),
                                                      'application/json;charset=UTF-8'));
        });
    };
})

.directive('hwImport', function () {
    function getConfirmedImport(fileData) {
        try {
            var imported = JSON.parse(fileData);
    
            if (!imported.hashwordVersion || !imported.data) {
                window.alert('This file is not a hashword options file.');
            }
            else if (window.confirm('This will overwrite all of your settings, are you sure?')) {
                return imported;
            }
        }
        catch (ex) {
            window.alert('Import failed: ' + ex);
        }
        
        return null;
    }
    
    return function ($scope, $element) {
        var fileInput = angular.element('<input type="file"/>');
        // Wrap in a form so we can reset the content after an upload, see
        // http://stackoverflow.com/questions/21132971
        var form = angular.element('<form/>').append(fileInput);
    
        fileInput.on('change', function () {
            var file = fileInput[0].files[0];
            
            if (file != null) {
                var fileReader = new FileReader();
                
                fileReader.onload = function (e) {
                    var imported = getConfirmedImport(e.target.result);
                    
                    if (imported) {
                        var converted = {};
                        
                        imported.data.forEach(function (site) {
                            converted[site.domain] = site.settings;
                        });
                        
                        chrome.storage.local.set(converted, function () {
                            if (!chrome.runtime.lastError) {
                                $scope.loadAllSites();
                            }
                        });
                    }
                };
                fileReader.readAsText(file, 'UTF-8');
            }
            
            form[0].reset();
        });
        
        $element.on('click', function (e) {
            e.preventDefault();
            fileInput[0].click();
        });
    };
})
;
