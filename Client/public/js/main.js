require.config({
    baseUrl: '',
    urlArgs: 'v=1.1',
    waitSeconds: 0
});

require(
    [
        'js/app',
        'js/config',
        'js/services/routeResolver',
        'js/services/authService',
        'js/services/socketService',
        'js/services/utilService'
    ],
    function () {
        angular.bootstrap(document, ['myApp']);
    });