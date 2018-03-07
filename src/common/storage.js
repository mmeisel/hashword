const storage = {
  get (domains, includeDeleted = false) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(domains, items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(includeDeleted ? items : removeDeleted(items))
        }
      })
    })
  },

  getAll (includeDeleted = false) {
    return storage.get(null, includeDeleted)
  },

  getOptions () {
    return new Promise((resolve, reject) => {
      // Note that options are stored in sync storage
      chrome.storage.sync.get('options', items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(items.options)
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
    const items = { options }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(items, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }
}

function removeDeleted (items) {
  const filteredItems = {}

  Object.keys(items).forEach(domain => {
    const settings = items[domain]

    if (settings.deleteDate == null) {
      filteredItems[domain] = settings
    }
  })

  return filteredItems
}

module.exports = storage
