'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies"];
    let monitorController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies) {
        let $translate = $filter('translate');
        let vm = this;

        // For debugging:
        window.monitorVM = vm;

        // declare constant
        vm.proposalStatusList = {
            PREPENDING: "PrePending",
            PENDING: "Pending",
            PROCESSING: "Processing",
            SUCCESS: "Success",
            FAIL: "Fail",
            CANCEL: "Cancel",
            EXPIRED: "Expired",
            UNDETERMINED: "Undetermined"
        };
        vm.topUpTypeList = {
            MANUAL: 1,
            ONLINE: 2,
            ALIPAY: 3,
            WECHAT: 4,
            QUICKPAY: 5
        };

        vm.seleDataType = {};

        vm.setPlatform = function (platObj) {
            vm.operSelPlatform = false;
            vm.selectedPlatform = JSON.parse(platObj);
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            // vm.loadPage(vm.showPageName); // 5
            $scope.safeApply();
        };

        vm.setPlatformById = function (id) {
            let platObj = vm.platformList.filter(p => p._id === id)[0];
            console.log("platObj:", platObj);
            vm.showPageName = '';
            vm.setPlatform(JSON.stringify(platObj));
        };

        vm.getPlatformByAdminId = function (adminId) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: adminId}, function (data) {
                    vm.platformList = data.data;
                    console.log("platformList", vm.platformList);
                    $scope.safeApply();
                    resolve();
                }, function (err) {
                    console.error(err);
                    resolve();
                });
            });
        };

        vm.selectStoredPlatform = function () {
            if (vm.platformList.length == 0) return;
            let storedPlatform = $cookies.get("platform");
            let selectedPlatform = {};

            if (storedPlatform) {
                vm.platformList.forEach(
                    platform => {
                        if (platform.name == storedPlatform) {
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
            $scope.safeApply();
        };

        vm.getPlatformProvider = function (id) {
            if (!id) return;
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: id}, function (data) {
                vm.allProviders = data.data.gameProviders;
                console.log('vm.allProviders', data.data.gameProviders);
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        };

        vm.getProposalTypeByPlatformId = function (allPlatformId) {
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: allPlatformId}, function (data) {
                vm.allProposalType = data.data;
                vm.allProposalType.sort(
                    function (a, b) {
                        if (vm.getProposalTypeOptionValue(a) > vm.getProposalTypeOptionValue(b)) return 1;
                        if (vm.getProposalTypeOptionValue(a) < vm.getProposalTypeOptionValue(b)) return -1;
                        return 0;
                    }
                );
                console.log("vm.allProposalType:", vm.allProposalType);
                $scope.safeApply();
            }, function (error) {
                console.error(error);
            });
        };

        vm.getProposalTypeOptionValue = function (proposalType) {
            var result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };

        vm.getPlayerLevelByPlatformId = function (id) {
            socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {platformId: id}, function (data) {
                vm.playerLvlData = {};
                if (data.data) {
                    $.each(data.data, function (i, v) {
                        vm.playerLvlData[v._id] = v;
                    })
                }
                console.log("vm.playerLvlData", vm.playerLvlData);

                $scope.safeApply();
            }, function (data) {
                console.error("cannot get player level", data);
            });
        };

        vm.getRewardList = function (callback) {
            vm.rewardList = [];
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform._id}, function (data) {
                vm.rewardList = data.data;
                console.log('vm.rewardList', vm.rewardList);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        };

        vm.loadPage = function (choice) {
            vm.seleDataType[choice] = 'bg-bright';

            switch (choice) {
                case 'PAYMENT_MONITOR':
                    vm.pageName = "Payment Monitor";
                    vm.preparePaymentMonitorPage();
                    // todo :: do something
                    break;
                default:
                    // keeping this format just in case there will be other monitoring coming in
            }
        };

        vm.preparePaymentMonitorPage = function () {
            vm.paymentMonitorQuery = {};
            vm.paymentMonitorQuery.totalCount = 0;
            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];

                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                }
            );

            utilService.actionAfterLoaded("#paymentMonitorTablePage", function () {
                vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery')
                vm.paymentMonitorQuery.merchantType = null;
                // vm.paymentMonitorQuery.pageObj = utilService.createPageForPagingTable("#topupTablePage", {}, $translate, function (curP, pageSize) {
                //     vm.commonPageChangeHandler(curP, pageSize, "paymentMonitorQuery", vm.searchTopupRecord)
                // });
                $scope.safeApply();
            })

        };

        vm.commonInitTime = function (obj, queryId) {
            if (!obj) return;
            obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
            var lastMonth = utilService.setNDaysAgo(new Date(), 1);
            var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            obj.startTime.data('datetimepicker').setLocalDate(new Date(lastMonthDateStartTime));

            obj.endTime = utilService.createDatePicker(queryId + ' .endTime');
            obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
        }





        function getMerchantList() {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getMerchantList', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data.data && data.data.merchants) {
                        resolve(data.data.merchants);
                    }
                }, function (error) {
                    console.error('merchant list', error);
                    resolve([]);
                });
            });
        }

        function getMerchantTypeList() {
            return new Promise(function (resolve, reject) {
                socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                    if (data.data && data.data.merchantTypes) {
                        resolve(data.data.merchantTypes);
                    }
                }, function (error) {
                    console.error('merchant list', error);
                    resolve([]);
                });
            });
        }

        function getMerchantGroups(merchants, merchantTypes) {
            let merchantGroupList = {};
            let merchantGroupNames = {};

            merchants.forEach(item => {
                if (item.status != 'DISABLED') {
                    merchantGroupList[item.merchantTypeId] = merchantGroupList[item.merchantTypeId] || {list: []};
                    merchantGroupList[item.merchantTypeId].list.push(item.merchantNo);
                }
            });

            merchantTypes.forEach(mer => {
                merchantGroupNames[mer.merchantTypeId] = mer.name;
            });

            let merchantGroups = [];
            for (let merchantTypeId in merchantGroupList) {
                let list = merchantGroupList[merchantTypeId];
                let name = merchantGroupNames[merchantTypeId];
                merchantGroups.push({
                    name: name,
                    list: list
                });
            }

            return merchantGroups;
        }

        function getMerchantNumbers(merchants) {
            let merchantNumbers = {};
            merchants.forEach(merchant => {
                merchantNumbers[merchant.merchantNo] = merchant.name;
            });
        }



        $scope.$on('$viewContentLoaded', function () {
            vm.hideLeftPanel = false;

            setTimeout(function () {
                vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
            });
        });
    };

    monitorController.$inject = injectParams;

    myApp.register.controller('monitorCtrl', monitorController);
});