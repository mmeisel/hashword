angular.module('clipboard', [])
.directive('clipboard', function () {
    return {
        link: linkFn,
        restrict: 'E',
        scope: {
            api: '='
        },
        templateUrl: 'clipboard.html'
    };

    function linkFn(scope, element) {
        scope.api = {
            copy: copy
        };

        var textarea = element.find('textarea')[0];

        function copy(value) {
            textarea.value = value;
            textarea.select();
            document.execCommand('copy');
            textarea.value = '';
        }
    }
});
