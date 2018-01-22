// Global namespace
var hwStorage = {}

;(function () {
  hwStorage.get = function (domains, includeDeleted = false) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(domains, items => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(includeDeleted ? items : removeDeleted(items))
        }
      })
    })
  }

  hwStorage.getAll = function (includeDeleted = false) {
    return hwStorage.get(null, includeDeleted)
  }

  hwStorage.set = function (items) {
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

  hwStorage.setOne = function (domain, settings) {
    const items = {}

    items[domain] = settings
    return hwStorage.set(items)
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
})()
