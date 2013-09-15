(function () {
    
var _initPopup = function (bgPage, tab, domain) {
    var form = document.querySelector('form');
            
    form.querySelector('input[name="password"]').focus();

    form.querySelector('.btn-cancel').addEventListener('click', function () {
        window.close();
    });
    
    document.querySelector('.toggle').addEventListener('click', function (e) {
        this.hash = this.hash === this.dataset.target ? '' : this.dataset.target;
    });
    
    document.querySelector('.domain').innerHTML = 'Settings for ' + domain;

    chrome.storage.local.get(domain, function (items) {
        var settings = items[domain] || bgPage.hw.getDefaultSettings();

        Array.prototype.forEach.call(form.elements.pwLength, function (el) {
            el.checked = +el.value === settings.pwLength;
        });
        form.elements.symbols.checked = settings.symbols;
        form.elements.generation.value = settings.generation;
    });
    
    form.addEventListener('submit', function (e) {
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
            var domain = tabs.length ? bgPage.hw.getDomain(tabs[0].url) : null;
            
            if (domain) {
                _initPopup(bgPage, tabs[0], domain);
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
