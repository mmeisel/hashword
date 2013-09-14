window.onload = function () {
    document.querySelector('input[type="password"]').focus();

    document.querySelector('.btn-cancel').addEventListener('click', function () {
        window.close();
    });
    
    document.querySelector('form').addEventListener('submit', function (e) {
        var form = e.srcElement;
        
        e.preventDefault();
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length) {
                chrome.runtime.getBackgroundPage(function (bgPage) {
                    bgPage.hw.populateField(tabs[0].id, form.elements.password.value);
                });
            }
        });
        window.close();
    });
};
