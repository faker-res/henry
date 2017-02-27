'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'CONFIG', 'utilService', '$timeout'];

    var analysisController = function ($scope, $filter, $location, $log, authService, socketService, CONFIG, utilService, $timeout) {
        var $translate = $filter('translate');
        var vm = this;

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
                            vm.queryPara.allActivePlayer = {date: utilService.setNDaysAgo(new Date(), 1)}
                        });

                        vm.initSearchParameter('allNewPlayer', true, 4);
                        vm.initSearchParameter('allPlayerConsumption', true, 4);
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
                        break;
                    case "NEW_PLAYER":
                        vm.initSearchParameter('newPlayer', 'day', 3);
                        vm.plotNewPlayerLine();
                        break;
                    case "ACTIVE_PLAYER":
                        vm.initSearchParameter('activePlayer', 'day', 3);
                        vm.initSearchParameter('loginPlayer', 'day', 3);
                        vm.plotActivePlayerLine();
                        vm.plotLoginPlayerLine();
                        break;
                    case "PEAK_HOUR":
                        vm.plotPeakhourOnlinePlayerLine();
                        vm.plotPeakhourCreditspendLine();
                        vm.plotPeakhourTopupLine();
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
                                            vm.playerLocationPage();
                                        });
                                    });
                                });
                            }
                        );
                        break;
                    case "REWARD_ANALYSIS":
                        vm.selectReward = {};
                        vm.initSearchParameter('reward', 'day', 3);
                        vm.rewardAnalysisInit(vm.plotRewardAmountLine);
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
                            vm.deviceAnalysisInit();
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
                            vm.domainAnalysisInit();
                        });
                        break;
                    case "PLAYER_RETENTION":
                        vm.initSearchParameter('playerRetention', null, 2, function () {
                            vm.queryPara.playerRetention.days = [1, 4, 8, 10, 15, 24, 30];
                            vm.dayListLength = [];
                            for (var i = 1; i < 31; i++) {
                                vm.dayListLength.push(i);
                            }
                            vm.playerRetentionInit(function () {
                                vm.getPlayerRetention();
                            });
                            $scope.safeApply();
                        });
                        break;
                    case "PLAYER_EXPENSES":
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            vm.drawPlayerCreditLine('PLAYER_EXPENSES');
                        });
                        break;
                    case "PLAYER_TOPUP":
                        vm.initSearchParameter('playerCredit', 'day', 3, function () {
                            vm.drawPlayerCreditLine('PLAYER_TOPUP');
                        });
                        break;
                    case "CLIENT_SOURCE":
                        vm.initSearchParameter('clientSource', true, 3, function () {
                            vm.initClientSourcePara(vm.getClientSourceData);
                        });
                        break;
                    case "GAME_ANALYSIS":
                        vm.getAllProvider();
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
                date: vm.queryPara.allActivePlayer.date
            };
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
                functionName: vm.queryPara.allApiResponseTime.funcName
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

        // new player start =============================================
        vm.plotNewPlayerLine = function () {
            var placeholder = "#line-newPlayer";
            // var periodText = $('#analysisNewPlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.newPlayer.periodText,
                startDate: vm.queryPara.newPlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.newPlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'countNewPlayerbyPlatform', sendData, function success(data1) {
                var newPlayerData = data1.data;
                console.log('newPlayerData', newPlayerData);
                var newPlayerObjData = {};
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
                var graphData = [];
                newPlayerData.map(item => {
                    graphData.push([new Date(item._id.date), item.number]);
                })
                var newOptions = {};
                // var nowDate = new Date(sendData.startDate);
                var xText = '';
                switch (vm.queryPara.newPlayer.periodText) {
                    case 'day':
                        //         do {
                        //             var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                        //             graphData.push([nowDate.getTime(), (newPlayerObjData[dateText] || 0)]);
                        //             nowDate.setDate(nowDate.getDate() + 1);
                        //         } while (nowDate <= sendData.endDate);
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
                        //         var k = 0;
                        //         do {
                        //             // var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                        //             graphData.push([nowDate.getTime(), (newPlayerObjData[k] || 0)]);
                        //             nowDate.setDate(nowDate.getDate() + 7);
                        //             k++;
                        //         } while (nowDate <= sendData.endDate);
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
                        //         nowDate.setDate(1);
                        //         do {
                        //             var nowYear = nowDate.getFullYear();
                        //             var nowMonth = nowDate.getMonth() + 1;
                        //             console.log('nowMonth', nowYear + '' + nowMonth);
                        //             graphData.push([nowDate.getTime(), (newPlayerObjData[nowYear + '' + nowMonth] || 0)]);
                        //             nowDate.setMonth(nowDate.getMonth() + 1);
                        //
                        //         } while (nowDate <= sendData.endDate);
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
                }];
                newOptions.xaxes = [{
                    position: 'bottom',
                    axisLabel: $translate('PERIOD') + ' : ' + $translate(xText)
                }];
                socketService.$plotLine(placeholder, [{label: $translate('New Players'), data: graphData}], newOptions);
                $(placeholder).bind("plothover", function (event, pos, obj) {
                    var previousPoint;
                    if (!obj) {
                        $("#tooltip").hide();
                        previousPoint = null;
                        return;
                    } else {
                        if (previousPoint != obj.dataIndex) {
                            previousPoint = obj.dataIndex;

                            var x = obj.datapoint[0],
                                y = obj.datapoint[1].toFixed(0);

                            var date = new Date(x);
                            var dateString = utilService.$getDateFromStdTimeFormat(date.toISOString())
                            // console.log('date', x, date);
                            $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.newPlayer.periodText) + " : " + dateString)
                                .css({top: obj.pageY + 5, left: obj.pageX + 5})
                                .fadeIn(200);
                        }
                    }
                });

                // $(".flot-x-axis .flot-tick-label.tickLabel").addClass("rotate330");

                var tableData = [];
                for (var i in graphData) {
                    var obj = {};
                    obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                    obj.amount = graphData[i][1] || 0;
                    tableData.push(obj);
                }
                var dataOptions = {
                    data: tableData,
                    columns: [
                        {title: $translate(vm.queryPara.newPlayer.periodText), data: "date"},
                        {title: $translate('amount'), data: "amount"}
                    ],
                    "paging": false,
                };
                dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                var a = $('#newPlayerAnalysisTable').DataTable(dataOptions);
                a.columns.adjust().draw();
            });

        }
        // new player end   =============================================

        // active Player start= =========================================
        vm.plotActivePlayerLine = function () {
            var placeholder = "#line-activePlayer";
            // var periodText = $('#analysisActivePlayer select').val();
            var sendData = {
                platformId: vm.selectedPlatform._id,
                // startDate: vm.queryPara.activePlayer.startTime,
                // endDate: vm.queryPara.activePlayer.endTime,
                startDate: vm.queryPara.activePlayer.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.activePlayer.endTime.data('datetimepicker').getLocalDate(),
            };
            socketService.$socket($scope.AppSocket, 'countActivePlayerbyPlatform', sendData, function success(data1) {
                console.log('received data', data1);
                var activePlayerData = data1.data;
                var activePlayerObjData = {};
                for (var i = 0; i < activePlayerData.length; i++) {
                    activePlayerObjData[activePlayerData[i]._id.date] = activePlayerData[i].number;
                }
                var graphData = [];
                var newOptions = {};
                var nowDate = new Date(sendData.startDate);

                do {
                    var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                    graphData.push([nowDate.getTime(), (activePlayerObjData[dateText] || 0)]);
                    nowDate.setDate(nowDate.getDate() + 1);
                } while (nowDate <= sendData.endDate);
                newOptions = {
                    xaxis: {
                        tickLength: 0,
                        mode: "time",
                        minTickSize: [1, "day"],
                    }
                };
                //draw graph
                socketService.$plotLine(placeholder, [{
                    label: $translate('Active Player'),
                    data: graphData
                }], newOptions);
                $(placeholder).bind("plothover", function (event, pos, obj) {
                    var previousPoint;
                    if (!obj) {
                        $("#tooltip").hide();
                        previousPoint = null;
                        return;
                    } else {
                        if (previousPoint != obj.dataIndex) {
                            previousPoint = obj.dataIndex;

                            var x = obj.datapoint[0],
                                y = obj.datapoint[1].toFixed(0);

                            var date = new Date(x);
                            var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                            // console.log('date', x, date);
                            $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')("Day") + " : " + dateString)
                                .css({top: obj.pageY + 5, left: obj.pageX + 5})
                                .fadeIn(200);
                        }
                    }
                });
                //draw table

                var tableData = [];
                for (var i in graphData) {
                    var obj = {};
                    obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                    obj.amount = graphData[i][1] || 0;
                    tableData.push(obj);
                }
                var dataOptions = {
                    data: tableData,
                    columns: [
                        {title: $translate(vm.queryPara.activePlayer.periodText), data: "date"},
                        {title: $translate('amount'), data: "amount"}
                    ],
                    "paging": false,
                };
                dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                var a = $('#activePlayerAnalysisTable').DataTable(dataOptions);
                a.columns.adjust().draw();
            });
        }
        // active Player end= =========================================

        // login Player start= =========================================
        vm.plotLoginPlayerLine = function () {
            //todo::add graph code here
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


                var graphData = [];
                data1.data.map(item => {
                    var localTime = new Date(item._id.date);
                    graphData.push([localTime, item.number]);
                })
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
                var newOptions = {};
                // var nowDate = new Date(sendData.startDate);
                var xText = '';
                switch (vm.queryPara.loginPlayer.periodText) {
                    case 'day':
                        //         do {
                        //             var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                        //             graphData.push([nowDate.getTime(), (loginPlayerObjData[dateText] || 0)]);
                        //             nowDate.setDate(nowDate.getDate() + 1);
                        //         } while (nowDate <= sendData.endDate);
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
                        //         var k = 0;
                        //         do {
                        //             graphData.push([nowDate.getTime(), (loginPlayerObjData[k] || 0)]);
                        //             nowDate.setDate(nowDate.getDate() + 7);
                        //             k++;
                        //         } while (nowDate <= sendData.endDate);
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
                        //         nowDate.setDate(1);
                        //         do {
                        //             var nowYear = nowDate.getFullYear();
                        //             var nowMonth = nowDate.getMonth() + 1;
                        //             console.log('nowMonth', nowYear + '' + nowMonth);
                        //             graphData.push([nowDate.getTime(), (loginPlayerObjData[nowYear + '' + nowMonth] || 0)]);
                        //             nowDate.setMonth(nowDate.getMonth() + 1);
                        //
                        //         } while (nowDate <= sendData.endDate);
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
                }];
                newOptions.xaxes = [{
                    position: 'bottom',
                    axisLabel: $translate('PERIOD') + ' : ' + $translate(xText),
                }];
                socketService.$plotLine(placeholder, [{
                    label: $translate('Login Player'),
                    data: graphData
                }], newOptions);
                $(placeholder).bind("plothover", function (event, pos, obj) {
                    var previousPoint;
                    if (!obj) {
                        $("#tooltip").hide();
                        previousPoint = null;
                        return;
                    } else {
                        if (previousPoint != obj.dataIndex) {
                            previousPoint = obj.dataIndex;

                            var x = obj.datapoint[0],
                                y = obj.datapoint[1].toFixed(0);

                            var date = new Date(x);
                            var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                            // console.log('date', x, date);
                            $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.loginPlayer.periodText) + " : " + dateString)
                                .css({top: obj.pageY + 5, left: obj.pageX + 5})
                                .fadeIn(200);
                        }
                    }
                });
                // $(".flot-x-axis .flot-tick-label.tickLabel").addClass("rotate330");
                //draw table

                var tableData = [];
                for (var i in graphData) {
                    var obj = {};
                    obj.date = utilService.$getTimeFromStdTimeFormat(graphData[i][0]).slice(0, 10);
                    obj.amount = graphData[i][1] || 0;
                    tableData.push(obj);
                }
                var dataOptions = {
                    data: tableData,
                    columns: [
                        {title: $translate(vm.queryPara.loginPlayer.periodText), data: "date"},
                        {title: $translate('amount'), data: "amount"}
                    ],
                    "paging": false,
                };
                dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                var a = $('#loginPlayerAnalysisTable').DataTable(dataOptions);
                a.columns.adjust().draw();

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
                        $scope.safeApply();
                    });
                } else if (vm.showPageName == 'PLAYER_IP_LOCATION') {
                    vm.playerLocationCountries = data.data;
                    vm.setAreaData('country', vm.playerLocationCountries, function () {
                        vm.mapName = "worldHigh";
                        vm.drawMap();
                        $scope.safeApply();
                    });
                } else if (vm.showPageName == 'PLAYER_PHONE_LOCATION') {
                    vm.playerPhoneProvince = data.data;
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
            vm.plotRewardAmountLine();
            vm.plotRewardNumberLine();
        }
        vm.plotRewardAmountLine = function () {
            if (!vm.selectReward.type) return;
            var placeholder1 = "#line-reward-amount";
            var placeholder2 = "#line-reward-number";
            // var periodText = $('#analysisReward select').val();
            console.log('vm.selectReward', vm.selectReward);
            var sendData = {
                platformId: vm.selectReward.platform,
                period: vm.queryPara.reward.periodText,
                // startTime: vm.queryPara.reward.startTime,
                // endTime: vm.queryPara.reward.endTime,
                startTime: vm.queryPara.reward.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.reward.endTime.data('datetimepicker').getLocalDate(),
                type: vm.selectReward.type.name
            };
            socketService.$socket($scope.AppSocket, 'getPlatformRewardAnalysis', sendData, function success(data1) {
                console.log('data1', data1);
                var rewardGraphData = data1.data || [];
                var rewardNumberData = {}, rewardAmountData = {};
                // for (var i = 0; i < rewardGraphData.length; i++) {
                //     switch (vm.queryPara.reward.periodText) {
                //         case 'day':
                //             rewardAmountData[rewardGraphData[i]._id.date] = rewardGraphData[i].amount;
                //             rewardNumberData[rewardGraphData[i]._id.date] = rewardGraphData[i].number;
                //             break;
                //         case 'week':
                //             rewardAmountData[rewardGraphData[i]._id.week] = rewardGraphData[i].amount;
                //             rewardNumberData[rewardGraphData[i]._id.week] = rewardGraphData[i].number;
                //             break;
                //         case 'month':
                //             rewardAmountData[rewardGraphData[i]._id.year + '' + rewardGraphData[i]._id.month] = rewardGraphData[i].amount;
                //             rewardNumberData[rewardGraphData[i]._id.year + '' + rewardGraphData[i]._id.month] = rewardGraphData[i].number;
                //             break;
                //     }
                // }
                var graphData1 = [], graphData2 = [];
                rewardGraphData.map(item => {
                    graphData1.push([new Date(item._id.date), item.amount]);
                    graphData2.push([new Date(item._id.date), item.number]);
                })
                var newOptions = {};
                // var nowDate = new Date(sendData.startTime);
                switch (vm.queryPara.reward.periodText) {
                    case 'day':
                        // do {
                        //     var dateText = utilService.$getTimeFromStdTimeFormat(nowDate).substring(0, 10);
                        //     graphData1.push([nowDate.getTime(), (rewardAmountData[dateText] || 0)]);
                        //     graphData2.push([nowDate.getTime(), (rewardNumberData[dateText] || 0)]);
                        //     nowDate.setDate(nowDate.getDate() + 1);
                        // } while (nowDate <= sendData.endTime);
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
                        //     // var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toLocaleString());
                        //     graphData1.push([nowDate.getTime(), (rewardAmountData[k] || 0)]);
                        //     graphData2.push([nowDate.getTime(), (rewardNumberData[k] || 0)]);
                        //     nowDate.setDate(nowDate.getDate() + 7);
                        //     k++;
                        // } while (nowDate <= sendData.endTime);
                        newOptions = {
                            xaxes: [{
                                position: 'bottom',
                                axisLabel: $translate('WEEK'),
                            }],
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
                        //     graphData1.push([nowDate.getTime(), (rewardAmountData[nowYear + '' + nowMonth] || 0)]);
                        //     graphData2.push([nowDate.getTime(), (rewardNumberData[nowYear + '' + nowMonth] || 0)]);
                        //     nowDate.setMonth(nowDate.getMonth() + 1);
                        //
                        // } while (nowDate <= sendData.endTime);
                        newOptions = {
                            xaxis: {
                                tickLength: 0,
                                mode: "time",
                                minTickSize: [1, "month"],
                            }
                        };
                        break;
                }
                // console.log('graph', graphData);
                newOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('Reward amount'),
                }];
                socketService.$plotLine(placeholder1, [{
                    label: $translate('Reward amount'),
                    data: graphData1
                }], newOptions);
                newOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('Reward number'),
                }]
                //draw table

                var tableData = [];
                for (var i in graphData1) {
                    var obj = {};
                    obj.date = utilService.$getTimeFromStdTimeFormat(graphData1[i][0]).substring(0, 10);
                    obj.amount = graphData1[i][1] || 0;
                    tableData.push(obj);
                }
                var dataOptions = {
                    data: tableData,
                    columns: [
                        {title: $translate(vm.queryPara.reward.periodText), data: "date"},
                        {title: $translate('Reward amount'), data: "amount"}
                    ],
                    "paging": false,
                };
                dataOptions = $.extend({}, $scope.getGeneralDataTableOption, dataOptions);
                var a = $('#rewardAmountAnalysisTable').DataTable(dataOptions);
                a.columns.adjust().draw();

                socketService.$plotLine(placeholder2, [{
                    label: $translate('Reward number'),
                    data: graphData2
                }], newOptions);
                //draw table

                var tableData2 = [];
                for (var i in graphData2) {
                    var obj = {};
                    obj.date = utilService.$getTimeFromStdTimeFormat(graphData2[i][0]).substring(0, 10);
                    obj.amount = graphData2[i][1] || 0;
                    tableData2.push(obj);
                }
                var dataOptions2 = {
                    data: tableData2,
                    columns: [
                        {title: $translate(vm.queryPara.reward.periodText), data: "date"},
                        {title: $translate('Reward number'), data: "amount"}
                    ],
                    "paging": false,
                };
                dataOptions2 = $.extend({}, $scope.getGeneralDataTableOption, dataOptions2);
                var b = $('#rewardNumberAnalysisTable').DataTable(dataOptions2);
                b.columns.adjust().draw();

                $(placeholder1).bind("plothover", function (event, pos, obj) {
                    var previousPoint;
                    // console.log('event, pos, obj', pos, obj);
                    if (!obj) {
                        $("#tooltip").hide();
                        previousPoint = null;
                        return;
                    } else {
                        if (previousPoint != obj.dataIndex) {
                            previousPoint = obj.dataIndex;

                            var x = obj.datapoint[0],
                                y = obj.datapoint[1].toFixed(0);

                            var date = new Date(x);
                            var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                            // console.log('date', x, date);
                            $("#tooltip").html("Amount : " + y + '<br>' + $filter('capFirst')(vm.queryPara.reward.periodText) + " : " + dateString)
                                .css({top: obj.pageY + 5, left: obj.pageX + 5})
                                .fadeIn(200);
                        }
                    }
                });
                $(placeholder2).bind("plothover", function (event, pos, obj) {
                    var previousPoint;
                    // console.log('event, pos, obj', pos, obj);
                    if (!obj) {
                        $("#tooltip").hide();
                        previousPoint = null;
                        return;
                    } else {
                        if (previousPoint != obj.dataIndex) {
                            previousPoint = obj.dataIndex;

                            var x = obj.datapoint[0],
                                y = obj.datapoint[1].toFixed(0);

                            var date = new Date(x);
                            var dateString = utilService.$getDateFromStdTimeFormat(date.toLocaleString())
                            // console.log('date', x, date);
                            $("#tooltip").html("Number : " + y + '<br>' + $filter('capFirst')(vm.queryPara.reward.periodText) + " : " + dateString)
                                .css({top: obj.pageY + 5, left: obj.pageX + 5})
                                .fadeIn(200);
                        }
                    }
                });
            });
        };
        vm.plotRewardNumberLine = function () {
        };
        //reward analysis clicked end ================================================

        //player device analysis clicked ================================================
        vm.deviceAnalysisInit = function (callback) {
            var sendData = {
                platformId: vm.selectedPlatform._id,
                type: vm.queryPara.playerDevice.type,
                // startDate: vm.queryPara.playerDevice.startTime,
                // endDate: vm.queryPara.playerDevice.endTime
                startTime: vm.queryPara.playerDevice.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerDevice.endTime.data('datetimepicker').getLocalDate(),
            }

            socketService.$socket($scope.AppSocket, 'getPlayerDeviceAnalysisData', sendData, function (data) {
                vm.playerDeviceList = data.data;
                console.log('device data', vm.playerDeviceList);
                $scope.safeApply();
                vm.plotPlayerDevice();
            });
        }
        vm.plotPlayerDevice = function (data) {
            var placeholder = '#pie-all-playerDevice'
            var pieData = vm.playerDeviceList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphName(obj._id.name), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'newPlayerPieClickData');
            var placeholderBar = "#bar-all-playerDevice";
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
                vm.playerDomainList = data.data;
                console.log('domain data', vm.playerDomainList);
                $scope.safeApply();
                vm.plotPlayerDomain();
            });
        }
        vm.plotPlayerDomain = function (data) {
            var placeholder = '#pie-all-playerDomain'
            var pieData = vm.playerDomainList.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphName(obj._id), data: obj.number};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'playerDomainPieClickData');
            var placeholderBar = "#bar-all-playerDomain";
            socketService.$plotSingleBar(placeholderBar, vm.getBardataFromPiedata(pieData), vm.newOptions, vm.getXlabelsFromdata(pieData));
        }
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
        vm.getPlayerRetention = function () {
            vm.retentionGraphData = [];
            vm.showRetention = {};
            vm.retentionCheckAll = false;
            vm.allRetentionLineData = [];
            var sendData = {
                platform: vm.selectedPlatform._id,
                days: vm.queryPara.playerRetention.days,
                startTime: vm.queryPara.playerRetention.startTime
            }
            socketService.$socket($scope.AppSocket, 'getPlayerRetention', sendData, function (data) {
                vm.retentionData = data.data;
                $scope.safeApply();
                vm.drawRetentionGraph();
            }, function (data) {
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
            socketService.$plotLine(placeholder, vm.allRetentionLineData, newOptions);
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
        vm.drawPlayerCreditLine = function (type) {
            var opt = '';
            if (type == 'PLAYER_EXPENSES') {
                opt = 'consumption';
            } else if (type == 'PLAYER_TOPUP') {
                opt = 'topup';
            }
            var sendData = {
                platformId: vm.selectedPlatform._id,
                period: vm.queryPara.playerCredit.periodText,
                type: opt,
                startDate: vm.queryPara.playerCredit.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.playerCredit.endTime.data('datetimepicker').getLocalDate(),
                // startDate: vm.queryPara.playerCredit.startTime,
                // endDate: vm.queryPara.playerCredit.endTime
            }
            socketService.$socket($scope.AppSocket, 'countTopUpORConsumptionbyPlatform', sendData, function (data) {
                vm.playerCreditData = data.data;
                console.log('vm.playerCreditData', vm.playerCreditData);
                // $scope.safeApply();
                return vm.drawPlayerCreditGraph(vm.playerCreditData, sendData);
            }, function (data) {
                console.log("player credit data not", data);
            });
        }

        vm.drawPlayerCreditGraph = function (srcData, sendData) {
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
            srcData.map(item => {
                graphData.push([new Date(item._id.date), item.number])
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

            socketService.$plotLine(placeholder, [{label: $translate(vm.showPageName), data: graphData}], newOptions);

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
                obj.amount = graphData[i][1] || 0;
                tableData.push(obj);
            }
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
        //player credit end =======================================================

        //client source start =======================================
        vm.initClientSourcePara = function (callback) {
            vm.clientSourcePara = {loading: true};
            socketService.$socket($scope.AppSocket, 'getClientSourcePara', {}, function (data) {
                vm.clientSourcePara = data.data;
                $scope.safeApply();
                if (callback) {
                    callback.apply(this);
                }
            });
        }
        vm.getClientSourceData = function () {
            var sendObj = {};
            sendObj.accessType = vm.queryPara.clientSource.accessType;
            sendObj.clientType = vm.queryPara.clientSource.clientType;
            sendObj.platformId = vm.selectedPlatform.platformId;
            sendObj.startDate = vm.queryPara.clientSource.startTime.data('datetimepicker').getLocalDate();
            sendObj.endDate = vm.queryPara.clientSource.endTime.data('datetimepicker').getLocalDate();
            socketService.$socket($scope.AppSocket, 'getClientSourceQuery', sendObj, function (data) {
                console.log('data', data);
                vm.clientSourceTblData = data.data || [];
                vm.drawClientSourceTable(vm.clientSourceTblData);
                vm.drawClientSourcePie(vm.clientSourceTblData);
            });
        }
        vm.drawClientSourcePie = function (srcData) {
            var placeholder = '#clientSourceAnalysis div.graphDiv';
            var pieData = srcData.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: vm.setGraphName(obj._id), data: obj.count};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            socketService.$plotPie(placeholder, pieData, {}, 'clientSourceClickData');
        }
        vm.drawClientSourceTable = function (tblData) {
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tblData,
                columns: [
                    {title: $translate("Domain Name"), data: "_id"},
                    {title: $translate('amount'), data: "count"}
                ],
                "paging": false
            });

            $('#clientSourceAnalysis table').dataTable(options);
        }
        //client source =============================================

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
                    vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 30)));
                    vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                })
            } else {
                vm.queryPara[field].startTime = utilService.setNDaysAgo(new Date(), 30);
                vm.queryPara[field].endTime = new Date();
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

        //common functions======================================================

////////////////Mark::$viewContentLoaded function//////////////////
//##Mark content loaded function
        $scope.$on('$viewContentLoaded', function () {

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
    };
    analysisController.$inject = injectParams;
    myApp.register.controller('analysisCtrl', analysisController);
});