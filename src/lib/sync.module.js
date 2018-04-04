const angular = require('angular')
const rules = require('./rules')
const storage = require('./storage')

const sync = angular.module('sync', [])

sync.service('syncService', ['$http', function ($http) {
  this.SyncStatus = Object.freeze({
    OFF: 'OFF',
    SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    CONNECTED: 'CONNECTED'
  })

  this.checkServerStatus = options => {
    if (options == null) {
      return Promise.reject(new Error('Invalid serverUrl'))
    }

    return Promise.resolve($http.get(`${options.serverUrl}/api/user`, {
      timeout: 5000,
      headers: authHeaders(options.accessToken),
      withCredentials: true
    }))
    .then(response => {
      return {
        status: this.SyncStatus.CONNECTED,
        user: response.data
      }
    })
    .catch(response => {
      if (response.status === 403) {
        return Promise.resolve({ status: this.SyncStatus.AUTH_REQUIRED })
      } else {
        console.error('Error talking to server', response)
        return Promise.resolve({ status: this.SyncStatus.SERVER_UNAVAILABLE })
      }
    })
  }

  this.checkStatus = () => {
    return storage.getOptions().then(options => {
      if (options.serverType === ServerType.NONE) {
        return { status: this.SyncStatus.OFF }
      } else {
        return this.checkServerStatus(options.serverUrl)
      }
    })
  }

  this.login = serverUrl => {
    return new Promise((resolve, reject) => {
      chrome.identity.launchWebAuthFlow(
        { url: `${serverUrl}/auth/login?client_id=chrome`, interactive: true },
        responseUrl => {
          if (responseUrl == null) {
            reject(new Error(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Login failed.'))
          } else {
            const token = responseUrl.split('#')[1]

            if (token) {
              resolve(token)
            } else {
              reject(new Error(`URL ${responseUrl} does not appear to contain a token`))
            }
          }
        }
      )
    })
  }

  this.getDomainsToSync = options => {
    return Promise.all([
      storage.getAll(),
      $http.get(`${options.serverUrl}/api/sites`, {
        headers: authHeaders(options.accessToken),
        withCredentials: true
      })
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

  this.syncDomains = (options, domainsToSync) => {
    if (!Object.keys(domainsToSync).length) {
      return Promise.resolve({})
    }

    // The $http call must be wrapped since it returns a $q instead of a real Promise
    return Promise.resolve($http.patch(`${options.serverUrl}/api/sites`, domainsToSync, {
      headers: authHeaders(options.accessToken),
      withCredentials: true
    }))
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

  this.sync = () => {
    return storage.getOptions().then(options => {
      if (!options.useServer) {
        return {}
      }

      return this.getDomainsToSync(options).then(toSync => {
        return this.syncDomains(options, toSync)
      })
    })
  }
}])

function authHeaders (token) {
  return { Authorization: `Bearer ${token}` }
}

module.exports = 'sync'
