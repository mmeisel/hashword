/*global chrome, hwRules */
chrome.runtime.onInstalled.addListener(function(details) {
    // Install declarative content rules

    if (details.reason == 'update') {
        console.info('Upgrade detected, checking data format...');

        // Upgrade stored data to a new format when a new version is installed.
        // Delay installing the rules until the data is upgraded in case the new rules code relies
        // on the new format.
        chrome.storage.local.get(null, function (items) {
            _upgradeData(items);
            console.info('Data upgraded, adding declarativeContent rules');
            hwRules.resetRules();
        });
    }
    else {
        console.info('Adding declarativeContent rules for new install');
        hwRules.resetRules();
    }

    function _upgradeData(items) {
        Object.keys(items).filter(function (domain) {
            var settings = items[domain];
    
            // For data from previous versions that doesn't have the create/access dates.
            // We'll use 0 as a special value to indicate that the date is not known. This will
            // allow us to know that these sites already have hashwords created for them, as
            // well as show a special string in the options page for such cases.
            if (settings.createDate == null) {
                settings.createDate = 0;
                settings.accessDate = 0;
                return true;
            }
        
            return false;
        });
    
        chrome.storage.local.set(items);
    }
});

// Just in case
chrome.runtime.onStartup.addListener(hwRules.resetRules);
