/* global hwStorage */

angular.module('sync', [])
.service('syncService', ['$http', function ($http) {
  this.sync = function () {
    return hwStorage.getOptions().then(options => {
      if (!options.useServer) {
        return false
      }

      return Promise.all([
        hwStorage.getAll(),
        $http.get(`${options.serverUrl}/sites`)
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

        if (Object.keys(toSync).length) {
          return $http.patch(`${options.serverUrl}/sites`, toSync)
        } else {
          return true
        }
      })
      .then(response => {
        const results = response.data

        if (results != null && Object.keys(results.changed).length) {
          return hwStorage.set(results.changed)
        } else {
          return true
        }
        // TODO: deal with conflicts
      })
      // TODO: deal with errors
    })
  }
}])
