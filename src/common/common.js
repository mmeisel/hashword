import Clipboard from './clipboard';
import settingsEditorTemplate from './settings-editor.html';

export default angular.module('common', [])

.directive('clipboard', () => new Clipboard())

.filter('hwDate', function ($filter) {
    // Display '2013' for sites with no create/access date. Otherwise, pass the date on to
    // angular's built-in date filter.
    return d => d === 0 ? '2013' : $filter('date')(d);
})

.component('settingsEditor', {
    template: settingsEditorTemplate,
    bindings: {
        settings: '=',
        notes: '@'
    }
})
;
