const angular = require('angular')
const clipboard = angular.module('clipboard', [])

clipboard.directive('clipboard', function () {
  return {
    link: linkFn,
    restrict: 'E',
    scope: {
      api: '='
    },
    template: '<textarea type="text" tabindex="-1"></textarea>'
  }

  function linkFn (scope, element) {
    scope.api = {
      copy: copy
    }

    const textarea = element.find('textarea')[0]

    function copy (value) {
      textarea.value = value
      textarea.select()
      document.execCommand('copy')
      textarea.value = ''
    }
  }
})

module.exports = 'clipboard'
