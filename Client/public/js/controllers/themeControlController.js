'use strict';

define(['js/app'], function (myApp) {
    let themeControlController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants, commonService) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;

        vm.updatePageTile = function () {
            window.document.title = $translate("themeControl") + "->" + $translate(vm.themeControlPageName);
        };

        vm.toggleShowPlatformList = function (flag) {
            $scope.$evalAsync(() => {
                if (flag) {
                    vm.leftPanelClass = 'widthto25';
                    vm.rightPanelClass = 'widthto75';
                    vm.showPlatformList = true;
                } else {
                    vm.leftPanelClass = 'widthto5 subAll0';
                    vm.rightPanelClass = 'widthto95';
                    vm.showPlatformList = false;
                }
                $cookies.put("themeControlShowLeft", vm.showPlatformList);
            });
        };
    };

    let injectParams = [
        '$sce',
        '$compile',
        '$scope',
        '$filter',
        '$location',
        '$log',
        'authService',
        'socketService',
        'utilService',
        'CONFIG',
        "$cookies",
        "$timeout",
        '$http',
        'uiGridExporterService',
        'uiGridExporterConstants',
        'commonService'
    ];

    themeControlController.$inject = injectParams;
    myApp.register.controller('themeControlCtrl', themeControlController);
});