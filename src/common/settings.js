const SHA3 = require('crypto-js/sha3')

const REVISABLE_FIELDS = ['pwLength', 'symbols', 'generation', 'notes', 'deleteDate']
const DEFAULTS = { pwLength: 16, symbols: true, generation: 1, notes: '', history: [] }

class Settings {
  constructor (settings) {
    Object.assign(this, DEFAULTS, settings)

    if (this.rev == null) {
      this.rev = this.generateRevisionHash()
    }
  }

  setCreateDate (createDate) {
    this.createDate = createDate == null ? new Date().getTime() : new Date(createDate).getTime()
  }

  setAccessDate (accessDate) {
    this.accessDate = accessDate == null ? new Date().getTime() : new Date(accessDate).getTime()
  }

  setDeleteDate (deleteDate) {
    this.deleteDate = deleteDate == null ? new Date().getTime() : new Date(deleteDate).getTime()
  }

  saveRevision () {
    const newRev = this.generateRevisionHash()

    if (newRev !== this.rev) {
      this.history.push(this.rev)
      this.rev = newRev
    }
  }

  generateRevisionHash () {
    const hashData = {}

    for (let field of REVISABLE_FIELDS) {
      hashData[field] = this[field]
    }
    if (this.history.length) {
      hashData.parent = this.history[this.history.length - 1]
    }

    return SHA3(JSON.stringify(hashData), { outputLength: 32 }).toString()
  }
}

module.exports = Settings
