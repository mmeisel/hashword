// This page exists solely to upgrade stored data to a new format when a new version is installed.
chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason == 'update') {
        chrome.storage.local.get(null, function (items) {
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
        });
    }
});
