const hw = require('../../lib/hashword')
const deleteModalTemplate = require('./delete-modal.tmpl.html')
const passwordModalTemplate = require('./password-modal.tmpl.html')

class SiteDetailsController {
  constructor ($scope, $uibModal) {
    this.modal = $uibModal
    this.scope = $scope
    this.editing = null
  }

  copyPassword () {
    const modal = this.modal.open({
      size: 'sm',
      template: passwordModalTemplate
    })

    modal.result.then(masterPassword => {
      const pw = hw.getHashword(this.editing.domain, masterPassword, this.editing.settings)

      this.scope.clipboardApi.copy(pw)
    })
  }

  confirmDelete () {
    if (this.editing) {
      const modal = this.modal.open({
        scope: this.scope,
        size: 'sm',
        template: deleteModalTemplate
      })

      modal.result.then(() => this.onDelete({ site: this.editing }))
    }
  }
}

module.exports = SiteDetailsController
