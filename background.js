/*global chrome:true, console:true, CryptoJS:true, tld:true */
/*jshint es5:true */

// Global namespace
var hw = {};

// Encoder than can be passed to crypto-js to stringify the hash
hw.encoder = function (_requireSym) {
    var self = {};
    var _charClasses = [
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef',
        'ghijklmnopqrstuvwxyzABCDEFGHIJKL',
        'MNOPQRSTUVWXYZabcdefghijklmnopqr',
        'stuvwxyzABCDEFGHIJKLMNOPQRSTUVWX'
    ];
    
    // These are aribtrarily chosen to be hopefully as unoffensive to password checkers as
    // possible. They're in ASCII order.
    var _symbols = '!#+,-./@';
    
    /* Make sure the number is exactly `len` characters by padding it with 0s. Note that `len`s
     * above 8 are not supported. (This is only ever used with len=2 or len=3 in the current
     * implementation.
     */
    function _zeroPad(val, len) {
        return ('00000000' + val).substr(-len);
    }
    
    function _getChunk(word, offset, count) {
        return (word >>> (32 - offset - count)) & (0xffffffff >>> (32 - count));
    }
    
    /* For each word, the highest order (sign) bit is used to determine the position of the numbers.
     * This guarantees the password will contain at least one number, but not always
     * in the same position. If the bit is 0, bits [6,11] will be used to generate the numbers
     * (so charcters [1,3] will be digits). If the bit is 1, bits [16,21] will be used to generate
     * the numbers (so characters [4,6] will be digits).
     * 25 bits will be encoded in 5 bit chunks by rotating through _charClasses (all of which
     * have 32 possible characters). Which 25 bits will be determined by the position of the
     * numbers (as chosen by the first bit).
     * The remaining 6 bits will be used to generate either three numerical digits, or two digits 
     * and a symbol, depending on whether a symbol is required. Note that the first digit will
     * always be a 0, since the digits are represented in base 10, and the maximum number that
     * 6 bits can represent is 63 ('063') (or 7 ('07') if 3 bits are used to pick a symbol).
     * If the last word only contains 16 bits, the first 6 bits will be used to generate the
     * numerical digits.
     * This scheme will generate 8 characters per complete word, plus 5 extra characters for the
     * last word if it only contains 16 significant bits. This scheme DOES NOT support encoding
     * word arrays where sigBytes % 2 != 0.
     */
    self.stringify = function (wordArray) {
        if (wordArray.sigBytes % 2 !== 0) {
            throw 'Unsupported number of significant bytes: ' + wordArray.sigBytes;
        }
        
        var bitCount = wordArray.sigBytes << 3;
        var charClassIdx = 0;
        var chars = [];

        wordArray.words.forEach(function (curWord) {
            if (bitCount > 0) {
                var bitsInWord = Math.min(bitCount, 32);
                var numberStart = bitsInWord === 32 ? ((curWord >>> 31) * 15 + 6) : 0;
                var curBit = bitsInWord === 32 ? 1 : 0;
                var chunk;
                
                while (curBit < bitsInWord) {
                    if (curBit === numberStart) {
                        chunk = _getChunk(curWord, curBit, 6);
                        
                        if (_requireSym) {
                            chars.push(_zeroPad(chunk >>> 3, 2), _symbols[chunk & 0x7]);
                        }
                        else {
                            chars.push(_zeroPad(chunk, 3));
                        }
                        curBit += 6;
                    }
                    else {
                        chunk = _getChunk(curWord, curBit, 5);
                        
                        chars.push(_charClasses[charClassIdx][chunk]);
                        charClassIdx = (charClassIdx + 1) % _charClasses.length;
                        curBit += 5;
                    }
                }
                
                bitCount -= bitsInWord;
            }
        });
        
        return chars.join('');
    };
    
    self.parse = function (str) {
        var wordCount = Math.ceil(str.length / 8);
        var words = [];
        var charClassIdx = 0;
        
        for (var wordIdx = 0; wordIdx < wordCount; wordIdx++) {
            var charsInWord = Math.min(8, str.length - (wordIdx << 3));
            // Skip the highest order (sign) bit for complete words
            var curShift = charsInWord === 8 ? 31 : 32;
            
            for (var wordChIdx = 0; wordChIdx < charsInWord; ) {
                var chIdx = 8 * wordIdx + wordChIdx;
                var ch = str[chIdx];
        
                if (ch === '0') {
                    // The sign bit in a full word is 1 only if a 0 appears at index 4
                    if (wordChIdx === 4) {
                        words[wordIdx] |= 1 << 31;
                    }
            
                    if (_requireSym) {
                        // Decode 2 digits (3 bits) and a symbol (3 bits)
                        curShift -= 3;
                        words[wordIdx] |= +str.substr(chIdx, 2) << curShift;
                        curShift -= 3;
                        words[wordIdx] |= _symbols.indexOf(str[chIdx + 2]) << curShift;
                    }
                    else {
                        // Decode 3 digits
                        curShift -= 6;
                        words[wordIdx] |= +str.substr(chIdx, 3) << curShift;
                    }
                    wordChIdx += 3;
                }
                else {
                    curShift -= 5;
                    words[wordIdx] |= _charClasses[charClassIdx].indexOf(ch) << curShift;
                    charClassIdx = (charClassIdx + 1) % _charClasses.length;
                    wordChIdx += 1;
                }
            }
        }
        
        return CryptoJS.lib.WordArray.create(words, str.length >>> 1);
    };
    
    return self;
};

hw.getDomain = function (url) {
    var a = document.createElement('a');
    a.href = url;
    return tld.getDomain(a.hostname);
};

hw.getDefaultSettings = function () {
    return { pwLength: 16, symbols: true, generation: 1 };
};

hw.getNextId = function () {
    return (+('' + Math.random()).substr(2)).toString(36);
};

hw.getHashword = function (domain, masterPassword, settings) {
    var key = masterPassword + '@' + domain + '+' + settings.generation;
    
    return CryptoJS.SHA3(key, { outputLength: settings.pwLength * 4 })
        .toString(hw.encoder(settings.symbols));
};

// Popups

hw.openPasswordPopup = function (tab) {
    var popupWidth = 360;
    var popupHeight = 132;
    
    chrome.windows.get(tab.windowId, function (wind) {
        var fieldId = hw.getNextId();
        var items = {};
        
        // Tell the content script to mark this field with the fieldId
        chrome.tabs.sendMessage(tab.id, { command: 'setId', fieldId: fieldId });
        
        chrome.windows.create({
            url: 'password.html?tabId=' + tab.id + '&fieldId=' + fieldId,
            type: 'popup',
            top: Math.round(Math.max(wind.top, wind.top + wind.height / 2 - popupHeight)),
            left: Math.round(Math.max(0, wind.left + wind.width / 2 - popupWidth / 2)),
            width: popupWidth,
            height: popupHeight,
            focused: true
        });
    });
};

hw.openSettingsPopup = function (tab) {
    var popupWidth = 360;
    var popupHeight = 270;
    
    chrome.windows.get(tab.windowId, function (wind) {
        var fieldId = hw.getNextId();
        var items = {};
        
        // Tell the content script to mark this field with the fieldId
        chrome.tabs.sendMessage(tab.id, { command: 'setId', fieldId: fieldId });
        
        chrome.windows.create({
            url: 'site-settings.html?domain=' + encodeURIComponent(hw.getDomain(tab.url)),
            type: 'popup',
            top: Math.round(Math.max(wind.top, (wind.top + wind.height) / 2 - popupHeight)),
            left: Math.round(Math.max(0, (wind.left + wind.width) / 2 - (popupWidth / 2))),
            width: popupWidth,
            height: popupHeight,
            focused: true
        });
    });
};

// Callbacks from popups

hw.populateField = function (tabId, fieldId, masterPassword) {
    chrome.tabs.get(tabId, function (tab) {
        var domain = hw.getDomain(tab.url);
        
        // check for settings, set defaults if they aren't available
        chrome.storage.local.get(domain, function (items) {
            var settings = items[domain];
            
            if (!settings) {
                settings = hw.getDefaultSettings();
                items[domain] = settings;
                chrome.storage.local.set(items);
            }
            
            var password = hw.getHashword(domain, masterPassword, settings);
            
            chrome.tabs.executeScript(tabId, {
                code: 'document.activeElement.value=' + JSON.stringify(password)
            });
        });
    });
};

// Chrome extension events

chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({ id: 'insert', title: 'Insert Password', contexts: ['editable'] });
    chrome.contextMenus.create({ id: 'settings', title: 'Site Settings', contexts: ['editable'] });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    if (info.menuItemId === 'insert') {
        hw.openPasswordPopup(tab);
    }
    else if (info.menuItemId === 'settings') {
        hw.openSettingsPopup(tab);
    }
});

chrome.commands.onCommand.addListener(function (command) {
    // We only have one command: insert_password
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length) {
            //chrome.pageAction.show(tabs[0].id);
            hw.openPasswordPopup(tabs[0]);
        }
    });
});

