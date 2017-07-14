'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies"];

    var platformController = function ($compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;

        //init local var data
        vm.updatePlatform = {};
        vm.editPlayer = {};
        vm.editPartner = {};

        // constants declaration
        vm.allPlayerCreditTransferStatus = {
            SUCCESS: 1,
            FAIL: 2,
            REQUEST: 3,
            SEND: 4,
            TIMEOUT: 5
        };
        vm.allGameStatusString = {
            ENABLE: 1,
            MAINTENANCE: 2,
            DISABLE: 3,
            DELETED: 4
        };
        vm.allGameStatusKeys = ['ENABLE', 'MAINTENANCE', 'DISABLE', 'DELETED'];
        vm.allPartnersStatusString = {
            NORMAL: 1,
            FORBID: 2
        };
        vm.allPartnersStatusKeys = ['NORMAL', 'FORBID'];
        vm.partnerCommissionPeriodConst = {
            DAY: "DAY",
            WEEK: "WEEK",
            HALF_MONTH: "HALF_MONTH",
            MONTH: "MONTH"
        };
        vm.partnerCommissionSettlementModeConst = {
            OPSR: "operationAmount - platformFee - serviceFee - totalRewardAmount",
            TB: "TopUp - Bonus"
        };
        vm.allPlayersStatusString = {
            NORMAL: 1,
            FORBID_GAME: 2,
            FORBID: 3,
            BALCKLIST: 4,
            ATTENTION: 5,
            WARINESS: 6
        };
        vm.allPlayersStatusKeys = ['NORMAL', 'FORBID_GAME', 'FORBID', 'BALCKLIST', 'ATTENTION','WARINESS'];
        vm.depositMethodList = {
            Online: 1,
            ATM: 2,
            Counter: 3
        };
        vm.allPlayerFeedbackString = {
            NORMAL: "Normal",
            MISSED_CALL: "MissedCall",
            PLAYER_BUSY: "PlayerBusy",
            OTHER: "Other"
        };
        vm.playerLvlPeriod = {
            NONE: "NONE",
            DAY: "DAY",
            WEEK: "WEEK",
            MONTH: "MONTH"
        };
        vm.topUpTypeList = {
            1: 'TOPUPMANUAL',
            2: 'TOPUPONLINE',
            3: 'TOPUPALIPAY',
            4: 'TOPUPWECHAT'
        };
        vm.allSettlePeriod = {
            DAILY: 1,
            WEEKLY: 2
        };

        // Basic library functions
        var Lodash = {
            keyBy: (array, keyName) => {
                var obj = {};
                array.forEach(
                    item => obj[item[keyName]] = item
                );
                return obj;
            },
            cloneDeep: function (value) {
                return value instanceof Array
                    ? value.map(i => Lodash.cloneDeep(i))
                    : $.extend(true, {}, value);
            }
        };

        ////////////////Mark::Platform functions//////////////////
        vm.updatePageTile = function () {
            window.document.title = $translate("platform") + "->" + $translate(vm.platformPageName);
            $(document).one('shown.bs.tab', function (e) {
                $(document).trigger('resize');
            });
        };

        vm.toggleShowPlatformList = function (flag) {
            if (flag) {
                vm.leftPanelClass = 'widthto25';
                vm.rightPanelClass = 'widthto75';
                vm.showPlatformList = true;
            } else {
                vm.leftPanelClass = 'widthto5 subAll0';
                vm.rightPanelClass = 'widthto95';
                vm.showPlatformList = false;
            }
            $cookies.put("platformShowLeft", vm.showPlatformList);
            $scope.safeApply();
        }
        //search platform by name
        vm.getAllDepartmentData = function (callback) {
            if (!authService.checkViewPermission('Platform', 'Platform', 'Create')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getDepartmentTreeById', {departmentId: authService.departmentId()}, success);
            function success(data) {
                vm.departments = data.data;
                console.log('all departments', vm.departments);
                $scope.safeApply();
            }
        };
        vm.getDepartNamebyId = function (id) {
            if (!id || !vm.departments || vm.departments.length == 0) return '';
            var result = '';
            $.each(vm.departments, function (i, v) {
                if (v._id == id) {
                    result = v.departmentName;
                    return true;
                }
            })
            return result;
        }

        vm.searchPlatform = function () {
            //select cur platform name
            if (vm.platformSearchText) {
                vm.searchAndSelectPlatform(vm.platformSearchText);
            }
        };

        vm.syncPlatform = function () {
            socketService.$socket($scope.AppSocket, 'syncPlatform', {}, function (data) {

            })
        }
        //get all platform data from server
        vm.loadPlatformData = function (option) {
            if ($('#platformRefresh').hasClass('fa-spin')) {
                return
            }
            $('#platformRefresh').addClass('fa-spin');
            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                console.log('all platform data', data.data);
                vm.allPlatformData = data.data;
                if (data.data) {
                    // if (data.data.length == 1 && !authService.checkViewPermission('Platform', 'Platform', 'Create')) {
                    //     console.log('platform', data.data);
                    //     vm.showPlatformList = false;
                    //     $('div#platformContent').removeClass('col-md-9');
                    //     $('div#platformContent').addClass('col-md-12');
                    //     $('.contractIcon').hide();
                    //     vm.selectPlatformNode({text: data.data[0].name, data: data.data[0]}, option);
                    //     $scope.safeApply();
                    //
                    // }
                    vm.buildPlatformList(data.data);
                }
                $('#platformRefresh').removeClass('fa-spin');

                $('#platformRefresh').addClass('fa-check');
                $('#platformRefresh').removeClass('fa-refresh');
                setTimeout(function () {
                    $('#platformRefresh').removeClass('fa-check');
                    $('#platformRefresh').addClass('fa-refresh').fadeIn(100);
                }, 1000);

                //select platform from cookies data
                var storedPlatform = $cookies.get("platform");
                if (storedPlatform) {
                    vm.searchAndSelectPlatform(storedPlatform, option);
                }

            }, function (err) {
                $('#platformRefresh').removeClass('fa-spin');
            });
        };
        vm.showPlatformDetailModal = function () {
            //$('#platformDetail').html();
            $('.platformName').popover({
                template: '<div class="popover" role="tooltip"><div class="arrow"></div><h3 class="popover-title platformDetailClass"></h3><div class="popover-content platformDetailClass"></div></div>',
                html: true,
                title: function () {
                    return $translate('PLATFORM_DETAIL')
                },
                content: function () {
                    return $('#platformDetail').css('color', 'blueviolet').html();
                }
            });
        }

        //build platform list based on platform data from server
        vm.buildPlatformList = function (data) {
            vm.platformList = [];
            for (var i = 0; i < data.length; i++) {
                vm.platformList.push(vm.createPlatformNode(data[i]));
            }
            //var platformsToDisplay = vm.platformList;
            var searchText = (vm.platformSearchText || '').toLowerCase();
            var platformsToDisplay = vm.platformList.filter(platformData => platformData.data.name.toLowerCase().includes(searchText));
            $('#platformTree').treeview(
                {
                    data: platformsToDisplay,
                    highlightSearchResults: false,
                    showImage: true,
                    showIcon: false,
                }
            );
            // vm.selectPlatformNode($('#platformTree').treeview('getNode', 0));
            $('#platformTree').on('nodeSelected', function (event, data) {
                vm.selectPlatformNode(data);
            });
        };

        vm.rebuildPlatformListDebounced = $scope.debounceSearch(() => vm.buildPlatformList(vm.allPlatformData));

        //search and select platform node
        vm.searchAndSelectPlatform = function (text, option) {
            var findNodes = $('#platformTree').treeview('search', [text, {
                ignoreCase: false,
                exactMatch: true
            }]);
            if (findNodes && findNodes.length > 0) {
                vm.selectPlatformNode(findNodes[0], option);
                $('#platformTree').treeview('selectNode', [findNodes[0], {silent: true}]);
            }
        };

        //set selected platform node
        vm.selectPlatformNode = function (node, option) {
            vm.selectedPlatform = node;
            vm.curPlatformText = node.text;
            // vm.showPlatform = $.extend({}, getLocalTime(vm.selectedPlatform.data));
            vm.showPlatform = $.extend({}, vm.selectedPlatform.data);
            console.log("vm.selectedPlatform", vm.selectedPlatform);
            $cookies.put("platform", node.text);
            if (option && !option.loadAll) {
                $scope.safeApply();
                return;
            }
            // check settlement buttons
            var nowDate = new Date().toLocaleDateString();
            var dailyDate = new Date(vm.selectedPlatform.data.lastDailySettlementTime).toLocaleDateString();
            var weeklyDate = new Date(vm.selectedPlatform.data.lastWeeklySettlementTime).toLocaleDateString();
            vm.showDailySettlement = nowDate != dailyDate;
            vm.showWeeklySettlement = (nowDate != weeklyDate) && (vm.selectedPlatform.data.weeklySettlementDay == new Date().getDay());
            vm.platformSettlement = {};
            vm.advancedPartnerQueryObj = {limit:10, index:0};

            //load partner
            utilService.actionAfterLoaded("#partnerTablePage", function () {
                vm.advancedPartnerQueryObj.pageObj = utilService.createPageForPagingTable("#partnerTablePage", {pageSize:10}, $translate, function (curP, pageSize) {
                    var index = (curP - 1) * pageSize;
                    vm.advancedPartnerQueryObj.index = index;
                    vm.advancedPartnerQueryObj.limit = pageSize;
                    vm.commonPageChangeHandler(curP, pageSize, "advancedPartnerQueryObj", vm.getPlatformPartnersData())
                });
            })

            Q.all([vm.getAllPlayerLevels(), vm.getAllPlayerTrustLevels(), vm.getAllPartnerLevels()]).then(
                function (data) {
                    // Rather than call each tab directly, it might be more elegant to emit a 'platform_changed' event here, which each tab could listen for
                    switch (vm.platformPageName) {
                        case "GameGroup":
                            vm.loadGameGroupData();
                            break;
                        case "Feedback":
                            vm.submitPlayerFeedbackQuery();
                            break;
                        case "MessageTemplates":
                            vm.getPlatformMessageTemplates();
                            break;
                        case "FeedbackAdmin" :
                            vm.initFeedbackAdmin();
                            break;
                    }
                    //     case "Player":
                    vm.playersQueryCreated = false;
                    vm.configTabClicked();
                    vm.loadAlldepartment();
                    vm.rewardTabClicked();
                    vm.getPlatformRewardProposal();
                    vm.getPlatformPlayersData(true);
                    //     break;
                    // case "Partner":
                    vm.getPlatformPartnersData();
                    //     break;
                    // case "Game":
                    vm.getPlatformGameData();
                    //     break;
                    // case "Reward":
                    //     vm.rewardTabClicked();
                    //     break;
                    // case "Proposal":
                    vm.loadProposalTypeData();
                    //     break;
                    // case "Config":
                    //     break;
                    // case "bankCardGroup":
                    vm.loadBankCardGroupData();
                    //     break;
                    // case "merchantGroup":
                    vm.loadMerchantGroupData();
                    vm.loadAlipayGroupData();
                    vm.loadWechatPayGroupData();
                    vm.loadQuickPayGroupData();
                    vm.getPlatformAnnouncements();
                    //     break;
                    // }
                    $scope.safeApply();
                },
                function (error) {
                    console.log("error gettting all levels", error);
                }
            ).done();
        };

        //create platform node for platform list
        vm.createPlatformNode = function (v) {
            var obj = {
                text: v.name,
                id: v._id,
                selectable: true,
                data: v,
                image: {
                    url: v.icon,
                    width: 30,
                    height: 30,
                }
            };
            return obj;
        };
        vm.initPlatform = function (bool) {
            vm.pickDay = null;
            vm.pickWeek = null;
            vm.listArray = [];
            $("form[name='form_new_platform'] input").attr('disabled', !bool);
            $("form[name='form_new_platform'] select").attr('disabled', !bool);
            $("form[name='form_new_platform'] button").attr('disabled', !bool);
            console.log("init ed");
            $scope.safeApply();
        }
        vm.clearShowPlatform = function () {
            vm.showPlatform = {};
            vm.showPlatform.dailySettlementHour = 0;
            vm.showPlatform.dailySettlementMinute = 0;
            vm.showPlatform.weeklySettlementDay = 0;
            vm.showPlatform.weeklySettlementHour = 0;
            vm.showPlatform.weeklySettlementMinute = 0;
            $scope.safeApply();
        }
        vm.getDayName = function (d) {
            switch (d) {
                case 1:
                    return $translate('MON');
                case 2:
                    return $translate('TUE');
                case 3:
                    return $translate('WED');
                case 4:
                    return $translate('THU');
                case 5:
                    return $translate('FRI');
                case 6:
                    return $translate('SAT');
                case 0:
                    return $translate('SUN');
                // default:
                //     return '---';
            }
        }
        vm.getHourName = function (num) {
            if (num == 0) return 0;
            // else if (num == 24 || !num) return '--';
            else return num;
        }
        vm.getMinName = function (num) {
            if (num == 0) return 0;
            // else if (num == 60 || !num) return '--';
            else return num;
        }
        // vm.checkSettlementTime = function () {
        //     var temp = $.extend({}, vm.showPlatform);
        //     temp.dailySettlementTime = new Date();
        //     temp.dailySettlementTime.setHours(temp.dailySettlementHour, temp.dailySettlementMinute);
        //     temp.weeklySettlementTime = new Date();
        //     temp.weeklySettlementTime.setHours(temp.weeklySettlementHour, temp.weeklySettlementMinute);
        //     temp.weeklySettlementTime.setDate(new Date().getDate() - new Date().getDay() + temp.weeklySettlementDay);
        //     return temp;
        // };
        //Send data to server to create new platform
        vm.createNewPlatform = function () {
            console.log('vm.showPlatform', vm.showPlatform);
            if (vm.showPlatform.hasOwnProperty('department') && !vm.showPlatform.department.hasOwnProperty('_id')) {
                vm.showPlatform.department._id = vm.showPlatform.department;
                vm.showPlatform.department = vm.showPlatform.department._id;
                delete vm.showPlatform.department._id;
            }
            socketService.$socket($scope.AppSocket, 'createPlatform', vm.showPlatform, function (data) {
                vm.curPlatformText = data.data.name;
                vm.loadPlatformData();
                vm.syncPlatform();
            });
        };

        //Delete selected platform
        vm.deletePlatform = function () {
            socketService.$socket($scope.AppSocket, 'deletePlatformById', {_ids: [vm.selectedPlatform.id]}, function (data) {
                vm.curPlatformText = "";
                vm.selectedPlatform = null;
                vm.loadPlatformData();
                vm.syncPlatform();
            });
        };

        //Daily settlement
        vm.settlementModal = function (type) {
            vm.settlementType = type;
            vm.settlementTableTotals = {};
            $('#modalPlatformSettlement').modal();
            $('#platformSettlementLoadingIcon').show();
            var sendQuery = {
                platformId: vm.selectedPlatform.id,
                period: type == "Daily Settlement" ? 1 : 2
            }
            socketService.$socket($scope.AppSocket, 'getPlatformConsumptionReturnDetail', sendQuery, success, failfunc);
            $scope.safeApply();
            function success(data) {
                $('#platformSettlementLoadingIcon').hide();
                console.log("getPlatformConsumptionReturnDetail:", data);
                vm.drawSettlementTable(data.data);
                var consumptionSum = 0;
                var returnSum = 0;
                for (var player of data.data) {
                    for (var gameTypeId in player) {
                        var record = player[gameTypeId];
                        if (typeof record === 'object' && typeof record.consumptionAmount === 'number') {
                            consumptionSum += record.consumptionAmount;
                        }
                        if (typeof record === 'object' && typeof record.returnAmount === 'number') {
                            returnSum += record.returnAmount;
                        }
                    }
                }
                vm.settlementTableTotals = {
                    totalConsumption: consumptionSum.toFixed(2),
                    totalReturn: returnSum.toFixed(2),
                };
                $scope.safeApply();
            }

            function failfunc(error) {
                $('#platformSettlementLoadingIcon').hide();
                console.error("getPlatformConsumptionReturnDetail:", error);
            }
        }
        vm.drawSettlementTable = function (data) {
            if (data && data.length) {
                data = data.map(item => {
                    item.totalAmount$ = item.totalAmount.toFixed(2);
                    item.totalConsumptionAmount$ = item.totalConsumptionAmount.toFixed(2);
                    return item;
                })
            }
            var option = $.extend({}, {
                data: data,
                columns: [{
                    'title': $translate('PLAYER_NAME'),
                    data: 'playerName'
                }, {
                    'title': $translate('PLAYERID'),
                    data: 'playerId'
                }, {
                    'title': $translate('Total Amount'),
                    data: 'totalAmount$', sClass: "alignRight"
                }, {
                    'title': $translate('CONSUMPTION'),
                    data: 'totalConsumptionAmount$', sClass: "alignRight"
                }]
            }, vm.generalDataTableOptions);
            $('#settlementTable').DataTable(option);
        }
        vm.performSettlement = function () {
            var socketAPI;
            if (vm.settlementType == "Daily Settlement") {
                socketAPI = "startPlatformDailySettlement"
            } else if (vm.settlementType == "Weekly Settlement") {
                socketAPI = "startPlatformWeeklySettlement"
            }
            vm.platformSettlement.message = '';
            vm.platformSettlement.processing = true;
            socketService.$socket($scope.AppSocket, socketAPI, {platformId: vm.selectedPlatform.id}, success, failfunc);
            function success(data) {
                vm.platformSettlement.processing = false;
                vm.platformSettlement.message = 'Success';
                console.log('settle result', data);
                $scope.safeApply();
            }

            function failfunc(error) {
                vm.platformSettlement.processing = false;
                vm.platformSettlement.message = error.error.message;
                console.log(error);
                $scope.safeApply();
            }
        }
        vm.dailySettlement = function (callback, bFix) {
            vm.platformSettlement.processing = true;
            var actionName = bFix ? "fixPlatformDailySettlement" : "startPlatformDailySettlement";
            socketService.$socket($scope.AppSocket, actionName, {platformId: vm.selectedPlatform.id}, success, failfunc);
            function success(data) {
                vm.platformSettlement.processing = false;
                if (callback) {
                    callback(data);
                }
                vm.loadPlatformData();
            };
            function failfunc(error) {
                console.log(error);
                vm.platformSettlement.processing = false;
                if (callback) {
                    callback(error);
                }
            };
        };

        //Weekly settlement
        vm.weeklySettlement = function (callback, bFix) {
            vm.platformSettlement.processing = true;
            var actionName = bFix ? "fixPlatformWeeklySettlement" : "startPlatformWeeklySettlement";
            socketService.$socket($scope.AppSocket, actionName, {platformId: vm.selectedPlatform.id}, success, failfunc);
            function success(data) {
                if (callback) {
                    callback(data);
                }
                vm.platformSettlement.processing = false;
                vm.loadPlatformData();
            };
            function failfunc(error) {
                console.log(error);
                vm.platformSettlement.processing = false;
                if (callback) {
                    callback(error);
                }
            };
        };

        //Weekly reward settlement
        vm.weeklyRewardSettlement = function () {
            socketService.$socket($scope.AppSocket, 'startPlatformRewardEventSettlement', {platformId: vm.selectedPlatform.id}, success, failfunc);
            function success(data) {
                console.log(success);
            };
            function failfunc(error) {
                console.log(error);
            };
        };

        vm.prepareSettlementHistory = function () {
            vm.initQueryTimeFilter('modalPlatformSettlementHistory');
            vm.queryPara.modalPlatformSettlementHistory.interval = 'daily';
            $scope.safeApply();
            vm.processDataTableinModal('#modalPlatformSettlementHistory', '#platformSettlementHistoryTbl');
            vm.getSettlementHistory();
        }
        vm.getSettlementHistory = function () {
            socketService.$socket($scope.AppSocket, 'getSettlementHistory', {
                query: {
                    type: "platform",
                    interval: vm.queryPara.modalPlatformSettlementHistory.interval,
                    id: vm.selectedPlatform.id,
                    createTime: {
                        $gte: vm.queryPara.modalPlatformSettlementHistory.startTime.data('datetimepicker').getLocalDate(),
                        $lt: vm.queryPara.modalPlatformSettlementHistory.endTime.data('datetimepicker').getLocalDate(),
                    }
                }
            }, success, failfunc);
            function success(data) {
                console.log('settlement history', data);
                vm.platformSettlementHis = data.data;
                $scope.safeApply();
                vm.updateDataTableinModal('#modalPlatformSettlementHistory', '#platformSettlementHistoryTbl');
            };
            function failfunc(error) {
                console.log(error);
            };
        }

        vm.startPlatformPartnerCommissionSettlement = function ($event) {
            vm.partnerCommissionSettlement = {
                result: false,
                status: 'ready'
            }
            $('#partnerCommissionSettlementModal').modal('show');
            $scope.safeApply();
        }
        vm.performPartnerCommissionSetlement = function () {
            vm.partnerCommissionSettlement.status = 'processing';
            socketService.$socket($scope.AppSocket, 'startPlatformPartnerCommissionSettlement',
                {platformId: vm.selectedPlatform.id},
                function (data) {
                    console.log('partnercommission', data);
                    vm.partnerCommissionSettlement.status = 'completed';
                    vm.partnerCommissionSettlement.result = $translate('Success');
                    $scope.safeApply();
                }, function (err) {
                    console.log('err', err);
                    vm.partnerCommissionSettlement.status = 'completed';
                    vm.partnerCommissionSettlement.result = err.error ? (err.error.message ? err.error.message : err.error) : '';
                    $scope.safeApply();
                });
        };

        vm.startPlatformPlayerConsumptionReturnSettlement = function ($event) {
            vm.playerConsumptionReturnSettlement = {
                result: false,
                status: 'ready'
            }
            $('#playerConsumptionReturnSettlementModal').modal('show');
            $scope.safeApply();
        }
        vm.performPlayerConsumptionReturnSettlement = function () {
            vm.playerConsumptionReturnSettlement.status = 'processing';
            socketService.$socket($scope.AppSocket, 'startPlatformPlayerConsumptionReturnSettlement',
                {platformId: vm.selectedPlatform.id},
                function (data) {
                    console.log('playerConsumptionReturn', data);
                    vm.playerConsumptionReturnSettlement.status = 'completed';
                    vm.playerConsumptionReturnSettlement.result = $translate('Success');
                    $scope.safeApply();
                }, function (err) {
                    console.log('err', err);
                    vm.playerConsumptionReturnSettlement.status = 'completed';
                    vm.playerConsumptionReturnSettlement.result = err.error ? (err.error.message ? err.error.message : err.error) : '';
                    $scope.safeApply();
                });
        };

        vm.startPlatformPlayerConsumptionIncentiveSettlement = function ($event) {
            vm.playerConsumptionIncentiveSettlement = {
                result: false,
                status: 'ready'
            }
            $('#playerConsumptionIncentiveSettlementModal').modal('show');
            $scope.safeApply();
        }
        vm.performPlayerConsumptionIncentiveSettlement = function () {
            vm.playerConsumptionIncentiveSettlement.status = 'processing';
            socketService.$socket($scope.AppSocket, 'startPlatformPlayerConsumptionIncentiveSettlement',
                {platformId: vm.selectedPlatform.id},
                function (data) {
                    console.log('playerConsumptionIncentive', data);
                    vm.playerConsumptionIncentiveSettlement.status = 'completed';
                    vm.playerConsumptionIncentiveSettlement.result = $translate('Success');
                    $scope.safeApply();
                }, function (err) {
                    console.log('err', err);
                    vm.playerConsumptionIncentiveSettlement.status = 'completed';
                    vm.playerConsumptionIncentiveSettlement.result = err.error ? (err.error.message ? err.error.message : err.error) : '';
                    $scope.safeApply();
                });
        };

        vm.initTransferAllPlayersCreditFromProvider = function ($event) {
            $('#modalTransferOutAllPlayerCreditFromGameProvider').modal('show');
            $scope.safeApply();
        }

        //before update platform
        vm.befreUpdatePlatform = function () {
            let idStr = vm.showPlatform.department;
            vm.showPlatform.department = {_id: idStr};
            console.log('require', vm.selectedPlatform);
            vm.updatePlatform._id = vm.selectedPlatform.id;
            console.log('department ID', vm.showPlatform.department);
        };

        //update selected platform data
        vm.updatePlatformAction = function () {
            if (vm.showPlatform.department.hasOwnProperty('_id')) {
                vm.showPlatform.department = vm.showPlatform.department._id;
            }
            socketService.$socket($scope.AppSocket, 'updatePlatform',
                {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: vm.showPlatform
                },
                function (data) {
                    vm.curPlatformText = vm.showPlatform.name;
                    vm.loadPlatformData({loadAll: false});
                    vm.syncPlatform();
                });
        };

        vm.initSendMultiMessage = function () {
            vm.sendMultiMessage = {
                totalCount: 0,
                isTestPlayer: '',
                playerLevel: '',
                trustLevel: '',
                minTopupTimes: null,
                maxTopupTimes: null,
                channelMaxChar: 100,
                wordCount: 0,
                numUsedMessage: 0,
                checkAllRow: false,
                numReceived: 0,
                numFailed: 0,
                numRecipient: 0,
                messageType: "sms",
                sendBtnText: $translate("SEND")
            };
            $scope.getChannelList(function () {
                vm.sendMultiMessage.channel = $scope.channelList ? $scope.channelList[0] : null;
            });
            utilService.actionAfterLoaded('#mutilplePlayerTablePage', function () {
                vm.sendMultiMessage.accStartTime = utilService.createDatePicker('#sendMultiMessageQuery .accStart');
                vm.sendMultiMessage.accEndTime = utilService.createDatePicker('#sendMultiMessageQuery .accEnd');
                vm.sendMultiMessage.regStartTime = utilService.createDatePicker('#sendMultiMessageQuery .regStart');
                vm.sendMultiMessage.regEndTime = utilService.createDatePicker('#sendMultiMessageQuery .regEnd');

                utilService.clearDatePickerDate('#sendMultiMessageQuery .accStart');
                utilService.clearDatePickerDate('#sendMultiMessageQuery .accEnd');
                utilService.clearDatePickerDate('#sendMultiMessageQuery .regStart');
                utilService.clearDatePickerDate('#sendMultiMessageQuery .regEnd');

                vm.sendMultiMessage.pageObj = utilService.createPageForPagingTable("#mutilplePlayerTablePage", {pageSize: 100}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "sendMultiMessage", vm.searchPlayersForSendingMessage)
                });
                vm.searchPlayersForSendingMessage(true);
            })
        }

        vm.searchPlayersForSendingMessage = function (newSearch) {
            if (!vm.selectedPlatform) {
                return;
            }
            $('#mutilplePlayerTable tbody tr').removeClass('selected');
            $('#mutilplePlayerTable tbody input[type="checkbox"]').prop("checked", vm.sendMultiMessage.checkAllRow);

            vm.sendMultiMessage = $.extend({}, vm.sendMultiMessage, {
                checkAllRow: false,
                numReceived: 0,
                numFailed: 0,
                numRecipient: 0,
                sendBtnText: $translate("SEND")
            });

            var playerQuery = {
                registrationTime: {
                    $gte: vm.sendMultiMessage.regStartTime.data('datetimepicker').getLocalDate() || new Date(0),
                    $lt: vm.sendMultiMessage.regEndTime.data('datetimepicker').getLocalDate() || new Date(),
                },
                lastAccessTime: {
                    $gte: vm.sendMultiMessage.accStartTime.data('datetimepicker').getLocalDate() || new Date(0),
                    $lt: vm.sendMultiMessage.accEndTime.data('datetimepicker').getLocalDate() || new Date(),
                }
            };
            if (vm.sendMultiMessage.trustLevel) {
                playerQuery.trustLevel = vm.sendMultiMessage.trustLevel;
            }
            if (vm.sendMultiMessage.playerLevel) {
                playerQuery.playerLevel = vm.sendMultiMessage.playerLevel;
            }
            if (vm.sendMultiMessage.isTestPlayer != null) {
                playerQuery.isTestPlayer = vm.sendMultiMessage.isTestPlayer;
            }
            if (vm.sendMultiMessage.minTopupTimes != null) {
                playerQuery.topUpTimes = {"$gte": vm.sendMultiMessage.minTopupTimes};
            }
            if (vm.sendMultiMessage.maxTopupTimes != null) {
                if (playerQuery.topUpTimes && playerQuery.topUpTimes["$gte"]) {
                    playerQuery.topUpTimes["$lt"] = vm.sendMultiMessage.maxTopupTimes
                } else {
                    playerQuery.topUpTimes = {"$lt": vm.sendMultiMessage.maxTopupTimes};
                }
            }
            var sendQuery = {
                platformId: vm.selectedPlatform.id,
                query: playerQuery,
                index: vm.sendMultiMessage.index || 0,
                limit: vm.sendMultiMessage.limit || 100,
                sortCol: vm.sendMultiMessage.sortCol
            };
            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQuery', sendQuery, function (data) {
                console.log('playerData', data);

                var size = data.data.size || 0;
                var result = data.data.data || [];
                vm.drawSendMessagesTable(result.map(item => {
                    item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                    item.registrationTime$ = vm.dateReformat(item.registrationTime);
                    return item;
                }), size, newSearch);
                vm.sendMultiMessage.totalCount = size;
                vm.sendMultiMessage.pageObj.init({maxCount: size}, newSearch);
                $scope.safeApply();
            });
        }

        vm.checkPlayerExist = function (key, val) {
            if (!key || !val) {
                $('#playerValidFalse').addClass('hidden');
                $('#playerValidTrue').addClass('hidden');
                vm.playerApplyRewardPara.referPlayer = false;
                $scope.safeApply();
                return;
            }
            var sendObj = {};
            sendObj[key] = val;
            socketService.$socket($scope.AppSocket, 'getPlayerInfo', sendObj, function (data) {
                if (data.data) {
                    $('#playerValidFalse').addClass('hidden');
                    $('#playerValidTrue').removeClass('hidden');
                    vm.playerApplyRewardPara.referPlayer = true;
                } else {
                    $('#playerValidFalse').removeClass('hidden');
                    $('#playerValidTrue').addClass('hidden');
                    vm.playerApplyRewardPara.referPlayer = false;
                }
                $scope.safeApply();
            })
        }
        vm.drawSendMessagesTable = function (data, size, newSearch) {
            var option = $.extend({}, vm.generalDataTableOptions, {
                data: data,
                order: vm.sendMultiMessage.aaSorting || [[4, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'topUpTimes', bSortable: true, 'aTargets': [4]},
                    {
                        targets: [7],
                        title: '<input type="checkbox" class="toggleCheckAll">',
                        orderable: false,
                        render: function (data, type, row) {
                            '<input type="checkbox">'
                        }
                    },
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('PLAYER_NAME'), data: 'name'},
                    {'title': $translate('PLAYERID'), data: 'playerId'},
                    {'title': $translate('realName'), sClass: "wordWrap realNameCell", data: 'realName'},
                    {'title': $translate('playerLevel'), data: 'playerLevel.name'},
                    {'title': $translate('topUpTimes'), data: 'topUpTimes', bSortable: true},
                    {'title': $translate('lastAccessTime'), data: 'lastAccessTime$'},
                    {'title': $translate('registrationTime'), data: 'registrationTime$'},
                    {
                        render: function () {
                            var link = $('<input>', {class: "checkRow", type: 'checkbox'})
                            return link.prop('outerHTML');
                        }
                    }
                ],
                paging: false,
            });
            vm.sendMultiMessage.tableObj = $('#mutilplePlayerTable').DataTable(option);
            $('#mutilplePlayerTable').off('order.dt');
            $('#mutilplePlayerTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'sendMultiMessage', vm.searchPlayersForSendingMessage);
            });
            function updateNumReceipient() {
                vm.sendMultiMessage.numRecipient = $('#mutilplePlayerTable tbody input:checked[type="checkbox"]').length;
                resetMultiMessageStatus();
                $scope.safeApply();
            };
            $('.toggleCheckAll').off('click');
            $('.toggleCheckAll').on('click', function (event, a, b) {
                vm.sendMultiMessage.checkAllRow = $(this).prop('checked');
                if (vm.sendMultiMessage.checkAllRow) {
                    $('#mutilplePlayerTable tbody tr').addClass('selected');
                    $('#mutilplePlayerTable tbody input[type="checkbox"]').prop("checked", vm.sendMultiMessage.checkAllRow);
                } else {
                    $('#mutilplePlayerTable tbody tr').removeClass('selected');
                    $('#mutilplePlayerTable tbody input[type="checkbox"]').prop("checked", vm.sendMultiMessage.checkAllRow);
                }
                updateNumReceipient();
            });
            $('#mutilplePlayerTable .checkRow').off('click');
            $('#mutilplePlayerTable .checkRow').on('click', function (event) {
                $(this).closest('tr').toggleClass('selected');
                if ($(this).prop('checked') == false) {
                    $('#mutilplePlayerTable_wrapper .toggleCheckAll').prop('checked', false);
                }
                updateNumReceipient();
            });

            setTimeout(function () {
                $('#mutilplePlayerTable').resize();
            }, 100);
        }
        function resetMultiMessageStatus() {
            vm.sendMultiMessage.sendInitiated = false;
            vm.sendMultiMessage.sendCompleted = false;
            vm.sendMultiMessage.numReceived = 0;
            vm.sendMultiMessage.numFailed = 0;
            vm.sendMultiMessage.singleBtnText = $translate('SEND');
            // vm.sendMultiMessage.singleSendResultText = '';
            vm.sendMultiMessage.singleSendDisable = false;
            updateMultiMessageButton();
        }

        vm.messagesChange = function () {
            vm.sendMultiMessage.wordCount = vm.sendMultiMessage.messageContent.length;
            vm.sendMultiMessage.numUsedMessage = Math.ceil(vm.sendMultiMessage.wordCount / vm.sendMultiMessage.channelMaxChar);
            resetMultiMessageStatus();
        }
        vm.sendMessages = function () {
            // console.log(vm.sendMultiMessage.tableObj.rows('.selected').data());
            $scope.AppSocket.removeAllListeners('_sendSMSToPlayer');
            $scope.AppSocket.on('_sendSMSToPlayer', function (data) {
                console.log('retData', data);
                if (data.success) {
                    vm.sendMultiMessage.numReceived++;
                    $('#messageSentReceived').text(vm.sendMultiMessage.numReceived);
                } else {
                    vm.sendMultiMessage.numFailed++;
                    $('#messageSentFailed').text(vm.sendMultiMessage.numFailed);
                }
                if (vm.sendMultiMessage.numFailed + vm.sendMultiMessage.numReceived === vm.sendMultiMessage.numRecipient) {
                    vm.sendMultiMessage.sendCompleted = true;
                }
                updateMultiMessageButton();
                $scope.safeApply();
            });
            if (vm.sendMultiMessage.messageType === "sms") {
                vm.sendMultiMessage.tableObj.rows('.selected').data().each(function (data) {
                    $scope.AppSocket.emit('sendSMSToPlayer', {
                        playerId: data.playerId,
                        platformId: vm.selectedPlatform.data.platformId,
                        channel: vm.sendMultiMessage.channel,
                        message: vm.sendMultiMessage.messageContent
                    });
                });
            } else if (vm.sendMultiMessage.messageType === "mail") {
                let playerIds = vm.sendMultiMessage.tableObj.rows('.selected').data().reduce((tempPlayersId,selectedPlayers) => {
                    if(selectedPlayers._id){
                        tempPlayersId.push(selectedPlayers._id);
                    }
                    return tempPlayersId;
                },[]);

                let sendData = {
                    playerId: playerIds,
                    adminName: authService.adminName,
                    platformId: vm.selectedPlatform.id,
                    title: vm.sendMultiMessage.messageTitle,
                    content: vm.sendMultiMessage.messageContent
                };
                
                $scope.AppSocket.emit('sendPlayerMailFromAdminToPlayer', sendData);
            }

            vm.sendMultiMessage.sendInitiated = true;
            vm.sendMultiMessage.messageTitle = "";
            vm.sendMultiMessage.messageContent = "";
            updateMultiMessageButton();
        };

        vm.sendSingleMessages = function () {
            vm.sendMultiMessage.singleBtnText = $translate("Sending");
            vm.sendMultiMessage.singleSendDisable = true;
            socketService.$socket($scope.AppSocket, 'sendSMStoNumber', {
                phoneNumber: vm.toPhoneNumber,
                platformId: vm.selectedPlatform.data.platformId,
                channel: vm.sendMultiMessage.channel,
                message: vm.sendMultiMessage.messageContent
            }, function (data) {
                vm.sendMultiMessage.singleSendResultText = $translate("SUCCESS");
                vm.sendMultiMessage.singleBtnText = $translate("SEND");
                // vm.toPhoneNumber = null
                $scope.safeApply();
            }, function (err) {
                vm.sendMultiMessage.singleBtnText = $translate("SEND");
                vm.sendMultiMessage.singleSendResultText = $translate("FAIL");
                // vm.toPhoneNumber = null
                $scope.safeApply();
            })
            vm.toPhoneNumber = null;
            vm.sendMultiMessage.messageContent = "";
            $scope.safeApply();
        }
        function updateMultiMessageButton() {
            vm.sendMultiMessage.sendBtnText =
                vm.sendMultiMessage.sendCompleted ? $translate("DONE")
                    : vm.sendMultiMessage.sendInitiated ? $translate("Sending")
                    : $translate("SEND");
        }

        ////////////////Mark::Game Group functions//////////////////

        vm.loadGameGroupData = function () {
            //init gametab start===============================
            vm.showGameCate = "include";
            vm.toggleGameType();
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            vm.loadingGameGroup = true;
            vm.SelectedGameGroupNode = null;
            console.log("getGames", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformGameGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('gamegroup', data);
                //provider list init
                vm.loadingGameGroup = false;
                vm.platformGameGroupList = data.data;
                vm.drawGameGroupTree();
                $scope.safeApply();
            })
        }

        vm.addGameGroup = function (str) {
            console.log(str, vm.SelectedGameGroupNode, vm.newGameGroup);
            //vm.selectGameGroupParent
            var sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newGameGroup.name,
                parent: vm.newGameGroup.parent,
                code: vm.newGameGroup.code,
                displayName: vm.newGameGroup.displayName
            }
            socketService.$socket($scope.AppSocket, 'addPlatformGameGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadGameGroupData();
                $scope.safeApply();
            })
        }
        vm.removeGameGroup = function () {
            socketService.$socket($scope.AppSocket, 'deleteGameGroup', {_id: vm.SelectedGameGroupNode.id}, function (data) {
                console.log(data.data);
                // vm.loadGameGroupData();
                for (var i = 0; i < vm.platformGameGroupList.length; i++) {
                    if (vm.platformGameGroupList[i]._id == vm.SelectedGameGroupNode.id) {
                        vm.platformGameGroupList.splice(i, 1);
                        break;
                    }
                }
                vm.drawGameGroupTree();

                $scope.safeApply();
            })
        }
        vm.renameGameGroup = function () {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    // name: vm.SelectedGameGroupNode.groupData.name,
                    _id: vm.SelectedGameGroupNode.id,
                },
                update: {
                    name: vm.newGameGroup.name,
                    displayName: vm.newGameGroup.displayName,
                    code: vm.newGameGroup.code
                }
            }
            socketService.$socket($scope.AppSocket, 'renamePlatformGameGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadGameGroupData();
            })
        }

        vm.gameGroupClicked = function (index, obj) {
            vm.SelectedGameGroupNode = obj;

            vm.includedGamesGroup = [];
            vm.excludedGamesGroup = [];
            vm.selectGameGroupGames = [];
            vm.selectGameGroupGamesName = [];

            //get included games list
            var query = {
                platform: vm.selectedPlatform.id,
                // groupId: obj.groupData.groupId,
                _id: vm.SelectedGameGroupNode.id,
            }
            console.log('query', query);
            socketService.$socket($scope.AppSocket, 'getGamesByPlatformAndGameGroup', query, function (data2) {
                console.log("attached", data2.data);
                $.each(vm.filterGames(data2.data.games, true), function (i, v) {
                    if (!v || !v.game) {
                        return true;
                    }
                    var newObj = v.game;
                    newObj.index = (v && v.index) ? v.index : 1;
                    vm.includedGamesGroup.push(newObj);
                    vm.gameSmallShow[v.game._id] = processImgAddr(v.smallShow, newObj.smallShow);
                })
                console.log("vm.includedGamesGroup", vm.includedGamesGroup);
                if (vm.showGameCate == "include") {
                    vm.gameInGroupClicked(0, vm.includedGamesGroup[0], "in");
                }
                vm.gameGroupClickable.inGameLoaded = true;
                $scope.safeApply();
            })
            socketService.$socket($scope.AppSocket, 'getGamesNotInGameGroup', query, function (data2) {
                //console.log("not attached", data2.data);
                $.each(vm.filterGames(data2.data, true), function (i, v) {
                    if (!v || !v.game) {
                        return true;
                    }
                    vm.excludedGamesGroup.push(v.game);
                    vm.gameSmallShow[v.game._id] = processImgAddr(v.smallShow, v.game.smallShow);

                })
                console.log('vm.excludedGamesGroup', vm.excludedGamesGroup);
                if (vm.showGameCate == "exclude") {
                    vm.gameInGroupClicked(0, vm.excludedGamesGroup[0], "ex");
                }
                vm.gameGroupClickable.outGameLoaded = true;
                $scope.safeApply();
            })
        }

        vm.gametoGameGroup = function (type) {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    groupId: vm.SelectedGameGroupNode.groupData.groupId
                }
            }
            if (type === 'attach') {
                var gameArr = [];
                vm.selectGameGroupGames.forEach(a => {
                    gameArr.push({
                        index: 1,
                        game: a
                    })
                })
                sendData.update = {
                    "$addToSet": {
                        games: {"$each": gameArr}
                    }
                }
            } else if (type === 'detach') {
                sendData.update = {
                    "$pull": {
                        "games": {
                            "game": {
                                "$in": vm.selectGameGroupGames
                            }
                        }
                    }
                }
            }
            GeneralModal.confirm({
                title: $translate(type.toUpperCase()),
                text: $translate('Are you sure to') + $translate(type.toUpperCase()) + vm.selectGameGroupGamesName + "?"
            }).then(function () {
                console.log(sendData);
                socketService.$socket($scope.AppSocket, 'updatePlatformGameGroup', sendData, success);
                function success(data) {
                    vm.curGame = null;
                    console.log(data);
                    vm.selectGameGroupGames = [];
                    vm.selectGameGroupGamesName = [];
                    vm.gameGroupClicked(0, vm.SelectedGameGroupNode);
                    $scope.safeApply();
                }
            });
        }

        vm.updateGameIndexGameGroup = function (newIndex) {
            var gameId = vm.curGame._id;
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    groupId: vm.SelectedGameGroupNode.groupData.groupId
                },
                update: {
                    "$pull": {
                        'games': {game: gameId}
                    }
                }
            }
            socketService.$socket($scope.AppSocket, 'updatePlatformGameGroup', sendData, success);
            function success(data) {
                sendData.update = {
                    "$addToSet": {
                        games: {
                            index: newIndex,
                            game: gameId,
                        }
                    }
                }
                socketService.$socket($scope.AppSocket, 'updatePlatformGameGroup', sendData, function (newData) {
                    vm.curGame = null;
                    vm.gameGroupClicked(0, vm.SelectedGameGroupNode);
                });
            }
        }

        vm.initRenameGameGroup = function () {
            vm.newGameGroup = {};
            vm.newGameGroup.name = vm.SelectedGameGroupNode.groupData.name;
            vm.newGameGroup.displayName = vm.SelectedGameGroupNode.groupData.displayName;
            vm.newGameGroup.code = vm.SelectedGameGroupNode.groupData.code;
        }

        /////////////////// draw game group tree

        vm.drawGameGroupTree = function () {
            getGameGroupTree();
            vm.refreshGameGroupTree();
            $('#gameGroupTree').treeview('expandAll', {levels: 3, silent: true});
        };

        function getGameGroupTree() {
            vm.gameGroupTree = null;
            vm.gameGroupNodes = {};
            vm.userCountArray = [];
            var finalNodeTree = [];

            var rawNodeList = {};
            $.each(vm.platformGameGroupList, function (i, v) {
                var newNode = createGameGroupNode(v);
                //store all sub tree nodes to map list
                if (v.parent) {
                    //if there is only one gameGroup add it to the tree

                    rawNodeList[v._id] = newNode;
                }
                //if root node, add it to the first level
                else {
                    finalNodeTree.push(newNode);
                }
                vm.gameGroupNodes[v._id] = newNode;
            });

            // vm.SelectedGameGroupNode = finalNodeTree[0];
            // vm.gameGroupClicked(0, vm.SelectedGameGroupNode);
            vm.gameGroupNodes["root"] = finalNodeTree[0];

            for (var h in finalNodeTree) {
                buildSubTreeForNode(finalNodeTree[h]);
            }

            //build tree for passed in node
            function buildSubTreeForNode(rootNode) {
                if (rootNode && rootNode.children) {
                    for (var j = 0; j < rootNode.children.length; j++) {
                        rootNode.nodes.push(rawNodeList[rootNode.children[j]]);
                        buildSubTreeForNode(rawNodeList[rootNode.children[j]]);
                    }
                }
            }

            vm.gameGroupTree = finalNodeTree;
            console.log("vm.gameGroupTree", vm.gameGroupTree);
        }

        function createGameGroupNode(v) {
            var obj = {
                text: v.name + " (" + $translate("Code") + ": " + v.code + ")",
                id: v._id,
                nodeId: v._id,
                parent: v.parent ? v.parent : null,
                children: v.children || [],
                // icon: v.icon,
                selectable: true,
                groupData: v,
                tags: [],
            }
            if (obj.children.length > 0) {
                obj.nodes = [];
            }
            return obj;
        }

        vm.refreshGameGroupTree = function () {
            $('#gameGroupTree').treeview(
                {
                    data: vm.gameGroupTree,
                    showTags: true,
                    expandIcon: 'fa fa-plus-square-o',
                    collapseIcon: 'fa fa-minus-square-o',
                    toggleSelected: false,
                    selectedBackColor: '#3676AD',
                }
            );
            $('#gameGroupTree').on('nodeSelected', function (event, data) {
                vm.highlightGame = {};
                vm.selectGameGroupGames = [];
                if (!vm.gameGroupClickable.inGameLoaded || !vm.gameGroupClickable.outGameLoaded) {
                    return;
                } else {
                    vm.gameGroupClickable.inGameLoaded = false;
                    vm.gameGroupClickable.outGameLoaded = false;
                    vm.SelectedGameGroupNode = data;
                    vm.gameGroupID = data.groupData._id;
                    // vm.SelectedGameGroupText = data.text;
                    console.log("SelectedGameGroupNode", data);
                    vm.pageActionStatus = "null";
                    vm.gameGroupClicked(1, data);
                }
            });
        };

        vm.gameInGroupClicked = function (i, v, type) {
            if (!v) {
                vm.selectGameGroupGames = [];
                $scope.safeApply();
                return;
            }
            console.log('game clicked', v);
            var index = vm.selectGameGroupGames.indexOf(v._id);
            if (index == -1) {
                vm.selectGameGroupGames.push(v._id);
                vm.selectGameGroupGamesName.push(v.name);
                vm.highlightGame[v._id] = 'bg-pale';
                vm.curGame = v;
            } else if (index != -1) {
                vm.selectGameGroupGames.splice(index, 1);
                vm.selectGameGroupGamesName.splice(index, 1);
                delete vm.highlightGame[v._id];
            }

            // console.log('vm.selectGameGroupGames', vm.selectGameGroupGames, index);
            console.log('vm.curGame', vm.curGame);
        }
        vm.groupGameListCollapseIn = function () {
            $('#includedGroupGames').collapse('show');
            $('#excludedGroupGames').collapse('hide');

        }
        vm.groupGameListCollapseOut = function () {
            $('#includedGroupGames').collapse('hide');
            $('#excludedGroupGames').collapse('show');
        }

        vm.gameListCollapseIn = function () {
            $('#includedGames').collapse('show');
            $('#excludedGames').collapse('hide');
        }
        vm.gameListCollapseOut = function () {
            $('#includedGames').collapse('hide');
            $('#excludedGames').collapse('show');
        }
        vm.allGametoGameGroup = function (type, which) {
            vm.selectGameGroupGames = [];
            vm.selectGameGroupGamesName = [];
            vm.highlightGame = {};
            vm.curGame = null;
            if (type == "add") {
                var src = [];
                if (which == "in") {
                    vm.showGameCate = "include";
                    src = vm.includedGamesGroup;
                    vm.groupGameListCollapseIn();

                } else if (which === "ex") {
                    vm.showGameCate = "exclude";
                    src = vm.excludedGamesGroup;
                    vm.groupGameListCollapseOut();

                }
                src.map(item => {
                    vm.selectGameGroupGames.push(item._id);
                    vm.selectGameGroupGamesName.push(item.name);
                    vm.highlightGame[item._id] = 'bg-pale';
                })
                vm.curGame = src.length ? src[src.length - 1] : null;
            }
            $scope.safeApply();
        }

        //////////////////////////////////////////// draw game group tree

        vm.moveGameGroupDialog = function () {
            console.log('treedata', vm.gameGroupTree);
            $scope.gameGroupMove = {
                isRoot: '1'
            };
            $('#gameGroupTreeForMoving').treeview(
                {
                    data: vm.gameGroupTree,
                    levels: 3,
                    highlightSearchResults: false
                }
            );
            // var nodes = $('#gameGroupTreeForMoving').treeview('search', [vm.SelectedGameGroupNode.text, {exactMatch: true}]);
            // var node = (nodes.length == 1) ? nodes[0] : null;
            // $('#gameGroupTreeForMoving').treeview('disableNode', [node, {silent: true}]);
            vm.gameGroupAllowMove = false;
            $('#gameGroupTreeForMoving').on('nodeSelected', function (event, data) {
                console.log("SelectedGameGroupNode", data);
                if (data.id == vm.SelectedGameGroupNode.id ||
                    data.parent == vm.SelectedGameGroupNode.id ||
                    data.children.indexOf(vm.SelectedGameGroupNode.id) > -1 ||
                    isAncestor(data.id, vm.SelectedGameGroupNode.id)) {
                    vm.gameGroupAllowMove = false;
                } else {
                    vm.gameGroupAllowMove = true;
                }
                vm.newGroupParent = data;
                $scope.safeApply();
            });
            function isAncestor(curId, targetId) {
                if (vm.gameGroupNodes[curId].parent != targetId) {
                    if (vm.gameGroupNodes[curId].parent) {
                        return isAncestor(vm.gameGroupNodes[curId].parent, targetId);
                    } else return false;
                } else return true;
            }
        }
        vm.confirmMoveGameGroup = function () {
            var sendData = {
                groupId: vm.SelectedGameGroupNode.id,
                curParentGroupId: vm.SelectedGameGroupNode.parent,
                newParentGroupId: $scope.gameGroupMove.isRoot ? vm.newGroupParent.id : null
            }
            socketService.$socket($scope.AppSocket, 'updateGameGroupParent', sendData, success);
            function success(data) {
                vm.loadGameGroupData();

                $scope.safeApply();
            }
        }

        ////////////////Mark::Game functions//////////////////

        vm.platformGameTabClicked = function () {
            //reset to unselected state
            vm.SelectedProvider = null;
            vm.showGameCate = "include";
            vm.curGame = null;
        }
        //get all platform data from server
        vm.getPlatformGameData = function () {
            //init gametab start===============================
            vm.SelectedProvider = null;
            vm.showGameCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            //console.log("getGames", gameIds);
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                console.log('getPlatform', data.data);
                //provider list init
                vm.platformProviderList = data.data.gameProviders;
                vm.providerListCheck = {};
                $.each(vm.platformProviderList, function (i, v) {
                    vm.providerListCheck[v._id] = true;
                })
                //payment list init
                vm.platformPaymentChList = data.data.paymentChannels;
                vm.paymentListCheck = {};
                $.each(vm.platformPaymentChList, function (i, v) {
                    vm.paymentListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        };

        vm.linkProvider = function (which) {
            //get vm.showProviderList
            vm.showProviderList = [];
            socketService.$socket($scope.AppSocket, 'getAllGameProviders', {}, function (data) {
                vm.providerList = data.data;
                if (which == 'attach') {
                    //console.log("vm.providerList", vm.providerList);
                    vm.selectProvider = {};
                    $.each(vm.providerList, function (i, v) {
                        console.log(v._id);
                        if (vm.providerListCheck.hasOwnProperty(v._id)) {
                            //vm.selectProvider[v._id] = true;
                        } else {
                            vm.showProviderList.push(v);
                        }
                    });
                    console.log("checker", vm.showProviderList);
                    $scope.safeApply();
                } else if (which == 'detach') {
                    // No longer used
                    vm.showProviderList = vm.platformProviderList;
                    console.log('vm.showProviderList', vm.showProviderList);
                    $scope.safeApply();
                }
            })
        }
        vm.confirmDetachProvider = function () {
            GeneralModal.confirm({
                title: $translate('DETACH_PROVIDER'),
                text: $translate('The provider') + " '" + vm.getPlatformsNickNameForProvider(vm.selectedPlatform.data, vm.SelectedProvider) + "' " + $translate('will be detached from this platform')
            }).then(function () {
                vm.submitProviderChange('DETACH', vm.SelectedProvider);
            });
        }
        vm.submitProviderChange = function (type, data) {
            if (!data) return;
            var sendData = {
                platformId: vm.selectedPlatform.id,
                providerId: data._id
            };
            console.log(sendData);

            var sendString = '';
            if (type == "ATTACH") {
                sendString = 'addProviderToPlatformById';
                sendData.providerNickName = vm.selectedProviderNickName;
                sendData.providerPrefix = vm.selectedProviderPrefix;
            } else if (type === "RENAME") {
                sendString = 'renameProviderInPlatformById';
                sendData.providerNickName = vm.selectedProviderNickName;
                sendData.providerPrefix = vm.selectedProviderPrefix;
            } else if (type == "DETACH") {
                sendString = 'removeProviderFromPlatformById';
            } else if (type == "ENABLE") {
                sendString = 'updateProviderFromPlatformById';
                sendData.isEnable = true;
            } else if (type == "DISABLE") {
                sendString = 'updateProviderFromPlatformById';
                sendData.isEnable = false;
            }
            socketService.$socket($scope.AppSocket, sendString, sendData, function (data) {
                console.log(data);
                vm.loadPlatformData();
                vm.getPlatformGameData();
            })
        }
        vm.getGameStatusClass = function (str) {
            if (!str)return;
            if (str == vm.allGameStatusString.ENABLE) {
                return 'colorGreen';
            } else if (str == vm.allGameStatusString.DISABLE) {
                return 'colorRed';
            } else if (str == vm.allGameStatusString.MAINTENANCE) {
                return 'colorYellow';
            } else {
                return 'colorRed';
            }
        }
        vm.filterGames = function (data, filterProvider) {
            data = data || [];
            return data.filter(item1 => {
                var item = item1.game ? item1.game : item1;
                if (vm.filterGameType && (vm.filterGameType != 'all') && (vm.filterGameType != item.type)) return false;
                if (vm.filterPlayGameType && (vm.filterPlayGameType != 'all') && (vm.filterPlayGameType != item.playGameType)) return false;
                if (vm.filterGameName && item.name.toLowerCase().indexOf(vm.filterGameName.toLowerCase()) == -1) return false;
                if (vm.filterGameId && item.gameId.indexOf(vm.filterGameId) == -1) return false;
                if (vm.filterGameDescription && (item.description && item.description.toLowerCase().indexOf(vm.filterGameDescription.toLowerCase()) == -1 || !item.description)) return false;
                if (filterProvider && vm.filterGameProvider && (vm.filterGameProvider != 'all') && (vm.filterGameProvider != item.provider)) return false;
                if (item.status == 4) return false;
                return true;
            })
        }

        vm.providerClicked = function (i, data) {
            if (i != "refresh") {
                //vm.highlightProvider = {};
                //vm.highlightProvider[i] = 'bg-pale';
                vm.SelectedProvider = data;
                vm.curGame = '';
                console.log("provider clicked", data);
            }
            vm.selectedGamesInGameGroup = [];
            vm.highlightGame = {};
            vm.masterGameStatus = {};
            vm.newGamePic = '';
            //get included games list
            var query = {
                platform: vm.selectedPlatform.id,
                provider: data._id
            }
            vm.includedGames = '';
            socketService.$socket($scope.AppSocket, 'getGamesByPlatformAndProvider', query, function (data2) {
                console.log("attached", data2.data);
                vm.includedGames = [];
                $.each(vm.filterGames(data2.data, false), function (i, v) {
                    var newObj = v.game;
                    // if (v.maintenanceHour == 0) {
                    //     newObj.maintenanceHour = 0;
                    // } else {
                    //     newObj.maintenanceHour = v.maintenanceHour || 'null';
                    // }
                    // if (v.maintenanceMinute == 0) {
                    //     newObj.maintenanceMinute = 0;
                    // } else {
                    //     newObj.maintenanceMinute = v.maintenanceMinute || 'null';
                    // }
                    newObj.platformVisible = v.visible;
                    vm.includedGames.push(newObj);
                    if (v.hasOwnProperty('status')) {
                        vm.gameStatus[v.game._id] = v.status;
                    }
                    vm.gameSmallShow[v.game._id] = processImgAddr(v.smallShow, newObj.smallShow);
                })
                console.log("vm.includedGames", vm.includedGames);
                $scope.safeApply();
            })
            vm.excludedGames = '';
            socketService.$socket($scope.AppSocket, 'getGamesNotAttachedToPlatform', query, function (data2) {
                console.log("not attached", data2.data);
                vm.excludedGames = [];
                $.each(vm.filterGames(data2.data, false), function (i, v) {
                    vm.excludedGames.push(v);
                    if (v.hasOwnProperty('status')) {
                        vm.gameStatus[v._id] = v.status;
                    } else {
                        vm.gameStatus[v._id] = "default";
                    }
                    vm.gameSmallShow[v._id] = processImgAddr(null, v.smallShow);
                })
                $scope.safeApply();
            })
        }

        function processImgAddr(mainAddr, addr) {//img in platformGame, and img in game
            if (mainAddr) return mainAddr;
            else if (/^(f|ht)tps?:\/\//.test(addr)) {
                return addr;
            } else {
                return "http://img99.neweb.me/" + addr;
            }
        }

        vm.toggleGameType = function () {
            vm.highlightGame = {};
            vm.selectedGamesInGameGroup = [];
            vm.curGame = null;
            vm.selectGameGroupGames = [];
            vm.selectGameGroupGamesName = [];
        }
        vm.gameClicked = function (i, v) {
            if (!v) return;
            console.log('game clicked', v);
            var exists = false;
            vm.selectedGamesInGameGroup = vm.selectedGamesInGameGroup.filter(item => {
                if (item && item._id) {
                    if (item._id == v._id) {
                        exists = true;
                        vm.highlightGame[v._id] = '';
                        return false;
                    } else return true;
                }
            });
            if (!exists) {
                vm.selectedGamesInGameGroup.push(v)
                vm.highlightGame[v._id] = 'bg-pale';
            }
            vm.curGame = vm.selectedGamesInGameGroup.length ? vm.selectedGamesInGameGroup[vm.selectedGamesInGameGroup.length - 1] : null;
            $scope.safeApply();
        }

        vm.allGametoPlatform = function (type, which) {
            vm.selectedGamesInGameGroup = [];
            vm.highlightGame = {};
            vm.curGame = null;
            if (type == "add") {
                var src = [];
                if (which == "in") {
                    vm.showGameCate = "include";
                    src = vm.includedGames;
                    vm.gameListCollapseIn();
                } else if (which === "ex") {
                    vm.showGameCate = "exclude";
                    src = vm.excludedGames;
                    vm.gameListCollapseOut();
                }
                src.map(item => {
                    vm.selectedGamesInGameGroup.push(item);
                    vm.highlightGame[item._id] = 'bg-pale';
                })
                vm.curGame = vm.selectedGamesInGameGroup.length ? vm.selectedGamesInGameGroup[vm.selectedGamesInGameGroup.length - 1] : null;
            }
            $scope.safeApply();
        }

        vm.updateGameStat = function (type, bool) {
            if (!bool) {
                vm.newType = type;
                $("#modalConfirmUpdateGame").modal();
            } else {
                var sendData = {
                    query: {
                        game: vm.curGame._id, platform: vm.selectedPlatform.id
                    },
                    updateData: {
                        status: type
                    }
                }
                console.log("send", sendData);
                socketService.$socket($scope.AppSocket, 'updateGameStatusToPlatform', sendData, success);
                vm.newType = '';
                $scope.safeApply();
            }
            function success(data) {
                console.log(data);
                vm.providerClicked('refresh', vm.SelectedProvider);
            }
        }
        vm.preparePlatformGameEdit = function () {
            vm.hourListArray = utilService.$createArray(24);
            vm.minuteListArray = utilService.$createArray(60);
            // vm.newMaintenanceHour = vm.curGame.maintenanceHour.toString();
            // vm.newMaintenanceMinute = vm.curGame.maintenanceMinute.toString();
            vm.newGamePic = vm.gameSmallShow[vm.curGame._id];
            vm.platformGameVisible = vm.curGame.platformVisible || false;
        }
        vm.updatePlatformGameProp = function (hh, mm, newPic, visible) {
            var sendData = {
                query: {
                    game: vm.curGame._id, platform: vm.selectedPlatform.id
                },
                updateData: {
                    // maintenanceHour: parseInt(hh),
                    // maintenanceMinute: parseInt(mm),
                    smallShow: newPic,
                    visible: visible
                }
            }
            console.log("send", sendData);
            socketService.$socket($scope.AppSocket, 'updateGameStatusToPlatform', sendData, success);
            vm.newType = '';
            $scope.safeApply();
            function success(data) {
                console.log(data);
                vm.providerClicked('refresh', vm.SelectedProvider);
                vm.curGame.maintenanceHour = parseInt(hh);
                vm.curGame.maintenanceMinute = parseInt(mm);
                vm.curGame.platformVisible = visible;
                $scope.safeApply();
            }
        }
        vm.gametoPlatform = function (type) {
            var sendString = '';
            if (type === 'attach') {
                sendString = 'attachGamesToPlatform'
            } else if (type === 'detach') {
                sendString = 'detachGamesFromPlatform'
            }
            var sendData = {
                platform: vm.selectedPlatform.id,
                games: vm.selectedGamesInGameGroup.map(item => {
                    return {
                        game: item._id,
                        name: item.name,
                        visible: item.visible
                    };
                })
            }
            console.log(sendData);
            socketService.$socket($scope.AppSocket, sendString, sendData, success);
            function success(data) {
                vm.curGame = null;
                console.log(data);
                vm.providerClicked('refresh', vm.SelectedProvider);
            }
        }
        var getPlatformsNickNameDataForProvider = function (platformData, gameProviderData) {
            return platformData && platformData.gameProviderInfo && gameProviderData
                && platformData.gameProviderInfo[gameProviderData._id];
        }
        vm.getPlatformsNickNameForProvider = function (platformData, gameProviderData) {
            var gameProviderNickNameData = getPlatformsNickNameDataForProvider(platformData, gameProviderData);
            return gameProviderNickNameData && gameProviderNickNameData.localNickName
                || gameProviderData.nickName
                || gameProviderData.name;
        }

        vm.getPlatformsProviderEnable = function (gameProviderData) {
            if (!gameProviderData || !vm.showPlatform) return;
            var providerId = gameProviderData._id || null;
            var obj;
            if (providerId && vm.showPlatform.gameProviderInfo) {
                obj = vm.showPlatform.gameProviderInfo[providerId];
            }
            return (obj && obj.isEnable == false) ? 'ENABLE' : 'DISABLE';
        }

        vm.confirmUpdateProviderStatus = function (providerData) {
            let type = vm.getPlatformsProviderEnable(providerData);
            GeneralModal.confirm({
                title: $translate('Please confirm your action.'),
                text: $translate("Are you sure to update") + " " + providerData.name + "(" + providerData.code + ") -> " + $translate(type) + " ?"
            }).then(function () {
                    vm.submitProviderChange(type, vm.SelectedProvider);
                }
            );
        }

        vm.getPlatformsPrefixForProvider = function (platformData, gameProviderData) {
            var gameProviderNickNameData = getPlatformsNickNameDataForProvider(platformData, gameProviderData);
            return gameProviderNickNameData && gameProviderNickNameData.localPrefix
                || gameProviderData.prefix;
        }

        /////////////////////////////////Mark::player functions//////////////////

        /////////////////////////////////Mark::Platform players functions//////////////////
        vm.showPlatformCreditTransferLog = function () {
            $('#modalPlatformCreditTransferLog').modal().show();
            vm.showPlatformRepair = false;
            vm.linkedPlayerTransferId = null;
            vm.creditChange = {
                finalValidAmount: $translate("Unknown"),
                finalLockedAmount: $translate("Unknown"),
                number: 0,
                remark: ''
            };
            vm.platformCreditTransferLog = {};
            utilService.actionAfterLoaded(('#platformCreditTransferLog'), function () {
                vm.platformCreditTransferLog.startTime = utilService.createDatePicker('#platformCreditTransferLog .startTime');
                vm.platformCreditTransferLog.endTime = utilService.createDatePicker('#platformCreditTransferLog .endTime');
                vm.platformCreditTransferLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.platformCreditTransferLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.platformCreditTransferLog.pageObj = utilService.createPageForPagingTable("#platformCreditTransferLogTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "platformCreditTransferLog", vm.getPagedPlatformCreditTransferLog)
                });
                vm.getPagedPlatformCreditTransferLog(true);
            });
        };

        vm.getPagedPlatformCreditTransferLog = function (newSearch) {
            vm.platformCreditTransferLog.loading = true;
            let sendQuery = {
                PlatformObjId: vm.selectedPlatform.id,
                startTime: vm.platformCreditTransferLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.platformCreditTransferLog.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.platformCreditTransferLog.index,
                limit: newSearch ? 10 : vm.platformCreditTransferLog.limit,
                sortCol: vm.platformCreditTransferLog.sortCol
            };

            vm.queryPlatformCreditTransferStatus ? sendQuery.status = vm.queryPlatformCreditTransferStatus : '';
            vm.queryPlatformCreditTransferType ? sendQuery.type = vm.queryPlatformCreditTransferType : '';
            vm.queryPlatformCreditTransferProvider ? sendQuery.provider = vm.queryPlatformCreditTransferProvider : '';

            socketService.$socket($scope.AppSocket, "getPagedPlatformCreditTransferLog", sendQuery, function (data) {
                vm.platformCreditTransferLogData = data.data.data;
                vm.platformCreditTransferLog.totalCount = data.data.total || 0;
                vm.platformCreditTransferLog.loading = false;
                vm.drawPagedPlatformCreditTransferQueryTable(vm.platformCreditTransferLogData, vm.platformCreditTransferLog.totalCount, newSearch);
            });

            // function getAllPlayerCreditTransferStatus() {
            //     vm.playerIDArr = [];
            //     return $scope.$socketPromise('getAllPlayerCreditTransferStatus')
            //         .then(data => {
            //             vm.allPlayerCreditTransferStatus = data.data;
            //             $scope.safeApply();
            //         });
            // }
            //
            // getAllPlayerCreditTransferStatus();
        };

        vm.drawPagedPlatformCreditTransferQueryTable = function (data, size, newSearch) {
            let tableData = data.map(item => {
                item.createTime$ = vm.dateReformat(item.createTime);
                item.typeText = $translate(item.type);
                item.providerText = vm.getProviderText(item.providerId);
                item.lockedAmount$ = item.lockedAmount.toFixed(2);
                return item;
            });
            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                columns: [
                    {title: $translate('CREATE_TIME'), data: 'createTime$'},
                    {title: $translate("TRANSFER") + " ID", data: 'transferId'},
                    {title: $translate('playerName'), data: 'playerName'},
                    {
                        title: $translate("CREDIT"),
                        data: 'amount',
                        render: function (data, type, row) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    {title: $translate("provider"), data: 'providerText'},
                    {
                        title: $translate("amount"),
                        data: 'amount',
                        render: function (data, type, row) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    {title: $translate("LOCKED_CREDIT"), data: 'lockedAmount$'},
                    {title: $translate("TYPE"), data: 'typeText'},
                    {
                        title: $translate("STATUS"),
                        render: function (data, type, row) {
                            return (row.status == 1 ? $translate("SUCCESS") : row.status == 2 ? $translate("FAIL") : $translate("REQUEST"));
                        }
                    }
                ],
                paging: false,
            });

            let table = utilService.createDatatableWithFooter('#platformCreditTransferLogTable', option, {});
            vm.platformCreditTransferLog.pageObj.init({maxCount: size}, newSearch);

            $('#platformCreditTransferLogTable tbody').off('click', "**");
            $('#platformCreditTransferLogTable tbody').on('click', 'tr', function () {
                vm.selectedThisPlayer = false;
                let errorLogObjReady = false;
                if ($(this).hasClass('selected')) {
                    $(this).removeClass('selected');
                    vm.linkedPlayerTransferId = null;
                    $scope.safeApply();
                } else {
                    table.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                    const record = table.row(this).data();

                    var playerTransfer;
                    socketService.$socket($scope.AppSocket, 'getPlayerInfo', {_id: record.playerObjId}, function (reply) {
                        vm.selectedThisPlayer = reply.data;
                        updateShowPlayerCredit();
                    });

                    socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {playerObjId: record.playerObjId}, function (data) {
                        data.data.forEach(function (playerTransLog) {
                            if (playerTransLog._id == record._id) {
                                playerTransfer = playerTransLog
                            }
                        })
                        errorLogObjReady = true;
                        updateShowPlayerCredit();
                    });
                }
                function updateShowPlayerCredit() {
                    if (!errorLogObjReady || !vm.selectedThisPlayer) return;
                    vm.linkedPlayerTransferId = playerTransfer._id;
                    vm.creditChange.finalValidAmount = parseFloat(playerTransfer.amount - playerTransfer.lockedAmount
                        + vm.selectedThisPlayer.validCredit).toFixed(2);
                    vm.creditChange.finalLockedAmount = parseFloat(playerTransfer.lockedAmount).toFixed(2);
                    $scope.safeApply();
                }
            })

            $('#platformCreditTransferLogTable').off('order.dt');
            $('#platformCreditTransferLogTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerCreditChangeLog', vm.getPagedPlayerCreditChangeLog);
            });
            $("#platformCreditTransferLogTable").resize();
            $scope.safeApply();
        };

        vm.prepareRepairTransfer = function () {
            vm.showPlatformRepair = !vm.showPlatformRepair;
            if (vm.showPlatformRepair) {
                vm.creditChange = {
                    finalValidAmount: $translate("Unknown"),
                    finalLockedAmount: $translate("Unknown"),
                    number: 0,
                    remark: ''
                };
            }
        }

        vm.submitRepairTransfer = function () {
            socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {playerObjId: vm.selectedThisPlayer._id}
                , function (pData) {
                    let playerTransfer = {};
                    pData.data.forEach(function (playerTransLog) {
                        if (playerTransLog._id == vm.linkedPlayerTransferId) {
                            playerTransfer = playerTransLog
                        }
                    });

                    let updateAmount = playerTransfer.amount - playerTransfer.lockedAmount;

                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                        data: {
                            playerObjId: playerTransfer.playerObjId,
                            playerName: playerTransfer.playerName,
                            updateAmount: updateAmount < 0 ? 0 : updateAmount,
                            curAmount: vm.selectedThisPlayer.validCredit,
                            realName: vm.selectedThisPlayer.realName,
                            remark: vm.creditChange.remark,
                            adminName: authService.adminName
                        }
                    }
                    if (vm.linkedPlayerTransferId) {
                        sendData.data.transferId = playerTransfer.transferId;
                        //if reward task is still there fix locked amount otherwise fix valid amount
                        if (vm.isOneSelectedPlayer().rewardInfo && vm.isOneSelectedPlayer().rewardInfo.length > 0) {
                            sendData.data.updateLockedAmount = playerTransfer.lockedAmount < 0 ? 0 : playerTransfer.lockedAmount;
                            sendData.data.curLockedAmount = vm.isOneSelectedPlayer().lockedCredit;
                        }
                        else {
                            sendData.data.updateAmount += playerTransfer.lockedAmount < 0 ? 0 : playerTransfer.lockedAmount;
                        }
                        vm.creditChange.socketStr = "createFixPlayerCreditTransferProposal";
                    }

                    console.log('repairTransaction', sendData);
                    socketService.$socket($scope.AppSocket, vm.creditChange.socketStr, sendData, function (data) {
                        var newData = data.data;
                        console.log('credit proposal', newData);
                        if (data.data && data.data.stepInfo) {
                            socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                        }
                        vm.getPlatformPlayersData();
                        $scope.safeApply();
                    });
                });
        };

        vm.triggerAutoProposal = function () {
            socketService.$socket($scope.AppSocket, 'triggerAutoProposal', {platformObjId: vm.selectedPlatform.id}, function (playerCount) {
                console.log('playerCount', playerCount);
            });
        };

        vm.triggerSavePlayersCredit = function () {
            socketService.$socket($scope.AppSocket, 'triggerSavePlayersCredit', {platformObjId: vm.selectedPlatform.id}, function () {
                console.log('triggerSavePlayersCredit: Done');
            });
        };

        /////////////////////////////////Mark::Platform players functions//////////////////

        //get all platform players data from server
        vm.getPlatformPlayersData = function (newSearch) {

            // $('#loadingPlayerTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPlayersCountByPlatform', {platform: vm.selectedPlatform.id}, function (playerCount) {
                vm.platformPlayerCount = playerCount.data;
                console.log('playerCount', playerCount);
            });
            vm.advancedQueryObj = vm.advancedQueryObj || {};
            vm.drawPlayerTable([]);
            vm.advancedPlayerQuery(newSearch);
        };

        let getPlayersByAdvanceQueryDebounced = $scope.debounceSearch(function (playerQuery) {
            // NOTE: If the response is ignoring your field filter and returning all players, please check that the
            // field is whitelisted in buildPlayerQueryString() in encrypt.js
            utilService.hideAllPopoversExcept();
            vm.advancedQueryObj = $.extend({}, vm.advancedQueryObj, playerQuery);
            for (let k in playerQuery) {
                if (!playerQuery[k] || $.isEmptyObject(playerQuery)) {
                    delete vm.advancedQueryObj[k];
                }
            }
            if (playerQuery.playerId) {
                var te = $("#playerTable-search-filters > div").not(":nth-child(1)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
            } else if (playerQuery.name) {
                var te = $("#playerTable-search-filters > div").not(":nth-child(2)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
            } else if (playerQuery.phoneNumber) {
                var te = $("#playerTable-search-filters > div").not(":nth-child(11)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
            } else if (playerQuery.bankAccount) {
                let te = $("#playerTable-search-filters > div").not(":nth-child(12)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
            } else if (playerQuery.email) {
                let te = $("#playerTable-search-filters > div").not(":nth-child(13)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
            } else {
                $("#playerTable-search-filters .form-control").prop("disabled", false).css("background-color", "#fff");
                $("#playerTable-search-filters .form-control input").prop("disabled", false).css("background-color", "#fff");
            }
            if (playerQuery.playerId || playerQuery.name || playerQuery.phoneNumber || playerQuery.bankAccount || playerQuery.email) {
                var sendQuery = {
                    platformId: vm.selectedPlatform.id,
                    query: playerQuery,
                    index: 0,
                    limit: 100
                };
                socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQuery', sendQuery, function (data) {
                    console.log('playerData', data);
                    var size = data.data.size || 0;
                    var result = data.data.data || [];
                    setPlayerTableData(result);
                    utilService.hideAllPopoversExcept();
                    vm.searchPlayerCount = size;
                    vm.playerTableQuery.pageObj.init({maxCount: size}, true);

                    var found = false;
                    if (size == 1) {
                        vm.playerTable.rows(function (idx, rowData, node) {
                            if (rowData._id == result[0]._id) {
                                vm.playerTableRowClick(node, rowData);
                                vm.playerTableRowClicked(rowData);
                                vm.selectedPlayersCount = 1;
                                $(node).addClass('selected');
                                found = true;
                            }
                        })
                    }
                    if (!found) {
                        vm.selectedSinglePlayer = null;
                        vm.selectedPlayersCount = 0;
                    }
                    $scope.safeApply();
                });
            } else {
                vm.advancedPlayerQuery(true);
            }
        });

        vm.advancedPlayerQuery = function (newSearch) {
            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: vm.advancedQueryObj,
                index: newSearch ? 0 : (vm.playerTableQuery.index || 0),
                limit: vm.playerTableQuery.limit,
                sortCol: vm.playerTableQuery.sortCol
            };
            console.log(apiQuery);
            $('#loadingPlayerTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQuery', apiQuery, function (reply) {
                setPlayerTableData(reply.data.data);
                vm.searchPlayerCount = reply.data.size;
                console.log("getPlayersByAdvanceQueryDebounced response", reply);
                utilService.hideAllPopoversExcept();
                vm.playerTableQuery.pageObj.init({maxCount: vm.searchPlayerCount}, newSearch);
                $('#loadingPlayerTableSpin').hide();
                if (vm.selectedSinglePlayer) {
                    var found = false;
                    vm.playerTable.rows(function (idx, rowData, node) {
                        if (rowData._id == vm.selectedSinglePlayer._id) {
                            vm.playerTableRowClick(node, rowData);
                            vm.playerTableRowClicked(rowData);
                            vm.selectedPlayersCount = 1;
                            $(node).addClass('selected');
                            found = true;
                        }
                    })
                    if (!found) {
                        vm.selectedSinglePlayer = null;
                        vm.selectedPlayersCount = 0;
                    }
                }
                $scope.safeApply();
            });
        }
        vm.searchForExactPlayerDebounced = $scope.debounceSearch(function (playerExactSearchText) {
            //console.log("playerExactSearchText", playerExactSearchText);
            if (playerExactSearchText === "") {
                vm.getPlatformPlayersData(true);
                return;
            }
            var apiQuery = {
                platform: vm.selectedPlatform.id,
                name: playerExactSearchText
            };
            socketService.$socket($scope.AppSocket, 'getPlayerInfo', apiQuery, function (reply) {
                var toDisplay = [];
                if (reply.data) {
                    toDisplay.push(reply.data);
                    vm.searchPlayerCount = 1;
                    vm.playerTableQuery.pageObj.init({maxCount: 1}, true);
                } else {
                    vm.searchPlayerCount = 0;
                    vm.playerTableQuery.pageObj.init({maxCount: 0}, true);
                }
                $scope.safeApply();
                setPlayerTableData(toDisplay);
            });
        });

        var setPlayerTableData = function (data) {
            return setTableData(vm.playerTable, data);
        };

        // Clears the table data and shows the provided data instead, without re-creating the table object itself.
        var setTableData = function (table, data) {
            table.clear();
            if (data) {
                data.forEach(function (rowData) {
                    if(rowData.credits){
                        rowData.credits = rowData.credits.toFixed(2);
                    }
                    if (rowData.registrationTime) {
                        rowData.registrationTime = utilService.getFormatTime(rowData.registrationTime);
                    }
                    if (rowData.lastAccessTime) {
                        rowData.lastAccessTime = utilService.getFormatTime(rowData.lastAccessTime)
                    }
                    table.row.add(rowData);
                });
            }
            table.draw();
        };

        // Multiply by this to convert hours to seconds
        var hours = 60 * 60;

        //draw player table based on data
        vm.drawPlayerTable = function (data) {
            vm.players = data;
            vm.selectedPlayers = {};
            vm.selectedPlayersCount = 0;
            // jQuery.fn.dataTableExt.oSort["Credit-desc"] = function (x, y) {
            //     var a = $(x).first().text();
            //     var b = $(y).first().text();
            //     // console.log('parsing', parseInt(a), parseInt(b));
            //     return parseInt(a) - parseInt(b);
            // };
            //
            // jQuery.fn.dataTableExt.oSort["Credit-asc"] = function (x, y) {
            //     return jQuery.fn.dataTableExt.oSort["Credit-desc"](y, x);
            // };

            var tableOptions = {
                data: data,
                columnDefs: [
                    {targets: '_all', defaultContent: ' '}
                ],
                "order": vm.playerTableQuery.aaSorting || [[7, 'desc']],
                columns: [
                    {title: $translate('PLAYER_ID'), data: "playerId", advSearch: true},
                    {
                        title: $translate('PLAYERNAME'), data: "name", advSearch: true, "sClass": "",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.showPlayerInfoModal("' + data + '")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('STATUS'), data: 'status',
                        render: function (data, type, row) {
                            var showText = $translate(vm.allPlayersStatusKeys[data - 1]) || 'No Value';
                            var textClass = '';
                            if (data == 4) {
                                textClass = "text-black";
                            } else if (data == 5) {
                                textClass = "text-danger";
                            }else if(data === 6){
                                textClass = "text-warning";
                            }

                            return $('<a class="statusPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                                'data-placement="right" data-trigger="focus" type="button" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text(showText)
                                .addClass(textClass)
                                .prop('outerHTML');
                        },
                        advSearch: true,
                        filterConfig: {
                            type: "dropdown",
                            options: vm.allPlayersStatusKeys.map(function (status) {
                                return {
                                    value: vm.allPlayersStatusString[status],
                                    text: $translate(status)
                                };
                            })
                        },
                        "sClass": ""
                    },
                    {
                        title: $translate('REAL_NAME'),
                        data: 'realName',
                        sClass: "wordWrap realNameCell",
                        advSearch: true
                    },
                    {
                        title: $translate('VALID_CREDIT'),
                        "visible": false,
                        data: 'validCredit',
                        orderable: false,
                        advSearch: true,
                        filterConfig: {
                            type: "dropdown",
                            options: [
                                //{ value:      "<0", text: '<0'       },
                                {value: "0-10", text: '0-10'},
                                {value: "10-100", text: '10-100'},
                                {value: "100-500", text: '100-500'},
                                {value: ">500", text: '>500'}
                            ]
                        },
                        render: function (data, type, row) {
                            return $('<a class="playerCreditPopover" href="" ng-click="vm.creditChangeLogPlayerName = \'' + row.name + '\'; " ' +
                                'data-toggle="popover" data-trigger="focus" data-placement="bottom" data-container="body" ></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text(data)
                                .prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('CREDIT'),
                        data: 'validCredit',
                        sType: 'Credit',
                        orderable: true,
                        bSortable: true,
                        render: function (data, type, row) {
                            if (type == 'sort') return row.validCredit;
                            data = data || 0;
                            var link = $('<div>', {
                                'data-order': row.validCredit,
                            })
                                .append($('<i class="fa fa-usd"></i>'))
                                .append(
                                    $('<text>', {
                                        'data-row': JSON.stringify(row),
                                    }).text(row.validCredit.toFixed(2))
                                )
                                .append($('<span>').html('&nbsp;&nbsp;&nbsp;'));

                            //if (data != 0) {
                            if (row.rewardInfo && row.rewardInfo.length > 0) {
                                link.append($('<i class="fa fa-lock"></i>'))
                                    .append(
                                        $('<a>', {
                                            'class': 'rewardTaskPopover',
                                            'ng-click': 'vm.rewardTaskPlayerName = "' + row.name + '";', // @todo: escaping issue
                                            'data-row': JSON.stringify(row),
                                            'href': '',
                                            'data-toggle': 'popover',
                                            'data-trigger': 'focus',
                                            'data-placement': 'bottom',
                                            'data-container': 'body'
                                        }).text(row.lockedCredit.toFixed(2))
                                    )
                                    .append($('<span>').html('&nbsp;&nbsp;&nbsp;'));
                            }

                            //}
                            link.append(
                                $('<a>', {
                                    'class': 'fa fa-gamepad',
                                    'ng-click': 'vm.showPlayerCreditinProvider(' + JSON.stringify(row) + ')', // @todo: escaping issue
                                    'data-row': JSON.stringify(row),
                                    'href': '',
                                    'data-toggle': 'popover',
                                    'data-trigger': 'manual',
                                    'data-placement': 'bottom',
                                    'data-container': 'body'
                                })
                            );
                            return link.prop('outerHTML');
                            //return '<a href="" ng-click="vm.rewardTaskPlayerName = \'' + row.name + '\'; vm.getRewardTask(\'' + row._id + '\')" data-toggle="modal" data-target="#modalRewardTask">' + data + '</a>';
                        },
                        "sClass": "alignLeft"
                    },
                    // {
                    //     title: $translate('TELPHONE'), data: 'phoneNumber',
                    //     render: function (data, type, row) {
                    //         data = data || '';
                    //         return $('<a class="telPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                    //             'data-placement="right" data-trigger="focus" type="button" data-html="true" href="#"></a>')
                    //             .attr('data-row', JSON.stringify(row))
                    //             .text(data)
                    //             .prop('outerHTML');
                    //     },
                    //     advSearch: true,
                    //     "sClass": "alignLeft"
                    // },
                    {
                        title: $translate('LEVEL'), "data": 'playerLevel',
                        render: function (data, type, row) {
                            data = data || '';
                            return $('<a class="levelPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                                'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text($translate(data.name))
                                .prop('outerHTML');
                        },
                        advSearch: true,
                        filterConfig: {
                            type: "dropdown",
                            options: vm.allPlayerLvl.map(function (level) {
                                return {
                                    value: level._id,
                                    text: $translate(level.name)
                                };
                            })
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('REGISTRATION_TIME'),
                        data: 'registrationTime',
                        advSearch: true,
                        filterConfig: {
                            type: "datetimepicker",
                            id: "regDateTimePicker",
                            options: {
                                language: 'en',
                                format: 'dd/MM/yyyy hh:mm:ss',
                            }
                        },
                        "sClass": "alignLeft",
                        render: function (data, type, row) {
                            return utilService.getFormatTime(data);
                        }
                    },
                    {
                        "visible": false,
                        title: $translate('REGISTRATION_TIME_END'),
                        data: 'registrationEndTime',
                        advSearch: true,
                        filterConfig: {
                            type: "datetimepicker",
                            id: "regEndDateTimePicker",
                            options: {
                                language: 'en',
                                format: 'dd/MM/yyyy hh:mm:ss',
                            }
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('LAST_ACCESS_TIME'),
                        data: 'lastAccessTime',
                        advSearch: true,
                        type: "datetimepicker",
                        filterConfig: {
                            type: "datetimepicker",
                            id: "lastAccessDateTimePicker",
                            options: {
                                language: 'en',
                                format: 'dd/MM/yyyy hh:mm:ss',
                            }
                        },
                        "sClass": "alignLeft",
                        render: function (data, type, row) {
                            return utilService.getFormatTime(data);
                        }
                    },
                    {
                        "visible": false,
                        title: $translate('LAST_ACCESS_TIME_END'),
                        data: 'lastAccessEndTime',
                        advSearch: true,
                        type: "datetimepicker",
                        filterConfig: {
                            type: "datetimepicker",
                            id: "lastAccessEndDateTimePicker",
                            options: {
                                language: 'en',
                                format: 'dd/MM/yyyy hh:mm:ss',
                            }
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('Function'), //data: 'phoneNumber',
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || '';

                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'class': 'fa fa-envelope margin-right-5',
                                'ng-click': 'vm.sendMessageToPlayerBtn(' + '"msg", ' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("SEND_MESSAGE_TO_PLAYER"),
                                'data-placement': 'left',   // because top and bottom got hidden behind the table edges
                            }));
                            link.append($('<a>', {
                                'class': 'fa fa-comment margin-right-5',
                                'ng-click': 'vm.telorMessageToPlayerBtn(' + '"msg", ' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("Send SMS to Player"),
                                'data-placement': 'left',
                            }));
                            link.append($('<a>', {
                                'class': 'fa fa-volume-control-phone',
                                'ng-click': 'vm.telorMessageToPlayerBtn(' + '"tel", ' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("PHONE"),
                                'data-placement': 'right',
                            }));
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('PERMISSION'), //data: 'phoneNumber',
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || {permission: {}};

                            var link = $('<a>', {
                                'class': 'playerPermissionPopover',
                                'ng-click': "vm.permissionPlayer = " + JSON.stringify(row), // @todo: escaping issue
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'popover',
                                'data-trigger': 'focus',
                                'data-placement': 'bottom',
                                'data-container': 'body',
                            });
                            var perm = (row && row.permission) ? row.permission : {};
                            link.append($('<i>', {
                                'class': 'fa fa-gift margin-right-5 ' + (perm.applyBonus === true ? "text-primary" : "text-danger"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-tint margin-right-5 ' + (perm.advanceConsumptionReward === true ? "text-primary" : "text-danger"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-share-square margin-right-5 ' + (perm.transactionReward === true ? "text-primary" : "text-danger"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-pencil-square margin-right-5 ' + (perm.topupOnline === true ? "text-primary" : "text-danger"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-folder-open margin-right-5 ' + (perm.topupManual === true ? "text-primary" : "text-danger"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-ban margin-right-5 ' + (perm.banReward === true ? "text-danger" : "text-primary"),
                            }));
                            link.append($('<img>', {
                                'class': 'margin-right-5',
                                'src': "images/icon/" + (perm.alipayTransaction === true ? "aliPayBlue.png" : "aliPayRed.png"),
                                height: "15px",
                                width: "15px",
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-comments margin-right-5 ' + (perm.disableWechatPay === true ? "text-danger" : "text-primary"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-repeat margin-right-5 ' + (perm.forbidPlayerConsumptionReturn === true ? "text-danger" : "text-primary"),
                            }));
                            link.append($('<i>', {
                                'class': 'fa fa-ambulance margin-right-5 ' + (perm.forbidPlayerConsumptionIncentive === true ? "text-danger" : "text-primary"),
                            }));
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: "<div>" + $translate('TOP_UP') + "</div><div>" + $translate('TIMES') + "</div>",
                        "data": 'topUpTimes',
                        "sClass": "alignRight",
                        // render: function (data, type, row) {
                        //     var link = $('<text>', {
                        //         'ng-click': "vm.showPlayerTopupModal(" + JSON.stringify(row) + ")",
                        //     }).text(data);
                        //     return link.prop('outerHTML');
                        // },
                    },
                    {
                        title: "<div>" + $translate('FEEDBACK') + "</div><div>" + $translate('TIMES') + "</div>",
                        data: 'feedbackTimes',
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'class': "playerFeedbackPopover",
                                'style': "z-index: auto",
                                'data-toggle': "popover",
                                'data-container': "body",
                                'data-placement': "bottom",
                                'data-trigge': "focus",
                                'data-row': JSON.stringify(row),
                            }).text(data);
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignRight"
                    },
                    {title: $translate('PHONENUMBER'), data: "phoneNumber", advSearch: true, visible: false,},
                    {title: $translate("BANK_ACCOUNT"), visible: false, data: "bankAccount", advSearch: true},
                    {title: $translate("EMAIL"), visible: false, data: "email", advSearch: true},
                    {title: $translate("LOGIN_IP"), visible: false, data: "loginIps", advSearch: true},
                    // {
                    //     visible: false,
                    //     title: $translate('PLAYER_TYPE'),
                    //     advSearch: true,
                    //     filterConfig: {
                    //         type: "dropdown",
                    //         options: [
                    //             {value: "TEST", text: $translate('Test')},
                    //             {value: "REAL", text: $translate('Real')}
                    //         ],
                    //         writeOwnQueryParameters: function (value, queryValues) {
                    //             if (value === "TEST") {
                    //                 delete queryValues.isRealPlayer;
                    //                 queryValues.isTestPlayer = true;
                    //             } else if (value === "REAL") {
                    //                 delete queryValues.isTestPlayer;
                    //                 queryValues.isRealPlayer = true;
                    //             } else {
                    //                 // "any"
                    //                 delete queryValues.isTestPlayer;
                    //                 delete queryValues.isRealPlayer;
                    //             }
                    //         }
                    //     }
                    // },
                ],
                //"autoWidth": false,
                "scrollX": true,
                "deferRender": true,
                "bDeferRender": true,
                "bProcessing": true,
                // "scrollY": "384px",
                // "scrollCollapse": false,
                "destroy": true,
                "paging": false,
                //"dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": $translate("Display _MAX_ players"),
                    "emptyTable": $translate("No data available in table"),
                },
                //dom: 'Zrtlip',
                // dom: "Z<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-4'l><'col-sm-4'i><'col-sm-4'p>>",
                dom: "Z<'row'<'col-sm-12'tr>>",
                fnRowCallback: vm.playerTableRowClick,
                fnDrawCallback: function (oSettings) {
                    var container = oSettings.nTable;

                    $(container).find('[title]').tooltip();

                    utilService.setupPopover({
                        context: container,
                        elem: '.rewardTaskPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);
                            vm.getRewardTaskDetail(row._id, function (data) {
                                showPopover(that, '#rewardTaskPopover', data);
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.playerFeedbackPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);
                            vm.getPlayer5Feedback(row._id, function (data) {
                                showPopover(that, '#playerFeedbackPopover', data);
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.levelPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.levelPlayer = data;
                            // Optional: If the player lost his level for any reason, set him to the first level, instead of crashing.
                            if (!vm.levelPlayer.playerLevel) {
                                vm.levelPlayer.playerLevel = vm.allPlayerLvl[0];
                            }
                            var curLevel = vm.levelPlayer.playerLevel.value;
                            vm.nextPlayerLevelData = '';
                            $.each(vm.allPlayerLvl, function (i, v) {
                                console.log(i, v);
                                if (v.value == curLevel + 1) {
                                    vm.nextPlayerLevelData = v;
                                    return true;
                                }
                            })
                            if (!vm.nextPlayerLevelData) {
                            }
                            console.log('vm.playerLvlData', vm.playerLvlData);
                            $scope.safeApply();

                            return $('#levelPopover').html();
                        },
                        callback: function () {
                            //todo::this will need to change now that there are multiple conditions to reach the next level
                            var topupPercentString = String((vm.levelPlayer.curLevelTopUpSum / vm.nextPlayerLevelData.topupLimit * 100).toFixed(1)) + "%";
                            var consumPercentString = String((vm.levelPlayer.curLevelConsumptionSum / vm.nextPlayerLevelData.consumptionLimit * 100).toFixed(1)) + "%";
                            console.log('string', topupPercentString, consumPercentString);
                            $(".topupPlayer .progress-bar").text(topupPercentString).animate({
                                width: topupPercentString
                            }, 1000);
                            $(".consumptionPlayer .progress-bar").text(consumPercentString).animate({
                                width: consumPercentString
                            }, 1000);
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.telPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.telphonePlayer = data;
                            $scope.safeApply();
                            return $('#telPopover').html();
                        },
                        callback: function () {
                            $("button.playerMessage").on('click', function () {
                                console.log('message', this);
                                //alert("will send message to " + vm.telphonePlayer.name);
                                // showMessagePlayerModalFor(vm.telephonePlayer);

                            });
                            $("button.playerTelephone").on('click', function () {
                                alert("will call " + vm.telphonePlayer.name);
                            });
                        }
                    });

                    function showMessagePlayerModalFor(player) {
                        var $modalScope = $scope.$new(true);
                        $('#messagePlayerModal').modal('show');
                    }

                    vm.sendMessageToPlayer = function () {
                        // Currently we are passing the adminId from the client side, but we should really pick it up on the server side.
                        var sendData = {
                            //adminId: authService.adminId,
                            adminName: authService.adminName,
                            platformId: vm.selectedPlatform.id,
                            playerId: vm.telphonePlayer._id,
                            title: vm.messageForPlayer.title,
                            content: vm.messageForPlayer.content
                        };
                        $scope.$socketPromise('sendPlayerMailFromAdminToPlayer', sendData).then(function () {
                            // We could show a confirmation message, but currently showConfirmMessage() is doing that for us.
                        }).done();
                    };

                    utilService.setupPopover({
                        context: container,
                        elem: '.statusPopover',
                        content: function () {
                            //console.log('this', this);
                            vm.playerStatusHistory = null;
                            var data = JSON.parse(this.dataset.row);
                            vm.statusPopover = data;
                            $scope.safeApply();
                            $('.playerStatusConfirmation').hide();
                            return $compile($('#statusPopover').html())($scope);
                        },
                        callback: function () {
                            // Problem with compiling here, if we click from one popover directly to open another one,
                            // then callback + compile gets called on the old popover (again), but Bootstrap actually
                            // displays a fresh non-bound popover!
                            var data = JSON.parse(this.dataset.row);
                            var thisPopover = utilService.$getPopoverID(this);
                            if (data.status == '2') { // 2 means "ForbidGame"
                                $(thisPopover).find('.showGames').show();
                            }
                            //var rowData = {};
                            // var status = '';
                            var rowData = JSON.parse(this.dataset.row);
                            var status = rowData.status;

                            $scope.safeApply();
                            $("button.playerStatusHistory").on('click', function () {
                                Q.all(vm.getPlayerStatusChangeLog(vm.statusPopover))
                                    .then(function (data) {
                                        console.log('vm.playerStatusHistory', vm.playerStatusHistory);
                                    }, function (error) {
                                    })
                                    .done()
                            });
                            $("button.playerStatusConfirm").on('click', function () {
                                if ($(this).hasClass('disabled')) {
                                    return;
                                }
                                var reason = $(thisPopover).find('.playerStatusChangeReason').val();
                                var forbidProviderList = $(thisPopover).find('.playerStatusProviderForbid');
                                var forbidProviders = [];
                                $.each(forbidProviderList, function (i, v) {
                                    if ($(v).prop('checked')) {
                                        forbidProviders.push($(v).attr('data-provider'));
                                    }
                                })
                                var sendData = {
                                    _id: rowData._id,
                                    status: status,
                                    reason: reason,
                                    forbidProviders: forbidProviders,
                                    adminName: authService.adminName
                                }
                                vm.updatePlayerStatus(rowData, sendData);
                                $('.playerStatusConfirmation').hide();
                                $(".statusPopover").popover('hide');
                            });
                            $("textarea.playerStatusChangeReason").keyup(function () {
                                var reason = $(thisPopover).find('.playerStatusChangeReason').val();
                                if (reason) {
                                    $(thisPopover).find('.playerStatusConfirm').removeClass('disabled');
                                } else {
                                    $(thisPopover).find('.playerStatusConfirm').addClass('disabled');
                                }
                            });

                            $("button.playerStatusCancel").on('click', function () {
                                $('.playerStatusConfirmation').hide();
                                $(".statusPopover").popover('hide');
                            });

                            $('.playerStatusProviderForbid').change(function () {
                                $('.playerStatusConfirmation').show();
                            });
                            $("input.playerStatusChange").on('click', function () {
                                rowData = JSON.parse(this.dataset.row);
                                status = this.dataset.status;
                                console.log('this:playerStatusChange:onClick', rowData, status);
                                var toSHow = $(thisPopover).find('.showGames');
                                if (status == '2') { // 2 means "ForbidGame"
                                    $(toSHow).show();
                                } else {
                                    $(toSHow).hide();
                                }
                                $scope.safeApply();

                                console.log($('.playerStatusConfirmation'));
                                $('.playerStatusConfirmation').show();
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.playerPermissionPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);
                            vm.playerPermissionTypes = {
                                applyBonus: {imgType: 'i', iconClass: "fa fa-gift"},
                                advanceConsumptionReward: {imgType: 'i', iconClass: "fa fa-tint"},
                                transactionReward: {imgType: 'i', iconClass: "fa fa-share-square"},
                                topupOnline: {imgType: 'i', iconClass: "fa fa-pencil-square"},
                                topupManual: {imgType: 'i', iconClass: "fa fa-folder-open"},
                                banReward: {imgType: 'i', iconClass: "fa fa-ban"},
                                alipayTransaction: {imgType: 'img', src: "images/icon/aliPayBlue.png"},
                                disableWechatPay: {imgType: 'i', iconClass: "fa fa-comments"},
                                forbidPlayerConsumptionReturn: {imgType: 'i', iconClass: "fa fa-repeat"},
                                forbidPlayerConsumptionIncentive: {imgType: 'i', iconClass: "fa fa-ambulance"}
                            };
                            $("#playerPermissionTable td").removeClass('hide');
                            $.each(vm.playerPermissionTypes, function (key, v) {
                                if (row.permission && row.permission[key]) {
                                    $("#playerPermissionTable .permitOff." + key).addClass('hide');
                                } else {
                                    $("#playerPermissionTable .permitOn." + key).addClass('hide');
                                }
                            });
                            $scope.safeApply();
                            showPopover(that, '#playerPermissionPopover', row);
                        },
                        callback: function () {
                            var changeObj = {}
                            var thisPopover = utilService.$getPopoverID(this);
                            var $remark = $(thisPopover + ' .permissionRemark');
                            var $submit = $(thisPopover + ' .submit');
                            $submit.prop('disabled', true);
                            $(thisPopover + " .togglePlayer").on('click', function () {
                                var key = $(this).data("which");
                                var select = $(this).data("on");
                                changeObj[key] = !select;
                                $(thisPopover + ' .' + key).toggleClass('hide');
                                $submit.prop('disabled', $remark.val() == '');
                            })

                            $remark.on('input selectionchange propertychange', function () {
                                $submit.prop('disabled', this.value.length === 0 || changeObj == {})
                            })
                            $submit.on('click', function () {
                                $submit.off('click');
                                $(thisPopover + " .togglePlayer").off('click');
                                $remark.off('input selectionchange propertychange');
                                socketService.$socket($scope.AppSocket, 'updatePlayerPermission', {
                                    query: {
                                        platform: vm.permissionPlayer.platform,
                                        _id: vm.permissionPlayer._id
                                    },
                                    admin: authService.adminId,
                                    permission: changeObj,
                                    remark: $remark.val()
                                }, function (data) {
                                    vm.getPlatformPlayersData();
                                }, null, true);
                                $(thisPopover).popover('hide');
                            })

                        }
                    });

                    //
                    // $('#playerDataTable').resize();
                    // $('#playerDataTable').resize();
                }
            }
            // $.each(tableOptions.columns, function (i, v) {
            //     v.defaultContent = "";
            // });
            vm.playerTable = $('#playerDataTable').DataTable(tableOptions);


            // $('#playerDataTable').DataTable(tableOptions);

            // vm.playerTable.columns.adjust().draw();
            utilService.setDataTablePageInput('playerDataTable', vm.playerTable, $translate);

            if (!vm.playersQueryCreated) {
                createPlayerAdvancedSearchFilters({
                    tableOptions: tableOptions,
                    filtersElement: '#playerTable-search-filters',
                    queryFunction: getPlayersByAdvanceQueryDebounced
                });
            }

            $scope.safeApply();
        };
        function createPlayerAdvancedSearchFilters(config) {
            vm.playersQueryCreated = true;
            var currentQueryValues = {};
            $(config.filtersElement).empty();
            function getRegTimeQueryValue(src) {
                var startValue = $('#regDateTimePicker').data('datetimepicker').getLocalDate();
                var endValue = $('#regEndDateTimePicker').data('datetimepicker').getLocalDate();
                var queryValue = {};
                if ($('#regDateTimePicker input').val()) {
                    queryValue["$gte"] = startValue;
                }
                if ($('#regEndDateTimePicker input').val()) {
                    queryValue["$lt"] = endValue;
                }
                return $.isEmptyObject(queryValue) ? null : queryValue;
            }

            function getAccessTimeQueryValue(src) {
                var startValue = $('#lastAccessDateTimePicker').data('datetimepicker').getLocalDate();
                var endValue = $('#lastAccessEndDateTimePicker').data('datetimepicker').getLocalDate();
                var queryValue = {};
                if ($('#lastAccessDateTimePicker input').val()) {
                    queryValue["$gte"] = startValue;
                }
                if ($('#lastAccessEndDateTimePicker input').val()) {
                    queryValue["$lt"] = endValue;
                }
                return $.isEmptyObject(queryValue) ? null : queryValue;
            }

            config.tableOptions.columns.forEach(function (columnConfig, i) {
                var shouldBeSearchable = columnConfig.advSearch;
                if (shouldBeSearchable) {
                    var fieldName = columnConfig.data;

                    // Add the search filter textbox for this field
                    var label = $('<label class="control-label">').text(columnConfig.title);

                    var filterConfig = columnConfig.filterConfig;

                    var input = getFilterInputForColumn(filterConfig).addClass('form-control');
                    // console.log("input", input);

                    if (columnConfig.filterConfig &&
                        columnConfig.filterConfig.hasOwnProperty('type') &&
                        columnConfig.filterConfig.type === 'datetimepicker') {
                        console.log("columnConfig.filterConfig.id", columnConfig.filterConfig.id);
                        var newFilter = $('<div class="search-filter col-xs-12 col-sm-6 col-md-3">')
                            .append(label).append(input);
                    }
                    else {
                        var newFilter = $('<div class="search-filter col-xs-12 col-sm-6 col-md-3">')
                            .append(label).append(input);
                    }
                    $(config.filtersElement).append(newFilter);

                    // Listen for user editing the textbox, and pass the search to datatable
                    //var ptCol = vm.playerTable.columns(i);

                    var regStartTime = '';
                    var regEndTime = '';
                    var lastAccessStartTime = '';
                    var lastAccessEndTime = '';

                    if (fieldName == "registrationTime") {
                        $('#regDateTimePicker').datetimepicker().off('changeDate');
                        $('#regDateTimePicker').datetimepicker().on('changeDate', function (ev) {
                            getQueryFunction(config, filterConfig, 'registrationTime', getRegTimeQueryValue(), true);

                        });
                    }

                    if (fieldName == "registrationEndTime") {
                        $('#regEndDateTimePicker').datetimepicker().off('changeDate');
                        $('#regEndDateTimePicker').datetimepicker().on('changeDate', function (ev) {
                            getQueryFunction(config, filterConfig, 'registrationTime', getRegTimeQueryValue(), true);

                        });
                    }
                    if (fieldName == "lastAccessTime") {
                        $('#lastAccessDateTimePicker').datetimepicker().off('changeDate');
                        $('#lastAccessDateTimePicker').datetimepicker().on('changeDate', function (ev) {
                            getQueryFunction(config, filterConfig, 'lastAccessTime', getAccessTimeQueryValue(), true);

                        });
                    }

                    if (fieldName == "lastAccessEndTime") {
                        $('#lastAccessEndDateTimePicker').datetimepicker().off('changeDate');
                        $('#lastAccessEndDateTimePicker').datetimepicker().on('changeDate', function (ev) {
                            getQueryFunction(config, filterConfig, 'lastAccessTime', getAccessTimeQueryValue(), true);
                        });
                    }

                    input.on('keyup change', (function (evt) {
                        //Text inputs do not fire the change event until they lose focus.
                        if (evt.currentTarget.tagName == "INPUT" && evt.type == 'change')return;
                        var queryValue = '';
                        // Do Additional listening to the keyup event of datetime picker by the className of the div
                        if (this.className == 'datetimepicker form-control') {
                            // assign the value of input (firstchild of the div) to queryValue
                            if (evt.currentTarget.id == "regDateTimePicker" || evt.currentTarget.id == "regEndDateTimePicker") {
                                queryValue = getRegTimeQueryValue();
                                getQueryFunction(config, filterConfig, "registrationTime", queryValue, false);
                            } else if (evt.currentTarget.id == "lastAccessDateTimePicker" || evt.currentTarget.id == "lastAccessEndDateTimePicker") {
                                queryValue = getAccessTimeQueryValue();
                                getQueryFunction(config, filterConfig, "lastAccessTime", queryValue, false);
                            }
                        }
                        else {
                            queryValue = this.value;
                            getQueryFunction(config, filterConfig, fieldName, queryValue, false);
                        }
                    }));
                }
            });
            var btn = $('<button>', {
                id: "resetPlayerQuery",
                class: "btn btn-primary common-button-sm",
                style: "display:block;",
            }).text($translate('Reset'));
            var newFilter = $('<div class="search-filter col-md-3">').append($('<label class="control-label">')).append(btn);
            $(config.filtersElement).append(newFilter);
            utilService.actionAfterLoaded('#resetPlayerQuery', function () {
                $('#resetPlayerQuery').off('click');
                $('#resetPlayerQuery').click(function () {
                    $('#playerTable-search-filters').find(".form-control").each((i, v) => {
                        $(v).val(null);
                        utilService.clearDatePickerDate(v)
                    })
                    getPlayersByAdvanceQueryDebounced(function ({}) {
                    });
                    vm.advancedQueryObj = {};
                    vm.advancedPlayerQuery(true);
                })
            })
        }

        function createAdvancedSearchFilters(config) {

            var currentQueryValues = {};
            $(config.filtersElement).empty();
            config.tableOptions.columns.forEach(function (columnConfig, i) {
                var shouldBeSearchable = columnConfig.advSearch;
                if (shouldBeSearchable) {
                    var fieldName = columnConfig.data;

                    // Add the search filter textbox for this field
                    var label = $('<label class="control-label">').text(columnConfig.title);
                    var filterConfig = columnConfig.filterConfig;
                    var input = getFilterInputForColumn(filterConfig).addClass('form-control');
                    var newFilter = $('<div class="search-filter col-xs-12 col-sm-6 col-md-3">')
                        .append(label).append(input);
                    $(config.filtersElement).append(newFilter);

                    // Listen for user editing the textbox, and pass the search to datatable
                    //var ptCol = vm.playerTable.columns(i);
                    input.on('keyup change', (function (evt) {
                        var queryValue = this.value;
                        getQueryFunction(config, filterConfig, fieldName, queryValue, false);
                    }));
                }
            });
        };

        function getQueryFunction(config, filterConfig, fieldName, queryValue, isDateTimePicker) {

            var currentQueryValues = {};
            if (isDateTimePicker) {
                currentQueryValues[fieldName] = queryValue;
                config.queryFunction(currentQueryValues);
            }
            if (filterConfig && typeof filterConfig.convertValueForQuery === 'function') {
                queryValue = filterConfig.convertValueForQuery(queryValue);
            }
            if (filterConfig && typeof filterConfig.writeOwnQueryParameters === 'function') {
                filterConfig.writeOwnQueryParameters(queryValue, currentQueryValues);
                // In this case we skip the optimization below, and always perform a query
                config.queryFunction(currentQueryValues);
            }
            else {
                if (currentQueryValues[fieldName] !== queryValue) {

                    currentQueryValues[fieldName] = queryValue;
                    config.queryFunction(currentQueryValues);
                }
            }
        };

        function getFilterInputForColumn(filterConfig) {
            if (filterConfig && filterConfig.type === 'dropdown') {
                var select = $('<select>');
                var options = filterConfig.options.slice(0);
                options.unshift({value: "", html: '&mdash;'});
                options.forEach(function (option) {
                    $('<option>', option).appendTo(select);
                });
                return select;
            }

            // do something here if datetimepicker
            if (filterConfig && filterConfig.type === 'datetimepicker') {

                var input = $('<input type="text",style="width:76%,border:0;", data-format="dd/MM/yyyy hh:mm:ss",class="input-append playerDate">');
                var icon = $('<i>', {
                    'data-date-icon': 'fa fa-calendar',
                    'data-time-icon': 'fa fa-clock-o',
                    'class': 'fa-calendar fa'
                });
                var span = $('<span>', {'class': 'add-on'}).append(icon);
                var div = $('<div id=' + filterConfig.id + ' class="datetimepicker">').append(input).append(span);
                return div;
            }
            else {
                return $('<input type="text">');
            }
        }

        vm.playerTableRowClick = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            //MARK!!!
            $compile(nRow)($scope);

            //set player color according to status
            var status = aData.status;
            var cellColor = '';
            var statusKey = '';
            $.each(vm.allPlayersStatusString, function (key, val) {
                if (status == val) {
                    statusKey = key;
                    return true;
                }
            })
            var colorObj = {
                NORMAL: '#337ab7',
                FORBID: 'red',
                FORBID_GAME: 'orange'
            }
            $(nRow).find('td:contains(' + $translate(statusKey) + ')').each(function (i, v) {
                $(v).find('a').eq(0).css('color', colorObj[statusKey]);
            })

            // Row click
            $(nRow).off('click');
            $(nRow).on('click', function () {
                $('#playerDataTable tbody tr').removeClass('selected');
                $(this).toggleClass('selected');
                vm.selectedPlayersCount = 1;
                vm.playerTableRowClicked(aData);
                vm.playerTableClickedRow = vm.playerTable.row(this);
            });
        };

        vm.getEncPhoneNumber = function (playerData) {
            return (playerData && playerData.phoneNumber) ? (playerData.phoneNumber.substring(0, 3) + "******" + playerData.phoneNumber.slice(-4)) : ''
        }
        vm.showPlayerInfoModal = function (playerName) {
            vm.similarPlayersForPlayer = null;
            var watch = $scope.$watch(function () {
                return vm.selectedSinglePlayer
            }, function (newV, oldV) {
                if (newV && newV.name == playerName) {
                    // console.log('newV', newV, oldV);
                    watch();
                    var nowDate = new Date();
                    var playerConsumptionQuery = {
                        startDate: new Date().setDate(nowDate.getDate() - 20),
                        endDate: nowDate,
                        playerId: newV._id,
                        platformId: newV.platform
                    }
                    console.log('playerConsumptionQuery', playerConsumptionQuery);

                    vm.showReferralName = '';
                    socketService.$socket($scope.AppSocket, 'getSimilarPlayers', {
                        playerId: vm.selectedSinglePlayer._id
                    }, function (data) {
                        if (data && data.data.playerId == vm.selectedSinglePlayer.playerId) {
                            let preDistinctCheckData = data.data.similarData;
                            let distinctData = [];
                            for (let i = 0; i < preDistinctCheckData.length; i++) {
                                let duplicate = false;
                                for (let j = 0; j < distinctData.length; j++) {
                                    if (distinctData[j].field === preDistinctCheckData[i].field && JSON.stringify(distinctData[j].playerObjId) === JSON.stringify(preDistinctCheckData[i].playerObjId)) {
                                        duplicate = true;
                                        break;
                                    }
                                }
                                if (duplicate === false) {
                                    distinctData.push(preDistinctCheckData[i]);
                                }
                            }
                            vm.similarPlayersForPlayer = distinctData;
                            console.log("similarPlayers", vm.similarPlayersForPlayer);
                        }
                        $scope.safeApply();
                        vm.updateDataTableinModal('#modalPlayerInfo', '#similarPlayersTable');
                    });
                    if (vm.selectedSinglePlayer.partner) {
                        if (vm.selectedSinglePlayer.partner.partnerName) {
                            vm.selectedSinglePlayer.partnerName = vm.selectedSinglePlayer.partner.partnerName;
                        } else {
                            socketService.$socket($scope.AppSocket, 'getPartner', {_id: vm.selectedSinglePlayer.partner}, function (data) {
                                vm.selectedSinglePlayer.partnerName = data.data.partnerName;
                                $scope.safeApply();
                            })
                        }
                    }
                    if (vm.selectedSinglePlayer.referral) {
                        socketService.$socket($scope.AppSocket, 'getPlayerInfo', {_id: vm.selectedSinglePlayer.referral}, function (data) {
                            vm.showReferralName = data.data.name;
                            $scope.safeApply();
                        });
                    }
                    vm.processDataTableinModal('#modalPlayerInfo', '#similarPlayersTable');
                    vm.showProvinceStr = '';
                    vm.showCityStr = '';
                    vm.showDistrictStr = '';
                    $scope.getProvinceStr(vm.selectedSinglePlayer.bankAccountProvince).then(data => {
                        vm.showProvinceStr = data.data.province ? data.data.province.name : vm.selectedSinglePlayer.bankAccountProvince;
                        $scope.safeApply();
                    }, err => {
                        vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountProvince || $translate("Unknown");
                        $scope.safeApply();
                    });
                    $scope.getCityStr(vm.selectedSinglePlayer.bankAccountCity).then(data => {
                        vm.showCityStr = data.data.city ? data.data.city.name : vm.selectedSinglePlayer.bankAccountCity;
                        $scope.safeApply();
                    }, err => {
                        vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountCity || $translate("Unknown");
                        $scope.safeApply();
                    });
                    $scope.getDistrictStr(vm.selectedSinglePlayer.bankAccountDistrict).then(data => {
                        vm.showDistrictStr = data.data.district ? data.data.district.name : vm.selectedSinglePlayer.bankAccountDistrict;
                        $scope.safeApply();
                    }, err => {
                        vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountDistrict || $translate("Unknown");
                        $scope.safeApply();
                    });

                }
            });
            $scope.safeApply();
        };

        vm.showPartnerIPHistory = function () {
            socketService.$socket($scope.AppSocket, 'getPartnerIPHistory', {
                partnerId: vm.selectedSinglePartner._id
            }, function (data) {

                vm.partnerIpHistoryData = data.data;
                vm.partnerIpHistoryData.login = vm.partnerIpHistoryData.login.map(item => {
                    item.loginTime$ = vm.dateReformat(item.loginTime);
                    item.country$ = item.country || $translate("Unknown");
                    item.city$ = item.city || $translate("Unknown");
                    item.clientDomain$ = item.clientDomain || $translate("Unknown");
                    return item;
                });
                console.log('vm.partnerIpHistoryData', data);
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: vm.partnerIpHistoryData.login,
                    columns: [
                        {"title": $translate('lastLoginIp'), data: "loginIP"},
                        {"title": $translate('TIME'), data: "loginTime$"},
                        {"title": $translate('country'), data: "country$"},
                        {"title": $translate('city'), data: "city$"},
                        {"title": $translate('clientDomain'), data: "clientDomain$"},
                    ],
                    sScrollY: 200,
                });
                var a = $('#partnerIpHistoryTable').DataTable(option);
                $scope.safeApply();
                $('#partnerIpHistory').show();
                $('body').on('click', partnerIpHistoryHandler);
                function partnerIpHistoryHandler(event) {
                    var pageClick = $(event.target).closest('#partnerIpHistory').length;//.attr('aria-controls') == 'partnerIpHistoryTable';
                    var tableClick = $(event.target).attr('aria-controls') == 'partnerIpHistoryTable';
                    if (pageClick == 1 || tableClick) {
                        return;
                    }
                    $('#partnerIpHistory').hide();
                    $('body').off('click', partnerIpHistoryHandler);
                }
            });
        }

        vm.showIPHistory = function () {
            socketService.$socket($scope.AppSocket, 'getIpHistory', {
                playerId: vm.selectedSinglePlayer._id
            }, function (data) {
                console.log('data', data);
                vm.playerIpHistoryData = data.data;
                vm.playerIpHistoryData.login = vm.playerIpHistoryData.login.map(item => {
                    item.loginTime$ = vm.dateReformat(item.loginTime);
                    item.country$ = item.country || $translate("Unknown");
                    item.city$ = item.city || $translate("Unknown");
                    item.clientDomain$ = item.clientDomain || $translate("Unknown");
                    return item;
                });
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: vm.playerIpHistoryData.login,
                    columns: [
                        {"title": $translate('lastLoginIp'), data: "loginIP"},
                        {"title": $translate('TIME'), data: "loginTime$", sClass: "stdDateCell"},
                        {"title": $translate('country'), data: "country$"},
                        {"title": $translate('city'), data: "city$"},
                        {"title": $translate('OS'), data: "userAgent.os"},
                        {"title": $translate('Browser'), data: "userAgent.browser"},
                        {"title": $translate('clientDomain'), data: "clientDomain$"},
                    ],
                    sScrollY: 200,
                });
                var a = $('#playerIpHistoryTable').DataTable(option);
                $('#playerIpHistoryTable').resize();
                a.columns.adjust().draw();
                $scope.safeApply();
                $('#playerIpHistory').show();
                $('body').on('click', playerIpHistoryHandler);
                function playerIpHistoryHandler(event) {
                    var pageClick = $(event.target).closest('#playerIpHistory').length;//.attr('aria-controls') == 'playerIpHistoryTable';
                    var tableClick = $(event.target).attr('aria-controls') == 'playerIpHistoryTable';
                    if (pageClick == 1 || tableClick) {
                        return;
                    }
                    $('#playerIpHistory').hide();
                    $('body').off('click', playerIpHistoryHandler);
                }
            });
        }
        vm.sendMessageToPlayerBtn = function (type, data) {
            vm.telphonePlayer = data;
            $('#messagePlayerModal').modal('show');
        }
        vm.telorMessageToPlayerBtn = function (type, data) {
            // var rowData = JSON.parse(data);
            console.log(type, data);
            var title, text;
            if (type == 'msg' && authService.checkViewPermission('Platform', 'Player', 'sendSMS')) {
                vm.smsPlayer = {
                    playerId: data.playerId,
                    name: data.name,
                    nickName: data.nickName,
                    platformId: vm.selectedPlatform.data.platformId,
                    channel: $scope.channelList[0],
                    hasPhone: data.phoneNumber
                }
                vm.sendSMSResult = {};
                $scope.safeApply();
                $('#smsPlayerModal').modal('show');
            } else if (type == 'tel') {
                var phoneCall = {
                    playerId: data.playerId,
                    name: data.name,
                    toText: data.name,
                    platform: "jinshihao",
                    loadingNumber: true,
                }
                $scope.initPhoneCall(phoneCall);
                socketService.$socket($scope.AppSocket, 'getPlayerPhoneNumber', {playerObjId: data._id}, function (data) {
                    $scope.phoneCall.phone = data.data;
                    $scope.phoneCall.loadingNumber = false;
                    $scope.safeApply();
                    $('#phoneCallModal').modal('show');
                }, function (err) {
                    $scope.phoneCall.loadingNumber = false;
                    $scope.phoneCall.err = err.error.message;
                    $scope.safeApply();
                    $('#phoneCallModal').modal('show');
                }, true);
            }
        }
        vm.sendSMSToPlayer = function () {
            vm.sendSMSResult = {sent: "sending"};
            return $scope.sendSMSToPlayer(vm.smsPlayer, function (data) {
                vm.sendSMSResult = {sent: true, result: data.success};
                $scope.safeApply();
            });
        }
        //player datatable row click handler
        vm.playerTableRowClicked = function (rowData) {
            var deferred = Q.defer();
            console.log('player', rowData);
            var sendData = {_id: rowData._id};
            socketService.$socket($scope.AppSocket, 'getOnePlayerInfo', sendData, function (retData) {
                var player = retData.data;
                console.log('updated info');
                vm.selectedPlayers = {};
                vm.selectedPlayers[player._id] = player;
                vm.selectedSinglePlayer = player;

                vm.editPlayer = {
                    name: vm.selectedSinglePlayer.name,
                    email: vm.selectedSinglePlayer.email,
                    realName: vm.selectedSinglePlayer.realName,
                    nickName: vm.selectedSinglePlayer.nickName,
                    gameCredit: vm.selectedSinglePlayer.gameCredit,
                    gold: vm.selectedSinglePlayer.gold,
                    phoneNumber: vm.selectedSinglePlayer.phoneNumber,
                    partner: vm.selectedSinglePlayer.partner,
                    receiveSMS: vm.selectedSinglePlayer.receiveSMS,
                    bankCardGroup: vm.selectedSinglePlayer.bankCardGroup,
                    merchantGroup: vm.selectedSinglePlayer.merchantGroup,
                    alipayGroup: vm.selectedSinglePlayer.alipayGroup,
                    wechatPayGroup: vm.selectedSinglePlayer.wechatPayGroup,
                    quickPayGroup: vm.selectedSinglePlayer.quickPayGroup,
                    trustLevel: vm.selectedSinglePlayer.trustLevel,
                    photoUrl: vm.selectedSinglePlayer.photoUrl,
                    playerLevel: vm.selectedSinglePlayer.playerLevel._id,
                    referral: vm.selectedSinglePlayer.referral,
                    smsSetting: vm.selectedSinglePlayer.smsSetting
                };
                vm.selectedSinglePlayer.encodedBankAccount =
                    vm.selectedSinglePlayer.bankAccount ?
                        vm.selectedSinglePlayer.bankAccount.slice(0, 6) + "**********" + vm.selectedSinglePlayer.bankAccount.slice(-4)
                        : null;

                // Fix partnerName disappeared on second load
                if (!vm.selectedSinglePlayer.partnerName) {
                    if (vm.selectedSinglePlayer.partner) {
                        vm.selectedSinglePlayer.partnerName = vm.selectedSinglePlayer.partner.partnerName;
                    }
                }

                $scope.safeApply();
                deferred.resolve();
            }, function (err) {
                vm.selectedPlayers = {};
                vm.selectedPlayers[rowData._id] = rowData;
                vm.selectedSinglePlayer = rowData;
                deferred.resolve();
            })
            return deferred.promise;
        };

        vm.prepareCreatePlayer = function () {
            vm.newPlayer = {};
            vm.duplicateNameFound = false;
            $('.referralValidTrue').hide();
            $('.referralValidFalse').hide();
            vm.newPlayer.domain = window.location.hostname;
            vm.getReferralPlayer(vm.newPlayer, "new");
            vm.playerCreateResult = null;
            vm.playerPswverify = null;
        }
        vm.editPlayerStatus = function (id) {
            console.log(id);
        }

        vm.isOneSelectedPlayer = function () {
            return vm.selectedSinglePlayer;
        };

        //check if delete player button can be enabled
        vm.canDeletePlayers = function () {
            if (vm.selectedPlayers) {
                for (var key in vm.selectedPlayers) {
                    if (vm.selectedPlayers[key]) {
                        return true;
                    }
                }
            }
            return false;
        };

        //check if update player button can be enabled
        vm.canEditPlayer = function () {
            return vm.isOneSelectedPlayer();
        };

        vm.checkPlayerNameValidity = function (name, form, type) {
            if (!name) return;
            if (type == 'edit' && name == vm.selectedSinglePlayer.name) {
                vm.duplicateNameFound = false;
                return;
            }
            socketService.$socket($scope.AppSocket, 'checkPlayerNameValidity', {
                platform: vm.selectedPlatform.id,
                name: name
            }, function (data) {
                if (data && data.data.isPlayerNameValid == false) {
                    vm.duplicateNameFound = true;
                } else if (data && data.data.isPlayerNameValid) {
                    vm.duplicateNameFound = false;
                }
                form.$setValidity('usedPlayerName', !vm.duplicateNameFound)
                $scope.safeApply();
            }, function (err) {
                console.log('err', err);
            }, true);
        }

        //check if enable player button is active
        vm.canEnablePlayer = function () {
            var selectedPlayer = vm.isOneSelectedPlayer();
            return selectedPlayer ? !selectedPlayer.status : false;
        };

        var _ = {
            clone: function (obj) {
                return $.extend({}, obj);
            }
        };

        vm.openEditPlayerDialog = function () {
            let selectedPlayer = vm.isOneSelectedPlayer();   // ~ 20 fields!
            let editPlayer = vm.editPlayer;                  // ~ 6 fields
            let allPartner = vm.partnerIdObj;
            let allPlayerLevel = vm.allPlayerLvl;
            // console.log("vm.editPlayer", vm.editPlayer);
            let option = {
                $scope: $scope,
                $compile: $compile,
                childScope: {
                    allPlayerLevel: allPlayerLevel,
                    allPartner: allPartner,
                    playerId: selectedPlayer._id,
                    playerBeforeEditing: _.clone(editPlayer),
                    playerBeingEdited: _.clone(editPlayer),
                    // partnerObjs: vm.partnerIdObj,
                    platformBankCardGroupList: vm.platformBankCardGroupList,
                    platformMerchantGroupList: vm.platformMerchantGroupList,
                    platformAlipayGroupList: vm.platformAlipayGroupList,
                    platformWechatPayGroupList: vm.platformWechatPayGroupList,
                    platformQuickPayGroupList: vm.platformQuickPayGroupList,
                    allPlayerTrustLvl: vm.allPlayerTrustLvl,
                    // showPlayerBankCardId: vm.showPlayerBankCardId,
                    // showPlayerMerchantId: vm.showPlayerMerchantId,
                    updateEditedPlayer: function () {
                        sendPlayerUpdate(this.playerId, this.playerBeforeEditing, this.playerBeingEdited);
                    },
                    checkPlayerNameValidity: function (a, b, c) {
                        vm.checkPlayerNameValidity(a, b, c);
                    },
                    duplicateNameFound: function () {
                        return vm.duplicateNameFound;
                    },
                    // partnerChanged: function () {
                    //     if (vm.partnerChange) {
                    //         $('#partnerInEditPlayer').text(vm.parterSelectedforPlayer ? vm.parterSelectedforPlayer.partnerName : '');
                    //     }
                    //     return vm.partnerChange;
                    // },
                }
            };

            option.childScope.playerBeforeEditing.smsSetting = _.clone(editPlayer.smsSetting);
            option.childScope.playerBeingEdited.smsSetting = _.clone(editPlayer.smsSetting);
            // console.log("option.childScope.playerBeingEdited.smsSetting:", option.childScope.playerBeingEdited.smsSetting);
            // option.childScope.showPartnerTable = function () {
            //     return vm.showPartnerSelectModal(option.childScope.playerBeingEdited);
            // };
            option.childScope.changeReferral = function () {
                return vm.getReferralPlayer(option.childScope.playerBeingEdited, "change");
            };
            option.childScope.changePartner = function () {
                return vm.getPartnerinPlayer(option.childScope.playerBeingEdited, "change");
            }
            vm.partnerChange = false;
            $('.referralValidTrue').hide();
            $('.referralValidFalse').hide();
            $('.partnerValidTrue').hide();
            $('.partnerValidFalse').hide();
            $('#dialogEditPlayer').floatingDialog(option);
            vm.getReferralPlayer(option.childScope.playerBeingEdited, "new");
            vm.getPartnerinPlayer(option.childScope.playerBeingEdited, "new");
        };

        function getPlayerLevelName(levelObjId) {
            for (var i = 0; i < vm.allPlayerLvl.length; i++) {
                if (vm.allPlayerLvl[i]._id == levelObjId) {
                    return vm.allPlayerLvl[i].name;
                }
            }
        };
        vm.getReferralPlayer = function (editObj, type) {
            var sendData = null;
            if (type === 'change' && editObj.referralName) {
                sendData = {name: editObj.referralName}
            } else if (type === 'new' && editObj.referral) {
                sendData = {_id: editObj.referral}
            }
            if (sendData) {
                sendData.platform = vm.selectedPlatform.id;
                socketService.$socket($scope.AppSocket, 'getPlayerInfo', sendData, function (retData) {
                    var player = retData.data;
                    if (player && player.name !== editObj.name) {
                        $('.dialogEditPlayerSubmitBtn').removeAttr('disabled');
                        $('.referralValidTrue').show();
                        $('.referralValidFalse').hide();
                        editObj.referral = player._id;
                        editObj.referralName = player.name;
                        if (type === 'new') {
                            $('.referralValue').val(player.name);
                        }
                    } else {
                        $('.dialogEditPlayerSubmitBtn').attr('disabled', true);
                        $('.referralValidTrue').hide();
                        $('.referralValidFalse').show();
                        editObj.referral = null;
                    }
                })
            } else {
                $('.dialogEditPlayerSubmitBtn').removeAttr('disabled');
                $('.referralValidTrue').hide();
                $('.referralValidFalse').hide();
                editObj.referral = null;
            }
        }
        vm.getPartnerinPlayer = function (editObj, type) {
            var sendData = null;
            if (type === 'change' && editObj.partnerName == '') {
                editObj.partner = null;
            }
            if (type === 'change' && editObj.partnerName) {
                sendData = {partnerName: editObj.partnerName}
            } else if (type === 'new' && editObj.partner) {
                sendData = {_id: editObj.partner}
            }
            if (sendData) {
                sendData.platform = vm.selectedPlatform.id;
                socketService.$socket($scope.AppSocket, 'getPartner', sendData, function (retData) {
                    var partner = retData.data;
                    if (partner && partner.name !== editObj.name) {
                        $('.partnerValidTrue').show();
                        $('.partnerValidFalse').hide();
                        editObj.partner = partner._id;
                        editObj.partnerName = partner.partnerName;
                        if (type === 'new') {
                            $('.partnerValue').val(partner.partnerName);
                        }
                    } else {
                        $('.partnerValidTrue').hide();
                        $('.partnerValidFalse').show();
                        editObj.partner = null;
                    }
                })
            }
        }

        function sendPlayerUpdate(playerId, oldPlayerData, newPlayerData) {
            oldPlayerData.partner = oldPlayerData.partner ? oldPlayerData.partner._id : null;
            var updateData = newAndModifiedFields(oldPlayerData, newPlayerData);
            var updateSMS = {
                receiveSMS: updateData.receiveSMS != null ? updateData.receiveSMS : undefined,
                smsSetting: updateData.smsSetting ? updateData.smsSetting : undefined
            }
            var updateBankData = {};
            delete updateData.smsSetting;
            delete updateData.receiveSMS;

            if (!updateData.partner) {
                delete updateData.partnerName;
            }
            if (Object.keys(updateData).length > 0) {
                updateData._id = playerId;
                var isUpdate = false
                updateData.playerName = newPlayerData.name || vm.editPlayer.name
                // compare newplayerData & oldPlayerData, if different , update it , exclude bankgroup
                Object.keys(newPlayerData).forEach(function (key) {
                    if (newPlayerData[key] != oldPlayerData[key]) {
                        if (key == "alipayGroup" || key == "smsSetting" || key == "bankCardGroup" || key == "merchantGroup" || key == "wechatPayGroup") {
                            //do nothing
                        } else if (key == "referralName" && newPlayerData["referral"] == oldPlayerData["referral"]) {
                            //do nothing
                        } else if (key == "partnerName" && oldPlayerData.partner == newPlayerData.partner) {
                            //do nothing
                        } else {
                            isUpdate = true;
                        }
                    }
                });

                if (updateData.partner == null) {
                    updateData.partnerName = '';
                }
                if (updateData.playerLevel) {
                    updateData.oldLevelName = getPlayerLevelName(vm.editPlayer.playerLevel);
                    updateData.newLevelName = getPlayerLevelName(updateData.playerLevel);
                }
                if (!updateData.referral) {
                    delete updateData.referralName;
                }

                // if (updateData.bankCardGroup == 'NULL') {
                //     updateData.bankCardGroup = undefined;
                //     // updateData["$unset"] = {bankCardGroup: null};
                //     // delete updateData.bankCardGroup;
                // }
                // if (updateData.merchantGroup == 'NULL') {
                //     updateData.merchantGroup = undefined;
                //     // updateData["$unset"] = {merchantGroup: null};
                //     // delete updateData.merchantGroup;
                // }
                if (updateData.bankCardGroup) {
                    updateBankData.bankCardGroup = updateData.bankCardGroup;
                }
                if (updateData.merchantGroup) {
                    updateBankData.merchantGroup = updateData.merchantGroup;
                }
                if (updateData.alipayGroup) {
                    updateBankData.alipayGroup = updateData.alipayGroup;
                }
                if (updateData.wechatPayGroup) {
                    updateBankData.wechatPayGroup = updateData.wechatPayGroup;
                }
                delete updateData.bankCardGroup;
                delete updateData.merchantGroup;
                delete updateData.aliPayGroup;

                if (isUpdate) {
                    socketService.$socket($scope.AppSocket, 'createUpdatePlayerInfoProposal', {
                        creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                        data: updateData,
                        platformId: vm.selectedPlatform.id
                    }, function (data) {
                        if (data.data && data.data.stepInfo) {
                            socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                        }
                        vm.getPlatformPlayersData();
                    }, null, true);
                }
            }
            if (Object.keys(updateBankData).length > 0) {
                socketService.$socket($scope.AppSocket, 'updatePlayer', {
                    query: {_id: playerId},
                    updateData: updateBankData
                }, function (updated) {
                    console.log('updated', updated);
                    vm.getPlatformPlayersData();
                });
            }
            if (Object.keys(updateSMS).length > 0) {
                socketService.$socket($scope.AppSocket, 'updatePlayer', {
                    query: {_id: playerId},
                    updateData: updateSMS
                }, function (updated) {
                    console.log('updated', updated);
                    vm.getPlatformPlayersData();
                });
            }
        }

        /// check the length of password of player/partner before signup
        vm.passwordLengthCheck = function (password) {
            if (password) {
                return password.length < 6;
            }
            else return false;
        }

        //check if disable player button is active
        vm.canDisablePlayer = function () {
            var selectedPlayer = vm.isOneSelectedPlayer();
            return selectedPlayer ? selectedPlayer.status : false;
        };
        //Create new player
        vm.createNewPlayer = function () {
            vm.newPlayer.platform = vm.selectedPlatform.id;
            vm.newPlayer.platformId = vm.selectedPlatform.data.platformId;
            console.log('newPlayer',vm.newPlayer);
            if (vm.newPlayer.createPartner) {
                socketService.$socket($scope.AppSocket, 'createPlayerPartner', vm.newPlayer, function (data) {
                    vm.playerCreateResult = data;
                    vm.getPlatformPlayersData();
                    $scope.safeApply;
                }, function (err) {
                    vm.playerCreateResult = err;
                    console.log('createPlayerDataError',err);
                    $scope.safeApply;
                });
            } else {
                socketService.$socket($scope.AppSocket, 'createPlayer', vm.newPlayer, function (data) {
                    vm.playerCreateResult = data;
                    vm.getPlatformPlayersData();
                    $scope.safeApply;
                }, function (err) {
                    vm.playerCreateResult = err;
                    console.log('createPlayerDataError',err);
                    $scope.safeApply;
                });
            }
        };

        vm.showPartnerSelectModal = function (editingObj) {
            vm.showPartnerFilterLevel = null;
            vm.showPartnerFilterName = null;
            $('#modalSelectPartner').modal();
            $('#modalSelectPartner').on('hidden.bs.modal', function (event) {
                if ($('.modal.in').length > 0) {
                    $("body").addClass('modal-open');
                }
                editingObj.partner = vm.parterSelectedforPlayer ? vm.parterSelectedforPlayer._id : null;
                $scope.safeApply();
            });
            vm.showPartners = vm.partners.map(item => {
                item.parent$ = item.partnerName ? item.partnerName : '';
                item.children$ = item.children.length;
                item.registrationTime$ = vm.dateReformat(item.registrationTime);
                item.level$ = $translate(item.level.name);
                item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                item.validPlayers$ = vm.partnerPlayerObj[item._id] ? vm.partnerPlayerObj[item._id].validPlayers : 0;
                item.activePlayers$ = vm.partnerPlayerObj[item._id] ? vm.partnerPlayerObj[item._id].activePlayers : 0;
                return item;
            });

            vm.drawSelectPartnerTable(vm.showPartners, editingObj);
            $scope.safeApply();
        };

        vm.drawSelectPartnerTable = function (data, obj) {
            let tableOptions = {
                data: data,
                columnDefs: [{targets: '_all', defaultContent: ' '}],
                aaSorting: [],
                columns: [
                    {title: $translate('PARTNER_ID'), data: 'partnerId', advSearch: true, "sClass": "alignLeft"},
                    {
                        title: $translate('PARTNER_NAME'), data: "partnerName", advSearch: true, "sClass": "alignLeft",
                    },
                    {
                        title: $translate('REAL_NAME'), data: "realName", orderable: false,
                        advSearch: true, "sClass": "alignLeft wordWrap realNameCell"
                    },
                    {
                        title: $translate('PARENT'),
                        data: 'parent$',
                        orderable: false,
                    },
                    {
                        title: $translate('CHILDREN'),
                        data: 'children$',
                    },
                    {
                        title: $translate('REFERRAL_PLAYER'), data: 'totalReferrals',
                        "sClass": "alignRight"
                    },
                    {
                        title: $translate('CREDIT'),
                        data: 'credits'
                    },
                    {
                        title: $translate('REGISTRATION_TIME'), data: 'registrationTime$',
                    },
                    {
                        title: $translate('PARTNER_LEVEL_SHORT'),
                        data: 'level$',
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('LAST_ACCESS_TIME'), data: 'lastAccessTime$',
                    },
                    {
                        title: $translate('LAST_LOGIN_IP'), orderable: false,
                        data: 'lastLoginIp'
                    },
                    {
                        title: $translate('ACTIVE_PLAYER'), data: 'activePlayers$',
                        "sClass": "alignRight"
                    },
                    {
                        title: $translate('VALID_PLAYER'), data: 'validPlayers$',
                        "sClass": "alignRight"
                    },
                    {title: $translate('VALID_REWARD'), data: 'validReward', "sClass": "alignRight"},
                ],
                "autoWidth": true,
                "scrollX": true,
                // "scrollY": "480px",
                "scrollCollapse": true,
                "destroy": true,
                "paging": true,
                "language": {
                    "info": $translate("Total _MAX_ partners"),
                    "emptyTable": $translate("No data available in table"),
                },
                "dom": 'Zirtlp',
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    // Row click
                    if (aData._id == obj.partner) {
                        $(this).addClass('selected');
                        vm.parterSelectedforPlayer = aData;
                    }
                    $(nRow).off('click');
                    $(nRow).on('click', function () {
                        $('#partnerSelectTable tbody tr').removeClass('selected');
                        $(this).toggleClass('selected');
                        vm.parterSelectedforPlayer = aData;
                        vm.partnerChange = true;
                        $('body').data('partner')
                        console.log('partner selected', vm.parterSelectedforPlayer);
                        // $('#partnerInEditPlayer').text(aData.partnerName);
                        $scope.safeApply();
                    });
                }
            };
            vm.partnerSelectTable = $('#partnerSelectTable').DataTable(tableOptions);
            utilService.setDataTablePageInput('partnerSelectTable', vm.partnerSelectTable, $translate);
            $('#partnerSelectTable').resize();
            $('#partnerSelectTable').resize();
        };

        vm.clearPartnerSelection = function () {
            $('#partnerSelectTable tbody tr').removeClass('selected');
            vm.parterSelectedforPlayer = null;
            vm.partnerChange = true;
            $scope.safeApply();
        }
        vm.showPartnerFilterChange = function () {
            var newData = vm.showPartners.filter(item => {
                var toShow = true;
                if (vm.showPartnerFilterLevel && item.level.value != vm.showPartnerFilterLevel) {
                    toShow = false;
                } else if (vm.showPartnerFilterName && item.partnerName.indexOf(vm.showPartnerFilterName) == -1) {
                    toShow = false;
                }
                return toShow;
            });
            vm.partnerSelectTable.clear();
            newData.forEach(function (rowData) {
                vm.partnerSelectTable.row.add(rowData);
            });
            vm.partnerSelectTable.draw();
            $scope.safeApply();
        }

        vm.createTrialPlayerAccount = function () {
            //createTestPlayerForPlatform
            console.log('here', vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'createTestPlayerForPlatform', {platformId: vm.selectedPlatform.id}, function (data) {
                vm.createtrail = data.data;
                vm.testPlayerName = data.data.name;
                vm.testPlayerPassword = data.data.password;
                console.log('testaccount', data);
                $scope.safeApply();
                //$('#modalTestPlayer').modal();
                vm.getPlatformPlayersData();
            });
        };

        vm.initResetPlayerPasswordModal = () => {
            vm.customNewPassword = "888888";
            vm.playerNewPassword = "";
            vm.resetPartnerNewPassword = false;
        };

        vm.submitResetPlayerPassword = function () {
            console.log('here', {_id: vm.isOneSelectedPlayer()._id});

            let queryObj = {
                playerId: vm.isOneSelectedPlayer()._id,
                platform: vm.isOneSelectedPlayer().platform,
                newPassword: vm.customNewPassword
            };

            if (vm.resetPartnerNewPassword) {
                queryObj.resetPartnerPassword = true;
            }

            socketService.$socket($scope.AppSocket, 'resetPlayerPassword', queryObj, function (data) {
                console.log('password', data);
                vm.playerNewPassword = data.data;
                $scope.safeApply();
            });
        };
        //get player credit change log

        vm.showPagedPlayerCreditChangeLog = function () {
            $('#modalPlayerCreditChangeLog').modal().show();
            vm.playerCreditChangeLog = {};
            vm.playerCreditChangeLog.type = 'none';
            utilService.actionAfterLoaded(('#playerCreditChangeLog .endTime'), function () {
                vm.playerCreditChangeLog.startTime = utilService.createDatePicker('#playerCreditChangeLog .startTime');
                vm.playerCreditChangeLog.endTime = utilService.createDatePicker('#playerCreditChangeLog .endTime');
                vm.playerCreditChangeLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerCreditChangeLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerCreditChangeLog.pageObj = utilService.createPageForPagingTable("#playerCreditChangeLogTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerCreditChangeLog", vm.getPagedPlayerCreditChangeLog)
                });
                vm.getPagedPlayerCreditChangeLog(true);
            });
        }

        vm.getPagedPlayerCreditChangeLog = function (newSearch) {
            vm.playerCreditChangeLog.loading = true;
            var sendQuery = {
                playerId: vm.isOneSelectedPlayer()._id,
                startTime: vm.playerCreditChangeLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerCreditChangeLog.endTime.data('datetimepicker').getLocalDate(),
                type: vm.playerCreditChangeLog.type,
                index: newSearch ? 0 : vm.playerCreditChangeLog.index,
                limit: newSearch ? 10 : vm.playerCreditChangeLog.limit,
                sortCol: vm.playerCreditChangeLog.sortCol,
            }
            socketService.$socket($scope.AppSocket, "getPagedPlayerCreditChangeLogs", sendQuery, function (data) {
                vm.playerCreditChangeLogs = vm.processCreditChangeLogData(data.data.data);
                vm.playerCreditChangeLog.totalCount = data.data.total || 0;
                vm.playerCreditChangeLog.loading = false;
                vm.drawPagedCreditChangeQueryTable(vm.playerCreditChangeLogs, vm.playerCreditChangeLog.totalCount, newSearch);
            })
        };

        vm.drawPagedCreditChangeQueryTable = function (data, size, newSearch) {
            let tableData = data.map(item => {
                item.createTime$ = vm.dateReformat(item.operationTime);
                item.operationType$ = $translate(item.operationType);
                item.beforeAmount = item.curAmount - item.amount;
                if (item.beforeAmount < 0) {
                    item.beforeAmount = 0
                }
                item.beforeAmount = item.beforeAmount.toFixed(2);
                item.beforeUnlockedAmount = item.lockedAmount - item.changedLockedAmount;
                item.beforeUnlockedAmount = item.beforeUnlockedAmount.toFixed(2);
                let remark = (item.data && item.data.remark) ? $translate('remark') + ':' + item.data.remark + ', ' : '';
                item.details$ = remark + item.detail.join(', ');
                item.proposalId$ = item.data ? item.data.proposalId : '';
                return item;
            });

            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                order: vm.playerCreditChangeLog.aaSorting || [[0, 'desc']],
                columnDefs: [
                    {'sortCol': 'operationTime', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'operationType', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [4]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('CREATE_TIME'), data: 'createTime$'},
                    {'title': $translate('Type'), data: 'operationType$', sClass: "wordWrap width10Per"},
                    {'title': $translate('PROPOSAL_ID'), data: 'proposalId$', sClass: "tbodyNoWrap"},
                    {'title': $translate('Before Amount'), data: 'beforeAmount', sClass: "wordWrap"},
                    {'title': $translate('CHANGE_AMOUNT'), data: 'amount', sClass: "tbodyNoWrap"},
                    {'title': $translate('CUR_AMOUNT'), data: 'curAmount', sClass: "tbodyNoWrap"},
                    {'title': $translate('Before UnlockedAmount'), data: 'beforeUnlockedAmount', sClass: "tbodyNoWrap"},
                    {'title': $translate('Change UnlockedAmount'), data: 'changedLockedAmount', sClass: "tbodyNoWrap"},
                    {'title': $translate('UNLOCKAMOUNT'), data: 'lockedAmount', sClass: "tbodyNoWrap"},
                    {'title': $translate('View Details'), data: 'details$', sClass: "wordWrap width30Per"}
                ],
                paging: false,
            });
            var a = utilService.createDatatableWithFooter('#playerCreditChangeLogTable', option, {});
            vm.playerCreditChangeLog.pageObj.init({maxCount: size}, newSearch);

            $('#playerCreditChangeLogTable').off('order.dt');
            $('#playerCreditChangeLogTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerCreditChangeLog', vm.getPagedPlayerCreditChangeLog);
            });
            $("#playerCreditChangeLogTable").resize();
            $scope.safeApply();
        }

        vm.prepareShowPlayerCreditChangeLog = function () {
            vm.processDataTableinModal('#modalPlayerCreditChangeLog', '#playerCreditChangeLogTable', {"aaSorting": [[0, 'desc']]});
            vm.initQueryTimeFilter('playerCreditChangeLog', function () {
                vm.queryPara.playerCreditChangeLog.type = 'none';
                vm.queryPara.playerCreditChangeLog.startTime.data('datetimepicker').setLocalDate(utilService.setNDaysAgo(new Date(), 1));
                vm.showCreditChangeLogByFilter();
                $scope.safeApply();
            });
        }
        vm.showCreditChangeLogByFilter = function (query) {
            // var limit = vm.queryPara.playerCreditChangeLog.limit || '-1';
            var sendData = {
                startTime: vm.queryPara.playerCreditChangeLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerCreditChangeLog.endTime.data('datetimepicker').getLocalDate(),
                playerId: vm.isOneSelectedPlayer()._id,
                type: vm.queryPara.playerCreditChangeLog.type,
                limit: parseInt('-1')
            };
            vm.queryPara.playerCreditChangeLog.fetching = true;
            vm.getPlayerCreditChangeLogRecords('getPlayerCreditChangeLogsByQuery', sendData, function () {
                vm.updateDataTableinModal('#modalPlayerCreditChangeLog', '#playerCreditChangeLogTable', {"aaSorting": [[0, 'desc']]});
                vm.queryPara.playerCreditChangeLog.fetching = false;
                $scope.safeApply();
            });
        }

        vm.processCreditChangeLogData = function (data) {
            return data ? data.map(a => {
                if (!a) return;
                var checkForObjIdRegExp = new RegExp(/^[a-f\d]{24}$/i);
                var newStr = [];
                a.amount = a.amount != null ? a.amount.toFixed(2) : new Number(0).toFixed(2);
                a.curAmount = a.curAmount != null ? a.curAmount.toFixed(2) : new Number(0).toFixed(2);
                a.lockedAmount = a.lockedAmount != null ? a.lockedAmount.toFixed(2) : new Number(0).toFixed(2);
                a.changedLockedAmount = a.changedLockedAmount != null ? a.changedLockedAmount.toFixed(2) : new Number(0).toFixed(2);
                var newObj = $.extend({}, a.data);
                delete newObj.creator;
                // switch (a.operationType) {
                //     case "TopUp":
                //         break;
                //     case "ManualTopUp":
                //         newObj = {proposalId: newObj.proposalId};
                //         break;
                // }
                if (a.data && a.data._inputCredit != null && a.data.initAmount != null) {
                    newObj = {rewardType: a.data.rewardType};
                } else if (a.data && a.data.proposalId && a.operationType == 'ManualTopUp') {
                    newObj = {proposalId: newObj.proposalId};
                }
                $.each(newObj, (i, v) => {
                    if (!checkForObjIdRegExp.test(v)) {
                        if (i == 'createTime') {
                        } else if (i == '__v') {
                        } else if (i == 'remark') {
                        } else if (i == 'data') {
                        } else {
                            newStr.push($translate(i) + ':' + $translate(v))
                        }
                    }
                })
                a.detail = newStr
                return a;
            }) : [];
        }
        vm.getPlayerCreditChangeLogRecords = function (socketAction, data, callback) {
            console.log("CreditChangeLogs:Query:", data);
            socketService.$socket($scope.AppSocket, socketAction, data, function (data) {
                vm.playerCreditChangeLogs = vm.processCreditChangeLogData(data.data);
                console.log('CreditChangeLogs.length', vm.playerCreditChangeLogs.length);
                $scope.safeApply();
                if (callback) {
                    callback(vm.playerCreditChangeLogs);
                }
            });
        };

        vm.initQueryTimeFilter = function (field, callback) {
            vm.queryPara[field] = {};
            utilService.actionAfterLoaded(('#' + field ), function () {
                vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + ' .startTime');
                vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + ' .endTime');
                vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
            });
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }

        /**
         * Get player's all available reward task
         * @param playerId
         * @param callback
         */
        vm.getRewardTask =
            (playerId, callback) => {
                socketService.$socket($scope.AppSocket, 'getPlayerAllRewardTask', {playerId: playerId}, function (data) {
                    console.log('getRewardTask', data);
                    vm.rewardTask = data.data;
                    //$scope.safeApply();
                    if (callback) {
                        callback(vm.rewardTask);
                    }
                });
            };

        vm.getRewardTaskDetail =
            (playerId, callback) => {
                let deferred = Q.defer();

                socketService.$socket($scope.AppSocket, 'getPlayerAllRewardTaskDetailByPlayerObjId', {_id: playerId}, function (data) {
                    vm.curRewardTask = data.data;
                    console.log('vm.curRewardTask', vm.curRewardTask);
                    $scope.safeApply();
                    if (callback) {
                        callback(vm.curRewardTask);
                    }
                    deferred.resolve(data);
                });

                return deferred.promise;
            };

        vm.prepareShowFeedbackRecord = function () {
            vm.playerFeedbackData = [];
            vm.processDataTableinModal('#modalPlayerFeedbackRecord', '#playerFeedbackRecordTable', {'dom': 't'});
            vm.playerFeedbackRecord = vm.playerFeedbackRecord || {};
            utilService.actionAfterLoaded('#modalPlayerFeedbackRecord .searchDiv .startTime', function () {
                vm.playerFeedbackRecord.startTime = utilService.createDatePicker('#modalPlayerFeedbackRecord .searchDiv .startTime');
                vm.playerFeedbackRecord.endTime = utilService.createDatePicker('#modalPlayerFeedbackRecord .searchDiv .endTime');
                vm.playerFeedbackRecord.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerFeedbackRecord.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.updatePlayerFeedbackData('#modalPlayerFeedbackRecord', '#playerFeedbackRecordTable', {'dom': 't'});
            });
        }
        vm.updatePlayerFeedbackData = function (modalId, tableId, opt) {
            opt = opt || {'dom': 't'};
            vm.playerFeedbackRecord.searching = true;
            socketService.$socket($scope.AppSocket, 'getPlayerFeedbackReport', {
                query: {
                    startTime: vm.playerFeedbackRecord.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerFeedbackRecord.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.selectedSinglePlayer._id
                }
            }, function (data) {
                console.log('getPlayerFeedback', data);
                vm.playerFeedbackRecord.searching = false;
                vm.playerFeedbackData = data.data;
                $scope.safeApply();
                vm.updateDataTableinModal(modalId, tableId, opt)
            });
        }
        vm.getPlayer5Feedback = function (playerId, callback) {
            console.log('play', playerId);
            socketService.$socket($scope.AppSocket, 'getPlayerLastNFeedbackRecord', {
                playerId: playerId,
                limit: 5
            }, function (data) {
                console.log('getPlayerFeedback', data);
                vm.playerFeedbackData = data.data;
                $scope.safeApply();
                if (callback) {
                    callback(vm.playerFeedbackData);
                }
            });
        }
        vm.getPlayerNFeedback = function (playerId, limit, callback) {
            socketService.$socket($scope.AppSocket, 'getPlayerLastNFeedbackRecord', {
                playerId: playerId,
                limit: limit
            }, function (data) {
                $scope.safeApply();
                if (callback) {
                    callback(data.data);
                }
            });
        }
        //get player's game provider credit
        vm.showPlayerCreditinProvider = function (row) {
            vm.gameProviderCreditPlayerName = row.name;
            vm.creditModal = $('#modalPlayerGameProviderCredit').modal();
            vm.playerCredit = {};
            vm.creditTransfer = {};
            vm.fixPlayerRewardAmount = {rewardInfo: row.rewardInfo};
            vm.transferAllCredit = {};
            vm.rewardTotalAmount = 0;
            vm.creditTransfer.needClose = false;
            vm.creditTransfer.transferResult = '';
            vm.getRewardTask(row._id, function (data) {
                // Add up amounts from all available reward tasks
                let showRewardAmount = 0;
                if (data && data.length > 0) {
                    for (let i = 0; i < data.length; i++) {
                        showRewardAmount += data[i].currentAmount;
                    }
                }
                vm.creditTransfer.showRewardAmount = showRewardAmount;
                vm.creditTransfer.showValidCredit = row.validCredit;
            });
            for (var i in vm.platformProviderList) {
                vm.getPlayerCreditInProvider(row.name, vm.platformProviderList[i].providerId, vm.playerCredit)
            }
        }
        vm.transferCreditFromProviderClicked = function (providerId) {
            console.log('vm.playerCredit', vm.playerCredit);
            vm.creditTransfer.focusProvider = providerId;
            vm.maxTransferCredit = $.isNumeric(vm.playerCredit[providerId].gameCredit) ? vm.playerCredit[providerId].gameCredit : 0;
            vm.playerCreditTransferAmount = {Qty: 0, value: 0};
            vm.creditTransfer.statement = "From provider, transfer";
            vm.creditTransfer.apiStr = 'transferPlayerCreditFromProvider';
        }
        vm.transferCreditToProviderClicked = function (providerId) {
            console.log('vm.selectedSinglePlayer', vm.selectedSinglePlayer);
            vm.creditTransfer.focusProvider = providerId;
            vm.maxTransferCredit = vm.selectedSinglePlayer.validCredit;
            vm.playerCreditTransferAmount = 0;
            vm.creditTransfer.statement = "To provider, transfer";
            vm.creditTransfer.apiStr = 'transferPlayerCreditToProvider';
        }
        vm.updateCreditValue = function () {
            vm.playerCreditTransferAmount.Qty = parseInt(vm.playerCreditTransferAmount.value);
        }
        vm.updateCreditQty = function () {
            vm.playerCreditTransferAmount.value = parseInt(vm.playerCreditTransferAmount.Qty);
        }
        vm.confirmCreditTransfer = function (providerId) {
            console.log('vm.selectedSinglePlayer', vm.selectedSinglePlayer);
            var sendData = {
                platform: vm.selectedPlatform.data.platformId,
                playerId: vm.selectedSinglePlayer.playerId,
                providerId: providerId,
                amount: vm.playerCreditTransferAmount.Qty || -1,
                adminName: authService.adminName
            }
            console.log('will send', sendData, vm.creditTransfer.apiStr);
            vm.creditTransfer.isProcessing = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, vm.creditTransfer.apiStr, sendData, function (data) {
                console.log('transfer credit', data);
                // vm.creditTransfer.needClose = true;
                vm.creditTransfer.transferResult = 'SUCCESS';
                vm.playerCredit[providerId].gameCredit = data.data.providerCredit;
                vm.selectedSinglePlayer.validCredit = data.data.playerCredit;
                vm.creditTransfer.showRewardAmount = data.data.rewardCredit;
                vm.creditTransfer.isProcessing = false;
                // vm.getPlatformPlayersData();
                vm.creditTransfer.showValidCredit = data.data.playerCredit;
                vm.creditTransfer.needRefreshPlatformPlayerData = true;
                // vm.advancedPlayerQuery();
                $scope.safeApply();
                // vm.creditModal.modal('hide');
            }, function (err) {
                console.log('transfer credit', err);
                vm.creditTransfer.transferResult = 'FAIL';
                vm.creditTransfer.isProcessing = false;
                // vm.advancedPlayerQuery();
                $scope.safeApply();
            })
        }

        vm.transferAllCreditOutRecursive = function (provider, index, size) {
            console.log('transferAllCreditOutRecursive index: ', index);
            if (index > size || !vm.runTransferAllCreditOut) {
                $('#loadingPlayerTableSpin').hide();
                return;
            }

            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: {},
                index: index,
                limit: 500,
                sortCol: {registrationTime: -1}
            };

            $('#loadingPlayerTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQuery', apiQuery, function (reply) {
                var size = reply.data.size;
                var data = reply.data.data;
                for (var i = 0; i < data.length; i++) {
                    console.log("transferAllCreditOutRecursive playerId: " + data[i].playerId);
                    var sendData = {
                        platform: vm.selectedPlatform.data.platformId,
                        playerId: data[i].playerId,
                        providerId: provider,
                        amount: -1,
                        adminName: authService.adminName
                    }
                    vm.creditTransfer = {};
                    vm.creditTransfer.apiStr = 'transferPlayerCreditFromProvider';
                    socketService.$socket($scope.AppSocket, vm.creditTransfer.apiStr, sendData, function (data) {
                        console.log('transferAllCreditOutRecursive data: ', data);
                    }, function (err) {
                        console.log('transferAllCreditOutRecursive err: ', err);
                    })
                }
                vm.transferAllCreditOutRecursive(provider, apiQuery.index + 500, size);
            });
        }

        vm.transferAllCreditOut = function () {
            if (vm.runTransferAllCreditOut) {
                vm.runTransferAllCreditOut = false;
                return;
            }
            vm.runTransferAllCreditOut = true;
            var provider = 19;
            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: {},
                index: vm.startTransferIndex || 0,
                limit: 500,
                sortCol: {registrationTime: -1}
            };
            console.log('transferAllCreditOut index: ', apiQuery.index);
            $('#loadingPlayerTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQuery', apiQuery, function (reply) {
                var size = reply.data.size;
                var data = reply.data.data;
                for (var i = 0; i < data.length; i++) {
                    console.log("transferAllCreditOut playerId: " + data[i].playerId);

                    var sendData = {
                        platform: vm.selectedPlatform.data.platformId,
                        playerId: data[i].playerId,
                        providerId: provider,
                        amount: -1,
                        adminName: authService.adminName
                    }
                    vm.creditTransfer = {};
                    vm.creditTransfer.apiStr = 'transferPlayerCreditFromProvider';
                    socketService.$socket($scope.AppSocket, vm.creditTransfer.apiStr, sendData, function (data) {
                        console.log('transferAllCreditOut data: ', data);
                    }, function (err) {
                        console.log('transferAllCreditOut err: ', err);
                    })
                }
                vm.transferAllCreditOutRecursive(provider, apiQuery.index + 500, size);
                $('#loadingPlayerTableSpin').hide();
            });
        }

        vm.getPlayerCreditInProvider = function (userName, providerId, targetObj) {
            var sendStr = 'getPlayerCreditInProvider';
            socketService.$socket($scope.AppSocket, sendStr, {
                providerId: providerId,
                userName: userName,
                platformId: vm.selectedPlatform.data.platformId
            });
            $scope.AppSocket.removeAllListeners('_' + sendStr);
            $scope.AppSocket.on('_' + sendStr, function (data) {
                console.log('Received Credit for Provider', data);
                if (data.success) {
                    var provId = data.data.providerId;
                    targetObj[provId] = data.data || 0;
                    $scope.safeApply();
                }
            });
        };

        vm.transferAllCreditToPlayer = function () {
            vm.transferAllCredit.isProcessing = true;
            $.each(vm.playerCredit, function (i, v) {
                if (jQuery.isNumeric(v.gameCredit) && v.gameCredit > 0) {
                    var sendData = {
                        platform: vm.selectedPlatform.data.platformId,
                        playerId: vm.selectedSinglePlayer.playerId,
                        providerId: v.providerId,
                        amount: parseInt(v.gameCredit),
                        adminName: authService.adminName
                    }

                    vm.transferAllCredit[v.providerId] = {finished: false};
                    console.log('will send', sendData, 'transferPlayerCreditFromProvider');
                    socketService.$socket($scope.AppSocket, 'transferPlayerCreditFromProvider', sendData, function (data) {
                        vm.transferAllCredit[v.providerId].text = "Success";
                        vm.transferAllCredit[v.providerId].finished = true;
                        $scope.safeApply();
                    }, function (data) {
                        console.log('transfer finish Fail', data);
                        var msg = 'unknown';
                        try {
                            msg = JSON.parse(data.error.error).errorMsg;
                        }
                        catch (err) {
                            console.log(err);
                        }
                        vm.transferAllCredit[v.providerId].text = msg;
                        vm.transferAllCredit[v.providerId].finished = true;
                        $scope.safeApply();
                    })
                }
            })
            console.log('vm.creditModal', vm.creditModal);
            vm.creditModal.on("hide.bs.modal", function (a) {
                vm.creditModal.off("hide.bs.modal");
                vm.getPlatformPlayersData();
            });
        }
        
        vm.closeCreditTransferLog = function (modal) {
            $(modal).modal('hide');
            if (vm.creditTransfer.needRefreshPlatformPlayerData) {
                vm.creditTransfer.needRefreshPlatformPlayerData = false;
                vm.advancedPlayerQuery();
                $scope.safeApply();
            }
        }

        vm.sendFixPlayerRewardAmount = function () {
            vm.fixPlayerRewardAmount.isProcessing = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'fixPlayerRewardAmount', {playerId: vm.selectedSinglePlayer.playerId}, function (data) {
                console.log('data', data);
                const textMap = {
                    fixed: 'fixed',
                    unnecessary: 'unnecessary to fix',
                }
                let showText = textMap[data.data.fixedStatus] || data.data.fixedStatus;
                $('#fixedRewardAmountResult').text($translate(showText)).fadeIn(1).fadeOut(3000);
                if (data.data.fixedStatus == 'fixed') {
                    vm.creditTransfer.showValidCredit = data.validCredit;
                    vm.selectedSinglePlayer.validCredit = data.validCredit;
                    vm.selectedSinglePlayer.lockedCredit = data.lockedCredit;
                    vm.creditTransfer.needRefreshPlatformPlayerData = true;
                }
                vm.fixPlayerRewardAmount.isProcessing = false;
                $scope.safeApply();
            }, function (err) {
                console.log('err', err);
                $('#fixedRewardAmountResult').text(err.error.message).fadeIn(1).fadeOut(3000);
                vm.fixPlayerRewardAmount.isProcessing = false;
                $scope.safeApply();
            })
        }
        vm.initPlayerReferral = function () {
            $('#playerReferralPopover').show();
            vm.playerReferral = {};
            $('body').off('click', playerReferralHandler);
            setTimeout(function () {
                $('body').on('click', playerReferralHandler);
            }, 100);
            function playerReferralHandler(event) {
                var pageClick = $(event.target).closest('#playerReferralPopover').length;//.attr('aria-controls') == 'playerReferralTbl';
                var tableClick = $(event.target).attr('aria-controls') == 'playerReferralTbl';
                if (pageClick == 1 || tableClick) {
                    return;
                }
                $('#playerReferralPopover').hide();
                $('body').off('click', playerReferralHandler);
            }

            vm.getPlayerReferrals(true);
            $('#modalplayerReferral').modal();
        }
        vm.closePlayerReferral = function () {
            $('#playerReferralPopover').hide();
        }

        vm.getPlayerReferrals = function (newSearch) {
            var sendObj = {
                platform: vm.isOneSelectedPlayer().platform,
                playerObjId: vm.isOneSelectedPlayer()._id,
                index: vm.playerReferral.index || 0,
                limit: 9999999,//vm.playerReferral.limit || 10,
                // sortObj: vm.playerReferral.sortCol
            };
            socketService.$socket($scope.AppSocket, 'getPlayerReferrals', sendObj, function (data) {
                console.log('referral data', data);
                vm.playerReferral.totalCount = data.data ? data.data.size : 0;
                var tableData = data.data ? data.data.data.map(item => {
                    item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                    item.registrationTime$ = vm.dateReformat(item.registrationTime);
                    return item;
                }) : [];
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    order: vm.playerReferral.aaSorting,
                    columnDefs: [
                        {'sortCol': 'lastAccessTime', bSortable: true, 'aTargets': [3]},
                        {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [4]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {'title': $translate('PLAYER_NAME'), data: 'name'},
                        {'title': $translate('PLAYERID'), data: 'playerId'},
                        {'title': $translate('realName'), data: 'realName', sClass: "wordWrap realNameCell"},
                        // {
                        //     'title': $translate('playerLevel'),
                        //     data: 'playerLevel.name'
                        // },
                        {'title': $translate('lastAccessTime'), data: 'lastAccessTime$'},
                        {'title': $translate('registrationTime'), data: 'registrationTime$'}
                    ],
                    paging: true,
                });
                $('#playerReferralTbl').DataTable(option);
                setTimeout(function () {
                    $('#playerReferralTbl').resize();
                }, 100);
                $scope.safeApply();
            });
        }
        vm.prepareShowPlayerCredit = function () {
            vm.creditChange = {
                finalValidAmount: $translate("Unknown"),
                finalLockedAmount: $translate("Unknown"),
                number: 0,
                remark: ''
            };
            vm.creditChange.socketStr = "createUpdatePlayerCreditProposal";
            vm.creditChange.modaltitle = "CREDIT_ADJUSTMENT";
            vm.linkedPlayerTransferId = null;
            vm.playerTransferErrorLog = null;
            socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {playerObjId: vm.isOneSelectedPlayer()._id}, function (data) {
                vm.playerTransferErrorLog = data.data.map(item => {
                        item.createTimeText = vm.dateReformat(item.createTime);
                        item.typeText = $translate(item.type);
                        item.providerText = vm.getProviderText(item.providerId);
                        return item;
                    }) || [];
                console.log('errData', JSON.stringify(vm.playerTransferErrorLog));
                $scope.safeApply();

                for (var i = 0; i < vm.playerTransferErrorLog.length; i++) {
                    vm.playerTransferErrorLog[i].amount = parseFloat(vm.playerTransferErrorLog[i].amount).toFixed(2);
                    vm.playerTransferErrorLog[i].lockedAmount = parseFloat(vm.playerTransferErrorLog[i].lockedAmount).toFixed(2);
                }

                var newTblOption = $.extend({}, vm.generalDataTableOptions, {
                    data: vm.playerTransferErrorLog,
                    columns: [
                        {title: $translate("CREATETIME"), data: 'createTimeText'},
                        {title: $translate("TRANSFER") + " ID", data: 'transferId'},
                        {title: $translate("CREDIT"), data: 'amount'},
                        {title: $translate("provider"), data: 'providerText'},
                        {title: $translate("amount"), data: 'amount'},
                        {title: $translate("LOCKED_CREDIT"), data: 'lockedAmount'},
                        {title: $translate("TYPE"), data: 'typeText'},
                        {
                            title: $translate("STATUS"),
                            render: function (data, type, row) {
                                return (row.status == 1 ? $translate("SUCCESS") : row.status == 2 ? $translate("FAIL") : $translate("REQUEST"));
                            }
                        }
                    ]
                })
                var table = $('#playerCreditAdjustTbl').DataTable(newTblOption);
                $('#playerCreditAdjustTbl tbody').off('click', "**");
                $('#playerCreditAdjustTbl tbody').on('click', 'tr', function () {
                    if ($(this).hasClass('selected')) {
                        $(this).removeClass('selected');
                        vm.linkedPlayerTransferId = null;
                        $scope.safeApply();
                    } else {
                        table.$('tr.selected').removeClass('selected');
                        $(this).addClass('selected');
                        var record = table.row(this).data();
                        socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {playerObjId: record.playerObjId}, function (data) {
                            var playerTransfer;
                            data.data.forEach(function (playerTransLog) {
                                if (playerTransLog._id == record._id) {
                                    playerTransfer = playerTransLog
                                }
                            })

                            vm.linkedPlayerTransferId = playerTransfer._id;
                            let finalValidAmount = parseFloat(playerTransfer.amount - playerTransfer.lockedAmount + vm.selectedSinglePlayer.validCredit).toFixed(2);
                            let finalLockedAmount = parseFloat(playerTransfer.lockedAmount).toFixed(2);
                            // added negative value handling to address credit transfer out issue
                            vm.creditChange.finalValidAmount = finalValidAmount < 0 ? parseFloat(vm.selectedSinglePlayer.validCredit).toFixed(2) : finalValidAmount;
                            vm.creditChange.finalLockedAmount = finalLockedAmount < 0 ? parseFloat(vm.selectedSinglePlayer.lockedCredit).toFixed(2) : finalLockedAmount;
                            $scope.safeApply();
                        });
                    }

                })
                $('#playerCreditAdjustTbl').resize();
                $('#playerCreditAdjustTbl').resize();
                table.columns.adjust().draw();
            });
        };
        vm.prepareShowPlayerCreditAdjustment = function (type) {
            vm.creditChange = {
                finalValidAmount: vm.isOneSelectedPlayer().validCredit,
                finalLockedAmount: null,
                remark: '',
                updateAmount: 0
            };
            vm.linkedPlayerTransferId = null;
            vm.playerTransferErrorLog = null;
            if (type == "adjust") {
                vm.creditChange.socketStr = "createUpdatePlayerCreditProposal";
                vm.creditChange.modaltitle = "CREDIT_ADJUSTMENT";
            } else if (type == "returnFix") {
                vm.creditChange.socketStr = "createReturnFixProposal";
                vm.creditChange.modaltitle = "ConsumptionReturnFix";
            }
        };

        vm.prepareModifyPlayerGamePassword = () => {
            vm.playerModifyGamePassword = {};
            vm.playerModifyGamePassword.resMsg = "";
            vm.getPlatformGameData();
        };

        vm.updatePlayerCredit = function () {
            var sendData = {
                platformId: vm.selectedPlatform.id,
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                data: {
                    playerObjId: vm.isOneSelectedPlayer()._id,
                    playerName: vm.isOneSelectedPlayer().name,
                    updateAmount: vm.creditChange.updateAmount,
                    curAmount: vm.isOneSelectedPlayer().validCredit,
                    realName: vm.isOneSelectedPlayer().realName,
                    remark: vm.creditChange.remark,
                    adminName: authService.adminName
                }
            }

            socketService.$socket($scope.AppSocket, vm.creditChange.socketStr, sendData, function (data) {
                var newData = data.data;
                console.log('credit proposal', newData);
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPlayersData();
                $scope.safeApply();
            });

        };
        vm.repairTransaction = function () {
            socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {playerObjId: vm.isOneSelectedPlayer()._id}
                , function (pData) {
                    let playerTransfer = {};
                    pData.data.forEach(function (playerTransLog) {
                        if (playerTransLog._id == vm.linkedPlayerTransferId) {
                            playerTransfer = playerTransLog
                        }
                    });

                    let updateAmount = playerTransfer.amount - playerTransfer.lockedAmount;

                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                        data: {
                            playerObjId: playerTransfer.playerObjId,
                            playerName: playerTransfer.playerName,
                            updateAmount: updateAmount < 0 ? 0 : updateAmount,
                            curAmount: vm.isOneSelectedPlayer().validCredit,
                            realName: vm.isOneSelectedPlayer().realName,
                            remark: vm.creditChange.remark,
                            adminName: authService.adminName
                        }
                    }
                    if (vm.linkedPlayerTransferId) {
                        sendData.data.transferId = playerTransfer.transferId;
                        //if reward task is still there fix locked amount otherwise fix valid amount
                        if (vm.isOneSelectedPlayer().rewardInfo && vm.isOneSelectedPlayer().rewardInfo.length > 0) {
                            sendData.data.updateLockedAmount = playerTransfer.lockedAmount < 0 ? 0 : playerTransfer.lockedAmount;
                            sendData.data.curLockedAmount = vm.isOneSelectedPlayer().lockedCredit;
                        }
                        else {
                            sendData.data.updateAmount += playerTransfer.lockedAmount < 0 ? 0 : playerTransfer.lockedAmount;
                        }

                        vm.creditChange.socketStr = "createFixPlayerCreditTransferProposal";
                    }

                    console.log('repairTransaction', sendData);
                    socketService.$socket($scope.AppSocket, vm.creditChange.socketStr, sendData, function (data) {
                        var newData = data.data;
                        console.log('credit proposal', newData);
                        if (data.data && data.data.stepInfo) {
                            socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                        }
                        vm.getPlatformPlayersData();
                        $scope.safeApply();
                    });
                });
        };

        //
        vm.modifyGamePassword = () => {
            let sendObj = {
                playerId: vm.isOneSelectedPlayer().playerId,
                providerId: vm.playerModifyGamePassword.provider,
                newPassword: vm.playerModifyGamePassword.newPassword
            };

            socketService.$socket($scope.AppSocket, 'modifyGamePassword', sendObj, data => {
                vm.playerModifyGamePassword.resMsg = $translate('SUCCESS');
            });
        };

        // vm.showPlayerTopupModal = function (row) {
        //     return vm.prepareShowPlayerTopup(row._id);
        // }

        vm.prepareShowPagePlayerTopup = function (startTime) {
            vm.playerTopUpLog = {};
            vm.playerTopupRecordForModal = {
                validAmount: 0,
                amount: 0,
                bonusAmount: 0,
            };
            vm.drawPlayerTopupRecordsTable([], 0, true, {});
            $('#modalPlayerTopUp').modal().show();
            utilService.actionAfterLoaded("#modalPlayerTopUp.in #playerTopUp .endTime", function () {
                vm.playerTopUpLog.startTime = utilService.createDatePicker('#playerTopUp .startTime');
                vm.playerTopUpLog.endTime = utilService.createDatePicker('#playerTopUp .endTime');
                if (startTime) {
                    vm.playerTopUpLog.startTime.data('datetimepicker').setDate(new Date(startTime));
                } else {
                    vm.playerTopUpLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                }
                vm.playerTopUpLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.getPagePlayerTopup(true);
            });
            utilService.actionAfterLoaded("#playerTopupRecordTablePage", function () {
                vm.playerTopUpLog.pageObj = utilService.createPageForPagingTable("#playerTopupRecordTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerTopUpLog", vm.getPagePlayerTopup)
                });
            })
        }
        vm.getPagePlayerTopup = function (newSearch) {
            var sendObj = {
                playerId: vm.isOneSelectedPlayer()._id,
                startTime: vm.playerTopUpLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerTopUpLog.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.playerTopUpLog.index,
                limit: newSearch ? 10 : vm.playerTopUpLog.limit,
                sortCol: vm.playerTopUpLog.sortCol || undefined
            }

            socketService.$socket($scope.AppSocket, 'getPagePlayerTopUpRecords', sendObj, function (data) {
                console.log('getPage', data);
                vm.playerAllTopupRecords = data.data ? data.data.data : [];
                vm.playerTopUpLog.totalCount = data.data ? data.data.total : 0;
                console.log('topups:length:', vm.playerAllTopupRecords.length);
                var summary = data.data.summary || {};
                vm.drawPlayerTopupRecordsTable(vm.playerAllTopupRecords, vm.playerTopUpLog.totalCount, newSearch, summary);
            });
        }
        vm.drawPlayerTopupRecordsTable = function (data, count, newSearch, summary) {
            var tableData = data.map(item => {
                item.date$ = vm.dateReformat(item.createTime);
                item.settleTime$ = vm.dateReformat(item.settlementTime);
                item.amount$ = item.amount ? item.amount.toFixed(2) : 0;
                item.type$ = item.topUpType ? $translate(vm.topUpTypeList[item.topUpType]) : $translate("Unknown")
                return item;
            })
            var tableOption = $.extend(true, {}, vm.generalDataTableOptions, {
                data: tableData,
                "order": vm.playerTopUpLog.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'topUpType', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'amount', bSortable: true, 'aTargets': [4]},

                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ], columns: [
                    {title: $translate("CREATION_TIME"), data: "date$"},
                    {title: $translate("TOP_UP_TYPE"), data: "type$"},
                    {title: $translate("PROPOSAL_ID"), data: "proposalId"},
                    {title: $translate("SETTLEMENT") + $translate("TIME"), data: "settleTime$", sClass: 'sumText'},
                    {title: $translate("CREDIT"), data: "amount$", sClass: 'alignRight sumFloat'}
                ],
                paging: false
            });

            vm.playerTopupRecordForModal.amount = summary.amountSum;
            vm.playerTopupRecordForModal.validAmount = summary.validAmount;
            vm.playerTopupRecordForModal.bonusAmount = summary.bonusAmount;

            var aTable = utilService.createDatatableWithFooter("#playerTopupRecordTable", tableOption, {
                4: summary.amountSum
            });
            vm.playerTopUpLog.pageObj ? vm.playerTopUpLog.pageObj.init({maxCount: count}, newSearch) : '';
            $("#playerTopupRecordTable").off('order.dt');
            $("#playerTopupRecordTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerTopUpLog', vm.getPagePlayerTopup);
            });
            // aTable.columns.adjust().draw();
            $("#playerTopupRecordTable").resize();
            $scope.safeApply();
        }
        // vm.prepareShowPlayerTopup = function (playerId, startTime) {
        //
        //     var queryObj = {playerId: playerId || vm.isOneSelectedPlayer()._id}
        //     vm.initQueryTimeFilter('playerTopUp', function () {
        //         vm.queryPara.playerTopUp.limit = '50';
        //         if (startTime) {
        //             vm.queryPara.playerTopUp.startTime.data('datetimepicker').setLocalDate(new Date(startTime));
        //             queryObj.startTime = new Date(startTime);
        //             queryObj.endTime = new Date();
        //         }
        //         vm.prepareShowPlayerTopupRecords(queryObj);
        //         $scope.safeApply();
        //     });
        // }

        // vm.prepareShowPlayerTopupRecords = function (query, isQuery) {
        //
        //     vm.playerAllTopupRecords = null;
        //     console.log("playerTopUp:query", query);
        //     socketService.$socket($scope.AppSocket, 'getPlayerTopUpRecords', query, function (data) {
        //
        //         vm.playerAllTopupRecords = data.data;
        //         console.log('topups:length:', vm.playerAllTopupRecords.length);
        //         vm.playerTopUpLog = {totalCount: vm.playerAllTopupRecords.length};
        //         vm.playerTopupRecordForModal = {
        //             validAmount: 0,
        //             amount: 0,
        //             bonusAmount: 0,
        //         };
        //
        //         vm.playerAllTopupRecords.forEach(
        //             record => {
        //                 vm.playerTopupRecordForModal.validAmount += Number(record.validAmount);
        //                 vm.playerTopupRecordForModal.amount += Number(record.amount);
        //                 vm.playerTopupRecordForModal.bonusAmount += Number(record.bonusAmount);
        //             }
        //         );
        //         $scope.safeApply();
        //         // if (vm.playerAllTopupRecords.length > 0) {
        //         //     vm.processDataTableinModal('#modalPlayerTopUp', '#playerTopupRecordTable');
        //         // }
        //         ////
        //         vm.drawPlayerTopupRecordsTable(vm.playerAllTopupRecords, count, true, summary);
        //         vm.drawPlayerTopupRecordsTable(vm.playerAllTopupRecords, vm.playerTopUpLog.totalCount, newSearch, summary);
        //         //////
        //         if (isQuery) {
        //             vm.updateDataTableinModal('#modalPlayerTopUp', '#playerTopupRecordTable');
        //         }
        //         else {
        //             vm.processDataTableinModal('#modalPlayerTopUp', '#playerTopupRecordTable');
        //         }
        //     });
        // };
        vm.initPlayerApplyReward = function () {
            vm.playerApplyRewardPara = {};
            vm.playerApplyRewardShow = {};
            vm.playerApplyEventResult = null;
            $('#modalPlayerApplyReward').modal();
            $('#modalPlayerApplyReward').on('shown.bs.modal', function () {
                $('#modalPlayerApplyReward').off('shown.bs.modal');
                $scope.rewardObj = vm.allRewardEvent[0];
                vm.playerApplyRewardCodeChange(vm.playerApplyRewardPara);
            });
        }
        vm.getPlayerTopupRecord = function (playerId, rewardObj) {
            socketService.$socket($scope.AppSocket, 'getValidTopUpRecordList', {
                playerId: playerId || vm.isOneSelectedPlayer().playerId,
                playerObjId: vm.isOneSelectedPlayer()._id,
                filterDirty: true,
                reward: rewardObj
            }, function (data) {
                vm.playerAllTopupRecords = data.data;
                console.log('topups', data.data);
                $scope.safeApply();
            });
        }

        vm.playerApplyRewardCodeChange = function (obj) {
            console.log('received', obj);
            vm.playerApplyEventResult = null;
            if (!obj)return;
            let rewardObj = angular.fromJson(obj);
            if (!rewardObj)return;
            vm.playerApplyRewardPara.code = rewardObj.code;
            let type = rewardObj.type ? rewardObj.type.name : null;

            if (type == 'FirstTopUp') {
                vm.playerApplyRewardShow.selectTopupRecordsMulti = true;
                vm.playerApplyRewardShow.topUpRecordIds = {};
            } else {
                vm.playerApplyRewardShow.selectTopupRecordsMulti = false;
                vm.playerApplyRewardShow.topUpRecordIds = {};
            }

            if (type == "FirstTopUp" || type == "PlayerTopUpReturn" || type == "PartnerTopUpReturn" || type == "PlayerDoubleTopUpReward") {
                vm.playerApplyRewardShow.TopupRecordSelect = true;
                vm.playerAllTopupRecords = null;
                vm.getPlayerTopupRecord(null, rewardObj);
            } else {
                vm.playerApplyRewardShow.TopupRecordSelect = false;
            }

            vm.playerApplyRewardShow.AmountInput = type == "GameProviderReward";
            vm.playerApplyRewardShow.showReferral = type == "PlayerReferralReward"

            // PlayerConsumptionReturn
            vm.playerApplyRewardShow.showConsumptionReturn = type == "PlayerConsumptionReturn";
            vm.playerApplyRewardShow.consumptionReturnData = {};
            if (type == "PlayerConsumptionReturn") {
                socketService.$socket($scope.AppSocket, 'getConsumeRebateAmount', {playerId: vm.isOneSelectedPlayer().playerId}, function (data) {
                    console.log('getConsumeRebateAmount', data);
                    vm.playerApplyRewardShow.showRewardAmount = parseFloat(data.data.totalAmount).toFixed(2);
                    vm.playerApplyRewardShow.consumptionReturnData = data.data;
                    delete vm.playerApplyRewardShow.consumptionReturnData.totalAmount;
                    delete vm.playerApplyRewardShow.consumptionReturnData.totalConsumptionAmount;
                    //$translate(vm.allGameTypes[record.gameType] || 'Unknown');
                    for (var key in vm.playerApplyRewardShow.consumptionReturnData) {
                        vm.playerApplyRewardShow.consumptionReturnData[key].consumptionAmount = parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].consumptionAmount).toFixed(2);
                        vm.playerApplyRewardShow.consumptionReturnData[key].returnAmount = parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].returnAmount).toFixed(2);
                        vm.playerApplyRewardShow.consumptionReturnData[key].ratio = parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].ratio).toFixed(4);
                        vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')] = vm.playerApplyRewardShow.consumptionReturnData[key];
                        delete vm.playerApplyRewardShow.consumptionReturnData[key];
                    }
                    $scope.safeApply();
                }, function (err) {
                    console.log(err);
                    vm.playerApplyRewardShow.showRewardAmount = 'Error';
                    $scope.safeApply();
                });
            }

            // PlayerConsecutiveLoginReward
            vm.playerApplyRewardShow.manualSignConsecutiveLogin = type == "PlayerConsecutiveLoginReward";

            $scope.safeApply();
        };

        vm.applyPlayerReward = function () {
            let idArr = [];
            if (vm.playerApplyRewardShow.topUpRecordIds) {
                $.each(vm.playerApplyRewardShow.topUpRecordIds, function (i, v) {
                    if (v) {
                        idArr.push(i);
                    }
                })
            }
            let sendQuery = {
                code: vm.playerApplyRewardPara.code,
                playerId: vm.isOneSelectedPlayer().playerId,
                data: {
                    topUpRecordId: vm.playerApplyRewardPara.topUpRecordId,
                    topUpRecordIds: idArr,
                    amount: vm.playerApplyRewardPara.amount,
                    referralName: vm.playerApplyRewardPara.referralName
                }
            };
            socketService.$socket($scope.AppSocket, 'applyRewardEvent', sendQuery, function (data) {
                console.log('sent', data);
                vm.playerApplyEventResult = data;
                vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (err) {
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.safeApply();
            });
        };

        vm.applyPreviousConsecutiveLoginReward = function () {
            let sendQuery = {
                code: vm.playerApplyRewardPara.code,
                playerId: vm.isOneSelectedPlayer().playerId
            };
            socketService.$socket($scope.AppSocket, 'applyPreviousConsecutiveLoginReward', sendQuery, function (data) {
                console.log('sent', data);
                vm.playerApplyEventResult = data;
                vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (err) {
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.safeApply();
            });
        };

        vm.initPlayerAddRewardTask = function () {
            vm.playerAddRewadTask = {
                showSubmit: true
            };
            $('#modalPlayerAddRewardTask').modal();
        }

        vm.submitAddPlayerRewardTask = function () {
            vm.playerAddRewadTask.showSubmit = false;
            let providerArr = [];
            for (let key in vm.playerAddRewadTask.provider) {
                if (vm.playerAddRewadTask.provider[key]) {
                    providerArr.push(key);
                }
            }
            let sendObj = {
                targetProviders: providerArr,
                type: vm.playerAddRewadTask.type,
                rewardType: vm.playerAddRewadTask.type,
                platformId: vm.selectedSinglePlayer.platform,
                playerId: vm.selectedSinglePlayer._id,
                playerObjId: vm.selectedSinglePlayer._id,
                playerName: vm.selectedSinglePlayer.name,
                requiredUnlockAmount: vm.playerAddRewadTask.requiredUnlockAmount,
                currentAmount: vm.playerAddRewadTask.currentAmount,
                amount: vm.playerAddRewadTask.currentAmount,
                initAmount: vm.playerAddRewadTask.currentAmount,
                useConsumption: Boolean(vm.playerAddRewadTask.useConsumption),
                remark: vm.playerAddRewadTask.remark,
            }
            console.log('sendObj', sendObj);
            socketService.$socket($scope.AppSocket, 'createPlayerRewardTask', sendObj, function (data) {
                vm.playerAddRewadTask.resMsg = $translate('SUCCESS');
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                $scope.safeApply();
            }, function (err) {
                vm.playerAddRewadTask.resMsg = err.error.message || $translate('FAIL');
                $scope.safeApply();
            })
        };

        vm.initManualUnlockRewardTask = function () {
            vm.manualUnlockRewardTask = {
                resMsg: $translate("Reward task is not available")
            };
            vm.manualUnlockRewardTaskIndexList = [0];
            vm.getRewardTaskDetail(vm.selectedSinglePlayer._id).then(function (data) {
                if (data) {
                    vm.manualUnlockRewardTask.resMsg = "";
                }
            });
            $('#modalManualUnlockRewardTask').modal();
            $scope.safeApply();
        };

        vm.updateManualUnlockRewardTaskIndexList = function (index, checked) {
            if (checked) {
                vm.manualUnlockRewardTaskIndexList.push(index);
            } else {
                vm.manualUnlockRewardTaskIndexList.splice(vm.manualUnlockRewardTaskIndexList.indexOf(index), 1);
            }
        };

        vm.submitManualUnlockRewardTask = function () {
            if (!vm.manualUnlockRewardTaskIndexList) {
                vm.manualUnlockRewardTask.resMsg = "No reward tasks are selected to unlock.";
                $scope.safeApply();
                return;
            }

            let updateStatus = function updateStatus() {
                vm.manualUnlockRewardTask.resMsg =
                    taskCount == vm.manualUnlockRewardTaskIndexList.length ?
                        numberOfRewardUnlocked == vm.manualUnlockRewardTaskIndexList.length ?
                            $translate('Submitted proposal for approval') :
                            $translate('FAIL')
                        : "";

                $scope.safeApply();
            };
            let numberOfRewardUnlocked = 0, taskCount = 0;
            vm.manualUnlockRewardTaskIndexList.forEach(function(index){
                taskCount++;
                socketService.$socket($scope.AppSocket, 'manualUnlockRewardTask', [vm.curRewardTask[index], vm.selectedSinglePlayer], function (data) {
                    console.log("Proposal to unlock reward " + vm.curRewardTask[index]._id + " is submitted for approval.");
                    numberOfRewardUnlocked++;
                    updateStatus();
                }, function (err) {
                    if (err.error.message) {
                        console.log("Proposal to unlock reward " + vm.curRewardTask[index]._id + " failed to submit, error: " + err.error.message);
                    } else {
                        console.log("Proposal to unlock reward " + vm.curRewardTask[index]._id + " failed to submit.");
                    }
                    updateStatus();
                });
            });
        };

        vm.prepareShowPlayerExpense = function () {
            vm.playerExpenseLog = {totalCount: 0};
            vm.initQueryTimeFilter('playerExpense', function () {
                $('#modalPlayerExpenses').modal();
                vm.playerExpenseLog.pageObj = utilService.createPageForPagingTable("#playerExpenseTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerExpenseLog", vm.getPlayerExpenseByFilter)
                });
                vm.getPlayerExpenseByFilter(true);
            });
        }
        vm.getPlayerExpenseByFilter = function (newSearch) {
            var sendData = {
                startTime: vm.queryPara.playerExpense.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerExpense.endTime.data('datetimepicker').getLocalDate(),
                playerId: vm.isOneSelectedPlayer()._id,
                index: newSearch ? 0 : (vm.playerExpenseLog.index || 0),
                limit: newSearch ? 10 : (vm.playerExpenseLog.limit || 10),
                sortCol: vm.playerExpenseLog.sortCol || null
            };
            if (vm.queryPara.playerExpense.dirty == 'Y') {
                sendData.dirty = true;
            } else if (vm.queryPara.playerExpense.dirty == 'N') {
                sendData.dirty = false;
            }
            if (vm.queryPara.playerExpense.providerId) {
                sendData.providerId = vm.queryPara.playerExpense.providerId
            }
            if (vm.queryPara.playerExpense.gameName) {
                sendData.gameName = vm.queryPara.playerExpense.gameName;
            }
            vm.playerExpenseLog.loading = true;
            console.log("Query", sendData);
            vm.prepareShowPlayerExpenseRecords(sendData, newSearch);
            $("#playerExpenseTable").off('order.dt');
            $("#playerExpenseTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerExpenseLog', vm.getPlayerExpenseByFilter);
            });
        }

        vm.prepareShowPlayerExpenseRecords = function (queryData, newSearch) {
            vm.playerAllExpenseRecords = [];
            socketService.$socket($scope.AppSocket, 'getPlayerConsumptionRecords', queryData, function (data) {
                vm.playerAllExpenseRecords = data.data.data;
                vm.playerExpenseLog.totalCount = data.data.size;
                var summary = data.data.summary || {};
                vm.playerExpenseLog.loading = false;
                console.log('consumption record', data);
                var validAmount = 0;
                var amount = 0;
                var bonusAmount = 0;
                var tableData = vm.playerAllExpenseRecords.map(
                    record => {
                        validAmount += Number(record.validAmount);
                        amount += Number(record.amount);
                        bonusAmount += Number(record.bonusAmount);
                        record.createTime$ = vm.dateReformat(record.createTime);
                        // record.gameType$ = $translate(vm.allGameTypes[record.gameType] || 'Unknown');
                        record.validAmount$ = parseFloat(record.validAmount).toFixed(2);
                        record.amount$ = parseFloat(record.amount).toFixed(2);
                        record.bonusAmount$ = parseFloat(record.bonusAmount).toFixed(2);
                        record.commissionAmount$ = parseFloat(record.commissionAmount).toFixed(2);
                        record.bDirty$ = record.bDirty ? $translate('Yes') : $translate('No');
                        return record
                    }
                );
                vm.totalConsumptionAmount = parseFloat(amount).toFixed(2);
                vm.totalConsumptionValidAmount = parseFloat(validAmount).toFixed(2);
                vm.totalConsumptionBonusAmount = parseFloat(bonusAmount).toFixed(2);
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    "aaSorting": vm.playerExpenseLog.aaSorting || [[1, 'desc']],
                    aoColumnDefs: [
                        {'sortCol': 'orderNo', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'providerId', bSortable: true, 'aTargets': [2]},
                        {'sortCol': 'gameId', bSortable: true, 'aTargets': [3]},
                        // {'sortCol': 'gameType', bSortable: true, 'aTargets': [4]},
                        // {'sortCol': 'roundNo', bSortable: true, 'aTargets': [4]},
                        {'sortCol': 'validAmount', bSortable: true, 'aTargets': [4]},
                        {'sortCol': 'amount', bSortable: true, 'aTargets': [5]},
                        {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [6]},
                        // {'sortCol': 'commissionAmount', bSortable: true, 'aTargets': [8]},
                        // {'sortCol': 'rewardAmount', bSortable: true, 'aTargets': [7]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],

                    columns: [
                        {title: $translate('orderId'), data: "orderNo"},
                        {title: $translate('CREATION_TIME'), data: "createTime$"},
                        {title: $translate('PROVIDER'), data: "providerId.name"},
                        {title: $translate('GAME_TITLE'), data: "gameId.name", sClass: 'sumText'},
                        // {title: $translate('GAME_TYPE'), data: "gameType$", sClass: 'sumText'},
                        // {title: $translate('Game Round'), data: "roundNo", sClass: 'sumText'},
                        {title: $translate('VALID_AMOUNT'), data: "validAmount$", sClass: 'alignRight sumFloat'},
                        {title: $translate('CREDIT'), data: "amount$", bSortable: true, sClass: 'alignRight sumFloat'},
                        {
                            title: $translate('bonusAmount1'),
                            data: "bonusAmount$", sClass: 'alignRight sumFloat'
                        },
                        {title: $translate('Occupy'), data: "bDirty$"},
                        // {
                        //     title: $translate('commissionAmount'),
                        //     data: "commissionAmount$",
                        //     sClass: "alignRight sumFloat"
                        // },
                    ],
                    destroy: true,
                    paging: false,
                    autoWidth: true
                });
                // $('#playerExpenseTable').DataTable(option);
                var a = utilService.createDatatableWithFooter('#playerExpenseTable', option, {
                    4: summary.validAmountSum,
                    5: summary.amountSum,
                    6: summary.bonusAmountSum,
                    // 8: summary.commissionAmountSum
                });
                vm.playerExpenseLog.pageObj.init({maxCount: vm.playerExpenseLog.totalCount}, newSearch);
                setTimeout(function () {
                    $('#playerExpenseTable').resize();
                }, 300);
                $scope.safeApply();
            });
        };


        // daily player expense
        vm.prepareShowPlayerDailyExpense = function () {
            vm.playerDailyExpenseLog = {totalCount: 0};
            vm.initQueryTimeFilter('playerDailyExpense', function () {
                $('#modalPlayerDailyExpenses').modal();
                vm.playerDailyExpenseLog.pageObj = utilService.createPageForPagingTable("#playerDailyExpenseTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerDailyExpenseLog", vm.getPlayerDailyExpenseByFilter)
                });
                vm.getPlayerDailyExpenseByFilter(true);
            });
        }
        vm.getPlayerDailyExpenseByFilter = function (newSearch) {
            var sendData = {
                startTime: vm.queryPara.playerDailyExpense.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerDailyExpense.endTime.data('datetimepicker').getLocalDate(),
                playerId: vm.isOneSelectedPlayer()._id,
                index: newSearch ? 0 : (vm.playerDailyExpenseLog.index || 0),
                limit: newSearch ? 10 : (vm.playerDailyExpenseLog.limit || 10),
                sortCol: vm.playerDailyExpenseLog.sortCol || null
            };
            if (vm.queryPara.playerDailyExpense.dirty == 'Y') {
                sendData.dirty = true;
            } else if (vm.queryPara.playerDailyExpense.dirty == 'N') {
                sendData.dirty = false;
            }
            if (vm.queryPara.playerDailyExpense.providerId) {
                sendData.providerId = vm.queryPara.playerDailyExpense.providerId
            }
            vm.playerDailyExpenseLog.loading = true;
            console.log("Query", sendData);
            vm.prepareShowPlayerDailyExpenseRecords(sendData, newSearch);
            $("#playerDailyExpenseTable").off('order.dt');
            $("#playerDailyExpenseTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerDailyExpenseLog', vm.getPlayerDailyExpenseByFilter);
            });
        }


        vm.prepareShowRepairPayment = function (modalID) {

            vm.repairProposalId = null;
            vm.submitRepairePayementStep = 0;
            vm.processDataTableinModal(modalID, '#playerRepairPaymentTbl', null, function () {
                var queryData = {
                    playerId: vm.isOneSelectedPlayer()._id,
                    platformId: vm.selectedPlatform.data._id
                }
                socketService.$socket($scope.AppSocket, 'getPlayerPendingPaymentProposal', queryData, function (data) {
                    vm.allPendingRequest = data.data ? data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        item.merchantUseType$ = item.data.merchantUseType ? $scope.merchantUseTypeJson[item.data.merchantUseType] : "NULL";
                        item.topupType$ = item.data.topupType ? $scope.merchantTopupTypeJson[item.data.topupType] : "NULL";
                        return item;
                    }) : [];
                    $scope.safeApply();
                    vm.updateDataTableinModal(modalID, '#playerRepairPaymentTbl', null, function (tbl) {
                        $('#playerRepairPaymentTbl tbody').on('click', 'tr', function () {
                            if ($(this).hasClass('selected')) {
                                $(this).removeClass('selected');
                                vm.repairProposalId = null;
                            } else {
                                tbl.$('tr.selected').removeClass('selected');
                                $(this).addClass('selected');
                                vm.repairProposalId = tbl.row(this).data()[1]
                            }
                            $scope.safeApply();
                        });
                    });
                });
            });
        }
        vm.prepareShowPlayerDailyExpenseRecords = function (queryData, newSearch) {
            vm.playerDailyExpenseRecords = [];
            socketService.$socket($scope.AppSocket, 'getGameProviderPlayerDaySummary', queryData, function (data) {
                vm.playerDailyExpenseRecords = data.data.data;
                vm.playerDailyExpenseLog.totalCount = data.data.size;
                var summary = data.data.summary || {};
                vm.playerDailyExpenseLog.loading = false;
                console.log('consumption record', data);
                var validAmount = 0;
                var amount = 0;
                var bonusAmount = 0;
                var tableData = vm.playerDailyExpenseRecords.map(
                    record => {
                        validAmount += Number(record.validAmount);
                        amount += Number(record.amount);
                        bonusAmount += Number(record.bonusAmount);
                        record.date = vm.dateReformat(record.date);
                        // record.gameType$ = $translate(vm.allGameTypes[record.gameType] || 'Unknown');
                        record.validAmount$ = parseFloat(record.validAmount).toFixed(2);
                        record.amount$ = parseFloat(record.amount).toFixed(2);
                        record.bonusAmount$ = parseFloat(record.bonusAmount).toFixed(2);
                        record.commissionAmount$ = parseFloat(record.commissionAmount).toFixed(2);
                        record.bDirty$ = record.bDirty ? $translate('Yes') : $translate('No');
                        return record
                    }
                );
                vm.totalConsumptionAmount = parseFloat(amount).toFixed(2);
                vm.totalConsumptionValidAmount = parseFloat(validAmount).toFixed(2);
                vm.totalConsumptionBonusAmount = parseFloat(bonusAmount).toFixed(2);
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    "aaSorting": vm.playerDailyExpenseLog.aaSorting || [[1, 'desc']],
                    aoColumnDefs: [
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'providerId', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'gameId', bSortable: true, 'aTargets': [2]},
                        // {'sortCol': 'gameType', bSortable: true, 'aTargets': [4]},
                        // {'sortCol': 'roundNo', bSortable: true, 'aTargets': [4]},
                        {'sortCol': 'validAmount', bSortable: true, 'aTargets': [3]},
                        {'sortCol': 'amount', bSortable: true, 'aTargets': [4]},
                        {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [5]},
                        // {'sortCol': 'commissionAmount', bSortable: true, 'aTargets': [8]},
                        // {'sortCol': 'rewardAmount', bSortable: true, 'aTargets': [7]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],

                    columns: [
                        {title: $translate('CREATION_TIME'), data: "date"},
                        {title: $translate('PROVIDER'), data: "providerId.name"},
                        {title: $translate('GAME_TITLE'), data: "gameId.name", sClass: 'sumText'},
                        // {title: $translate('GAME_TYPE'), data: "gameType$", sClass: 'sumText'},
                        // {title: $translate('Game Round'), data: "roundNo", sClass: 'sumText'},
                        {title: $translate('VALID_AMOUNT'), data: "validAmount$", sClass: 'alignRight sumFloat'},
                        {title: $translate('CREDIT'), data: "amount$", bSortable: true, sClass: 'alignRight sumFloat'},
                        {
                            title: $translate('bonusAmount1'),
                            data: "bonusAmount$", sClass: 'alignRight sumFloat'
                        },
                        {title: $translate('Occupy'), data: "bDirty$"},
                        // {
                        //     title: $translate('commissionAmount'),
                        //     data: "commissionAmount$",
                        //     sClass: "alignRight sumFloat"
                        // },
                    ],
                    destroy: true,
                    paging: false,
                    autoWidth: true,
                    initComplete: function () {
                        $scope.safeApply();
                    }
                });
                // $('#playerExpenseTable').DataTable(option);
                var a = utilService.createDatatableWithFooter('#playerDailyExpenseTable', option, {
                    3: summary.validAmountSum,
                    4: summary.amountSum,
                    5: summary.bonusAmountSum,
                    // 8: summary.commissionAmountSum
                });
                vm.playerDailyExpenseLog.pageObj.init({maxCount: vm.playerDailyExpenseLog.totalCount}, newSearch);
                setTimeout(function () {
                    $('#playerDailyExpenseTable').resize();
                }, 500);


            });
        };




        vm.submitRepairPayment = function () {
            vm.submitRepairePayementStep = 1;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'submitRepairPaymentProposal', {proposalId: vm.repairProposalId}, function (data) {
                vm.submitRepairePayementStep = 2;
                vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (error) {
                vm.submitRepairePayementStep = 3;
                vm.getPlatformPlayersData();
                $scope.safeApply();
            })
        }

        vm.processDataTableinModal = function (modalID, tableID, option, callback) {
            //modalID=#modalPlayerExpenses
            //tableID=#playerExpenseTable
            //when creating datatable in a modal, need manually show the modal instead of using data-target
            function clearExistDatatable(callback) {
                $(modalID + ' ' + tableID + '_wrapper').each(function (i, v) {
                    $(v).remove();
                })
                thisTable = '';
                if (callback) {
                    callback();
                }
            }

            var thisTable = '';
            $(modalID).on('shown.bs.modal', function () {
                $(modalID).off('shown.bs.modal');
                $scope.safeApply();
                var $table = $(tableID);
                if ($table) {
                    $table.show();
                    var temp = $table.clone().insertAfter($table);
                    clearExistDatatable(function () {
                        var newTblOption = $.extend({}, vm.generalDataTableOptions, option)
                        thisTable = temp.DataTable(newTblOption);
                        $table.hide();
                        if (thisTable) {
                            thisTable.columns.adjust().draw();
                        }
                        if (callback) {
                            callback();
                        }
                    })
                }
            });
            $(modalID).on('hidden.bs.modal', function () {
                $(modalID).off('hidden.bs.modal');
                clearExistDatatable();
            });
            $(modalID).modal().show();
        }

        vm.updateDataTableinModal = function (modalID, tableID, opt, callback) {
            var thisTable = '';
            var tblOptions = $.extend(true, {}, vm.generalDataTableOptions, opt);
            $scope.safeApply();
            var $table = $(tableID);
            $(modalID + ' ' + tableID + '_wrapper').each(function (i, v) {
                $(v).remove();
            })
            if ($table) {
                var temp = $table.clone().insertAfter($table).show();
                thisTable = temp.DataTable(tblOptions);
                if (thisTable) {
                    thisTable.columns.adjust().draw();
                }
                if (callback) {
                    callback(thisTable);
                }
            }
        };
        // vm.preparePlayerFeedback = function () {
        //     socketService.$socket($scope.AppSocket, 'getPlayerFeedbackResults', {}, function (data) {
        //         vm.allPlayerFeedbackString = data.data;
        //         console.log('allfeedback', data);
        //         $scope.safeApply();
        //     });
        // };

        vm.prepareShowPlayerForbidTopUpType = function () {
            let sendData = {_id: vm.isOneSelectedPlayer()._id};

            socketService.$socket($scope.AppSocket, 'getOnePlayerInfo', sendData, (playerData) => {
                vm.showForbidTopupTypes = playerData.data.forbidTopUpType || [];
                $scope.safeApply();
            });
        }
        vm.playerTopupTypes = function (type, index) {
            if (type == 'add') {
                vm.showForbidTopupTypes.push(index.toString());
                vm.showForbidTopupTypes.sort(function (a, b) {
                    return a - b
                })
            } else if (type == 'del') {
                vm.showForbidTopupTypes.splice(vm.showForbidTopupTypes.indexOf(index), 1);
            }
            $scope.safeApply();
        }
        vm.confirmUpdatePlayerTopupTypes = function () {
            var sendData = {
                query: {_id: vm.isOneSelectedPlayer()._id},
                updateData: {forbidTopUpType: vm.showForbidTopupTypes}
            };
            socketService.$socket($scope.AppSocket, 'updatePlayerPayment', sendData, function (data) {
                vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        }
        vm.applyPlayerManualTopUp = function () {
            var sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                depositMethod: vm.playerManualTopUp.depositMethod,
                amount: vm.playerManualTopUp.amount,
                lastBankcardNo: vm.playerManualTopUp.lastBankcardNo,
                bankTypeId: vm.playerManualTopUp.bankTypeId,
                provinceId: vm.playerManualTopUp.provinceId,
                cityId: vm.playerManualTopUp.cityId,
                districtId: vm.playerManualTopUp.districtId
            };
            vm.playerManualTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyManualTopUpRequest', sendData,
                function (data) {
                    console.log('manualTopup success', data);
                    vm.playerManualTopUp.responseData = data.data;
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }, function (error) {
                    vm.playerManualTopUp.responseMsg = error.error.errorMessage;
                    socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                });
        }
        vm.applyPlayerBonus = function () {
            var sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerBonus.amount,
                bonusId: vm.playerBonus.bonusId,
                honoreeDetail: vm.playerBonus.honoreeDetail,
                bForce: vm.playerBonus.bForce
            };
            console.log('applyBonusRequest', sendData);
            vm.playerBonus.resMsg = '';
            vm.playerBonus.showSubmit = true;
            socketService.$socket($scope.AppSocket, 'applyBonusRequest', sendData, function (data) {
                console.log('applyBonusRequest success', data);
                vm.playerBonus.resMsg = $translate('Approved');
                vm.playerBonus.showSubmit = false;
                vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (data) {
                console.log('applyBonusRequest Fail', data);
                vm.playerBonus.showSubmit = false;
                let errorMsg = data.error.errorMessage || data.error.message;
                if (errorMsg) {
                    if (errorMsg === "Player or partner already has a pending proposal for this type") {
                        errorMsg = $translate("Player has already submitted the bonus proposal and is yet to audit.");
                    } else {
                        errorMsg = $translate(errorMsg);
                    }
                    vm.playerBonus.resMsg = errorMsg;
                    socketService.showErrorMessage(errorMsg);
                }
                $scope.safeApply();
            });
        }

        vm.updatePlayerFeedback = function () {
            var sendData = {
                playerId: vm.isOneSelectedPlayer()._id,
                platform: vm.selectedPlatform.id,
                createTime: Date.now(),
                adminId: authService.adminId,
                content: vm.playerFeedback.content,
                result: vm.playerFeedback.result
            };
            console.log('add feedback', sendData);
            socketService.$socket($scope.AppSocket, 'createPlayerFeedback', sendData, function (data) {
                console.log('feedbackadded', data);
                vm.playerFeedback = {};
                // vm.getPlatformPlayersData();

                var rowData = vm.playerTableClickedRow.data();
                rowData.feedbackTimes++;
                vm.playerTableClickedRow.data(rowData).draw();
                $scope.safeApply();
            });
        }
        vm.playerPaymentKeys = [
            "bankName", "bankAccount", "encodedBankAccount", "bankAccountName", "bankAccountType", "bankAccountProvince", "bankAccountCity", "bankAccountDistrict", "bankAddress", "bankBranch"
        ];
        vm.prepareEditPlayerPayment = function () {
            console.log('playerID', vm.isOneSelectedPlayer()._id);
            vm.correctVerifyBankAccount = undefined;
            vm.isEditingPlayerPayment = false;
            vm.isEditingPlayerPaymentShowVerify = false;
            vm.playerPayment = utilService.assignObjKeys(vm.isOneSelectedPlayer(), vm.playerPaymentKeys);
            vm.playerPayment.newBankAccount = vm.playerPayment.encodedBankAccount;
            vm.playerPayment.showNewAccountNo = false;
            vm.filteredBankTypeList = $.extend({}, vm.allBankTypeList);
            vm.filterBankName = '';
            vm.currentProvince = vm.playerPayment.bankAccountProvince;
            vm.currentCity = vm.playerPayment.bankAccountCity;
            vm.currentDistrict = vm.playerPayment.bankAccountDistrict;
            socketService.$socket($scope.AppSocket, 'getProvinceList', {}, function (data) {
                if (data) {
                    vm.provinceList = data.data.provinces.map(item => {
                        item.id = item.id.toString();
                        return item;
                    });
                    vm.changeProvince(false);
                    vm.changeCity(false);
                    $scope.safeApply();
                }
            }, null, true);
            $scope.safeApply();
        }

        vm.changeProvince = function (reset) {
            socketService.$socket($scope.AppSocket, 'getCityList', {provinceId: vm.currentProvince}, function (data) {
                if (data) {
                    vm.cityList = data.data.cities;
                    if (reset) {
                        vm.currentCity = vm.cityList[0].id;
                        vm.changeCity(reset);
                        $scope.safeApply();
                    }
                }
            }, null, true);
        }
        vm.changeCity = function (reset) {
            socketService.$socket($scope.AppSocket, 'getDistrictList', {
                provinceId: vm.currentProvince,
                cityId: vm.currentCity
            }, function (data) {
                if (data) {
                    vm.districtList = data.data.districts;
                    if (reset && vm.districtList && vm.districtList[0]) {
                        vm.currentDistrict = vm.districtList[0].id
                    }
                    $scope.safeApply();
                }
            }, null, true);
        }

        vm.filterBankname = function (which) {
            var key = event.target.value || '';
            vm.filteredBankTypeList = {};
            vm[which].bankName = '';
            $.each(vm.allBankTypeList, function (i, v) {
                if (v.indexOf(key) > -1) {
                    vm.filteredBankTypeList[i] = v;
                    vm[which].bankName = i;
                }
            })
            $scope.safeApply();
        }

        vm.updatePlayerPayment = function () {
            var sendData = $.extend({}, vm.playerPayment);
            sendData._id = vm.isOneSelectedPlayer()._id;
            sendData.playerName = vm.isOneSelectedPlayer().name;
            sendData.playerId = vm.isOneSelectedPlayer().playerId;
            sendData.bankAccountProvince = vm.currentProvince;
            sendData.bankAccountCity = vm.currentCity;
            sendData.bankAccountDistrict = vm.currentDistrict;
            console.log('send', sendData);
            if (sendData.newBankAccount != sendData.encodedBankAccount) {
                sendData.bankAccount = sendData.newBankAccount;
            }
            delete sendData.newBankAccount;
            delete sendData.encodedBankAccount;

            socketService.$socket($scope.AppSocket, 'createUpdatePlayerBankInfoProposal', {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                data: sendData,
                platformId: vm.selectedPlatform.id
            }, function (data) {
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPlayersData();
                console.log('playerpayment', data);
            }, null, true);
        }
        vm.getPaymentInfoHistory = function () {
            vm.paymetHistoryCount = 0;
            socketService.$socket($scope.AppSocket, 'getPaymentHistory', {
                objectId: vm.isOneSelectedPlayer()._id,
                type: "PLAYERS"
            }, function (data) {
                console.log('playerpayment', data);
                var drawData = data.data.map(item => {
                    item.province = item.provinceData || item.bankAccountProvince;
                    item.city = item.cityData || item.bankAccountCity;
                    item.district = item.districtData || item.bankAccountDistrict;
                    item.creatorName = item.creatorInfo.adminName || item.creatorInfo.name;
                    item.bankStr = vm.allBankTypeList[item.bankName] || item.bankName || $translate('Unknown');
                    item.createTime$ = vm.dateReformat(item.changeTime);
                    return item;
                })
                vm.paymetHistoryCount = data.data.length;
                vm.drawPlayerPaymentHistory(drawData);
            }, null, true);
            $('#modalPlayerPaymentHistory').modal();
        }
        vm.drawPlayerPaymentHistory = function (tblData) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('CREATETIME'), data: "createTime$"},
                    {title: $translate('bankAccountName'), data: "bankAccountName", sClass: "wordWrap"},
                    {title: $translate('bankName'), data: "bankStr"},
                    {title: $translate('BANK_BRANCH'), data: "bankBranch", sClass: "wordWrap"},
                    {title: $translate('bankAddress'), data: "bankAddress", sClass: "wordWrap"},
                    {title: $translate('PROVINCE'), data: "province"},
                    {title: $translate('CITY'), data: "city"},
                    {title: $translate('DISTRICT'), data: "district"},
                    {title: $translate('creator'), data: "creatorName"},
                    {title: $translate('source'), data: "sourceStr"},
                ],
                "paging": true,
            });
            var aTable = $("#playerPaymentHistoryTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            $('#playerPaymentHistoryTbl').resize();
            $scope.safeApply();
        }

        vm.initMailLog = function () {
            vm.mailLog = vm.mailLog || {};
            vm.mailLog.query = {};
            vm.mailLog.receivedMails = [{}];
            utilService.actionAfterLoaded('#modalMailLog.in #mailLogQuery .endTime', function () {
                vm.mailLog.startTime = utilService.createDatePicker('#mailLogQuery .startTime');
                vm.mailLog.endTime = utilService.createDatePicker('#mailLogQuery .endTime');
                vm.mailLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.mailLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.searchMailLog();
            });
        }

        vm.searchMailLog = function () {
            var requestData = {
                recipientId: vm.selectedSinglePlayer._id,
                startTime: vm.mailLog.startTime.data('datetimepicker').getLocalDate() || new Date(0),
                endTime: vm.mailLog.endTime.data('datetimepicker').getLocalDate() || new Date()
            };
            $scope.$socketPromise('searchMailLog', requestData).then(result => {
                console.log("result:", result);
                vm.mailLog.receivedMails = result.data;
                $scope.safeApply();
            }).catch(console.error);
        }

        vm.initSMSLog = function (type) {
            vm.smsLog = vm.smsLog || {index: 0, limit: 10};
            vm.smsLog.type = type;
            vm.smsLog.query = {};
            vm.smsLog.searchResults = [{}];
            vm.smsLog.query.status = "all";
            utilService.actionAfterLoaded('.modal.in #smsLogQuery .endTime', function () {
                vm.smsLog.query.startTime = utilService.createDatePicker('#smsLogQuery .startTime');
                vm.smsLog.query.endTime = utilService.createDatePicker('#smsLogQuery .endTime');
                vm.smsLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.smsLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.smsLog.pageObj = utilService.createPageForPagingTable("#smsLogTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "smsLog", vm.searchSMSLog)
                });
                // Be user friendly: Fetch some results immediately!
                vm.searchSMSLog(true);
            });
        }

        vm.searchSMSLog = function (newSearch) {
            var requestData = {
                // playerId: vm.selectedSinglePlayer.playerId,
                status: vm.smsLog.query.status,
                startTime: vm.smsLog.query.startTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .startTime input').val() || undefined,
                endTime: vm.smsLog.query.endTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .endTime   input').val() || undefined,
                index: newSearch ? 0 : vm.smsLog.index,
                limit: newSearch ? 10 : vm.smsLog.limit,
            };
            if (vm.smsLog.type == "single") {
                requestData.playerId = vm.selectedSinglePlayer.playerId;
            }
            //console.log("requestData:", requestData);
            $scope.$socketPromise('searchSMSLog', requestData).then(result => {
                vm.smsLog.searchResults = result.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.status$ = $translate(item.status);
                    return item;
                });
                vm.smsLog.totalCount = result.data.size;
                vm.smsLog.pageObj.init({maxCount: vm.smsLog.totalCount}, newSearch);
                $scope.safeApply();
            }).catch(console.error);
        }

        vm.initGameCreditLog = function () {
            vm.gameCreditLog = vm.gameCreditLog || {index: 0, limit: 20, pageSize: 20};
            // vm.gameCreditLog.type = type;
            vm.gameCreditLog.query = {};
            vm.gameCreditLog.searchResults = [{}];
            vm.gameCreditLog.query.status = "41";
            vm.gameCreditLog.query.type = "0001";
            utilService.actionAfterLoaded('#modalGameCreditLog.modal.in #gameCreditLogTablePage', function () {
                vm.gameCreditLog.query.startTime = utilService.createDatePicker('#gameCreditLogQuery .startTime');
                vm.gameCreditLog.query.endTime = utilService.createDatePicker('#gameCreditLogQuery .endTime');
                vm.gameCreditLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.gameCreditLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.gameCreditLog.pageObj = utilService.createPageForPagingTable("#gameCreditLogTablePage", vm.gameCreditLog, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "gameCreditLog", vm.getGameCreditLog)
                });
                // Be user friendly: Fetch some results immediately!
                vm.getGameCreditLog(true);
            });
        }
        vm.getGameCreditLog = function (newSearch) {
            var requestData = {
                "playerName": vm.selectedSinglePlayer.name,
                "providerId": vm.gameCreditLog.query.status || "41",
                "startDate": vm.gameCreditLog.query.startTime.data('datetimepicker').getLocalDate(),
                "endDate": vm.gameCreditLog.query.endTime.data('datetimepicker').getLocalDate(),
                "page": newSearch ? "1" : "1",
                "platformId": vm.selectedPlatform.data.platformId,
            };
            vm.gameCreditLog.query.type ? requestData.type = vm.gameCreditLog.query.type : '';
            $scope.$socketPromise('getGameCreditLog', requestData).then(result => {
                console.log(JSON.stringify(result))
                // {
                //     "id": "1009924",
                //     "date": "2017-04-03 15:45:11",
                //     "type": "0001",
                //     "previousCredit": 0.82,
                //     "remit": 100,
                //     "newCredit": 100.82,
                //     "username": "l47uaeson2test"
                // }
                //vm.gameCreditLog.searchResults = result.data.data;
                vm.gameCreditLog.searchResults = result.data.data.map(item => {
                    // item.createTime$ = vm.dateReformat(item.createTime);
                    // item.status$ = $translate(item.status);
                    // transfer in  = 0001
                    // transfer out = 0002
                    // bet = 0004
                    // payout = 0005
                    if (item.type && item.type === "0001") {
                        item.typeText = "TRANSFER_IN";
                    }
                    else if (item.type && item.type === "0002") {
                        item.typeText = "TRANSFER_OUT";
                    }
                    else if (item.type && item.type === "0004") {
                        item.typeText = "BET";
                    }
                    else if (item.type && item.type === "0005") {
                        item.typeText = "PAYOUT";
                    }
                    item.typeText = $translate(item.typeText);
                    return item;
                });
                vm.gameCreditLog.totalCount = (result.data.pageSize || 20) * result.data.totalPages;
                vm.gameCreditLog.pageObj.init({maxCount: vm.gameCreditLog.totalCount}, newSearch);
                $scope.safeApply();
            }).catch(console.error);
        }

        ////////////////// reward task log
        vm.initRewardTaskLog = function () {
            vm.rewardTaskLog = vm.rewardTaskLog || {totalCount: 0, limit: 10, index: 0, query: {}};
            utilService.actionAfterLoaded('#modalRewardTaskLog.in #rewardTaskLogQuery .endTime', function () {
                vm.rewardTaskLog.query.startTime = utilService.createDatePicker('#rewardTaskLogQuery .startTime');
                vm.rewardTaskLog.query.endTime = utilService.createDatePicker('#rewardTaskLogQuery .endTime');
                vm.rewardTaskLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.rewardTaskLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.rewardTaskLog.pageObj = utilService.createPageForPagingTable("#rewardTaskLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "rewardTaskLog", vm.getRewardTaskLogData)
                });
                vm.getRewardTaskLogData(true);
            });
        }
        vm.getRewardTaskLogData = function (newSearch) {
            var sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                from: vm.rewardTaskLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.rewardTaskLog.query.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.rewardTaskLog.index,
                limit: newSearch ? 10 : vm.rewardTaskLog.limit,
                sortCol: vm.rewardTaskLog.sortCol || null
            }
            socketService.$socket($scope.AppSocket, 'getPlayerRewardTask', sendQuery, function (data) {
                console.log('getPlayerRewardTask', data);
                var tblData = data && data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.providerStr$ = '(' + ((item.targetProviders && item.targetProviders.length > 0) ? item.targetProviders.map(pro => {
                            return pro.name + ' ';
                        }) : $translate('all')) + ')';

                    if (!item.targetEnable && item.targetProviders && item.targetProviders.length > 0) {
                        item.provider$ = $translate('Excluded') + ' ' + item.providerStr$
                    } else {
                        item.provider$ = item.providerStr$;
                    }
                    return item;
                }) : [];
                var size = data.data ? data.data.size : 0;
                vm.rewardTaskLog.totalCount = size;
                vm.drawRewardTaskTable(newSearch, tblData, size);
            });
        }
        vm.drawRewardTaskTable = function (newSearch, tblData, size) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('CREATETIME'), data: "createTime$"},
                    {title: $translate('rewardType'), data: "rewardType"},
                    {title: $translate('ISUNLOCK'), data: "isUnlock"},
                    {title: $translate('applyAmount'), data: "applyAmount"},
                    {title: $translate('initAMOUNT'), data: "initAmount"},
                    {title: $translate('currentAMOUNT'), data: "currentAmount"},
                    {title: $translate('bonusAmount'), data: "bonusAmount"},
                    {title: $translate('requiredUnlockAmount'), data: "requiredUnlockAmount"},
                    {title: $translate('unlockedAmount'), data: "unlockedAmount"},
                    {title: $translate('requiredBonusAmount'), data: "requiredBonusAmount"},
                    {title: $translate('unlockedBonusAmount'), data: "unlockedBonusAmount"},
                    // {title: $translate('targetEnable'), data: "targetEnable"},
                    {title: $translate('targetProviders'), data: "provider$"},
                    {title: $translate('useConsumption'), data: "useConsumption"},
                ],
                "paging": false,
            });
            var aTable = $("#rewardTaskLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.rewardTaskLog.pageObj.init({maxCount: size}, newSearch);
            $('#rewardTaskLogTbl').resize();
            $('#rewardTaskLogTbl').off('order.dt');
            $('#rewardTaskLogTbl').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'rewardTaskLog', vm.getRewardTaskLogData);
            });

            $scope.safeApply();
        }

        //////////////////////////// reward task log end
        vm.enableDisablePlayer = function () {
            var status = 1; //player status enable
            if (vm.selectedSinglePlayer.status == 1) {
                status = 2 // player status disable - forbidGame
            }
            var sendData = {
                _id: vm.selectedSinglePlayer._id,
                status: status,
                reason: "Status set by Admin",
                forbidProviders: null
            }
            socketService.$socket($scope.AppSocket, 'updatePlayerStatus', sendData, function (data) {
                vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        };

        //Edit selected player
        vm.prepareEditCritical = function (which) {
            if (which == 'player') {
                vm.correctVerifyPhoneNumber = undefined;
                $scope.emailConfirmation = null;
                vm.modifyCritical = {
                    which: 'player',
                    title: $translate('MODIFY_PLAYER') + ' ' + vm.selectedSinglePlayer.name,
                    changeType: 'email',
                    curEmail: vm.selectedSinglePlayer.email,
                    phoneNumber: vm.selectedSinglePlayer.phoneNumber ? (vm.selectedSinglePlayer.phoneNumber.substring(0, 3) + "******" + vm.selectedSinglePlayer.phoneNumber.slice(-4)) : '',
                }
            } else if (which == 'partner') {
                $scope.emailConfirmation = null;
                vm.modifyCritical = {
                    which: 'partner',
                    title: $translate('MODIFY_PARTNER') + ' ' + vm.selectedSinglePartner.partnerName,
                    changeType: 'email',
                    curEmail: vm.selectedSinglePartner.email,
                    phoneNumber: vm.selectedSinglePartner.phoneNumber,
                }
            }
            $scope.safeApply();
        }
        vm.submitCriticalUpdate = function () {
            console.log('updateData', vm.modifyCritical);
            var sendStringKey = 0;
            var sendString = '';
            var sendData = {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                platformId: vm.selectedPlatform.id,
            };
            if (vm.modifyCritical.which == 'player') {
                sendData.data = {
                    playerName: vm.selectedSinglePlayer.name,
                    playerObjId: vm.selectedSinglePlayer._id
                }
                sendStringKey = 10;
            } else if (vm.modifyCritical.which == 'partner') {
                sendData.data = {
                    partnerName: vm.selectedSinglePartner.partnerName,
                    partnerObjId: vm.selectedSinglePartner._id
                }
                sendStringKey = 20;
            }
            if (vm.modifyCritical.changeType == 'email') {
                sendStringKey += 1;
                sendData.data.curData = {
                    email: vm.modifyCritical.curEmail
                }
                sendData.data.updateData = {
                    email: vm.modifyCritical.newEmail
                }
            } else if (vm.modifyCritical.changeType == 'phone') {
                sendData.data.curData = {
                    phoneNumber: vm.modifyCritical.phoneNumber
                }
                sendData.data.updateData = {
                    phoneNumber: vm.modifyCritical.newPhoneNumber
                }
            }
            switch (sendStringKey) {
                case 10:
                    sendString = 'createUpdatePlayerPhoneProposal';
                    break;
                case 11:
                    sendString = 'createUpdatePlayerEmailProposal';
                    break;
                case 20:
                    sendString = 'createUpdatePartnerPhoneProposal';
                    break;
                case 21:
                    sendString = 'createUpdatePartnerEmailProposal';
                    break;
            }
            console.log(sendData, 'sendData', sendString);
            socketService.$socket($scope.AppSocket, sendString, sendData, function (data) {
                console.log('sent', data);
                if (vm.modifyCritical.which == 'partner') {
                    vm.getPlatformPartnersData();
                } else if (vm.modifyCritical.which == 'player') {
                    vm.getPlatformPlayersData();
                }
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
            }, function (err) {
                console.log('err', err);
            });
        }

        vm.verifyPlayerPhoneNumber = function () {
            socketService.$socket($scope.AppSocket, 'verifyPlayerPhoneNumber', {
                playerObjId: vm.selectedSinglePlayer._id,
                phoneNumber: vm.modifyCritical.verifyPhoneNumber
            }, function (data) {
                console.log("verifyPlayerPhoneNumber:", data);
                vm.correctVerifyPhoneNumber = data.data;
                $scope.safeApply();
            });
        };

        vm.verifyPlayerBankAccount = function () {
            socketService.$socket($scope.AppSocket, 'verifyPlayerBankAccount', {
                playerObjId: vm.selectedSinglePlayer._id,
                bankAccount: vm.verifyBankAccount
            }, function (data) {
                console.log("verifyPlayerBankAccount:", data);
                vm.correctVerifyBankAccount = data.data;
                $scope.safeApply();
            });
        };

        // Returns an object containing all key-value pairs of newObj which were are not in oldObj
        function newAndModifiedFields(oldObj, newObj) {
            function isEqualArray(array1, array2) {
                if (!array1 || !array2)
                    return false;
                if (array1.length != array2.length)
                    return false;

                for (var i = 0, l = array1.length; i < l; i++) {
                    if (array1[i] instanceof Array && array2[i] instanceof Array) {
                        if (isEqualArray(array1[i], array2[i]))
                            return false;
                    }
                    else if (array1[i] != array2[i]) {
                        // Warning - two different object instances will never be equal: {x:20} != {x:20}
                        return false;
                    }
                }
                return true;
            }

            var changes = {};
            for (var key in newObj) {
                if ($.isArray(newObj[key])) {
                    if (!isEqualArray(newObj[key], oldObj[key])) {
                        changes[key] = newObj[key];
                    }
                } else if (JSON.stringify(newObj[key]) !== JSON.stringify(oldObj[key])) {
                    changes[key] = newObj[key];
                }
            }
            return changes;
        }

        //Enable or disable selected player
        vm.updatePlayerStatus = function (rowData, sendData) {
            console.log(rowData, sendData);
            socketService.$socket($scope.AppSocket, 'updatePlayerStatus', sendData, function (data) {
                vm.getPlatformPlayersData();
            });
        };
        vm.getPlayerStatusChangeLog = function (rowData) {
            var deferred = Q.defer();
            console.log(rowData);
            socketService.$socket($scope.AppSocket, 'getPlayerStatusChangeLog', {
                _id: rowData._id
            }, function (data) {
                console.log('logData', data.data);
                vm.playerStatusHistory = data.data || [];
                $scope.safeApply();
                deferred.resolve(true);
            });
            return deferred.promise;
        }

        vm.testFn = function () {
            console.log('this', this);
        }

        vm.getPlayerPermissionChange = function (flag) {
            vm.playerPermissionQuery = vm.playerPermissionQuery || {};
            vm.playerPermissionQuery.searching = true;
            vm.playerPermissionHistory = [];
            $scope.safeApply();
            if (flag == 'new') {
                utilService.actionAfterLoaded('#modalPlayerPermissionChangeLog .searchDiv .startTime', function () {
                    vm.playerPermissionQuery.startTime = utilService.createDatePicker('#modalPlayerPermissionChangeLog .searchDiv .startTime');
                    vm.playerPermissionQuery.endTime = utilService.createDatePicker('#modalPlayerPermissionChangeLog .searchDiv .endTime');
                    vm.playerPermissionQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.playerPermissionQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                });
            }
            var sendData = {
                playerId: vm.selectedSinglePlayer._id,
                platform: vm.selectedPlatform.id,
                createTime: {
                    $gte: new Date(vm.playerPermissionQuery.startTime.data('datetimepicker').getLocalDate()),
                    $lt: new Date(vm.playerPermissionQuery.endTime.data('datetimepicker').getLocalDate())
                }
            }
            socketService.$socket($scope.AppSocket, 'getPlayerPermissionLog', sendData, function (data) {
                vm.playerPermissionHistory = data.data || [];
                vm.playerPermissionQuery.searching = false;
                $scope.safeApply();
            });
        }

        vm.getPlatformRewardProposal = function () {
            if (!authService.checkViewPermission('Platform', 'Player', 'RewardHistory')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getPlatformRewardProposal', {platform: vm.selectedPlatform.id}, function (data) {
                vm.platformRewardtype = data.data || [];
                console.log("rewardType:", vm.platformRewardtype);
                $scope.safeApply();
            });
        }
        vm.getPlayerRewardHistory = function ($event) {
            vm.playerRewardHistory = {totalCount: 0};
            utilService.actionAfterLoaded(('#modalPlayerRewardHistory.in #playerReward .endTime' ), function () {
                vm.playerRewardHistory.startTime = utilService.createDatePicker('#playerReward .startTime');
                vm.playerRewardHistory.endTime = utilService.createDatePicker('#playerReward .endTime');
                vm.playerRewardHistory.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerRewardHistory.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerRewardHistory.type = 'all';
                vm.playerRewardHistory.pageObj = utilService.createPageForPagingTable("#playerRewardHistoryTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerRewardHistory", vm.getPlayerRewardHistoryRecord)
                });
                vm.getPlayerRewardHistoryRecord(true);
            });
        }
        vm.getPlayerRewardHistoryRecord = function (newSearch) {
            vm.playerRewardHistory.loading = true;
            var sendQuery = {
                startTime: vm.playerRewardHistory.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerRewardHistory.endTime.data('datetimepicker').getLocalDate(),
                type: vm.playerRewardHistory.type,
                playerId: vm.selectedSinglePlayer._id,
                index: newSearch ? 0 : vm.playerRewardHistory.index,
                limit: newSearch ? 10 : vm.playerRewardHistory.limit,
                sortCol: vm.playerRewardHistory.sortCol || undefined,
            };
            if (sendQuery.type == 'all') {
                sendQuery.type = null;
            }
            console.log("Second:Query:", sendQuery);
            socketService.$socket($scope.AppSocket, 'queryRewardProposal', sendQuery, function (data) {
                var tableData = data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.rewardType$ = $translate(vm.platformRewardtype[item.type]);
                    item.rewardAmount$ = parseFloat((item.data.rewardAmount || item.data.amount)).toFixed(2);
                    item.status$ = $translate(item.status || item.process.status);
                    item.entryType$ = $translate($scope.constProposalEntryType[item.entryType]);
                    item.userType$ = $translate(item.userType ? $scope.constProposalUserType[item.userType] : "");
                    return item;
                }) : [];
                vm.playerRewardHistory.loading = false;
                vm.playerRewardHistory.totalCount = data.data ? data.data.total : 0;
                console.log("RewardHist:length:", tableData);
                vm.drawPlayerRewardHistoryTbl(tableData, vm.playerRewardHistory.totalCount, newSearch);
            });
        }
        vm.drawPlayerRewardHistoryTbl = function (showData, size, newSearch) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.playerRewardHistory.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'type', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'entryType', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'entryType', bSortable: true, 'aTargets': [4]},
                    // {'sortCol': 'rewardAmount', bSortable: true, 'aTargets': [7]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('proposalId'), data: "proposalId"},
                    {title: $translate('REWARD_TYPE'), data: "rewardType$"},
                    {title: $translate('ENTRY_TYPE'), data: "entryType$"},
                    {title: $translate('USER_TYPE'), data: "userType$"},
                    {title: $translate('REWARD_CODE'), data: "data.eventCode"},
                    {title: $translate('REWARD_NAME'), data: "data.eventName"},
                    {title: $translate('CREDIT'), data: "rewardAmount$", sClass: "alignRight"},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('DESCRIPTION'), data: "data.eventDescription"}

                ],
                "paging": false,
            });
            var aTable = $("#playerRewardHistoryTbl").DataTable(tableOptions);
            vm.playerRewardHistory.pageObj.init({maxCount: size}, newSearch);
            $("#playerRewardHistoryTbl").off('order.dt');
            $("#playerRewardHistoryTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerRewardHistory', vm.getPlayerRewardHistoryRecord);
            });

            $('#playerRewardHistoryTbl').resize();
            $scope.safeApply();
        }

        vm.getPlayerBonusHistory = function ($event) {
            vm.playerBonusHistory = {};
            utilService.actionAfterLoaded('#modalPlayerBonusHistory.in #playerBonus .endTime', function () {
                vm.playerBonusHistory.startTime = utilService.createDatePicker('#playerBonus .startTime');
                vm.playerBonusHistory.endTime = utilService.createDatePicker('#playerBonus .endTime');
                vm.playerBonusHistory.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerBonusHistory.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerBonusHistory.pageObj = utilService.createPageForPagingTable("#playerBonusHistoryTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerBonusHistory", vm.getPlayerBonusHistoryRecord)
                });
                vm.getPlayerBonusHistoryRecord(true);
            });
        }
        vm.getPlayerBonusHistoryRecord = function (newSearch) {
            var sendQuery = {
                startTime: vm.playerBonusHistory.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerBonusHistory.endTime.data('datetimepicker').getLocalDate(),
                playerId: vm.selectedSinglePlayer.playerId,
                limit: newSearch ? 10 : vm.playerBonusHistory.limit,
                index: newSearch ? 0 : vm.playerBonusHistory.index,
                sortCol: vm.playerBonusHistory.sortCol || undefined
            };
            if (vm.playerBonusHistory.status) {
                sendQuery.status = vm.playerBonusHistory.status;
            }
            vm.playerBonusHistory.isSearching = true;
            console.log("Second:Query:", sendQuery);
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'queryBonusProposal', sendQuery, function (data) {
                var showData = data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.curAmount$ = item.data && item.data.curAmount ? item.data.curAmount.toFixed(2) : 0;
                    item.status$ = $translate(item.status);
                    return item;
                }) : [];
                vm.playerBonusHistory.totalCount = data.data ? data.data.total : 0;
                let summary = data.data ? data.data.summary : {sumAmt: 0};
                console.log("RewardHist:length:", showData);
                vm.drawPlayerBonusHistoryTbl(showData, vm.playerBonusHistory.totalCount, newSearch, summary);
                vm.playerBonusHistory.isSearching = false;
                $scope.safeApply();
            });
        }
        vm.drawPlayerBonusHistoryTbl = function (showData, size, newSearch, summary) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.playerBonusHistory.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('proposalId'), data: "proposalId"},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('bonusId'), data: "data.bonusId"},
                    {title: $translate('bonusCredit'), data: "data.bonusCredit", sClass: 'sumText'},
                    {title: $translate('amount'), data: "data.amount", sClass: 'sumInt'},
                    {title: $translate('CUR_AMOUNT'), data: "curAmount$"},
                    {title: $translate('HONOREE_DETAIL'), data: "data.honoreeDetail"},
                ],
                "paging": false,
            });
            utilService.createDatatableWithFooter("#playerBonusHistoryTbl", tableOptions, {5: summary.sumAmt});

            // var aTable = $("#playerBonusHistoryTbl").DataTable(tableOptions);
            vm.playerBonusHistory.pageObj.init({maxCount: size}, newSearch);
            $("#playerBonusHistoryTbl").off('order.dt');
            $("#playerBonusHistoryTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerBonusHistory', vm.getPlayerBonusHistoryRecord);
            });
            $('#playerBonusHistoryTbl').resize();
            $scope.safeApply();
        }
        vm.initPlayerBonus = function () {
            vm.playerBonus = {
                resMsg: '',
                showSubmit: true,
                notSent: true,
                bonusId :1
            };
        }

        vm.initPlayerCreditLog = function () {
            vm.playerCreditLog = vm.playerCreditLog || {totalCount: 0, limit: 10, index: 0, query: {}};
            utilService.actionAfterLoaded('#modalPlayerCreditLog.in #playerCreditLogQuery .endTime', function () {
                vm.playerCreditLog.query.startTime = utilService.createDatePicker('#playerCreditLogQuery .startTime');
                vm.playerCreditLog.query.endTime = utilService.createDatePicker('#playerCreditLogQuery .endTime');
                vm.playerCreditLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerCreditLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerCreditLog.pageObj = utilService.createPageForPagingTable("#playerCreditLogQueryTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerCreditLog", vm.getPlayerCreditLogData)
                });
                vm.getPlayerCreditLogData(true);
            });
        }

        vm.getPlayerCreditLogData = function (newSearch) {
            if (!authService.checkViewPermission('Platform', 'Player', 'playerCreditDailyLog')) {
                return;
            }
            var sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                from: vm.playerCreditLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.playerCreditLog.query.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.playerCreditLog.index,
                limit: newSearch ? 10 : vm.playerCreditLog.limit,
                sortCol: vm.playerCreditLog.sortCol || null
            }
            socketService.$socket($scope.AppSocket, 'getPlayerCreditsDaily', sendQuery, function (data) {
                console.log('getPlayerDailyCredit', data);
                var tblData = data && data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.validCredit = (item.validCredit).toFixed(2);
                    item.lockedCredit = (item.lockedCredit).toFixed(2);
                    item.gameCredit = (item.gameCredit).toFixed(2);
                    item.providerStr$ = '(' + ((item.targetProviders && item.targetProviders.length > 0) ? item.targetProviders.map(pro => {
                            return pro.name + ' ';
                        }) : $translate('all')) + ')';
                    return item;
                }) : [];
                var size = data.data ? data.data.size : 0;
                vm.playerCreditLog.totalCount = size;
                vm.drawPlayerCreditLogTable(newSearch, tblData, size);
            });
        }
        vm.drawPlayerCreditLogTable = function (newSearch, tblData, size) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('CREATETIME'), data: "createTime$"},
                    {title: $translate('valid Credit'), data: "validCredit"},
                    {title: $translate('locked Credit'), data: "lockedCredit"},
                    {title: $translate('game Credit'), data: "gameCredit"}
                ],
                "paging": false,
            });
            var aTable = $("#playerCreditLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.playerCreditLog.pageObj.init({maxCount: size}, newSearch);
            $('#playerCreditLogTbl').resize();
            $('#playerCreditLogTbl').off('order.dt');
            $('#playerCreditLogTbl').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerCreditLog', vm.getPlayerCreditLogData);
            });

            $scope.safeApply();
        }

        vm.initPlayerApiLog = function () {
            vm.playerApiLog = {totalCount: 0, limit: 10, index: 0};
            utilService.actionAfterLoaded('#modalPlayerApiLog.in #playerApiLogQuery .endTime', function () {
                vm.playerApiLog.startDate = utilService.createDatePicker('#playerApiLogQuery .startTime');
                vm.playerApiLog.endDate = utilService.createDatePicker('#playerApiLogQuery .endTime');
                vm.playerApiLog.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerApiLog.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerApiLog.pageObj = utilService.createPageForPagingTable("#playerApiLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerApiLog", vm.getPlayerApiLogData);
                });
                vm.getPlayerApiLogData(true);
            });
        };

        vm.getPlayerApiLogData = function (newSearch) {
            if (!authService.checkViewPermission('Platform', 'Player', 'playerApiLog')) {
                return;
            }

            let sendQuery = {
                playerObjId: vm.selectedSinglePlayer._id,
                startDate: vm.playerApiLog.startDate.data('datetimepicker').getLocalDate(),
                endDate: vm.playerApiLog.endDate.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.playerApiLog.index,
                limit: newSearch ? 10 : vm.playerApiLog.limit,
                sortCol: vm.playerApiLog.sortCol || null
            };

            if (vm.playerApiLog.apiAction) {
                sendQuery.action = vm.playerApiLog.apiAction;
            }
            socketService.$socket($scope.AppSocket, 'getPlayerApiLog', sendQuery, function (data) {
                console.log("getPlayerApiLog", data);
                let tblData = data && data.data ? data.data.data.map(item => {
                    item.operationTime$ = vm.dateReformat(item.operationTime);
                    item.action$ = $translate(item.action);
                    return item;
                }) : [];
                let total = data.data ? data.data.total : 0;
                vm.playerApiLog.totalCount = total;
                vm.drawPlayerApiLogTable(newSearch, tblData, total);
            });
        };

        vm.drawPlayerApiLogTable = function (newSearch, tblData, size) {
            let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('Incident'), data: "action$"},
                    {title: $translate('Operation Time'), data: "operationTime$"},
                    {title: $translate('IP_ADDRESS'), data: "ipAddress"}
                ],
                "paging": false,
            });
            let aTable = $("#playerApiLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.playerApiLog.pageObj.init({maxCount: size}, newSearch);
            $('#playerApiLogTbl').resize();
            $('#playerApiLogTbl').off('order.dt');
            $('#playerApiLogTbl').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerApiLog', vm.getPlayerApiLogData);
            });

            $scope.safeApply();
        };

        vm.initPlayerManualTopUp = function () {
            vm.getZoneList();
            vm.provinceList = [];
            vm.cityList = [];
            vm.districtList = [];
            vm.freezeZoneSelection = false;
            vm.playerManualTopUp = {submitted: false};
            vm.filterBankname("playerManualTopUp");
            vm.existingManualTopup = null;
            socketService.$socket($scope.AppSocket, 'getManualTopupRequestList', {playerId: vm.selectedSinglePlayer.playerId}, function (data) {
                console.log(data.data);
                vm.existingManualTopup = data.data ? data.data : false;
                $scope.safeApply();
            });
            $scope.safeApply();
        };

        // Player alipay topup
        vm.initPlayerAlipayTopUp = function () {
            vm.playerAlipayTopUp = {submitted: false};
            vm.existingAlipayTopup = null;
            socketService.$socket($scope.AppSocket, 'getAlipayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    vm.existingAlipayTopup = data.data ? data.data : false;
                    $scope.safeApply();
                });
            utilService.actionAfterLoaded('#modalPlayerAlipayTopUp', function () {
                vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerAlipayTopUp .createTime');
                vm.playerAlipayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            $scope.safeApply();
        };

        vm.applyPlayerAlipayTopUp = () => {
            let sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerAlipayTopUp.amount,
                alipayName: vm.playerAlipayTopUp.alipayName,
                alipayAccount: vm.playerAlipayTopUp.alipayAccount,
                remark: vm.playerAlipayTopUp.remark,
                createTime: vm.playerAlipayTopUp.createTime.data('datetimepicker').getLocalDate()
            };
            vm.playerAlipayTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyAlipayTopUpRequest', sendData,
                data => {
                    vm.playerAlipayTopUp.responseMsg = $translate('SUCCESS');
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                },
                error => {
                    vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                    socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }
            );
        };

        vm.cancelPlayerAlipayTopUp = () => {
            if (!vm.existingAlipayTopup) {
                return;
            }
            let sendQuery = {
                playerId: vm.selectedSinglePlayer.playerId,
                proposalId: vm.existingAlipayTopup.proposalId
            };
            socketService.$socket($scope.AppSocket, 'cancelAlipayTopup', sendQuery,
                data => {
                    if (vm.existingAlipayTopup.proposalId == data.data.proposalId) {
                        vm.existingAlipayTopup.isCanceled = true;
                    }
                    $scope.safeApply();
                },
                error => {
                    vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                    $scope.safeApply();
                }
            );
        };

        // Player WechatPay TopUp
        vm.initPlayerWechatPayTopUp = function () {
            vm.playerWechatPayTopUp = {submitted: false};
            vm.existingWechatPayTopup = null;
            socketService.$socket($scope.AppSocket, 'getWechatPayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    vm.existingWechatPayTopup = data.data ? data.data : false;
                    $scope.safeApply();
                });
            utilService.actionAfterLoaded('#modalPlayerWechatPayTopUp', function () {
                vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerWechatPayTopUp .createTime');
                vm.playerWechatPayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            $scope.safeApply();
        };

        vm.applyPlayerWechatPayTopUp = () => {
            let sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerWechatPayTopUp.amount,
                wechatPayName: vm.playerWechatPayTopUp.wechatPayName || " ",
                wechatPayAccount: vm.playerWechatPayTopUp.wechatPayAccount,
                remark: vm.playerWechatPayTopUp.remark,
                createTime: vm.playerWechatPayTopUp.createTime.data('datetimepicker').getLocalDate()
            };
            console.log("applyPlayerWechatPayTopUp", sendData)
            vm.playerWechatPayTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyWechatPayTopUpRequest', sendData,
                data => {
                    vm.playerWechatPayTopUp.responseMsg = $translate('SUCCESS');
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                },
                error => {
                    vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                    socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }
            );
        };

        vm.cancelPlayerWechatPayTopUp = () => {
            if (!vm.existingWechatPayTopup) {
                return;
            }
            let sendQuery = {
                playerId: vm.selectedSinglePlayer.playerId,
                proposalId: vm.existingWechatPayTopup.proposalId
            };
            socketService.$socket($scope.AppSocket, 'cancelWechatPayTopup', sendQuery,
                data => {
                    if (vm.existingWechatPayTopup.proposalId == data.data.proposalId) {
                        vm.existingWechatPayTopup.isCanceled = true;
                    }
                    $scope.safeApply();
                },
                error => {
                    vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                    $scope.safeApply();
                }
            );
        };

        vm.cancelPlayerManualTop = function () {
            if (!vm.existingManualTopup) {
                return;
            }
            var sendQuery = {playerId: vm.selectedSinglePlayer.playerId, proposalId: vm.existingManualTopup.proposalId};
            socketService.$socket($scope.AppSocket, 'cancelManualTopupRequest', sendQuery, function (data) {
                console.log(data.data);
                if (vm.existingManualTopup.proposalId == data.data.proposalId) {
                    vm.existingManualTopup.isCanceled = true;
                }
                $scope.safeApply();
            });
        }

        // quickpay topup
        vm.initPlayerQuickpayTopUp = function () {
            vm.playerQuickpayTopUp = {submitted: false};
            vm.existingQuickpayTopup = null;
            socketService.$socket($scope.AppSocket, 'getQuickpayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    vm.existingQuickpayTopup = data.data ? data.data : false;
                    $scope.safeApply();
                });
            utilService.actionAfterLoaded('#modalPlayerQuickpayTopUp', function () {
                vm.playerQuickpayTopUp.createTime = utilService.createDatePicker('#modalPlayerQuickpayTopUp .createTime');
                vm.playerQuickpayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            $scope.safeApply();
        };

        vm.applyPlayerQuickpayTopUp = () => {
            let sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerQuickpayTopUp.amount,
                quickpayName: vm.playerQuickpayTopUp.quickpayName,
                quickpayAccount: vm.playerQuickpayTopUp.quickpayAccount,
                remark: vm.playerQuickpayTopUp.remark,
                createTime: vm.playerQuickpayTopUp.createTime.data('datetimepicker').getLocalDate()
            };
            vm.playerQuickpayTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyQuickpayTopUpRequest', sendData,
                data => {
                    vm.playerQuickpayTopUp.responseMsg = $translate('SUCCESS');
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                },
                error => {
                    vm.playerQuickpayTopUp.responseMsg = error.error.errorMessage;
                    socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }
            );
        };

        vm.cancelPlayerQuickpayTopUp = () => {
            if (!vm.existingQuickpayTopup) {
                return;
            }
            let sendQuery = {
                playerId: vm.selectedSinglePlayer.playerId,
                proposalId: vm.existingQuickpayTopup.proposalId
            };
            socketService.$socket($scope.AppSocket, 'cancelQuickpayTopup', sendQuery,
                data => {
                    if (vm.existingQuickpayTopup.proposalId == data.data.proposalId) {
                        vm.existingQuickpayTopup.isCanceled = true;
                    }
                    $scope.safeApply();
                },
                error => {
                    vm.playerQuickpayTopUp.responseMsg = error.error.errorMessage;
                    $scope.safeApply();
                }
            );
        };

        vm.getZoneList = function (provinceId, cityId) {
            vm.freezeZoneSelection = true;
            $scope.safeApply();
            var sendQuery = {
                provinceId: provinceId, cityId: cityId
            }
            socketService.$socket($scope.AppSocket, 'getZoneList', sendQuery, function (data) {
                console.log(data.data);
                if (!provinceId && !cityId) {
                    vm.provinceList = data.data.provinces || [];
                    vm.playerManualTopUp.provinceId = vm.provinceList[0].id;
                    vm.getZoneList(vm.playerManualTopUp.provinceId);
                } else if (provinceId && !cityId) {
                    vm.cityList = data.data.cities || [];
                    // vm.playerManualTopUp.cityId = vm.cityList[0].id;
                    vm.getZoneList(vm.playerManualTopUp.provinceId, vm.cityList[0].id);
                } else if (provinceId && cityId) {
                    vm.districtList = data.data.districts || [];
                    vm.playerManualTopUp.districtId = '';
                }
                vm.freezeZoneSelection = false;
                $scope.safeApply();
            });
        }

        vm.prepareClearPlayerProposalLimit = function () {
            vm.clearPlayerProposalLimit = {
                resMsg: '',
                showSubmit: true
            };
        }
        vm.requestClearProposalLimit = function () {
            vm.clearPlayerProposalLimit.resMsg = '';
            vm.clearPlayerProposalLimit.showSubmit = false;
            socketService.$socket($scope.AppSocket, 'requestClearProposalLimit', {username: vm.selectedSinglePlayer.name}, function (data) {
                vm.clearPlayerProposalLimit.resMsg = data;
                vm.clearPlayerProposalLimit.showSubmit = true;
                console.log('feedback', data);
                $scope.safeApply();
            }, function (err) {
                console.log('err', err);
            });
        }
        ///////////////////////////////// player feedback //////////////////////////////////////////
        vm.initFeedbackQuery = function () {
            vm.playerFeedbackQuery = vm.playerFeedbackQuery || {
                    isRealPlayer: "0",
                    playerLevel: "all",
                    trustLevel: "all",
                    lastLogin: "0",
                    lastFeedback: "0",
                    topUpTimes: "-1"
                };
            vm.feedbackPlayersPara = {numPerPage: '1'};
            vm.feedbackPlayersPara.index = 1;
            utilService.actionAfterLoaded('#lastFeedbackTime2', function () {
                vm.playerFeedbackQuery.lastAccessTime1 = utilService.createDatePicker('#lastAccessTime1');
                vm.playerFeedbackQuery.lastAccessTime2 = utilService.createDatePicker('#lastAccessTime2');
                vm.playerFeedbackQuery.lastFeedbackTime1 = utilService.createDatePicker('#lastFeedbackTime1');
                vm.playerFeedbackQuery.lastFeedbackTime2 = utilService.createDatePicker('#lastFeedbackTime2');

                vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerFeedbackQuery.lastFeedbackTime1.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
            });
            vm.playerLastLoginRange = '';
            $scope.safeApply();
        };

        vm.setLastAccessTimeRange = function () {
            switch(vm.playerLastLoginRange) {
                case '1_week':
                    vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(new Date(1970,1,1));
                    vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 6)));
                    break;
                case '2_week':
                    vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(new Date(1970,1,1));
                    vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 13)));
                    break;
                case '1_month':
                    vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(new Date(1970,1,1));
                    vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 29)));
                    break;
                default:
            }
            $scope.safeApply();
        };

        vm.submitPlayerFeedbackQuery = function (index) {
            if (!vm.selectedPlatform)return;
            console.log('vm.feedback', vm.playerFeedbackQuery);
            var sendQuery = {platform: vm.selectedPlatform.id};
            if (vm.playerFeedbackQuery.isRealPlayer == "1") {
                sendQuery.isRealPlayer = true;
            } else if (vm.playerFeedbackQuery.isRealPlayer == "2") {
                sendQuery.isTestPlayer = true;
            }
            if (vm.playerFeedbackQuery.playerLevel != "all") {
                sendQuery.playerLevel = vm.playerFeedbackQuery.playerLevel;
            }
            if (vm.playerFeedbackQuery.trustLevel != "all") {
                sendQuery.trustLevel = vm.playerFeedbackQuery.trustLevel;
            }
            if (vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').getLocalDate()
                || vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').getLocalDate()) {
                sendQuery.lastAccessTime = {
                    $gte: vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').getLocalDate() || new Date(0),
                    $lt: vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').getLocalDate() || new Date(),
                };
            }
            if (vm.playerFeedbackQuery.lastFeedbackTime1.data('datetimepicker').getLocalDate()
                || vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').getLocalDate()) {
                sendQuery.lastFeedbackTime = {
                    $gte: vm.playerFeedbackQuery.lastFeedbackTime1.data('datetimepicker').getLocalDate() || new Date(0),
                    $lt: vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').getLocalDate() || new Date(),
                }
            }

            if (vm.playerFeedbackQuery.topUpTimes != "-1") {
                switch (vm.playerFeedbackQuery.topUpTimes) {
                    case "0":
                        sendQuery.topUpTimes = 0;
                        break;
                    case "1"://today
                        sendQuery.topUpTimes = {
                            $gte: 1,
                            $lte: 2
                        };
                        break;
                    case "2":
                        sendQuery.topUpTimes = {
                            $gte: 3,
                            // $lt: 100
                        };
                        break;
                }
            }
            console.log('sendQuery', sendQuery);
            socketService.$socket($scope.AppSocket, 'getPlayerFeedbackQuery', {
                query: sendQuery,
                index: vm.feedbackPlayersPara.index - 1
            }, function (data) {
                vm.curFeedbackPlayer = data.data.data;
                vm.feedbackPlayersPara.total = data.data.total || 0;
                vm.feedbackPlayersPara.index = data.data.index + 1;
                if (!vm.curFeedbackPlayer) {
                    $scope.safeApply();
                    return;
                }
                vm.addFeedback = {
                    playerId: vm.curFeedbackPlayer ? vm.curFeedbackPlayer._id : null,
                    platform: vm.curFeedbackPlayer ? vm.curFeedbackPlayer.platform : null
                };
                vm.getPlayerNFeedback(vm.curFeedbackPlayer._id, null, function (data) {
                    vm.curPlayerFeedbackDetail = data;
                    $scope.safeApply();
                })
            });
        }
        vm.getFeedbackPlayer = function (inc) {
            if (inc == '+') {
                vm.feedbackPlayersPara.index += 1;
            } else if (inc == '-') {
                vm.feedbackPlayersPara.index -= 1;
            } else if ($.isNumeric(inc)) {
                vm.feedbackPlayersPara.index = inc;
            } else {
                vm.feedbackPlayersPara.index = 1;
            }
            if (vm.feedbackPlayersPara.index > vm.feedbackPlayersPara.total) {
                vm.feedbackPlayersPara.index = vm.feedbackPlayersPara.total;
            }
            if (vm.feedbackPlayersPara.index < 1) {
                vm.feedbackPlayersPara.index = 1;
            }
            vm.curPlayerFeedbackDetail = [];
            vm.submitPlayerFeedbackQuery(vm.feedbackPlayersPara.index);
            $scope.safeApply();
        }
        vm.addPlayerFeedback = function (data) {
            var sendData = {
                playerId: data.playerId,
                platform: data.platform,
                createTime: Date.now(),
                adminId: authService.adminId,
                content: data.content,
                result: data.result
            };
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'createPlayerFeedback', sendData, function () {
                vm.addFeedback.content = "";
                vm.addFeedback.result = "";
                vm.submitPlayerFeedbackQuery(vm.feedbackPlayersPara.index);
            });
        }
        vm.getPlayerCreditinFeedbackInfo = function () {
            vm.curFeedbackPlayer.gameCredit = {};
            for (var i in vm.platformProviderList) {
                vm.getPlayerCreditInProvider(vm.curFeedbackPlayer.name, vm.platformProviderList[i].providerId, vm.curFeedbackPlayer.gameCredit)
            }
        }
        ///////////////////////////////// player feedback //////////////////////////////////////////


        /////////////////////////////////// feedback admin /////////////////////////////////////////
        vm.initFeedbackAdmin = function (callback) {
            vm.feedbackAdminQuery = vm.feedbackAdminQuery || {};
            vm.feedbackAdminQuery.total = 0;
            let departmentID = vm.selectedPlatform.data.department;
            if (departmentID) {
                socketService.$socket($scope.AppSocket, 'getDepartment', {_id: vm.selectedPlatform.data.department}, function (data) {
                    vm.departmentUsers = data.data.users || [];
                    $scope.safeApply();
                });
            }
            vm.feedbackAdminQuery.admin = "any";
            $('#feedbackquerystarttime').datetimepicker({
                language: 'en',
                format: 'dd/MM/yyyy hh:mm:ss',
                pick12HourFormat: true,
                pickTime: true,
            });
            vm.feedbackAdminQuerystartDate = $("#feedbackquerystarttime").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

            $('#feedbackqueryendtime').datetimepicker({
                language: 'en',
                format: 'dd/MM/yyyy hh:mm:ss',
                pick12HourFormat: true
            });
            vm.feedbackAdminQueryendDate = $('#feedbackqueryendtime').data('datetimepicker').setLocalDate(utilService.getTodayEndTime());

            vm.feedbackAdminQuery = {
                result: 'all'
            };
            utilService.actionAfterLoaded("#feedbackAdminTablePage", function () {
                vm.feedbackAdminQuery.pageObj = utilService.createPageForPagingTable("#feedbackAdminTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "feedbackAdminQuery", vm.submitAdminPlayerFeedbackQuery)
                });
                vm.submitAdminPlayerFeedbackQuery(true);
            })
        }

        vm.submitAdminPlayerFeedbackQuery = function (newSearch) {

            var startTime = $('#feedbackquerystarttime').data('datetimepicker');
            var endTime = $('#feedbackqueryendtime').data('datetimepicker');

            var sendQuery = {
                query: {
                    platform: vm.selectedPlatform.id,
                    startTime: startTime.getLocalDate(),
                    endTime: endTime.getLocalDate()
                },
                index: vm.feedbackAdminQuery.index || 0,
                limit: vm.feedbackAdminQuery.limit || 10,
                sortCol: vm.feedbackAdminQuery.sortCol
            };

            if (vm.feedbackAdminQuery.admin && vm.feedbackAdminQuery.admin != 'all') {
                sendQuery.admin = vm.feedbackAdminQuery.admin;
            }
            if (vm.feedbackAdminQuery.player) {
                sendQuery.player = vm.feedbackAdminQuery.player;
            }
            if (vm.feedbackAdminQuery.result && vm.feedbackAdminQuery.result != 'all') {
                sendQuery.query.result = vm.feedbackAdminQuery.result
            }
            console.log("feedbackQuery", sendQuery);
            $('#loadPlayerFeedbackAdminIcon').show();
            socketService.$socket($scope.AppSocket, 'getAllPlayerFeedbacks', sendQuery, function (data) {
                console.log('feedback', data);
                vm.feedbackAdmins = data.data.data || [];
                vm.feedbackAdmins.total = data.data.size;
                vm.drawFeedbackAdminTable(data.data.size, newSearch, data.data.summary);
                $('#loadPlayerFeedbackAdminIcon').hide();
            });
        }
        vm.drawFeedbackAdminTable = function (size, newSearch, summary) {
            var showData = [];
            $.each(vm.feedbackAdmins, function (i, j) {
                j.createTime$ = utilService.getFormatTime(j.createTime);
                j.result$ = $translate(j.result);
                j.topupTimes$ = (j.result == 'Normal') ? j.topupTimes : 0;
                j.amount$ = (j.result == 'Normal') ? (j.amount).toFixed(2) : new Number(0).toFixed(2);
                showData.push(j);
            })
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                order: vm.feedbackAdminQuery.aaSorting || [[2, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'topupTimes', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'amount', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('ADMIN'),
                        //data: "result",
                        render: function (data, type, row) {
                            return (row.adminId ? row.adminId.adminName : row.creator);
                        }
                    },
                    {title: $translate('PLAYER'), data: "playerId.name"},
                    {
                        title: $translate('CREATETIME'), data: "createTime$", bSortable: true
                        // render: function (data, type, row) {
                        //     return utilService.getFormatTime(data);
                        // }
                    },
                    {
                        title: $translate('FEEDBACK_RESULTS'), data: "result$",
                        // render: function (data, type, row) {
                        //     return $translate(data);
                        // }
                    },
                    {title: $translate('FEEDBACK_CONTENT'), data: "content", className: 'feedbackAdminContent sumText'},
                    {
                        title: $translate('topUpTimes'),
                        data: "topupTimes$", bSortable: true,
                        className: "feedbackAdminTopupTime alignRight sumInt",
                        render: function (data, type, row) {
                            var $a = $('<a>', {
                                'ng-click': "vm.selectedSinglePlayer={_id:" + JSON.stringify(row.playerId._id) + '};' + 'vm.prepareShowPagePlayerTopup(' + JSON.stringify(row.createTime) + ')'
                            }).text(data);
                            // $compile($a.prop('outerHTML'))($scope);
                            return $a.prop('outerHTML');
                        },
                        "fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
                            $compile(nTd)($scope)
                        }
                    },
                    {
                        title: $translate('CREDIT'),
                        data: "amount$", bSortable: true,
                        className: "feedbackAdminAmount alignRight sumFloat"
                    },
                ],
                "paging": false,
            });
            var aTable = utilService.createDatatableWithFooter("#feedbackAdminTable", tableOptions, summary, true);
            vm.feedbackAdminQuery.pageObj.init({maxCount: size}, newSearch);
            $("#feedbackAdminTable").off('order.dt');
            $("#feedbackAdminTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'feedbackAdminQuery', vm.submitAdminPlayerFeedbackQuery);
            });
            $("#playerAlmostLevelUpTable").resize();

            $scope.safeApply();
            aTable.columns.adjust().draw();
            $('#feedbackAdminTable').resize();
            $('#feedbackAdminTable').resize();

        }
        /////////////////////////////////// feedback admin /////////////////////////////////////////

        ////////////////////////////////////////////////////////////////////////////////////Mark::partner functions//////////////////

        var setPartnerTableData = function (data) {
            return setTableData(vm.partnerTable, data);
        };

        //get all platform partners data from server
        vm.getPlatformPartnersData = function () {
            if (!authService.checkViewPermission('Platform', 'Partner', 'Read')) {
                return;
            }
            $('#partnerRefreshIcon').addClass('fa-spin');

            vm.advancedPartnerQueryObj = vm.advancedPartnerQueryObj || {
                "platformId": vm.selectedPlatform.id,
                "index": 0,
                "limit": 10,

            }

            var sendData ={
                "platform":{
                    "platformId":vm.selectedPlatform.id,
                    "index":vm.advancedPartnerQueryObj.index,
                    "limit":vm.advancedPartnerQueryObj.limit,
                    "sortCol":vm.advancedPartnerQueryObj.sortCol
                }
            }

            socketService.$socket($scope.AppSocket, 'getPartnersByPlatform', sendData ,success);

            function success(data) {
                console.log('getPartnersByPlatform output', data);
                vm.partnerIdObj = {};
                var partnersObjId = [];
                $.each(data.data.data, function (i, v) {
                    vm.partnerIdObj[v._id] = v;
                    vm.partnerIdObj[v.partnerName] = v;
                    partnersObjId.push(v._id);
                });

                socketService.$socket($scope.AppSocket, 'getPartnersPlayerInfo', {
                    platformObjId: vm.selectedPlatform.id,
                    partnersObjId: partnersObjId
                }, function (playersInfo) {

                    vm.partnerPlayerObj = {};
                    $.each(playersInfo.data, function (i, v) {
                        vm.partnerPlayerObj[v.partnerId] = v;
                    });
                    vm.advancedPartnerQueryObj = vm.advancedPartnerQueryObj || {};
                    vm.drawPartnerTable(data.data);

                });
                $('#partnerRefreshIcon').removeClass('fa-spin');

            }
        };

        vm.getPartnersByAdvancedQueryDebounced = $scope.debounceSearch(function (partnerQuery) {

            utilService.hideAllPopoversExcept();
            vm.advancedPartnerQueryObj = $.extend({}, vm.advancedPartnerQueryObj, partnerQuery);
            for (var k in partnerQuery) {
                if (!partnerQuery[k] || $.isEmptyObject(partnerQuery)) {
                    delete vm.advancedPartnerQueryObj[k];
                }
            }
            vm.advancedPartnerQueryObj.index = 0;
            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: vm.advancedPartnerQueryObj
            };
            socketService.$socket($scope.AppSocket, 'getPartnersByAdvancedQuery', apiQuery, function (reply) {
                setPartnerTableData(reply.data.data);
                vm.searchPartnerCount = reply.data.size;
                vm.advancedPartnerQueryObj.pageObj.init({maxCount: reply.data.size}, true);
                $scope.safeApply();
            });
        });

        vm.activatePlayerTab = function () {
            setTimeout(() => {
                $('#playerDataTable').resize();
            }, 300);
        };

        vm.activatePartnerTab = function () {
            setTimeout(() => {
                $('#partnerDataTable').resize();
            }, 300);
        };

        //draw partner table based on data
        vm.drawPartnerTable = function (data) {
            //convert decimal to 2 digits
            data.data.forEach((partner) => {
                if (partner.credits) {
                    partner.credits = partner.credits.toFixed(2);
                }
                if (partner.registrationTime) {
                    partner.registrationTime = utilService.getFormatTime(partner.registrationTime);
                }
                if (partner.lastAccessTime) {
                    partner.lastAccessTime = utilService.getFormatTime(partner.lastAccessTime)
                }
            });
            vm.partners = data.data;
            vm.platformPartnerCount = data.size;
            vm.selectedPartnerCount = 0;
            vm.searchPartnerCount = data.size;
            var emptyString = (vm.curPlatformText) ? ('No partner found in ' + vm.curPlatformText) : 'Please select platform';
            var tableOptions = {
                data: data.data,
                aaSorting: [],
                columns: [
                    //{
                    //    title: '#', "data": "select",
                    //    render: function (data, type, row) {
                    //        return '<input type="checkbox" class="editor-active readonly" disabled="disabled">';
                    //    }
                    //},
                    //{title: 'ID', "data": "_id"},
                    {title: $translate('PARTNER_ID'), data: 'partnerId', advSearch: true, "sClass": ""},
                    {
                        title: $translate('PARTNER_NAME'), data: "partnerName", advSearch: true, "sClass": "",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.showPartnerInfoModal("' + data + '")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('REAL_NAME'), data: "realName", orderable: false,
                        advSearch: true, "sClass": "wordWrap realNameCell"
                    },
                    {
                        title: $translate('MOBILE'), data: 'phoneNumber',
                        render: function (data, type, row) {
                            data = data || '';
                            return $('<a class="telPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                                'data-placement="right" data-trigger="focus" type="button" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text(data)
                                .prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('STATUS'), data: 'status',
                        render: function (data, type, row) {
                            var showText = $translate(vm.allPartnersStatusKeys[data - 1]) || 'No Value';
                            var textClass = '';

                            return $('<a class="partnerStatusPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                                'data-placement="right" data-trigger="focus" type="button" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text(showText)
                                .addClass(textClass)
                                .prop('outerHTML');
                        },
                        advSearch: true,
                        filterConfig: {
                            type: "dropdown",
                            options: vm.allPartnersStatusKeys.map(function (status) {
                                return {
                                    value: vm.allPartnersStatusString[status],
                                    text: $translate(status)
                                };
                            })
                        },
                        "sClass": ""
                    },
                    {
                        title: $translate('PARENT'),
                        data: 'parent',
                        orderable: false,
                        "sClass": "sumText",
                        render: function (data, type, row) {
                            data = data ? data.partnerName : '';
                            return data;
                        }
                    },
                    {
                        title: $translate('CHILDREN'),
                        data: 'childrencount',
                        "sClass": "alignRight sumInt",
                        render: function (data, type, row) {
                            data = data;
                            //var showStr=$('<div>');
                            var showStr = $('<a>', {
                                'class': "partnerChildrenPopover",
                                'style': "z-index: auto",
                                'data-toggle': "popover",
                                'data-container': "body",
                                'data-placement': "bottom",
                                'data-trigge': "focus",
                                'data-row': JSON.stringify(row),
                            }).text(data);
                            //return data.length;
                            return showStr.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('REFERRAL_PLAYER'), data: 'totalReferrals',
                        render: function (data, type, row) {
                            var $a = $('<a>', {
                                // class: "totalReferralPopover",
                                // style: "z-index: auto",
                                // "data-toggle": "popover",
                                // "data-container": "body",
                                // "data-placement": "bottom",
                                // "data-trigger": "focus",
                                // "data-row": JSON.stringify(row),
                                "ng-click": "vm.preShowReferralPlayer(" + data + ")"
                                // type: "button",
                                // "data-html": "true",
                                // href: "#"
                            }).text(data);
                            return $a.prop('outerHTML');
                        },
                        "sClass": "alignRight sumInt",
                    },
                    {
                        title: $translate('CREDIT'),
                        "sClass": "alignRight sumFloat",
                        data: 'credits'
                    },
                    {
                        title: $translate('REGISTRATION_TIME'), data: 'registrationTime'
                        // render: function (data, type, row) {
                        //     return utilService.getFormatTime(data);
                        // }
                    },
                    {
                        title: $translate('PARTNER_LEVEL_SHORT'),
                        data: 'level',
                        render: function (level, type, row) {
                            return level ? $('<a class="partnerLevelPopover" style="z-index: auto" data-toggle="popover" data-container="body" ' +
                                'data-placement="right" data-trigger="focus" type="button" data-html="true" href="#">')
                                .attr('data-row', JSON.stringify(row))
                                .text($translate(level.name))
                                .prop('outerHTML') : "";
                        },
                        advSearch: true,
                        filterConfig: {
                            type: "dropdown",
                            options: vm.allPartnerLevels.map(function (level) {
                                return {
                                    value: level._id,
                                    text: $translate(level.name)
                                };
                            })
                        },
                        "sClass": ""
                    },
                    {
                        title: $translate('PERMISSION'),
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || {permission: {}};

                            let link = $('<a>', {
                                'class': 'partnerPermissionPopover',
                                'ng-click': "vm.permissionPartner = " + JSON.stringify(row), // @todo: escaping issue
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'popover',
                                'data-trigger': 'focus',
                                'data-placement': 'bottom',
                                'data-container': 'body',
                            });
                            let perm = (row && row.permission) ? row.permission : {};
                            link.append($('<i>', {
                                'class': 'fa fa-user-times margin-right-5 ' + (perm.disableCommSettlement === true ? "text-primary" : "text-danger"),
                            }));
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('LAST_ACCESS_TIME'), data: 'lastAccessTime'
                        // render: function (data, type, row) {
                        //     return utilService.getFormatTime(data);
                        // }
                    },
                    {
                        title: $translate('LAST_LOGIN_IP'), orderable: false,
                        data: 'lastLoginIp'
                    },
                    {
                        title: $translate('ACTIVE_PLAYER'), data: '_id',
                        render: function (data, type, row) {
                            var num = vm.partnerPlayerObj[data] ? vm.partnerPlayerObj[data].activePlayers : 0;
                            var $a = $('<a>', {
                                class: "activeReferralPopover",
                                style: "z-index: auto",
                                "data-toggle": "popover",
                                "data-container": "body",
                                "data-placement": "bottom",
                                "data-trigger": "focus",
                                "data-row": JSON.stringify(row),
                                type: "button",
                                "data-html": "true",
                                href: "#"
                            }).text(num);
                            return $a.prop('outerHTML');
                        },
                        "sClass": "alignRight sumInt",
                    },
                    {
                        title: $translate('VALID_PLAYER'), data: '_id',
                        render: function (data, type, row) {
                            var num = vm.partnerPlayerObj[data] ? vm.partnerPlayerObj[data].validPlayers : 0;
                            var $a = $('<a>', {
                                class: "validReferralPopover",
                                style: "z-index: auto",
                                "data-toggle": "popover",
                                "data-container": "body",
                                "data-placement": "bottom",
                                "data-trigger": "focus",
                                "data-row": JSON.stringify(row),
                                type: "button",
                                "data-html": "true",
                                href: "#"
                            }).text(num);
                            return $a.prop('outerHTML');
                        },
                        "sClass": "alignRight sumInt",
                    },
                    {title: $translate('VALID_REWARD'), data: 'validReward', "sClass": "alignRight sumFloat"},
                ],
                "autoWidth": true,
                "scrollX": true,
                // "scrollY": "480px",
                "scrollCollapse": true,
                "destroy": true,
                "paging": false,
                "language": {
                    "info": "",
                    "emptyTable": $translate("No data available in table"),
                },
                "dom": 'Zirtlp',
                fnRowCallback: vm.partnerTableRowClick,
                fnDrawCallback: function (oSettings) {
                    var container = oSettings.nTable;

                    function hideReferral(type, data, that) {
                        if (type == 'total') {
                            vm.referralPopoverTitle = $translate("Total referral players for ");
                            vm.getPartnerReferralPlayers(data, function () {
                                $(that).popover('show');
                            });
                        } else if (type == 'active') {
                            vm.referralPopoverTitle = $translate("Total referral active players for ");
                            vm.getPartnerActivePlayers(data, function () {
                                $(that).popover('show');
                            });
                        } else if (type == 'valid') {
                            vm.referralPopoverTitle = $translate("Total referral valid players for ");
                            vm.getPartnerValidPlayers(data, function () {
                                $(that).popover('show');
                            });
                        }
                    }

                    utilService.setupPopover({
                        context: container,
                        elem: '.partnerStatusPopover',
                        content: function () {
                            //console.log('this', this);
                            vm.partnerStatusHistory = null;
                            var data = JSON.parse(this.dataset.row);
                            vm.partnerStatusPopover = data;
                            $scope.safeApply();
                            $('.partnerStatusConfirmation').hide();
                            return $compile($('#partnerStatusPopover').html())($scope);
                        },
                        callback: function () {
                            var data = JSON.parse(this.dataset.row);
                            var thisPopover = utilService.$getPopoverID(this);
                            var rowData = JSON.parse(this.dataset.row);
                            var status = rowData.status;

                            $scope.safeApply();
                            $("button.partnerStatusHistory").on('click', function () {
                                Q.all(vm.getPartnerStatusChangeLog(vm.partnerStatusPopover))
                                    .then(function (data) {
                                        console.log('vm.partnerStatusHistory', vm.partnerStatusHistory);
                                    }, function (error) {
                                    })
                                    .done()
                            });
                            $("button.partnerStatusConfirm").on('click', function () {
                                if ($(this).hasClass('disabled')) {
                                    return;
                                }
                                var reason = $(thisPopover).find('.partnerStatusChangeReason').val();
                                var sendData = {
                                    _id: rowData._id,
                                    status: status,
                                    reason: reason,
                                    adminName: authService.adminName
                                }
                                vm.updatePartnerStatus(rowData, sendData);
                                $('.partnerStatusConfirmation').hide();
                                $(".partnerStatusPopover").popover('hide');
                            });
                            $("textarea.partnerStatusChangeReason").keyup(function () {
                                var reason = $(thisPopover).find('.partnerStatusChangeReason').val();
                                if (reason) {
                                    $(thisPopover).find('.partnerStatusConfirm').removeClass('disabled');
                                } else {
                                    $(thisPopover).find('.partnerStatusConfirm').addClass('disabled');
                                }
                            });

                            $("button.partnerStatusCancel").on('click', function () {
                                $('.partnerStatusConfirmation').hide();
                                $(".partnerStatusPopover").popover('hide');
                            });


                            $("input.partnerStatusChange").on('click', function () {
                                rowData = JSON.parse(this.dataset.row);
                                status = this.dataset.status;
                                console.log('this:partnerStatusChange:onClick', rowData, status);
                                $scope.safeApply();

                                console.log($('.partnerStatusConfirmation'));
                                $('.partnerStatusConfirmation').show();
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: ".validReferralPopover",
                        onClick: function (e) {
                            var data = JSON.parse(this.dataset.row);
                            hideReferral('valid', data, this);
                        },
                        content: function () {
                            console.log('validReferral');
                            return $('#totalReferralPopover').html();
                        }
                    });
                    utilService.setupPopover({
                        context: container,
                        elem: ".partnerChildrenPopover",
                        onClick: function (e) {
                            var data = JSON.parse(this.dataset.row);
                            console.log('data', data);
                            //hideReferral('valid', data, this);
                            vm.partnerChildren = data.children;
                            $scope.safeApply();
                        },
                        content: function () {
                            console.log('validReferral');
                            return $('#partnerChildrenPopover').html();
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: ".activeReferralPopover",
                        onClick: function (e) {
                            var data = JSON.parse(this.dataset.row);
                            hideReferral('active', data, this);
                        },
                        content: function () {
                            console.log('activeReferral');
                            return $('#totalReferralPopover').html();
                        }
                    });

                    // utilService.setupPopover({
                    //     context: container,
                    //     elem: ".totalReferralPopover",
                    //     onClick: function (e) {
                    //         var data = JSON.parse(this.dataset.row);
                    //         hideReferral('total', data, this);
                    //     },
                    //     content: function () {
                    //         console.log('totalreferral', this);
                    //         vm.partnerData = JSON.parse(this.dataset.row);
                    //         return $('#totalReferralPopover').html();
                    //     }
                    // });

                    utilService.setupPopover({
                        context: container,
                        elem: ".telPopover",
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.telphonePartner = data;
                            $scope.safeApply();
                            return $('#telPopover').html();
                        },
                        callback: function () {
                            $("button.playerMessage").on('click', function () {
                                // alert("will send message to " + vm.telphonePartner.partnerName);
                                vm.smsPartner = {
                                    partnerId: vm.telphonePartner.partnerId,
                                    name: vm.telphonePartner.partnerName,
                                    realName: vm.telphonePartner.realName,
                                    platformId: vm.selectedPlatform.data.platformId,
                                    channel: $scope.channelList[0],
                                    hasPhone: vm.telphonePartner.phoneNumber
                                }
                                vm.sendSMSResult = {};
                                $(".telPopover").popover('hide');
                                $scope.safeApply();
                                $('#smsPartnerModal').modal('show');

                            });
                            $("button.playerTelephone").on('click', function () {
                                var phoneCall = {
                                    playerId: vm.telphonePartner.playerId,
                                    name: vm.telphonePartner.partnerName,
                                    toText: vm.telphonePartner.partnerName,
                                    platform: "jinshihao",
                                    loadingNumber: true,
                                }
                                $scope.initPhoneCall(phoneCall);
                                socketService.$socket($scope.AppSocket, 'getPartnerPhoneNumber', {partnerObjId: vm.telphonePartner._id}, function (data) {
                                    $scope.phoneCall.phone = data.data;
                                    $scope.phoneCall.loadingNumber = false;
                                    $scope.safeApply();
                                    $('#phoneCallModal').modal('show');
                                }, function (err) {
                                    $scope.phoneCall.loadingNumber = false;
                                    $scope.phoneCall.err = err.error.message;
                                    $scope.safeApply();
                                    $('#phoneCallModal').modal('show');
                                }, true);

                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: ".partnerLevelPopover",
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.partnerLevelPopover = data;
                            $scope.safeApply();
                            return $('#partnerLevelPopover').html();
                        },
                        callback: function () {
                            $("input.partnerLevelChange").on('click', function () {
                                console.log("input.partnerLevelChange caught click")
                                var rowData = JSON.parse(this.dataset.row);
                                var levelId = this.dataset.levelId;
                                var levelName = this.dataset.levelName;
                                $(".partnerLevelPopover").popover('hide');
                                GeneralModal.confirm({
                                    title: $translate('Confirm Partner Level Change'),
                                    text: $translate('The level of ') + rowData.partnerName + $translate(' will be updated to ') + levelName
                                }).then(function () {
                                    updatePartnerData(rowData, {level: levelId});
                                });
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.partnerPermissionPopover',
                        onClickAsync: function (showPopover) {
                            let that = this;
                            let row = JSON.parse(this.dataset.row);
                            vm.partnerPermissionTypes = {
                                disableCommSettlement: {imgType: 'i', iconClass: "fa fa-user-times"}
                            };
                            $("#partnerPermissionTable td").removeClass('hide');
                            $.each(vm.partnerPermissionTypes, function (key, v) {
                                if (row.permission && row.permission[key]) {
                                    $("#partnerPermissionTable .permitOff." + key).addClass('hide');
                                } else {
                                    $("#partnerPermissionTable .permitOn." + key).addClass('hide');
                                }
                            });
                            $scope.safeApply();
                            showPopover(that, '#partnerPermissionTable', row);
                        },
                        callback: function () {
                            let changeObj = {};
                            let thisPopover = utilService.$getPopoverID(this);
                            let $remark = $(thisPopover + ' .permissionRemark');
                            let $submit = $(thisPopover + ' .submit');
                            $submit.prop('disabled', true);
                            $(thisPopover + " .togglePartner").on('click', function () {
                                let key = $(this).data("which");
                                let select = $(this).data("on");
                                changeObj[key] = !select;
                                $(thisPopover + ' .' + key).toggleClass('hide');
                                $submit.prop('disabled', $remark.val() == '');
                            });

                            $remark.on('input selectionchange propertychange', function () {
                                $submit.prop('disabled', this.value.length === 0 || changeObj == {})
                            });

                            $submit.on('click', function () {
                                $submit.off('click');
                                $(thisPopover + " .togglePlayer").off('click');
                                $remark.off('input selectionchange propertychange');
                                socketService.$socket($scope.AppSocket, 'updatePartnerPermission', {
                                    query: {
                                        platform: vm.permissionPartner.platform,
                                        _id: vm.permissionPartner._id
                                    },
                                    admin: authService.adminId,
                                    permission: changeObj,
                                    remark: $remark.val()
                                }, function (data) {
                                    vm.getPlatformPartnersData();
                                }, null, true);
                                $(thisPopover).popover('hide');
                            })

                        }
                    });

                    $('#partnerDataTable').resize();
                    $('#partnerDataTable').resize();
                }
            };
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = "";
            });
            vm.partnerTable = $('#partnerDataTable').DataTable(tableOptions);
            utilService.setDataTablePageInput('partnerDataTable', vm.partnerTable, $translate);

            createAdvancedSearchFilters({
                tableOptions: tableOptions,
                filtersElement: '#partnerTable-search-filters',
                queryFunction: vm.getPartnersByAdvancedQueryDebounced
            });
            vm.advancedPartnerQueryObj.pageObj.init({maxCount: data.size});
            $scope.safeApply();
        };
        vm.sendSMSToPartner = function () {
            vm.sendSMSResult = {sent: "sending"};
            return $scope.sendSMSToPlayer(vm.smsPartner, function (data) {
                vm.sendSMSResult = {sent: true, result: data.success};
                $scope.safeApply();
            });
        }
        vm.partnerTableRowClick = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // Row click
            $compile(nRow)($scope);


            var status = aData.status;
            aData.credits = parseFloat(aData.credits);
            var statusKey = '';
            $.each(vm.allPartnersStatusString, function (key, val) {
                if (status == val) {
                    statusKey = key;
                    return true;
                }
            });

            var colorObj = {
                NORMAL: '#337ab7',
                FORBID: 'red',
                FORBID_GAME: 'orange'
            }

            $(nRow).find('td:contains(' + $translate(statusKey) + ')').each(function (i, v) {
                $(v).find('a').eq(0).css('color', colorObj[statusKey]);
            })

            $(nRow).off('click');
            $(nRow).on('click', function () {
                // $('#partnerDataTable tbody tr').removeClass('partnerSelected');
                $('#partnerDataTable tbody tr').removeClass('selected');
                // $(this).toggleClass('partnerSelected');
                $(this).toggleClass('selected');
                //$(this).find('input').each(function () {
                //    this.checked = !this.checked;
                //});
                //vm.selectedPartnerCount = vm.partnerTable.rows('.partnerSelected').data().length;
                //if (vm.selectedPartner[aData._id]) {
                //    delete vm.selectedPartner[aData._id];
                //    //vm.selectedSinglePartner = {};
                //}
                //else {
                //    vm.selectedPartner[aData._id] = aData;
                //    //vm.selectedSinglePartner = aData;
                //}
                //if (vm.selectedPartnerCount == 1) {
                //    $.each(vm.selectedPartner, function (i, v) {
                //        vm.selectedSinglePartner = v;
                //    })
                //    console.log('single partner selected', vm.selectedSinglePartner);
                //}
                vm.selectedSinglePartner = aData;

                vm.isOneSelectedPartner = function () {
                    return vm.selectedSinglePartner;
                };

                // Mask partners bank account
                vm.selectedSinglePartner.bankAccount =
                    vm.selectedSinglePartner.bankAccount ?
                        vm.selectedSinglePartner.bankAccount.slice(0, 6) + "**********" + vm.selectedSinglePartner.bankAccount.slice(-4)
                        : null;

                vm.selectedPartnerCount = 1;
                console.log('partner selected', vm.selectedSinglePartner);
                $scope.safeApply();
                //vm.partnerTableRowClicked(aData);
            });
        };
        //show partner info modal
        vm.showPartnerInfoModal = function (partnerName) {
            $('#modalPartnerInfo').modal().show();
            // $scope.safeApply();
        };
        //Create new partner
        vm.prepareCreatePartner = function () {
            vm.newPartner = {};
            vm.tempPassword = "";
            $(".partnerParentFalse").hide();
            $(".partnerParentTrue").hide();
            vm.partnerParentChange("id");
            vm.newPartner.domain = window.location.hostname;
        }
        vm.partnerParentChange = function (type) {
            var result = false, empty = false;
            if (type == 'name' && !vm.newPartner.parentName) {
                result = true;
                vm.newPartner.parent = null;
            } else if (type == 'id' && !vm.newPartner.parent) {
                result = true;
                empty = true;
            } else if (type == 'name' && vm.partnerIdObj[vm.newPartner.parentName]) {
                vm.newPartner.parent = vm.partnerIdObj[vm.newPartner.parentName]._id;
                result = true
            } else if (type == 'id' && vm.partnerIdObj[vm.newPartner.parent._id]) {
                vm.newPartner.parentName = vm.partnerIdObj[vm.newPartner.parent._id].partnerName;
                result = true;
            } else {
                result = false;
            }
            if (result) {
                $(".partnerParentFalse").hide();
                if (!empty) {
                    $(".partnerParentTrue").show();
                }
                vm.partnerParentValid = true;
            } else {
                $(".partnerParentFalse").show();
                $(".partnerParentTrue").hide();
                vm.partnerParentValid = false;
            }
            $scope.safeApply();
        }
        vm.createNewPartner = function () {
            var str = 'createPartner';
            vm.newPartner.platform = vm.selectedPlatform.id;
            if (vm.newPartner.parent) {
                str = 'createPartnerWithParent'
            }
            console.log(vm.newPartner);

            socketService.$socket($scope.AppSocket, str, vm.newPartner, function (data) {
                console.log("create OK", data);
                vm.getPlatformPartnersData();
            }, function (data) {
                console.log("create not", data);
                vm.getPlatformPartnersData();
            });
        };

        //Delete selected partners
        vm.deletePartners = function () {
            //var _ids = [];
            //if (vm.selectedPartner) {
            //    for (var key in vm.selectedPartner) {
            //        //if (vm.selectedPartner[key]) {
            //        //console.log(key);
            //        _ids.push(key);
            //        //}
            //    }
            //}
            var _ids = [vm.selectedSinglePartner._id];
            console.log(_ids);
            if (_ids.length > 0) {
                socketService.$socket($scope.AppSocket, 'deletePartnersById', {_ids: _ids}, function (data) {
                    console.log("deletePartnersById", data);
                    vm.getPlatformPartnersData();
                });
            }
        };

        //Edit selected partner
        vm.preUpdatePartner = function () {
            vm.newPartner = $.extend({}, vm.selectedSinglePartner);
            vm.newPartner.ownDomain$ = vm.newPartner.ownDomain.join('\n');
            vm.newPartner.registrationTime$ = vm.dateReformat(vm.newPartner.registrationTime);
            vm.isEditingPartner = false;
            vm.partnerValidity = {};
            vm.tempPlayerId = null;
            vm.partnerParentChange("id");
            if (vm.newPartner.player) {
                vm.getPlayerInfo({_id: vm.newPartner.player});
            }
            // $scope["form_edit_partner"].$setValidity('invalidOwnDomain', false)
            $scope.safeApply();
        }
        vm.updatePartner = function () {
            if (vm.selectedSinglePartner) {
                delete vm.newPartner.phoneNumber;
                if (vm.tempPlayerId && vm.partnerValidity.player.validPlayerId
                    && vm.partnerValidity.player.exists === false && vm.partnerValidity.player.playerId == vm.tempPlayerId) {
                    vm.newPartner.player = vm.partnerValidity.player.id;
                }
                if (vm.newPartner.ownDomain$) {
                    vm.newPartner.ownDomain = vm.newPartner.ownDomain$.split('\n');
                } else {
                    vm.newPartner.ownDomain = [];
                }
                delete vm.newPartner.ownDomain$;
                delete vm.newPartner.registrationTime$;
                delete vm.newPartner.parentName;
                var updateData = newAndModifiedFields(vm.selectedSinglePartner, vm.newPartner);
                updatePartnerData(vm.selectedSinglePartner._id, updateData);
            }
        };
        function updatePartnerData(partnerId, newData) {
            if (newData) {
                newData.updateData = $.extend({}, newData);
                newData.partnerObjId = partnerId;
                newData.partnerName = vm.selectedSinglePartner.partnerName;
            }
            socketService.$socket($scope.AppSocket, 'createUpdatePartnerInfoProposal', {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                data: newData,
                platformId: vm.selectedPlatform.id

            }, function (data) {
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPartnersData();
            }, null, true);
        }

        //Enable or disable selected partner
        vm.updatePartnerStatus = function (rowData, sendData) {
            console.log('update partner status\n', rowData, sendData);
            socketService.$socket($scope.AppSocket, 'updatePartnerStatus', sendData, function (data) {
                vm.getPlatformPartnersData();
            });
        };

        vm.getPartnerStatusChangeLog = function (rowData) {
            var deferred = Q.defer();
            console.log('partnerStatusLog rowData\n', rowData);
            socketService.$socket($scope.AppSocket, 'getPartnerStatusChangeLog', {
                _id: rowData._id
            }, function (data) {
                console.log('partnerStatus logData \n', data.data);
                vm.partnerStatusHistory = data.data || [];
                $scope.safeApply();
                deferred.resolve(true);
            });
            // return Q.when(true);
            return deferred.promise;
        }

        vm.checkOwnDomain = function (value, form) {
            var difArrays = function (array1, array2) {
                var res = [];
                var has = {};
                for (var i = 0, max = array1.length; i < max; i++) {
                    has[array1[i]] = true;
                }
                for (var i = 0, max = array2.length; i < max; i++) {
                    if (!has[array2[i]]) {
                        res.push(array2[i]);
                    }
                }
                return res;
            };

            /////
            vm.partnerValidity.ownDomainInvalidName = '';
            vm.partnerValidity.ownDomainInvalidURL = false;
            vm.partnerValidity.ownDomainDuplicate = false;
            if (!value) return;
            var urlArr = value.split('\n');
            for (var i in urlArr) {
                var parser = document.createElement('a');
                parser.href = urlArr[i];
                if (!parser.host || parser.host == window.location.host) {
                    vm.partnerValidity.ownDomainInvalidName += urlArr[i];
                    vm.partnerValidity.ownDomainInvalidName += ', ';
                    vm.partnerValidity.ownDomainInvalidURL = true;
                }
            }
            //form.ownDomain.$setValidity('invalidOwnDomainURL', !vm.partnerValidity.ownDomainInvalidURL);
            var time = new Date().getTime();
            var newDomains = difArrays(vm.selectedSinglePartner.ownDomain, value.split('\n'));
            socketService.$socket($scope.AppSocket, 'checkOwnDomainValidity', {
                partner: vm.newPartner._id,
                value: newDomains,
                time: time
            }, function (data) {
                console.log('data', data);
                if (data && data.data.exists) {
                    vm.partnerValidity.ownDomainDuplicate = true;
                    vm.partnerValidity.ownDomainName = '';
                    data.data.data.map(item => {
                        vm.partnerValidity.ownDomainName += item;
                        vm.partnerValidity.ownDomainName += ' ';
                    })
                }
                form.ownDomain.$setValidity('invalidOwnDomain', !vm.partnerValidity.ownDomainDuplicate)
                $scope.safeApply();
            })
            $scope.safeApply();
        }
        vm.checkPartnerField = function (fieldName, value, form) {
            socketService.$socket($scope.AppSocket, 'checkPartnerFieldValidity', {
                fieldName: fieldName,
                value: value
            }, function (data) {
                if (data && data.data && data.data[fieldName]) {
                    if (data.data[fieldName] != value) {
                        return vm.checkPartnerField(fieldName, value, form);
                    }
                    if (fieldName != 'player') {
                        vm.partnerValidity[fieldName] = data.data.exists ? false : true;
                    }
                    else {
                        vm.partnerValidity.player = {
                            validPlayerId: data.data.valid,
                            exists: data.data.exists,
                            id: data.data.player_id,
                            playerId: value
                        }
                    }
                } else {
                    vm.partnerValidity[fieldName] = false;
                }
                form.$setValidity('invalidPartnerPlayer', vm.partnerValidity[fieldName])
                $scope.safeApply();
            });
        }
        vm.getPlayerInfo = function (query) {
            var myQuery = {
                _id: query._id,
                playerId: query.playerId
            }
            socketService.$socket($scope.AppSocket, 'getPlayerInfo', myQuery, function (data) {
                console.log('playerData', data);
                vm.playerDetail = vm.playerDetail || {};
                vm.playerDetail[data.data._id] = data.data;
                vm.playerDetail[data.data.playerId] = data.data;
                $scope.safeApply();
            });
        }

        vm.preLinkedPlayertoPartner = function () {
            vm.linkPlayerText = '';
            vm.linkPlayerTextChange();
        }
        vm.linkPlayerTextChange = function () {
            var myQuery = {
                platform: vm.selectedPlatform.id,
                name: vm.linkPlayerText
            }
            if (!vm.linkPlayerText) {
                vm.linkPlayerFound = false;
                vm.linkPlayerStatement = $translate("Cannot find player");
                $("i.linkPlayerTextFalse").show();
                $("i.linkPlayerTextTrue").hide();
                return;
            }
            socketService.$socket($scope.AppSocket, 'getPlayerInfo', myQuery, function (data) {
                if (data.data) {
                    var valid = true;
                    vm.linkPlayerStatement = '';
                    if (vm.selectedSinglePartner && vm.selectedSinglePartner.player == data.data._id) {
                        valid = false; //linkplayer cannot be the binded player
                        vm.linkPlayerStatement = $translate("This player is already binded.");
                    } else if (data.data && data.data.partner) {
                        valid = false; //this player already had a partner
                        vm.linkPlayerStatement = $translate("This player is already linked.");
                    }
                    vm.linkPlayerFound = valid;
                    vm.linkPlayerData = valid ? data.data : null;
                } else {
                    vm.linkPlayerFound = false;
                    vm.linkPlayerStatement = $translate("Cannot find player");
                }
                if (vm.linkPlayerFound) {
                    $("i.linkPlayerTextFalse").hide();
                    $("i.linkPlayerTextTrue").show();
                } else {
                    $("i.linkPlayerTextFalse").show();
                    $("i.linkPlayerTextTrue").hide();
                }
                $scope.safeApply();
            });
        }
        vm.submitLinkPlayer = function () {
            var sendQuery = {};
            socketService.$socket($scope.AppSocket, 'createUpdatePlayerInfoProposal', {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                data: {
                    _id: vm.linkPlayerData._id,
                    partner: vm.selectedSinglePartner._id,
                    partnerName: vm.selectedSinglePartner.partnerName
                },
                platformId: vm.selectedPlatform.id
            }, function (data) {
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPartnersData();
            }, null, true);
        }

        vm.submitResetPartnerPassword = function () {
            socketService.$socket($scope.AppSocket, 'resetPartnerPassword', {_id: vm.selectedSinglePartner._id}, function (data) {
                console.log('password', data);
                vm.partnerNewPassword = data.data;
                $scope.safeApply();
            });
        }
        vm.preShowReferralPlayer = function (data) {
            vm.selectedSinglePartner = data;
            $('#totalReferralModal').modal('show');
            vm.totalReferralPlayer = {totalCount: 0, index: 0, limit: 10}
            utilService.actionAfterLoaded('#totalReferralModal.in #totalReferralPlayersTablePage', function () {
                vm.totalReferralPlayer.regStart = utilService.createDatePicker('#totalReferralModal.in .regStartTime');
                vm.totalReferralPlayer.regEnd = utilService.createDatePicker('#totalReferralModal.in .regEndTime');
                vm.totalReferralPlayer.loginStart = utilService.createDatePicker('#totalReferralModal.in .loginStartTime');
                vm.totalReferralPlayer.loginEnd = utilService.createDatePicker('#totalReferralModal.in .loginEndTime');

                utilService.clearDatePickerDate(vm.totalReferralPlayer.regStart);
                utilService.clearDatePickerDate(vm.totalReferralPlayer.regEnd);
                utilService.clearDatePickerDate(vm.totalReferralPlayer.loginStart);
                utilService.clearDatePickerDate(vm.totalReferralPlayer.loginEnd);

                vm.totalReferralPlayer.pageObj = utilService.createPageForPagingTable("#totalReferralPlayersTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "totalReferralPlayer", vm.getPagePartnerReferralPlayers)
                });
                vm.getPagePartnerReferralPlayers(true)
            })
        }
        vm.getPagePartnerReferralPlayers = function (newSearch) {
            var sendQuery = {
                query: {
                    partnerObjId: vm.selectedSinglePartner._id,
                    name: vm.totalReferralPlayer.playerName,
                    regStart: $(vm.totalReferralPlayer.regStart).data('datetimepicker').getLocalDate(),
                    regEnd: $(vm.totalReferralPlayer.regEnd).data('datetimepicker').getLocalDate(),
                    loginStart: $(vm.totalReferralPlayer.loginStart).data('datetimepicker').getLocalDate(),
                    loginEnd: $(vm.totalReferralPlayer.loginEnd).data('datetimepicker').getLocalDate(),
                    minTopupTimes: vm.totalReferralPlayer.minTopupTimes,
                    maxTopupTimes: vm.totalReferralPlayer.maxTopupTimes,
                    domain: vm.totalReferralPlayer.domain
                },
                index: newSearch ? 0 : vm.totalReferralPlayer.index,
                limit: newSearch ? 10 : vm.totalReferralPlayer.limit,
                sortCol: vm.totalReferralPlayer.sortCol || null
            }
            if (vm.totalReferralPlayer.playerName != null) {
                sendQuery.query.name = vm.totalReferralPlayer.playerName;
            }
            socketService.$socket($scope.AppSocket, 'getPagePartnerReferralPlayers', sendQuery, function (data) {
                console.log('tableData', data);
                var tableData = data.data.data ? data.data.data.map(item => {
                    item.$lastAccessTime = utilService.getFormatTime(item.lastAccessTime);
                    item.$registrationTime = utilService.getFormatTime(item.registrationTime);
                    return item;
                }) : [];
                vm.totalReferralPlayer.totalCount = data.data.size;
                vm.drawTotalReferralPlayerTable(newSearch, tableData, data.data.size)
            })
        }
        vm.drawTotalReferralPlayerTable = function (newSearch, tableData, size) {
            var option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData.map(item => {
                    item.consumptionSum$ = item.consumptionSum.toFixed(2);
                    item.validCredit$ = item.validCredit.toFixed(2);
                    return item;
                }),
                order: vm.totalReferralPlayer.aaSorting || [[0, 'desc']],
                columnDefs: [
                    {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'lastAccessTime', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'consumptionSum', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'topUpSum', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'topUpTimes', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'validCredit', bSortable: true, 'aTargets': [7]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('NAME'), data: 'name', sClass: "name"},
                    {'title': $translate('REAL_NAME'), data: 'realName', sClass: "realName"},
                    {'title': $translate('registrationTime'), data: '$registrationTime', sClass: "tbodyNoWrap"},
                    {'title': $translate('lastAccessTime'), data: '$lastAccessTime'},
                    {'title': $translate('CONSUMPTION'), data: 'consumptionSum$'},
                    {'title': $translate('TOP_UP_SUM'), data: 'topUpSum', sClass: "topUpSum"},
                    {'title': $translate('TOP_UP_TIMES'), data: 'topUpTimes', sClass: "topUpTimes"},
                    {'title': $translate('VALID_CREDIT'), data: 'validCredit$', sClass: "tbodyNoWrap"},
                    {'title': $translate('Domain Name'), data: 'domain', sClass: "tbodyNoWrap"},
                    // {'title': $translate('STATUS'), data: 'status', sClass: "tbodyNoWrap"},
                    // {'title': $translate('TRUST_LEVEL'), data: 'trustLevel'}
                ],
                paging: false,
            });
            var a = utilService.createDatatableWithFooter('#totalReferralPlayersTable', option, {});
            vm.totalReferralPlayer.pageObj.init({maxCount: size}, newSearch);

            $('#totalReferralPlayersTable').off('order.dt');
            $('#totalReferralPlayersTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'totalReferralPlayer', vm.getPagePartnerReferralPlayers);
            });
            $("#totalReferralPlayersTable").resize();
            $scope.safeApply();
        }
        vm.getPartnerReferralPlayers = function (src, callback) {
            console.log('src', {partnerObjId: src._id});
            socketService.$socket($scope.AppSocket, 'getPartnerReferralPlayers', {partnerObjId: src._id}, function (data) {
                console.log('referral', data);
                vm.referralPartner = data.data;
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        }
        vm.getPartnerActivePlayers = function (src, callback) {
            console.log('src', {partnerObjId: src._id});
            socketService.$socket($scope.AppSocket, 'getPartnerActivePlayers', {
                platformObjId: vm.selectedPlatform.id,
                partnerObjId: src._id
            }, function (data) {
                console.log('active', data);
                vm.referralPartner = data.data;
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        }
        vm.getPartnerValidPlayers = function (src, callback) {
            console.log('src', {partnerObjId: src._id});
            socketService.$socket($scope.AppSocket, 'getPartnerValidPlayers', {
                platformObjId: vm.selectedPlatform.id,
                partnerObjId: src._id
            }, function (data) {
                console.log('valid', data);
                vm.referralPartner = data.data;
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
        }
        vm.prepareEditPartnerPayment = function () {
            console.log('partnerID', vm.selectedSinglePartner._id);
            vm.correctVerifyBankAccount = undefined;
            vm.isEditingPartnerPayment = false;
            vm.isEditingPartnerPaymentShowVerify = false;
            vm.partnerBank = utilService.assignObjKeys(vm.selectedSinglePartner, vm.playerPaymentKeys);
            $scope.safeApply();
        }
        vm.updatePartnerBank = function () {
            console.log('before after', vm.selectedSinglePartner, vm.partnerBank);
            var result = socketService.$compareObj(vm.selectedSinglePartner, vm.partnerBank);

            var sendData = {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                platformId: vm.selectedPlatform.id,
                data: {
                    partnerName: vm.selectedSinglePartner.partnerName,
                    curData: result.before,
                    updateData: result.after
                }
            }
            console.log('sendData', sendData);

            socketService.$socket($scope.AppSocket, 'createUpdatePartnerBankInfoProposal', sendData, function (data) {
                console.log('valid', data);
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPartnersData();
                $scope.safeApply();
            });
        };

        // Partner apply bonus
        vm.initPartnerBonus = function () {
            vm.partnerBonus = {
                resMsg: '',
                showSubmit: true,
                notSent: true,
            };
        };

        vm.prepareShowPartnerCreditAdjustment = function (type) {
            vm.partnerCreditChange = {
                finalValidAmount: vm.isOneSelectedPartner().credits,
                finalLockedAmount: null,
                remark: '',
                updateAmount: 0
            };

            if (type == "adjust") {
                vm.partnerCreditChange.socketStr = "createUpdatePartnerCreditProposal";
                vm.partnerCreditChange.modaltitle = "CREDIT_ADJUSTMENT";
            }
        }

        vm.updatePartnerCredit = function () {
            var sendData = {
                platformId: vm.selectedPlatform.id,
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                isPartner: true,
                data: {
                    partnerObjId: vm.isOneSelectedPartner()._id,
                    partnerName: vm.isOneSelectedPartner().partnerName,
                    updateAmount: vm.partnerCreditChange.updateAmount,
                    curAmount: vm.isOneSelectedPartner().credits,
                    realName: vm.isOneSelectedPartner().realName,
                    remark: vm.partnerCreditChange.remark,
                    adminName: authService.adminName
                }
            }

            socketService.$socket($scope.AppSocket, vm.partnerCreditChange.socketStr, sendData, function (data) {
                var newData = data.data;
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlatformPartnersData();
                $scope.safeApply();
            });
        };

        vm.applyPartnerBonus = function () {
            let sendData = {
                partnerId: vm.selectedSinglePartner.partnerId,
                amount: vm.partnerBonus.amount,
                bonusId: vm.partnerBonus.bonusId,
                honoreeDetail: vm.partnerBonus.honoreeDetail,
                bForce: vm.partnerBonus.bForce
            };
            vm.partnerBonus.resMsg = '';
            vm.partnerBonus.showSubmit = true;
            socketService.$socket($scope.AppSocket, 'applyPartnerBonusRequest', sendData, function (data) {
                vm.partnerBonus.resMsg = $translate('Approved');
                vm.partnerBonus.showSubmit = false;
                vm.getPlatformPartnersData();
                $scope.safeApply();
            }, function (data) {
                vm.partnerBonus.showSubmit = false;
                if (data.error.errorMessage) {
                    vm.partnerBonus.resMsg = data.error.errorMessage;
                    socketService.showErrorMessage(data.error.errorMessage);
                    $scope.safeApply();
                }
                $scope.safeApply();
            });
        };
        /////////////////////////////////////// bank card start  /////////////////////////////////////////////////

        vm.loadBankCardGroupData = function () {
            //init gametab start===============================
            vm.showBankCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            console.log("getBanks", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformBankCardGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('bankgroup', data);
                //provider list init
                vm.platformBankCardGroupList = data.data;
                vm.platformBankCardGroupListCheck = {};
                $.each(vm.platformBankCardGroupList, function (i, v) {
                    vm.platformBankCardGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        /////////////////////////////////////// bank card end  /////////////////////////////////////////////////

        /////////////////////////////////////// Merchant Group start  /////////////////////////////////////////////////
        vm.loadMerchantGroupData = function () {
            //init gametab start===============================
            vm.showMerchantCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            console.log("getMerchants", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformMerchantGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('merchantgroup', data);
                //provider list init
                vm.platformMerchantGroupList = data.data;
                vm.platformMerchantGroupListCheck = {};
                $.each(vm.platformMerchantGroupList, function (i, v) {
                    vm.platformMerchantGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        /////////////////////////////////////// Merchant Group end  /////////////////////////////////////////////////

        /////////////////////////////////////// Alipay Group start  /////////////////////////////////////////////////

        vm.loadAlipayGroupData = function () {
            //init gametab start===============================
            vm.showAlipayCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            console.log("getAlipays", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformAlipayGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('Alipaygroup', data);
                //provider list init
                vm.platformAlipayGroupList = data.data;
                vm.platformAlipayGroupListCheck = {};
                $.each(vm.platformAlipayGroupList, function (i, v) {
                    vm.platformAlipayGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        /////////////////////////////////////// Alipay Group end  /////////////////////////////////////////////////

        /////////////////////////////////////// QuickPay Group start  /////////////////////////////////////////////////

        vm.loadQuickPayGroupData = function () {
            //init gametab start===============================
            vm.showQuickPayCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            console.log("getQuickPay", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformQuickPayGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('QuickPayGroup', data);
                //provider list init
                vm.platformQuickPayGroupList = data.data;
                vm.platformQuickPayGroupListCheck = {};
                $.each(vm.platformQuickPayGroupList, function (i, v) {
                    vm.platformQuickPayGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        /////////////////////////////////////// QuickPay Group end  /////////////////////////////////////////////////

        /////////////////////////////////////// WechatPay Group start  /////////////////////////////////////////////////
        vm.loadWechatPayGroupData = function () {
            //init gametab start===============================
            vm.showWechatPayCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            socketService.$socket($scope.AppSocket, 'getPlatformWechatPayGroup', {platform: vm.selectedPlatform.id}, function (data) {
                //provider list init
                vm.platformWechatPayGroupList = data.data;
                vm.platformWechatPayGroupListCheck = {};
                $.each(vm.platformWechatPayGroupList, function (i, v) {
                    vm.platformWechatPayGroupListCheck[v._id] = true;
                });
                $scope.safeApply();
            })
        };

        /////////////////////////////////////// Alipay Group end  /////////////////////////////////////////////////

        // platform-reward start =============================================================================

        vm.initRewardValidTimeDOM = function (date1, date2) {
            utilService.actionAfterLoaded("#rewardValidEndTime", function () {
                function checkValidTime() {
                    var time1 = new Date(vm.showReward.validStartTime).getTime();
                    var time2 = new Date(vm.showReward.validEndTime).getTime();
                    var text = time2 > time1 ? '' : $translate('RewardEndTimeStartTIme');
                    $('#rewardEndTimeValid').text(text);
                }

                let dateTimeRegex = /\d{4}\/\d{2}\/\d{2}\ \d{2}\:\d{2}\:\d{2}/g;
                utilService.createDatePicker("#rewardValidStartTime", {
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss'
                });
                utilService.createDatePicker("#rewardValidEndTime", {
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss'
                });
                if (date1) {
                    $("#rewardValidStartTime").data('datetimepicker').setLocalDate(new Date(date1));
                }
                if (date2) {
                    $("#rewardValidEndTime").data('datetimepicker').setLocalDate(new Date(date2));
                }
                $("#rewardValidStartTime").off('changeDate change keyup');
                $("#rewardValidEndTime").off('changeDate change keyup');
                $("#rewardValidStartTime").on('changeDate change keyup', function (data) {
                    if (vm.showReward) {
                        let inputFieldValue = $("#rewardValidStartTime > div > input").val();
                        if (dateTimeRegex.test(inputFieldValue)) {
                            $("#rewardValidStartTime").datetimepicker('update');
                        }
                        vm.showReward.validStartTime = $("#rewardValidStartTime").data('datetimepicker').getLocalDate();
                        checkValidTime();
                    }
                });
                $("#rewardValidEndTime").on('changeDate change keyup', function (data) {
                    if (vm.showReward) {
                        let inputFieldValue = $("#rewardValidEndTime > div > input").val();
                        if (dateTimeRegex.test(inputFieldValue)) {
                            $("#rewardValidEndTime").datetimepicker('update');
                        }
                        vm.showReward.validEndTime = $("#rewardValidEndTime").data('datetimepicker').getLocalDate();
                        checkValidTime();
                    }
                });
            });
        };
        vm.initReward = function () {
            vm.platformRewardPageName = "newReward";
            vm.showRewardTypeData = {};
            vm.showReward = {};
            vm.rewardParams = {};
            vm.rewardCondition = {};
            vm.showRewardTypeId = null;
            vm.initRewardValidTimeDOM()
            //vm.showRewardTypeData.params.params = {};
            //vm.showRewardTypeData.condition.condition = {};
            $scope.safeApply();
        }
        vm.rewardTabClicked = function (callback) {
            if (!vm.selectedPlatform) return;
            if (!authService.checkViewPermission('Platform', 'Reward', 'Read')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform.id}, function (data) {
                vm.allRewardEvent = data.data;
                console.log("vm.allRewardEvent", data.data);
                vm.showApplyRewardEvent = data.data.filter(item => {
                        return item.needApply
                    }).length > 0
                vm.curContentRewardType = {};
                $.each(vm.allRewardEvent, function (i, v) {
                    $.each(vm.allRewardTypes, function (a, b) {
                        if (b._id == v.type._id) {
                            vm.curContentRewardType[v._id] = b;
                            return true;
                        }
                    })
                    //console.log(v);
                });
                console.log(vm.curContentRewardType);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });
            // socketService.$socket($scope.AppSocket, 'getAllSettlementPeriod', '', function (data) {
            //     vm.allSettlePeriod = data.data;
            //     console.log("vm.allSettlePeriod", vm.allSettlePeriod);
            //     $scope.safeApply();
            // }, function (data) {
            // });

        }
        vm.rewardEventClicked = function (i, v) {
            if (!v) {
                vm.platformRewardPageName = 'showReward';
                //vm.highlightRewardEvent = {};
                //vm.highlightRewardEvent[v.name] = 'bg-bright';
                vm.showReward = {};
                vm.initRewardValidTimeDOM(vm.showReward.validStartTime, vm.showReward.validEndTime);
                console.log('reward', i, v);
                vm.showRewardTypeData = v;
                vm.showRewardTypeId = null;
                vm.rewardParams = {};
                vm.rewardCondition = {};
                return;
            }
            vm.platformRewardPageName = 'showReward';
            //vm.highlightRewardEvent = {};
            //vm.highlightRewardEvent[v.name] = 'bg-bright';
            vm.showReward = v;
            vm.initRewardValidTimeDOM(vm.showReward.validStartTime, vm.showReward.validEndTime);
            console.log('vm.showReward', vm.showReward);
            vm.showRewardTypeData = v;   // This will probably be overwritten by vm.platformRewardTypeChanged() below
            vm.showRewardTypeId = v.type._id;
            vm.rewardParams = Lodash.cloneDeep(v.param);
            vm.rewardCondition = Lodash.cloneDeep(v.condition);
            vm.platformRewardTypeChanged();

            console.log('vm.rewardParams', vm.rewardParams);
            $scope.safeApply();
        }
        vm.platformRewardTypeChanged = function () {
            // vm.rewardParams = {};
            //vm.rewardCondition = {};
            $.each(vm.allRewardTypes, function (i, v) {
                if (v._id === vm.showRewardTypeId) {
                    vm.showRewardTypeData = v;
                    console.log('vm.showRewardTypeData', vm.showRewardTypeData);
                    return true;
                }
            });

            const onCreationForm = vm.platformRewardPageName === 'newReward';

            // Initialise the models with some default values
            // and grab any required external data (e.g. for select box lists)

            if (onCreationForm) {
                vm.rewardCondition = {};
                vm.rewardParams = {};
            }

            console.log('platformID', vm.selectedPlatform.id);
            if (vm.showRewardTypeData.name == "PlatformTransactionReward") {
                console.log('action', vm.showRewardTypeData.params.params.playerLevel.action);
                socketService.$socket($scope.AppSocket, vm.showRewardTypeData.params.params.playerLevel.action, {platformId: vm.selectedPlatform.id}, function (data) {
                    vm.allPlayerLevels = data.data;
                    //console.log('ok', vm.allPlayerLevels);
                    $scope.safeApply();
                }, function (data) {
                    console.log("created not", data);
                    //vm.rewardTabClicked();
                });
            } else if (vm.showRewardTypeData.name == "GameProviderReward") {
                vm.rewardParams.games = vm.rewardParams.games || [];
                vm.allGames = [];

                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });

                //console.log('action', vm.showRewardTypeData.params.params.games.action);
                if (vm.rewardParams.provider) {
                    socketService.$socket($scope.AppSocket, vm.showRewardTypeData.params.params.games.action, {_id: vm.rewardParams.provider}, function (data) {
                        vm.allGames = data.data;
                        console.log('ok', vm.allGames);
                        $scope.safeApply();
                    }, function (data) {
                        console.log("created not", data);
                        //vm.rewardTabClicked();
                    });
                }
                $scope.safeApply();

            } else if (vm.showRewardTypeData.name == "PlayerConsecutiveLoginReward") {
                vm.rewardParams.reward = vm.rewardParams.reward || [];
                vm.allGames = [];

                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });

                //console.log('action', vm.showRewardTypeData.params.params.games.action);
                if (vm.rewardParams.provider) {
                    socketService.$socket($scope.AppSocket, vm.showRewardTypeData.params.params.games.action, {_id: vm.rewardParams.provider}, function (data) {
                        vm.allGames = data.data;
                        console.log('ok', vm.allGames);
                        $scope.safeApply();
                    }, function (data) {
                        console.log("created not", data);
                        //vm.rewardTabClicked();
                    });
                }
                $scope.safeApply();

            } else if (vm.showRewardTypeData.name == "FirstTopUp") {
                // vm.rewardParams.games = vm.rewardParams.games || [];
                // vm.rewardParams = {};
                console.log('vm.rewardParams', vm.rewardParams);
                vm.rewardParams.providers = vm.rewardParams.providers || [];

                vm.firstTopUp = {providerTick: {}};
                console.log('vm.rewardParams', vm.rewardParams);
                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    vm.platformProvider.forEach(a => {
                        if (vm.rewardParams.providers) {
                            vm.firstTopUp.providerTick[a._id] = (vm.rewardParams.providers.indexOf(a._id) != -1);
                        }
                    })
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });
                if (vm.rewardParams.provider) {
                    socketService.$socket($scope.AppSocket, vm.showRewardTypeData.params.params.games.action, {_id: vm.rewardParams.provider}, function (data) {
                        vm.allGames = data.data;
                        console.log('ok', vm.allGames);
                        $scope.safeApply();
                    }, function (data) {
                        console.log("created not", data);
                        //vm.rewardTabClicked();
                    });
                }
            } else if (vm.showRewardTypeData.name == "PlayerDoubleTopUpReward") {
                console.log('vm.rewardParams', vm.rewardParams);
                vm.rewardParams.providers = vm.rewardParams.providers || [];

                vm.firstTopUp = {providerTick: {}};
                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    vm.platformProvider.forEach(a => {
                        if (vm.rewardParams.providers) {
                            vm.firstTopUp.providerTick[a._id] = (vm.rewardParams.providers.indexOf(a._id) != -1);
                        }
                    })
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });
            }
            else if (vm.showRewardTypeData.name == "PlayerTopUpReturn") {
                console.log('vm.rewardParams', vm.rewardParams);
                vm.rewardParams.providers = vm.rewardParams.providers || [];

                vm.playerTopUpReturn = {providerTick: {}};
                console.log('vm.rewardParams', vm.rewardParams);
                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    vm.platformProvider.forEach(a => {
                        if (vm.rewardParams.providers) {
                            vm.playerTopUpReturn.providerTick[a._id] = (vm.rewardParams.providers.indexOf(a._id) != -1);
                        }
                    })
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });
            }
            else if (vm.showRewardTypeData.name == "PlayerConsumptionIncentive") {
                vm.rewardParams.games = vm.rewardParams.games || [];
                console.log('vm.rewardParams', vm.rewardParams);
                vm.rewardParams.providers = vm.rewardParams.providers || [];
                vm.rewardParams.reward = vm.rewardParams.reward || [];

                vm.playerTopUpReturn = {providerTick: {}};
                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    vm.platformProvider.forEach(a => {
                        if (vm.rewardParams.providers) {
                            vm.playerTopUpReturn.providerTick[a._id] = (vm.rewardParams.providers.indexOf(a._id) != -1);
                        }
                    })
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });

                // JSON sorts the reward param properties into alphabetical order
                // But for the UI display, we would prefer to specify our own order
                let rewardType = vm.showRewardTypeData;
                if (rewardType.params && rewardType.params.params && rewardType.params.params.reward && rewardType.params.params.reward.data) {
                    //console.log("Reordering:", rewardType.params.params.reward.data);
                    let preferredOrder = {
                        minPlayerLevel: 1,
                        maxPlayerCredit: 1,
                        minConsumptionAmount: 1,
                        minTopUpRecordAmount: 1,
                        rewardAmount: 1,
                        rewardPercentage: 1,
                        maxRewardAmount: 1,
                        spendingTimes: 1
                    };
                    rewardType.params.params.reward.data = reorderProperties(rewardType.params.params.reward.data, preferredOrder);
                    //console.log("Reordered: ", rewardType.params.params.reward.data);
                } else {
                    console.warn("Could not reorder:", rewardType);
                }
            } else if (vm.showRewardTypeData.name === "PlayerEasterEggReward") {
                vm.rewardParams.reward = vm.rewardParams.reward || [];
                vm.allGames = [];

                socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                    vm.platformProvider = data.data.gameProviders;
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get gameProvider", data);
                });

                //console.log('action', vm.showRewardTypeData.params.params.games.action);
                if (vm.rewardParams.provider) {
                    socketService.$socket($scope.AppSocket, vm.showRewardTypeData.params.params.games.action, {_id: vm.rewardParams.provider}, function (data) {
                        vm.allGames = data.data;
                        console.log('ok', vm.allGames);
                        $scope.safeApply();
                    }, function (data) {
                        console.log("created not", data);
                        //vm.rewardTabClicked();
                    });
                }
                $scope.safeApply();
            }

            if (onCreationForm) {
                if (vm.showRewardTypeData.name == "PartnerConsumptionReturn") {
                    setInitialPartnerLevel();
                } else if (vm.showRewardTypeData.name == "PartnerReferralReward") {
                    vm.rewardCondition.numOfEntries = 1;
                    vm.rewardParams = Lodash.cloneDeep(vm.showRewardTypeData.params.params);
                    setInitialPartnerLevel();
                } else if (vm.showRewardTypeData.name == "PartnerIncentiveReward") {
                    vm.rewardCondition.rewardAmount = 200;
                    setInitialPartnerLevel();
                } else if (vm.showRewardTypeData.name == "PlayerDoubleTopUpReward") {
                    vm.rewardParams.reward = [];
                }
            }

            // Get all the partner levels, and set a default
            function setInitialPartnerLevel() {
                vm.rewardCondition.partnerLevel = vm.allPartnerLevels[0].name;
                $scope.safeApply();
            }

            console.log("vm.showRewardTypeData", vm.showRewardTypeData);
            console.log('vm.showRewardTypeData.name', vm.showRewardTypeData.name);
            console.log("vm.rewardCondition:", vm.rewardCondition);
            console.log("vm.rewardParams:", vm.rewardParams);
            vm.showRewardFormValid = true;
        }

        /**
         * Re-order the properties in obj to match the order of the properties in preferredOrderObj.
         * Any properties in obj not specified in preferredOrderObj will appear in order after those which were specified.
         *
         * @param {Object} obj
         * @param {Object} preferredOrderObj - An object with the properties in their desired order.  Note that the properties of this object will be modified, so it's preferable to pass it fresh each time
         * @returns {Object} - obj with its properties re-ordered
         */
        function reorderProperties(obj, preferredOrderObj) {
            for (var prop in obj) {
                preferredOrderObj[prop] = obj[prop];
                delete obj[prop];
            }
            for (var prop in preferredOrderObj) {
                obj[prop] = preferredOrderObj[prop];
            }
            return obj;
        }

        vm.platformRewardShowEdit = function (type) {
            if (!vm.platformRewardPageName && type)return false;
            if (type == "CANCEL" && vm.platformRewardPageName == "newReward") return true;
            if (type == "CANCEL" && vm.platformRewardPageName == "updateReward") return true;
            if (type == "CANCEL" && vm.platformRewardPageName == "showReward") return false;
            if (type == "CREATE" && vm.platformRewardPageName == "newReward") return true;
            if (type == "EDIT" && vm.platformRewardPageName == "showReward") return true;
            if (type == "UPDATE" && vm.platformRewardPageName == "updateReward") return true;
            if (type == "DELETE" && vm.platformRewardPageName == "showReward") return true;
            if (type == "rewardType" && vm.platformRewardPageName == "newReward") return false;
            if (type == "rewardType") return true;
            if (type && vm.platformRewardPageName) return false;

            if (vm.platformRewardPageName == "newReward" || vm.platformRewardPageName == "updateReward")return false;
            else return true;
        }
        vm.clearRewardFormData = function () {
            vm.rewardCondition = null;
            vm.showReward = null;
            vm.rewardParams = null;
            vm.showRewardTypeId = null;
        }

        vm.rewardWeeklyConsecutiveTopUpAddProvider = function () {
            vm.rewardParams.providers = vm.rewardParams.providers || [];
            vm.rewardParams.providers.push({});
            console.log('vm.rewardParams.providers', vm.rewardParams.providers);
            $scope.safeApply();
        }

        vm.rewardWeeklyConsecutiveTopUpDeleteProvider = function (i) {
            console.log(vm.rewardParams.providers.length, i);
            if (vm.rewardParams.providers && (vm.rewardParams.providers.length >= i)) {
                vm.rewardParams.providers.splice(i, 1);
            }
            vm.rewardWeeklyConsecutiveTopUpCheckDuplicateProvider();
        }
        vm.rewardWeeklyConsecutiveTopUpChangeProvider = function (i, id) {
            vm.rewardParams.providers[i] = {providerObjId: id};
            console.log('i', i, id);
            vm.rewardWeeklyConsecutiveTopUpCheckDuplicateProvider();

            vm.getProviderGames(id, function (data) {
                console.log('provider ', id, data);
                vm.providerGame = vm.providerGame || {};
                vm.providerGame[id] = data;
                $scope.safeApply();
            })
        }

        vm.rewardWeeklyConsecutiveTopUpCheckDuplicateProvider = function () {
            var newArray = vm.rewardParams.providers.map(function (obj) {
                console.log('obj', obj.providerObjId);
                return obj.providerObjId;
            });
            console.log('newArray', newArray, newArray.length);
            vm.rewardWeeklyConsecutiveTopUpDuplicateProvider = newArray && (newArray.length !== new Set(newArray).size);
            vm.showRewardFormValid = !vm.rewardWeeklyConsecutiveTopUpDuplicateProvider;
            $scope.safeApply();
        }

        vm.updateDoubleTopupReward = function (type, data) {
            if (type == 'add') {
                vm.rewardParams.reward.push(JSON.parse(JSON.stringify(data)));
            } else if (type == 'remove') {
                vm.rewardParams.reward = vm.rewardParams.reward.splice(data, 1)
            }
        };

        vm.updateRewardInEdit = function (type, data) {
            if (type == 'add') {
                vm.rewardParams.reward.push(JSON.parse(JSON.stringify(data)));
            } else if (type == 'remove') {
                vm.rewardParams.reward = vm.rewardParams.reward.splice(data, 1)
            }
        };

        vm.topupProviderChange = function (provider, checked) {
            if (!provider) {
                return;
            }
            if (!vm.rewardParams.hasOwnProperty('providers')) {
                vm.rewardParams.providers = [];
            }
            if (checked && vm.rewardParams.providers.indexOf(provider) == -1) {
                vm.rewardParams.providers.push(provider);
            } else if (!checked && vm.rewardParams.providers.indexOf(provider) !== -1) {
                vm.rewardParams.providers.splice(vm.rewardParams.providers.indexOf(provider), 1)
            }
        }

        vm.getProviderGames = function (id, callback) {
            if (!id)return;
            console.log(id);
            socketService.$socket($scope.AppSocket, 'getGamesByProviderId', {_id: id}, function (data) {
                // vm.allGames = data.data;
                console.log('vm.providerAllGames', data.data);
                if (callback) {
                    callback(data.data);
                }
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        }
        vm.getProviderText = function (providerId) {
            if (!providerId || !vm.allGameProvider)return false;
            var result = '';
            $.each(vm.allGameProvider, function (i, v) {
                if (providerId == v._id || providerId == v.providerId) {
                    result = v.name;
                    return true;
                }
                //console.log('all provider', i, v);
            })
            //console.log('provider text', result);
            return result;
        }
        vm.getGameTextbyId = function (id) {
            if (!vm.allGames) return;
            if (!id)return false;
            var result = '';
            $.each(vm.allGames, function (i, v) {
                if (id == v._id) {
                    result = v.name;
                    return true;
                }
                //console.log('all provider', i, v);
            })
            return result;
        }
        vm.checkGameChecked = function (v) {
            if (!v || !vm.rewardParams.games) return false;
            // console.log(vm.rewardParams.games.indexOf(v._id) > -1);
            return vm.rewardParams.games.indexOf(v._id) > -1;
        }
        vm.processGameArray = function (selected, data) {
            // console.log(selected, data);
            if (selected) {
                vm.rewardParams.games.push(data._id);
            } else {
                vm.rewardParams.games.splice(vm.rewardParams.games.indexOf(data._id), 1);
            }
            console.log('final DB array', vm.rewardParams.games);
            $scope.safeApply();
        }

        vm.editReward = function (i) {
            console.log('vm.showReward', vm.showReward);

            var curReward = {
                name: vm.showReward.name,
                code: vm.showReward.code,
                type: vm.showReward.type._id,
                needApply: vm.showReward.needApply,
                needSettlement: vm.showReward.needSettlement,
                canApplyFromClient: vm.showReward.canApplyFromClient,
                settlementPeriod: vm.showReward.settlementPeriod,
                description: vm.showReward.description,
                platform: vm.showReward.platform,
                param: vm.rewardParams,
                condition: vm.rewardCondition,
                validStartTime: vm.showReward.validStartTime || null,
                validEndTime: vm.showReward.validEndTime || null,
            };

            var sendData = {
                query: {_id: vm.showReward._id},
                updateData: curReward
            };
            socketService.$socket($scope.AppSocket, 'updateRewardEvent', sendData, function (data) {
                vm.rewardTabClicked();
                vm.platformRewardPageName = 'showReward';
                console.log('ok');
            }, function (data) {
                console.log("created not", data);
                vm.rewardTabClicked();
            });
        }
        vm.deleteReward = function (data) {
            console.log('vm.showReward', vm.showReward);
            socketService.$socket($scope.AppSocket, 'deleteRewardEventByIds', {_ids: [vm.showReward._id]}, function (data) {
                //vm.allGameProvider = data.data;
                vm.rewardTabClicked(function () {
                    vm.rewardEventClicked(0, vm.allRewardEvent[0])
                });
                vm.platformRewardPageName = 'showReward';
                $scope.safeApply();
            }, function (data) {
                console.log("created not", data);
            });
        }
        vm.submitReward = function () {
            var sendData = vm.showReward;
            sendData.name = vm.showReward.name;
            sendData.description = vm.showReward.description;
            sendData.platform = vm.selectedPlatform.id;
            sendData.param = vm.rewardParams;
            sendData.condition = vm.rewardCondition;
            sendData.type = vm.showRewardTypeData._id;
            sendData.canApplyFromClient = vm.showReward.canApplyFromClient;
            sendData.validStartTime = vm.showReward.validStartTime || null;
            sendData.validEndTime = vm.showReward.validEndTime || null;
            console.log('vm.showRewardTypeStringData', vm.showRewardTypeStringData);
            console.log(vm.showReward);
            console.log("newReward", sendData);
            socketService.$socket($scope.AppSocket, 'createRewardEvent', sendData, function (data) {
                //vm.allGameProvider = data.data;
                vm.rewardTabClicked();
                vm.rewardEventClicked(0, data.data);
                vm.platformRewardPageName = 'showReward';
                $scope.safeApply();
            }, function (data) {
                console.log("created not", data);
            });
        }

        // platform-reward end =============================================================================

        // player level codes==============start===============================
        vm.configTabClicked = function (choice) {
            vm.selectedConfigTab = choice;
            vm.configTableEdit = false;
            switch (choice) {
                case 'player':
                    //vm.playerTableShowCol = {};
                    vm.getAllPlayerLevels().done(
                        function (data) {
                            migratePlayerLevels();
                        }
                    );
                    break;
                case 'partner':
                    vm.newPartnerLvl = {};
                    vm.getAllPartners();
                    break;
                case 'trust':
                    vm.getAllPlayerTrustLevels();
                    break;
                case 'validActive':
                    vm.getPartnerLevelConfig();
                    break;
                case 'partnerCommission':
                    vm.partnerCommission = vm.partnerCommission || {};
                    // vm.getPartnerCommissionPeriodConst();
                    // vm.getPartnerCommissionSettlementModeConst();
                    vm.getPartnerCommisionConfig();
                    break;
                case 'announcement':
                    vm.getAllPlatformAnnouncements();
                    break;
                case 'platformBasic':
                    vm.getPlatformBasic();
                    break;
                case 'bonusBasic':
                    vm.getBonusBasic();
                    break;
                case 'autoApproval':
                    vm.getAutoApprovalBasic();
                    break;
            }
        }

        // If any of the levels are holding the old data structure, migrate them to the new data structure.
        // (This code can be removed in the future.)
        function migratePlayerLevels() {
            var aLevelWasChanged = false;

            vm.allPlayerLvl.forEach(function (playerLevel) {
                if (!playerLevel.levelUpConfig || playerLevel.levelUpConfig.length === 0) {
                    console.log('Migrating playerLevel to new structure:', JSON.stringify(playerLevel));
                    // Provide a default levelUpConfig, otherwise the level will not appear in the list!
                    playerLevel.levelUpConfig = [
                        {
                            topupLimit: playerLevel.topupLimit,
                            topupPeriod: playerLevel.topupPeriod || 'NONE',
                            consumptionLimit: playerLevel.consumptionLimit,
                            consumptionPeriod: playerLevel.consumptionPeriod || 'NONE',
                        }
                    ];
                    delete playerLevel.topUpLimit;
                    delete playerLevel.topupPeriod;
                    delete playerLevel.consumptionLimit;
                    delete playerLevel.consumptionPeriod;
                    aLevelWasChanged = true;
                }
                if (!playerLevel.levelDownConfig || playerLevel.levelDownConfig.length === 0) {
                    playerLevel.levelDownConfig = [
                        {
                            topupMinimum: 0,
                            topupPeriod: 'NONE',
                            consumptionMinimum: 0,
                            consumptionPeriod: 'NONE',
                        }
                    ];
                    aLevelWasChanged = true;
                    console.log('Done migration:', JSON.stringify(playerLevel));
                }
            });

            // It is confusing to present fixed data to the user, if it is not actually fixed on the server.
            // So we will save it if it has changed.
            if (aLevelWasChanged) {
                vm.configSubmitUpdate('player');
                $scope.safeApply();
            }
            // In fact it is still confusing.  We are only migrating data when it is accessed in the UI by a user with write permission.
            // We should probably have made this a back-end migration for all records in the DB.
            // *** Next time let's do that! ***
        }

        vm.getAllPartnerLevels = function () {

            if (!authService.checkViewPermission('Platform', 'Partner', 'Read')) {
                return;
            }
            return $scope.$socketPromise(commonAPIs.partnerLevel.getByPlatform, {platformId: vm.selectedPlatform.id})
                .then(function (data) {
                    vm.allPartnerLevels = data.data;
                    vm.allPartnerLevels.sort(function (a, b) {
                        return a.value > b.value;
                    })
                    console.log('ok', vm.allPartnerLevels);
                    // vm.allPartnerLevelsByValue = Lodash.keyBy(vm.allPartnerLevels, 'value');
                    vm.allPartnerLevelsByName = Lodash.keyBy(vm.allPartnerLevels, 'name');
                });
        };

        vm.getAllPlayerLevels = function () {
            vm.playerIDArr = [];
            vm.autoCheckPlayerLevelUp = null;
            return $scope.$socketPromise('getPlayerLevelByPlatformId', {platformId: vm.selectedPlatform.id})
                .then(function (data) {
                    vm.allPlayerLvl = data.data;
                    vm.autoCheckPlayerLevelUp = vm.selectedPlatform.data.autoCheckPlayerLevelUp;
                    vm.allPlayerLvlReordered = false;
                    vm.sortPlayerLevels();
                    console.log("vm.allPlayerLvl", data.data);
                    vm.playerLvlData = {};
                    if (vm.allPlayerLvl) {
                        $.each(vm.allPlayerLvl, function (i, v) {
                            vm.playerIDArr.push(v._id);
                            vm.playerLvlData[v._id] = v;
                        })
                    }
                    $scope.safeApply();
                });
        };
        vm.sortPlayerLevels = function () {
            vm.allPlayerLvl.sort((a, b) => a.value - b.value);
        };
        vm.getAllPlayerTrustLevels = function () {
            vm.playerIDArr = [];
            return $scope.$socketPromise('getPlayerTrustLevelByPlatformId', {platformId: vm.selectedPlatform.id})
                .then(function (data) {
                    vm.allPlayerTrustLvl = data.data;
                    console.log("vm.allPlayerTrustLvl", data.data);
                    $scope.safeApply();
                });
        }

        vm.getPartnerLevelConfig = function () {
            return $scope.$socketPromise('getPartnerLevelConfig', {platform: vm.selectedPlatform.id})
                .then(function (data) {
                    vm.partnerLevelConfig = data.data[0];
                    console.log("vm.partnerLevelConfig", data.data[0]);
                    $scope.safeApply();
                });
        };

        vm.initNewPlayerLvl = function () {
            var period = vm.playerLvlPeriod.NONE;
            vm.newPlayerLvl = {
                name: "请更改名称",
                value: vm.allPlayerLvl.length,
                levelUpConfig: [{
                    topupLimit: 1,
                    topupPeriod: period,
                    consumptionLimit: 1,
                    consumptionPeriod: period,
                    andConditions: true
                }],
                levelDownConfig: []
            };
        }
        vm.configAddPlayerLevelValid = function () {
            //up level condition check
            var upLevelConditionValid = true;
            var obj = vm.newPlayerLvl.levelUpConfig[0];
            if (!obj.topupLimit) {
                upLevelConditionValid = false;
            } else if (!obj.consumptionLimit) {
                upLevelConditionValid = false;
            }
            //down level condition check
            var downLevelConditionValid = true;
            var obj = vm.newPlayerLvl.levelDownConfig[0];
            if (obj.topupMinimum && (!obj.topupPeriod || obj.topupPeriod == "NONE")) {
                downLevelConditionValid = false;
            } else if (obj.consumptionMinimum && (!obj.consumptionPeriod || obj.consumptionPeriod == "NONE")) {
                downLevelConditionValid = false;
            }
            return upLevelConditionValid && downLevelConditionValid;
        }
        vm.configPlayerLevelTableIsValid = function () {
            var hasDefaultLevel = vm.configPlayerLevelTableHasDefaultLevel();
            var downLevelConditionValid = true;
            vm.allPlayerLvl.forEach(level => {
                if (level.levelDownConfig) {
                    level.levelDownConfig.forEach(oneConfig => {
                        if (oneConfig.topupMinimum && (!oneConfig.topupPeriod || oneConfig.topupPeriod == "NONE")) {
                            downLevelConditionValid = false;
                        } else if (oneConfig.consumptionMinimum && (!oneConfig.consumptionPeriod || oneConfig.consumptionPeriod == "NONE")) {
                            downLevelConditionValid = false;
                        }
                    });
                }
            })

            // TAG_MIX_PERIOD_OR_TOO_COMPLEX
            var hasBadLevelDownCondition = vm.allPlayerLvl.some(
                level => level.levelDownConfig.some(vm.levelDownConditionIsTooComplex)
            );

            return hasDefaultLevel && !hasBadLevelDownCondition && downLevelConditionValid;
        };
        vm.configPlayerLevelTableHasDefaultLevel = function () {
            return vm.allPlayerLvl.some(lvl => lvl.value === 0);
        };
        // TAG_MIX_PERIOD_OR_TOO_COMPLEX
        vm.levelDownConditionIsTooComplex = function (conditionSet) {
            const topupPeriod = conditionSet.topupPeriod;
            const consumptionPeriod = conditionSet.consumptionPeriod;
            return !conditionSet.andConditions && (topupPeriod + consumptionPeriod === "DAYWEEK" || topupPeriod + consumptionPeriod === "WEEKDAY");
        };

        vm.focusNewPlayerLevelUI = function () {
            $scope.safeApply();
            setTimeout(function () {
                $('#newPlayerLevelFirstInput').focus();
            }, 1);
        };
        // player level codes==============end===============================

        // partner level codes==============start===============================

        vm.getAllPartners = function () {
            vm.partnerIDArr = [];
            socketService.$socket($scope.AppSocket, commonAPIs.partnerLevel.getByPlatform, {platformId: vm.selectedPlatform.id}, function (data) {
                vm.allPartner = data.data;
                vm.allPartner.sort(function (a, b) {
                    return a.value - b.value;
                });
                console.log("vm.allPartner", data.data);
                if (data.data) {
                    $.each(vm.allPartner, function (i, v) {
                        vm.partnerIDArr.push(v._id);
                    })
                }
                console.log('vm.partnerIDArr', vm.partnerIDArr);
                $scope.safeApply();
            });
        }

        // partner commission config start
        vm.addPartnerCommissionConfig = function () {
            socketService.$socket($scope.AppSocket, 'createPartnerCommissionConfig', {platform: vm.selectedPlatform.id}, function (data) {
                vm.partnerCommission.isEditing = true;
                return vm.getPartnerCommisionConfig();
            });
        }
        vm.getPartnerCommisionConfig = function () {
            vm.partnerCommission.loading = true;
            socketService.$socket($scope.AppSocket, 'getPartnerCommissionConfig', {query: {platform: vm.selectedPlatform.id}}, function (data) {
                vm.partnerCommission.srcConfig = data.data;
                vm.partnerCommission.showConfig = data.data ? $.extend({}, data.data) : false;
                vm.partnerCommission.loading = false;
                $scope.safeApply();
            });
        }
        vm.addCommissionLevel = function (key) {
            vm.partnerCommission.showConfig[key] = vm.partnerCommission.showConfig[key] || [];
            var length = vm.partnerCommission.showConfig[key].length;
            vm.partnerCommission.showConfig[key].push({value: length + 1, level: length + 1});
        }
        vm.removePartnerCommissionLevel = function (obj, key, v) {
            vm.partnerCommission.showConfig[obj] = vm.partnerCommission.showConfig[obj].filter(item => {
                return item[key] != v[key];
            })
            $scope.safeApply();
        }
        vm.submitUpdatePartnerCommision = function () {
            console.log(vm.partnerCommission.showConfig);
            var sendData = {
                query: {
                    _id: vm.partnerCommission.showConfig._id
                },
                updateData: vm.partnerCommission.showConfig
            }
            socketService.$socket($scope.AppSocket, 'updatePartnerCommissionLevel', sendData, function (data) {
                vm.partnerCommission.isEditing = false;
                $scope.safeApply();
            });
        }
        // partner commission config end

        // announcement codes==============start===============================
        vm.getAllPlatformAnnouncements = function () {
            vm.allPlatformAnnouncements = [];
            $scope.$socketPromise('getPlatformAnnouncements', {platform: vm.selectedPlatform.id})
                .done(function (data) {
                    vm.allPlatformAnnouncements = data.data;
                    $scope.safeApply();
                });
        };

        vm.initCreatePlatform = function () {
            vm.configTableAdd=true;
            vm.newAnn={};
            vm.currentlyFocusedAnnouncement = vm.newAnn;
            vm.newAnn.date = new Date();
        };

        // announcement codes==============end===============================
        vm.getPlatformBasic = function () {
            vm.platformBasic = vm.platformBasic || {};
            vm.platformBasic.showMinTopupAmount = vm.selectedPlatform.data.minTopUpAmount;
            vm.platformBasic.showAllowSameRealNameToRegister = vm.selectedPlatform.data.allowSameRealNameToRegister;
            vm.platformBasic.showAllowSamePhoneNumberToRegister = vm.selectedPlatform.data.allowSamePhoneNumberToRegister;
            vm.platformBasic.canMultiReward = vm.selectedPlatform.data.canMultiReward;
            vm.platformBasic.requireLogInCaptcha = vm.selectedPlatform.data.requireLogInCaptcha;
            vm.platformBasic.onlyNewCanLogin = vm.selectedPlatform.data.onlyNewCanLogin;
            vm.platformBasic.useLockedCredit = vm.selectedPlatform.data.useLockedCredit;
            $scope.safeApply();
        }

        vm.getBonusBasic = () => {
            vm.bonusBasic = vm.bonusBasic || {};
            vm.bonusBasic.bonusPercentageCharges = vm.selectedPlatform.data.bonusPercentageCharges;
            vm.bonusBasic.bonusCharges = vm.selectedPlatform.data.bonusCharges;
            $scope.safeApply();
        };

        vm.getAutoApprovalBasic = () => {
            vm.autoApprovalBasic = vm.autoApprovalBasic || {};
            console.log('vm.selectedPlatform.data', vm.selectedPlatform.data);
            vm.autoApprovalBasic.enableAutoApplyBonus = vm.selectedPlatform.data.enableAutoApplyBonus;
            vm.autoApprovalBasic.showAutoApproveWhenSingleBonusApplyLessThan = vm.selectedPlatform.data.autoApproveWhenSingleBonusApplyLessThan;
            vm.autoApprovalBasic.showAutoApproveWhenSingleDayTotalBonusApplyLessThan = vm.selectedPlatform.data.autoApproveWhenSingleDayTotalBonusApplyLessThan;
            vm.autoApprovalBasic.showAutoApproveRepeatCount = vm.selectedPlatform.data.autoApproveRepeatCount;
            vm.autoApprovalBasic.showAutoApproveRepeatDelay = vm.selectedPlatform.data.autoApproveRepeatDelay;
            vm.autoApprovalBasic.lostThreshold = vm.selectedPlatform.data.autoApproveLostThreshold;
            vm.autoApprovalBasic.profitTimes = vm.selectedPlatform.data.autoApproveProfitTimes;
            vm.autoApprovalBasic.profitTimesMinAmount = vm.selectedPlatform.data.autoApproveProfitTimesMinAmount;
            $scope.safeApply();
        };

        vm.submitAddPlayerLvl = function () {
            var sendData = vm.newPlayerLvl;
            vm.newPlayerLvl.platform = vm.selectedPlatform.id;
            $scope.$socketPromise('createPlayerLevel', sendData)
                .done(function (data) {
                    vm.configTabClicked('player');
                });
        }
        vm.submitAddPartnerLvl = function () {
            var sendData = vm.newPartnerLvl;
            vm.newPartnerLvl.platform = vm.selectedPlatform.id;
            $scope.$socketPromise('createPartnerLevel', sendData)
                .done(function (data) {
                    vm.configTabClicked('partner');
                });
        }
        vm.submitAddAnnouncement = function () {
            var sendData = vm.newAnn;
            vm.newAnn.platform = vm.selectedPlatform.id;
            $scope.$socketPromise('createPlatformAnnouncement', sendData)
                .done(function (data) {
                    vm.configTabClicked('announcement');
                });
        }
        vm.configStartEdit = function (choice) {
            switch (choice) {
                case 'player':
                    vm.allPlayerLvlBeforeEdit = Lodash.cloneDeep(vm.allPlayerLvl);
                    break;
                case 'announcement':
                    vm.allPlatformAnnouncementsBeforeEdit = Lodash.cloneDeep(vm.allPlatformAnnouncements);
                    break;
            }
            vm.configTableEdit = true;
        }
        vm.playerLvlDownChange = function (i, j, which) {
            var obj;
            if (i != "-1") {
                obj = vm.allPlayerLvl[i].levelDownConfig[j];
            } else {
                obj = vm.newPlayerLvl.levelDownConfig[0];
            }
            if (which == 'topupMinimum' && obj.topupMinimum) {
                obj.consumptionMinimum = 0;
                obj.consumptionPeriod = "NONE";
            } else if (which == 'consumptionMinimum' && obj.consumptionMinimum) {
                obj.topupMinimum = 0;
                obj.topupPeriod = "NONE";
            }
            $scope.safeApply();
        }
        vm.movePlayerLevel = function (levelIndex, direction) {
            var clickedLevel = vm.allPlayerLvl[levelIndex];
            var otherLevel = vm.allPlayerLvl[levelIndex + direction];
            clickedLevel.value += direction;
            otherLevel.value -= direction;
            vm.sortPlayerLevels();
            vm.allPlayerLvlReordered = true;
        }
        vm.configCancelEditOrAdd = function (choice) {
            switch (choice) {
                case 'player':
                    // If cancelling an edit, we should restore the state before the edit
                    if (vm.configTableEdit) {
                        vm.allPlayerLvl = vm.allPlayerLvlBeforeEdit;
                    }
                    break;
                case 'announcement':
                    // If cancelling an edit, we should restore the state before the edit
                    if (vm.configTableEdit) {
                        vm.allPlatformAnnouncements = vm.allPlatformAnnouncementsBeforeEdit;
                    }
                    break;
            }
            vm.configTableEdit = false;
            vm.configTableAdd = false;
        }
        vm.configSubmitUpdate = function (choice) {
            switch (choice) {
                case 'player':
                    console.log('vm.playerLvlData', vm.playerLvlData);
                    updatePlatformBasic({autoCheckPlayerLevelUp:vm.autoCheckPlayerLevelUp});
                    if (vm.allPlayerLvlReordered) {
                        // Number the levels correctly.  (This should only really be needed if something went wrong on a previous attempt.)
                        vm.ensurePlayerLevelOrder();
                    } else {
                        updatePlayerLevels(vm.playerIDArr, 0);
                    }
                    break;
                case 'partner':
                    updatePartnerLevels(vm.partnerIDArr, 0);
                    break;
                case 'validActive':
                    updatePartnerLevelConfig();
                    break;
                case 'announcement':
                    updatePlatformAnnouncements(vm.allPlatformAnnouncements, 0);
                    break;
                case 'platformBasic':
                    updatePlatformBasic(vm.platformBasic);
                    break;
                case 'bonusBasic':
                    updatePlatformBasic(vm.bonusBasic);
                    break;
                case 'autoApproval':
                    updateAutoApprovalConfig(vm.autoApprovalBasic);
                    break;
            }
        };

        function updatePlayerLevels(arr, index, deltaValue, callback) {
            if (index >= arr.length) {
                done();
                return;
            }

            var curId = arr[index];
            var updateData = Lodash.cloneDeep(vm.playerLvlData[curId]);
            delete updateData._id;
            delete updateData.$$hashKey;
            delete updateData.__v;
            if (deltaValue) {
                updateData.value += deltaValue;
            }
            var sendData = {query: {_id: curId}, updateData: updateData};
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'updatePlayerLevel', sendData, next, next);

            function next() {
                updatePlayerLevels(arr, ++index, deltaValue, callback);
            }

            function done() {
                if (!deltaValue) {
                    //vm.ConfigPlayerClicked();
                    vm.configTabClicked("player");
                }
                if (callback) {
                    callback();
                }
                $scope.safeApply();
            }
        }

        function updatePartnerLevels(arr, index) {
            if (index >= arr.length) {
                done();
                return;
            }

            var curId = arr[index];
            console.log('vm.allPartner', vm.allPartner);
            console.log('curId', curId);
            var updateData = Lodash.cloneDeep(vm.allPartner[index]);
            delete updateData._id;
            delete updateData.$$hashKey;
            delete updateData.__v;
            var sendData = {query: {_id: curId}, updateData: updateData};
            console.log("sendData", sendData);
            socketService.$socket($scope.AppSocket, commonAPIs.partnerLevel.update, sendData, next, next);

            function next() {
                updatePartnerLevels(arr, ++index);
            }

            function done() {
                $scope.safeApply();
                //vm.ConfigPartnerClicked();
                vm.configTabClicked("partner");
            }
        }

        function updatePlatformAnnouncements(arr, index) {
            if (index >= arr.length) {
                done();
                return;
            }

            var updateData = Lodash.cloneDeep(arr[index]);
            var curId = updateData._id;
            delete updateData._id;
            delete updateData.$$hashKey;
            delete updateData.__v;
            var sendData = {query: {_id: curId}, updateData: updateData};
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformAnnouncement', sendData, next, next);

            function next() {
                updatePlatformAnnouncements(arr, ++index);
            }

            function done() {
                //vm.ConfigAnnouncementClicked();
                vm.configTabClicked("announcement");
                $scope.safeApply();
            }
        }

        function updatePartnerLevelConfig() {
            delete vm.partnerLevelConfigEdit._id;
            var sendData = {
                query: {platform: vm.selectedPlatform.id},
                updateData: vm.partnerLevelConfigEdit
            };
            socketService.$socket($scope.AppSocket, 'updatePartnerLevelConfig', sendData, function (data) {
                vm.partnerLevelConfig = vm.partnerLevelConfigEdit;
                vm.configTabClicked("validActive");
                $scope.safeApply();
            });
        }

        function updatePlatformBasic(srcData) {
            let sendData = {
                query: {_id: vm.selectedPlatform.id},
                updateData: {
                    minTopUpAmount: srcData.showMinTopupAmount,
                    allowSameRealNameToRegister: srcData.showAllowSameRealNameToRegister,
                    allowSamePhoneNumberToRegister: srcData.showAllowSamePhoneNumberToRegister,
                    canMultiReward: srcData.canMultiReward,
                    autoCheckPlayerLevelUp: srcData.autoCheckPlayerLevelUp,
                    bonusPercentageCharges: srcData.bonusPercentageCharges,
                    bonusCharges: srcData.bonusCharges,
                    requireLogInCaptcha: srcData.requireLogInCaptcha,
                    onlyNewCanLogin: srcData.onlyNewCanLogin,
                    useLockedCredit: srcData.useLockedCredit
                }
            };
            socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                vm.loadPlatformData({loadAll: false});
            });
        }

        function updateAutoApprovalConfig(srcData) {
            let sendData = {
                query: {_id: vm.selectedPlatform.id},
                updateData: {
                    enableAutoApplyBonus: srcData.enableAutoApplyBonus,
                    autoApproveWhenSingleBonusApplyLessThan: srcData.showAutoApproveWhenSingleBonusApplyLessThan,
                    autoApproveWhenSingleDayTotalBonusApplyLessThan: srcData.showAutoApproveWhenSingleDayTotalBonusApplyLessThan,
                    autoApproveRepeatCount: srcData.showAutoApproveRepeatCount,
                    autoApproveRepeatDelay: srcData.showAutoApproveRepeatDelay,
                    autoApproveLostThreshold: srcData.lostThreshold,
                    autoApproveProfitTimes: srcData.profitTimes,
                    autoApproveProfitTimesMinAmount: srcData.profitTimesMinAmount
                }
            };
            console.log('\n\n\nupdateAutoApprovalConfig sendData', JSON.stringify(sendData));

            socketService.$socket($scope.AppSocket, 'updateAutoApprovalConfig', sendData, function (data) {
                console.log('update auto approval socket', JSON.stringify(data));
                vm.loadPlatformData({loadAll: false});
            });
        }

        vm.ensurePlayerLevelOrder = function () {
            vm.sortPlayerLevels();
            vm.allPlayerLvl.forEach((lvl, i) => lvl.value = i);
            // If the player values have changed, their values may collide when we save them one-by-one (violating the schema's uniqueness constraint).
            // To avoid this, we first save with a different set of values (desired value + 1000), and then save again with the normal values.
            var submitWithoutCollision = (callback) => updatePlayerLevels(vm.playerIDArr, 0, +1000, callback);
            var submitNormally = (callback) => updatePlayerLevels(vm.playerIDArr, 0, +0, callback);
            submitWithoutCollision(submitNormally);
        };

        vm.configTableDeleteLevelConfirm = function (choice, level) {
            switch (choice) {
                case 'player':
                    var str = $translate("Delete") + " " + level.name + "(" + level.value + "). " + $translate("Are you sure") + "?";
                    GeneralModal.confirm(str).then(function () {
                        socketService.$socket($scope.AppSocket, 'deletePlayerLevel', {_id: level._id}, function (data) {
                            // Reload the server data and refresh UI:
                            //vm.configTabClicked("player");

                            // Ensure level values are in continuous sequence, refresh UI at the end.
                            vm.getAllPlayerLevels().done(
                                () => vm.ensurePlayerLevelOrder()
                            );
                            $scope.safeApply();
                        });
                    });
                    break;
            }
        };
        // partner level codes==============end===============================

        vm.getPlatformAnnouncements = function () {
            if (!vm.selectedPlatform) return;
            $scope.$socketPromise('getPlatformAnnouncementsByPlatformId', {platformId: vm.selectedPlatform.data.platformId}).then(function (data) {
                vm.allPlatformAnnouncements = data.data;
                $scope.safeApply();
            }).done();
        };

        vm.configTableDeleteSelectedPlatformAnnouncement = function () {
            var ann = vm.selectedPlatformAnnouncement;
            GeneralModal.confirm({
                title: "Delete Announcement",
                text: `Are you sure you want to delete the announcement "${ann.title}"?`
            }).then(function () {
                $scope.$socketPromise('deletePlatformAnnouncementByIds', {_ids: [ann._id]})
                    .done(function (data) {
                        vm.configTabClicked("announcement");
                    });
            });
        }

        vm.previewPlatformAnnouncement = function () {
            var announcementHTML = vm.currentlyFocusedAnnouncement && vm.currentlyFocusedAnnouncement.content || '';
            // We *could* use renderTemplate to convert '\n\n' into '<br>' but since it is clients (and not us) that
            // will be rendering the announcements, I think we should force the announcements to be pure HTML.
            // So we don't do: announcementHTML = renderTemplate(announcementHTML, {});
            // A middle compromise would be to allow editing with '\n\n' but actually *save* with '<br>'
            $('.announcementPreview').html(announcementHTML);
        };

        /////////////////////////////Mark::Proposal functions////////////////////////////
        //get All proposal list
        vm.loadProposalTypeData = function () {

            if (!authService.checkViewPermission('Platform', 'Proposal', 'Read')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: vm.selectedPlatform.id}, function (data) {
                vm.buildProposalTypeList(data.data);
            });
        };
        vm.buildProposalTypeList = function (data, isRedraw) {
            vm.proposalTypeList = [];
            vm.selectedProposalType = {};
            if (data) {
                $.each(data, function (i, v) {
                    var obj = {
                        text: $translate(v.name),
                        data: v
                    }
                    vm.proposalTypeList.push(obj);
                });
            }
            $('#proposalTypeTree').treeview(
                {
                    data: vm.proposalTypeList,
                    highlightSearchResults: true
                }
            );
            //if (!isRedraw) {
            $('#searchProposalType').keyup(function () {
                $('#proposalTypeTree').treeview('search', [$(this).val(), {
                    ignoreCase: true,     // case insensitive
                    exactMatch: false,    // like or equals
                    revealResults: true,  // reveal matching nodes
                }]);

            });
            $('#proposalTypeTree').on('searchComplete', function (event, data) {
                var showAll = ($('#searchProposalType').val()) ? false : true;
                $('#proposalTypeTree li:not(.search-result)').each(function (i, o) {
                    if (showAll) {
                        $(o).show();
                    } else {
                        $(o).hide();
                    }
                });
                $('#proposalTypeTree li:has(.search-result)').each(function (i, o) {
                    $(o).show();
                });
            });
//}
            $('#proposalTypeTree').on('nodeSelected', function (event, data) {
                vm.selectedProposalType = data;
                //get process and steps data for selected proposal type
                vm.getProposalTypeProcessSteps();
                vm.getProposalTypeExpirationDuration();
                console.log("vm.selectedProposalType", vm.selectedProposalType);
                $scope.safeApply();
            });
        };
        vm.createProposalTypeForm = function () {
            vm.newProposal = {};

        }
        vm.createNewProposalType = function () {
            if (!vm.loadProposalTypeData) {
                return;
            }
            console.log(vm.newProposal);
            socketService.$socket($scope.AppSocket, 'createProposalType', vm.newProposal, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }
        vm.deleteProposalType = function () {
            console.log({_id: vm.selectedProposalType.data._id});
            socketService.$socket($scope.AppSocket, 'deleteProposalTypes', {_ids: [vm.selectedProposalType.data._id]}, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }
        vm.updateNewProposalType = function () {
            console.log({_id: vm.selectedProposalType.data._id});
            var sendData = {
                query: {_id: vm.selectedProposalType.data._id},
                updateData: vm.newProposal
            };
            socketService.$socket($scope.AppSocket, 'updateProposalType', sendData, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }

        // right panel required functions
        vm.loadAlldepartment = function () {

            if (!authService.checkViewPermission('Platform', 'Proposal', 'Create') && !authService.checkViewPermission('Platform', 'Proposal', 'Update')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getDepartmentTreeById', {departmentId: authService.departmentId()}, success);
            function success(data) {
                vm.departments = data.data;
                console.log("vm.departments", vm.departments);
                $scope.$digest();
            }
        }
        vm.initStep = function () {
            vm.tempNewNodeName = '';
            vm.tempNewNodeDepartment = '';
            vm.tempNewNodeRole = '';
            vm.expResMsg = '';
            vm.expShowSubmit = true;
        }
        vm.loadDepartmentRole = function (departmentNode) {
            vm.tempNewNodeDepartment = departmentNode;
            socketService.$socket($scope.AppSocket, 'getDepartment', {_id: departmentNode._id}, success);
            function success(data) {
                vm.tempDepartmentID = data.data._id;
                vm.tempDepartmentName = data.data.departmentName;
                vm.tempAllRoles = data.data.roles;
                $scope.safeApply();
            }
        }
        vm.setSelectedRole = function (roleNode) {
            if (!vm.tempNewNodeRole) return;
            vm.tempRoleID = roleNode._id;
            vm.tempRoleName = roleNode.roleName;
            console.log("selected department ", vm.tempDepartmentName);
            console.log("selected role ", vm.tempRoleName);
        }

        vm.clearData = function () {
            vm.loadAlldepartment();
            vm.tempNewNodeDepartment = {};
            if (vm.departments) {
                $.each(vm.departments, function (i, v) {
                    if (v.departmentName == vm.tempNodeDepartmentName) {
                        vm.tempEditDepartName = v.departmentName;
                        $scope.safeApply();
                        return true;
                    }
                })
                vm.StepDepartmentUpdated();
            }
        }

        vm.StepDepartmentUpdated = function () {
            $.each(vm.departments, function (i, v) {
                if (v.departmentName == vm.tempEditDepartName) {
                    vm.tempEditDepartID = v._id;
                    $scope.safeApply();
                    return true;
                }
            })

            socketService.$socket($scope.AppSocket, 'getDepartment', {_id: vm.tempEditDepartID}, success);
            function success(data) {
                vm.tempAllRoles = data.data.roles;
                $.each(vm.tempAllRoles, function (i, v) {
                    if (v.roleName == vm.tempNodeRoleName) {
                        vm.tempEditRoleName = v.roleName;
                        $scope.safeApply();
                        return true;
                    }
                })
                $scope.safeApply();
            }
        }
        vm.StepRoleUpdated = function () {
            $.each(vm.tempAllRoles, function (i, v) {
                if (v.roleName == vm.tempEditRoleName) {
                    //vm.tempEditRoleName = v.roleName;
                    vm.tempEditRoleID = v._id;
                    $scope.safeApply();
                    return true;
                }
            })
        }

        vm.updateProposalStepData = function () {
            var updateNode = {
                name: vm.tempNodeName,
                id: vm.curNodeID,
                departmentData: {id: vm.tempEditDepartID, name: vm.tempEditDepartName},
                roleData: {id: vm.tempEditRoleID, name: vm.tempEditRoleName}
            }
            vm.chartViewModel.updateNode(vm.curNodeID, updateNode);
            vm.tempNodeDepartmentName = vm.tempEditDepartName;
            vm.tempNodeRoleName = vm.tempEditRoleName;
            socketService.setProposalNodeData();
            $scope.safeApply();
        }

        ////////////////////////////////////flow chart code///////////////////////////////////////
        //
        // Code for the delete key.
        //
        var deleteKeyCode = 46;

        //
        // Code for control key.
        //
        var ctrlKeyCode = 17;

        //
        // Set to true when the ctrl key is down.
        //
        var ctrlDown = false;

        //
        // Code for A key.
        //
        var aKeyCode = 65;

        //
        // Code for esc key.
        //
        var escKeyCode = 27;

        //
        // Selects the next node id.
        //
        var nextNodeID = 10;

        //
        // Event handler for key-down on the flowchart.
        //
        vm.keyDown = function (evt) {

            if (evt.keyCode === ctrlKeyCode) {

                ctrlDown = true;
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        //
        // Event handler for key-up on the flowchart.
        //
        vm.keyUp = function (evt) {

            if (evt.keyCode === deleteKeyCode) {
                //
                // Delete key.
                //
                vm.chartViewModel.deleteSelected();
            }

            if (evt.keyCode == aKeyCode && ctrlDown) {
                //
                // Ctrl + A
                //
                vm.chartViewModel.selectAll();
            }

            if (evt.keyCode == escKeyCode) {
                // Escape.
                vm.chartViewModel.deselectAll();
            }

            if (evt.keyCode === ctrlKeyCode) {
                ctrlDown = false;

                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        //
        // Add a new node to the chart.
        //
        vm.addNewNode = function () {
            //todo
            //var nodeName = prompt("Enter a node name:", "New node");
            //if (!nodeName) {
            //    return;
            //}

            //
            // Template for a new node.
            //
            var newNodeDataModel = {
                name: vm.tempNewNodeName,
                id: nextNodeID++,
                x: 150 + (nextNodeID % 3) * 10,
                y: 150 + (nextNodeID % 3) * 10,
                departmentData: {
                    id: vm.tempDepartmentID,
                    name: vm.tempDepartmentName,
                    label: $translate("DEPARTMENT")
                },
                //departmentName: vm.tempNewNodeDepartment.departmentName,
                //roleName: vm.tempNewNodeRole.roleName,
                roleData: {id: vm.tempRoleID, name: vm.tempRoleName, label: $translate("ROLE")},
                inputConnectors: [
                    {
                        name: "X"
                    }
                ],
                outputConnectors: [
                    {
                        name: "APPROVE",
                        color: "#00ff00"
                    },
                    {
                        name: "REJECT",
                        color: "red"
                    }
                ]
            };

            vm.chartViewModel.addNode(newNodeDataModel);
        };

        //
        // Add an input connector to selected nodes.
        //
        vm.addNewInputConnector = function () {
            var connectorName = prompt("Enter a connector name:", "New connector");
            if (!connectorName) {
                return;
            }

            var selectedNodes = vm.chartViewModel.getSelectedNodes();
            for (var i = 0; i < selectedNodes.length; ++i) {
                var node = selectedNodes[i];
                node.addInputConnector({
                    name: connectorName
                });
            }
        };

        //
        // Add an output connector to selected nodes.
        //
        vm.addNewOutputConnector = function () {
            var connectorName = prompt("Enter a connector name:", "New connector");
            if (!connectorName) {
                return;
            }

            var selectedNodes = vm.chartViewModel.getSelectedNodes();
            for (var i = 0; i < selectedNodes.length; ++i) {
                var node = selectedNodes[i];
                node.addOutputConnector({
                    name: connectorName
                });
            }
        };

        //
        // Delete selected nodes and connections.
        //
        vm.deleteSelected = function () {
            vm.chartViewModel.deleteSelected();
            vm.proposalChanged = true;
        };

        vm.saveProcess = function () {
            var isValid = true;
            console.log(vm.chartViewModel);
            var usedRoleId = [];
            if (vm.chartViewModel && vm.chartViewModel.nodes) {
                var steps = {};
                //build step data based on the node data
                for (var i = 0, leng = vm.chartViewModel.nodes.length; i < leng; i++) {
                    var node = vm.chartViewModel.nodes[i].data;
                    if (node.departmentData && node.roleData) {
                        steps[node.id] = {
                            title: node.name,
                            department: node.departmentData.id,
                            role: node.roleData.id
                        };
                        usedRoleId.push(node.roleData.id);
                    }
                    else {
                        isValid = false;
                        socketService.showErrorMessage("Incorrect work flow data! Missing department or role!");
                    }
                }
                //build link for next strep based on connection data
                var links = {};
                for (var j = 0, leng = vm.chartViewModel.connections.length; j < leng; j++) {
                    var con = vm.chartViewModel.connections[j];
                    if (con && con.data && con.data.dest && con.data.source
                        && con.data.dest.nodeID > flowchart.ChartViewModel.FAIL_POINT
                        && con.data.source.nodeID > flowchart.ChartViewModel.FAIL_POINT) {
                        links[con.data.source.nodeID] = con.data.dest.nodeID;
                    }
                }
                if (links.length < steps.length - 1) {
                    isValid = false;
                    socketService.showErrorMessage("Incorrect work flow data! Steps and links number doesn't match.");
                }
                if (usedRoleId.length !== new Set(usedRoleId).size) {
                    isValid = false;
                    socketService.showErrorMessage("There exists duplicate role in all steps! Process cannot be saved.");
                }
                console.log("steps", steps);
                console.log("links", links);
            } else {
                isValid = false;
                socketService.showErrorMessage("Incorrect work flow data! No steps added.");
            }
            if (isValid) {
                vm.updateProposalTypeProcessSteps(steps, links);
            }
        };

        vm.saveDateProcess = function () {
            //if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process && dt) {
            if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process && (vm.expDurationHour || vm.expDurationMin)) {
                vm.expShowSubmit = false;
                var hour = 0;
                var min = 0;

                if (!vm.expDurationHour) hour = 0;
                else hour = Number(vm.expDurationHour);

                if (!vm.expDurationMin) min = 0;
                else min = Number(vm.expDurationMin);

                var totalExpMinute = (hour * 60) + min;

                socketService.$socket($scope.AppSocket, 'updateProposalTypeExpiryDuration', {
                    query: {_id: vm.selectedProposalType.data._id},
                    expiryDuration: totalExpMinute
                }, function (data) {
                    vm.expResMsg = $translate('SUCCESS');
                    $scope.safeApply();

                }, function (err) {
                    vm.expResMsg = err.error.message || $translate('FAIL');
                    $scope.safeApply();
                });
            }
            else {
                socketService.showErrorMessage("Incorrect expiration duration!");
            }
        };

        vm.resetProcess = function () {
            vm.getProposalTypeProcessSteps();
            //vm.chartViewModel.resetToDefaultData()
        };

        vm.updateProposalTypeProcessSteps = function (steps, links) {
            if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process) {
                socketService.$socket($scope.AppSocket, 'updateProposalTypeProcessSteps', {
                    processId: vm.selectedProposalType.data.process,
                    steps: steps,
                    links: links
                }, function (data) {
                    console.log("updateProposalTypeProcessSteps", data);
                });
            }
            else {
                socketService.showErrorMessage("Incorrect proposal type data!");
            }
        };

        //get steps info for proposal type process
        vm.getProposalTypeProcessSteps = function () {
            if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process) {
                socketService.$socket($scope.AppSocket, 'getProposalTypeProcessSteps', {
                    processId: vm.selectedProposalType.data.process
                }, function (data) {
                    console.log("getProposalTypeProcess", data);
                    vm.drawProcessSteps(data.data);
                });
            }
        };

        //get expiration duration for proposal type
        vm.getProposalTypeExpirationDuration = function () {
            if (vm.selectedProposalType && vm.selectedProposalType.data) {
                socketService.$socket($scope.AppSocket, 'getProposalTypeExpirationDuration', {
                    query: {_id: vm.selectedProposalType.data._id},
                }, function (data) {
                    var hour = Math.floor(Number(data.data.expirationDuration) / 60);
                    var min = Number(data.data.expirationDuration) % 60;
                    hour = hour.toString();
                    min = min.toString();
                    vm.expDurationHour = hour;
                    vm.expDurationMin = min;
                });
            }
        };

        var startX = 40;
        var startY = 130;
        vm.drawProcessSteps = function (data) {
            startX = 40;
            startY = 60;
            vm.chartViewModel = new flowchart.ChartViewModel();
            if (data && data.process && data.steps && data.steps.length > 0 && data.process.steps.length > 0) {
                var steps = {};
                for (var i = 0; i < data.steps.length; i++) {
                    steps[data.steps[i]._id] = data.steps[i];
                }
                //draw node from the first step in the steps link list
                var nexStep = steps[data.process.steps[0]];
                while (nexStep) {
                    vm.addNodeFromStep(nexStep);
                    nexStep = steps[nexStep.nextStepWhenApprove];
                }
            } else {
                $('#flowChart').height(550);
            }
            vm.chartViewModel.deselectAll();
            $scope.safeApply();
        };

        vm.addNodeFromStep = function (data) {
            var newNodeDataModel = {
                name: data.title,
                id: nextNodeID++,
                x: startX,
                y: startY,
                departmentData: {
                    id: data.department._id,
                    name: data.department.departmentName,
                    label: $translate("DEPARTMENT")
                },
                roleData: {id: data.role._id, name: data.role.roleName, label: $translate("ROLE")},
                inputConnectors: [
                    {
                        name: "X"
                    }
                ],
                outputConnectors: [
                    {
                        name: "APPROVE",
                        color: "#00ff00"
                    },
                    {
                        name: "REJECT",
                        color: "red"
                    }
                ]
            };
            var newNode = vm.chartViewModel.addNode(newNodeDataModel);
            newNode.select();

            startY += 120;
            if (startY >= 550) {
                $('#flowChart').height(startY + 50);
                //console.log('vm.chartViewModel',vm.chartViewModel);
                vm.chartViewModel.points[1].data.y = startY;
            } else {
                $('#flowChart').height(550);
            }
        };

        ///////////////////////////////// common functions
        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };

        //////////////////////////////////// Message templates ///////////////////////////////////////

        (function () {

            // A copy of constMessageTypes
            vm.allMessageTypes = {};

            // The currently selected template.  Or if a new template is being created, the previously selected template (we can return to this if they cancel).
            vm.selectedMessageTemplate = null;

            // When set, this will be a reference to the template we are editing, or a new object when creating a new template
            vm.editingMessageTemplate = null;

            // This is the model that will appear in the form.  It is set to selectedMessageTemplate when vieweing, or to editingMessageTemplate when editing.
            vm.displayedMessageTemplate = null;

            // Will be 'create' or 'edit' or 'view' depending which mode we are in
            vm.messageTemplateMode = 'view';


            vm.getAllMessageTypes = function () {
                return $scope.$socketPromise('getAllMessageTypes', '').then(function (data) {
                    vm.allMessageTypes = data.data;
                });
            };

            vm.getPlatformMessageTemplates = function () {
                if (!vm.selectedPlatform) return;
                $scope.$socketPromise('getMessageTemplatesForPlatform', {platform: vm.selectedPlatform.id}).then(function (data) {
                    vm.messageTemplatesForPlatform = data.data;
                    console.log("vm.messageTemplatesForPlatform", vm.messageTemplatesForPlatform);
                    // Because selectedMessageTemplate is a reference and not an _id, it is now not holding the correct object, because the list of objects has been re-created
                    var oldSelectedMessageTemplateId = vm.selectedMessageTemplate && vm.selectedMessageTemplate._id;
                    selectMessageWithId(oldSelectedMessageTemplateId);
                    $scope.safeApply();
                }).done();
            };

            vm.startCreateMessageTemplate = function () {
                vm.messageTemplateMode = 'create';
                vm.editingMessageTemplate = {};
                vm.displayedMessageTemplate = vm.editingMessageTemplate;
                $scope.safeApply();
                $('#message-templates-scrolling-panel').scrollTop(0);
            };

            vm.startEditMessageTemplate = function () {
                if (vm.selectedMessageTemplate) {
                    vm.messageTemplateMode = 'edit';
                    // We clone the model, so we won't modify the existing selected model, in case the user cancels the edit
                    vm.editingMessageTemplate = Lodash.cloneDeep(vm.selectedMessageTemplate);
                    vm.displayedMessageTemplate = vm.editingMessageTemplate;
                }
            };

            vm.startDeleteMessageTemplate = function () {
                GeneralModal.confirm({
                    title: "Delete Message Template",
                    text: `Are you sure you want to delete the message template ${vm.selectedMessageTemplate.type} (${vm.selectedMessageTemplate.format})?`
                }).then(
                    () => $scope.$socketPromise('deleteMessageTemplateByIds', {
                        _ids: [vm.selectedMessageTemplate._id]
                    })
                ).then(
                    () => vm.getPlatformMessageTemplates()
                ).done();
            };

            vm.createMessageTemplate = function () {
                var templateData = vm.editingMessageTemplate;
                templateData.platform = vm.selectedPlatform.id;
                vm.resetToViewMessageTemplate();
                $scope.$socketPromise('createMessageTemplate', templateData).then(
                    () => vm.getPlatformMessageTemplates()
                ).done();
            };

            vm.saveMessageTemplate = function () {
                var query = {_id: vm.editingMessageTemplate._id};
                var updateData = vm.editingMessageTemplate;
                vm.resetToViewMessageTemplate();
                $scope.$socketPromise('updateMessageTemplate', {
                        query: query,
                        updateData: updateData
                    }
                ).then(function (data) {
                    var savedTemplateId = data.data._id;
                    return vm.getPlatformMessageTemplates().then(
                        () => selectMessageWithId(savedTemplateId)
                    );
                }).done();
            };

            vm.resetToViewMessageTemplate = function () {
                vm.editingMessageTemplate = null;
                vm.messageTemplateMode = 'view';
                vm.displayedMessageTemplate = vm.selectedMessageTemplate;
                vm.previewMessageTemplate();
            };

            function selectMessageWithId(targetId) {
                vm.selectedMessageTemplate = vm.messageTemplatesForPlatform.filter(t => t._id === targetId)[0];
                vm.resetToViewMessageTemplate();
            }

            // We should place here all the data that we think the admin might want to use in the template
            // It should match the data that is made available on the server in messageDispatcher.js
            var exampleMetaData = {
                rewardTask: {
                    status: 'Started',
                    data: null,
                    createTime: new Date(),
                    inProvider: false,
                    requiredUnlockAmount: 600,
                    unlockedAmount: 0,
                    currentAmount: 750,
                    initAmount: 750,
                    isUnlock: false,
                    rewardType: 'GameProviderReward',
                    type: 'GameProviderReward'
                },
                proposalData: {
                    creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                    createTime: new Date(),
                    data: {games: [], spendingAmount: '600', rewardAmount: '750', applyAmount: '500'},
                    priority: '0',
                    entryType: '1',
                    userType: '2',
                    noSteps: false,
                    process: {steps: [], status: 'Pending', createTime: new Date(),},
                    mainType: 'Reward',
                    type: {
                        rejectionType: 'rejectGameProviderReward',
                        executionType: 'executeGameProviderReward',
                        name: 'GameProviderReward'
                    },
                    proposalId: '364'
                },
                player: {
                    email: 'user.name@example.com',
                    isTestPlayer: false,
                    isRealPlayer: true,
                    feedbackTimes: 0,
                    receiveSMS: true,
                    realName: '',
                    registrationTime: new Date(),
                    lastAccessTime: new Date(),
                    isLogin: false,
                    lastLoginIp: '',
                    trustLevel: '2',
                    badRecords: [],
                    status: 1,
                    forbidProviders: [],
                    exp: 0,
                    games: ['574be0015463047e7909fa6d', '574be0015463047e7909fa6b'],
                    creditBalance: 0,
                    validCredit: 500,
                    lockedCredit: 750,
                    dailyTopUpSum: 0,
                    weeklyTopUpSum: 0,
                    topUpSum: 0,
                    topUpTimes: 0,
                    dailyConsumptionSum: 0,
                    weeklyConsumptionSum: 0,
                    consumptionSum: 0,
                    consumptionDetail: {},
                    consumptionTimes: 0,
                    bFirstTopUpReward: false,
                    playerLevel: {
                        levelUpConfig: [],
                        levelDownConfig: [],
                        reward: [],
                        platform: '574be0005463047e7909fa32',
                        value: 0,
                        name: 'Normal',
                    },
                    name: 'ChuckNorris',
                    playerId: '217387'
                }
            };

            vm.messageTemplateAllParams = generateAllParams();

            /** Converts the exampleMetaData object into an array of [path, value] pairs, such as: ['rewardTask.status', 'Started'] */
            function generateAllParams() {
                var params = [];
                listAllChildPaths(params, '', exampleMetaData);
                return params;
            }

            function listAllChildPaths(params, path, obj) {
                if (obj && typeof obj === 'object') {
                    const childKeys = Object.keys(obj);
                    childKeys.sort();
                    childKeys.forEach(
                        key => listAllChildPaths(params, path + (path ? '.' : '') + key, obj[key])
                    );
                } else {
                    params.push([path, obj]);
                }
            }

            vm.messageTemplateInsertParameter = function () {
                var box = document.getElementById('messageTemplateEditBox');
                var param = vm.messageTemplateParameterToInsert;
                insertTextAtCaret(box, '{{' + param + '}}');
            };

            function insertTextAtCaret(textbox, textToInsert) {
                var currentText = textbox.value;
                var selectionStart = textbox.selectionStart;
                var selectionEnd = textbox.selectionEnd;
                textbox.value = currentText.substring(0, selectionStart) + textToInsert + currentText.substring(selectionEnd);
                var finalCaretPosition = selectionStart + textToInsert.length;
                textbox.selectionStart = finalCaretPosition;
                textbox.selectionEnd = finalCaretPosition;
                textbox.focus();
                // Modifying the textarea DOM will not immediately update the angular model, until the textarea is edited by keyboard.
                // (This could be a problem if the user immediately submits the data without doing any more editing.)
                // Solution: This will trigger angular to sync up with the new textarea value.
                $(textbox).trigger('input');
            }

            vm.previewMessageTemplate = function () {
                var templateString = vm.displayedMessageTemplate && vm.displayedMessageTemplate.content || '';

                var renderedTemplate = renderTemplate(templateString, exampleMetaData);

                $('.messageTemplatePreview').hide();
                if (isHTML(templateString)) {
                    $('.messageTemplatePreview.html').html(renderedTemplate).show();
                } else {
                    $('.messageTemplatePreview.text').text(renderedTemplate).show();
                }
            };

        }());

        // Note that these functions are cloned from messageDispatcher.js
        // Please keep them in sync!
        function renderTemplate(templateString, metaData) {
            const inputIsHTML = isHTML(templateString);

            if (inputIsHTML) {
                templateString = templateString.replace(/\n\n/g, '<p>').replace(/\n/g, '<br>');
            }

            const renderedString = templateString.replace(
                /{{([^}]*)}}/g,
                function (match, expr) {
                    let value = lookupPath(metaData, expr);
                    if (value === null || value === undefined) {
                        value = '';
                    }
                    if (inputIsHTML) {
                        value = stringToHTML(value);
                    }
                    return '' + value;
                }
            );

            return renderedString;
        }

        function lookupPath(obj, path) {
            const parts = path.split('.');
            parts.forEach(part => obj = obj[part]);
            return obj;
        }

        function isHTML(str) {
            return str.match(/<\w*>/);
        }

        function stringToHTML(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        vm.commonPageChangeHandler = function (curP, pageSize, objKey, serchFunc) {
            var isChange = false;
            if (pageSize != vm[objKey].limit) {
                isChange = true;
                vm[objKey].limit = pageSize;
            }
            if ((curP - 1) * pageSize != vm[objKey].index) {
                isChange = true;
                vm[objKey].index = (curP - 1) * pageSize;
            }
            if (isChange) return serchFunc.call(this);
        }

        vm.commonSortChangeHandler = function (a, objName, searchFunc) {
            if (!a.aaSorting[0] || !objName || !vm[objName] || !searchFunc) return;
            var sortCol = a.aaSorting[0][0];
            var sortDire = a.aaSorting[0][1];
            var temp = a.aoColumns[sortCol];
            var sortKey = temp ? temp.sortCol : '';
            // console.log(a, sortCol, sortKey);
            vm[objName].aaSorting = a.aaSorting;
            if (sortKey) {
                vm[objName].sortCol = vm[objName].sortCol || {};
                var preVal = vm[objName].sortCol[sortKey];
                vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                if (vm[objName].sortCol[sortKey] != preVal) {
                    vm[objName].sortCol = {};
                    vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                    searchFunc.call(this);
                }
            }
        }

        vm.callPlayer = function (data) {
            var phoneCall = {
                playerId: data.playerId,
                name: data.name,
                toText: data.name,
                platform: "jinshihao",
                loadingNumber: true,
            }
            $scope.initPhoneCall(phoneCall);
            socketService.$socket($scope.AppSocket, 'getPlayerPhoneNumber', {playerObjId: data._id}, function (data) {
                $scope.phoneCall.phone = data.data;
                $scope.phoneCall.loadingNumber = false;
                $scope.safeApply();
                $('#phoneCallModal').modal('show');
            }, function (err) {
                $scope.phoneCall.loadingNumber = false;
                $scope.phoneCall.err = err.error.message;
                $scope.safeApply();
                $('#phoneCallModal').modal('show');
            }, true);
        }

        //////////////////////////initial socket actions//////////////////////////////////
        vm.getAllGameTypes = function () {
            return $scope.$socketPromise('getGameTypeList', {})
                .then(function (data) {
                    var gameTypes = data.data;
                    vm.allGameTypesList = gameTypes;
                    console.log("vm.allGameTypesList:", vm.allGameTypesList);

                    var allGameTypes = {};
                    gameTypes.forEach(function (gameType) {
                        var GAMETYPE = gameType.gameTypeId;
                        allGameTypes[GAMETYPE] = gameType.name;
                    });
                    vm.allGameTypes = allGameTypes;
                    console.log("vm.allGameTypes", vm.allGameTypes);

                    $scope.safeApply();
                }, function (err) {
                    console.log('err', err);
                });
        };
        // vm.getAllDepositMethods = function () {
        //     return $scope.$socketPromise('getDepositMethodList', {})
        //         .then(function (data) {
        //             console.log("vm.depositMethodList", data.data);
        //             vm.depositMethodList = data.data;
        //         });
        // };

        vm.getAllRewardTypes = function () {
            return $scope.$socketPromise('getAllRewardTypes')
                .then(function (data) {
                    vm.allRewardTypes = data.data;
                    console.log("vm.allRewardTypes", vm.allRewardTypes);
                });
        };

        // vm.getAllRewardRule = function () {
        //     return $scope.$socketPromise('getAllRewardRule', {})
        //         .then(function (data) {
        //             console.log("vm.rewardSrcList", data.data);
        //             vm.rewardSrcList = data.data;
        //         });
        // };

        // vm.getAllGameStatus = function () {
        //     return $scope.$socketPromise('getAllGameStatus')
        //         .then(function (data) {
        //             vm.allGameStatusString = data.data;
        //             var allStatus = data.data;
        //             var keys = [];
        //             for (var key in allStatus) {
        //                 if (allStatus.hasOwnProperty(key)) { //to be safe
        //                     keys.push(key);
        //                 }
        //             }
        //             vm.allGameStatusKeys = keys;
        //         });
        // };

        // vm.getPlayerStatusList = function () {
        //     return $scope.$socketPromise('getPlayerStatusList')
        //         .then(function (data) {
        //             vm.allPlayersStatusString = data.data;
        //             var allStatus = data.data;
        //             var keys = [];
        //             for (var key in allStatus) {
        //                 if (allStatus.hasOwnProperty(key)) { //to be safe
        //                     keys.push(key);
        //                 }
        //             }
        //             vm.allPlayersStatusKeys = keys;
        //         });
        // };

        // vm.getPartnerStatusList = function () {
        //     return $scope.$socketPromise('getPartnerStatusList')
        //         .then(function (data) {
        //
        //             vm.allPartnersStatusString = data.data;
        //             var allStatus = data.data;
        //             var keys = [];
        //             for (var key in allStatus) {
        //                 if (allStatus.hasOwnProperty(key)) {
        //                     keys.push(key);
        //                 }
        //             }
        //             console.log('\n\n\n\nallPartnersStatusString', keys);
        //             vm.allPartnersStatusKeys = keys;
        //         });
        // };

        // vm.getPlayerLvlPeriod = function () {
        //     socketService.$socket($scope.AppSocket, 'getPlayerLvlPeriodConst', '', function (data) {
        //         console.log('getPlayerLvlPeriodConst', data);
        //         vm.playerLvlPeriod = data.data;
        //         $scope.safeApply();
        //     });
        // }

        // vm.getPartnerCommissionPeriodConst = function () {
        //     if (vm.partnerCommissionPeriodConst) {
        //         return
        //     }
        //     socketService.$socket($scope.AppSocket, 'getPartnerCommissionPeriodConst', '', function (data) {
        //         console.log('getPartnerCommissionPeriodConst', data);
        //         vm.partnerCommissionPeriodConst = data.data;
        //         $scope.safeApply();
        //     });
        // };

        // vm.getPartnerCommissionSettlementModeConst = () => {
        //     if (vm.partnerCommissionSettlementModeConst) {
        //         return
        //     }
        //     socketService.$socket($scope.AppSocket, 'getPartnerCommissionSettlementModeConst', '', function (data) {
        //         vm.partnerCommissionSettlementModeConst = data.data;
        //         $scope.safeApply();
        //     });
        // };

        vm.setValue = function (obj, key, val) {
            if (obj && key) {
                obj[key] = val;
            }
            return val;
        }
        vm.clearDatePicker = function (id) {
            utilService.clearDatePickerDate(id);
        }

        ////////////////Mark::$viewContentLoaded function//////////////////
        //##Mark content loaded function
        $scope.$on('$viewContentLoaded', function () {

            setTimeout(
                function () {
                    vm.initFeedbackQuery();

                    vm.queryPara = {};

                    vm.phonePattern = /^[0-9]{8,18}$/;
                    vm.showPlatformList = true;
                    // vm.allGameStatusString = {};
                    vm.gameStatus = {};
                    vm.gameSmallShow = {};
                    vm.gameGroupClickable = {
                        inGameLoaded: true,
                        outGameLoaded: true,
                    };
                    vm.filterGameType = 'all';
                    vm.filterPlayGameType = 'all';

                    vm.platformPageName = 'Player';
                    vm.playerTableQuery = {limit: 10};
                    utilService.actionAfterLoaded("#playerTablePage", function () {
                        vm.playerTableQuery.pageObj = utilService.createPageForPagingTable("#playerTablePage", {pageSize: 10}, $translate, function (curP, pageSize) {
                            var isChange = false;
                            if (pageSize != vm.playerTableQuery.limit) {
                                isChange = true;
                                vm.playerTableQuery.limit = pageSize;
                            }
                            if ((curP - 1) * pageSize != vm.playerTableQuery.index) {
                                isChange = true;
                                vm.playerTableQuery.index = (curP - 1) * pageSize;
                            }
                            if (isChange) return vm.advancedPlayerQuery();
                        });
                        $('#playerDataTable').on('order.dt', function (event, a, b) {
                            // console.log(event, a, b);
                            if (!a.aaSorting[0]) return;
                            var sortCol = a.aaSorting[0][0];
                            var sortDire = a.aaSorting[0][1];
                            var sortKey = a.aoColumns[sortCol].data
                            // vm.playerTableQuery.aaSorting = a.aaSorting;

                            if (sortKey) {
                                vm.playerTableQuery.sortCol = vm.playerTableQuery.sortCol || {};
                                var preVal = vm.playerTableQuery.sortCol[sortKey];
                                vm.playerTableQuery.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                                if (vm.playerTableQuery.sortCol[sortKey] != preVal) {
                                    vm.playerTableQuery.sortCol = {};
                                    vm.playerTableQuery.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                                    vm.advancedPlayerQuery();
                                }
                            }
                        });
                    })


                    $('#partnerDataTable').on('order.dt', function (event, a, b) {
                        // console.log(event, a, b);
                        if (!a.aaSorting[0]) return;
                        var sortCol = a.aaSorting[0][0];
                        var sortDire = a.aaSorting[0][1];
                        var sortKey = a.aoColumns[sortCol].data
                        // vm.advancedPartnerQueryObj.aaSorting = a.aaSorting;
                        if (sortKey) {
                            vm.advancedPartnerQueryObj.sortCol = vm.advancedPartnerQueryObj.sortCol || {};
                            var preVal = vm.advancedPartnerQueryObj.sortCol[sortKey];
                            vm.advancedPartnerQueryObj.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                            if (vm.advancedPartnerQueryObj.sortCol[sortKey] != preVal) {
                                vm.advancedPartnerQueryObj.sortCol = {};
                                vm.advancedPartnerQueryObj.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                                vm.getPartnersByAdvancedQueryDebounced();
                            }
                        }
                    });


                    Q.all([]).then(
                        function (data) {
                            // This init data will be a list of undefineds.
                            // The above promises don't actually produce data, they just promise to set their vm variables!

                            vm.getAllGameTypes();
                            vm.getAllRewardTypes();
                            vm.loadPlatformData();
                            // vm.preparePlayerFeedback();
                            // vm.getAllGameStatus();
                            // vm.getPlayerStatusList();
                            // vm.getPartnerStatusList();
                            // vm.getAllProposalExecutionType();
                            // vm.getAllProposalRejectionType();
                            vm.getAllMessageTypes();
                            // vm.getAllDepositMethods();
                            // vm.getPlayerLvlPeriod();
                            vm.linkProvider();
                            $.getScript("dataSource/data.js").then(
                                () => {
                                    $scope.creditChangeTypeStrings = creditChangeTypeStrings.sort(function (a, b) {
                                        return a < b;
                                    })
                                }
                            );

                            window.document.title = $translate("platform") + "->" + $translate(vm.platformPageName);
                            var showLeft = $cookies.get("platformShowLeft");
                            if (showLeft === 'false') {
                                vm.toggleShowPlatformList(false)
                            }
                        },
                        function (error) {
                            console.warn("init error", error);
                        }
                    ).done();

                    // Create the view-model for the chart and attach to the scope.
                    //
                    vm.chartViewModel = new flowchart.ChartViewModel();
                    vm.chartViewModel.setEditable(true);
                    vm.proposalChanged = false;
                    vm.advancedQueryObj = {};

                    $scope.$watch(function () {
                        return socketService.getProposalNodeData()
                    }, function (newValue, oldValue) {
                        if (vm.editingNode) return;
                        if (newValue !== oldValue) {
                            if (!newValue)return;
                            vm.curNodeID = newValue.id;
                            vm.tempNodeName = newValue.name;
                            vm.tempNodeDepartmentName = newValue.departmentData.name;
                            vm.tempNodeDepartmentID = newValue.departmentData.id;
                            vm.tempNodeRoleName = newValue.roleData.name;
                            vm.tempNodeRoleID = newValue.roleData.id;
                            $scope.safeApply();
                        }
                    });

                    // socketService.$socket($scope.AppSocket, 'getAllTopUpType', {}, function (data) {
                    //     vm.topUpTypeList = {};
                    //     if (data.data) {
                    //         $.each(data.data, function (i, v) {
                    //             vm.topUpTypeList[v] = 'TOPUP' + i;
                    //         })
                    //     }
                    //     console.log("getAllTopUpType", vm.topUpTypeList);
                    //     $scope.safeApply();
                    // }, function (err) {
                    //     console.log("cannot get topup type", err);
                    // });

                    // Get bank list from pmsAPI
                    socketService.$socket($scope.AppSocket, 'getBankTypeList', {},
                        data => {
                            if (data && data.data && data.data.data) {
                                vm.allBankTypeList = {};
                                console.log('banktype', data.data.data);
                                data.data.data.forEach(item => {
                                    if (item && item.bankTypeId) {
                                        vm.allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                                    }
                                })
                            }
                            $scope.safeApply();
                        });

                    socketService.$socket($scope.AppSocket, 'getRewardTypesConfig', {}, function (data) {
                        console.log('rewardType', data);
                        vm.rewardAttrConst = data.data;
                    })
                    socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                        vm.allGameProvider = data.data;
                        console.log("vm.allGameProvider", vm.allGameProvider);
                        $scope.safeApply();
                    }, function (data) {
                    });
                    vm.generalDataTableOptions = {
                        "paging": true,
                        columnDefs: [{targets: '_all', defaultContent: ' '}],
                        dom: 'tpl',
                        "aaSorting": [],
                        destroy: true,
                        "scrollX": true,
                        // sScrollY: 350,
                        scrollCollapse: true,
                        // order: [[0, "desc"]],
                        lengthMenu: [
                            [10, 25, 50, -1],
                            ['10', '25', '50', $translate('Show All')]
                        ],
                        "language": {
                            "info": "",
                            "emptyTable": "",
                            "paginate": {
                                "previous": $translate("PREVIOUS_PAGE"),
                                "next": $translate("NEXT_PAGE"),
                            },
                            "lengthMenu": $translate("lengthMenuText"),
                            sZeroRecords: ""
                        },
                        "drawCallback": function (settings) {
                            setTimeout(function () {
                                $(window).trigger('resize');
                            }, 100)
                        }
                    }
                    //TODO::TEST CODE
                    /*
                     vm.dialogIds = [];
                     vm.openTestDialog = function () {
                     var newDivId = "newEditPlayer" + Date.now();
                     $("#dialogFrame").prepend("<div id='" + newDivId + "'>" + $("#platformEditPlayerTemp").html() + "</div>");
                     vm.dialogIds.push(newDivId);
                     };
                     */
                    var countDown = -1;
                    var a = setInterval(function () {
                        var item = $('#autoRefreshPlayerFlag');
                        var isRefresh = item && item.length > 0 && item[0].checked;
                        var mark = $('#timeLeftRefreshPlayer')[0];
                        $(mark).parent().toggleClass('hidden', countDown < 0);
                        if (isRefresh) {
                            if (countDown < 0) {
                                countDown = 11
                            }
                            if (countDown == 0) {
                                vm.advancedPlayerQuery();
                                countDown = 11;
                            }
                            countDown--;
                            $(mark).text(countDown);
                        } else {
                            countDown = -1;
                        }
                    }, 1000);
                }
            );
        });
    };
    platformController.$inject = injectParams;
    myApp.register.controller('platformCtrl', platformController);
});
