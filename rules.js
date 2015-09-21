/*global chrome */

// Global namespace
var hwRules = {};

hwRules.loadIcons = function(callback) {
    var imageSizes = ['19', '38'];
    var images = {};
    var imageData = {};

    imageSizes.forEach(function(size) {
        var image = new Image();

        image.src = chrome.runtime.getURL('images/icon' + size + '.png');
        image.onload = _handleImageLoaded.bind(image, size);
        images[size] = image;
    });

    function _handleImageLoaded(size) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        ctx.drawImage(this, 0, 0, size, size);
        imageData[size] = ctx.getImageData(0, 0, size, size);

        if (Object.keys(imageData).length == imageSizes.length) {
            callback(imageData);
        }
    }
};

hwRules.resetRules = function () {
    chrome.storage.local.get(null, function (hwData) {
        // Due to a chrome bug (https://code.google.com/p/chromium/issues/detail?id=462542)
        // we need to manually load the icon images first.
        hwRules.loadIcons(_resetRulesInternal.bind(this, hwData));
    });
    
    function _resetRulesInternal(hwData, imageData) {
        // Change the icon based on whether the extension has been used on this page before
        var iconRule = {
            actions: [new chrome.declarativeContent.SetIcon({ imageData: imageData })]
        };

        iconRule.conditions = Object.keys(hwData).map(function (domain) {
            // An implicit '.' is added at the beginning of the hostname, so this will work for
            // exact matches as well.
            return new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostSuffix: '.' + domain }
            });
        });

        chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
            chrome.declarativeContent.onPageChanged.addRules([iconRule]);
        });
    }
};
