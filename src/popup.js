/*global hw, hwRules, StateStore */

angular.module('popup', ['clipboard', 'filters', 'settings-editor'])

.constant('PopupMode', {
    LOADING: 'LOADING',
    ERROR: 'ERROR',
    READY: 'READY',
    EDITING: 'EDITING'
})

.service('popupService', ['$timeout', 'PopupMode', function ($timeout, PopupMode) {
    const ctrl = this;

    angular.extend(ctrl, {
        state: { mode: PopupMode.LOADING },
        showSettings: () => changeMode(PopupMode.EDITING),
        hideSettings: () => changeMode(PopupMode.READY),
        changeDomain,
        hasSubdomain,
        saveSettings,
        updateAccessDate,
    });

    ctrl.initPromise = new Promise(getActiveTab)
    .then(() => Promise.all([new Promise(getSettings), new Promise(checkActive)]))
    .then(() => changeMode(PopupMode.READY))
    .catch(setError);

    function changeDomain(newDomain) {
        updateState({
            activeDomain: newDomain,
            settings: ctrl.state.allSettings[newDomain] || hw.getDefaultSettings()
        });
    }

    function hasSubdomain() {
        const domainInfo = ctrl.state.domainInfo;

        return domainInfo && domainInfo.tld != domainInfo.name &&
            ('www.' + domainInfo.tld) != domainInfo.name;
    }

    // Save settings, sets createDate for new domains.
    function saveSettings(newSettings) {
        let settings = newSettings || ctrl.state.settings;
        const isNewDomain = settings.createDate == null;
        const items = {};

        if (isNewDomain) {
            settings = Object.assign({}, settings, { createDate: new Date().getTime() });
        }

        updateState({ settings });

        items[ctrl.state.activeDomain] = settings;
        chrome.storage.local.set(items, function () {
            // TODO: handle errors
            // If it's a new domain, reset the rules for which icon to show
            if (isNewDomain) {
                hwRules.resetRules();
            }
        });
    }

    function updateAccessDate() {
        saveSettings(Object.assign({}, ctrl.state.settings, { accessDate: new Date().getTime() }));
    }

    function changeMode(mode, error) {
        updateState({
            mode,
            error: mode == PopupMode.ERROR ? error : null,
        });
    }

    function checkActive(resolve) {
        // Ask the page to tell us if there's a password field focused on it or not
        chrome.tabs.executeScript(ctrl.state.tabId, {
            file: 'check-active.js',
            allFrames: true
        },
        function (results) {
            updateState({
                foundPasswordField: !chrome.runtime.lastError && results &&
                                    results.reduce((prev, cur) => prev || cur)
            });
            resolve();
        });
    }

    function getActiveTab(resolve, reject) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
                updateState({
                    tabId: tabs[0].id,
                    domainInfo: hw.getDomainInfo(tabs[0].url),
                });
                resolve();
            }
            else {
                reject('Hashword cannot be used on this page.');
            }
        });
    }

    function getSettings(resolve, reject) {
        const domainInfo = ctrl.state.domainInfo;

        chrome.storage.local.get([domainInfo.name, domainInfo.tld], function (items) {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError.message);
            }

            // Only use the full hostname as the key if there are already settings for it,
            // otherwise fall back to the effective TLD. In other words, the effective TLD
            // is the default unless the user specifically selects the full hostname
            // (or did so in the past).
            ctrl.store.updateState({ allSettings: items });
            changeDomain(items[domainInfo.name] ? domainInfo.name : domainInfo.tld);
            resolve();
        });
    }

    function setError(reason) {
        console.error(reason);
        changeMode(PopupMode.ERROR, typeof(reason) === 'string' ? reason : 'Something went wrong!');
    }

    function updateState(updates) {
        ctrl.state = Object.assign({}, ctrl.state, updates);
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
         '$scope', 'popupService', 'PopupMode',
function ($scope ,  popupService ,  PopupMode) {
    $scope.PopupMode = PopupMode;
    $scope.state = {
        domain: popupService.state.activeDomain,
        password: ''
    };

    $scope.service = popupService;

    this.copyPassword = function (closeWindow) {
        const pw = hw.getHashword(
            popupService.state.activeDomain,
            $scope.state.password,
            popupService.state.settings
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
            (popupService.state.foundPasswordField ? this.insertPassword : this.copyPassword)();
            window.close();
        });
    };

    this.insertPassword = function () {
        const pw = hw.getHashword(
            popupService.state.activeDomain,
            $scope.state.password,
            popupService.state.settings
        );

        // Populate field, then trigger the input event so hopefully the scripts on the page
        // will register that we've entered something.
        const script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
            'document.activeElement.dispatchEvent(' +
                'new Event("input", { bubbles: true, cancelable: true })' +
            ');';

        chrome.tabs.executeScript(popupService.state.tabId, {
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
    $scope.settings = angular.copy(popupService.state.settings);

    function saveSettings() {
        popupService.saveSettings($scope.settings);
        popupService.hideSettings();
    }
}])
;
