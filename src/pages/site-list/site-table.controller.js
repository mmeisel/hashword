const angular = require('angular')
const hw = require('../../lib/hashword')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')
const deleteModalTemplate = require('./delete-modal.tmpl.html')
const passwordModalTemplate = require('./password-modal.tmpl.html')

const SECONDARY_SORT = 'domain'

class SiteTableController {
  constructor ($scope, $uibModal) {
    Object.assign(this, {
      editing: null,
      sortableColumns: [
        { predicate: 'domain', name: 'Domain' },
        { predicate: 'settings.createDate', name: 'Created' },
        { predicate: 'settings.accessDate', name: 'Last Used' }
      ],
      predicates: ['domain'],
      reverse: false,
      search: {},
      scope: $scope,
      modal: $uibModal
    })

    this.loadAllSites()
  }

  changeSort (predicate) {
    if (predicate === this.predicates[0]) {
      this.reverse = !this.reverse
    } else {
      this.predicates = predicate === SECONDARY_SORT ? [predicate] : [predicate, SECONDARY_SORT]
      this.reverse = false
    }
  }

  edit (site) {
    this.editing = angular.copy(site)
  }

  saveEditing () {
    if (this.editing) {
      const edited = this.editing

      edited.settings.saveRevision()
      this.editing = null

      return storage.setOne(edited.domain, edited.settings).then(() => {
        // TODO: surface errors
        const match = this.allSites.find(site => site.domain === edited.domain)

        if (match != null) {
          match.settings = edited.settings
        }
        this.scope.$apply()
      })
    }
  }

  cancelEditing () {
    this.editing = null
  }

  deleteEditing () {
    if (this.editing) {
      const edited = this.editing
      const modal = this.modal.open({
        scope: this.scope,
        size: 'sm',
        template: deleteModalTemplate
      })

      modal.result.then(() => {
        edited.settings.setDeleteDate()
        this.saveEditing().then(() => {
          this.allSites = this.allSites.filter(site => site.domain !== edited.domain)
          rules.resetRules()
        })
      })
    }
  }

  copyPassword () {
    const modal = this.modal.open({
      size: 'sm',
      template: passwordModalTemplate
    })

    modal.result.then(masterPassword => {
      const pw = hw.getHashword(this.editing.domain, masterPassword, this.editing.settings)

      this.scope.clipboardApi.copy(pw)
    })
  }

  loadAllSites () {
    return storage.getAll().then(items => {
      // TODO: surface errors
      this.allSites = Object.keys(items).map(domain => {
        return { domain, settings: new Settings(items[domain]) }
      })
      this.scope.$apply()
    })
  }
}

module.exports = SiteTableController
