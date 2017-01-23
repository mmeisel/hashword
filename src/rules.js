// Global namespace
var hwRules = {
    resetPromise: Promise.resolve(null)
};

hwRules.loadIcons = () => {
    let imageSizes = ['16', '19', '32', '38'];
    let imageVariants = ['insert', 'add'];
    let images = [];
    let imageData = {};
    let imagePromises = [];

    imageVariants.forEach((variant) => {
        imageData[variant] = {};

        imageSizes.forEach((size) => {
            let promise = _loadIcon(variant, size);

            promise.then((result) => imageData[variant][size] = result);
            imagePromises.push(promise);
        });
    });

    return new Promise((resolve, reject) => {
        Promise.all(imagePromises)
        .then(() => resolve(imageData))
        .catch(reject);
    });

    function _loadIcon(variant, size) {
        return new Promise((resolve, reject) => {
            var image = new Image();

            image.src = chrome.runtime.getURL('images/icon' + size + '-' + variant + '.png');
            image.onload = _handleImageLoaded.bind(image, size, resolve);
            image.onerror = reject;
            // Make sure the image object sticks around until it's loaded
            images.push(image);
        });
    }

    function _handleImageLoaded(size, resolve) {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");

        ctx.drawImage(this, 0, 0, size, size);
        resolve(ctx.getImageData(0, 0, size, size));
    }
};

hwRules.resetRules = () => {
    // We should only perform one reset at a time. With all of these asynchrous calls, it's
    // possible a second reset is started while the previous one is in progress. Just wait for
    // the current promise to complete, then run the procedure again (regardless of whether the
    // previous one succeeded or failed).
    return hwRules.resetPromise.then(_resetRulesStart, _resetRulesStart);

    function _resetRulesStart() {
        hwRules.resetPromise = new Promise((resolve, reject) => {
            chrome.storage.local.get(null, (hwData) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError.message);
                }

                // Due to a chrome bug (https://code.google.com/p/chromium/issues/detail?id=462542)
                // we need to manually load the icon images first.
                hwRules.loadIcons()
                .then(_resetRulesInternal.bind(this, hwData))
                .then(resolve, reject);
            });
        })
        .catch((reason) => console.error(reason));

        return hwRules.resetPromise;
    }

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

        insertIconRule.conditions = Object.keys(hwData).map((domain) => {
            // Chrome adds an implicit '.' is added at the beginning of the hostname when matching,
            // so this will work for exact matches as well.
            return new chrome.declarativeContent.PageStateMatcher({
                pageUrl: { hostSuffix: '.' + domain }
            });
        });

        return new Promise((resolve, reject) => {
            chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
                chrome.declarativeContent.onPageChanged.addRules([addIconRule, insertIconRule], () => {
                    if (chrome.runtime.lastError) {
                        reject('Error adding declarativeContent rules: ' + chrome.runtime.lastError.message);
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
};
