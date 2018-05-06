const ClientOptions = require('./client-options')

// Note that these special keys use a character that's not valid in domain names to prevent conflicts
const SpecialKeys = {
  OPTIONS: '#options',
  LAST_SYNC_RESULT: '#sync'
}

const storage = {
  get (domains, includeDeleted = false) {
    return getLocal(domains)
      .then(items => sanitizeOutputDomains(items, includeDeleted))
  },

  getAll (includeDeleted = false) {
    return storage.get(null, includeDeleted)
  },

  getOptions () {
    return getLocal(SpecialKeys.OPTIONS)
      .then(items => new ClientOptions(items[SpecialKeys.OPTIONS]))
  },

  getLastSyncResult () {
    return getLocal(SpecialKeys.LAST_SYNC_RESULT)
      .then(items => items[SpecialKeys.LAST_SYNC_RESULT])
  },

  set (items) {
    return setLocal(sanitizeInputDomains(items))
  },

  setOne (key, value) {
    const items = {}

    items[key] = value
    return storage.set(items)
  },

  setOptions (options) {
    const items = {}

    items[SpecialKeys.OPTIONS] = options
    return setLocal(items)
  },

  handleSyncResult (syncResult) {
    const items = sanitizeInputDomains(syncResult.changed)

    // Set the changed domains and LAST_SYNC_RESULT at the same time to keep things consistent.
    items[SpecialKeys.LAST_SYNC_RESULT] = { timestamp: new Date().getTime(), data: syncResult }
    return setLocal(items)
  }
}

function getLocal (keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, items => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(items)
      }
    })
  })
}

function setLocal (items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    })
  })
}

function sanitizeInputDomains (items) {
  // Make sure we only accept things that look like valid domains.
  // Just remove them and log a warning.
  const filteredItems = {}

  Object.keys(items).forEach(domain => {
    // '#' is what the special keys start with and Chrome doesn't allow uppercase
    // in declarativeContent rules
    if (domain[0] === '#' || domain !== domain.toLowerCase()) {
      console.warn('Ignoring invalid domain:', domain)
    } else {
      filteredItems[domain] = items[domain]
    }
  })

  return filteredItems
}

function sanitizeOutputDomains (items, includeDeleted) {
  // Make sure the special keys don't leak
  Object.values(SpecialKeys).forEach(specialKey => {
    if (items.hasOwnProperty(specialKey)) {
      delete items[specialKey]
    }
  })

  if (!includeDeleted) {
    const filteredItems = {}

    Object.keys(items).forEach(domain => {
      const settings = items[domain]

      if (settings.deleteDate == null) {
        filteredItems[domain] = settings
      }
    })

    return filteredItems
  }

  return items
}

module.exports = storage
