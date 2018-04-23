const ClientOptions = require('./client-options')

// Note that the options key uses a character that's not valid in domain names to prevent conflicts
const OPTIONS_KEY = '#options'

const storage = {
  get (domains, includeDeleted = false) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(domains, items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(sanitize(items, includeDeleted))
        }
      })
    })
  },

  getAll (includeDeleted = false) {
    return storage.get(null, includeDeleted)
  },

  getOptions () {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(OPTIONS_KEY, items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(new ClientOptions(items[OPTIONS_KEY]))
        }
      })
    })
  },

  set (items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  },

  setOne (domain, settings) {
    const items = {}

    items[domain] = settings
    return storage.set(items)
  },

  setOptions (options) {
    const items = {}

    items[OPTIONS_KEY] = options

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
}

function sanitize (items, includeDeleted) {
  // Make sure the options don't leak
  if (items.hasOwnProperty(OPTIONS_KEY)) {
    delete items[OPTIONS_KEY]
  }

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
