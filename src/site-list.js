
import '../lib/angular.min';
import '../lib/ui-bootstrap.min';

import hwRules from './rules';
import './common/common';
import Controller from './site-list/site-list.controller';

angular.module('site-list', ['ui.bootstrap', 'common'])

.controller('SiteListController', Controller)

.directive('hwSortTrigger', function () {
    const SECONDARY_SORT = 'domain';
    
    return {
        transclude: true,
        templateUrl: 'sort-trigger.html',
        scope: {
            sortBy: '@hwSortTrigger'
        },
        controller: ['$scope', function ($scope) {
            $scope.setSort = function () {
                const parent = $scope.$parent;
                
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
    const EXPORT_DEFAULT_FILENAME = 'hashword-site-list.json';
    
    return function ($scope, $element) {
        $element
        .attr('download', EXPORT_DEFAULT_FILENAME)
        .on('click', e => {
            const output = JSON.stringify({
                hashwordVersion: chrome.runtime.getManifest().version,
                data: $scope.allSites
            });

            $element.attr('href', URL.createObjectURL(new Blob([output]),
                                                      'application/json;charset=UTF-8'));
        });
    };
})

.directive('hwImport', function () {
    return function ($scope, $element) {
        const fileInput = angular.element('<input type="file"/>');
        // Wrap in a form so we can reset the content after an upload, see
        // http://stackoverflow.com/questions/21132971
        const form = angular.element('<form/>').append(fileInput);
    
        fileInput.on('change', function () {
            const file = fileInput[0].files[0];
            
            if (file != null) {
                const fileReader = new FileReader();
                
                fileReader.onload = function (e) {
                    const imported = getConfirmedImport(e.target.result);
                    
                    if (imported) {
                        const converted = {};
                        
                        imported.data.forEach(site => converted[site.domain] = site.settings);
                        
                        chrome.storage.local.set(converted, function () {
                            if (!chrome.runtime.lastError) {
                                hwRules.resetRules();
                                $scope.$ctrl.loadAllSites();
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

    function getConfirmedImport(fileData) {
        try {
            const imported = JSON.parse(fileData);
    
            if (!imported.hashwordVersion || !imported.data) {
                window.alert('This file is not a hashword site list file.');
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
})
;
