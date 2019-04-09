'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorWinnerController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies, commonService) {
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let vm = this;

        window.VM = vm;

        // declare constant

        vm.seleDataType = {};
        vm.platformByAdminId= [];
        vm.commonTableOption = {
            dom: 'Zrtlp',
            "autoWidth": true,
            "scrollX": true,
            columnDefs: [{targets: '_all', defaultContent: ' '}],
            "scrollCollapse": true,
            "destroy": true,
            "paging": false,
            "language": {
                "emptyTable": $translate("No data available in table"),
            },
        };

        $scope.$on('setPlatform', function () {
            vm.setPlatform();
        });

        vm.setPlatform = function () {
            vm.selectedPlatform = $scope.$parent.vm.selectedPlatform;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            // vm.getCredibilityRemarksByPlatformId(vm.selectedPlatform._id);
            commonService.getSMSTemplate($scope, vm.selectedPlatform._id).then(data => {
                if (data) {
                    vm.smsTemplate = data ? data : [];
                }
            }).catch(() => Promise.resolve([]));
            initPageParam();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage("WINNER_MONITOR"); // 5
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

        vm.getPeriod = (hours) => {
            hours = hours || 24;
            let endTime = new Date();
            endTime.setHours(new Date().getHours()+1);
            endTime.setMinutes(0);
            endTime.setSeconds(0);
            endTime.setMilliseconds(0);

            let startTime = new Date();
            startTime.setHours(new Date().getHours() - hours + 1);
            startTime.setMinutes(0);
            startTime.setSeconds(0);
            startTime.setMilliseconds(0);

            return {startTime, endTime};
        };

        vm.updateQueryTime = () => {
            vm.winnerMonitorQuery = vm.winnerMonitorQuery || {hours: 24};
            vm.winnerMonitorQuery.hours = vm.winnerMonitorQuery.hours || 24;

            let period = vm.getPeriod(vm.winnerMonitorQuery.hours);
            vm.winnerMonitorQuery.startTime = period.startTime;
            vm.winnerMonitorQuery.endTime = period.endTime;
        };

        vm.resetWinnerMonitorQuery = () => {
            initPageParam();
        };

        vm.getWinnerMonitorRecord = (newSearch) => {
            $('#winnerMonitorTableSpin').show();
            vm.timerCountDown = 11;
            let period = vm.getPeriod(vm.winnerMonitorQuery.hours);
            vm.winnerMonitorQuery.startTime = period.startTime;
            vm.winnerMonitorQuery.endTime = period.endTime;

            let sendQuery = {
                playerName: vm.winnerMonitorQuery.playerName,
                providerObjId: vm.winnerMonitorQuery.provider,
                platformObjId: vm.selectedPlatform._id,
                startTime: vm.winnerMonitorQuery.startTime,
                endTime: vm.winnerMonitorQuery.endTime
            };

            return $scope.$socketPromise("getWinnerMonitorData", sendQuery).then(
                data => {
                    console.log('getWinnerMonitorData', data);
                    vm.winnerMonitorData = data.data;
                    vm.drawWinnerMonitorTable(vm.winnerMonitorData);

                }
            )



        };

        vm.drawWinnerMonitorTable = (data) => {
            if (!data || !data.length) {
                data = [];
                $('#winnerMonitorTableSpin').hide();
            }
            data.map(
                record => {
                    record.playerName$ = record.player && record.player.name || "";
                    record.playerLevelName$ = record.player && record.player.playerLevel && record.player.playerLevel.name || "";
                    if (record.player && record.player.credibilityRemarks && record.player.credibilityRemarks.length) {
                        record.credibilityRemarks$ = record.player.credibilityRemarks.map(
                            remark => {
                                return remark.name || "";
                            }
                        )
                    }
                    else {
                        record.credibilityRemarks$ = [];
                    }
                    record.providerName$ = record.provider && record.provider.name || "";
                    record.consumptionAmount$ = $noRoundTwoDecimalPlaces(record.consumptionAmount);
                    record.consumptionValidAmount$ = $noRoundTwoDecimalPlaces(record.consumptionValidAmount);
                    record.consumptionBonusAmount$ = $noRoundTwoDecimalPlaces(record.consumptionBonusAmount);
                    record.bonusValidRatio$ = $noRoundTwoDecimalPlaces(record.bonusValidRatio*-1) + "%";
                }
            );

            vm.winnerMonitorQuery.totalCount = data.length;

            let tableOptions = {
                data: data,
                "order": vm.winnerMonitorQuery.aaSorting || [[7, 'desc']],
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYER_NAME'), data: "playerName$"},
                    {title: $translate("LEVEL"), data: "playerLevelName$"},
                    {
                        title: $translate("CREDIBILITY_REMARK"),
                        data: "credibilityRemarks$",
                        render: (data, type, row) => {
                            let output = "";
                            if (!data || !data.length) {
                                return "";
                            }
                            data.map(function (remarkName) {
                                output += remarkName;
                                output += "<br>";
                            });
                            return output;
                        }
                    },
                    {title: $translate("GAME_PROVIDER"), data: "providerName$"},
                    {title: $translate("TIMES_CONSUMED"), data: "consumptionTimes"},
                    {title: $translate("TOTAL_CONSUMPTION"), data: "consumptionAmount$"},
                    {title: $translate("VALID_CONSUMPTION"), data: "consumptionValidAmount$"},
                    {title: $translate("PLAYER_PROFIT_AMOUNT"), data: "consumptionBonusAmount$"},
                    {title: $translate("COMPANY_EARNING_RATIO"), data: "bonusValidRatio$"},
                    {
                        title: "",
                        data: "",
                        render: (data, type, row) => {
                            return `<a ng-click="vm.getRowDetail('${row._id}')">${$translate("DETAILS")}</a>`;
                        }
                    }
                ],
                "autoWidth": false,
                "paging": false,
                // fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                //
                // },
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };

            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.winnerMonitorTable = utilService.createDatatableWithFooter('#winnerMonitorTable', tableOptions, {}, true);

            // $('#winnerMonitorTable').off('order.dt');
            // $('#winnerMonitorTable').on('order.dt', function (event, a, b) {
            //     vm.commonSortChangeHandler(a, 'winnerMonitorQuery', vm.getWinnerMonitorRecord);
            // });
            $('#winnerMonitorTable').resize();

            $('#winnerMonitorTableSpin').hide();
            $scope.$evalAsync();
        };

        vm.loadPage = function () {
            socketService.clearValue();
            if (window.location.pathname == "/monitor/winner") {
                vm.pageName = "winnerMonitor";
            }
        };

        vm.getRowDetail = (id) => {
            vm.winnerMonitorData = vm.winnerMonitorData || [];
            let row = vm.winnerMonitorData.find(record => {
                return record._id == id;
            });
            console.log('row', row);

            if (!row) {
                return;
            }

            vm.selectedRecord = row;

            vm.selectedRecord.registrationTime$ = utilService.$getTimeFromStdTimeFormat(new Date(vm.selectedRecord.player.registrationTime));

            vm.recordCityReady = false;
            vm.getCityName(vm.selectedRecord.player.bankCardCity).then(
                cityName => {
                    vm.selectedRecord.bankAccountCity$ = cityName;
                    vm.recordCityReady = true;
                    $scope.$evalAsync();
                }
            );

            vm.recordLastWithdrawalTimeReady = false;
            vm.getLastWithdrawalTime(vm.selectedRecord.player._id).then(
                withdrawal => {
                    vm.selectedRecord.lastWithdrawalTime$ = withdrawal.lastWithdrawalTime ? utilService.$getTimeFromStdTimeFormat(withdrawal.lastWithdrawalTime) : "-";
                    vm.selectedRecord.withdrawalProposalId$ = withdrawal.proposalId || "-";
                    vm.recordLastWithdrawalTimeReady = true;
                    $scope.$evalAsync();
                }
            );

            vm.recordCreditReady = false;
            vm.getTotalPlayerCreditNumber(vm.selectedRecord.player._id).then(
                credit => {
                    vm.selectedRecord.playerCredit$ = $noRoundTwoDecimalPlaces(credit);
                    vm.recordCreditReady = true;
                    $scope.$evalAsync();
                }
            );

            vm.consumptionTimesReady = false;
            vm.getConsumptionTimesByTime(vm.selectedRecord.player._id).then(
                data => {
                    vm.selectedRecord.belowHundred$ = data.belowHundred;
                    vm.selectedRecord.belowThousand$ = data.belowThousand;
                    vm.selectedRecord.belowTenThousand$ = data.belowTenThousand;
                    vm.selectedRecord.belowHundredThousand$ = data.belowHundredThousand;
                    vm.selectedRecord.aboveHundredThousand$ = data.aboveHundredThousand;
                    vm.consumptionTimesReady = true;
                    $scope.$evalAsync();
                }
            );

            vm.threeMonthSummaryReady = false;

            vm.getThreeMonthPlayerCreditSummary(vm.selectedRecord.player._id).then(
                data => {
                    vm.selectedRecord.lastThreeMonthValue = data.lastThreeMonthValue;
                    vm.selectedRecord.lastThreeMonthTopUp = data.lastThreeMonthTopUp;
                    vm.selectedRecord.lastThreeMonthWithdraw = data.lastThreeMonthWithdraw;
                    vm.selectedRecord.lastThreeMonthTopUpWithdrawDifference = data.lastThreeMonthTopUpWithdrawDifference;
                    vm.selectedRecord.lastThreeMonthConsumptionAmount = data.lastThreeMonthConsumptionAmount;

                    vm.threeMonthSummaryReady = true;
                    $scope.$evalAsync();
                }
            );

            $("#modalRecordDetail").modal();
        };

        vm.getCityName = function (cityId) {
            return $scope.$socketPromise("getCity", {cityId: cityId}).then(
                data => {
                    return data && data.data && data.data.city && data.data.city.name ? data.data.city.name : cityId;
                }
            );
        };

        vm.getLastWithdrawalTime = function(playerObjId) {
            return $scope.$socketPromise("getLastWithdrawalTime", {playerObjId: playerObjId}).then(
                data => {
                    return data.data;
                }
            );
        };

        vm.getTotalPlayerCreditNumber = function(playerObjId) {
            return $scope.$socketPromise("getTotalPlayerCreditNumber", {playerObjId: playerObjId}).then(
                data => {
                    return data.data;
                }
            );
        };

        vm.getConsumptionTimesByTime = function(playerObjId) {
            return $scope.$socketPromise("getConsumptionTimesByTime", {playerObjId: playerObjId, startTime: vm.winnerMonitorQuery.startTime, endTime: vm.winnerMonitorQuery.endTime}).then(
                data => {
                    return data.data;
                }
            );
        };

        vm.getThreeMonthPlayerCreditSummary = function(playerObjId) {
            return $scope.$socketPromise("getThreeMonthPlayerCreditSummary", {playerObjId: playerObjId}).then(
                data => {
                    return data.data;
                }
            );
        };

        vm.debugSummaryRecord = function () {
            return $scope.$socketPromise("debugConsumptionHourSummaryRecord", {platformObjId: vm.selectedPlatform._id, startTime: vm.winnerMonitorQuery.startTime, endTime: vm.winnerMonitorQuery.endTime}).then(
                data => {
                    console.log("debugConsumptionHourSummaryRecord", data);
                }
            );
        };

        function initPageParam() {
            vm.winnerMonitorQuery = {hours: 24};
            vm.updateQueryTime();
        }

        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });

        $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');

        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};
            setTimeout(function () {
                vm.timerCountDown = -1;
                clearInterval(vm.refreshInterval);
                vm.refreshInterval = setInterval(function () {
                    let item = $('#autoRefreshProposalFlag');
                    let isRefresh = item && item.length > 0 && item[0].checked;
                    let mark = $('#timeLeftRefreshOperation')[0];
                    $(mark).parent().toggleClass('hidden', vm.timerCountDown < 0);
                    if (isRefresh) {
                        if (vm.timerCountDown < 0) {
                            vm.timerCountDown = 11
                        }
                        if (vm.timerCountDown === 0) {
                            vm.getWinnerMonitorRecord();
                            vm.timerCountDown = 11;
                        }
                        vm.timerCountDown--;
                        $(mark).text(vm.timerCountDown);
                    } else {
                        vm.timerCountDown = -1;
                    }
                    if (window.location.pathname != '/monitor/winner') {
                        clearInterval(vm.refreshInterval);
                    }
                    else if (!vm.winnerMonitorQuery) {
                        vm.loadPage();
                    }
                }, 1000);
            });
        });
    };

    monitorWinnerController.$inject = injectParams;

    myApp.register.controller('monitorWinnerCtrl', monitorWinnerController);
});
