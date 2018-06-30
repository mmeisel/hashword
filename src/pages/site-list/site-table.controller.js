const SECONDARY_SORT = 'domain'

class SiteTableController {
  constructor ($scope) {
    Object.assign(this, {
      sortableColumns: [
        { predicate: 'domain', name: 'Domain' },
        { predicate: 'settings.createDate', name: 'Created' },
        { predicate: 'settings.accessDate', name: 'Last Used' }
      ],
      predicates: ['domain'],
      reverse: false,
      search: {},
      scope: $scope
    })
  }

  changeSort (predicate) {
    if (predicate === this.predicates[0]) {
      this.reverse = !this.reverse
    } else {
      this.predicates = predicate === SECONDARY_SORT ? [predicate] : [predicate, SECONDARY_SORT]
      this.reverse = false
    }
  }
}

module.exports = SiteTableController
