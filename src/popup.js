/*global hw, hwRules */

angular.module('popup', ['clipboard', 'filters', 'settings-editor'])

.constant('PopupMode', {
    LOADING: 'LOADING',
    ERROR: 'ERROR',
    READY: 'READY',
    EDITING: 'EDITING'
})

.constant('PopupActionType', {
    ACTIVE_TAB_FOUND: 'ACTIVE_TAB_FOUND',
    DOMAIN_CHANGED: 'DOMAIN_CHANGED',
    MODE_CHANGED: 'MODE_CHANGED',
    SETTINGS_CREATED: 'SETTINGS_CREATED',
    SETTINGS_UPDATED: 'SETTINGS_UPDATED',
    PASSWORD_FIELD_FOUND: 'PASSWORD_FIELD_FOUND',
    SETTINGS_LOADED: 'SETTINGS_LOADED',
})

.service('popupRootReducer', [
         'PopupMode', 'PopupActionType',
function (PopupMode,   PopupActionType) {
    return function (state = {}, action) {
        let newState = state;

        if (action.stateChanges) {
            newState = Object.assign({}, state, action.stateChanges);
        }

        return newState;
    };
}])

.service('popupStore', ['popupRootReducer', function (popupRootReducer) {
    return Redux.createStore(popupRootReducer);
}])

.service('popupActions', [
         'popupStore', 'PopupActionType', 'PopupMode',
function (popupStore,   PopupActionType,   PopupMode) {
    return Redux.bindActionCreators({
        activeTabFound,
        domainChanged,
        modeChanged,
        settingsCreated,
        settingsUpdated,
        passwordFieldFound,
        settingsLoaded,
    }, popupStore.dispatch.bind(popupStore));

    function activeTabFound(tab) {
        return {
            type: PopupActionType.ACTIVE_TAB_FOUND,
            stateChanges: {
                tabId: tab.id,
                domainInfo: hw.getDomainInfo(tab.url),
            },
        };
    }

    function domainChanged(activeDomain) {
        const state = popupStore.getState();

        return {
            type: PopupActionType.DOMAIN_CHANGED,
            stateChanges: {
                activeDomain,
                settings: state.allSettings[activeDomain] || hw.getDefaultSettings(),
            },
        };
    }

    function modeChanged(mode, error) {
        return {
            type: PopupActionType.MODE_CHANGED,
            stateChanges: {
                mode,
                error: mode === PopupMode.ERROR ? error : null,
            },
        };
    }

    function settingsCreated(settings) {
        return {
            type: PopupActionType.SETTINGS_CREATED,
            stateChanges: {
                // Set createDate for new domains
                settings: Object.assign({}, settings, { createDate: new Date().getTime() }),
            },
        };
    }

    function settingsUpdated(settings) {
        return {
            type: PopupActionType.SETTINGS_UPDATED,
            stateChanges: { settings },
        };
    }

    function settingsLoaded(allSettings) {
        return {
            type: PopupActionType.SETTINGS_LOADED,
            stateChanges: { allSettings },
        };
    }

    function passwordFieldFound(foundPasswordField) {
        return {
            type: PopupActionType.PASSWORD_FIELD_FOUND,
            stateChanges: { foundPasswordField },
        };
    }
}])

.service('popupService', [
         '$timeout', 'popupActions', 'popupStore', 'PopupMode',
function ($timeout,   popupActions,   popupStore,   PopupMode) {
    const ctrl = this;

    angular.extend(ctrl, {
        hasSubdomain,
        changeDomain: popupActions.domainChanged,
        showSettings: popupActions.modeChanged.bind(PopupMode.EDITING),
        hideSettings: popupActions.modeChanged.bind(PopupMode.READY),
        saveSettings: popupActions.settingsUpdated,
        updateAccessDate
    });

    ctrl.initPromise = new Promise(getActiveTab)
    .then(() => Promise.all([new Promise(getSettings), new Promise(checkActive)]))
    .then(popupActions.modeChanged.bind(PopupMode.READY))
    .catch(setError);

    popupStore.subscribe()

    function setError(reason) {
        popupActions.modeChanged(
            PopupMode.ERROR,
            typeof(reason) === 'string' ? reason : 'Something went wrong!'
        );
    }

    function getActiveTab(resolve, reject) {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
                popupActions.activeTabFound(tabs[0]);
                resolve();
            }
            else {
                reject('Hashword cannot be used on this page.');
            }
        });
    }

    function getSettings(resolve, reject) {
        let domainInfo = popupStore.getState().domainInfo;

        chrome.storage.local.get([domainInfo.name, domainInfo.tld], function (items) {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError.message);
            }

            popupActions.settingsLoaded(items);
            // Only use the full hostname as the key if there are already settings for it,
            // otherwise fall back to the effective TLD. In other words, the effective TLD
            // is the default unless the user specifically selects the full hostname
            // (or did so in the past).
            popupActions.domainChanged(
                items[ctrl.domainInfo.name] ? ctrl.domainInfo.name : ctrl.domainInfo.tld
            );
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
            popupActions.passwordFieldFound(
                !chrome.runtime.lastError && results && results.reduce((prev, cur) => prev || cur)
            );
            resolve();
        });
    }

    function hasSubdomain() {
        const state = popupStore.getState();

        return state.domainInfo && state.domainInfo.tld != state.domainInfo.name &&
            ('www.' + state.domainInfo.tld) != state.domainInfo.name;
    }

    function saveSettings(isNewDomain) {
        const state = popupStore.getState();
        const items = {};

        items[state.activeDomain] = state.settings;
        chrome.storage.local.set(items, function () {
            // TODO: handle errors
            // If it's a new domain, reset the rules for which icon to show
            if (isNewDomain) {
                hwRules.resetRules();
            }
        });
    }

    function updateAccessDate() {
        const newSettings = Object.assign({}, popupStore.getState().settings, {
            accessDate: new Date().getTime()
        });
        popupActions.settingsUpdated(newSettings);
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
        domain: popupService.activeDomain,
        password: ''
    };

    $scope.service = popupService;

    this.copyPassword = function (closeWindow) {
        const pw = hw.getHashword(
            popupService.activeDomain,
            $scope.state.password,
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
function ($scope ,  popupService) {
    this.saveSettings = saveSettings;

    $scope.service = popupService;
    $scope.settings = angular.copy(popupService.settings);

    function saveSettings() {
        popupService.saveSettings($scope.settings);
        popupService.hideSettings();
    }
}])
;
