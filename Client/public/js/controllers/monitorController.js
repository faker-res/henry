'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies"];
    let monitorController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies) {
        let $translate = $filter('translate');
        let vm = this;

        window.monitorVM = vm;

        vm.seleDataType = {};
        vm.showPlatformList = true;

        vm.setPlatform = function (platObj) {
            $scope.$evalAsync(() => {
                vm.operSelPlatform = false;
                vm.selectedPlatform = JSON.parse(platObj);
                vm.curPlatformId = vm.selectedPlatform._id;
                $cookies.put("platform", vm.selectedPlatform.name);
                console.log('vm.selectedPlatform', vm.selectedPlatform);
                vm.loadPage(vm.showPageName);
                $scope.$broadcast('setPlatform');
            });
        };

        vm.setPlatformById = function (id) {
            let platObj = vm.platformList.filter(p => p._id === id)[0];
            console.log("platObj:", platObj);
            vm.showPageName = '';
            vm.setPlatform(JSON.stringify(platObj));
        };

        vm.getPlatformByAdminId = function (adminId) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {
                    adminId: adminId
                }, function (data) {
                    vm.platformList = data.data;
                    console.log("platformList", vm.platformList);
                    resolve();
                }, function (err) {
                    console.error(err);
                    resolve();
                });
            });
        };

        vm.setPanel = function (isSet) {
            vm.hideLeftPanel = isSet;
            $cookies.put("reportShowLeft", vm.hideLeftPanel);
            $scope.resetTableSize('#monitorRightTable','#paymentMonitorTable');
            $scope.resetTableSize('#monitorRightTable','#paymentMonitorTotalTable');
        };

        vm.selectStoredPlatform = function () {
            if (!vm.platformList || vm.platformList.length === 0) return;
            let storedPlatform = $cookies.get("platform");
            let selectedPlatform = {};

            if (storedPlatform) {
                vm.platformList.forEach(
                    platform => {
                        if (platform.name === storedPlatform) {
                            selectedPlatform = platform;
                        }
                    }
                );
            } else {
                selectedPlatform = vm.platformList[0];
            }

            vm.selectedPlatform = selectedPlatform;
            vm.selectedPlatformID = selectedPlatform._id;
            vm.setPlatform(JSON.stringify(selectedPlatform));
            // $scope.safeApply();
        };


        vm.loadPage = function (choice) {
            if(choice){
                socketService.clearValue();
                vm.seleDataType = {};
                vm.seleDataType[choice] = 'bg-bright';
            }else if(window.location.pathname == "/monitor/payment"){
                vm.seleDataType["PAYMENT_MONITOR"] = 'bg-bright';
                vm.pageName = "PAYMENT_MONITOR";
            }else if(window.location.pathname == "/monitor/paymentTotal"){
                vm.seleDataType["PAYMENT_MONITOR_TOTAL"] = 'bg-bright';
                vm.pageName = "PAYMENT_MONITOR_TOTAL";
            }else if(window.location.pathname == "/monitor/wechatGroup") {
                vm.seleDataType["WECHAT_GROUP_CONTROL_MONITOR"] = 'bg-bright';
                $('#wechatMonitor.collapse').addClass('in');
                $('#paymentMonitor.collapse').removeClass('in');
                vm.pageName = "WECHAT_GROUP_CONTROL_MONITOR";
            }else if(window.location.pathname == "/monitor/qqGroup") {
                vm.seleDataType["QQ_GROUP_CONTROL_MONITOR"] = 'bg-bright';
                $('#qqMonitor.collapse').addClass('in');
                $('#paymentMonitor.collapse').removeClass('in');
                vm.pageName = "QQ_GROUP_CONTROL_MONITOR";
            }else if(window.location.pathname == "/monitor/consumptionRecord") {
                vm.seleDataType["CONSUMPTION_RECORD_MONITOR"] = 'bg-bright';
                vm.pageName = "CONSUMPTION_RECORD_MONITOR";
            }else if(window.location.pathname == "/monitor/attemptCreate") {
                vm.seleDataType["ATTEMPT_CREATE_MONITOR"] = 'bg-bright';
                vm.pageName = "ATTEMPT_CREATE_MONITOR";
            }else if(window.location.pathname == "/monitor/winner") {
                vm.seleDataType["WINNER_MONITOR"] = 'bg-bright';
                vm.pageName = "winnerMonitor";
            }else if(Object.keys(vm.seleDataType).length === 0){
                vm.seleDataType["PAYMENT_MONITOR"] = 'bg-bright';
            }
        };

        $scope.$on("$viewContentLoaded", function (e, d) {
            vm.hideLeftPanel = false;
            if (!$scope.AppSocket) {
                $scope.$emit('childControllerLoaded', 'monitorControllerLoaded');
            }
            if (d == "@monitor") {
                if ($scope.AppSocket && $scope.AppSocket.connected) {
                    $scope.$broadcast('socketReady', 'monitorControllerSocketReady');
                }
            }
        });
        $scope.$on("socketConnected", function (e, d) {
            if (!$scope.AppSocket) {
                $scope.$emit('childControllerLoaded', 'monitorControllerLoaded');
            }
            $scope.$broadcast('socketReady', 'monitorControllerSocketReady');
        });
        $scope.$on("childchildControllerLoaded", function (e, d) {
            if ($scope.AppSocket) {
                vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
            }
        })

        $scope.$on("switchPlatform", () => {
            $scope.$evalAsync(vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform));
        });
    };

    monitorController.$inject = injectParams;

    myApp.register.controller('monitorCtrl', monitorController);
});