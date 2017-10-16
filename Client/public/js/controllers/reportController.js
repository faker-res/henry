'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', '$timeout', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies"];
    var reportController = function ($scope, $filter, $location, $log, $timeout, authService, socketService, utilService, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;

        // declare constant
        vm.proposalStatusList = { // removed APPROVED and REJECTED
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
        vm.feedbackResultList = {
            NORMAL: "Normal",
            MISSED_CALL: "MissedCall",
            PLAYER_BUSY: "PlayerBusy",
            OTHER: "Other",
            LAST_CALL: "LastCall"
        };

        //get all platform data from server
        vm.setPlatform = function (platObj) {
            vm.operSelPlatform = false;
            vm.selectedPlatform = JSON.parse(platObj);
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getCredibilityRemarksByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage(vm.showPageName);
            $scope.safeApply();
        };

        vm.setPlatformById = function (id) {
            var platObj = vm.platformList.filter(p => p._id === id)[0];
            console.log("platObj:", platObj);
            vm.showPageName = '';
            vm.setPlatform(JSON.stringify(platObj));
        }

        vm.initReportPara = function () {
            var obj = {};
            obj.startTime = utilService.setNDaysAgo(new Date(), 30);
            obj.endTime = new Date();
            return obj;
        }

        var constRewardReportTableProp = [
            {// player reward tables
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'playerName', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'amount', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'applyAmount', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [4]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('PLAYER ID'),
                        render: function (data, type, row) {
                            return row.data.playerId || ( row.data.playerObjId ? row.data.playerObjId.playerId : "");
                        }
                    },
                    {title: $translate('PLAYER_NAME'), data: "data.playerName", sClass: "sumText"},
                    {
                        title: $translate('REWARDAMOUNT'), sClass: "sumFloat alignRight", data: "$amount",
                        render: function (data, type, row) {
                            return parseFloat(row.data.amount || row.data.rewardAmount).toFixed(2);
                        }
                    },
                    {
                        title: $translate('APPLYAMOUNT'), sClass: "sumFloat alignRight", data: "$applyAmount",
                        render: function (data, type, row) {
                            return parseFloat(row.data.applyAmount).toFixed(2);
                        }
                    },
                    {title: $translate('CREATE_TIME'), data: "$createTime"},
                ]
            }, {//partner reward tables
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'playerName', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'amount', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PARTNER ID'), data: "data.partnerId.partnerId"},
                    {title: $translate('PARTNER_NAME'), data: "data.partnerId.partnerName", sClass: "sumText"},
                    {
                        title: $translate('REWARDAMOUNT'), sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return parseFloat(row.data.amount || row.data.rewardAmount).toFixed(2);
                        }
                    },
                    {title: $translate('CREATE_TIME'), data: "$createTime"},
                ]
            }, {//provider report
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    // {'sortCol': 'unlockedAmount', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('PLAYERID'),
                        render: function (data, type, row) {
                            return row.data.playerId || ( row.data.playerObjId ? row.data.playerObjId.playerId : "");
                        }
                    },
                    {
                        title: $translate('PLAYERNAME'), data: "data.playerName", sClass: "sumText"
                    },
                    // {
                    //     title: $translate('ISUNLOCK'), data: "isUnlock", sClass: "sumText",
                    //     render: function (data) {
                    //         return $translate(data);
                    //     }
                    // },
                    // {title: $translate('UNLOCKAMOUNT'), data: "unlockedAmount", sClass: "sumFloat alignRight"},
                    // {
                    //     title: $translate('STATUS'),
                    //     render: function (data, type, row) {
                    //         return $translate(vm.getStatusStrfromRow(row));
                    //     }
                    // },
                    {
                        title: $translate('REWARDAMOUNT'),
                        sClass: "sumFloat alignRight", data: "$amount",
                        // render: function (data, type, row) {
                        //     return parseFloat(row.data.amount || row.data.rewardAmount).toFixed(2);
                        // }
                    },
                    {
                        title: $translate('CREATETIME'), data: "createTime",
                        render: function (data, type, row) {
                            return utilService.$getTimeFromStdTimeFormat(data);
                        }
                    },
                ],
            }, {// all reward tables
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'playerName', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'rewardType', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'amount', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [4]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('PLAYER ID'),
                        render: function (data, type, row) {
                            return row.data.playerId || ( row.data.playerObjId ? row.data.playerObjId.playerId : "");
                        }
                    },
                    {title: $translate('PLAYER_NAME'), data: "data.playerName"},
                    {title: $translate('rewardType'), data: "type.name$", sClass: "sumText"},
                    {
                        title: $translate('REWARDAMOUNT'), sClass: "sumFloat alignRight", data: "$amount",
                    },
                    {title: $translate('CREATE_TIME'), data: "$createTime"},
                ]
            }
        ]
        var constRewardTaskTableProp = [
            {
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'unlockedAmount', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'currentAmount', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYERID'), data: "playerId.playerId"},
                    {title: $translate('PLAYERNAME'), data: "playerId.name"},
                    {title: $translate('ISUNLOCK'), data: "isUnlock", sClass: "sumText"},
                    {
                        title: $translate('UNLOCKAMOUNT'), data: "unlockedAmount", sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('STATUS'),
                        render: function (data, type, row) {
                            return $translate(vm.getStatusStrfromRow(row));
                        }
                    },
                    {
                        title: $translate('CURRENTAMOUNT'), data: "currentAmount", sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('CREATETIME'), data: "createTime",
                        render: function (data, type, row) {
                            return utilService.$getTimeFromStdTimeFormat(data);
                        }
                    },
                ],
            }, {
                aoColumnDefs: [
                    {'sortCol': 'playerId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'rewardType', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'unlockedAmount', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'currentAmount', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [7]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYERID'), data: "playerId.playerId"},
                    {title: $translate('PLAYERNAME'), data: "playerId.name"},
                    {title: $translate('rewardType'), data: "rewardType$"},
                    {title: $translate('ISUNLOCK'), data: "isUnlock", sClass: "sumText"},
                    {
                        title: $translate('UNLOCKAMOUNT'), data: "unlockedAmount", sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('STATUS'),
                        render: function (data, type, row) {
                            return $translate(vm.getStatusStrfromRow(row));
                        }
                    },
                    {
                        title: $translate('CURRENTAMOUNT'), data: "currentAmount", sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('CREATETIME'), data: "createTime",
                        render: function (data, type, row) {
                            return utilService.$getTimeFromStdTimeFormat(data);
                        }
                    },
                ],
            }
        ]

        vm.loadPage = function (choice, pageName, code, eventObjId) {

            function createMerGroupList(nameObj, listObj) {
                if (!nameObj || !listObj) return [];
                let obj = [];
                $.each(listObj, (name, arr) => {
                    obj.push({
                        name: nameObj[name],
                        list: arr.list
                    });
                });
                return obj;
            }

            socketService.clearValue();
            console.log('reward', choice, pageName, code);
            vm.seleDataType = {};
            if (pageName) {
                vm.seleDataType[pageName] = 'bg-bright';
            } else {
                vm.seleDataType[choice] = 'bg-bright';
            }
            vm.showPageName = choice;
            //$('#reportRightTable').removeClass('panel-danger').addClass('panel-primary');
            vm.currentRewardCode = code;
            vm.currentRewardTaskName = null;
            vm.currentEventId = eventObjId;
            if (vm.generalRewardProposalQuery && vm.generalRewardProposalQuery.table) {
                vm.generalRewardProposalQuery.table.destroy();
                $('#generalRewardProposalTable').prop('innerHTML', "");
            }
            if (vm.generalRewardTaskQuery && vm.generalRewardTaskQuery.table) {
                vm.generalRewardTaskQuery.table.destroy();
                $('#generalRewardTaskTable').prop('innerHTML', "");
            }
            if (code) {
                $('#generalRewardProposalTableSpin').hide();
            }
            vm.generalRewardProposalQuery = {};
            vm.generalRewardReportTableProp = {};
            vm.operationReportLoadingStatus = '';

            if (choice == "TOPUP_REPORT") {
                vm.queryTopup = {};
                vm.merchantNoNameObj = {};
                vm.merchantGroupObj = [];
                let merGroupName = {};
                let merGroupList = {};
                vm.queryTopup.totalCount = 0;
                vm.resetTopupRecord();
                // socketService.$socket($scope.AppSocket, 'getAllProposalStatus', {}, function (data) {
                //     delete data.data.APPROVED;
                //     delete data.data.REJECTED;
                //     // delete data.data.PROCESSING;
                //     console.log('proposalStatusList', data.data);
                //     vm.proposalStatusList = data.data;
                //     $scope.safeApply();
                // }, function (data) {
                //     console.log("cannot find proposal status", data);
                // });

                socketService.$socket($scope.AppSocket, 'getMerchantList', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data.data && data.data.merchants) {
                        vm.merchantNoList = data.data.merchants.filter(mer => {
                            vm.merchantNoNameObj[mer.merchantNo] = mer.name;
                            return mer.status != 'DISABLED';
                        });
                        vm.merchantNoList.forEach(item => {
                            merGroupList[item.merchantTypeId] = merGroupList[item.merchantTypeId] || {list: []};
                            merGroupList[item.merchantTypeId].list.push(item.merchantNo);
                        }) || [];

                        vm.merchantGroupObj = createMerGroupList(merGroupName, merGroupList);
                    }
                    $scope.safeApply();
                }, function (data) {
                    console.log("merchantList", data);
                });

                socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                    data.data.merchantTypes.forEach(mer => {
                        merGroupName[mer.merchantTypeId] = mer.name;
                    })
                    vm.merchantGroupObj = createMerGroupList(merGroupName, merGroupList);
                    $scope.safeApply();
                }, function (data) {
                    console.log("merchantList", data);
                });


                utilService.actionAfterLoaded("#topupTablePage", function () {
                    vm.commonInitTime(vm.queryTopup, '#topUpReportQuery')
                    vm.queryTopup.merchantType = null;
                    vm.queryTopup.pageObj = utilService.createPageForPagingTable("#topupTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "queryTopup", vm.searchTopupRecord)
                    });
                    $scope.safeApply();
                })

            } else if (choice == "RewardReport") {
                vm.rewardTypeName = 'ALL';
                vm.currentRewardCode = 'ALL';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[3]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[1]);
                vm.currentRewardTaskName = "ALL";
            } else if (choice == "PROVIDER_REPORT") {
                vm.queryOperation = {};
                vm.queryOperation.providerId = 'all';
                utilService.actionAfterLoaded("#operationTable", function () {
                    vm.commonInitTime(vm.queryOperation, '#operationReportQuery')
                    // vm.queryOperation.pageObj = utilService.createPageForPagingTable("#topupTablePage", {}, $translate, vm.topupTablePageChange);
                });
                $scope.safeApply();
            } else if (choice == "FULL_ATTENDANCE_REPORT") {
                vm.rewardTypeName = 'FULL_ATTENDANCE';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.currentRewardTaskName = "FULL_ATTENDANCE";
                utilService.actionAfterLoadedDateTimePickers("#fullAttendanceRewardTask", function () {
                    vm.fullAttendanceRewardQuery = {status: 'all'};
                    vm.fullAttendanceResultQuery = {status: 'all'};
                    $scope.safeApply();
                });
            }
            // else if (choice == "PROVIDER_REPORT") {
            //     vm.rewardTypeName = 'GAME_PROVIDER_REWARD';
            //     vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[2]);
            //     vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
            //     vm.currentRewardTaskName = "GAME_PROVIDER_REWARD";
            //     utilService.actionAfterLoadedDateTimePickers("#providerRewardReport", function () {
            //         $scope.safeApply();
            //     });
            // } 
            else if (choice == "PROPOSAL_REPORT") {
                vm.proposalQuery = {};
                vm.proposalQuery.status = 'all';
                vm.proposalQuery.totalCount = 0;
                vm.proposalQuery.proposalTypeId = '';
                utilService.actionAfterLoaded("#proposalTablePage", function () {
                    vm.commonInitTime(vm.proposalQuery, '#proposalReportQuery')

                    $('select#selectProposalType').multipleSelect({
                        allSelected: $translate("All Selected"),
                        selectAllText: $translate("Select All"),
                        displayValues: true,
                        countSelected: $translate('# of % selected'),
                    });
                    var $multi = ($('select#selectProposalType').next().find('.ms-choice'))[0];
                    $('select#selectProposalType').next().on('click', 'li input[type=checkbox]', function () {
                        var upText = $($multi).text().split(',').map(item => {
                            return $translate(item);
                        }).join(',');
                        $($multi).find('span').text(upText)
                    });
                    $("select#selectProposalType").multipleSelect("checkAll");

                    vm.proposalQuery.pageObj = utilService.createPageForPagingTable("#proposalTablePage", {}, $translate, vm.proposalTablePageChange);
                })
                $scope.safeApply();
            } else if (choice == "PLAYER_REPORT") {
                utilService.actionAfterLoaded('#playerReportTablePage', function () {
                    // todo :: change date to yesterday
                    var yesterday = utilService.setNDaysAgo(new Date(), 1);
                    var yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    var todayEndTime = utilService.getTodayEndTime();
                    vm.playerQuery = {};
                    vm.playerQuery.consumptionTimesOperator = ">=";
                    vm.playerQuery.profitAmountOperator = ">=";
                    vm.playerQuery.topUpTimesOperator = ">=";
                    vm.playerQuery.bonusTimesOperator = ">=";
                    vm.playerQuery.topUpAmountOperator = ">=";
                    vm.playerQuery.start = utilService.createDatePicker('#startingDateTimePicker');
                    vm.playerQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                    vm.playerQuery.end = utilService.createDatePicker('#endingEndDateTimePicker');
                    vm.playerQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    vm.playerQuery.pageObj = utilService.createPageForPagingTable("#playerReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "playerQuery", vm.searchPlayerReport);
                    });
                    vm.setupRemarksMultiInput();
                    $scope.safeApply();
                })
            } else if (choice == "PLAYER_EXPENSE_REPORT") {
                vm.playerExpenseQuery = {totalCount: 0};
                utilService.actionAfterLoaded("#playerExpenseTablePage", function () {
                    vm.commonInitTime(vm.playerExpenseQuery, '#playerExpenseReportQuery');
                    vm.playerExpenseQuery.providerId = "all";
                    vm.playerExpenseQuery.pageObj = utilService.createPageForPagingTable("#playerExpenseTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "playerExpenseQuery", vm.searchProviderPlayerRecord)
                    });
                })
            } else if (choice == "PLAYERDOMAIN_REPORT") {
                vm.playerDomain = {totalCount: 0};
                vm.playerDomain.topUpTimesOperator = ">=";
                vm.playerDomain.playerValueOperator = ">=";
                vm.playerDomain.registrationInterface = "";
                vm.playerDomain.isNewSystem = "";
                vm.playerDomain.playerType = "Real Player (all)";
                utilService.actionAfterLoaded("#playerDomainReportTablePage", function () {
                    vm.commonInitTime(vm.playerDomain, '#playerDomainReportQuery');
                    vm.playerDomain.pageObj = utilService.createPageForPagingTable("#playerDomainReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "playerDomain", vm.searchPlayerDomainRepport)
                    });
                    vm.searchPlayerDomainRepport(true);
                });
            } else if (choice == "NEWACCOUNT_REPORT") {
                vm.newPlayerQuery = {totalCount: 0};
                utilService.actionAfterLoaded("#newPlayerDomainTable", function () {
                    vm.commonInitTime(vm.newPlayerQuery, '#newPlayerReportQuery');
                    vm.searchNewPlayerRecord(true);
                });
            } else if (choice == 'DX_NEWACCOUNT_REPORT') {
                utilService.actionAfterLoaded('#dxNewPlayerReportTable', function () {
                    let yesterday = utilService.setNDaysAgo(new Date(), 1);
                    let yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    let todayEndTime = utilService.getTodayEndTime();

                    // Get Promote CS and way lists
                    vm.allPromoteWay = {};
                    let query = {
                        platformId: vm.selectedPlatform._id
                    };
                    socketService.$socket($scope.AppSocket, 'getAllPromoteWay', query, function (data) {
                            vm.allPromoteWay = data.data;
                            console.log("vm.allPromoteWay", vm.allPromoteWay);
                            $scope.safeApply();
                        },
                        function (err) {
                            console.log(err);
                        });

                    // Get Departments Detail
                    socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform._id}, function success(data) {
                        console.log('getDepartmentTreeById', data);
                        let parentId;
                        vm.queryDepartments = [];
                        vm.queryRoles = [];

                        data.data.map(e => {
                            if (e.departmentName == vm.selectedPlatform.name) {
                                vm.queryDepartments.push(e);
                                parentId = e._id;
                            }
                        });

                        data.data.map(e => {
                            if (String(parentId) == String(e.parent)) {
                                vm.queryDepartments.push(e);
                            }
                        });

                        $scope.$digest();
                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });

                    vm.dxNewPlayerQuery = {
                        days: 1,
                        valueScoreOperator: ">=",
                        topUpTimesOperator: ">=",
                        bonusTimesOperator: ">=",
                        topUpAmountOperator: ">="
                    };
                    vm.dxNewPlayerQuery.start = utilService.createDatePicker('#dxNewPlayerReportQuery .startTime');
                    vm.dxNewPlayerQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                    vm.dxNewPlayerQuery.end = utilService.createDatePicker('#dxNewPlayerReportQuery .endTime');
                    vm.dxNewPlayerQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    $scope.safeApply();
                })
            } else if (choice == "WINRATE_REPORT") {
                vm.winRateQuery = {};
                vm.winRateSummaryData = {};
                vm.winRateQuery.providerId = 'all';
                utilService.actionAfterLoaded("#winRateTable", function () {
                    vm.commonInitTime(vm.winRateQuery, '#winrateReportQuery');
                });
                $scope.safeApply();
            } else if (choice == "ONLINE_PAYMENT_MISMATCH_REPORT") {
                vm.onlinePaymentMismatchQuery = {type: 'online'};
                vm.proposalMismatchDetail = {};
                utilService.actionAfterLoaded("#onlinePaymentMismatchTable", function () {
                    vm.commonInitTime(vm.onlinePaymentMismatchQuery, '#onlinePaymentMismatchQuery');
                });
                $scope.safeApply();
            } else if (choice == "LIMITED_OFFER_REPORT") {
                vm.limitedOfferQuery = {};
                vm.limitedOfferDetail = {};
                utilService.actionAfterLoaded("#limitedOfferTable", function () {
                    vm.commonInitTime(vm.limitedOfferQuery, '#limitedOfferQuery');
                });
                $scope.safeApply();
            } else if (choice == "PLAYERPARTNER_REPORT") {
                vm.partnerQuery = {};
                utilService.actionAfterLoaded("#playerPartnerTable", function () {
                    vm.commonInitTime(vm.partnerQuery, '#playerPartnerReportQuery');
                    vm.partnerQuery.pageObj = utilService.createPageForPagingTable("#playerPartnerTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerQuery", vm.searchPlayerPartnerRecord)
                    });
                    $scope.safeApply();
                })
            } else if (choice == "PLAYER_CONSUMPTION_RETURN_REPORT") {
                vm.consumptionReturnQuery = vm.initReportPara();
                vm.rewardTypeName = 'PLAYER_CONSUMPTION_RETURN';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "PLAYER_CONSUMPTION_RETURN";
                utilService.actionAfterLoadedDateTimePickers("#consumptionReturnReport", function () {
                    $scope.safeApply();
                });
            } else if (choice == "PLAYER_LEVEL_UP_REPORT") {
                vm.rewardTypeName = 'PLAYER_LEVEL_UP';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "PLAYER_LEVEL_UP";
            } else if (choice == "PARTNER_TOP_UP_RETURN_REPORT") {
                vm.rewardTypeName = 'PARTNER_TOP_UP_RETURN';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "PARTNER_TOP_UP_RETURN";
            } else if (choice == "PLAYER_TOP_UP_REWARD_REPORT") {
                vm.rewardTypeName = 'PLAYER_TOP_UP_REWARD';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "PLAYER_TOP_UP_REWARD";
            } else if (choice == "PLAYER_REFERRAL_REWARD_REPORT") {
                vm.rewardTypeName = 'PLAYER_REFERRAL_REWARD';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                // vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                // vm.currentRewardTaskName = "PLAYER_REFERRAL_REWARD";
            } else if (choice == "FIRST_TOPUP_REWARD_REPORT") {
                vm.rewardTypeName = 'FIRST_TOP_UP';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "FIRST_TOP_UP";
            } else if (choice == "TRANSACTION_REPORT") {
                vm.rewardTypeName = 'PLATFORM_TRANSACTION_REWARD';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
            } else if (choice == "PARTNER_CONSUMPTION_REPORT") {
                vm.rewardTypeName = 'PARTNER_CONSUMPTION_RETURN';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[1]);
            } else if (choice == "PARTNER_INCENTIVE_REPORT") {
                vm.rewardTypeName = 'PARTNER_INCENTIVE_REWARD';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[1]);
            } else if (choice == "PARTNER_REFERRAL_REPORT") {
                vm.rewardTypeName = 'PARTNER_REFERRAL_REWARD';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[1]);
            } else if (choice == "PLAYER_FEEDBACK_REPORT") {
                vm.playerFeedbackQuery.result = 'all';
                vm.playerFeedbackQuery.totalCount = 0;
                utilService.actionAfterLoaded("#playerFeedbackTablePage", function () {
                    vm.commonInitTime(vm.playerFeedbackQuery, '#playerFeedbackReportQuery');
                    vm.playerFeedbackQuery.pageObj = utilService.createPageForPagingTable("#playerFeedbackTablePage", {}, $translate, vm.feedbackTablePageChange);
                })
                $scope.safeApply();
            } else if (choice == "CREDIT_CHANGE_REPORT") {
                vm.creditChangeQuery = vm.creditChangeQuery || {};
                utilService.actionAfterLoaded("#creditChangeTablePage", function () {
                    vm.creditChangeQuery.totalCount = 0;
                    vm.commonInitTime(vm.creditChangeQuery, '#creditChangeReportQuery');
                    vm.creditChangeQuery.pageObj = utilService.createPageForPagingTable("#creditChangeTablePage", {}, $translate, vm.creditChangeTablePageChange);
                })
            } else if (choice == "PLAYER_TOP_UP_RETURN_REPORT") {
                vm.rewardTypeName = 'PLAYER_TOP_UP_RETURN';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = "PLAYER_TOP_UP_RETURN";
            } else if (choice == "PLAYER_CONSUMPTION_INCENTIVE_REPORT") {
                vm.rewardTypeName = 'PLAYER_CONSUMPTION_INCENTIVE';
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.currentRewardTaskName = "PLAYER_CONSUMPTION_INCENTIVE";
                $scope.safeApply();
            } else if (choice == "PLAYER_ALMOST_LEVELUP_REPORT") {
                vm.playerAlmostLevelUpQuery = vm.playerAlmostLevelUpQuery || {};
                vm.playerAlmostLevelUpQuery.percentage = 0.9;
                vm.playerAlmostLevelUpQuery.totalCount = 0;
                utilService.actionAfterLoaded("#playerAlmostLevelUpTablePage", function () {
                    vm.playerAlmostLevelUpQuery.pageObj = utilService.createPageForPagingTable("#playerAlmostLevelUpTablePage", {}, $translate, vm.playerAlmostLevelUpTablePageUpdate);
                })
                $scope.safeApply();
            } else if (choice == "PARTNERPLAYERBOUNS_REPORT") {
                vm.partnerPlayerBonusQuery = {};
                vm.partnerPlayerBonusQuery.status = 'all';
                vm.partnerPlayerBonusQuery.totalCount = 0;
                vm.partnerPlayerBonusQuery.proposalTypeId = 'all';
                utilService.actionAfterLoaded("#partnerPlayerBonusTablePage", function () {
                    vm.commonInitTime(vm.partnerPlayerBonusQuery, '#partnerPlayerBonusQuery')
                    vm.partnerPlayerBonusQuery.pageObj = utilService.createPageForPagingTable("#partnerPlayerBonusTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerPlayerBonusQuery", vm.searchPartnerPlayerBonusData)
                    });
                })
                $scope.safeApply();
            } else if (choice == "PARTNERCOMMISSION_REPORT") {
                vm.partnerCommissionQuery = {};
                vm.partnerCommissionQuery.status = 'all';
                vm.partnerCommissionQuery.totalCount = 0;
                vm.partnerCommissionQuery.proposalTypeId = 'all';
                utilService.actionAfterLoaded("#partnerCommissionTablePage", function () {
                    vm.commonInitTime(vm.partnerCommissionQuery, '#partnerCommissionQuery')
                    vm.partnerCommissionQuery.pageObj = utilService.createPageForPagingTable("#partnerCommissionTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerCommissionQuery", vm.searchPartnerCommissionData)
                    });
                })
                $scope.safeApply();
            } else if (choice == "ACTIONLOG_REPORT") {
                vm.actionLogQuery = vm.actionLogQuery || {};
                vm.actionLogQuery.allActions = [
                    {group: "DEPARTMENT", text: "ADD_DEPARTMENT", action: "createDepartment"},
                    {group: "DEPARTMENT", text: "MOVE_DEPARTMENT", action: "updateDepartmentParent"},
                    {group: "DEPARTMENT", text: "RENAME_DEPARTMENT", action: "updateDepartment"},
                    {group: "DEPARTMENT", text: "DELETE_DEPARTMENT", action: "deleteDepartmentsById"},

                    {group: "Role", text: "createRoleForDepartment", action: "createRoleForDepartment"},
                    {group: "Role", text: "deleteRolesById", action: "deleteRolesById"},
                    {group: "Role", text: "updateRole", action: "updateRole"},
                    {group: "Role", text: "attachRolesToUsersById", action: "attachRolesToUsersById"},
                    {group: "Role", text: "detachRolesFromUsersById", action: "detachRolesFromUsersById"},

                    {group: "Admin", text: "createAdminForDepartment", action: "createAdminForDepartment"},
                    {group: "Admin", text: "updateAdmin", action: "updateAdmin"},
                    {group: "Admin", text: "deleteAdminInfosById", action: "deleteAdminInfosById"},
                    {group: "Admin", text: "MOVE_USER", action: "updateAdminDepartment"},
                    {group: "Admin", text: "RESET_PASSWORD", action: "resetAdminPassword"},

                    {group: "PLATFORM", text: "createPlatform", action: "createPlatform"},
                    {group: "PLATFORM", text: "DELETE_PLATFORM", action: "deletePlatformById"},
                    {group: "PLATFORM", text: "updatePlatform", action: "updatePlatform"},
                    {
                        group: "PLATFORM",
                        text: "Daily Settlement",
                        action: ["startPlatformDailySettlement", "fixPlatformDailySettlement"]
                    },
                    {
                        group: "PLATFORM",
                        text: "Weekly Settlement",
                        action: ["startPlatformWeeklySettlement", "fixPlatformWeeklySettlement"]
                    },

                    {group: "PLAYER", text: "CREATE_PLAYER", action: "createPlayer"},
                    {group: "PLAYER", text: "createTestPlayerForPlatform", action: "createTestPlayerForPlatform"},
                    {group: "PLAYER", text: "createUpdatePlayerInfoProposal", action: "createUpdatePlayerInfoProposal"},
                    {group: "PLAYER", text: "Search referral", action: "getPlayerReferrals"},
                    {
                        group: "PLAYER",
                        text: "createUpdatePlayerPhoneProposal",
                        action: "createUpdatePlayerPhoneProposal"
                    },
                    {
                        group: "PLAYER",
                        text: "createUpdatePlayerEmailProposal",
                        action: "createUpdatePlayerEmailProposal"
                    },
                    {
                        group: "PLAYER",
                        text: "createUpdatePlayerQQProposal",
                        action: "createUpdatePlayerQQProposal"
                    },
                    {group: "PLAYER", text: "UpdatePlayerBankInfo", action: "createUpdatePlayerBankInfoProposal"},
                    {group: "PLAYER", text: "resetPlayerPassword", action: "resetPlayerPassword"},

                    {group: "PLAYER", text: "Repair Payment", action: "submitRepairPaymentProposal"},
                    {
                        group: "PLAYER",
                        text: "createUpdatePlayerCreditProposal",
                        action: "createUpdatePlayerCreditProposal"
                    },
                    {group: "PLAYER", text: "Forbid TopUp Types", action: "updatePlayerPayment"},
                    {group: "PLAYER", text: "createPlayerFeedback", action: "createPlayerFeedback"},

                    {group: "PLAYER", text: "updatePlayerStatus", action: "updatePlayerStatus"},
                    {
                        group: "PLAYER",
                        text: "transferPlayerCreditFromProvider",
                        action: "transferPlayerCreditFromProvider"
                    },
                    {group: "PLAYER", text: "transferPlayerCreditToProvider", action: "transferPlayerCreditToProvider"},
                    {group: "PLAYER", text: "PlayerPermission", action: "updatePlayerPermission"},

                    {group: "PARTNER", text: "createPartner", action: "createPartner"},
                    {group: "PARTNER", text: "createPartnerWithParent", action: "createPartnerWithParent"},
                    {group: "PARTNER", text: "deletePartnersById", action: "deletePartnersById"},
                    {group: "PARTNER", text: "updatePartner", action: "createUpdatePartnerInfoProposal"},
                    {group: "PARTNER", text: "Update partner phone number", action: "createUpdatePartnerPhoneProposal"},
                    {group: "PARTNER", text: "Update partner email", action: "createUpdatePartnerEmailProposal"},
                    {
                        group: "PARTNER",
                        text: "Update partner bank information",
                        action: "createUpdatePartnerBankInfoProposal"
                    },
                    {group: "PARTNER", text: "RESET_PASSWORD", action: "resetPartnerPassword"},

                    {group: "Platform Game", text: "PROVIDER_NICKNAME", action: "renameProviderInPlatformById"},
                    {group: "Platform Game", text: "ENABLE/DISABLE", action: "updateProviderFromPlatformById"},
                    {group: "Platform Game", text: "updateGameStatusToPlatform", action: "updateGameStatusToPlatform"},
                    {group: "Platform Game", text: "attachGameToPlatform", action: "attachGamesToPlatform"},
                    {group: "Platform Game", text: "detachGameFromPlatform", action: "detachGamesFromPlatform"},

                    {group: "GameGroup", text: "Add Game Group", action: "addPlatformGameGroup"},
                    {group: "GameGroup", text: "Remove Game Group", action: "deleteGameGroup"},
                    {group: "GameGroup", text: "Rename Game Group", action: "renamePlatformGameGroup"},
                    {group: "GameGroup", text: "Move Game Group", action: "updateGameGroupParent"},
                    {group: "GameGroup", text: "Update Game Group", action: "updatePlatformGameGroup"},

                    {group: "REWARD", text: "createRewardEvent", action: "createRewardEvent"},
                    {group: "REWARD", text: "deleteRewardEventByIds", action: "deleteRewardEventByIds"},
                    {group: "REWARD", text: "updateRewardEvent", action: "updateRewardEvent"},

                    {
                        group: "Proposal",
                        text: "updateProposalTypeProcessSteps",
                        action: "updateProposalTypeProcessSteps"
                    },
                    {group: "Proposal", text: "updateProposalProcessStep", action: "updateProposalProcessStep"},

                    {group: "PlayerLevel", text: "createPlayerLevel", action: "createPlayerLevel"},
                    {group: "PlayerLevel", text: "updatePlayerLevel", action: "updatePlayerLevel"},

                    {group: "PartnerLevel", text: "createPartnerLevel", action: "createPartnerLevel"},
                    {group: "PartnerLevel", text: "partnerLevel/update", action: "partnerLevel/update"},
                    {group: "VALID_ACTIVE", text: "updatePartnerLevelConfig", action: "updatePartnerLevelConfig"},
                    {
                        group: "Partner Commission",
                        text: "Partner Commission",
                        action: ['createPartnerCommissionConfig', 'updatePartnerCommissionLevel', 'getPartnerCommissionConfig']
                    },

                    {group: "MessageTemplates", text: "ADD", action: "createMessageTemplate"},
                    {group: "MessageTemplates", text: "UPDATE", action: "updateMessageTemplate"},

                    {group: "ANNOUNCEMENTS", text: "ADD", action: "createPlatformAnnouncement"},
                    {group: "ANNOUNCEMENTS", text: "UPDATE", action: "updatePlatformAnnouncement"},
                    {group: "ANNOUNCEMENTS", text: "DELETE", action: "deletePlatformAnnouncementByIds"},

                    {group: "Bankcard Group", text: "ADD", action: "addPlatformBankCardGroup"},
                    {group: "Bankcard Group", text: "UPDATE", action: "updatePlatformBankCardGroup"},
                    {group: "Bankcard Group", text: "DELETE", action: "deleteBankCardGroup"},
                    {group: "Bankcard Group", text: "Default", action: "setPlatformDefaultBankCardGroup"},
                    {group: "Bankcard Group", text: "ADD_PLAYER", action: "addPlayersToBankCardGroup"},

                    {group: "MERCHANT_GROUP", text: "ADD", action: "addPlatformMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "UPDATE", action: "renamePlatformMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "DELETE", action: "deleteMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "Default", action: "setPlatformDefaultMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "ADD_PLAYER", action: "addPlayersToMerchantGroup"},

                    {group: "AlipayGroup", text: "ADD", action: "addPlatformAlipayGroup"},
                    {group: "AlipayGroup", text: "UPDATE", action: "renamePlatformAlipayGroup"},
                    {group: "AlipayGroup", text: "DELETE", action: "deleteAlipayGroup"},
                    {group: "AlipayGroup", text: "Default", action: "setPlatformDefaultAlipayGroup"},
                    {group: "AlipayGroup", text: "ADD_PLAYER", action: "addPlayersToAlipayGroup"},

                    {group: "Provider", text: "SETTLEMENT", action: "manualDailyProviderSettlement"},
                    {group: "Provider", text: "UPDATE", action: "updateGameProvider"},
                    {group: "Provider", text: "GameStatus", action: "updateGame"},
                ];
                utilService.actionAfterLoaded("#actionLogTablePage", function () {
                    vm.commonInitTime(vm.actionLogQuery, '#actionLogReportQuery');
                    vm.actionLogQuery.pageObj = utilService.createPageForPagingTable("#actionLogTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "actionLogQuery", vm.searchActionLogData)
                    });
                })
                $scope.safeApply();
            } else if (choice.indexOf('REWARD_REPORT') !== -1) {
                // Unless customization is necessary, this should handle the rest of reward report
                let rewardNameWithoutReport = choice.replace("_REPORT", "");
                vm.rewardTypeName = rewardNameWithoutReport;
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                vm.currentRewardTaskName = rewardNameWithoutReport;
            }

            if (vm.currentRewardCode) {
                vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};
                vm.generalRewardProposalQuery.totalCount = 0;
                utilService.actionAfterLoaded("#generalRewardProposalTablePage", function () {
                    vm.commonInitTime(vm.generalRewardProposalQuery, '#generalRewardProposalQuery');
                    vm.generalRewardProposalQuery.pageObj = utilService.createPageForPagingTable("#generalRewardProposalTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardProposalQuery", vm.generalRewardProposalSearch)
                    });
                })
                $scope.safeApply();
            }
            if (vm.currentRewardTaskName) {
                vm.generalRewardTaskQuery = {};
                vm.generalRewardTaskQuery.totalCount = 0;
                utilService.actionAfterLoaded("#generalRewardTaskTablePage", function () {
                    vm.commonInitTime(vm.generalRewardTaskQuery, '#generalRewardTaskQuery');
                    vm.generalRewardTaskQuery.pageObj = utilService.createPageForPagingTable("#generalRewardTaskTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardTaskQuery", vm.searchGeneralRewardTask)
                    });
                })
                $scope.safeApply();
            }
        }
        vm.commonTableOption = {
            dom: 'Zrtlp',
            "autoWidth": true,
            "scrollX": true,
            // "scrollY": "455px",
            columnDefs: [{targets: '_all', defaultContent: ' '}],
            "scrollCollapse": true,
            "destroy": true,
            "paging": false,
            //"dom": '<"top">rt<"bottom"ilp><"clear">Zlfrtip',
            "language": {
                "emptyTable": $translate("No data available in table"),
            },
        }

        // vm.selectProposalType = function (id) {
        //     vm.operSelPlatform = false;
        //     $.each(vm.allProposalType, function (i, v) {
        //         if (v._id == id) {
        //             vm.selectedProposalType = v;
        //             vm.selectedProposalTypeID = v._id;
        //             console.log('vm.selectedProposalType', vm.selectedProposalType);
        //             $scope.safeApply();
        //             return;
        //         }
        //     });
        // };
        // vm.selectProposalStatus = function (id) {
        //     vm.operSelPlatform = false; // Check tomorow
        //     console.log('vm.proposalStatusList:', vm.proposalStatusList);
        //     $.each(vm.proposalStatusList, function (i, v) {
        //         if (v._id == id) {
        //             vm.selectedProposalStatus = v;
        //             console.log('vm.selectProposalStatus..', vm.selectedProposalStatus);
        //             $scope.safeApply();
        //             return;
        //         }
        //     });
        // };

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

        vm.endLoadMultipleSelect = function () {
            $timeout(function () {
                $('.spicker').selectpicker('refresh');
            }, 0);
        };

        vm.setQueryRole = () => {
            vm.queryRoles = [];

            vm.queryDepartments.map(e => {
                if (vm.dxNewPlayerQuery.departments.indexOf(e._id) >= 0) {
                    vm.queryRoles = vm.queryRoles.concat(e.roles);
                }
            });

            vm.endLoadMultipleSelect();
            $scope.safeApply();
        };

        vm.setQueryAdmins = () => {
            vm.queryAdmins = [];

            vm.queryRoles.map(e => {
                if (vm.dxNewPlayerQuery.roles.indexOf(e._id) >= 0) {
                    vm.queryAdmins = vm.queryAdmins.concat(e.users);
                }
            });

            vm.endLoadMultipleSelect();
            $scope.safeApply();
        };

        vm.getGameByIds = function (id) {
            if (!id) return;
            return new Promise(function (resolve, reject) {
                socketService.$socket($scope.AppSocket, 'getGames', {_ids: id}, function (data) {
                    vm.allGame = data.data;
                    console.log('selected game', vm.allGame);
                    $scope.safeApply();
                    resolve();
                }, function (data) {
                    console.log("cannot get game name", data);
                    reject(new Error());
                });
            });

        };

        vm.getPlayerLevelByPlatformId = function (id) {
            socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {platformId: id}, function (data) {
                vm.playerLvlData = {};
                console.log(data)
                if (data.data) {
                    $.each(data.data, function (i, v) {
                        vm.playerLvlData[v._id] = v;
                    })
                }
                console.log("vm.playerLvlData", vm.playerLvlData);

                $scope.safeApply();
            }, function (data) {
                console.log("cannot get player level", data);
            });
        }

        vm.getCredibilityRemarksByPlatformId = function (id) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: id}, function (data) {
                    vm.credibilityRemarks = data.data;
                    console.log("vm.credibilityRemarks", vm.credibilityRemarks);
                    resolve(vm.credibilityRemarks);
                    $scope.safeApply();
                }, function (data) {
                    console.log("cannot get credibility remarks", data);
                    vm.credibilityRemarks = {};
                    resolve(vm.credibilityRemarks);
                });
            });
        };

        vm.setupRemarksMultiInput = function () {
            let remarkSelect = $('select#selectCredibilityRemarks');
            if (remarkSelect.css('display').toLowerCase() === "none") {
                return;
            }
            remarkSelect.multipleSelect({
                showCheckbox  : true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });

            $scope.safeApply();
        };

        vm.getProposalTypeByPlatformId = function (id) {
            var deferred = Q.defer();
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
                vm.allProposalType = data.data;
                vm.allProposalType.sort(
                    function (a, b) {
                        if (vm.getProposalTypeOptionValue(a) > vm.getProposalTypeOptionValue(b)) return 1;
                        if (vm.getProposalTypeOptionValue(a) < vm.getProposalTypeOptionValue(b)) return -1;
                        return 0;
                    }
                );
                console.log('vm.allProposalType:', data.data);
                // console.log('ConsumptionReturn', data.data.name["ConsumptionReturn"]);
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
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
        }

        vm.getPageNameByRewardName = function (rewardName) {
            if (vm.rewardNamePage[rewardName]) {
                return vm.rewardNamePage[rewardName];
            } else if (rewardName.indexOf("Reward") !== -1) {
                let splitRewardName = rewardName.split(/(?=[A-Z])/);
                let rewardReportString = (splitRewardName.join("_") + "_REPORT").toUpperCase();
                return rewardReportString;
            } else {
                return 'NO_PAGE';
            }
        }

        //Start topup report
        vm.resetTopupRecord = function () {
            vm.queryTopup.status = '';
            vm.queryTopup.proposalID = '';
            vm.queryTopup.mainTopupType = '';
            vm.queryTopup.topupType = '';
            vm.queryTopup.merchantNo = '';
            vm.queryTopup.dingdanID = '';
            vm.queryTopup.type = 'all';
            vm.queryTopup.playerName = '';
            vm.queryTopup.paymentChannel = 'all';
        }
        vm.searchTopupRecord = function (newSearch) {

            console.log('vm.queryTopup', vm.queryTopup);
            vm.queryTopup.platformId = vm.curPlatformId;
            $('#topupTableSpin').show();

            var staArr = vm.queryTopup.status ? [vm.queryTopup.status] : [];
            if (vm.queryTopup.status == "Success") {
                staArr.push("Approved");
            }
            if (vm.queryTopup.status == "Fail") {
                staArr.push("Rejected");
            }

            var sendObj = {
                startTime: vm.queryTopup.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryTopup.endTime.data('datetimepicker').getLocalDate(),
                platformId: vm.curPlatformId,
                dingdanID: vm.queryTopup.dingdanID,
                mainTopupType: vm.queryTopup.mainTopupType,
                topupType: vm.queryTopup.topupType,
                depositMethod: vm.queryTopup.depositMethod,
                proposalNo: vm.queryTopup.proposalID,
                merchantGroup: angular.fromJson(angular.toJson(vm.queryTopup.merchantGroup)),
                playerName: vm.queryTopup.playerName,
                // merchant: vm.queryTopup.merchant,
                status: staArr,
                index: newSearch ? 0 : (vm.queryTopup.index || 0),
                limit: vm.queryTopup.limit || 10,
                sortCol: vm.queryTopup.sortCol
            }
            // if (vm.queryTopup.status) {
            //     sendObj.status = {'$in': staArr}
            // }

            vm.queryTopup.merchantNo ? sendObj.merchantNo = vm.queryTopup.merchantNo : '';
            socketService.$socket($scope.AppSocket, 'topupReport', sendObj, function (data) {
                $('#topupTableSpin').hide();
                console.log('topup', data);
                vm.queryTopup.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawTopupReport(
                    data.data.data.map(item => {
                        item.amount$ = parseFloat(item.data.amount).toFixed(2);
                        item.status$ = $translate(item.status);
                        item.merchantName = vm.merchantNoNameObj[item.data.merchantNo];
                        item.merchantNo$ = item.data.merchantNo != null
                            ? item.data.merchantNo
                            : item.data.weChatAccount != null
                            ? item.data.weChatAccount
                            : item.data.alipayAccount != null
                            ? item.data.alipayAccount
                            : null;
                        if (item.type.name == 'PlayerTopUp') {
                            //show detail topup type info for online topup.
                            let typeID = item.data.topUpType || item.data.topupType
                            item.topupTypeStr = typeID
                                ? $translate(vm.topupTypeJson[typeID])
                                : $translate("Unknown")
                        } else {
                            //show topup type for other types
                            item.topupTypeStr = $translate(item.type.name)
                        }
                        item.startTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                        item.endTime$ = utilService.$getTimeFromStdTimeFormat(item.data.lastSettleTime);

                        return item;
                    }), data.data.size, {amount: data.data.total}, newSearch
                );
            }, function (err) {
                console.log(err);
            }, true);
        };
        vm.drawTopupReport = function (data, size, summary, newSearch) {
            console.log('data', data);
            var tableOptions = {
                data: data,
                "order": vm.queryTopup.aaSorting || [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [8]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('proposalId'), data: 'proposalId'},
                    {title: $translate('DINGDAN_ID'), data: "data.requestId"},
                    // {title: $translate('PAYMENT_CHANNEL'), data: "paymentId"},
                    {title: $translate('STATUS'), data: "status$"},
                    // {title: $translate('ISNEWPLAYER'), data: null},
                    {title: $translate('Merchant No'), data: "merchantName"},
                    {title: $translate('PLAYER_NAME'), data: "data.playerName"},
                    {title: $translate('realName'), data: "data.playerObjId.realName", sClass: "sumText"},
                    // {title: $translate('PARTNER'), data: "playerId.partner", sClass: "sumText"},
                    {title: $translate('CREDIT'), data: "amount$", sClass: "sumFloat alignRight"},
                    {
                        "title": $translate('TYPE'), "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('topupType'), data: "data.topupType",
                        render: function (data, type, row) {
                            let text = ($translate($scope.merchantTopupTypeJson[data])) ? $translate($scope.merchantTopupTypeJson[data]) : ""
                            return "<div>" + text + "</div>";
                        }
                    },
                    {"title": $translate('Merchant No'), "data": "merchantNo$"},
                    // {title: $translate('IP'), data: null},
                    {title: $translate('START_TIME'), data: "startTime$"},
                    {title: $translate('END_TIME'), data: "endTime$"},
                    // {title: $translate('END_TIME'), data: null},
                    // {title: $translate('REMARK'), data: null},
                ],
                "paging": false,
                // dom: 'RZrtlp',
                // fnDrawCallback: function (oSettings) {
                //     var container = oSettings.nTable;
                //     utilService.setupPopover({
                //         context: container,
                //         elem: '.telPopover',
                //         content: function () {
                //             vm.telphonePlayer = JSON.parse(this.dataset.row);
                //             $scope.safeApply();
                //             return $('#telPopover').html();
                //         },
                //         callback: function () {
                //             $("button.playerMessage").on('click', function () {
                //                 console.log('message', this);
                //                 alert("will send message to " + vm.telphonePlayer.name);
                //             });
                //             $("button.playerTelephone").on('click', function () {
                //                 alert("will call " + vm.telphonePlayer.name);
                //             });
                //         }
                //     });
                // },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            // vm.topupTable = $('#topupTable').DataTable(tableOptions);

            vm.topupTable = utilService.createDatatableWithFooter('#topupTable', tableOptions, {6: summary.amount});

            vm.queryTopup.pageObj.init({maxCount: size}, newSearch);

            $('#topupTable').off('order.dt');
            $('#topupTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'queryTopup', vm.searchTopupRecord);
            });
            $('#topupTable').resize();
        }

        ///End topup report

        //Start operation report
        vm.searchOperationRecord = function () {
            var data = null;

            $('#operationTableSpin').show();
            $('#operationTable').hide();
            $('#operationSummaryTable').hide();

            vm.curQueryOperation = $.extend(true, {}, vm.queryOperation); //vm.queryOperation || {};
            vm.curQueryOperation.providerId = vm.curQueryOperation.providerId == "all" ? null : vm.curQueryOperation.providerId;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.curQueryOperation.platformId = vm.selectedPlatform._id;
            // if (vm.curQueryOperation.providerId == 'all') {
            //     vm.curQueryOperation.providerId = null;
            // }
            vm.curQueryOperation.limit = 0;

            vm.curQueryOperation.startTime = vm.queryOperation.startTime.data('datetimepicker').getLocalDate();
            vm.curQueryOperation.endTime = vm.queryOperation.endTime.data('datetimepicker').getLocalDate();

            var midnightThisMorningSG = getDayStartTime();

            // If endTime is today, we will trigger the provider settlement(s) before fetching the report
            var providersToSettle =
                vm.curQueryOperation.endTime < midnightThisMorningSG ? []
                    : vm.curQueryOperation.providerId ? [getProviderWithObjId(vm.curQueryOperation.providerId)]
                    : vm.allProviders;

            var settlementDate = vm.curQueryOperation.endTime;

            settleProvidersInList(providersToSettle, settlementDate).then(
                settlementResult => {
                    // Fetch report
                    vm.operationReportLoadingStatus = (settlementResult.failureReportMessage || "") + $translate("Fetching report");
                    $scope.safeApply();

                    console.log("vm.curQueryOperation", vm.curQueryOperation);
                    socketService.$socket($scope.AppSocket, 'operationReport', vm.curQueryOperation, function (data) {
                        $('#operationTableSpin').hide();
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                        $('#operationTable').show();
                        console.log('operation data', data);
                        vm.drawOperationReport(data.data.data);
                    }, function (err) {
                        $('#operationTableSpin').hide();
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                    }, true);
                    socketService.$socket($scope.AppSocket, 'operationSummaryReport', vm.curQueryOperation, function (data) {
                        console.log("operationSummaryReport:data", data);
                        vm.operationSummaryData = data.data.data;
                        $('#operationSummaryTable').show();
                        $scope.safeApply();
                    }, function (err) {
                        $scope.safeApply();
                    }, true);
                }
            ).catch(console.error);
        }
        vm.drawOperationReport = function (data) {
            console.log('data', data);
            data = data || [];
            var tableOptions = {
                data: data.map(item => {
                    item.amount$ = parseFloat(item.amount).toFixed(2);
                    item.validAmount$ = parseFloat(item.validAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.operationPercent$ = parseFloat(item.bonusAmount / item.validAmount * 100).toFixed(2) + '%'
                    return item;
                }),
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('*'),
                        data: null,
                        "className": 'expandProvider expand',
                        "orderable": false
                    },
                    {title: $translate('PROVIDER_ID'), data: "providerId"},
                    {
                        title: $translate('PROVIDER_NAME'), data: "providerName", sClass: "sumText",
                    },
                    {
                        title: $translate('AMOUNT_OF_PLAYERS'),
                        data: "total_player",
                        // sClass: "sumInt alignRight",
                    },
                    {
                        title: $translate('TIMES_CONSUMED'),
                        sClass: "sumInt alignRight",
                        data: "consumption"
                    },
                    {
                        title: $translate('TOTAL_CONSUMPTION'),
                        data: "amount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        data: "validAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('EARNINGS'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('EARNINGS_RATIO'),
                        data: "operationPercent$",
                    },
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Display _MAX_ provider records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = v.defaultContent || "";
            });
            if (vm.operationTable) {
                vm.operationTable.clear();
            }
            // vm.operationTable = $('#operationTable').DataTable(tableOptions);
            vm.operationTable = utilService.createDatatableWithFooter('#operationTable', tableOptions);
            utilService.setDataTablePageInput('operationTable', vm.operationTable, $translate);

            $('#operationTable').resize();
            $('#operationTable tbody').off('click', 'td.expandProvider');
            $('#operationTable tbody').on('click', 'td.expandProvider', function () {
                var tr = $(this).closest('tr');
                var row = vm.operationTable.row(tr);

                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    console.log('content', data);
                    var id = 'gametable' + data._id;
                    row.child(vm.createInnerTable(id)).show();
                    vm[id] = {};
                    utilService.actionAfterLoaded("#" + id + 'Page', function () {
                        vm[id].pageObj = utilService.createPageForPagingTable("#" + id + 'Page', {}, $translate, function (curP, pageSize) {
                            vm.searchGameReportInProvider(data, id, false, (curP - 1) * pageSize, pageSize);
                        });

                    })
                    vm.searchGameReportInProvider(data, id, true);
                    tr.addClass('shown');
                }
            });
        }
        vm.searchGameReportInProvider = function (data, id, newSearch, index, limit, sortCol) {
            var sendData = {
                startTime: vm.curQueryOperation.startTime,
                endTime: vm.curQueryOperation.endTime,
                providerId: data._id,
                platformId: vm.curPlatformId,
                index: newSearch ? 0 : index,
                limit: limit || 10,
                sortCol: sortCol || {}
            }
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'getProviderGameReport', sendData, function (data) {
                var playerData = data.data.data ? data.data.data.map(item => {
                    item.amount$ = parseFloat(item.amount).toFixed(2);
                    item.validAmount$ = parseFloat(item.validAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.operationPercent$ = parseFloat(item.bonusAmount / item.validAmount * 100).toFixed(2) + '%'
                    return item;
                }) : [];
                vm.drawProviderGameTable(playerData, id, data.data.size, data.data.summary, newSearch);
            });
        }

        ///////////////// draw player table inside provider start/////////////
        vm.drawProviderGameTable = function (tableData, id, size, summary, newSearch) {
            console.log('data', tableData, id, summary, size);
            var tableOptions = {
                data: tableData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('*'),
                        data: null,
                        "className": 'expandGame expand',
                        "orderable": false
                    },
                    {
                        title: $translate('GAME'), sClass: "sumText",
                        data: "name"
                    },
                    {
                        title: $translate('AMOUNT_OF_PLAYERS'),
                        // sClass: "sumInt alignRight",
                        data: "total_player"
                    },
                    {
                        title: $translate('TIMES_CONSUMED'),
                        sClass: "sumInt alignRight",
                        data: "consumption",
                    },
                    {
                        title: $translate('TOTAL_CONSUMPTION'),
                        sClass: "sumFloat alignRight",
                        data: "amount$"
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        sClass: "sumFloat alignRight",
                        data: "validAmount$"
                    },
                    {
                        title: $translate('EARNINGS'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('EARNINGS_RATIO'),
                        data: "operationPercent$",
                    },

                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollCollapse": true,
                // "destroy": true,
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Display _MAX_ game records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if (vm.gameTable[id]) {
                vm.gameTable[id].clear();
            }
            $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));
            // vm.gameTable[id] = $('#' + id).DataTable(tableOptions);
            // vm.gameTable[id] = utilService.createDatatableWithFooter('#' + id, tableOptions);
            // utilService.setDataTablePageInput(id, vm.gameTable[id], $translate);


            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            var summaryObj = summary ? {
                3: summary.times,
                4: summary.consumption,
                5: summary.validConsumption,
                6: summary.bonusAmount
            } : {}
            vm.gameTable[id] = utilService.createDatatableWithFooter('#' + id, tableOptions, summaryObj);
            vm[id].pageObj.init({maxCount: size}, newSearch);

            $('#' + id).off('order.dt');
            $('#' + id).on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, id, function (curP, pageSize) {
                    vm.searchGameReportInProvider({_id: id.slice(-24)},
                        id, newSearch, (curP - 1) * pageSize, pageSize);
                });
            });
            $("#generalRewardTaskTable").resize();

            $('#' + id).resize();
            $('#' + id).off('click', 'td.expandGame');
            $('#' + id).on('click', 'td.expandGame', function () {
                var tr = $(this).closest('tr');
                var table = $(this).parent().closest('table');
                console.log('clicked', tr);
                var providerId = table.attr('id').substring(9);
                console.log('clicked', providerId, table.attr('id'));
                console.log('vm.gameTable', vm.gameTable);
                var row = vm.gameTable[table.attr('id')].row(tr);

                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    var tableId = 'playertable' + data._id;
                    row.child(vm.createInnerTable(tableId)).show();
                    tr.addClass('shown');
                    vm[tableId] = {};
                    utilService.actionAfterLoaded("#" + tableId + 'Page', function () {
                        vm[tableId].pageObj = utilService.createPageForPagingTable("#" + tableId + 'Page', {}, $translate, function (curP, pageSize) {
                            vm.getPlayerFromGameReport(data, providerId, tableId, id, false, (curP - 1) * pageSize, pageSize, {});
                        });

                    })
                    vm.getPlayerFromGameReport(data, providerId, tableId, id, true, 0, 10, {
                        2: summary.times,
                        3: summary.consumption,
                        4: summary.validConsumption,
                        5: summary.bonusAmount
                    });
                    console.log('id', $('#' + id));
                }
            });
        };

        vm.getPlayerFromGameReport = function (data, providerId, tableId, id, newSearch, index, limit, sortCol) {
            var sendData = {
                startTime: vm.curQueryOperation.startTime,
                endTime: vm.curQueryOperation.endTime,
                providerId: providerId,
                platformId: vm.curPlatformId,
                gameId: data._id,
                index: newSearch ? 0 : index,
                limit: limit || 10,
                sortCol: sortCol || {}
                // limit: vm.queryOperation.numLimit
            }
            socketService.$socket($scope.AppSocket, 'getProviderGamePlayerReport', sendData, function (data) {
                console.log('getProviderGamePlayerReport', data.data);
                vm.drawProviderGamePlayerTable(data.data.data, data.data.size, data.data.summary, tableId, newSearch);
            });
        }
        ///////////////// draw player table inside provider end /////////////

        ///////////////// draw game player inside game table inside provider start /////////////
        vm.drawProviderGamePlayerTable = function (tableData, size, summary, id, newSearch) {
            console.log('data', tableData, size, id, newSearch);
            tableData = tableData || [];
            var tableOptions = {
                data: tableData.map(item => {
                    item.amount$ = parseFloat(item.amount).toFixed(2);
                    item.validAmount$ = parseFloat(item.validAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.operationPercent$ = parseFloat(item.bonusAmount / item.validAmount * 100).toFixed(2) + '%'
                    return item;
                }),
                columns: [
                    // {title: $translate('*'), data: null, "className": 'expandPlayer',},
                    {title: $translate('PLAYER ID'), data: "playerId"},
                    {
                        title: $translate('PLAYER'), sClass: "sumText",
                        data: "name"
                    },
                    {
                        title: $translate('TIMES_CONSUMED'),
                        sClass: "sumInt alignRight",
                        data: "consumption",
                    },
                    {
                        title: $translate('TOTAL_CONSUMPTION'),
                        sClass: "sumFloat alignRight",
                        data: "amount$"
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        sClass: "sumFloat alignRight",
                        data: "validAmount$"
                    },
                    {
                        title: $translate('EARNINGS'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('EARNINGS_RATIO'),
                        data: "operationPercent$",
                    },
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                "language": {
                    "info": "Display _MAX_ player records",
                    "emptyTable": $translate("No data available in table"),
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if (vm.playerTable[id]) {
                vm.playerTable[id].clear();
            }
            $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));

            vm.playerTable[id] = utilService.createDatatableWithFooter('#' + id, tableOptions, {
                2: summary.times,
                3: summary.consumption,
                4: summary.validConsumption,
                5: summary.bonusAmount
            });
            vm[id].pageObj.init({maxCount: size}, newSearch);
            $('#' + id).resize();
        };
        ///////////////// draw game player inside player table inside provider end /////////////

        //////////////////// draw player table - start /////////////////
        vm.searchProviderPlayerRecord = function (newSearch) {
            console.log("vm.playerExpenseQuery", vm.playerExpenseQuery);

            vm.newPlayerExpenseQuery = $.extend(true, {}, vm.playerExpenseQuery);
            if (vm.newPlayerExpenseQuery.providerId == "all") {
                vm.newPlayerExpenseQuery.providerId = null;
            }

            $('#playerProviderTableSpin').show();

            var startTime = vm.newPlayerExpenseQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.newPlayerExpenseQuery.endTime.data('datetimepicker').getLocalDate();

            var midnightThisMorningSG = getDayStartTime();

            // If endTime is today, we will trigger the provider settlement(s) before fetching the report
            var providersToSettle =
                endTime <= midnightThisMorningSG ? []
                    : vm.allProviders;

            settleProvidersInList(providersToSettle, endTime).then(
                settlementResult => {
                    // Fetch the report
                    vm.operationReportLoadingStatus = (settlementResult.failureReportMessage || "") + $translate("Fetching report");
                    $scope.safeApply();

                    var sendData = {
                        startTime: startTime,
                        endTime: endTime,
                        platformId: vm.curPlatformId,
                        playerId: vm.newPlayerExpenseQuery.playerId,
                        playerName: vm.newPlayerExpenseQuery.playerName,
                        providerId: vm.newPlayerExpenseQuery.providerId,
                        index: newSearch ? 0 : vm.newPlayerExpenseQuery.index,
                        limit: vm.newPlayerExpenseQuery.limit || 10,
                        sortCol: vm.newPlayerExpenseQuery.sortCol || {}
                    };
                    console.log('sendData', sendData);

                    socketService.$socket($scope.AppSocket, 'getPlayerProviderReport', sendData, function (data) {
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                        // $('#operationTableSpin').hide();
                        $('#playerExpenseTableSpin').hide();
                        console.log('player data', data);
                        vm.playerExpenseQuery.totalCount = data.data.size;
                        vm.drawPlayerProviderReport(data.data.data, data.data.size, data.data.summary, newSearch);
                        $scope.safeApply();
                    }, function (err) {
                        $('#playerExpenseTableSpin').hide();
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                    }, true);
                }
            ).catch(console.error);
        }
        vm.drawPlayerProviderReport = function (data, size, summary, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.playerExpenseQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'totalConsumedAmount', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'validAmount', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'timesConsumed', bSortable: true, 'aTargets': [5]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('*'),
                        data: null,
                        "className": 'expandProvider expand',
                        "orderable": false
                    },
                    {title: $translate('PLAYER ID'), data: "_id.playerId"},
                    {title: $translate('PLAYERNAME'), data: "_id.playerName", sClass: "sumText"},
                    {
                        title: $translate('AMOUNT CONSUMED'),
                        data: "totalConsumedAmount",
                        sClass: 'sumFloat textRight'
                    },
                    {title: $translate('VALID_AMOUNT'), data: "validAmount", sClass: 'sumFloat textRight'},
                    {title: $translate('TIMES_CONSUMED'), data: "timesConsumed", sClass: 'sumInt textRight'}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                "fnDrawCallback": function (nFoot, aData, iStart, iEnd, aiDisplay) {
                    var api = this.api();
                    drawPlayerTblSummary(api, data, "#playerTable_info")
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.playerExpenseQuery.pageObj.init({maxCount: size}, newSearch);
            vm.playerExpenseTable = utilService.createDatatableWithFooter('#playerExpenseTable', tableOptions, {
                3: summary.amount, 4: summary.validAmount, 5: summary.timesConsumed
            });

            $('#playerExpenseTable').off('order.dt');
            $('#playerExpenseTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerExpenseQuery', vm.searchProviderPlayerRecord);
            });

            $('#playerExpenseTable').resize();
            $('#playerExpenseTable tbody').unbind('click');
            $('#playerExpenseTable tbody').on('click', 'td.expandProvider', function () {
                var tr = $(this).closest('tr');

                var row = vm.playerExpenseTable.row(tr);
                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    if (!data) {
                        return;
                    }
                    var id = 'playerTable' + data._id.playerId;
                    row.child(vm.createInnerTable(id)).show();

                    var sendData = {
                        startTime: vm.newPlayerExpenseQuery.startTime.data('datetimepicker').getLocalDate(),
                        endTime: vm.newPlayerExpenseQuery.endTime.data('datetimepicker').getLocalDate(),
                        playerId: data._id.playerObjId,
                        //providerId: vm.playerQuery.providerId
                    };
                    if (vm.playerExpenseQuery.providerId && vm.playerExpenseQuery.providerId != "all") {
                        sendData.providerId = vm.playerExpenseQuery.providerId;
                    }

                    console.log('sendData', sendData);
                    socketService.$socket($scope.AppSocket, 'getPlayerProviderByGameReport', sendData, function (data) {

                        console.log('Game:data.data', data.data);
                        vm.drawProviderPlayerByGameTable(data.data, id);
                        tr.addClass('shown');
                    });
                }
            });
        }
        vm.drawProviderPlayerByGameTable = function (data, id) {
            console.log('data', data);
            var tableOptions = {
                data: data,
                columns: [
                    {title: $translate('GAME_TITLE'), data: "_id.gameName", sClass: 'sumText'},
                    {title: $translate('Game Provider'), data: "_id.providerName"},
                    {
                        title: $translate('AMOUNT CONSUMED'), data: "totalConsumedAmount",
                        sClass: 'sumFloat textRight'
                    },
                    {title: $translate('VALID_AMOUNT'), data: "validAmount", sClass: 'sumFloat textRight'},
                    {title: $translate('TIMES_CONSUMED'), data: "timesConsumed", sClass: 'sumInt textRight'}
                ],
                "paging": true,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.gameTable[id] = utilService.createDatatableWithFooter('#' + id, tableOptions);
            utilService.setDataTablePageInput(id, vm.gameTable[id], $translate);
            $('#' + id).resize();
            $('#' + id).on('click', 'td.expandGame', function () {
                var tr = $(this).closest('tr');
                var table = $(this).closest('table');
                console.log('clicked', tr);
                console.log('clicked', table.attr('id'));
                console.log('vm.gameTable', vm.gameTable);
                var row = vm.gameTable[table.attr('id')].row(tr);
            });
        };

        function drawPlayerTblSummary(api, data, tableId) {
            var result = utilService.getDatatableSummary(api, ['totalConsumedAmount', 'validAmount', 'timesConsumed'], ['totalConsumedAmount', 'validAmount', 'timesConsumed']);
            $(tableId).html(
                '总计' + data.length + '个记录, 总投注额(本页：' + result.totalConsumedAmount.page.toFixed(2) + ', 总计：' + result.totalConsumedAmount.total.toFixed(2) + ')'
                + ', 有效额度(本页：' + result.validAmount.page.toFixed(2) + ', 总计：' + result.validAmount.total.toFixed(2) + ')'
                + ', 投注笔数(本页：' + result.timesConsumed.page.toFixed(0) + ', 总计：' + result.timesConsumed.total.toFixed(0) + ')'
            );
        }

        //////////////////// draw player table - end /////////////////

        // Win Rate Report
        vm.getWinRateReportData = function () {
            // hide table and show 'loading'
            $('#winRateTableSpin').show();
            $('#winRateTable').hide();
            $('#winRateSummaryTable').hide();

            vm.curWinRateQuery = $.extend(true, {}, vm.winRateQuery);
            vm.curWinRateQuery.providerId = vm.curWinRateQuery.providerId == "all" ? null : vm.curWinRateQuery.providerId;
            vm.curWinRateQuery.platformId = vm.selectedPlatform._id;

            vm.curWinRateQuery.limit = 0;

            vm.curWinRateQuery.startTime = vm.winRateQuery.startTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.endTime = vm.winRateQuery.endTime.data('datetimepicker').getLocalDate();

            console.log('vm.curWinRateQuery', vm.curWinRateQuery);
            socketService.$socket($scope.AppSocket, 'winRateReport', vm.curWinRateQuery, function (data) {
                vm.winRateReportLoadingStatus = "";
                $('#winRateTableSpin').hide();
                $('#winRateTable').show();
                $('#winRateSummaryTable').show();
                console.log('win rate report data', data);
                vm.winRateSummaryData = data.data;
                $scope.safeApply();
            }, function (err) {
                $('#winRateTableSpin').hide();
                vm.winRateReportLoadingStatus = err.message;
                $scope.safeApply();
            }, true);
        };

        vm.getMismatchReport = function () {
            $('#onlinePaymentMismatchTableSpin').show();
            let sendQuery = {
                platform: vm.selectedPlatform._id,
                platformId: vm.selectedPlatform.platformId,
                startTime: vm.onlinePaymentMismatchQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.onlinePaymentMismatchQuery.endTime.data('datetimepicker').getLocalDate(),
                type: vm.onlinePaymentMismatchQuery.type
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getMismatchReport', sendQuery, function (data) {
                console.log('_getMismatchReport', data);
                $('#onlinePaymentMismatchTableSpin').hide();
                vm.proposalMismatchDetail = data.data;
                $scope.safeApply();
            });
        };

        vm.testMismatchReportOutput = function (sendQuery) {
            let today = new Date();
            let yesterday = new Date().setDate(new Date().getDate() - 1);
            sendQuery = sendQuery ? sendQuery : {
                platform: vm.selectedPlatform._id,
                platformId: vm.selectedPlatform.platformId,
                startTime: yesterday,
                endTime: today
            };

            socketService.$socket($scope.AppSocket, 'getMismatchReport', sendQuery, function (data) {
                console.log('data', data);
            });

        };

        vm.getLimitedOfferReport = function () {
            $('#limitedOfferTableSpin').show();
            let sendQuery = {
                platformObjId: vm.selectedPlatform._id,
                startTime: vm.limitedOfferQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.limitedOfferQuery.endTime.data('datetimepicker').getLocalDate(),
                type: vm.limitedOfferQuery.type,
                playerName: vm.limitedOfferQuery.playerName,
                promoName: vm.limitedOfferQuery.promoName
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getLimitedOfferReport', sendQuery, function (data) {
                console.log('getLimitedOfferReport', data);
                $('#limitedOfferTableSpin').hide();
                vm.limitedOfferDetail = data.data;
                vm.limitedOfferDetail.map(e => {
                    e.createTime = $scope.timeReformat(e.createTime)
                });

                $scope.safeApply();
            });
        };

        /////// player domain report
        vm.searchPlayerDomainRepport = function (newSearch) {
            $('#playerDomainReportTableSpin').show();

            var sendquery = {
                platform: vm.curPlatformId,
                query: {
                    playerType: vm.playerDomain.playerType,
                    name: vm.playerDomain.name,
                    realName: vm.playerDomain.realName,
                    domain: vm.playerDomain.domain,
                    sourceUrl: vm.playerDomain.sourceUrl,
                    topUpTimesOperator: vm.playerDomain.topUpTimesOperator,
                    topUpTimesValue: vm.playerDomain.topUpTimesValue,
                    topUpTimesValueTwo: vm.playerDomain.topUpTimesValueTwo,
                    playerValueOperator: vm.playerDomain.playerValueOperator,
                    playerValue: vm.playerDomain.playerValue,
                    playerValueTwo: vm.playerDomain.playerValueTwo,
                    registrationInterface: vm.playerDomain.registrationInterface,
                    isNewSystem: vm.playerDomain.isNewSystem,
                    startTime: vm.playerDomain.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerDomain.endTime.data('datetimepicker').getLocalDate()
                },
                index: newSearch ? 0 : (vm.playerDomain.index || 0),
                limit: vm.playerDomain.limit || 10,
                sortCol: vm.playerDomain.sortCol || {registrationTime: -1},
            };
            console.log('player domain query', sendquery);

            socketService.$socket($scope.AppSocket, 'getPlayerDomainReport', sendquery, function (data) {
                console.log('retData', data);
                vm.playerDomain.totalCount = data.data.size;
                $('#playerDomainReportTableSpin').hide();
                vm.drawPlayerDomainReport(data.data.data.map(item => {
                    item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                    item.registrationTime$ = utilService.$getTimeFromStdTimeFormat(item.registrationTime);
                    if (!item.name && item.partnerName) {
                        item.name = item.partnerName;
                    }

                    if (item.userAgent && item.userAgent[0]) {
                        item.registrationOS$ = item.userAgent[0].os;
                        item.registrationBrowser$ = item.userAgent[0].browser;
                    } else {
                        item.registrationOS$ = "";
                        item.registrationBrowser$ = "";
                    }

                    item.gameProviderPlayed$ = "";
                    if (item.gameProviderPlayed) {
                        let providerLength = vm.allProviders.length;
                        for (let i = 0; i < item.gameProviderPlayed.length; i++) {
                            for (let j = 0; j < providerLength; j++) {
                                if (item.gameProviderPlayed[i].toString() === vm.allProviders[j]._id.toString()) {
                                    item.gameProviderPlayed$ += vm.allProviders[j].name + "<br>";
                                }
                            }
                        }
                    }

                    if (item.domain && item.domain.indexOf("fpms8") !== -1) {
                        item.sourceUrl = "";
                        item.registrationBrowser$ = "";
                        item.registrationOS$ = "";
                    }

                    if (!item.sourceUrl) {
                        item.registrationAgent$ = "Backstage";
                    }
                    else if (item.registrationBrowser$.indexOf("WebKit") !== -1 || item.registrationBrowser$.indexOf("WebView") !== -1) {
                        if (item.partner) {
                            item.registrationAgent$ = "APP Agent";
                        }
                        else {
                            item.registrationAgent$ = "APP Player";
                        }
                    }
                    else if (item.registrationOS$.indexOf("iOS") !== -1 || item.registrationOS$.indexOf("ndroid") !== -1 || item.registrationBrowser$.indexOf("obile") !== -1) {
                        if (item.partner) {
                            item.registrationAgent$ = "HTML5 Agent";
                        }
                        else {
                            item.registrationAgent$ = "HTML5 Player";
                        }
                    }
                    else {
                        if (item.partner) {
                            item.registrationAgent$ = "Web Agent";
                        }
                        else {
                            item.registrationAgent$ = "Web Player";
                        }
                    }
                    item.registrationAgent$ = $translate(item.registrationAgent$);

                    if (!item.phoneProvince | item.phoneProvince === 'null' || item.phoneProvince === 'undefined') {
                        item.phoneProvince = $translate('Unknown');
                    }
                    if (!item.phoneCity | item.phoneCity === 'null' || item.phoneCity === 'undefined') {
                        item.phoneCity = $translate('Unknown');
                    }
                    if (!item.province | item.province === 'null' || item.province === 'undefined') {
                        item.province = $translate('Unknown');
                    }
                    if (!item.city | item.city === 'null' || item.city === 'undefined') {
                        item.city = $translate('Unknown');
                    }

                    item.phoneArea$ = item.phoneProvince + " " + item.phoneCity;
                    item.ipArea$ = item.province + " " + item.city;

                    if (item.partner && item.partner.partnerName) {
                        item.partner$ = item.partner.partnerName;
                    }
                    else if (item.parent && item.parent.partnerName) {
                        item.partner$ = item.parent.partnerName;
                    }

                    return item;
                }), data.data.size, newSearch);
                $scope.safeApply();
            });
        }
        vm.drawPlayerDomainReport = function (tableData, size, newSearch) {
            let tableOptions = {
                data: tableData,
                "order": vm.playerDomain.aaSorting || [[2, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'realName', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'registrationTime', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'phoneArea', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'ipArea', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'gameProviderPlayed', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'lastAccessTime', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'loginTimes', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'valueScore', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'sourceUrl', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'domain', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'registrationInterface', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'os', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'browser', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'partner', 'aTargets': [15], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYER_NAME'), data: "name"},
                    {title: $translate('realName'), data: "realName", sClass: "realNameCell wordWrap"},
                    {title: $translate('REGISTRATION_TIME'), data: "registrationTime$"},
                    {title: $translate("PHONE_LOCATION"), data: "phoneArea$"},
                    {title: $translate("IP_LOCATION"), data: "ipArea$"},
                    {title: $translate("GAME_PROVIDER"), data: "gameProviderPlayed$"},
                    {title: $translate('LAST_ACCESS_TIME'), data: "lastAccessTime$"},
                    {title: $translate('LOGIN_TIMES'), data: "loginTimes"},
                    {title: $translate('TOP_UP_TIMES'), data: "topUpTimes"},
                    {title: $translate('PLAYER_VALUE'), data: "valueScore"},
                    {
                        title: $translate('Source Domain'),
                        data: "sourceUrl",
                        render: function (data, type, row) {
                            if (data && data.length > 35)
                                return "<a target=\"_blank\" href=\"" + data + "\">" + data.substring(0, 30) + "...</a>";
                            else if (data)
                                return "<a target=\"_blank\" href=\"" + data + "\">" + data + "</a>";
                            else
                                return data;
                        }
                    },
                    {title: $translate('Registration Domain'), data: "domain"},
                    {title: $translate("REGISTRATION_AGENT"), data: "registrationAgent$"},
                    {title: $translate('OS'), data: "registrationOS$"},
                    {title: $translate('Browser'), data: "registrationBrowser$"},
                    {title: $translate('partner'), data: "partner$"},
                ],
                "paging": false,
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            utilService.createDatatableWithFooter('#playerDomainReportTable', tableOptions, {});

            vm.playerDomain.pageObj.init({maxCount: size}, newSearch);

            $('#playerDomainReportTable').off('order.dt');
            $('#playerDomainReportTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerDomain', vm.searchPlayerDomainRepport);
            });
        }
        /////// player domain report end


        // player report
        vm.clearDatePicker = function (id) {
            utilService.clearDatePickerDate(id);
        };

        vm.searchPlayerReport = function (newSearch) {
            $('#loadingPlayerReportTableSpin').show();

            console.log(vm.playerQuery);
            var sendquery = {
                platformId: vm.curPlatformId,
                query: {
                    credibilityRemarks: vm.playerQuery.credibilityRemarks,
                    playerLevel: vm.playerQuery.level,
                    providerId: vm.playerQuery.providerId,
                    start: vm.playerQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.playerQuery.end.data('datetimepicker').getLocalDate(),
                    name: vm.playerQuery.name,
                    consumptionTimesOperator: vm.playerQuery.consumptionTimesOperator,
                    consumptionTimesValue: vm.playerQuery.consumptionTimesValue,
                    consumptionTimesValueTwo: vm.playerQuery.consumptionTimesValueTwo,
                    profitAmountOperator: vm.playerQuery.profitAmountOperator,
                    profitAmountValue: vm.playerQuery.profitAmountValue,
                    profitAmountValueTwo: vm.playerQuery.profitAmountValueTwo,
                    topUpTimesOperator: vm.playerQuery.topUpTimesOperator,
                    topUpTimesValue: vm.playerQuery.topUpTimesValue,
                    topUpTimesValueTwo: vm.playerQuery.topUpTimesValueTwo,
                    bonusTimesOperator: vm.playerQuery.bonusTimesOperator,
                    bonusTimesValue: vm.playerQuery.bonusTimesValue,
                    bonusTimesValueTwo: vm.playerQuery.bonusTimesValueTwo,
                    topUpAmountOperator: vm.playerQuery.topUpAmountOperator,
                    topUpAmountValue: vm.playerQuery.topUpAmountValue,
                    topUpAmountValueTwo: vm.playerQuery.topUpAmountValueTwo
                },
                index: newSearch ? 0 : (vm.playerQuery.index || 0),
                limit: vm.playerQuery.limit || 5000,
                sortCol: vm.playerQuery.sortCol || {validConsumptionAmount: -1},
            };
            console.log('sendquery', sendquery);
            socketService.$socket($scope.AppSocket, 'getPlayerReport', sendquery, function (data) {
                console.log('retData', data);
                vm.playerQuery.totalCount = data.data.size;
                $('#loadingPlayerReportTableSpin').hide();
                // get game data.then(
                // map
                vm.drawPlayerReport(data.data.data.map(item => {
                    item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                    item.registrationTime$ = utilService.$getTimeFromStdTimeFormat(item.registrationTime);
                    item.manualTopUpAmount$ = parseFloat(item.manualTopUpAmount).toFixed(2);
                    item.onlineTopUpAmount$ = parseFloat(item.onlineTopUpAmount).toFixed(2);
                    item.weChatTopUpAmount$ = parseFloat(item.weChatTopUpAmount).toFixed(2);
                    item.aliPayTopUpAmount$ = parseFloat(item.aliPayTopUpAmount).toFixed(2);
                    item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.rewardAmount$ = parseFloat(item.rewardAmount).toFixed(2);
                    item.consumptionReturnAmount$ = parseFloat(item.consumptionReturnAmount).toFixed(2);
                    item.consumptionAmount$ = parseFloat(item.consumptionAmount).toFixed(2);
                    item.validConsumptionAmount$ = parseFloat(item.validConsumptionAmount).toFixed(2);
                    item.consumptionBonusAmount$ = parseFloat(item.consumptionBonusAmount).toFixed(2);

                    item.playerLevel$ = "";
                    if (vm.playerLvlData[item.playerLevel]) {
                        item.playerLevel$ = vm.playerLvlData[item.playerLevel].name;
                    }
                    else {
                        item.playerLevel$ = "";
                    }

                    item.credibility$ = "";
                    if (item.credibilityRemarks){
                        for (let i = 0; i < item.credibilityRemarks.length; i++){
                            for (let j = 0; j < vm.credibilityRemarks.length; j++){
                                if (item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()){
                                    item.credibility$ += vm.credibilityRemarks[j].name + "<br>";
                                }
                            }
                        }
                    }

                    item.providerArr = [];
                    for (var key in item.providerDetail) {
                        if (item.providerDetail.hasOwnProperty(key)) {
                            item.providerDetail[key].providerId = key;
                            item.providerArr.push(item.providerDetail[key]);
                        }
                    }

                    item.provider$ = "";
                    if (item.providerDetail) {
                        for (let i = 0; i < item.providerArr.length; i++) {
                            item.providerArr[i].amount = parseFloat(item.providerArr[i].amount).toFixed(2);
                            item.providerArr[i].bonusAmount = parseFloat(item.providerArr[i].bonusAmount).toFixed(2);
                            item.providerArr[i].validAmount = parseFloat(item.providerArr[i].validAmount).toFixed(2);
                            item.providerArr[i].profit = parseFloat(item.providerArr[i].bonusAmount / item.providerArr[i].validAmount * -100).toFixed(2) + "%";
                            for (let j = 0; j < vm.allProviders.length; j++) {
                                if (item.providerArr[i].providerId.toString() == vm.allProviders[j]._id.toString()) {
                                    item.providerArr[i].name = vm.allProviders[j].name;
                                    item.provider$ += vm.allProviders[j].name + "<br>";
                                }
                            }
                        }
                    }

                    item.profit$ = 0;
                    if (item.consumptionBonusAmount != 0 && item.validConsumptionAmount != 0){
                        item.profit$ = parseFloat((item.consumptionBonusAmount /  item.validConsumptionAmount) * - 100).toFixed(2) + "%";
                    }



                    return item;
                }), data.data.size, newSearch);
                $scope.safeApply();
            });
        };

        vm.drawPlayerReport = function (data, size, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.playerQuery.aaSorting || [[15, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [1], bSortable: true},
                    // {'sortCol': 'credibilityRemarks', 'aTargets': [2], bSortable: true},
                    // {'sortCol': 'provider', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'manualTopUpAmount', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'weChatTopUpAmount', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'aliPayTopUpAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'onlineTopUpAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [18], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('LEVEL'), data: "playerLevel$"},
                    {title: $translate('CREDIBILITY'), data: "credibility$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", "className": 'expandPlayerReport',
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('TOPUPMANUAL'), data: "manualTopUpAmount$"},
                    {title: $translate('TOPUP_WECHAT'), data: "weChatTopUpAmount$"},
                    {title: $translate('PlayerAlipayTopUp'), data: "aliPayTopUpAmount$"},
                    {title: $translate('TOPUPONLINE'), data: "onlineTopUpAmount$"},
                    {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes"},
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$"},
                    {title: $translate('WITHDRAW_COUNT'), data: "bonusTimes"},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$"},
                    {title: $translate('PROMOTION'), data: "rewardAmount$"},
                    {title: $translate('CONSUMPTION_RETURN_AMOUNT'), data: "consumptionReturnAmount$"},
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes"},
                    {title: $translate('VALID_CONSUMPTION'), data: "validConsumptionAmount$"},
                    {title: $translate('PLAYER_PROFIT_AMOUNT'), data: "consumptionBonusAmount$"},
                    {title: $translate('COMPANY_PROFIT'), data: "profit$"},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$"}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            if (playerTbl){
                playerTbl.clear();
            }
            var playerTbl = utilService.createDatatableWithFooter('#playerReportTable', tableOptions, {});
            utilService.setDataTablePageInput('playerReportTable', playerTbl, $translate);

            vm.playerQuery.pageObj.init({maxCount: size}, newSearch);

            $('#playerReportTable').resize();
            $('#playerReportTable tbody').off('click', 'td.expandPlayerReport');
            $('#playerReportTable tbody').on('click', 'td.expandPlayerReport', function () {
                var tr = $(this).closest('tr');
                var row = playerTbl.row(tr);

                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    console.log('content', data);
                    var id = 'playertable' + data._id;
                    row.child(vm.createInnerTable(id)).show();
                    vm[id] = {};
                    // utilService.actionAfterLoaded("#" + id + 'Page', function () {
                    //     vm[id].pageObj = utilService.createPageForPagingTable("#" + id + 'Page', {}, $translate, function (curP, pageSize) {
                    //         vm.searchGameReportInProvider(data, id, false, (curP - 1) * pageSize, pageSize);
                    //     });
                    //
                    // })
                    vm.allGame = [];
                    var gameId = [];
                    if (data.gameDetail) {
                        for (let n = 0; n < data.gameDetail.length; n++) {
                            gameId[n] = data.gameDetail[n].gameId;
                        }

                        vm.getGameByIds(gameId).then(
                            function () {
                                for (let i = 0; i < data.gameDetail.length; i++) {
                                    data.gameDetail[i].profit = parseFloat(data.gameDetail[i].bonusAmount / data.gameDetail[i].validAmount * -100).toFixed(2) + "%";
                                    for (let j = 0; j < vm.allGame.length; j++) {
                                        if (data.gameDetail[i].gameId.toString() == vm.allGame[j]._id.toString()) {
                                            data.gameDetail[i].name = vm.allGame[j].name;
                                        }
                                    }
                                }
                                vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.playerQuery);
                            }
                        )
                    }

                    tr.addClass('shown');
                }
            });
            $('#playerReportTable').off('order.dt');
            $('#playerReportTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerQuery', vm.searchPlayerReport);
            });
        };

        vm.searchDXNewPlayerReport = function (newSearch) {
            $('#dxNewPlayerReportTableSpin').show();

            let admins = [];

            if (vm.dxNewPlayerQuery.departments) {
                if (vm.dxNewPlayerQuery.roles) {
                    vm.queryRoles.map(e => {
                        if (vm.dxNewPlayerQuery.roles.indexOf(e._id) >= 0) {
                            e.users.map(f => admins.push(f.adminName))
                        }
                    })
                } else {
                    vm.queryRoles.map(e => e.users.map(f => admins.push(f.adminName)))
                }
            }

            let sendquery = {
                platformId: vm.curPlatformId,
                query: {
                    start: vm.dxNewPlayerQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.dxNewPlayerQuery.end.data('datetimepicker').getLocalDate(),
                    days: vm.dxNewPlayerQuery.days,
                    userType: vm.dxNewPlayerQuery.userType,
                    csPromoteWay: vm.dxNewPlayerQuery.csPromoteWay,
                    admins: vm.dxNewPlayerQuery.admins && vm.dxNewPlayerQuery.admins.length > 0 ? vm.dxNewPlayerQuery.admins : admins,
                    valueScoreOperator: vm.dxNewPlayerQuery.valueScoreOperator,
                    playerScoreValue: vm.dxNewPlayerQuery.playerScoreValue,
                    playerScoreValueTwo: vm.dxNewPlayerQuery.playerScoreValueTwo,
                    topUpTimesOperator: vm.dxNewPlayerQuery.topUpTimesOperator,
                    topUpTimesValue: vm.dxNewPlayerQuery.topUpTimesValue,
                    topUpTimesValueTwo: vm.dxNewPlayerQuery.topUpTimesValueTwo,
                    bonusTimesOperator: vm.dxNewPlayerQuery.bonusTimesOperator,
                    bonusTimesValue: vm.dxNewPlayerQuery.bonusTimesValue,
                    bonusTimesValueTwo: vm.dxNewPlayerQuery.bonusTimesValueTwo,
                    topUpAmountOperator: vm.dxNewPlayerQuery.topUpAmountOperator,
                    topUpAmountValue: vm.dxNewPlayerQuery.topUpAmountValue,
                    topUpAmountValueTwo: vm.dxNewPlayerQuery.topUpAmountValueTwo
                },
                index: newSearch ? 0 : (vm.dxNewPlayerQuery.index || 0),
                limit: vm.dxNewPlayerQuery.limit || 5000,
                sortCol: vm.dxNewPlayerQuery.sortCol || {validConsumptionAmount: -1},
            };
            console.log('sendquery', sendquery);
            socketService.$socket($scope.AppSocket, 'getDXNewPlayerReport', sendquery, function (data) {
                console.log('retData', data);
                vm.dxNewPlayerQuery.totalCount = data.data.size;
                $('#dxNewPlayerReportTableSpin').hide();
                // get game data.then(
                // map
                vm.drawDXNewPlayerReport(data.data.data.map(item => {
                    item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                    item.registrationTime$ = utilService.$getTimeFromStdTimeFormat(item.registrationTime);
                    item.endTime$ = utilService.$getTimeFromStdTimeFormat(item.endTime);
                    item.manualTopUpAmount$ = parseFloat(item.manualTopUpAmount).toFixed(2);
                    item.onlineTopUpAmount$ = parseFloat(item.onlineTopUpAmount).toFixed(2);
                    item.weChatTopUpAmount$ = parseFloat(item.weChatTopUpAmount).toFixed(2);
                    item.aliPayTopUpAmount$ = parseFloat(item.aliPayTopUpAmount).toFixed(2);
                    item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.rewardAmount$ = parseFloat(item.rewardAmount).toFixed(2);
                    item.consumptionReturnAmount$ = parseFloat(item.consumptionReturnAmount).toFixed(2);
                    item.consumptionAmount$ = parseFloat(item.consumptionAmount).toFixed(2);
                    item.validConsumptionAmount$ = parseFloat(item.validConsumptionAmount).toFixed(2);
                    item.consumptionBonusAmount$ = parseFloat(item.consumptionBonusAmount).toFixed(2);

                    item.playerLevel$ = "";
                    if (vm.playerLvlData[item.playerLevel]) {
                        item.playerLevel$ = vm.playerLvlData[item.playerLevel].name;
                    }
                    else {
                        item.playerLevel$ = "";
                    }

                    item.credibility$ = "";
                    if (item.credibilityRemarks) {
                        for (let i = 0; i < item.credibilityRemarks.length; i++) {
                            for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                if (item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
                                    item.credibility$ += vm.credibilityRemarks[j].name + "<br>";
                                }
                            }
                        }
                    }

                    item.providerArr = [];
                    for (var key in item.providerDetail) {
                        if (item.providerDetail.hasOwnProperty(key)) {
                            item.providerDetail[key].providerId = key;
                            item.providerArr.push(item.providerDetail[key]);
                        }
                    }

                    item.provider$ = "";
                    if (item.providerDetail) {
                        for (let i = 0; i < item.providerArr.length; i++) {
                            item.providerArr[i].amount = parseFloat(item.providerArr[i].amount).toFixed(2);
                            item.providerArr[i].bonusAmount = parseFloat(item.providerArr[i].bonusAmount).toFixed(2);
                            item.providerArr[i].validAmount = parseFloat(item.providerArr[i].validAmount).toFixed(2);
                            item.providerArr[i].profit = parseFloat(item.providerArr[i].bonusAmount / item.providerArr[i].validAmount * -100).toFixed(2) + "%";
                            for (let j = 0; j < vm.allProviders.length; j++) {
                                if (item.providerArr[i].providerId.toString() == vm.allProviders[j]._id.toString()) {
                                    item.providerArr[i].name = vm.allProviders[j].name;
                                    item.provider$ += vm.allProviders[j].name + "<br>";
                                }
                            }
                        }
                    }

                    item.profit$ = 0;
                    if (item.consumptionBonusAmount != 0 && item.validConsumptionAmount != 0) {
                        item.profit$ = parseFloat((item.consumptionBonusAmount / item.validConsumptionAmount) * -100).toFixed(2) + "%";
                    }


                    return item;
                }), data.data.size, newSearch);
                $scope.safeApply();
            });
        };

        vm.drawDXNewPlayerReport = function (data, size, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.dxNewPlayerQuery.aaSorting || [[2, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'registrationTime', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'endTime', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'manualTopUpAmount', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'weChatTopUpAmount', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'aliPayTopUpAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'onlineTopUpAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [18], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('PlayerValue'), data: "valueScore"},
                    {title: $translate('REGISTRATION_TIME'), data: "registrationTime$"},
                    {title: $translate('endTime'), data: "endTime$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", "className": 'expandPlayerReport',
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('TOPUPMANUAL'), data: "manualTopUpAmount$", sClass: "sumFloat"},
                    {title: $translate('TOPUP_WECHAT'), data: "weChatTopUpAmount$", sClass: "sumFloat"},
                    {title: $translate('PlayerAlipayTopUp'), data: "aliPayTopUpAmount$", sClass: "sumFloat"},
                    {title: $translate('TOPUPONLINE'), data: "onlineTopUpAmount$", sClass: "sumFloat"},
                    {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes", sClass: "sumInt"},
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$", sClass: "sumFloat"},
                    {title: $translate('WITHDRAW_COUNT'), data: "bonusTimes", sClass: "sumInt"},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: "sumFloat"},
                    {title: $translate('PROMOTION'), data: "rewardAmount$", sClass: "sumFloat"},
                    {
                        title: $translate('CONSUMPTION_RETURN_AMOUNT'),
                        data: "consumptionReturnAmount$",
                        sClass: "sumFloat"
                    },
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: "sumInt"},
                    {title: $translate('VALID_CONSUMPTION'), data: "validConsumptionAmount$", sClass: "sumFloat"},
                    {title: $translate('PLAYER_PROFIT_AMOUNT'), data: "consumptionBonusAmount$", sClass: "sumFloat"},
                    {title: $translate('COMPANY_PROFIT'), data: "profit$", sClass: "sumProfit"},
                    {title: $translate('csOfficer'), data: "csOfficer"},
                    {title: $translate('csPromoteWay'), data: "csPromoteWay"},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$"}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            if (playerTbl) {
                playerTbl.clear();
            }
            var playerTbl = utilService.createDatatableWithFooter('#dxNewPlayerReportTable', tableOptions, {}, true);
            utilService.setDataTablePageInput('dxNewPlayerReportTable', playerTbl, $translate);

            $('#dxNewPlayerReportTable').resize();
            $('#dxNewPlayerReportTable tbody').off('click', 'td.expandPlayerReport');
            $('#dxNewPlayerReportTable tbody').on('click', 'td.expandPlayerReport', function () {
                var tr = $(this).closest('tr');
                var row = playerTbl.row(tr);

                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    console.log('content', data);
                    var id = 'playertable' + data._id;
                    row.child(vm.createInnerTable(id)).show();
                    vm[id] = {};
                    // utilService.actionAfterLoaded("#" + id + 'Page', function () {
                    //     vm[id].pageObj = utilService.createPageForPagingTable("#" + id + 'Page', {}, $translate, function (curP, pageSize) {
                    //         vm.searchGameReportInProvider(data, id, false, (curP - 1) * pageSize, pageSize);
                    //     });
                    //
                    // })
                    vm.allGame = [];
                    var gameId = [];
                    if (data.gameDetail) {
                        for (let n = 0; n < data.gameDetail.length; n++) {
                            gameId[n] = data.gameDetail[n].gameId;
                        }

                        vm.getGameByIds(gameId).then(
                            function () {
                                for (let i = 0; i < data.gameDetail.length; i++) {
                                    data.gameDetail[i].profit = parseFloat(data.gameDetail[i].bonusAmount / data.gameDetail[i].validAmount * -100).toFixed(2) + "%";
                                    for (let j = 0; j < vm.allGame.length; j++){
                                        if (data.gameDetail[i].gameId.toString() == vm.allGame[j]._id.toString()){
                                            data.gameDetail[i].name = vm.allGame[j].name;
                                        }
                                    }
                                }
                                vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.dxNewPlayerQuery);
                            }
                        )
                    }

                    tr.addClass('shown');
                }
            });
            $('#dxNewPlayerReportTable').off('order.dt');
            $('#dxNewPlayerReportTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerQuery', vm.searchDXNewPlayerReport);
            });
        };

        ///////draw Platform table inside player start///////
        vm.drawPlatformTable = function (data, id, size, newSearch, qObj) {
            let holder = data;
            var tableOptions = {
                data: data.providerArr,
                "order": qObj.aaSorting,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('*'),
                        data: null,
                        "className": 'expandPlayerReportPlatform expand',
                        "orderable": false
                    },
                    {title: $translate('LOBBY_NAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('TIMES_CONSUMED'), data: "count"},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "amount"},
                    {title: $translate('VALID_CONSUMPTION'), data: "validAmount"},
                    {title: $translate('PLAYER_PROFIT_AMOUNT'), data: "bonusAmount"},
                    {title: $translate('COMPANY_PROFIT'), data: "profit"}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if (vm.playerPlatformReport[id]) {
                vm.playerPlatformReport[id].clear();
            }
            $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));
            vm.playerPlatformReport[id] = utilService.createDatatableWithFooter('#' + id, tableOptions, {});
            utilService.setDataTablePageInput('playerReportTable', vm.gameTable[id], $translate);
            // vm[id].pageObj.init({maxCount: size}, newSearch);

            $('#' + id).resize();
            $('#' + id).off('click', 'td.expandPlayerReportPlatform');
            $('#' + id).on('click', 'td.expandPlayerReportPlatform', function () {
                var tr = $(this).closest('tr');
                var table = $(this).parent().closest('table');
                var providerId = table.attr('id').substring(11);
                var row = vm.playerPlatformReport[table.attr('id')].row(tr);
                if (row.child.isShown()) {
                    // This row is already open - close it
                    row.child.hide();
                    tr.removeClass('shown');
                }
                else {
                    // Open this row
                    var data = row.data();
                    var id = providerId + 'playerplatformtable' + data.providerId;
                    row.child(vm.createInnerTable(id)).show();
                    vm[id] = {};
                    // implement filter
                    var gameDetail = [];
                    if (holder.gameDetail) {
                        for (let i = 0; i < holder.gameDetail.length; i++) {
                            if (holder.gameDetail[i].providerId.toString() == data.providerId.toString()) {
                                gameDetail.push(holder.gameDetail[i]);
                            }
                        }
                    }

                    vm.drawPlatformGameTable(gameDetail, id, gameDetail.length, newSearch, qObj);
                    tr.addClass('shown');
                }
            });

        };

        //////draw game table inside player end /////

        ///////draw Platform table inside player start///////
        vm.drawPlatformGameTable = function (data, id, size, newSearch, qObj) {
            var tableOptions = {
                data: data,
                "order": qObj.aaSorting,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('GAME_NAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('TIMES_CONSUMED'), data: "count"},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "amount"},
                    {title: $translate('VALID_CONSUMPTION'), data: "validAmount"},
                    {title: $translate('PLAYER_PROFIT_AMOUNT'), data: "bonusAmount"},
                    {title: $translate('COMPANY_PROFIT'), data: "profit"}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if (vm.playerGameReport[id]) {
                vm.playerGameReport[id].clear();
            }
            $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));
            vm.playerPlatformReport[id] = utilService.createDatatableWithFooter('#' + id, tableOptions, {});
            utilService.setDataTablePageInput('playerReportTable', vm.gameTable[id], $translate);
            // vm[id].pageObj.init({maxCount: size}, newSearch);
        };

        //////draw game table inside player end /////

        // player report end

        // Start player partner report

        vm.searchPlayerPartnerRecord = function (newSearch) {

            vm.newPartnerQuery = $.extend(true, {}, vm.partnerQuery);
            $('#playerPartnerTableSpin').show();
            //$('#playerPartnerTable').hide();
            $('#playerPartnerSummaryTable').hide();

            console.log("vm.newPartnerQuery", vm.newPartnerQuery);
            var sendData = {
                platformId: vm.curPlatformId,
                partnerName: vm.newPartnerQuery.partnerName,
                startTime: vm.newPartnerQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.newPartnerQuery.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.newPartnerQuery.index,
                limit: vm.newPartnerQuery.limit || 10
            }
            if (vm.newPartnerQuery.playerType == "Real Player") {
                sendData.isRealPlayer = true
            }
            if (vm.newPartnerQuery.playerType == "Test Player") {
                sendData.isTestPlayer = true
            }
            console.log("vm.newPartnerQuery:sendData", sendData);
            socketService.$socket($scope.AppSocket, 'getPartnerSummaryReport', sendData, function (data) {
                vm.playerPartnerSummaryData = data.data;
                console.log('playerPartnerSummaryData', data.data);
                $('#playerPartnerSummaryTable').show();
                $scope.safeApply();
            }, function (err) {
                $scope.safeApply();
            }, true);

            socketService.$socket($scope.AppSocket, 'getPartnerPlayers', sendData, function (data) {
                $('#playerPartnerTableSpin').hide();
                console.log('getPartnerPlayers:res:data', data);
                console.log('player data', data.data);

                var resultData = data.data.data || [];
                console.log('result', resultData);

                vm.partnerQuery.totalCount = data.data.size;

                // For Summary at the table footer, Grab data from Summary Socket
                var summary = {};
                summary.totalTopUpTimes = 0;
                summary.totalPlayers = 0;
                var summaryData = vm.playerPartnerSummaryData;
                if (summaryData && summaryData.length > 0) {
                    for (var j = 0; j < summaryData.length; j++) {
                        summary.totalTopUpTimes += summaryData[j].total_topup_times;
                        summary.totalPlayers += summaryData[j].total_players
                    }
                }
                console.log("summary.totalPlayers", summary.totalPlayers);
                console.log("summary.totalTopUpTimes", summary.totalTopUpTimes);
                vm.drawPlayerPartnerReport(resultData, data.data.size, summary);
                $scope.safeApply();
            }, function (err) {
                $('#playerPartnerTableSpin').hide();
                // vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
            }, true);
        }
        vm.drawPlayerPartnerReport = function (data, size, summary) {
            console.log("vm.drawPlayerPartnerReport", data);

            var tableOptions = {
                data: data,
                // "order": vm.partnerQuery.aaSorting,
                columns: [
                    {title: $translate('PARTNER_NAME'), data: "partner.partnerName"},
                    {title: $translate('PLAYER_ID'), data: "playerId"},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "sumText"},
                    {title: $translate('LAST_LOGIN_IP'), data: "lastLoginIp",},
                    {title: $translate('PLAYER_DOMAIN'), data: "domain"},
                    {title: $translate('COUNTRY'), data: "country"},
                    {title: $translate('PROVINCE'), data: "province"},
                    {title: $translate('CITY'), data: "city"},
                    {title: $translate('TOTAL_TOPUP_TIMES'), data: "topUpTimes", sClass: 'sumInt alignRight'}
                ],
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                "fnDrawCallback": function (nFoot, aData, iStart, iEnd, aiDisplay) {
                    var api = this.api();
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.partnerQuery.pageObj.init({maxCount: size});

            vm.playerPartnerTable = utilService.createDatatableWithFooter('#playerPartnerTable', tableOptions, {
                8: summary.totalTopUpTimes,
                // 5: summary.totalPlayers
            });
            utilService.setDataTablePageInput('playerPartnerTable', vm.playerPartnerTable, $translate);


            $('#playerPartnerTable').off('order.dt');
            $('#playerPartnerTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'partnerQuery', vm.searchPlayerPartnerRecord);
            });

            $('#playerPartnerTable').resize();
            $('#playerPartnerTable tbody').unbind('click');
        }

        // End - player partner report


        //Start proposal report
        vm.hideOtherConditions = function (id, thisVal, preservID) {
            var te = $(id).find(".form-control");
            if (thisVal) {
                te.not(preservID).prop("disabled", true).css("background-color", "#eee");
                te.find("input").not(preservID).prop("disabled", true).css("background-color", "#eee")
                te.find("button.ms-choice").prop("disabled", true).css("background-color", "#eee")
            } else {
                te.not(preservID).prop("disabled", false).css("background-color", "#fff");
                te.find("input").not(preservID).prop("disabled", false).css("background-color", "#fff");
                te.find("button.ms-choice").prop("disabled", false).css("background-color", "#fff");
            }
        }
        vm.searchProposalRecord = function (newSearch) {

            vm.curPlatformId = vm.selectedPlatform._id;
            var newproposalQuery = $.extend(true, {}, vm.proposalQuery);
            // if (newproposalQuery.proposalTypeId == "all") {
            //     newproposalQuery.proposalTypeId = null;
            // }

            var proposalNames = $('select#selectProposalType').multipleSelect("getSelects");
            newproposalQuery.proposalTypeId = [];
            vm.allProposalType.filter(item => {
                if (proposalNames.indexOf(item.name) > -1) {
                    newproposalQuery.proposalTypeId.push(item._id);
                }
            });
            if (newproposalQuery.status == "all") {
                newproposalQuery.status = null;
            }
            $('#proposalTableSpin').show();
            newproposalQuery.limit = newproposalQuery.limit || 10;
            var sendData = newproposalQuery.proposalId ? {
                proposalId: newproposalQuery.proposalId,
                index: 0,
                limit: 1,
            } : {
                startTime: newproposalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: newproposalQuery.endTime.data('datetimepicker').getLocalDate(),
                proposalTypeId: newproposalQuery.proposalTypeId,
                platformId: vm.curPlatformId,
                status: newproposalQuery.status,
                index: newSearch ? 0 : (newproposalQuery.index || 0),
                limit: newproposalQuery.limit,
                sortCol: newproposalQuery.sortCol
            }
            console.log("newproposalQuery", newproposalQuery);

            socketService.$socket($scope.AppSocket, 'getProposalStaticsReport', sendData, function (data) {
                // $('#operationTableSpin').hide();
                $('#proposalTable').show();
                console.log('proposal data', data);
                var datatoDraw = data.data.data.map(item => {
                    item.data.involveAmount = 0;
                    if (item.topUpAmount) {
                        item.involveAmount = item.data.topUpAmount;
                    } else if (item.data.rewardAmount) {
                        item.involveAmount = item.data.rewardAmount;
                    } else if (item.data.amount) {
                        item.involveAmount = item.data.amount;
                    }
                    item.involveAmount = parseFloat(item.involveAmount).toFixed(2);
                    item.typeName = $translate(item.type.name || "Unknown");
                    item.mainType$ = $translate(item.mainType || "Unknown");
                    item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    item.status$ = $translate(vm.getStatusStrfromRow(item));

                    return item;
                })
                $('#proposalTableSpin').hide();
                vm.proposalQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawProposalReportNew(datatoDraw, vm.proposalQuery.totalCount, data.data.summary, newSearch);
            }, function (err) {
                $('#proposalTableSpin').hide();

            }, true);
        }
        vm.drawProposalReportNew = function (data, size, summary, newSearch) {
            console.log('data', data, size);
            var tableOptions = {
                data: data,
                "order": vm.proposalQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'proposalId', 'aTargets': [0]},
                    {'sortCol': 'createTime', 'aTargets': [6]}
                ],
                columns: [
                    {title: $translate('PROPOSAL ID'), data: "proposalId"},
                    {
                        title: $translate('PROPOSAL TYPE'), data: "typeName",
                        orderable: false,
                        // render: function (data) {
                        //     return $translate(data);
                        // }
                    },
                    {
                        title: $translate('PROPOSAL MAIN TYPE'), data: ("mainType$"),
                        orderable: false,
                        // render: function (data) {
                        //     return $translate(data);
                        // }
                    },
                    {
                        title: "<div>" + $translate('STATUS'), data: "status$",
                        orderable: false,
                        // render: function (data, type, row) {
                        //     return $translate(vm.getStatusStrfromRow(row))
                        // }
                    },
                    {
                        title: "<div>" + $translate('PLAYER ID'), data: "data.playerShortId",
                        orderable: false,
                    },
                    {
                        title: "<div>" + $translate('USER TYPE'), data: "userType",
                        orderable: false,
                    },
                    {
                        title: "<div>" + $translate('CREATION TIME'), data: "createTime$",
                        sClass: "sumText",
                        // render: function (data, type, row) {
                        //     return utilService.$getTimeFromStdTimeFormat(data);
                        // },
                        defaultContent: 0
                    },
                    {
                        title: $translate('Amount Involved'), data: "involveAmount", defaultContent: 0,
                        orderable: false,
                        sClass: "sumFloat alignRight",
                        // render: function (data, type, row) {
                        //     var showStr;
                        //     if (row.data.topUpAmount) {
                        //         showStr = row.data.topUpAmount;// + ' (' + $translate('TOPUP_AMOUNT') + ')';
                        //     } else if (row.data.rewardAmount) {
                        //         showStr = row.data.rewardAmount;// + ' (' + $translate('REWARDAMOUNT') + ')';
                        //     } else if (row.data.amount) {
                        //         showStr = row.data.amount;// + ' (' + $translate('CREDIT') + ')';
                        //     }
                        //     return showStr;
                        // },
                    }
                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollY": 400,
                // "scrollCollapse": true,
                // "destroy": true,
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = v.defaultContent || "";
            });
            var proposalTbl = utilService.createDatatableWithFooter('#proposalTable', tableOptions, {7: summary.amount});

            vm.proposalQuery.pageObj.init({maxCount: size}, newSearch);

            $('#proposalTable').off('order.dt');
            $('#proposalTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'proposalQuery', vm.searchProposalRecord);
            });

            // vm.proposalTable = $('#proposalTable').DataTable(tableOptions);
            // vm.proposalTable = utilService.createDatatableWithFooter('#proposalTable', tableOptions);
            // utilService.setDataTablePageInput('proposalTable', vm.proposalTable, $translate);

            // $('#proposalTable').resize();
            // $('#proposalTable tbody').on('click', 'td.expandProvider', function () {
            //     var tr = $(this).closest('tr');
            //     var row = vm.proposalTable.row(tr);
            //
            // });
        }

        vm.proposalTablePageChange = function (curP, pageSize) {
            vm.commonPageChangeHandler(curP, pageSize, "proposalQuery", vm.searchProposalRecord)
        }

        //End proposal report

        //start player consumption reward report
        //end player consumption reward report

        //start player First TopUp reward report
        //end player First TopUp reward report


        // start full attendance report
        // end full attendance report

        // start  Player TopUp Return report
        // end  Player TopUp Return report

        // start player consumption incentive report
        // end player consumption incentive report

        vm.searchPlayerAlmostLevelUp = function (newSearch) {
            var query = {
                platform: vm.curPlatformId,
                percentage: vm.playerAlmostLevelUpQuery.percentage,
                // limit: parseInt(vm.playerAlmostLevelUpQuery.limit)
                index: newSearch ? 0 : vm.playerAlmostLevelUpQuery.index,
                limit: vm.playerAlmostLevelUpQuery.limit || 10,
                sortCol: vm.playerAlmostLevelUpQuery.sortCol,
                newSummary: newSearch
            }
            $('#playerAlmostLevelUpTableSpin').show();
            $scope.$socketPromise('getPlayerAlmostLevelupReport', query)
                .then(function (data) {
                    console.log('data', data);
                    $('#playerAlmostLevelUpTableSpin').hide();

                    vm.playerAlmostLevelUpQuery.totalCount = data.data.size;
                    if (newSearch) {
                        vm.playerAlmostLevelUpQuery.savedSummary = {
                            3: data.data.summary.topupTotal,
                            4: data.data.summary.topupDay,
                            5: data.data.summary.topupWeek,
                            6: data.data.summary.consumTotal,
                            7: data.data.summary.consumDay,
                            8: data.data.summary.weeklyConsumptionSum
                        }
                    }
                    $scope.safeApply();
                    return vm.drawPlayerAlmostLevelUpTable(data.data.data, vm.playerAlmostLevelUpQuery.totalCount, vm.playerAlmostLevelUpQuery.savedSummary, newSearch);

                }, function (err) {
                    $('#playerAlmostLevelUpTableSpin').hide();
                    console.log('error', err);
                }).catch(err => {
                console.log('err', err);
            })
        }
        vm.drawPlayerAlmostLevelUpTable = function (data, size, summary, newSearch) {
            console.log('id, data, size, summary', data, size, summary, newSearch);
            var tableOptions = {
                data: data,
                "order": vm.playerAlmostLevelUpQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'playerId', 'aTargets': [0]},
                    {'sortCol': 'name', 'aTargets': [1]},
                    {'sortCol': 'playerLevel.name', 'aTargets': [2]},
                    {'sortCol': 'topUpSum', 'aTargets': [3]},
                    {'sortCol': 'dailyTopUpSum', 'aTargets': [4]},
                    {'sortCol': 'weeklyTopUpSum', 'aTargets': [5]},
                    {'sortCol': 'consumptionSum', 'aTargets': [6]},
                    {'sortCol': 'dailyConsumptionSum', 'aTargets': [7]},
                    {'sortCol': 'weeklyConsumptionSum', 'aTargets': [8]},
                    {'sortCol': 'percentage', 'aTargets': [9]},
                    {targets: '_all', defaultContent: ' ', bSortable: true}
                ],
                columns: [
                    {title: $translate('PLAYERID'), data: "playerId"},
                    {title: $translate('NAME'), data: "name"},
                    {
                        title: $translate('LEVEL'), data: "playerLevel.name", sClass: "sumText",
                    },
                    {
                        title: $translate('TopUp Sum'), data: "topUpSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('Daily TopUp Sum'), data: "dailyTopUpSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('Weekly TopUp Sum'), data: "weeklyTopUpSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('Consumption Sum'), data: "consumptionSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('Daily Consumption Sum'), data: "dailyConsumptionSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: $translate('Weekly Consumption Sum'), data: "weeklyConsumptionSum",
                        sClass: "sumFloat alignRight",
                        render: function (data, type, row) {
                            return data.toFixed(2);
                        }
                    },
                    {
                        title: "%", data: "percentage",
                        render: function (data, type, row) {
                            return (data * 100).toFixed(1) + ' %';
                        }
                    }
                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollCollapse": true,
                // "destroy": true,
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                // dom: 'Zritlp',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = "";
            });

            // $('#' + id).DataTable(tableOptions);
            vm.levelUpTable = utilService.createDatatableWithFooter("#playerAlmostLevelUpTable", tableOptions, summary);

            vm.playerAlmostLevelUpQuery.pageObj.init({maxCount: size}, newSearch);

            $("#playerAlmostLevelUpTable").off('order.dt');
            $("#playerAlmostLevelUpTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerAlmostLevelUpQuery', vm.searchPlayerAlmostLevelUp);
            });

            $("#playerAlmostLevelUpTable").resize();
        }
        vm.playerAlmostLevelUpTablePageUpdate = function (curP, pageSize) {
            vm.commonPageChangeHandler(curP, pageSize, "playerAlmostLevelUpQuery", vm.searchPlayerAlmostLevelUp)
        }

        // start provider report
        // end report report

        // start transaction report
        // end transaction report

        // start - partnerConsumption Report
        // end - partnerConsumption Report ////////

        // start - PARTNER_INCENTIVE_REPORT Report
        // end - PARTNER_INCENTIVE_REPORT Report ////////

        // start - PARTNER_REFERRAL_REPORT Report
        // end   - PARTNER_REFERRAL_REPORT Report ////////

        // start player feedback Report
        vm.searchPlayerFeedbackQuery = function (newSearch) {

            vm.playerFeedbackQuery = vm.playerFeedbackQuery || {};
            var sendData = {
                query: {
                    startTime: vm.playerFeedbackQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerFeedbackQuery.endTime.data('datetimepicker').getLocalDate(),
                    platform: vm.curPlatformId
                },
                limit: vm.playerFeedbackQuery.limit || 10,
                index: newSearch ? 0 : (vm.playerFeedbackQuery.index || 0),
                sortCol: vm.playerFeedbackQuery.sortCol
            }
            if (vm.playerFeedbackQuery.playerName) {
                sendData.query.playerName = vm.playerFeedbackQuery.playerName
            }
            if (vm.playerFeedbackQuery.result != 'all') {
                sendData.query.result = vm.playerFeedbackQuery.result
            }
            $('#playerFeedbackTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPlayerFeedbackReport', sendData, function (data) {
                $('#playerFeedbackTableSpin').hide();
                console.log('playerfeedback', data.data);
                vm.playerFeedbackQuery.totalCount = data.data.size;
                vm.drawPlayerFeedbackQueryTable(data.data.data || [], vm.playerFeedbackQuery.totalCount, {}, newSearch);
                $scope.safeApply();
            }, function (err) {
                $('#playerFeedbackTableSpin').hide();
            }, true);
        }
        vm.drawPlayerFeedbackQueryTable = function (data, size, summary, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.playerFeedbackQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'adminId', 'aTargets': [0]},
                    {'sortCol': 'result', 'aTargets': [4]},
                    {'sortCol': 'createTime', 'aTargets': [5]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('ADMIN'), data: "adminId.adminName", orderable: true},
                    {title: $translate('PLAYER_Id'), data: "playerId.playerId"},
                    {title: $translate('PLAYER_NAME'), data: "playerId.name"},
                    {
                        title: $translate('CONTENT'), data: "content",
                        "render": function (data, type, row) {
                            var show = $('<div>', {
                                'style': "word-wrap: break-word;max-width:300px;white-space: normal;",
                            }).text(data);
                            return show.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('RESULT'), data: "result",
                        orderable: true, render: function (data, type, row) {
                        return $translate(data);
                    }
                    },
                    {
                        title: $translate('CREATE_TIME'), data: "createTime",
                        orderable: true,
                        render: function (data, type, row) {
                            return utilService.$getTimeFromStdTimeFormat(data);
                        }
                    }
                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollY": 400,
                // "scrollCollapse": true,
                // "destroy": true,
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            var feedbackTbl = $('#playerFeedbackTable').DataTable(tableOptions);
            $('#playerFeedbackTable').resize();

            vm.playerFeedbackQuery.pageObj.init({maxCount: size}, newSearch);
            $('#playerFeedbackTable').off('order.dt');
            $('#playerFeedbackTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerFeedbackQuery', vm.searchPlayerFeedbackQuery);
            });
        }

        vm.feedbackTablePageChange = function (curP, pageSize) {
            vm.commonPageChangeHandler(curP, pageSize, "playerFeedbackQuery", vm.searchPlayerFeedbackQuery)
        }
        // end player feedback Report

        // start credit change Report
        vm.searchCreditChangeQuery = function (newSearch) {

            vm.creditChangeQuery = vm.creditChangeQuery || {};

            var startTime = vm.creditChangeQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.creditChangeQuery.endTime.data('datetimepicker').getLocalDate();

            var sendData = {

                platformId: vm.curPlatformId,
                operationTime: {
                    startTime: startTime,
                    endTime: endTime
                },
                limit: vm.creditChangeQuery.limit || 10,
                index: newSearch ? 0 : (vm.creditChangeQuery.index || 0),
                sortCol: vm.creditChangeQuery.sortCol
                // limit: {limit: vm.creditChangeQuery.limit}
            }
            $('#creditChangeTableSpin').show();
            socketService.$socket($scope.AppSocket, 'queryCreditChangeLog', sendData, function (data) {
                // $('#operationTableSpin').hide();
                $('#creditChangeTableSpin').hide();
                console.log('credit change report', data);
                vm.creditChangeQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawCreditChangeQueryTable(data.data.data.map(item => {
                    item.amount$ = parseFloat(item.amount).toFixed(2);
                    return item;
                }), vm.creditChangeQuery.totalCount, data.data.summary, newSearch);

            }, function (err) {
                $('#creditChangeTableSpin').hide();
            }, true);
        }
        vm.drawCreditChangeQueryTable = function (data, size, summary, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.creditChangeQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'playerId', 'aTargets': [0]},
                    {'sortCol': 'playerId', 'aTargets': [1]},
                    {'sortCol': 'operationType', 'aTargets': [2]},
                    {'sortCol': 'amount', 'aTargets': [3]},
                    {'sortCol': 'operationTime', 'aTargets': [4]},
                    {targets: '_all', defaultContent: ' ', bSortable: true}
                ],
                columns: [
                    {title: $translate('PLAYER_ID'), data: "playerId.playerId"},
                    {title: $translate('PLAYER_NAME'), data: "playerId.name"},
                    {
                        title: $translate('TYPE'), data: "operationType", sClass: "sumText",
                        render: function (data) {
                            return $translate(data);
                        }
                    },
                    {title: $translate('CREDIT'), data: "amount$", sClass: "sumFloat alignRight"},
                    {
                        title: $translate('CREATE_TIME'), data: "operationTime",
                        render: function (data, type, row) {
                            return utilService.$getTimeFromStdTimeFormat(data);
                        }
                    }
                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollY": 400,
                // "scrollCollapse": true,
                // "destroy": true,
                "paging": false,
                // "dom": '<"top">rt<"bottom"ilp><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                // fnRowCallback: vm.playerTableRowClick,
                // fnDrawCallback: function (oSettings) {
                //     var container = oSettings.nTable;
                // }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.creditChangeTable = utilService.createDatatableWithFooter('#creditChangeTable', tableOptions, {3: summary.amount});
            vm.creditChangeQuery.pageObj.init({maxCount: size}, newSearch);
            $('#creditChangeTable').off('order.dt');
            $('#creditChangeTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'creditChangeQuery', vm.searchCreditChangeQuery);
            });
            $('#creditChangeTable').resize();
        }

        vm.creditChangeTablePageChange = function (curP, pageSize) {
            vm.commonPageChangeHandler(curP, pageSize, "creditChangeQuery", vm.searchCreditChangeQuery)
        }

        // end credit change Report

        // start new account report
        vm.searchNewPlayerRecord = function () {
            var sendData = {
                platform: vm.curPlatformId,
                startTime: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate(),
            }
            socketService.$socket($scope.AppSocket, 'getNewAccountReportData', sendData, function (data) {
                console.log('data', data.data);
                var retData = data.data;
                vm.newPlayerQuery.totalPlayerCount = retData[0];
                vm.newPlayerQuery.totalDomainPlayerCount = 0;
                var domainData = retData[1].filter(item => {
                    return item.domain;
                }).sort(function (a, b) {
                    return b.num - a.num
                }).map(item => {
                    vm.newPlayerQuery.totalDomainPlayerCount += item.num;
                    return item;
                });
                vm.newPlayerQuery.totalpartnerPlayerCount = 0;
                var partnerData = retData[2].filter(function (obj) {
                    return (obj._id);
                }).sort(function (a, b) {
                    return b.num - a.num
                }).map(item => {
                    vm.newPlayerQuery.totalpartnerPlayerCount += item.num;
                    return item;
                });
                vm.newPlayerQuery.totalTopupPlayerCount = retData[3];
                vm.newPlayerQuery.totalTopupMultipleTimesPlayerCount = retData[4];
                vm.drawDomainPlayerGraph(domainData);
                vm.drawDomainPlayerTable(domainData);
                vm.drawPartnerPlayerGraph(partnerData);
                vm.drawPartnerPlayerTable(partnerData);
                $scope.safeApply();
            });
        }
        vm.drawPartnerPlayerGraph = function (data) {
            var pieData = data.filter(function (obj) {
                return (obj._id);
            }).map(function (obj) {
                return {label: obj.partner.partnerName, data: obj.num};
            });
            socketService.$plotPie("#partnerPlayerPie", pieData, {}, 'partnerPieClickData');

        }
        vm.drawPartnerPlayerTable = function (data) {
            var tblData = [];
            $.each(data, function (i, v) {
                tblData.push(v);
            })
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' '}
                ],
                columns: [
                    {title: $translate("partnerName"), data: "partner.partnerName", sClass: "sumText"},
                    {title: $translate('amount'), data: "num", sClass: "alignRight sumInt"},
                    {
                        title: $translate(''), bSortable: false,
                        render: function (data, type, row) {
                            var $a = $('<a>', {
                                class: "partnerRow"
                            }).attr('partnerObjectId', row.partner._id).text($translate("View Details"));
                            return $a.prop('outerHTML');
                        }
                    }
                ],
                sScrollY: 300,
                scrollCollapse: false,
                "paging": false
            });
            var aTable = utilService.createDatatableWithFooter("#newPlayerPartnerTable", options, {}, true);
            $("#newPlayerPartnerTable tr .partnerRow").off('click');
            $("#newPlayerPartnerTable tr .partnerRow").on('click', function () {
                if ($(this)[0]) {
                    var partnerObjectId = $(this).attr('partnerObjectId');
                    vm.detailPartnerPlayer = vm.detailPartnerPlayer || {};
                    vm.detailPartnerPlayer.partnerObjectId = partnerObjectId;
                    vm.detailPartnerPlayer.pageObj = utilService.createPageForPagingTable("#detailPartnerPlayerTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "detailPartnerPlayer", vm.getDetailPartnerPlayerData)
                    });
                    vm.getDetailPartnerPlayerData(true);
                }
            });
        };
        vm.getDetailPartnerPlayerData = function (newSearch) {
            let sendData = {
                platformId: vm.curPlatformId,
                query: {
                    startTime: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate(),
                    partner: vm.detailPartnerPlayer.partnerObjectId,
                    registrationTime: {
                        $gte: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                        $lt: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate()
                    }
                },
                index: newSearch ? 0 : vm.detailPartnerPlayer.index,
                limit: vm.detailPartnerPlayer.limit || 10,
                sortCol: vm.detailPartnerPlayer.sortCol || {}
            };

            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQueryWithTopupTimes', sendData, function (data) {
                vm.drawDetailPartnerPlayerTable(data.data.data.map(item => {
                    item.registrationTime$ = $scope.timeReformat(item.registrationTime);
                    item.lastAccessTime$ = $scope.timeReformat(item.lastAccessTime);
                    if (!item.partner) {
                        item.partner = {partnerName: $translate("NONE")};
                    }
                    return item;
                }), data.data.size, newSearch);
                $scope.safeApply();
            });
        };
        vm.drawDetailPartnerPlayerTable = function (tableData, size, newSearch) {
            console.log('detailPartnerPlayer', tableData);
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tableData,
                "order": vm.detailPartnerPlayer.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'registrationTime', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'lastAccessTime', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [7], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate("Domain Name"), data: "domain"},
                    {title: $translate('playerId'), data: "playerId"},
                    {title: $translate("playerName"), data: "name"},
                    {title: $translate('registrationTime'), data: "registrationTime$"},
                    {title: $translate("PARTNER"), data: "partner.partnerName"},
                    {title: $translate('lastAccessTime'), data: "lastAccessTime$"},
                    {title: $translate("loginTimes"), data: "loginTimes"},
                    {title: $translate('topUpTimes'), data: "topUpTimes"},
                ],
                "paging": false
            });
            $scope.safeApply();
            utilService.actionAfterLoaded("#detailDomainPlayerTable", function () {
                vm.detailPartnerPlayer.pageObj.init({maxCount: size}, newSearch);
                var aTable = $("#detailPartnerPlayerTable").DataTable(options);
                $('#detailPartnerPlayerTable').off('order.dt');
                $('#detailPartnerPlayerTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'detailPartnerPlayer', vm.getDetailPartnerPlayerData);
                });
                setTimeout(function () {
                    $("#detailPartnerPlayerTable").resize();
                }, 100)
            })
        }

        vm.drawDomainPlayerGraph = function (data) {
            var pieData = data.map(function (obj) {
                return {label: obj.domain, data: obj.num};
            });
            socketService.$plotPie("#domainPlayerPie", pieData, {}, 'domainPieClickData');

        }
        vm.drawDomainPlayerTable = function (data) {
            var tblData = [];
            $.each(data, function (i, v) {
                tblData.push(v);
            })
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tblData,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' '}
                ],
                columns: [
                    {title: $translate("Domain Name"), data: "domain", sClass: "sumText"},
                    {title: $translate('amount'), data: "num", sClass: "alignRight sumInt"},
                    {
                        title: $translate(''), bSortable: false,
                        render: function (data, type, row) {
                            var $a = $('<a>', {
                                class: "domainRow"
                            }).attr('data-domain', row.domain).text($translate("View Details"));
                            return $a.prop('outerHTML');
                        }
                    }
                ],
                sScrollY: 300,
                scrollCollapse: false,
                "paging": false
            });
            var aTable = utilService.createDatatableWithFooter("#newPlayerDomainTable", options, {}, true);
            $("#newPlayerDomainTable tr .domainRow").off('click');
            $("#newPlayerDomainTable tr .domainRow").on('click', function () {
                if ($(this)[0]) {
                    var domainName = $(this)[0].dataset.domain;
                    vm.detailDomainPlayer = vm.detailDomainPlayer || {};
                    vm.detailDomainPlayer.domainName = domainName
                    vm.detailDomainPlayer.pageObj = utilService.createPageForPagingTable("#detailDomainPlayerTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "detailDomainPlayer", vm.getDetailDomainPlayerData)
                    });
                    vm.getDetailDomainPlayerData(true)
                }
            });

        };

        // Get detail on domain's player data
        vm.getDetailDomainPlayerData = function (newSearch) {
            let sendData = {
                platformId: vm.curPlatformId,
                query: {
                    startTime: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate(),
                    domain: vm.detailDomainPlayer.domainName,
                    registrationTime: {
                        $gte: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                        $lt: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate()
                    }
                },
                index: newSearch ? 0 : vm.detailDomainPlayer.index,
                limit: vm.detailDomainPlayer.limit || 10,
                sortCol: vm.detailDomainPlayer.sortCol || {}
            };

            socketService.$socket($scope.AppSocket, 'getPagePlayerByAdvanceQueryWithTopupTimes', sendData, function (data) {
                vm.drawDetailDomainPlayerTable(data.data.data.map(item => {
                    item.registrationTime$ = $scope.timeReformat(item.registrationTime);
                    item.lastAccessTime$ = $scope.timeReformat(item.lastAccessTime);
                    if (!item.partner) {
                        item.partner = {partnerName: $translate("NONE")};
                    }
                    return item;
                }), data.data.size, newSearch);
                $scope.safeApply();
            });
        };

        vm.drawDetailDomainPlayerTable = function (tableData, size, newSearch) {
            console.log('detailDomain', tableData);
            var options = $.extend({}, $scope.getGeneralDataTableOption, {
                data: tableData,
                "order": vm.detailDomainPlayer.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'registrationTime', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'lastAccessTime', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [7], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate("Domain Name"), data: "domain"},
                    {title: $translate('playerId'), data: "playerId"},
                    {title: $translate("playerName"), data: "name"},
                    {title: $translate('registrationTime'), data: "registrationTime$"},
                    {title: $translate("PARTNER"), data: "partner.partnerName"},
                    {title: $translate('lastAccessTime'), data: "lastAccessTime$"},
                    {title: $translate("loginTimes"), data: "loginTimes"},
                    {title: $translate('topUpTimes'), data: "topUpTimes"},

                ],
                "paging": false
            });
            utilService.actionAfterLoaded("#detailDomainPlayerTable", function () {
                vm.detailDomainPlayer.pageObj.init({maxCount: size}, newSearch);
                var aTable = $("#detailDomainPlayerTable").DataTable(options);
                $('#detailDomainPlayerTable').off('order.dt');
                $('#detailDomainPlayerTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'detailDomainPlayer', vm.getDetailDomainPlayerData);
                });
                setTimeout(function () {
                    $("#detailDomainPlayerTable").resize();
                }, 100)
            })
        }

        // end new account report

        // start of partner player bonus report
        vm.searchPartnerPlayerBonusData = function (newSearch) {
            var startTime = vm.partnerPlayerBonusQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.partnerPlayerBonusQuery.endTime.data('datetimepicker').getLocalDate();

            var sendData = {
                platformId: vm.curPlatformId,
                partnerName: vm.partnerPlayerBonusQuery.partnerName,
                startTime: startTime,
                endTime: endTime,
                limit: vm.partnerPlayerBonusQuery.limit || 10,
                index: newSearch ? 0 : (vm.partnerPlayerBonusQuery.index || 0),
                sortCol: vm.partnerPlayerBonusQuery.sortCol || {}
            }
            $('#partnerPlayerBonusTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPartnerPlayerBonusReport', sendData, function (data) {
                $('#partnerPlayerBonusTableSpin').hide();
                console.log('partner player bonus report', data);
                vm.partnerPlayerBonusQuery.totalCount = data.data.stats ? data.data.stats.totalCount : 0;
                vm.partnerPlayerBonusQuery.message = data.data.message || '';
                $scope.safeApply();
                vm.drawPartnerPlayerBonusTable(data.data.players.map(item => {
                    item.lastBonusTime$ = item.lastBonusTime ? utilService.$getTimeFromStdTimeFormat(item.lastBonusTime) : $translate('NULL')
                    item.registrationTime$ = utilService.$getTimeFromStdTimeFormat(item.registrationTime);
                    item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                    item.totalTopUpAmount$ = parseFloat(item.totalTopUpAmount).toFixed(2);
                    item.totalBonusAmount$ = parseFloat(item.totalBonusAmount).toFixed(2);
                    item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    return item;
                }), vm.partnerPlayerBonusQuery.totalCount, data.data.summary, newSearch);

            }, function (err) {
                $('#partnerPlayerBonusTableSpin').hide();
            }, true);
        }
        vm.drawPartnerPlayerBonusTable = function (tableData, size, summary, newSearch) {
            var tableOptions = {
                data: tableData,
                "order": vm.partnerPlayerBonusQuery.aaSorting || [],
                aoColumnDefs: [
                    // {'sortCol': 'playerId', 'aTargets': [0]},
                    // {'sortCol': 'playerId', 'aTargets': [1]},
                    // {'sortCol': 'operationType', 'aTargets': [2]},
                    // {'sortCol': 'amount', 'aTargets': [3]},
                    // {'sortCol': 'operationTime', 'aTargets': [4]},
                    {targets: '_all', defaultContent: 0, bSortable: false}
                ],
                columns: [
                    {data: "playerName"},
                    {data: "registrationTime$"},
                    {data: "lastAccessTime$"},
                    {data: "lastBonusTime$", sClass: "sumText"},
                    {data: "totalTopUpTimes", sClass: "sumInt alignRight"},
                    {data: "totalBonusTimes", sClass: "sumInt alignRight"},
                    {data: "totalTopUpAmount$", sClass: "sumFloat alignRight"},
                    {data: "totalBonusAmount$", sClass: "sumFloat alignRight"},
                    {data: "topUpTimes", sClass: "sumInt alignRight"},
                    {data: "bonusTimes", sClass: "sumInt alignRight"},
                    {data: "topUpAmount$", sClass: "sumFloat alignRight"},
                    {data: "bonusAmount$", sClass: "sumFloat alignRight"},
                ],
                "bAutoWidth": true,
                "paging": false,
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            var sumObj = summary ? {
                4: summary.totalTopUpTimes,
                5: summary.totalBonusTimes,
                6: summary.totalTopUpAmount,
                7: summary.totalBonusAmount,
                8: summary.topUpTimes,
                9: summary.bonusTimes,
                10: summary.topUpAmount,
                11: summary.bonusAmount,
            } : {};

            vm.partnerPlayerBonusTable = utilService.createDatatableWithFooter('#partnerPlayerBonusTable', tableOptions, sumObj);
            vm.partnerPlayerBonusQuery.pageObj.init({maxCount: size}, newSearch);
            $('#partnerPlayerBonusTable').off('order.dt');
            $('#partnerPlayerBonusTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'partnerPlayerBonusQuery', vm.searchPartnerPlayerBonusData);
            });
            setTimeout(function () {
                $('#partnerPlayerBonusTable_wrapper').resize();
                console.log('vm.partnerPlayerBonusTable', vm.partnerPlayerBonusTable);
            }, 500);
        }
        // end of partner player bonus report

        // start partner commission report
        vm.searchPartnerCommissionData = function (newSearch) {
            $('#partnerCommissionTableSpin').show();

            var startTime = vm.partnerCommissionQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.partnerCommissionQuery.endTime.data('datetimepicker').getLocalDate();

            Q.resolve().then(
                () => {
                    var midnightThisMorningSG = getDayStartTime();
                    if (endTime >= midnightThisMorningSG) {
                        return $scope.$socketPromise('manualPlatformPartnerCommissionSettlement', {platformId: vm.curPlatformId}, true);
                    }
                }
            ).then(
                () => {
                    var sendData = {
                        platformId: vm.curPlatformId,
                        partnerName: vm.partnerCommissionQuery.partnerName,
                        startTime: startTime,
                        endTime: endTime,
                        limit: vm.partnerCommissionQuery.limit || 10,
                        index: newSearch ? 0 : (vm.partnerCommissionQuery.index || 0),
                        sortCol: vm.partnerCommissionQuery.sortCol || {}
                    };

                    return $scope.$socketPromise('getPartnerCommissionReport', sendData, true).then(
                        function (data) {
                            console.log("getPartnerCommissionReport", data);
                            vm.partnerCommissionQuery.totalCount = data.data.size ? data.data.size : 0;
                            vm.partnerCommissionQuery.message = data.data.message || '';
                            $scope.safeApply();
                            vm.drawPartnerCommissionTable(data.data.data.map(item => {
                                item.profitAmount$ = parseFloat(item.profitAmount).toFixed(2);
                                item.serviceFee$ = parseFloat(item.serviceFee).toFixed(2);
                                item.platformFee$ = parseFloat(item.platformFee).toFixed(2);
                                item.marketCost$ = parseFloat(item.marketCost).toFixed(2);
                                item.totalRewardAmount$ = parseFloat(item.totalRewardAmount).toFixed(2);
                                item.operationFee$ = parseFloat(item.operationFee).toFixed(2);
                                item.totalTopUpAmount$ = parseFloat(item.totalTopUpAmount).toFixed(2);
                                item.totalPlayerBonusAmount$ = parseFloat(item.totalPlayerBonusAmount).toFixed(2);
                                // item.totalBonusAmount$ = parseFloat(item.totalBonusAmount).toFixed(2);
                                item.totalCommissionAmount$ = parseFloat(item.totalCommissionAmount).toFixed(2);
                                item.totalCommissionOfChildren$ = parseFloat(item.totalCommissionOfChildren).toFixed(2);
                                return item;
                            }), vm.partnerCommissionQuery.totalCount, data.data.summary, newSearch);
                        }
                    );
                }
            ).catch(console.error).then(
                () => $('#partnerCommissionTableSpin').hide()
            );
        }
        vm.drawPartnerCommissionTable = function (tableData, size, summary, newSearch) {
            var tableOptions = {
                data: tableData,
                "order": vm.partnerCommissionQuery.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'profitAmount', 'aTargets': [1]},
                    {'sortCol': 'serviceFee', 'aTargets': [2]},
                    {'sortCol': 'platformFee', 'aTargets': [3]},
                    {'sortCol': 'totalRewardAmount', 'aTargets': [4]},
                    {'sortCol': 'marketCost', 'aTargets': [5]},
                    {'sortCol': 'operationFee', 'aTargets': [6]},
                    {'sortCol': 'totalTopUpAmount', 'aTargets': [7]},
                    {'sortCol': 'totalPlayerBonusAmount', 'aTargets': [8]},
                    {'sortCol': 'totalCommissionAmount', 'aTargets': [9]},
                    {'sortCol': 'totalCommissionOfChildren', 'aTargets': [10]},
                    {targets: '_all', defaultContent: 0, bSortable: true}
                ],
                columns: [
                    {title: $translate("partnerName"), data: "_id.partnerName", sClass: "sumText", bSortable: false},
                    {title: $translate('profitAmount'), data: "profitAmount$", sClass: "sumFloat alignRight"},
                    {title: $translate('serviceFee'), data: "serviceFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('platformFee'), data: "platformFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('REWARDAMOUNT'), data: "totalRewardAmount$", sClass: "sumFloat alignRight"},
                    {title: $translate('marketCost'), data: "marketCost$", sClass: "sumFloat alignRight"},
                    {title: $translate('operationFee'), data: "operationFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('totalTopUpAmount'), data: "totalTopUpAmount$", sClass: "sumFloat alignRight"},
                    {
                        title: $translate('totalBonusAmount'),
                        data: "totalPlayerBonusAmount$",
                        sClass: "sumFloat alignRight"
                    },
                    {
                        title: $translate('totalCommissionAmount'),
                        data: "totalCommissionAmount$",
                        sClass: "sumFloat alignRight"
                    },
                    {
                        title: $translate('totalCommissionOfChildren'),
                        data: "totalCommissionOfChildren$",
                        sClass: "sumFloat alignRight"
                    },
                ],
                "bAutoWidth": true,
                "paging": false,
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            var summaryObj = {
                1: summary.profitAmount,
                2: summary.serviceFee,
                3: summary.platformFee,
                4: summary.totalRewardAmount,
                5: summary.marketCost,
                6: summary.operationFee,
                7: summary.totalTopUpAmount,
                8: summary.totalPlayerBonusAmount,
                9: summary.totalCommissionAmount,
                10: summary.totalCommissionOfChildren
            }
            vm.partnerCommissionTable = utilService.createDatatableWithFooter('#partnerCommissionTable', tableOptions, summaryObj);
            vm.partnerCommissionQuery.pageObj.init({maxCount: size}, newSearch);
            $('#partnerCommissionTable').off('order.dt');
            $('#partnerCommissionTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'partnerCommissionQuery', vm.searchPartnerCommissionData);
            });
            setTimeout(function () {
                $('#partnerCommissionTable_wrapper').resize();
            }, 500);
        }
        // end partner commission report

        // start of general reward proposal report
        vm.generalRewardProposalSearch = function (newSearch) {
            vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};

            var startTime = vm.generalRewardProposalQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.generalRewardProposalQuery.endTime.data('datetimepicker').getLocalDate();

            var sendData = {
                platformId: vm.curPlatformId,
                startTime: startTime,
                endTime: endTime,
                type: vm.rewardTypeName,
                code: vm.currentRewardCode,
                limit: vm.generalRewardProposalQuery.limit || 10,
                index: newSearch ? 0 : (vm.generalRewardProposalQuery.index || 0),
                sortCol: vm.generalRewardProposalQuery.sortCol
            }
            console.log('sendData', sendData);
            $('#generalRewardProposalTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getRewardProposalReportByType', sendData, function (data) {
                // $('#operationTableSpin').hide();
                $('#generalRewardProposalTableSpin').hide();
                console.log('general reward report', data);
                vm.generalRewardProposalQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawGeneralRewardProposalTable(data.data.data.map(item => {
                    // item.$amount = item.data.rewardAmount ?
                    //     item.data.rewardAmount :
                    //     (item.data.returnAmount ? item.data.returnAmount : 0);
                    if (item.data.rewardAmount) {
                        item.$amount = item.data.rewardAmount;
                    } else if (item.data.returnAmount) {
                        item.$amount = item.data.returnAmount;
                    } else if (item.data.updateAmount) {
                        item.$amount = item.data.updateAmount;
                    } else if (item.data.amount) {
                        item.$amount = item.data.amount;
                    } else {
                        item.$amount = 0;
                    }

                    item.$amount = parseFloat(item.$amount).toFixed(2);
                    item.$createTime = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    if (vm.rewardTypeName == 'ALL') {
                        item.type.name$ = $translate(item.type.name);
                    }
                    return item;
                }), vm.generalRewardProposalQuery.totalCount, data.data.summary, newSearch);

            }, function (err) {
                $('#generalRewardProposalTableSpin').hide();
            }, true);
        }
        vm.drawGeneralRewardProposalTable = function (data, size, summary, newSearch) {
            var tableOptions = $.extend(true, {}, vm.commonTableOption, {
                data: data,
                "order": vm.generalRewardProposalQuery.aaSorting,
                aoColumnDefs: vm.generalRewardReportTableProp.aoColumnDefs,
                columns: vm.generalRewardReportTableProp.columns,
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
            });
            vm.generalRewardProposalQuery.table = utilService.createDatatableWithFooter("#generalRewardProposalTable", tableOptions, {
                2: summary.amount,
                3: summary.applyAmount
            });
            vm.generalRewardProposalQuery.pageObj.init({maxCount: size}, newSearch);

            $("#generalRewardProposalTable").off('order.dt');
            $("#generalRewardProposalTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'generalRewardProposalQuery', vm.generalRewardProposalSearch);
            });
            $("#generalRewardProposalTable").resize();
        }
        // end of general reward proposal report

        /////////////// start of general reward task report

        vm.searchGeneralRewardTask = function (newSearch) {
            console.log("vm.generalRewardTaskQuery", vm.generalRewardTaskQuery);
            vm.generalRewardTaskQuery = vm.generalRewardTaskQuery || {};

            var deferred = Q.defer();
            var query = {
                platformId: vm.curPlatformId,
                startTime: vm.generalRewardTaskQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.generalRewardTaskQuery.endTime.data('datetimepicker').getLocalDate(),
                type: vm.currentRewardTaskName,//'FIRST_TOP_UP'
                index: newSearch ? 0 : vm.generalRewardTaskQuery.index,
                limit: newSearch ? 10 : vm.generalRewardTaskQuery.limit,
                sortCol: vm.generalRewardTaskQuery.sortCol || {},
                eventId: vm.currentEventId
            }

            console.log('query', query);
            $('#generalRewardTaskSpin').show();
            $scope.$socketPromise('getPlatformRewardPageReport', query)
                .then(function (data) {
                    $('#generalRewardTaskSpin').hide();
                    if (data) {
                        console.log('data', data);
                        vm.generalRewardTaskTableProp.totalCount = data.data.size;
                        var tableData = data.data.data || [];
                        tableData = tableData.map(item => {
                            item.rewardType$ = $translate(item.rewardType);
                            return item;
                        });
                        vm.drawGeneralRewardTaskTable(tableData, data.data.size, data.data.summary, newSearch);
                        $scope.safeApply();
                        deferred.resolve(true);
                    } else {
                        deferred.reject({name: 'DataError', message: 'error finding proposal type.'});
                    }
                }, function (err) {
                    $('#generalRewardTaskSpin').hide();
                    console.log('error', err);
                    deferred.reject(err);
                }).done()
            return deferred.promise;
        }
        vm.drawGeneralRewardTaskTable = function (data, size, summary, newSearch) {
            console.log('data', data);
            // console.log('data.gameId', data.gameId);
            var tableOptions = {

                data: data,
                "order": vm.generalRewardTaskTableProp.aaSorting || [],
                aoColumnDefs: vm.generalRewardTaskTableProp.aoColumnDefs,
                columns: vm.generalRewardTaskTableProp.columns,
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            var summaryObj = {
                4: summary ? summary.unlockedAmountSum : 0,
                6: summary ? summary.currentAmountSum : 0
            }
            vm.generalRewardTaskQuery.table = utilService.createDatatableWithFooter("#generalRewardTaskTable", tableOptions, summaryObj);
            vm.generalRewardTaskQuery.pageObj.init({maxCount: size}, newSearch);

            $("#generalRewardTaskTable").off('order.dt');
            $("#generalRewardTaskTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'generalRewardTaskQuery', vm.searchGeneralRewardTask);
            });
            $("#generalRewardTaskTable").resize();
        }

        ///// end of reward task report

        vm.searchActionLogData = function (newSearch) {
            console.log("vm.actionLogQuery", vm.actionLogQuery);

            var query = {
                startTime: vm.actionLogQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.actionLogQuery.endTime.data('datetimepicker').getLocalDate(),
                action: vm.actionLogQuery.action,//'FIRST_TOP_UP'
                admin: vm.actionLogQuery.admin,
                player: vm.actionLogQuery.player,
                index: vm.actionLogQuery.index,
                limit: vm.actionLogQuery.limit || 10,
                sortCol: vm.actionLogQuery.sortCol || {}
            }

            console.log('query', query);
            $('#actionLogTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getActionLogPageReport', query, function (data) {
                $('#actionLogTableSpin').hide();
                console.log('ActionLog report', data);
                vm.actionLogQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawActionLogReportTable(data.data.data.map(item => {
                    item.operationTime$ = utilService.$getTimeFromStdTimeFormat(item.operationTime);
                    return item;
                }), vm.actionLogQuery.totalCount, newSearch);

            }, function (err) {
                $('#actionLogTableSpin').hide();
            }, true);
        }

        vm.drawActionLogReportTable = function (data, size, newSearch) {
            console.log('data', data);
            var tableOptions = {

                data: data,
                "order": vm.actionLogQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'adminName', 'aTargets': [0]},
                    {'sortCol': 'action', 'aTargets': [1]},
                    {'sortCol': 'operationTime', 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' '}],
                columns: [
                    {title: $translate("adminName"), data: "adminName"},
                    {title: $translate('playerId'), data: "playerId"},
                    {title: $translate('TYPE'), data: "action"},
                    {title: $translate("Operation Time"), data: "operationTime$"},
                    {title: $translate("remark"), data: "error", bSortable: false}
                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            var a = utilService.createDatatableWithFooter("#actionLogTable", tableOptions, {});
            vm.actionLogQuery.pageObj.init({maxCount: size}, newSearch);

            $("#actionLogTable").off('order.dt');
            $("#actionLogTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'actionLogQuery', vm.searchActionLogData);
            });
            $("#actionLogTable").resize();
        }
        /////////////////////////////////////////////////////////////////////////////////////////////////

        // start common functions//////////////////
        vm.createInnerTable = function (id) {
            var content = $('<div>', {
                style: "display:inline-block"
            });
            var div1 = $('<div>', {
                class: 'divTableIndentWrap',
                style: 'width:' + vm.tableIndentWidth + 'px;'
            });
            var label = $('<label>', {
                class: "margin-left-5",
                id: id + 'label',
                style: 'width:100%;display: block'
            });

            div1.append($('<div>', {
                class: 'tableWrapRight',
                style: 'margin-left:' + vm.tableIndentWidth / 3 + 'px;width:' + vm.tableIndentWidth / 3 + 'px;'
            }))
            var div2 = $('<div>', {
                style: 'display: inline-block;width:calc(100% - ' + vm.tableIndentWidth + 'px',
            });
            div2.append(label);
            div2.append($('<table>', {
                id: id,
                "data-curPage": 1,
                "data-limit": 10,
                class: 'display',
                style: 'width:100%'
            }));
            div2.append($('<div>', {
                id: id + 'Page',
                style: 'width:100%'
            }));
            content.append(div1, div2);
            return content.html();
        }

        // debug use
        vm.testCashOutAPI = function (startTime, endTime) {
            let sendQuery = {
                platformId: vm.selectedPlatform.platformId,
                startTime: startTime,
                endTime: endTime
            };
            return $scope.$socketPromise('testPMSCashoutAPI', sendQuery)
                .then(function (data) {
                    console.log('testAPIData', data);
                });
        };

        vm.getStatusStrfromRow = function (row) {
            if (row.status) {
                return row.status;
            } else if (row.process) {
                return row.process.status;
            } else return 'Unknown';
        }

        vm.setPanel = function (isSet) {
            vm.hideLeftPanel = isSet;
            $cookies.put("reportShowLeft", vm.hideLeftPanel);
            $scope.safeApply();
        }

        vm.commonInitTime = function (obj, queryId) {
            if (!obj) return;
            obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
            var lastMonth = utilService.setNDaysAgo(new Date(), 1);
            var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            obj.startTime.data('datetimepicker').setLocalDate(new Date(lastMonthDateStartTime));

            obj.endTime = utilService.createDatePicker(queryId + ' .endTime', {
                language: 'en',
                format: 'yyyy/MM/dd hh:mm:ss'
            });
            obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
        }

        vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
            var isChange = false;
            if (pageSize != vm[objKey].limit) {
                isChange = true;
                vm[objKey].limit = pageSize;
            }
            if ((curP - 1) * pageSize != vm[objKey].index) {
                isChange = true;
                vm[objKey].index = (curP - 1) * pageSize;
            }
            if (isChange) return searchFunc.call(this);
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

        // end common functions //////////////////////////////////////////

        function getDayStartTime() {
            var timezoneDiff = Math.floor(8 + (new Date().getTimezoneOffset() / 60));
            var midnightThisMorningSG = new Date();
            midnightThisMorningSG = new Date(midnightThisMorningSG.getTime() + timezoneDiff * 60 * 60 * 1000);
            midnightThisMorningSG.setHours(0, 0, 0, 0);
            midnightThisMorningSG = new Date(midnightThisMorningSG.getTime() - timezoneDiff * 60 * 60 * 1000);
            return midnightThisMorningSG;
        }

        /**
         * @param {[]} providersToSettle
         * @param {Date} settlementDate
         * @returns {Promise.<{}>}
         */
        function settleProvidersInList(providersToSettle, settlementDate) {
            //todo: temp disable settlement here
            return Promise.resolve({});

            // We will empty this list, so make a copy first
            providersToSettle = providersToSettle.slice(0);
            console.log(`Performing settlement for ${providersToSettle.length} providers`);
            var settlementSuccessCount = 0;
            var settlementFailureCount = 0;

            function settleRemainingProviders() {
                if (providersToSettle.length > 0) {
                    var nextProvider = providersToSettle.shift();
                    vm.operationReportLoadingStatus = `${$translate("SETTLING")} ${$translate("PROVIDER")} ${nextProvider.name}`;
                    $scope.safeApply();
                    return doSettlementForProvider(nextProvider, settlementDate).then(
                        data => {
                            console.log(`Settlement for ${nextProvider.name} done:`, data);
                            settlementSuccessCount++;
                        },
                        error => {
                            console.warn(`Settlement for ${nextProvider.name} failed!`, error);
                            settlementFailureCount++;
                        }
                    ).then(
                        () => settleRemainingProviders()
                    );
                } else {
                    return Promise.resolve();
                }
            }

            return settleRemainingProviders().then(
                () => {
                    var failureReportMessage = settlementFailureCount > 0
                        ? `${settlementFailureCount} ${$translate("Settlemens failed")}. `
                        : ``;
                    return {
                        settlementSuccessCount: settlementSuccessCount,
                        settlementFailureCount: settlementFailureCount,
                        failureReportMessage: failureReportMessage,
                    };
                }
            );
        }

        function doSettlementForProvider(provider, date) {
            return new Promise((resolve, reject) => {
                socketService.$socket($scope.AppSocket, 'manualDailyProviderSettlement', {
                    providerId: provider._id,
                    settlementDay: date,
                }, resolve, reject);

            });
        }

        function getProviderWithObjId(providerObjId) {
            return vm.allProviders.find(p => p._id === providerObjId);
        }

        vm.getProposalTypeOptionValue = function (proposalType) {
            var result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };
        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {

            setTimeout(
                function () {
                    vm.playerReport = {};
                    vm.playerPlatformReport = {};
                    vm.playerGameReport = {};
                    vm.playerTable = {};
                    vm.gameTable = {};
                    vm.tableIndentWidth = 60;
                    vm.showPageName = $translate("NO_REPORT_TYPE_MESSAGE");
                    $scope.platId = '';
                    vm.innerTable = {};
                    vm.hideLeftPanel = false;
                    // console.log('ISODate("2016-04-12T16:00:00.311Z")',new Date("2016-04-12T16:00:00.311Z"));

                    var showLeft = $cookies.get("reportShowLeft");
                    if (showLeft === 'true') {
                        vm.setPanel(true)
                    }

                    socketService.$socket($scope.AppSocket, 'getAllGameTypes', {}, function (data) {
                        vm.gameAllTypes = data.data;
                        //console.log("getAllGameTypes",vm.gameAllTypes);
                        $scope.safeApply();
                    }, function (data) {
                        console.log("create not", data);
                    });

                    if (!authService.checkViewPermission('Report', 'General', 'Read')) {
                        return;
                    }
                    socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                        vm.platformList = data.data;
                        //console.log("platformList", vm.platformList);
                        if (vm.platformList.length == 0)return;
                        var storedPlatform = $cookies.get("platform");
                        var tPlat = {};
                        if (storedPlatform) {
                            vm.platformList.forEach(
                                platform => {
                                    if (platform.name == storedPlatform) {
                                        tPlat = platform;
                                    }
                                }
                            );
                        } else {
                            tPlat = vm.platformList[0];
                        }
                        vm.selectedPlatform = tPlat;
                        vm.selectedPlatformID = tPlat._id;
                        vm.setPlatform(JSON.stringify(tPlat));
                        $scope.safeApply();
                    });
                    // socketService.$socket($scope.AppSocket, 'getAllProposalStatus', {}, function (data) {
                    //     delete data.data.APPROVED;
                    //     delete data.data.REJECTED;
                    //     delete data.data.PROCESSING;
                    //     vm.proposalStatusList = data.data;
                    //     //console.log("proposalStatusList", vm.proposalStatusList);
                    //     $scope.safeApply();
                    //     //if (vm.proposalStatusList.length == 0)return;
                    //     //vm.selectedStatus = vm.proposalStatusList[0];
                    // }, function (data) {
                    //     console.log("create not", data);
                    // });

                    // socketService.$socket($scope.AppSocket, 'getAllFeedbackResultList', {}, function (data) {
                    //     vm.feedbackResultList = data.data;
                    //     //console.log("proposalStatusList", vm.proposalStatusList);
                    //     $scope.safeApply();
                    //     //if (vm.proposalStatusList.length == 0)return;
                    //     //vm.selectedStatus = vm.proposalStatusList[0];
                    // }, function (data) {
                    //     console.log("create not", data);
                    // });

                    vm.playerFeedbackQuery = vm.playerFeedbackQuery || {};

                    // socketService.$socket($scope.AppSocket, 'getAllTopUpType', {}, function (data) {
                    //     vm.topUpTypeList = data.data;
                    //     console.log("getAllTopUpType", vm.topUpTypeList);
                    //     $scope.safeApply();
                    // }, function (data) {
                    //     console.log("create not", data);
                    // });

                    vm.rewardNamePage = {
                        "FirstTopUp": "FIRST_TOPUP_REWARD_REPORT",
                        "PlayerConsumptionReturn": "PLAYER_CONSUMPTION_RETURN_REPORT",
                        "FullAttendance": "FULL_ATTENDANCE_REPORT",
                        "PartnerConsumptionReturn": "PARTNER_CONSUMPTION_REPORT",
                        "PartnerIncentiveReward": "PARTNER_INCENTIVE_REPORT",
                        "PartnerReferralReward": "PARTNER_REFERRAL_REPORT",
                        "GameProviderReward": "PROVIDER_REPORT",
                        "PlatformTransactionReward": "TRANSACTION_REPORT",
                        "PlayerTopUpReturn": "PLAYER_TOP_UP_RETURN_REPORT",
                        "PlayerConsumptionIncentive": "PLAYER_CONSUMPTION_INCENTIVE_REPORT",
                        "PlayerLevelUp": "PLAYER_LEVEL_UP_REPORT",
                        "PartnerTopUpReturn": "PARTNER_TOP_UP_RETURN_REPORT",
                        "PlayerTopUpReward": "PLAYER_TOP_UP_REWARD_REPORT",
                        "PlayerReferralReward": "PLAYER_REFERRAL_REWARD_REPORT"
                    }

                    vm.topupTypeJson = {
                        '1': 'NetPay',
                        '2': 'WechatQR',
                        '3': 'AlipayQR',
                        '4': 'WechatApp',
                        '5': 'AlipayApp',
                        '6': 'FASTPAY',
                        '7': 'QQPAYQR'
                    };
                }
            );

        });
    };
    myApp.register.controller('reportCtrl', reportController);
});
