/** This script exists solely for the purpose of entering passwords in the input field
    right-clicked by the user. */
(function () {
    var _rightclicked = null;
    var _idMap = {};

    document.addEventListener('contextmenu', function (e) {
        _rightclicked = e.srcElement;
    });
    chrome.runtime.onMessage.addListener(function (request) {
        if (request.command === 'setId') {
            _idMap[request.fieldId] = _rightclicked;
        }
        else if (request.command === 'fill') {
            _idMap[request.fieldId].value = request.password;
        }
    });
})();
