(function () {

var _settings = {};

var _loadSettings = function (domain, defaults) {
    var form = document.querySelector('form');
    var settings = _settings[domain] || defaults;
    
    form.querySelector('input[name="domain"][value="' + domain + '"]').checked = true;
    form.querySelector('.settings-label').innerHTML = 'Settings for ' + domain;

    Array.prototype.forEach.call(form.elements.pwLength, function (el) {
        el.checked = +el.value === settings.pwLength;
    });
    form.elements.symbols.checked = settings.symbols;
    form.elements.generation.value = settings.generation;
};

var _initPopup = function (bgPage, tab, domainInfo) {
    var form = document.querySelector('form');

    form.querySelector('input[name="password"]').focus();
    
    document.getElementById('domain-tld').value = domainInfo.tld;
    form.querySelector('label[for="domain-tld"]').innerHTML = 'Any ' + domainInfo.tld + ' domain';
    document.getElementById('domain-name').value = domainInfo.name;
    form.querySelector('label[for="domain-name"]').innerHTML = domainInfo.name + ' only';

    if (domainInfo.tld !== domainInfo.name && 'www.' + domainInfo.tld !== domainInfo.name) {
        var changeHandler = function (e) {
            _loadSettings(e.srcElement.value, bgPage.hw.getDefaultSettings());
        };

        Array.prototype.forEach.call(form.elements.domain, function (el) {
            el.addEventListener('change', changeHandler);
        });
        
        form.querySelector('.domain-container').classList.remove('collapse');
    }
    
    form.querySelector('.toggle').addEventListener('click', function (e) {
        document.querySelector(this.dataset.target).classList.toggle('collapse');
    });
    
    form.querySelector('.btn-cancel').addEventListener('click', function () {
        window.close();
    });
    
    chrome.storage.local.get([domainInfo.name, domainInfo.tld], function (items) {
        // Only use the full hostname as the key if there are already settings for it, otherwise
        // fall back to the effective TLD. In other words, the effective TLD is the default
        // unless the user specifically selects the full hostname (or did so in the past).
        var domain = items[domainInfo.name] ? domainInfo.name : domainInfo.tld;
        
        _settings = items;
        _loadSettings(domain, bgPage.hw.getDefaultSettings());
    });
    
    form.addEventListener('submit', function (e) {
        var domain = form.elements.domain.value;
        
        e.preventDefault();
        bgPage.hw.insertPassword(tab.id, domain, form.elements.password.value, {
            pwLength: +form.querySelector('input[name="pwLength"]:checked').value,
            symbols: form.elements.symbols.checked,
            generation: +form.elements.generation.value
        });

        window.close();
    });
};

var _showWarning = function () {
    var container = document.querySelector('.container');
    var warning = document.createElement('p');
    
    Array.prototype.forEach.call(container.children, function (el) {
        el.style.display = 'none';
    });
    
    warning.setAttribute('class', 'text-danger');
    warning.innerHTML = 'Hashword cannot be used on this page.';
    container.appendChild(warning);

    // Just in case the form is somehow submitted
    document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
    });
};

window.onload = function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.runtime.getBackgroundPage(function (bgPage) {
            var domainInfo = (tabs.length && tabs[0].url) ? bgPage.hw.getDomainInfo(tabs[0].url) : null;
            
            if (domainInfo) {
                _initPopup(bgPage, tabs[0], domainInfo);
            }
            else {
                // If there is no domain, this must be some page we can't access.
                // Display a warning and hide everything else.
                _showWarning();
            }
        });
    });
};

})();
