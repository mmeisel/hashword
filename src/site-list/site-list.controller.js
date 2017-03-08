import '../common/common';
import hw from '../common/hashword';
import hwRules from '../rules';

export default class SiteListController {
    constructor($scope, $uibModal) {
        this.scope = $scope;
        this.uibModal = $uibModal;

        Object.assign(this.scope, {
            predicate: ['domain'],
            reverse: false,
            search: {}
        });

        this.loadAllSites();
    }

    edit(site) {
        this.scope.editing = angular.copy(site);
    }
    
    saveEditing() {
        if (this.scope.editing) {
            const edited = this.scope.editing;
            const items = {};
            const scope = this.scope;
            
            items[edited.domain] = edited.settings;
            this.scope.editing = null;
            
            chrome.storage.local.set(items, function () {
                if (!chrome.runtime.lastError) {
                    scope.allSites.forEach(site => {
                        if (site.domain == edited.domain) {
                            site.settings = edited.settings;
                        }
                    });
                    scope.$apply();
                }
            });
        }
    }
    
    cancelEditing() {
        this.scope.editing = null;
    }
    
    deleteEditing() {
        const domain = this.scope.editing.domain;
        
        if (!domain) {
            return;
        }

        const modal = this.uibModal.open({
            scope: this.scope,
            size: 'sm',
            templateUrl: 'delete-modal.html'
        });

        const scope = this.scope;

        modal.result.then(function () {
            this.scope.editing = null;

            chrome.storage.local.remove(domain, function () {
                if (!chrome.runtime.lastError) {
                    scope.allSites = scope.allSites.filter(site => site.domain != domain);

                    // Reset the rules for which icon to show
                    hwRules.resetRules();
                }
                scope.$apply();
            });
        });
    }

    copyPassword() {
        const modal = this.uibModal.open({
            size: 'sm',
            templateUrl: 'password-modal.html'
        });
        const editing = this.scope.editing;

        modal.result.then(function (masterPassword) {
            const pw = hw.getHashword(editing.domain, masterPassword, editing.settings);

            this.scope.clipboardApi.copy(pw);
        });
    }

    loadAllSites() {
        const scope = this.scope;

        chrome.storage.local.get(null, function (items) {
            scope.allSites = Object.keys(items).map(domain => {
                return { domain, settings: items[domain] };
            });
            scope.$apply();
        });
    }
}

//SiteListController.$inject = ['$scope', '$uibModal'];
