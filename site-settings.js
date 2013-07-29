window.onload = function () {
    // Get the tabId from the query string
    var domain = decodeURIComponent(window.location.search.match(/[&?]domain=([^&?]+)/)[1]);
    var form = document.querySelector('form');
    
    document.querySelector('.domain').innerHTML = 'Settings for ' + domain;
    
    chrome.storage.local.get(domain, function (items) {
        var settings = items[domain];
        
        if (settings) {
            Array.prototype.forEach.call(form.elements.pwLength, function (el) {
                el.checked = +el.value === settings.pwLength;
            });
            form.elements.symbols.checked = settings.symbols;
            form.elements.generation.value = settings.generation;
        }
    });
    
    document.querySelector('.btn-cancel').addEventListener('click', function () {
        window.close();
    });
    
    form.addEventListener('submit', function (e) {
        var items = {};

        e.preventDefault();
    
        items[domain] = {
            pwLength: +form.querySelector('input[name="pwLength"]:checked').value,
            symbols: form.elements.symbols.checked,
            generation: +form.elements.generation.value
        };
        chrome.storage.local.set(items);
        window.close();
    });
};
