'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorPaymentController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies, commonService) {
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let vm = this;

        window.VM = vm;
        // vm.pp = $scope.$parent.vm.selectStoredPlatform; // it work
        // console.log('mVM', monitorVM) // it work

        // declare constant

        vm.playerInputDevice = $scope.constPlayerRegistrationInterface;
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
            TOPUPMANUAL: 1,
            TOPUPONLINE: 2,
            ALIPAY: 3,
            WechatPay: 4,
            CommonTopUp: 6
        };
        vm.getDepositMethodbyId = {
            1: 'Online',
            2: 'ATM',
            3: 'Counter',
            4: 'AliPayTransfer',
            5: 'weChatPayTransfer',
            6: 'CloudFlashPay',
            7: 'CloudFlashPayTransfer'
        };
        vm.topUpField = {
            "ManualPlayerTopUp": 'bankCardNo',
            "PlayerAlipayTopUp": 'alipayAccount',
            "PlayerWechatTopUp": 'wechatAccount',
            "PlayerTopUp": 'merchantNo'
        }

        vm.newPlayerListStatus = {
            SUCCESS: "SUCCESS",
            ATTEMPT: "ATTEMPT",
            MANUAL: "MANUAL",
            NOVERIFY: "NoVerify"
        };

        vm.constProposalStatus = {
            PREPENDING: "PrePending",
            PENDING: "Pending",
            AUTOAUDIT: "AutoAudit",
            PROCESSING: "Processing",
            APPROVED: "Approved",
            REJECTED: "Rejected",
            SUCCESS: "Success",
            FAIL: "Fail",
            CANCEL: "Cancel",
            EXPIRED: "Expired",
            UNDETERMINED: "Undetermined",
            RECOVER: "Recover",
            MANUAL: "Manual",
            NOVERIFY: "NoVerify"
        };

        vm.allPlayersStatusString = {
            NORMAL: 1,
            FORBID_GAME: 2,
            FORBID: 3,
            BALCKLIST: 4,
            ATTENTION: 5,
            LOGOFF: 6,
            CHEAT_NEW_ACCOUNT_REWARD: 7,
            TOPUP_ATTENTION: 8,
            HEDGING: 9,
            TOPUP_BONUS_SPAM: 10,
            MULTIPLE_ACCOUNT: 11,
            BANNED: 12,
            FORBID_ONLINE_TOPUP: 13,
            BAN_PLAYER_BONUS: 14
        };

        vm.proposalTemplate = {
            1: '#modalProposal',
            2: '#newPlayerModal'
        };

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
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getCredibilityRemarksByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            vm.getPlatformGameData(vm.getProviderLatestTimeRecord);
            commonService.getSMSTemplate($scope, vm.selectedPlatform._id).then(data => {
                if (data) {
                    vm.smsTemplate = data ? data : [];
                }
            }).catch(err => Promise.resolve([]));
            initPageParam();
            vm.initPlayerModal();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage("PAYMENT_MONITOR"); // 5
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
                        vm.platformByAdminId = data.data.map(item => {
                            item.platformId$ = item.platformId ? Number(item.platformId) : '';

                            return item;
                        });
                        commonService.sortAndAddPlatformDisplayName(vm.platformByAdminId);
                    })
                }, function (error){
                    console.error(error);
                });
            }
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
            let result = utilService.getProposalGroupValue(proposalType);
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

        vm.loadPage = function () {
            socketService.clearValue();
            vm.monitorConsumptionRecordPlatform = null;
            vm.getPlatformByAdminId();
            if(window.location.pathname == "/monitor/payment"){
                vm.preparePaymentMonitorPage();
            }
            else if (window.location.pathname == '/monitor/paymentTotal'){
                vm.preparePaymentMonitorTotalPage();
            }
        };

        vm.initFeedBackData = function () {
            commonService.getAllPlayerFeedbackResults($scope).then(
                data => {
                    vm.allPlayerFeedbackResults = data;
                    $scope.$evalAsync();
                }
            )
        }

        vm.initFeedbackTopic = function () {
            commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform._id).then(
                data => {
                    vm.playerFeedbackTopic = data;
                    $scope.$evalAsync();
                }
            )
        }

        vm.monitorConsumptionRecordPlatformOnChange = function () {
            vm.getPlatformGameData(vm.getProviderLatestTimeRecord);
        }

        vm.getProviderLatestTimeRecord = function () {
            vm.providerLatestTimeRecord = [];
            let longestDelayDate = new Date().toString();

            let providerIdArr = [];
            vm.lastConsumptionRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.platformProviderList.forEach(p => {
                if (p && p.providerId) {
                    providerIdArr.push(p.providerId);
                }
            })

            let sendData = {
                platformObjId: vm.monitorConsumptionRecordPlatform || vm.selectedPlatform._id,
                providerIdList: providerIdArr
            }

            socketService.$socket($scope.AppSocket, 'getProviderLatestTimeRecord', sendData, function (data) {
                $scope.$evalAsync(() => {
                    $('#consumptionRecordSpin').hide();
                    console.log("getProviderLatestTimeRecord", data.data)
                    if (data && data.data && data.data.length > 0) {
                        data.data.map(d => {
                            if (d) {
                                if (d.createTime) {
                                    d.createTime = vm.dateReformat(d.createTime);

                                    if (d.createTime < longestDelayDate) {
                                        longestDelayDate = d.createTime
                                        vm.longestDelayStatus = d.delayStatusColor;
                                    }
                                }
                            }
                            return;
                        })

                        vm.providerLatestTimeRecord = data.data;
                    }
                })
            });
        };

        vm.getPlatformGameData = function (callback) {
            //init gametab start===============================
            vm.SelectedProvider = null;
            vm.showGameCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            //console.log("getGames", gameIds);
            let platformQuery = vm.monitorConsumptionRecordPlatform ? vm.monitorConsumptionRecordPlatform : vm.selectedPlatform.id;
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: platformQuery}, function (data) {
                console.log('getPlatform', data.data);
                //provider list init
                vm.platformProviderList = data.data.gameProviders;
                vm.platformProviderList.forEach(item => {
                    if (item.batchCreditTransferOutStatus && item.batchCreditTransferOutStatus[vm.selectedPlatform.id]) {
                        item.batchCreditTransferOut = item.batchCreditTransferOutStatus[vm.selectedPlatform.id];
                    }
                });
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

                //provider delay status init
                // vm.getProviderLatestTimeRecord();

                if (callback && callback instanceof Function) {
                    callback();
                }
            })
        };


        vm.refreshConsumptionRecord = function (isNewRefresh) {
            if (isNewRefresh) {
                vm.refreshTime = 600;
            }
            $('#consumptionRecordSpin').show();
            vm.lastConsumptionRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.getProviderLatestTimeRecord();
        }

        vm.refreshTime = 600;
        vm.countBySec = setInterval (function () {
            const checkBox = $('#autoRefreshConsumptionFlag');
            const isChecked = checkBox && checkBox.length > 0 && checkBox[0].checked;
            const refreshMessage = $('#timeLeftRefreshOperation')[0];
            if (isChecked){
                $(refreshMessage).parent().removeClass('hidden');
                if(vm.refreshTime < 0){
                    vm.refreshTime = 600;
                }
                if(vm.refreshTime === 0){
                    vm.refreshTime = 600;
                    vm.refreshConsumptionRecord();
                }
                vm.refreshTime--;
            } else{
                vm.refreshTime = -1;
                $(refreshMessage).parent().addClass('hidden');
            }

            if (window.location.pathname != '/monitor/consumptionRecord') {
                clearInterval(vm.countBySec);
            }
            $scope.$evalAsync();
        }, 1000);

        vm.paymentTotalRefreshTime = 120;
        vm.paymentTotalCountBySec = setInterval (function () {
                const checkBox = $('#paymentTotalAutoRefreshProposalFlag');
                const isChecked = checkBox && checkBox.length > 0 && checkBox[0].checked;
                const refresh = $('#timeLeftRefreshOperation')[0];
                if (isChecked){
                    $(refresh).parent().removeClass('hidden');
                    if(vm.paymentTotalRefreshTime < 0){
                        vm.paymentTotalRefreshTime = 120;
                    }
                    if(vm.paymentTotalRefreshTime === 0){
                        vm.paymentTotalRefreshTime = 120;
                        vm.getPaymentMonitorTotalRecord();
                        vm.getPaymentMonitorTotalCompletedRecord();
                    }
                    vm.paymentTotalRefreshTime--;
                } else{
                    vm.paymentTotalRefreshTime = -1;
                    $(refresh).parent().addClass('hidden');
                }

                if (window.location.pathname != '/monitor/paymentTotal') {
                    clearInterval(vm.paymentTotalCountBySec);
                }
                $scope.$evalAsync();
        }, 1000);

        function initPageParam() {
            vm.queryPara = {};
            vm.addPlayerFeedbackResultData = {};
            vm.deletePlayerFeedbackResultData = {};
            vm.addPlayerFeedbackTopicData = {};
            vm.deletePlayerFeedbackTopicData = {};
        }

        vm.initPlayerModal = function () {
            $('#newPlayerListTab').addClass('active');
            $('#attemptNumberListTab').removeClass('active');
            $scope.safeApply();
            vm.playerModalTab = "newPlayerListPanel";
            vm.newPlayerList();
            vm.initFeedBackData();
            vm.initFeedbackTopic();
        };

        vm.initQueryTimeFilter = function (field, callback) {
            vm.queryPara[field] = {};
            utilService.actionAfterLoaded(('#' + field ), function () {
                vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + ' .startTime');
                vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + ' .endTime');
                vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));

                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });

        }

        vm.initFeedbackModal = function (rowData) {
            if (rowData && rowData.playerId) {
                $('#addFeedbackTab').addClass('active');
                $('#feedbackHistoryTab').removeClass('active');
                $scope.safeApply();
                vm.feedbackModalTab = "addFeedbackPanel";
            }

            if (rowData && rowData.partnerId) {
                $('#addPartnerFeedbackTab').addClass('active');
                $('#partnerFeedbackHistoryTab').removeClass('active');
                $scope.safeApply();
                vm.feedbackModalTabPartner = "addPartnerFeedbackPanel";
            }
        };

        vm.prepareShowFeedbackRecord = function (rowData) {
            if (rowData && rowData.playerId) {
                vm.playerFeedbackRecord = vm.playerFeedbackRecord || {totalCount: 0};
                utilService.actionAfterLoaded('#modalAddPlayerFeedback .searchDiv .startTime', function () {
                    vm.playerFeedbackRecord.startTime = utilService.createDatePicker('#modalAddPlayerFeedback .searchDiv .startTime');
                    vm.playerFeedbackRecord.endTime = utilService.createDatePicker('#modalAddPlayerFeedback .searchDiv .endTime');
                    vm.playerFeedbackRecord.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 365)));
                    vm.playerFeedbackRecord.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));

                    utilService.actionAfterLoaded('#playerFeedbackRecord', function () {
                        vm.playerFeedbackRecord.pageObj = utilService.createPageForPagingTable("#playerFeedbackRecordTablePage", {}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "playerFeedbackRecord", vm.getFeedbackRecord)
                        });
                        vm.getFeedbackRecord(true);
                    });
                });
            }
        };

        vm.getFeedbackRecord = function (newSearch) {
            vm.playerFeedbackRecord.searching = true;
            let queryData = {
                query: {
                    startTime: vm.playerFeedbackRecord.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerFeedbackRecord.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.selectedSinglePlayer._id
                },
                limit: newSearch ? 10 : (vm.playerFeedbackRecord.limit || 10),
                index: newSearch ? 0 : (vm.playerFeedbackRecord.index || 0),
                sortCol: vm.playerFeedbackRecord.sortCol || null
            };
            console.log("queryData", queryData);
            vm.prepareFeedbackRecord(queryData, newSearch);
        }

        vm.prepareFeedbackRecord = function (queryData, newSearch) {
            vm.playerFeedbackData = [];
            socketService.$socket($scope.AppSocket, 'getPlayerFeedbackReport', queryData, function (data) {
                console.log('getPlayerFeedback', data);

                vm.playerFeedbackData = data.data.data;
                vm.playerFeedbackRecord.totalCount = data.data.size;
                vm.playerFeedbackRecord.searching = false;

                var tableData = vm.playerFeedbackData.map(
                    record => {
                        let resultName;
                        if(!record.resultName) {
                            resultName = utilService.getPlayerFeedbackResultName(vm.allPlayerFeedbackResults, record.result);
                        }

                        record.createTime = (record && record.createTime) ? vm.dateReformat(record.createTime) : "";
                        record.result = (record && record.resultName) ? record.resultName :
                            (resultName ? resultName : $translate(record.result));
                        record.content = (record && record.content) ? record.content : "";
                        record.adminName = (record && record.adminId && record.adminId.adminName) ? record.adminId.adminName : "";
                        record.topic = (record && record.topic) ? record.topic : "";
                        return record
                    }
                );
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('TIME'), data: "createTime"},
                        {title: $translate('RESULT'), data: "result"},
                        {title: $translate('CONTENT'), data: "content"},
                        {title: $translate('adminName'), data: "adminName"},
                        {title: $translate('FEEDBACK_TOPIC'), data: "topic"}
                    ],
                    bSortClasses: false,
                    destroy: true,
                    paging: false,
                    autoWidth: true,
                    fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $compile(nRow)($scope);
                    }
                });
                var a = utilService.createDatatableWithFooter('#playerFeedbackRecordTable', option, {});
                vm.playerFeedbackRecord.pageObj.init({maxCount: vm.playerFeedbackRecord.totalCount}, newSearch);
                $("#playerFeedbackRecordTable").off('order.dt');
                $("#playerFeedbackRecordTable").on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'playerFeedbackRecord', vm.getFeedbackRecord);
                });
                $('#playerFeedbackRecordTable').resize();
                $scope.safeApply();
            });
        };

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

                vm.playerFeedbackData.data.forEach(item => {
                    item.result$ = item.resultName ? item.resultName : $translate(item.result);
                });

                $scope.safeApply();
                vm.updateDataTableinModal(modalId, tableId, opt)
            });
        };

        vm.clearFeedBackResultDataStatus = function (rowData) {
            if (rowData && rowData.playerId) {
                vm.addPlayerFeedbackResultData.message = null;
                vm.addPlayerFeedbackResultData.success = null;
                vm.addPlayerFeedbackResultData.failure = null;

                vm.deletePlayerFeedbackResultData.message = null;
                vm.deletePlayerFeedbackResultData.success = null;
                vm.deletePlayerFeedbackResultData.failure = null;
            }

            if (rowData && rowData.partnerId) {
                vm.addPartnerFeedbackResultData.message = null;
                vm.addPartnerFeedbackResultData.success = null;
                vm.addPartnerFeedbackResultData.failure = null;

                vm.deletePartnerFeedbackResultData.message = null;
                vm.deletePartnerFeedbackResultData.success = null;
                vm.deletePartnerFeedbackResultData.failure = null;
            }
        };

        vm.addFeedbackResult = function (rowData) {
            vm.clearFeedBackResultDataStatus(rowData);
            let reqData = {};

            if (rowData && rowData.playerId) {
                reqData.key = vm.addPlayerFeedbackResultData.key;
                reqData.value = vm.addPlayerFeedbackResultData.value;
                console.log(reqData);
                return $scope.$socketPromise('createPlayerFeedbackResult', reqData).then(
                    () => {
                        $scope.$evalAsync(async () => {
                            vm.addPlayerFeedbackResultData.message = "SUCCESS";
                            vm.addPlayerFeedbackResultData.success = true;
                            vm.allPlayerFeedbackResults = await commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([]));
                        })
                    },
                    function (err) {
                        console.log("vm.addPlayerFeedbackResults()ErrIn", err);
                        vm.addPlayerFeedbackResultData.message = "FAILURE";
                        vm.addPlayerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                );
            }

            if (rowData && rowData.partnerId) {
                reqData.key = vm.addPartnerFeedbackResultData.key;
                reqData.value = vm.addPartnerFeedbackResultData.value;
                console.log(reqData);
                return $scope.$socketPromise('createPartnerFeedbackResult', reqData).then(
                    () => {
                        $scope.$evalAsync(async () => {
                            vm.addPartnerFeedbackResultData.message = "SUCCESS";
                            vm.addPartnerFeedbackResultData.success = true;
                            vm.allPartnerFeedbackResults = await commonService.getAllPartnerFeedbackResults($scope).catch(err => Promise.resolve([]));
                        })
                    },
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()ErrIn", err);
                        vm.addPartnerFeedbackResultData.message = "FAILURE";
                        vm.addPartnerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()ErrOut", err);
                        vm.addPartnerFeedbackResultData.message = "FAILURE";
                        vm.addPartnerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                );
            }
        };

        vm.deleteFeedbackResult = function (rowData) {
            vm.clearFeedBackResultDataStatus(rowData);
            let reqData = {};

            if (rowData && rowData.playerId) {
                reqData._id = vm.deletePlayerFeedbackResultData._id;
                return $scope.$socketPromise('deletePlayerFeedbackResult', reqData).then(
                    function (data) {
                        $scope.$evalAsync(async () => {
                            vm.deletePlayerFeedbackResultData.message = "SUCCESS";
                            vm.deletePlayerFeedbackResultData.success = true;
                            vm.allPlayerFeedbackResults = await commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([]));
                        })
                    },
                    function (err) {
                        console.log("vm.addPlayerFeedbackResults()ErrIn", err);
                        vm.deletePlayerFeedbackResultData.message = "FAILURE";
                        vm.deletePlayerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                );
            }

            if (rowData && rowData.partnerId) {
                reqData._id = vm.deletePartnerFeedbackResultData._id;
                return $scope.$socketPromise('deletePartnerFeedbackResult', reqData).then(
                    () => {
                        $scope.$evalAsync(async () => {
                            vm.deletePartnerFeedbackResultData.message = "SUCCESS";
                            vm.deletePartnerFeedbackResultData.success = true;
                            vm.allPartnerFeedbackResults = await commonService.getAllPartnerFeedbackResults($scope).catch(err => Promise.resolve([]));
                        })
                    },
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()ErrIn", err);
                        vm.deletePartnerFeedbackResultData.message = "FAILURE";
                        vm.deletePartnerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()Out", err);
                        vm.deletePartnerFeedbackResultData.message = "FAILURE";
                        vm.deletePartnerFeedbackResultData.failure = true;
                        $scope.safeApply();
                    }
                );
            }
        };

        vm.clearFeedBackTopicDataStatus = function (rowData) {
            if (rowData && rowData.playerId) {
                vm.addPlayerFeedbackTopicData.message = null;
                vm.addPlayerFeedbackTopicData.success = null;
                vm.addPlayerFeedbackTopicData.failure = null;

                vm.deletePlayerFeedbackTopicData.message = null;
                vm.deletePlayerFeedbackTopicData.success = null;
                vm.deletePlayerFeedbackTopicData.failure = null;
            }

            if (rowData && rowData.partnerId) {
                vm.addPartnerFeedbackTopicData.message = null;
                vm.addPartnerFeedbackTopicData.success = null;
                vm.addPartnerFeedbackTopicData.failure = null;

                vm.deletePartnerFeedbackTopicData.message = null;
                vm.deletePartnerFeedbackTopicData.success = null;
                vm.deletePartnerFeedbackTopicData.failure = null;
            }
        };

        vm.addFeedbackTopic = function (rowData) {
            vm.clearFeedBackTopicDataStatus(rowData);
            let reqData = {};

            if (rowData && rowData.playerId) {
                reqData.key = vm.addPlayerFeedbackTopicData.value;
                reqData.value = vm.addPlayerFeedbackTopicData.value;
                reqData.platform = vm.selectedPlatform._id;
                console.log(reqData);
                return $scope.$socketPromise('createPlayerFeedbackTopic', reqData).then(
                    () => $scope.$evalAsync(async () => {
                        vm.addPlayerFeedbackTopicData.message = "SUCCESS";
                        vm.addPlayerFeedbackTopicData.success = true;
                        vm.playerFeedbackTopic = await commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform._id).catch(err => Promise.resolve([]));
                    }),
                    function (err) {
                        console.log("vm.addPlayerFeedbackTopics()ErrIn", err);
                        vm.addPlayerFeedbackTopicData.message = "FAILURE";
                        vm.addPlayerFeedbackTopicData.failure = true;
                        if(err.error && err.error.error && err.error.error.code == '11000'){
                            vm.addPlayerFeedbackTopicData.message = '失败，回访主题已存在'
                        }
                        $scope.safeApply();
                    }
                );
            }

            if (rowData && rowData.partnerId) {
                reqData.key = vm.addPartnerFeedbackTopicData.value;
                reqData.value = vm.addPartnerFeedbackTopicData.value;
                reqData.platform = vm.selectedPlatform._id;
                console.log(reqData);
                return $scope.$socketPromise('createPartnerFeedbackTopic', reqData).then(
                    () => $scope.$evalAsync(async () => {
                        vm.addPartnerFeedbackTopicData.message = "SUCCESS";
                        vm.addPartnerFeedbackTopicData.success = true;
                        vm.partnerFeedbackTopic = await commonService.getPartnerFeedbackTopic($scope, vm.selectedPlatform._id).catch(err => Promise.resolve([]));
                    }),
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()ErrIn", err);
                        vm.addPartnerFeedbackTopicData.message = "FAILURE";
                        vm.addPartnerFeedbackTopicData.failure = true;
                        if(err.error && err.error.error && err.error.error.code == '11000'){
                            vm.addPartnerFeedbackTopicData.message = '失败，回访主题已存在'
                        }
                        $scope.safeApply();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()ErrOut", err);
                        vm.addPartnerFeedbackTopicData.message = "FAILURE";
                        vm.addPartnerFeedbackTopicData.failure = true;
                        $scope.safeApply();
                    }
                );
            }
        };

        vm.deleteFeedbackTopic = function (rowData) {
            vm.clearFeedBackTopicDataStatus(rowData);
            let reqData = {};

            if (rowData && rowData.playerId) {
                reqData._id = vm.deletePlayerFeedbackTopicData._id;
                return $scope.$socketPromise('deletePlayerFeedbackTopic', reqData).then(
                    () => $scope.$evalAsync(async () => {
                        vm.deletePlayerFeedbackTopicData.message = "SUCCESS";
                        vm.deletePlayerFeedbackTopicData.success = true;
                        vm.playerFeedbackTopic = await commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform._id).catch(err => Promise.resolve([]));
                    }),
                    function (err) {
                        console.log("vm.addPlayerFeedbackTopics()ErrIn", err);
                        vm.deletePlayerFeedbackTopicData.message = "FAILURE";
                        vm.deletePlayerFeedbackTopicData.failure = true;
                        $scope.safeApply();
                    }
                );
            }

            if (rowData && rowData.partnerId) {
                reqData._id = vm.deletePartnerFeedbackTopicData._id;
                return $scope.$socketPromise('deletePartnerFeedbackTopic', reqData).then(
                    () => $scope.$evalAsync(async () => {
                        vm.deletePartnerFeedbackTopicData.message = "SUCCESS";
                        vm.deletePartnerFeedbackTopicData.success = true;
                        vm.partnerFeedbackTopic = await commonService.getPartnerFeedbackTopic($scope, vm.selectedPlatform._id).catch(err => Promise.resolve([]));
                    }),
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()ErrIn", err);
                        vm.deletePartnerFeedbackTopicData.message = "FAILURE";
                        vm.deletePartnerFeedbackTopicData.failure = true;
                        $scope.safeApply();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()Out", err);
                        vm.deletePartnerFeedbackTopicData.message = "FAILURE";
                        vm.deletePartnerFeedbackTopicData.failure = true;
                        $scope.safeApply();
                    }
                );
            }
        };

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

        vm.newPlayerList = function () {

            vm.newPlayerRecords = {totalCount: 0};
            vm.initQueryTimeFilter('newPlayerRecords', function () {
                // $('#modalNewPla').modal();
                vm.newPlayerRecords.pageObj = utilService.createPageForPagingTable("#newPlayerListTablePage", {pageSize: 100}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "newPlayerRecords", vm.getNewPlayerListByFilter)
                });

                vm.getNewPlayerListByFilter(true);

            });
        };


        vm.getIpAreaName = function (ipArea) {
            let result = '';
            let province = ipArea.province ? ipArea.province : '';
            let city = ipArea.city ? ipArea.city : '';
            if (province && city) {
                result = province + ', ' + city;
            }else if(province){
                result = province;
            }else if(city){
                result = city;
            }
            return result
        }

        vm.playerListTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            vm.operatePlayerListTableRow(nRow, aData, iDisplayIndex, iDisplayIndexFull);
        };

        vm.operatePlayerListTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            let smsExpiredDate = new Date();
            smsExpiredDate = smsExpiredDate.setMinutes(smsExpiredDate.getMinutes() - vm.selectedPlatform.smsVerificationExpireTime);
            let createTime = Date.parse(aData.createTime);
            switch (true) {
                case ((aData.status == vm.constProposalStatus.PENDING) && (aData.$playerAllCount - aData.$playerCurrentCount == 0 && createTime >= smsExpiredDate)): {
                    $(nRow).css('background-color', 'rgba(255, 153, 153, 100)', 'important');
                    //$(nRow).css('background-color > .sorting_1', 'rgba(255, 209, 202, 100)','important');
                    break;
                }
                case ((aData.status == vm.constProposalStatus.PENDING) && (aData.$playerAllCount - aData.$playerCurrentCount > 0 || createTime < smsExpiredDate)): {
                    $(nRow).css('background-color', 'rgba(153, 153, 153, 100)', 'important');
                    break;
                }
                default: {
                    $(nRow).css('background-color', 'rgba(255, 255, 255, 100)');
                    break;
                }
            }
        };

        vm.getNewPlayerListByFilter = function (newSearch) {
            var selectedStatus;

            if (vm.queryPara.newPlayerList) {
                if (vm.queryPara.newPlayerList.status == "ATTEMPT") {
                    selectedStatus = [vm.constProposalStatus.PENDING];
                } else {
                    selectedStatus = [vm.constProposalStatus[vm.queryPara.newPlayerList.status]];
                }
            }
            else {
                selectedStatus = [vm.constProposalStatus.MANUAL, vm.constProposalStatus.SUCCESS, vm.constProposalStatus.PENDING, vm.constProposalStatus.NOVERIFY];
            }

            var sendData = {
                adminId: authService.adminId,
                platformId: vm.queryPara.newPlayerList && vm.queryPara.newPlayerList.platform && vm.queryPara.newPlayerList.platform.length > 0 ? vm.queryPara.newPlayerList.platform : vm.platformByAdminId.map(platform => platform._id),
                type: ["PlayerRegistrationIntention"],
                startDate: vm.queryPara.newPlayerRecords.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.newPlayerRecords.endTime.data('datetimepicker').getLocalDate(),
                name: vm.queryPara.newPlayerList ? vm.queryPara.newPlayerList.playerName : null,
                phoneNumber: vm.queryPara.newPlayerList ? vm.queryPara.newPlayerList.phoneNumber : null,
                // entryType: vm.queryProposalEntryType,
                size: newSearch ? 100 : (vm.newPlayerRecords.limit || 100),
                index: newSearch ? 0 : (vm.newPlayerRecords.index || 0),
                sortCol: vm.newPlayerRecords.sortCol || null,
                displayPhoneNum: true

            }

            if (selectedStatus && selectedStatus != "") {
                sendData.status = selectedStatus
            } else {
                sendData.status = [vm.constProposalStatus.MANUAL, vm.constProposalStatus.SUCCESS, vm.constProposalStatus.PENDING, vm.constProposalStatus.NOVERIFY];
            }

            vm.newPlayerRecords.loading = true;
            console.log("Query", sendData);
            vm.prepareNewPlayerListRecords(sendData, newSearch);
            $("#newPlayerListTable").off('order.dt');
            $("#newPlayerListTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'newPlayerRecords', vm.getNewPlayerListByFilter);
            });
        };

        vm.playerRegistrationSuccessRateList = function () {
            vm.playerRegistrationRecords = {totalCount: 0};
            vm.initQueryTimeFilter('attemptNumberRecords', function () {
                vm.playerRegistrationRecords.pageObj = utilService.createPageForPagingTable("#playerRegistrationIntentRecordsTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerRegistrationRecords", vm.preparePlayerRegistrationIntentRecordsByStatus)
                });

                vm.getPlayerRegistrationSucccessRateListByFilter(true);
            });
        }

        vm.getPlayerRegistrationSucccessRateListByFilter = function () {
            //var selectedStatus = vm.queryPara.attemptNumberList ? [vm.queryPara.attemptNumberList.status] : ["Success", "Fail", "Pending", "Manual"];
            var sendData = {
                adminId: authService.adminId,
                platformId: vm.queryPara && vm.queryPara.attemptNumberRecords && vm.queryPara.attemptNumberRecords.platform &&
                    vm.queryPara.attemptNumberRecords.platform.length > 0 ? vm.queryPara.attemptNumberRecords.platform : vm.platformByAdminId.map(x => x._id),
                type: ["PlayerRegistrationIntention"],
                startDate: vm.queryPara.attemptNumberRecords.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.queryPara.attemptNumberRecords.endTime.data('datetimepicker').getLocalDate(),
                relateUser: null,
                //sortCol: vm.playerRegistrationRecords.sortCol || null,
                displayPhoneNum: true
            }
            vm.playerRegistrationRecords.loading = true;
            console.log("Query", sendData);
            vm.prepareSelfRegistrationSuccessRateRecords(sendData);
            vm.prepareRegistrationDistributionRecords(sendData);

        };

        vm.prepareNewPlayerListRecords = function (queryData, newSearch) {
            vm.newPlayerListRecords = [];
            socketService.$socket($scope.AppSocket, 'getPlayerProposalsForAdminId', queryData, function (data) {
                vm.newPlayerListRecords = data.data.data;
                vm.newPlayerRecords.totalCount = data.data.size;
                vm.newPlayerRecords.loading = false;
                console.log('new player list record', data);

                var tableData = vm.newPlayerListRecords.map(
                    record => {
                        if (record.status == vm.constProposalStatus.NOVERIFY && record.data && record.data.registrationTime) {
                            record.createTime = vm.dateReformat(record.data.registrationTime);
                        } else {
                            record.createTime = record.createTime ? vm.dateReformat(record.createTime) : "";
                        }
                        //record.statusName = record.status ? $translate(record.status) + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                        if (record.status) {
                            if (record.status == vm.constProposalStatus.SUCCESS) {
                                record.statusName = record.status ? $translate("Success") + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                            }
                            else if (record.status == vm.constProposalStatus.MANUAL) {
                                //record.statusName = record.status ? $translate(record.status) + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                                record.statusName = record.status ? $translate("MANUAL") + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                            }
                            else if (record.status == vm.constProposalStatus.NOVERIFY) {
                                record.statusName = record.status ? $translate("NoVerify") + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                            }
                            else {
                                record.statusName = record.status ? $translate("Attempt") + " （" + record.$playerCurrentCount + "/" + record.$playerAllCount + ")" : "";
                            }
                        }
                        record.playerId = (record.data && record.data.playerId) ? record.data.playerId : "";
                        record.name = (record.data && record.data.name) ? record.data.name : "";
                        record.realName = (record.data && record.data.realName) ? record.data.realName : "";
                        record.combinedArea = (record.data && (record.data.phoneProvince && record.data.phoneCity)) ? record.data.phoneProvince + " " + record.data.phoneCity : "";
                        record.topUpTimes = (record.data && record.data.topUpTimes) ? record.data.topUpTimes : 0;
                        record.smsCode = (record.data && record.data.smsCode) ? record.data.smsCode : "";
                        record.remarks = (record.data && record.data.remarks) ? record.data.remarks : "";
                        record.device = (record.inputDevice != "undefined" && record.inputDevice != "null") ? $translate($scope.constPlayerRegistrationInterface[record.inputDevice]) : "";
                        record.promoteWay = (record.data && record.data.promoteWay) ? record.data.promoteWay : "";
                        record.csOfficer = (record.data && record.data.csOfficer) ? record.data.csOfficer : "";
                        record.registrationTime = (record.data && record.data.registrationTime) ? vm.dateReformat(record.data.registrationTime) : "";
                        record.proposalId = (record.data && record.proposalId) ? record.proposalId : "";
                        record.ipAreaName = (record.data && record.data.ipArea) ? vm.getIpAreaName(record.data.ipArea) : '';
                        record.domain = (record.data && record.data.domain) ? record.data.domain : "";
                        record.platform$ = "";
                        if(record && record.data && (record.data.platform || record.data.platformId) && vm.platformByAdminId && vm.platformByAdminId.length){
                            let platformObjId = record.data.platform ? record.data.platform : record.data.platformId;
                            let filteredPlatform = vm.platformByAdminId.filter(a => a._id.toString() === platformObjId.toString());
                            record.platform$ = filteredPlatform && filteredPlatform[0] && filteredPlatform[0].name ? filteredPlatform[0].name : "";
                        }
                        return record
                    }
                );
                vm.drawNewPlayerTable(vm.newPlayerListRecords, newSearch);
            });
        };

        vm.drawNewPlayerTable = function(data, newSearch){
            var tableData = data;
            var option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                aoColumnDefs: [
                    {'sortCol': 'platform$', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'name', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'statusName', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'ipAreaName', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'combinedArea', bSortable: true, 'aTargets': [7]},
                    {'sortCol': 'topUpTimes', bSortable: true, 'aTargets': [8]},
                    {'sortCol': 'smsCode', bSortable: true, 'aTargets': [9]},
                    {'sortCol': 'remarks', bSortable: true, 'aTargets': [10]},
                    {'sortCol': 'device', bSortable: true, 'aTargets': [11]},
                    {'sortCol': 'promoteWay', bSortable: true, 'aTargets': [13]},
                    {'sortCol': 'csOfficer', bSortable: true, 'aTargets': [14]},
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
                    {
                        title: $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {

                            var link = $('<a>', {
                                'ng-click': 'vm.editNewplayerRemark=false;vm.showNewPlayerModal(' + JSON.stringify(row) + ',2)'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {title: $translate('PLAYERNAME'), data: "name"},
                    {title: $translate('STATUS'), data: "statusName"},
                    {title: $translate('SENT TIME'), data: "createTime"},
                    {title: $translate('REGISTERED_TIME'), data: "registrationTime"},
                    {title: $translate('REGISTERED_IP'), data: "ipAreaName"},
                    {title: $translate('PHONE_LOCATION'), data: "combinedArea"},
                    {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes"},
                    {title: $translate('VERIFICATION_CODE'), data: "smsCode"},
                    {title: $translate('REMARKS'), data: "remarks"},
                    {title: $translate('DEVICE'), data: "device"},
                    {
                        title: $translate('Function'),
                        data: "data.phoneNumber",
                        advSearch: true,
                        "sClass": "",
                        render: function (data, type, row) {
                            data = data || '';
                            //var playerObjId = row.data._id ? row.data._id : "";
                            let displayTXT = '';
                            let action = '';
                            var link = $('<div>', {});

                            if (row.data.phoneNumber && row.data.phoneNumber != "") {
                                link.append($('<div>', {
                                    'class': 'fa fa-volume-control-phone',
                                    'ng-click': 'vm.callNewPlayerBtn(' + '"' + row.data.phoneNumber + '",' + JSON.stringify(row) + ');',
                                    'title': $translate("PHONE")
                                }));
                                link.append($('<div>', {
                                    'class': 'fa fa-comment',
                                    'style': 'padding-left:15px',
                                    'ng-click': 'vm.smsNewPlayerBtn(' + '"' + row.data.phoneNumber + '",' + JSON.stringify(row) + ');vm.initSMSModal();',
                                    'title': $translate("SMS")
                                }));
                            }

                            if (row.status != vm.constProposalStatus.SUCCESS && row.status != vm.constProposalStatus.MANUAL && row.status != vm.constProposalStatus.NOVERIFY) {
                                displayTXT = $translate('CREATE_NEW_PLAYER');
                                action = 'vm.createPlayerHelper(' + JSON.stringify(row) + ');vm.checkPlayerNameValidity(vm.newPlayer.name, form_new_player)';
                                link.append($('<div>', {
                                    'class': 'fa fa-user-plus',
                                    'style': 'padding-left:15px',
                                    'ng-click': action,
                                    'title': $translate(displayTXT)
                                }));

                            } else {
                                displayTXT = $translate('FEEDBACK');
                                action = 'vm.initNewPlayerFeedbackModal(' + JSON.stringify(row) + ')';
                                $('#modalAddPlayerFeedback').css('z-Index', 1051);
                                link.append($('<div>', {
                                    'class': 'fa fa-commenting',
                                    'style': 'padding-left:15px',
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'modal',
                                    'data-target': '#modalAddPlayerFeedback',
                                    'ng-click': action,
                                    'title': $translate(displayTXT)
                                }));
                            }

                            return link.prop('outerHTML')
                        }
                    },

                    {title: $translate('PROMOTE_WAY'), data: "promoteWay"},
                    {title: $translate('CUSTOMER_SERVICE'), data: "csOfficer"},
                ],
                bSortClasses: false,
                destroy: true,
                paging: false,
                autoWidth: true,
                fnInitComplete: function(settings){
                    setTimeout(() => {
                        $compile(angular.element('#' + settings.sTableId).contents())($scope);
                    }, 50)
                },
                fnRowCallback: vm.playerListTableRow
            });
            var a = utilService.createDatatableWithFooter('#newPlayerListTable', option, {});
            vm.newPlayerRecords.pageObj.init({maxCount: vm.newPlayerRecords.totalCount}, newSearch);
            setTimeout(function () {
                $('#newPlayerListTable').resize();
            }, 100);
        }

        vm.prepareSelfRegistrationSuccessRateRecords = function (queryData) {
            queryData.status = [vm.constProposalStatus.PENDING, vm.constProposalStatus.SUCCESS];
            vm.selfRegistrationSuccessRateRecords = [];
            socketService.$socket($scope.AppSocket, 'getPlayerSelfRegistrationRecordList', queryData, function (data) {
                vm.selfRegistrationSuccessRateRecords = data.data;
                //vm.playerRegistrationRecords.totalCount = data.data.size;
                vm.playerRegistrationRecords.loading = false;
                console.log('self registration success rate record', data);

                var tableData = vm.selfRegistrationSuccessRateRecords.map(
                    record => {
                        record.selfRegistrationTotalSuccess = record.selfRegistrationTotalSuccess ? $translate(record.selfRegistrationTotalSuccess) : "";
                        record.totalAttempt = record.totalAttempt ? $translate(record.totalAttempt) : "";
                        return record ? record : "";
                    }
                );
                var tableData = vm.selfRegistrationSuccessRateRecords;
                //var failStatusArr = [vm.constProposalStatus.PENDING];
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    columns: [
                        {
                            title: $translate('SELF_REGISTER_SUCCESS_RATE'),
                            data: $translate('selfRegistrationTotalSuccess')
                        },
                        {
                            title: $translate('TOTAL_ATTEMPT'),
                            data: "totalAttempt",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    let statusArr = [vm.constProposalStatus.PENDING, vm.constProposalStatus.SUCCESS];
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"-1",' + JSON.stringify(statusArr) + ');',
                                    }).text(data));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(1/1)",
                            data: "firstFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"1","' + vm.constProposalStatus.PENDING + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(2/2)",
                            data: "secondFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"2","' + vm.constProposalStatus.PENDING + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(3/3)",
                            data: "thirdFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"3","' + vm.constProposalStatus.PENDING + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(4/4)",
                            data: "fouthFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"4","' + vm.constProposalStatus.PENDING + '");',
                                        //vm.setPreparePlayerRegistrationIntentRecordsByStatusParam({"adminId":"57b6c8b33d71e6c469f2aa20","platformId":"5733e26ef8c8a9355caf49d8","type":["PlayerRegistrationIntention"],"startDate":"2017-11-26T16:00:00.000Z","endDate":"2017-11-28T16:00:00.000Z","relateUser":null,"displayPhoneNum":true,"status":["Success","Manual"]},"1","Success");
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(5/5)",
                            data: "fifthFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"5","' + vm.constProposalStatus.PENDING + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('ATTEMPT') + "(5UP)",
                            data: "fifthUpFail",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"0","' + vm.constProposalStatus.PENDING + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(1/1)",
                            data: "firstSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"1","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(2/2)",
                            data: "secondSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"2","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(3/3)",
                            data: "thirdSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"3","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(4/4)",
                            data: "fouthSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"4","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(5/5)",
                            data: "fifthSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"5","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(5UP)",
                            data: "fifthUpSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"0","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                    ],
                    destroy: true,
                    paging: false,
                    autoWidth: true,
                    initComplete: function (data, type, row) {
                        $scope.safeApply();
                    },
                    createdRow: function (row, data, dataIndex) {
                        $compile(angular.element(row).contents())($scope);
                    },
                    fnRowCallback: vm.playerListTableRow
                });
                var a = utilService.createDatatableWithFooter('#selfRegistrationSuccessRateTable', option, {});
                //vm.playerRegistrationRecords.pageObj.init({maxCount: vm.playerRegistrationRecords.totalCount}, newSearch);
                setTimeout(function () {
                    $('#selfRegistrationSuccessRateTable').resize();
                }, 300);

            });
        };

        vm.prepareRegistrationDistributionRecords = function (queryData) {
            queryData.status = [vm.constProposalStatus.SUCCESS, vm.constProposalStatus.MANUAL];
            vm.registrationDistributionRecords = [];
            socketService.$socket($scope.AppSocket, 'getPlayerManualRegistrationRecordList', queryData, function (data) {
                vm.registrationDistributionRecords = data.data;
                //vm.registrationDistributionRecords.totalCount = data.data.size;
                vm.registrationDistributionRecords.loading = false;
                console.log('registration distribution record', data);

                var tableData = vm.registrationDistributionRecords.map(
                    record => {
                        record.manualRegistrationTotalSuccess = record.manualRegistrationTotalSuccess ? $translate(record.manualRegistrationTotalSuccess) : "";
                        record.totalSuccess = record.totalSuccess ? $translate(record.totalSuccess) : "";
                        return record ? record : "";
                    }
                );
                var tableData = vm.registrationDistributionRecords;
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    columns: [
                        {title: $translate('MANUAL/SELF_REGISTER_RATE'), data: "manualRegistrationTotalSuccess"},
                        {
                            title: $translate('TOTAL_REGISTRATION'),
                            data: "totalSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    let statusArr = [vm.constProposalStatus.SUCCESS, vm.constProposalStatus.MANUAL]
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"-1",' + JSON.stringify(statusArr) + ');',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('MANUAL'),
                            data: "manualSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"-1","' + vm.constProposalStatus.MANUAL + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(1/1)",
                            data: "firstSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"1","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(2/2)",
                            data: "secondSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"2","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(3/3)",
                            data: "thirdSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"3","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(4/4)",
                            data: "fouthSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"4","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(5/5)",
                            data: "fifthSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"5","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                        {
                            title: $translate('SUCCESS') + "(5UP)",
                            data: "fifthUpSuccess",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var link = $('<div>', {});
                                if (data != "" && data != "0.00") {
                                    link.append($('<a>', {
                                        'ng-click': 'vm.setPreparePlayerRegistrationIntentRecordsByStatusParam(' + JSON.stringify(queryData) + ',"0","' + vm.constProposalStatus.SUCCESS + '");',
                                    }).text(data ? data : 0));
                                }
                                else {
                                    link.append($('<div>', {}).text(data ? data : 0));
                                }
                                return link.prop('outerHTML')
                            }
                        },
                    ],
                    destroy: true,
                    paging: false,
                    autoWidth: true,
                    initComplete: function (data, type, row) {
                        $scope.safeApply();
                    },
                    createdRow: function (row, data, dataIndex) {
                        $compile(angular.element(row).contents())($scope);

                    },
                    fnRowCallback: vm.playerListTableRow
                });
                var a = utilService.createDatatableWithFooter('#registrationDistributionRecordsTable', option, {});
                //vm.playerRegistrationRecords.pageObj.init({maxCount: vm.playerRegistrationRecords.totalCount}, newSearch);
                setTimeout(function () {
                    $('#registrationDistributionRecordsTable').resize();
                }, 300);


            });
        };

        vm.setPreparePlayerRegistrationIntentRecordsByStatusParam = function (queryData, attemptNo, status) {
            vm.queryData = queryData;
            vm.attemptNo = attemptNo;
            vm.status = status;

            vm.preparePlayerRegistrationIntentRecordsByStatus(true);
        }

        vm.preparePlayerRegistrationIntentRecordsByStatus = function (newSearch) {
            vm.queryData.attemptNo = vm.attemptNo ? vm.attemptNo : 0;
            vm.queryData.status = Array.isArray(vm.status) ? vm.status : [vm.status];
            vm.playerRegistrationRecords.loading = true;

            vm.queryData.size = newSearch ? 10 : (vm.playerRegistrationRecords.limit || 10);
            vm.queryData.index = newSearch ? 0 : (vm.playerRegistrationRecords.index || 0);
            vm.queryData.sortCol = vm.playerRegistrationRecords.sortCol;
            vm.queryData.unlockSizeLimit = true;
            socketService.$socket($scope.AppSocket, 'getPlayerRegistrationIntentRecordByStatus', vm.queryData, function (data) {
                vm.newPlayerListRecords = data.data;

                vm.playerRegistrationRecords.loading = false;
                console.log('player registration intent record', data);

                let arr = [];

                var tableData = vm.newPlayerListRecords.map(
                    records => {
                        //records.data.map(record => {
                        records.createTime = records.createTime ? vm.dateReformat(records.createTime) : "";
                        if (records.status) {
                            if (records.status == vm.constProposalStatus.SUCCESS) {
                                records.statusName = records.status ? $translate("SUCCESS") + " （" + records.$playerCurrentCount + "/" + records.$playerAllCount + ")" : "";
                            }
                            else if (records.status == vm.constProposalStatus.MANUAL) {
                                records.statusName = records.status ? $translate("MANUAL") + " （" + records.$playerCurrentCount + "/" + records.$playerAllCount + ")" : "";
                            } else {
                                records.statusName = records.status ? $translate("Attempt") + " （" + records.$playerCurrentCount + "/" + records.$playerAllCount + ")" : "";
                            }
                        }
                        records.playerId = records.data.playerId ? records.data.playerId : "";
                        records.name = records.data.name ? records.data.name : "";
                        records.realName = records.data.realName ? records.data.realName : "";
                        records.combinedArea = (records.data.phoneProvince && records.data.phoneCity) ? records.data.phoneProvince + " " + records.data.phoneCity : "";
                        records.topUpTimes = records.data.topUpTimes ? records.data.topUpTimes : 0;
                        records.smsCode = records.data.smsCode ? records.data.smsCode : "";
                        records.remarks = records.data.remarks ? records.data.remarks : "";
                        records.device = (records.inputDevice != "undefined" && records.inputDevice != "null") ? $translate($scope.constPlayerRegistrationInterface[records.inputDevice]) : "";
                        records.promoteWay = records.data.promoteWay ? records.data.promoteWay : "";
                        records.csOfficer = records.data.csOfficer ? records.data.csOfficer : "";
                        records.registrationTime = records.data.registrationTime ? vm.dateReformat(records.data.registrationTime) : "";
                        records.proposalId = records.proposalId ? records.proposalId : "";
                        records.ipAreaName = records.data.ipArea ? vm.getIpAreaName(records.data.ipArea) : '';
                        records.domain = (records.data && records.data.domain) ? records.data.domain : "";
                        records.platform$ = "";
                        if(records && records.data && (records.data.platform || records.data.platformId) && vm.platformByAdminId && vm.platformByAdminId.length){
                            let platformObjId = records.data.platform ? records.data.platform : records.data.platformId;
                            let filteredPlatform = vm.platformByAdminId.filter(a => a._id.toString() === platformObjId.toString());
                            records.platform$ = filteredPlatform && filteredPlatform[0] && filteredPlatform[0].name ? filteredPlatform[0].name : "";
                        }
                        //arr.push(record);
                        // })
                        //return arr;
                        return records ? records : "";
                    }
                );

                vm.playerRegistrationRecords.totalCount = tableData.length;
                var limit = tableData.length < vm.queryData.index + vm.queryData.size ? tableData.length : vm.queryData.index + vm.queryData.size

                vm.sortProposalRegistrationIntentRecord = function (data, sortCol) {
                    var keyName = Object.keys(sortCol)[0];
                    var sorting = sortCol[keyName];
                    var result = data.sort(function (a, b) {
                        if (a[keyName] < b[keyName])
                            return -1 * sorting;
                        if (a[keyName] > b[keyName])
                            return 1 * sorting;
                        return 0;
                    });

                    return result;
                }

                if (vm.queryData.sortCol) {
                    //tableData = tableData[0].sort(vm.queryData.sortCol).slice(vm.queryData.index,limit);
                    //tableData[0] = JSON.parse(JSON.stringify(tableData[0]));
                    tableData = vm.sortProposalRegistrationIntentRecord(tableData, vm.queryData.sortCol).slice(vm.queryData.index, limit);
                } else {
                    // tableData = tableData[0].sort(function(a,b) {if ( a.createTime < b.createTime )return 1;if ( a.createTime > b.createTime )return -1;return 0;})
                    //     .slice(vm.queryData.index,limit);
                    tableData = vm.sortProposalRegistrationIntentRecord(tableData, {createTime: -1}).slice(vm.queryData.index, limit);
                }

                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    aoColumnDefs: [
                        {'sortCol': 'platform$', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'name', bSortable: true, 'aTargets': [2]},
                        {'sortCol': 'statusName', bSortable: true, 'aTargets': [3]},
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [4]},
                        {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [5]},
                        {'sortCol': 'ipAreaName', bSortable: true, 'aTargets': [6]},
                        {'sortCol': 'combinedArea', bSortable: true, 'aTargets': [7]},
                        {'sortCol': 'topUpTimes', bSortable: true, 'aTargets': [8]},
                        {'sortCol': 'smsCode', bSortable: true, 'aTargets': [9]},
                        {'sortCol': 'remarks', bSortable: true, 'aTargets': [10]},
                        {'sortCol': 'device', bSortable: true, 'aTargets': [11]},
                        {'sortCol': 'promoteWay', bSortable: true, 'aTargets': [13]},
                        {'sortCol': 'csOfficer', bSortable: true, 'aTargets': [14]},
                    ],
                    columns: [
                        {title: $translate('PRODUCT_NAME'), data: "platform$"},
                        {
                            title: $translate('proposalId'),
                            data: "proposalId",
                            render: function (data, type, row) {

                                var link = $('<a>', {
                                    'ng-click': 'vm.editNewplayerRemark=false;vm.showNewPlayerModal(' + JSON.stringify(row) + ',2)'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {title: $translate('PLAYERNAME'), data: "name"},
                        {title: $translate('STATUS'), data: "statusName"},
                        //{title: $translate('PLAYERID'), data: "playerId"},
                        {title: $translate('SENT TIME'), data: "createTime"},
                        {title: $translate('REGISTERED_TIME'), data: "registrationTime"},
                        {title: $translate('REGISTERED_IP'), data: "ipAreaName"},
                        {title: $translate('PHONE_LOCATION'), data: "combinedArea"},
                        {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes"},
                        {title: $translate('VERIFICATION_CODE'), data: "smsCode"},
                        {title: $translate('REMARKS'), data: "remarks"},
                        {title: $translate('DEVICE'), data: "device"},
                        {
                            title: $translate('Function'),
                            data: "data.phoneNumber",
                            advSearch: true,
                            "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                var playerObjId = row.data._id ? row.data._id : "";
                                let displayTXT = '';
                                let action = '';
                                var link = $('<div>', {});

                                if (row.data.phoneNumber && row.data.phoneNumber != "") {
                                    link.append($('<div>', {
                                        'class': 'fa fa-volume-control-phone',
                                        'ng-click': 'vm.callNewPlayerBtn(' + '"' + row.data.phoneNumber + '",' + JSON.stringify(row) + ');',
                                        'title': $translate("PHONE")
                                    }));
                                    link.append($('<div>', {
                                        'class': 'fa fa-comment',
                                        'style': 'padding-left:15px',
                                        'ng-click': 'vm.smsNewPlayerBtn(' + '"' + row.data.phoneNumber + '",' + JSON.stringify(row) + ');vm.initSMSModal();',
                                        'title': $translate("SMS")
                                    }));
                                }

                                if (row.status != vm.constProposalStatus.SUCCESS && row.status != vm.constProposalStatus.MANUAL) {
                                    displayTXT = $translate('CREATE_NEW_PLAYER');
                                    action = 'vm.createPlayerHelper(' + JSON.stringify(row) + ')';
                                    link.append($('<div>', {
                                        'class': 'fa fa-user-plus',
                                        'style': 'padding-left:15px',
                                        'ng-click': action,
                                        'title': $translate(displayTXT)
                                    }));

                                } else {
                                    displayTXT = $translate('FEEDBACK');
                                    action = 'vm.initNewPlayerFeedbackModal(' + JSON.stringify(row) + ')';
                                    $('#modalAddPlayerFeedback').css('z-Index', 1051);
                                    link.append($('<div>', {
                                        'class': 'fa fa-commenting',
                                        'style': 'padding-left:15px',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalAddPlayerFeedback',
                                        'ng-click': action,
                                        'title': $translate(displayTXT)
                                    }));
                                }

                                return link.prop('outerHTML')
                            }
                        },
                        {title: $translate('PROMOTE_WAY'), data: "promoteWay"},
                        {title: $translate('CUSTOMER_SERVICE'), data: "csOfficer"},
                    ],
                    bSortClasses: false,
                    destroy: true,
                    paging: false,
                    autoWidth: true,
                    initComplete: function (data, type, row) {
                        $scope.safeApply();
                    },
                    createdRow: function (row, data, dataIndex) {
                        $compile(angular.element(row).contents())($scope);

                    },
                    fnRowCallback: vm.playerListTableRow
                });
                var a = utilService.createDatatableWithFooter('#playerRegistrationIntentRecordsTable', option, {});

                vm.playerRegistrationRecords.pageObj.init({maxCount: vm.playerRegistrationRecords.totalCount}, newSearch);
                $('#playerRegistrationIntentRecordsTable').off('order.dt');
                $('#playerRegistrationIntentRecordsTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'playerRegistrationRecords', vm.preparePlayerRegistrationIntentRecordsByStatus);
                });
                setTimeout(function () {
                    $('#playerRegistrationIntentRecordsTable').resize();
                }, 300);

            });
        };

        vm.getPlatformSmsGroups = () => {
            return $scope.$socketPromise('getPlatformSmsGroups', {platformObjId: vm.selectedPlatform._id}).then(function (data) {
                vm.smsGroups = data.data;
                console.log('vm.smsGroups', vm.smsGroups);
                vm.getNoInGroupSmsSetting();
                $scope.safeApply();
            });
        };

        vm.getNoInGroupSmsSetting = () => {
            vm.noGroupSmsSetting = [];
            for (let messageType in vm.allMessageTypes) {
                let isInGroup = false;
                vm.smsGroups.forEach((smsGroup) => {
                    if ((smsGroup.smsParentSmsId !== -1 && vm.allMessageTypes[messageType].name === smsGroup.smsName) || vm.allMessageTypes[messageType].name === 'smsVerificationCode') {
                        isInGroup = true;
                    }
                });

                if (!isInGroup)
                    vm.noGroupSmsSetting.push(vm.allMessageTypes[messageType]);
            }
            $scope.safeApply();
        };

        vm.getAllMessageTypes = function () {
            return $scope.$socketPromise('getAllMessageTypes', '').then(function (data) {
                vm.allMessageTypes = data.data;
            });
        };

        vm.initSMSModal = function () {
            $('#smsToPlayerTab').addClass('active');
            $('#smsLogTab').removeClass('active');
            $('#smsSettingTab').removeClass('active');
            vm.smsModalTab = "smsToPlayerPanel";
            vm.playerSmsSetting = {smsGroup: {}};
            vm.getPlatformSmsGroups();
            vm.getAllMessageTypes();
            $scope.safeApply();
        };

        vm.initSendMultiMessage = function () {
            //vm.getSMSTemplate();
            vm.sendMultiMessage = {
                totalCount: 0,
                playerType: 'Real Player (all)',
                playerLevel: '',
                topUpTimesValue: null,
                topUpTimesValueTwo: null,
                topUpTimesOperator: '>=',
                loginTimesValue: null,
                loginTimesValueTwo: null,
                loginTimesOperator: '>=',
                channelMaxChar: 100,
                wordCount: 0,
                phoneCount: 0,
                numUsedMessage: 0,
                checkAllRow: false,
                numReceived: 0,
                numFailed: 0,
                numRecipient: 0,
                messageType: "sms",
                sendBtnText: $translate("SEND")
            };
            $scope.getUsableChannelList(function () {
                vm.sendMultiMessage.channel = $scope.channelList ? $scope.channelList[0] : null;
            });
            setTimeout(
                () => {
                    vm.setupRemarksMultiInputMultiMsg();
                },0);
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
        };

        vm.searchPlayersForSendingMessage = function (newSearch) {
            if (!vm.selectedPlatform) {
                return;
            }
            $('#mutilplePlayerTable tbody tr').removeClass('selected');
            $('#mutilplePlayerTable tbody input[type="checkbox"]').prop("checked", vm.sendMultiMessage.checkAllRow);
            vm.smsTplSelection = null;
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
            if (vm.sendMultiMessage.credibilityRemarks) {
                playerQuery.credibilityRemarks = vm.sendMultiMessage.credibilityRemarks;
            }
            if (vm.sendMultiMessage.playerLevel) {
                playerQuery.playerLevel = vm.sendMultiMessage.playerLevel;
            }
            if (vm.sendMultiMessage.playerType) {
                playerQuery.playerType = vm.sendMultiMessage.playerType
            }
            if (vm.sendMultiMessage && vm.sendMultiMessage.topUpTimesValue != null && vm.sendMultiMessage.topUpTimesOperator) {
                let topUpTimesValue = vm.sendMultiMessage.topUpTimesValue;
                let topUpTimesValueTwo = vm.sendMultiMessage.topUpTimesValueTwo;
                let topUpTimesOperator = vm.sendMultiMessage.topUpTimesOperator;

                switch (topUpTimesOperator) {
                    case '<=':
                        playerQuery.topUpTimes = {$lte: topUpTimesValue};
                        break;
                    case '>=':
                        playerQuery.topUpTimes = {$gte: topUpTimesValue};
                        break;
                    case '=':
                        playerQuery.topUpTimes = topUpTimesValue;
                        break;
                    case 'range':
                        if (topUpTimesValueTwo != null) {
                            playerQuery.topUpTimes = {$gte: topUpTimesValue, $lte: topUpTimesValueTwo};
                        }
                        break;
                }
            }
            if (vm.sendMultiMessage.bankAccount) {
                playerQuery.bankAccount = vm.sendMultiMessage.bankAccount;
            }
            if (vm.sendMultiMessage && vm.sendMultiMessage.loginTimesValue != null && vm.sendMultiMessage.loginTimesOperator) {
                let loginTimesValue = vm.sendMultiMessage.loginTimesValue;
                let loginTimesValueTwo = vm.sendMultiMessage.loginTimesValueTwo;
                let loginTimesOperator = vm.sendMultiMessage.loginTimesOperator;

                switch (loginTimesOperator) {
                    case '<=':
                        playerQuery.loginTimes = {$lte: loginTimesValue};
                        break;
                    case '>=':
                        playerQuery.loginTimes = {$gte: loginTimesValue};
                        break;
                    case '=':
                        playerQuery.loginTimes = loginTimesValue;
                        break;
                    case 'range':
                        if (loginTimesValueTwo != null) {
                            playerQuery.loginTimes = {$gte: loginTimesValue, $lte: loginTimesValueTwo};
                        }
                        break;
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
                    if (!item.name && item.partnerName) {
                        item.name = item.partnerName;
                    }
                    item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                    item.registrationTime$ = vm.dateReformat(item.registrationTime);
                    return item;
                }), size, newSearch);
                vm.sendMultiMessage.totalCount = size;
                vm.sendMultiMessage.pageObj.init({maxCount: size}, newSearch);
                $scope.safeApply();
            });
        }

        function updateMultiMessageButton() {
            $scope.$evalAsync(() => {
                vm.sendMultiMessage.sendBtnText =
                    vm.sendMultiMessage.sendCompleted ? $translate("DONE")
                        : vm.sendMultiMessage.sendInitiated ? $translate("Sending")
                        : $translate("SEND");
            });
        }

        vm.sendMessages = function () {

            // console.log(vm.sendMultiMessage.tableObj.rows('.selected').data());
            vm.sendMultiMessage.sendInitiated = true;
            updateMultiMessageButton();

            $scope.AppSocket.removeAllListeners('_sendSMSToPlayer');
            $scope.AppSocket.on('_sendSMSToPlayer', function (data) {
                $scope.$evalAsync(() => {
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
                    vm.sendMultiMessage.messageTitle = "";
                    vm.sendMultiMessage.messageContent = "";
                    updateMultiMessageButton();
                });
            });

            $scope.AppSocket.removeAllListeners('_sendPlayerMailFromAdminToPlayer');
            $scope.AppSocket.on('_sendPlayerMailFromAdminToPlayer', function (data) {
                console.log(data);
                vm.sendMultiMessage.sendCompleted = true;
                vm.sendMultiMessage.messageTitle = "";
                vm.sendMultiMessage.messageContent = "";
                updateMultiMessageButton();
            });

            if (vm.sendMultiMessage.messageType === "sms") {
                vm.sendMultiMessage.tableObj.rows('.selected').data().each(function (data) {
                    $scope.AppSocket.emit('sendSMSToPlayer', {
                        playerId: data.playerId,
                        platformId: vm.selectedPlatform.platformId,
                        channel: vm.sendMultiMessage.channel,
                        message: vm.sendMultiMessage.messageContent
                    });
                });
            } else if (vm.sendMultiMessage.messageType === "mail") {
                let playerIds = vm.sendMultiMessage.tableObj.rows('.selected').data().reduce((tempPlayersId, selectedPlayers) => {
                    if (selectedPlayers._id) {
                        tempPlayersId.push(selectedPlayers._id);
                    }
                    return tempPlayersId;
                }, []);

                let sendData = {
                    playerId: playerIds,
                    adminName: authService.adminName,
                    platformId: vm.selectedPlatform._id,
                    title: vm.sendMultiMessage.messageTitle,
                    content: vm.sendMultiMessage.messageContent
                };

                if (vm.isSentToAll) {
                    socketService.$socket($scope.AppSocket, 'sendPlayerMailFromAdminToAllPlayers', sendData, function (data) {
                        console.log(data);
                        vm.sendMultiMessage.sendCompleted = true;
                        vm.sendMultiMessage.messageTitle = "";
                        vm.sendMultiMessage.messageContent = "";
                        updateMultiMessageButton();
                    })
                } else {
                    $scope.AppSocket.emit('sendPlayerMailFromAdminToPlayer', sendData);
                }
            }
        };

        vm.telorMessageToPlayerBtn = function (type, playerObjId, data) {
            // var rowData = JSON.parse(data);
            console.log(type, data);
            //vm.getSMSTemplate();
            var title, text;
            if (type == 'msg' && authService.checkViewPermission('Player', 'Player', 'sendSMS')) {
                vm.smsPlayer = {
                    playerId: playerObjId.playerId,
                    name: playerObjId.name,
                    nickName: playerObjId.nickName,
                    platformId: vm.selectedPlatform.platformId,
                    channel: $scope.channelList[0],
                    hasPhone: playerObjId.phoneNumber
                }
                vm.sendSMSResult = {};
                $scope.safeApply();
                $('#smsPlayerModal').modal('show');
                vm.showSmsTab(null);
            } else if (type == 'tel') {
                var phoneCall = {
                    playerId: data.playerId,
                    name: data.name,
                    toText: data.playerName ? data.playerName : data.name,
                    platform: "jinshihao",
                    loadingNumber: true,
                }
                $scope.initPhoneCall(phoneCall);
                socketService.$socket($scope.AppSocket, 'getPlayerPhoneNumber', {playerObjId: playerObjId}, function (data) {
                    $scope.phoneCall.phone = data.data;
                    $scope.phoneCall.loadingNumber = false;
                    $scope.safeApply();
                    $scope.makePhoneCall(vm.selectedPlatform.platformId);
                }, function (err) {
                    $scope.phoneCall.loadingNumber = false;
                    $scope.phoneCall.err = err.error.message;
                    alert($scope.phoneCall.err);
                    $scope.safeApply();
                }, true);
            }
        };

        vm.callDemoPlayer = function (data) {
            var phoneCall = {
                // playerId: "5a74167afe96b103da96f5fc",//data.playerId,
                name: $translate("demoPlayer"),
                toText: $translate("demoPlayer"),
                platform: "jinshihao",
                loadingNumber: true,
            }
            $scope.initPhoneCall(phoneCall);
            $scope.phoneCall.phone = data.tel;
            $scope.phoneCall.loadingNumber = false;
            $scope.safeApply();
            $scope.makePhoneCall(vm.selectedPlatform.platformId);
        }

        vm.telToPlayer = function (data) {
            $scope.$evalAsync(() => {
                let phoneCall = {
                    playerId: data.data.playerId || '',
                    name: data.data.playerName || '',
                    toText: data.data.playerName || '',
                    platform: "jinshihao",
                    loadingNumber: true,
                }

                $scope.initPhoneCall(phoneCall);
                $scope.phoneCall.phone = data.data.updateData.phoneNumber;
                $scope.phoneCall.loadingNumber = false;
                $scope.makePhoneCall(vm.selectedPlatform.platformId);
            });
        };

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
                $scope.makePhoneCall(vm.selectedPlatform.platformId);
            }, function (err) {
                $scope.phoneCall.loadingNumber = false;
                $scope.phoneCall.err = err.error.message;
                alert($scope.phoneCall.err);
                $scope.safeApply();
            }, true);
        }

        vm.createMessageTemplate = function () {

            if (vm.editingMessageTemplate.format == 'smstpl') {
                vm.editingMessageTemplate.type = vm.smsTitle;
            }
            var templateData = vm.editingMessageTemplate;
            templateData.platform = vm.selectedPlatform.id;
            vm.resetToViewMessageTemplate();
            $scope.$socketPromise('createMessageTemplate', templateData).then(
                () => vm.getPlatformMessageTemplates()
            ).done();
        };

        vm.saveMessageTemplate = function () {
            var query = {_id: vm.editingMessageTemplate._id};

            if (vm.editingMessageTemplate.format == 'smstpl') {
                vm.editingMessageTemplate.type = vm.smsTitle;
            }
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

        // vm.getSMSTemplate = function () {
        //     vm.smsTemplate = [];
        //     $scope.$socketPromise('getMessageTemplatesForPlatform', {
        //         platform: vm.selectedPlatform._id,
        //         format: 'smstpl'
        //     }).then(function (data) {
        //         vm.smsTemplate = data.data;
        //         console.log("vm.smsTemplate", vm.smsTemplate);
        //         $scope.safeApply();
        //     }).done();
        // };

        vm.useSMSTemplate = function () {
            vm.sendMultiMessage.messageContent = vm.smsTplSelection[0] ? vm.smsTplSelection[0].content : '';
            vm.messagesChange();
        };

        vm.changeSMSTemplate = function () {
            vm.smsPlayer.message = vm.smstpl ? vm.smstpl.content : '';
        };

        vm.sendSMSToPlayer = function () {
            vm.sendSMSResult = {sent: "sending"};

            if (vm.smsPlayer.playerId == '') {
                return $scope.sendSMSToNewPlayer(vm.smsPlayer, function (data) {
                    vm.sendSMSResult = {sent: true, result: data.success};
                    $scope.safeApply();
                });
            } else {
                return $scope.sendSMSToPlayer(vm.smsPlayer, function (data) {
                    vm.sendSMSResult = {sent: true, result: data.success};
                    $scope.safeApply();
                });
            }
        };

        vm.prepareShowPlayerForbidTopUpType = function () {
            let sendData = {_id: vm.isOneSelectedPlayer()._id};

            socketService.$socket($scope.AppSocket, 'getOnePlayerInfo', sendData, (playerData) => {
                vm.showForbidTopupTypes = playerData.data.forbidTopUpType || [];
                $scope.safeApply();
            });
        }

        vm.initNewPlayerFeedbackModal = function (selectedPlayer) {
            vm.selectedSinglePlayer = selectedPlayer;

            socketService.$socket($scope.AppSocket, 'getOnePlayerInfo', {playerId: selectedPlayer.playerId}, function (data) {
                console.log(data);
                let id = data.data._id ? data.data._id : '';
                selectedPlayer._id = id;
                vm.selectedSinglePlayer = selectedPlayer;
                $('#addFeedbackTab').addClass('active');
                $('#feedbackHistoryTab').removeClass('active');
                $scope.safeApply();
                vm.feedbackModalTab = "addFeedbackPanel";
            });
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
        };

        vm.getAllPromoteWay = function () {
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
        };

        vm.prepareCreatePlayer = function () {
            vm.playerDOB = utilService.createDatePicker('#datepickerDOB', {
                language: 'en',
                format: 'yyyy/MM/dd'
            });

            vm.existPhone = false;
            vm.existRealName = false;
            vm.newPlayer = {};
            vm.newPlayer.gender = "true";
            vm.duplicateNameFound = false;
            vm.euPrefixNotExist = false;
            $('.referralValidTrue').hide();
            $('.referralValidFalse').hide();
            vm.newPlayer.domain = window.location.hostname;
            vm.getReferralPlayer(vm.newPlayer, "new");
            vm.playerCreateResult = null;
            vm.playerPswverify = null;

            vm.phoneDuplicate = {totalCount: 0};
            vm.phoneDuplicate.pageObj = utilService.createPageForPagingTable("#samePhoneNumTablePage", {}, $translate, function (curP, pageSize) {
                vm.commonPageChangeHandler(curP, pageSize, "phoneDuplicate", vm.loadPhoneNumberRecord)
            });
            vm.getAllPromoteWay();
        }

        vm.checkPlayerNameValidity = function (name, form, type) {
            if (!name) return;
            // vm.euPrefixNotExist = false;
            vm.wrongPrefix = false;
            if (type == 'edit' && name == vm.selectedSinglePlayer.name) {
                vm.duplicateNameFound = false;
                return;
            }

            // if (type !== 'edit' && vm.selectedPlatform.data.name === "EU8" && name && name.charAt(0) !== "e") {
            //     vm.euPrefixNotExist = true;
            // }
            // form.$setValidity('euPrefixNotExist', !vm.euPrefixNotExist);

            let platformObjId = vm.selectedPlatform.id;
            if(form && form.$name == "form_new_player" && vm.newPlayer && vm.newPlayer.platform){
                platformObjId = vm.newPlayer.platform;

                if (type !== 'edit') {
                    let platformData = vm.platformByAdminId.find(platform => platform._id == platformObjId);
                    if (platformData.prefix && !name.startsWith(platformData.prefix)) {
                        vm.wrongPrefix = true;
                    }
                }
            }
            form.$setValidity('wrongPrefix', !vm.wrongPrefix);
            $scope.safeApply();

            if (vm.wrongPrefix) {
                return;
            }

            socketService.$socket($scope.AppSocket, 'checkPlayerNameValidity', {
                platform: platformObjId,
                name: name
            }, function (data) {
                console.log("data.......", data);
                if (data && data.data.isPlayerNameValid == false) {
                    vm.duplicateNameFound = true;
                } else if (data && data.data.isPlayerNameValid) {
                    vm.duplicateNameFound = false;
                }
                form.$setValidity('usedPlayerName', !vm.duplicateNameFound);
                $scope.safeApply();
            }, function (err) {
                console.log('err', err);
            }, true);
        }

        vm.updatePlayerFeedback = function () {
            let resultName = vm.allPlayerFeedbackResults.filter(item => {
                return item.key == vm.playerFeedback.result;
            });
            resultName = resultName.length > 0 ? resultName[0].value : "";
            let sendData = {
                playerId: vm.isOneSelectedPlayer()._id,
                platform: vm.isOneSelectedPlayer().platform,
                createTime: Date.now(),
                adminId: authService.adminId,
                content: vm.playerFeedback.content,
                result: vm.playerFeedback.result,
                resultName: resultName,
                topic: vm.playerFeedback.topic
            };
            console.log('add feedback', sendData);
            socketService.$socket($scope.AppSocket, 'createPlayerFeedback', sendData, function (data) {
                console.log('feedbackadded', data);
                vm.playerFeedback = {};
                // vm.getPlatformPlayersData();

                let rowData = vm.playerTableClickedRow.data();
                rowData.feedbackTimes++;
                vm.playerTableClickedRow.data(rowData).draw();

                if (vm.platformPageName == 'Feedback') {
                    vm.submitPlayerFeedbackQuery();
                }
                $scope.safeApply();
            });
        };

        vm.showNewPlayerModal = function (data, templateNo) {
            vm.newPlayerProposal = data;

            if (vm.newPlayerProposal.data && vm.newPlayerProposal.data.phoneNumber) {
                let str = vm.newPlayerProposal.data.phoneNumber;
                vm.newPlayerProposal.data.phoneNumber = str.substring(0, 3) + "******" + str.slice(-4);
            }

            let tmpt = vm.proposalTemplate[templateNo];
            $(tmpt).modal('show');
            $(tmpt).on('shown.bs.modal', function (e) {
                $scope.safeApply();
            })

        };

        vm.sendMessageToPlayerBtn = function (type, data) {
            vm.telphonePlayer = data;
            $('#messagePlayerModal').modal('show');
        };

        vm.callNewPlayerBtn = function (phoneNumber, data) {

            //vm.getSMSTemplate();
            var phoneCall = {
                playerId: data.playerId,
                name: data.name,
                toText: data.playerName ? data.playerName : data.name,
                platform: "jinshihao",
                loadingNumber: true,
            }
            $scope.initPhoneCall(phoneCall);
            $scope.phoneCall.phone = phoneNumber;
            $scope.phoneCall.loadingNumber = false;
            $scope.makePhoneCall(vm.selectedPlatform.platformId);
        }

        vm.smsNewPlayerBtn = function (phoneNumber, data) {
            //vm.getSMSTemplate();
            vm.selectedSinglePlayer = data;
            vm.editPlayer = data.data ? data.data : "";
            vm.selectedPlayersCount = 1
            vm.smsPlayer = {
                playerId: data.playerId,
                name: data.name,
                nickName: data.nickName || '',
                platformId: vm.selectedPlatform.platformId,
                channel: $scope.channelList[0],
                hasPhone: phoneNumber
            }
            vm.sendSMSResult = {};
            $scope.safeApply();
            $('#smsPlayerModal').modal('show');
        };

        vm.createPlayerHelper = function (row) {
            console.log(row);
            vm.prepareCreatePlayer();
            $('#modalCreatePlayer')
                .css('z-Index', 1051)
                .modal();
            utilService.actionAfterLoaded("#modalCreatePlayer", function () {
                vm.newPlayer.realName = row.data.realName;
                vm.newPlayer.name = row.data.name;
                vm.newPlayer.email = row.data.email;
                // vm.newPlayer.domain = row.data.domain;
                vm.newPlayer.phoneNumber = row.data.phoneNumber;
                vm.newPlayer.encodedPhoneNumber = row.data.phoneNumber ? utilService.encodePhoneNum(row.data.phoneNumber) : null;
                vm.newPlayer.referralName = row.data.referral;
                vm.newPlayer.platform = row.data.platformId;
                vm.newPlayer.platformId = vm.platformByAdminId.filter(platform => platform._id.toString() === row.data.platformId.toString())[0].platformId;
            });
        }

        vm.updateNewPlayerProposalRemark = function (pId, remarks) {
            let sendData = {
                'proposalObjId': pId,
                'remarks': remarks
            }
            socketService.$socket($scope.AppSocket, 'updatePlayerProposalRemarks', sendData, function (data) {
                $scope.$evalAsync(()=>{
                    vm.newPlayerProposal.remarks = remarks;
                    vm.editNewplayerRemark = false;
                    //update the new player obj without run query again . to avoid heavy loading ...
                    vm.newPlayerListRecords = vm.newPlayerListRecords.map(item=>{
                        if(item._id && item._id == pId){
                            if(data && data.data && data.data.data){
                                item.remarks =  data.data.data.remarks;
                            }
                        }
                        return item
                    })
                    vm.drawNewPlayerTable(vm.newPlayerListRecords, false);
                })
            });
        }

        vm.showSmsTab = function (tabName) {
            if (!tabName && (vm.selectedSinglePlayer && vm.selectedSinglePlayer.permission && vm.selectedSinglePlayer.permission.SMSFeedBack === false)) {
                vm.smsModalTab = "smsLogPanel";
                vm.initSMSLog("single");
            }
            else {
                vm.smsModalTab = tabName ? tabName : "smsToPlayerPanel";
            }
        };

        vm.initSMSLog = function (type) {
            vm.smsLog = vm.smsLog || {index: 0, limit: 10};
            vm.smsLog.type = type;
            vm.smsLog.query = {};
            vm.smsLog.searchResults = [{}];
            vm.smsLog.query.status = "all";
            vm.smsLog.query.isAdmin = true;
            vm.smsLog.query.isSystem = false;
            let endTimeElementPath = '.modal.in #smsLogPanel #smsLogQuery .endTime';
            let tablePageId = "smsLogTablePage";
            if (type == "multi") {
                endTimeElementPath = '#groupSmsLogQuery .endTime';
                tablePageId = "groupSmsLogTablePage";
            }
            utilService.actionAfterLoaded(endTimeElementPath, function () {
                vm.smsLog.query.startTime = utilService.createDatePicker('#smsLogPanel #smsLogQuery .startTime');
                vm.smsLog.query.endTime = utilService.createDatePicker('#smsLogPanel #smsLogQuery .endTime');
                if (type == "multi") {
                    vm.smsLog.query.startTime = utilService.createDatePicker('#groupSmsLogQuery .startTime');
                    vm.smsLog.query.endTime = utilService.createDatePicker('#groupSmsLogQuery .endTime');
                }
                vm.smsLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.smsLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.smsLog.pageObj = utilService.createPageForPagingTable(tablePageId, {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "smsLog", vm.searchSMSLog)
                });
                // Be user friendly: Fetch some results immediately!
                vm.searchSMSLog(true);
            });
        };

        vm.searchSMSLog = function (newSearch) {
            var requestData = {
                // playerId: vm.selectedSinglePlayer.playerId,
                isAdmin: vm.smsLog.query.isAdmin,
                isSystem: vm.smsLog.query.isSystem,
                status: vm.smsLog.query.status,
                startTime: vm.smsLog.query.startTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .startTime input').val() || undefined,
                endTime: vm.smsLog.query.endTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .endTime   input').val() || undefined,
                index: newSearch ? 0 : vm.smsLog.index,
                limit: newSearch ? 10 : vm.smsLog.limit,
            };
            if (vm.smsLog.type == "single") {
                requestData.playerId = vm.selectedSinglePlayer.playerId;
            }

            console.log("searchSMSLog requestData:", requestData);
            $scope.$socketPromise('searchSMSLog', requestData).then(result => {
                $scope.$evalAsync(() => {
                    console.log("searchSMSLog result", result);
                    vm.smsLog.searchResults = result.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        if (item.status == "failure" && item.error && item.error.status == 430) {
                            item.error = $translate('RESPONSE_TIMEOUT');
                            item.status$ = $translate('unknown');
                        } else {
                            item.status$ = $translate(item.status);
                        }
                        return item;
                    });
                    vm.smsLog.totalCount = result.data.size;
                    vm.smsLog.pageObj.init({maxCount: vm.smsLog.totalCount}, newSearch);
                })
            }).catch(console.error);
        };

        vm.canEditPlayer = function () {
            return vm.isOneSelectedPlayer();
        };
        vm.isOneSelectedPlayer = function () {
            return vm.selectedSinglePlayer;
        };

        vm.advancedPlayerQuery = function (newSearch) {
            if (vm.advancedQueryObj.credibilityRemarks && (vm.advancedQueryObj.credibilityRemarks.constructor !== Array || vm.advancedQueryObj.credibilityRemarks.length === 0)) {
                delete vm.advancedQueryObj.credibilityRemarks;
            }
            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: vm.advancedQueryObj,
                index: newSearch ? 0 : (vm.playerTableQuery.index || 0),
                limit: vm.playerTableQuery.limit,
                sortCol: vm.playerTableQuery.sortCol
            };
            $("#playerTable-search-filter .form-control").prop("disabled", false).css("background-color", "#fff");
            $("#playerTable-search-filter .form-control input").prop("disabled", false).css("background-color", "#fff");
            $("select#selectCredibilityRemark").multipleSelect("enable");
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
                    if (vm.selectedSinglePlayer && vm.selectedSinglePlayer.referral) {
                        socketService.$socket($scope.AppSocket, 'getPlayerInfo', {_id: vm.selectedSinglePlayer.referral}, function (data) {
                            vm.showReferralName = data.data.name;
                            // $scope.safeApply();
                        });
                    }
                }
            });
        };

        //player datatable row click handler
        vm.playerTableRowClicked = function (rowData) {
            var deferred = Q.defer();
            console.log('player', rowData);
            vm.selectedPlayers = {};
            vm.selectedPlayers[rowData._id] = rowData;
            vm.selectedSinglePlayer = rowData;
            vm.currentSelectedPlayerObjId = '';

            var sendData = {_id: rowData._id};
            socketService.$socket($scope.AppSocket, 'getOnePlayerInfo', sendData, function (retData) {
                $scope.$evalAsync(() => {
                    var player = retData.data;
                    console.log('updated info');
                    if (!vm.selectedSinglePlayer) return;
                    if (player._id != vm.selectedSinglePlayer._id) {
                        console.log('click rowId is not equal to resultId');
                        //the result should be same with the click , if some condition like network not stable ,
                        //then we would rather use the pre-load data.
                        return;
                    }
                    vm.currentSelectedPlayerObjId = player._id;
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
                        smsSetting: vm.selectedSinglePlayer.smsSetting,
                        gender: vm.selectedSinglePlayer.gender,
                        DOB: vm.selectedSinglePlayer.DOB,
                        accAdmin: vm.selectedSinglePlayer.accAdmin
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

                    if (vm.selectedSinglePlayer.sourceUrl && vm.selectedSinglePlayer.sourceUrl.length > 35) {
                        vm.selectedSinglePlayer.$displaySourceUrl = vm.selectedSinglePlayer.sourceUrl.substring(0, 30) + "...";
                    } else {
                        vm.selectedSinglePlayer.$displaySourceUrl = vm.selectedSinglePlayer.sourceUrl || null;
                    }

                    if (vm.selectedSinglePlayer.domain && vm.selectedSinglePlayer.domain.length > 35) {
                        vm.selectedSinglePlayer.$displayDomain = vm.selectedSinglePlayer.domain.substring(0, 30) + "...";
                    } else {
                        vm.selectedSinglePlayer.$displayDomain = vm.selectedSinglePlayer.domain || null;
                    }
                })
                deferred.resolve();
            }, function (err) {
                vm.selectedPlayers = {};
                vm.selectedPlayers[rowData._id] = rowData;
                vm.selectedSinglePlayer = rowData;
                deferred.resolve();
            })
            return deferred.promise;
        };


        vm.createNewPlayer = async function () {
            // vm.newPlayer.platform = vm.selectedPlatform._id;
            // vm.newPlayer.platformId = vm.selectedPlatform.platformId;
            vm.newPlayer.gender = (vm.newPlayer.gender && vm.newPlayer.gender == "true") ? true : false;

            // replace the phone number if the encoded phone number has been re-entered
            if (vm.newPlayer && vm.newPlayer.encodedPhoneNumber && vm.newPlayer.encodedPhoneNumber.toString().indexOf('*') == -1){
                vm.newPlayer.phoneNumber = vm.newPlayer.encodedPhoneNumber;
            }

            if (vm.newPlayer.encodedPhoneNumber){
                delete vm.newPlayer.encodedPhoneNumber;
            }

            if(vm.newPlayer.phoneNumber){
                let reg = new RegExp('^[0-9]+$');

                if (!reg.test(vm.newPlayer.phoneNumber)){
                    return socketService.showErrorMessage($translate("Phone number can only be digits"));
                }
            }

            console.log('newPlayer', vm.newPlayer);
            if (vm.newPlayer.createPartner) {
                socketService.$socket($scope.AppSocket, 'createPlayerPartner', vm.newPlayer, function (data) {
                    vm.playerCreateResult = data;
                    vm.getPlatformPlayersData();
                    vm.displayPhoneError(data.status);
                    $scope.safeApply();
                }, function (err) {
                    vm.playerCreateResult = err;
                    console.log('createPlayerDataError', err);
                    vm.displayPhoneError(err.status);
                    if (err.status && err.status == 454) {
                        vm.existPhone = true;
                    }
                    $scope.safeApply();
                });
            } else {
                socketService.$socket($scope.AppSocket, 'createPlayer', vm.newPlayer, function (data) {
                    vm.createPlayerRegistrationIntentRecord(data);
                    vm.playerCreateResult = data;
                    vm.getPlatformPlayersData();
                    vm.displayPhoneError(data.status);
                    $scope.safeApply();
                }, function (err) {
                    vm.playerCreateResult = err;
                    console.log('createPlayerDataError', err);
                    vm.displayPhoneError(err.error.status);

                    $scope.safeApply();
                });
            }
        };

        vm.displayPhoneError = function (status) {
            if (status && status == 454) {
                vm.existPhone = true;
            } else {
                vm.existPhone = false;
            }
        }

        vm.createPlayerRegistrationIntentRecord = function (data) {

            var intentData = {
                adminInfo: {
                    type: "admin",
                    name: authService.adminName,
                    id: authService.adminId
                },
                name: data.data.name,
                realName: data.data.realName,
                password: data.data.password,
                platformId: data.data.platformId,
                domain: data.data.domain,
                phoneNumber: data.data.phoneNumber,
                email: data.data.email,
                smsCode: "",
                lastLoginIp: data.data.lastLoginIp,
                loginIps: data.data.loginIps,
                userAgent: data.data.userAgent,
                phoneProvince: data.data.phoneProvince,
                phoneCity: data.data.phoneCity,
                phoneType: data.data.phoneType,
                partnerId: data.data.partnerId,
                isOnline: data.data.isOnline,
                playerObjId: data.data._id,
                playerId: data.data.playerId,
                remarks: data.data.partnerName ? $translate("PARTNER") + ": " + data.data.partnerName : "",
                status: vm.constProposalStatus.MANUAL,
                platform: data.data.platform
            };

            socketService.$socket($scope.AppSocket, 'createPlayerRegistrationIntentRecord', intentData, function (data) {
                console.log('player registration intent record created', data);
            }, function (err) {
                console.log('player registration intent record creation failed', err);
            });
        }


        // vm.existNumberDetector = function (newSearch) {
        //
        //     if (!vm.newPlayer.phoneNumber) {
        //         return
        //     }
        //     let phoneNumber = vm.newPlayer.phoneNumber;
        //     if (vm.selectedPlatform.whiteListingPhoneNumbers && vm.selectedPlatform.whiteListingPhoneNumbers.indexOf(String(vm.newPlayer.phoneNumber)) !== -1) {
        //         // $scope.$evalAsync(() => {
        //         //     vm.existPhone = false;
        //         // });
        //         vm.existPhone = false;
        //         $scope.safeApply();
        //         return;
        //     }
        //
        //     if (vm.newPlayer && vm.newPlayer.encodedPhoneNumber && vm.newPlayer.encodedPhoneNumber.toString().indexOf('*') == -1){
        //         phoneNumber = vm.newPlayer.encodedPhoneNumber;
        //     }
        //
        //     //var selectedStatus = ["Success", "Fail", "Pending", "Manual"]; //["Success", "Manual"];
        //     var selectedStatus = [vm.constProposalStatus.PENDING, vm.constProposalStatus.MANUAL, vm.constProposalStatus.SUCCESS];
        //     var sendData = {
        //         adminId: authService.adminId,
        //         platformId: vm.selectedPlatform._id,
        //         type: ["PlayerRegistrationIntention"],
        //         phoneNumber: phoneNumber,
        //         size: newSearch ? 10 : (vm.phoneDuplicate.limit || 10),
        //         index: newSearch ? 0 : (vm.phoneDuplicate.index || 0),
        //         // sortCol: vm.newPlayerRecords.sortCol || null,
        //         displayPhoneNum: true
        //     }
        //     sendData.status = selectedStatus;
        //     socketService.$socket($scope.AppSocket, 'getDuplicatePlayerPhoneNumber', sendData, function (data) {
        //         let phoneDuplicateCount = data.data.size;
        //         vm.phoneDuplicateCount = phoneDuplicateCount
        //         if (data.data.size == 0) {
        //             vm.existPhone = false;
        //         } else {
        //             vm.existPhone = true;
        //         }
        //         $scope.safeApply();
        //
        //     });
        // }

        vm.checkIsPhoneNumberExist = function (isCreate) {
            if (isCreate) {
                vm.duplicatedPhoneErr = {};
            }

            let phoneNumber = vm.newPlayer.phoneNumber;
            let platform = vm.selectedPlatform ._id;

            if (vm.newPlayer && vm.newPlayer.encodedPhoneNumber && vm.newPlayer.encodedPhoneNumber.toString().indexOf('*') == -1){
                phoneNumber = vm.newPlayer.encodedPhoneNumber;
            }

            if (phoneNumber && platform) {
                socketService.$socket($scope.AppSocket, 'isPhoneNumberExist', {
                    phoneNumber: phoneNumber,
                    platformObjId: platform
                }, function (data) {
                    $scope.$evalAsync(()=>{
                        if (data.data.length) {
                            console.log("data.data.......", data.data);

                            if(!vm.newPlayer.encodedPhoneNumber){
                                return
                            }else{
                                console.log("checkIsPhoneNumberExist:", data);
                                vm.duplicatedPhoneErr.str = `此号码已绑定给玩家: ${data.data[0]}`
                            }

                        }
                    })
                });
            }
        };

        vm.duplicatePhoneNumberDetector = function (newSearch, isPlayer) {
            let phoneNum = '';
            if (isPlayer) {
                if (!vm.newPlayer.phoneNumber) {
                    return;
                } else {
                    phoneNum = vm.newPlayer.phoneNumber;
                }
            } else {
                if (!vm.newPartner.phoneNumber) {
                    return;
                } else {
                    phoneNum = vm.newPartner.phoneNumber;
                }
            }

            let sendData = {
                platformId: vm.selectedPlatform.id,
                phoneNumber: phoneNum,
                limit: newSearch ? 10 : (vm.duplicatePhoneNumber.limit || 10),
                index: newSearch ? 0 : (vm.duplicatePhoneNumber.index || 0),
                isPlayer: isPlayer
            }

            socketService.$socket($scope.AppSocket, 'getDuplicatePhoneNumber', sendData, function (data) {
                let duplicatePhoneNumberCount = data.data.size || 0;

                if (duplicatePhoneNumberCount == 0) {
                    vm.existPhone = false;
                } else {
                    vm.existPhone = true;
                }

                $scope.safeApply();

            });
        };

        vm.initPhoneNumberRecord = function () {
            vm.duplicatePhoneNumber = {};
            utilService.actionAfterLoaded('#duplicatePhoneNumberLog.in #duplicatePhoneNumberLogTablePage', function () {
                vm.duplicatePhoneNumber.pageObj = utilService.createPageForPagingTable("#duplicatePhoneNumberLogTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "duplicatePhoneNumber", vm.loadPhoneNumberRecord);
                });

                let isPlayer = true;
                if (vm.newPlayer && vm.newPlayer.createPartner) {
                    isPlayer = false;
                }
                vm.loadPhoneNumberRecord(true, isPlayer);
            });
        }



        vm.loadPhoneNumberRecord = function (newSearch, isPlayer) {
            let phoneNum = '';

            if (isPlayer) {
                if (!vm.newPlayer.phoneNumber) {
                    return;
                } else {
                    phoneNum = vm.newPlayer.phoneNumber;
                }
            } else {
                if (!vm.newPartner.phoneNumber) {
                    return;
                } else {
                    phoneNum = vm.newPartner.phoneNumber;
                }
            }

            vm.getCredibilityRemarks();

            let sendData = {
                platformId: vm.selectedPlatform._id,
                phoneNumber: phoneNum,
                limit: newSearch ? 10 : (vm.duplicatePhoneNumber.limit || 10),
                index: newSearch ? 0 : (vm.duplicatePhoneNumber.index || 0),
                sortCol: vm.duplicatePhoneNumber.sortCol || null,
                isPlayer: isPlayer
            }

            socketService.$socket($scope.AppSocket, 'getDuplicatePhoneNumber', sendData, function (data) {
                console.log("getDuplicatePhoneNumber", data);
                let tblData = data && data.data ? data.data.data : [];
                let total = data.data ? data.data.size : 0;
                vm.duplicatePhoneNumber.totalCount = total;

                if (tblData && tblData.length > 0) {
                    tblData.map(
                        record => {
                            let credibilityRemarksTXT = '';
                            record.name = record.data.name ? record.data.name : "";
                            record.realName = record.data.realName ? record.data.realName : "";
                            record.lastLoginIp = record.lastLoginIp ? record.lastLoginIp : "";
                            record.combinedArea = (record.data.phoneProvince && record.data.phoneCity) ? record.data.phoneProvince + " " + record.data.phoneCity : "";
                            record.registrationTime = record.data.registrationTime ? vm.dateReformat(record.data.registrationTime) : "";
                            record.playerLevelName = record.data.playerLevel ? $translate(record.data.playerLevel.name) : "";
                            record.credibilityRemarks = record.data.credibilityRemarks ? vm.credibilityRemarks.filter(item => {
                                return record.data.credibilityRemarks.includes(item._id);
                            }) : [];
                            record.credibilityRemarksName = record.credibilityRemarks.map(function (value, index) {
                                let colon = '';
                                credibilityRemarksTXT += value.name + colon;
                                return credibilityRemarksTXT;
                            }) || '';
                            record.valueScore = record.data.valueScore ? record.data.valueScore : "";
                            record.ipAreaName = record.data.ipArea ? vm.getIpAreaName(record.data.ipArea) : '';
                            record.lastAccessTime = record.data.lastAccessTime ? vm.dateReformat(record.data.lastAccessTime) : "";
                            Object.keys(vm.allPlayersStatusString).filter(item => {
                                return record.data.playerStatus == vm.allPlayersStatusString[item];
                            })[0];
                            record.playerStatusName = $translate("Enable");
                            if (record.data.forbidPlayerFromLogin == true) {
                                record.playerStatusName = $translate("Disable")
                            }
                            return record;
                        }
                    );
                }
                vm.prepareDuplicatePhoneNumberRecords(newSearch, tblData, total, isPlayer);
            });
        };

        vm.prepareDuplicatePhoneNumberRecords = function (newSearch, tblData, size, isPlayer) {
            let columns = [];
            if (isPlayer) {
                columns = [
                    {title: $translate('PLAYERNAME'), data: "name"},
                    {title: $translate('Real Name'), data: "realName"},
                    {title: $translate('CREDIBILITY'), data: "credibilityRemarksName"},
                    {title: $translate('PLAYER_VALUE'), data: "valueScore"},
                    {
                        title: $translate('STATUS'), data: "playerStatusName",
                        render: function (data, type, row) {
                            let color = "black";
                            if (row.data.forbidPlayerFromLogin == true) {
                                color = "red";
                            }
                            return '<div style="color:' + color + '">' + data + '</div>';
                        }
                    },
                    {title: $translate('PlayerLevel'), data: "playerLevelName"},
                    {title: $translate('REGISTERED_IP'), data: "ipAreaName"},
                    {title: $translate('PHONE_LOCATION'), data: "combinedArea"},
                    {title: $translate('REGISTERED_TIME'), data: "registrationTime"},
                    {title: $translate('last_access_time'), data: "lastAccessTime"}
                ]
            } else {
                columns = [
                    {title: $translate('PARTNER_NAME'), data: "name"},
                    {title: $translate('Real Name'), data: "realName"},
                    {title: $translate('CREDIBILITY'), data: "credibilityRemarksName"},
                    {
                        title: $translate('STATUS'), data: "playerStatusName",
                        render: function (data, type, row) {
                            let color = "black";
                            if (row.data.forbidPlayerFromLogin == true) {
                                color = "red";
                            }
                            return '<div style="color:' + color + '">' + data + '</div>';
                        }
                    },
                    {title: $translate('REGISTERED_IP'), data: "ipAreaName"},
                    {title: $translate('PHONE_LOCATION'), data: "combinedArea"},
                    {title: $translate('REGISTERED_TIME'), data: "registrationTime"},
                    {title: $translate('last_access_time'), data: "lastAccessTime"}
                ]
            }

            let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    {'sortCol': 'status', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'data.name', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'data.realName', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'lastLoginIp', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'data.phoneNumber', bSortable: true, 'aTargets': [7]},
                ],
                columns: columns,
                destroy: true,
                paging: false,
                autoWidth: true,
            });
            let aTable = $("#duplicatePhoneNumberLogTable").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.duplicatePhoneNumber.pageObj.init({maxCount: size}, newSearch);
            $('#duplicatePhoneNumberLogTable').resize();
            $('#duplicatePhoneNumberLogTable').off('order.dt');
            $scope.safeApply();
        };


        vm.prepareCredibilityConfig = () => {
            vm.removedRemarkId = [];
            return vm.getCredibilityRemarks(true).then(
                () => {
                    $scope.$evalAsync(() => {
                        let cloneRemarks = vm.credibilityRemarks.slice(0);
                        vm.positiveRemarks = [];
                        vm.negativeRemarks = [];
                        vm.neutralRemarks = [];

                        let len = cloneRemarks.length;

                        for (let i = 0; i < len; i++) {
                            let remark = cloneRemarks[i];
                            if (remark.score > 0) {
                                vm.positiveRemarks.push(remark);
                            }
                            else if (remark.score < 0) {
                                vm.negativeRemarks.push(remark);
                            }
                            else {
                                vm.neutralRemarks.push(remark);
                            }
                        }

                        vm.positiveRemarks.sort((a, b) => {
                            return b.score - a.score;
                        });

                        vm.negativeRemarks.sort((a, b) => {
                            return a.score - b.score;
                        });
                    });
                }
            );
        };

        vm.getCredibilityRemarks = (forbidUIRenderTwice) => {
            return new Promise((resolve, reject) => {
                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: vm.selectedPlatform._id}, function (data) {
                    vm.credibilityRemarks = data.data;
                    vm.filterCredibilityRemarks = data.data ? JSON.parse(JSON.stringify(data.data)) : [];
                    vm.filterCredibilityRemarks.push({'_id':'', 'name':'N/A'});
                    if(!forbidUIRenderTwice){
                        vm.setupRemarksMultiInput();
                        vm.setupRemarksMultiInputFeedback();
                    }
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });
        };

        vm.setupRemarksMultiInput = function () {
            let remarkSelect = $('select#selectCredibilityRemark');
            // if (remarkSelect.css('display') && remarkSelect.css('display').toLowerCase() === "none") {
            //     return;
            // }
            remarkSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
            remarkSelect.multipleSelect('refresh');
        };

        vm.setupRemarksMultiInputFeedback = function () {
            let remarkSelect = $('select#selectCredibilityRemarkFeedback');
            // if (remarkSelect.css('display') && remarkSelect.css('display').toLowerCase() === "none") {
            //     return;
            // }
            remarkSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
            remarkSelect.multipleSelect("uncheckAll");
        };

        vm.loadRealNameRecord = function (newSearch) {
            if (!vm.newPlayer.realName) {
                return;
            }
            vm.getCredibilityRemarks();
            let sendData = {
                platformId: vm.selectedPlatform.id,
                realName: vm.newPlayer.realName,
                limit: newSearch ? 10 : (vm.realNameDuplicate.limit || 10),
                index: newSearch ? 0 : (vm.realNameDuplicate.index || 0),
                sortCol: vm.realNameDuplicate.sortCol || null
            }

            socketService.$socket($scope.AppSocket, 'getDuplicatePlayerRealName', sendData, function (data) {
                console.log("getDuplicatePlayerRealName", data);
                let tblData = data && data.data ? data.data.data : [];
                let total = data.data ? data.data.size : 0;
                vm.realNameDuplicate.totalCount = total;

                if (tblData && tblData.length > 0) {
                    tblData.map(
                        record => {
                            let credibilityRemarksTXT = '';
                            record.name = record.data.name ? record.data.name : "";
                            record.realName = record.data.realName ? record.data.realName : "";
                            record.lastLoginIp = record.lastLoginIp ? record.lastLoginIp : "";
                            record.combinedArea = (record.data.phoneProvince && record.data.phoneCity) ? record.data.phoneProvince + " " + record.data.phoneCity : "";
                            record.registrationTime = record.data.registrationTime ? vm.dateReformat(record.data.registrationTime) : "";
                            record.playerLevelName = record.data.playerLevel ? $translate(record.data.playerLevel.name) : "";
                            record.credibilityRemarks = record.data.credibilityRemarks ? vm.credibilityRemarks.filter(item => {
                                return record.data.credibilityRemarks.includes(item._id);
                            }) : [];
                            record.credibilityRemarksName = record.credibilityRemarks.map(function (value, index) {
                                let colon = '';
                                credibilityRemarksTXT += value.name + colon;
                                return credibilityRemarksTXT;
                            }) || '';
                            record.valueScore = record.data.valueScore ? record.data.valueScore : "";
                            record.ipAreaName = record.data.ipArea ? vm.getIpAreaName(record.data.ipArea) : '';
                            record.lastAccessTime = record.data.lastAccessTime ? vm.dateReformat(record.data.lastAccessTime) : "";
                            Object.keys(vm.allPlayersStatusString).filter(item => {
                                return record.data.playerStatus == vm.allPlayersStatusString[item];
                            })[0];
                            record.playerStatusName = $translate("Enable");
                            if (record.data.forbidPlayerFromLogin == true) {
                                record.playerStatusName = $translate("Disable")
                            }
                            return record;
                        }
                    );
                }
                vm.prepareRealNameDuplicateRecords(newSearch, tblData, total);
            });
        };

        vm.loadSMSSettings = function () {
            let selectedPlayer = vm.isOneSelectedPlayer();   // ~ 20 fields!
            let editPlayer = vm.editPlayer;                  // ~ 6 fields
            vm.playerBeingEdited = {
                smsSetting: editPlayer.smsSetting,
                receiveSMS: editPlayer.receiveSMS
            };
        };

        vm.smsSettingToggleSelectAll = function () {
            let status = vm.playerBeingEdited.smsSettingSelectAll;
            for (let type in vm.allMessageTypes) {
                let settingName = vm.allMessageTypes[type].name;
                if (settingName != "smsVerificationCode") {
                    vm.playerBeingEdited.smsSetting[settingName] = status;
                }
            }
        };
        vm.smsSettingSetSelectAll = function () {
            for (let type in vm.allMessageTypes) {
                let settingName = vm.allMessageTypes[type].name;
                if (settingName != "smsVerificationCode" && !vm.playerBeingEdited.smsSetting[settingName]) {
                    vm.playerBeingEdited.smsSettingSelectAll = false;
                    return;
                }
            }
            vm.playerBeingEdited.smsSettingSelectAll = true;
        };

        vm.updateSMSSettings = function () {
            //oldPlayerData.partner = oldPlayerData.partner ? oldPlayerData.partner._id : null;
            let playerId = vm.isOneSelectedPlayer()._id;

            var updateSMS = {
                receiveSMS: vm.playerBeingEdited.receiveSMS != null ? vm.playerBeingEdited.receiveSMS : undefined,
                smsSetting: vm.playerBeingEdited.smsSetting,
            }

            socketService.$socket($scope.AppSocket, 'updatePlayer', {
                query: {_id: playerId},
                updateData: updateSMS
            }, function (updated) {
                console.log('updated', updated);
                vm.getPlatformPlayersData();
            });

        };

        vm.isAllNoSmsGroupChecked = () => {
            let isAllChecked = true;
            for (let i = 0; i < vm.noGroupSmsSetting.length; i++) {
                if (vm.playerBeingEdited.smsSetting[vm.noGroupSmsSetting[i].name] === false) {
                    isAllChecked = false;
                    break;
                }
            }
            vm.playerBeingEdited.checkAllNoSmsGroup = isAllChecked;
        };

        vm.toggleAllNoSmsGroup = () => {
            if (vm.playerBeingEdited.checkAllNoSmsGroup === false) {
                vm.noGroupSmsSetting.forEach(
                    noGroup => {
                        vm.playerBeingEdited.smsSetting[noGroup.name] = false;
                    }
                );
            } else {
                vm.noGroupSmsSetting.forEach(
                    noGroup => {
                        vm.playerBeingEdited.smsSetting[noGroup.name] = true;
                    }
                );
            }
        };

        vm.isAllIsSmsGroupChecked = () => {
            let smsSettingInThisGroup = vm.smsGroups.filter(smsGroup => smsGroup.smsParentSmsId === -1);
            let isAllChecked = true;
            for (let i = 0; i < smsSettingInThisGroup.length; i++) {
                let groupSmsId = smsSettingInThisGroup[i].smsId;
                if (vm.playerSmsSetting.smsGroup[groupSmsId] === false) {
                    isAllChecked = false;
                    break;
                }
            }
            vm.playerBeingEdited.checkAllIsSmsGroup = isAllChecked;
        };

        vm.toggleAllIsSmsGroup = () => {
            if (vm.playerBeingEdited.checkAllIsSmsGroup === false) {
                vm.smsGroups.forEach(
                    smsGroup => {
                        if (smsGroup.smsParentSmsId !== -1) {
                            vm.playerBeingEdited.smsSetting[smsGroup.smsName] = false;
                        } else {
                            vm.playerSmsSetting.smsGroup[smsGroup.smsId] = false;
                        }

                    }
                );
            } else {
                vm.smsGroups.forEach(
                    smsGroup => {
                        if (smsGroup.smsParentSmsId !== -1) {
                            vm.playerBeingEdited.smsSetting[smsGroup.smsName] = true;
                        } else {
                            vm.playerSmsSetting.smsGroup[smsGroup.smsId] = true;
                        }
                    }
                );
            }
        };

        vm.smsGroupCheckChange = (smsParentGroup) => {
            let smsSettingInThisGroup = vm.smsGroups.filter(smsGroup => smsGroup.smsParentSmsId === smsParentGroup.smsId);
            let isGroupChecked = vm.playerSmsSetting.smsGroup[smsParentGroup.smsId];
            smsSettingInThisGroup.forEach(
                smsSetting => {
                    vm.playerBeingEdited.smsSetting[smsSetting.smsName] = isGroupChecked;
                }
            );
        };

        vm.isAllSmsInGroupChecked = (smsParentGroup) => {
            let smsSettingInThisGroup = vm.smsGroups.filter(smsGroup => smsGroup.smsParentSmsId === smsParentGroup.smsId);
            let isAllChecked = true;
            for (let i = 0; i < smsSettingInThisGroup.length; i++) {
                if (vm.playerBeingEdited.smsSetting[smsSettingInThisGroup[i].smsName] === false) {
                    isAllChecked = false;
                    break;
                }
            }
            vm.playerSmsSetting.smsGroup[smsParentGroup.smsId] = isAllChecked;
            vm.isAllIsSmsGroupChecked();
        };

        vm.preparePaymentMonitorPage = function () {
            $('#autoRefreshProposalFlag')[0].checked = true;
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.paymentMonitorQuery = {};
            vm.paymentMonitorQuery.totalCount = 0;
            vm.getAllPaymentAcc();

            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];
                    vm.merchantsNBcard();
                    vm.getMerchantTypeName();
                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    vm.getPaymentMonitorRecord();
                    vm.merchantGroupCloneList = vm.merchantGroups;
                }
            );

            utilService.actionAfterLoaded("#paymentMonitorTablePage", function () {
                vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery');
                vm.paymentMonitorQuery.merchantType = null;
                vm.paymentMonitorQuery.pageObj = utilService.createPageForPagingTable("#paymentMonitorTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "paymentMonitorQuery", vm.getPaymentMonitorRecord)
                });
                $scope.safeApply();
            })

        };
        vm.preparePaymentMonitorTotalPage = function () {
            $('#paymentTotalAutoRefreshProposalFlag')[0].checked = true;
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.paymentMonitorTotalQuery = {};
            vm.paymentMonitorTotalCompletedQuery = {};
            vm.paymentMonitorTotalQuery.totalCount = 0;
            vm.paymentMonitorTotalQuery.querySearchTime = 0;
            vm.paymentMonitorTotalQuery.querySearchTime2 = 0;
            vm.getAllPaymentAcc();

            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];
                    vm.merchantsNBcard();
                    vm.getMerchantTypeName();
                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    // vm.getPaymentMonitorTotalRecord();
                    // vm.getPaymentMonitorTotalCompletedRecord();
                    vm.merchantGroupCloneList = vm.merchantGroups;
                    // vm.getPlatformByAdminId();
                }
            );

            utilService.actionAfterLoaded("#paymentMonitorTotalTablePage", function () {
                vm.paymentMonitorTotalQuery.startTime = utilService.createDatePicker('#paymentMonitorTotalQuery' + ' .startTime');
                let startTime = utilService.getTodayStartTime();
                vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').setLocalDate(new Date(startTime));

                vm.paymentMonitorTotalQuery.endTime = utilService.createDatePicker('#paymentMonitorTotalQuery' + ' .endTime');
                vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
                vm.paymentMonitorTotalQuery.merchantType = null;
                $scope.safeApply();
            })
        };

        vm.merchantsNBcard = function () {
            Object.keys(vm.merchants).forEach(item => {
                let merchantTypeId = vm.merchants[item].merchantTypeId;
                if (merchantTypeId == "9999") {
                    vm.merchants[item].merchantTypeName = $translate('BankCardNo');
                } else if (merchantTypeId == "9998") {
                    vm.merchants[item].merchantTypeName = $translate('PERSONAL_WECHAT_GROUP');
                } else if (merchantTypeId == "9997") {
                    vm.merchants[item].merchantTypeName = $translate('PERSONAL_ALIPAY_GROUP');
                } else if (merchantTypeId != "9997" && merchantTypeId != "9998" && merchantTypeId != "9999") {
                    let merchantInfo = vm.merchantTypes.filter(mitem => {
                        return mitem.merchantTypeId == merchantTypeId;
                    })
                    vm.merchants[item].merchantTypeName = merchantInfo[0] ? merchantInfo[0].name : "";
                } else {
                    vm.merchants[item].merchantTypeName = '';
                }
            });
            vm.merchantCloneList = angular.copy(vm.merchants);
        }
        // function for new topup report
        // vm.getProvinceName = function (provinceId) {
            // socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, function (data) {
            //     var text = data.data.data ? data.data.data.name : '';
            //     vm.selectedProposal.data.provinceName = text;
            //     $scope.safeApply();
            // });
        // }

        // vm.getCityName = function (cityId) {
            // socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, function (data) {
            //     var text = data.data.data ? data.data.data.name : '';
            //     vm.selectedProposal.data.cityName = text;
            //     $scope.safeApply();
            // });
        // }
        vm.getMerchantTypeName = function () {
            vm.merchants.map(item => {
                let merchantTypeId = item.merchantTypeId;
                if (merchantTypeId) {
                    if (merchantTypeId == "9999") {
                        item.merchantTypeName = $translate('BankCardNo');
                    } else {
                        let merchantInfo = vm.merchantTypes.filter(mitem => {
                            return mitem.merchantTypeId == merchantTypeId;
                        });
                        item.merchantTypeName = merchantInfo[0] ? merchantInfo[0].name : "";
                    }
                } else {
                    item.merchantTypeName = '';
                }
            })
        }
        vm.getAllPaymentAcc = function () {
            socketService.$socket($scope.AppSocket, 'getAllBankCard', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.bankCards = data.data ? data.data : [];
                });
            socketService.$socket($scope.AppSocket, 'getAllAlipaysByAlipayGroup', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.allAlipaysAcc = data.data ? data.data : [];
                });
            socketService.$socket($scope.AppSocket, 'getAllWechatpaysByWechatpayGroup', {platform: vm.selectedPlatform.platformId},
                data => {
                    var data = data.data;
                    vm.allWechatpaysAcc = data.data ? data.data : [];
                });

        }
        vm.wechatNameConvert = function () {
            vm.selectedProposal.data.weAcc = '';
            vm.selectedProposal.data.weName = '';
            vm.selectedProposal.data.weQRCode = '';

            if (vm.selectedProposal.data.wechatAccount) {
                vm.selectedProposal.data.weAcc = vm.selectedProposal.data.wechatAccount;
            }
            if (vm.selectedProposal.data.weChatAccount) {
                vm.selectedProposal.data.weAcc = vm.selectedProposal.data.weChatAccount;
            }
            if (vm.selectedProposal.data.wechatName) {
                vm.selectedProposal.data.weName = vm.selectedProposal.data.wechatName;
            }
            if (vm.selectedProposal.data.weChatName) {
                vm.selectedProposal.data.weName = vm.selectedProposal.data.weChatName;
            }
            if (vm.selectedProposal.data.wechatQRCode) {
                vm.selectedProposal.data.weQRCode = vm.selectedProposal.data.wechatQRCode;
            }
            if (vm.selectedProposal.data.weChatQRCode) {
                vm.selectedProposal.data.weQRCode = vm.selectedProposal.data.weChatQRCode;
            }
            $scope.safeApply();
        }
        vm.getCardLimit = function (typeName) {
            let acc = '';
            if (typeName == 'ManualPlayerTopUp') {
                let bankCardNo = vm.selectedProposal.data.bankCardNo;
                if (bankCardNo && vm.bankCards && vm.bankCards.length > 0) {
                    vm.selectedProposal.card = vm.bankCards.filter(item => {
                            return item.accountNumber == bankCardNo
                        })[0] || {singleLimit: '0', quota: '0'};
                } else {
                    vm.selectedProposal.card = {singleLimit: '0', quota: '0'};
                }
            } else if (typeName == "PlayerAlipayTopUp") {
                let merchantNo = vm.selectedProposal.data.alipayAccount;
                if (merchantNo && vm.allAlipaysAcc && vm.allAlipaysAcc.length > 0) {
                    vm.selectedProposal.card = vm.allAlipaysAcc.filter(item => {
                            return item.accountNumber == merchantNo
                        })[0] || {singleLimit: '0', quota: '0'};
                } else {
                    vm.selectedProposal.card = {singleLimit: '0', quota: '0'};
                }
            } else if (typeName == "PlayerWechatTopUp") {
                let merchantNo = vm.selectedProposal.data.wechatAccount || vm.selectedProposal.data.weChatAccount || vm.selectedProposal.data.weChatName || vm.selectedProposal.data.wechatName;
                if (merchantNo && vm.allWechatpaysAcc && vm.allWechatpaysAcc.length > 0) {
                    vm.selectedProposal.card = vm.allWechatpaysAcc.filter(item => {
                            return item.accountNumber == merchantNo
                        })[0] || {singleLimit: '0', quota: '0'};
                } else {
                    vm.selectedProposal.card = {singleLimit: '0', quota: '0'};
                }
            } else if (typeName == "PlayerTopUp") {
                let merchantNo = vm.selectedProposal.data.merchantNo;
                if (merchantNo && vm.merchants && vm.merchants.length > 0) {
                    vm.selectedProposal.card = vm.merchants.filter(item => {
                            return item.merchantNo == merchantNo
                        })[0] || {singleLimit: '0', quota: '0'};
                } else {
                    vm.selectedProposal.card = {singleLimit: '0', quota: '0'};
                }
            }
            $scope.safeApply();
            return vm.selectedProposal;
        }


        vm.getUserCardGroup = function (typeName, platformId, playerId) {
            var myQuery = {
                playerId: playerId
            }
            socketService.$socket($scope.AppSocket, 'getOnePlayerCardGroup', myQuery, function (data) {
                console.log('playerData', data);
                vm.proposalPlayer = data.data;
                if (vm.proposalPlayer.credibilityRemarks.length > 0) {
                    let credibilityRemarksName = vm.credibilityRemarks.filter(item => {
                        return vm.proposalPlayer.credibilityRemarks.includes(item._id);
                    });
                    let txt = '';
                    let colon = ',';
                    credibilityRemarksName.forEach(function (value, index) {
                        if (index == (credibilityRemarksName.length - 1)) {
                            colon = ''
                        }
                        txt += value.name + colon;
                    })
                    vm.proposalPlayer.credibilityRemarksName = txt;
                }
                $scope.safeApply();
            });

        }
        vm.loadPlayerLevel = function (platformId, playerLevel) {
            socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {
                platformId: platformId
            }, function (data) {
                let dayLimit = 0;
                let playerLevelInfo = data.data.filter(item => {
                    return item._id == playerLevel;
                })
                if (playerLevelInfo) {
                    playerLevelInfo[0].levelDownConfig.forEach(item => {
                    })
                }
                $scope.safeApply();
            }, function (data) {
                console.error("cannot get player level", data);
            });
        }
        vm.loadTodayTopupQuota = function (typeId, typeName, cardField, cardNo) {
            var start = new Date();
            start.setHours(0, 0, 0, 0);
            var end = new Date();
            end.setHours(23, 59, 59, 999);
            var sendData = {
                adminId: authService.adminId,
                platformId: vm.selectedPlatform._id,
                typeId: typeId,
                startDate: start,
                endDate: end,
                card: cardNo,
                cardField: cardField,
                size: 10,
                index: 0
            }
            sendData.status = ["Approved", "Success"];
            vm.selectedProposal.cardSumToday = 0;
            socketService.$socket($scope.AppSocket, 'getProposalAmountSum', sendData, function (data) {
                if (data.data.length > 0) {
                    vm.selectedProposal.cardSumToday = data.data[0].totalAmount || 0;
                } else {
                    vm.selectedProposal.cardSumToday = 0;
                }
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
        vm.filterMerchant = function (isPaymentMonitorTotal) {
            let tempModal = isPaymentMonitorTotal ? vm.paymentMonitorTotalQuery : vm.paymentMonitorQuery;
            let tempAgent = [];

            if (isPaymentMonitorTotal && tempModal.userAgent && tempModal.userAgent.length > 0) {
                tempModal.userAgent.forEach(item => {
                    switch (item) {
                        case "1":
                            tempAgent.push("1"); //pms device 1 stand for web
                            break;
                        case "3":
                            tempAgent.push("2"); //pms device 2 stand for h5
                            break;
                        case "2":
                            tempAgent.push("4"); //pms device 4 stand for app
                            break;
                    }
                });
            }

            vm.merchantCloneList = angular.copy(vm.merchants);
            vm.merchantGroupCloneList = vm.merchantGroups;
            let agent = isPaymentMonitorTotal ? tempAgent : tempModal && tempModal.userAgent ? tempModal.userAgent : [];
            let thirdParty = tempModal && tempModal.merchantGroup ? tempModal.merchantGroup : [];
            let mainTopupType = tempModal && tempModal.mainTopupType ? tempModal.mainTopupType : null;
            let topupType = tempModal && tempModal.topupType ? tempModal.topupType : [];
            let bankTypeId = tempModal && tempModal.bankTypeId ? tempModal.bankTypeId : null;
            if (agent && agent.length > 0) {
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    let targetDevices = String(item.targetDevices)
                    return agent.indexOf(targetDevices) != -1;
                });
            }

            if (topupType && topupType.length > 0 && vm.merchantCloneList) {
                // display online topup type
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    return topupType.indexOf(String(item.topupType)) != -1
                });
                vm.merchantGroupCloneList = vm.merchantGroupCloneList.filter(
                    item => {
                        let thirdPartyGroup = [];
                        vm.merchantCloneList.forEach(item => {
                            if (thirdPartyGroup.indexOf(item.merchantTypeName) === -1) {
                                thirdPartyGroup.push(item.merchantTypeName);
                            }
                        })
                        return thirdPartyGroup.indexOf(item.name) !== -1 && item.name
                    }
                )
            }

            // online topup
            if (thirdParty && thirdParty.length > 0) {
                let tpGroup = [];
                thirdParty.forEach(item => {
                    if (item.length > 0) {
                        item.forEach(i => {
                            tpGroup.push(i);
                        })
                    }
                })
                if (tpGroup.length > 0 && vm.merchantCloneList) {
                    vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                        let mno = String(item.merchantNo);
                        return tpGroup.indexOf(item.merchantNo) != -1
                    })
                }
            }

            //manual topup
            if (mainTopupType) {
                if (mainTopupType == '1' || mainTopupType == 1) {
                    // 9999 = 'bankcard', if manual topup ,display bankcard only
                    vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                        return item.merchantTypeId == '9999'
                    })
                }
                else if (mainTopupType == '3' || mainTopupType == 3) {
                    // 9999 = 'bankcard', if manual topup ,display bankcard only
                    vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                        return item.merchantTypeId == '9997'
                    })
                }
                else if (mainTopupType == '4' || mainTopupType == 4) {
                    // 9999 = 'bankcard', if manual topup ,display bankcard only
                    vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                        return item.merchantTypeId == '9998'
                    })
                } else {
                    vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                        return item.merchantTypeId != '9997' && item.merchantTypeId != '9998' && item.merchantTypeId != '9999'
                    })
                }
            }
            if (bankTypeId && (mainTopupType == '1' || mainTopupType == 1) && vm.merchantCloneList) {
                // filter selected banktype only
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    let bnkId = String(item.bankTypeId)
                    return bankTypeId.indexOf(bnkId) != -1;
                })
            }


        }
        vm.getPaymentMonitorRecord = function (isNewSearch) {
            let queryStartTime = vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate();
            let queryEndTime = vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate();

            let searchInterval = Math.abs(new Date(queryEndTime).getTime() - new Date(queryStartTime).getTime());
            if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
                socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
                return;
            }

            if (isNewSearch) {
                $('#autoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();

            if (vm.paymentMonitorQuery.mainTopupType === '0' || vm.paymentMonitorQuery.mainTopupType === '1' || vm.paymentMonitorQuery.mainTopupType === '3' || vm.paymentMonitorQuery.mainTopupType === '4' || vm.paymentMonitorQuery.mainTopupType === '5') {
                vm.paymentMonitorQuery.topupType = '';
                vm.paymentMonitorQuery.merchantGroup = '';
            }
            var staArr = vm.paymentMonitorQuery.status ? vm.paymentMonitorQuery.status : [];
            if (staArr.length > 0) {
                staArr.forEach(item => {
                    if (item == "Success") {
                        staArr.push("Approved");
                    }
                    if (item == "Fail") {
                        staArr.push("Rejected");
                    }
                })
            }
            vm.paymentMonitorQuery.index = isNewSearch ? 0 : (vm.paymentMonitorQuery.index || 0);
            var sendObj = {
                playerName: vm.paymentMonitorQuery.playerName,
                proposalNo: vm.paymentMonitorQuery.proposalID,
                mainTopupType: vm.paymentMonitorQuery.mainTopupType,
                userAgent: vm.paymentMonitorQuery.userAgent,
                topupType: vm.paymentMonitorQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
                depositMethod: vm.paymentMonitorQuery.depositMethod,

                //new
                bankTypeId: vm.paymentMonitorQuery.bankTypeId,
                //new
                merchantNo: vm.paymentMonitorQuery.merchantNo,
                status: staArr,
                startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),

                platformId: vm.curPlatformId,
                // dingdanID: vm.paymentMonitorQuery.dingdanID,
                // merchant: vm.paymentMonitorQuery.merchant,

                index: vm.paymentMonitorQuery.index,
                limit: vm.paymentMonitorQuery.limit || 10,
                sortCol: vm.paymentMonitorQuery.sortCol,

            }
            // let sendObj = {
            //     startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
            //     endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),
            //     platformId: vm.paymentMonitorQuery.platformId,
            //     mainTopupType: vm.paymentMonitorQuery.mainTopupType,
            //     topupType: vm.paymentMonitorQuery.topupType,
            //     merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
            //     playerName: vm.paymentMonitorQuery.playerName,
            //     index: vm.paymentMonitorQuery.index,
            //     limit: vm.paymentMonitorQuery.limit || 10,
            //     sortCol: vm.paymentMonitorQuery.sortCol
            // };

            vm.paymentMonitorQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo : null;
            console.log('sendObj', sendObj);
            if(vm.paymentMonitorQuery.merchantNo && vm.paymentMonitorQuery.merchantNo.length == 1 && vm.paymentMonitorQuery.merchantNo.indexOf('MMM4-line2') != -1){
                sendObj.line = '2';
                vm.paymentMonitorQuery.line = '2';
                sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo.filter(merchantData=>{
                    return merchantData != 'MMM4-line2';
                })
            }else{
                vm.paymentMonitorQuery.line = null;
            }
            socketService.$socket($scope.AppSocket, 'getPaymentMonitorResult', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    $('#paymentMonitorTableSpin').hide();
                    console.log('Payment Monitor Result', data);
                    vm.paymentMonitorQuery.totalCount = data.data.size;

                    vm.drawPaymentRecordTable(
                        data.data.data.map(item => {
                            item.amount$ = parseFloat(item.data.amount).toFixed(2);
                            item.merchantNo$ = item.data.merchantNo ? item.data.merchantNo
                                : item.data.wechatAccount ? item.data.wechatAccount
                                    : item.data.weChatAccount ? item.data.weChatAccount
                                        : item.data.alipayAccount ? item.data.alipayAccount
                                            : item.data.bankCardNo ? item.data.bankCardNo
                                                : item.data.accountNo ? item.data.accountNo : '';
                            item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                            item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                            item.status$ = $translate(item.status);
                            item.merchantName = vm.getMerchantName(item.data.merchantNo, item.inputDevice);

                            if (item.data.msg && item.data.msg.indexOf(" 单号:") !== -1) {
                                let msgSplit = item.data.msg.split(" 单号:");
                                item.merchantName = msgSplit[0];
                                item.merchantNo$ = msgSplit[1];
                            }

                            if (item.type.name === 'PlayerTopUp') {
                                //show detail topup type info for online topup.
                                let typeID = item.data.topUpType || item.data.topupType;
                                item.topupTypeStr = typeID
                                    ? $translate(vm.topUpTypeList[typeID])
                                    : $translate("Unknown")

                                let merchantNo = '';
                                if(item.data.merchantNo){
                                    merchantNo = item.data.merchantNo;
                                }
                                item.merchantNo$ = item && item.data && item.data.merchantName ? item.data.merchantName : vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
                            } else {
                                //show topup type for other types
                                item.topupTypeStr = $translate(item.type.name);
                            }
                            item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.createTime));
                            //item.endTime$ = item.data.lastSettleTime ? utilService.$getTimeFromStdTimeFormat(item.data.lastSettleTime) : "-";
                            item.endTime$ = item.settleTime ? utilService.$getTimeFromStdTimeFormat(item.settleTime) : "-";
                            // $('.merchantNoList').selectpicker('refresh');
                            item.remark$ = item.data.remark? item.data.remark: "";
                            return item;
                        }), data.data.size, {}, isNewSearch
                    );
                });
            }, function (err) {
                console.error(err);
            }, true);

        };

        vm.getPaymentMonitorTotalRecord = function (isNewSearch) {
            let queryStartTime = vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').getLocalDate();
            let queryEndTime = vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').getLocalDate();

            let searchInterval = Math.abs(new Date(queryEndTime).getTime() - new Date(queryStartTime).getTime());
            if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
                socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
                return;
            }

            if (isNewSearch) {
                $('#paymentTotalAutoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorTotalQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();
            $('#paymentMonitorTableASpin').show();

            if (vm.paymentMonitorTotalQuery.mainTopupType === '0' || vm.paymentMonitorTotalQuery.mainTopupType === '1' || vm.paymentMonitorTotalQuery.mainTopupType === '3' || vm.paymentMonitorTotalQuery.mainTopupType === '4' || vm.paymentMonitorTotalQuery.mainTopupType === '5') {
                vm.paymentMonitorTotalQuery.topupType = '';
                vm.paymentMonitorTotalQuery.merchantGroup = '';
                vm.paymentMonitorTotalQuery.merchantNo = '';
            }

            var sendObj = {
                playerName: vm.paymentMonitorTotalQuery.playerName,
                proposalNo: vm.paymentMonitorTotalQuery.proposalID,
                mainTopupType: vm.paymentMonitorTotalQuery.mainTopupType,
                userAgent: vm.paymentMonitorTotalQuery.userAgent,
                topupType: vm.paymentMonitorTotalQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorTotalQuery.merchantGroup)),
                depositMethod: vm.paymentMonitorTotalQuery.depositMethod,

                //new
                bankTypeId: vm.paymentMonitorTotalQuery.bankTypeId,
                //new
                merchantNo: vm.paymentMonitorTotalQuery.merchantNo,
                startTime: vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').getLocalDate(),
                platformList: vm.paymentMonitorTotalQuery.platformList ? vm.paymentMonitorTotalQuery.platformList : vm.platformByAdminId.map(item => item._id),
                sortCol: vm.paymentMonitorTotalQuery.sortCol,
                currentPlatformId: vm.selectedPlatform._id,
                failCount: vm.paymentMonitorTotalQuery.failCount
            };

            vm.paymentMonitorTotalQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorTotalQuery.merchantNo : null;
            if(vm.paymentMonitorTotalQuery.merchantNo && vm.paymentMonitorTotalQuery.merchantNo.length == 1 && vm.paymentMonitorTotalQuery.merchantNo.indexOf('MMM4-line2') != -1){
                sendObj.line = '2';
                vm.paymentMonitorTotalQuery.line = '2';
                sendObj.merchantNo = vm.paymentMonitorTotalQuery.merchantNo.filter(merchantData=>{
                    return merchantData != 'MMM4-line2';
                })
            }else{
                vm.paymentMonitorTotalQuery.line = null;
            }
            console.log('sendObj', sendObj);

            let searchStartTime = new Date().getTime();
            return $scope.$socketPromise('getPaymentMonitorTotalResult', sendObj).then(
                data => {
                    vm.paymentMonitorTotalQuery.querySearchTime = findQuerySearchTime(searchStartTime);
                    $('#paymentMonitorTableSpin').hide();
                    $('#paymentMonitorTableASpin').hide();
                    $scope.$evalAsync(() => {
                        console.log('Payment Monitor Total Result', data);
                        vm.paymentMonitorTotalData = data.data.data;

                        vm.drawPaymentRecordTotalTable(
                            data.data.data.filter(item => {
                                if(item){
                                    item.amount$ = parseFloat(item.data.amount).toFixed(2);
                                    item.merchantNo$ = item.data.merchantNo ? item.data.merchantNo
                                        : item.data.wechatAccount ? item.data.wechatAccount
                                            : item.data.weChatAccount != null ? item.data.weChatAccount
                                                : item.data.alipayAccount ? item.data.alipayAccount
                                                    : item.data.bankCardNo ? item.data.bankCardNo
                                                        : item.data.accountNo ? item.data.accountNo : null;
                                    //item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                                    item.playerCount$ = item.$playerCurrentCount + " (" + item.$playerGapTime + ")";
                                    item.playerCommonTopUpCount$ = item.$playerCurrentCommonTopUpCount;
                                    item.status$ = $translate(item.status);
                                    item.merchantName = vm.getMerchantName(item.data.merchantNo, item.inputDevice);
                                    item.website = item && item.data && item.data.platform && item.data.platformId && item.data.platformId.name ?
                                        item.data.platform + "." + item.data.platformId.name : "";

                                    if (item.data.msg && item.data.msg.indexOf(" 单号:") !== -1) {
                                        let msgSplit = item.data.msg.split(" 单号:");
                                        item.merchantName = msgSplit[0];
                                        item.merchantNo$ = msgSplit[1];
                                    }

                                    if (item.type.name === 'PlayerTopUp') {
                                        //show detail topup type info for online topup.
                                        let typeID = item.data.topUpType || item.data.topupType;
                                        item.topupTypeStr = typeID
                                            ? $translate(vm.topUpTypeList[typeID])
                                            : $translate("Unknown");
                                        let merchantNo = '';
                                        if(item.data.merchantNo){
                                            merchantNo = item.data.merchantNo;
                                        }
                                        item.merchantNo$ = item && item.data && item.data.merchantName ? item.data.merchantName : vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
                                    } else {
                                        //show topup type for other types
                                        item.topupTypeStr = $translate(item.type.name);
                                    }
                                    item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.createTime));
                                    item.endTime$ = item.settleTime ? utilService.$getTimeFromStdTimeFormat(item.settleTime) : "-";
                                    item.remark$ = item.data.remark ? item.data.remark : "";
                                    if (item.$merchantCurrentCount == item.$merchantAllCount && item.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                                        item.lockedButtonDisplay = "商户";
                                    } else if (item.$playerCurrentCount == item.$playerAllCount && item.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                                        item.lockedButtonDisplay = "玩家";
                                    } else if (item.$isExceedAmountTopUpDetect && item.data && item.data.amount && vm.selectedPlatform.monitorTopUpAmount && (item.data.amount >= vm.selectedPlatform.monitorTopUpAmount)) {
                                        item.lockedButtonDisplay = "玩家";
                                    }

                                    if(typeof item.data.userAgent == "object") {
                                        item.userAgent$ = utilService.retrieveAgent(item.data.userAgent);
                                    }else if(typeof item.data.userAgent != "undefined" && item.data.userAgent != ""){
                                        item.userAgent$ = item.data.userAgent;
                                    }else{
                                        item.userAgent$ = 1;
                                    }

                                    return item;
                                }
                            }), {}, isNewSearch
                        );
                    });
                }, err => {
                    console.error(err);
                }, true
            );
        };

        vm.getPaymentMonitorTotalCompletedRecord = function (isNewSearch) {
            let queryStartTime = vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').getLocalDate();
            let queryEndTime = vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').getLocalDate();

            let searchInterval = Math.abs(new Date(queryEndTime).getTime() - new Date(queryStartTime).getTime());
            if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
                socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
                return;
            }

            if (isNewSearch) {
                $('#paymentTotalAutoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorTotalQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();
            $('#paymentMonitorTableBSpin').show();

            if (vm.paymentMonitorTotalQuery.mainTopupType === '0' || vm.paymentMonitorTotalQuery.mainTopupType === '1' || vm.paymentMonitorTotalQuery.mainTopupType === '3' || vm.paymentMonitorTotalQuery.mainTopupType === '4' || vm.paymentMonitorTotalQuery.mainTopupType === '5') {
                vm.paymentMonitorTotalQuery.topupType = '';
                vm.paymentMonitorTotalQuery.merchantGroup = '';
                vm.paymentMonitorTotalQuery.merchantNo = '';
            }

            vm.paymentMonitorTotalQuery.index = isNewSearch ? 0 : (vm.paymentMonitorTotalQuery.index || 0);
            var sendObj = {
                playerName: vm.paymentMonitorTotalQuery.playerName,
                proposalNo: vm.paymentMonitorTotalQuery.proposalID,
                mainTopupType: vm.paymentMonitorTotalQuery.mainTopupType,
                userAgent: vm.paymentMonitorTotalQuery.userAgent,
                topupType: vm.paymentMonitorTotalQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorTotalQuery.merchantGroup)),
                depositMethod: vm.paymentMonitorTotalQuery.depositMethod,

                //new
                bankTypeId: vm.paymentMonitorTotalQuery.bankTypeId,
                //new
                merchantNo: vm.paymentMonitorTotalQuery.merchantNo,
                startTime: vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').getLocalDate(),
                platformList: vm.paymentMonitorTotalQuery.platformList ? vm.paymentMonitorTotalQuery.platformList : vm.platformByAdminId.map(item => item._id),
                index: vm.paymentMonitorTotalCompletedQuery.index,
                limit: vm.paymentMonitorTotalCompletedQuery.limit || 10,
                sortCol: vm.paymentMonitorTotalCompletedQuery.sortCol,
                currentPlatformId: vm.selectedPlatform._id,
                failCount: vm.paymentMonitorTotalQuery.failCount
            };

            vm.paymentMonitorTotalQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorTotalQuery.merchantNo : null;
            if(vm.paymentMonitorTotalQuery.merchantNo && vm.paymentMonitorTotalQuery.merchantNo.length == 1 && vm.paymentMonitorTotalQuery.merchantNo.indexOf('MMM4-line2') != -1){
                sendObj.line = '2';
                vm.paymentMonitorTotalQuery.line = '2';
                sendObj.merchantNo = vm.paymentMonitorTotalQuery.merchantNo.filter(merchantData=>{
                    return merchantData != 'MMM4-line2';
                })
            }else{
                vm.paymentMonitorTotalQuery.line = null;
            }
            console.log('sendObj', sendObj);

            let searchStartTime = new Date().getTime();
            return $scope.$socketPromise('getPaymentMonitorTotalCompletedResult', sendObj).then(
                data => {
                    vm.paymentMonitorTotalQuery.querySearchTime2 = findQuerySearchTime(searchStartTime);
                    $scope.$evalAsync(() => {
                        $('#paymentMonitorTableSpin').hide();
                        $('#paymentMonitorTableBSpin').hide();
                        console.log('Payment Monitor Total  Completed Result', data);

                        vm.drawPaymentRecordTotalCompletedTable(
                            data.data.filter(item => {
                                if(item){
                                    if (item.type.name === 'PlayerTopUp') {
                                        //show detail topup type info for online topup.
                                        let typeID = item.topUpType || item.topupType;
                                        item.topupTypeStr = typeID
                                            ? $translate(vm.topUpTypeList[typeID])
                                            : $translate("Unknown");
                                        let merchantNo = '';
                                        if(item.merchantNo){
                                            merchantNo = item.merchantNo;
                                        }
                                    } else {
                                        //show topup type for other types
                                        item.topupTypeStr = $translate(item.type.name);
                                    }

                                    //item.merchantCount$ = item.merchantCurrentCount + "/" + item.merchantTotalCount + " (" + item.merchantGapTime + ")";
                                    item.playerCount$ = item.playerCurrentCount + "/" + item.playerTotalCount + " (" + item.playerGapTime + ")";
                                    item.playerCommonTopUpCount$ = item.playerCurrentCommonTopUpCount + "/" + item.playerCommonTopUpTotalCount;
                                    item.status$ = $translate(item.status);
                                    item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.proposalCreateTime));
                                    return item;
                                }
                            }), {}, isNewSearch
                        );
                    });
                }, err => {
                    console.error(err);
                }, true);
        };


        vm.getMerchantName = function (merchantNo, inputDevice) {
            let result = commonService.getMerchantName(merchantNo, vm.merchants, vm.merchantTypes, inputDevice);
            return result;
        }
        vm.getOnlineMerchantId = function (merchantNo, devices, topupType) {
            let result = merchantNo;
            let targetDevices = commonService.getPMSDevices(devices);
            if (merchantNo && vm.merchants) {
                let merchant = vm.merchants.filter(item => {
                    if(topupType){
                        return item.merchantNo == merchantNo && targetDevices == item.targetDevices && topupType == item.topupType;
                    }else{
                        return item.merchantNo == merchantNo && targetDevices == item.targetDevices;
                    }
                })
                if (merchant.length > 0) {
                    result = merchant[0].name
                }
            }
            return result;
        }


        vm.resetTopUpMonitorQuery = function () {
            if(window.location.pathname == "/monitor/payment") {
                vm.paymentMonitorQuery = {};
                vm.paymentMonitorQuery.mainTopupType = "";
                vm.paymentMonitorQuery.topupType = "";
                vm.paymentMonitorQuery.merchantGroup = "";
                vm.paymentMonitorQuery.merchantNo = "";
                vm.paymentMonitorQuery.orderId = "";
                vm.paymentMonitorQuery.depositMethod = "";
                vm.paymentMonitorQuery.playerName = "";
                vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery');
                vm.getPaymentMonitorRecord(true);
                $('#autoRefreshProposalFlag')[0].checked = true;
            } else if(window.location.pathname == "/monitor/paymentTotal") {
                $('#paymentTotalAutoRefreshProposalFlag')[0].checked = true;
            }
            $scope.safeApply();
        };

        vm.showProposalModal = function (proposalId) {
            let platformList = vm.platformByAdminId && vm.platformByAdminId.length ?  vm.platformByAdminId.map(p => p._id) : [vm.selectedPlatform._id];

            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: platformList,
                proposalId: proposalId
            }, function (data) {
                $scope.$evalAsync(() => {
                    vm.selectedProposal = data.data;
                    let playerName = vm.selectedProposal.data.playerName;
                    let typeId = vm.selectedProposal.type._id;
                    let typeName = [vm.selectedProposal.type.name];
                    let playerId = vm.selectedProposal.data.playerId;
                    let inputDevice = vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.clientType ? commonService.convertClientTypeToInputDevice(vm.selectedProposal.data.clientType, vm.selectedProposal.data.userAgent) : null;

                    if (vm.selectedProposal.data.inputData) {
                        if (vm.selectedProposal.data.inputData.provinceId) {
                            //vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                            commonService.getProvinceName($scope, vm.selectedProposal.data.inputData.provinceId).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data.provinceName = data;
                            });
                        }
                        if (vm.selectedProposal.data.inputData.cityId) {
                            //vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                            commonService.getCityName($scope, vm.selectedProposal.data.inputData.cityId).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data.cityName = data;
                            });
                        }
                    }

                    if(typeof vm.selectedProposal.data.userAgent == "object"){
                        vm.selectedProposal.data.userAgent = utilService.retrieveAgent(vm.selectedProposal.data.userAgent);
                    }else if(typeof vm.selectedProposal.data.userAgent == "undefined" ||  vm.selectedProposal.data.userAgent == "") {
                        vm.selectedProposal.data.userAgent = 1;
                    }

                    if (inputDevice) {
                        vm.selectedProposal.data.$inputDevice = $scope.constPlayerRegistrationInterface[inputDevice] || $scope.constPlayerRegistrationInterface[0];
                    } else {
                        vm.selectedProposal.data.$inputDevice = $scope.constPlayerRegistrationInterface[vm.selectedProposal.data.userAgent] || $scope.constPlayerRegistrationInterface[0];
                    }

                    vm.wechatNameConvert();
                    // vm.selectedProposal.data.cityId;
                    $('#modalProposal').modal('show');
                    $('#modalProposal').on('shown.bs.modal', function (e) {
                    })

                    let cardField = vm.topUpField[typeName] ? vm.topUpField[typeName] : ''
                    let cardNo = vm.selectedProposal.data[cardField];
                    vm.loadTodayTopupQuota(typeId, typeName, cardField, cardNo);
                    vm.getUserCardGroup(vm.selectedProposal.type.name, vm.selectedPlatform._id, playerId)
                    vm.getCardLimit(vm.selectedProposal.type.name);
                });
            })
        }
        vm.drawPaymentRecordTable = function (data, size, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorQuery.aaSorting || [[14, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [13]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [14]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            // data = String(data);
                            return '<a ng-click="vm.showProposalModal(\'' + data + '\')">' + data + '</a>';
                        }
                    },
                    {
                        "title": $translate('topupType'), "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('DEVICE'), data: "inputDevice",
                        render: function (data, type, row) {
                            let inputDevice = row && row.data && row.data.clientType ? commonService.convertClientTypeToInputDevice(row.data.clientType, row.data.userAgent) : null;
                            let text = $translate(inputDevice ? $scope.constPlayerRegistrationInterface[inputDevice] : data ? $scope.constPlayerRegistrationInterface[data] : $scope.constPlayerRegistrationInterface['0']);
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'data.topupType',
                        render: function (data, type, row) {
                            var text = $translate(data && $scope.merchantTopupTypeJson[data] ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        "title": $translate('3rd Party Platform'), "data": 'data.merchantUseName',
                        render: function(data, type, row){
                            let merchantName =  row.merchantName ? row.merchantName : '';
                            let text;

                            if (data && merchantName) {
                                text = data === merchantName ? data : merchantName;
                            } else if (merchantName && !data) {
                                text = merchantName;
                            } else {
                                text = data ? data : '';
                            }
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        "title": $translate('DEPOSIT_METHOD'), "data": 'data.depositMethod',
                        render: function (data, type, row) {
                            var text = $translate(data ? vm.getDepositMethodbyId[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('From Bank Type'), data: "data.bankTypeId",
                        render: function (data, type, row) {
                            if (data) {
                                var text = $translate(vm.allBankTypeList[data] ? vm.allBankTypeList[data] : "");
                                return "<div>" + text + "</div>";
                            } else {
                                return "<div>" + '' + "</div>";
                            }
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('Business Acc/ Bank Acc'),
                        data: "merchantNo$",
                        render: function (data, type, row) {
                            var text = data;
                            let additional = '';
                            if( row.data.line && row.data.line == '2'){
                                additional = '(MMM)';
                            }
                            return '<div style = "width: 90px; word-break: break-all; white-space: normal">' + text + additional + '</div>'
                        },
                        sClass: 'merchantCount',
                        "width": "90px"},
                    {title: $translate('Total Business Acc'), data: "merchantCount$", sClass: 'merchantCount'},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('PLAYER_NAME'), data: "data.playerName", sClass: "playerCount"},
                    {title: $translate('Real Name'), data: "data.playerObjId.realName", sClass: "sumText playerCount"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "sumText playerCount"},
                    // {title: $translate('PARTNER'), data: "playerId.partner", sClass: "sumText"},
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight playerCount"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {
                        title: $translate('Approved Time'), data: "endTime$",
                        render: function (data, type, row) {
                            var text = '';
                            if (row.status == 'Success' || row.status == 'Approved' ) {
                                text = data ? $translate(data) : '';
                            }
                            return '<div>' + text + '</div>'
                        }
                    },
                    {title: $translate('REMARKS'), data: "remark$"},
                ],
                "autoWidth": false,
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    if (aData.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                        $(nRow).addClass('merchantExceed');
                        if ($('#autoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorMerchantUseSound) {
                            checkMerchantNotificationAlert(aData);
                        }
                        if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                            vm.lastMerchantExceedId = aData._id;
                        }
                    }

                    if (aData.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                        $(nRow).addClass('playerExceed');
                        if ($('#autoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorPlayerUseSound) {
                            checkPlayerNotificationAlert(aData);
                        }
                        if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                            vm.lastPlayerExceedId = aData._id;
                        }
                    }
                },
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTable', tableOptions, {}, true);

            vm.paymentMonitorQuery.pageObj.init({maxCount: size}, newSearch);

            $('#paymentMonitorTable').off('order.dt');
            $('#paymentMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'paymentMonitorQuery', vm.getPaymentMonitorRecord);
            });
            $('#paymentMonitorTable').resize();

            $('#paymentMonitorTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.drawPaymentRecordTotalTable = function (data, summary, newSearch) {
            vm.paymentMonitorTotalQuery.totalCount = data.length;
            console.log('data', data);
            vm.paymentMonitorTotalData.followUpContent = {};
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorTotalQuery.aaSorting || [[15, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [14]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [15]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('PRODUCT_NAME'),
                        data: "website",
                        sClass: "wordWrap",
                        width: "5%"
                    },
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            // data = String(data);
                            return '<a ng-click="vm.showProposalModal(\'' + data + '\')">' + data + '</a>';
                        },
                        sClass: "wordWrap",
                        width: "5%"
                    },
                    {
                        "title": $translate('topupType'), "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: "wordWrap",
                        width: "5%"
                    },
                    {
                        title: $translate('DEVICE'), data: "inputDevice",
                        render: function (data, type, row) {
                            let inputDevice = row && row.data && row.data.clientType ? commonService.convertClientTypeToInputDevice(row.data.clientType, row.data.userAgent) : null;
                            let text = $translate(inputDevice ? $scope.constPlayerRegistrationInterface[inputDevice] : data ? $scope.constPlayerRegistrationInterface[data] : $scope.constPlayerRegistrationInterface['0']);
                            return "<div>" + text + "</div>";
                        },
                        sClass: "wordWrap",
                        width: "5%"
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'data.topupType',
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount wordWrap',
                        width: "5%"
                    },
                    {title: $translate('3rd Party Platform'), data: "merchantName", sClass: 'wordWrap', width: "5%"},
                    {
                        "title": $translate('DEPOSIT_METHOD'), "data": 'data.depositMethod',
                        render: function (data, type, row) {
                            var text = $translate(data ? vm.getDepositMethodbyId[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'wordWrap',
                        width: "5%"
                    },
                    {
                        title: $translate('From Bank Type'), data: "data.bankTypeId",
                        render: function (data, type, row) {
                            if (data) {
                                var text = $translate(vm.allBankTypeList[data] ? vm.allBankTypeList[data] : "");
                                return "<div>" + text + "</div>";
                            } else {
                                return "<div>" + '' + "</div>";
                            }
                        },
                        sClass: 'wordWrap',
                        width: "5%"
                    },
                    {
                        title: $translate('Business Acc/ Bank Acc'),
                        data: "merchantNo$",
                        render: function (data, type, row) {
                            var text = data;
                            let additional = '';
                            if( row.data.line && row.data.line == '2'){
                                additional = '(MMM)';
                            }
                            return '<div style = "width: 100%; word-break: break-all; white-space: normal">' + text + additional + '</div>'
                        },
                        sClass: 'wordWrap',
                        width: "7%"
                    },
                    //{title: $translate('Total Business Acc'), data: "merchantCount$", sClass: 'merchantCount'},
                    {title: $translate('STATUS'), data: "status$", sClass: 'wordWrap', width: "5%"},
                    {title: $translate('PLAYER_NAME'), data: "data.playerName", sClass: "playerCount playerTopUpAmountExceed wordWrap", width: "5%"},
                    {title: $translate('Real Name'), data: "data.playerObjId.realName", sClass: "playerCount playerTopUpAmountExceed wordWrap", width: "5%"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "playerCount playerTopUpAmountExceed wordWrap", width: "5%"},
                    {title: $translate('Total Members Common Top up'), data: "playerCommonTopUpCount$", sClass: "sumText playerCount playerTopUpAmountExceed wordWrap" , width: "5%"},
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight playerCount playerTopUpAmountExceed wordWrap", width: "5%"},

                    {title: $translate('START_TIME'), data: "startTime$", sClass: 'wordWrap', width: "5%"},
                    {
                        title: $translate('Admin_Locked'),
                        data: "lockedButtonDisplay",
                        render: function (data, type, row) {
                            if(row.data.lockedAdminId && authService.adminId == row.data.lockedAdminId && !row.data.followUpContent){
                                let linkId = "link" + row.proposalId;
                                return "<div id=" + linkId + "><a ng-click='vm.unlockProposal(" + JSON.stringify(row) + ")'>" + authService.adminName + " - " + $translate("UNLOCK") + "</a></div>";
                            }else if(row.data.lockedAdminId && !row.data.followUpContent) {
                                return row.data.lockedAdminName + " " + $translate("is following up");
                            }else if(row.data.lockedAdminId && row.data.followUpContent && row.data.followUpCompletedTime){
                                let completedDate = utilService.$getTimeFromStdTimeFormat(new Date(row.data.followUpCompletedTime));
                                return row.data.lockedAdminName + " " + $translate("follow up completed") + "<br> (" + completedDate + ")";
                            }else{
                                let linkId = "link" + row.proposalId;
                                return "<div id=" + linkId + "><a ng-click='vm.lockProposal(" + JSON.stringify(row) + ")'>" + data + "</a></div>";
                            }
                        }, sClass: 'wordWrap', width: "5%"
                    },
                    {
                        title: $translate('Contact Customer'),
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || '';
                            var playerDetail = row.data && row.data.playerObjId ? row.data.playerObjId : "";
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'class': 'fa fa-volume-control-phone margin-right-5' + (playerDetail && playerDetail.permission && playerDetail.permission.phoneCallFeedback &&playerDetail.permission.phoneCallFeedback === false ? " text-danger" : ""),
                                'ng-click': 'vm.telorMessageToPlayerBtn(' + '"tel", "' + playerDetail._id + '",' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("PHONE"),
                                'data-placement': 'left',
                            }));
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft wordWrap", width: "3%"
                    },
                    {
                        title: $translate('Followup_Content'),
                        data: "remark$",
                        "width": "10%",
                        render: function(data, type, row){
                            if(row.data.lockedAdminId && authService.adminId == row.data.lockedAdminId && !row.data.followUpContent){
                                let contentId = "content" + row.proposalId;
                                return "<div id=" + contentId + "><a ng-click='vm.showEditFollowUpContent = true;' ng-if='!vm.showEditFollowUpContent'>" + $translate("EDIT") + "</a>" +
                                    "<div ng-if='vm.showEditFollowUpContent'><form ng-submit='vm.editFollowUpContent(" + JSON.stringify(row) + ")'><input type='text' ng-model='vm.paymentMonitorTotalQuery.followUpContent[" + row.proposalId + "]'></form></div></div>";
                            }else if(row.data.lockedAdminId && row.data.followUpContent){
                                return '<div>' + row.data.followUpContent + '</div>';
                            }else{
                                return '<div id="content' + row.proposalId +'">-</div>';
                            }
                        }
                    },
                ],
                "autoWidth": false,
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    if (!aData.$isExceedAmountTopUpDetect && aData.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                        $(nRow).addClass('merchantExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorMerchantUseSound) {
                            checkMerchantNotificationAlert(aData);
                        }
                        if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                            vm.lastMerchantExceedId = aData._id;
                        }
                    }

                    if (!aData.$isExceedAmountTopUpDetect && aData.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                        $(nRow).addClass('playerExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorPlayerUseSound) {
                            checkPlayerNotificationAlert(aData);
                        }
                        if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                            vm.lastPlayerExceedId = aData._id;
                        }
                    }

                    if (aData.$isExceedAmountTopUpDetect && aData.data && aData.data.amount && vm.selectedPlatform.monitorTopUpAmount && (aData.data.amount >= vm.selectedPlatform.monitorTopUpAmount)) {
                        $(nRow).addClass('topUpAmountExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorTopUpAmountUseSound) {
                            checkTopUpAmountNotificationAlert(aData);
                        }
                        if (!vm.lastTopUpAmountExceedId || vm.lastTopUpAmountExceedId < aData._id) {
                            vm.lastTopUpAmountExceedId = aData._id;
                        }
                    }
                },
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTotalTable', tableOptions, {}, true);

            $('#paymentMonitorTotalTable').resize(function () {
                let table = $('#paymentMonitorTotalTable').DataTable();
                table.columns.adjust();
            });
            $scope.$evalAsync();

            $('#paymentMonitorTotalTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.drawPaymentRecordTotalCompletedTable = function (data, summary, newSearch) {
            vm.paymentMonitorTotalQuery.totalCompletedCount = data.length;
            console.log('data', data);
            data.map(item => {
                if(item.merchantNo$ && !item.merchantNo$.startsWith("******") && item && item.type && item.type.name && item.type.name === "ManualPlayerTopUp"){
                    return item.merchantNo$ = "******" + item.merchantNo$.slice(-6);
                }
            });

            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorTotalQuery.aaSorting || [[15, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [14]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [15]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('PRODUCT_NAME'),
                        data: "website",
                    },
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            return '<a ng-click="vm.showProposalModal(\'' + data + '\')">' + data + '</a>';
                        }
                    },
                    {
                        "title": $translate('topupType'), "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('DEVICE'), data: "inputDevice",
                        render: function (data, type, row) {
                            let inputDevice = row && row.data && row.data.clientType ? commonService.convertClientTypeToInputDevice(row.data.clientType, row.data.userAgent) : null;
                            let text = $translate(inputDevice ? $scope.constPlayerRegistrationInterface[inputDevice] : data ? $scope.constPlayerRegistrationInterface[data] : $scope.constPlayerRegistrationInterface['0']);
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'topupType',
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {title: $translate('3rd Party Platform'), data: "merchantName", sClass: 'merchantCount'},
                    {
                        "title": $translate('DEPOSIT_METHOD'), "data": 'depositMethod',
                        render: function (data, type, row) {
                            var text = $translate(data ? vm.getDepositMethodbyId[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('From Bank Type'), data: "bankTypeId",
                        render: function (data, type, row) {
                            if (data) {
                                var text = $translate(vm.allBankTypeList[data] ? vm.allBankTypeList[data] : "");
                                return "<div>" + text + "</div>";
                            } else {
                                return "<div>" + '' + "</div>";
                            }
                        },
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('Business Acc/ Bank Acc'),
                        data: "merchantNo$",
                        render: function (data, type, row) {
                            var text = data;
                            let additional = '';
                            if( row.line && row.line == '2'){
                                additional = '(MMM)';
                            }
                            return '<div style = "width: 90px; word-break: break-all; white-space: normal">' + text + additional + '</div>'
                        },
                        sClass: 'merchantCount',
                        "width": "90px"},
                    //{title: $translate('Total Business Acc'), data: "merchantCount$", sClass: 'merchantCount'},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('PLAYER_NAME'), data: "playerObjId.name", sClass: "playerCount playerTopUpAmountExceed"},
                    {title: $translate('Real Name'), data: "playerObjId.realName", sClass: "sumText playerCount playerTopUpAmountExceed"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "sumText playerCount playerTopUpAmountExceed"},
                    {title: $translate('Total Members Common Top up'), data: "playerCommonTopUpCount$", sClass: "sumText playerCount playerTopUpAmountExceed"},
                    {title: $translate('TopUp Amount'), data: "amount", sClass: "sumFloat alignRight playerCount playerTopUpAmountExceed"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {
                        title: $translate('Admin_Locked'),
                        data: "lockedButtonDisplay",
                        render: function (data, type, row) {
                            if(row.lockedAdminId && row.followUpContent && row.followUpCompletedTime){
                                let completedDate = utilService.$getTimeFromStdTimeFormat(new Date(row.followUpCompletedTime));
                                return row.lockedAdminName + " " + $translate("follow up completed") + "<br> (" + completedDate + ")";
                            }else{
                                return "";
                            }
                        }
                    },
                    {
                        title: $translate('Followup_Content'),
                        data: "remark$",
                        "width": "200px",
                        render: function(data, type, row){
                            if(row.lockedAdminId && row.followUpContent){
                                return row.followUpContent;
                            }else{
                                return '-';
                            }
                        }
                    },
                    {title: $translate('Total Success Topup'), data: "totalSuccess"},
                ],
                "autoWidth": true,
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    if (!aData.isExceedAmountTopUpDetect && (aData.merchantTotalCount >= (vm.selectedPlatform.monitorMerchantCount || 10))) {
                        $(nRow).addClass('merchantExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorMerchantUseSound) {
                            checkMerchantNotificationAlert(aData);
                        }
                        if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                            vm.lastMerchantExceedId = aData._id;
                        }
                    }

                    if (!aData.isExceedAmountTopUpDetect && (aData.playerTotalCount >= (vm.selectedPlatform.monitorPlayerCount || 4))) {
                        $(nRow).addClass('playerExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorPlayerUseSound) {
                            checkPlayerNotificationAlert(aData);
                        }
                        if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                            vm.lastPlayerExceedId = aData._id;
                        }
                    }

                    if (aData.isExceedAmountTopUpDetect) {
                        $(nRow).addClass('topUpAmountExceed');
                        if ($('#paymentTotalAutoRefreshProposalFlag')[0].checked === true && vm.selectedPlatform.monitorTopUpAmountUseSound) {
                            checkTopUpAmountNotificationAlert(aData);
                        }
                        if (!vm.lastTopUpAmountExceedId || vm.lastTopUpAmountExceedId < aData._id) {
                            vm.lastTopUpAmountExceedId = aData._id;
                        }
                    }
                },
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTotalCompletedTable', tableOptions, {}, true);


            $('#paymentMonitorTotalCompletedTable').resize();

            $('#paymentMonitorTotalCompletedTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.lockProposal = function (rowData){
            let proposalId = rowData.proposalId;
            let linkId = "link" + rowData.proposalId;
            let contentId = "content" + rowData.proposalId;

            let sendObj = {
                proposalId: proposalId,
                adminId: authService.adminId,
                adminName: authService.adminName
            };
            socketService.$socket($scope.AppSocket, 'lockProposalByAdmin', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    //re-structure Admin_Locked
                    $('#' + linkId).empty();
                    $('#' + linkId).append('<a>' + authService.adminName + " - " + $translate("UNLOCK")  + '</a>');
                    $('#' + linkId + ' a').click(function () {vm.unlockProposal(rowData);});

                    //re-structure Followup_Content
                    $('#' + contentId).empty();
                    $('#' + contentId).append('<a ng-if="!vm.showEditFollowUpContent">' + $translate("EDIT")  + '</a>');
                    $('#' + contentId).append('<div ng-if="vm.showEditFollowUpContent"><input ng-model="vm.paymentMonitorTotalQuery.followUpContent[' + proposalId + ']"></div>');
                    $('#' + contentId + ' div').hide();
                    $('#' + contentId + ' a').click(function () { $('#' + contentId + ' a').hide(); $('#' + contentId + ' div').show();});
                    $('#' + contentId + ' input').keypress(function (e) {
                        if(e.keyCode == 13){
                            vm.editFollowUpContent(rowData)
                        }

                    });
                    $compile('#' + contentId + ' input')($scope)
                })
            });
        };

        vm.unlockProposal = function (rowData){
            let proposalId = rowData.proposalId;
            let linkId = "link" + rowData.proposalId;
            let contentId = "content" + rowData.proposalId;

            let sendObj = {
                proposalId: proposalId,
                adminId: authService.adminId,
            };

            socketService.$socket($scope.AppSocket, 'unlockProposalByAdmin', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    let proposalObj = vm.paymentMonitorTotalData.filter(p => p && p.proposalId && (p.proposalId === proposalId));
                    let textToDisplay = proposalObj && proposalObj[0].lockedButtonDisplay ? proposalObj[0].lockedButtonDisplay : "";

                    $('#' + linkId).empty();
                    $('#' + linkId).append('<a>' + textToDisplay  + '</a>');
                    $('#' + linkId + ' a').click(function () {vm.lockProposal(rowData);});
                    $('#' + contentId).empty();
                    $('#' + contentId).append('-');
                })
            });
        };

        vm.editFollowUpContent = function(rowData){
            let proposalId = rowData.proposalId;

            if(!vm.paymentMonitorTotalQuery.followUpContent || !vm.paymentMonitorTotalQuery.followUpContent[proposalId]){
                vm.showEditFollowUpContent = false;

                $('#content' + proposalId + ' a').show();
                $('#content' + proposalId + ' input').hide();
                return;
            }

            let followUpData = {};
            if(rowData){
                followUpData = {
                    platformObjId: rowData.data.platformId,
                    website: rowData.website,
                    proposalId: rowData.proposalId,
                    type: rowData.type._id,
                    userAgent: rowData.userAgent$,
                    topupType: rowData.data.topupType,
                    merchantNo: rowData.data.merchantNo,
                    merchantNo$: rowData.merchantNo$,
                    inputDevice: rowData.inputDevice,
                    depositMethod: rowData.data.depositMethod,
                    bankTypeId: rowData.data.bankTypeId,
                    merchantName: rowData.merchantName,
                    merchantCurrentCount: rowData.$merchantCurrentCount,
                    merchantTotalCount: rowData.$merchantAllCount,
                    merchantGapTime: rowData.$merchantGapTime,
                    status: rowData.status,
                    playerObjId: rowData.data.playerObjId._id,
                    playerName: rowData.data.playerObjId.name,
                    playerCurrentCount: rowData.$playerCurrentCount,
                    playerTotalCount: rowData.$playerAllCount,
                    playerCurrentCommonTopUpCount: rowData.$playerCurrentCommonTopUpCount,
                    playerCommonTopUpTotalCount: rowData.$playerAllCommonTopUpCount,
                    playerGapTime: rowData.$playerGapTime,
                    //amount: rowData.amount$,
                    proposalCreateTime: rowData.createTime,
                    createTime: new Date(),
                    lockedAdminId: rowData.data.lockedAdminId || authService.adminId,
                    lockedAdminName: rowData.data.lockedAdminName || authService.adminName,
                    followUpCompletedTime: rowData.data.followUpCompletedTime,
                    line: rowData.data.line,
                    bankCardNo: rowData.data.bankCardNo,
                    accountNo: rowData.data.accountNo,
                    alipayAccount: rowData.data.alipayAccount,
                    wechatAccount: rowData.data.wechatAccount,
                    weChatAccount: rowData.data.weChatAccount,
                    isExceedAmountTopUpDetect: rowData.$isExceedAmountTopUpDetect
                };

                if (rowData && rowData.amount$ && rowData.amount$ !== "NaN") {
                    followUpData.amount = rowData.amount$;
                }

            }

            let sendObj = {
                followUpData: followUpData,
                followUpContent: vm.paymentMonitorTotalQuery.followUpContent[proposalId] ? vm.paymentMonitorTotalQuery.followUpContent[proposalId] : ""
            };

            socketService.$socket($scope.AppSocket, 'updateFollowUpContent', sendObj, function (data) {
                vm.showEditFollowUpContent = false;
                vm.getPaymentMonitorTotalRecord(true);
                vm.getPaymentMonitorTotalCompletedRecord(true);
            });
        };

        function checkTopUpAmountNotificationAlert(aData) {
            if (!vm.lastTopUpAmountExceedId || vm.lastTopUpAmountExceedId < aData._id) {
                let soundUrl = "sound/notification/" + vm.selectedPlatform.monitorTopUpAmountSoundChoice;
                let sound = new Audio(soundUrl);
                sound.play();
            }
        };

        function checkPlayerNotificationAlert(aData) {
            if (!vm.lastPlayerExceedId || vm.lastPlayerExceedId < aData._id) {
                let soundUrl = "sound/notification/" + vm.selectedPlatform.monitorPlayerSoundChoice;
                let sound = new Audio(soundUrl);
                sound.play();
            }
        };

        function checkMerchantNotificationAlert(aData) {
            if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                let soundUrl = "sound/notification/" + vm.selectedPlatform.monitorMerchantSoundChoice;
                let sound = new Audio(soundUrl);
                sound.play();
            }
        }

        vm.tableRowClicked = function (event) {
            if (event.target.tagName == 'A' && event.target.innerHTML.includes("玩家") && event.target.innerHTML.includes("商户") && event.target.innerHTML.includes("解锁")) {
                let data = vm.topUpProposalTable.row(this).data();
                vm.proposalRowClicked(data);
            }
        };

        vm.proposalRowClicked = function (data) {
            if (!data) {
                return;
            }
            vm.selectedProposal = data;
            $('#modalProposal').modal();
            $('#modalProposal').off('hidden.bs.modal');
            $('#modalProposal').on('hidden.bs.modal', function () {
                $('#modalProposal').off('hidden.bs.modal');
                $('#proposalRemark').val('');
            });

            console.log('vm.selectedProposal', vm.selectedProposal);
            vm.thisProposalSteps = [];
            if (vm.selectedProposal.process != null && typeof vm.selectedProposal.process == 'object') {
                socketService.$socket($scope.AppSocket, 'getFullProposalProcess', {_id: vm.selectedProposal.process._id}, function processSuccess(data) {
                    console.log('full proposal data', data);
                    vm.thisProposalSteps = data.data.steps;
                    vm.chartData = {};
                    vm.chartData.nextNodeID = 10;
                    let para = [$translate("START_PROPOSAL"), $translate("END_PROPOSAL"), $translate("FAIL_PROPOSAL")];
                    vm.chartViewModel.setDefaultLabel(para);
                    vm.chartViewModel.setEditable(false);
                    $.each(data.data.steps, function (i, v) {
                        if (v._id == data.data.currentStep) {
                            vm.chartData.curStep = v.type;
                            return false;
                        }
                    });
                    vm.drawProcessSteps(data.data);
                });
            }

            let proposalDetail = $.extend({}, vm.selectedProposal.data);
            let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            for (let i in proposalDetail) {
                //remove objectIDs
                if (checkForHexRegExp.test(proposalDetail[i])) {
                    delete proposalDetail[i];
                }
                if (i == 'providers') {
                    let temp = [];
                    if (proposalDetail.providers) {
                        proposalDetail.providers.map(item => {
                            temp.push(item.name);
                        });
                        proposalDetail.providers = temp;
                    }
                }

            }

            vm.selectedProposalDetailForDisplay = $.extend({}, proposalDetail);

            if (vm.selectedProposalDetailForDisplay['provinceId']) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay['provinceId']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['provinceId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountProvince']) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountProvince']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountProvince'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['cityId']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['cityId']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['cityId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountCity']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountCity']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountCity'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['districtId']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['districtId']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['districtId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountDistrict']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountDistrict']}, function (data) {
                    var text = data.data.data ? data.data.data.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountDistrict'] = text;
                    $scope.safeApply();
                });
            }

            delete vm.selectedProposalDetailForDisplay.creator;
            delete vm.selectedProposalDetailForDisplay.platform;
            delete vm.selectedProposalDetailForDisplay.partner;
            delete vm.selectedProposalDetailForDisplay.playerObjId;
            delete vm.selectedProposalDetailForDisplay.playerLevelName;
            delete vm.selectedProposalDetailForDisplay.playerLevelValue;

            $scope.safeApply();
        };

        vm.commonInitTime = function (obj, queryId) {
            if (!obj) return;
            obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
            let lastMonth = utilService.setNDaysAgo(new Date(), 1);
            let lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            obj.startTime.data('datetimepicker').setLocalDate(new Date(lastMonthDateStartTime));

            obj.endTime = utilService.createDatePicker(queryId + ' .endTime');
            obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
        };

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

        vm.commonSortChangeHandler = function (a, objName, searchFunc) {
            if (!a.aaSorting[0] || !objName || !vm[objName] || !searchFunc) return;
            let sortCol = a.aaSorting[0][0];
            let sortDire = a.aaSorting[0][1];
            let temp = a.aoColumns[sortCol];
            let sortKey = temp ? temp.sortCol : '';
            vm[objName].aaSorting = a.aaSorting;
            if (sortKey) {
                vm[objName].sortCol = vm[objName].sortCol || {};
                let preVal = vm[objName].sortCol[sortKey];
                vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                if (vm[objName].sortCol[sortKey] != preVal) {
                    vm[objName].sortCol = {};
                    vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                    searchFunc.call(this);
                }
            }
        };

        vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
            var isChange = false;
            if (!curP) {
                curP = 1;
            }
            if (pageSize != vm[objKey].limit) {
                isChange = true;
                vm[objKey].limit = pageSize;
            }
            if ((curP - 1) * pageSize != vm[objKey].index) {
                isChange = true;
                vm[objKey].index = (curP - 1) * pageSize;
            }
            if (isChange) return searchFunc.call(this);
        };

        vm.dateReformat = function (data) {
            return utilService.$getTimeFromStdTimeFormat(data);
        };

        vm.showProposalDetailField = function (obj, fieldName, val) {
            if (!obj) return '';
            let result = val ? val.toString() : (val === 0) ? "0" : "";
            if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                result = val.phoneNumber;
            } else if (obj.status === "Expired" && fieldName === "validTime") {
                let $time = $('<div>', {
                    class: 'inlineBlk margin-right-5'
                }).text(utilService.getFormatTime(val));
                let $btn = $('<button>', {
                    class: 'btn common-button btn-primary delayTopupExpireDate',
                    text: $translate('Delay'),
                    'data-proposal': JSON.stringify(obj),
                });
                utilService.actionAfterLoaded(".delayTopupExpireDate", function () {
                    $('#ProposalDetail .delayTopupExpireDate').off('click');
                    $('#ProposalDetail .delayTopupExpireDate').on('click', function () {
                        var $tr = $(this).closest('tr');
                        vm.delayTopupExpirDate(obj, function (newData) {
                            $tr.find('td:nth-child(2)').first().text(utilService.getFormatTime(newData.newValidTime));
                            vm.needRefreshTable = true;
                            $scope.safeApply();
                        });
                    })
                });
                result = $time.prop('outerHTML') + $btn.prop('outerHTML');
            } else if (fieldName.indexOf('providerId') > -1 || fieldName.indexOf('targetProviders') > -1) {
                result = val ? val.map(item => {
                    return vm.getProviderText(item);
                }) : '';
                result = result.join(',');
            } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                result = utilService.getFormatTime(val);
            } else if ((fieldName.indexOf('amount') > -1 || fieldName.indexOf('Amount') > -1) && val) {
                result = Number.isFinite(parseFloat(val)) ? $noRoundTwoDecimalPlaces(parseFloat(val)).toString() : val;
            } else if (fieldName === 'bankAccountType') {
                switch (parseInt(val)) {
                    case 1:
                        result = $translate('Credit Card');
                        break;
                    case 2:
                        result = $translate('Debit Card');
                        break;
                    case 3:
                        result = "储存卡";
                        break;
                    case 4:
                        result = "储蓄卡";
                        break;
                    case 5:
                        result = "商务理财卡";
                        break;
                    case 6:
                        result = "工商银行一卡通";
                        break;
                    default:
                        result = val;
                        break;
                }
            } else if (fieldName == 'clientType') {
                result = $translate($scope.merchantTargetDeviceJson[val]);
            } else if (fieldName == 'merchantUseType') {
                result = $translate($scope.merchantUseTypeJson[val])
            } else if (fieldName == 'topupType') {
                result = $translate($scope.merchantTopupTypeJson[val])
            } else if (fieldName == 'periodType') {
                result = $translate(firstTopUpPeriodTypeJson[val])
            } else if (fieldName == 'playerId' && val && val.playerId && val.name) {
                result = val.playerId;
                vm.selectedProposalDetailForDisplay.playerName = val.name;
            } else if (fieldName == 'bankTypeId' || fieldName == 'bankCardType' || fieldName == 'bankName') {
                result = vm.allBankTypeList[val] || (val + " ! " + $translate("not in bank type list"));
            } else if (fieldName == 'depositMethod') {
                result = $translate(vm.getDepositMethodbyId[val])
            } else if (fieldName === 'playerStatus') {
                result = $translate($scope.constPlayerStatus[val]);
            } else if (fieldName === 'proposalPlayerLevel') {
                result = $translate(val);
            } else if (fieldName === 'applyForDate') {
                result = new Date(val).toLocaleDateString("en-US", {timeZone: "Asia/Singapore"});
            } else if (typeof(val) == 'object') {
                result = JSON.stringify(val);
            }
            return $sce.trustAsHtml(result);
        };


        // vm.showProposalDetailField

        function findQuerySearchTime (startTime) {
            let monitorSearchTimeEnd = new Date().getTime();
            let searchTime = (monitorSearchTimeEnd - startTime) / 1000;
            return searchTime;
        }

        function getMerchantList() {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getMerchantNBankCard', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data && data.data && data.data.merchants) {
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
                socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {platform: vm.selectedPlatform._id}, function (data) {
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
                merchantGroupList[item.merchantTypeId] = merchantGroupList[item.merchantTypeId] || {list: []};
                merchantGroupList[item.merchantTypeId].list.push(item.merchantNo);
            });

            merchantTypes.forEach(mer => {
                merchantGroupNames[mer.merchantTypeId] = mer.name;
            });

            let merchantGroups = [];
            for (let merchantTypeId in merchantGroupList) {
                let list = merchantGroupList[merchantTypeId].list;
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
            return merchantNumbers;
        }

        function getPlatformNameByPlatformObjId(platformObjId){
            let filteredPlatformByAdminId = vm.platformByAdminId.find(p => p._id == platformObjId);
            return filteredPlatformByAdminId && filteredPlatformByAdminId.name ? filteredPlatformByAdminId.name : "";
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
                // vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
                commonService.getBankTypeList($scope, vm.selectedPlatform._id).catch(err => Promise.resolve({})).then(v => {
                    vm.allBankTypeList = v;
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

    monitorPaymentController.$inject = injectParams;

    myApp.register.controller('monitorPaymentCtrl', monitorPaymentController);
});
