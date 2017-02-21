/*global hw, hwRules */

angular.module('popup', ['clipboard', 'filters', 'settings-editor'])

.constant('PopupModes', {
    LOADING: 'LOADING',
    ERROR: 'ERROR',
    READY: 'READY',
    EDITING: 'EDITING'
})

.service('popupService', ['$timeout', 'PopupModes', function ($timeout, PopupModes) {
    const ctrl = this;

    angular.extend(ctrl, {
        tabId: null,
        mode: PopupModes.LOADING,
        error: null,
        domainInfo: null,
        allSettings: null,
        activeDomain: null,
        foundPasswordField: null,
        settings: null,
        hasSubdomain,
        changeDomain,
        showSettings,
        hideSettings,
        saveSettings,
        updateAccessDate
    });

    ctrl.initPromise = new Promise(getActiveTab)
    .then(() => Promise.all([new Promise(getSettings), new Promise(checkActive)]))
    .then(() => ctrl.mode = PopupModes.READY)
    .catch(setError);

    function setError(reason) {
        console.error(reason);
        ctrl.mode = PopupModes.ERROR;
        ctrl.error = typeof(reason) === 'string' ? reason : 'Something went wrong!';
    }

    function getActiveTab(resolve, reject) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
                ctrl.tabId = tabs[0].id;
                ctrl.domainInfo = hw.getDomainInfo(tabs[0].url);
                resolve();
            }
            else {
                reject('Hashword cannot be used on this page.');
            }
        });
    }

    function getSettings(resolve, reject) {
        chrome.storage.local.get([ctrl.domainInfo.name, ctrl.domainInfo.tld], function (items) {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError.message);
            }

            // Only use the full hostname as the key if there are already settings for it,
            // otherwise fall back to the effective TLD. In other words, the effective TLD
            // is the default unless the user specifically selects the full hostname
            // (or did so in the past).
            ctrl.allSettings = items;
            changeDomain(items[ctrl.domainInfo.name] ? ctrl.domainInfo.name : ctrl.domainInfo.tld);
            resolve();
        });
    }

    function checkActive(resolve) {
        // Ask the page to tell us if there's a password field focused on it or not
        chrome.tabs.executeScript(ctrl.tabId, {
            file: 'check-active.js',
            allFrames: true
        },
        function (results) {
            if (!chrome.runtime.lastError && results) {
                ctrl.foundPasswordField = results.reduce((prev, cur) => prev || cur);
            }
            else {
                ctrl.foundPasswordField = false;
            }
            resolve();
        });
    }

    function hasSubdomain() {
        return ctrl.domainInfo && ctrl.domainInfo.tld != ctrl.domainInfo.name &&
            ('www.' + ctrl.domainInfo.tld) != ctrl.domainInfo.name;
    }

    function changeDomain(newDomain) {
        ctrl.activeDomain = newDomain;
        ctrl.settings = ctrl.allSettings[newDomain] || hw.getDefaultSettings();
    }

    function showSettings() {
        ctrl.mode = PopupModes.EDITING;
    }

    function hideSettings() {
        ctrl.mode = PopupModes.READY;
    }

    // Save settings, sets createDate for new domains.
    function saveSettings(newSettings) {
        if (newSettings != null) {
            ctrl.settings = angular.copy(newSettings);
        }

        const isNewDomain = ctrl.settings.createDate == null;
        const items = {};

        if (isNewDomain) {
            ctrl.settings.createDate = new Date().getTime();
        }

        items[ctrl.activeDomain] = ctrl.settings;
        chrome.storage.local.set(items, function () {
            // TODO: handle errors
            // If it's a new domain, reset the rules for which icon to show
            if (isNewDomain) {
                hwRules.resetRules();
            }
        });
    }

    function updateAccessDate() {
        ctrl.settings.accessDate = new Date().getTime();
        saveSettings();
    }
}])

.component('popupForm', {
    controller: ['$scope', 'popupService', function ($scope, popupService) {
        $scope.service = popupService;
        popupService.initPromise.then(() => $scope.$apply());
    }],
    templateUrl: 'popup-form.html'
})

.component('popupPasswordForm', {
    controller: 'PopupPasswordFormController',
    templateUrl: 'popup-password-form.html'
})

.component('popupSettingsForm', {
    controller: 'PopupSettingsFormController',
    templateUrl: 'popup-settings-form.html'
})

.controller('PopupPasswordFormController', [
         '$scope', 'popupService', 'PopupModes',
function ($scope ,  popupService ,  PopupModes) {
    $scope.PopupModes = PopupModes;
    $scope.state = {
        domain: popupService.activeDomain,
        password: ''
    };

    $scope.service = popupService;

    this.copyPassword = function (closeWindow) {
        const pw = hw.getHashword(
            popupService.activeDomain,
            $scope.password,
            popupService.settings
        );

        $scope.clipboardApi.copy(pw);

        popupService.updateAccessDate();

        if (closeWindow) {
            window.close();
        }
    };

    this.onSubmit = function () {
        // In case the user hit enter really fast, make sure we wait to find out if a password
        // field is present and take the correct action.
        popupService.initPromise.then(() => {
            (popupService.foundPasswordField ? this.insertPassword : this.copyPassword)();
            window.close();
        });
    };

    this.insertPassword = function () {
        const pw = hw.getHashword(
            popupService.activeDomain,
            $scope.state.password,
            popupService.settings
        );

        // Populate field, then trigger the input event so hopefully the scripts on the page
        // will register that we've entered something.
        const script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
            'document.activeElement.dispatchEvent(' +
                'new Event("input", { bubbles: true, cancelable: true })' +
            ');';

        chrome.tabs.executeScript(popupService.tabId, {
            code: script,
            allFrames: true
        });

        popupService.updateAccessDate();
    };
}])

.controller('PopupSettingsFormController', [
         '$scope', 'popupService',
function ($scope ,  popupService ) {
    this.saveSettings = saveSettings;

    $scope.service = popupService;
    $scope.settings = angular.copy(popupService.settings);

    function saveSettings() {
        popupService.saveSettings($scope.settings);
        popupService.hideSettings();
    }
}])
;
