/* global angular */

angular.module('filters', [])
.filter('hwDate', ['$filter', function ($filter) {
  // Display '2013' for sites with no create/access date. Otherwise, pass the date on to
  // angular's built-in date filter.
  return (d) => d === 0 ? '2013' : $filter('date')(d)
}])
