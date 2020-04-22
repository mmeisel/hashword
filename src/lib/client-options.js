const ServerType = Object.freeze({
  NONE: 'NONE',
  OFFICIAL: 'OFFICIAL',
  CUSTOM: 'CUSTOM'
})
const OFFICIAL_URL = 'https://app.hashword.org'
const DEFAULTS = Object.freeze({ serverType: ServerType.NONE })

class ClientOptions {
  constructor (options) {
    Object.assign(this, DEFAULTS, options)
  }

  get serverUrl () {
    switch (this.serverType) {
      case ServerType.NONE:
        return null
      case ServerType.OFFICIAL:
        return OFFICIAL_URL
      case ServerType.CUSTOM:
        return this.customServerUrl
    }
    throw new Error(`Invalid server type: ${this.serverType}`)
  }
}

ClientOptions.ServerType = ServerType

module.exports = ClientOptions
