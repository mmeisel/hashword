/*global chrome, hwRules */
chrome.runtime.onInstalled.addListener(function(details) {
    chrome.storage.local.get(null, function (items) {
         // Upgrade stored data to a new format when a new version is installed.
        if (details.reason == 'update') {
            _upgradeData(items);
        }
    });

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

// Install rules on initialization
hwRules.resetRules();
