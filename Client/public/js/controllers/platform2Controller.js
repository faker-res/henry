'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies"];

    var platform2Controller = function ($compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies) {
        var vm = this;
        console.log("bbbbbbbbbbbb");
        // For debugging:
        window.VM = vm;
        $scope.$on('myCustomEvent', function (event, data) {
            debugger
            console.log("myCustomEvent: " + data); // 'Data to send'
        });
        vm.lala = function () {
            $scope.$broadcast('appSocketConnected', $scope.AppSocket);
        }
        // socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
        //     console.log('all platform data', data.data);
        //     vm.allPlatformData = data.data;
        //     if (data.data) {
        //         vm.buildPlatformList(data.data);
        //     }
        //     $('#platformRefresh').removeClass('fa-spin');
        //
        //     $('#platformRefresh').addClass('fa-check');
        //     $('#platformRefresh').removeClass('fa-refresh');
        //     setTimeout(function () {
        //         $('#platformRefresh').removeClass('fa-check');
        //         $('#platformRefresh').addClass('fa-refresh').fadeIn(100);
        //     }, 1000);
        //
        //     //select platform from cookies data
        //     var storedPlatform = $cookies.get("platform");
        //     if (storedPlatform) {
        //         vm.searchAndSelectPlatform(storedPlatform, option);
        //     }
        //
        // }, function (err) {
        //     $('#platformRefresh').removeClass('fa-spin');
        // });
    };
    platform2Controller.$inject = injectParams;
    myApp.register.controller('platform2Ctrl', platform2Controller);
});
