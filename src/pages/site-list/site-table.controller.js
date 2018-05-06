const SECONDARY_SORT = 'domain'

class SiteTableController {
  constructor ($scope) {
    // TODO: break this file up into a site-list controller (container) and a site-table (presentation).
    // allSites should be in the container (obviously), this way it can receive the signal to update
    // from the sync-ui-wrapper
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
