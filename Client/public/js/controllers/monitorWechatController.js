'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorWechatController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies, commonService) {
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let vm = this;

        window.VM = vm;

        // declare constant
        vm.seleDataType = {};
        vm.platformByAdminId= [];

        $scope.$on('setPlatform', function () {
            vm.setPlatform();
        });

        vm.setPlatform = function () {
            // vm.operSelPlatform = false;
            // vm.selectedPlatform = JSON.parse(platObj);
            vm.selectedPlatform = $scope.$parent.vm.selectedPlatform;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage("PAYMENT_MONITOR"); // 5
            $scope.safeApply();
        };

        vm.getPlatformByAdminId = function() {
            if(authService && authService.adminId){
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.platformByAdminId = data.data;
                    })
                }, function (error){
                    console.error(error);
                });
            }
        };

        vm.getWCGroupControlSessionDeviceNickName = function () {
            vm.deviceNicknameList = [];
            return $scope.$socketPromise('getWCGroupControlSessionDeviceNickName', {platformObjId: vm.selectedPlatform._id}).then(function (data) {
                vm.deviceNicknameList = data.data;
                console.log('vm.deviceNicknameList ', vm.deviceNicknameList);
                $scope.$evalAsync();
            });
        };

        vm.getWCGroupControlDepartmentList = function () {
            vm.wechatGroupControlDepartmentList = [];
            return $scope.$socketPromise('getWCDepartmentDetailByPlatformObjId', {platformObjId: vm.selectedPlatform._id, adminId: authService.adminId}).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.wechatGroupControlDepartmentList = data.data;
                    console.log('vm.wechatGroupControlDepartmentList ', vm.deviceNicknameList);

                    if (vm.wechatGroupControlDepartmentList && vm.wechatGroupControlDepartmentList.length > 0) {
                        let departmentIds = vm.wechatGroupControlDepartmentList.map(x => x._id);
                        Promise.all([vm.getWCAdminDetailByDepartmentIds(departmentIds)]).then(
                            data => {
                                setTimeout(function () {
                                    vm.setupAdminMutliSelect();
                                });
                                $scope.$evalAsync();
                            }
                        )
                    }
                });
            });
        };

        vm.getWCAdminDetailByDepartmentIds = function (departmentIds) {
            vm.wechatGroupControlAdminList = [];
            if (departmentIds && departmentIds.length > 0) {
                return $scope.$socketPromise('getWCAdminDetailByDepartmentIds', {departmentObjIds: departmentIds}).then(function (data) {
                    vm.wechatGroupControlAdminList = data.data;
                    console.log('vm.wechatGroupControlAdminList ', vm.wechatGroupControlAdminList);
                    $scope.$evalAsync();
                });
            }
        }

        vm.loadPage = function (pageName) {
            socketService.clearValue();

            Promise.all([vm.getWCGroupControlSessionDeviceNickName(), vm.getWCGroupControlDepartmentList()]).then(
                data => {
                    setTimeout(function () {
                        vm.setupMultiSelect();
                    });
                }
            );
        };

        vm.setupMultiSelect = function () {
            utilService.actionAfterLoaded(('#wechatGroupControlMonitor'), function () {
                $('select#selectWechatGroupControlDepartment').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi = ($('select#selectWechatGroupControlDepartment').next().find('.ms-choice'))[0];

                $('select#selectWechatGroupControlDepartment').next().on('click', 'li input[type=checkbox]', function () {

                    if (vm.wechatGroupControlMonitorQuery && vm.wechatGroupControlMonitorQuery.department) {
                        Promise.all([vm.getWCAdminDetailByDepartmentIds(vm.wechatGroupControlMonitorQuery.department)]).then(
                            data => {
                                setTimeout(function () {
                                    vm.setupAdminMutliSelect();
                                });
                                $scope.$evalAsync();
                            }
                        )
                    }

                    let upText = $($multi).text().split(',').map(item => {
                        let textShow = '';
                        vm.wechatGroupControlDepartmentList.forEach(department => {
                            if (department && department._id && item && (department._id.toString() == item.trim().toString())) {
                                textShow = department.departmentName;
                            } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                textShow = item;
                            }
                        });
                        return textShow;
                    }).join(',');
                    $($multi).find('span').text(upText);
                });
                $("select#selectWechatGroupControlDepartment").multipleSelect("checkAll");

                $('select#selectWechatGroupControlDeviceNickName').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi2 = ($('select#selectWechatGroupControlDeviceNickName').next().find('.ms-choice'))[0];
                $('select#selectWechatGroupControlDeviceNickName').next().on('click', 'li input[type=checkbox]', function () {
                    let upText2 = $($multi2).text().split(',').map(item => {
                        return item;
                    }).join(',');
                    $($multi2).find('span').text(upText2);
                });
                $("select#selectWechatGroupControlDeviceNickName").multipleSelect("checkAll");
                $scope.$evalAsync();
            });
        };

        vm.setupAdminMutliSelect = function () {
            utilService.actionAfterLoaded(('#selectWechatGroupControlDepartment'), function () {
                $('select#selectWechatGroupControlAdminId').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi1 = ($('select#selectWechatGroupControlAdminId').next().find('.ms-choice'))[0];
                $('select#selectWechatGroupControlAdminId').next().on('click', 'li input[type=checkbox]', function () {
                    let upText1 = $($multi1).text().split(',').map(item => {
                        let textShow = '';
                        vm.wechatGroupControlAdminList.forEach(admin => {
                            if (admin && admin._id && item && (admin._id.toString() == item.trim().toString())) {
                                textShow = admin.adminName;
                            } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                textShow = item;
                            }
                        });
                        return textShow;
                    }).join(',');
                    $($multi1).find('span').text(upText1);
                });
                $("select#selectWechatGroupControlAdminId").multipleSelect("checkAll");
                $scope.$evalAsync();
            });
        };



        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });

        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};
            setTimeout(function () {
                // vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
                socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                    if (data && data.data && data.data.data) {
                        console.log('banktype', data.data.data);
                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId) {
                                vm.allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                            }
                        })
                    }
                });

                let countDown = -1;
                clearInterval(vm.refreshInterval);
                vm.refreshInterval = setInterval(function () {
                    var item = $('#autoRefreshProposalFlag');
                    var isRefresh = item && item.length > 0 && item[0].checked;
                    var mark = $('#timeLeftRefreshOperation')[0];
                    $(mark).parent().toggleClass('hidden', countDown < 0);
                    if (isRefresh) {
                        if (countDown < 0) {
                            countDown = 11
                        }
                        if (countDown === 0) {
                            vm.getPaymentMonitorRecord();
                            countDown = 11;
                        }
                        countDown--;
                        $(mark).text(countDown);
                    } else {
                        countDown = -1;
                    }
                    if (window.location.pathname != '/monitor/payment') {
                        clearInterval(vm.refreshInterval);
                    }
                    else if (!vm.paymentMonitorQuery) {
                        vm.loadPage();
                    }
                }, 1000);
            });
        });
    };

    monitorWechatController.$inject = injectParams;

    myApp.register.controller('monitorWechatCtrl', monitorWechatController);
});
