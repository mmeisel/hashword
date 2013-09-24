var OptionsCtrl = ['$scope', function ($scope) {
    $scope.columns = [ 'Domain', 'Password Length', 'Use Symbols', 'Generation', 'Notes' ];
    $scope.keyOrder = [ 'pwLength', 'symbols', 'generation', 'notes' ];
    
    chrome.storage.local.get(null, function (items) {
        $scope.allSettings = items;
        $scope.$digest();
    });
}];
