const ClientOptions = require('./client-options')

const DEFAULT_STATE = Object.freeze({
  busy: false,
  error: null,
  ready: false,
  showCustomOptions: false,
  showLogin: false,
  showStatus: false,
  newOptions: null,
  serverStatus: null
})

class SyncOptionsController {
  constructor ($scope, syncService) {
    Object.assign(this, {
      scope: $scope,
      syncService,
      form: {},
      state: DEFAULT_STATE
    })
  }

  $onInit () {
    // Stub out onChange if it wasn't provided
    if (this.onChange == null) {
      this.onChange = () => null
    }

    // current options come from bindings (this.options)
    this.form = {
      serverType: this.options.serverType,
      // TODO: normalize URL
      customServerUrl: this.options.customServerUrl
    }

    this.setState({ newOptions: new ClientOptions(this.options) })

    switch (this.options.serverType) {
      case ClientOptions.ServerType.NONE:
        this.setState({ ready: true })
        break
      case ClientOptions.ServerType.OFFICIAL:
      case ClientOptions.ServerType.CUSTOM:
        this.connect()
        break
    }
  }

  // State handling

  setState (newState) {
    const oldState = this.state

    this.state = Object.freeze(Object.assign({}, this.state, newState))
    this.handleStateChange(oldState, this.state)
  }

  resetState (newState) {
    const oldState = this.state

    this.state = Object.freeze(Object.assign({}, DEFAULT_STATE, newState))
    this.handleStateChange(oldState, this.state)
  }

  handleStateChange (oldState, newState) {
    if (
        oldState.ready !== newState.ready ||
        (newState.ready && oldState.newOptions !== newState.newOptions)
    ) {
      this.onChange({ newOptions: newState.ready ? newState.newOptions : null })
    }
  }

  // Actions

  disableSync () {
    this.resetState({
      ready: true,
      newOptions: new ClientOptions({ serverType: ClientOptions.ServerType.NONE })
    })
  }

  showCustomOptions () {
    this.resetState({ showCustomOptions: true })
  }

  connectOfficial () {
    this.resetState({
      newOptions: new ClientOptions({ serverType: ClientOptions.ServerType.OFFICIAL })
    })
    return this.connect()
  }

  connectCustom () {
    this.resetState({
      newOptions: new ClientOptions({
        serverType: ClientOptions.ServerType.CUSTOM,
        customServerUrl: this.form.customServerUrl
      }),
      showCustomOptions: true
    })
    return this.connect()
  }

  connect () {
    this.setState({ busy: true, error: null })

    return this.syncService.checkServerStatus(this.state.newOptions).then(serverStatus => {
      this.setState({
        busy: false,
        ready: serverStatus.status === this.syncService.ServerStatus.CONNECTED,
        showLogin: serverStatus.status === this.syncService.ServerStatus.AUTH_REQUIRED,
        showStatus: true,
        serverStatus
      })
    })
    .catch(error => {
      this.setState({ busy: false, error: error.message })
    })
    .then(() => this.scope.$apply())
  }

  login () {
    this.setState({ busy: true, error: null })

    return this.syncService.login(this.state.newOptions.serverUrl).then(token => {
      const newOptions = new ClientOptions(this.state.newOptions)

      newOptions.accessToken = token
      this.setState({ newOptions })
      return this.connect()
    })
    .catch(error => {
      this.setState({ busy: false, error: error.message })
      this.scope.$apply()
    })
  }
}

module.exports = SyncOptionsController
