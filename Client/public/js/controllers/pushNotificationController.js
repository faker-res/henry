'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies"];

    var pushNotificationController = function ($compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;
    };
    pushNotificationController.$inject = injectParams;
    myApp.register.controller('pushNotificationCtrl', pushNotificationController);
});
