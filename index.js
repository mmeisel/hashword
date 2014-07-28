/*global angular, hw */

angular.module('index', ['siteSettings'])
.controller('HashwordCtrl', ['$scope', function ($scope) {
    $scope.form = {};
    $scope.settings = hw.getDefaultSettings();
    
    $scope.updatePassword = function () {
        var pw = hw.getHashword($scope.form.domain, $scope.form.password, $scope.settings);
        $scope.form.output = pw;
    };
    
    $scope.selectOutput = function ($event) {
        console.log($event.target.select);
    };
}])
.directive('hwSelectOnSubmit', ['$timeout', function ($timeout) {
    return function (scope, element) {
        angular.element(element[0].form).on('submit', function () {
            $timeout(function () {
                element[0].focus();
                element[0].select();
            });
        });
    };
}])
;
