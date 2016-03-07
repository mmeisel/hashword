/*global chrome */

// Global namespace
var hwRules = {};

hwRules.loadIcons = function(callback) {
    var imageSizes = ['19', '38'];
    var imageVariants = ['insert', 'add'];
    var totalImages = imageSizes.length * imageVariants.length;
    var loadedImages = 0;
    var images = {};
    var imageData = {};

    imageVariants.forEach(function (variant) {
        images[variant] = {};
        imageData[variant] = {};

        imageSizes.forEach(function(size) {
            var image = new Image();

            image.src = chrome.runtime.getURL('images/icon' + size + '-' + variant + '.png');
            image.onload = _handleImageLoaded.bind(image, variant, size);
            images[variant][size] = image;
        });
    });

    function _handleImageLoaded(variant, size) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        ctx.drawImage(this, 0, 0, size, size);
        imageData[variant][size] = ctx.getImageData(0, 0, size, size);
        loadedImages += 1;

        if (loadedImages === totalImages) {
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
        // When the extension has been used on a site, show the "insert" icon. On pages with a
        // password field where it hasn't been used, show the "add" icon.
        var addIconRule = {
            priority: 50,
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({ css: ["input[type='password']"] })
            ],
            actions: [new chrome.declarativeContent.SetIcon({ imageData: imageData.add })]
        };

        var insertIconRule = {
            // Prefer this rule since known sites will match both.
            priority: 100,
            actions: [new chrome.declarativeContent.SetIcon({ imageData: imageData.insert })]
        };

        insertIconRule.conditions = Object.keys(hwData).map(function (domain) {
            // An implicit '.' is added at the beginning of the hostname, so this will work for
            // exact matches as well.
            return new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostSuffix: '.' + domain }
            });
        });

        chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
            chrome.declarativeContent.onPageChanged.addRules([addIconRule, insertIconRule]);
        });
    }
};
