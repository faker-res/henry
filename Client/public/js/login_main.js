require.config({
    baseUrl: '',
    urlArgs: 'v=1.1'
});

require(
    [
        'js/login',
        'js/config',
        'js/services/authService',
        'js/services/socketService'
    ],
    function () {
        angular.bootstrap(document, ['myApp']);
    });