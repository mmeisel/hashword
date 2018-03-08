const angular = require('angular')
const rules = require('./rules')
const storage = require('./storage')

const sync = angular.module('sync', [])

sync.service('syncService', ['$http', function ($http) {
  this.getDomainsToSync = function (serverUrl) {
    return Promise.all([
      storage.getAll(),
      $http.get(`${serverUrl}/sites`)
    ])
    .then(results => {
      const localDomainMap = results[0]
      const remoteDomainMap = results[1].data
      const toSync = {}

      Object.keys(remoteDomainMap).forEach(domain => {
        const local = localDomainMap[domain]
        const remote = remoteDomainMap[domain]

        if (local == null) {
          toSync[domain] = null
        } else if (local.rev !== remote.rev || local.accessDate !== remote.accessDate) {
          toSync[domain] = local
        }
      })

      return toSync
    })
  }

  this.syncDomains = function (serverUrl, domainsToSync) {
    if (!Object.keys(domainsToSync).length) {
      return Promise.resolve({})
    }

    // The $http call must be wrapped since it returns a $q instead of a real Promise
    return Promise.resolve($http.patch(`${serverUrl}/sites`, domainsToSync))
      .then(response => {
        const results = response.data

        if (!Object.keys(results.changed).length) {
          return domainsToSync
        }

        return storage.set(results.changed)
          .then(rules.resetRules)
          .then(() => domainsToSync)
        // TODO: deal with conflicts
      })
  }

  this.sync = function () {
    return storage.getOptions().then(options => {
      if (!options.useServer) {
        return {}
      }

      return this.getDomainsToSync(options.serverUrl).then(toSync => {
        return this.syncDomains(options.serverUrl, toSync)
      })
    })
  }
}])

module.exports = 'sync'
