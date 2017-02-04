/*global hw, hwRules */

angular.module('popup', ['clipboard', 'filters', 'settings-editor'])
.directive('popupForm', function () {
    return {
        link: linkFn,
        scope: {},
        templateUrl: 'popup-form.html'
    };

    function linkFn(scope) {
        angular.extend(scope, {
            state: {
                domain: '',
                password: '',
                showInsert: null,
                showSettings: false,
                error: null,
                ready: false
            },
            domainInfo: null,
            hasSubdomain,
            copyPassword,
            onSubmit,
            changeDomain
        });

        let tabId = null;
        let promise = new Promise(getActiveTab)
        .then(() => Promise.all([new Promise(getSettings), new Promise(checkActive)]))
        .then(() => {
            // This is a hack to work around a chrome bug:
            // https://bugs.chromium.org/p/chromium/issues/detail?id=428044
            // It seems if we hide everything until we're done loading, this doesn't happen.
            // Perhaps it's too many resizes in a short period of time.
            scope.state.ready = true;
            scope.$apply();
        })
        .catch((reason) => {
            scope.state.error = reason;
            scope.$apply();
        });

        function getActiveTab(resolve, reject) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
                    tabId = tabs[0].id;
                    scope.domainInfo = hw.getDomainInfo(tabs[0].url);
                    resolve();
                }
                else {
                    reject('Hashword cannot be used on this page.');
                }
            });
        }

        function getSettings(resolve, reject) {
            chrome.storage.local.get([scope.domainInfo.name, scope.domainInfo.tld], (items) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError.message);
                }

                // Only use the full hostname as the key if there are already settings for it,
                // otherwise fall back to the effective TLD. In other words, the effective TLD
                // is the default unless the user specifically selects the full hostname
                // (or did so in the past).
                scope.allSettings = items;
                scope.state.domain = items[scope.domainInfo.name] ?
                        scope.domainInfo.name : scope.domainInfo.tld;
                scope.changeDomain();
                resolve();
            });
        }

        function checkActive(resolve) {
            // Ask the page to tell us if there's a password field focused on it or not
            chrome.tabs.executeScript(tabId, {
                file: 'check-active.js',
                allFrames: true
            },
            (results) => {
                if (!chrome.runtime.lastError && results) {
                    scope.state.showInsert = results.reduce((prevValue, curValue) => {
                        return prevValue || curValue;
                    });
                }
                else {
                    scope.state.showInsert = false;
                }
                resolve();
            });
        }

        function hasSubdomain() {
            return scope.domainInfo && scope.domainInfo.tld != scope.domainInfo.name &&
                ('www.' + scope.domainInfo.tld) != scope.domainInfo.name;
        }

        function copyPassword(closeWindow) {
            let pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

            scope.clipboardApi.copy(pw);

            updateAndSaveSettings();

            if (closeWindow) {
                window.close();
            }
        }

        function onSubmit() {
            promise.then(() => {
                (scope.state.showInsert ? insertPassword : copyPassword)();
                window.close();
            });
        }

        // Update dates and save settings. We need to update a copy of the object in the
        // scope so we don't cause another digest cycle when we're trying to close the window.
        function updateAndSaveSettings() {
            let items = {};
            let settings = angular.copy(scope.settings);
            let isNewDomain = settings.createDate == null;

            settings.accessDate = new Date().getTime();
            if (isNewDomain) {
                settings.createDate = settings.accessDate;
            }
            items[scope.state.domain] = settings;
            chrome.storage.local.set(items, () => {
                // If it's a new domain, reset the rules for which icon to show
                if (isNewDomain) {
                    hwRules.resetRules();
                }
            });
        }

        function insertPassword() {
            let pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

            // Populate field, then trigger some key events so hopefully the scripts on the page
            // will register that we've entered something.
            let script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
                '["keydown", "keypress", "keyup"].forEach((t) => ' +
                    'document.activeElement.dispatchEvent(' +
                        'new KeyboardEvent(t, { bubbles: true, cancelable: true })' +
                    ')' +
                ');';

            chrome.tabs.executeScript(tabId, {
                code: script,
                allFrames: true
            });

            updateAndSaveSettings();
        }

        function changeDomain() {
            scope.settings = scope.allSettings[scope.state.domain] || hw.getDefaultSettings();
        }
    }
});
