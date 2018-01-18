/*jshint node:true, jasmine:true */
/*globals -chrome */

const chrome = require('sinon-chrome');

require('./build/lib.js');
require('./build/common.js');
require('./build/rules.js');

describe('popup', () => {

    beforeEach(() => {
        global.chrome = chrome;
        chrome.flush();
    });

    /*beforeEach(() => {
        spyOn(chrome.runtime, 'lastError').and.callFake();

        spyOn(chrome.storage.local, 'get').and.callFake((keys, callback) => {
            const items = {};

            keys.forEach(key => items[key] = {});
            callback(items);
        });
    });*/

    it('Becomes ready on a normal http page', () => {
        chrome.tabs.query.yields([{ id: 0, url: 'http://normal.web.page/' }]);
        chrome.storage.local.get.yields({ 'normal.web.page': {}, 'web.page': {} });

        require('./build/popup.js');

        expect();
    });
});
