'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', '$timeout', 'authService', 'utilService', 'socketService', 'CONFIG', '$cookies'];

    var dashboardController = function ($scope, $filter, $location, $log, $timeout, authService, utilService, socketService, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;

        vm.changePlatform = function (id) {
            var newArr = vm.platformList.filter(data => {
                return data._id == id;
            })
            if (newArr.length == 1) {
                vm.platformName = newArr[0].name;
                $cookies.put("platform", vm.platformName);
                loadAllData();
            }
        }

        ///////////////////////common function//////////////////////////////
        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };

        vm.setGraphHeight = function (placeholder) {
            var height = $(placeholder).width();
            $(placeholder).height(height);
        }

        vm.bindHover = function (options, placeholder, callback) {
            $(placeholder).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;

                        var decimalPlaces = 0;
                        if (options && options.decimals) {
                            decimalPlaces = options.decimals
                        }
                        var x = utilService.$getDateFromStdTimeFormat(new Date(obj.datapoint[0]).toISOString()),
                            y = obj.datapoint[1].toFixed(decimalPlaces);

                        var fre = $translate('Day');
                        var num = $translate('Number');
                        $("#tooltip").html(num + " : " + y + '<br>' + fre + " : " + x)
                            .css({top: obj.pageY + 5, left: obj.pageX + 5})
                            .fadeIn(200);

                        if (callback) {
                            callback(obj);
                        }
                    }
                }
            });
        }
        ////////////////////////////////end common function ///////////////////////
        function loadPlatform () {
            console.log('loadPlatform - dashboard');
            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                vm.platformList = data.data;

                if (vm.platformList.length > 0) {
                    let storedPlatform = $cookies.get("platform");

                    if (storedPlatform) {
                        if (storedPlatform === '_allPlatform') {
                            storedPlatform = vm.platformList[0].name;
                        }

                        vm.platformList.forEach(
                            platform => {
                                if (platform.name == storedPlatform) {
                                    vm.platformID = platform._id;
                                    vm.platformName = platform.name
                                }
                            }
                        );
                    } else {
                        vm.platformID = vm.platformList[0]._id;
                        vm.platformName = vm.platformList[0].name;
                    }

                    renderPlaceholder();
                    loadAllData();
                }
            })
        }

        function renderPlaceholder () {
            if ($('#penalModel').hasClass('hide')) {
                if (authService.checkViewPermission('Dashboard', 'Platform', 'Read')) {
                    $('#penalModel').clone().removeClass('hide').insertAfter('.onlineNum div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.topupAmount div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.bonusAmount div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.spendAmount div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.newUser div');


                    //day current online number
                    $('.onlineNum .panel').addClass('panel-green');
                    // $('.onlineNum .panel-width').addClass('col-md-3');
                    $('.onlineNum .typeIcon').addClass('fa-smile-o');
                    $('.onlineNum .which').html($translate('Online Players'));

                    //day topupamount
                    $('.topupAmount .panel').addClass('panel-primary');
                    // $('.topupAmount .panel-width').addClass('col-md-3');
                    $('.topupAmount .typeIcon').addClass('fa-dollar');
                    $('.topupAmount .which').html($translate('Topup Amount'));

                    //day topupamount
                    $('.bonusAmount .panel').addClass('panel-purple');
                    // $('.topupAmount .panel-width').addClass('col-md-3');
                    $('.bonusAmount .typeIcon').addClass('fa-dollar');
                    $('.bonusAmount .which').html($translate('BonusAmount'));

                    //spend amount
                    $('.spendAmount .panel').addClass('panel-yellow');
                    // $('.spendAmount .panel-width').addClass('col-md-3');
                    $('.spendAmount .typeIcon').addClass('fa-money');
                    $('.spendAmount .which').html($translate('Spent Amount'));

                    //new user
                    $('.newUser .panel').addClass('panel-red');
                    // $('.newUser .panel-width').addClass('col-md-3');
                    $('.newUser .typeIcon').addClass('fa-user-plus');
                    $('.newUser .which').html($translate('New Players'));
                }

                if (authService.checkViewPermission('Dashboard', 'Operation', 'Read')) {
                    $('#penalModel').clone().removeClass('hide').insertAfter('.proposal div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.rewardRequest div');
                    $('#penalModel').clone().removeClass('hide').insertAfter('.rewardAmount div');

                    //proposal
                    $('.proposal .panel').addClass('panel-red');
                    // $('.proposal .panel-width').addClass('col-md-3');
                    $('.proposal .typeIcon').addClass('fa-file-text-o');
                    $('.proposal .which').html($translate('PROPOSAL'));
                    $('.proposal .dashboardPanel a.href').prop('href', '/operation');

                    //rewardRequest
                    $('.rewardRequest .panel').addClass('panel-primary');
                    // $('.rewardRequest .panel-width').addClass('col-md-3');
                    $('.rewardRequest .typeIcon').addClass('fa-registered');
                    $('.rewardRequest .which').html($translate('Request Reward Num'));
                    $('.rewardRequest .dashboardPanel a.href').prop('href', '/operation');

                    //rewardAmount
                    $('.rewardAmount .panel').addClass('panel-primary');
                    // $('.rewardAmount .panel-width').addClass('col-md-3');
                    $('.rewardAmount .typeIcon').addClass('fa-stop-circle');
                    $('.rewardAmount .which').html($translate('Request Reward Amount'));
                    $('.rewardAmount .dashboardPanel a.href').prop('href', '/operation');
                }

                //common
                $('.day .which').prepend($translate('Today') + ' ');
                $('.week .which').prepend($translate('7 Days') + ' ');
                $('.dashboardDiv .statement').html($translate('View Details'));

                $('.dashboardDiv a.href').click(function () {
                    $('#cssmenu .navbar-brand  a[href*="dashboard"]').parent().removeClass('active')
                })
            }
        }

        function loadAllData () {
            if (authService.checkViewPermission('Dashboard', 'Platform', 'Read')) {
                getDashboardData(0);
            }
            if (authService.checkViewPermission('Dashboard', 'Statistics', 'Read')) {
                drawDataGraph();
            }
            if (authService.checkViewPermission('Dashboard', 'Operation', 'Read')) {
                getOperationData();
            }
        }

        function getDashboardData (numDays) {
            let queryDone = [false, false, false, false, false];
            let sendData = {
                // startDate: new Date(new Date().setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), numDays)))),
                startDate: utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), numDays)),
                endDate: new Date(),
                platform: vm.platformID
            };

            console.log('sendData', numDays, sendData);

            socketService.$socket($scope.AppSocket, 'countLoginPlayerbyPlatformWeek', sendData, function success(data) {
                $scope.$evalAsync(() => {
                    let playerData = data.data;
                    let total = 0;
                    for (let i = 0; i < playerData.length; i++) {
                        if (playerData) {
                            total += playerData[i].number;
                        }
                    }
                    console.log('login data', numDays, playerData, total);
                    if (numDays == 0) {
                        // $('.day .onlineNum .number').html(total);
                    } else if (numDays == 7) {
                        $('.week .onlineNum .number').html(total);
                    }
                    queryDone[0] = true;
                })
            });

            socketService.$socket($scope.AppSocket, 'getTopUpTotalAmountForAllPlatform', sendData, function success(data) {
                $scope.$evalAsync(() => {
                    let totalTopup = 0;
                    data.data.forEach(a => {
                        totalTopup += a.totalAmount;
                    });
                    if (numDays == 0) {
                        $('.day .topupAmount .number').html(totalTopup.toFixed(2));
                        utilService.fitText('.day .topupAmount .number');
                    } else if (numDays == 7) {
                        $('.week .topupAmount .number').html(totalTopup.toFixed(2));
                        utilService.fitText('.week .topupAmount .number');
                    }
                    queryDone[1] = true;
                });
            });

            //only query the success bonus proposal
            sendData.status = ['Success','Approved'];
            socketService.$socket($scope.AppSocket, 'getBonusRequestList', sendData, function success(data) {
                $scope.$evalAsync(() => {
                    var totalBonus = 0;
                    var records = data.data.records;
                    for(var d in records){
                        totalBonus += records[d].amount || 0;
                    }

                    if (numDays == 0){
                        $('.day .bonusAmount .number').html(totalBonus.toFixed(2));
                        utilService.fitText('.day .bonusAmount .number');
                    } else if(numDays == 7){
                        $('.week .bonusAmount .number').html(totalBonus.toFixed(2));
                        utilService.fitText('.week .bonusAmount .number');
                    }
                    queryDone[2] = true;
                })
            });

            if (numDays == 0) {
                socketService.$socket($scope.AppSocket, 'getPlayerConsumptionSumForAllPlatform', sendData, function success(data) {
                    $scope.$evalAsync(() => {
                        let totalConsumption = 0;
                        data.data.forEach(a => {
                            totalConsumption += a.totalAmount;
                        });

                        $('.day .spendAmount .number').html(totalConsumption.toFixed(2));
                        utilService.fitText('.day .spendAmount .number');

                        queryDone[3] = true;
                    })
                });
            } else if (numDays == 7) {
                socketService.$socket($scope.AppSocket, 'getPlayersConsumptionDaySumForAllPlatform', sendData, function success(data) {
                    $scope.$evalAsync(() => {
                        console.log('getPlayersConsumptionDaySumForAllPlatform', data);
                        let totalConsumption = 0;
                        data.data.forEach(a => {
                            totalConsumption += a.totalAmount;
                        });

                        $('.week .spendAmount .number').html(totalConsumption.toFixed(2));
                        utilService.fitText('.week .spendAmount .number');
                        queryDone[3] = true;
                    });
                });
            }

            socketService.$socket($scope.AppSocket, 'countNewPlayers', sendData, function success(data) {
                $scope.$evalAsync(() => {
                    var totalNum = 0;
                    data.data.forEach(a => {
                        totalNum += a.number;
                    })

                    if (numDays == 0) {
                        $('.day .newUser .number').html(totalNum);
                    } else if (numDays == 7) {
                        $('.week .newUser .number').html(totalNum);
                    }
                    queryDone[4] = true;
                })
            });

            callback();

            function callback() {
                for (let i in queryDone) {
                    if (!queryDone[i]) {
                        return setTimeout(callback, 100);
                    }
                }

                if (numDays == 0) {
                    return getDashboardData(7);
                }
            }
        }

        function drawDataGraph () {
            let sendData = {
                startDate: utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 6)),
                endDate: new Date(),
                platform: vm.platformID
            };

            let commonGraphOptions = {
                xaxes: [{
                    position: 'bottom',
                    axisLabel: $translate('Date'),
                }],
                xaxis: {
                    tickLength: 0,
                    mode: "time",
                    minTickSize: [1, "day"],
                    timezone: "browser"
                },
                axisLabels: {
                    show: false
                }
            };

            socketService.$socket($scope.AppSocket, 'countLoginPlayerAllPlatform', sendData, function (data) {
                let placeholder = '#onlinePlayerLine';
                vm.setGraphHeight(placeholder);

                let playerData = data.data;
                let graphOptions = $.extend({}, commonGraphOptions);
                graphOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('AMOUNT'),
                }];
                console.log('countLoginPlayerAllPlatform', playerData);

                let lastDayNum = 0;
                let graphData = [];

                playerData.map(item => {
                    let dateText = new Date(item._id.date);
                    graphData.push([dateText, item.number]);
                    lastDayNum = item.number;
                });

                $('.day .onlineNum .number').html(lastDayNum);

                socketService.$plotLine(placeholder, [{
                    // label: $translate('Login Player'),
                    data: graphData
                }], graphOptions);
                vm.bindHover(null, placeholder);
            });

            drawTopuporConsumption('#topupLine', 'topup', 'Topup', function () {
                drawTopuporConsumption('#consumptionLine', 'consumption', 'Consumption')
            });

            function drawTopuporConsumption(placeholder, type, label, callback) {
                socketService.$socket($scope.AppSocket, 'countTopUpORConsumptionAllPlatform', {
                    startDate: sendData.startDate,
                    endDate: sendData.endDate,
                    type: type,
                    platform: vm.platformID
                }, function success(data) {
                    vm.setGraphHeight(placeholder);

                    let graphOptions = $.extend({}, commonGraphOptions);
                    graphOptions.yaxes = [{
                        position: 'left',
                        axisLabel: $translate('AMOUNT'),
                    }];

                    graphOptions.yaxis = {
                        tickDecimals: 2
                    };

                    let playerData = data.data;
                    console.log('countTopUpORConsumptionAllPlatform', data);
                    let nowDate = new Date(sendData.startDate);
                    let graphData = [];
                    let newPlayerObjData = {};
                    for (let i = 0; i < playerData.length; i++) {
                        newPlayerObjData[playerData[i]._id.date] = playerData[i].number;
                    }
                    do {
                        var dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                        graphData.push([nowDate.getTime(), (newPlayerObjData[dateText] || 0)]);
                        nowDate.setDate(nowDate.getDate() + 1);
                    } while (nowDate <= sendData.endDate);

                    socketService.$plotLine(placeholder, [{data: graphData}], graphOptions);
                    vm.bindHover({decimals: 2}, placeholder);
                    if (callback) {
                        callback();
                    }
                });

                socketService.$socket($scope.AppSocket, 'countPlayerBonusAllPlatform', sendData, function success(data) {
                    let placeholder = '#bonusLine';
                    vm.setGraphHeight(placeholder);
                    let graphOptions = $.extend({}, commonGraphOptions);
                    graphOptions.yaxes = [{
                        position: 'left',
                        axisLabel: $translate('AMOUNT'),
                    }];
                    console.log('countPlayerBonusAllPlatform', data);
                    let playerData = data.data;
                    let nowDate = new Date(sendData.startDate);
                    let graphData = [];
                    let newPlayerObjData = {};
                    for (let i = 0; i < playerData.length; i++) {
                        let dateString = playerData[i]._id.year + '-' + ("0" + (playerData[i]._id.month)).substr(-2) + '-' + ("0" + playerData[i]._id.day).substr(-2)
                        newPlayerObjData[dateString] = playerData[i].number;
                    }
                    do {
                        let dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                        graphData.push([nowDate.getTime(), (newPlayerObjData[dateText] || 0)]);
                        nowDate.setDate(nowDate.getDate() + 1);
                    } while (nowDate <= sendData.endDate);

                    socketService.$plotLine(placeholder, [{
                        // label: $translate('New Players'),
                        data: graphData
                    }], graphOptions);
                    vm.bindHover(null, placeholder);
                });

                socketService.$socket($scope.AppSocket, 'countNewPlayerAllPlatform', sendData, function success(data) {
                    let placeholder = '#newPlayerLine';
                    vm.setGraphHeight(placeholder);
                    let graphOptions = $.extend({}, commonGraphOptions);
                    graphOptions.yaxes = [{
                        position: 'left',
                        axisLabel: $translate('AMOUNT'),
                    }];
                    console.log('countNewPlayerAllPlatform', data);
                    let playerData = data.data;

                    let nowDate = new Date(sendData.startDate);
                    let graphData = [];
                    let newPlayerObjData = {};
                    for (let i = 0; i < playerData.length; i++) {
                        newPlayerObjData[playerData[i]._id.date] = playerData[i].number;
                    }
                    do {
                        let dateText = utilService.$getDateFromStdTimeFormat(nowDate.toISOString());
                        graphData.push([nowDate.getTime(), (newPlayerObjData[dateText] || 0)]);
                        nowDate.setDate(nowDate.getDate() + 1);
                    } while (nowDate <= sendData.endDate);

                    socketService.$plotLine(placeholder, [{
                        // label: $translate('New Players'),
                        data: graphData
                    }], graphOptions);
                    vm.bindHover(null, placeholder);
                });
            }
        }

        function getOperationData () {
            socketService.$socket($scope.AppSocket, 'getAllPlatformAvailableProposalsForAdminId', {
                adminId: authService.adminId,
                platform: vm.platformID
            }, function (data) {
                $scope.$evalAsync(() => {
                    let proposals = data.data || [];
                    console.log("all proposals", proposals);
                    $('.proposal .number').html(proposals.length);
                })
            });

            socketService.$socket($scope.AppSocket, 'getAllRewardProposal', {platform: vm.platformID}, function (data) {
                $scope.$evalAsync(() => {
                    var rewardProposals = data.data || [];
                    console.log('getAllRewardProposal', data);
                    var total = 0;
                    $('.dashboardDiv .rewardRequest .number').html(rewardProposals.length);
                    for (var i in rewardProposals) {
                        if (rewardProposals[i].data && rewardProposals[i].data.amount) {
                            total += parseFloat(rewardProposals[i].data.amount);
                        }
                    }
                    $('.dashboardDiv .rewardAmount .number').html(total.toFixed(2));
                })
            });

        }

        // $scope.$on('$viewContentLoaded', function () {
        let eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }

        $scope.$on(eventName, () => {
            console.log('on', eventName);
            $scope.$evalAsync(loadPlatform());
        });

        $scope.$on('switchPlatform', () => {
            console.log('on', 'switchPlatform');
            $scope.$evalAsync(loadPlatform());
        });
    };
    dashboardController.$inject = injectParams;
    myApp.register.controller('dashboardCtrl', dashboardController);
})