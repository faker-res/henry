'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'CONFIG', 'utilService', '$timeout'];

    var analysisController = function ($scope, $filter, $location, $log, authService, socketService, CONFIG, utilService, $timeout) {
        var $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        var vm = this;

        // For debugging:
        // window.VM = vm;

        vm.allNewPlayerType = {
            1: "allNewRegistrationCount",
            2: "rechargedPlayer",
            3: "multipleTopUpPlayer",
            4: "Valid Player"
        };

        vm.clientSourcePara = {
            accessType: ["register", "login"]
        };

        vm.constPlayerTopUpTypes = {
            MANUAL: "MANUAL",
            ONLINE: "ONLINE",
            ALIPAY: "ALIPAY",
            WECHAT: "WECHAT",
            QUICKPAY: "QUICKPAY"
        };

        // For debugging:
        window.VM = vm;

        vm.selectPlatform = function (id) {
            vm.operSelPlatform = false;
            vm.platformOverviewClass = 'btn-primary';
            $.each(vm.platformList, function (i, v) {
                if (v._id == id) {
                    vm.selectedPlatform = v;
                    console.log('vm.selectedPlatform', vm.selectedPlatform);
                    $scope.safeApply();
                    return;
                }
            });
            vm.showPageName = "NEW_PLAYER";
            vm.getPlatformProvider(id);
        }
        vm.loadPage = function (choice) {
            socketService.clearValue();
            vm.platformOverviewClass = 'btn-danger';
            vm.showPageName = choice;
            $scope.safeApply();
        }
        vm.loadPageFunc = function (choice) {
            $timeout(function () {
                switch (choice) {
                    case "PLATFORM_OVERVIEW":
                        vm.initSearchParameter('allActivePlayer', null, 4, function () {
                            vm.queryPara.allActivePlayer = {date: utilService.getNdayagoStartTime(1)}
                        });

                        vm.initSearchParameter('allNewPlayer', true, 4);
                        vm.initSearchParameter('allPlayerConsumption', true, 4);
                        vm.initSearchParameter('allPlayerBonus', true, 4);
                        vm.initSearchParameter('allPlayerTopup', true, 4);
                        vm.initSearchParameter('allApiResponseTime', true, 1);

                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('Platform'),
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT'),
                            }],
                        }

                        socketService.$socket($scope.AppSocket, 'getApiLoggerAllServiceName', {service: 'player'},
                            function success(data) {
                                console.log('get func name', data);
                                vm.apiRespServiceNames = data.data || [];
                                if (vm.apiRespServiceNames.length > 0) {
                                    vm.queryPara.allApiResponseTime.service = vm.apiRespServiceNames[0];
                                    vm.updateApiResponseFuncNames(vm.queryPara.allApiResponseTime.service, function (data1) {
                                        console.log('vm.apiRespFuncNames', vm.apiRespFuncNames);
                                        vm.queryPara.allApiResponseTime.funcName = vm.apiRespFuncNames[0];
                                        vm.plotAllPlatformApiResponseTime();
                                        $scope.safeApply();
                                    });
                                }
                            });

                        vm.plotAllPlatformActivePlayerPie();
                        vm.plotAllPlatformNewPlayerPie();
                        vm.plotAllPlatformCreditPie();
                        vm.plotAllPlatformTopUpPie();
                        vm.plotAllPlatformPlayerBonusPie();
                        break;
                    case "NEW_PLAYER":
                        vm.platformNewPlayerAnalysisSort = {};
                        vm.initSearchParameter('newPlayer', 'day', 3);
                        vm.getPartnerLevelConfig();
                        //vm.plotNewPlayerLine();
                        break;
                    case "LOGIN_PLAYER":
                        vm.platformLoginPlayerAnalysisSort = {};
                        vm.initSearchParameter('loginPlayer', 'day', 3);
                        //vm.plotLoginPlayerLine();
                        break;
                    case "ACTIVE_PLAYER":
                        vm.platformActivePlayerAnalysisSort = {};
                        vm.initSearchParameter('activePlayer', 'day', 3);
                        //vm.plotActivePlayerLine();
                        break;
                    case "VALID_ACTIVE_PLAYER":
                        vm.platformValidActivePlayerAnalysisSort = {};
                        vm.initSearchParameter('validActivePlayer', 'day', 3);
                        //vm.plotValidActivePlayerLine();
                        break;
                    case "PEAK_HOUR":
                        // vm.plotPeakhourOnlinePlayerLine();
                        // vm.plotPeakhourCreditspendLine();
                        // vm.plotPeakhourTopupLine();
                        break;
                    case "PLAYER_PHONE_LOCATION":
                    case "PLAYER_IP_LOCATION":
                        vm.showCountryTable = true;
                        $.getScript("js/lib/ammap/ammap.js").done(
                            () => {
                                $.when(
                                    $.getScript("js/lib/ammap/worldHigh.js"),
                                    $.getScript("js/lib/ammap/chinaHigh.js"),
                                    $.getScript("js/lib/ammap/singaporeHigh.js"),
                                    $.getScript("js/lib/ammap/light.js"),
                                    $.getScript("js/lib/ammap/cityLocationData.js"),
                                    $.getScript("dataSource/data.js"),
                                    $.Deferred(function (deferred) {
                                        $(deferred.resolve);
                                    })
                                ).done(function (data, textStatus, jqxhr) {
                                    setTimeout(function () {
                                        vm.latlong = $.extend({}, latlong);
                                        vm.allCountryName = $.extend({}, AmCharts.maps.worldHigh.svg.g.path);
                                        vm.allProvinceId = {};
                                        AmCharts.maps.chinaHigh.svg.g.path.map(item => {
                                            vm.allProvinceId[item.hanTitle] = item.id;
                                            vm.allProvinceId[item.id] = item.hanTitle;
                                        });
                                        vm.initSearchParameter('playerLocation', true, 2, function (height) {
                                            vm.queryPara.playerLocation.player = 'all';
                                            vm.queryPara.playerLocation.date = 'lastAccessTime';
                                            var setHeight = height - 50;
                                            $(".analysisLocationTable").height(setHeight + "px");
                                            $scope.safeApply();
                                            //vm.playerLocationPage();
                                        });
                                    });
                                });
                            }
                        );
                        break;
                    case "REWARD_ANALYSIS":
                        vm.platformRewardAnalysisSort = {};
                        vm.selectReward = {};
                        vm.initSearchParameter('reward', 'day', 3);
                        vm.rewardAnalysisInit(vm.plotRewardLine);
                        break;
                    case "PLAYER_DEVICE_ANALYSIS":
                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('User Agent')
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT')
                            }]
                        };
                        vm.initSearchParameter('playerDevice', true, 2, function () {
                            vm.queryPara.playerDevice.type = 'os';
                            //vm.deviceAnalysisInit();
                        });
                        break;
                    case "PLAYER_DOMAIN_ANALYSIS":
                        vm.newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('Domain Name')
                            }],
                            yaxes: [{
                                position: 'left',
                                axisLabel: $translate('AMOUNT')
                            }]
                        };
                        vm.initSearchParameter('playerDomain', true, 2, function () {
                            //vm.domainAnalysisInit();
                        });
                        break;
                    case "PLAYER_RETENTION":
                        vm.initSearchParameter('playerRetention', null, 2, function () {
                            vm.queryPara.playerRetention.days = [1, 4, 8, 10, 15, 24, 30];
                            vm.queryPara.playerRetention.playerType = "1"; //set default value
                            vm.dayListLength = [];
                            for (var i = 1; i < 31; i++) {
                                vm.dayListLength.push(i);
                            }
                            vm.playerRetentionInit(function () {
                                //vm.getPlayerRetention();
                            });
                            $scope.safeApply();
                        });
                        break;
                    case "PLAYER_EXPENSES":
                        vm.platformConsumptionAnalysisSort = {};
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            vm.queryPara.playerCredit.filterGameProvider = 'all';
                            //vm.drawPlayerCreditLine('PLAYER_EXPENSES');
                            //vm.plotPlayerCreditLine('PLAYER_EXPENSES');
                        });
                        break;
                    case "PLAYER_TOPUP":
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            // vm.drawPlayerCreditLine();
                            // vm.drawPlayerCreditCountLine();
                        });
                        break;
                    case "BONUS_AMOUNT":
                        vm.platformBonusAnalysisSort = {};
                        vm.initSearchParameter('bonusAmount', 'day', 3, function () {
                            //vm.drawPlayerBonusAmount('BONUS_AMOUNT');
                        });
                        break;
                    case "CLIENT_SOURCE":
                        vm.initSearchParameter('clientSource', true, 3, function () {
                            //vm.initClientSourcePara(vm.getClientSourceData);
                        });
                        break;
                    case "GAME_ANALYSIS":
                        // vm.getAllProvider();
                        break;
                    case "CONSUMPTION_INTERVAL":
                        vm.consumptionInterval = {};
                        vm.initSearchParameter('consumptionInterval', null, 1);
                        vm.consumptionInterval.pastDay = '1';
                        //vm.getConsumptionIntervalData();
                        break;
                    case "ONLINE_TOPUP_SUCCESS_RATE":
                        vm.platformOnlineTopupSuccessAnalysisSort = {};
                        vm.platformOnlineTopupAnalysisDetailPeriod = 'day';
                        vm.initSearchParameter('onlineTopupSuccessRate', 'day', 1);
                        //vm.getOnlineToupSuccessRateData();
                        break;
                    case "TOPUPMANUAL":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                            //vm.drawPlayerTopUp('TOPUPMANUAL');
                        });
                        break;
                    case "PlayerAlipayTopUp":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                            //vm.drawPlayerTopUp('PlayerAlipayTopUp');
                        });
                        break;
                    case "PlayerWechatTopUp":
                        vm.platformTopUpAnalysisSort = {};
                        vm.initSearchParameter('topUp', 'day', 3, function () {
                           // vm.drawPlayerTopUp('PlayerWechatTopUp');
                        });
                        break;
                    case "TOPUP_METHOD_RATE":
                        vm.initSearchParameter('topupMethod', 'day', 3, function () {
                            vm.drawTopupMethodLine();
                            vm.drawTopupMethodCountLine();
                        });
                        break;
                }
                // $(".flot-tick-label.tickLabel").addClass("rotate330");

                $scope.safeApply();
            });
        };
        // platform overview start =================================================
        //vm.generateData = function () {
        //    vm.data1 = vm.getData(15, 100, 10);
        //    vm.data2 = vm.getData(15, 100, 10);
        //    vm.data3 = vm.getData(15, 100, 10);
        //    vm.data4 = vm.getData(15, 100, 10);
        //};
        //vm.getData = function (qty, maxValue, step) {
        //    var data = [];
        //    for (var i = 0; i < qty; i++) {
        //        data.push([i, parseInt(Math.random() * maxValue / step) * step])
        //    }
        //    return data;
        //};
        vm.getXlabelsFromdata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                xAxis.push([i, data[i].label]);
            }
            return xAxis;
        }
        vm.getLinedata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                //xAxis.push({data: [i, data[i].data], color: (data[i].color ? data[i].color : "black")});//, color: vm.colors[i]
                xAxis.push([i, data[i].data]);
            }
            return {label: vm.setGraphName(data[0].label), data: xAxis};
        }
        vm.getBardataFromPiedata = function (data) {
            var xAxis = [];
            for (var i = 0; i < data.length; i++) {
                //xAxis.push({data: [i, data[i].data], color: (data[i].color ? data[i].color : "black")});//, color: vm.colors[i]
                xAxis.push([i, data[i].data]);
            }
            return xAxis;
        }

        vm.plotAllPlatformActivePlayerPie = function () {
            var placeholder = "#pie-all-activePlayer";

            var sendData = {
                date: utilService.setLocalDayStartTime(vm.queryPara.allActivePlayer.date)
            }
            socketService.$socket($scope.AppSocket, 'countActivePlayerALLPlatform', sendData, function success(data1) {
                console.log('allActivePlayers', data1);
                var data = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, data, {}, 'activePlayerPieClickData');

                var placeholderBar = "#bar-all-activePlayer";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(data), vm.newOptions, vm.getXlabelsFromdata(data));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('activePlayerPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformActivePie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };

        vm.plotAllPlatformPlayerBonusPie = function(){
            var placeholder = "#pie-all-bonusAmount";
            var sendData = {
                startDate: vm.queryPara.allPlayerBonus.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerBonus.endTime.data('datetimepicker').getLocalDate(),
                platformId:vm.selectedPlatform ?vm.selectedPlatform._id:null,
                status:['Success','Approved']
            };

            socketService.$socket($scope.AppSocket, 'getAnalysisBonusRequestList', sendData, function success(data1) {
                console.log('getAnalysisBonusRequestList', data1);
                var data = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    var platformName = vm.platformList.filter(function( item ){ return item._id == obj._id})
                    return {label: vm.setGraphName(platformName[0]['name']), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, data, {}, 'playerBonusPieClickData');

                var placeholderBar = "#bar-all-bonusAmount";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(data), vm.newOptions, vm.getXlabelsFromdata(data));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('playerBonusPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformActivePie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        }
        vm.plotAllPlatformNewPlayerPie = function () {
            var placeholder = "#pie-all-newPlayer";
            var sendData = {
                startDate: vm.queryPara.allNewPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allNewPlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'countNewPlayers', sendData, function success(data1) {
                console.log('allplayers', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.number};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                socketService.$plotPie(placeholder, pieData, '', 'newPlayerPieClickData');
                var placeholderBar = "#bar-all-newPlayer";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));

                var listen = $scope.$watch(function () {
                    return socketService.getValue('newPlayerPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformNewPie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };
        vm.plotAllPlatformCreditPie = function () {
            var placeholder = "#pie-all-creditSpend";
            var sendData = {
                startDate: vm.queryPara.allPlayerConsumption.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerConsumption.endTime.data('datetimepicker').getLocalDate(),
            };

            socketService.$socket($scope.AppSocket, 'getPlayerConsumptionSumForAllPlatform', sendData, function success(data1) {
                console.log('allplayersconsumption', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.totalAmount.toFixed(2)};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })

                if (pieData.length > 0) {
                    socketService.$plotPie(placeholder, pieData, {}, 'creditPieClickData');
                } else {
                    $(placeholder).text($translate("No consumption records found"));
                }
                var placeholderBar = "#bar-all-creditSpend";

                utilService.actionAfterLoaded('#bar-all-creditSpend', function () {
                    socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
                    var listen = $scope.$watch(function () {
                        return socketService.getValue('creditPieClickData');
                    }, function (newV, oldV) {
                        if (newV !== oldV) {
                            vm.allPlatformCreditPie = newV.series.label;
                            console.log('pie clicked', newV);
                            if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                                listen();
                            }
                        }
                    });
                });
            });
        };
        vm.plotAllPlatformTopUpPie = function () {
            var placeholder = "#pie-all-topUpAmount";
            var sendData = {
                startDate: vm.queryPara.allPlayerTopup.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allPlayerTopup.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'getTopUpTotalAmountForAllPlatform', sendData, function success(data1) {
                console.log('allplayerstopup', data1);
                var pieData = data1.data.filter(function (obj) {
                    return (obj._id);
                }).map(function (obj) {
                    return {label: vm.setGraphName(obj._id.name), data: obj.totalAmount};
                }).sort(function (a, b) {
                    return b.data - a.data;
                })
                if (pieData.length > 0) {
                    socketService.$plotPie(placeholder, pieData, {}, 'topupPieClickData');
                } else {
                    $(placeholder).text($translate("No Top Up record is found."));
                }
                var placeholderBar = "#bar-all-topUpAmount";
                socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
                var listen = $scope.$watch(function () {
                    return socketService.getValue('topupPieClickData');
                }, function (newV, oldV) {
                    if (newV !== oldV) {
                        vm.allPlatformTopUpPie = newV.series.label;
                        console.log('pie clicked', newV);
                        if (vm.showPageName !== "PLATFORM_OVERVIEW") {
                            listen();
                        }
                    }
                });
            });
        };

        vm.updateApiResponseFuncNames = function (service, callback) {
            socketService.$socket($scope.AppSocket, 'getApiLoggerAllFunctionNameOfService', {service: service}, function success(data) {
                console.log('get field name', data);
                vm.apiRespFuncNames = data.data || [];
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });

        }
        vm.plotAllPlatformApiResponseTime = function () {
            var placeholder = "#line-all-apiResponseTime";
            var sendData = {
                startDate: vm.queryPara.allApiResponseTime.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.allApiResponseTime.endTime.data('datetimepicker').getLocalDate(),
                service: vm.queryPara.allApiResponseTime.service,
                functionName: vm.queryPara.allApiResponseTime.funcName,
                providerId: vm.queryPara.allApiResponseTime.providerId
            };
            $('#allApiResponseTimeAnalysis .block-query > *').last().show();
            socketService.$socket($scope.AppSocket, 'getApiResponseTimeQuery', sendData, function success(data) {
                $('#allApiResponseTimeAnalysis .block-query > *').last().hide();
                console.log('resData', data);
                var allData = data.data || [];
                var data = [];
                for (var i = 0; i < allData.length; i++) {
                    data.push([i, allData[i].responseTime, utilService.getFormatTime(allData[i].createTime)])
                }
                var newOptions = {};
                newOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('Milliseconds'),
                }];
                newOptions.xaxes = [{
                    position: 'bottom',
                    axisLabel: $translate('Index')
                }];
                socketService.$plotLine(placeholder, [{data: data, label: $translate("TIME")}], newOptions);
                vm.bindHover(placeholder, function (obj) {
                    var x = obj.datapoint[0],
                        y = obj.datapoint[1].toFixed(0);
                    var t0 = obj.series.data[obj.dataIndex][2];
                    $("#tooltip").html($translate("API_start_time") + " : " + t0 + '<br>' + $translate("API_Duration") + " : " + y + 'ms')
                        .css({top: obj.pageY + 5, left: obj.pageX + 5})
                        .fadeIn(200);
                })
            });
        }

        // platform overview end =================================================

        // online topup success rate start =============================================
        vm.getOnlineToupSuccessRateData = () => {
            let startDate = vm.queryPara.onlineTopupSuccessRate.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.onlineTopupSuccessRate.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startDate: startDate,
                endDate: endDate,
            };
            vm.isShowLoadingSpinner('#onlineTopupSuccessRateAnalysis', true);
            socketService.$socket($scope.AppSocket, 'getOnlineTopupAnalysisByPlatform', sendData, data => {
                console.log('data.data', data.data);
                vm.platformOnlineTopupAnalysisData = data.data;
                vm.platformOnlineTopupAnalysisTotalUserCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data.reduce((b, data1) => b + data1.userIds.length, 0),0);
                let totalSuccessCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data.reduce((b, data1) => b + data1.successCount, 0), 0);
                let totalUnsuccessCount = vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data.reduce((b, data1) => b + data1.count, 0), 0) - totalSuccessCount;
                let totalCount = totalSuccessCount + totalUnsuccessCount;
                vm.platformOnlineTopupAnalysisTotalData = {
                    totalCount: totalCount,
                    successCount: totalSuccessCount,
                    successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((totalSuccessCount / totalCount) * 100),
                    receivedAmount: vm.platformOnlineTopupAnalysisData.reduce((a, data) =>  a + data.reduce((b, data1) => b + data1.amount, 0),0),
                    amountRatio: 100,
                    userCount: vm.platformOnlineTopupAnalysisTotalUserCount,
                    userCountRatio: 100,
                };
                vm.platformOnlineTopupAnalysisByType = [];
                Object.keys($scope.userAgentType).forEach(
                    userAgentTypeKey => {
                        Object.keys($scope.merchantTopupTypeJson).forEach(key => {
                            vm.platformOnlineTopupAnalysisByType.push(vm.calculateOnlineTopupTypeData(key, userAgentTypeKey-1));
                        });
                    }
                );

                vm.platformOnlineTopupAnalysisSubTotalData = {
                    WEB: vm.calculateOnlineTopupTypeSubtotalData('WEB'),
                    APP: vm.calculateOnlineTopupTypeSubtotalData('APP'),
                    H5: vm.calculateOnlineTopupTypeSubtotalData('H5')
                };

                vm.platformOnlineTopupAnalysisDetailMerchantId = null;
                // console.log('vm.platformOnlineTopupAnalysisData', vm.platformOnlineTopupAnalysisData);
                // console.log('vm.platformOnlineTopupAnalysisTotalData', vm.platformOnlineTopupAnalysisTotalData);
                // console.log('vm.platformOnlineTopupAnalysisByType', vm.platformOnlineTopupAnalysisByType);
                // console.log('vm.platformOnlineTopupAnalysisSubTotalData', vm.platformOnlineTopupAnalysisSubTotalData);
                vm.isShowLoadingSpinner('#onlineTopupSuccessRateAnalysis', false);
                $scope.safeApply();
            });
        };

        vm.calculateOnlineTopupTypeData = (merchantTopupTypeId, userAgent) => {
            let typeData = vm.platformOnlineTopupAnalysisData[userAgent].filter(data => data._id == merchantTopupTypeId)[0];
            typeData = typeData ? typeData : {amount:0, userIds:[], successUserIds:[], _id: merchantTopupTypeId, count:0, successCount: 0};
            let totalCount = typeData.count;
            let userCount = typeData.successUserIds.length;
            let returnObj =  {
                totalCount: totalCount,
                successCount: typeData.successCount,
                successRate: totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.successCount / totalCount) * 100),
                receivedAmount: typeData.amount,
                merchantTopupTypeId: merchantTopupTypeId,
                amountRatio: vm.platformOnlineTopupAnalysisTotalData.receivedAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((typeData.amount / vm.platformOnlineTopupAnalysisTotalData.receivedAmount) * 100),
                userCount: userCount,
                userCountRatio: vm.platformOnlineTopupAnalysisTotalUserCount === 0 ? 0 : $noRoundTwoDecimalPlaces((userCount / vm.platformOnlineTopupAnalysisTotalUserCount) * 100),
            };

            returnObj.name = $scope.merchantTopupTypeJson[merchantTopupTypeId];
            returnObj.userAgent = userAgent + 1;
            returnObj.type = $scope.userAgentType[returnObj.userAgent];
            return returnObj;
        };
        vm.calculateOnlineTopupTypeSubtotalData = (type) => {
            let typeData =  vm.platformOnlineTopupAnalysisByType.filter(data => data.type === type);
            let dataContainRecord = typeData.filter(data => data.totalCount > 0).length;
            return {
                data: typeData,
                totalCount: typeData.reduce((a, data) => a + data.totalCount ,0),
                successCount: typeData.reduce((a, data) => a + data.successCount ,0),
                successRate: dataContainRecord === 0 ? 0 : $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.successRate ,0) / dataContainRecord),
                receivedAmount: typeData.reduce((a, data) => a + data.receivedAmount ,0),
                amountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.amountRatio ,0)),
                userCount: typeData.reduce((a, data) => a + data.userCount ,0),
                userCountRatio: $noRoundTwoDecimalPlaces(typeData.reduce((a, data) => a + data.userCountRatio ,0)),
                name: type
            };
        };

        vm.platformOnlineTopupAnalysisShowDetail = (merchantTopupTypeId, userAgent) => {
            vm.platformOnlineTopupAnalysisDetailMerchantId = merchantTopupTypeId;
            vm.platformOnlineTopupAnalysisDetailUserAgent = userAgent;
            let typeName = $scope.merchantTopupTypeJson[merchantTopupTypeId];
            let startDate = vm.queryPara.onlineTopupSuccessRate.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.onlineTopupSuccessRate.endTime.data('datetimepicker').getLocalDate();
            let sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.platformOnlineTopupAnalysisDetailPeriod,
                merchantTopupTypeId: merchantTopupTypeId,
                startDate: startDate,
                endDate: endDate,
                userAgent: userAgent
            };
            socketService.$socket($scope.AppSocket, 'getOnlineTopupAnalysisDetailUserCount', sendData, data => {
                console.log('data.data', data.data);
                let detailDataByDate = data.data;
                let typeData = vm.platformOnlineTopupAnalysisByType.filter(data => data.name == typeName && data.userAgent == userAgent)[0];
                let periodDateData = [];
                while (startDate.getTime() <= endDate.getTime()) {
                    let dayEndTime = vm.getNextDateByPeriodAndDate(vm.platformOnlineTopupAnalysisDetailPeriod, startDate);
                    periodDateData.push(startDate);
                    startDate = dayEndTime;
                }
                vm.platformOnlineTopupAnalysisDetailData = [];
                let totalReceivedAmount = typeData.receivedAmount;
                let totalUserCount = typeData.userCount;
                detailDataByDate.forEach(
                    data => {
                        vm.platformOnlineTopupAnalysisDetailData.push({
                            date: data.date,
                            totalCount: data.totalCount,
                            successCount: data.successCount,
                            successRate: data.totalCount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.successCount / data.totalCount) * 100),
                            receivedAmount: data.receivedAmount,
                            amountRatio: totalReceivedAmount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.receivedAmount / totalReceivedAmount) * 100),
                            userCount: data.successUserCount,
                            userCountRatio: totalUserCount === 0 ? 0 : $noRoundTwoDecimalPlaces((data.userCount / totalUserCount) * 100)
                        });
                    }
                );
                vm.platformOnlineTopupAnalysisDetailTotalData = typeData;
                let successRate = [];
                let amountRatio = [];
                let userCountRatio = [];
                vm.platformOnlineTopupAnalysisDetailData.forEach(
                    data => {
                        successRate.push([new Date(data.date), data.successRate]);
                        amountRatio.push([new Date(data.date), data.amountRatio]);
                        userCountRatio.push([new Date(data.date), data.userCountRatio]);
                    }
                );
                let lineData = [
                    {label: $translate('successRate'), data: successRate},
                    {label: $translate('amountRatio'), data: amountRatio},
                    {label: $translate('userCountRatio'), data: userCountRatio}
                ];
                vm.plotLineByElementId("#line-onlineTopupSuccessRate", lineData, $translate('PERCENTAGE'), $translate('DAY'));
                console.log('vm.platformOnlineTopupAnalysisDetailData', vm.platformOnlineTopupAnalysisDetailData);
                $scope.safeApply();
            });
        };

        // online topup success rate end =============================================

        //topup method rate start ====================================================
        vm.drawTopupMethodLine = function () {
            vm.isShowLoadingSpinner('#topupMethodAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.topupMethod.periodText,
                startDate: vm.queryPara.topupMethod.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.topupMethod.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getTopUpMethodAnalysisByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.topupMethodData = data.data;
                    console.log('vm.topupMethodData', vm.topupMethodData);
                    vm.isShowLoadingSpinner('#topupMethodAnalysis', false);

                    vm.drawTopupMethodPie(vm.topupMethodData, "#topupMethodAnalysis");
                    vm.drawTopupMethodTable(vm.topupMethodData, "#topupMethodAnalysisTable");
                })
            }, function (data) {
                vm.isShowLoadingSpinner('#topupMethodAnalysis', false);
                console.log("topup method data not", data);
            });
        }

        vm.drawTopupMethodCountLine = function () {
            let sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.topupMethod.periodText,
                type: 'topup',
                startDate: vm.queryPara.topupMethod.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.topupMethod.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getTopUpMethodCountByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.topupMethodCountData = data.data;
                    console.log('vm.topupMethodCountData', vm.topupMethodCountData);

                    vm.drawTopupMethodPie(vm.topupMethodCountData, "#topupMethodCountAnalysis");
                    vm.drawTopupMethodTable(vm.topupMethodCountData, "#topupMethodCountAnalysisTable");
                })
            }, function (data) {
                console.log("topup method data not", data);
            });
        }

        vm.drawTopupMethodPie = function (srcData, pieChartName) {
            let placeholder = pieChartName + ' div.graphDiv';
            let finalizedPieData = [];

            srcData.map(s => {
                let total = 0;
                if(s && s.length > 0){
                    s.map(data => {
                        if(data){
                            let indexNo = finalizedPieData.findIndex(f => f.label == data._id.topUpType)
                            if(indexNo != -1){
                                finalizedPieData[indexNo].data += data.number;
                            }else{
                                finalizedPieData.push({label: data._id.topUpType, data: data.number});
                            }
                        }
                    })
                }
            })

            socketService.$plotPie(placeholder, finalizedPieData, {}, 'clientSourceClickData');

        }

        vm.drawTopupMethodTable = function (srcData, tableName) {
            let tableData = [];

            srcData.map(item => {
                if(item && item.length > 0){
                    item.forEach(i => {
                        let indexNo = tableData.findIndex(t => t.date == i._id.date);

                        if(indexNo == -1){
                            tableData.push({date: i._id.date, MANUAL: 0, ALIPAY: 0, ONLINE: 0, WECHAT: 0})
                            indexNo = tableData.findIndex(t => t.date == i._id.date);
                        }

                        if(i._id.topUpType == vm.constPlayerTopUpTypes.MANUAL){
                            tableData[indexNo].MANUAL += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.ALIPAY){
                            tableData[indexNo].ALIPAY += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.ONLINE){
                            tableData[indexNo].ONLINE += i.number;
                        }else if(i._id.topUpType == vm.constPlayerTopUpTypes.WECHAT){
                            tableData[indexNo].WECHAT += i.number;
                        }

                    })
                }
            })

            tableData.map(data => {
                if(data){
                    if(data.date){
                        data.date = String(utilService.$getTimeFromStdTimeFormat(new Date(data.date))).substring(0, 10);
                    }
                }
            })

            let manualAverageNo = ((tableData.reduce((a,b) => a + (b.MANUAL ? b.MANUAL : 0),0)) / tableData.length).toFixed(2);
            let alipayAverageNo = ((tableData.reduce((a,b) => a + (b.ALIPAY ? b.ALIPAY : 0),0)) / tableData.length).toFixed(2);
            let onlineAverageNo = ((tableData.reduce((a,b) => a + (b.ONLINE ? b.ONLINE : 0),0)) / tableData.length).toFixed(2);
            let wechatAverageNo = ((tableData.reduce((a,b) => a + (b.WECHAT ? b.WECHAT : 0),0)) / tableData.length).toFixed(2);

            tableData.push({date: $translate('average value'), MANUAL: manualAverageNo, ALIPAY: alipayAverageNo, ONLINE: onlineAverageNo, WECHAT: wechatAverageNo});

            var dataOptions = {
                data: tableData,
                columns: [
                    {title: $translate(vm.queryPara.topupMethod.periodText), data: "date"},
                    {title: $translate('MANUAL_TOP_UP'), data: "MANUAL"},
                    {title: $translate('ALIPAY'), data: "ALIPAY"},
                    {title: $translate('TOPUPONLINE'), data: "ONLINE"},
                    {title: $translate('WECHAT'), data: "WECHAT"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $(tableName).DataTable(dataOptions);
            a.columns.adjust().draw();
        }
        //topup method rate end =======================================================

        // new player start =============================================
        vm.getNextDateByPeriodAndDate = (period, startDate) => {
            let date = new Date(startDate);
            switch (period) {
                case 'day':
                    date = new Date(date.setDate(date.getDate() + 1));
                        break;
                case 'week':
                    date = new Date(date.setDate(date.getDate() + 7));
                    break;
                case 'biweekly':
                    date = new Date(date.setDate(date.getDate() + 15));
                    break;
                case 'month':
                    date = new Date(new Date(date.setMonth(date.getMonth() + 1)).setDate(1));
                    break
                case 'season':
                    date = new Date(new Date(date.setMonth(date.getMonth() + 3)).setDate(1));
                    break
            }
            return date;
        };

        vm.isShowLoadingSpinner = (containerId, isShow) => {
            let loadingSpinner = "<i style='width: auto;' class='fa fa-spin fa-refresh margin-left-5 text-danger collapse'></i>";
            if (isShow)
                if ($(containerId).children('.block-query').length !== 0)
                    $(containerId).children('.block-query').find("button.common-button").parent().append(loadingSpinner);
                else
                    $(containerId).find("button.common-button").parent().append(loadingSpinner);
            else
                $(containerId + ' .fa.fa-spin.fa-refresh').remove();
        };

        vm.plotNewPlayerLine = function () {
            // var placeholder = "#line-newPlayer";
            // var periodText = $('#analysisNewPlayer select').val();
            let startDate = vm.queryPara.newPlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.newPlayer.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.newPlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };
            vm.isShowLoadingSpinner('#newPlayerAnalysis', true);
            socketService.$socket($scope.AppSocket, 'countNewPlayerbyPlatform', sendData, function success(data1) {
                //var newPlayerData = data1.data[0];
                let periodDateData = [];
                while (startDate.getTime() <= endDate.getTime()) {
                    let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.newPlayer.periodText, startDate);
                    periodDateData.push(startDate);
                    startDate = dayEndTime;
                }
                //vm.platformNewPlayerAnalysisData = data1.data[0];
                vm.platformNewPlayerData = data1.data;
                vm.platformNewPlayerAnalysisData = [];
                for(let i = 0; i<periodDateData.length; i++){
                    let newPlayerWithinPeriod = vm.platformNewPlayerData.filter(player => new Date(player.registrationTime).getTime() >= periodDateData[i].getTime() && new Date(player.registrationTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.newPlayer.periodText, periodDateData[i]));
                    vm.platformNewPlayerAnalysisData.push({
                        date: periodDateData[i],
                        players: newPlayerWithinPeriod,
                        topupPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes > 0 ),
                        multiTopupPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes > 1),
                        validPlayer: newPlayerWithinPeriod.filter(player => player.topUpTimes >= vm.partnerLevelConfig.validPlayerTopUpTimes && player.topUpSum >= vm.partnerLevelConfig.validPlayerTopUpAmount && player.consumptionTimes >= vm.partnerLevelConfig.validPlayerConsumptionTimes && player.consumptionSum >= vm.partnerLevelConfig.validPlayerConsumptionAmount && player.valueScore >= vm.partnerLevelConfig.validPlayerValue),
                    });
                }
                vm.platformNewPlayerDataPeriodText = vm.queryPara.newPlayer.periodText;
                console.log('vm.platformNewPlayerAnalysisData', vm.platformNewPlayerAnalysisData);
                //var newPlayerObjData = {};
                // for (var i = 0; i < newPlayerData.length; i++) {
                //     switch (vm.queryPara.newPlayer.periodText) {
                //         case 'day':
                //             newPlayerObjData[newPlayerData[i]._id.date] = newPlayerData[i].number;
                //             break;
                //         case 'week':
                //             newPlayerObjData[newPlayerData[i]._id.week] = newPlayerData[i].number;
                //             break;
                //         case 'month':
                //             newPlayerObjData[newPlayerData[i]._id.year + '' + newPlayerData[i]._id.month] = newPlayerData[i].number;
                //             break;
                //     }
                // }

                // var newOptions = {
                //     xaxis: {
                //         tickLength: 0,
                //         mode: "time",
                //         minTickSize: [1, vm.queryPara.newPlayer.periodText],
                //     }
                // };
                // var nowDate = new Date(sendData.startDate);

                // var xText = '';
                // switch (vm.queryPara.newPlayer.periodText) {
                //     case 'day':
                //         //         do {
                //         //             var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                //         //             graphData.push([nowDate.getTime(), (newPlayerObjData[dateText] || 0)]);
                //         //             nowDate.setDate(nowDate.getDate() + 1);
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'DAY';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [1, "day"],
                //             }
                //         };
                //         break;
                //     case 'week':
                //         //         var k = 0;
                //         //         do {
                //         //             // var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                //         //             graphData.push([nowDate.getTime(), (newPlayerObjData[k] || 0)]);
                //         //             nowDate.setDate(nowDate.getDate() + 7);
                //         //             k++;
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'WEEK';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [6, "day"],
                //             }
                //         };
                //         break;
                //     case 'month' :
                //         //         nowDate.setDate(1);
                //         //         do {
                //         //             var nowYear = nowDate.getFullYear();
                //         //             var nowMonth = nowDate.getMonth() + 1;
                //         //             console.log('nowMonth', nowYear + '' + nowMonth);
                //         //             graphData.push([nowDate.getTime(), (newPlayerObjData[nowYear + '' + nowMonth] || 0)]);
                //         //             nowDate.setMonth(nowDate.getMonth() + 1);
                //         //
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'MONTH';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [1, "month"],
                //             }
                //         };
                //         break;
                // }

                // newOptions.yaxes = [{
                //     position: 'left',
                //     axisLabel: $translate('AMOUNT'),
                // }];
                // newOptions.xaxes = [{
                //     position: 'bottom',
                //     axisLabel: $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase())
                // }];
                //
                // newOptions.colors = ["#00afff", "#FF0000"];
                // socketService.$plotLine(placeholder, [{label: $translate('New Players'), data: graphData},{label: $translate('average line'), data: averageData}], newOptions);
                // $(placeholder).bind("plothover", function (event, pos, obj) {
                //     var previousPoint;
                //     if (!obj) {
                //         $("#tooltip").hide();
                //         previousPoint = null;
                //         return;
                //     } else {
                //         if (previousPoint != obj.dataIndex) {
                //             previousPoint = obj.dataIndex;
                //
                //             var x = obj.datapoint[0],
                //                 y = obj.datapoint[1].toFixed(0);
                //
                //             var date = new Date(x);
                //             var dateString = utilService.$getDateFromStdTimeFormat(date.toISOString())
                //             // console.log('date', x, date);
                //             $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.newPlayer.periodText) + " : " + dateString)
                //                 .css({top: obj.pageY + 5, left: obj.pageX + 5})
                //                 .fadeIn(200);
                //         }
                //     }
                // });

                // $(".flot-x-axis .flot-tick-label.tickLabel").addClass("rotate330");

                // var tableData = [];
                // for (var i in graphData) {
                //     var obj = {};
                //     obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                //     obj.amount = graphData[i][1] || 0;
                //     tableData.push(obj);
                // }
                // var dataOptions = {
                //     data: tableData,
                //     columns: [
                //         {title: $translate(vm.queryPara.newPlayer.periodText), data: "date"},
                //         {title: $translate('amount'), data: "amount"}
                //     ],
                //     "paging": false,
                // };
                // dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                // var a = $('#newPlayerAnalysisTable').DataTable(dataOptions);
                // a.columns.adjust().draw();


                let calculatedNewPlayerData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'players', 'New Players');
                vm.platformNewPlayerAverage = calculatedNewPlayerData.average;
                vm.plotLineByElementId("#line-newPlayer", calculatedNewPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerTopupData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'topupPlayer', 'Player with Top-ups');
                vm.platformNewPlayerTopupAverage = calculatedNewPlayerTopupData.average;
                vm.plotLineByElementId("#line-newPlayerTopup", calculatedNewPlayerTopupData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerMultiTopupData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'multiTopupPlayer', 'Player with Top-ups Multiple Times');
                vm.platformNewPlayerMultiTopupAverage = calculatedNewPlayerMultiTopupData.average;
                vm.plotLineByElementId("#line-newPlayerMultiTopup", calculatedNewPlayerMultiTopupData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));

                let calculatedNewPlayerValidPlayerData = vm.calculateLineDataAndAverage(vm.platformNewPlayerAnalysisData, 'validPlayer', 'Valid Player');
                vm.platformNewPlayerValidPlayerAverage = calculatedNewPlayerValidPlayerData.average;
                vm.plotLineByElementId("#line-newPlayerValidPlayer", calculatedNewPlayerValidPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#newPlayerAnalysis', false);
                $scope.safeApply();
            });

        }
        vm.calculateLineDataAndAverage = (data, key, label) => {
            var graphData = [];
            let averageData = [];
            let average = data.length !== 0 ?Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key]) ? item[key] : item[key].length), 0) / data.length) : 0;
            data.map(item => {
                graphData.push([new Date(item.date), Number.isFinite(item[key]) ? item[key] : item[key].length]);
                averageData.push([new Date(item.date), average]);
            })
            return {lineData: [{label: $translate(label), data: graphData},{label: $translate('average line'), data: averageData}], average: average};
        };

        vm.calculateLineDataAndAverageForDecimalPlaces = (data, key, label) => {
            var graphData = [];
            let averageData = [];
            let average = data.length !== 0 ? $noRoundTwoDecimalPlaces(data.reduce((a, item) => a + (Number.isInteger(item[key]) ? item[key] : item[key]), 0) / data.length) : 0;
            data.map(item => {
                graphData.push([new Date(item.date), Number.isInteger(item[key]) ? item[key] : item[key]]);
                averageData.push([new Date(item.date), average]);
            })
            return {lineData: [{label: $translate(label), data: graphData},{label: $translate('average line'), data: averageData}], average: average};
        };
    
        vm.getPartnerLevelConfig = function () {
            return $scope.$socketPromise('getPartnerLevelConfig', {platform: vm.selectedPlatform._id})
                .then(function (data) {
                    vm.partnerLevelConfig = data.data[0];
                    $scope.safeApply();
                });
        };
        vm.plotLineByElementId = (elementId, data, yLabel, xLabel) => {
            var newOptions = {
                xaxis: {
                    tickLength: 0,
                    mode: "time",
                    minTickSize: [1, vm.queryPara.newPlayer.periodText],
                }
            };

            newOptions.yaxes = [{
                position: 'left',
                axisLabel: yLabel,
            }];
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: xLabel,
            }];

            newOptions.colors = ["#00afff", "#FF0000"];
            socketService.$plotLine(elementId, data, newOptions);
            $(elementId).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;

                        var x = obj.datapoint[0],
                            y = $noRoundTwoDecimalPlaces(obj.datapoint[1]);

                        var date = new Date(x);
                        var dateString = utilService.getFormatDate(date)
                        // console.log('date', x, date);
                        $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.newPlayer.periodText) + " : " + dateString)
                            .css({top: obj.pageY + 5, left: obj.pageX + 5})
                            .fadeIn(200);
                    }
                }
            });
        };
        // new player end   =============================================

        // active Player start= =========================================
        vm.plotActivePlayerLine = function () {
            let startDate = vm.queryPara.activePlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.activePlayer.endTime.data('datetimepicker').getLocalDate();
            //var placeholder = "#line-activePlayer";
            // var periodText = $('#analysisActivePlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.activePlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };
            vm.isShowLoadingSpinner('#activePlayerAnalysis', true);
            vm.isLoadingctivePlayer = true;
            socketService.$socket($scope.AppSocket, 'countActivePlayerbyPlatform', sendData, function success(data1) {

                // console.log('received data', data1);
                // var activePlayerData = data1 ? data1.data : [];
                // var graphData = [];
                // activePlayerData.forEach(item => {
                //     graphData.push([new Date(item.date).getTime(), item.activePlayers]);
                // })
                //
                // //draw graph
                // socketService.$plotLine(placeholder, [{
                //     label: $translate('Active Player'),
                //     data: graphData
                // }], {
                //     xaxis: {
                //         tickLength: 0,
                //         mode: "time",
                //         minTickSize: [1, "day"],
                //     }
                // });
                // $(placeholder).bind("plothover", function (event, pos, obj) {
                //     var previousPoint;
                //     if (!obj) {
                //         $("#tooltip").hide();
                //         previousPoint = null;
                //         return;
                //     } else {
                //         if (previousPoint != obj.dataIndex) {
                //             previousPoint = obj.dataIndex;
                //
                //             var x = obj.datapoint[0],
                //                 y = obj.datapoint[1].toFixed(0);
                //
                //             var date = new Date(x);
                //             var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                //             // console.log('date', x, date);
                //             $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')("Day") + " : " + dateString)
                //                 .css({top: obj.pageY + 5, left: obj.pageX + 5})
                //                 .fadeIn(200);
                //         }
                //     }
                // });
                // //draw table
                //
                // var tableData = [];
                // for (var i in graphData) {
                //     var obj = {};
                //     obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                //     obj.amount = graphData[i][1] || 0;
                //     tableData.push(obj);
                // }
                // var dataOptions = {
                //     data: tableData,
                //     columns: [
                //         {title: $translate(vm.queryPara.activePlayer.periodText), data: "date"},
                //         {title: $translate('amount'), data: "amount"}
                //     ],
                //     "paging": false,
                // };
                // dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                // var a = $('#activePlayerAnalysisTable').DataTable(dataOptions);
                // a.columns.adjust().draw();
                vm.platformActivePlayerDataPeriodText = vm.queryPara.activePlayer.periodText;
                vm.platformActivePlayerAnalysisData = [];
                Object.keys(data1.data).forEach(function(key) {
                    vm.platformActivePlayerAnalysisData.push({date: new Date(key), number: data1.data[key]});
                });
                console.log('vm.platformActivePlayerAnalysisData', vm.platformActivePlayerAnalysisData);
                let calculatedActivePlayerData = vm.calculateLineDataAndAverage(vm.platformActivePlayerAnalysisData, 'number', 'Active Player');
                vm.platformActivePlayerAverage = calculatedActivePlayerData.average;
                vm.plotLineByElementId("#line-activePlayer", calculatedActivePlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.activePlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingctivePlayer = false;
                $scope.safeApply();
            },() => {
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingctivePlayer = false;
            });
        }
        // active Player end= =========================================

        // valid active Player start==========================================
        vm.plotValidActivePlayerLine = function () {
            let startDate = vm.queryPara.validActivePlayer.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.validActivePlayer.endTime.data('datetimepicker').getLocalDate();
            //var placeholder = "#line-activePlayer";
            // var periodText = $('#analysisActivePlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.validActivePlayer.periodText,
                startDate: startDate,
                endDate: endDate,
            };
            vm.isShowLoadingSpinner('#validActivePlayerAnalysis', true);
            vm.isLoadingValidActivePlayer = true;
            socketService.$socket($scope.AppSocket, 'countValidActivePlayerbyPlatform', sendData, function success(data1) {

                vm.platformValidActivePlayerDataPeriodText = vm.queryPara.validActivePlayer.periodText;
                vm.platformValidActivePlayerAnalysisData = [];
                Object.keys(data1.data).forEach(function(key) {
                    vm.platformValidActivePlayerAnalysisData.push({date: new Date(key), number: data1.data[key]});
                });
                console.log('vm.platformValidActivePlayerAnalysisData', vm.platformValidActivePlayerAnalysisData);
                let calculatedValidActivePlayerData = vm.calculateLineDataAndAverage(vm.platformValidActivePlayerAnalysisData, 'number', 'ValidActivePlayer');
                vm.platformValidActivePlayerAverage = calculatedValidActivePlayerData.average;
                vm.plotLineByElementId("#line-validActivePlayer", calculatedValidActivePlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.validActivePlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#validActivePlayerAnalysis', false);
                vm.isLoadingValidActivePlayer = false;
                $scope.safeApply();
            },() => {
                vm.isShowLoadingSpinner('#activePlayerAnalysis', false);
                vm.isLoadingValidActivePlayer = false;
            });
        }
        // valid active Player end==========================================

        // login Player start= =========================================
        vm.plotLoginPlayerLine = function () {
            //todo::add graph code here
            vm.isShowLoadingSpinner('#loginPlayerAnalysis', true);
            var placeholder = "#line-loginPlayer";
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.loginPlayer.periodText,
                // startDate: vm.queryPara.loginPlayer.startTime,
                // endDate: vm.queryPara.loginPlayer.endTime,
                startDate: vm.queryPara.loginPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.loginPlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'countLoginPlayerbyPlatform', sendData, function success(data1) {


                // var graphData = [];
                // let averageData = [];
                // let average = data1.data.length !== 0? Math.floor(data1.data.reduce((a, item) => a + item.number, 0) / data1.data.length) : 0;
                // data1.data.map(item => {
                //     var localTime = new Date(item._id.date);
                //     graphData.push([localTime, item.number]);
                //     averageData.push([localTime, average]);
                // })

                // var loginPlayerData = data1.data;
                // var loginPlayerObjData = {};
                // for (var i = 0; i < loginPlayerData.length; i++) {
                //     switch (vm.queryPara.loginPlayer.periodText) {
                //         case 'day':
                //             loginPlayerObjData[loginPlayerData[i]._id.date] = loginPlayerData[i].number;
                //             break;
                //         case 'week':
                //             loginPlayerObjData[loginPlayerData[i]._id.week] = loginPlayerData[i].number;
                //             break;
                //         case 'month':
                //             loginPlayerObjData[loginPlayerData[i]._id.year + '' + loginPlayerData[i]._id.month] = loginPlayerData[i].number;
                //             break;
                //     }
                // }
                // var graphData = [];
                // var newOptions = {};
                // // var nowDate = new Date(sendData.startDate);
                // var xText = '';
                // switch (vm.queryPara.loginPlayer.periodText) {
                //     case 'day':
                //         //         do {
                //         //             var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                //         //             graphData.push([nowDate.getTime(), (loginPlayerObjData[dateText] || 0)]);
                //         //             nowDate.setDate(nowDate.getDate() + 1);
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'DAY';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [1, "day"],
                //             }
                //         };
                //         break;
                //     case 'week':
                //         //         var k = 0;
                //         //         do {
                //         //             graphData.push([nowDate.getTime(), (loginPlayerObjData[k] || 0)]);
                //         //             nowDate.setDate(nowDate.getDate() + 7);
                //         //             k++;
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'WEEK';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [6, "day"],
                //             }
                //         };
                //         break;
                //     case 'month' :
                //         //         nowDate.setDate(1);
                //         //         do {
                //         //             var nowYear = nowDate.getFullYear();
                //         //             var nowMonth = nowDate.getMonth() + 1;
                //         //             console.log('nowMonth', nowYear + '' + nowMonth);
                //         //             graphData.push([nowDate.getTime(), (loginPlayerObjData[nowYear + '' + nowMonth] || 0)]);
                //         //             nowDate.setMonth(nowDate.getMonth() + 1);
                //         //
                //         //         } while (nowDate <= sendData.endDate);
                //         xText = 'MONTH';
                //         newOptions = {
                //             xaxis: {
                //                 tickLength: 0,
                //                 mode: "time",
                //                 minTickSize: [1, "month"],
                //             }
                //         };
                //         break;
                // }
                // newOptions.yaxes = [{
                //     position: 'left',
                //     axisLabel: $translate('AMOUNT'),
                // }];
                // newOptions.xaxes = [{
                //     position: 'bottom',
                //     axisLabel: $translate('PERIOD') + ' : ' + $translate(xText),
                // }];
                // socketService.$plotLine(placeholder, [{
                //     label: $translate('Login Player'),
                //     data: graphData
                // },{label: $translate('average line'), data: averageData}], newOptions);
                // $(placeholder).bind("plothover", function (event, pos, obj) {
                //     var previousPoint;
                //     if (!obj) {
                //         $("#tooltip").hide();
                //         previousPoint = null;
                //         return;
                //     } else {
                //         if (previousPoint != obj.dataIndex) {
                //             previousPoint = obj.dataIndex;
                //
                //             var x = obj.datapoint[0],
                //                 y = obj.datapoint[1].toFixed(0);
                //
                //             var date = new Date(x);
                //             var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                //             // console.log('date', x, date);
                //             $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.loginPlayer.periodText) + " : " + dateString)
                //                 .css({top: obj.pageY + 5, left: obj.pageX + 5})
                //                 .fadeIn(200);
                //         }
                //     }
                // });
                // $(".flot-x-axis .flot-tick-label.tickLabel").addClass("rotate330");
                //draw table

                // var tableData = [];
                // for (var i in graphData) {
                //     var obj = {};
                //     obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                //     obj.amount = graphData[i][1] || 0;
                //     tableData.push(obj);
                // }
                // var dataOptions = {
                //     data: tableData,
                //     columns: [
                //         {title: $translate(vm.queryPara.loginPlayer.periodText), data: "date"},
                //         {title: $translate('amount'), data: "amount"}
                //     ],
                //     "paging": false,
                // };
                // dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                // var a = $('#loginPlayerAnalysisTable').DataTable(dataOptions);
                // a.columns.adjust().draw();
                vm.platformLoginPlayerDataPeriodText = vm.queryPara.loginPlayer.periodText;
                vm.platformLoginPlayerAnalysisData = data1.data.map(item => {
                    item.date = item._id.date;
                    return item;
                });
                let calculatedLoginPlayerData = vm.calculateLineDataAndAverage(vm.platformLoginPlayerAnalysisData, 'number', 'Login Player');
                vm.platformLoginPlayerAverage = calculatedLoginPlayerData.average;
                vm.plotLineByElementId("#line-loginPlayer", calculatedLoginPlayerData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.newPlayer.periodText.toUpperCase()));
                vm.isShowLoadingSpinner('#loginPlayerAnalysis', false);
                $scope.safeApply();
            });
        };
        // login Player end= =========================================

        // peak hour start        =================================================
        vm.plotPeakhourOnlinePlayerLine = function () {
            var placeholder = "#line-peakhour-onlinePlayer";
            var data1 = [], data2 = [], series = 10;
            for (var i = 0; i < series; i++) {
                data1[i] = {
                    label: "platform1 " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
                data2[i] = {
                    label: "platform2 " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'times',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: 'Number of Player',
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                        //return val < axis.max ? val.toFixed(2) : (val.toFixed(2) + "/Num");
                    }
                },
                series: {
                    points: {
                        show: true,
                        radius: 4,
                        symbol: //"circle" // or callback
                            function (ctx, x, y, radius, shadow) {
                                // pi * r^2 = (2s)^2  =>  s = r * sqrt(pi)/2
                                var size = radius * Math.sqrt(Math.PI) / 2;
                                ctx.rect(x - size, y - size, size + size, size + size);
                            }
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data1), vm.getLinedata(data2)], newOption, 'peakhour');
            var listen = $scope.$watch(function () {
                return socketService.getValue('peakhour');
            }, function (newV, oldV) {
                if (newV !== oldV) {
                    console.log('pie clicked', newV);
                    if (vm.showPageName !== "PEAK_HOUR") {
                        listen();
                    }
                }
            });
        }
        vm.plotPeakhourCreditspendLine = function () {
            var placeholder = "#line-peakhour-creditSpend";
            var data = [], series = 10;
            for (var i = 0; i < series; i++) {
                data[i] = {
                    label: "platform " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'times',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: 'Number of Player',
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data)], newOption);
        }
        vm.plotPeakhourTopupLine = function () {
            var placeholder = "#line-peakhour-topup";
            var data = [], series = 10;
            for (var i = 0; i < series; i++) {
                data[i] = {
                    label: "platform " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            socketService.$plotLine(placeholder, [vm.getLinedata(data)]);
        }
        // peak hour end  ================================================

        // player location start ================================================
        vm.playerLocationPage = function (province) {
            var sendData = {
                platform: vm.selectedPlatform._id,
                player: vm.queryPara.playerLocation.player,
                date: vm.queryPara.playerLocation.date,
                // startTime: vm.queryPara.playerLocation.startTime,
                // endTime: vm.queryPara.playerLocation.endTime,
                startTime: vm.queryPara.playerLocation.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerLocation.endTime.data('datetimepicker').getLocalDate(),
            };

            vm.currentProvince = '';
            var queryStr = '';
            if (province) {
                vm.currentProvince = province;
                sendData.phoneProvince = province;
                queryStr = 'getPlayerPhoneLocationInProvince'
            } else if (vm.showPageName == "PLAYER_PHONE_LOCATION") {
                queryStr = 'getPlayerPhoneLocation'
            } else if (vm.showPageName == "PLAYER_IP_LOCATION") {
                queryStr = 'getPlayerLoginLocation'
            }
            vm.getLocationData(sendData, queryStr)
        };

        vm.getLocationData = function (sendData, queryStr) {
            socketService.$socket($scope.AppSocket, queryStr, sendData, function (data) {
                console.log('location', data);
                if (vm.currentProvince) {
                    vm.playerPhoneInProvince = data.data;
                    $scope.safeApply();
                    vm.setProvinceData('phoneCity', vm.playerPhoneInProvince, function () {
                        vm.mapName = "chinaHigh";
                        vm.drawMap(function (data) {
                            //this function is to zoom to province immediately after clicking
                            vm.map.clickMapObject(vm.map.getObjectById(vm.allProvinceId[vm.currentProvince]));
                        });
                        vm.drawLocationCityGraphByElementId("#playerLocationPie", vm.playerPhoneInProvince, "phoneLocation");
                        $scope.safeApply();
                    });
                } else if (vm.showPageName == 'PLAYER_IP_LOCATION') {
                    vm.playerLocationCountries = data.data;
                    vm.totalPlayerLocationCountries = vm.playerLocationCountries.map(item => {return item.amount}).reduce((a, b) => {return a + b},0);
                    vm.setAreaData('country', vm.playerLocationCountries, function () {
                        vm.mapName = "worldHigh";
                        vm.drawMap();
                        $scope.safeApply();
                    });
                    vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerLocationCountries, "IPLocation");
                } else if (vm.showPageName == 'PLAYER_PHONE_LOCATION') {
                    vm.playerPhoneProvince = data.data;
                    vm.totalPlayerPhoneProvince = vm.playerPhoneProvince.map(item => {return item.amount}).reduce((a, b) => {return a + b},0);
                    $scope.safeApply();
                    vm.setProvinceData('phoneProvince', vm.playerPhoneProvince, function () {
                        vm.mapName = "chinaHigh";
                        vm.drawMap(function (data) {
                            //this func is to complete all data and change province name from spelling to hanzi
                            data.dataProvider.areas = data.dataProvider.areas.map(item => {
                                item.title = vm.allProvinceId[item.id];
                                item.value = item.value || 0;
                                return item;
                            })
                        });
                        vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerPhoneProvince, "phoneLocation");
                        $scope.safeApply();
                    });
                }
            });
        }
        vm.setProvinceData = function (type, dataSource, callback) {
            var maxBulletSize = 50;
            var max = -Infinity;
            for (var i = 0; i < dataSource.length; i++) {
                if (dataSource[i]._id[type] && dataSource[i].amount > max) {
                    max = dataSource[i].amount;
                }
            }
            var maxSquare = maxBulletSize * maxBulletSize;
            var squareUnit = maxSquare / max;

            vm.areasIDArray = [];
            vm.areasDataArray = [];
            for (var j in dataSource) {
                var name = dataSource[j]._id[type];
                var value = dataSource[j].amount;
                var square = value * squareUnit;
                var size = Math.sqrt(square);

                var id = dataSource[j]._id[type];
                if (id) {
                    vm.areasIDArray.push({'id': vm.allProvinceId[id], value: value, color: "#DD22DD"});
                    var pos;
                    if (type == 'phoneProvince' && cityLocationData[name]) {
                        pos = cityLocationData[name][name];
                    } else if (type == 'phoneCity' && cityLocationData[vm.currentProvince]) {
                        pos = cityLocationData[vm.currentProvince][vm.currentProvince + id]
                    }
                    if (pos) {
                        dataSource[j].showMap = true;
                        vm.areasDataArray.push({
                            type: "circle",
                            width: size,
                            height: size,
                            longitude: pos.longitude,
                            latitude: pos.latitude,
                            title: name,
                            value: value,
                            "color": "#00CC00"
                        })
                    } else {
                        dataSource[j].showMap = false;
                    }
                }
            }
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }
        vm.setAreaData = function (type, dataSource, callback) {
            var maxBulletSize = 50;
            var max = -Infinity;
            for (var i = 0; i < dataSource.length; i++) {
                var name = dataSource[i]._id.country || dataSource[i]._id.city;
                if (name) {
                    if (dataSource[i].amount > max) {
                        max = dataSource[i].amount;
                    }
                }
            }
            var maxSquare = maxBulletSize * maxBulletSize;
            var squareUnit = maxSquare / max;

            vm.areasIDArray = [];
            vm.areasDataArray = [];
            for (var j in dataSource) {
                var value = dataSource[j].amount;
                var square = value * squareUnit;
                var size = Math.sqrt(square);

                var id = dataSource[j]._id[type];
                if (id) {
                    vm.areasIDArray.push({'id': id, value: value, color: "#DD22DD"});
                    var longitude = (vm.latlong[id]) ? vm.latlong[id].longitude : dataSource[j]._id.longitude;
                    var latitude = (vm.latlong[id]) ? vm.latlong[id].latitude : dataSource[j]._id.latitude;

                    vm.areasDataArray.push({
                        type: "circle",
                        width: size,
                        height: size,
                        longitude: longitude,
                        latitude: latitude,
                        title: vm.getCountryTitle(id),
                        value: value,
                        "color": "#00CC00"
                    })
                }
            }
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }
        vm.drawMap = function (callback) {
            var map = AmCharts.makeChart("locationMap", {
                "type": "map",
                "theme": "none",
                colorSteps: 20,
                "dataProvider": {
                    mapVar: AmCharts.maps[vm.mapName],
                    "areas": vm.areasIDArray,
                    images: vm.areasDataArray,
                    getAreasFromMap: true
                },

                imagesSettings: {
                    rollOverColor: "#089282",
                    // rollOverScale: 3,
                    // selectedScale: 3,
                    selectedColor: "#089282",
                    color: "#13564e",
                    alpha: 0.5,
                    "balloonText": "[[title]]: <strong>[[value]]</strong>"
                },

                "areasSettings": {
                    "autoZoom": true,
                    rollOverColor: "#089282",
                    "selectedColor": "#CC0000",
                    "balloonText": "[[title]]: <strong>[[value]]</strong>",
                    alpha: 0.7
                },
                "smallMap": {},
                zoomDuration: .1
            });
            if (vm.showPageName == 'PLAYER_IP_LOCATION') {
                map.addListener("clickMapObject", function (event) {
                    if (!vm.showCountryTable) return;
                    vm.showCountryTable = false;
                    vm.countryId = event.mapObject.id;
                    var longitude = (vm.latlong[vm.countryId]) ? vm.latlong[vm.countryId].longitude : false;
                    var latitude = (vm.latlong[vm.countryId]) ? vm.latlong[vm.countryId].latitude : false;
                    var sendData = {
                        platform: vm.selectedPlatform._id,
                        player: vm.queryPara.playerLocation.player,
                        date: vm.queryPara.playerLocation.date,
                        country: event.mapObject.id,
                        startTime: vm.queryPara.playerLocation.startTime.data('datetimepicker').getLocalDate(),
                        endTime: vm.queryPara.playerLocation.endTime.data('datetimepicker').getLocalDate(),
                    };
                    socketService.$socket($scope.AppSocket, 'getPlayerLoginLocationInCountry', sendData, function (data) {
                        console.log('city data', data);
                        vm.playerLocationCities = data.data;
                        var mapStr = '';
                        if (event.mapObject.id == "CN") {
                            vm.mapName = 'chinaHigh';
                        } else if (event.mapObject.id == "SG") {
                            vm.mapName = 'singaporeHigh';
                        } else {
                            vm.mapName = "worldHigh";
                        }
                        vm.setAreaData('city', vm.playerLocationCities, function () {
                            map.dataProvider.mapVar = AmCharts.maps[vm.mapName];
                            map.dataProvider.images = vm.areasDataArray;
                            map.validateNow();
                            if (longitude && latitude && (vm.mapName == "worldHigh")) {
                                var mapObject = map.getObjectById(vm.countryId);
                                map.zoomToObject(mapObject);
                            }
                        });
                        vm.drawLocationCityGraphByElementId('#playerLocationPie', vm.playerLocationCities, 'IPLocation');
                    });
                });
            }
            $scope.safeApply();
            vm.map = map;
            if (callback) {
                callback(map);
            }
        }
        vm.goWorld = function () {
            vm.showCountryTable = true;
            vm.setAreaData('country', vm.playerLocationCountries, function () {
                vm.mapName = 'worldHigh';
                vm.drawMap();
            });
            vm.drawLocationCountryGraphByElementId("#playerLocationPie", vm.playerLocationCountries, "IPLocation");
        }
        vm.getCountryTitle = function (AA) {
            if (!AA) return '';
            for (var i in vm.allCountryName) {
                if (vm.allCountryName[i].id == AA) {
                    return vm.allCountryName[i].title;
                }
            }
            return AA;
        }
        vm.locationCountryClicked = function (id) {
            var mapObj = vm.map.getObjectById(id);
            if (mapObj) {
                vm.map.clickMapObject(mapObj);
            }
        }
        vm.locationCountryHover = function (id, type) {
            if (!id) {
                return;
            }
            var mapObj = vm.map.getObjectById(id);
            if (type == 'in') {
                vm.map.rollOverMapObject(mapObj, vm.map, MouseEvent);
            } else if (type == 'out') {
                vm.map.rollOutMapObject(mapObj, vm.map, MouseEvent);
            }
        }

        vm.locationProvinceHover = function (id, type) {
            if (!id) {
                return;
            }
            var mapObj = vm.map.getObjectById(vm.allProvinceId[id]);
            if (type == 'in') {
                vm.map.rollOverMapObject(mapObj, vm.map, null);
            } else if (type == 'out') {
                vm.map.rollOutMapObject(mapObj, vm.map, null);
            }
        }
        // player location end ================================================

        //reward analysis clicked ================================================
        vm.rewardAnalysisInit = function (callback) {
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform._id}, function (data) {
                vm.rewardList = data.data;
                if (vm.rewardList.length > 0) {
                    vm.selectReward = vm.rewardList[0];
                }
                console.log('vm.rewardList', vm.rewardList);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        }
        vm.rewardClicked = function (v) {
            vm.selectReward = v;
            console.log('v', v);
            $scope.safeApply();
            vm.plotRewardLine();
        }
        vm.plotRewardLine = function () {
            if (!vm.selectReward.type) return;
            vm.isShowLoadingSpinner('#rewardAnalysis', true);
            console.log('vm.selectReward', vm.selectReward);

            let startDate = vm.queryPara.reward.startTime.data('datetimepicker').getLocalDate();
            let endDate =  vm.queryPara.reward.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectReward.platform,
                period: vm.queryPara.reward.periodText,
                startTime: startDate,
                endTime: endDate,
                type: vm.selectReward.type.name
            };

            socketService.$socket($scope.AppSocket, 'getPlatformRewardAnalysis', sendData, function success(data1) {

                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.reward.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformRewardData = data1.data;
                    vm.platformRewardAnalysisData = [];
                    for(let i = 0; i<periodDateData.length; i++){
                        let rewardWithinPeriod = vm.platformRewardData.filter(reward => new Date(reward.createTime).getTime() > periodDateData[i].getTime() && new Date(reward.createTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.reward.periodText, periodDateData[i]));
                        vm.platformRewardAnalysisData.push({
                            date: periodDateData[i],
                            rewards: rewardWithinPeriod,
                        });
                    }
                    vm.platformRewardDataPeriodText = vm.queryPara.reward.periodText;
                    console.log('vm.platformRewardAnalysisData', vm.platformRewardAnalysisData);

                    // redefine the amount for line graph
                    vm.platformRewardAnalysisAmount = [];
                    vm.platformRewardAnalysisData.forEach(item => {

                        let totalRewardAmount = item.rewards.length > 0 ? item.rewards.reduce((a, b) => a + (b.data.rewardAmount ? b.data.rewardAmount : 0), 0) : 0;

                        vm.platformRewardAnalysisAmount.push({
                            date: item.date,
                            rewards: totalRewardAmount
                        });

                    });

                    let calculatedRewardData = vm.calculateLineDataAndAverage(vm.platformRewardAnalysisAmount, 'rewards', 'Reward amount');
                    vm.platformRewardAmountAverage = calculatedRewardData.average;
                    vm.plotLineByElementId("#line-reward-amount", calculatedRewardData.lineData, $translate('Reward amount'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.reward.periodText.toUpperCase()));

                    let calculatedRewardNumber = vm.calculateLineDataAndAverage(vm.platformRewardAnalysisData, 'rewards', 'Reward number');
                    vm.platformRewardNumberAverage = calculatedRewardNumber.average;
                    vm.plotLineByElementId("#line-reward-number", calculatedRewardNumber.lineData, $translate('Reward number'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.reward.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#rewardAnalysis', false);
                });
            })


            // var placeholder1 = "#line-reward-amount";
            // var placeholder2 = "#line-reward-number";
            // // var periodText = $('#analysisReward select').val();
            // console.log('vm.selectReward', vm.selectReward);
            // var sendData = {
            //     platformId: vm.selectReward.platform,
            //     period: vm.queryPara.reward.periodText,
            //     // startTime: vm.queryPara.reward.startTime,
            //     // endTime: vm.queryPara.reward.endTime,
            //     startTime: vm.queryPara.reward.startTime.data('datetimepicker').getLocalDate(),
            //     endTime: vm.queryPara.reward.endTime.data('datetimepicker').getLocalDate(),
            //     type: vm.selectReward.type.name
            // };
            // socketService.$socket($scope.AppSocket, 'getPlatformRewardAnalysis', sendData, function success(data1) {
            //     console.log('data1', data1);
            //     var rewardGraphData = data1.data || [];
            //     var rewardNumberData = {}, rewardAmountData = {};
            //     // for (var i = 0; i < rewardGraphData.length; i++) {
            //     //     switch (vm.queryPara.reward.periodText) {
            //     //         case 'day':
            //     //             rewardAmountData[rewardGraphData[i]._id.date] = rewardGraphData[i].amount;
            //     //             rewardNumberData[rewardGraphData[i]._id.date] = rewardGraphData[i].number;
            //     //             break;
            //     //         case 'week':
            //     //             rewardAmountData[rewardGraphData[i]._id.week] = rewardGraphData[i].amount;
            //     //             rewardNumberData[rewardGraphData[i]._id.week] = rewardGraphData[i].number;
            //     //             break;
            //     //         case 'month':
            //     //             rewardAmountData[rewardGraphData[i]._id.year + '' + rewardGraphData[i]._id.month] = rewardGraphData[i].amount;
            //     //             rewardNumberData[rewardGraphData[i]._id.year + '' + rewardGraphData[i]._id.month] = rewardGraphData[i].number;
            //     //             break;
            //     //     }
            //     // }
            //     var graphData1 = [], graphData2 = [];
            //     rewardGraphData.map(item => {
            //         graphData1.push([new Date(item._id.date), item.amount]);
            //         graphData2.push([new Date(item._id.date), item.number]);
            //     })
            //     var newOptions = {};
            //     // var nowDate = new Date(sendData.startTime);
            //     switch (vm.queryPara.reward.periodText) {
            //         case 'day':
            //             // do {
            //             //     var dateText = utilService.$getTimeFromStdTimeFormat(nowDate).substring(0, 10);
            //             //     graphData1.push([nowDate.getTime(), (rewardAmountData[dateText] || 0)]);
            //             //     graphData2.push([nowDate.getTime(), (rewardNumberData[dateText] || 0)]);
            //             //     nowDate.setDate(nowDate.getDate() + 1);
            //             // } while (nowDate <= sendData.endTime);
            //             newOptions = {
            //                 xaxis: {
            //                     tickLength: 0,
            //                     mode: "time",
            //                     minTickSize: [1, "day"],
            //                 }
            //             };
            //             break;
            //         case 'week':
            //             // var k = 0;
            //             // do {
            //             //     // var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
            //             //     graphData1.push([nowDate.getTime(), (rewardAmountData[k] || 0)]);
            //             //     graphData2.push([nowDate.getTime(), (rewardNumberData[k] || 0)]);
            //             //     nowDate.setDate(nowDate.getDate() + 7);
            //             //     k++;
            //             // } while (nowDate <= sendData.endTime);
            //             newOptions = {
            //                 xaxes: [{
            //                     position: 'bottom',
            //                     axisLabel: $translate('WEEK'),
            //                 }],
            //                 xaxis: {
            //                     tickLength: 0,
            //                     mode: "time",
            //                     minTickSize: [6, "day"],
            //                 }
            //             };
            //             break;
            //         case 'month' :
            //             // nowDate.setDate(1);
            //             // do {
            //             //     var nowYear = nowDate.getFullYear();
            //             //     var nowMonth = nowDate.getMonth() + 1;
            //             //     console.log('nowMonth', nowYear + '' + nowMonth);
            //             //     graphData1.push([nowDate.getTime(), (rewardAmountData[nowYear + '' + nowMonth] || 0)]);
            //             //     graphData2.push([nowDate.getTime(), (rewardNumberData[nowYear + '' + nowMonth] || 0)]);
            //             //     nowDate.setMonth(nowDate.getMonth() + 1);
            //             //
            //             // } while (nowDate <= sendData.endTime);
            //             newOptions = {
            //                 xaxis: {
            //                     tickLength: 0,
            //                     mode: "time",
            //                     minTickSize: [1, "month"],
            //                 }
            //             };
            //             break;
            //     }
            //     // console.log('graph', graphData);
            //     newOptions.yaxes = [{
            //         position: 'left',
            //         axisLabel: $translate('Reward amount'),
            //     }];
            //     socketService.$plotLine(placeholder1, [{
            //         label: $translate('Reward amount'),
            //         data: graphData1
            //     }], newOptions);
            //     newOptions.yaxes = [{
            //         position: 'left',
            //         axisLabel: $translate('Reward number'),
            //     }]
            //     //draw table
            //
            //     var tableData = [];
            //     for (var i in graphData1) {
            //         var obj = {};
            //         obj.date = utilService.$getTimeFromStdTimeFormat(graphData1[i][0]).substring(0, 10);
            //         obj.amount = graphData1[i][1] || 0;
            //         tableData.push(obj);
            //     }
            //     var dataOptions = {
            //         data: tableData,
            //         columns: [
            //             {title: $translate(vm.queryPara.reward.periodText), data: "date"},
            //             {title: $translate('Reward amount'), data: "amount"}
            //         ],
            //         "paging": false,
            //     };
            //     dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            //     var a = $('#rewardAmountAnalysisTable').DataTable(dataOptions);
            //     a.columns.adjust().draw();
            //
            //     socketService.$plotLine(placeholder2, [{
            //         label: $translate('Reward number'),
            //         data: graphData2
            //     }], newOptions);
            //     //draw table
            //
            //     var tableData2 = [];
            //     for (var i in graphData2) {
            //         var obj = {};
            //         obj.date = utilService.$getTimeFromStdTimeFormat(graphData2[i][0]).substring(0, 10);
            //         obj.amount = graphData2[i][1] || 0;
            //         tableData2.push(obj);
            //     }
            //     var dataOptions2 = {
            //         data: tableData2,
            //         columns: [
            //             {title: $translate(vm.queryPara.reward.periodText), data: "date"},
            //             {title: $translate('Reward number'), data: "amount"}
            //         ],
            //         "paging": false,
            //     };
            //     dataOptions2 = $.extend({}, $scope.getGeneralDataTableOption, dataOptions2);
            //     var b = $('#rewardNumberAnalysisTable').DataTable(dataOptions2);
            //     b.columns.adjust().draw();
            //
            //     $(placeholder1).bind("plothover", function (event, pos, obj) {
            //         var previousPoint;
            //         // console.log('event, pos, obj', pos, obj);
            //         if (!obj) {
            //             $("#tooltip").hide();
            //             previousPoint = null;
            //             return;
            //         } else {
            //             if (previousPoint != obj.dataIndex) {
            //                 previousPoint = obj.dataIndex;
            //
            //                 var x = obj.datapoint[0],
            //                     y = obj.datapoint[1].toFixed(0);
            //
            //                 var date = new Date(x);
            //                 var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
            //                 // console.log('date', x, date);
            //                 $("#tooltip").html("Amount : " + y + '<br>' + $filter('capFirst')(vm.queryPara.reward.periodText) + " : " + dateString)
            //                     .css({top: obj.pageY + 5, left: obj.pageX + 5})
            //                     .fadeIn(200);
            //             }
            //         }
            //     });
            //     $(placeholder2).bind("plothover", function (event, pos, obj) {
            //         var previousPoint;
            //         // console.log('event, pos, obj', pos, obj);
            //         if (!obj) {
            //             $("#tooltip").hide();
            //             previousPoint = null;
            //             return;
            //         } else {
            //             if (previousPoint != obj.dataIndex) {
            //                 previousPoint = obj.dataIndex;
            //
            //                 var x = obj.datapoint[0],
            //                     y = obj.datapoint[1].toFixed(0);
            //
            //                 var date = new Date(x);
            //                 var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
            //                 // console.log('date', x, date);
            //                 $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.reward.periodText) + " : " + dateString)
            //                     .css({top: obj.pageY + 5, left: obj.pageX + 5})
            //                     .fadeIn(200);
            //             }
            //         }
            //     });
            // });
        };
        // vm.plotRewardNumberLine = function () {
        // };
        //reward analysis clicked end ================================================

        //player device analysis clicked ================================================
        vm.deviceAnalysisInit = function (callback) {
            vm.isShowLoadingSpinner('#playerDeviceAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                type: vm.queryPara.playerDevice.type,
                // startDate: vm.queryPara.playerDevice.startTime,
                // endDate: vm.queryPara.playerDevice.endTime
                startDate: vm.queryPara.playerDevice.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerDevice.endTime.data('datetimepicker').getLocalDate(),
            }

            socketService.$socket($scope.AppSocket, 'getPlayerDeviceAnalysisData', sendData, function (data) {
                vm.playerDeviceList = data.data;
                console.log('device data', vm.playerDeviceList);
                $scope.safeApply();
                vm.plotPlayerDevice();
                vm.isShowLoadingSpinner('#playerDeviceAnalysis', false);
            });
        }
        vm.plotPlayerDevice = function (data) {
            var placeholder = '#pie-all-playerDevice'
            var pieData = vm.playerDeviceList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphNameWithoutCutString(obj._id.name), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'newPlayerPieClickData');
            var placeholderBar = "#bar-all-playerDevice";

            if(vm.newOptions && vm.newOptions.xaxes){
                if(vm.newOptions.xaxes.length > 0){
                    let axisLabel = "";

                    if(vm.queryPara && vm.queryPara.playerDevice && vm.queryPara.playerDevice.type){
                        axisLabel = vm.queryPara.playerDevice.type[0].toUpperCase() + vm.queryPara.playerDevice.type.slice(1);
                    }

                    vm.newOptions.xaxes[0].axisLabel = $translate(axisLabel);
                }
            }

            socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
        }
        //player device analysis clicked end ================================================

        //player domain analysis clicked ================================================
        vm.domainAnalysisInit = function (callback) {
            var sendData = {
                platformId: vm.selectedPlatform._id,
                startTime: vm.queryPara.playerDomain.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerDomain.endTime.data('datetimepicker').getLocalDate(),
            }

            socketService.$socket($scope.AppSocket, 'getPlayerDomainAnalysisData', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerDomainList = data.data;
                    console.log('domain data', vm.playerDomainList);
                    vm.plotPlayerDomain();
                })
            });
        }
        vm.plotPlayerDomain = function (data) {
            var placeholder = '#pie-all-playerDomain';
            var pieData = vm.playerDomainList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                console.log(obj);
                let label = obj._id.replace(/(^http:\/\/)|(www\.)|(\:\d{1,}$)/mgi,"");
                return {label: vm.setGraphNameWithoutCutString(label), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            });

            vm.totalPlayerDomainRecord = pieData.reduce((a,b) => a + (b.data ? b.data : 0),0);

            pieData.map(p => {
                if(p && p.data && vm.totalPlayerDomainRecord){
                    p.percentage = (p.data / vm.totalPlayerDomainRecord * 100).toFixed(2);
                }
            });

            vm.playerDomainPieData = pieData;

            socketService.$plotPie(placeholder, pieData, {}, 'playerDomainPieClickData');
            //var placeholderBar = "#bar-all-playerDomain";
            //socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
        };
        //player domain analysis clicked end ================================================

        //player retention start ==================================================================
        vm.retentionAddDay = function () {
            vm.queryPara.playerRetention.days.push(parseInt(vm.newDay));
            vm.playerRetentionInit();
        }
        vm.retentionRemoveDay = function () {
            vm.queryPara.playerRetention.days.pop();
            if (vm.queryPara.playerRetention.days.length == 0) {
                vm.queryPara.playerRetention.days = [1];
            }
            vm.playerRetentionInit();
        }
        vm.playerRetentionInit = function (callback) {
            vm.newDay = (vm.queryPara.playerRetention.days.slice(-1).pop() + 1).toString();
            $scope.safeApply();
            if (callback) {
                callback();
            }
        };

        vm.retentionFilterOnChange = function () {
            vm.queryPara.playerRetention.minTime = utilService.getFormatDate(vm.queryPara.playerRetention.startTime);
            $scope.safeApply();
        }

        vm.tableDataReformat = function (data) {
            if (Number.isInteger(data)) {
                return data;
            } else {
                return data.toFixed(3);
            }
        }

        vm.getPlayerRetention = function () {
            vm.isShowLoadingSpinner('#analysisPlayerRetention', true);
            vm.retentionGraphData = [];
            vm.showRetention = {0: true};//set default
            vm.retentionCheckAll = false;
            vm.allRetentionLineData = [];
            var sendData = {
                platform: vm.selectedPlatform._id,
                days: vm.queryPara.playerRetention.days,
                startTime: vm.queryPara.playerRetention.startTime,
                endTime: vm.queryPara.playerRetention.endTime,
                playerType: vm.queryPara.playerRetention.playerType
            }
            socketService.$socket($scope.AppSocket, 'getPlayerRetention', sendData, function (data) {
                console.log("retention data", data);
                vm.retentionData = data.data;
                let dataLength = vm.retentionData.length;
                vm.averageRetention = {};
                vm.retentionData.forEach(retentionData => {
                    for (let key in retentionData) {
                        if (retentionData[key] != "date") {
                            if (vm.averageRetention[key]) {
                                vm.averageRetention[key] += retentionData[key];
                            } else {
                                vm.averageRetention[key] = retentionData[key];
                            }
                        }
                    }
                });
                for (let key in vm.averageRetention) {
                    if (vm.averageRetention.hasOwnProperty(key)){
                        vm.averageRetention[key] = (vm.averageRetention[key] / dataLength);
                    }
                }
                vm.averageRetention.date = $translate("average line");
                vm.retentionData.splice(0,0,vm.averageRetention);

                $scope.safeApply();
                vm.drawRetentionGraph();
                vm.isShowLoadingSpinner('#analysisPlayerRetention', false);
            }, function (data) {
                vm.isShowLoadingSpinner('#analysisPlayerRetention', false);
                console.log("retention data not", data);
            });
        }
        vm.toggleRetentionCheckAll = function () {
            if (vm.retentionCheckAll) {
                for (var i in vm.retentionData) {
                    vm.showRetention[i] = true;
                }
            } else {
                vm.showRetention = {};
            }
            $scope.safeApply();
            vm.drawRetentionGraph();
        }
        vm.drawRetentionGraph = function () {
            vm.allRetentionLineData = [];
            $.each(vm.retentionData, function (day, obj) {
                var rowData = [];
                if (vm.showRetention[day]) {
                    $.each(obj, function (a, b) {
                        if (a != 'day0' && a != 'date' && a != '$$hashKey') {
                            if (obj.day0 != 0) {
                                rowData.push([a, b / obj.day0 * 100]);
                            } else {
                                rowData.push([a, 0]);
                            }
                        }
                    });
                    rowData.sort((a, b) => {
                        return a[0] - b[0];
                    });
                    var lineData = {label: vm.dateReformat(obj.date), data: rowData};
                    vm.allRetentionLineData.push(lineData);
                }
            })
            var xLabel = [];
            for (var j in vm.queryPara.playerRetention.days) {
                xLabel.push([vm.queryPara.playerRetention.days[j], vm.queryPara.playerRetention.days[j]]);
            }
            var placeholder = '#line-playerRetention';
            var newOptions = {};
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: 'day N',
            }];
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: 'Retention %',
            }];
            newOptions.xaxis = {
                ticks: xLabel,
            };

            let retentionGraph = socketService.$plotLine(placeholder, vm.allRetentionLineData, newOptions)
                $.each(retentionGraph.getData()[0].data, function(i, el){
                    var o = retentionGraph.pointOffset({x: el[0], y: el[1]});
                    $('<div class="data-point-label">' + el[1].toFixed(3) + '%</div>').css( {
                        position: 'absolute',
                        left: o.left + 4,
                        top: o.top - 15,
                        display: 'none'
                    }).appendTo(retentionGraph.getPlaceholder()).fadeIn('slow');
                });

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var fre = $translate('DAY');
                $("#tooltip").html("% : " + y + '<br>' + fre + " : " + x)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })
        }
        //player retention end ==================================================================


        //game analysis start  =================================================
        vm.getAllProvider = function () {
            socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                vm.allGameProvider = data.data;
                $scope.safeApply();
                //vm.buildProviderList(vm.allGameProvider);
            }, function (data) {
                console.log("create not", data);
            });
        };
        vm.getPlatformProvider = function (id) {
            if (!id) return;
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: id}, function (data) {
                vm.allProviders = data.data.gameProviders;
                console.log('vm.allProviders', vm.allProviders);
                $scope.safeApply();
                }, function (data) {
                console.log("create not", data);
            });
        };
        vm.providerOptClicked = function (i, v) {
            vm.highlightProvider = {};
            vm.selectedProvider = v;
            vm.highlightProvider[i] = 'bg-bright';
            drawProviderActivePlayerLine();
            $scope.safeApply();
        }
        function drawProviderActivePlayerLine() {
            var placeholder = "#line-gameana-player";
            var data1 = [], data2 = [], series = 10;
            for (var i = 0; i < series; i++) {
                data1[i] = {
                    label: "game " + (i + 1),
                    data: Math.floor(Math.random() * 10000) + 1
                }
                data2[i] = {
                    label: "game " + (i + 2),
                    data: Math.floor(Math.random() * 10000) + 1
                }
            }
            var newOption = {
                xaxis: {
                    axisLabel: 'any label to specify',
                    tickLength: 1,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                },
                yaxis: {
                    axisLabel: $translate('Active Player'),
                    min: 0,
                    tickFormatter: function (val, axis) {
                        return val.toFixed(2);
                    }
                }
            };
            socketService.$plotLine(placeholder, [vm.getLinedata(data1), vm.getLinedata(data2)], newOption);
        }

        //game analysis end  =================================================

        //player credit start ====================================================
        vm.plotPlayerCreditLine = function (type) {
            // var placeholder = "#line-playerCredit";
            let opt = '';
            if (type == 'PLAYER_EXPENSES') {
                opt = 'consumption';
            }
            vm.isShowLoadingSpinner('#playerCreditAnalysis', true);
            let startDate = vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                type: opt,
                providerId: !vm.queryPara.playerCredit.filterGameProvider ? 'all' : vm.queryPara.playerCredit.filterGameProvider,
                startDate: startDate,
                endDate: endDate,
            };
            socketService.$socket($scope.AppSocket, 'countConsumptionByPlatform', sendData, function (data) {
                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.playerCredit.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }
                    vm.platformConsumptionData = data.data;
                    vm.platformConsumptionAnalysisData = [];
                    for (let i = 0; i < periodDateData.length; i++) {
                        let consumptionWithinPeriod = vm.platformConsumptionData.filter(consumption => new Date(consumption.date).getTime() >= periodDateData[i].getTime() && new Date(consumption.date).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.playerCredit.periodText, periodDateData[i]));
                        vm.platformConsumptionAnalysisData.push({
                            date: periodDateData[i],
                            consumptions: consumptionWithinPeriod});
                    }
                    vm.platformConsumptionDataPeriodText = vm.queryPara.playerCredit.periodText;
                    console.log('vm.platformConsumptionAnalysisData', vm.platformConsumptionAnalysisData);

                    vm.platformConsumptionAnalysisAmount = [];
                    vm.platformConsumptionAnalysisData.forEach(item => {
                        let totalConsumptionAmount = item.consumptions.length > 0 ? item.consumptions.reduce((a, b) => a + (b.validAmount ? b.validAmount : 0), 0) : 0;
                        vm.platformConsumptionAnalysisAmount.push({
                            date: item.date,
                            consumptions: $noRoundTwoDecimalPlaces(totalConsumptionAmount)
                        });
                    });

                    let calculatedConsumptionData = vm.calculateLineDataAndAverageForDecimalPlaces(vm.platformConsumptionAnalysisAmount, 'consumptions', 'PLAYER_EXPENSES');
                    vm.platformConsumptionAmountAverage = calculatedConsumptionData.average;
                    vm.plotLineByElementId("#line-playerCredit", calculatedConsumptionData.lineData, $translate('AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.playerCredit.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#playerCreditAnalysis', false);
                });
            });

        };

        vm.drawPlayerCreditLine = function () {
            vm.isShowLoadingSpinner('#playerCreditAnalysis', true);
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                startDate: vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate(),
                // startDate: vm.queryPara.playerCredit.startTime,
                // endDate: vm.queryPara.playerCredit.endTime
            }
            socketService.$socket($scope.AppSocket, 'countTopUpbyPlatform', sendData, function (data) {
                let averageNumber = 0;
                vm.playerCreditData = data.data;
                console.log('vm.playerCreditData', vm.playerCreditData);
                averageNumber = ((data.data.reduce((a,b) => a + (b.number ? b.number : 0),0)) / data.data.length).toFixed(2);
                // $scope.safeApply();
                vm.isShowLoadingSpinner('#playerCreditAnalysis', false);
                return vm.drawPlayerCreditGraph(vm.playerCreditData, sendData, averageNumber);
            }, function (data) {
                vm.isShowLoadingSpinner('#playerCreditAnalysis', false);
                console.log("player credit data not", data);
            });
        }

        vm.drawPlayerCreditGraph = function (srcData, sendData, averageNumber) {
            var placeholder = '#line-playerCredit';
            var playerCreditObjData = {};
            // for (var i = 0; i < srcData.length; i++) {
            //     switch (vm.queryPara.playerCredit.periodText) {
            //         case 'day':
            //             playerCreditObjData[srcData[i]._id.date] = srcData[i].number;
            //             break;
            //         case 'week':
            //             playerCreditObjData[srcData[i]._id.week] = srcData[i].number;
            //             break;
            //         case 'month':
            //             playerCreditObjData[srcData[i]._id.year + '' + srcData[i]._id.month] = srcData[i].number;
            //             break;
            //     }
            // }
            var graphData = [];
            var averageData = [];
            srcData.map(item => {
                graphData.push([new Date(item._id.date), item.number])
                averageData.push([new Date(item._id.date), averageNumber])
            })
            var newOptions = {};
            // var nowDate = new Date(sendData.startDate);
            var xText = '';
            switch (vm.queryPara.playerCredit.periodText) {
                case 'day':
                    // do {
                    //     var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[dateText] || 0)]);
                    //     nowDate.setDate(nowDate.getDate() + 1);
                    // } while (nowDate <= sendData.endDate);
                    xText = 'DAY';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "day"],
                        }
                    };
                    break;
                case 'week':
                    // var k = 0;
                    // do {
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[k] || 0)]);
                    //     nowDate.setDate(nowDate.getDate() + 7);
                    //     k++;
                    // } while (nowDate <= sendData.endDate);
                    xText = 'WEEK';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [6, "day"],
                        }
                    };
                    break;
                case 'month' :
                    // nowDate.setDate(1);
                    // do {
                    //     var nowYear = nowDate.getFullYear();
                    //     var nowMonth = nowDate.getMonth() + 1;
                    //     console.log('nowMonth', nowYear + '' + nowMonth);
                    //     graphData.push([nowDate.getTime(), (playerCreditObjData[nowYear + '' + nowMonth] || 0)]);
                    //     nowDate.setMonth(nowDate.getMonth() + 1);
                    //
                    // } while (nowDate <= sendData.endDate);
                    xText = 'MONTH';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "month"],
                        }
                    };
                    break;
            }
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('AMOUNT'),
            }]
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
            }]

            newOptions.colors = ["#00afff", "#FF0000"];

            socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData},{label: $translate('average line'), data: averageData}], newOptions);

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var date = new Date(x);
                var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())

                var yText = $translate('AMOUNT');
                var fre = $translate(vm.queryPara.playerCredit.periodText.toUpperCase());
                $("#tooltip").html(yText + " : " + y + '<br>' + fre + " : " + dateString)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })

            //draw table

            var tableData = [];
            for (var i in graphData) {
                var obj = {};
                obj.date = String(utilService.$getTimeFromStdTimeFormat(new Date(graphData[i][0]))).substring(0, 10);
                let amount = graphData[i][1] || 0;
                obj.amount = amount.toFixed(2);
                tableData.push(obj);
            }
            tableData.push({date: $translate('average value'), amount: averageNumber});
            var dataOptions = {
                data: tableData,
                columns: [
                    {title: $translate(vm.queryPara.playerCredit.periodText), data: "date"},
                    {title: $translate('amount'), data: "amount"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $('#playerCreditAnalysisTable').DataTable(dataOptions);
            a.columns.adjust().draw();
        }

        vm.drawPlayerCreditCountLine = function () {
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                type: 'topup',
                startDate: vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'countTopUpCountByPlatform', sendData, function (data) {
                let averageNumber = 0;
                vm.playerCreditData = data.data;
                console.log('vm.playerCreditData', vm.playerCreditData);
                averageNumber = ((data.data.reduce((a,b) => a + (b.number ? b.number : 0),0)) / data.data.length).toFixed(2);

                // $scope.safeApply();
                return vm.drawPlayerCreditCountGraph(vm.playerCreditData, sendData, averageNumber);
            }, function (data) {
                console.log("player credit data not", data);
            });
        }

        vm.drawPlayerCreditCountGraph = function (srcData, sendData, averageNumber) {
            var placeholder = '#line-playerCreditCount';
            var playerCreditObjData = {};

            var graphData = [];
            var averageData = [];
            srcData.map(item => {
                graphData.push([new Date(item._id.date), item.number])
                averageData.push([new Date(item._id.date), averageNumber])
            })
            var newOptions = {};
            // var nowDate = new Date(sendData.startDate);
            var xText = '';
            switch (vm.queryPara.playerCredit.periodText) {
                case 'day':
                    xText = 'DAY';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "day"],
                        }
                    };
                    break;
                case 'week':
                    xText = 'WEEK';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [6, "day"],
                        }
                    };
                    break;
                case 'month' :
                    xText = 'MONTH';
                    newOptions = {
                        xaxis: {
                            tickLength: 0,
                            mode: "time",
                            minTickSize: [1, "month"],
                        }
                    };
                    break;
            }
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('COUNT'),
            }]
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
            }]

            newOptions.colors = ["#00afff", "#FF0000"];

            socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData},{label: $translate('average line'), data: averageData}], newOptions);

            vm.bindHover(placeholder, function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);

                var date = new Date(x);
                var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())

                var yText = $translate('COUNT');
                var fre = $translate(vm.queryPara.playerCredit.periodText.toUpperCase());
                $("#tooltip").html(yText + " : " + y + '<br>' + fre + " : " + dateString)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })

            //draw table

            var tableData = [];
            for (var i in graphData) {
                var obj = {};
                obj.date = String(utilService.$getTimeFromStdTimeFormat(new Date(graphData[i][0]))).substring(0, 10);
                let count = graphData[i][1] || 0;
                obj.count = count.toFixed(0);
                tableData.push(obj);
            }
            tableData.push({date: $translate('average value'), count: averageNumber});
            var dataOptions = {
                data: tableData,
                columns: [
                    {title: $translate(vm.queryPara.playerCredit.periodText), data: "date"},
                    {title: $translate('COUNT'), data: "count"}
                ],
                "paging": false,
            };
            dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
            var a = $('#playerCreditCountAnalysisTable').DataTable(dataOptions);
            a.columns.adjust().draw();
        }
        //player credit end =======================================================

        //bonus amount 
        vm.drawPlayerBonusAmount = function (type) {
            var opt = '';
            if (type == 'PLAYER_EXPENSES') {
                opt = 'consumption';
            } else if (type == 'PLAYER_TOPUP') {
                opt = 'topup';
            }
            vm.isShowLoadingSpinner('#bonusAmountAnalysis', true);
            let startDate = vm.queryPara.bonusAmount.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.bonusAmount.endTime.data('datetimepicker').getLocalDate();

            var sendData = {
                platform: vm.selectedPlatform._id,
                period: vm.queryPara.bonusAmount.periodText,
                type: opt,
                startDate: startDate,
                endDate: endDate,
            };

            socketService.$socket($scope.AppSocket, 'getAnalysisSingleBonusRequestList', sendData, function (data) {

                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.bonusAmount.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformBonusData = data.data;
                    vm.platformBonusAnalysisData = [];

                    for (let i = 0; i < periodDateData.length; i++) {
                        let bonusWithinPeriod = vm.platformBonusData.filter(bonus => new Date(bonus.createTime).getTime() > periodDateData[i].getTime() && new Date(bonus.createTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.bonusAmount.periodText, periodDateData[i]));
                        vm.platformBonusAnalysisData.push({
                            date: periodDateData[i],
                            bonus: bonusWithinPeriod,
                        });
                    }
                    vm.platformBonusDataPeriodText = vm.queryPara.bonusAmount.periodText;
                    console.log('vm.platformBonusAnalysisData', vm.platformBonusAnalysisData);

                    vm.platformBonusAnalysisAmount = [];
                    vm.platformBonusAnalysisData.forEach(item => {

                        let totalBonusAmount = item.bonus.length > 0 ? item.bonus.reduce((a, b) => a + (b.data.amount ? b.data.amount : 0), 0) : 0;

                        vm.platformBonusAnalysisAmount.push({
                            date: item.date,
                            bonus: totalBonusAmount
                        });

                    });

                    let calculatedBonusData = vm.calculateLineDataAndAverage(vm.platformBonusAnalysisAmount, 'bonus', 'BONUS_AMOUNT');
                    vm.platformBonusAmountAverage = calculatedBonusData.average;
                    vm.plotLineByElementId("#line-bonusAmount", calculatedBonusData.lineData, $translate('BONUS_AMOUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.bonusAmount.periodText.toUpperCase()));

                    let calculatedBonusNumber = vm.calculateLineDataAndAverage(vm.platformBonusAnalysisData, 'bonus', 'WITHDRAW_COUNT');
                    vm.platformBonusNumberAverage = calculatedBonusNumber.average;
                    vm.plotLineByElementId("#line-bonusCount", calculatedBonusNumber.lineData, $translate('WITHDRAW_COUNT'), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.bonusAmount.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#bonusAmountAnalysis', false);
                });

            //     vm.playerBonusData = data.data;
            //
            //     // $scope.safeApply();
            //     return vm.drawPlayerBonusGraph(vm.playerBonusData, sendData);
            // }, function (data) {
            //     console.log("player credit data not", data);
            });
        }
        // vm.drawPlayerBonusGraph = function (srcData, sendData) {
        //     var placeholder = '#line-bonusAmount';
        //     var playerCreditObjData = {};
        //
        //     var graphData = [];
        //     srcData.map(item => {
        //         graphData.push([new Date(item._id), item.number])
        //     })
        //     var newOptions = {};
        //     // var nowDate = new Date(sendData.startDate);
        //     var xText = '';
        //     switch (vm.queryPara.bonusAmount.periodText) {
        //         case 'day':
        //             xText = 'DAY';
        //             newOptions = {
        //                 xaxis: {
        //                     tickLength: 0,
        //                     mode: "time",
        //                     minTickSize: [1, "day"],
        //                 }
        //             };
        //             break;
        //         case 'week':
        //             xText = 'WEEK';
        //             newOptions = {
        //                 xaxis: {
        //                     tickLength: 0,
        //                     mode: "time",
        //                     minTickSize: [6, "day"],
        //                 }
        //             };
        //             break;
        //         case 'month' :
        //             xText = 'MONTH';
        //             newOptions = {
        //                 xaxis: {
        //                     tickLength: 0,
        //                     mode: "time",
        //                     minTickSize: [1, "month"],
        //                 }
        //             };
        //             break;
        //     }
        //     newOptions.yaxes = [{
        //         position: 'left',
        //         axisLabel: $translate('AMOUNT'),
        //     }]
        //     newOptions.xaxes = [{
        //         position: 'bottom',
        //         axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
        //     }]
        //
        //     socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData}], newOptions);
        //
        //     vm.bindHover(placeholder, function (obj) {
        //         var x = obj.datapoint[0],
        //             y = obj.datapoint[1].toFixed(0);
        //
        //         var date = new Date(x);
        //         var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
        //
        //         var yText = $translate('AMOUNT');
        //         var fre = $translate(vm.queryPara.bonusAmount.periodText.toUpperCase());
        //         $("#tooltip").html(yText + " : " + y + '<br>' + fre + " : " + dateString)
        //             .css({top: obj.pageY + 5, left: obj.pageX + 5})
        //             .fadeIn(200);
        //     })
        //     //draw table
        //     var tableData = [];
        //     for (var i in graphData) {
        //         var obj = {};
        //         obj.date = String(utilService.$getTimeFromStdTimeFormat(new Date(graphData[i][0]))).substring(0, 10);
        //         let amount = graphData[i][1] || 0;
        //         obj.amount = amount.toFixed(2);
        //         tableData.push(obj);
        //     }
        //     var dataOptions = {
        //         data: tableData,
        //         columns: [
        //             {title: $translate(vm.queryPara.bonusAmount.periodText), data: "date"},
        //             {title: $translate('amount'), data: "amount"}
        //         ],
        //         "paging": false,
        //     };
        //     dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
        //     var a = $('#bonusAmountAnalysisTable').DataTable(dataOptions);
        //     a.columns.adjust().draw();
        // }
        //player bonus end

        // top up manual
        vm.drawPlayerTopUp = function (type) {
            var opt = '';
            if (type == 'TOPUPMANUAL') {
                opt = 'MANUAL';
                vm.queryPara.topUp.amountTag = 'TOPUPMANUAL_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPMANUAL_COUNT';
            } else if (type == 'PlayerAlipayTopUp') {
                opt = 'ALIPAY';
                vm.queryPara.topUp.amountTag = 'TOPUPALIPAY_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPALIPAY_COUNT';
            } else if (type == 'PlayerWechatTopUp'){
                opt = 'WECHAT';
                vm.queryPara.topUp.amountTag = 'TOPUPWECHAT_AMOUNT';
                vm.queryPara.topUp.countTag = 'TOPUPWECHAT_COUNT';
            }else {

            }

            vm.isShowLoadingSpinner('#topUpAnalysis', true);
            let startDate = vm.queryPara.topUp.startTime.data('datetimepicker').getLocalDate();
            let endDate = vm.queryPara.topUp.endTime.data('datetimepicker').getLocalDate();

            var sendData = {
                platformId: vm.selectedPlatform._id,
                type: opt,
                startDate: startDate,
                endDate: endDate,
            };

            socketService.$socket($scope.AppSocket, 'getTopUpAnalysisList', sendData, function (data) {

                $scope.$evalAsync(() => {
                    let periodDateData = [];
                    while (startDate.getTime() <= endDate.getTime()) {
                        let dayEndTime = vm.getNextDateByPeriodAndDate(vm.queryPara.topUp.periodText, startDate);
                        periodDateData.push(startDate);
                        startDate = dayEndTime;
                    }

                    vm.platformTopUpData = data.data;
                    vm.platformTopUpAnalysisData = [];

                    for (let i = 0; i < periodDateData.length; i++) {
                        let topUpWithinPeriod = vm.platformTopUpData.filter(item => new Date(item.createTime).getTime() > periodDateData[i].getTime() && new Date(item.createTime).getTime() < vm.getNextDateByPeriodAndDate(vm.queryPara.topUp.periodText, periodDateData[i]));
                        vm.platformTopUpAnalysisData.push({
                            date: periodDateData[i],
                            topUpData: topUpWithinPeriod,
                        });
                    }
                    vm.platformTopUpDataPeriodText = vm.queryPara.topUp.periodText;
                    console.log('vm.platformTopUpAnalysisData', vm.platformTopUpAnalysisData);

                    vm.platformTopUpAnalysisAmount = [];
                    vm.platformTopUpAnalysisData.forEach(item => {

                        let totalAmount = item.topUpData.length > 0 ? item.topUpData.reduce((a, b) => a + (b.amount ? b.amount : 0), 0) : 0;

                        vm.platformTopUpAnalysisAmount.push({
                            date: item.date,
                            amount: totalAmount
                        });

                    });

                    let calculatedTopUpData = vm.calculateLineDataAndAverage(vm.platformTopUpAnalysisAmount, 'amount', vm.queryPara.topUp.amountTag);
                    vm.platformTopUpAmountAverage = calculatedTopUpData.average;
                    vm.plotLineByElementId("#line-topUpAmount", calculatedTopUpData.lineData, $translate(  vm.queryPara.topUp.amountTag), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));

                    let calculatedTopUpCount = vm.calculateLineDataAndAverage(vm.platformTopUpAnalysisData, 'topUpData',  vm.queryPara.topUp.countTag);
                    vm.platformTopUpCountAverage = calculatedTopUpCount.average;
                    vm.plotLineByElementId("#line-topUpCount", calculatedTopUpCount.lineData, $translate( vm.queryPara.topUp.countTag), $translate('PERIOD') + ' : ' + $translate(vm.queryPara.topUp.periodText.toUpperCase()));
                    vm.isShowLoadingSpinner('#topUpAnalysis', false);
                });
            });
        }
        // top up manual end

        //client source start =======================================
        // vm.initClientSourcePara = function (callback) {
        //     vm.clientSourcePara = {loading: true};
        //     socketService.$socket($scope.AppSocket, 'getClientSourcePara', {}, function (data) {
        //         vm.clientSourcePara = data.data;
        //         $scope.safeApply();
        //         if (callback) {
        //             callback.apply(this);
        //         }
        //     });
        // }
        vm.getClientSourceData = function () {
            var sendObj = {};
            vm.isShowLoadingSpinner('#clientSourceAnalysis', true);
            sendObj.accessType = vm.queryPara.clientSource.accessType;
            //sendObj.clientType = vm.queryPara.clientSource.clientType;
            sendObj.platformId = vm.selectedPlatform.platformId;
            sendObj.startDate = vm.queryPara.clientSource.startTime.data('datetimepicker').getLocalDate();
            sendObj.endDate = vm.queryPara.clientSource.endTime.data('datetimepicker').getLocalDate();
            socketService.$socket($scope.AppSocket, 'getClientSourceQuery', sendObj, function (data) {
                console.log('data', data);
                vm.clientSourceTblData = data.data || [];
                vm.clientSourceTotalCount = data.data.reduce((a,b) => a + (b.count ? b.count : 0),0);
                vm.drawClientSourcePie(vm.clientSourceTblData);
                vm.drawClientSourceTable(vm.clientSourceTblData,vm.clientSourceTotalCount);
                vm.isShowLoadingSpinner('#clientSourceAnalysis', false);
            });
        }
        vm.drawClientSourcePie = function (srcData) {
            var placeholder = '#clientSourceAnalysis div.graphDiv';
            var pieData = srcData.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphNameWithoutCutString(obj._id), data: obj.count};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'clientSourceClickData');
        }
        vm.drawClientSourceTable = function (tblData, count) {
            tblData.push({_id: $translate("Total"), count: count ? count : 0, ratio: "100%"})
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tblData,
                columns: [
                    {title: $translate("Domain Name"), data: "_id"},
                    {title: $translate('amount'), data: "count"},
                    {title: $translate('ratio'), data: "ratio"}
                ],
                "paging": false
            });

            $('#clientSourceAnalysis table').dataTable(options);
        }
        //client source =============================================

        //consumption interval ////////////////////////////////////
        vm.getConsumptionIntervalData = function () {
            var sendObj = {
                platform: vm.selectedPlatform._id,
                days: vm.consumptionInterval.pastDay
            }
            socketService.$socket($scope.AppSocket, 'getConsumptionIntervalData', sendObj, function (data) {
                console.log('data', data);
                vm.consumptionInterval.data = data.data || [];
                var graphData = [];
                vm.consumptionInterval.data.forEach(item => {
                    graphData.push([new Date(item.time0), item.count, new Date(item.time1)]);
                })
                vm.drawConsumptionIntervalLine('#line-consumptionInterval', graphData, {});
            });
        };
        vm.drawConsumptionIntervalLine = function (dom, graphData, option) {
            var data = {label: '', data: graphData};
            var newOptions = {};
            newOptions.yaxes = [{
                position: 'left',
                axisLabel: $translate('amount'),
            }];
            newOptions.xaxes = [{
                position: 'bottom',
                axisLabel: $translate('TIME')
            }];
            newOptions.xaxis = {
                tickLength: 0,
                mode: "time",
                minTickSize: [1, "minute"],
                timezone: "browser"
            }
            socketService.$plotLine('#line-consumptionInterval', [data], newOptions);
            vm.bindHover('#line-consumptionInterval', function (obj) {
                var x = obj.datapoint[0],
                    y = obj.datapoint[1].toFixed(0);
                var t0 = obj.series.data[obj.dataIndex][0];
                var t1 = obj.series.data[obj.dataIndex][2];
                var showText = $translate('from') + ' : ' + utilService.getFormatTime(t0) + '<br>'
                    + $translate('to') + ' : ' + utilService.getFormatTime(t1) + '<br>'
                    + $translate('amount') + ' : ' + y;
                $("#tooltip").html(showText)
                    .css({top: obj.pageY + 5, left: obj.pageX + 5})
                    .fadeIn(200);
            })
        }

        //common functions======================================================
        vm.bindHover = function (placeholder, callback) {
            $(placeholder).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;

                        if (callback) {
                            callback(obj);
                        }
                    }
                }
            });
        }

        vm.toggleGraphSettingPanel = function (id, optionName) {
            $(id).toggle();
            if ($(id).is(":visible")) {
                vm.optionText[optionName] = "Hide Options";
            } else {
                vm.optionText[optionName] = "Show Options";
            }
            $scope.safeApply();
        }

        vm.initSearchParameter = function (field, period, graphType, callback) {
            vm.queryPara[field] = {};
            vm.optionText[field] = "Hide Options";
            if (period) {
                utilService.actionAfterLoaded(('#' + field + 'Analysis'), function () {
                    vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + 'Analysis .startTime');
                    vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + 'Analysis .endTime');
                    vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                })
            } else {
                vm.queryPara[field].startTime = utilService.setNDaysAgo(new Date(), 1);
                if (field == 'playerRetention') {
                    vm.queryPara[field].endTime = utilService.setNDaysAfter(new Date(), 28);
                    vm.queryPara[field].minTime = utilService.getFormatDate(vm.queryPara[field].startTime);
                } else {
                    vm.queryPara[field].endTime = new Date();
                }
            }

            if (period) {
                vm.queryPara[field].periodText = period;
            }
            var returnHeight = 0;
            if (graphType == 1) { // 1 graph
                var tablePanel = $('#' + field + 'Analysis .rightPanel');
                var height = $(tablePanel).width() * .3;
                $(tablePanel).css('height', height + 'px');
            } else if (graphType == 2) {// 2 graph
                $('#analysisPanel .section').each(function (i, j) {
                    var leftPanel = $(j).find('.col-md-5 .panel')[0];
                    var rightPanel = $(j).find('.col-md-7 .panel')[0];
                    var height = $(leftPanel).width() * .8;
                    $(leftPanel).height(height);
                    $(rightPanel).height(height);
                    returnHeight = height;
                });
            } else if (graphType == 3) {//left graph, right table
                var tablePanel = $('#' + field + 'Analysis .tableDiv');
                var graphPanel = $('#' + field + 'Analysis .graphDiv');
                var height = $(tablePanel).width() * .7;
                $(graphPanel).height(height);
                $(tablePanel).css('max-height', height + 'px');
            } else if (graphType == 4) {//left graph, right table
                var tablePanel = $('#' + field + 'Analysis .leftPanel');
                var graphPanel = $('#' + field + 'Analysis .rightPanel');
                var height = $(graphPanel).width() * .6;
                $(graphPanel).css('height', height + 'px');
                $(tablePanel).css('height', height + 'px');
            }
            $scope.safeApply();
            if (callback) {
                callback(returnHeight);
            }
        }

        vm.dateReformat = function (data) {
            return utilService.$getDateFromStdTimeFormat(data);
        };

        vm.setGraphName = function (data, ltr, num) {
            //data=src string, ltr=bool (from left to right?) , digits= number of character
            if (!data) return $translate("Unknown");
            if (data.length == 0) {
                return $translate('Unknown');
            }
            ltr = Boolean(ltr || true);
            num = num || 6;
            if (data.length < 10) {
                return data;
            } else {
                return ltr ? data.substring(0, num).concat('...') : data.substr(data.length - num).concat('...');
            }
        }

        vm.setGraphNameWithoutCutString = function (data, ltr, num) {
            //data=src string, ltr=bool (from left to right?) , digits= number of character
            if (!data) return $translate("Unknown");
            if (data.length == 0) {
                return $translate('Unknown');
            }
            ltr = Boolean(ltr || true);
            num = num || 6;

            return data;
        }

        //common functions======================================================

////////////////Mark::$viewContentLoaded function//////////////////
//##Mark content loaded function
        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {

            vm.getAllProvider();
            setTimeout(
                function () {
                    vm.optionText = {};
                    vm.queryPara = {};
                    vm.loadPage("PLATFORM_OVERVIEW");

                    $("<div id='tooltip'></div>").css({
                        position: "absolute",
                        border: "1px solid #fdd",
                        padding: "2px",
                        "background-color": "#fee",
                        opacity: 0.80
                    }).appendTo("body");

                    if (!authService.checkViewPermission('Analysis', 'Analysis', 'Read')) {
                        return;
                    }

                    socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                        vm.platformList = data.data;
                        if (vm.platformList.length == 0)return;
                        vm.selectedPlatform = vm.platformList[0];
                        vm.selectedPlatformID = vm.selectedPlatform._id;
                        $scope.safeApply();
                    });
                }
            );

        });

        vm.drawLocationCityGraphByElementId = function (elementId, data, tag) {
            let pieData=[];
            if (tag == "IPLocation") {
                pieData = data.map(item => {
                    let data = {
                        label: item._id.city || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }
            if (tag == "phoneLocation") {
                pieData = data.map(item => {
                    let data = {
                        label: item._id.phoneCity || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }

            socketService.$plotPie(elementId, pieData, {});
        };


        vm.drawLocationCountryGraphByElementId = function (elementId, data, tag) {
            let pieData=[];
            if (tag == "IPLocation"){
                pieData = data.map(item => {
                    let data = {
                        label: vm.getCountryTitle(item._id.country) || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }
            if (tag == "phoneLocation"){
                pieData = data.map(item => {
                    let data = {
                        label: item._id.phoneProvince || $translate('Unknown'), data: item.amount
                    };
                    return data;
                });
            }

            socketService.$plotPie(elementId, pieData, {});
        };

    };
    analysisController.$inject = injectParams;
    myApp.register.controller('analysisCtrl', analysisController);
});