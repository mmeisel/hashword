const angular = require('angular')
const rules = require('../../lib/rules')
const Settings = require('../../lib/settings')
const storage = require('../../lib/storage')

class SiteListContainerController {
  constructor ($scope) {
    this.scope = $scope
    this.editing = null
    this.allSites = null
  }

  $onInit () {
    this.loadAllSites()
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

  editSite (site) {
    this.editing = angular.copy(site)
  }

  saveSite (saved) {
    saved.settings.saveRevision()
    this.editing = null

    return storage.setOne(saved.domain, saved.settings).then(() => {
      // TODO: surface errors
      const match = this.allSites.find(site => site.domain === saved.domain)

      if (match != null) {
        match.settings = saved.settings
      }
      this.scope.$apply()
    })
  }

  cancelEditing () {
    this.editing = null
  }

  deleteSite (deleted) {
    deleted.settings.setDeleteDate()
    this.saveSite(deleted).then(() => {
      this.allSites = this.allSites.filter(site => site.domain !== deleted.domain)
      this.editing = null
      rules.resetRules()
    })
  }

  handleSync (result) {
    if (result.data.changed != null && Object.keys(result.data.changed).length) {
      this.loadAllSites()
    }
  }
}

module.exports = SiteListContainerController
