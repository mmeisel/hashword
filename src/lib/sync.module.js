const angular = require('angular')
const rules = require('./rules')
const storage = require('./storage')
const ServerType = require('./client-options').ServerType

const ServerStatus = Object.freeze({
  OFF: 'OFF',
  SERVER_UNAVAILABLE: 'SERVER_UNAVAILABLE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  CONNECTED: 'CONNECTED'
})

function authHeaders (token) {
  if (token != null) {
    return { Authorization: `Bearer ${token}` }
  }
  return {}
}

class SyncService {
  constructor ($http) {
    this.$http = $http
    this.ServerStatus = ServerStatus
  }

  checkServerStatus (options) {
    if (options == null || options.serverUrl == null) {
      return Promise.reject(new Error('Invalid serverUrl'))
    }

    return Promise.resolve(this.$http.get(`${options.serverUrl}/api/user`, {
      timeout: 5000,
      headers: authHeaders(options.accessToken),
      withCredentials: true
    }))
    .then(response => {
      return {
        status: ServerStatus.CONNECTED,
        user: response.data
      }
    })
    .catch(response => {
      if (response.status === 401) {
        return Promise.resolve({ status: ServerStatus.AUTH_REQUIRED })
      } else {
        console.error('Error talking to server', response)
        return Promise.resolve({
          status: ServerStatus.SERVER_UNAVAILABLE,
          error: response.statusText
        })
      }
    })
  }

  checkStatus (options) {
    const optionsPromise = options ? Promise.resolve(options) : storage.getOptions()

    return optionsPromise.then(options => {
      if (options.serverType === ServerType.NONE) {
        return { status: ServerStatus.OFF }
      } else {
        return this.checkServerStatus(options)
      }
    })
  }

  login (serverUrl) {
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

  getDomainsToSync (options) {
    return Promise.all([
      storage.getAll(),
      this.$http.get(`${options.serverUrl}/api/sites`, {
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

  syncDomains (options, domainsToSync) {
    if (!Object.keys(domainsToSync).length) {
      return Promise.resolve({})
    }

    // The $http call must be wrapped since it returns a $q instead of a real Promise
    return Promise.resolve(this.$http.patch(`${options.serverUrl}/api/sites`, domainsToSync, {
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

  sync () {
    return storage.getOptions().then(options => {
      if (!options.useServer) {
        return {}
      }

      return this.getDomainsToSync(options).then(toSync => {
        return this.syncDomains(options, toSync)
      })
    })
  }
}

angular.module('sync', []).service('syncService', ['$http', SyncService])
module.exports = 'sync'
