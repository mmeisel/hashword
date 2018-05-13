const angular = require('angular')
const rules = require('./rules')
const storage = require('./storage')
const ServerType = require('./client-options').ServerType

const MAX_SYNC_STALENESS_MS = 60000

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
    const optionsPromise = options ? Promise.resolve(options) : storage.getOptions()

    return optionsPromise.then(options => {
      if (options.serverType === ServerType.NONE) {
        return { status: ServerStatus.OFF }
      }

      if (options.serverUrl == null) {
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

  getLastSyncResult () {
    return storage.getLastSyncResult()
  }

  getDomainsToSync (options) {
    return Promise.all([
      storage.getAll(true),
      this.$http.get(`${options.serverUrl}/api/sites`, {
        headers: authHeaders(options.accessToken),
        withCredentials: true
      })
    ])
    .then(results => {
      const localDomainMap = results[0]
      const remoteDomainMap = results[1].data
      const toSync = {}

      // Check for domains that are either only remote or where the remote version is newer
      Object.keys(remoteDomainMap).forEach(domain => {
        const local = localDomainMap[domain]
        const remote = remoteDomainMap[domain]

        if (local == null) {
          toSync[domain] = null
        } else if (local.rev !== remote.rev || local.accessDate !== remote.accessDate) {
          toSync[domain] = local
        }
      })

      // Check for domains that are only local
      Object.keys(localDomainMap).forEach(domain => {
        if (remoteDomainMap[domain] == null) {
          toSync[domain] = localDomainMap[domain]
        }
      })

      console.info('Found', Object.keys(toSync).length, 'domain(s) to sync')
      return toSync
    })
  }

  syncDomains (options, domainsToSync) {
    if (!Object.keys(domainsToSync).length) {
      const syncResult = { data: {}, serverUrl: options.serverUrl, timestamp: Date.now() }

      return storage.handleSyncResult(syncResult)
        .then(() => syncResult)
    }

    // The $http call must be wrapped since it returns a $q instead of a real Promise
    return Promise.resolve(this.$http.patch(`${options.serverUrl}/api/sites`, domainsToSync, {
      headers: authHeaders(options.accessToken),
      withCredentials: true
    }))
    .then(response => {
      const syncResult = { data: response.data, serverUrl: options.serverUrl, timestamp: Date.now() }

      return storage.handleSyncResult(syncResult)
        .then(() => rules.resetRules())
        .then(() => console.info('Synced', Object.keys(domainsToSync).length, 'domain(s)'))
        .then(() => syncResult)
    })
  }

  syncNow (optionsArg) {
    const optionsPromise = optionsArg ? Promise.resolve(optionsArg) : storage.getOptions()

    return optionsPromise.then(options => {
      if (options.serverType === ServerType.NONE) {
        return {}
      }

      return this.getDomainsToSync(options).then(toSync => {
        return this.syncDomains(options, toSync)
      })
    })
  }

  // TODO: tests for this and getLastSyncResult
  requestSync (optionsArg) {
    const optionsPromise = optionsArg ? Promise.resolve(optionsArg) : storage.getOptions()

    return Promise.all([optionsPromise, this.getLastSyncResult()]).then(results => {
      const options = results[0]
      const syncResult = results[1]
      const now = Date.now()
      const resultExpiration = syncResult.timestamp + MAX_SYNC_STALENESS_MS

      // Run a new sync if the serverUrl has changed or the last result is stale
      if (options.serverUrl !== syncResult.serverUrl || now >= resultExpiration) {
        return this.syncNow(options)
      }
      console.info('Last sync result is still fresh')
      return syncResult
    })
  }
}

angular.module('sync', []).service('syncService', ['$http', SyncService])
module.exports = 'sync'
