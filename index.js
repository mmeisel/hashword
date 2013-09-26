/*global angular, hw */

angular.module('index', ['siteSettings'])
.controller('HashwordCtrl', ['$scope', function ($scope) {
    $scope.form = {};
    $scope.settings = hw.getDefaultSettings();
    
    $scope.updatePassword = function () {
        var pw = hw.getHashword($scope.form.domain, $scope.form.password, $scope.settings);
        $scope.form.output = pw;
    };
}]);
