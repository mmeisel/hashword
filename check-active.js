(function (el) {
    chrome.runtime.sendMessage({
        passwordFieldActive: el != null && el.type && el.type.toLowerCase() === "password"
    });
})(document.activeElement);
