/*global angular, hw */

angular.module('index', ['components'])
.controller('HashwordCtrl', ['$scope', function ($scope) {
    $scope.form = {};
    $scope.settings = hw.getDefaultSettings();
    $scope.output = '';
}])
.directive('hwSubmit', function () {
    return function ($scope, element) {
        var outputField = angular.element(element[0].querySelector('input.hw-output'));
        
        element.on('submit', function (e) {
            e.preventDefault();
            $scope.output = hw.getHashword($scope.form.domain, $scope.form.password, $scope.settings);

            // Manually inject the value into the input field instead of relying on angular binding.
            // iOS will not allow the field to be focused programmatically unless it's done from
            // the event handler directly. With angular binding, we would have to use $timeout to 
            // wait for a digest cycle to complete before there was any text to select inside the
            // field.
            outputField.val($scope.output);
            outputField[0].focus();
            // select is broken on iOS, use setSelectionRange instead.
            outputField[0].setSelectionRange(0, outputField.val().length);
        }); 
        outputField.on('focus', function () {
            outputField.attr('type', 'text');
            outputField[0].setSelectionRange(0, outputField.val().length);
        })  
        .on('blur', function () {
            // Replace the text in case it was modified (and hide it).
            // iOS won't let us select text in a readonly input.
            outputField.attr('type', 'password').val($scope.output);
        })  
        .on('mouseup', function (e) {
            // Without this, the mouseup will move the cursor. We want to keep the selection from
            // the focus event.
            e.preventDefault();
        }); 
    };
})
;
