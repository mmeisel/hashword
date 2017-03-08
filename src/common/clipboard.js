export default class {
    constructor() {
        Object.assign(this, {
            link: this.link,
            restrict: 'E',
            scope: { api: '=' },
            template: '<textarea type="text" tabindex="-1"></textarea>'
        });
    }

    link(scope, element) {
        scope.api = { copy };

        const textarea = element.find('textarea')[0];

        function copy(value) {
            textarea.value = value;
            textarea.select();
            document.execCommand('copy');
            textarea.value = '';
        }
    }
}
