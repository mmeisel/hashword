/*global hw, hwRules */

angular.module('popup', ['clipboard', 'filters'])
.directive('popupForm', function () {
    return {
        link: linkFn,
        scope: {},
        templateUrl: 'popup-form.html'
    };

    function linkFn(scope) {
        scope.state = {
            domain: '',
            password: '',
            showInsert: null,
            showSettings: false,
            error: null
        };

        scope.domainInfo = null;
        scope.hasSubdomain = hasSubdomain;
        scope.copyPassword = copyPassword;
        scope.onSubmit = onSubmit;
        scope.changeDomain = changeDomain;

        var tabId = null;
        var promise = new Promise(getActiveTab)
        .then(function () {
            return Promise.all([new Promise(getSettings), new Promise(checkActive)]);
        })
        .then(function () {
            scope.$apply();
        })
        .catch(function (reason) {
            scope.state.error = reason;
            scope.$apply();
        });

        function getActiveTab(resolve, reject) {
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
            chrome.storage.local.get([scope.domainInfo.name, scope.domainInfo.tld], function (items) {
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
            function (results) {
                if (!chrome.runtime.lastError && results) {
                    scope.state.showInsert = results.reduce(function (prevValue, curValue) {
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
            var pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

            scope.clipboardApi.copy(pw);

            if (closeWindow) {
                window.close();
            }
        }

        function onSubmit() {
            promise.then(function () {
                (scope.state.showInsert ? insertPassword : copyPassword)();
                window.close();
            });
        }

        // Update dates and save settings. We need to update a copy of the object in the
        // scope so we don't cause another digest cycle when we're trying to close the window.
        function updateAndSaveSettings() {
            var items = {};
            var settings = angular.copy(scope.settings);
            var isNewDomain = settings.createDate == null;

            settings.accessDate = new Date().getTime();
            if (isNewDomain) {
                settings.createDate = settings.accessDate;
            }
            items[scope.state.domain] = settings;
            chrome.storage.local.set(items, function () {
                // If it's a new domain, reset the rules for which icon to show
                if (isNewDomain) {
                    hwRules.resetRules();
                }
            });
        }

        function insertPassword() {
            var pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

            // Populate field, then trigger some key events so hopefully the scripts on the page
            // will register that we've entered something.
            var script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
                '["keydown", "keypress", "keyup"].forEach(function (t) { ' +
                    'document.activeElement.dispatchEvent(' +
                        'new KeyboardEvent(t, { bubbles: true, cancelable: true })' +
                    '); ' +
                '});';

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
