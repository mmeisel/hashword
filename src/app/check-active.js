(function (el) {
    return el != null && el.type != null && el.type.toLowerCase() === "password";
})(document.activeElement);
