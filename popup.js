/*global hw, hwRules */

angular.module('popup', ['common', 'siteSettings'])
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

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length && tabs[0].url && tabs[0].url.indexOf('http') === 0) {
                init(tabs[0]);
            }
            else {
                scope.state.error = 'Hashword cannot be used on this page.';
            }

            scope.$apply();
        });

        function hasSubdomain() {
            return scope.domainInfo && scope.domainInfo.tld != scope.domainInfo.name &&
                ('www.' + scope.domainInfo.tld) != scope.domainInfo.name;
        }

        function copyPassword() {
            var textarea = document.querySelector('#copy-me');
            var pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

            textarea.value = pw;
            textarea.select();
            document.execCommand('copy');
            textarea.value = '';
            window.close();
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

        function init(tab) {
            scope.domainInfo = hw.getDomainInfo(tab.url);

            scope.insertPassword = function () {
                var pw = hw.getHashword(scope.state.domain, scope.state.password, scope.settings);

                // Populate field, then trigger some key events so hopefully the scripts on the page
                // will register that we've entered something.
                var script = 'document.activeElement.value = ' + JSON.stringify(pw) + '; ' +
                    '["keydown", "keypress", "keyup"].forEach(function (t) { ' +
                        'document.activeElement.dispatchEvent(' +
                            'new KeyboardEvent(t, { bubbles: true, cancelable: true })' +
                        '); ' +
                    '});';

                chrome.tabs.executeScript(tab.id, {
                    code: script,
                    allFrames: true
                });

                updateAndSaveSettings();
                window.close();
            };

            scope.changeDomain = function () {
                scope.settings = scope.allSettings[scope.state.domain] || hw.getDefaultSettings();
            };

            chrome.storage.local.get([scope.domainInfo.name, scope.domainInfo.tld], function (items) {
                // Only use the full hostname as the key if there are already settings for it,
                // otherwise fall back to the effective TLD. In other words, the effective TLD
                // is the default unless the user specifically selects the full hostname
                // (or did so in the past).
                scope.allSettings = items;
                scope.state.domain = items[scope.domainInfo.name] ?
                        scope.domainInfo.name : scope.domainInfo.tld;
                scope.changeDomain();
                scope.$apply();
            });

            // Ask the page to tell us if there's a password field focused on it or not
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                if (request.passwordField != null && sender.tab.id === tab.id) {
                    scope.state.showInsert = scope.state.showInsert || request.passwordField;
                    scope.$apply();
                }
            });

            chrome.tabs.executeScript(tab.id, {
                code: 'chrome.runtime.sendMessage({ ' +
                        'passwordField: !!document.querySelector(\'input[type="password"]:focus\') ' +
                    '});',
                allFrames: true
            });
        }
    }
});
