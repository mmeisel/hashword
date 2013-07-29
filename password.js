window.onload = function () {
    // Get the fieldId and tabId from the query string
    var tabId = +window.location.search.match(/[&?]tabId=([0-9]+)/)[1];
    var fieldId = window.location.search.match(/[&?]fieldId=([0-9a-z]+)/)[1];
    
    document.querySelector('input[type="password"]').focus();

    document.querySelector('.btn-cancel').addEventListener('click', function () {
        window.close();
    });
    
    document.querySelector('form').addEventListener('submit', function (e) {
        var form = e.srcElement;
        
        e.preventDefault();
        chrome.runtime.getBackgroundPage(function (bgPage) {
            bgPage.hw.populateField(tabId, fieldId, form.elements.password.value);
        });
        window.close();
    });
};