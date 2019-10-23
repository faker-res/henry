'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$sce', '$scope', '$filter', '$location', '$log', '$timeout', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies", "$compile", "commonService"];
    var reportController = function ($sce, $scope, $filter, $location, $log, $timeout, authService, socketService, utilService, CONFIG, $cookies, $compile, commonService) {
        var $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let $roundToTwoDecimalPlacesString = $filter('roundToTwoDecimalPlacesString');
        let $fixTwoDecimalStr = (value) => {
            if (typeof value != 'number') {
                return value;
            }
            return $filter('noRoundTwoDecimalPlaces')(value).toFixed(2);
        };
        var vm = this;

        // For debugging:
        window.VM = vm;

        // declare constant
        vm.inputDevice = {
            BACKSTAGE: 0,
            WEB_PLAYER: 1,
            WEB_AGENT: 2,
            H5_PLAYER: 3,
            H5_AGENT: 4,
            APP_PLAYER: 5,
            APP_AGENT: 6,
            APP_NATIVE_PLAYER: 7,
            APP_NATIVE_PARTNER: 8
        };
        vm.inputDeviceMapped = {
            0: "BACKSTAGE",
            1: "WEB_PLAYER",
            2: "WEB_AGENT",
            3: "H5_PLAYER",
            4: "H5_AGENT",
            5: "APP_PLAYER",
            6: "APP_AGENT",
            7: "APP_NATIVE_PLAYER",
            8: "APP_NATIVE_PARTNER"
        };

        vm.proposalStatusList = { // removed APPROVED and REJECTED
            PREPENDING: "PrePending",
            PENDING: "Pending",
            PROCESSING: "Processing",
            SUCCESS: "Success",
            FAIL: "Fail",
            CANCEL: "Cancel",
            EXPIRED: "Expired",
            UNDETERMINED: "Undetermined",
            CSPENDING: "CsPending",
            NOVERIFY: "NoVerify",
            APPROVED: "approved",
            MANUAL: "Manual"
        };
        vm.topUpTypeList = {
            TOPUPMANUAL: 1,
            TOPUPONLINE: 2,
            ALIPAY: 3,
            WechatPay: 4,
            CommonTopUp: 6,
            FKPTopUp: 100
        };
        vm.feedbackResultList = {
            NORMAL: "Normal",
            MISSED_CALL: "MissedCall",
            PLAYER_BUSY: "PlayerBusy",
            OTHER: "Other",
            LAST_CALL: "LastCall"
        };

        vm.depositMethodList = $scope.depositMethodList;

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
            "ManualPlayerTopUp": ['bankCardNo'],
            "PlayerAlipayTopUp": ['alipayAccount'],
            "PlayerWechatTopUp": ['wechatAccount', 'weChatAccount'],
            "PlayerTopUp": ['merchantNo']
        };

        vm.financialPointsType = {
            TOPUPMANUAL: 1,
            TOPUPONLINE: 2,
            TOPUPALIPAY: 3,
            TOPUPWECHAT: 4,
            PLAYER_BONUS: 5,
            PARTNER_BONUS: 6,
            FINANCIAL_POINTS_ADD_SYSTEM: 7,
            FINANCIAL_POINTS_DEDUCT_SYSTEM: 8
        };

        vm.playerInputDevice = $scope.constPlayerRegistrationInterface;

        vm.topUpReportInputDevice = {
            0: 'BACKSTAGE',
            1: 'WEB_PLAYER',
            3: 'H5_PLAYER',
            5: 'APP_PLAYER',
        };

        vm.registrationDeviceList = {
            "0": "BACKSTAGE",
            "1": "WEB_PLAYER",
            "1403": "WEB_PLAYER_EU",
            "1402": "WEB_PLAYER_V68",
            "1401": "WEB_PLAYER_EU_CHESS",
            "2": "H5_PLAYER",
            "2403": "H5_PLAYER_EU",
            "2402": "H5_PLAYER_V68",
            "2401": "H5_PLAYER_EU_CHESS",
            "3403": "APP_PLAYER_ANDROID_EU",
            "3401": "APP_PLAYER_ANDROID_EU_CHESS",
            "3402": "APP_PLAYER_ANDROID_V68",
            "4403": "APP_PLAYER_IOS_EU",
            "4401": "APP_PLAYER_IOS_EU_CHESS",
            "4402": "APP_PLAYER_IOS_V68",
        };
        vm.claimStatus = {
            valid: "STILL VALID",
            accepted: "ACCEPTED",
            expired: "EXPIRED"
        };

        vm.merchantTopUpTypeArr = [
            {typeId: 1, name:'NetPay'},
            {typeId: 2, name:'WechatQR'},
            {typeId: 3, name:'AlipayQR'},
            {typeId: 4, name:'WechatApp'},
            {typeId: 5, name:'AlipayApp'},
            {typeId: 6, name:'FASTPAY'},
            {typeId: 7, name:'QQPAYQR'},
            {typeId: 8, name:'UnPayQR'},
            {typeId: 9, name:'JdPayQR'},
            {typeId: 10, name:'WXWAP'},
            {typeId: 11, name:'ALIWAP'},
            {typeId: 12, name:'QQWAP'},
            {typeId: 13, name:'PCard'},
            {typeId: 14, name:'JDWAP'},
            {typeId: 15, name:'WXBARCODE'}
        ];

        vm.depositMethodArr = [
            {typeId: 1, name: '网银转账(Online Transfer)'},
            {typeId: 2, name: '自动取款机(ATM)'},
            {typeId: 3, name: '银行柜台(Counter)'},
            {typeId: 4, name: '支付宝转账(AliPay Transfer)'},
            {typeId: 5, name: '微信转帐(WeChatPay Transfer)'},
            {typeId: 6, name: '云闪付(CloudFlashPay)'},
            {typeId: 7, name: '云闪付转账(CloudFlashPay Transfer)'},
        ];

        vm.alipayWechatPayArr = [
            {typeId: 3, name: 'ALIPAY'},
            {typeId: 4, name: 'WechatPay'}
        ];

        vm.loginDeviceList = {
            1: 'WEB',
            2: 'H5',
            3: 'APP_IOS',
            4: 'APP_ANDROID'
        };

        vm.registrationDevices = {
            "0": "Backstage",
            "1": "WEB_PLAYER",
            "2": "H5_PLAYER",
            "3403": "APP_PLAYER_ANDROID_EU",
            "4403": "APP_PLAYER_IOS_EU",
            "3401": "APP_PLAYER_ANDROID_EU_CHESS",
            "4401": "APP_PLAYER_IOS_EU_CHESS",
            "3402": "APP_PLAYER_ANDROID_V68",
            "4402": "APP_PLAYER_IOS_V68"
        };

        vm.allActions = ['createDepartmentWithParent',
        'updateDepartmentParent',
        'updateDepartment',
        'deleteDepartmentsById',
        'createRoleForDepartment',
        'deleteRolesById',
        'updateRole',
        'attachDetachRolesFromUsersById',
        'createAdminForDepartment',
        'updateAdmin',
        'deleteAdminInfosById',
        'updateAdminDepartment',
        'resetAdminPassword',
        'createPlatform',
        'deletePlatformById',
        'updatePlatform',
        'startPlatformPlayerConsumptionReturnSettlement',
        'generatePartnerCommSettPreview',
        'cancelPartnerCommissionPreview',
        'startPlatformPlayerConsumptionIncentiveSettlement',
        'startPlatformPlayerLevelSettlement',
        'startPlayerConsecutiveConsumptionSettlement',
        'createNewPlayerAdvertisementRecord',
        'savePlayerAdvertisementRecordChanges',
        'createNewPartnerAdvertisementRecord',
        'savePartnerAdvertisementRecordChanges',
        'createPlayer',
        'createDemoPlayer',
        'createUpdatePlayerInfoProposal',
        'createUpdatePlayerPhoneProposal',
        'createUpdatePlayerEmailProposal',
        'createUpdatePlayerQQProposal',
        'createUpdatePlayerWeChatProposal',
        'createUpdatePlayerBankInfoProposal',
        'resetPlayerPassword',
        'submitRepairPaymentProposal',
        'createUpdatePlayerCreditProposal',
        'createPlayerFeedback',
        'transferPlayerCreditToProvider',
        'updatePlayerPermission',
        'createUpdateTopUpGroupLog',
        'updatePlayerCredibilityRemark',
        'applyManualTopUpRequest',
        'applyAlipayTopUpRequest',
        'applyWechatPayTopUpRequest',
        'applyBonusRequest',
        'createPlayerRewardTask',
        'applyRewardEvent',
        'createRewardTaskGroupUnlockedRecord',
        'updatePlayerRewardPointsRecord',
        'createUpdatePlayerRealNameProposal',
        'createUpdatePartnerRealNameProposal',
        'createUpdatePlayerInfoLevelProposal',
        'createPartner',
        'createUpdatePartnerInfoProposal',
        'createUpdatePartnerPhoneProposal',
        'createUpdatePartnerEmailProposal',
        'createUpdatePartnerQQProposal',
        'createUpdatePartnerWeChatProposal',
        'createUpdatePartnerCommissionTypeProposal',
        'createUpdatePartnerBankInfoProposal',
        'resetPartnerPassword',
        'customizePartnerCommission',
        'updatePartnerPermission',
        'createPlayerFeedbackResult',
        'createPartnerFeedbackResult',
        'createPlayerFeedbackTopic',
        'createPartnerFeedbackTopi',
        'renameProviderInPlatformById',
        'updateProviderFromPlatformById',
        'updateGameStatusToPlatform',
        'attachGamesToPlatform',
        'detachGamesFromPlatform',
        'addPlatformGameGroup',
        'deleteGameGroup',
        'renamePlatformGameGroup',
        'updateGameGroupParent',
        'updatePlatformGameGroup',
        'createRewardEvent',
        'deleteRewardEventByIds',
        'updateRewardEvent',
        'updateProposalTypeProcessSteps',
        'updateProposalProcessStep',
        'approveCsPendingAndChangeStatus',
        'updatePlayerLevel',
        'updatePartnerLevelConfig',
        'createUpdatePartnerCommissionConfigWithGameProviderGroup',
        'updateAutoApprovalConfig',
        'updatePlayerLevelScores',
        'updateCredibilityRemarksInBulk',
        'updatePlatformProviderGroup',
        'setFilteredKeywords',
        'removeFilteredKeywords',
        'createMessageTemplate',
        'updateMessageTemplate',
        'createPlatformAnnouncement',
        'updatePlatformAnnouncement',
        'deletePlatformAnnouncementByIds',
        'pushNotification',
        'addPromoteWay',
        'deletePromoteWay',
        'addUrl',
        'updateUrl',
        'deleteUrl',
        'upsertRewardPointsLvlConfig',
        'updateRewardPointsEvent',
        'deleteRewardPointsEventById',
        'createRewardPointsEvent',
        'updateBatchPlayerPermission',
        'updateBatchPlayerForbidRewardEvents',
        'updateBatchPlayerForbidPaymentType',
        'updateBatchPlayerForbidRewardPointsEvent',
        'updateBatchPlayerCredibilityRemark',
        'updateBatchPlayerLevel',
        'playerCreditClearOut',
        'addPlatformBankCardGroup',
        'updatePlatformBankCardGroup',
        'deleteBankCardGroup',
        'setPlatformDefaultBankCardGroup',
        'addPlayersToBankCardGroup',
        'addAllPlayersToBankCardGroup',
        'addPlatformMerchantGroup',
        'renamePlatformMerchantGroup',
        'deleteMerchantGroup',
        'setPlatformDefaultMerchantGroup',
        'addPlayersToMerchantGroup',
        'addAllPlayersToMerchantGroup',
        'addPlatformAlipayGroup',
        'renamePlatformAlipayGroup',
        'deleteAlipayGroup',
        'setPlatformDefaultAlipayGroup',
        'addPlayersToAlipayGroup',
        'addAllPlayersToAlipayGroup',
        'addPlatformWechatGroup',
        'renamePlatformWechatGroup',
        'deleteWechatGroup',
        'setPlatformDefaultWechatGroup',
        'addPlayersToWechatGroup',
        'addAllPlayersToWechatGroup',
        'updateGameProvider',
        'manualDailyProviderSettlement',
        'updateGame',
        'createDxMission',
        'comparePhoneNum',
        'resetAllPartnerCustomizedCommissionRate',
        'savePreventBlockUrl',
        'deletePreventBlockUrl',
        'resetGroupPartnerCommissionRate'];

        //get all platform data from server
        vm.setPlatform = function (platObj) {
            $scope.$evalAsync(() => {
                vm.operSelPlatform = false;
                vm.selectedPlatform = JSON.parse(platObj);
                vm.curPlatformId = vm.selectedPlatform._id;
                vm.allProviders = {};
                vm.getPlatformProvider(vm.selectedPlatform._id);
                vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
                vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
                vm.getCredibilityRemarksByPlatformId(vm.selectedPlatform._id);
                vm.getDepositTrackingGroupByPlatformId(vm.selectedPlatform._id);
                vm.getRewardList();
                vm.getPromotionTypeList();
                vm.getPlatformProviderGroup();
                vm.getGameProvider();
                vm.getAllGameTypes();
                $cookies.put("platform", vm.selectedPlatform.name);
                console.log('vm.selectedPlatform', vm.selectedPlatform);
                vm.loadPage(vm.showPageName);
            });
        };

        vm.setPlatformById = function (id) {
            var platObj = vm.platformList.filter(p => p._id === id)[0];
            console.log("platObj:", platObj);
            vm.showPageName = '';
            vm.setPlatform(JSON.stringify(platObj));
        }
        vm.showProposalModal2 = function (proposalId, platformObjId) {
            vm.proposalDialog = 'proposalTopUp';
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: platformObjId || vm.selectedPlatform._id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;
                vm.proposalDetailStyle = {};
                let playerName = vm.selectedProposal.data.playerName;
                let typeId = vm.selectedProposal.type._id;
                let typeName = [vm.selectedProposal.type.name];
                let playerId = vm.selectedProposal.data.playerId;
                // if (vm.selectedProposal.data.inputData) {
                //     if (vm.selectedProposal.data.inputData.provinceId) {
                //         vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                //     }
                //     if (vm.selectedProposal.data.inputData.cityId) {
                //         vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                //     }
                // }
                vm.wechatNameConvert();

                vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm, $fixTwoDecimalStr);

                if (vm.selectedProposal.data.inputData) {
                    if (vm.selectedProposal.data.inputData.provinceId) {
                        // vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        commonService.getProvinceName($scope, vm.selectedProposal.data.inputData.provinceId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.provinceName = data;
                        });
                    }
                    if (vm.selectedProposal.data.inputData.cityId) {
                        // vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        commonService.getCityName($scope, vm.selectedProposal.data.inputData.cityId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.cityName = data;
                        });
                    }
                } else {
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                        // vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE" )
                        commonService.getProvinceName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ];
                        });
                    }
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                        // vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        commonService.getCityName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"];
                        });
                    }
                }



                // vm.selectedProposal.data.cityId;
                $('#modalProposal').modal('show');
                $('#modalProposal').on('shown.bs.modal', function (e) {
                    $scope.$evalAsync()
                })
                let cardField = vm.topUpField[typeName].filter(fieldName => {
                        if (vm.selectedProposal.data[fieldName]) {
                            return fieldName
                        }
                    })[0] || '';
                let cardNo = vm.selectedProposal.data[cardField];
                vm.loadTodayTopupQuota(typeId, typeName, cardField, cardNo);
                vm.getUserCardGroup(vm.selectedProposal.type.name, vm.selectedPlatform._id, playerId);
                vm.getCardLimit(vm.selectedProposal.type.name);
            })
        }

        vm.copyTopUpProposal = function () {
            if (vm.selectedProposal && vm.selectedProposal.data) {
                commonService.copyObjToText($translate, vm.selectedProposal.data, "REMARKS","modalProposal");
            }
        }

        vm.showCopyProposal = function () {
            if (vm.selectedProposal && vm.selectedProposal.mainType && vm.selectedProposal.mainType == "TopUp" && vm.selectedProposal.data) {
                return true;
            };
            return false;
        }
        // vm.getAllBankCard = function(){
        //     socketService.$socket($scope.AppSocket, 'getAllBankCard', {platform: vm.selectedPlatform.platformId},
        //         data => {
        //             var data = data.data;
        //             vm.bankCards = data.data ? data.data : false;
        //     });
        // }
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
                if (merchantNo && vm.merchantLists && vm.merchantLists.length > 0) {
                    vm.selectedProposal.card = vm.merchantLists.filter(item => {
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
                console.log(data.data.data);
                if (data.data.length > 0) {
                    vm.selectedProposal.cardSumToday = data.data[0].totalAmount || 0;
                } else {
                    vm.selectedProposal.cardSumToday = 0;
                }
            });
        }
        vm.initMultiSelect = function () {
            // $timeout(function () {
            //   $('.merchantNoList').selectpicker('refresh');
            // });
        }

        vm.groupByIfAliPayLine = function () {
            let selectByGroup = [];
            vm.queryTopup.line = [];
            if(vm.queryTopup.merchantNoData && vm.queryTopup.merchantNoData.length > 0){
                vm.queryTopup.merchantNoData.forEach(merchantNo=>{
                    vm.merchantCloneList.forEach(item=>{
                        if((item.merchantNo == merchantNo.merchantNo) && (item.name == merchantNo.name)){
                            // if that is a alipay category flag, tick all same "line".
                            if(item.category){
                                vm.merchantCloneList.map(merchant=>{
                                    if(merchant.merchantTypeId == '9997' && merchant.line == item.line && !merchant.includesAllCards && !merchant.category){
                                        selectByGroup.push(merchant);
                                    }
                                })
                                if(selectByGroup && selectByGroup.length > 0){
                                    selectByGroup.forEach(groupItem=>{
                                        if(vm.queryTopup.merchantNoData.indexOf(groupItem) == -1){
                                            vm.queryTopup.merchantNoData.push(groupItem);
                                        }
                                    })
                                }
                            }

                            if(item.includesAllCards){
                                vm.queryTopup.line.push(item.lineGroup);
                            }
                        }
                    })
                })
            }
            vm.queryTopup.merchantNo = [];
            vm.queryTopup.merchantName = [];
            vm.queryTopup.merchantNoData.forEach(item=>{
                if ( vm.queryTopup.merchantNo && vm.queryTopup.merchantNo.indexOf(item) == -1 && !item.category && !item.includesAllCards ){
                    vm.queryTopup.merchantNo.push(item.merchantNo);
                }

                if (!item.category && !item.includesAllCards && !item.accountType && item.name) {
                    vm.queryTopup.merchantName.push(item.name);
                }

                if (item && item.accountType && (item.accountType === 'BANK') && item.merchantNo) {
                    vm.queryTopup.merchantNo.push(item.merchantNo.slice(-6));
                }
            })
        }
        vm.filterMerchant = function (isPaymentMonitorReport) {
            let tempModal = isPaymentMonitorReport ? vm.paymentMonitorQuery : vm.queryTopup;
            let tempAgent = [];

            vm.merchantCloneList = angular.copy(vm.merchantNoList);
            vm.merchantGroupCloneList = vm.merchantGroupObj;
            if (!isPaymentMonitorReport && tempModal.userAgent && tempModal.userAgent.length > 0) {
                tempModal.userAgent.forEach(item => {
                    switch (item) {
                        case "1":
                        case "2":
                            tempAgent.push("1"); //pms device 1 stand for web
                            break;
                        case "3":
                        case "4":
                            tempAgent.push("2"); //pms device 2 stand for h5
                            break;
                        case "5":
                        case "6":
                            tempAgent.push("4"); //pms device 4 stand for app
                            break;
                    }
                });
            }
            let agent = isPaymentMonitorReport ? tempModal.userAgent : tempAgent;
            let thirdParty = tempModal.merchantGroup;
            let mainTopupType = tempModal.mainTopupType;
            let topupType = tempModal.topupType;
            let bankTypeId = tempModal.bankTypeId;
            if (agent && agent.length > 0 && vm.merchantCloneList) {
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    let targetDevices = String(item.targetDevices);
                    return agent.indexOf(targetDevices) != -1;
                });
            }

            if (topupType && topupType.length > 0 && vm.merchantCloneList) {
                // display online topup type
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    if (topupType.indexOf(String(item.topupType)) != -1) {
                        console.log($scope.merchantTopupTypeJson[item.topupType] + '...' + item.merchantTypeId + item.merchantTypeName);
                    }
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
                    if (item && item.list && item.list.length > 0) {
                        item.list.forEach(i => {
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
            if (mainTopupType && vm.merchantCloneList) {
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
            if (bankTypeId && (mainTopupType == '1' || mainTopupType == 1 ) && vm.merchantCloneList) {
                // filter selected banktype only
                vm.merchantCloneList = vm.merchantCloneList.filter(item => {
                    //return item.bankTypeId == bankTypeId
                    let bnkId = String(item.bankTypeId)
                    return bankTypeId.indexOf(bnkId) != -1;
                })
            }


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

        // display  proposal detail
        vm.showProposalDetailField = function (obj, fieldName, val) {
            if (!obj) return '';
            var result = val || val === false ? val.toString() : (val === 0) ? "0" : "";
            if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                var str = val.phoneNumber
                if (obj && obj.status && obj.status == 'Pending' && fieldName == 'updateData') {
                    var $link = $('<a>', {
                        class: 'a telToPlayerBtn',
                        text: val.phoneNumber,
                        'data-proposal': JSON.stringify(obj),
                    });
                    utilService.actionAfterLoaded(".telToPlayerBtn", function () {
                        $('#ProposalDetail .telToPlayerBtn').off('click');
                        $('#ProposalDetail .telToPlayerBtn').on('click', function () {
                            var $tr = $(this).closest('tr');
                            vm.telToPlayer(obj);
                        })
                    });

                    result = $link.prop('outerHTML');
                } else {
                    result = val.phoneNumber; //str.substring(0, 3) + "******" + str.slice(-4);
                }
            } else if (obj.status === "Expired" && fieldName === "validTime") {
                var $time = $('<div>', {
                    class: 'inlineBlk margin-right-5'
                }).text(utilService.getFormatTime(val));
                var $btn = $('<button>', {
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
            } else if (fieldName.indexOf('providerGroup') > -1) {
                result = vm.getProviderGroupNameById(val) ? vm.getProviderGroupNameById(val) : $translate("LOCAL_CREDIT");
            } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                result = utilService.getFormatTime(val);
            } else if ((fieldName.indexOf('amount') > -1 || fieldName.indexOf('Amount') > -1) && val) {
                result = Number.isFinite(parseFloat(val)) ? $noRoundTwoDecimalPlaces(parseFloat(val)).toString() : val;
            } else if (fieldName == 'bankAccountType') {
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
                result = vm.allBankTypeList && vm.allBankTypeList[val] ? vm.allBankTypeList[val] : (val + " ! " + $translate("not in bank type list"));
            } else if (fieldName == 'depositMethod') {
                result = $translate(vm.getDepositMethodbyId[val])
            } else if (fieldName === 'playerStatus') {
                result = $translate($scope.constPlayerStatus[val]);
            } else if (fieldName == 'allowedProviders') {
                let providerName = '';
                for (var v in val) {
                    providerName += val[v].name + ', ';
                }
                result = providerName;
            } else if (fieldName === 'proposalPlayerLevel') {
                result = $translate(val);
            } else if (fieldName === 'applyForDate') {
                result = new Date(val).toLocaleDateString("en-US", {timeZone: "Asia/Singapore"});
            } else if (fieldName === 'DOB') {
                result = commonService.convertDOBDateFormat(val);
            } else if (fieldName === 'returnDetail') {
                // Example data structure : {"GameType:9" : {"ratio" : 0.01, "consumeValidAmount" : 6000}}
                let newReturnDetail = {};
                Object.keys(val).forEach(
                    key => {
                        if (key && key.indexOf(':') != -1) {
                            let splitGameTypeIdArr = key.split(':');
                            let gameTypeId = splitGameTypeIdArr[1];
                            newReturnDetail[splitGameTypeIdArr[0]+':'+ vm.allGameTypes[gameTypeId]] = val[key];
                        }
                    });
                result = JSON.stringify(newReturnDetail || val)
                    .replace(new RegExp('GameType',"gm"), $translate('GameType'))
                    .replace(new RegExp('ratio','gm'), $translate('RATIO'))
                    .replace(new RegExp('consumeValidAmount',"gm"), $translate('consumeValidAmount'));
            } else if (fieldName === 'nonXIMADetail') {
                let newNonXIMADetail = {};
                Object.keys(val).forEach(
                    key => {
                        if (key && key.indexOf(':') != -1) {
                            let splitGameTypeIdArr = key.split(':');
                            let gameTypeId = splitGameTypeIdArr[1];
                            newNonXIMADetail[splitGameTypeIdArr[0]+':'+ vm.allGameTypes[gameTypeId]] = val[key];
                        }
                    });
                result = JSON.stringify(newNonXIMADetail || val)
                    .replace(new RegExp('GameType',"gm"), $translate('GameType'))
                    .replace(new RegExp('nonXIMAAmt',"gm"), $translate('totalNonXIMAAmt'));
            } else if (typeof(val) == 'object') {
                result = JSON.stringify(val);
            } else if (fieldName === "upOrDown") {
                result = $translate(val);
            } else if (fieldName === 'definePlayerLoginMode') {
                result = $translate($scope.playerLoginMode[val]);
            } else if (fieldName === 'rewardInterval') {
                result = $translate($scope.rewardInterval[val]);
            }
            else if (fieldName === 'gameProviderInEvent') {
                let gameProviderById = vm.allGameProviderById[val.toString()];

                if(gameProviderById && gameProviderById.name){
                    result =  gameProviderById.name;
                }
            }
            return $sce.trustAsHtml(result);
        };
        // end iof proposal detail

        vm.getAllGameTypes = function () {
            return $scope.$socketPromise('getGameTypeList', {})
                .then(function (data) {
                    var gameTypes = data.data;
                    vm.allGameTypesList = gameTypes;
                    var allGameTypes = {};
                    gameTypes.forEach(function (gameType) {
                        var GAMETYPE = gameType.gameTypeId;
                        allGameTypes[GAMETYPE] = gameType.name;
                    });
                    vm.allGameTypes = allGameTypes;
                }, function (err) {
                    console.log('err', err);
                });
        };

        vm.initReportPara = function () {
            var obj = {};
            obj.startTime = utilService.setNDaysAgo(new Date(), 30);
            obj.endTime = new Date();
            return obj;
        };

        vm.getPlatformProviderGroup = () => {
            $scope.$socketPromise('getPlatformProviderGroup', {platformObjId: vm.selectedPlatform._id}).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.gameProviderGroup = data.data;
                });
            });
        };

        vm.getGameProvider = () => {
            $scope.$socketPromise('getGameProviders', {}).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.gameProvider = data.data;
                });
            });
        };

        vm.getProviderGroupNameById = (grpId) => {
            let result = '';
            $.each(vm.gameProviderGroup, function (i, v) {
                if (grpId == v._id) {
                    result = v.name;
                    return true;
                }
            });
            return result;
        };

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
                            let applyAmount = row.data.applyAmount || 0;
                            return parseFloat(applyAmount).toFixed(2);
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

        vm.loadPage = function (choice, pageName, code, eventObjId, isReset) {
            socketService.clearValue();
            console.log('reward', choice, pageName, code);
            vm.seleDataType = {};
            if (pageName) {
                vm.seleDataType[pageName] = 'bg-bright';
            } else {
                vm.seleDataType[choice] = 'bg-bright';
            }
            vm.showPageName = choice;
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
            vm.otherRewardList = [];
            //vm.selectedOtherReward = null;
            vm.selectedRewardPlatform = null;
            vm.refreshSPicker();

            drawReportQuery(choice, isReset);

            if (vm.showPageName == 'RewardReport' && vm.currentRewardCode == 'ALL') {
                vm.rewardProposalQuery = vm.rewardProposalQuery || {};
                vm.rewardProposalQuery.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#rewardProposalPage", function () {
                    vm.commonInitTime(vm.rewardProposalQuery, '#rewardProposalQuery', true);
                })
            }
            if (vm.currentRewardCode) {
                vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};
                vm.generalRewardProposalQuery.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#generalRewardProposalTablePage", function () {
                    vm.commonInitTime(vm.generalRewardProposalQuery, '#generalRewardProposalQuery', true);
                    vm.generalRewardProposalQuery.pageObj = utilService.createPageForPagingTable("#generalRewardProposalTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardProposalQuery", vm.generalRewardProposalSearch)
                    });
                })
            }
            if (vm.currentRewardTaskName) {
                vm.generalRewardTaskQuery = {};
                vm.generalRewardTaskQuery.totalCount = 0;
                vm.generalRewardTaskTableProp.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#generalRewardTaskTablePage", function () {
                    vm.commonInitTime(vm.generalRewardTaskQuery, '#generalRewardTaskQuery', true);
                    vm.generalRewardTaskQuery.pageObj = utilService.createPageForPagingTable("#generalRewardTaskTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardTaskQuery", vm.searchGeneralRewardTask)
                    });
                })
            }
            $scope.$evalAsync();
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
                $scope.$evalAsync(() => {
                    vm.allProviders = data.data.gameProviders;
                    console.log('vm.allProviders', vm.allProviders);
                });
            }, function (data) {
                console.log("create not", data);
            });
        };

        vm.setQueryRole = (modal) => {
            vm.queryRoles = [];

            vm.queryDepartments.map(e => {
                if (e._id != "" && (modal.departments.indexOf(e._id) >= 0)) {
                    vm.queryRoles = vm.queryRoles.concat(e.roles);
                }
            });

            if (modal && modal.departments && modal.departments.length > 0) {
                if (modal.departments.includes("")) {
                    vm.queryRoles.push({_id:'', roleName:'N/A'});

                    if (!vm.queryAdmins || !vm.queryAdmins.length) {
                        vm.queryAdmins = [];
                        vm.queryAdmins.push({_id:'', adminName:'N/A'});
                    }

                    if (modal && modal.roles && modal.admins) {
                        modal.roles.push("");
                        modal.admins.push("");
                    } else {
                        modal.roles = [];
                        modal.admins = [];
                        modal.roles.push("");
                        modal.admins.push("");
                    }
                }
            }

            endLoadMultipleSelect('.spicker');
            $scope.safeApply();
        };

        vm.setQueryAdmins = (modal) => {
            vm.queryAdmins = [];

            if (modal.departments.includes("") && modal.roles.includes("") && modal.admins.includes("")) {
                vm.queryAdmins.push({_id:'', adminName:'N/A'});
            }

            vm.queryRoles.map(e => {
                if (e._id != "" && (modal.roles.indexOf(e._id) >= 0)) {
                    vm.queryAdmins = vm.queryAdmins.concat(e.users);
                }
            });

            endLoadMultipleSelect('.spicker');
            $scope.safeApply();
        };

        vm.setPDQueryRole = () => {
            vm.pdQueryRoles = [];

            vm.pdQueryDepartments.map(e => {
                if (e._id != "" && (vm.playerDomain.departments.indexOf(e._id) >= 0)) {
                    vm.pdQueryRoles = vm.pdQueryRoles.concat(e.roles);
                }
            });

            if (vm.playerDomain && vm.playerDomain.departments && vm.playerDomain.departments.length > 0) {
                if (vm.playerDomain.departments.includes("")) {
                    vm.pdQueryRoles.push({_id:'', roleName:'N/A'});

                    if (!vm.pdQueryAdmins || !vm.pdQueryAdmins.length) {
                        vm.pdQueryAdmins = [];
                        vm.pdQueryAdmins.push({_id:'', adminName:'N/A'});
                    }

                    if (vm.playerDomain && vm.playerDomain.roles && vm.playerDomain.admins) {
                        vm.playerDomain.roles.push("");
                        vm.playerDomain.admins.push("");
                    } else {
                        vm.playerDomain.roles = [];
                        vm.playerDomain.admins = [];
                        vm.playerDomain.roles.push("");
                        vm.playerDomain.admins.push("");
                    }
                }
            }

            endLoadMultipleSelect('.spicker');
            $scope.safeApply();
        };

        vm.setPDQueryAdmins = () => {
            vm.pdQueryAdmins = [];

            if (vm.playerDomain.departments.includes("") && vm.playerDomain.roles.includes("") && vm.playerDomain.admins.includes("")) {
                vm.pdQueryAdmins.push({_id:'', adminName:'N/A'});
            }

            vm.pdQueryRoles.map(e => {
                if (e._id != "" && (vm.playerDomain.roles.indexOf(e._id) >= 0)) {
                    vm.pdQueryAdmins = vm.pdQueryAdmins.concat(e.users);
                }
            });

            endLoadMultipleSelect('.spicker');
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
                $scope.$evalAsync(() => {
                    console.log(data)
                    if (data.data) {
                        $.each(data.data, function (i, v) {
                            let index = vm.platformList.map(x => x && x._id).indexOf(v && v.platform);
                            if (index > -1) {
                                v.platformName = vm.platformList[index].name;
                            }

                            vm.playerLvlData[v._id] = v;
                        })
                    }
                    console.log("vm.playerLvlData", vm.playerLvlData);
                });
            }, function (data) {
                console.log("cannot get player level", data);
            });
        }

        vm.getCredibilityRemarksByPlatformId = function (id) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: id}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.credibilityRemarks = data.data;
                        vm.filterCredibilityRemarks = data.data ? JSON.parse(JSON.stringify(data.data)) : [];
                        vm.filterCredibilityRemarks.push({'_id':'', 'name':$translate('N/A')});
                        console.log("vm.credibilityRemarks", vm.credibilityRemarks);
                        resolve(vm.credibilityRemarks);
                    });
                }, function (data) {
                    console.log("cannot get credibility remarks", data);
                    vm.credibilityRemarks = {};
                    resolve(vm.credibilityRemarks);
                });
            });
        };

        vm.getDepositTrackingGroupByPlatformId = function (id) {
            socketService.$socket($scope.AppSocket, 'getDepositTrackingGroup', {platformObjId: id}, function (data) {
                $scope.$evalAsync(() => {
                    vm.depositTrackingGroup = data.data;
                    vm.filterDepositTrackingGroup = data.data ? JSON.parse(JSON.stringify(data.data)) : [];
                    vm.filterDepositTrackingGroup.push({'_id':'', 'name':$translate('N/A')});
                });
            }, function (data) {
                console.log("cannot get deposit tracking group", data);
                vm.depositTrackingGroup = {};
            });
        };

        vm.setupRemarksMultiInput = function () {
            let remarkSelect = $('select#selectCredibilityRemarks');

            remarkSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
            $scope.safeApply();
        };

        vm.setupRemarksMultiInputDepositAnalysis = function () {
            let remarkSelect = $('select#selectCredibilityRemarksDepositAnalysis');
            // if (remarkSelect.css('display').toLowerCase() === "none") {
            //     return;
            // }
            remarkSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
        };

        vm.setupRemarksMultiInputDepositTracking = function () {
            let remarkSelect = $('select#selectCredibilityRemarksDepositTracking');
            // if (remarkSelect.css('display').toLowerCase() === "none") {
            //     return;
            // }
            remarkSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
        };

        vm.setupMultiInputDepositTrackingGroup = function () {
            let trackingGroupSelect = $('select#selectTrackingGroupDepositTracking');
            if (trackingGroupSelect.css('display').toLowerCase() === "none") {
                return;
            }
            trackingGroupSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
        };

        vm.setupMultiInputDXTracking = function () {
            let dxTrackingGroupSelect = $('select#selectDXTracking');
            if (dxTrackingGroupSelect.css('display').toLowerCase() === "none") {
                return;
            }
            dxTrackingGroupSelect.multipleSelect({
                showCheckbox: true,
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: false,
                countSelected: $translate('# of % selected')
            });
        };

        vm.getDepartmentDetailsByPlatformObjId = (platformObjId) => {
            socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: platformObjId},
                data => {
                    $scope.$evalAsync(() => {
                        let parentId;
                        let selectedPlatform = vm.platformList.filter(platform => platform._id.toString() === platformObjId)[0];
                        vm.queryDepartments = [];
                        vm.queryRoles = [];

                        vm.queryDepartments.push({_id: '', departmentName: 'N/A'});

                        data.data.map(e => {
                            if (e.departmentName == selectedPlatform.name) {
                                vm.queryDepartments.push(e);
                                parentId = e._id;
                            }
                        });

                        data.data.map(e => {
                            if (String(parentId) == String(e.parent)) {
                                vm.queryDepartments.push(e);
                            }
                        });

                        endLoadMultipleSelect('.spicker');

                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });
                }
            );
        };

        vm.reportOnPlatformChange = (platformObjId) => {
            switch(vm.showPageName.toUpperCase()) {
                case "PLAYER_REPORT":
                    vm.getCredibilityRemarksByPlatformId(platformObjId).then(() => {
                        vm.setupRemarksMultiInput()
                    });
                    vm.getPlayerLevelByPlatformId(platformObjId);
                    vm.getPlatformProvider(platformObjId);
                    vm.getAllPromoteWay(platformObjId).then(() => {
                        endLoadMultipleSelect('.spicker');
                    });
                    vm.getDepartmentDetailsByPlatformObjId(platformObjId);
                    break;

                case "PLAYER_DEPOSIT_ANALYSIS_REPORT":
                    vm.getCredibilityRemarksByPlatformId(platformObjId).then(() => {
                        vm.setupRemarksMultiInputDepositAnalysis()
                    });
                    vm.getPlayerLevelByPlatformId(platformObjId);
                    vm.getPlatformProvider(platformObjId);
                    vm.getDepositTrackingGroupByPlatformId(platformObjId);
                    break;

                case "PLAYER_DEPOSIT_TRACKING_REPORT":
                    vm.getCredibilityRemarksByPlatformId(platformObjId).then(() => {
                        vm.setupRemarksMultiInputDepositTracking();
                    });
                    vm.getDepositTrackingGroupByPlatformId(platformObjId);
                    break;

                case "DX_NEWACCOUNT_REPORT":
                    vm.getAllPromoteWay(platformObjId).then(() => {
                        endLoadMultipleSelect('.spicker');
                    });
                    vm.getDepartmentDetailsByPlatformObjId(platformObjId);
                    break;
                case "FEEDBACK_REPORT":
                    vm.getCredibilityRemarksByPlatformId(platformObjId).then(() => {
                        vm.setupRemarksMultiInput()
                    });
                    vm.getPlayerLevelByPlatformId(platformObjId);
                    vm.getPlatformProvider(platformObjId);
                    vm.getFeedbackDetailsAndDepartmentDerails(platformObjId);
                    break;
                case "DX_TRACKING_REPORT":
                    vm.getFeedbackDetailsAndDepartmentDerails(platformObjId);
                    break;
            }
        };

        vm.getFeedbackDetailsAndDepartmentDerails = function (platformObjId) {
            $scope.$evalAsync(async () => {
                vm.allFeedbackResults = {};
                vm.allFeedbackTopics = {};

                vm.allFeedbackResults = await commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([]));
                vm.allFeedbackTopics = await commonService.getPlayerFeedbackTopic($scope, platformObjId).catch(err => Promise.resolve([]));

                let selectedPlatform = vm.platformList.filter(item => item && item._id && platformObjId && (item._id.toString() === platformObjId.toString()))[0];

                // Get Departments Detail
                socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: platformObjId}, function success(data) {
                    console.log('getDepartmentTreeById', data);
                    let parentId;
                    vm.queryDepartments = [];
                    vm.queryRoles = [];
                    vm.queryAdmins = [];

                    data.data.map(e => {
                        if (e.departmentName == selectedPlatform.name) {
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
            });
        }

        vm.getProposalTypeByPlatformId = function (id) {
            var deferred = Q.defer();
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
                vm.allProposalType = data.data;
                // add index to data
                for (let x = 0; x < vm.allProposalType.length; x++) {
                    let groupName = utilService.getProposalGroupValue(vm.allProposalType[x], false);
                    switch (vm.allProposalType[x].name) {
                        case "AddPlayerRewardTask":
                            vm.allProposalType[x].seq = 3.01;
                            break;
                        case "PlayerLevelUp":
                            vm.allProposalType[x].seq = 3.02;
                            break;
                        case "PlayerLevelMaintain":
                            vm.allProposalType[x].seq = 3.03;
                            break;
                        case "PlayerPromoCodeReward":
                            vm.allProposalType[x].seq = 3.04;
                            break;
                        case "UpdatePlayerInfo":
                            vm.allProposalType[x].seq = 4.01;
                            break;
                        case "UpdatePlayerBankInfo":
                            vm.allProposalType[x].seq = 4.02;
                            break;
                        case "UpdatePlayerEmail":
                            vm.allProposalType[x].seq = 4.03;
                            break;
                        case "UpdatePlayerPhone":
                            vm.allProposalType[x].seq = 4.04;
                            break;
                        case "UpdatePlayerQQ":
                            vm.allProposalType[x].seq = 4.05;
                            break;
                        case "UpdatePlayerWeChat":
                            vm.allProposalType[x].seq = 4.06;
                            break;
                        case "UpdatePlayerInfoPartner":
                            vm.allProposalType[x].seq = 4.07;
                            break;
                        case "UpdatePlayerInfoLevel":
                            vm.allProposalType[x].seq = 4.08;
                            break;
                        case "UpdatePlayerInfoAccAdmin":
                            vm.allProposalType[x].seq = 4.09;
                            break;
                        case "UpdatePartnerInfo":
                            vm.allProposalType[x].seq = 5.01;
                            break;
                        case "UpdatePartnerBankInfo":
                            vm.allProposalType[x].seq = 5.02;
                            break;
                        case "UpdatePartnerEmail":
                            vm.allProposalType[x].seq = 5.03;
                            break;
                        case "UpdatePartnerPhone":
                            vm.allProposalType[x].seq = 5.04;
                            break;
                        case "UpdatePartnerQQ":
                            vm.allProposalType[x].seq = 5.05;
                            break;
                        case "UpdatePartnerWeChat":
                            vm.allProposalType[x].seq = 5.06;
                            break;
                        case "UpdatePartnerCommissionType":
                            vm.allProposalType[x].seq = 5.07;
                            break;
                        case "UpdatePlayerCredit":
                            vm.allProposalType[x].seq = 6.01;
                            break;
                        case "FixPlayerCreditTransfer":
                            vm.allProposalType[x].seq = 6.02;
                            break;
                        case "UpdatePartnerCredit":
                            vm.allProposalType[x].seq = 6.03;
                            break;
                        case "ManualUnlockPlayerReward":
                            vm.allProposalType[x].seq = 6.04;
                            break;
                        case "PlayerLevelMigration":
                            vm.allProposalType[x].seq = 6.05;
                            break;
                        case "PlayerRegistrationIntention":
                            vm.allProposalType[x].seq = 6.06;
                            break;
                        case "PlayerLimitedOfferIntention":
                            vm.allProposalType[x].seq = 6.07;
                            break;
                    }
                    if (!vm.allProposalType[x].seq) {
                        switch (groupName) {
                            case "Topup Proposal":
                                vm.allProposalType[x].seq = 1;
                                break;
                            case "Bonus Proposal":
                                vm.allProposalType[x].seq = 2;
                                break;
                            case "Reward Proposal":
                                vm.allProposalType[x].seq = 3.90;
                                break;
                            case "PLAYER_INFORMATION":
                                vm.allProposalType[x].seq = 4.90;
                                break;
                            case "PARTNER_INFORMATION":
                                vm.allProposalType[x].seq = 5.90;
                                break;
                            case "Others":
                                vm.allProposalType[x].seq = 6.90;
                                break;
                        }
                    }
                    if (groupName.toLowerCase() == "omit") {
                        vm.allProposalType.splice(x, 1);
                        x--;
                    }
                }
                vm.allProposalType.sort(
                    function (a, b) {
                        if (a.seq > b.seq) return 1;
                        if (a.seq < b.seq) return -1;
                        return 0;
                    }
                );
                $scope.safeApply();
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        };

        // vm.getProposalTypeByPlatformId = function (id) {
        //     var deferred = Q.defer();
        //     socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
        //         vm.allProposalType = data.data;
        //         vm.allProposalType.sort(
        //             function (a, b) {
        //                 if (vm.getProposalTypeOptionValue(a) > vm.getProposalTypeOptionValue(b)) return 1;
        //                 if (vm.getProposalTypeOptionValue(a) < vm.getProposalTypeOptionValue(b)) return -1;
        //                 return 0;
        //             }
        //         );
        //         console.log('vm.allProposalType:', data.data);
        //         // console.log('ConsumptionReturn', data.data.name["ConsumptionReturn"]);
        //         deferred.resolve(true);
        //     }, function (error) {
        //         deferred.reject(error);
        //     });
        //     return deferred.promise;
        // };

        vm.getRewardList = function (callback) {
            vm.rewardList = [];
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform._id}, function (data) {
                $scope.$evalAsync(() => {
                    vm.rewardList = data.data;
                    console.log('vm.rewardList', vm.rewardList);
                });
                if (callback) {
                    callback();
                }
            });
        };

        vm.getPromotionTypeList = function (callback) {
            socketService.$socket($scope.AppSocket, 'getPromoCodeTypes', {platformObjId: vm.selectedPlatform._id, deleteFlag: false}, function (data) {
                $scope.$evalAsync(() => {
                    console.log('getPromoCodeTypes', data);
                    vm.promoTypeList = data.data;
                });
                if (callback) {
                    callback();
                }
            });
        };

        vm.getPageNameByRewardName = function (rewardName) {
            if (vm.rewardNamePage[rewardName]) {
                return vm.rewardNamePage[rewardName];
            } else if (rewardName.indexOf("Reward") !== -1 || rewardName.indexOf("Group") !== -1) {
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
            vm.queryTopup.merchantNo = [];
            vm.queryTopup.merchantName = [];
            vm.queryTopup.dingdanID = '';
            vm.queryTopup.type = 'all';
            vm.queryTopup.playerName = '';
            vm.queryTopup.paymentChannel = 'all';
            vm.queryTopup.platformList = [];
        }
        vm.searchTopupRecord = function (newSearch, isExport = false) {

            if (vm.queryTopup && vm.queryTopup.userAgent && vm.queryTopup.userAgent.length && vm.queryTopup.loginDevice && vm.queryTopup.loginDevice.length){
                return socketService.showErrorMessage($translate("Input Device (Old) and LoginDevice cannot be selected at the same time."));
            }
            vm.reportSearchTimeStart = new Date().getTime();

            $('#topupTableSpin').show();

            var staArr = vm.queryTopup.status ? vm.queryTopup.status : [];

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

            let topUpRecordInputDevice = vm.queryTopup.userAgent;
            if(vm.queryTopup && vm.queryTopup.userAgent){
                if(vm.queryTopup.userAgent.indexOf("5") !== -1 && vm.queryTopup.userAgent.indexOf("7") === -1){
                    topUpRecordInputDevice.push("7");
                }
                if(vm.queryTopup.userAgent.indexOf("6") !== -1 && vm.queryTopup.userAgent.indexOf("8") === -1){
                    topUpRecordInputDevice.push("8");
                }
            }
            
            utilService.getDataTablePageSize("#topupTablePage", vm.queryTopup, 30);
            let sendObj = vm.queryTopup.proposalId ? {
                // platformId: vm.curPlatformId,
                proposalId: vm.queryTopup.proposalId,
                platformList:
                    vm.queryTopup.platformList && vm.queryTopup.platformList.length ?
                        vm.queryTopup.platformList : vm.platformList.map(item => item._id),
                index: 0,
                limit: isExport ? 10000 : 1,
            } : {
                playerName: vm.queryTopup.playerName,
                mainTopupType: vm.queryTopup.mainTopupType,
                userAgent: topUpRecordInputDevice,
                topupType: vm.queryTopup.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.queryTopup.merchantGroup)),
                depositMethod: vm.queryTopup.depositMethod,
                bankTypeId: vm.queryTopup.bankTypeId,
                merchantNo: vm.queryTopup.merchantNo,
                platformList:
                    vm.queryTopup.platformList && vm.queryTopup.platformList.length ?
                        vm.queryTopup.platformList : vm.platformList.map(item => item._id),
                status: staArr,
                startTime: vm.queryTopup.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryTopup.endTime.data('datetimepicker').getLocalDate(),
                index: isExport ? 0 : (newSearch ? 0 : (vm.queryTopup.index || 0)),
                limit: isExport ? 10000 : (vm.queryTopup.limit || 10),
                sortCol: vm.queryTopup.sortCol || {},
                isExport: isExport
            };

            if ( vm.queryTopup.line && vm.queryTopup.line.length > 0 ) {
                sendObj.line = vm.queryTopup.line;
            }

            if (vm.queryTopup.merchantNo && vm.queryTopup.merchantNo.length) {
                sendObj.merchantNo = vm.queryTopup.merchantNo;
            }

            if (vm.queryTopup && vm.queryTopup.merchantName && vm.queryTopup.merchantName.length > 0) {
                sendObj.merchantName = vm.queryTopup.merchantName;
            }

            if (sendObj && vm.queryTopup.loginDevice && vm.queryTopup.loginDevice.length && vm.loginDeviceList && vm.queryTopup.loginDevice.length != Object.keys(vm.loginDeviceList).length){
                sendObj.loginDevice = vm.queryTopup.loginDevice;
            }

            console.log('searchTopupRecord sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'topupReport', sendObj, function (data) {
                $('#topupTableSpin').hide();

                if (isExport) {
                    window.saveAs(new Blob([data.data]), "充值报表.csv");
                } else {
                    $scope.$evalAsync(() => {
                        findReportSearchTime();

                        console.log('topup', data);
                        vm.queryTopup.totalCount = data.data.size;
                        vm.queryTopup.totalPlayer = data.data.totalPlayer;
                        vm.drawTopupReport(
                            data.data.data.map(item => {
                                item.amount$ = parseFloat(item.data.amount).toFixed(2);
                                item.status$ = $translate(item.status);
                                item.merchantName = vm.getMerchantName(item.data.merchantNo, item.inputDevice);
                                item.merchantNoDisplay = item.data.merchantNo != null ? item.data.merchantNo
                                    : item.data.bankCardNo != null ? item.data.bankCardNo
                                        : item.data.wechatAccount != null ? item.data.wechatAccount
                                            : item.data.weChatAccount != null ? item.data.weChatAccount
                                                : item.data.alipayAccount != null ? item.data.alipayAccount
                                                    : item.data.accountNo != null ? item.data.accountNo
                                                        : '';
                                item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                                item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                                if (item.type.name == 'PlayerTopUp') {
                                    //show detail topup type info for online topup.
                                    let typeID = item.data.topUpType || item.data.topupType
                                    item.topupTypeStr = typeID
                                        ? $translate($scope.merchantTopupTypeJson[typeID])
                                        : $translate("Unknown")
                                    let merchantNo = '';
                                    if(item.data.merchantNo){
                                        merchantNo = item.data.merchantNo;
                                    }
                                    item.merchantNoDisplay = item && item.data && item.data.merchantName ? item.data.merchantName : vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
                                } else {
                                    //show topup type for other types
                                    item.topupTypeStr = $translate(item.type.name)
                                }
                                item.startTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                                item.endTime$ = item.settleTime ? utilService.$getTimeFromStdTimeFormat(item.settleTime) : "";
                                return item;
                            }), data.data.size, {amount: data.data.total}, newSearch, isExport
                        );
                    })
                }
            }, function (err) {
                console.log(err);
            }, true);
        };

        vm.getMerchantName = function (merchantNo, inputDevice) {
            let result = commonService.getMerchantName(merchantNo, vm.merchantNoList, vm.merchantTypes, inputDevice);
            return result;
        }
        vm.getOnlineMerchantId = function (merchantNo, devices, topupType) {
          let result = merchantNo;
          let targetDevices = commonService.getPMSDevices(devices);

          if(topupType && typeof topupType=='string'){
              topupType = Number(topupType);
          }

          if (merchantNo && vm.merchantNoList) {
              let merchant = vm.merchantNoList.filter(item => {
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
        vm.initAccs = function () {
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

        vm.drawTopupReport = function (data, size, summary, newSearch, isExport) {
            console.log('data', data);
            var tableOptions = {
                data: data,
                "order": vm.queryTopup.aaSorting || [[1, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [14]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [15]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('PRODUCT_NAME'),
                        data: "data.platformId.name"
                    },
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            data = String(data);
                            return '<a ng-click="vm.showProposalModal2(\'' + data + '\', \'' + row.data.platformId._id + '\')">' + data + '</a>';
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
                            let text = $translate(inputDevice ? vm.playerInputDevice[inputDevice] : data ? vm.playerInputDevice[data] : vm.playerInputDevice['0']);
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": "data.topupType",
                        render: function (data, type, row) {
                            var text = $translate(data && $scope.merchantTopupTypeJson[data] ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        }
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
                        }
                    },
                    {
                        "title": $translate('DEPOSIT_METHOD'), "data": 'data.depositMethod',
                        render: function (data, type, row) {
                            var text = $translate(data ? vm.getDepositMethodbyId[data]: "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('From Bank Type'), data: "data.bankTypeId",
                        render: function (data, type, row) {
                            if (data) {
                                // var text = $translate(vm.allBankTypeList[data] ? vm.allBankTypeList[data]: "");
                                var text = vm.allBankTypeList ? vm.allBankTypeList[data] : "";
                                return "<div>" + $translate(text) + "</div>";
                            } else {
                                return "<div>" + '' + "</div>";
                            }
                        }
                    },
                    {
                        title: $translate('Business Acc/ Bank Acc'), data: "merchantNoDisplay",
                        render: function (data, type, row){
                            let addititionalText = '';
                            if( row.data.line && row.data.line == '2'){
                                addititionalText = '(MMM)';
                            }else if(row.data.line && row.data.line == '3'){
                                addititionalText = '('+$translate('MMM4-line3')+')';
                            }
                            return "<div>" + data + addititionalText + "</div>";
                        }
                    },
                    {title: $translate('Total Business Acc'), data: "merchantCount$"},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('PLAYER_NAME'), data: "data.playerName"},
                    {title: $translate('Real Name'), data: "data.playerObjId.realName", sClass: "sumText"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "sumText"},
                    // {title: $translate('PARTNER'), data: "playerId.partner", sClass: "sumText"},
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {
                        title: $translate('Approved Time'), data: "endTime$",
                        render: function (data, type, row) {
                            var text = '';
                            if (row.status == 'Success' || row.status == 'Approved') {
                                text = data ? data : '';
                            }
                            return "<div>" + text + "</div>";
                        }
                    },
                ],
                "paging": false,
                fnInitComplete: function(settings){
                    $compile(angular.element('#' + settings.sTableId).contents())($scope);
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            // vm.topupTable = $('#topupTable').DataTable(tableOptions);
            if(isExport){
                vm.topupTable = utilService.createDatatableWithFooter('#topupExcelTable', tableOptions, {14: summary.amount});
                $('#topupExcelTable_wrapper').hide();
                vm.exportToExcel("topupExcelTable", "TOPUP_REPORT");
            }else{
                vm.topupTable = utilService.createDatatableWithFooter('#topupTable', tableOptions, {14: summary.amount});
                vm.queryTopup.pageObj.init({maxCount: size}, newSearch);

                $('#topupTable').off('order.dt');
                $('#topupTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'queryTopup', vm.searchTopupRecord);
                });
                $('#topupTable').resize();
            }

        }
        ///End topup report

        //Start operation report
        vm.searchOperationRecord = function () {
            if (!vm.queryOperation || !vm.queryOperation.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            var data = null;

            $('#operationTableSpin').show();
            $('#operationTable').hide();
            $('#operationSummaryTable').hide();

            vm.curQueryOperation = $.extend(true, {}, vm.queryOperation); //vm.queryOperation || {};
            vm.curQueryOperation.providerId = vm.curQueryOperation.providerId == "all" ? null : vm.curQueryOperation.providerId;
            vm.curPlatformId = vm.queryOperation.platformId;
            vm.curQueryOperation.platformId = vm.queryOperation.platformId;
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
                        findReportSearchTime();
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
                    item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                    item.amount$ = parseFloat(item.amount).toFixed(2);
                    item.validAmount$ = parseFloat(item.validAmount).toFixed(2);
                    item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                    item.operationPercent$ = parseFloat((item.bonusAmount / item.validAmount * 100) * -1).toFixed(2) + '%'
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
                    {
                        "title": $translate('PRODUCT_NAME'),
                        data: "platform$"
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
                        title: $translate('PLAYER PROFIT AMOUNT'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('COMPANY_PROFIT_POINT'),
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
                platformId: data.platform,
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
                    item.operationPercent$ = parseFloat((item.bonusAmount / item.validAmount * 100) * -1).toFixed(2) + '%'
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
                        title: $translate('PLAYER PROFIT AMOUNT'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('COMPANY_PROFIT_POINT'),
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
                    item.operationPercent$ = parseFloat((item.bonusAmount / item.validAmount * 100) * -1).toFixed(2) + '%'
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
                        title: $translate('PLAYER PROFIT AMOUNT'),
                        data: "bonusAmount$",
                        sClass: "sumFloat alignRight",
                    },
                    {
                        title: $translate('COMPANY_PROFIT_POINT'),
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
        vm.searchProviderPlayerRecord = function (newSearch, isExport = false) {
            if (!vm.playerExpenseQuery || !vm.playerExpenseQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
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
                    utilService.getDataTablePageSize("#playerExpenseTablePage", vm.playerExpenseQuery, 30);
                    var sendData = {
                        startTime: startTime,
                        endTime: endTime,
                        platformId: vm.playerExpenseQuery.platformId,
                        playerId: vm.newPlayerExpenseQuery.playerId,
                        playerName: vm.newPlayerExpenseQuery.playerName,
                        providerId: vm.newPlayerExpenseQuery.providerId,
                        index: isExport ? 0 : (newSearch ? 0 : vm.newPlayerExpenseQuery.index),
                        limit: isExport ? 5000 : (vm.playerExpenseQuery.limit || 10),
                        sortCol: vm.newPlayerExpenseQuery.sortCol || {}
                    };
                    console.log('sendData', sendData);

                    socketService.$socket($scope.AppSocket, 'getPlayerProviderReport', sendData, function (data) {
                        findReportSearchTime();
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                        // $('#operationTableSpin').hide();
                        $('#playerExpenseTableSpin').hide();
                        console.log('player data', data);
                        vm.playerExpenseQuery.totalCount = data.data.size;
                        let drawData = data.data.data;
                        drawData = drawData.map(item => {
                            item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                            return item;
                        });
                        vm.drawPlayerProviderReport(drawData, data.data.size, data.data.summary, newSearch, isExport);
                        $scope.safeApply();
                    }, function (err) {
                        $('#playerExpenseTableSpin').hide();
                        vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
                    }, true);
                }
            ).catch(console.error);
        }
        vm.drawPlayerProviderReport = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.playerExpenseQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'totalConsumedAmount', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'validAmount', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'timesConsumed', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('*'),
                        data: null,
                        "className": 'expandProvider expand',
                        "orderable": false
                    },
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
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

            if(isExport){
                vm.playerExpenseTable = utilService.createDatatableWithFooter('#playerExpenseExcelTable', tableOptions, {
                    3: summary.amount, 4: summary.validAmount, 5: summary.timesConsumed
                });

                $('#playerExpenseExcelTable_wrapper').hide();
                vm.exportToExcel('playerExpenseExcelTable', 'PLAYER_EXPENSE_REPORT');
            }else{
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
        vm.changeWinRatePlatform = function () {
            let query = {};

            if(vm.winRateQuery && vm.winRateQuery.platformList && vm.winRateQuery.platformList.length > 0){
                query.platformObjIdList = vm.winRateQuery.platformList;
            } else {
                query.platformObjIdList = vm.platformList.map(item => item._id);
            }

            vm.providerListByPlatform = [];
            socketService.$socket($scope.AppSocket, 'getProviderListByPlatform', query, function (providerList) {
                $scope.$evalAsync(() => {
                    console.log("Provider list ",providerList);
                    if (providerList && providerList.data) {
                        vm.allProviders = providerList.data;
                    }
                });
            });
        };

        vm.getWinRateReportData = function () {
            vm.reportSearchTimeStart = new Date().getTime();
            // hide table and show 'loading'
            $('#winRateTableSpin').show();

            vm.curWinRateQuery = $.extend(true, {}, vm.winRateQuery);
            vm.curWinRateQuery.providerId = vm.curWinRateQuery.providerId == "all" ? null : vm.curWinRateQuery.providerId;
            vm.curWinRateQuery.platformId = vm.selectedPlatform._id;
            vm.curWinRateQuery.platformList = vm.curWinRateQuery.platformList && vm.curWinRateQuery.platformList.length > 0 ? vm.curWinRateQuery.platformList : vm.platformList.map(item => item._id),
            vm.curWinRateQuery.limit = 0;
            vm.curWinRateQuery.startTime = vm.winRateQuery.startTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.endTime = vm.winRateQuery.endTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.loginDevice = vm.winRateQuery.loginDevice;
            console.log('vm.curWinRateQuery', vm.curWinRateQuery);

            let socketName = 'winRateReport';
            if (vm.curWinRateQuery.searchBySummaryData) {
                socketName = 'winRateReportFromSummary';
            }

            socketService.$socket($scope.AppSocket, socketName, vm.curWinRateQuery, function (data) {
                findReportSearchTime();
                vm.winRateReportLoadingStatus = "";
                $('#winRateTableSpin').hide();
                vm.winRateSummaryData = (data.data && data.data[0]) ? data.data[0] : [];
                // if (vm.curWinRateQuery.providerId && vm.curWinRateQuery.providerId != 'all') {
                //     vm.winRateLayer1 = false;
                //     vm.winRateLayer2 = true;
                //     vm.winRateLayer3 = false;
                //     vm.winRateLayer4 = false;
                //     vm.drawWinRateLayer2Report(data, data.length, {}, true);
                // } else {
                    vm.winRateLayer1 = true;
                    // vm.winRateLayer2 = true;
                    vm.winRateLayer2 = false;
                    vm.winRateLayer3 = false;
                    vm.winRateLayer4 = false;
                // }
                $scope.$evalAsync();
            }, function(err) {
                $('#winRateTableSpin').hide();
                vm.winRateReportLoadingStatus = err.message;
                $scope.$evalAsync();
            }, true);
        };

        vm.reCalculateWinRateReportSummary = function (){
            $('#winRateTableSpin').show();
            var sendquery = {
                platformId: vm.curPlatformId,
                platformList: vm.winRateQuery.platformList && vm.winRateQuery.platformList.length > 0 ? vm.winRateQuery.platformList : vm.platformList.map(item => item._id),
                start: vm.winRateQuery.startTime.data('datetimepicker').getLocalDate(),
                end: vm.winRateQuery.endTime.data('datetimepicker').getLocalDate()
            };

            socketService.$socket($scope.AppSocket, 'reCalculateWinRateReportSummary', sendquery, function (data) {
                $('#winRateTableSpin').hide();
            });
        };

        vm.getWinRateAllPlatformReport = function (listAll) {
            vm.reportSearchTimeStart = new Date().getTime();
            // hide table and show 'loading'
            $('#winRateTableSpin').show();
            vm.winRateLayer2 = true;
            vm.winRateLayer3 = false;
            vm.winRateLayer4 = false;

            vm.curWinRateQuery = $.extend(true, {}, vm.winRateQuery);
            vm.curWinRateQuery.providerId = vm.curWinRateQuery.providerId == "all" ? null : vm.curWinRateQuery.providerId;
            vm.curWinRateQuery.platformId = vm.selectedPlatform._id;
            vm.curWinRateQuery.platformList = vm.curWinRateQuery.platformList && vm.curWinRateQuery.platformList.length > 0 ? vm.curWinRateQuery.platformList : vm.platformList.map(item => item._id),

            vm.curWinRateQuery.limit = 0;
            vm.curWinRateQuery.startTime = vm.winRateQuery.startTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.endTime = vm.winRateQuery.endTime.data('datetimepicker').getLocalDate();
            if (listAll) {
                vm.curWinRateQuery.listAll = true;
            }
            vm.curWinRateQuery.loginDevice = vm.winRateQuery.loginDevice;

            console.log('vm.curWinRateQuery', vm.curWinRateQuery);

            let socketName = 'winRateReport';
            if (vm.curWinRateQuery.searchBySummaryData) {
                socketName = 'winRateReportFromSummary';
            }

            socketService.$socket($scope.AppSocket, socketName, vm.curWinRateQuery, function(data) {
                console.log('getWinRateAllPlatformReport::', data);
                vm.drawWinRateLayer2Report(data, data.length, {}, true);
                findReportSearchTime();
                vm.winRateReportLoadingStatus = "";
                $('#winRateTableSpin').hide();
                $scope.$evalAsync();
            }, function(err) {
                $('#winRateTableSpin').hide();
                vm.winRateReportLoadingStatus = err.message;
                $scope.$evalAsync();
            }, true);
        };

        vm.getWinRateByGameType = function (providerId, providerName, platformName, platformObjId) {
            vm.reportSearchTimeStart = new Date().getTime();
            // hide table and show 'loading'
            $('#winRateTableSpin').show();
            vm.winRateLayer3 = true;
            vm.winRateLayer4 = false;

            vm.curWinRateQuery = $.extend(true, {}, vm.winRateQuery);
            vm.curWinRateQuery.platformId = platformObjId || vm.selectedPlatform._id;
            vm.curWinRateQuery.providerName = providerName;
            vm.curWinRateQuery.limit = 0;
            vm.curWinRateQuery.providerId = providerId;

            vm.curWinRateQuery.startTime = vm.winRateQuery.startTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.endTime = vm.winRateQuery.endTime.data('datetimepicker').getLocalDate();
            vm.curWinRateQuery.loginDevice = vm.winRateQuery.loginDevice;

            let socketName = 'getWinRateByGameType';
            if (vm.curWinRateQuery.searchBySummaryData) {
                socketName = 'getWinRateByGameTypeFromSummary';
            }

            socketService.$socket($scope.AppSocket, socketName, vm.curWinRateQuery, function(data) {
                // hide 'loading' gif
                $('#winRateTableSpin').hide();
                // calculate the sum of non-repeat participant;
                if (data.data && data.data.summaryData && data.data.summaryData.participantArr) {
                    let participantArr = data.data.summaryData.participantArr;
                    let uniqueParticipant = participantArr.filter((x, index, array) => array.indexOf(x) == index)
                    data.data.summaryData.participantNumber = uniqueParticipant.length;
                }

                if (data && data.data && data.data.data) {
                    data.data.data.map(item => {
                        item.platformName = platformName;
                        item.platformObjId = platformObjId || vm.selectedPlatform._id;
                        item.loginDevice$ = item && item.loginDevice ? $translate(vm.loginDeviceList[String(item.loginDevice)]) : "";
                        item.cpGameType = item && item.cpGameType && typeof item.cpGameType === 'string' ? item.cpGameType : "";
                        return item;
                    })
                }

                vm.drawWinRateLayer3Report(data.data, data.length, data.data.summaryData, true);
                $scope.$evalAsync();
            }, function(err) {
                $('#winRateTableSpin').hide();
                $scope.$evalAsync();
            }, true);
        }

        vm.getWinRateByPlayers = function (cpGameType, providerId, platformObjId, loginDevice) {
            vm.reportSearchTimeStart = new Date().getTime();
            // hide table and show 'loading'
            $('#winRateTableSpin').show();
            vm.winRateLayer4 = true;

            let sendData = $.extend(true, {}, vm.winRateQuery);
            sendData = $.extend(true, {}, vm.winRateQuery);
            sendData.providerId = providerId;
            sendData.platformId = platformObjId || vm.selectedPlatform._id;

            sendData.limit = 0;
            sendData.startTime = vm.winRateQuery.startTime.data('datetimepicker').getLocalDate();
            sendData.endTime = vm.winRateQuery.endTime.data('datetimepicker').getLocalDate();

            if (cpGameType != "") {
                sendData.cpGameType = cpGameType;
            }

            if (Object.keys(vm.loginDeviceList).includes(loginDevice)) {
                sendData.loginDevice = Number(loginDevice);
            } else {
               delete sendData.loginDevice;
            }

            if (loginDevice) {
                vm.curWinRateQuery.loginDevice = Number(loginDevice);
            } else {
                delete vm.curWinRateQuery.loginDevice;
            }

            let socketName = 'getWinRateByPlayers';
            if (sendData.searchBySummaryData) {
                socketName = 'getWinRateByPlayersFromSummary';
            }
            console.log('getWinRateByPlayers sendData', sendData);
            socketService.$socket($scope.AppSocket, socketName, sendData, function(data) {
                // hide 'loading' gif
                $('#winRateTableSpin').hide();
                vm.drawWinRateLayer4Report(data.data, data.length, data.data.summaryData, true);
            }, function(err) {
                $('#winRateTableSpin').hide();
            }, true);
        }

        vm.drawWinRateLayer2Report = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data.data,
                "order": [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'platformName', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'providerName', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'participantNumber', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'consumptionTimes', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'totalAmount', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'validAmount', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'profit', bSortable: true, 'aTargets': [7]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platformName"},
                    {title: $translate('PROVIDER'), data: "providerName"},
                    {title: $translate('CONSUMPTION_PARTICIPANT'), data: "participantNumber"},
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes"},
                    {
                        title: $translate('TOTAL_CONSUMPTION'), data: "totalAmount", sClass: 'textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'), data: "validAmount", sClass: 'textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'), data: "bonusAmount", sClass: 'textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('COMPANY_EARNING_RATIO'), data: "profit", sClass: 'textRight',
                        render: function (data, type, row){
                            let result = data;
                            return "<div>" + result + "%</div>";
                        }
                    },
                    {
                        title: $translate('DETAILS'),
                        render: function (data, type, row){
                            let txt = $translate('DETAILS');
                            return "<div ng-click='vm.getWinRateByGameType(\"" + row.providerId +'\",\"' + row.providerName +'\",\"' + row.platformName +'\",\"'+ row.platformObjId+"\")'><a>" + txt + "</a></div>";
                        }
                    },

                ],
                "paging": false,
                fnInitComplete: function(settings){
                    $compile(angular.element('#' + settings.sTableId).contents())($scope);
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.winRateSummaryLayer2Table = utilService.createDatatableWithFooter('#winRateSummaryLayer2Table', tableOptions);
        }
        vm.drawWinRateLayer3Report = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data.data,
                "order": [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'plaftormName', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'participantNumber', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'consumptionTimes', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'totalAmount', bSortable: true, 'aTargets': [6]},
                    {'sortCol': 'validAmount', bSortable: true, 'aTargets': [7]},
                    {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [8]},
                    {'sortCol': 'profit', bSortable: true, 'aTargets': [9]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platformName"},
                    {title: $translate('LOGIN_DEVICE'), data: "loginDevice$"},
                    {title: $translate('PROVIDER'), data: "providerName"},
                    {title: $translate('GAME_TYPE'), data: "cpGameType", "width": "7%"},
                    {title: $translate('CONSUMPTION_PARTICIPANT'), data: "participantNumber", sClass: 'originTXT textRight'},
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: 'sumInt textRight'},
                    {
                        title: $translate('TOTAL_CONSUMPTION'), data: "totalAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'), data: "validAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'), data: "bonusAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('COMPANY_EARNING_RATIO'), data: "profit", sClass: 'sumEarning textRight',
                        render: function (data, type, row){
                            let result = data;
                            return "<div>" + result + "%</div>";
                        }
                    },
                    {
                        title: $translate('DETAILS'),
                        render: function (data, type, row){
                            let txt = $translate('DETAILS');
                            let cpGameType = row && row._id && row._id.cpGameType ? row._id.cpGameType : row._id && typeof row._id === 'string' ? row._id : "";
                            return "<div ng-click='vm.getWinRateByPlayers(\"" + cpGameType +'\",\"' + row.providerId +'\",\"'+ row.platformObjId +'\",\"'+ row.loginDevice+"\")'><a>" + txt + "</a></div>";
                        }
                    }
                ],
                "paging": false,
                fnInitComplete: function(settings){
                    $compile(angular.element('#' + settings.sTableId).contents())($scope);
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.winRateSummaryLayer3Table = utilService.createDatatableWithFooter('#winRateSummaryLayer3Table', tableOptions, {
                4: summary.participantNumber,
                5: summary.consumptionTimes,
                6: summary.totalAmount,
                7: summary.validAmount,
                8: summary.bonusAmount,
                9: summary.profit
            }, true);
            $('#winRateLayer3Table').resize();
        }

        vm.drawWinRateLayer4Report = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data.data,
                "order": [[0, 'asc']],
                aoColumnDefs: [
                    {'sortCol': 'playerName', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'consumptionTimes', bSortable: true, 'aTargets': [2]},
                    {'sortCol': 'totalAmount', bSortable: true, 'aTargets': [3]},
                    {'sortCol': 'validAmount', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'profit', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('order'),
                        render: function (data, type, row, meta){
                            return meta.row + meta.settings._iDisplayStart + 1;
                        }
                    },
                    {title: $translate('MEMBERSHIP_ACCOUNT_NUMBER'), data: "playerName"},
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: 'sumInt textRight'},
                    {
                        title: $translate('TOTAL_CONSUMPTION'), data: "totalAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'), data: "validAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'), data: "bonusAmount", sClass: 'sumFloat textRight',
                        render: function (data, type, row){
                            let result = data.toFixed(2);
                            return "<div>" + result + "</div>";
                        }
                    },
                    {
                        title: $translate('COMPANY_EARNING_RATIO'), data: "profit", sClass: 'sumEarning textRight',
                        render: function (data, type, row){
                            let result = data;
                            return "<div>" + result + "%</div>";
                        }
                    }
                ],
                "paging": false,
                fnInitComplete: function(settings){
                    $compile(angular.element('#' + settings.sTableId).contents())($scope);
                }
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.winRateSummaryLayer3Table = utilService.createDatatableWithFooter('#winRateSummaryLayer4Table', tableOptions, {
                5: summary.consumptionTimes,
                6: summary.totalAmount,
                7: summary.validAmount,
                8: summary.bonusAmount,
                9: summary.profit
            }, true);
        }

        vm.getNumberQueryStr = function (operator, formal, later) {
            if (operator && formal != null) {
                switch (operator) {
                    case ">=":
                    case "=":
                    case "<=":
                        return operator + " " + formal;
                    case "range":
                        return formal + " - " + later;
                }
            }
        };

        vm.getMismatchReport = function () {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#onlinePaymentMismatchTableSpin').show();
            let sendQuery = {
                // platform: vm.selectedPlatform._id,
                // platformId: vm.selectedPlatform.platformId,
                platformList: vm.onlinePaymentMismatchQuery.platformList ? vm.onlinePaymentMismatchQuery.platformList : vm.platformList.map(item => item._id),
                startTime: vm.onlinePaymentMismatchQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.onlinePaymentMismatchQuery.endTime.data('datetimepicker').getLocalDate(),
                type: vm.onlinePaymentMismatchQuery.type
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getMismatchReport', sendQuery, function (data) {
                findReportSearchTime();
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

        vm.searchWechatControlSession = function (newSearch, isExport = false) {
            $('#wechatGroupReportTableSpin').show();

            let sendObj = {
                admin: authService.adminId,
                deviceNickNames: vm.wechatGroupQuery.deviceNickName,
                csOfficer: vm.wechatGroupQuery.csOfficer,
                startTime: vm.wechatGroupQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.wechatGroupQuery.endTime.data('datetimepicker').getLocalDate(),
                platformIds: vm.wechatGroupQuery.product,
                index: isExport? 0: (newSearch ? 0 : (vm.wechatGroupQuery.index || 0)),
                limit: isExport? 5000: vm.wechatGroupQuery.limit || 10,
                sortCol: vm.wechatGroupQuery.sortCol || {createTime: -1}
            }

            vm.reportSearchTimeStart = new Date().getTime();
            socketService.$socket($scope.AppSocket, 'getWechatControlSession', sendObj, function (data) {
                $('#wechatGroupReportTableSpin').hide();
                findReportSearchTime()
                console.log('getWechatControlSession', data);
                vm.wechatGroupQuery.totalCount = data.data.size;
                vm.drawWechatControlSession(
                    data.data.data.map(item => {
                        let timeDiff;
                        if (!item.lastUpdateTime) {
                            timeDiff = Math.abs(new Date().getTime() - new Date(item.createTime).getTime());
                        } else {
                            timeDiff = Math.abs(new Date(item.lastUpdateTime).getTime() - new Date(item.createTime).getTime());
                        }
                        item.onlineDuration$ = Math.floor(timeDiff / (1000 * 60)) + $translate("Minutes");
                        if (item.createTime) {
                            item.createTime = vm.dateReformat(item.createTime);
                        }
                        if (item.lastUpdateTime) {
                            item.lastUpdateTime = vm.dateReformat(item.lastUpdateTime);
                        }
                        return item;
                    }), data.data.size, {}, newSearch, isExport);
                $scope.$evalAsync();
            }, function (err) {
                $('#wechatGroupReportTableSpin').hide();
                console.log(err);
            }, true);
        }

        vm.drawWechatControlSession = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.wechatGroupQuery.aaSorting ,
                aoColumnDefs: [
                    // {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT'), data: "platformObjId.name"},
                    {title: $translate('Create Device Name'), data: "deviceNickName"},
                    {title: $translate('Use Account'), data: "csOfficer.adminName"},
                    {title: $translate('Start Connection Time'), data: "createTime"},
                    {
                        title: $translate('Offline Time'), data: "lastUpdateTime",
                        render: function (data, type, row) {
                            if (data) {
                                return '<span>' + data + '</span>';
                            } else {
                                return '<span style="color: green">' + $translate("STILL_ONLINE") + '</span>';
                            }
                        }
                    },
                    {title: $translate('This Connection is Abnormally Clicked'), data: "connectionAbnormalClickTimes"},
                    {title: $translate('Connection Time'), data: "onlineDuration$"},
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            // vm.adminPhoneListTable = $('#adminPhoneListTable').DataTable(tableOptions);

            if(isExport){
                var proposalTbl = utilService.createDatatableWithFooter('#wechatGroupReportExcelTable', tableOptions, {});
                $('#wechatGroupReportExcelTable_wrapper').hide();
                vm.exportToExcel("wechatGroupReportExcelTable", "WECHAT_GROUP_REPORT");
            }else {
                utilService.createDatatableWithFooter('#wechatGroupReportTable', tableOptions, {});
                vm.wechatGroupQuery.pageObj.init({maxCount: size}, newSearch);

                $('#wechatGroupReportTable').off('order.dt');
                $('#wechatGroupReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'wechatGroupQuery', vm.searchWechatControlSession);
                });
                $('#wechatGroupReportTable').resize();
            }
        }

        vm.getQQSessionDeviceNickName = function (platformObjIds) {
            if (platformObjIds && platformObjIds.length) {
                socketService.$socket($scope.AppSocket, 'getQQSessionDeviceNickName', {platformObjIds: platformObjIds}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.qqSessionNickName = data && data.data || [];
                    })
                })
            } else {
                vm.qqSessionNickName = [];
            }
        }

        vm.getQQSessionCsOfficer = function (platformObjIds, deviceNickNames) {
            if (platformObjIds && platformObjIds.length && deviceNickNames && deviceNickNames.length) {
                socketService.$socket($scope.AppSocket, 'getQQSessionCsOfficer', {platformObjIds: platformObjIds, deviceNickNames: deviceNickNames}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.qqSessionCsOfficer = data && data.data || [];
                    })
                })
            } else {
                vm.qqSessionCsOfficer = [];
            }
        }

        vm.searchQQControlSession = function (newSearch, isExport = false) {
            $('#qqGroupReportTableSpin').show();

            let sendObj = {
                admin: authService.adminId,
                deviceNickNames: vm.qqGroupQuery.deviceNickName,
                csOfficer: vm.qqGroupQuery.csOfficer,
                startTime: vm.qqGroupQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.qqGroupQuery.endTime.data('datetimepicker').getLocalDate(),
                platformIds: vm.qqGroupQuery.product,
                index: isExport? 0: (newSearch ? 0 : (vm.qqGroupQuery.index || 0)),
                limit: isExport? 5000: vm.qqGroupQuery.limit || 10,
                sortCol: vm.qqGroupQuery.sortCol || {createTime: -1}
            }

            vm.reportSearchTimeStart = new Date().getTime();
            socketService.$socket($scope.AppSocket, 'getQQControlSession', sendObj, function (data) {
                $('#qqGroupReportTableSpin').hide();
                findReportSearchTime()
                console.log('getQQControlSession', data);
                vm.qqGroupQuery.totalCount = data.data.size;
                vm.drawQQControlSession(
                    data.data.data.map(item => {
                        let timeDiff;
                        if (!item.lastUpdateTime) {
                            timeDiff = Math.abs(new Date().getTime() - new Date(item.createTime).getTime());
                        } else {
                            timeDiff = Math.abs(new Date(item.lastUpdateTime).getTime() - new Date(item.createTime).getTime());
                        }
                        item.onlineDuration$ = Math.floor(timeDiff / (1000 * 60)) + $translate("Minutes");
                        if (item.createTime) {
                            item.createTime = vm.dateReformat(item.createTime);
                        }
                        if (item.lastUpdateTime) {
                            item.lastUpdateTime = vm.dateReformat(item.lastUpdateTime);
                        }
                        return item;
                    }), data.data.size, {}, newSearch, isExport);
                $scope.$evalAsync();
            }, function (err) {
                $('#qqGroupReportTableSpin').hide();
                console.log(err);
            }, true);
        }

        vm.drawQQControlSession = function (data, size, summary, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.qqGroupQuery.aaSorting ,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT'), data: "platformObjId.name"},
                    {title: $translate('Create Device Name'), data: "deviceNickName"},
                    {title: $translate('Use Account'), data: "csOfficer.adminName"},
                    {title: $translate('Start Connection Time'), data: "createTime"},
                    {
                        title: $translate('Offline Time'), data: "lastUpdateTime",
                        render: function (data, type, row) {
                            if (data) {
                                return '<span>' + data + '</span>';
                            } else {
                                return '<span style="color: green">' + $translate("STILL_ONLINE") + '</span>';
                            }
                        }
                    },
                    {title: $translate('This Connection is Abnormally Clicked'), data: "connectionAbnormalClickTimes"},
                    {title: $translate('Connection Time'), data: "onlineDuration$"},
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if(isExport){
                var proposalTbl = utilService.createDatatableWithFooter('#qqGroupReportExcelTable', tableOptions, {});
                $('#qqGroupReportExcelTable_wrapper').hide();
                vm.exportToExcel("qqGroupReportExcelTable", "QQ_GROUP_REPORT");
            }else {
                utilService.createDatatableWithFooter('#qqGroupReportTable', tableOptions, {});
                vm.qqGroupQuery.pageObj.init({maxCount: size}, newSearch);

                $('#qqGroupReportTable').off('order.dt');
                $('#qqGroupReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'qqGroupQuery', vm.searchQQControlSession);
                });
                $('#qqGroupReportTable').resize();
            }
        }

        vm.searchProviderConsumptionReport = function(newSearch, isExport) {
            $('#providerConsumptionReportTableSpin').show();

            let sendObj = {
                query: {
                    creditibilityRemarkList: vm.providerConsumptionQuery.credibility,
                    startTime: vm.providerConsumptionQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.providerConsumptionQuery.endTime.data('datetimepicker').getLocalDate(),
                    platformIds: vm.providerConsumptionQuery.platform
                },
                index: isExport? 0: (newSearch ? 0 : (vm.providerConsumptionQuery.index || 0)),
                limit: isExport? 5000: vm.providerConsumptionQuery.limit || 10,
                sortCol: vm.providerConsumptionQuery.sortCol || {createTime: -1}
            };

            vm.reportSearchTimeStart = new Date().getTime();
            socketService.$socket($scope.AppSocket, 'getProviderConsumptionReport', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    $('#providerConsumptionReportTableSpin').hide();
                    findReportSearchTime();
                    vm.providerConsumptionQuery.totalCount = data.data.size || 0;
                    vm.drawProviderConsumptionReport(data.data.data, data.data.size, {}, newSearch, isExport, data.data.gameProviderDetail);
                });
            }, function (err) {
                $('#providerConsumptionReportTableSpin').hide();
                console.log(err);
            }, true);
        };

        vm.drawProviderConsumptionReport = function (data, size, summary, newSearch, isExport, providerList) {
            let columns = [
                {title: "", data: "credibilityRemark"},
                {title: $translate("PRODUCT_NAME"), data: "platformName"}
            ];

            //create table columns
            if(providerList && providerList.length > 0){
                providerList.forEach(
                    provider => {
                        if(provider && provider.name){
                            columns.push(
                                {
                                    title: "<div style='word-wrap:break-word;'>" + $translate(provider.name) + "</div>",
                                    data: provider.name,
                                    render: function (data, type, row) {
                                        return typeof data != "undefined" ? data : 0;
                                    }
                                }
                            );
                        }
                    }
                );
            }

            columns.push(                                {
                title: $translate("Total"),
                data: "totalValidConsumption",
                render: function (data, type, row) {
                    return typeof data != "undefined" ? data : 0;
                }
            });

            var tableOptions = {
                data: data,
                "order": vm.providerConsumptionQuery.aaSorting ,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: columns,
                "destroy": true,
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                },
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if(isExport){
                var proposalTbl = utilService.createDatatableWithFooter('#providerConsumptionReportExcelTable', tableOptions, {});
                $('#providerConsumptionReportExcelTable_wrapper').hide();
                vm.exportToExcel("providerConsumptionReportExcelTable", "PROVIDER_CONSUMPTION_REPORT");
            }else {
                vm.providerConsumptionQuery.table = utilService.createDatatableWithFooter('#providerConsumptionReportTable', tableOptions, {});
                vm.providerConsumptionQuery.pageObj.init({maxCount: size}, newSearch);

                $('#providerConsumptionReportTable').off('order.dt');
                $('#providerConsumptionReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'providerConsumptionQuery', vm.searchProviderConsumptionReport);
                });
                $('#providerConsumptionReportTable').resize();
            }
        }

        vm.changeLimitedOfferReportPlatform = function () {
            let platformQuery = vm.limitedOfferQuery.platformList && vm.limitedOfferQuery.platformList.length > 0 ? {$in: vm.limitedOfferQuery.platformList} : vm.platformList.map(item => item._id);
            vm.getPlayerLevelByPlatformId(platformQuery);
        };

        vm.getLimitedOfferReport = function (newSearch) {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#limitedOfferTableSpin').show();
            vm.limitedOfferQuery.index = 0;
            vm.limitedOfferQuery.sortCol = vm.limitedOfferQuery.sortCol || {'applyTime$': -1};

            let sendQuery = {
                //platformObjId: vm.selectedPlatform._id,
                platformList: vm.limitedOfferQuery.platformList ? vm.limitedOfferQuery.platformList : vm.platformList.map(item => item._id),
                startTime: vm.limitedOfferQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.limitedOfferQuery.endTime.data('datetimepicker').getLocalDate(),
                playerName: vm.limitedOfferQuery.playerName,
                promoName: vm.limitedOfferQuery.promoName
            };

            if(vm.limitedOfferQuery.status && vm.limitedOfferQuery.status.length > 0){
                sendQuery.status = vm.limitedOfferQuery.status;
            }

            if(vm.limitedOfferQuery.level && vm.limitedOfferQuery.level.length > 0){
                sendQuery.level = vm.limitedOfferQuery.level;
            }

            if(vm.limitedOfferQuery.inputDevice && vm.limitedOfferQuery.inputDevice.length > 0){
                sendQuery.inputDevice = vm.limitedOfferQuery.inputDevice;
            }

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getLimitedOfferReport', sendQuery, function (data) {
                findReportSearchTime();
                console.log('getLimitedOfferReport', data);
                vm.limitedOfferDetail = [];
                vm.limitedOfferSums = {
                    claimStatus: {
                        accepted: 0,
                        stillValid: 0,
                        expired: 0
                    },
                    device: {
                        webPlayer: 0,
                        h5Player: 0,
                        appPlayer: 0,
                        otherDevice: 0
                    },
                    topUpAmount: 0,
                    rewardAmount: 0
                };
                if(data.hasOwnProperty('data')) {
                    vm.limitedOfferDetail = data.data;
                    vm.limitedOfferDetail.map(e => {
                        e.limitedOfferName$ = e.data.limitedOfferName;
                        e.requiredLevel$ = e.data.requiredLevel || "";
                        e.playerName$ = e.data.playerName;
                        e.applyTime$ = $scope.timeReformat(e.createTime);
                        e.topUpProposalId$ = e.data.topUpProposalId || "";
                        e.topUpAmount$ = e.data.topUpAmount ? e.data.topUpAmount : 0;
                        e.rewardProposalId$ = e.data.rewardProposalId || "";
                        e.rewardAmount$ = e.data.rewardProposalId ? e.data.rewardAmount : 0;
                        e.spendingAmount$ = e.data.spendingAmount ? e.data.spendingAmount : 0;
                        e.inputDevice$ = (e.hasOwnProperty("inputDevice") && vm.inputDeviceMapped[e.inputDevice]) ? $translate(vm.inputDeviceMapped[e.inputDevice]) : "Unknown";
                        e.data.topUpAmount$ = e.data.topUpAmount ? parseFloat(e.data.topUpAmount).toFixed(2) : "";
                        e.data.rewardAmount$ = e.data.rewardProposalId ? parseFloat(e.data.rewardAmount).toFixed(2) : "";
                        e.data.spendingAmount$ = e.data.spendingAmount ? parseFloat(e.data.spendingAmount).toFixed(2) : parseFloat(0).toFixed(2);

                        vm.limitedOfferSums.topUpAmount += e.topUpAmount$;
                        vm.limitedOfferSums.rewardAmount += e.rewardAmount$;
                        switch (e.claimStatus.toUpperCase()) {
                            case "ACCEPTED":
                                vm.limitedOfferSums.claimStatus.accepted++;
                                break;
                            case "STILL VALID":
                                vm.limitedOfferSums.claimStatus.stillValid++;
                                break;
                            case "EXPIRED":
                                vm.limitedOfferSums.claimStatus.expired++;
                                break;
                        }
                        switch (e.inputDevice) {
                            case vm.inputDevice.WEB_PLAYER:
                                vm.limitedOfferSums.device.webPlayer++;
                                break;
                            case vm.inputDevice.H5_PLAYER:
                                vm.limitedOfferSums.device.h5Player++;
                                break;
                            case vm.inputDevice.APP_PLAYER:
                                vm.limitedOfferSums.device.appPlayer++;
                                break;
                            default:
                                vm.limitedOfferSums.device.otherDevice++;
                                break;
                        }
                    });
                    vm.limitedOfferSums.total = vm.limitedOfferDetail.length;
                }
                vm.drawLimitedOfferReport(newSearch);
                $('#limitedOfferTableSpin').hide();
                $scope.safeApply();
            });
        };
        vm.drawLimitedOfferReport = function (newSearch) {
            function localDataProcessing() {
                let searchResult = vm.limitedOfferDetail.slice(0);
                let sortCol = vm.limitedOfferQuery.sortCol;
                let limit = vm.limitedOfferQuery.limit;
                let index = vm.limitedOfferQuery.index;
                if (Object.keys(sortCol).length > 0) {
                    searchResult.sort(function (a, b) {
                        if (a[Object.keys(sortCol)[0]] > b[Object.keys(sortCol)[0]]) {
                            return 1 * sortCol[Object.keys(sortCol)[0]];
                        } else {
                            return -1 * sortCol[Object.keys(sortCol)[0]];
                        }
                    });
                }
                let outputResult = [];
                for (let i = 0, len = limit; i < len; i++) {
                    searchResult[index + i] ? outputResult.push(searchResult[index + i]) : null;
                }
                return outputResult;
            }

            let result = localDataProcessing();
            let allResultSize = vm.limitedOfferDetail.length;
            let tableOptions = {
                data: result,
                "order": vm.limitedOfferQuery.aaSorting || [[5, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'data.platformObjId.name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'proposalId', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'limitedOfferName$', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'requiredLevel$', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'playerName$', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'applyTime$', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'topUpProposalId$', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'topUpAmount$', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'rewardProposalId$', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'rewardAmount$', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'spendingAmount$', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'inputDevice$', 'aTargets': [12], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('ORDER'), sClass: "limitedOfferClaimStatusLabel"},
                    {title: $translate('PRODUCT_NAME'), data: "data.platformObjId.name"},
                    {title: $translate('Proposal No'), data: "proposalId", sClass: "limitedOfferClaimStatusAmount"},
                    {
                        title: $translate('promoName'),
                        data: "data.limitedOfferName",
                        render: function (data, type, row) {
                            data = String(data);
                            return '<a ng-click="vm.showProposalModalNoObjId(\'' + row.proposalId + '\')">' + data + '</a>';
                        },
                        sClass: "limitedOfferClaimStatusPercentage"
                    },
                    {title: $translate('Level Requirement'), data: "data.requiredLevel"},
                    {title: $translate('PLAYERNAME'), data: "data.playerName", sClass: "realNameCell wordWrap"},
                    {title: $translate('LIMITED_OFFER_APPLY_TIME'), data: "applyTime$", sClass: "limitedOfferSumLabel"},
                    {title: $translate('topUpProposalId'), data: "data.topUpProposalId"},
                    {title: $translate('TopupAmount'), data: "data.topUpAmount$", sClass: "sumFloat"},
                    {title: $translate('rewardProposalId'), data: "data.rewardProposalId"},
                    {title: $translate('OFFER_AMOUNT'), data: "data.rewardAmount$", sClass: "sumFloat"},
                    {title: $translate('SPENDING_AMOUNT'), data: "data.spendingAmount$"},
                    {title: $translate('DEVICE'), data: "inputDevice$", sClass: "limitedOfferDevice"}
                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                bSortClasses: false,
                fnRowCallback: vm.limitedOfferTableCallback
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            vm.limitedOfferSums["7"] = vm.limitedOfferSums.topUpAmount;
            vm.limitedOfferSums["9"] = vm.limitedOfferSums.rewardAmount;
            let playerTbl = utilService.createDatatableWithFooter('#limitedOfferTable', tableOptions, vm.limitedOfferSums, false);
            vm.limitedOfferQuery.pageObj.init({maxCount: allResultSize}, newSearch);
            utilService.setDataTablePageInput('limitedOfferTable', playerTbl, $translate);
            playerTbl.on( 'order.dt', function () {
                playerTbl.column(0, {order:'applied'}).nodes().each( function (cell, i) {
                    cell.innerHTML = i+1;
                } );
            } ).draw();

            $('#limitedOfferTable').resize();
            // $('#limitedOfferTable tbody').off('click', 'td.expandPlayerReport');
            // $('#limitedOfferTable tbody').on('click', 'td.expandPlayerReport', function () {
            //     var tr = $(this).closest('tr');
            //     var row = playerTbl.row(tr);
            //
            //     if (row.child.isShown()) {
            //         // This row is already open - close it
            //         row.child.hide();
            //         tr.removeClass('shown');
            //     }
            //     else {
            //         // Open this row
            //         var data = row.data();
            //         console.log('content', data);
            //         var id = 'playertable' + data._id;
            //         row.child(vm.createInnerTable(id)).show();
            //         vm[id] = {};
            //         vm.allGame = [];
            //         var gameId = [];
            //         if (data.gameDetail) {
            //             for (let n = 0; n < data.gameDetail.length; n++) {
            //                 gameId[n] = data.gameDetail[n].gameId;
            //             }
            //
            //             vm.getGameByIds(gameId).then(
            //                 function () {
            //                     for (let i = 0; i < data.gameDetail.length; i++) {
            //                         data.gameDetail[i].profit = parseFloat(data.gameDetail[i].bonusAmount / data.gameDetail[i].validAmount * -100).toFixed(2) + "%";
            //                         for (let j = 0; j < vm.allGame.length; j++){
            //                             if (data.gameDetail[i].gameId.toString() == vm.allGame[j]._id.toString()){
            //                                 data.gameDetail[i].name = vm.allGame[j].name;
            //                             }
            //                         }
            //                     }
            //                     vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.limitedOfferQuery);
            //                 }
            //             )
            //         }
            //
            //         tr.addClass('shown');
            //     }
            // });

            $('#limitedOfferTable').off('order.dt');
            $('#limitedOfferTable').on('order.dt', function (event, a) {
                vm.commonSortChangeHandler(a, 'limitedOfferQuery', vm.drawLimitedOfferReport);
            });
        };

        vm.limitedOfferTableCallback = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $compile(nRow)($scope);
            switch (aData.claimStatus) {
                case "STILL VALID": {
                    $(nRow).css('background-color', 'rgba(255, 209, 202, 100)', 'important');
                    // $(nRow).css('background-color > .sorting_1', 'rgba(255, 209, 202, 100)','important');
                    break;
                }
                case "EXPIRED": {
                    $(nRow).css('background-color', 'rgba(200, 200, 200, 20)', 'important');
                    // $(nRow).css('background-color > .sorting_1', 'rgba(255, 209, 202, 100)','important');
                    break;
                }
            }
        };

        vm.getPlayerAlipayAccReport = function (newSearch) {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#playerAlipayAccReportSpin').show();
            vm.playerAlipayAccReport.index = 0;

            let sendQuery = {
                // platformObjId: vm.selectedPlatform._id,
                platformList: vm.playerAlipayAccReport.platformList ? vm.playerAlipayAccReport.platformList : vm.platformList.map(item => item._id),
                startTime: vm.playerAlipayAccReport.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerAlipayAccReport.endTime.data('datetimepicker').getLocalDate(),
            };

            if (vm.playerAlipayAccReport.playerName) { sendQuery.playerName = vm.playerAlipayAccReport.playerName }
            if (vm.playerAlipayAccReport.alipayAcc) { sendQuery.alipayAcc = vm.playerAlipayAccReport.alipayAcc }
            if (vm.playerAlipayAccReport.alipayName) { sendQuery.alipayName = vm.playerAlipayAccReport.alipayName }
            if (vm.playerAlipayAccReport.alipayNickname) { sendQuery.alipayNickname = vm.playerAlipayAccReport.alipayNickname }
            if (vm.playerAlipayAccReport.alipayRemark) { sendQuery.alipayRemark = vm.playerAlipayAccReport.alipayRemark }

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getPlayerAlipayAccReport', sendQuery, function (data) {
                findReportSearchTime();
                console.log('getPlayerAlipayAccReport', data);

                if(data.hasOwnProperty('data')) {
                    vm.playerAlipayAccDetail = data.data;
                    vm.playerAlipayAccDetail.map(e => {
                        e.applyTime$ = $scope.timeReformat(e.createTime);
                    });
                    vm.playerAlipayAccReport.totalCount = vm.playerAlipayAccDetail.length;
                }
                drawPlayerAlipayAccReport(newSearch);
                $('#playerAlipayAccReportSpin').hide();
                $scope.$evalAsync();
            });
        };

        function drawPlayerAlipayAccReport (newSearch) {
            let tableOptions = {
                data: vm.playerAlipayAccDetail,
                "order": vm.playerAlipayAccDetail.aaSorting || [[0, 'desc']],
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "data.platformId.name"},
                    {title: $translate('Proposal No'), data: "proposalId"},
                    {title: $translate('RELATED_ACCOUNT'), data: "data.playerName"},
                    {title: $translate('RELATED_AMOUNT'), data: "data.amount"},
                    {title: $translate('createTime'), data: "applyTime$"},
                    {title: $translate('REMARK'), data: "data.remark"},
                    {title: $translate('RECORD_ALIPAY_ACC'), data: "data.alipayerAccount"},
                    {title: $translate('RECORD_ALIPAY_NAME'), data: "data.alipayer"},
                    {title: $translate('RECORD_ALIPAY_NICKNAME'), data: "data.alipayerNickName"},
                    {title: $translate('RECORD_ALIPAY_REMARK'), data: "data.alipayRemark"},
                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                bSortClasses: false,
                fnRowCallback: vm.limitedOfferTableCallback
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            let playerTbl = utilService.createDatatableWithFooter('#playerAlipayAccReportTable', tableOptions, {}, false);
            utilService.setDataTablePageInput('playerAlipayAccReportTable', playerTbl, $translate);

            $('#playerAlipayAccReportTable').resize();
        };

        ////////////////////PARTNER REAL TIME COMMISSION REPORT//////////////////////
        vm.getSelectedCommissionPeriod = () => {
            if (vm.selectedCommissionPeriod) {
                let query = {pastX: vm.selectedCommissionPeriod, platformObjId: vm.selectedPlatform._id};

                if (vm.realTimeCommissionQuery.partnerName) {
                    query.partnerName = vm.realTimeCommissionQuery.partnerName;
                } else if (vm.realTimeCommissionQuery.commissionType) {
                    query.commissionType = vm.realTimeCommissionQuery.commissionType;
                } else {
                    return;
                }

                $scope.$socketPromise('getPreviousCommissionPeriod', query).then(
                    data => {
                        vm.commissionPeriodUsed = data.data;
                        let startTime = utilService.$getTimeFromStdTimeFormat(vm.commissionPeriodUsed.startTime);
                        let endTime = utilService.$getTimeFromStdTimeFormat(vm.commissionPeriodUsed.endTime);
                        $scope.$evalAsync(() => {
                            vm.realTimeCommissionLoadingStatus = startTime + " ~ " + endTime;
                        });
                    }
                )
            }
            else {
                vm.commissionPeriodUsed = false;
                $scope.$evalAsync(() => {
                    vm.realTimeCommissionLoadingStatus = '';
                });
            }
        };

        vm.searchRealTimePartnerCommissionData = function () {
            vm.reportSearchTimeStart = new Date().getTime();
            let loadingSpinner = $('#realTimeCommissionTableSpin');
            loadingSpinner.show();
            vm.realTimeCommissionLoadingStatus = "";
            let query = {
                platformObjId: vm.selectedPlatform._id,
                commissionType: vm.realTimeCommissionQuery.commissionType,
                partnerName: vm.realTimeCommissionQuery.partnerName ? vm.realTimeCommissionQuery.partnerName.trim() : "",
            };

            if (!(vm.realTimeCommissionQuery.commissionType || vm.realTimeCommissionQuery.partnerName && vm.realTimeCommissionQuery.partnerName.trim())) {
                vm.realTimeCommissionLoadingStatus = $translate("Please insert either commission type or partner name for search");
                loadingSpinner.hide();
                return;
            }

            if (vm.commissionPeriodUsed && vm.commissionPeriodUsed.startTime && vm.commissionPeriodUsed.endTime) {
                query.startTime = vm.commissionPeriodUsed.startTime;
                query.endTime = vm.commissionPeriodUsed.endTime;
            }

            socketService.$socket($scope.AppSocket, 'getCurrentPartnerCommissionDetail', query, function (data) {
                findReportSearchTime();
                loadingSpinner.hide();
                console.log('getCurrentPartnerCommissionDetail', data);

                $scope.$evalAsync(() => {
                    vm.realTimeCommissionData = data.data || [];
                    vm.realTimeCommissionData.forEach( partner => {
                        if (partner) {
                            partner.isAnyCustomPlatformFeeRate = false;
                            (partner.rawCommissions).forEach( (group, idxgroup) => {
                                group.commissionRate = +(group.commissionRate*100).toFixed(2);
                                partner.isAnyCustomPlatformFeeRate = group.isCustomPlatformFeeRate ? true : partner.isAnyCustomPlatformFeeRate;
                                if (group.isCustomPlatformFeeRate == true){
                                    vm.partnerCommVar.platformFeeTab = idxgroup;
                                }
                            });

                            if (vm.realTimeCommissionQuery.partnerName && vm.selectedCommissionPeriod && vm.realTimeCommissionData.length == 1) {
                                vm.showRealTimeCommissionSettlementButton = true;
                            }
                        }
                    });
                });
            }, function (error) {
                loadingSpinner.hide();
                vm.realTimeCommissionLoadingStatus = (error && error.errorMessage) || $translate("RESPONSE_TIMEOUT");
                console.log('getCurrentPartnerCommissionDetail error', error);
            });
        };

        vm.settlePastCommission = () => {
            if (!vm.realTimeCommissionQuery.partnerName || !vm.selectedCommissionPeriod) {
                return;
            }

            let query = {pastX: vm.selectedCommissionPeriod, platformObjId: vm.selectedPlatform._id, partnerName: vm.realTimeCommissionQuery.partnerName};
            let loadingSpinner = $('#realTimeCommissionTableSpin');
            loadingSpinner.show();

            socketService.$socket($scope.AppSocket, 'settlePastCommission', query, function (data) {
                loadingSpinner.hide();
                console.log('settlePastCommission', data);

                socketService.showConfirmMessage($translate("Apply Commission Succeed"), 10000)
            }, function (error) {
                loadingSpinner.hide();
                vm.realTimeCommissionLoadingStatus = (error && error.errorMessage) || $translate("RESPONSE_TIMEOUT");
                console.log('getCurrentPartnerCommissionDetail error', error);
            });
        };

        vm.calculatePartnerDLTotalDetail = function (partnerDownLineCommDetail, detailType){
            for (var i in vm.partnerDLCommDetailTotal){
                delete vm.partnerDLCommDetailTotal[i];
            }

            if (partnerDownLineCommDetail && partnerDownLineCommDetail.length > 0) {
                if (!partnerDownLineCommDetail[0]) {
                    partnerDownLineCommDetail.push({});
                }
                (Object.keys(partnerDownLineCommDetail[0][detailType])).forEach( key => {
                    if (key === "consumptionProviderDetail") {
                        (Object.keys(partnerDownLineCommDetail[0][detailType][key])).forEach( subkey1 => {
                            vm.partnerDLCommDetailTotal[subkey1] = {};

                            (Object.keys(partnerDownLineCommDetail[0][detailType][key][subkey1])).forEach( subkey2 => {
                                vm.partnerDLCommDetailTotal[subkey1][subkey2] =
                                    partnerDownLineCommDetail.length !== 0 ? partnerDownLineCommDetail.reduce((a, item) =>
                                        a + (Number.isFinite(item[detailType][key][subkey1][subkey2]) ? item[detailType][key][subkey1][subkey2] : 0), 0) : 0;
                            });
                        });
                    }
                    else {
                        vm.partnerDLCommDetailTotal = vm.partnerDLCommDetailTotal || {};
                        vm.partnerDLCommDetailTotal[key] = $scope.calculateTotalSum(partnerDownLineCommDetail, detailType, key);
                    }
                });
            }
            $scope.safeApply();
        };

        ////////////////////FEEDBACK REPORT//////////////////////
        vm.searchFeedbackReport = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#feedbackReportTableSpin').show();

            let admins = [];
            let query = {};

            if (vm.feedbackQuery.departments) {
                if (vm.feedbackQuery.roles) {
                    vm.queryRoles.map(e => {
                        if (e._id != "" && (vm.feedbackQuery.roles.indexOf(e._id) >= 0)) {
                            e.users.map(f => admins.push(f._id))
                        }
                    })
                } else {
                    vm.queryRoles.map(e => {
                        if (e && e._id != "" && e.users && e.users.length) {
                            e.users.map(f => {
                                if (f && f._id != "") {
                                    admins.push(f._id);
                                }
                            });
                        }
                    });
                }
            }

            if(vm.feedbackQuery.userType && vm.feedbackQuery.userType!=null) {
                query.playerType = vm.feedbackQuery.userType;
            }
            // if(vm.feedbackQuery.days && vm.feedbackQuery.days!=null) {
            //     query.days = vm.feedbackQuery.days;
            // }
            if(vm.feedbackQuery.result && vm.feedbackQuery.result.length > 0) {
                query.result = {$in: vm.feedbackQuery.result};
            }
            if(vm.feedbackQuery.topic && vm.feedbackQuery.topic.length > 0) {
                query.topic = {$in: vm.feedbackQuery.topic};
            }
            if(vm.feedbackQuery.admins && vm.feedbackQuery.admins.length > 0) {
                query.admins = vm.feedbackQuery.admins;
            } else if (admins && admins.length > 0) {
                query.admins = admins;
            }
            if(vm.feedbackQuery.registrationDevice && vm.feedbackQuery.registrationDevice.length == Object.keys(vm.registrationDeviceList).length) {
                query.registrationDevice = [];
            } else {
                query.registrationDevice = vm.feedbackQuery.registrationDevice;
            }

            query.start = vm.feedbackQuery.start.data('datetimepicker').getLocalDate();
            query.end = vm.feedbackQuery.end.data('datetimepicker').getLocalDate();
            query.searchTime = vm.feedbackQuery.searchTime.data('datetimepicker').getLocalDate();
            query.searchEndTime = vm.feedbackQuery.searchEndTime.data('datetimepicker').getLocalDate();
            query.days = vm.feedbackQuery.days;
            query.credibilityRemarks = vm.feedbackQuery.credibility;
            query.valueScoreOperator = vm.feedbackQuery.valueOperator;
            query.playerScoreValue = vm.feedbackQuery.valueFormal;
            query.playerScoreValueTwo = vm.feedbackQuery.valueLatter;
            query.topUpTimesOperator = vm.feedbackQuery.topUpTimesOperator;
            query.topUpTimesValue = vm.feedbackQuery.topUpTimesFormal;
            query.topUpTimesValueTwo = vm.feedbackQuery.topUpTimesLatter;
            query.bonusTimesOperator = vm.feedbackQuery.bonusTimesOperator;
            query.bonusTimesValue = vm.feedbackQuery.bonusTimesFormal;
            query.bonusTimesValueTwo = vm.feedbackQuery.bonusTimesLatter;
            query.topUpAmountOperator = vm.feedbackQuery.topUpAmountOperator;
            query.topUpAmountValue = vm.feedbackQuery.topUpAmountFormal;
            query.topUpAmountValueTwo = vm.feedbackQuery.topUpAmountLatter;
            vm.feedbackQuery.sortCol = vm.feedbackQuery.sortCol || {createTime$: -1};

            utilService.getDataTablePageSize("#feedbackReportTablePage", vm.feedbackQuery, 5000);

            let sendquery = {
                platformId: vm.feedbackQuery.platformId || vm.curPlatformId,
                query: query,
                index: 0,
                limit: 5000,
                sortCol: vm.feedbackQuery.sortCol,
            };
            console.log('sendquery', sendquery);
            socketService.$socket($scope.AppSocket, 'getFeedbackReport', sendquery, function (data) {
                $scope.$evalAsync(() => {
                    findReportSearchTime();
                    console.log('retData', data);
                    vm.feedbackDataSum = {
                        manualTopUpAmount: 0,
                        weChatTopUpAmount: 0,
                        aliPayTopUpAmount: 0,
                        onlineTopUpAmount: 0,
                        topUpTimes: 0,
                        topUpAmount: 0,
                        bonusTimes: 0,
                        bonusAmount: 0,
                        rewardAmount: 0,
                        consumptionReturnAmount: 0,
                        consumptionTimes: 0,
                        validConsumptionAmount: 0,
                        consumptionBonusAmount: 0,
                        profit: 0,
                        consumptionAmount: 0,
                        totalPlatformFeeEstimate: 0,
                        totalOnlineTopUpFee: 0
                    };
                    vm.feedbackQuery.totalCount = data.data.size;
                    vm.feedbackData = data.data.data.map(item => {
                        item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                        item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.feedback.createTime);
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
                        item.feedbackTopic$ = (item.feedback.topic == null ||item.feedback.topic == undefined) ? '-' : item.feedback.topic;
                        item.feedbackAdminName$ = (item && item.feedback && item.feedback.adminId && item.feedback.adminId.adminName) ? item.feedback.adminId.adminName : '-';
                        item.registrationDevice$ = (item && item.registrationDevice) ? $translate(vm.registrationDeviceList[item.registrationDevice]) : '-';
                        item.credibility$ = "";
                        if (item.credibilityRemarks) {
                            for (let i = 0; i < item.credibilityRemarks.length; i++) {
                                for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                    if (item.credibilityRemarks[i] && vm.credibilityRemarks[j] && vm.credibilityRemarks[j]._id && item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
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

                        item.profit = 0;
                        item.profit$ = 0;
                        if (item.consumptionBonusAmount != 0 && item.validConsumptionAmount != 0) {
                            item.profit = parseFloat((item.consumptionBonusAmount / item.validConsumptionAmount) * -100);
                            item.profit$ = parseFloat((item.consumptionBonusAmount / item.validConsumptionAmount) * -100).toFixed(2) + "%";
                        }

                        //build sumData for table Footer usage (total amount of all data)
                        item.manualTopUpAmount ? vm.feedbackDataSum.manualTopUpAmount += item.manualTopUpAmount : null;
                        item.weChatTopUpAmount ? vm.feedbackDataSum.weChatTopUpAmount += item.weChatTopUpAmount : null;
                        item.aliPayTopUpAmount ? vm.feedbackDataSum.aliPayTopUpAmount += item.aliPayTopUpAmount : null;
                        item.onlineTopUpAmount ? vm.feedbackDataSum.onlineTopUpAmount += item.onlineTopUpAmount : null;
                        item.topUpTimes ? vm.feedbackDataSum.topUpTimes += parseInt(item.topUpTimes, 10) : null;
                        item.topUpAmount ? vm.feedbackDataSum.topUpAmount += item.topUpAmount : null;
                        item.bonusTimes ? vm.feedbackDataSum.bonusTimes += parseInt(item.bonusTimes, 10) : null;
                        item.bonusAmount ? vm.feedbackDataSum.bonusAmount += item.bonusAmount : null;
                        item.rewardAmount ? vm.feedbackDataSum.rewardAmount += item.rewardAmount : null;
                        item.consumptionReturnAmount ? vm.feedbackDataSum.consumptionReturnAmount += item.consumptionReturnAmount : null;
                        item.consumptionTimes ? vm.feedbackDataSum.consumptionTimes += parseInt(item.consumptionTimes, 10) : null;
                        item.validConsumptionAmount ? vm.feedbackDataSum.validConsumptionAmount += item.validConsumptionAmount : null;
                        item.consumptionBonusAmount ? vm.feedbackDataSum.consumptionBonusAmount += item.consumptionBonusAmount : null;
                        item.consumptionAmount ? vm.feedbackDataSum.consumptionAmount += item.consumptionAmount : null;
                        item.totalPlatformFeeEstimate ? vm.feedbackDataSum.totalPlatformFeeEstimate += item.totalPlatformFeeEstimate : null;
                        item.totalOnlineTopUpFee ? vm.feedbackDataSum.totalOnlineTopUpFee += item.totalOnlineTopUpFee : null;

                        if (item.onlineTopUpFeeDetail && item.onlineTopUpFeeDetail.length > 0) {
                            let detailArr = [];
                            item.onlineTopUpFeeDetail.forEach((detail, index) => {
                                if (detail && detail.merchantName && detail.hasOwnProperty('onlineToUpFee') && detail.hasOwnProperty('onlineTopUpServiceChargeRate')) {
                                    let orderNo = index ? index + 1 : 1;
                                    detailArr.push(orderNo + '. ' + detail.merchantName + ': ' + detail.amount + $translate("YEN") + ' * ' + parseFloat(detail.onlineTopUpServiceChargeRate * 100).toFixed(2) + '%');
                                }
                            });

                            item.onlineTopUpFeeDetail$ = detailArr && detailArr.length > 0 ? detailArr.join('\n') : '';
                        } else {
                            item.onlineTopUpFeeDetail$ = '';
                        }
                        item.totalOnlineTopUpFee$ = parseFloat(item.totalOnlineTopUpFee).toFixed(2);

                        if (item.hasOwnProperty("totalPlatformFeeEstimate")) {
                            item.totalPlatformFeeEstimate$ = item.totalPlatformFeeEstimate.toFixed(2);
                        }

                        return item;
                    });

                    vm.feedbackDataSum.profit = (-vm.feedbackDataSum.consumptionBonusAmount) / vm.feedbackDataSum.validConsumptionAmount * 100;

                    $('#feedbackReportTableSpin').hide();
                    vm.drawFeedbackReport(newSearch, isExport)
                });
            });
        };

        vm.drawFeedbackReport = function (newSearch, isExport) {
            function localDataProcessing() {
                vm.feedbackQuery.sortCol = vm.feedbackQuery.sortCol || {'createTime$': -1};

                let searchResult = vm.feedbackData.slice(0);
                let sortCol = vm.feedbackQuery.sortCol;
                let limit = isExport ? 5000 : vm.feedbackQuery.limit;
                let index = isExport ? 0 : vm.feedbackQuery.index;
                if (Object.keys(sortCol).length > 0) {
                    searchResult.sort(function (a, b) {
                        if (a[Object.keys(sortCol)[0]] > b[Object.keys(sortCol)[0]]) {
                            return 1 * sortCol[Object.keys(sortCol)[0]];
                        } else {
                            return -1 * sortCol[Object.keys(sortCol)[0]];
                        }
                    });
                }
                let outputResult = [];
                for (let i = 0, len = limit; i < len; i++) {
                    searchResult[index + i] ? outputResult.push(searchResult[index + i]) : null;
                }
                return outputResult;
            }

            let result = localDataProcessing();
            let allResultSize = vm.feedbackData.length;
            let tableOptions = {
                data: result,
                "order": vm.feedbackQuery.aaSorting || [[4, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'registrationDevice$', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'valueScore', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'credibility$', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'createTime$', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'endTime$', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'provider$', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'manualTopUpAmount', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'weChatTopUpAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'aliPayTopUpAmount', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'onlineTopUpAmount', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [17], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [18], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [19], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [20], bSortable: true},
                    {'sortCol': 'profit', 'aTargets': [21], bSortable: true},
                    {'sortCol': 'feedbackAdminName$', 'aTargets': [22], bSortable: true},
                    {'sortCol': 'feedbackTopic$', 'aTargets': [23], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [24], bSortable: true},
                    {'sortCol': 'totalPlatformFeeEstimate', 'aTargets': [25], bSortable: true},
                    {'sortCol': 'totalOnlineTopUpFee', 'aTargets': [26], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('ORDER')},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('REGISTRATION_DEVICE'), data: "registrationDevice$"},
                    {title: $translate('PLAYER_VALUE'), data: "valueScore"},
                    {title: $translate('CREDIBILITY'), data: "credibility$"},
                    {title: $translate('FEEDBACK_TIME'), data: "createTime$"},
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
                    {title: $translate('COMPANY_PROFIT'), data: "profit$", sClass: "feedbackReportProfit"},
                    {title: $translate('FEEDBACK_ADMIN'), data: "feedbackAdminName$"},
                    {
                        title: $translate('FEEDBACK_TOPIC'),
                        data: "feedbackTopic$",
                        "className": 'expandFeedbackReport',
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$", sClass: "sumFloat"},
                    {
                        title: $translate("Platform Fee"), data: "totalPlatformFeeEstimate$",
                        render: function (data, type, row) {
                            data = data || 0;
                            let feeDetails = "";
                            if (row && row.platformFeeEstimate) {
                                for (let key in row.platformFeeEstimate) {
                                    if (feeDetails) {
                                        feeDetails += "\n";
                                    }
                                    feeDetails += (key + ": " + row.platformFeeEstimate[key].toFixed(2));
                                }
                            }
                            return $('<a data-toggle="tooltip" title=\'' + feeDetails + '\'  data-placement= "left"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text((data))
                                .prop('outerHTML');
                        } ,sClass: "sumFloat"
                    },
                    {
                        title: $translate("Online Top Up Fee"), data: "totalOnlineTopUpFee$",
                        render: function (data, type, row) {
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'data-toggle': 'tooltip',
                                'title': row.onlineTopUpFeeDetail$,
                                'data-placement': 'left',
                            }).text(data));
                            return link.prop('outerHTML');
                        },
                        "sClass": "sumFloat"
                    }
                ],
                "sScrollY": "80vh",
                "bScrollCollapse": true,
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            let sumData = {
                7: vm.feedbackDataSum.manualTopUpAmount,
                8: vm.feedbackDataSum.weChatTopUpAmount,
                9: vm.feedbackDataSum.aliPayTopUpAmount,
                10: vm.feedbackDataSum.onlineTopUpAmount,
                11: vm.feedbackDataSum.topUpTimes,
                12: vm.feedbackDataSum.topUpAmount,
                13: vm.feedbackDataSum.bonusTimes,
                14: vm.feedbackDataSum.bonusAmount,
                15: vm.feedbackDataSum.rewardAmount,
                16: vm.feedbackDataSum.consumptionReturnAmount,
                17: vm.feedbackDataSum.consumptionTimes,
                18: vm.feedbackDataSum.validConsumptionAmount,
                19: vm.feedbackDataSum.consumptionBonusAmount,
                20: vm.feedbackDataSum.profit,
                23: vm.feedbackDataSum.consumptionAmount,
                24: vm.feedbackDataSum.totalPlatformFeeEstimate.toFixed(2),
                25: vm.feedbackDataSum.totalOnlineTopUpFee.toFixed(2),
            };

            if(isExport){
                let playerTbl = utilService.createDatatableWithFooter('#feedbackReportExcelTable', tableOptions, sumData, false);

                $('#feedbackReportExcelTable_wrapper').hide();
                vm.exportToExcel('feedbackReportExcelTable', 'FEEDBACK_REPORT');
            }else{
                let playerTbl = utilService.createDatatableWithFooter('#feedbackReportTable', tableOptions, sumData, false);
                vm.feedbackQuery.pageObj.init({maxCount: allResultSize}, newSearch);
                utilService.setDataTablePageInput('feedbackReportTable', playerTbl, $translate);
                playerTbl.on( 'order.dt', function () {
                    playerTbl.column(0, {order:'applied'}).nodes().each( function (cell, i) {
                        cell.innerHTML = i+1;
                    } );
                } ).draw();

                $('#feedbackReportTable').resize();
                $('#feedbackReportTable tbody').off('click', 'td.expandPlayerReport');
                $('#feedbackReportTable tbody').on('click', 'td.expandPlayerReport', function () {
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
                                    vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.feedbackQuery);
                                }
                            )
                        }

                        tr.addClass('shown');
                    }
                });
                $('#feedbackReportTable tbody').off('click', 'td.expandFeedbackReport');
                $('#feedbackReportTable tbody').on('click', 'td.expandFeedbackReport', function () {
                    let tr = $(this).closest('tr');
                    let row = playerTbl.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        let data = row.data();
                        console.log('content', data);
                        let id = 'playertable' + data._id;
                        row.child(vm.createInnerTable(id)).show();

                        if (data.feedback) {
                            data.feedback.createTime$ = data.createTime$;
                            for(let x = 0; x < vm.allFeedbackResults.length; x++) {
                                if(vm.allFeedbackResults[x].key == data.feedback.result) {
                                    data.feedback.result$ = vm.allFeedbackResults[x].value;
                                    break;
                                }
                            }
                        }
                        vm.drawFeedbackTable(data, id, 1, newSearch, vm.feedbackQuery);

                        tr.addClass('shown');
                    }
                });
                $('#feedbackReportTable').off('order.dt');
                $('#feedbackReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'feedbackQuery', vm.drawFeedbackReport);
                });
            }
        };


        /////// player domain report
        vm.changePlayerDomainPlatform = function () {
            // Get Promote CS and way lists
            vm.pdAllPromoteWay = {};
            let query = {
                platformId: vm.playerDomain.platformList && vm.playerDomain.platformList.length > 0 ? {$in: vm.playerDomain.platformList} : {$in: vm.platformList.map(item => item._id)},
            };

            socketService.$socket($scope.AppSocket, 'getAllPromoteWay', query,
                data => {
                    $scope.$evalAsync(() => {
                        vm.pdAllPromoteWay = data.data;
                        endLoadMultipleSelect('.spicker');
                    });
                },
                function (err) {
                    console.log(err);
                });

            // Get Departments Detail
            socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.playerDomain.platformList && vm.playerDomain.platformList.length > 0 ? {$in: vm.playerDomain.platformList} : {$in: vm.platformList.map(item => item._id)}},
                data => {
                    $scope.$evalAsync(() => {
                        let parentId;
                        vm.pdQueryDepartments = [];
                        vm.pdQueryRoles = [];
                        vm.pdQueryAdmins = [];

                        vm.pdQueryDepartments.push({_id: '', departmentName: 'N/A'});

                        let selectedPlatform = [];
                        if (vm.playerDomain.platformList && vm.playerDomain.platformList.length > 0) {
                            vm.playerDomain.platformList.forEach(item => {
                                let index = vm.platformList.map(x => x && x._id).indexOf(item);

                                if (index > -1) {
                                    selectedPlatform.push(vm.platformList[index]);
                                }
                            })
                        } else {
                            selectedPlatform = vm.platformList
                        }

                        data.data.map(e => {

                            let index = selectedPlatform.map(x => x && x.name).indexOf(e && e.departmentName);

                            if (index > -1) {
                                vm.pdQueryDepartments.push(e);
                                parentId = e._id;

                                data.data.map(e => {
                                    if (String(parentId) == String(e.parent)) {
                                        vm.pdQueryDepartments.push(e);
                                    }
                                });
                            }
                        });



                        endLoadMultipleSelect('.spicker');
                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });
                }, error => {
                    vm.pdQueryDepartments = [];
                    vm.pdQueryRoles = [];
                    vm.pdQueryAdmins = [];
                }
            );
        };

        vm.searchPlayerDomainReport = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#playerDomainReportTableSpin').show();

            let admins = [];
            let csPromoteWay = [];

            if (vm.playerDomain) {
                if (vm.playerDomain.departments) {
                    if (vm.playerDomain.roles) {
                        vm.pdQueryRoles.map(e => {
                            if (e._id && (vm.playerDomain.roles.indexOf(e._id) >= 0)) {
                                e.users.map(f => admins.push(f._id))
                            }
                        })
                    } else {
                        vm.pdQueryRoles.map(e => e.users.map(f => admins.push(f._id)))
                    }
                }
            }

            utilService.getDataTablePageSize("#playerDomainReportTablePage", vm.playerDomain, 30);

            var sendquery = {
                //platform: vm.curPlatformId,
                platformList: vm.playerDomain.platformList && vm.playerDomain.platformList.length > 0 ? vm.playerDomain.platformList : vm.platformList.map(item => item._id),
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
                    endTime: vm.playerDomain.endTime.data('datetimepicker').getLocalDate(),
                    csPromoteWay: vm.playerDomain.csPromoteWay && vm.playerDomain.csPromoteWay.length > 0 ? vm.playerDomain.csPromoteWay : csPromoteWay,
                    csOfficer: vm.playerDomain.admins && vm.playerDomain.admins.length > 0 ? vm.playerDomain.admins : admins
                },
                index: isExport ? 0 : (newSearch ? 0 : (vm.playerDomain.index || 0)),
                limit: isExport ? 5000 : (vm.playerDomain.limit || 10),
                sortCol: vm.playerDomain.sortCol || {registrationTime: -1},
                isExport: isExport
            };
            console.log('player domain query', sendquery);

            socketService.$socket($scope.AppSocket, 'getPlayerDomainReport', sendquery, function (data) {
                findReportSearchTime();
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

                    // if (!item.sourceUrl) {
                    //     item.registrationAgent$ = "Backstage";
                    // }

                    if (item && item.guestDeviceId) {
                        if (item.partner) {
                            item.registrationAgent$ = "APP Agent";
                        }
                        else {
                            item.registrationAgent$ = "APP Player";
                        }
                    } else {
                        if (item.registrationInterface == vm.inputDevice.BACKSTAGE) {
                            item.registrationAgent$ = "Backstage";
                        }
                        else if (item.registrationBrowser$ && (item.registrationBrowser$.indexOf("WebKit") !== -1 || item.registrationBrowser$.indexOf("WebView") !== -1)) {
                            if (item.partner) {
                                // item.registrationAgent$ = "APP Agent";
                                item.registrationAgent$ = "HTML5 Agent";
                            }
                            else {
                                // item.registrationAgent$ = "APP Player";
                                item.registrationAgent$ = "HTML5 Player";
                            }
                        }
                        else if (item.registrationOS$ && (item.registrationOS$.indexOf("iOS") !== -1 || item.registrationOS$.indexOf("ndroid") !== -1 || item.registrationBrowser$.indexOf("obile") !== -1)) {
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

                    if (item && item.osType) {
                        item.registrationOS$ = item.osType;
                    }

                    return item;
                }), data.data.size, newSearch, isExport);
                $scope.safeApply();
            });
        }
        vm.drawPlayerDomainReport = function (tableData, size, newSearch, isExport) {
            let tableOptions = {
                data: tableData,
                "order": vm.playerDomain.aaSorting || [[2, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'platform.name', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'realName', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'registrationTime', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'phoneArea', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'ipArea', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'gameProviderPlayed', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'lastAccessTime', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'loginTimes', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'valueScore', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'csOfficer.adminName', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'promoteWay', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'sourceUrl', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'domain', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'registrationInterface', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'os', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'browser', 'aTargets': [17], bSortable: true},
                    {'sortCol': 'partner', 'aTargets': [18], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform.name"},
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
                    {title: $translate('REGISTRATION_ADMIN'), data: "csOfficer.adminName"},
                    {title: $translate('PROMOTE_WAY'), data: "promoteWay"},
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

            if(isExport){
                utilService.createDatatableWithFooter('#playerDomainReportExcelTable', tableOptions, {});

                $('#playerDomainReportExcelTable_wrapper').hide();
                vm.exportToExcel('playerDomainReportExcelTable', 'PLAYERDOMAIN_REPORT');
            }else{
                utilService.createDatatableWithFooter('#playerDomainReportTable', tableOptions, {});

                vm.playerDomain.pageObj.init({maxCount: size}, newSearch);

                $('#playerDomainReportTable').off('order.dt');
                $('#playerDomainReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'playerDomain', vm.searchPlayerDomainReport);
                });
            }
        }
        /////// player domain report end


        // player report
        vm.clearDatePicker = function (id) {
            utilService.clearDatePickerDate(id);
        };

        vm.searchFinancialReport = function () {
            vm.reportSearchTimeStart = new Date().getTime();
            $('#financialReportSpin').show();

            let sendData = {
                startTime: vm.financialReport.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.financialReport.endTime.data('datetimepicker').getLocalDate(),
                platform: vm.financialReport.platform,
                displayMethod: vm.financialReport.displayMethod
            };

            console.log('sendData', sendData);
            if (vm.financialReport && vm.financialReport.displayMethod && vm.financialReport.displayMethod == 'daily') {
                $('#sumFinancialReport').hide();
                socketService.$socket($scope.AppSocket, 'getFinancialReportByDay', sendData, function (data) {
                    findReportSearchTime();
                    console.log('getFinancialReportByDay', data);
                    $scope.$evalAsync(() => {
                        vm.dailyFinancialReportList = [];
                        vm.financialReportPlatformName = '';

                        vm.topUpHeader = [];
                        vm.bonusHeader = [];
                        vm.platformFeeHeader = [];

                        if (data && data.data) {
                            vm.dailyFinancialReportList = data && data.data && data.data.data && data.data.data.length > 0 ? data.data.data : [];
                            vm.financialReportPlatformName = data.data.platformName;

                            if(vm.dailyFinancialReportList && vm.dailyFinancialReportList.length > 0) {
                                vm.topUpHeader = vm.dailyFinancialReportList[0].topUpList;
                                vm.bonusHeader = vm.dailyFinancialReportList[0].bonusList;
                                vm.platformFeeHeader = vm.dailyFinancialReportList[0].platformFeeEstimate;
                            }
                        }
                    });
                    $('#financialReportSpin').hide();
                    $('#dailyFinancialReport').show();
                });
            } else if (vm.financialReport && vm.financialReport.displayMethod && vm.financialReport.displayMethod == 'sum') {
                $('#dailyFinancialReport').hide();
                socketService.$socket($scope.AppSocket, 'getFinancialReportBySum', sendData, function (data) {
                    findReportSearchTime();
                    console.log('getFinancialReportBySum', data);
                    $scope.$evalAsync(() => {
                        vm.sumFinancialReportList = data && data.data ? data.data : {};
                    });
                    $('#financialReportSpin').hide();
                    $('#sumFinancialReport').show();
                });
            }
        };

        vm.searchDeviceReport = function (newSearch, isExport = false) {
            if (!vm.deviceQuery || !vm.deviceQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#loadingDeviceReportTableSpin').show();

            utilService.getDataTablePageSize("#DeviceReportTablePage", vm.deviceQuery, 10000);
            let sendQuery = {
                platformId: vm.deviceQuery.platformId,
                query: {
                    playerLevel: vm.deviceQuery.level,
                    providerId: vm.deviceQuery.providerId,
                    start: vm.deviceQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.deviceQuery.end.data('datetimepicker').getLocalDate(),
                    name: vm.deviceQuery.name,
                    consumptionTimesOperator: vm.deviceQuery.consumptionTimesOperator,
                    consumptionTimesValue: vm.deviceQuery.consumptionTimesValue,
                    consumptionTimesValueTwo: vm.deviceQuery.consumptionTimesValueTwo,
                    profitAmountOperator: vm.deviceQuery.profitAmountOperator,
                    profitAmountValue: vm.deviceQuery.profitAmountValue,
                    profitAmountValueTwo: vm.deviceQuery.profitAmountValueTwo,
                    topUpTimesOperator: vm.deviceQuery.topUpTimesOperator,
                    topUpTimesValue: vm.deviceQuery.topUpTimesValue,
                    topUpTimesValueTwo: vm.deviceQuery.topUpTimesValueTwo,
                    bonusTimesOperator: vm.deviceQuery.bonusTimesOperator,
                    bonusTimesValue: vm.deviceQuery.bonusTimesValue,
                    bonusTimesValueTwo: vm.deviceQuery.bonusTimesValueTwo,
                    topUpAmountOperator: vm.deviceQuery.topUpAmountOperator,
                    topUpAmountValue: vm.deviceQuery.topUpAmountValue,
                    topUpAmountValueTwo: vm.deviceQuery.topUpAmountValueTwo,
                    csPromoteWay: vm.deviceQuery.csPromoteWay,
                },
                index: isExport ? 0 : (newSearch ? 0 : (vm.deviceQuery.index || 0)),
                limit: isExport ? 10000 : (vm.deviceQuery.limit || 10000),
                sortCol: vm.deviceQuery.sortCol || {validConsumptionAmount: -1},
                isExport: isExport
            };

            if (sendQuery && sendQuery.query && vm.deviceQuery.loginDevice && vm.deviceQuery.loginDevice.length && vm.loginDeviceList && vm.deviceQuery.loginDevice.length != Object.keys(vm.loginDeviceList).length){
                sendQuery.query.loginDevice = vm.deviceQuery.loginDevice;
            }
            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getDeviceReportFromSummary', sendQuery, function (data) {
                $scope.$evalAsync(() => {
                    console.log('test device report summary data', data);
                    findReportSearchTime();
                    vm.deviceQuery.totalCount = data.data.size;
                    $('#loadingDeviceReportTableSpin').hide();

                    vm.drawDeviceReport(data.data.data.map(item => {
                        item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                        item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                        item.registrationTime$ = utilService.$getTimeFromStdTimeFormat(item.registrationTime);
                        item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                        item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
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

                        if (item.onlineTopUpFeeDetail && item.onlineTopUpFeeDetail.length > 0) {
                            let detailArr = [];
                            item.onlineTopUpFeeDetail.forEach((detail, index) => {
                                if (detail && detail.merchantName && detail.hasOwnProperty('onlineToUpFee') && detail.hasOwnProperty('onlineTopUpServiceChargeRate')) {
                                    let orderNo = index ? index + 1 : 1;
                                    detailArr.push(orderNo + '. ' + detail.merchantName + ': ' + detail.amount + $translate("YEN") + ' * ' + parseFloat(detail.onlineTopUpServiceChargeRate * 100).toFixed(2) + '%');
                                }
                            });

                            item.onlineTopUpFeeDetail$ = detailArr && detailArr.length > 0 ? detailArr.join('\n') : '';
                        } else {
                            item.onlineTopUpFeeDetail$ = '';
                        }
                        item.totalOnlineTopUpFee$ = parseFloat(item.totalOnlineTopUpFee).toFixed(2);

                        if (item.hasOwnProperty("totalPlatformFeeEstimate")) {
                            item.totalPlatformFeeEstimate$ = item.totalPlatformFeeEstimate.toFixed(2);
                        }

                        return item;
                    }), data.data.total, data.data.size, newSearch, isExport);
                });
            });
        };

        vm.drawDeviceReport = function (data, total, size, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.deviceQuery.aaSorting || [[9, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [11], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('LEVEL'), data: "playerLevel$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", sClass: "expandDeviceReport sumText",
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes", sClass: 'sumInt alignRight'},
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('WITHDRAW_COUNT'), data: "bonusTimes", sClass: 'sumInt alignRight'},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: 'sumInt alignRight'},
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        data: "validConsumptionAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'),
                        data: "consumptionBonusAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$", sClass: 'sumFloat alignRight'},

                ],
                "sScrollY": "80vh",
                "bScrollCollapse": true,
                // "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            if (deviceTbl) {
                deviceTbl.clear();
            }

            if(isExport){
                var deviceTbl = utilService.createDatatableWithFooter('#deviceReportExcelTable', tableOptions, {
                    4: total.topUpTimes,
                    5: total.topUpAmount,
                    6: total.bonusTimes,
                    7: total.bonusAmount,
                    8: total.consumptionTimes,
                    9: total.validConsumptionAmount,
                    10: total.consumptionBonusAmount,
                    11: total.consumptionAmount,
                }, false, true);

                $('#deviceReportExcelTable_wrapper').hide();
                vm.exportToExcel('deviceReportExcelTable', 'DEVICE_REPORT')
            }else{
                var deviceTbl = utilService.createDatatableWithFooter('#deviceReportTable', tableOptions, {
                    4: total.topUpTimes,
                    5: total.topUpAmount,
                    6: total.bonusTimes,
                    7: total.bonusAmount,
                    8: total.consumptionTimes,
                    9: total.validConsumptionAmount,
                    10: total.consumptionBonusAmount,
                    11: total.consumptionAmount,
                }, false, true);
                utilService.setDataTablePageInput('deviceReportTable', deviceTbl, $translate);

                vm.deviceQuery.pageObj.init({maxCount: size}, newSearch);

                $('#deviceReportTable').resize();
                $('#deviceReportTable tbody').off('click', 'td.expandDeviceReport');
                $('#deviceReportTable tbody').on('click', 'td.expandDeviceReport', function () {
                    var tr = $(this).closest('tr');
                    var row = deviceTbl.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        var data = row.data();
                        console.log('content', data);
                        var id = 'devicetable' + data._id;
                        row.child(vm.createInnerTable(id)).show();
                        vm[id] = {};
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
                                    vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.deviceQuery);
                                }
                            )
                        }

                        tr.addClass('shown');
                    }
                });
                $('#deviceReportTable').off('order.dt');
                $('#deviceReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'deviceQuery', vm.searchDeviceReport);
                });
            }
        };

        vm.reCalculateDeviceReportSummary = function (){
            if (!vm.deviceQuery || !vm.deviceQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            $('#loadingDeviceReportTableSpin').show();
            let sendquery = {
                platformId: vm.deviceQuery.platformId,
                start: vm.deviceQuery.start.data('datetimepicker').getLocalDate(),
                end: vm.deviceQuery.end.data('datetimepicker').getLocalDate()
            };

            if (vm.deviceQuery.name) {
                sendquery.name = vm.deviceQuery.name;
            }

            socketService.$socket($scope.AppSocket, 'reCalculateDeviceReportSummary', sendquery, function (data) {
                $('#loadingDeviceReportTableSpin').hide();
            });
        };

        vm.searchPlayerReport = function (newSearch, isExport = false) {
            if (!vm.playerQuery || !vm.playerQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#loadingPlayerReportTableSpin').show();

            let admins = [];
            let adminIds = [];

            if (vm.playerQuery.departments) {
                if (vm.playerQuery.roles) {
                    vm.queryRoles.map(e => {
                        if (e._id && (vm.playerQuery.roles.indexOf(e._id) >= 0)) {
                            e.users.map(f => {
                                admins.push(f.adminName);
                                adminIds.push(f._id);
                            })
                        }
                    })
                } else {
                    vm.queryRoles.map(e => {
                        if (e && e._id != "" && e.users && e.users.length) {
                            e.users.map(f => {
                                admins.push(f.adminName);
                                adminIds.push(f._id);
                            });
                        }
                    });
                }
            }

            utilService.getDataTablePageSize("#playerReportTablePage", vm.playerQuery, 10000);
            var sendquery = {
                platformId: vm.playerQuery.platformId,
                query: {
                    credibilityRemarks: vm.playerQuery.credibilityRemarks,
                    playerLevel: vm.playerQuery.level,
                    providerId: vm.playerQuery.providerId,
                    start: vm.playerQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.playerQuery.end.data('datetimepicker').getLocalDate(),
                    name: vm.playerQuery.name,
                    valueScoreOperator: vm.playerQuery.valueScoreOperator,
                    playerScoreValue: vm.playerQuery.playerScoreValue,
                    playerScoreValueTwo: vm.playerQuery.playerScoreValueTwo,
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
                    topUpAmountValueTwo: vm.playerQuery.topUpAmountValueTwo,
                    csPromoteWay: vm.playerQuery.csPromoteWay,
                    admins: vm.playerQuery.admins && vm.playerQuery.admins.length > 0 ? vm.playerQuery.admins : admins,
                    adminIds: vm.playerQuery.admins && vm.playerQuery.admins.length > 0
                                ? vm.playerQuery.admins.map(adm => vm.queryAdmins.find(e => e.adminName === adm)._id)
                                : adminIds
                },
                index: isExport ? 0 : (newSearch ? 0 : (vm.playerQuery.index || 0)),
                limit: isExport ? 10000 : (vm.playerQuery.limit || 10000),
                sortCol: vm.playerQuery.sortCol || {validConsumptionAmount: -1},
                isExport: isExport
            };
            console.log('sendquery', sendquery);

            socketService.$socket($scope.AppSocket, 'getPlayerReportFromSummary', sendquery, function (data) {
                $scope.$evalAsync(() => {
                    console.log('test player report summary data', data);
                    findReportSearchTime();
                    vm.playerQuery.totalCount = data.data.size;
                    $('#loadingPlayerReportTableSpin').hide();
                    // get game data.then(
                    // map
                    vm.drawPlayerReport(data.data.data.map(item => {
                        item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
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
                        item.registrationAgent$ = item.csOfficer || null;

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
                                if (item.credibilityRemarks[i]) {
                                    for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                        if (vm.credibilityRemarks[j] && vm.credibilityRemarks[j]._id && item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
                                            item.credibility$ += vm.credibilityRemarks[j].name + "<br>";
                                        }
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

                        if (item.onlineTopUpFeeDetail && item.onlineTopUpFeeDetail.length > 0) {
                            let detailArr = [];
                            item.onlineTopUpFeeDetail.forEach((detail, index) => {
                                if (detail && detail.merchantName && detail.hasOwnProperty('onlineToUpFee') && detail.hasOwnProperty('onlineTopUpServiceChargeRate')) {
                                    let orderNo = index ? index + 1 : 1;
                                    detailArr.push(orderNo + '. ' + detail.merchantName + ': ' + detail.amount + $translate("YEN") + ' * ' + parseFloat(detail.onlineTopUpServiceChargeRate * 100).toFixed(2) + '%');
                                }
                            });

                            item.onlineTopUpFeeDetail$ = detailArr && detailArr.length > 0 ? detailArr.join('\n') : '';
                        } else {
                            item.onlineTopUpFeeDetail$ = '';
                        }
                        item.totalOnlineTopUpFee$ = parseFloat(item.totalOnlineTopUpFee).toFixed(2);

                        if (item.hasOwnProperty("totalPlatformFeeEstimate")) {
                            item.totalPlatformFeeEstimate$ = item.totalPlatformFeeEstimate.toFixed(2);
                        }

                        return item;
                    }), data.data.total, data.data.size, newSearch, isExport);
                });
            });
        };

        vm.reCalculatePlayerReportSummary = function (){
            if (!vm.playerQuery || !vm.playerQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            $('#loadingPlayerReportTableSpin').show();
            var sendquery = {
                platformId: vm.playerQuery.platformId,
                start: vm.playerQuery.start.data('datetimepicker').getLocalDate(),
                end: vm.playerQuery.end.data('datetimepicker').getLocalDate()
            };

            if (vm.playerQuery.name) {
                sendquery.name = vm.playerQuery.name;
            }

            socketService.$socket($scope.AppSocket, 'reCalculatePlayerReportSummary', sendquery, function (data) {
                $('#loadingPlayerReportTableSpin').hide();
            });
        };

        vm.drawPlayerReport = function (data, total, size, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.playerQuery.aaSorting || [[17, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'valueScore', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [3], bSortable: true},
                    // {'sortCol': 'credibilityRemarks', 'aTargets': [2], bSortable: true},
                    // {'sortCol': 'provider', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'manualTopUpAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'weChatTopUpAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'aliPayTopUpAmount', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'onlineTopUpAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [17], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [18], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [20], bSortable: true},
                    {'sortCol': 'totalPlatformFeeEstimate', 'aTargets': [22], bSortable: true},
                    {'sortCol': 'totalOnlineTopUpFee', 'aTargets': [23], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('PlayerValue'), data: "valueScore"},
                    {title: $translate('LEVEL'), data: "playerLevel$"},
                    {title: $translate('CREDIBILITY'), data: "credibility$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", sClass: "expandPlayerReport sumText",
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('TOPUPMANUAL'), data: "manualTopUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('TOPUP_WECHAT'), data: "weChatTopUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('PlayerAlipayTopUp'), data: "aliPayTopUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('TOPUPONLINE'), data: "onlineTopUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes", sClass: 'sumInt alignRight'},
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('WITHDRAW_COUNT'), data: "bonusTimes", sClass: 'sumInt alignRight'},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('PROMOTION'), data: "rewardAmount$", sClass: 'sumFloat alignRight'},
                    {
                        title: $translate('CONSUMPTION_RETURN_AMOUNT'),
                        data: "consumptionReturnAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: 'sumInt alignRight'},
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        data: "validConsumptionAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'),
                        data: "consumptionBonusAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {title: $translate('COMPANY_PROFIT'), data: "profit$", sClass: 'playerReportProfit alignRight'},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('Registration Agent'), data: "registrationAgent$"},
                    {
                        title: $translate("Platform Fee"), data: "totalPlatformFeeEstimate$",
                        render: function (data, type, row) {
                            data = data || 0;
                            let feeDetails = "";
                            if (row && row.platformFeeEstimate) {
                                for (let key in row.platformFeeEstimate) {
                                    if (feeDetails) {
                                        feeDetails += "\n";
                                    }
                                    feeDetails += (key + ": " + row.platformFeeEstimate[key].toFixed(2));
                                }
                            }
                            return $('<a data-toggle="tooltip" title=\'' + feeDetails + '\'  data-placement= "left"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text((data))
                                .prop('outerHTML');
                        }, sClass: 'sumFloat alignRight'
                    },
                    {
                        title: $translate("Online Top Up Fee"), data: "totalOnlineTopUpFee$",
                        render: function (data, type, row) {
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'data-toggle': 'tooltip',
                                'title': row.onlineTopUpFeeDetail$,
                                'data-placement': 'left',
                            }).text(data));
                            return link.prop('outerHTML');
                        }, sClass: 'sumFloat alignRight'
                    }
                ],
                "sScrollY": "80vh",
                "bScrollCollapse": true,
                // "paging": false,
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

            if(isExport){
                var playerTbl = utilService.createDatatableWithFooter('#playerReportExcelTable', tableOptions, {
                    6: total.manualTopUpAmount,
                    7: total.weChatTopUpAmount,
                    8: total.aliPayTopUpAmount,
                    9: total.onlineTopUpAmount,
                    10: total.topUpTimes,
                    11: total.topUpAmount,
                    12: total.bonusTimes,
                    13: total.bonusAmount,
                    14: total.rewardAmount,
                    15: total.consumptionReturnAmount,
                    16: total.consumptionTimes,
                    17: total.validConsumptionAmount,
                    18: total.consumptionBonusAmount,
                    19: total.profit,
                    20: total.consumptionAmount,
                    22: total.totalPlatformFeeEstimate.toFixed(2),
                    23: total.totalOnlineTopUpFee.toFixed(2)
                }, false, true);

                $('#playerReportExcelTable_wrapper').hide();
                vm.exportToExcel('playerReportExcelTable', 'PLAYER_REPORT')
            }else{
                var playerTbl = utilService.createDatatableWithFooter('#playerReportTable', tableOptions, {
                    6: total.manualTopUpAmount,
                    7: total.weChatTopUpAmount,
                    8: total.aliPayTopUpAmount,
                    9: total.onlineTopUpAmount,
                    10: total.topUpTimes,
                    11: total.topUpAmount,
                    12: total.bonusTimes,
                    13: total.bonusAmount,
                    14: total.rewardAmount,
                    15: total.consumptionReturnAmount,
                    16: total.consumptionTimes,
                    17: total.validConsumptionAmount,
                    18: total.consumptionBonusAmount,
                    19: total.profit,
                    20: total.consumptionAmount,
                    22: total.totalPlatformFeeEstimate.toFixed(2),
                    23: total.totalOnlineTopUpFee.toFixed(2)
                }, false, true);
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
            }

        };

        vm.exportProposalReportToCSV = function (reportData, reportTitle, showLabel){
            let reportDataToExport = [];
            if(reportData && reportData.length){
                reportData.forEach(
                    data => {
                        let reportObj = {};

                        if(data){
                            let inputDevice;
                            let proposalSubType;
                            let involvedAcc = "";

                            for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data.inputDevice) {
                                    inputDevice = $translate(Object.keys(vm.inputDevice)[i]);
                                }
                            }

                            if (data && data.data && data.data.PROMO_CODE_TYPE) {
                                proposalSubType = data.data.PROMO_CODE_TYPE;
                            } else if (data && data.data && data.data.eventName) {
                                proposalSubType = data.data.eventName;
                            } else {
                                proposalSubType = data.typeName;
                            }


                            if (data.hasOwnProperty('creator') && data.creator.type == 'player') {
                                involvedAcc = data.creator.name;
                            }
                            if (data && data.data && data.data.playerName) {
                                involvedAcc = data.data.playerName;
                            }
                            else if (data && data.data && data.data.partnerName) {
                                involvedAcc = data.data.partnerName;
                            }

                            reportObj[$translate("PROPOSAL ID")] = data.proposalId;
                            reportObj[$translate("CREATOR")] = data.creator && data.creator.name || "";
                            reportObj[$translate("INPUT_DEVICE")] = inputDevice;
                            reportObj[$translate("PROPOSAL TYPE")] = data.mainType$;
                            reportObj[$translate("PROPOSAL_SUB_TYPE")] = proposalSubType;
                            reportObj[$translate("Proposal Status")] = data.status$;
                            reportObj[$translate("INVOLVED_ACC")] = involvedAcc;
                            reportObj[$translate("Amount Involved")] = data.involveAmount$;
                            reportObj[$translate("START_TIME")] = data.createTime$;
                            reportObj[$translate("Player Level")] = data.data.proposalPlayerLevel;
                            reportObj[$translate("REMARKS")] = data.remark$ || "";

                            reportDataToExport.push(reportObj);
                        }
                    }
                )
            }

            vm.exportJsonToCSV(reportDataToExport, reportTitle, true);
        };

        ///////////////// START player deposit analysis report /////////////////////////////
        vm.searchPlayerDepositAnalysisReport = function (newSearch) {

            if (!vm.depositAnalysisQuery || !vm.depositAnalysisQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#loadingPlayerDepositAnalysisReportTableSpin').show();
            let sendQuery = {
                platformId: vm.depositAnalysisQuery.platformId,
                query: {
                    name: vm.depositAnalysisQuery.name,
                    credibilityRemarks: vm.depositAnalysisQuery.credibilityRemarks,
                    valueScoreOperator: vm.depositAnalysisQuery.valueScoreOperator,
                    playerScoreValue: vm.depositAnalysisQuery.playerScoreValue,
                    playerScoreValueTwo: vm.depositAnalysisQuery.playerScoreValueTwo,
                    playerLevel: vm.depositAnalysisQuery.level,
                    providerId: vm.depositAnalysisQuery.providerId,
                    start: vm.depositAnalysisQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.depositAnalysisQuery.end.data('datetimepicker').getLocalDate(),
                    dailyTotalDeposit: vm.depositAnalysisQuery.dailyTotalDeposit,
                    numberOfDays: vm.depositAnalysisQuery.numberOfDays,
                },
                index: newSearch ? 0 : (vm.depositAnalysisQuery.index || 0),
                limit: vm.depositAnalysisQuery.limit || 5000,
                sortCol: vm.depositAnalysisQuery.sortCol || {},
            };
            console.log('sendQuery', sendQuery);
            socketService.$socket($scope.AppSocket, 'getPlayerDepositAnalysisReport', sendQuery, function (data) {
                $scope.$evalAsync(() => {
                    findReportSearchTime();
                    console.log('retData', data);
                    vm.playerDepositAnalysis = data.data.outputData;
                    vm.playerDepositAnalysisDays = data.data.days;
                    vm.depositAnalysisQuery.totalCount = data.data.size;
                    $('#loadingPlayerDepositAnalysisReportTableSpin').hide();

                    let drawData = data.data.data.map(item => {
                        let breakLine = ", ";
                        item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                        item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                        item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                        item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                        item.totalPlayerDepositAmount$ = parseFloat(item.totalPlayerDepositAmount).toFixed(2);

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
                                    if (item.credibilityRemarks[i] && vm.credibilityRemarks[j] && vm.credibilityRemarks[j]._id && item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
                                        item.credibility$ += vm.credibilityRemarks[j].name + breakLine;
                                    }
                                }
                            }
                        }

                        // remove the last comma and any whitespace after it
                        item.credibility$ = item.credibility$ ? item.credibility$.replace(/,\s*$/, "") : "--";

                        item.providerArr = [];
                        for (let key in item.providerDetail) {
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
                                    if (item.providerArr[i].providerId.toString() === vm.allProviders[j]._id.toString()) {
                                        item.providerArr[i].name = vm.allProviders[j].name;
                                        item.provider$ += vm.allProviders[j].name + breakLine;
                                    }
                                }
                            }
                        }

                        // remove the last comma and any whitespace after it
                        item.provider$ = item.provider$ ? item.provider$.replace(/,\s*$/, "") : "--";

                        return item;
                    });

                    vm.playerDepositAnalysis.forEach(day => {
                        day.playerData.forEach(player => {
                            drawData.forEach(data => {
                                if (player._id.toString() === data._id.toString()) {
                                    player.platform$ = data.platform$;
                                    player.credibility$ = data.credibility$;
                                    player.playerLevel$ = data.playerLevel$;
                                    player.provider$ = data.provider$;
                                    player.lastAccessTime$ = data.lastAccessTime$;
                                    player.topUpAmount$ = data.topUpAmount$;
                                    player.bonusAmount$ = data.bonusAmount$;
                                    player.totalPlayerDepositAmount$ = data.totalPlayerDepositAmount$;
                                }
                            });
                            return player;
                        });
                        return day;
                    });

                    // filter out days without player data, will not show empty table
                    let tempFilter = vm.playerDepositAnalysis.filter(day => {
                        return day.size !== 0;
                    });
                    vm.playerDepositAnalysis = tempFilter;

                    // vm.drawPlayerDepositAnalysisReport(drawData, data.data.total, data.data.size, newSearch);
                });
            });
        };

        vm.drawPlayerDepositAnalysisReport = function (data, total, size, newSearch) {
            var tableOptions = {
                data: data,
                "order": vm.depositAnalysisQuery.aaSorting || [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'realName', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'valueScore', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'credibilityRemarks', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'provider', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'lastAccessTime', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'totalPlayerDepositAmount', 'aTargets': [9], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('realName'), data: "realName", sClass: "realNameCell wordWrap"},
                    {title: $translate('PlayerValue'), data: "valueScore"},
                    {title: $translate('CREDIBILITY'), data: "credibility$"},
                    {title: $translate('LEVEL'), data: "playerLevel$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", sClass: "expandPlayerReport sumText",
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('LAST_ACCESS_TIME'), data: "lastAccessTime$"},
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('TOTAL_DEPOSIT_AMOUNT'), data: "totalPlayerDepositAmount$", sClass: 'sumFloat alignRight'},
                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            if (playerTbl) {
                playerTbl.clear();
            }
            var playerTbl = utilService.createDatatableWithFooter('#playerDepositAnalysisReportTable', tableOptions, {
                7: total.topUpAmount,
                8: total.bonusAmount,
                9: total.totalPlayerDepositAmount
            });
            utilService.setDataTablePageInput('playerDepositAnalysisReportTable', playerTbl, $translate);

            vm.depositAnalysisQuery.pageObj.init({maxCount: size}, newSearch);

            $('#playerDepositAnalysisReportTable').resize();
            $('#playerDepositAnalysisReportTable tbody').off('click', 'td.expandPlayerReport');
            $('#playerDepositAnalysisReportTable tbody').on('click', 'td.expandPlayerReport', function () {
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
                                        if (data.gameDetail[i].gameId.toString() === vm.allGame[j]._id.toString()) {
                                            data.gameDetail[i].name = vm.allGame[j].name;
                                        }
                                    }
                                }
                                vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.depositAnalysisQuery);
                            }
                        )
                    }

                    tr.addClass('shown');
                }
            });
            $('#playerDepositAnalysisReportTable').off('order.dt');
            $('#playerDepositAnalysisReportTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'depositAnalysisQuery', vm.searchPlayerDepositAnalysisReport);
            });
        };

        vm.getPlayerDepositAnalysisDetails = function (playerObjId) {
            let sendQuery = {
                platformId: vm.depositAnalysisQuery.platformId,
                query: {
                    playerObjId: playerObjId,
                    start: vm.depositAnalysisQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.depositAnalysisQuery.end.data('datetimepicker').getLocalDate(),
                    dailyTotalDeposit: vm.depositAnalysisQuery.dailyTotalDeposit,
                }
            };
            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getPlayerDepositAnalysisDetails', sendQuery, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerDepositAnalysisDetails = data.data;
                    vm.playerDepositAnalysisDetails.outputData.map(dailyData => {
                        dailyData.date = String(utilService.$getTimeFromStdTimeFormat(new Date(dailyData.date))).substring(0, 10);
                    });
                    $('#modalPlayerDepositAnalysisDetailsTable').modal().show();
                });
            });
        };

        vm.addPlayerToDepositTrackingReport = function (playerObjId) {
            let sendQuery = {
                platformObjId: vm.depositAnalysisQuery.platformId,
                playerObjId: playerObjId
            };
            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'addPlayerToDepositTrackingReport', sendQuery, function (data) {
                $scope.$evalAsync(() => {
                    vm.searchPlayerDepositAnalysisReport();
                });
            });
        };
        ///////////////// END player deposit analysis report /////////////////////////////

        ///////////////// START player deposit tracking report /////////////////////////////
        vm.searchPlayerDepositTrackingReport = function (newSearch) {
            if (!vm.depositTrackingQuery || !vm.depositTrackingQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#loadingPlayerDepositTrackingReportTableSpin').show();
            let sendQuery = {
                platformId: vm.depositTrackingQuery.platformId,
                query: {
                    name: vm.depositTrackingQuery.name,
                    credibilityRemarks: vm.depositTrackingQuery.credibilityRemarks,
                    depositTrackingGroup: vm.depositTrackingQuery.depositTrackingGroup,
                },
                index: newSearch ? 0 : (vm.depositTrackingQuery.index || 0),
                limit: vm.depositTrackingQuery.limit || 5000,
                sortCol: vm.depositTrackingQuery.sortCol || {},
                loginStartTime: vm.depositTrackingQuery.loginStartTime.data('datetimepicker').getLocalDate(),
                loginEndTime: vm.depositTrackingQuery.loginEndTime.data('datetimepicker').getLocalDate(),
            };
            console.log('sendQuery', sendQuery);
            socketService.$socket($scope.AppSocket, 'getPlayerDepositTrackingReport', sendQuery, function (data) {
                $scope.$evalAsync(() => {
                    findReportSearchTime();
                    console.log('retData', data);
                    vm.playerDepositTracking = data.data.data;
                    $('#loadingPlayerDepositTrackingReportTableSpin').hide();

                    let drawData = data.data.data.map(item => {
                        let breakLine = ", ";
                        item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                        item.lastAccessTime$ = utilService.$getTimeFromStdTimeFormat(item.lastAccessTime);
                        item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                        item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                        item.totalPlayerDepositAmount$ = parseFloat(item.totalPlayerDepositAmount).toFixed(2);
                        item.validConsumptionAmount$ = parseFloat(item.validConsumptionAmount).toFixed(2);
                        item.noDeposit = item.noDeposit || item.noDeposit === 0 ? item.noDeposit : "--";
                        item.noWithdrawal = item.noWithdrawal || item.noWithdrawal === 0 ? item.noWithdrawal : "--";
                        item.noConsumption = item.noConsumption || item.noConsumption === 0 ? item.noConsumption : "--";
                        item.depositTrackingGroupName = item.depositTrackingGroupName ? item.depositTrackingGroupName : "--";

                        // promo code type 1, type 2, type 3
                        item.promoCodeType1Total = item.promoCodeType1Total ? item.promoCodeType1Total : 0;
                        item.promoCodeType1Accepted = item.promoCodeType1Accepted ? item.promoCodeType1Accepted : 0;
                        item.promoCodeType2Total = item.promoCodeType2Total ? item.promoCodeType2Total : 0;
                        item.promoCodeType2Accepted = item.promoCodeType2Accepted ? item.promoCodeType2Accepted : 0;
                        item.promoCodeType3Total = item.promoCodeType3Total ? item.promoCodeType3Total : 0;
                        item.promoCodeType3Accepted = item.promoCodeType3Accepted ? item.promoCodeType3Accepted : 0;

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
                                    if (item.credibilityRemarks[i] && vm.credibilityRemarks[j] && vm.credibilityRemarks[j]._id && item.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
                                        item.credibility$ += vm.credibilityRemarks[j].name + breakLine;
                                    }
                                }
                            }
                        }

                        // remove the last comma and any whitespace after it
                        item.credibility$ = item.credibility$ ? item.credibility$.replace(/,\s*$/, "") : "--";

                        item.providerArr = [];
                        for (let key in item.providerDetail) {
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
                                    if (item.providerArr[i].providerId.toString() === vm.allProviders[j]._id.toString()) {
                                        item.providerArr[i].name = vm.allProviders[j].name;
                                        item.provider$ += vm.allProviders[j].name + breakLine;
                                    }
                                }
                            }
                        }

                        // remove the last comma and any whitespace after it
                        item.provider$ = item.provider$ ? item.provider$.replace(/,\s*$/, "") : "--";

                        return item;
                    });

                    vm.playerDepositTracking.forEach(player => {
                        drawData.forEach(data => {
                            if (player._id.toString() === data._id.toString()) {
                                player.credibility$ = data.credibility$;
                                player.playerLevel$ = data.playerLevel$;
                                player.provider$ = data.provider$;
                                player.lastAccessTime$ = data.lastAccessTime$;
                                player.topUpAmount$ = data.topUpAmount$;
                                player.bonusAmount$ = data.bonusAmount$;
                                player.totalPlayerDepositAmount$ = data.totalPlayerDepositAmount$;
                                player.validConsumptionAmount$ = data.validConsumptionAmount$;
                                player.promoCodeType1Total = data.promoCodeType1Total;
                                player.promoCodeType1Accepted = data.promoCodeType1Accepted;
                                player.promoCodeType2Total = data.promoCodeType2Total;
                                player.promoCodeType2Accepted = data.promoCodeType2Accepted;
                                player.promoCodeType3Total = data.promoCodeType3Total;
                                player.promoCodeType3Accepted = data.promoCodeType3Accepted;
                            }
                        });
                        return player;
                    });

                    // vm.drawPlayerDepositTrackingReport(drawData, data.data.total, data.data.size, newSearch);
                });
            });
        };

        vm.initDepositTrackingGroup = function () {
            vm.editDepositTrackingGroup = false;
            vm.modifyDepositTrackingGroup = false;
            vm.newDepositTrackingGroup = [];
            vm.selectedDepositTrackingGroup = '';
        };

        vm.newRowDepositTrackingGroup = (newDepositTrackingGroup) => {
            newDepositTrackingGroup.push({name: "", remark: ""});
        };

        vm.saveDepositTrackingGroup = function (isDelete, index) {
            if (isDelete) {
                let deleteData = {
                    platformObjId: vm.depositTrackingQuery.platformId,
                    trackingGroupObjId: index
                };

                socketService.$socket($scope.AppSocket, 'deleteDepositTrackingGroup', deleteData, function (data) {
                    $scope.$evalAsync(() => {
                        setTimeout(function () {
                            $('#selectTrackingGroupDepositTracking').multipleSelect('refresh');
                        }, 500);
                        vm.playerDepositTracking = {}; // reset report table become blank
                        vm.depositTrackingQuery = {platformId: vm.depositTrackingQuery.platformId};
                        vm.getDepositTrackingGroupByPlatformId(vm.depositTrackingQuery.platformId);
                        // vm.searchPlayerDepositTrackingReport();
                    });
                });
            } else {
                let addData = {
                    platformObjId: vm.depositTrackingQuery.platformId,
                    groupData: vm.newDepositTrackingGroup,
                    modifyData: vm.depositTrackingGroup
                };

                socketService.$socket($scope.AppSocket, 'addDepositTrackingGroup', addData, function (data) {
                    $scope.$evalAsync(() => {
                        setTimeout(function () {
                            $('#selectTrackingGroupDepositTracking').multipleSelect('refresh');
                        }, 500);
                        vm.playerDepositTracking = {}; // reset report table become blank
                        vm.depositTrackingQuery = {platformId: vm.depositTrackingQuery.platformId};
                        vm.getDepositTrackingGroupByPlatformId(vm.depositTrackingQuery.platformId);
                        // vm.searchPlayerDepositTrackingReport();
                        vm.newDepositTrackingGroup = [];
                    });
                });
            }
        };

        vm.modifyPlayerDepositTrackingGroup = function (playerId, trackingGroup) {
            let platform = vm.showPageName == "PLAYER_DEPOSIT_ANALYSIS_REPORT" ? vm.depositAnalysisQuery.platformId : vm.depositTrackingQuery.platformId;
            let sendData = {
                platform: platform,
                playerId: playerId,
                trackingGroup: trackingGroup
            };

            socketService.$socket($scope.AppSocket, 'modifyPlayerDepositTrackingGroup', sendData, function (data) {
                $scope.$evalAsync(() => {
                    if (data.success && data.data) {
                        vm.modifyDepositTrackingGroupResult = 'SUCCESS';
                        if(vm.showPageName == "PLAYER_DEPOSIT_TRACKING_REPORT") {
                            vm.searchPlayerDepositTrackingReport();
                        }
                        vm.selectedDepositTrackingGroup = '';
                    } else {
                        vm.modifyDepositTrackingGroupResult = 'FAIL';
                    }
                });
            });
        };

        vm.removePlayerFromDepositTrackingReport = function (playerId) {
            let sendData = {
                platform: vm.depositTrackingQuery.platformId,
                playerId: playerId

            };

            socketService.$socket($scope.AppSocket, 'removePlayerFromDepositTrackingReport', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.searchPlayerDepositTrackingReport();
                });
            });
        };

        vm.getPlayerDepositTrackingMonthlyDetails = function(playerId) {
            //new block here
            let startTime = vm.depositTrackingQuery.loginStartTime.data('datetimepicker').getLocalDate();
            let endTime = vm.depositTrackingQuery.loginEndTime.data('datetimepicker').getLocalDate();
            //new block here

            let sendData = {
                platform: vm.depositTrackingQuery.platformId,
                playerId: playerId,
                //new block
                startTime: startTime,
                endTime: endTime
            };

            socketService.$socket($scope.AppSocket, 'getPlayerDepositTrackingMonthlyDetails', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.depositTrackingMonthlyDetails = data.data;
                    vm.depositTrackingMonthlyDetails.outputData.map(monthlyData => {
                        monthlyData.date = String(utilService.$getTimeFromStdTimeFormat(new Date(monthlyData.date))).substring(0, 7);
                    });
                });
            });
        };

        vm.getPlayerDepositTrackingDailyDetails = function(date) {
            let sendData = {
                platform: vm.depositTrackingQuery.platformId,
                playerId: vm.depositTrackingMonthlyDetails.playerId,
                date: date
            };

            socketService.$socket($scope.AppSocket, 'getPlayerDepositTrackingDailyDetails', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.depositTrackingDailyDetails = data.data;
                    vm.depositTrackingDailyDetails.outputData.map(dailyData => {
                        dailyData.date = String(utilService.$getTimeFromStdTimeFormat(new Date(dailyData.date))).substring(0, 10);
                    });
                });
            });
        };
        ///////////////// END player deposit tracking report /////////////////////////////



        ///////////////// Begin Telemarketing Tracking Report ////////////////////////////
        vm.searchDXTrackingReport = function (newSearch, isExport = false) {
            if (!vm.dxTrackingQuery || !vm.dxTrackingQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#dxTrackingReportTableSpin').show();

            let admins = [];
            let adminIds = [];

            if (vm.dxTrackingQuery.departments) {
                if (vm.dxTrackingQuery.roles) {
                    vm.queryRoles.map(e => {
                        if (e._id && (vm.dxTrackingQuery.roles.indexOf(e._id) >= 0)) {
                            e.users.map(f => {
                                admins.push(f.adminName);
                                adminIds.push(f._id);
                            })
                        }
                    })
                } else {
                    vm.queryRoles.map(e => {
                        if (e && e._id != "" && e.users && e.users.length) {
                            e.users.map(f => {
                                admins.push(f.adminName);
                                adminIds.push(f._id);
                            });
                        }
                    });
                }
            }

            let sendQuery = {
                platformId: vm.dxTrackingQuery.platformId,
                query: {
                    name: vm.dxTrackingQuery.name,
                    credibilityRemarks: vm.dxTrackingQuery.credibilityRemarks,
                    start: vm.dxTrackingQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.dxTrackingQuery.end.data('datetimepicker').getLocalDate(),
                    queryStart: vm.dxTrackingQuery.queryStart.data('datetimepicker').getLocalDate(),
                    queryEnd: vm.dxTrackingQuery.queryEnd.data('datetimepicker').getLocalDate(),
                    consumptionTimesOperator: vm.dxTrackingQuery.consumptionTimesOperator,
                    consumptionTimesValue: vm.dxTrackingQuery.consumptionTimesValue,
                    consumptionTimesValueTwo: vm.dxTrackingQuery.consumptionTimesValueTwo,
                    topUpTimesOperator: vm.dxTrackingQuery.topUpTimesOperator,
                    topUpTimesValue: vm.dxTrackingQuery.topUpTimesValue,
                    topUpTimesValueTwo: vm.dxTrackingQuery.topUpTimesValueTwo,
                    bonusTimesOperator: vm.dxTrackingQuery.bonusTimesOperator,
                    bonusTimesValue: vm.dxTrackingQuery.bonusTimesValue,
                    bonusTimesValueTwo: vm.dxTrackingQuery.bonusTimesValueTwo,
                    topUpAmountOperator: vm.dxTrackingQuery.topUpAmountOperator,
                    topUpAmountValue: vm.dxTrackingQuery.topUpAmountValue,
                    topUpAmountValueTwo: vm.dxTrackingQuery.topUpAmountValueTwo,
                    providerId: vm.dxTrackingQuery.providerId,
                    admins: vm.dxTrackingQuery.admins && vm.dxTrackingQuery.admins.length > 0 ? vm.dxTrackingQuery.admins : admins,
                    adminIds: vm.dxTrackingQuery.admins && vm.dxTrackingQuery.admins.length > 0
                        ? vm.dxTrackingQuery.admins.map(adm => vm.queryAdmins.find(e => e.adminName === adm)._id)
                        : adminIds,
                    registrationDevice: vm.dxTrackingQuery.registrationDevice
                }
            };

            console.log('sendQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getDXTrackingReport', sendQuery, function (data) {
                findReportSearchTime();
                console.log('getDXTrackingReport', data);
                vm.dxTrackingQuery.totalCount = data.data.size;
                $('#dxTrackingReportTableSpin').hide();

                vm.drawDXTrackingReport(data.data.data.map(item => {
                    item.name = item.playerInfo.name;
                    item.valueScore = item.playerInfo.valueScore;
                    item.topUpAmount$ = isNaN(item.topUpAmount) ? 0 : parseFloat(item.topUpAmount).toFixed(2);
                    item.bonusAmount$ = isNaN(item.bonusAmount) ? 0 : parseFloat(item.bonusAmount).toFixed(2);
                    item.validConsumptionAmount$ = isNaN(item.consumptionAmount) ? 0 : parseFloat(item.consumptionAmount).toFixed(2);
                    item.topUpTimes = isNaN(item.topUpCount) ? 0 : item.topUpCount;
                    item.consumptionTimes = isNaN(item.consumptionCount) ? 0 : item.consumptionCount;

                    item.credibility$ = "";
                    if(item.playerInfo && item.playerInfo.credibilityRemarks && item.playerInfo.credibilityRemarks.length){
                        item.playerInfo.credibilityRemarks.forEach(credibility => {
                            item.credibility$ += credibility.name + "<br>";
                        });
                    }else{
                        item.credibility$ = "";

                    }

                    item.playerLevel$ = "";
                    if (item.playerInfo && item.playerInfo.playerLevel && item.playerInfo.playerLevel.name) {
                        item.playerLevel$ = item.playerInfo.playerLevel.name;
                    }
                    else {
                        item.playerLevel$ = "";
                    }

                    item.registrationDevice$ = "";
                    if (item && item.playerInfo && item.playerInfo.registrationDevice) {
                        item.registrationDevice$ = $translate(vm.registrationDevices[item.playerInfo.registrationDevice]);
                    } else {
                        item.registrationDevice$ = "";
                    }

                    item.provider$ = "";
                    if (item.providerInfo) {
                        item.provider$ = item.providerInfo;
                    }else{
                        item.provider$ = "";
                    }

                    item.adminName = "";
                    if (item.playerInfo && item.playerInfo.csOfficer && item.playerInfo.csOfficer.adminName) {
                        item.adminName = item.playerInfo.csOfficer.adminName;
                    }else{
                        item.adminName = "";

                    }

                    return item;
                }), data.data.size, newSearch, isExport);
            });
        };

            vm.drawDXTrackingReport = function (data, size, newSearch, isExport) {
                var tableOptions = {
                    data: data,
                    "order": vm.dxTrackingQuery.aaSorting || [[2, 'desc']],
                    aoColumnDefs: [
                        {'sortCol': 'name', 'aTargets': [0], bSortable: true},
                        {'sortCol': 'registrationDevice$', 'aTargets': [1], bSortable: true},
                        {'sortCol': 'credibility$', 'aTargets': [2], bSortable: true},
                        {'sortCol': 'playerLevel$', 'aTargets': [3], bSortable: true},
                        {'sortCol': 'valueScore', 'aTargets': [4], bSortable: true},
                        {'sortCol': 'date', 'aTargets': [5], bSortable: true},
                        {'sortCol': 'topUpAmount$', 'aTargets': [6], bSortable: true},
                        {'sortCol': 'topUpTimes', 'aTargets': [7], bSortable: true},
                        {'sortCol': 'bonusAmount$', 'aTargets': [8], bSortable: true},
                        {'sortCol': 'provider$', 'aTargets': [9], bSortable: true},
                        {'sortCol': 'consumptionTimes', 'aTargets': [10], bSortable: true},
                        {'sortCol': 'validConsumptionAmount$', 'aTargets': [11], bSortable: true},
                        {'sortCol': 'adminName', 'aTargets': [12], bSortable: true},
                    ],
                    columns: [
                        {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                        {title: $translate('REGISTRATION_DEVICE'), data: "registrationDevice$"},
                        {title: $translate('CREDIBILITY'), data: "credibility$"},
                        {title: $translate('playerLevelName'), data: "playerLevel$"},
                        {title: $translate('PlayerValue'), data: "valueScore"},
                        {title: $translate('date'), data: "date"},
                        {title: $translate('TopupAmount'), data: "topUpAmount$", sClass: "sumFloat"},
                        {title: $translate('DEPOSIT_COUNT'), data: "topUpTimes", sClass: "sumInt"},
                        {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: "sumFloat"},
                        {
                            title: $translate('GAME_LOBBY'), data: "provider$", sClass: "expandPlayerReport sumText",
                            render: function (data) {
                                return "<a>" + data + "</a>";
                            }
                        },
                        {title: $translate('TIMES_CONSUMED'), data: "consumptionTimes", sClass: "sumInt"},
                        {title: $translate('VALID_CONSUMPTION'), data: "validConsumptionAmount$", sClass: "sumFloat"},
                        {title: $translate('REGISTRATION_ADMIN'), data: "adminName"},

                    ],
                    "sScrollY": "80vh",
                    "bScrollCollapse": true,
                    "paging": false,
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    }
                };
                tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
                if (playerTbl) {
                    playerTbl.clear();
                }

                if(isExport){
                    var playerTbl = utilService.createDatatableWithFooter('#dxNewTrackingReportExcelTable', tableOptions, {}, true);

                    $('#dxNewTrackingReportExcelTable_wrapper').hide();
                    vm.exportToExcel('dxNewTrackingReportExcelTable', 'DX_TRACKING_REPORT')
                }else{
                    var playerTbl = utilService.createDatatableWithFooter('#dxTrackingReportTable', tableOptions, {}, true);
                    utilService.setDataTablePageInput('dxTrackingReportTable', playerTbl, $translate);

                    $('#dxTrackingReportTable').resize();
                    $('#dxTrackingReportTable tbody').off('click', 'td.expandPlayerReport');
                    $('#dxTrackingReportTable tbody').on('click', 'td.expandPlayerReport', function () {
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
                                        vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.dxTrackingQuery);
                                    }
                                )
                            }
                            tr.addClass('shown');
                        }
                    });
                    $('#dxTrackingReportTable').off('order.dt');
                    $('#dxTrackingReportTable').on('order.dt', function (event, a, b) {
                        vm.commonSortChangeHandler(a, 'playerQuery', vm.searchDXTrackingReport);
                    });
                }
            }



        ///////////////// End Telemarketing Tracking Report /////////////////////////////



        /////////////////telemarketing new account report/////////////////////////////
        vm.searchDXNewPlayerReport = function (newSearch, isExport = false) {
            if (!vm.dxNewPlayerQuery || !vm.dxNewPlayerQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            vm.reportSearchTimeStart = new Date().getTime();
            $('#dxNewPlayerReportTableSpin').show();

            let admins = [];

            if (vm.dxNewPlayerQuery.departments) {
                if (vm.dxNewPlayerQuery.roles && vm.dxNewPlayerQuery.roles.length > 0) {
                    vm.queryRoles.map(e => {
                        if (e._id != "" && (vm.dxNewPlayerQuery.roles.indexOf(e._id) >= 0)) {
                            e.users.map(f => admins.push(f.adminName))
                        }
                    })
                } else {
                    vm.queryRoles.map(e => {
                        if (e && e._id != "" && e.users && e.users.length) {
                            e.users.map(f => {
                                admins.push(f.adminName);
                            });
                        }
                    });
                }
            }

            let sendquery = {
                platformId: vm.dxNewPlayerQuery.platformId,
                query: {
                    start: vm.dxNewPlayerQuery.start.data('datetimepicker').getLocalDate(),
                    end: vm.dxNewPlayerQuery.end.data('datetimepicker').getLocalDate(),
                    queryStart: vm.dxNewPlayerQuery.queryStart.data('datetimepicker').getLocalDate(),
                    queryEnd: vm.dxNewPlayerQuery.queryEnd.data('datetimepicker').getLocalDate(),
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
                index: isExport ? 0 : (newSearch ? 0 : (vm.dxNewPlayerQuery.index || 0)),
                limit: isExport ? 5000 : (vm.dxNewPlayerQuery.limit || null),
                sortCol: vm.dxNewPlayerQuery.sortCol || {validConsumptionAmount: -1},
            };

            if (vm.registrationDeviceList && vm.dxNewPlayerQuery && vm.dxNewPlayerQuery.registrationDevice && vm.dxNewPlayerQuery.registrationDevice.length != Object.keys(vm.registrationDeviceList).length ) {
                sendquery.query.registrationDevice = vm.dxNewPlayerQuery.registrationDevice;
            }
            console.log('sendquery', sendquery);
            socketService.$socket($scope.AppSocket, 'getDXNewPlayerReport', sendquery, function (data) {
                findReportSearchTime();
                console.log('retData', data);
                vm.dxNewPlayerQuery.totalCount = data.data.size;
                $('#dxNewPlayerReportTableSpin').hide();
                // get game data.then(
                // map
                vm.drawDXNewPlayerReport(data.data.data.map(item => {
                    item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
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
                    item.registrationDevice$ = item && item.registrationDevice ? $translate(vm.registrationDeviceList[item.registrationDevice]) : "";

                    item.playerLevel$ = "";
                    if (vm.playerLvlData[item.playerLevel]) {
                        item.playerLevel$ = vm.playerLvlData[item.playerLevel].name;
                    }
                    else {
                        item.playerLevel$ = "";
                    }

                    item.credibility$ = "";
                    if (item.credibilityRemarks && item.credibilityRemarks.length) {
                        item.credibilityRemarks.forEach(remark => {
                            if (remark) {
                                for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                    if (remark.toString() === vm.credibilityRemarks[j]._id.toString()) {
                                        item.credibility$ += vm.credibilityRemarks[j].name + "<br>";
                                    }
                                }
                            }
                        })
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

                    if (!item.phoneProvince || item.phoneProvince === 'null' || item.phoneProvince === 'undefined') {
                        item.phoneProvince = $translate('Unknown');
                    }
                    if (!item.phoneCity || item.phoneCity === 'null' || item.phoneCity === 'undefined') {
                        item.phoneCity = $translate('Unknown');
                    }
                    if (!item.province || item.province === 'null' || item.province === 'undefined') {
                        item.province = $translate('Unknown');
                    }
                    if (!item.city || item.city === 'null' || item.city === 'undefined') {
                        item.city = $translate('Unknown');
                    }

                    item.phoneArea$ = item.phoneProvince + " " + item.phoneCity;
                    item.ipArea$ = item.province + " " + item.city;

                    if (item.onlineTopUpFeeDetail && item.onlineTopUpFeeDetail.length > 0) {
                        let detailArr = [];
                        item.onlineTopUpFeeDetail.forEach((detail, index) => {
                            if (detail && detail.merchantName && detail.hasOwnProperty('onlineToUpFee') && detail.hasOwnProperty('onlineTopUpServiceChargeRate')) {
                                let orderNo = index ? index + 1 : 1;
                                detailArr.push(orderNo + '. ' + detail.merchantName + ': ' + detail.amount + $translate("YEN") + ' * ' + parseFloat(detail.onlineTopUpServiceChargeRate * 100).toFixed(2) + '%');
                            }
                        });

                        item.onlineTopUpFeeDetail$ = detailArr && detailArr.length > 0 ? detailArr.join('\n') : '';
                    } else {
                        item.onlineTopUpFeeDetail$ = '';
                    }
                    item.totalOnlineTopUpFee$ = parseFloat(item.totalOnlineTopUpFee).toFixed(2);

                    if (item.hasOwnProperty("totalPlatformFeeEstimate")) {
                        item.totalPlatformFeeEstimate$ = item.totalPlatformFeeEstimate.toFixed(2);
                    }

                    return item;
                }), data.data.size, newSearch, isExport);
                $scope.safeApply();
            });
        };

        vm.drawDXNewPlayerReport = function (data, size, newSearch, isExport) {
            var tableOptions = {
                data: data,
                "order": vm.dxNewPlayerQuery.aaSorting || [[3, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'playerLevel', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'registrationTime', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'endTime', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'manualTopUpAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'weChatTopUpAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'aliPayTopUpAmount', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'onlineTopUpAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'topUpTimes', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [11], bSortable: true},
                    {'sortCol': 'bonusTimes', 'aTargets': [12], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [13], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [14], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [15], bSortable: true},
                    {'sortCol': 'consumptionTimes', 'aTargets': [16], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [17], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [18], bSortable: true},
                    {'sortCol': 'consumptionAmount', 'aTargets': [20], bSortable: true},
                    {'sortCol': 'phoneArea', 'aTargets': [21], bSortable: true},
                    {'sortCol': 'ipArea', 'aTargets': [22], bSortable: true},
                    {'sortCol': 'totalPlatformFeeEstimate', 'aTargets': [26], bSortable: true},
                    {'sortCol': 'totalOnlineTopUpFee', 'aTargets': [27], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('REGISTRATION_DEVICE'), data: "registrationDevice$"},
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
                    {title: $translate('COMPANY_PROFIT'), data: "profit$", sClass: "dxNewPlayerReportProfit alignRight"},
                    {title: $translate('csOfficer'), data: "csOfficer"},
                    {title: $translate('csPromoteWay'), data: "csPromoteWay"},
                    {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$"},
                    {title: $translate("PHONE_LOCATION"), data: "phoneArea$"},
                    {title: $translate("IP_LOCATION"), data: "ipArea$"},
                    {
                        title: $translate("Platform Fee"), data: "totalPlatformFeeEstimate$",
                        render: function (data, type, row) {
                            data = data || 0;
                            let feeDetails = "";
                            if (row && row.platformFeeEstimate) {
                                for (let key in row.platformFeeEstimate) {
                                    if (feeDetails) {
                                        feeDetails += "\n";
                                    }
                                    feeDetails += (key + ": " + row.platformFeeEstimate[key].toFixed(2));
                                }
                            }
                            return $('<a data-toggle="tooltip" title=\'' + feeDetails + '\'  data-placement= "left"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text((data))
                                .prop('outerHTML');
                        }, "sClass": "sumFloat"
                    },
                    {
                        title: $translate("Online Top Up Fee"), data: "totalOnlineTopUpFee$",
                        render: function (data, type, row) {
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'data-toggle': 'tooltip',
                                'title': row.onlineTopUpFeeDetail$,
                                'data-placement': 'left',
                            }).text(data));
                            return link.prop('outerHTML');
                        },
                        "sClass": "sumFloat"
                    }
                ],
                "sScrollY": "80vh",
                "bScrollCollapse": true,
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

            if(isExport){
                var playerTbl = utilService.createDatatableWithFooter('#dxNewPlayerReportExcelTable', tableOptions, {}, true);

                $('#dxNewPlayerReportExcelTable_wrapper').hide();
                vm.exportToExcel('dxNewPlayerReportExcelTable', 'DX_NEWACCOUNT_REPORT')
            }else{
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
                                        for (let j = 0; j < vm.allGame.length; j++) {
                                            if (data.gameDetail[i].gameId.toString() == vm.allGame[j]._id.toString()) {
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
            }

        };

        /////////////////draw feedback detail table inside player result/////////////////////////////
        vm.drawFeedbackTable = function (data, id, size, newSearch, qObj) {
            let holder = data;
            let tableOptions = {
                data: [data.feedback],
                "ordering": false,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('FEEDBACK_ADMIN'), data: "adminId.adminName", sClass: "realNameCell wordWrap"},
                    {title: $translate('FEEDBACK_TIME'), data: "createTime$"},
                    {title: $translate('FEEDBACK_TOPIC'), data: "topic"},
                    {title: $translate('FEEDBACK_RESULT'), data: "result$"},
                    {title: $translate('REMARKS'), data: "content"}
                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            console.log("drawFeedbackTable2",tableOptions);
            let feedbackDetailTable;
            if (feedbackDetailTable) {
                feedbackDetailTable.clear();
            }
            $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));
            feedbackDetailTable = utilService.createDatatableWithFooter('#' + id, tableOptions, {});
            utilService.setDataTablePageInput(id, feedbackDetailTable, $translate);

            $('#' + id).resize();
        };
        //////////////////////end draw feedback detail table inside player result block///////////////////////////////

        ///////draw Platform table inside player start///////
        vm.drawPlatformTable = function (data, id, size, newSearch, qObj) {
            let holder = data;
            let tableOptions = {
                data: data.providerArr,
                "ordering": false,
                // "order": qObj.aaSorting,
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
                            let holderProviderId = holder.gameDetail[i].providerId._id || holder.gameDetail[i].providerId;

                            if (holderProviderId.toString() == data.providerId.toString()) {
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
            let tableOptions = {
                data: data,
                "ordering": false,
                // "order": qObj.aaSorting,
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

        vm.searchPlayerPartnerRecord = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();

            utilService.getDataTablePageSize("#playerPartnerTablePage", vm.partnerQuery, 30);
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
                index: isExport ? 0 : (newSearch ? 0 : vm.newPartnerQuery.index),
                limit: isExport ? 5000 : (vm.newPartnerQuery.limit || 10)
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
                findReportSearchTime();
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
                vm.drawPlayerPartnerReport(resultData, data.data.size, summary, isExport);
                $scope.safeApply();
            }, function (err) {
                $('#playerPartnerTableSpin').hide();
                // vm.operationReportLoadingStatus = settlementResult.failureReportMessage;
            }, true);
        }
        vm.drawPlayerPartnerReport = function (data, size, summary, isExport) {
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

            if(isExport){
                vm.playerPartnerTable = utilService.createDatatableWithFooter('#playerPartnerExcelTable', tableOptions, {
                    8: summary.totalTopUpTimes,
                });

                $('#playerPartnerExcelTable_wrapper').hide();
                vm.exportToExcel('playerPartnerExcelTable', 'PLAYERPARTNER_REPORT');
            }else{
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
        }

        // End - player partner report

        //region financial points report
        vm.searchFinancialPointsRecord = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.curPlatformId = vm.selectedPlatform._id;

            utilService.getDataTablePageSize("#financialPointsTablePage", vm.financialQuery, 30);
            let newproposalQuery = $.extend(true, {}, vm.financialQuery);

            let financialPointsType = $('select#selectFinancialPointsType').multipleSelect("getSelects");

            $('#financialPointsTableSpin').show();
            newproposalQuery.limit = newproposalQuery.limit || 10;
            var sendData = {
                startTime: newproposalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: newproposalQuery.endTime.data('datetimepicker').getLocalDate(),
                financialPointsType: financialPointsType,
                platformList: newproposalQuery.platformList ? newproposalQuery.platformList : vm.platformList.map(item => item._id),
                index: isExport ? 0 : (newSearch ? 0 : (newproposalQuery.index || 0)),
                limit: isExport ? 5000 : newproposalQuery.limit,
                sortCol: newproposalQuery.sortCol
            };

            socketService.$socket($scope.AppSocket, 'getFinancialPointsReport', sendData, function (data) {
                findReportSearchTime();
                $('#financialPointsTable').show();
                console.log('financial points data', data);
                var datatoDraw = data.data.data.map(item => {
                    item.involveAmount$ = 0;
                    if (item.data.updateAmount) {
                        item.involveAmount$ = parseFloat(item.data.updateAmount).toFixed(2);
                    } else if (item.data.amount) {
                        item.involveAmount$ = parseFloat(item.data.amount).toFixed(2);
                    } else if (item.data.rewardAmount) {
                        item.involveAmount$ = parseFloat(item.data.rewardAmount).toFixed(2);
                    } else if (item.data.commissionAmount) {
                        item.involveAmount$ = parseFloat(item.data.commissionAmount).toFixed(2);
                    } else if (item.data.negativeProfitAmount) {
                        item.involveAmount$ = parseFloat(item.data.negativeProfitAmount).toFixed(2);
                    }
                    item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                    item.typeName = $translate(item.type.name || "Unknown");
                    item.mainType$ = $translate(item.mainType || "Unknown");

                    item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    if (item.data && item.data.remark) {
                        item.remark$ = item.data.remark;
                    }
                    // item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                    return item;
                })
                $('#financialPointsTableSpin').hide();
                $scope.$evalAsync(() => {
                    vm.financialQuery.totalCount = data.data.size;
                    vm.drawFinancialPointsReport(datatoDraw, vm.financialQuery.totalCount, data.data.summary, newSearch, isExport);
                });
            }, function (err) {
                $('#financialPointsTableSpin').hide();

            }, true);
        }
        vm.drawFinancialPointsReport = function (data, size, summary, newSearch, isExport) {
            console.log('data', data, size);
            var tableOptions = {
                data: data,
                "order": vm.financialQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'proposalId', 'aTargets': [1]},
                    {'sortCol': 'createTime', 'aTargets': [10]}
                ],
                columns: [
                    {
                        title: $translate('PRODUCT_NAME'),
                        data: "data.platformId.name"
                    },
                    {
                        title: $translate('PROPOSAL ID'), data: "proposalId",
                        render: function (data, type, row) {
                            data = String(data);
                            return '<a ng-click="vm.showProposalModalNew(\'' + data + '\')">' + data + '</a>';
                        }
                    },
                    {
                        title: $translate('CREATOR'),
                        data: null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator')) {
                                return data.creator.name;
                            } else {
                                var creator = $translate('System');
                                if (data && data.data && data.data.playerName) {
                                    creator += "(" + data.data.playerName + ")";
                                }
                                return creator;
                            }
                        }
                    },
                    {
                        title: $translate('INPUT_DEVICE'),
                        data: "inputDevice",
                        render: function (data, type, row) {
                            for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data) {
                                    return $translate(Object.keys(vm.inputDevice)[i]);
                                }
                            }
                        }
                    },
                    {
                        title: $translate('PROPOSAL TYPE'), data: ("mainType$"),
                        orderable: false
                    },
                    {
                        title: $translate('PROPOSAL_SUB_TYPE'), data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            if (data && data.data && data.data.PROMO_CODE_TYPE) {
                                return data.data.PROMO_CODE_TYPE;
                            } else if (data && data.data && data.data.eventName) {
                                return data.data.eventName;
                            } else {
                                return data.typeName;
                            }
                        }
                    },
                    // {
                    //     title: "<div>" + $translate('Proposal Status'), data: "status$",
                    //     orderable: false,
                    // },
                    {
                        title: "<div>" + $translate('INVOLVED_ACC'),
                        "data": null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator') && data.creator.type == 'player') {
                                return data.creator.name;
                            }
                            if (data && data.data && data.data.playerName) {
                                return data.data.playerName;
                            }
                            else if (data && data.data && data.data.partnerName) {
                                return data.data.partnerName;
                            }
                            else {
                                return "";
                            }
                        },
                        orderable: false
                    },
                    {'title': $translate('pointsBefore'), data: 'data.pointsBefore'},
                    {'title': $translate('pointsAfter'), data: 'data.pointsAfter', sClass: "sumText"},
                    {
                        title: $translate('Amount Involved'), data: "involveAmount$", defaultContent: 0,
                        orderable: false,
                        sClass: "sumFloat alignRight"
                    },
                    {
                        title: "<div>" + $translate('START_TIME'), data: "createTime$",
                        defaultContent: 0
                    },
                    {
                        title: "<div>" + $translate('REMARKS'),
                        data: "remark$",
                        orderable: false,
                    }
                ],
                "bSortClasses": false,
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                fnRowCallback: vm.proposalTableRow
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = v.defaultContent || "";
            });

            if (isExport) {
                var proposalTbl = utilService.createDatatableWithFooter('#financialPointsExcelTable', tableOptions, {8: summary.amount});
                $('#financialPointsExcelTable_wrapper').hide();
                vm.exportToExcel('financialPointsExcelTable', "FINANCIAL_POINTS_REPORT")
            } else {
                var proposalTbl = utilService.createDatatableWithFooter('#financialPointsTable', tableOptions, {8: summary.amount});

                vm.financialQuery.pageObj.init({maxCount: size}, newSearch);

                $('#financialPointsTable').off('order.dt');
                $('#financialPointsTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'financialQuery', vm.searchFinancialPointsRecord);
                });
            }
        }
        //endregion financial points report

        //region consumption mode report
        vm.searchConsumptionModeRecord = function (newSearch) {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.curPlatformId = vm.selectedPlatform._id;

            utilService.getDataTablePageSize("#consumptionModeTablePage", vm.consumptionModeQuery, 30);

            let newConsumptionQuery = $.extend(true, {}, vm.consumptionModeQuery);

            let consumptiionBetType = $('select#selectBetType').multipleSelect("getSelects");

            $('#consumptionModeTableSpin').show();
            newConsumptionQuery.limit = newConsumptionQuery.limit || 10;
            var sendData = {
                startTime: newConsumptionQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: newConsumptionQuery.endTime.data('datetimepicker').getLocalDate(),
                platformList: newConsumptionQuery.platformList ? newConsumptionQuery.platformList : vm.platformList.map(item => item._id),
                providerId: vm.consumptionModeQuery.gameProvider? JSON.parse(vm.consumptionModeQuery.gameProvider)._id: null,
                cpGameType: vm.consumptionModeQuery.gameType? JSON.parse(vm.consumptionModeQuery.gameType).gameType: null,
                betType: consumptiionBetType,
                index: newSearch ? 0 : (newConsumptionQuery.index || 0),
                limit: newConsumptionQuery.limit,
                sortCol: newConsumptionQuery.sortCol
            };

            console.log('newConsumptionQuery', sendData);

            socketService.$socket($scope.AppSocket, 'getConsumptionModeReport', sendData, function (data) {
                findReportSearchTime();
                $('#consumptionModeTable').show();
                console.log('consumption mode data', data);
                let dataIndex = 1;
                var datatoDraw = data.data.data.map(item => {
                    item.selectedBetTypeAmt = $noRoundTwoDecimalPlaces(item.selectedBetTypeAmt);
                    item.totalBetAmt = $noRoundTwoDecimalPlaces(item.totalBetAmt);
                    item.betAmtPercent = $noRoundTwoDecimalPlaces(item.selectedBetTypeAmt/item.totalBetAmt * 100);
                    item.bonusAmount = $noRoundTwoDecimalPlaces(item.bonusAmount);
                    item.betCountPercent = $noRoundTwoDecimalPlaces(item.selectedBetTypeCount/item.totalBetCount * 100);

                    item.indexNo$ = dataIndex;
                    dataIndex++;
                    return item;
                })
                $('#consumptionModeTableSpin').hide();
                $scope.$evalAsync(() => {
                    vm.consumptionModeQuery.totalCount = data.data.size;
                    vm.drawConsumptionModeReport(datatoDraw, vm.consumptionModeQuery.totalCount, data.data.summary, newSearch);
                });
            }, function (err) {
                $('#consumptionModeTableSpin').hide();

            }, true);
        }
        vm.drawConsumptionModeReport = function (data, size, summary, newSearch) {
            console.log('data', data, size);
            var tableOptions = {
                data: data,
                "order": vm.consumptionModeQuery.aaSorting,
                aoColumnDefs: [
                    // {'sortCol': 'playerId', 'aTargets': [1]},
                    {'sortCol': 'selectedBetTypeAmt', 'aTargets': [3]},
                    {'sortCol': 'totalBetAmt', 'aTargets': [4]},
                    {'sortCol': 'betAmtPercent', 'aTargets': [5]},
                    {'sortCol': 'bonusAmount', 'aTargets': [6]},
                    {'sortCol': 'selectedBetTypeCount', 'aTargets': [7]},
                    {'sortCol': 'totalBetCount', 'aTargets': [8]},
                    {'sortCol': 'betCountPercent', 'aTargets': [9]}
                ],
                columns: [
                    {title: $translate('order'), data: 'indexNo$'},
                    {title: $translate('PRODUCT_NAME'), data: "platformName"},
                    {title: $translate('PLAYER_NAME'), data: "_id.name", sClass: "sumText", orderable: false},
                    {title: $translate('BET_TYPE_CONSUMPTION'), data: "selectedBetTypeAmt", sClass: 'sumFloat alignRight'},
                    {title: $translate('GAME_TYPE_CONSUMPTION'), data: "totalBetAmt", sClass: 'sumFloat alignRight'},
                    {
                        title: $translate('BET_TYPE_CONSUMPTION') + "/ <br>" + $translate('GAME_TYPE_CONSUMPTION') + "(%)",
                        data: "betAmtPercent",
                        sClass: 'betAmtPercent alignRight',
                        render: function (data, type, row) {
                            if(!isFinite(data) || isNaN(data)){
                                return "-";
                            }else{
                                return data + "%";
                            }
                     }
                    },

                    {title: $translate('BET_TYPE_BONUS'), data: "bonusAmount", sClass: 'sumFloat alignRight'},
                    {title: $translate('BET_TYPE_COUNT'), data: "selectedBetTypeCount", sClass: 'sumInt alignRight'},
                    {title: $translate('GAME_TYPE_COUNT'), data: "totalBetCount", sClass: 'sumInt alignRight'},
                    {
                        title: $translate('BET_TYPE_COUNT') + "/ <br>" + $translate('TYPE_TOTAL_COUNT') + "(%)",
                        data: "betCountPercent",
                        sClass: 'betCountPercent alignRight',
                        render: function (data, type, row) {
                            return data + "%";
                        }
                    },

                ],
                "bSortClasses": false,
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                fnRowCallback: vm.proposalTableRow
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = v.defaultContent || "";
            });

            var proposalTbl = utilService.createDatatableWithFooter('#consumptionModeTable', tableOptions, {
                2: $noRoundTwoDecimalPlaces(summary.selectedBetTypeAmt),
                3: $noRoundTwoDecimalPlaces(summary.totalBetAmt),
                4: $noRoundTwoDecimalPlaces(summary.selectedBetTypeAmt/summary.totalBetAmt * 100),
                5: $noRoundTwoDecimalPlaces(summary.bonusAmount),
                6: summary.selectedBetTypeCount,
                7: summary.totalBetCount,
                8: $noRoundTwoDecimalPlaces(summary.selectedBetTypeCount/summary.totalBetCount * 100)
            });

            vm.consumptionModeQuery.pageObj.init({maxCount: size}, newSearch);

            $('#consumptionModeTable').off('order.dt');
            $('#consumptionModeTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'consumptionModeQuery', vm.searchConsumptionModeRecord);
            });

        }
        //endregion


        //Start proposal report
        vm.hideOtherConditions = function (id, thisVal, preservID) {
            var te = $(id).find(".form-control");
            if (thisVal) {
                te.not(preservID).prop("disabled", true).css("background-color", "#eee");
                te.find("input").not(preservID).prop("disabled", true).css("background-color", "#eee")
                te.find("button.ms-choice").prop("disabled", true).css("background-color", "#eee")
                te.find("button.dropdown-toggle").prop("disabled", true).css("background-color", "#eee")
            } else {
                te.not(preservID).prop("disabled", false).css("background-color", "#fff");
                te.find("input").not(preservID).prop("disabled", false).css("background-color", "#fff");
                te.find("button.ms-choice").prop("disabled", false).css("background-color", "#fff");
                te.find("button.dropdown-toggle").prop("disabled", false).css("background-color", "#fff");
            }
        }
        vm.searchProposalRecord = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.curPlatformId = vm.selectedPlatform._id;

            utilService.getDataTablePageSize("#proposalTablePage", vm.proposalQuery, 30);
            let newproposalQuery = $.extend(true, {}, vm.proposalQuery);
            newproposalQuery.proposalTypeId = [];
            newproposalQuery.rewardTypeName = [];
            newproposalQuery.promoTypeName = [];

            let proposalNames = $('select#selectProposalType').multipleSelect("getSelects");
            let rewardTypes = $('select#selectRewardType').multipleSelect("getSelects");
            let promoType = $('select#selectPromoType').multipleSelect("getSelects");

            if (vm.allProposalType.length != proposalNames.length) {
                vm.allProposalType.filter(item => {
                    if (proposalNames.indexOf(item.name) > -1) {
                        newproposalQuery.proposalTypeId.push(item.name);
                    }
                });
            }

            if (vm.rewardList.length != rewardTypes.length) {
                vm.rewardList.filter(item => {
                    if (rewardTypes.indexOf(item.name) > -1) {
                        newproposalQuery.rewardTypeName.push(item.name);
                    }
                });
            }

            vm.promoTypeListUniqueName = [...new Set(vm.promoTypeList.map(x => x.name))];

            console.log('promoType===', promoType);
            if (vm.promoTypeListUniqueName.length != promoType.length) {
                vm.promoTypeListUniqueName.filter(item => {
                    if (promoType.indexOf(item) > -1) {
                        newproposalQuery.promoTypeName.push(item);
                    }
                });
            }

            if (newproposalQuery.status == "all") {
                newproposalQuery.status = null;
            }
            if (newproposalQuery.relatedAccount) {
                newproposalQuery.relatedAccount = newproposalQuery.relatedAccount.toLowerCase();
            }
            else {
                newproposalQuery.relatedAccount = null;
            }

            if (!newproposalQuery.platformList || !newproposalQuery.platformList.length) {
                if (!vm.platformList || !vm.platformList.length) {
                    return;
                }
                newproposalQuery.platformList = vm.platformList.map(platform => platform._id);
            }

            $('#proposalTableSpin').show();
            newproposalQuery.limit = newproposalQuery.limit || 10;
            var sendData = newproposalQuery.proposalId ? {
                // platformId: vm.curPlatformId,
                proposalId: newproposalQuery.proposalId,
                platformList: newproposalQuery.platformList ? newproposalQuery.platformList : [],
                index: 0,
                limit: isExport ? 10000 : 1,
            } : {
                startTime: newproposalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: newproposalQuery.endTime.data('datetimepicker').getLocalDate(),
                proposalTypeId: newproposalQuery.proposalTypeId,
                inputDevice: newproposalQuery.inputDevice,
                rewardTypeName: newproposalQuery.rewardTypeName,
                promoTypeName: newproposalQuery.promoTypeName,
                // platformId: vm.curPlatformId,
                platformList: newproposalQuery.platformList ? newproposalQuery.platformList : [],
                status: newproposalQuery.status,
                relatedAccount: newproposalQuery.relatedAccount,
                remark: newproposalQuery.remark,
                index: isExport ? 0 : (newSearch ? 0 : (newproposalQuery.index || 0)),
                limit: isExport ? 10000 : newproposalQuery.limit,
                sortCol: newproposalQuery.sortCol,
                isExport: isExport
            };

            console.log('sendData', sendData);

            socketService.$socket($scope.AppSocket, 'getProposalStaticsReport', sendData, function (data) {
                $('#proposalTableSpin').hide();

                if (isExport) {
                    window.saveAs(new Blob([data.data]), "提案报表.csv");
                } else {
                    findReportSearchTime();
                    // $('#operationTableSpin').hide();
                    $('#proposalTable').show();
                    console.log('proposal data', data);
                    var datatoDraw = data.data.data.map(item => {
                        item.involveAmount$ = 0;
                        if (item.data.updateAmount) {
                            item.involveAmount$ = parseFloat(item.data.updateAmount).toFixed(2);
                        } else if (item.data.amount) {
                            item.involveAmount$ = parseFloat(item.data.amount).toFixed(2);
                        } else if (item.data.rewardAmount) {
                            item.involveAmount$ = parseFloat(item.data.rewardAmount).toFixed(2);
                        } else if (item.data.commissionAmount) {
                            item.involveAmount$ = parseFloat(item.data.commissionAmount).toFixed(2);
                        } else if (item.data.negativeProfitAmount) {
                            item.involveAmount$ = parseFloat(item.data.negativeProfitAmount).toFixed(2);
                        }
                        item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                        item.typeName = $translate(item.type.name || "Unknown");
                        item.mainType$ = $translate(item.mainType || "Unknown");
                        if (item.mainType === "PlayerBonus")
                            item.mainType$ = $translate("Bonus");
                        item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                        if (item.data && item.data.remark) {
                            item.remark$ = item.data.remark;
                        }
                        item.status$ = $translate(item.type.name === "BulkExportPlayerData" || item.mainType === "PlayerBonus" || item.mainType === "PartnerBonus" ? vm.getStatusStrfromRow(item) == "Approved" ? "approved" : vm.getStatusStrfromRow(item) : vm.getStatusStrfromRow(item));

                        if (item.data && item.data.autoAuditRemarkChinese) {
                            if (item.remark$) {
                                item.remark$ += item.data.autoAuditRemarkChinese;
                            } else {
                                item.remark$ = item.data.autoAuditRemarkChinese;
                            }
                        }

                        if (item.data && item.data.rejectRemark) {
                            if (item.remark$) {
                                item.remark$ += item.data.rejectRemark;
                            } else {
                                item.remark$ = item.data.rejectRemark;
                            }
                        }
                        return item;
                    })

                    vm.proposalQuery.totalCount = data.data.size;
                    vm.proposalQuery.totalPlayer = data.data.totalPlayer;
                    $scope.safeApply();
                    vm.drawProposalReportNew(datatoDraw, vm.proposalQuery.totalCount, data.data.summary, newSearch, isExport);
                }
            }, function (err) {
                $('#proposalTableSpin').hide();

            }, true);
        }
        vm.drawProposalReportNew = function (data, size, summary, newSearch, isExport) {
            console.log('data', data, size);
            var tableOptions = {
                data: data,
                "order": vm.proposalQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'proposalId', 'aTargets': [1]},
                    {'sortCol': 'createTime', 'aTargets': [9]}
                ],
                columns: [
                    {
                        "title": $translate('PRODUCT_NAME'),
                        data: "data.platformId.name"
                    },
                    {
                        title: $translate('PROPOSAL ID'), data: "proposalId",
                        render: function (data, type, row) {
                            data = String(data);
                            return '<a ng-click="vm.showProposalModalNew(\'' + data + '\', \'' + row.data.platformId._id + '\')">' + data + '</a>';
                        }
                    },
                    {
                        title: $translate('CREATOR'),
                        data: null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator')) {
                                return data.creator.name;
                            } else {
                                var creator = $translate('System');
                                if (data && data.data && data.data.playerName) {
                                    creator += "(" + data.data.playerName + ")";
                                }
                                return creator;
                            }
                        }
                    },
                    {
                        title: $translate('INPUT_DEVICE'),
                        data: "inputDevice",
                        render: function (data, type, row) {
                            for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] === data) {
                                    return $translate(Object.keys(vm.inputDevice)[i]);
                                }
                            }
                        }
                    },
                    {
                        title: $translate('PROPOSAL TYPE'), data: ("mainType$"),
                        orderable: false,
                        // render: function (data) {
                        //     return $translate(data);
                        // }
                    },
                    {
                        title: $translate('PROPOSAL_SUB_TYPE'), data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            if (data && data.data && data.data.PROMO_CODE_TYPE) {
                                return data.data.PROMO_CODE_TYPE;
                            } else if (data && data.data && data.data.eventName) {
                                return data.data.eventName;
                            } else {
                                return data.typeName;
                            }
                        }
                    },
                    {
                        title: "<div>" + $translate('Proposal Status'), data: "status$",
                        orderable: false,
                        // render: function (data, type, row) {
                        //     return $translate(vm.getStatusStrfromRow(row))
                        // }
                    },
                    {
                        title: "<div>" + $translate('INVOLVED_ACC'),
                        "data": null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator') && data.creator.type == 'player') {
                                return data.creator.name;
                            }
                            if (data && data.data && data.data.playerName) {
                                return data.data.playerName;
                            }
                            else if (data && data.data && data.data.partnerName) {
                                return data.data.partnerName;
                            }
                            else {
                                return "";
                            }
                        },
                        orderable: false,
                        sClass: "sumText"
                    },
                    {
                        title: $translate('Amount Involved'), data: "involveAmount$", defaultContent: 0,
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
                    },
                    // {
                    //     title: "<div>" + $translate('USER TYPE'), data: "userType",
                    //     orderable: false,
                    // },
                    {
                        title: "<div>" + $translate('START_TIME'), data: "createTime$",
                        // render: function (data, type, row) {
                        //     return utilService.$getTimeFromStdTimeFormat(data);
                        // },
                        defaultContent: 0
                    },
                    {
                        title: "<div>" + $translate('Player Level'), data: "data.proposalPlayerLevel",
                        orderable: false,
                    },
                    {
                        title: "<div>" + $translate('REMARKS'),
                        data: "remark$",
                        orderable: false,
                    }
                ],
                // "autoWidth": true,
                // "scrollX": true,
                // "scrollY": 400,
                // "scrollCollapse": true,
                // "destroy": true,
                "bSortClasses": false,
                "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                fnRowCallback: vm.proposalTableRow
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
            $.each(tableOptions.columns, function (i, v) {
                v.defaultContent = v.defaultContent || "";
            });

            if(isExport){
                var proposalTbl = utilService.createDatatableWithFooter('#proposalExcelTable', tableOptions, {8: summary.amount});
                $('#proposalExcelTable_wrapper').hide();
                //vm.exportToExcel("proposalExcelTable", "PROPOSAL_REPORT");
                vm.exportProposalReportToCSV(data, 'PROPOSAL_REPORT',true)
            }else{
                var proposalTbl = utilService.createDatatableWithFooter('#proposalTable', tableOptions, {8: summary.amount});

                vm.proposalQuery.pageObj.init({maxCount: size}, newSearch);

                $('#proposalTable').off('order.dt');
                $('#proposalTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'proposalQuery', vm.searchProposalRecord);
                });
            }

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

        vm.proposalTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $compile(nRow)($scope);
            vm.OperationProposalTableRow(nRow, aData, iDisplayIndex, iDisplayIndexFull);
            //console.log("row", nRow, aData, iDisplayIndex, iDisplayIndexFull);
        };

        vm.OperationProposalTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            switch (true) {
                // case (aData.expirationTime$ < 0 && aData.status == "Pending" && vm.rightPanelTitle == 'APPROVAL_PROPOSAL'): {
                //     $(nRow).css('background-color', 'rgba(135, 206, 250, 100)');
                //     break;
                // }
                case (aData.involveAmount$ >= 5000 && aData.involveAmount$ < 50000): {
                    $(nRow).css('background-color', 'rgba(255, 209, 202, 100)', 'important');
                    $(nRow).css('background-color > .sorting_1', 'rgba(255, 209, 202, 100)', 'important');
                    break;
                }
                case (aData.involveAmount$ >= 50000 && aData.involveAmount$ < 500000): {
                    $(nRow).css('background-color', 'rgba(236,100,75, 100)', 'important');
                    break;
                }
                case (aData.involveAmount$ >= 500000 && aData.involveAmount$ < 1000000): {
                    $(nRow).css('background-color', 'rgba(255, 184, 133, 100)');
                    break;
                }
                case (aData.involveAmount$ >= 1000000): {
                    $(nRow).css('background-color', 'rgba(188, 230, 114, 100)');
                    break;
                }
                default: {
                    $(nRow).css('background-color', 'rgba(255, 255, 255, 100)');
                    break;
                }
            }
        };

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
            vm.reportSearchTimeStart = new Date().getTime();
            var query = {
                // platform: vm.curPlatformId,
                platformList: vm.playerAlmostLevelUpQuery.platformList ? vm.playerAlmostLevelUpQuery.platformList : vm.platformList.map(item => item._id),
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
                    findReportSearchTime();
                    console.log('data', data);
                    $('#playerAlmostLevelUpTableSpin').hide();

                    vm.playerAlmostLevelUpQuery.totalCount = data.data.size;
                    if (newSearch) {
                        vm.playerAlmostLevelUpQuery.savedSummary = {
                            4: data.data.summary.topupTotal,
                            5: data.data.summary.topupDay,
                            6: data.data.summary.topupWeek,
                            7: data.data.summary.consumTotal,
                            8: data.data.summary.consumDay,
                            9: data.data.summary.weeklyConsumptionSum
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
                    {'sortCol': 'platform.name', 'aTargets': [0]},
                    {'sortCol': 'playerId', 'aTargets': [1]},
                    {'sortCol': 'name', 'aTargets': [2]},
                    {'sortCol': 'playerLevel.name', 'aTargets': [3]},
                    {'sortCol': 'topUpSum', 'aTargets': [4]},
                    {'sortCol': 'dailyTopUpSum', 'aTargets': [5]},
                    {'sortCol': 'weeklyTopUpSum', 'aTargets': [6]},
                    {'sortCol': 'consumptionSum', 'aTargets': [7]},
                    {'sortCol': 'dailyConsumptionSum', 'aTargets': [8]},
                    {'sortCol': 'weeklyConsumptionSum', 'aTargets': [9]},
                    {'sortCol': 'percentage', 'aTargets': [10]},
                    {targets: '_all', defaultContent: ' ', bSortable: true}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform.name"},
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
            vm.reportSearchTimeStart = new Date().getTime();
            vm.playerFeedbackQuery = vm.playerFeedbackQuery || {};
            var sendData = {
                query: {
                    startTime: vm.playerFeedbackQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerFeedbackQuery.endTime.data('datetimepicker').getLocalDate(),
                    //platform: vm.curPlatformId
                    platformList: vm.playerFeedbackQuery.platformList ? vm.playerFeedbackQuery.platformList : vm.platformList.map(item => item._id)
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
                findReportSearchTime();
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
                    {'sortCol': 'adminId', 'aTargets': [1]},
                    {'sortCol': 'result', 'aTargets': [5]},
                    {'sortCol': 'createTime', 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform.name"},
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
            vm.reportSearchTimeStart = new Date().getTime();
            vm.creditChangeQuery = vm.creditChangeQuery || {};

            var startTime = vm.creditChangeQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.creditChangeQuery.endTime.data('datetimepicker').getLocalDate();

            var sendData = {

                //platformId: vm.curPlatformId,
                platformList: vm.creditChangeQuery.platformList ? vm.creditChangeQuery.platformList : vm.platformList.map(item => item._id),
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
                findReportSearchTime();
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
                    {'sortCol': 'playerId', 'aTargets': [1]},
                    {'sortCol': 'playerId', 'aTargets': [2]},
                    {'sortCol': 'operationType', 'aTargets': [3]},
                    {'sortCol': 'amount', 'aTargets': [4]},
                    {'sortCol': 'operationTime', 'aTargets': [5]},
                    {targets: '_all', defaultContent: ' ', bSortable: true}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platformId.name"},
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
            if (!vm.newPlayerQuery || !vm.newPlayerQuery.platformId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }
            if (vm.newPlayerQuery && vm.newPlayerQuery.registrationDevice && vm.newPlayerQuery.registrationDevice.length > 0) {
                vm.isShowNewPlayerDeviceRecord = true;
            } else {
                vm.isShowNewPlayerDeviceRecord = false;
            }
            let platformObjId = vm.newPlayerQuery.platformId;
            vm.reportSearchTimeStart = new Date().getTime();
            var sendData = {
                platform: platformObjId,
                startTime: vm.newPlayerQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.newPlayerQuery.endTime.data('datetimepicker').getLocalDate(),
                registrationDevice: vm.newPlayerQuery.registrationDevice
            };
            socketService.$socket($scope.AppSocket, 'getNewAccountReportData', sendData, function (data) {
                console.log('data', data.data);
                let retData = data.data;

                vm.newPlayerQuery.newPlayers = retData[0];
                vm.newPlayerQuery.domain = retData[1];

                vm.newPlayerQuery.newPlayers.forEach(item => {
                    item.platform$ = vm.platformList.filter(platform => platform._id.toString() === item.platform.toString())[0].name;
                });

                return Promise.all([vm.getAllPromoteWay(platformObjId), vm.getPartnerLevelConfig(platformObjId),
                    vm.getAllAdmin(), vm.getPlatformPartner(platformObjId), vm.getPlatformCsOfficeUrl(platformObjId)]).then(
                    () => {
                        $scope.$evalAsync(() => {
                            findReportSearchTime();
                            vm.newPlayerQuery.totalNewPlayerWithTopup = vm.newPlayerQuery.newPlayers.filter(player => player.topUpTimes > 0).length;
                            vm.newPlayerQuery.totalNewPlayerWithMultiTopup = vm.newPlayerQuery.newPlayers.filter(player => player.topUpTimes > 1).length;
                            vm.newPlayerQuery.newValidPlayer = vm.newPlayerQuery.newPlayers.filter(player => player.topUpTimes >= vm.partnerLevelConfig.validPlayerTopUpTimes && player.topUpSum >= vm.partnerLevelConfig.validPlayerTopUpAmount && player.consumptionSum >= vm.partnerLevelConfig.validPlayerConsumptionAmount && player.consumptionTimes >= vm.partnerLevelConfig.validPlayerConsumptionTimes && player.valueScore >= vm.partnerLevelConfig.validPlayerValue);
                            vm.newPlayerQuery.totalNewValidPlayer = vm.newPlayerQuery.newValidPlayer.length;
                            let backEndCreateWayExisted = false;
                            // ============ device new player ============
                            vm.newPlayerQuery.deviceData = Object.keys(vm.registrationDevices).map(
                                device => {
                                    let devicePlayers = vm.newPlayerQuery.newPlayers.filter(player => player && player.registrationDevice && (player.registrationDevice === device));
                                    let deviceResult = vm.calculateNewPlayerData(devicePlayers, vm.registrationDevices[device]);
                                    deviceResult.registrationDevice = vm.registrationDevices[device];
                                    delete deviceResult.promoteWayName;

                                    return deviceResult;
                                }
                            );
                            // ============ promote way new player ============
                            vm.newPlayerQuery.promoteWayData = vm.allPromoteWay.map(
                                promoteWay => {
                                    if (promoteWay.name === "客服后台开户") {
                                        backEndCreateWayExisted = true;
                                    }
                                    let promoteWayPlayers = vm.newPlayerQuery.newPlayers.filter(player => player.promoteWay == promoteWay.name && !player.partner);
                                    return vm.calculateNewPlayerData(promoteWayPlayers, promoteWay.name);
                                }
                            );
                            // 代理下线
                            let partnerPlayers = vm.newPlayerQuery.newPlayers.filter(player => player.partner);
                            let partnerPlayersCalculatedData = vm.calculateNewPlayerData(partnerPlayers, $translate('partner'));
                            vm.newPlayerQuery.promoteWayData.push(partnerPlayersCalculatedData);
                            // 客服后台开户
                            if (!backEndCreateWayExisted) {
                                let fpmsPlayers = vm.newPlayerQuery.newPlayers.filter(player => player.promoteWay === '客服后台开户');
                                let fpmsPlayersCalculatedData = vm.calculateNewPlayerData(fpmsPlayers, '客服后台开户');
                                vm.newPlayerQuery.promoteWayData.push(fpmsPlayersCalculatedData);
                            }
                            // no promote way new player
                            let noPromoteWayPlayers = vm.newPlayerQuery.newPlayers.filter(player => !player.partner && !player.promoteWay);
                            vm.newPlayerQuery.promoteWayData.push(vm.calculateNewPlayerData(noPromoteWayPlayers, $translate('No Promote Way')));
                            // ============ cs analysis valid player ===========
                            vm.newPlayerQuery.csAnalysisNewPlayerData = vm.allAdmin.map(
                                admin => {
                                    let adminNewPlayers = vm.newPlayerQuery.newPlayers.filter(player => {
                                        if (player.csOfficer == admin._id) {
                                            player.csOfficerName = admin.adminName;
                                            return true;
                                        }
                                        return false;
                                    });
                                    return vm.calculateNewPlayerData(adminNewPlayers, admin.adminName);
                                }
                            );
                            // no admin new player
                            let noAdminAccPlayers = vm.newPlayerQuery.newPlayers.filter(player => Boolean(!player.csOfficer));
                            vm.newPlayerQuery.csAnalysisNewPlayerData.push(vm.calculateNewPlayerData(noAdminAccPlayers, $translate('No admin acc')));
                            // ============ partner analysis new player ===========
                            vm.newPlayerQuery.partnerNewPlayerData = vm.calculateNewPlayerData(partnerPlayers, $translate('total'), partnerPlayers.length);
                            vm.newPlayerQuery.partnerAnalysisNewPlayerData = vm.platformPartner.map(
                                partner => {
                                    let partnerNewPlayers = partnerPlayers.filter(player => player.partner && player.partner._id.toString() == partner._id.toString());
                                    return vm.calculateNewPlayerData(partnerNewPlayers, partner.partnerName, vm.newPlayerQuery.partnerNewPlayerData.validPlayer);
                                }
                            );
                            // ============ domain analysis new player ===========
                            let domainPlayers = vm.newPlayerQuery.newPlayers;
                            vm.newPlayerQuery.domainNewPlayerData = vm.calculateNewPlayerData(domainPlayers, $translate('total'), domainPlayers.length);
                            vm.newPlayerQuery.domainAnalysisNewPlayerData = vm.newPlayerQuery.domain.map(
                                domain => {
                                    let domainNewPlayers = vm.newPlayerQuery.newPlayers.filter(player => player.domain == domain._id);
                                    return vm.calculateNewPlayerData(domainNewPlayers, domain._id ==null? $translate('no domain') : domain._id, vm.newPlayerQuery.domainNewPlayerData.validPlayer);
                                }
                            );

                            vm.drawValidPlayerGraphByElementId("#validPlayerPie", vm.newPlayerQuery.promoteWayData.filter(data => data.validPlayer > 0));
                            vm.drawValidPlayerGraphByElementId("#validPlayerCsAnalysisPie", vm.newPlayerQuery.csAnalysisNewPlayerData.filter(data => data.validPlayer > 0));
                            vm.drawValidPlayerGraphByElementId("#validPlayerPartnerAnalysisPie", vm.newPlayerQuery.partnerAnalysisNewPlayerData.filter(data => data.validPlayer > 0));
                            vm.drawValidPlayerGraphByElementId("#validPlayerDomainAnalysisPie", vm.newPlayerQuery.domainAnalysisNewPlayerData.filter(data => data.validPlayer > 0));
                        })
                    }
                );
            });
        };
        // return object
        vm.calculateNewPlayerData = (newPlayerData, promoteWayName, ratioCalculateBy = vm.newPlayerQuery.totalNewValidPlayer, ratioBasedOn = 'validPlayer') => {
            let validPlayer = newPlayerData.filter(player => player.topUpTimes >= vm.partnerLevelConfig.validPlayerTopUpTimes && player.topUpSum >= vm.partnerLevelConfig.validPlayerTopUpAmount && player.consumptionTimes >= vm.partnerLevelConfig.validPlayerConsumptionTimes && player.consumptionSum >= vm.partnerLevelConfig.validPlayerConsumptionAmount && player.valueScore >= vm.partnerLevelConfig.validPlayerValue).length;

            let returnObj =  {
                promoteWayName: promoteWayName,
                totalNewAccount: newPlayerData.length,
                playerWithTopup: newPlayerData.filter(player => player.topUpTimes > 0).length,
                playerWithMultiTopup: newPlayerData.filter(player => player.topUpTimes > 1).length,
                validPlayer: validPlayer
            };
            if(newPlayerData && newPlayerData.length > 0 && newPlayerData[0].platform$){
                returnObj.platform$ = newPlayerData[0].platform$;
            }
            if (ratioBasedOn != 'validPlayer')
                returnObj.ratio = parseFloat((returnObj[ratioBasedOn] !== 0 ? returnObj[ratioBasedOn] / ratioCalculateBy * 100 : 0).toFixed(2))
            else
                returnObj.ratio = parseFloat((validPlayer !== 0 ? validPlayer / ratioCalculateBy * 100 : 0).toFixed(2));

            return returnObj;
        };
        vm.getPlatformPartner = (platformObjId) => {
            return $scope.$socketPromise('getPartnerByQuery', {platform: platformObjId || vm.curPlatformId}).then(
                data => {
                    vm.platformPartner = data.data;
                }
            )
        };

        vm.getPlatformCsOfficeUrl = (platformObjId) => {
            return $scope.$socketPromise('getAllUrl', {platformId: platformObjId || vm.curPlatformId}).then(
                data => {
                    vm.platformCsOfficerUrl = data.data;
                }
            )
        };

        vm.getAllAdmin = () => {
            return $scope.$socketPromise('getAllAdminInfo', {}).then(
                data => {
                    vm.allAdmin = data.data;
                }
            )
        };
        vm.copyToClipboard = (text) => {
            var $temp = $("<input>");
            $("body").append($temp);
            $temp.val(text).select();
            document.execCommand("copy");
            $temp.remove();
            socketService.showConfirmMessage($translate('Link has copy to clipboard'),3000);
        }
        vm.filterNoNewAccountDevice = promoteWay => promoteWay.totalNewAccount != 0;
        vm.filterNoNewAccountPromoteWay = promoteWay => promoteWay.totalNewAccount != 0;
        vm.filterNoValidPlayer = promoteWay => promoteWay.validPlayer != 0;
        vm.filterNoNewPlayer = promoteWay => promoteWay.totalNewAccount != 0;
        vm.filterValidPlayerPromoteWayTable = player => {
            if (vm.newPlayerQuery.validPlayerGraphPromoteWay == $translate('No Promote Way')) {
                return player.promoteWay == null && player.partner ==null;
            } else if (vm.newPlayerQuery.validPlayerGraphPromoteWay == $translate('partner')) {
                return player.partner !=null;
            } else {
                return player.promoteWay == vm.newPlayerQuery.validPlayerGraphPromoteWay && player.partner ==null;
            }
        };
        vm.filterValidPlayerCsAnalysisTable = player => {
            if (vm.newPlayerQuery.validPlayerGraphCsAnalysis == $translate('No admin acc')) {
                return player.csOfficerName == null;
            } else {
                return player.csOfficerName == vm.newPlayerQuery.validPlayerGraphCsAnalysis;
            }
        };
        vm.filterValidPlayerPartnerAnalysisTable = player => player.partner && player.partner.partnerName == vm.newPlayerQuery.validPlayerGraphPartnerAnalysis;
        vm.filterValidPlayerDomainAnalysisTable = player => {
            if(vm.newPlayerQuery.validPlayerGraphDomainAnalysis == $translate('no domain'))
                return player.domain == null;
            else
                return player.domain == vm.newPlayerQuery.validPlayerGraphDomainAnalysis;
        };
        vm.getPartnerLevelConfig = function (platformObjId) {
            return $scope.$socketPromise('getPartnerLevelConfig', {platform: platformObjId || vm.curPlatformId})
                .then(function (data) {
                    vm.partnerLevelConfig = data.data[0];
                });
        };

        vm.getAllPromoteWay = function (platformObjId) {
            return new Promise(function (resolve) {
                vm.allPromoteWay = {};
                let query = {
                    platformId: platformObjId || vm.curPlatformId,
                };
                return $scope.$socketPromise('getAllPromoteWay', query).then(
                    data => {
                        vm.allPromoteWay = data.data;
                        resolve(vm.allPromoteWay);
                    }
                )
            });
        };

        vm.drawValidPlayerGraphByElementId = function (elementId, promoteWayData, highlightPromoteWay, pieDataName = 'validPlayer') {
            let pieData = promoteWayData.map(promoteWay => {
                let data = {
                    label: promoteWay.promoteWayName, data: promoteWay[pieDataName]
                };
                if(highlightPromoteWay && highlightPromoteWay === promoteWay.promoteWayName)
                    data.color = "#EFAB02";
                else if(highlightPromoteWay)
                    data.color = "#9B9B9B";
                return data;
            });
            socketService.$plotPie(elementId, pieData, {}, 'validPlayerPieClickData');
        };


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
        vm.searchPartnerPlayerBonusData = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            var startTime = vm.partnerPlayerBonusQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.partnerPlayerBonusQuery.endTime.data('datetimepicker').getLocalDate();

            utilService.getDataTablePageSize("#partnerPlayerBonusTablePage", vm.partnerPlayerBonusQuery, 30);

            var sendData = {
                platformId: vm.curPlatformId,
                partnerName: vm.partnerPlayerBonusQuery.partnerName,
                startTime: startTime,
                endTime: endTime,
                limit: isExport ? 5000 : (vm.partnerPlayerBonusQuery.limit || 10),
                index: isExport ? 0 : (newSearch ? 0 : (vm.partnerPlayerBonusQuery.index || 0)),
                sortCol: vm.partnerPlayerBonusQuery.sortCol || {}
            }
            $('#partnerPlayerBonusTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getPartnerPlayerBonusReport', sendData, function (data) {
                findReportSearchTime();
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
                }), vm.partnerPlayerBonusQuery.totalCount, data.data.summary, newSearch, isExport);

            }, function (err) {
                $('#partnerPlayerBonusTableSpin').hide();
            }, true);
        }
        vm.drawPartnerPlayerBonusTable = function (tableData, size, summary, newSearch, isExport) {
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

            if(isExport){
                vm.partnerPlayerBonusTable = utilService.createDatatableWithFooter('#partnerPlayerBonusExcelTable', tableOptions, sumObj);

                $('#partnerPlayerBonusExcelTable_wrapper').hide();
                vm.exportToExcel('partnerPlayerBonusExcelTable', 'PARTNERPLAYERBOUNS_REPORT');
            }else{
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
        }
        // end of partner player bonus report

        // start partner commission report
        vm.searchPartnerCommissionData = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
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
                    utilService.getDataTablePageSize("#partnerCommissionTablePage", vm.partnerCommissionQuery, 30);
                    var sendData = {
                        platformId: vm.curPlatformId,
                        partnerName: vm.partnerCommissionQuery.partnerName,
                        startTime: startTime,
                        endTime: endTime,
                        limit: isExport ? 5000: (vm.partnerCommissionQuery.limit || 10),
                        index: isExport ? 0 : (newSearch ? 0 : (vm.partnerCommissionQuery.index || 0)),
                        sortCol: vm.partnerCommissionQuery.sortCol || {}
                    };

                    return $scope.$socketPromise('getPartnerCommissionReport', sendData, true).then(
                        function (data) {
                            findReportSearchTime();
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
                            }), vm.partnerCommissionQuery.totalCount, data.data.summary, newSearch, isExport);
                        }
                    );
                }
            ).catch(console.error).then(
                () => $('#partnerCommissionTableSpin').hide()
            );
        }
        vm.drawPartnerCommissionTable = function (tableData, size, summary, newSearch, isExport) {
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

            if(isExport){
                vm.partnerCommissionTable = utilService.createDatatableWithFooter('#partnerCommissionExcelTable', tableOptions, summaryObj);

                $('#partnerCommissionExcelTable_wrapper').hide();
                vm.exportToExcel('partnerCommissionExcelTable', 'PARTNERCOMMISSION_REPORT');
            }else{
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

        }
        // end partner commission report

        // start partner commission report
        vm.searchPartnerSettlementHistory = function (newSearch, isExport = false) {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.partnerSettlementQuery.message = '';
            let loadingSpinner = $('#partnerSettlementTableSpin');
            let commissionType = vm.partnerSettlementQuery.commissionType;
            let partnerName = vm.partnerSettlementQuery.partnerName;
            utilService.getDataTablePageSize("#partnerSettlementTablePage", vm.partnerSettlementQuery, 30);
            let sendData = {
                platformObjId: vm.selectedPlatform._id,
                startTime: new Date(vm.partnerSettlementQuery.startTime.data('datetimepicker').getLocalDate()),
                endTime: new Date(vm.partnerSettlementQuery.endTime.data('datetimepicker').getLocalDate()),
                limit: isExport ? 5000 : (vm.partnerSettlementQuery.limit || 10),
                index: isExport ? 0 : (newSearch ? 0 : (vm.partnerSettlementQuery.index || 0)),
                sortCol: vm.partnerSettlementQuery.sortCol || {}
            };
            if(commissionType === '' && partnerName === '') {
                vm.partnerSettlementQuery.message = 'Either Commission Type or Partner Name must be filled in';
                return;
            }
            if(commissionType !== '') {
                sendData.commissionType = commissionType;
            }
            if(partnerName !== '') {
                sendData.partnerName = partnerName;
            }

            loadingSpinner.show();
            console.log('searchPartnerSettlementHistory sendData',sendData);
            $scope.$socketPromise('getPartnerSettlementHistory', sendData, true).then(data => {
                findReportSearchTime();
                console.log('searchPartnerSettlementHistory retData',data);
                $scope.$evalAsync(() => {
                    vm.partnerSettlementQuery.totalCount = data.data.count || 0;
                });
                let searchResult = data.data.data;
                searchResult.map(item => {
                    item.commissionType$ = $translate($scope.constPartnerCommissionSettlementType[item.commissionType]);
                    for(let i in item.groupCommissions) {
                        if(item.groupCommissions.hasOwnProperty(i)) {
                            item.groupCommissions[i + '$'] = parseFloat(item.groupCommissions[i]).toFixed(2);
                        }
                    }
                    item.totalRewardFee$ = parseFloat(item.totalRewardFee).toFixed(2);
                    item.totalPlatformFee$ = parseFloat(item.totalPlatformFee).toFixed(2);
                    item.totalTopUpFee$ = parseFloat(item.totalTopUpFee).toFixed(2);
                    item.totalWithdrawalFee$ = parseFloat(item.totalWithdrawalFee).toFixed(2);
                    item.totalConsumption$ = parseFloat(item.totalConsumption).toFixed(2);
                    item.totalTopUp$ = parseFloat(item.totalTopUp).toFixed(2);
                    item.nettCommission$ = parseFloat(item.nettCommission).toFixed(2);
                });
                loadingSpinner.hide();
                // if($('#partnerSettlementTable_wrapper').length) {
                //     let parent = $('#partnerSettlementTable_wrapper').parent()[0];
                //     $('#partnerSettlementTable_wrapper').remove();
                //     $('#partnerSettlementTablePage').remove();
                //
                //     let tableElem = document.createElement("table");
                //     tableElem.id = "partnerSettlementTable";
                //     tableElem.className = "common-table display";
                //     tableElem.style.width = "inherit";
                //     tableElem.style.minWidth = "100%";
                //     tableElem.style.overflowX = "scroll";
                //
                //     let tablePageElem = document.createElement("div");
                //     tablePageElem.id = "partnerSettlementTablePage";
                //
                //     parent.appendChild(tableElem);
                //     parent.appendChild(tablePageElem);
                // }
                // vm.partnerSettlementQuery.pageObj = utilService.createPageForPagingTable("#partnerSettlementTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                //     vm.commonPageChangeHandler(curP, pageSize, "partnerSettlementQuery", vm.searchPartnerSettlementHistory)
                // });
                vm.drawPartnerSettlementHistoryTable(searchResult, vm.partnerSettlementQuery.totalCount, newSearch, isExport);
            });
        };
        vm.drawPartnerSettlementHistoryTable = function (tableData, size, newSearch, isExport) {
            let providerGroupColumns = [];
            if(tableData.length > 0) {
                tableData[0].rawCommissions.forEach(group => {
                    providerGroupColumns.push({
                        title: group.groupName,
                        data: "groupCommissions."+group.groupName+"$",
                        sClass: "sumFloat alignRight",
                        bSortable: false
                    })
                });
            }

            let tableOptions = {
                data: tableData,
                "order": vm.partnerSettlementQuery.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'partnerName', 'aTargets': [0]},
                    {'sortCol': 'partnerRealName', 'aTargets': [1]},
                    {'sortCol': 'commissionType', 'aTargets': [2]},
                    {'sortCol': 'totalRewardFee', 'aTargets': [3]},
                    {'sortCol': 'totalPlatformFee', 'aTargets': [4]},
                    {'sortCol': 'totalTopUpFee', 'aTargets': [5]},
                    {'sortCol': 'totalWithdrawalFee', 'aTargets': [6]},
                    {'sortCol': 'totalConsumption', 'aTargets': [7]},
                    {'sortCol': 'totalTopUp', 'aTargets': [8]},
                    {'sortCol': 'nettCommission', 'aTargets': [9]},
                    {targets: '_all', defaultContent: 0, bSortable: true}
                ],
                columns: [
                    {title: $translate("PARTNER_NAME"), data: "partnerName", bSortable: false},
                    {title: $translate('REAL_NAME'), data: "partnerRealName"},
                    {title: $translate('COMMISSION_TYPE'), data: "commissionType$"},
                    {title: $translate('REQUIRED_PROMO_DEDUCTION'), data: "totalRewardFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('REQUIRED_PLATFORM_FEES_DEDUCTION'), data: "totalPlatformFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('REQUIRED_DEPOSIT_FEES_DEDUCTION'), data: "totalTopUpFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('REQUIRED_WITHDRAWAL_FEES_DEDUCTION'), data: "totalWithdrawalFee$", sClass: "sumFloat alignRight"},
                    {title: $translate('TOTAL_CHILDREN_CONSUMPTION'), data: "totalConsumption$", sClass: "sumFloat alignRight"},
                    {title: $translate('TOTAL_CHILDREN_DEPOSIT'), data: "totalTopUp$", sClass: "sumFloat alignRight"},
                    {title: $translate('commissionAmount'), data: "nettCommission$", sClass: "sumFloat alignRight"},
                ],
                "bAutoWidth": true,
                "paging": false,
            };

            if(providerGroupColumns.length > 0) {
                providerGroupColumns.forEach((provider, i) => {
                    tableOptions.columns.splice(3 + i, 0, provider);
                });
                tableOptions.aoColumnDefs.forEach((def,i) => {
                    if(i>=3 && def.aTargets) {
                        def.aTargets[0] += providerGroupColumns.length;
                    }
                })
            }
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if(isExport){
                vm.partnerSettlementTable = utilService.createDatatableWithFooter('#partnerSettlementExcelTable', tableOptions, {}, true);

                $('#partnerSettlementExcelTable_wrapper').hide();
                vm.exportToExcel('partnerSettlementExcelTable', 'PARTNER_SETTLEMENT_HISTORY_REPORT');
            }else{
                vm.partnerSettlementTable = utilService.createDatatableWithFooter('#partnerSettlementTable', tableOptions, {}, true);
                vm.partnerSettlementQuery.pageObj.init({maxCount: size}, newSearch);
                $('#partnerSettlementTable').off('order.dt');
                $('#partnerSettlementTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'partnerSettlementQuery', vm.searchPartnerSettlementHistory);
                });
                setTimeout(function () {
                    $('#partnerSettlementTable_wrapper').resize();
                }, 500);
            }
        };
        // end partner commission report

        // start of reward proposal report （total - reward report）
        vm.getRewardProposalReport = function () {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.rewardProposalQuery = vm.rewardProposalQuery || {};

            var startTime = vm.rewardProposalQuery.startTime.data('datetimepicker').getLocalDate();
            var endTime = vm.rewardProposalQuery.endTime.data('datetimepicker').getLocalDate();
            vm["#rewardProposalQuery"] = {};
            vm["#rewardProposalQuery"].startTime = startTime;
            vm["#rewardProposalQuery"].endTime = endTime;
            var sendData = {
                //platformId: vm.curPlatformId || vm.selectedPlatform._id,
                platformList: vm.rewardProposalQuery.platformList ? vm.rewardProposalQuery.platformList : vm.platformList.map(item => item._id),
                startTime: startTime,
                endTime: endTime,
                status: vm.rewardProposalQuery.status,
                playerName: vm.rewardProposalQuery.playerName,
                dayCountAfterRedeemPromo: vm.rewardProposalQuery.dayCountAfterRedeemPromo
            }
            console.log('sendData', sendData);
            $('#rewardProposalTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getRewardProposalReport', sendData, function (data) {
                findReportSearchTime();
                $('#rewardProposalTableSpin').hide();
                console.log('getRewardProposalReport', data.data);
                $scope.$evalAsync(() => {
                    vm.rewardProposalQuery.totalCount = data.data.totalPlayer;
                });
                vm.drawRewardProposalReport(data.data.data
                );

            }, function (err) {
                $('#rewardProposalTableSpin').hide();
            }, true);
        }

        vm.drawRewardProposalReport = function (data) {
            var tableData = data.map(
                record => {
                    record.name = record.name ? $translate(record.name) : "";
                    record.eventName = record.eventName ? record.eventName : "";
                    record.countRewardApplied = record.countRewardApplied ? record.countRewardApplied : 0;
                    record.$amount = record.sumTotalRewardAmount ? $noRoundTwoDecimalPlaces(record.sumTotalRewardAmount) :
                        (record.sumTotalReturnAmount ? $noRoundTwoDecimalPlaces(record.sumTotalReturnAmount) :
                            (record.sumTotalAmount ? $noRoundTwoDecimalPlaces(record.sumTotalAmount) : 0));
                    record.countPlayerApplied = record.countPlayerApplied ? record.countPlayerApplied : 0;
                    record.sumTotalTopupAmount = record.sumTotalTopupAmount ? $noRoundTwoDecimalPlaces(record.sumTotalTopupAmount) : 0;
                    record.sumTotalBonusAmount = record.sumTotalBonusAmount ? $noRoundTwoDecimalPlaces(record.sumTotalBonusAmount) : 0;
                    record.sumPlayerProfit = record.sumPlayerProfit ? $noRoundTwoDecimalPlaces(record.sumPlayerProfit) : 0;
                    return record
                }
            );

            var option = $.extend(true, {}, vm.commonTableOption, {
                data: tableData,
                columnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platformName"},
                    {title: $translate('PROPOSAL_TYPE'), data: "name", sClass:"AllPagesLabel"},
                    {title: $translate('event name'), data: "eventName"},
                    {title: $translate('CountRewardApplied'), data: "countRewardApplied" , sClass:"sumFloat alignRight"},
                    {title: $translate('TotalRewardAmount'), data: "$amount", sClass:"sumFloat alignRight"},
                    {title: $translate('CountPlayerApplied'), data: "countPlayerApplied", sClass:"sumFloat alignRight"},
                    {title: $translate('TOTAL_TOP_UP'), data: "sumTotalTopupAmount", sClass:"sumFloat alignRight"},
                    {title: $translate('Total_Bonus_Amount'), data: "sumTotalBonusAmount", sClass:"sumFloat alignRight"},
                    {title: $translate('PlayerProfit'), data: "sumPlayerProfit", sClass:"sumFloat alignRight"}

                ],
                bSortClasses: false,
                destroy: true,
                paging: false,
                autoWidth: true,
            });
            var a = utilService.createDatatableWithFooter('#rewardProposalTable', option,  {}, true);
            $('#rewardProposalTable').resize();
        }
        // end of reward proposal report

        // start of general reward proposal report (other reward report)
        vm.generalRewardProposalSearch = function (newSearch) {
            vm.reportSearchTimeStart = new Date().getTime();
            vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};

            let startTime = vm.generalRewardProposalQuery.startTime.data('datetimepicker').getLocalDate();
            let endTime = vm.generalRewardProposalQuery.endTime.data('datetimepicker').getLocalDate();
            vm["#generalRewardProposalQuery"] = {};
            vm["#generalRewardProposalQuery"].startTime = startTime;
            vm["#generalRewardProposalQuery"].endTime = endTime;

            let registrationStartTime = vm.generalRewardProposalQuery.registrationStartTime.data('datetimepicker').getLocalDate();
            let registrationEndTime = vm.generalRewardProposalQuery.registrationEndTime.data('datetimepicker').getLocalDate();

            if (registrationStartTime && registrationEndTime) {
                vm["#generalRewardProposalQuery"].registrationStartTime = registrationStartTime;
                vm["#generalRewardProposalQuery"].registrationEndTime = registrationEndTime;
            }

            utilService.getDataTablePageSize("#generalRewardProposalTablePage", vm.generalRewardProposalQuery, 30);

            var sendData = {
                platformId: vm.selectedRewardPlatform,
                startTime: startTime,
                endTime: endTime,
                type: vm.rewardTypeName,
                code: vm.currentRewardCode,
                topUpTimesOperator: vm.generalRewardProposalQuery.topUpTimesOperator,
                topUpTimesValue: vm.generalRewardProposalQuery.topUpTimesValue,
                topUpTimesValueTwo: vm.generalRewardProposalQuery.topUpTimesValueTwo,
                bonusTimesOperator: vm.generalRewardProposalQuery.bonusTimesOperator,
                bonusTimesValue: vm.generalRewardProposalQuery.bonusTimesValue,
                bonusTimesValueTwo: vm.generalRewardProposalQuery.bonusTimesValueTwo,
                topUpAmountOperator: vm.generalRewardProposalQuery.topUpAmountOperator,
                topUpAmountValue: vm.generalRewardProposalQuery.topUpAmountValue,
                topUpAmountValueTwo: vm.generalRewardProposalQuery.topUpAmountValueTwo,
                limit: vm.generalRewardProposalQuery.limit || 10,
                index: newSearch ? 0 : (vm.generalRewardProposalQuery.index || 0),
                sortCol: vm.generalRewardProposalQuery.sortCol
            }

            if (vm.generalRewardProposalQuery.dayAfterReceiving){
                sendData.dayAfterReceiving = vm.generalRewardProposalQuery.dayAfterReceiving;
            }
            if (vm.generalRewardProposalQuery.playerName){
                sendData.playerName = vm.generalRewardProposalQuery.playerName;
            }

            if (registrationStartTime && registrationEndTime) {
                sendData.registrationStartTime = registrationStartTime;
                sendData.registrationEndTime = registrationEndTime;
            }

            console.log('sendData', sendData);
            $('#generalRewardProposalTableSpin').show();

            if (vm.currentRewardCode && vm.currentRewardCode !== 'ALL'){
                socketService.$socket($scope.AppSocket, 'getRewardProposalByType', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        findReportSearchTime();
                        $('#generalRewardProposalTableSpin').hide();
                        console.log('general reward report', data);
                        vm.generalRewardProposalQuery.totalCount = data.data.size;
                        vm.generalRewardProposalQuery.totalApplicant = data.data.size;

                        vm.drawSpecificRewardProposalTable(data.data && data.data.data && data.data.data.length > 0 ? data.data.data.map(item => {
                            if (item.registrationTime) {
                                item.registrationTime$ = vm.dateReformat(item.registrationTime);
                            }

                            if (item.lastAccessTime) {
                                item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                            }

                            if (item.providerId && item.providerId.length > 0) {
                                item.gameProvider = [];
                                item.providerId.forEach(pId => {
                                    if (pId && vm.gameProvider && vm.gameProvider.length > 0) {
                                        let index = vm.gameProvider.findIndex(p => p._id.toString() == pId.toString())
                                        if (index != -1) {
                                            item.gameProvider.push({
                                                _id: vm.gameProvider[index]._id,
                                                providerName: vm.gameProvider[index].name
                                            });
                                        }
                                    }
                                })
                            }

                            item.totalCount = item.totalCount || 0;
                            item.totalDepositAmount = $roundToTwoDecimalPlacesString(item.totalDepositAmount || 0);
                            item.totalRewardAmount = $roundToTwoDecimalPlacesString(item.totalRewardAmount || 0);
                            item.totalBonusAmount = $roundToTwoDecimalPlacesString(item.totalBonusAmount || 0);
                            item.winLostAmount = $roundToTwoDecimalPlacesString(item.winLostAmount || 0);

                            return item;
                        }) : [], vm.generalRewardProposalQuery.totalCount, data.data.total, newSearch);
                    })
                    }, function (err) {
                        $('#generalRewardProposalTableSpin').hide();
                    }, true);
            }
            else {
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
                            item.$amount = parseFloat(item.data.rewardAmount).toFixed(2);
                        } else if (item.data.returnAmount) {
                            item.$amount = parseFloat(item.data.returnAmount).toFixed(2);
                        } else if (item.data.updateAmount) {
                            item.$amount = parseFloat(item.data.updateAmount).toFixed(2);
                        } else if (item.data.amount) {
                            item.$amount = parseFloat(item.data.amount).toFixed(2);
                        } else {
                            item.$amount = 0;
                        }

                        item.$amount = parseFloat(item.$amount).toFixed(2);
                        item.$applyAmount = parseFloat(item.data.applyAmount).toFixed(2) || 0;
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

        vm.initGameDetail = function (providerId, playerId, playerName, providerName){

            vm.gameDetails = [];
            vm.selectedDisplayedPlayer = playerName || "";
            vm.selectedProviderName = providerName || "";
            if (providerId && playerId){
                var sendData = {
                    platformId: vm.curPlatformId || vm.selectedPlatform._id,
                    startTime: vm.generalRewardProposalQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.generalRewardProposalQuery.endTime.data('datetimepicker').getLocalDate(),
                    providerId: providerId,
                    playerId: playerId
                }

                socketService.$socket($scope.AppSocket, 'getGameDetailByProvider', sendData, function (data) {
                    $scope.$evalAsync(() => {

                        if (data && data.data){
                           vm.gameDetails = data.data.map(item => {
                               item.totalAmount = $roundToTwoDecimalPlacesString(item.totalAmount || 0);
                               item.totalValidAmount = $roundToTwoDecimalPlacesString(item.totalValidAmount || 0);
                               item.totalBonusAmount = $roundToTwoDecimalPlacesString(item.totalBonusAmount || 0);
                               item.profitMargin = $roundToTwoDecimalPlacesString(item.profitMargin || 0);
                               return item;
                           });

                        }
                    })
                })
            }
        }

        vm.drawSpecificRewardProposalTable = function (data, size, total, newSearch) {
            let tableData = data.map(
                record => {
                    record.totalCount = record.totalCount ? parseInt(record.totalCount) : 0;
                    record.totalRewardAmount = record.totalRewardAmount ? $noRoundTwoDecimalPlaces(record.totalRewardAmount) : 0;
                    record.totalDepositAmount = record.totalDepositAmount ? $noRoundTwoDecimalPlaces(record.totalDepositAmount) : 0;
                    record.totalBonusAmount = record.totalBonusAmount ? $noRoundTwoDecimalPlaces(record.totalBonusAmount) : 0;
                    record.winLostAmount = record.winLostAmount ? $noRoundTwoDecimalPlaces(record.winLostAmount) : 0;
                    return record
                }
            );

            let tableOptions = $.extend(true, {}, vm.commonTableOption, {
                data: tableData,
                "order": vm.generalRewardProposalQuery.aaSorting,
                aoColumnDefs: [
                // {'sortCol': 'adminName', 'aTargets': [0]},
                // {'sortCol': 'action', 'aTargets': [1]},
                    {'sortCol': 'totalCount', 'aTargets': [3]},
                    {'sortCol': 'totalRewardAmount', 'aTargets': [4]},
                    {targets: '_all', defaultContent: ' '}
                ],
                columns: [
                    {title: $translate("PLAYER_NAME"), data: "name", bSortable: false},
                    {title: $translate("REGISTERED_TIME"), data: "registrationTime$"},
                    {title: $translate("LAST_ACCESS_TIME"), data: "lastAccessTime$", sClass:"sumText"},
                    {title: $translate('NUMBER_OF_APPLICATION'), data: "totalCount", sClass: "sumInt alignRight" },
                    {title: $translate("TOTAL_REWARD_AMOUNT"), data: "totalRewardAmount", sClass: "sumFloat alignRight"},
                    {title: $translate("TOTAL_TOP_UP"), data: "totalDepositAmount", sClass: "sumFloat alignRight"},
                    {title: $translate("TOTAL_WITHDRAWAL_AMOUNT"), data: "totalBonusAmount", sClass: "sumFloat alignRight"},
                    {title: $translate("PLAYER PROFIT AMOUNT"), data: "winLostAmount", sClass: "sumFloat alignRight"},
                    {title: $translate("GAME_LOBBY"), data: "gameProvider",

                        render: function (data, type, row) {
                            var link = $('<div>', {});
                            if (row.gameProvider && row.gameProvider.length > 0){

                                row.gameProvider.forEach(p=> {
                                    if(p) {
                                        link.append($('<a>', {
                                            'ng-click': "vm.initGameDetail('" + p._id + "','"+ row._id + "','" + row.name + "','" + p.providerName + "');",
                                            'data-toggle': 'modal',
                                            'data-target': '#modalGameDetails',
                                            'data-placement': 'right',
                                            'style': 'padding-right:5px;',
                                        }).text(p.providerName));
                                    }
                                })
                                return link.prop('outerHTML');
                            }
                        }

                    }

                ],
                "paging": false,
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                },
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            vm.generalRewardProposalQuery.table = utilService.createDatatableWithFooter("#generalRewardProposalTable", tableOptions, {
                3: total && total.totalCount ? total.totalCount : 0,
                4: total && total.totalRewardAmount ? total.totalRewardAmount : 0,
                5: total && total.totalDepositAmount ? total.totalDepositAmount : 0,
                6: total && total.totalBonusAmount ? total.totalBonusAmount : 0,
                7: total && total.winLostAmount ? total.winLostAmount : 0,
            });
            vm.generalRewardProposalQuery.pageObj.init({maxCount: size}, newSearch);

            $("#generalRewardProposalTable").off('order.dt');
            $("#generalRewardProposalTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'generalRewardProposalQuery', vm.generalRewardProposalSearch);
            });
            $("#generalRewardProposalTable").resize();
        }
        // end of general reward proposal report

        //region reward report analysis
        vm.drawRewardReportAnalysis = function () {
            vm.dataSort = {
                rewardReportPlayer: 'date',
                rewardReportProposal: 'date',
                rewardReportAmount: 'date'
            }

            vm.rewardReportPlayerAvg = {};
            vm.rewardReportProposalAvg = {};
            vm.rewardReportAmountAvg = {};

            let proposalNames
            if (vm.rewardReportAnalysis.type === "rewardName") {
                proposalNames = vm.rewardReportAnalysis.promoName;
            } else {
                proposalNames = vm.rewardReportAnalysis.proposalTypeName;
            }


            vm.isShowLoadingSpinner('#rewardReportAnalysis', true);
            var sendData = {
                period: vm.rewardReportAnalysis.periodText,
                startDate: vm.rewardReportAnalysis.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.rewardReportAnalysis.endTime.data('datetimepicker').getLocalDate(),
                //platformObjId: vm.selectedPlatform._id,
                platformList: vm.rewardReportAnalysis.platformList ? vm.rewardReportAnalysis.platformList : vm.platformList.map(item => item._id),
                type: vm.rewardReportAnalysis.type,
                proposalNameArr: proposalNames
            }

            socketService.$socket($scope.AppSocket, 'getRewardAnalysisProposal', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if (!data && !data.data) {
                            return Q.reject({name: 'DataError', message: 'Can not find the proposal data'})
                        }

                        vm.isShowLoadingSpinner('#rewardReportAnalysis', false);

                        vm.rewardReportAnalysisData = JSON.parse(JSON.stringify(data.data));
                        vm.rewardReportPieLabel = [];
                        for (let key in vm.rewardReportAnalysisData[0]) {
                            if (key != "date" && key != "totalProposalCount" && key != "totalPlayerCount" && key != "totalAmount") {
                                vm.rewardReportPieLabel.push(key);
                            }
                        }
                        vm.rewardReportPlayerAvg = [];
                        vm.rewardReportPieLabel.forEach((item,i) => {
                            vm.rewardReportPlayerAvg[i] =  vm.calculateAverageData(vm.rewardReportAnalysisData, item, "player");
                        })


                        let rewardReportPlayerPieArr = [];
                        for (let i = 0; i < vm.rewardReportPlayerAvg.length; i++) {
                            if (i == 0) {
                                continue;
                            }
                            let pieObj = {
                                count: vm.rewardReportPlayerAvg[i]
                            };
                            pieObj.label = $translate(vm.rewardReportPieLabel[i]);
                            rewardReportPlayerPieArr.push(pieObj)
                        }
                        vm.drawPieChart(rewardReportPlayerPieArr,"#pie-rewardAnalysisPlayer");

                        //proposal count
                        vm.rewardReportProposalAvg = [];
                        vm.rewardReportPieLabel.forEach((item,i) => {
                            vm.rewardReportProposalAvg[i] =  vm.calculateAverageData(vm.rewardReportAnalysisData, item, "proposalCount");
                        })


                        let rewardReportProposalPieArr = [];
                        for (let i = 0; i < vm.rewardReportProposalAvg.length; i++) {
                            if (i == 0) {
                                continue;
                            }
                            let pieObj = {
                                count: vm.rewardReportProposalAvg[i]
                            };
                            pieObj.label = $translate(vm.rewardReportPieLabel[i]);
                            rewardReportProposalPieArr.push(pieObj)
                        }
                        vm.drawPieChart(rewardReportProposalPieArr,"#pie-rewardAnalysisCount");

                        //amount
                        vm.rewardReportAmountAvg = [];
                        vm.rewardReportPieLabel.forEach((item,i) => {
                            vm.rewardReportAmountAvg[i] =  vm.calculateAverageData(vm.rewardReportAnalysisData, item, "amount");
                        })


                        let rewardReportAmountPieArr = [];
                        for (let i = 0; i < vm.rewardReportAmountAvg.length; i++) {
                            if (i == 0) {
                                continue;
                            }
                            let pieObj = {
                                count: vm.rewardReportAmountAvg[i]
                            };
                            pieObj.label = $translate(vm.rewardReportPieLabel[i]);
                            rewardReportAmountPieArr.push(pieObj)
                        }
                        vm.drawPieChart(rewardReportAmountPieArr,"#pie-rewardAnalysisAmount");

                    });

                }, function (data) {
                    vm.isShowLoadingSpinner('#rewardReportAnalysis', false);
                    console.log("Failed to retrieve the data", data);
                }
            )
        };

        vm.drawPieChart = function (srcData, pieChartName) {
            var placeholder = pieChartName;

            var pieData = srcData.filter(function (obj) {
                return (obj.count);
            }).map(function (obj) {
                return {label: obj.label, data: obj.count};
            }).sort(function (a, b) {
                return b.data - a.data;
            })
            function labelFormatter(label, series) {
                return "<div style='font-size:8pt; text-align:center; padding:2px; color:white;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
            }

            socketService.$plotPie(placeholder, pieData, {
                series: {
                    pie: {
                        show: true,
                        radius: 1,
                        //tilt: 0.5,
                        label: {
                            show: true,
                            radius: 1,
                            formatter: labelFormatter,
                            background: {
                                opacity: 0.80
                            }
                        },
                        combine: {
                            color: "#999",
                            threshold: 0
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                },
                colors: [
                    '#e6194b',
                    '#3cb44b',
                    '#ffe119',
                    '#0082c8',
                    '#f58231',
                    '#911eb4',
                    '#46f0f0',
                    '#f032e6',
                    '#d2f53c',
                    '#fabebe',
                    '#008080',
                    '#10ff10',
                    '#10ffbc',
                    '#bc10ff',
                    '#1010ff',
                    '#c49102',
                    '#e6beff',
                    '#aa6e28',
                    '#fffac8',
                    '#800000',
                    '#aaffc3',
                    '#808000',
                    '#ffd8b1',
                    '#ff1010',
                    '#000080',
                    '#99ee34',
                ],
            }, '');
            vm.bindHoverTitle(pieChartName);
        };

        vm.bindHoverTitle = function(pieChartName){
            $(pieChartName).bind("plothover", function (event, pos, item) {
                console.log(item);
                if (!item || !item.seriesIndex) { return; }
                $('.pieLabel').css('z-index',1);
                $('.pieLabelBackground').css('z-index',1);
                $('#pieLabel'+item.seriesIndex).css('z-index',999).prev('.pieLabelBackground').css('z-index',999);
            });
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

        vm.calculateAverageData = (data, key1, key2) => {
            let average = null;
            if (key2) {
                average = data.length !== 0 ? Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key1][key2]) ? item[key1][key2] : 0), 0) / data.length) : 0;
            }else{
                average = data.length !== 0 ? Math.floor(data.reduce((a, item) => a + (Number.isFinite(item[key1]) ? item[key1] : 0), 0) / data.length) : 0;
            }

            return average
        };

        vm.dataArraySort = (type , sortField, objField) => {
            if (objField) {
                vm.dataSort[type] = vm.dataSort[type] === sortField  + "." + objField? '-' + sortField + "." + objField: sortField + "." + objField;
            } else {
                vm.dataSort[type] = vm.dataSort[type] === sortField ? '-'+sortField : sortField;
            }
        };

        //endregion

        /////////////// start of general reward task report

        vm.searchGeneralRewardTask = function (newSearch) {
            vm.reportSearchTimeStart = new Date().getTime();
            console.log("vm.generalRewardTaskQuery", vm.generalRewardTaskQuery);
            vm.generalRewardTaskQuery = vm.generalRewardTaskQuery || {};

            let startTime = vm.generalRewardTaskQuery.startTime.data('datetimepicker').getLocalDate();
            let endTime = vm.generalRewardTaskQuery.endTime.data('datetimepicker').getLocalDate();
            vm["#generalRewardTaskQuery"] = {};
            vm["#generalRewardTaskQuery"].startTime = startTime;
            vm["#generalRewardTaskQuery"].endTime = endTime;
            utilService.getDataTablePageSize("#generalRewardTaskTablePage", vm.generalRewardTaskQuery, 30);

            var deferred = Q.defer();
            var query = {
                platformId: vm.selectedRewardPlatform || vm.curPlatformId,
                startTime: startTime,
                endTime: endTime,
                type: vm.currentRewardTaskName,//'FIRST_TOP_UP'
                index: newSearch ? 0 : vm.generalRewardTaskQuery.index,
                limit: vm.generalRewardTaskQuery.limit || 10,
                sortCol: vm.generalRewardTaskQuery.sortCol || {},
                eventId: vm.currentEventId
            }

            console.log('query', query);
            $('#generalRewardTaskSpin').show();
            $scope.$socketPromise('getPlatformRewardPageReport', query)
                .then(function (data) {
                    findReportSearchTime();
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
            vm.reportSearchTimeStart = new Date().getTime();
            console.log("vm.actionLogQuery", vm.actionLogQuery);

            var query = {
                startTime: vm.actionLogQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.actionLogQuery.endTime.data('datetimepicker').getLocalDate(),
                action: vm.actionLogQuery.action || vm.allActions,//'FIRST_TOP_UP'
                admin: vm.actionLogQuery.admin,
                player: vm.actionLogQuery.player,
                index: vm.actionLogQuery.index,
                limit: vm.actionLogQuery.limit || 10,
                sortCol: vm.actionLogQuery.sortCol || {operationTime : -1}
            }

            if(vm.actionLogQuery.platform){
                query.platformObjIdList =  vm.actionLogQuery.platform;
            } else{
                let platformListId = [];

                vm.platformList.forEach(platform => {
                    if(platform && platform._id){
                        platformListId.push(platform._id);
                    }
                });

                query.platformObjIdList = platformListId;
            }

            console.log('query', query);
            $('#actionLogTableSpin').show();
            socketService.$socket($scope.AppSocket, 'getActionLogPageReport', query, function (data) {
                findReportSearchTime();
                $('#actionLogTableSpin').hide();
                console.log('ActionLog report', data);
                vm.actionLogQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawActionLogReportTable(data.data.data.map(item => {
                    item.operationTime$ = utilService.$getTimeFromStdTimeFormat(item.operationTime);
                    item.platformName = [];
                    if(item.platforms){
                        item.platforms.forEach(platform => {
                            if(platform){
                                item.platformName.push(platform.name);
                            }
                        })
                    }
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
                "aaSorting": vm.actionLogQuery.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'adminName', 'aTargets': [0]},
                    {'sortCol': 'action', 'aTargets': [1]},
                    {'sortCol': 'operationTime', 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' '}],
                columns: [
                    {title: $translate("adminName"), data: "adminName"},
                    //{title: $translate('playerId'), data: "playerId"},
                    {title: $translate("platform"), data: "platformName", bSortable: false},
                    {
                        title: $translate('TYPE'), data: "action", sClass: "sumText",
                        render: function (data) {
                            return $translate(data == 'pushNotification' ? 'addPushNotification' : data);
                        }
                    },
                    {title: $translate("Operation Time"), data: "operationTime$"},
                    {title: $translate("remark"), data: "error", bSortable: false},
                    {title: $translate("IP"), data: "localIp", bSortable: false}
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
        vm.dateReformat = function (data) {
            return utilService.$getTimeFromStdTimeFormat(data);
        };
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
            $timeout(()=>{
                $('#topupTable').resize();
            },0)
            $scope.safeApply();
        }

        vm.commonInitTime = function (obj, queryId, reuseDateTime=false) {
            if (!obj) return;

            let startTime, endTime;
            if(reuseDateTime === true && vm[queryId]) {
                startTime = vm[queryId].startTime;
                endTime = vm[queryId].endTime;
            } else {
                let lastMonth = utilService.setNDaysAgo(new Date(), 1);
                startTime = utilService.setThisDayStartTime(new Date(lastMonth));
                endTime = (obj == vm.generalRewardProposalQuery || obj == vm.generalRewardTaskQuery)
                    ? utilService.getTodayStartTime() : utilService.getTodayEndTime();
            }

            obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
            obj.startTime.data('datetimepicker').setLocalDate(new Date(startTime));
            obj.endTime = utilService.createDatePicker(queryId + ' .endTime', {
                language: 'en',
                format: 'yyyy/MM/dd hh:mm:ss'
            });
            obj.endTime.data('datetimepicker').setLocalDate(new Date(endTime));
        };

        vm.getPlatformPartnerSettlementStatus = function(startTime, endTime, callback) {
            let sendData = {
                platformObjId: vm.selectedPlatform._id,
                commissionType: vm.partnerSettlementQuery.commissionType,
                startTime: startTime,
                endTime: endTime
            };
            console.log("getPlatformPartnerSettlementStatus sendData", sendData);
            if(sendData.commissionType) {
                socketService.$socket($scope.AppSocket, 'getPlatformPartnerSettlementStatus', sendData, function (data) {
                    vm.platformPartnerSettlementStatus = data.data;
                    callback();
                });
            } else {
                vm.platformPartnerSettlementStatus = [];
                callback();
            }
        };
        //dtp is dateTimePicker
        vm.commonChangeDatePickerStyle = function(dtp, options) {
            let status = vm.platformPartnerSettlementStatus;
            let monthOffset = options.monthOffset;
            let daysInMonth = dtp.widget[0].querySelectorAll('.datepicker-days tbody .day:not(.old):not(.new)');
            let daysInPreviousMonth = dtp.widget[0].querySelectorAll('.datepicker-days tbody .day.old');
            let daysInNextMonth = dtp.widget[0].querySelectorAll('.datepicker-days tbody .day.new');
            let selectedYear = dtp.getLocalDate().getFullYear();
            let selectedMonth = dtp.getLocalDate().getMonth() + 1;
            let selectedDate = dtp.getLocalDate().getDate();
            let curYear = selectedYear;
            let curMonth = selectedMonth + monthOffset;
            let displayDate;

            function renderStyle(dayHolder, year, month, date) {
                let dayStatus = (status[year] && status[year][month]) ? status[year][month][date] : null;
                switch(dayStatus) {
                    case $scope.constPartnerCommissionLogStatus.SKIPPED:
                        dayHolder.style.background = 'grey';
                        dayHolder.style.textDecoration = 'line-through';
                        break;
                    case $scope.constPartnerCommissionLogStatus.EXECUTED:
                    case $scope.constPartnerCommissionLogStatus.RESET_THEN_EXECUTED:
                    case $scope.constPartnerCommissionLogStatus.EXECUTED_THEN_RESET:
                        dayHolder.style.background = 'green';
                        break;
                    case $scope.constPartnerCommissionLogStatus.PREVIEW:
                    default:
                        dayHolder.style.background = 'white';
                        dayHolder.style.textDecoration = 'none';
                        break;
                }

                dayHolder.style.borderRadius = '0px';
                if(month == curMonth) {
                    dayHolder.style.border = '1px solid black';
                }
                if(date == selectedDate && month == selectedMonth && year == selectedYear) {
                    dayHolder.style.borderRadius = '100%';
                    dayHolder.style.border = '2px solid rgb(51, 122, 183)';
                    dayHolder.style.color = 'black';
                    dayHolder.style.fontWeight = 'bold';
                }
            }

            function dateAdjustment(date) {
                if (date.month < 1) {
                    date.month = 12 + date.month;
                    date.year--;
                } else if (date.month > 12) {
                    date.month = date.month - 12;
                    date.year++;
                }
                return date;
            }

            displayDate = dateAdjustment({year: curYear, month: curMonth});
            curYear = displayDate.year;
            curMonth = displayDate.month;
            //current month
            daysInMonth.forEach(dayHolder => {
                renderStyle(dayHolder, displayDate.year, displayDate.month, parseInt(dayHolder.textContent));
            });
            //previous month
            displayDate = dateAdjustment({year: curYear, month: curMonth-1});
            daysInPreviousMonth.forEach(dayHolder => {
                renderStyle(dayHolder, displayDate.year, displayDate.month, parseInt(dayHolder.textContent));
            });
            //next month
            displayDate = dateAdjustment({year: curYear, month: curMonth+1});
            daysInNextMonth.forEach(dayHolder => {
                renderStyle(dayHolder, displayDate.year, displayDate.month, parseInt(dayHolder.textContent));
            })
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

        function getAdminPlatformName () {
            socketService.$socket($scope.AppSocket, 'getAdminPlatformName', {admin: authService.adminId}, function (data) {
                $scope.$evalAsync(() => {
                    vm.adminPlatformName = data && data.data || [];
                    vm.wechatSessionNickName = []; // reset multiselect
                    vm.wechatSessionCsOfficer =  []; // reset multiselect
                    vm.refreshSPicker();
                })
            })
        }

        vm.getWechatSessionDeviceNickName = function (platformObjIds) {
            if (platformObjIds && platformObjIds.length) {
                socketService.$socket($scope.AppSocket, 'getWechatSessionDeviceNickName', {platformObjIds: platformObjIds}, function (data) {
                    $scope.$evalAsync(() => {
                            vm.wechatSessionNickName = data && data.data || [];
                    })
                })
            } else {
                vm.wechatSessionNickName = [];
            }
        }

        vm.getWechatSessionCsOfficer = function (platformObjIds, deviceNickNames) {
            if (platformObjIds && platformObjIds.length && deviceNickNames && deviceNickNames.length) {
                socketService.$socket($scope.AppSocket, 'getWechatSessionCsOfficer', {platformObjIds: platformObjIds, deviceNickNames: deviceNickNames}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.wechatSessionCsOfficer = data && data.data || [];
                    })
                })
            } else {
                vm.wechatSessionCsOfficer = [];
            }
        }

        vm.getProposalTypeOptionValue = function (proposalType, performTranslate) {
            var result = utilService.getProposalGroupValue(proposalType, performTranslate);
            if (performTranslate) {
                return $translate(result);
            }
            return result
        };

        vm.getProvinceName = function (provinceId, fieldName) {
            socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, function (data) {
                let text = data.data.data ? data.data.data.name : '';
                if (text) {
                    if (fieldName) {
                        vm.selectedProposal.data[fieldName] = text;
                    } else {
                        vm.selectedProposal.data.provinceName = text;
                    }
                }
            });
        }

        vm.getCityName = function (cityId, fieldName) {
            socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, function (data) {
                let text = data.data.data ? data.data.data.name : '';
                if (text) {
                    if (fieldName) {
                        vm.selectedProposal.data[fieldName] = text;
                    } else {
                        vm.selectedProposal.data.cityName = text;
                    }
                }
            });
        }

        vm.showProposalModalNew = function (proposalId, platformObjId) {
            vm.proposalDetailStyle = {};
            vm.proposalDialog = 'proposal';
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: platformObjId || vm.selectedPlatform._id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;

                vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm, $fixTwoDecimalStr);

                if (vm.selectedProposal && vm.selectedProposal.data) {
                    delete vm.selectedProposal.data.betAmount;
                    delete vm.selectedProposal.data.betTime;
                    delete vm.selectedProposal.data.winAmount;
                    delete vm.selectedProposal.data.winTimes;
                }

                if (vm.selectedProposal.data.inputData) {
                    if (vm.selectedProposal.data.inputData.provinceId) {
                        // vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        commonService.getProvinceName($scope, vm.selectedProposal.data.inputData.provinceId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.provinceName = data;
                        });
                    }
                    if (vm.selectedProposal.data.inputData.cityId) {
                        // vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        commonService.getCityName($scope, vm.selectedProposal.data.inputData.cityId).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data.cityName = data;
                        });
                    }
                } else {
                    console.log('vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]', vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"])
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                        // vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE" )
                        commonService.getProvinceName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"];
                        });
                    }
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                        // vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        commonService.getCityName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"];
                        });
                    }
                }

                if (vm.selectedProposal.data['bankAccountProvince']) {
                    socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposal.data['bankAccountProvince']}, function (data) {
                        $scope.$evalAsync(() => {
                            var text = data.data.data ? data.data.data.name : val;
                            vm.selectedProposal.data['bankAccountProvince'] = text;
                        })
                    });
                }

                if (vm.selectedProposal.data['bankAccountCity']) {
                    socketService.$socket($scope.AppSocket, "getCity", {cityId: vm.selectedProposal.data['bankAccountCity']}, function (data) {
                        $scope.$evalAsync(() => {
                            var text = data.data.data ? data.data.data.name : val;
                            vm.selectedProposal.data['bankAccountCity'] = text;
                        })
                    });
                }

                if (vm.selectedProposal.data['districtId']) {
                    socketService.$socket($scope.AppSocket, "getDistrict", {districtId: vm.selectedProposal.data['districtId']}, function (data) {
                        $scope.$evalAsync(() => {
                            var text = data.data.data ? data.data.data.name : val;
                            vm.selectedProposal.data['districtId'] = text;
                        })
                    });
                }
                if (vm.selectedProposal.data['bankAccountDistrict']) {
                    socketService.$socket($scope.AppSocket, "getDistrict", {districtId: vm.selectedProposal.data['bankAccountDistrict']}, function (data) {
                        $scope.$evalAsync(() => {
                            var text = data.data.data ? data.data.data.name : val;
                            vm.selectedProposal.data['bankAccountDistrict'] = text;
                        })
                    });
                }
                if ( vm.selectedProposal.mainType && vm.selectedProposal.mainType == "PlayerBonus" && vm.selectedProposal.status && vm.selectedProposal.status == 'Approved' ) {
                    vm.selectedProposal.status = 'approved';
                }

                $('#modalProposal').modal('show');
                $('#modalProposal').on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })

            })
        }

        vm.showProposalModalNoObjId = function (proposalId) {
            vm.proposalDialog = 'proposal';
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: vm.selectedPlatform._id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;
                let proposalDetail = $.extend({}, vm.selectedProposal.data);
                let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
                for (let i in proposalDetail) {
                    if (checkForHexRegExp.test(proposalDetail[i])) {
                        delete proposalDetail[i];
                    }
                }
                vm.selectedProposal.data = $.extend({}, proposalDetail);
                $('#modalProposal').modal('show');
                $('#modalProposal').on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })

            })
        };

        function loadPlatform() {
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
                $scope.$evalAsync(() => {
                    vm.gameAllTypes = data.data;
                });
                //console.log("getAllGameTypfes",vm.gameAllTypes);
            }, function (data) {
                console.log("create not", data);
            });

            if (!authService.checkViewPermission('Report', 'General', 'Read')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                $scope.$evalAsync(() => {
                    vm.platformList = data.data;
                    //console.log("platformList", vm.platformList);
                    if (vm.platformList.length == 0)return;
                    commonService.sortAndAddPlatformDisplayName(vm.platformList);
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
                });
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
            };

            function sortByDepositId (a, b) {
                return a.depositId - b.depositId
            }

            vm.exportJsonToCSV = function(JSONData, FileTitle, ShowLabel){
                //If JSONData is not an object then JSON.parse will parse the JSON string in an Object
                var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
                var CSV = '';
                //This condition will generate the Label/Header
                if (ShowLabel) {
                    var row = "";
                    //This loop will extract the label from 1st index of on array
                    for (var index in arrData[0]) {
                        //Now convert each value to string and comma-seprated
                        row += index + ',';
                    }
                    row = row.slice(0, -1);
                    //append Label row with line break
                    CSV += row + '\r\n';
                }
                //1st loop is to extract each row
                for (var i = 0; i < arrData.length; i++) {
                    var row = "";
                    //2nd loop will extract each column and convert it in string comma-seprated
                    for (var index in arrData[i]) {
                        row += '"' + arrData[i][index] + '",';
                    }
                    row.slice(0, row.length - 1);
                    //add a line break after each row
                    CSV += row + '\r\n';
                }
                if (CSV == '') {
                    alert("Invalid data");
                    return;
                }
                //Generate a file name
                var filename = FileTitle + (new Date());
                var blob = new Blob([CSV], {
                    type: 'text/csv;charset=utf-8;'
                });
                if (navigator.msSaveBlob) { // IE 10+
                    navigator.msSaveBlob(blob, filename);
                } else {
                    var link = document.createElement("a");
                    if (link.download !== undefined) { // feature detection
                        // Browsers that support HTML5 download attribute
                        var url = URL.createObjectURL(blob);
                        link.setAttribute("href", url);
                        link.style = "visibility:hidden";
                        link.download = FileTitle ? $translate(FileTitle) + ".csv" : "FPMS_Report.csv";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }
                }
            };

            // generate a download for xls
            vm.exportToExcel = function(tableId, reportName) {
                let tab = "";
                let htmlContent = "";

                if(reportName == "PLAYER_DEPOSIT_ANALYSIS_REPORT") {
                    for (let i = 0; i <= vm.playerDepositAnalysis.length - 1; i++) {
                        tab = document.getElementById("playerDepositAnalysisExcelReportTable" + i);
                        if (i != 0) {
                            htmlContent += "<tr></tr>";
                        }
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }
                }else if(reportName == "NEWACCOUNT_REPORT"){
                    tab = document.getElementById(tableId);
                    htmlContent = "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;

                    if(vm.newPlayerQuery && vm.newPlayerQuery.registrationDevice && vm.newPlayerQuery.registrationDevice.length > 0 && document.getElementById("newAccountDeviceTable")) {
                        tab = document.getElementById("newAccountDeviceTable");
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }

                    if(document.getElementById("validPlayerPromoteWay")) {
                        htmlContent += "<tr></tr><tr><td><strong>" + $translate("Valid Player (promote way analysis)") + "</strong></td></tr>";
                        tab = document.getElementById("validPlayerPromoteWay");
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }

                    if(document.getElementById("validPlayerCSOfficer")) {
                        htmlContent += "<tr></tr><tr><td><strong>" + $translate("Valid Player (cs officer analysis)") + "</strong></td></tr>";
                        tab = document.getElementById("validPlayerCSOfficer");
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }

                    if(document.getElementById("validPlayerPartner")) {
                        htmlContent += "<tr></tr><tr><td><strong>" + $translate("Valid Player (partner analysis)") + "</strong></td></tr>";
                        tab = document.getElementById("validPlayerPartner");
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }

                    if(document.getElementById("validPlayerDomain")) {
                        htmlContent += "<tr></tr><tr><td><strong>" + $translate("Valid Player (domain analysis)") + "</strong></td></tr>";
                        tab = document.getElementById("validPlayerDomain");
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }
                }else if(reportName == "PLAYERPARTNER_REPORT") {
                    tab = document.getElementById(tableId);
                    htmlContent = "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;

                    if (document.getElementById("playerPartnerSummaryTable")) {
                        tab = document.getElementById("playerPartnerSummaryTable");
                        htmlContent += "<tr></tr>";
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }
                }else if(reportName == "PARTNERPLAYERBOUNS_REPORT") {
                    tab = document.getElementById(tableId);
                    htmlContent = "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[1].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                }else if(reportName == "PROVIDER_REPORT"){
                    tab = document.getElementById(tableId);
                    htmlContent = "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;

                    if (document.getElementById("operationSummaryTable")) {
                        tab = document.getElementById("operationSummaryTable");
                        htmlContent += "<tr></tr>";
                        htmlContent += "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                    }
                }else if(reportName == "FINANCIAL_REPORT") {

                    if(vm.financialReport.platform.length == 1 && vm.financialReport.displayMethod == "daily" ){
                        tableId = "dailyFinancialReport";
                        tab = document.getElementById(tableId);

                        htmlContent += "<td rowspan=2>" + tab.getElementsByTagName('th')[0].innerHTML +"</td>";
                        let count = 0;
                        for (let i = 1; i <= vm.topUpHeader.length; i++) {
                            let colSpan = vm.topUpHeader[count].topUpDetail.length + 1;
                            htmlContent += "<td colspan=" + colSpan + " style='text-align:center;'>" + tab.getElementsByTagName('th')[i].innerHTML +"</td>";
                            count += 1;
                        }
                        let bonusColSpan = vm.bonusHeader[0].bonusDetail.length + 1;
                        htmlContent += "<td colspan=" + bonusColSpan + " style='text-align:center;'>" + tab.getElementsByTagName('th')[vm.topUpHeader.length + 1].innerHTML;
                        htmlContent += "<td rowspan=2>" + tab.getElementsByTagName('th')[vm.topUpHeader.length + 2].innerHTML;

                        htmlContent += "<tr>";
                        for (let l = 2; l <= vm.topUpHeader.length + 2; l++){
                            htmlContent += tab.getElementsByTagName('tr')[l].innerHTML;
                        }


                        vm.dailyFinancialReportList.forEach(
                            dailyFinancialReportList => {
                                if(dailyFinancialReportList && dailyFinancialReportList.date){
                                    htmlContent += "<tr>";
                                    htmlContent += "<td>" + dailyFinancialReportList.date + "</td>";
                                }

                                dailyFinancialReportList.topUpList.forEach(
                                    topUpList => {

                                        topUpList.topUpDetail = topUpList.topUpDetail.sort(sortByDepositId);
                                        topUpList.topUpDetail.forEach(
                                            topUpDetail => {
                                                htmlContent += "<td>" + topUpDetail.amount + "</td>";

                                            }
                                        )
                                        htmlContent += "<td style='color:red;'>" + topUpList.totalAmount + "</td>";
                                    }
                                )

                                dailyFinancialReportList.bonusList.forEach(
                                    bonusList => {
                                        bonusList.bonusDetail.forEach(
                                            bonusDetail =>{
                                                htmlContent += "<td>" + bonusDetail.amount + "</td>"

                                            }
                                        )
                                        htmlContent += "<td style='color:red;'>" + bonusList.totalAmount + "</td>"
                                    }
                                )

                                dailyFinancialReportList.platformFeeEstimate.forEach(
                                    platformFeeEstimate => {
                                        htmlContent += "<td>" + platformFeeEstimate.totalPlatformFeeEstimate + "</td>"

                                    }
                                )
                            }
                        )

                    }
                    else{
                        tableId = "sumFinancialReport";
                        tab = document.getElementById(tableId);


                        htmlContent += "<td colspan=2>" + tab.getElementsByTagName('th')[0].innerHTML;
                        for (let i = 0; i < vm.sumFinancialReportList.platformFeeEstimateList.length; i++) {
                            htmlContent += "<td>" + tab.getElementsByTagName('td')[i].innerHTML +"</td>";
                        }

                        vm.sumFinancialReportList.topUpList.forEach(
                            topUpList => {
                                if(topUpList && topUpList.groupName){
                                    let rowSpan = topUpList.topUpDetail.length+1;
                                    htmlContent += "<tr>";
                                    htmlContent += "<td rowspan="+rowSpan+" style='text-align:center; vertical-align:middle;'>" + topUpList.groupName + "</td>";

                                    if(topUpList.topUpDetail && topUpList.topUpDetail.length > 0){
                                        topUpList.topUpDetail = topUpList.topUpDetail.sort(sortByDepositId);
                                        topUpList.topUpDetail.forEach(
                                            topUpDetail => {
                                                if(topUpDetail && topUpDetail.depositName){
                                                    if(topUpDetail.topUpTypeId == 2) {
                                                        htmlContent += "<td>" + $translate(String(topUpDetail.depositName))+ "(" + topUpDetail.depositName + "): " +topUpDetail.topUpMethodId + " </td>";
                                                    }else{
                                                        htmlContent += "<td>" + $translate(String(topUpDetail.depositName)) + " </td>";
                                                    }

                                                    if(topUpDetail.topUpDetail && topUpDetail.topUpDetail.length > 0){
                                                        topUpDetail.topUpDetail.forEach(
                                                            topUpDetail=> {
                                                                htmlContent += "<td>" + topUpDetail.amount + "</td> ";
                                                            }
                                                        )
                                                    }
                                                    htmlContent += "<tr>";
                                                }
                                            }
                                        )
                                    }
                                    htmlContent += "<td style='color:red;'>" + topUpList.groupName +" (" +$translate(String("Total Sum")) +")"+ "</td>";

                                    topUpList.totalAmountList.forEach(
                                        totalAmountList    => {
                                            htmlContent += "<td style='color:red;'>" + totalAmountList.totalAmount +"</td>";
                                        }
                                    )
                                    htmlContent += "</tr>";
                                }
                            }
                        )

                        htmlContent += "<td rowspan='3' style='text-align:center;'>" + $translate(String("All Withdrawal"))  + "</td>";

                        vm.sumFinancialReportList.bonusList.forEach(
                            bonusList => {
                                bonusList.groups.forEach(
                                    groups =>{
                                        htmlContent += "<td>"+ $translate(String(groups.typeName)) +"</td>";

                                        groups.bonusDetail.forEach(
                                            bonusDetail =>{
                                                htmlContent += "<td>" + bonusDetail.amount + "</td>"
                                            }
                                        )
                                        htmlContent += "<tr>";
                                    }
                                )

                            }
                        )
                        htmlContent += "<td style='color:red;'>" + $translate(String("All Withdrawal")) +" (" +$translate(String("Total Sum"))+")" + "</td>";

                        vm.sumFinancialReportList.totalSumBonusTopUp.forEach(
                            totalSumBonusTopUp => {
                                htmlContent += "<td style='color:red;'>" + totalSumBonusTopUp.amount + "</td>";
                            }
                        )

                        htmlContent += "<tr><td colspan='2' style='text-align:center;'>" + $translate(String('Total Platform Fee'))+ "</td>";

                        vm.sumFinancialReportList.platformFeeEstimateList.forEach(
                            platformFeeEstimateList => {
                                htmlContent += "<td>" + platformFeeEstimateList.totalPlatformFeeEstimate + "</td>"

                            }
                        )
                    }



                } else{
                    tab = document.getElementById(tableId);
                    htmlContent = "<tr>" + tab.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0].innerHTML + "</tr>" + tab.getElementsByTagName('tbody')[0].innerHTML;
                }

                var tab_text = '<html xmlns:x="urn:schemas-microsoft-com:office:excel">';
                tab_text = tab_text + '<head><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
                tab_text = tab_text + '<x:Name>Test Sheet</x:Name>';
                tab_text = tab_text + '<x:WorksheetOptions><x:Panes></x:Panes></x:WorksheetOptions></x:ExcelWorksheet>';
                tab_text = tab_text + '</x:ExcelWorksheets></x:ExcelWorkbook></xml></head><body>';
                tab_text = tab_text + "<table border='1px'>";
                tab_text = tab_text + htmlContent;
                tab_text = tab_text + '</table></body></html>';
                var fileName = reportName ? $translate(reportName)+ ".xls": "FPMS report.xls";

                //Save the file
                var blob = new Blob([tab_text], { type: "application/vnd.ms-excel;charset=utf-8" })
                window.saveAs(blob, fileName);
            }
        }

        vm.getAliPayGroup = function (data) {
            //rename the alipay-line category
            let result = [];
            if(data && data.length > 0 ){
                result = data.map(item=>{
                    if(item.category){
                        item.name = $translate('Alipay Line') + item.line+ $translate('( All )');
                    }else if(item.includesAllCards){
                        item.name = $translate('Alipay Line') + item.lineGroup + $translate('( include not longer exist )');
                    }
                    return item;
                })
            }
            return result;
        }

        vm.refreshSPicker = () => {
            // without this timeout, 'selectpicker refresh' might done before the DOM able to refresh, which evalAsync doesn't help
            $timeout(function () {
                $('.spicker').selectpicker('refresh');
            }, 0);
        };

        vm.enableDisplayMethodByPlatformList = function () {
            if (vm.platformList.length == 1) {
                vm.financialReport.displayMethod = 'daily';
                vm.isDisableSelectDisplayMethod = false;
            } else {
                vm.financialReport.displayMethod = 'sum';
                vm.isDisableSelectDisplayMethod = true;
            }
        }

        // start of financial report's deposit group setting
        vm.initDepositGroupSetting = function () {
            vm.deletingDepositGroup = null;
            vm.editConfig = false;
            vm.noGroupDepositMethodList = vm.depositMethodArr;
            vm.noGroupMerchantTopUpTypeList = vm.merchantTopUpTypeArr;
            vm.noGroupAlipayWechatPayList = vm.alipayWechatPayArr;
            vm.getDepositGroups();
        };

        vm.getDepositGroups = () => {
            return $scope.$socketPromise('getDepositGroups', {}).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.depositGroups = data.data;
                    console.log('vm.depositGroups', vm.depositGroups);
                    vm.getNoInGroupDepositSetting();
                });
            });
        };

        vm.addDepositSettingToGroup = (depositSetting, index, typeId) => {
            if (!depositSetting || !depositSetting.group) return;
            vm.depositGroups.push({
                depositName: depositSetting.name,
                depositParentDepositId: depositSetting.group,
                topUpTypeId: typeId,
                topUpMethodId: typeId != 3 && typeId != 4 ? depositSetting.typeId : null
            });

            if (typeId == 1) {
                //manual topup
                vm.noGroupDepositMethodList.splice(index, 1);
            } else if (typeId == 2) {
                //online topup
                vm.noGroupMerchantTopUpTypeList.splice(index, 1);
            } else if (typeId == 3 || typeId == 4) {
                // alipay or wechatpay
                vm.noGroupAlipayWechatPayList.splice(index, 1);
            }
        };

        vm.addNewDepositGroup = () => {
            socketService.$socket($scope.AppSocket, 'addNewDepositGroup', {}, function (data) {
                $scope.$evalAsync(() => {
                    vm.depositGroups.push(data.data);
                });
            });
        };

        vm.updateDepositGroup = () => {
            return $scope.$socketPromise('updateDepositGroups', {
                depositGroups: vm.depositGroups,
            }).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.initDepositGroupSetting();
                });
            });
        };

        vm.filterDepositSettingGroup = (parentDepositId) => {
            return (depositSettingGroup) => {
                return depositSettingGroup.depositParentDepositId == parentDepositId;
            }
        };

        vm.removeDepositSettingFromGroup = (depositSettingGroup) => {
            vm.depositGroups = vm.depositGroups.filter(depositGroup => depositGroup.depositName !== depositSettingGroup.depositName && depositSettingGroup.depositParentDepositId !== -1);
            vm.getNoInGroupDepositSetting();
            $scope.$evalAsync();
        };

        vm.getNoInGroupDepositSetting = () => {
            vm.noGroupDepositMethodList = [];
            vm.noGroupMerchantTopUpTypeList = [];
            vm.noGroupAlipayWechatPayList = [];

            filterInGroupDeposit(vm.depositMethodArr, vm.noGroupDepositMethodList);
            filterInGroupDeposit(vm.merchantTopUpTypeArr, vm.noGroupMerchantTopUpTypeList);
            filterInGroupDeposit(vm.alipayWechatPayArr, vm.noGroupAlipayWechatPayList);

            function filterInGroupDeposit(oriDepositList, noGroupDepositList) {
                for (let depositMethod in oriDepositList) {
                    let isInGroup = false;
                    vm.depositGroups.forEach((depositGroup) => {
                        if (depositGroup.depositParentDepositId !== -1 && oriDepositList[depositMethod].name === depositGroup.depositName
                            && oriDepositList[depositMethod].typeId === depositGroup.topUpMethodId) {
                            //manual and online topup
                            isInGroup = true;
                        } else if (depositGroup.depositParentDepositId !== -1 && oriDepositList[depositMethod].name === depositGroup.depositName
                            && (depositGroup.topUpTypeId === 3 || depositGroup.topUpTypeId === 4) && oriDepositList[depositMethod].typeId === depositGroup.topUpTypeId) {
                            //alipay and wechatPay topup
                            isInGroup = true;
                        }
                    });

                    if (!isInGroup)
                        noGroupDepositList.push(oriDepositList[depositMethod]);

                    vm.removeGroupKey(noGroupDepositList);
                }
            }

            $scope.$evalAsync();
        };

        vm.removeGroupKey = (list) => {
            if (list && list.length > 0) {
                list.forEach(el => {
                    if (el && el.hasOwnProperty('group')) {
                        delete el.group;
                    }
                });
            }
        };

        vm.deleteDepositGroup = (depositGroup) => {
            socketService.$socket($scope.AppSocket, 'deleteDepositGroup', {_id: depositGroup._id}, function (data) {
                $scope.$evalAsync(() => {
                    vm.initDepositGroupSetting();
                });
            });
        };
        // end of financial report's deposit group setting

        vm.getProviderListByPlatform = function(platformObjIdList) {
            let query = {};

            if(platformObjIdList && platformObjIdList.length){
                query.platformObjIdList = platformObjIdList;
            }

            vm.providerListByPlatform = [];
            socketService.$socket($scope.AppSocket, 'getProviderListByPlatform', query, function (providerList) {
                $scope.$evalAsync(() => {
                    console.log("Provider list ",providerList);
                    if(providerList && providerList.data){
                        let validGameProviders = []; //game provider with game type
                        providerList.data.forEach(item => {
                            if (item.gameTypes && Object.keys(item.gameTypes).length) {
                                validGameProviders.push(item);
                            }
                        })

                        vm.allGameProviders = validGameProviders;
                    }

                    setTimeout(function () {
                        vm.commonInitTime(vm.consumptionModeQuery, '#consumptionModeReportQuery')

                        $('select#selectBetType').multipleSelect({
                            allSelected: $translate("All Selected"),
                            selectAllText: $translate("Select All"),
                            displayValues: true,
                            countSelected: $translate('# of % selected'),
                        });
                        var $multiReward = ($('select#selectBetType').next().find('.ms-choice'))[0];

                        $('select#selectBetType').next().on('click', 'li input[type=checkbox]', function () {
                            var upText = $($multiReward).text().split(',').map(item => {
                                return $translate(item);
                            }).join(',');
                            $($multiReward).find('span').text(upText)
                        });

                        $("select#selectBetType").multipleSelect("checkAll");

                        vm.consumptionModeQuery.pageObj = utilService.createPageForPagingTable("#consumptionModeTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "consumptionModeQuery", vm.searchConsumptionModeRecord)
                        });
                    });
                });
            });
        };

        vm.dynamicPlatform = function () {
            vm.allGameProviders = [];
            if (vm.consumptionModeQuery.platformList) {
                vm.getProviderListByPlatform(vm.consumptionModeQuery.platformList);
            } else {
                vm.getProviderListByPlatform(vm.platformList.map(item => item._id));
            }
        };

        vm.dynamicGameType = function () {
            if (vm.consumptionModeQuery.gameProvider) {
                vm.providerGameType = [];
                let selectedGameProvider = JSON.parse(vm.consumptionModeQuery.gameProvider);
                for (let key in selectedGameProvider.gameTypes) {
                    vm.providerGameType.push({gameType: key, betType: selectedGameProvider.gameTypes[key]})
                }
            }
        }

        vm.dynamicBetType = function () {
            if (vm.consumptionModeQuery.gameType) {
                let selectedGameType = JSON.parse(vm.consumptionModeQuery.gameType);
                vm.gameBetType = selectedGameType.betType;
                setTimeout(function () {
                    $("select#selectBetType").multipleSelect("refresh");
                    $("select#selectBetType").multipleSelect("checkAll");
                }, 0)
            }
        }

        vm.changePlayerCredibility = function () {
            if(vm.providerConsumptionQuery.platform){
                $scope.$evalAsync(() => {
                    if (vm.providerConsumptionQuery && vm.providerConsumptionQuery.table) {
                        delete vm.providerConsumptionQuery.table;
                        $('#providerConsumptionReportTable').DataTable().destroy().draw();
                        $('#providerConsumptionReportTable').prop('innerHTML', "");
                        vm.providerConsumptionQuery.totalCount = 0;
                        vm.reportSearchTime = 0;
                        vm.commonInitTime(vm.providerConsumptionQuery, '#providerConsumptionQuery');
                        vm.providerConsumptionQuery.pageObj = utilService.createPageForPagingTable("#providerConsumptionReportTablePage", {}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "providerConsumptionQuery", vm.searchProviderConsumptionReport)
                        });
                    }
                })


                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: vm.providerConsumptionQuery.platform}, function (data) {
                    $scope.$evalAsync(() => {
                        if(data && data.data){
                            vm.playerCredibilityRemark = data.data.map(item => {
                                item.platform$ = "";
                                if(item && item.platform && vm.platformList && vm.platformList.length){
                                    let filteredPlatform = vm.platformList.filter(a => a && a._id && (a._id.toString() === item.platform.toString()));
                                    item.platform$ = filteredPlatform && filteredPlatform[0] && filteredPlatform[0].name ? filteredPlatform[0].name : "";
                                }

                                return item;
                            });
                        }
                    });
                });
            }
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

        vm.getPaymentMonitorLockedAdmin = function() {
            socketService.$socket($scope.AppSocket, 'getPaymentMonitorLockedAdmin', {platform: vm.selectedPlatform._id}, function (data) {
                $scope.$evalAsync(() => {
                    vm.paymentMonitorLockedAdmin = data.data;
                })
            }, function (error){
                console.error(error);
            });
        };

        vm.getPaymentMonitorReport = function(newSearch) {
            $('#paymentMonitorReportTableSpin').show();

            if (vm.paymentMonitorQuery.mainTopupType === '0' || vm.paymentMonitorQuery.mainTopupType === '1' || vm.paymentMonitorQuery.mainTopupType === '3' || vm.paymentMonitorQuery.mainTopupType === '4' || vm.paymentMonitorQuery.mainTopupType === '5') {
                vm.paymentMonitorTotalQuery.topupType = '';
                vm.paymentMonitorTotalQuery.merchantGroup = '';
                vm.paymentMonitorTotalQuery.merchantNo = '';
            }

            let sendObj = {
                playerName: vm.paymentMonitorQuery.playerName,
                proposalNo: vm.paymentMonitorQuery.proposalID,
                mainTopupType: vm.paymentMonitorQuery.mainTopupType,
                userAgent: vm.paymentMonitorQuery.userAgent,
                topupType: vm.paymentMonitorQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
                depositMethod: vm.paymentMonitorQuery.depositMethod,
                bankTypeId: vm.paymentMonitorQuery.bankTypeId,
                merchantNo: vm.paymentMonitorQuery.merchantNo,
                startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),
                platformList: vm.paymentMonitorQuery.platformList ? vm.paymentMonitorQuery.platformList : vm.platformList.map(item => item._id),
                currentPlatformId: vm.selectedPlatform._id,
                index: newSearch ? 0 : (vm.paymentMonitorQuery.index || 0),
                limit: vm.paymentMonitorQuery.limit || 10,
                sortCol: vm.paymentMonitorQuery.sortCol || {createTime: -1}
            };

            vm.paymentMonitorQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo : null;
            if(vm.paymentMonitorQuery.merchantNo && vm.paymentMonitorQuery.merchantNo.length == 1 && vm.paymentMonitorQuery.merchantNo.indexOf('MMM4-line2') != -1){
                sendObj.line = '2';
                vm.paymentMonitorQuery.line = '2';
                sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo.filter(merchantData=>{
                    return merchantData != 'MMM4-line2';
                })
            }else{
                vm.paymentMonitorQuery.line = null;
            }

            console.log('sendObj', sendObj);

            vm.reportSearchTimeStart = new Date().getTime();
            socketService.$socket($scope.AppSocket, 'getPaymentMonitorReport', sendObj, function (data) {
                $('#paymentMonitorReportTableSpin').hide();
                findReportSearchTime();
                console.log('getPaymentMonitorReport', data);
                vm.paymentMonitorQuery.totalCount = data.data.size || 0;
                vm.drawPaymentMonitorReport(data.data.data.filter(item => {
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
                            item.merchantNo$ = item && item.data && item.data.merchantName ? item.data.merchantName : vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
                        } else {
                            //show topup type for other types
                            item.topupTypeStr = $translate(item.type.name);
                        }

                        item.merchantCount$ = item.merchantCurrentCount + "/" + item.merchantTotalCount + " (" + item.merchantGapTime + ")";
                        item.playerCount$ = item.playerCurrentCount + "/" + item.playerTotalCount + " (" + item.playerGapTime + ")";
                        item.status$ = $translate(item.status);
                        item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.proposalCreateTime));
                        return item;
                    }
                }), {}, newSearch);

                $scope.$evalAsync();
            }, function (err) {
                $('#paymentMonitorReportTableSpin').hide();
                console.log(err);
            }, true);
        };

        vm.drawPaymentMonitorReport = function (data, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorQuery.aaSorting || [[14, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'data.amount', bSortable: true, 'aTargets': [13]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [14]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('Website'),
                        data: "website",
                    },
                    {
                        "title": $translate('proposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            return '<a ng-click="vm.showProposalModal2(\'' + data + '\')">' + data + '</a>';
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
                    {title: $translate('Total Business Acc'), data: "merchantCount$", sClass: 'merchantCount'},
                    {title: $translate('STATUS'), data: "status$"},
                    {title: $translate('PLAYER_NAME'), data: "playerObjId.name", sClass: "playerCount"},
                    {title: $translate('Real Name'), data: "playerObjId.realName", sClass: "sumText playerCount"},
                    {title: $translate('Total Members'), data: "playerCount$", sClass: "sumText playerCount"},
                    {title: $translate('TopUp Amount'), data: "amount", sClass: "sumFloat alignRight playerCount"},

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
                    if (aData.merchantTotalCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                        $(nRow).addClass('merchantExceed');
                        if (vm.selectedPlatform.monitorMerchantUseSound) {
                            checkMerchantNotificationAlert(aData);
                        }
                        if (!vm.lastMerchantExceedId || vm.lastMerchantExceedId < aData._id) {
                            vm.lastMerchantExceedId = aData._id;
                        }
                    }

                    if (aData.playerTotalCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                        $(nRow).addClass('playerExceed');
                        if (vm.selectedPlatform.monitorPlayerUseSound) {
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
            utilService.createDatatableWithFooter('#paymentMonitorReportTable', tableOptions, {});
            vm.paymentMonitorQuery.pageObj.init({maxCount: size}, newSearch);
            $('#paymentMonitorReportTable').off('order.dt');
            $('#paymentMonitorReportTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'paymentMonitorQuery', vm.getPaymentMonitorReport);
            });
            $('#paymentMonitorReportTable').resize();
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

        vm.getTopupReportMerchantFilterDetails = function() {
            vm.merchantNoNameObj = {};
            vm.merchantGroupObj = [];
            let merGroupName = {};

            socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                $scope.$evalAsync(() => {
                    let merGroupList = {};


                    if (data && data.data && data.data.merchantTypes) {
                        data.data.merchantTypes.forEach(mer => {
                            merGroupName[mer.merchantTypeId] = mer.name;
                        });

                        vm.merchantTypes = data.data.merchantTypes;
                        vm.merchantGroupObj = utilService.createMerGroupList(merGroupName, merGroupList);
                    }
                })
            });

            let platformQuery = vm.queryTopup.platformList && vm.queryTopup.platformList.length > 0 ? vm.queryTopup.platformList : vm.platformList.map(item => item._id);
            socketService.$socket($scope.AppSocket, 'getMerchantNBankCardByPlatforms', {platformList: platformQuery}, function (data) {
                $scope.$evalAsync(() => {
                    if (data.data && data.data.merchants) {
                        let merGroupList = {};

                        vm.merchantLists = data.data.merchants;
                        vm.merchantNoList = data.data.merchants.filter(mer => {
                            $scope.merchantNoNameObj[mer.merchantNo] = mer.name;
                            return mer.status !== 'DISABLED';
                        });

                        vm.merchantNoList.forEach(item => {
                            merGroupList[item.merchantTypeId] = merGroupList[item.merchantTypeId] || {list: []};
                            merGroupList[item.merchantTypeId].list.push(item.merchantNo);
                        });

                        Object.keys(vm.merchantNoList).forEach(item => {
                            let merchantTypeId = vm.merchantNoList[item].merchantTypeId;
                            if (String(merchantTypeId) === "9999") {
                                vm.merchantNoList[item].merchantTypeName = $translate('BankCardNo');
                            } else if (String(merchantTypeId) === "9998") {
                                vm.merchantNoList[item].merchantTypeName = $translate('PERSONAL_WECHAT_GROUP');
                            } else if (String(merchantTypeId) === "9997") {
                                vm.merchantNoList[item].merchantTypeName = $translate('PERSONAL_ALIPAY_GROUP');
                            } else if (String(merchantTypeId) !== "9997" && String(merchantTypeId) !== "9998" && String(merchantTypeId) !== "9999") {
                                let merchantInfo = vm.merchantTypes && vm.merchantTypes.filter(mitem => String(mitem.merchantTypeId) === String(merchantTypeId)) || [];
                                vm.merchantNoList[item].merchantTypeName = merchantInfo[0] ? merchantInfo[0].name : "";
                            } else {
                                vm.merchantNoList[item].merchantTypeName = '';
                            }
                        });
                        vm.merchantCloneList = JSON.parse(JSON.stringify(vm.merchantNoList));
                        vm.merchantNoList = vm.getAliPayGroup(vm.merchantNoList);
                        vm.merchantCloneList = vm.getAliPayGroup(vm.merchantCloneList);
                        vm.merchantGroupObj = utilService.createMerGroupList(merGroupName, merGroupList);
                        vm.merchantGroupCloneList = vm.merchantGroupObj;
                    }
                });
            });
        };

        function drawReportQuery (choice, isReset) {
            vm.merchantNoNameObj = {};
            vm.merchantGroupObj = [];

            vm.merchantTypes = $scope.merchantTypes;
            vm.merchantGroupObj = $scope.merchantGroupObj;
            vm.merchantLists = $scope.merchantLists;
            vm.merchantNoList = vm.getAliPayGroup($scope.merchantNoList);
            vm.merchantCloneList = vm.getAliPayGroup($scope.merchantCloneList);
            vm.merchantGroupObj = $scope.merchantGroupObj;
            vm.merchantGroupCloneList = $scope.merchantGroupCloneList;

            socketService.$socket($scope.AppSocket, 'getBankTypeList', {platform: vm.selectedPlatform._id}, function (data) {
                $scope.$evalAsync(() => {
                    if (data && data.data && data.data.data) {
                        vm.allBankTypeList = {};
                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId) {
                                vm.allBankTypeList[item.id] = item.name;
                            }
                        })
                    }
                })
            });

            switch (choice) {
                case "TOPUP_REPORT":
                    vm.queryTopup = {'merchantNo':[]};
                    vm.queryTopup.totalCount = 0;
                    vm.queryTopup.totalPlayer = 0;
                    vm.resetTopupRecord();
                    vm.reportSearchTime = 0;
                    $('#topupTable').remove();

                    vm.initAccs();
                    endLoadMultipleSelect('.merchantNoList');

                    utilService.actionAfterLoaded("#topupTablePage", function () {
                        // $timeout(function(){
                        //   $('.merchantNoList').selectpicker('refresh');
                        // },50)
                        setTimeout(()=>{
                            document.getElementById('topupReportQueryProposalId').dispatchEvent(new CustomEvent('change'));
                            endLoadMultipleSelect('.spicker');
                            endLoadMultipleSelect('.merchantNoList');
                        },50);
                        vm.commonInitTime(vm.queryTopup, '#topUpReportQuery');
                        vm.queryTopup.merchantType = null;
                        vm.queryTopup.pageObj = utilService.createPageForPagingTable("#topupTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "queryTopup", vm.searchTopupRecord)
                        });
                        $scope.$evalAsync();

                    });
                    break;
                case "PROPOSAL_REPORT":
                    vm.proposalQuery = {aaSorting: [[9, "desc"]], sortCol: {createTime: -1}};
                    vm.proposalQuery.status = 'all';
                    vm.proposalQuery.promoType = '';
                    vm.proposalQuery.totalCount = 0;
                    vm.proposalQuery.totalPlayer = 0;
                    vm.proposalQuery.proposalTypeId = '';
                    vm.reportSearchTime = 0;
                    if (isReset) {
                        vm.proposalQuery.limit = undefined;
                        vm.proposalQuery.pageObj = utilService.createPageForPagingTable("#proposalTablePage", {pageSize: 30}, $translate, vm.proposalTablePageChange);
                    }

                    endLoadMultipleSelect('.select');

                    socketService.$socket($scope.AppSocket, 'getBankTypeList', {platform: vm.selectedPlatform._id}, function (data) {
                        $scope.$evalAsync(() => {
                            if (data && data.data && data.data.data) {
                                vm.allBankTypeList = {};
                                data.data.data.forEach(item => {
                                    if (item && item.bankTypeId) {
                                        vm.allBankTypeList[item.id] = item.name;
                                    }
                                })
                            }
                        })
                    });

                    socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                        vm.allGameProviderById = {};
                        data.data.map(item => {
                            vm.allGameProviderById[item._id] = item;
                        });
                        console.log("vm.allGameProviderById", vm.allGameProviderById);
                    });

                    utilService.actionAfterLoaded("#proposalTablePage", function () {
                        vm.commonInitTime(vm.proposalQuery, '#proposalReportQuery')

                        setTimeout(()=>{
                            document.getElementById('proposalReportQueryProposalId').dispatchEvent(new CustomEvent('change'));
                            endLoadMultipleSelect('.spicker');
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

                            $('select#selectPromoType').multipleSelect({
                                allSelected: $translate("All Selected"),
                                selectAllText: $translate("Select All"),
                                displayValues: true,
                                countSelected: $translate('# of % selected'),
                            });
                            var $multiPromo = ($('select#selectPromoType').next().find('.ms-choice'))[0];
                            $('select#selectPromoType').next().on('click', 'li input[type=checkbox]', function () {
                                var upText = $($multiPromo).text().split(',').map(item => {
                                    return $translate(item);
                                }).join(',');
                                $($multiPromo).find('span').text(upText)
                            });
                            $("select#selectPromoType").multipleSelect("checkAll");

                            $('select#selectRewardType').multipleSelect({
                                allSelected: $translate("All Selected"),
                                selectAllText: $translate("Select All"),
                                displayValues: true,
                                countSelected: $translate('# of % selected'),
                            });

                            var $multiReward = ($('select#selectRewardType').next().find('.ms-choice'))[0];
                            $('select#selectRewardType').next().on('click', 'li input[type=checkbox]', function () {
                                var upText = $($multiReward).text().split(',').map(item => {
                                    return $translate(item);
                                }).join(',');
                                $($multiReward).find('span').text(upText)
                            });
                            $("select#selectRewardType").multipleSelect("checkAll");
                        },100);
                        vm.proposalQuery.pageObj = utilService.createPageForPagingTable("#proposalTablePage", {pageSize: 30}, $translate, vm.proposalTablePageChange);
                    });
                    break;
                case "FINANCIAL_POINTS_REPORT":
                    vm.financialQuery = {aaSorting: [[9, "desc"]], sortCol: {createTime: -1}};
                    vm.financialQuery.totalCount = 0;
                    vm.reportSearchTime = 0;

                    endLoadMultipleSelect('.select');

                    socketService.$socket($scope.AppSocket, 'getBankTypeList', {platform: vm.selectedPlatform._id}, function (data) {
                        $scope.$evalAsync(() => {
                            if (data && data.data && data.data.data) {
                                vm.allBankTypeList = {};
                                data.data.data.forEach(item => {
                                    if (item && item.bankTypeId) {
                                        vm.allBankTypeList[item.id] = item.name;
                                    }
                                })
                            }
                        })
                    });

                    setTimeout(function () {
                        vm.commonInitTime(vm.financialQuery, '#financialPointsReportQuery')

                        $('select#selectFinancialPointsType').multipleSelect({
                            allSelected: $translate("All Selected"),
                            selectAllText: $translate("Select All"),
                            displayValues: true,
                            countSelected: $translate('# of % selected'),
                        });
                        var $multiReward = ($('select#selectFinancialPointsType').next().find('.ms-choice'))[0];
                        $('select#selectFinancialPointsType').next().on('click', 'li input[type=checkbox]', function () {
                            var upText = $($multiReward).text().split(',').map(item => {
                                let key = item.trim();
                                let textShow = isNaN(Number(key)) ? item : $scope.financialPointsList[key];
                                return $translate(textShow);
                            }).join(',');
                            $($multiReward).find('span').text(upText)
                        });
                        $("select#selectFinancialPointsType").multipleSelect("checkAll");

                        vm.financialQuery.pageObj = utilService.createPageForPagingTable("#financialPointsTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "financialQuery", vm.searchFinancialPointsRecord)
                        });
                    });
                    break;
                case "CONSUMPTION_MODE_REPORT":
                    vm.consumptionModeQuery = {aaSorting: [[0, "asc"]], sortCol: {playerId: -1}};
                    vm.consumptionModeQuery.totalCount = 0;
                    vm.providerGameType = [];
                    vm.gameBetType = [];
                    vm.reportSearchTime = 0;
                    vm.dynamicPlatform();
                    break;

                case "DX_TRACKING_REPORT":
                    vm.reportSearchTime = 0;
                    vm.dxTrackingQuery = {
                        topUpTimesOperator: ">=",
                        bonusTimesOperator: ">=",
                        topUpAmountOperator: ">=",
                        consumptionTimesOperator: ">="
                    };

                    // Get Departments Detail
                    socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform._id},
                        data => {
                            $scope.$evalAsync(() => {
                                let parentId;
                                vm.queryDepartments = [];
                                vm.queryRoles = [];

                                vm.queryDepartments.push({_id: '', departmentName: 'N/A'});

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

                                endLoadMultipleSelect('.spicker');

                                if (typeof(callback) == 'function') {
                                    callback(data.data);
                                }
                            });
                        }
                    );


                    utilService.actionAfterLoaded('#dxTrackingReportTable', function () {
                        let yesterday = utilService.setNDaysAgo(new Date(), 1);
                        let yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                        let todayEndTime = utilService.getTodayEndTime();
                        vm.setupMultiInputDXTracking();
                        vm.dxTrackingQuery.totalCount = 0;
                        vm.dxTrackingQuery.start = utilService.createDatePicker('#dxTrackingReportQuery .startTime');
                        vm.dxTrackingQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.dxTrackingQuery.end = utilService.createDatePicker('#dxTrackingReportQuery .endTime');
                        vm.dxTrackingQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                        vm.dxTrackingQuery.queryStart = utilService.createDatePicker('#dxTrackingReportQuery .queryStartTime');
                        vm.dxTrackingQuery.queryStart.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.dxTrackingQuery.queryEnd = utilService.createDatePicker('#dxTrackingReportQuery .queryEndTime');
                        vm.dxTrackingQuery.queryEnd.data('datetimepicker').setLocalDate(new Date(todayEndTime));

                    });
                    break;



                case "DX_NEWACCOUNT_REPORT":
                    vm.reportSearchTime = 0;
                    utilService.actionAfterLoaded('#dxNewPlayerReportTable', function () {
                        let yesterday = utilService.setNDaysAgo(new Date(), 1);
                        let yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                        let todayEndTime = utilService.getTodayEndTime();

                        // Get Promote CS and way lists
                        // vm.allPromoteWay = {};
                        // let query = {
                        //     platformId: vm.selectedPlatform._id
                        // };
                        // socketService.$socket($scope.AppSocket, 'getAllPromoteWay', query,
                        //     function (data) {
                        //         $scope.$evalAsync(() => {
                        //             vm.allPromoteWay = data.data;
                        //             endLoadMultipleSelect('.spicker');
                        //         })
                        //     },
                        //     function (err) {
                        //         console.log(err);
                        //     }
                        // );
                        //
                        // // Get Departments Detail
                        // socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform._id},
                        //     data => {
                        //         $scope.$evalAsync(() => {
                        //             let parentId;
                        //             vm.queryDepartments = [];
                        //             vm.queryRoles = [];
                        //             vm.queryAdmins = [];
                        //
                        //             vm.queryDepartments.push({_id: '', departmentName: 'N/A'});
                        //
                        //             data.data.map(e => {
                        //                 if (e.departmentName == vm.selectedPlatform.name) {
                        //                     vm.queryDepartments.push(e);
                        //                     parentId = e._id;
                        //                 }
                        //             });
                        //
                        //             data.data.map(e => {
                        //                 if (String(parentId) == String(e.parent)) {
                        //                     vm.queryDepartments.push(e);
                        //                 }
                        //             });
                        //
                        //             endLoadMultipleSelect('.spicker');
                        //
                        //             if (typeof(callback) == 'function') {
                        //                 callback(data.data);
                        //             }
                        //         });
                        //     }
                        // );

                        vm.dxNewPlayerQuery = {
                            // days: 1,
                            valueScoreOperator: ">=",
                            topUpTimesOperator: ">=",
                            bonusTimesOperator: ">=",
                            topUpAmountOperator: ">="
                        };
                        vm.dxNewPlayerQuery.totalCount = 0;
                        vm.dxNewPlayerQuery.start = utilService.createDatePicker('#dxNewPlayerReportQuery .startTime');
                        vm.dxNewPlayerQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.dxNewPlayerQuery.end = utilService.createDatePicker('#dxNewPlayerReportQuery .endTime');
                        vm.dxNewPlayerQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                        vm.dxNewPlayerQuery.queryStart = utilService.createDatePicker('#dxNewPlayerReportQuery .queryStartTime');
                        vm.dxNewPlayerQuery.queryStart.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.dxNewPlayerQuery.queryEnd = utilService.createDatePicker('#dxNewPlayerReportQuery .queryEndTime');
                        vm.dxNewPlayerQuery.queryEnd.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    });
                    break;
                case "PLAYERDOMAIN_REPORT":
                    vm.playerDomain = {totalCount: 0};
                    vm.playerDomain.topUpTimesOperator = ">=";
                    vm.playerDomain.playerValueOperator = ">=";
                    vm.playerDomain.registrationInterface = "";
                    vm.playerDomain.isNewSystem = "";
                    vm.playerDomain.playerType = "Real Player (all)";
                    vm.reportSearchTime = 0;

                    utilService.actionAfterLoaded("#playerDomainReportTablePage", function () {

                        vm.changePlayerDomainPlatform();

                        vm.commonInitTime(vm.playerDomain, '#playerDomainReportQuery');
                        vm.playerDomain.pageObj = utilService.createPageForPagingTable("#playerDomainReportTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "playerDomain", vm.searchPlayerDomainReport)
                        });
                        vm.searchPlayerDomainReport(true);
                    });
                    break;
                case "ReferralRewardReport":
                    vm.referralRewardQuery = {};
                    vm.referralRewardQuery.totalCount = 0;
                    vm.reportSearchTime = 0;

                    utilService.actionAfterLoaded("#referralRewardReportTablePage", function () {
                        vm.commonInitTime(vm.referralRewardQuery, '#referralRewardQuery');
                        vm.referralRewardQuery.pageObj = utilService.createPageForPagingTable("#referralRewardReportTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "referralRewardQuery", vm.searchReferralRewardReport)
                        });
                    });
                    break;
                case "RewardReport":
                    vm.rewardTypeName = 'ALL';
                    vm.currentRewardCode = 'ALL';
                    vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[3]);
                    vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[1]);
                    vm.currentRewardTaskName = "ALL";
                    vm.rewardReportAnalysis = {periodText: "day"};
                    vm.reportSearchTime = 0;

                    // vm.allRewardProposalType = [];
                    // if (vm.allProposalType && vm.allProposalType.length) {
                    //     vm.allProposalType.forEach(item => {
                    //         if (vm.getProposalTypeOptionValue(item, false) == "Reward Proposal") {
                    //             vm.allRewardProposalType.push(item);
                    //         }
                    //     })
                    // }

                    vm.getAllProposalTypeByPlatform();

                    utilService.actionAfterLoaded(('#rewardReportAnalysis'), function () {
                        $('select#selectRewardProposalType').multipleSelect({
                            allSelected: $translate("All Selected"),
                            selectAllText: $translate("Select All"),
                            displayValues: true,
                            countSelected: $translate('# of % selected'),
                        });
                        var $multi = ($('select#selectRewardProposalType').next().find('.ms-choice'))[0];
                        $('select#selectRewardProposalType').next().on('click', 'li input[type=checkbox]', function () {
                            var upText = $($multi).text().split(',').map(item => {
                                return $translate(item);
                            }).join(',');
                            $($multi).find('span').text(upText)
                        });
                        $("select#selectRewardProposalType").multipleSelect("checkAll");


                        $('select#selectRewardAnalysisType').multipleSelect({
                            allSelected: $translate("All Selected"),
                            selectAllText: $translate("Select All"),
                            displayValues: true,
                            countSelected: $translate('# of % selected'),
                        });
                        var $multiReward = ($('select#selectRewardAnalysisType').next().find('.ms-choice'))[0];
                        $('select#selectRewardAnalysisType').next().on('click', 'li input[type=checkbox]', function () {
                            var upText = $($multiReward).text().split(',').map(item => {
                                return $translate(item);
                            }).join(',');
                            $($multiReward).find('span').text(upText)
                        });
                        $("select#selectRewardAnalysisType").multipleSelect("checkAll");

                        var tablePanel = $('#rewardReportAnalysis .tableDiv');
                        var graphPanel = $('#rewardReportAnalysis .graphDiv');
                        var height = $(tablePanel).width() * .7;
                        $(graphPanel).height(height);
                        $(tablePanel).css('max-height', height + 'px');
                        vm.rewardReportAnalysis.startTime = utilService.createDatePicker('#rewardReportAnalysis .startTime');
                        vm.rewardReportAnalysis.endTime = utilService.createDatePicker('#rewardReportAnalysis .endTime');
                        vm.rewardReportAnalysis.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                        vm.rewardReportAnalysis.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    })
                    break;
                case 'PLAYER_ALIPAY_ACCOUNT_REPORT':
                    vm.playerAlipayAccReport = {};
                    vm.playerAlipayAccReport.totalCount = 0;
                    vm.reportSearchTime = 0;
                    commonService.commonInitTime(utilService, vm, 'playerAlipayAccReport', 'startTime', '#playerAlipayAccountReportStartTime', utilService.getTodayStartTime());
                    commonService.commonInitTime(utilService, vm, 'playerAlipayAccReport', 'endTime', '#playerAlipayAccountReportEndTime', utilService.getTodayEndTime());
                    break;
                case 'FINANCIAL_REPORT':
                    vm.financialReport = {};
                    vm.enableDisplayMethodByPlatformList();
                    vm.dailyFinancialReportList = [];
                    vm.sumFinancialReportList = {};
                    vm.reportSearchTime = 0;
                    setTimeout(function () {
                        utilService.actionAfterLoaded(('#financialReport'), function () {
                            $('select#selectFinancialReportPlatform').multipleSelect({
                                allSelected: $translate("All Selected"),
                                selectAllText: $translate("Select All"),
                                displayValues: true,
                                countSelected: $translate('# of % selected'),
                            });
                            let $multi = ($('select#selectFinancialReportPlatform').next().find('.ms-choice'))[0];
                            $('select#selectFinancialReportPlatform').next().on('click', 'li input[type=checkbox]', function () {

                                $scope.$evalAsync(() => {
                                    if ($($multi).text() == '') {
                                        vm.financialReport.displayMethod = '';
                                        vm.isDisableSelectDisplayMethod = false;
                                    } else if ($($multi).text().includes('/') || $($multi).text().includes('全选')) {
                                        vm.enableDisplayMethodByPlatformList();
                                    } else {
                                        let selectedPlatform = $($multi).text().split(',');
                                        let count = selectedPlatform.length;

                                        if (count === 1) {
                                            vm.financialReport.displayMethod = 'daily';
                                            vm.isDisableSelectDisplayMethod = false;
                                        } else {
                                            vm.financialReport.displayMethod = 'sum';
                                            vm.isDisableSelectDisplayMethod = true;
                                        }
                                    }
                                });

                                let upText = $($multi).text().split(',').map(item => {
                                    let textShow = '';
                                    vm.platformList.forEach(platform => {
                                        if (platform && platform._id && item && (platform._id.toString() == item.trim().toString())) {
                                            textShow = platform.name;
                                        } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                            textShow = item;
                                        }
                                    });
                                    return textShow;
                                }).join(',');
                                $($multi).find('span').text(upText)
                            });
                            $("select#selectFinancialReportPlatform").multipleSelect("checkAll");

                            let today = new Date();
                            let todayEndTime = today.setHours(23, 59, 59, 999);
                            vm.financialReport.startTime = utilService.createDatePicker('#financialReport .startTime');
                            vm.financialReport.endTime = utilService.createDatePicker('#financialReport .endTime');
                            vm.financialReport.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
                            vm.financialReport.endTime.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                            $('#dailyFinancialReport').hide();
                            $('#sumFinancialReport').hide();
                        });
                    });
                    break;
            }

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

            if (choice == "PROVIDER_REPORT") {
                vm.queryOperation = {};
                vm.queryOperation.providerId = 'all';
                vm.reportSearchTime = 0;
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
            else if (choice == "DEVICE_REPORT") {
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded('#deviceReportTablePage', function () {
                    // Get Promote CS and way lists
                    vm.allPromoteWay = {};
                    let query = {
                        platformId: vm.selectedPlatform._id
                    };
                    socketService.$socket($scope.AppSocket, 'getAllPromoteWay', query,
                        function (data) {
                            $scope.$evalAsync(() => {
                                vm.allPromoteWay = data.data;
                                endLoadMultipleSelect('.spicker');
                            })
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
                    // todo :: change date to yesterday
                    var yesterday = utilService.setNDaysAgo(new Date(), 1);
                    var yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    var todayEndTime = utilService.getTodayEndTime();
                    vm.deviceQuery = {};
                    vm.deviceQuery.totalCount = 0;
                    vm.deviceQuery.sortCol = {validConsumptionAmount: -1};
                    vm.deviceQuery.consumptionTimesOperator = ">=";
                    vm.deviceQuery.profitAmountOperator = ">=";
                    vm.deviceQuery.topUpTimesOperator = ">=";
                    vm.deviceQuery.bonusTimesOperator = ">=";
                    vm.deviceQuery.topUpAmountOperator = ">=";
                    vm.deviceQuery.valueScoreOperator = ">=";
                    vm.deviceQuery.start = utilService.createDatePicker('#deviceStartingDateTimePicker');
                    vm.deviceQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                    vm.deviceQuery.end = utilService.createDatePicker('#deviceEndingEndDateTimePicker');
                    vm.deviceQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    vm.deviceQuery.pageObj = utilService.createPageForPagingTable("#deviceReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "deviceQuery", vm.searchDeviceReport);
                    });
                    // vm.setupRemarksMultiInput();
                    $scope.$evalAsync();
                })
            }
            else if (choice == "PLAYER_REPORT") {
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded('#playerReportTablePage', function () {
                    // Get Promote CS and way lists
                    vm.allPromoteWay = {};
                    let query = {
                        platformId: vm.selectedPlatform._id
                    };
                    socketService.$socket($scope.AppSocket, 'getAllPromoteWay', query,
                        function (data) {
                            $scope.$evalAsync(() => {
                                vm.allPromoteWay = data.data;
                                endLoadMultipleSelect('.spicker');
                            })
                        },
                        function (err) {
                            console.log(err);
                        }
                    );

                    // Get Departments Detail
                    socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform._id},
                        data => {
                            $scope.$evalAsync(() => {
                                let parentId;
                                vm.queryDepartments = [];
                                vm.queryRoles = [];

                                vm.queryDepartments.push({_id: '', departmentName: 'N/A'});

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

                                endLoadMultipleSelect('.spicker');

                                if (typeof(callback) == 'function') {
                                    callback(data.data);
                                }
                            });
                        }
                    );
                    // todo :: change date to yesterday
                    var yesterday = utilService.setNDaysAgo(new Date(), 1);
                    var yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    var todayEndTime = utilService.getTodayEndTime();
                    vm.playerQuery = {};
                    vm.playerQuery.totalCount = 0;
                    vm.playerQuery.sortCol = {validConsumptionAmount: -1};
                    // vm.playerQuery.limit = 5000;
                    vm.playerQuery.consumptionTimesOperator = ">=";
                    vm.playerQuery.profitAmountOperator = ">=";
                    vm.playerQuery.topUpTimesOperator = ">=";
                    vm.playerQuery.bonusTimesOperator = ">=";
                    vm.playerQuery.topUpAmountOperator = ">=";
                    vm.playerQuery.valueScoreOperator = ">=";
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
            } else if (choice === "PLAYER_DEPOSIT_ANALYSIS_REPORT") {
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded('#playerDepositAnalysisReportTablePage', function () {
                    var yesterday = utilService.setNDaysAgo(new Date(), 1);
                    var yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    var todayEndTime = utilService.getTodayEndTime();
                    vm.playerDepositAnalysis = {};
                    vm.depositAnalysisQuery = {};
                    vm.depositAnalysisQuery.sortCol = {};
                    vm.depositAnalysisQuery.limit = 5000;
                    vm.depositAnalysisQuery.valueScoreOperator = ">=";
                    vm.depositAnalysisQuery.start = utilService.createDatePicker('#startingDateTimePickerDepositAnalysis');
                    vm.depositAnalysisQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                    vm.depositAnalysisQuery.end = utilService.createDatePicker('#endingEndDateTimePickerDepositAnalysis');
                    vm.depositAnalysisQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    // vm.depositAnalysisQuery.pageObj = utilService.createPageForPagingTable("#playerDepositAnalysisReportTablePage", {pageSize: 5000}, $translate, function (curP, pageSize) {
                    //     vm.commonPageChangeHandler(curP, pageSize, "depositAnalysisQuery", vm.searchPlayerDepositAnalysisReport);
                    // });
                    vm.setupRemarksMultiInputDepositAnalysis();
                })
            } else if (choice === "PLAYER_DEPOSIT_TRACKING_REPORT") {
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded('#playerDepositTrackingReportTablePage', function () {
                    let yesterday = utilService.setNDaysAgo(new Date(), 1);
                    let yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                    let todayEndTime = utilService.getTodayEndTime();
                    vm.playerDepositTracking = {};
                    vm.depositTrackingQuery = {};
                    vm.depositTrackingQuery.sortCol = {};
                    vm.depositTrackingQuery.limit = 5000;
                    vm.depositTrackingQuery.loginStartTime = utilService.createDatePicker('#depositTrackingReport .loginStartTime');
                    vm.depositTrackingQuery.loginStartTime.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                    vm.depositTrackingQuery.loginEndTime = utilService.createDatePicker('#depositTrackingReport .loginEndTime');
                    vm.depositTrackingQuery.loginEndTime.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                    // vm.depositTrackingQuery.pageObj = utilService.createPageForPagingTable("#playerDepositTrackingReportTablePage", {pageSize: 5000}, $translate, function (curP, pageSize) {
                    //     vm.commonPageChangeHandler(curP, pageSize, "depositTrackingQuery", vm.searchPlayerDepositTrackingReport);
                    // });
                    vm.setupRemarksMultiInputDepositTracking();
                    vm.setupMultiInputDepositTrackingGroup();
                    //vm.searchPlayerDepositTrackingReport(); // auto search and display player being tracked when tab clicked
                })
            } else if (choice == "PLAYER_EXPENSE_REPORT") {
                vm.playerExpenseQuery = {totalCount: 0};
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#playerExpenseTablePage", function () {
                    vm.commonInitTime(vm.playerExpenseQuery, '#playerExpenseReportQuery');
                    vm.playerExpenseQuery.providerId = "all";
                    vm.playerExpenseQuery.pageObj = utilService.createPageForPagingTable("#playerExpenseTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "playerExpenseQuery", vm.searchProviderPlayerRecord)
                    });
                })
            } else if (choice == "NEWACCOUNT_REPORT") {
                vm.newPlayerQuery = {totalCount: 0};
                vm.reportSearchTime = 0;
                vm.isShowNewPlayerDeviceRecord = false;
                //utilService.actionAfterLoaded("#newPlayerDomainTable", function () {
                utilService.actionAfterLoaded("#validPlayerPie", function () {
                    vm.commonInitTime(vm.newPlayerQuery, '#newPlayerReportQuery');
                    // vm.searchNewPlayerRecord(true);
                });
            } else if (choice == "WINRATE_REPORT") {

                $scope.$evalAsync(()=>{
                    vm.winRateQuery = {};
                    vm.winRateSummaryData = {};
                    vm.winRateQuery.providerId = 'all';
                    vm.winRateQuery.loginDevice = [];
                    Object.keys(vm.loginDeviceList).forEach(key => {
                        if (key) {
                            vm.winRateQuery.loginDevice.push(key);
                        }
                    })
                    vm.reportSearchTime = 0;
                    vm.winRateLayer1 = true;
                    vm.winRateLayer2 = false;
                    vm.winRateLayer3 = false;
                    vm.winRateLayer4 = false;
                    vm.changeWinRatePlatform();
                    utilService.actionAfterLoaded("#winRateTable", function () {
                        vm.commonInitTime(vm.winRateQuery, '#winrateReportQuery');
                    });

                });
            // } else if (choice == "FINANCIAL_REPORT") {
            //     vm.financialReport = {};
            //     vm.winRateSummaryData = {};
            //     vm.winRateQuery.providerId = 'all';
            //     vm.reportSearchTime = 0;
            //     utilService.actionAfterLoaded("#winRateTable", function () {
            //         vm.commonInitTime(vm.winRateQuery, '#winrateReportQuery');
            //     });
            //     $scope.safeApply();
            } else if (choice == "FEEDBACK_REPORT") {
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded('#feedbackReportTable', function () {
                    $scope.$evalAsync(async () => {
                        let yesterday = utilService.setNDaysAgo(new Date(), 1);
                        let yesterdayDateStartTime = utilService.setThisDayStartTime(new Date(yesterday));
                        let todayEndTime = utilService.getTodayEndTime();

                        // vm.allFeedbackResults = {};
                        // vm.allFeedbackTopics = {};
                        //
                        // vm.allFeedbackResults = await commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([]));
                        // vm.allFeedbackTopics = await commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform._id).catch(err => Promise.resolve([]));
                        //
                        // // Get Departments Detail
                        // socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform._id}, function success(data) {
                        //     console.log('getDepartmentTreeById', data);
                        //     let parentId;
                        //     vm.queryDepartments = [];
                        //     vm.queryRoles = [];
                        //     vm.queryAdmins = [];
                        //
                        //     data.data.map(e => {
                        //         if (e.departmentName == vm.selectedPlatform.name) {
                        //             vm.queryDepartments.push(e);
                        //             parentId = e._id;
                        //         }
                        //     });
                        //
                        //     data.data.map(e => {
                        //         if (String(parentId) == String(e.parent)) {
                        //             vm.queryDepartments.push(e);
                        //         }
                        //     });
                        //
                        //     $scope.$digest();
                        //     if (typeof(callback) == 'function') {
                        //         callback(data.data);
                        //     }
                        // });

                        vm.feedbackQuery = {
                            userType: 'Real Player (all)',
                            result: [],
                            topic: [],
                            // days: 1,
                            valueScoreOperator: ">=",
                            topUpTimesOperator: ">=",
                            bonusTimesOperator: ">=",
                            topUpAmountOperator: ">=",
                            registrationDevice: []
                        };
                        vm.feedbackQuery.totalCount = 0;
                        vm.feedbackQuery.start = utilService.createDatePicker('#feedbackReportQuery .startTime');
                        vm.feedbackQuery.start.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.feedbackQuery.end = utilService.createDatePicker('#feedbackReportQuery .endTime');
                        vm.feedbackQuery.end.data('datetimepicker').setLocalDate(new Date(todayEndTime));

                        vm.feedbackQuery.searchTime = utilService.createDatePicker('#feedbackReportQuery .searchTime');
                        vm.feedbackQuery.searchTime.data('datetimepicker').setLocalDate(new Date(yesterdayDateStartTime));
                        vm.feedbackQuery.searchEndTime = utilService.createDatePicker('#feedbackReportQuery .searchEndTime');
                        vm.feedbackQuery.searchEndTime.data('datetimepicker').setLocalDate(new Date(todayEndTime));
                        vm.feedbackQuery.limit = 5000;
                        vm.feedbackQuery.index = 0;
                        vm.feedbackQuery.pageObj = utilService.createPageForPagingTable("#feedbackReportTablePage", {maxPageSize:5000}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "feedbackQuery", vm.drawFeedbackReport)
                        });
                    })
                    endLoadMultipleSelect('.spicker');
                });

            } else if (choice == "ONLINE_PAYMENT_MISMATCH_REPORT") {
                vm.onlinePaymentMismatchQuery = {type: 'online'};
                vm.proposalMismatchDetail = {};
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#onlinePaymentMismatchTable", function () {
                    vm.commonInitTime(vm.onlinePaymentMismatchQuery, '#onlinePaymentMismatchQuery');
                });
                $scope.safeApply();
            } else if (choice == "WECHAT_GROUP_REPORT") {
                vm.wechatGroupQuery = {};
                vm.reportSearchTime = 0;
                getAdminPlatformName();

                utilService.actionAfterLoaded("#wechatGroupReportTablePage", function () {
                    vm.commonInitTime(vm.wechatGroupQuery, '#wechatGroupQuery');
                    vm.wechatGroupQuery.pageObj = utilService.createPageForPagingTable("#wechatGroupReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "wechatGroupQuery", vm.searchWechatControlSession)
                    });
                });
                $scope.safeApply();
            } else if (choice == "QQ_GROUP_REPORT") {
                vm.qqGroupQuery = {};
                vm.reportSearchTime = 0;
                getAdminPlatformName();

                utilService.actionAfterLoaded("#qqGroupReportTablePage", function () {
                    vm.commonInitTime(vm.qqGroupQuery, '#qqGroupQuery');
                    vm.qqGroupQuery.pageObj = utilService.createPageForPagingTable("#qqGroupReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "qqGroupQuery", vm.searchQQControlSession)
                    });
                });
                $scope.safeApply();
            } else if (choice == "PROVIDER_CONSUMPTION_REPORT"){
                vm.providerConsumptionQuery = {};
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#providerConsumptionReportTablePage", function () {
                    vm.commonInitTime(vm.providerConsumptionQuery, '#providerConsumptionQuery');
                    vm.providerConsumptionQuery.pageObj = utilService.createPageForPagingTable("#providerConsumptionReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "providerConsumptionQuery", vm.searchProviderConsumptionReport)
                    });
                });
                $scope.$evalAsync();
            } else if (choice == "PAYMENT_MONITOR_REPORT") {
                vm.paymentMonitorQuery = {};
                vm.reportSearchTime = 0;
                vm.getPlatformByAdminId();
                vm.getPaymentMonitorLockedAdmin();

                utilService.actionAfterLoaded("#paymentMonitorReportTablePage", function () {
                    vm.commonInitTime(vm.paymentMonitorQuery, '#paymentMonitorQuery');
                    vm.paymentMonitorQuery.pageObj = utilService.createPageForPagingTable("#paymentMonitorReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "paymentMonitorQuery", vm.getPaymentMonitorReport)
                    });
                });
                $scope.$evalAsync();
            } else if (choice == "LIMITED_OFFER_REPORT") {
                vm.limitedOfferQuery = {};
                vm.limitedOfferDetail = {};
                vm.limitedOfferQuery.limit = 10;
                vm.reportSearchTime = 0;
                vm.changeLimitedOfferReportPlatform();
                utilService.actionAfterLoaded("#limitedOfferTable", function () {
                    vm.commonInitTime(vm.limitedOfferQuery, '#limitedOfferQuery');
                    vm.limitedOfferQuery.pageObj = utilService.createPageForPagingTable("#limitedOfferTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "limitedOfferQuery", vm.drawLimitedOfferReport)
                    });
                });
                $scope.safeApply();
            } else if (choice == "PLAYERPARTNER_REPORT") {
                vm.partnerQuery = {};
                vm.partnerQuery.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#playerPartnerTable", function () {
                    vm.commonInitTime(vm.partnerQuery, '#playerPartnerReportQuery');
                    vm.partnerQuery.pageObj = utilService.createPageForPagingTable("#playerPartnerTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
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
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#playerFeedbackTablePage", function () {
                    vm.commonInitTime(vm.playerFeedbackQuery, '#playerFeedbackReportQuery');
                    vm.playerFeedbackQuery.pageObj = utilService.createPageForPagingTable("#playerFeedbackTablePage", {}, $translate, vm.feedbackTablePageChange);
                })
                $scope.safeApply();
            } else if (choice == "CREDIT_CHANGE_REPORT") {
                vm.creditChangeQuery = vm.creditChangeQuery || {};
                vm.reportSearchTime = 0;
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
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#playerAlmostLevelUpTablePage", function () {
                    vm.playerAlmostLevelUpQuery.pageObj = utilService.createPageForPagingTable("#playerAlmostLevelUpTablePage", {}, $translate, vm.playerAlmostLevelUpTablePageUpdate);
                })
                $scope.safeApply();
            } else if (choice == "PARTNERPLAYERBOUNS_REPORT") {
                vm.partnerPlayerBonusQuery = {};
                vm.partnerPlayerBonusQuery.status = 'all';
                vm.partnerPlayerBonusQuery.totalCount = 0;
                vm.partnerPlayerBonusQuery.proposalTypeId = 'all';
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#partnerPlayerBonusTablePage", function () {
                    vm.commonInitTime(vm.partnerPlayerBonusQuery, '#partnerPlayerBonusQuery')
                    vm.partnerPlayerBonusQuery.pageObj = utilService.createPageForPagingTable("#partnerPlayerBonusTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerPlayerBonusQuery", vm.searchPartnerPlayerBonusData)
                    });
                })
                $scope.safeApply();
            } else if (choice == "REAL_TIME_COMMISSION_REPORT") {
                vm.realTimeCommissionQuery = {};
                vm.realTimeCommissionLoadingStatus = "";
                vm.realTimeCommissionData = [];
                vm.partnerCommVar = {};
                vm.selectCommissionPeriod = '';
                vm.selectedCommissionPeriod = 0;
                vm.reportSearchTime = 0;
            } else if (choice == "PARTNERCOMMISSION_REPORT") {
                vm.partnerCommissionQuery = {};
                vm.partnerCommissionQuery.status = 'all';
                vm.partnerCommissionQuery.totalCount = 0;
                vm.partnerCommissionQuery.proposalTypeId = 'all';
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#partnerCommissionTablePage", function () {
                    vm.commonInitTime(vm.partnerCommissionQuery, '#partnerCommissionQuery')
                    vm.partnerCommissionQuery.pageObj = utilService.createPageForPagingTable("#partnerCommissionTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerCommissionQuery", vm.searchPartnerCommissionData)
                    });
                })
                $scope.safeApply();
            }  else if (choice == "PARTNER_SETTLEMENT_HISTORY_REPORT") {
                vm.partnerSettlementQueryStartDateCurMonthOffset = 0;
                vm.partnerSettlementQueryEndDateCurMonthOffset = 0;
                vm.partnerSettlementQuery = {};
                vm.partnerSettlementQuery.totalCount = 0;
                vm.partnerSettlementQuery.commissionType = '';
                vm.partnerSettlementQuery.partnerName = '';
                vm.reportSearchTime = 0;
                let dateTimePickerStartPopup, dateTimePickerEndPopup;

                let getStartTimePlatformPartnerSettlementStatus = function(callback) {
                    let refDate = vm.partnerSettlementQuery.startTime.data('datetimepicker').getLocalDate();
                    refDate = new Date(refDate.setDate(1));
                    let startDate = refDate.setMonth(
                        vm.partnerSettlementQuery.startTime.data('datetimepicker').getLocalDate().getMonth()+vm.partnerSettlementQueryStartDateCurMonthOffset-1);
                    refDate = new Date(refDate.setMonth(refDate.getMonth()+3));
                    let endDate = refDate.setDate(refDate.getDate());
                    vm.getPlatformPartnerSettlementStatus(new Date(startDate), new Date(endDate), callback);
                };
                let styleDateTimePickerStart = function(ev) {
                    if(ev.target == dateTimePickerStartPopup.querySelector('.datepicker-days thead .prev') && !ev.target.classList.contains('disabled')) {
                        vm.partnerSettlementQueryStartDateCurMonthOffset--;
                    }
                    if(ev.target == dateTimePickerStartPopup.querySelector('.datepicker-days thead .next') && !ev.target.classList.contains('disabled')) {
                        vm.partnerSettlementQueryStartDateCurMonthOffset++;
                    }
                    if(ev.type == "changeDate") {
                        vm.partnerSettlementQueryStartDateCurMonthOffset = 0;
                    }

                    setTimeout(function() {
                        getStartTimePlatformPartnerSettlementStatus(function () {
                            vm.commonChangeDatePickerStyle(
                                vm.partnerSettlementQuery.startTime.data('datetimepicker'),
                                {monthOffset: vm.partnerSettlementQueryStartDateCurMonthOffset}
                            )
                        })
                    }, 0);
                };

                let getEndTimePlatformPartnerSettlementStatus = function(callback) {
                    let refDate = vm.partnerSettlementQuery.endTime.data('datetimepicker').getLocalDate();
                    refDate = new Date(refDate.setDate(1));
                    let startDate = refDate.setMonth(
                        vm.partnerSettlementQuery.endTime.data('datetimepicker').getLocalDate().getMonth()+vm.partnerSettlementQueryEndDateCurMonthOffset-1);
                    refDate = new Date(refDate.setMonth(refDate.getMonth()+3));
                    let endDate = refDate.setDate(refDate.getDate());
                    vm.getPlatformPartnerSettlementStatus(new Date(startDate), new Date(endDate), callback);
                };
                let styleDateTimePickerEnd = function(ev) {
                    if(ev.target == dateTimePickerEndPopup.querySelector('.datepicker-days thead .prev') && !ev.target.classList.contains('disabled')) {
                        vm.partnerSettlementQueryEndDateCurMonthOffset--;
                    }
                    if(ev.target == dateTimePickerEndPopup.querySelector('.datepicker-days thead .next') && !ev.target.classList.contains('disabled')) {
                        vm.partnerSettlementQueryEndDateCurMonthOffset++;
                    }
                    if(ev.type == "changeDate") {
                        vm.partnerSettlementQueryEndDateCurMonthOffset = 0;
                    }

                    setTimeout(function() {
                        getEndTimePlatformPartnerSettlementStatus(function(){
                            vm.commonChangeDatePickerStyle(
                                vm.partnerSettlementQuery.endTime.data('datetimepicker'),
                                {monthOffset:vm.partnerSettlementQueryEndDateCurMonthOffset}
                            )
                        });
                    }, 0);
                };

                utilService.actionAfterLoaded("#partnerSettlementTablePage", function () {
                    vm.commonInitTime(vm.partnerSettlementQuery, '#partnerSettlementQuery');
                    vm.partnerSettlementQuery.pageObj = utilService.createPageForPagingTable("#partnerSettlementTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "partnerSettlementQuery", vm.searchPartnerSettlementHistory)
                    });

                    dateTimePickerStartPopup = vm.partnerSettlementQuery.startTime.data('datetimepicker').widget[0];
                    dateTimePickerStartPopup.querySelector('.datepicker-days thead .prev').addEventListener('click', styleDateTimePickerStart);
                    dateTimePickerStartPopup.querySelector('.datepicker-days thead .next').addEventListener('click', styleDateTimePickerStart);
                    vm.partnerSettlementQuery.startTime.on('show', styleDateTimePickerStart);
                    vm.partnerSettlementQuery.startTime.on('changeDate', styleDateTimePickerStart);

                    dateTimePickerEndPopup = vm.partnerSettlementQuery.endTime.data('datetimepicker').widget[0];
                    dateTimePickerEndPopup.querySelector('.datepicker-days thead .prev').addEventListener('click', styleDateTimePickerEnd);
                    dateTimePickerEndPopup.querySelector('.datepicker-days thead .next').addEventListener('click', styleDateTimePickerEnd);
                    vm.partnerSettlementQuery.endTime.on('show', styleDateTimePickerEnd);
                    vm.partnerSettlementQuery.endTime.on('changeDate', styleDateTimePickerEnd);
                });
                $scope.safeApply();
            } else if (choice == "ACTIONLOG_REPORT") {
                vm.reportSearchTime = 0;
                vm.actionLogQuery = vm.actionLogQuery || {};
                vm.actionLogQuery.totalCount = 0;
                vm.actionLogQuery.allActions = [
                    {group: "DEPARTMENT", text: "ADD_DEPARTMENT", action: "createDepartmentWithParent"},
                    {group: "DEPARTMENT", text: "MOVE_DEPARTMENT", action: "updateDepartmentParent"},
                    {group: "DEPARTMENT", text: "RENAME_DEPARTMENT", action: "updateDepartment"},
                    {group: "DEPARTMENT", text: "DELETE_DEPARTMENT", action: "deleteDepartmentsById"},

                    {group: "Role", text: "createRoleForDepartment", action: "createRoleForDepartment"},
                    {group: "Role", text: "deleteRolesById", action: "deleteRolesById"},
                    {group: "Role", text: "updateRole", action: "updateRole"},
                    {group: "Role", text: "attachDetachRolesFromUsersById", action: "attachDetachRolesFromUsersById"},

                    {group: "Admin", text: "createAdminForDepartment", action: "createAdminForDepartment"},
                    {group: "Admin", text: "updateAdmin", action: "updateAdmin"},
                    {group: "Admin", text: "deleteAdminInfosById", action: "deleteAdminInfosById"},
                    {group: "Admin", text: "MOVE_USER", action: "updateAdminDepartment"},
                    {group: "Admin", text: "RESET_PASSWORD", action: "resetAdminPassword"},

                    {group: "PLATFORM", text: "createPlatform", action: "createPlatform"},
                    {group: "PLATFORM", text: "DELETE_PLATFORM", action: "deletePlatformById"},
                    {group: "PLATFORM", text: "updatePlatform", action: "updatePlatform"},
                    {group: "PLATFORM", text: "SYSTEM_SETTLEMENT", action: ["startPlatformPlayerConsumptionReturnSettlement", "startPlatformPlayerConsumptionIncentiveSettlement", "startPlatformPlayerLevelSettlement", "startPlayerConsecutiveConsumptionSettlement"]},
                    {group: "PLATFORM", text: "createNewPlayerAdvertisementRecord", action: "createNewPlayerAdvertisementRecord"},
                    {group: "PLATFORM", text: "savePlayerAdvertisementRecordChanges", action: "savePlayerAdvertisementRecordChanges"},
                    {group: "PLATFORM", text: "createNewPartnerAdvertisementRecord", action: "createNewPartnerAdvertisementRecord"},
                    {group: "PLATFORM", text: "savePartnerAdvertisementRecordChanges", action: "savePartnerAdvertisementRecordChanges"},

                    {group: "PLAYER", text: "CREATE_PLAYER", action: "createPlayer"},
                    {group: "PLAYER", text: "createDemoPlayer", action: "createDemoPlayer"},
                    {group: "PLAYER", text: "createUpdatePlayerInfoProposal", action: "createUpdatePlayerInfoProposal"},
                    //{group: "PLAYER", text: "Search referral", action: "getPlayerReferrals"},
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
                    {
                        group: "PLAYER",
                        text: "createUpdatePlayerWeChatProposal",
                        action: "createUpdatePlayerWeChatProposal"
                    },
                    {group: "PLAYER", text: "UpdatePlayerBankInfo", action: "createUpdatePlayerBankInfoProposal"},
                    {group: "PLAYER", text: "resetPlayerPassword", action: "resetPlayerPassword"},

                    {group: "PLAYER", text: "Repair Payment", action: "submitRepairPaymentProposal"},
                    {group: "PLAYER", text: "createUpdatePlayerCreditProposal", action: "createUpdatePlayerCreditProposal"},
                    //{group: "PLAYER", text: "Forbid TopUp Types", action: "createForbidTopUpLog"},
                    {group: "PLAYER", text: "addPlayerFeedback", action: "createPlayerFeedback"},

                    // {group: "PLAYER", text: "updatePlayerStatus", action: "updatePlayerStatus"},
                    // {
                    //     group: "PLAYER",
                    //     text: "transferPlayerCreditFromProvider",
                    //     action: "transferPlayerCreditFromProvider"
                    // },
                    {group: "PLAYER", text: "transferPlayerCreditToProvider", action: "transferPlayerCreditToProvider"},
                    {group: "PLAYER", text: "updatePlayerPermission", action: "updatePlayerPermission"},
                    {group: "PLAYER", text: "createUpdateTopUpGroupLog", action: "createUpdateTopUpGroupLog"},
                    {group: "PLAYER", text: "modifyPlayerCredibilityRemark", action: "updatePlayerCredibilityRemark"},

                    {group: "PLAYER", text: "applyManualTopUpRequest", action: "applyManualTopUpRequest"},
                    {group: "PLAYER", text: "applyAlipayTopUpRequest", action: "applyAlipayTopUpRequest"},
                    {group: "PLAYER", text: "applyWechatPayTopUpRequest", action: "applyWechatPayTopUpRequest"},
                    {group: "PLAYER", text: "applyBonusRequest", action: "applyBonusRequest"},
                    {group: "PLAYER", text: "Reward - createPlayerRewardTask", action: "createPlayerRewardTask"},
                    {group: "PLAYER", text: "Reward - applyRewardEvent", action: "applyRewardEvent"},
                    {group: "PLAYER", text: "Reward - unlockRewardTaskInRewardTaskGroup", action: "createRewardTaskGroupUnlockedRecord"},
                    {group: "PLAYER", text: "updatePlayerRewardPointsRecord", action: "updatePlayerRewardPointsRecord"},
                    {group: "PLAYER", text: "createUpdatePlayerRealNameProposal", action: "createUpdatePlayerRealNameProposal"},
                    {group: "PLAYER", text: "createUpdatePlayerInfoLevelProposal", action: "createUpdatePlayerInfoLevelProposal"},

                    {group: "PARTNER", text: "createPartner", action: "createPartner"},
                    //{group: "PARTNER", text: "createPartnerWithParent", action: "createPartnerWithParent"},
                    //{group: "PARTNER", text: "deletePartnersById", action: "deletePartnersById"},
                    {group: "PARTNER", text: "updatePartner", action: "createUpdatePartnerInfoProposal"},
                    {group: "PARTNER", text: "Update partner phone number", action: "createUpdatePartnerPhoneProposal"},
                    {group: "PARTNER", text: "Update partner email", action: "createUpdatePartnerEmailProposal"},
                    {group: "PARTNER", text: "Update partner QQ", action: "createUpdatePartnerQQProposal"},
                    {group: "PARTNER", text: "Update partner WeChat", action: "createUpdatePartnerWeChatProposal"},
                    {group: "PARTNER", text: "Update partner commission type", action: "createUpdatePartnerCommissionTypeProposal"},
                    {group: "PARTNER", text: "Update partner bank information", action: "createUpdatePartnerBankInfoProposal"},
                    {group: "PARTNER", text: "RESET_PASSWORD", action: "resetPartnerPassword"},
                    {group: "PARTNER", text: "customizePartnerCommission", action: "customizePartnerCommission"},
                    {group: "PARTNER", text: "updatePartnerPermission", action: "updatePartnerPermission"},
                    {group: "PARTNER", text: "createUpdatePartnerRealNameProposal", action: "createUpdatePartnerRealNameProposal"},
                    {group: "PARTNER", text: "generatePartnerCommSettPreview", action: "generatePartnerCommSettPreview"},
                    {group: "PARTNER", text: "cancelPartnerCommissionPreview", action: "cancelPartnerCommissionPreview"},
                    {group: "PARTNER", text: "resetAllPartnerCustomizedCommissionRate", action: "resetAllPartnerCustomizedCommissionRate"},
                    {group: "PARTNER", text: "resetGroupPartnerCommissionRate", action: "resetGroupPartnerCommissionRate"},

                    {group: "Feedback", text: "ADD_FEEDBACK_RESULT", action: ["createPlayerFeedbackResult", "createPartnerFeedbackResult"]},
                    {group: "Feedback", text: "ADD_FEEDBACK_TOPIC", action: ["createPlayerFeedbackTopic", "createPartnerFeedbackTopic"]},

                    {group: "GAME", text: "RENAME_PROVIDER_NICKNAME", action: "renameProviderInPlatformById"},
                    {group: "GAME", text: "ENABLE/DISABLE", action: "updateProviderFromPlatformById"},
                    {group: "GAME", text: "UPDATE_GAME_STATUS", action: "updateGameStatusToPlatform"},
                    {group: "GAME", text: "attachGameToPlatform", action: "attachGamesToPlatform"},
                    {group: "GAME", text: "detachGameFromPlatform", action: "detachGamesFromPlatform"},

                    {group: "GameGroup", text: "Add Game Group", action: "addPlatformGameGroup"},
                    {group: "GameGroup", text: "Remove Game Group", action: "deleteGameGroup"},
                    {group: "GameGroup", text: "Rename Game Group", action: "renamePlatformGameGroup"},
                    {group: "GameGroup", text: "Move Game Group", action: "updateGameGroupParent"},
                    {group: "GameGroup", text: "ADD/REMOVE_GAME_GROUP", action: "updatePlatformGameGroup"},
                    // {group: "GameGroup", text: "Update Game Group", action: "updatePlatformGameGroup"},

                    {group: "REWARD", text: "createRewardEvent", action: "createRewardEvent"},
                    {group: "REWARD", text: "deleteRewardEventByIds", action: "deleteRewardEventByIds"},
                    {group: "REWARD", text: "updateRewardEvent", action: "updateRewardEvent"},

                    {group: "PROPOSAL_PROCESS", text: "updateProposalTypeProcessSteps", action: "updateProposalTypeProcessSteps"},
                    {group: "Proposal", text: "Manual Approval", action: ["updateProposalProcessStep", 'approveCsPendingAndChangeStatus']},

                    {group: "CONFIG", text: "EDIT_PLAYER_LEVEL", action: "updatePlayerLevel"},
                    {group: "CONFIG", text: "VALID_ACTIVE", action: "updatePartnerLevelConfig"},
                    {group: "CONFIG", text: "Partner Commission", action: "createUpdatePartnerCommissionConfigWithGameProviderGroup"},
                    {group: "CONFIG", text: "Auto Approval Setting", action: "updateAutoApprovalConfig"},
                    {group: "CONFIG", text: "Player Value", action: "updatePlayerLevelScores"},
                    {group: "CONFIG", text: "Player Credibility", action: "updateCredibilityRemarksInBulk"},
                    {group: "CONFIG", text: "Lock Lobby Group", action: "updatePlatformProviderGroup"},
                    {group: "CONFIG", text: "setFilteredKeywords", action: "setFilteredKeywords"},
                    {group: "CONFIG", text: "removeFilteredKeywords", action: "removeFilteredKeywords"},

                    {group: "MessageTemplates", text: "createMessageTemplate", action: "createMessageTemplate"},
                    {group: "MessageTemplates", text: "updateMessageTemplate", action: "updateMessageTemplate"},

                    {group: "ANNOUNCEMENTS", text: "createPlatformAnnouncement", action: "createPlatformAnnouncement"},
                    {group: "ANNOUNCEMENTS", text: "updatePlatformAnnouncement", action: "updatePlatformAnnouncement"},
                    {group: "ANNOUNCEMENTS", text: "deletePlatformAnnouncementByIds", action: "deletePlatformAnnouncementByIds"},

                    {group: "PushNotification", text: "addPushNotification", action: "pushNotification"},

                    {group: "RegistrationUrlConfig", text: "addPromoteWay", action: "addPromoteWay"},
                    {group: "RegistrationUrlConfig", text: "deletePromoteWay", action: "deletePromoteWay"},
                    {group: "RegistrationUrlConfig", text: "addUrl", action: "addUrl"},
                    {group: "RegistrationUrlConfig", text: "updateUrl", action: "updateUrl"},
                    {group: "RegistrationUrlConfig", text: "deleteUrl", action: "deleteUrl"},

                    {group: "rewardPoint", text: "upsertRewardPointsLvlConfig", action: "upsertRewardPointsLvlConfig"},
                    {group: "rewardPoint", text: "updateRewardPointsEvent", action: "updateRewardPointsEvent"},
                    {group: "rewardPoint", text: "deleteRewardPointsEventById", action: "deleteRewardPointsEventById"},
                    {group: "rewardPoint", text: "createRewardPointsEvent", action: "createRewardPointsEvent"},

                    {group: "Batch Setting", text: "updateBatchPlayer", action: [
                        "updateBatchPlayerPermission", "updateBatchPlayerForbidRewardEvents",
                        "updateBatchPlayerForbidPaymentType","updateBatchPlayerForbidRewardPointsEvent",
                        "updateBatchPlayerCredibilityRemark", "updateBatchPlayerLevel"
                    ]},
                    {group: "Batch Setting", text: "playerCreditClearOut", action: "playerCreditClearOut"},

                    {group: "Bankcard Group", text: "ADD", action: "addPlatformBankCardGroup"},
                    {group: "Bankcard Group", text: "UPDATE", action: "updatePlatformBankCardGroup"},
                    {group: "Bankcard Group", text: "DELETE", action: "deleteBankCardGroup"},
                    {group: "Bankcard Group", text: "Default", action: "setPlatformDefaultBankCardGroup"},
                    {group: "Bankcard Group", text: "ADD_PLAYER", action: "addPlayersToBankCardGroup"},
                    {group: "Bankcard Group", text: "ADD_ALL_PLAYER", action: "addAllPlayersToBankCardGroup"},

                    {group: "MERCHANT_GROUP", text: "ADD", action: "addPlatformMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "UPDATE", action: "renamePlatformMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "DELETE", action: "deleteMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "Default", action: "setPlatformDefaultMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "ADD_PLAYER", action: "addPlayersToMerchantGroup"},
                    {group: "MERCHANT_GROUP", text: "ADD_ALL_PLAYER", action: "addAllPlayersToMerchantGroup"},

                    {group: "AlipayGroup", text: "ADD", action: "addPlatformAlipayGroup"},
                    {group: "AlipayGroup", text: "UPDATE", action: "renamePlatformAlipayGroup"},
                    {group: "AlipayGroup", text: "DELETE", action: "deleteAlipayGroup"},
                    {group: "AlipayGroup", text: "Default", action: "setPlatformDefaultAlipayGroup"},
                    {group: "AlipayGroup", text: "ADD_PLAYER", action: "addPlayersToAlipayGroup"},
                    {group: "AlipayGroup", text: "ADD_ALL_PLAYER", action: "addAllPlayersToAlipayGroup"},

                    {group: "WechatPay Group", text: "ADD", action: "addPlatformWechatGroup"},
                    {group: "WechatPay Group", text: "UPDATE", action: "renamePlatformWechatGroup"},
                    {group: "WechatPay Group", text: "DELETE", action: "deleteWechatGroup"},
                    {group: "WechatPay Group", text: "Default", action: "setPlatformDefaultWechatGroup"},
                    {group: "WechatPay Group", text: "ADD_PLAYER", action: "addPlayersToWechatGroup"},
                    {group: "WechatPay Group", text: "ADD_ALL_PLAYER", action: "addAllPlayersToWechatGroup"},

                    {group: "Provider", text: "EDIT_SETTLEMENT_TIME", action: "updateGameProvider"},
                    {group: "Provider", text: "Target Settlement", action: "manualDailyProviderSettlement"},
                    {group: "Provider", text: "updateGame", action: "updateGame"},

                    {group: "TeleMarketing", text: "createDxMission", action: "createDxMission"},
                    {group: "TeleMarketing", text: "comparePhoneNum", action: "comparePhoneNum"},

                    {group: "Redirect Url", text: "savePreventBlockUrl", action: "savePreventBlockUrl"},
                    {group: "Redirect Url", text: "deletePreventBlockUrl", action: "deletePreventBlockUrl"},

                ];
                utilService.actionAfterLoaded("#actionLogTablePage", function () {
                    vm.commonInitTime(vm.actionLogQuery, '#actionLogReportQuery');
                    vm.actionLogQuery.pageObj = utilService.createPageForPagingTable("#actionLogTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "actionLogQuery", vm.searchActionLogData)
                    });
                })
                $scope.safeApply();
            } else if (choice.indexOf('REWARD_REPORT') !== -1 || choice.indexOf('GROUP_REPORT') !== -1) {
                // Unless customization is necessary, this should handle the rest of reward report & reward group reward
                let rewardNameWithoutReport = choice.replace("_REPORT", "");
                vm.rewardTypeName = rewardNameWithoutReport;
                vm.generalRewardReportTableProp = $.extend({}, constRewardReportTableProp[0]);
                if(choice.indexOf('PLAYER_PROMO_CODE_REWARD') === -1 && choice.indexOf('REWARD_REPORT') !== -1) {
                    vm.generalRewardTaskTableProp = $.extend({}, constRewardTaskTableProp[0]);
                    vm.currentRewardTaskName = rewardNameWithoutReport;
                }
            }
        }

        function endLoadMultipleSelect (className) {
            $timeout(function () {
                $(className).selectpicker('refresh');
            }, 0);
        }

        function findReportSearchTime () {
            vm.reportSearchTimeEnd = new Date().getTime();
            vm.reportSearchTime = (vm.reportSearchTimeEnd - vm.reportSearchTimeStart) / 1000;
        }

        vm.forcePairingWithReferenceNumber = function() {
            commonService.forcePairingWithReferenceNumber($scope, $translate, socketService, vm.selectedPlatform.platformId, vm.selectedProposal._id, vm.selectedProposal.proposalId, vm.forcePairingReferenceNumber);
            vm.forcePairingReferenceNumber = '';
        };

        //#region Other Reward Report
        vm.initOtherRewardReport = function(choice) {
            vm.seleDataType = {};
            if (choice) {
                vm.seleDataType[choice] = 'bg-bright';
            }
            vm.showPageName = choice;
            vm.selectedRewardPlatform = null;
            vm.resetOtherReward();
        };

        vm.resetOtherReward = function() {
            vm.otherRewardList = [];
            vm.currentRewardCode = null;
            vm.currentRewardTaskName = null;
        };

        vm.getOtherRewardList = function () {
            vm.resetOtherReward();
            if (vm.selectedRewardPlatform) {
                socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedRewardPlatform}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.otherRewardList = data.data;
                        vm.otherRewardList.push({_id: '优惠代码', name: '优惠代码'});
                        console.log('vm.otherRewardList', vm.otherRewardList);
                        if (vm.otherRewardList && vm.otherRewardList.length > 0 && vm.otherRewardList[0] && vm.otherRewardList[0]._id) {
                            vm.generalRewardProposalQuery.reward = vm.otherRewardList[0]._id;
                            vm.rewardOnChange(vm.getPageNameByRewardObjId(vm.generalRewardProposalQuery.reward), vm.generalRewardProposalQuery.reward, vm.getRewardCodeByRewardObjId(vm.generalRewardProposalQuery.reward))
                        }
                    });
                });
            }
        };

        vm.initOtherRewardPage = function () {
            socketService.clearValue();
            $('#generalRewardProposalTableSpin').hide();

            if (vm.generalRewardProposalQuery && vm.generalRewardProposalQuery.table) {
                vm.generalRewardProposalQuery.table.clear();
                $('#generalRewardProposalTable').prop('innerHTML', "");
                vm.generalRewardProposalQuery.table = utilService.createDatatableWithFooter("#generalRewardProposalTable", vm.commonTableOption, {});
            }
            if (vm.generalRewardTaskQuery && vm.generalRewardTaskQuery.table) {
                vm.generalRewardTaskQuery.table.clear();
                $('#generalRewardTaskTable').prop('innerHTML', "");
                vm.generalRewardTaskQuery.table = utilService.createDatatableWithFooter("#generalRewardTaskTable", vm.commonTableOption, {});
            }
            vm.generalRewardReportTableProp = {};
            vm.operationReportLoadingStatus = '';
            vm.refreshSPicker();

            vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};
            vm.generalRewardProposalQuery.totalCount = 0;
            vm.generalRewardProposalQuery.totalApplicant = 0;
            vm.reportSearchTime = 0;
            utilService.actionAfterLoaded("#generalRewardProposalTablePage", function () {
                vm.generalRewardProposalQuery.startTime = utilService.createDatePicker('#generalRewardProposalQuery .startTime');
                vm.generalRewardProposalQuery.endTime = utilService.createDatePicker('#generalRewardProposalQuery .endTime');
                vm.generalRewardProposalQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.generalRewardProposalQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));

                vm.generalRewardProposalQuery.registrationStartTime = utilService.createDatePicker('#generalRewardProposalQuery .registrationStartTime');
                $('#generalRewardProposalQuery .registrationStartTime').datetimepicker('setDate', null);
                vm.generalRewardProposalQuery.registrationEndTime = utilService.createDatePicker('#generalRewardProposalQuery .registrationEndTime');
                $('#generalRewardProposalQuery .registrationEndTime').datetimepicker('setDate', null);

                vm.generalRewardProposalQuery.pageObj = utilService.createPageForPagingTable("#generalRewardProposalTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "generalRewardProposalQuery", vm.generalRewardProposalSearch)
                });
            });

            if (vm.currentRewardTaskName) {
                vm.generalRewardTaskQuery = {};
                vm.generalRewardTaskQuery.totalCount = 0;
                vm.generalRewardTaskTableProp.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#generalRewardTaskTablePage", function () {
                    vm.commonInitTime(vm.generalRewardTaskQuery, '#generalRewardTaskQuery', true);
                    vm.generalRewardTaskQuery.pageObj = utilService.createPageForPagingTable("#generalRewardTaskTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardTaskQuery", vm.searchGeneralRewardTask)
                    });
                })
            }

            $scope.$evalAsync();
        };

        vm.rewardOnChange = function (choice, eventObjId, code) {
            vm.currentRewardTaskName = null;
            vm.rewardTypeName = null;
            vm.currentRewardCode = code;
            vm.currentEventId = eventObjId;

            drawReportQuery(choice);
            vm.initOtherRewardPage();
        };

        vm.getPageNameByRewardObjId = function (rewardObjId) {
            let flteredReward = filterReward(rewardObjId);
            let rewardTypeName = flteredReward && flteredReward.type && flteredReward.type.name ? flteredReward.type.name : null;

            if (rewardTypeName && vm.rewardNamePage[rewardTypeName]) {
                return vm.rewardNamePage[rewardTypeName];
            } else if (rewardTypeName && (rewardTypeName.indexOf("Reward") !== -1 || rewardTypeName.indexOf("Group") !== -1)) {
                let splitRewardName = rewardTypeName.split(/(?=[A-Z])/);
                let rewardReportString = (splitRewardName.join("_") + "_REPORT").toUpperCase();
                return rewardReportString;
            } else if (!rewardTypeName && rewardObjId && (rewardObjId === '优惠代码')) {
                let rewardReportString = 'PLAYER_PROMO_CODE_REWARD_REPORT';
                return rewardReportString;
            } else {
                return 'NO_PAGE';
            }
        };

        vm.getRewardCodeByRewardObjId = function (rewardObjId) {
            let flteredReward = filterReward(rewardObjId);
            let rewardCode = flteredReward && flteredReward.code ? flteredReward.code : null;

            if (!rewardCode && rewardObjId && (rewardObjId === '优惠代码')) {
                rewardCode = rewardObjId;
            }

            return rewardCode;
        };

        function filterReward (rewardObjId) {
            if (vm.otherRewardList && vm.otherRewardList.length > 0 && rewardObjId) {
                let reward = vm.otherRewardList.filter(x => x && x._id && rewardObjId && x._id.toString() === rewardObjId.toString());
                return reward && reward.length > 0 ? reward[0] : null;
            }

            return null;
        }

        vm.loadOtherRewardPage = function (choice, eventObjId, code) {
            socketService.clearValue();
            console.log('reward', choice, eventObjId, code);

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
            vm.refreshSPicker();

            drawReportQuery(choice);

            if (vm.currentRewardCode) {
                vm.generalRewardProposalQuery = vm.generalRewardProposalQuery || {};
                vm.generalRewardProposalQuery.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#generalRewardProposalTablePage", function () {
                    vm.commonInitTime(vm.generalRewardProposalQuery, '#generalRewardProposalQuery', true);
                    vm.generalRewardProposalQuery.pageObj = utilService.createPageForPagingTable("#generalRewardProposalTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardProposalQuery", vm.generalRewardProposalSearch)
                    });
                })
            }

            if (vm.currentRewardTaskName) {
                vm.generalRewardTaskQuery = {};
                vm.generalRewardTaskQuery.totalCount = 0;
                vm.generalRewardTaskTableProp.totalCount = 0;
                vm.reportSearchTime = 0;
                utilService.actionAfterLoaded("#generalRewardTaskTablePage", function () {
                    vm.commonInitTime(vm.generalRewardTaskQuery, '#generalRewardTaskQuery', true);
                    vm.generalRewardTaskQuery.pageObj = utilService.createPageForPagingTable("#generalRewardTaskTablePage", {pageSize: 30}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "generalRewardTaskQuery", vm.searchGeneralRewardTask)
                    });
                })
            }

            $scope.$evalAsync();
        }
        //#endregion

        //#region All Reward Report
        vm.getRewardFilterItemChanged = function(choice) {
            vm.allRewardList = [];
            if (choice === 'rewardName') {
                let query = vm.rewardReportAnalysis && vm.rewardReportAnalysis.platformList && vm.rewardReportAnalysis.platformList.length > 0 ? {platform: {platform: {$in: vm.rewardReportAnalysis.platformList}}} : {platform: null};

                socketService.$socket($scope.AppSocket, 'getRewardByPlatform', query, function (data) {
                    $scope.$evalAsync(() => {
                        vm.allRewardList = data.data;
                        console.log('vm.allRewardList', vm.allRewardList);

                        vm.rewardReportAnalysis.promoName = [];

                        vm.allRewardList.forEach(item => {
                            if (item && item.name) {
                                vm.rewardReportAnalysis.promoName.push(item.name);
                            }
                        })
                    });
                });
                delete vm.rewardReportAnalysis.proposalTypeName
            } else {
                delete vm.rewardReportAnalysis.promoName;
                vm.getAllProposalTypeByPlatform();
            }
        };

        vm.getAllProposalTypeByPlatform = function () {
            vm.allProposalTypeList = [];
            vm.allRewardProposalTypeList = [];

            let query = vm.rewardReportAnalysis && vm.rewardReportAnalysis.platformList && vm.rewardReportAnalysis.platformList.length > 0 ? {platform: vm.rewardReportAnalysis.platformList} : {platform: null};

            socketService.$socket($scope.AppSocket, 'getAllProposalTypeByPlatform', query, function (data) {
                $scope.$evalAsync(() => {
                    vm.allProposalTypeList = data.data;

                    if (vm.allProposalTypeList && vm.allProposalTypeList.length) {
                        vm.allProposalTypeList.forEach(item => {
                            if (vm.getProposalTypeOptionValue(item, false) === "Reward Proposal") {
                                let index = vm.allRewardProposalTypeList.findIndex(x => x === item.name);

                                if (index === -1) {
                                    vm.allRewardProposalTypeList.push(item.name);
                                }
                            }
                        })

                        vm.rewardReportAnalysis.proposalTypeName = vm.allRewardProposalTypeList;
                    }
                });
            });
        };
        //endregion

        //#region Referral Reward Report
        vm.searchReferralRewardReport = function (newSearch, isExport = false) {
            if (!vm.referralRewardQuery || !vm.referralRewardQuery.platformObjId) {
                return socketService.showErrorMessage($translate('Product Name is Mandatory'));
            }

            if (!vm.referralRewardQuery.referralName) {
                return socketService.showErrorMessage($translate('Referral Name is Mandatory'));
            }

            vm.reportSearchTimeStart = new Date().getTime();
            $('#loadingReferralRewardReportTableSpin').show();

            let sendquery = {
                platformObjId: vm.referralRewardQuery.platformObjId,
                query: {
                    start: vm.referralRewardQuery.startTime.data('datetimepicker').getLocalDate(),
                    end: vm.referralRewardQuery.endTime.data('datetimepicker').getLocalDate(),
                    referralName: vm.referralRewardQuery.referralName,
                    topUpTimesOperator: vm.referralRewardQuery.topUpTimesOperator,
                    topUpTimesValue: vm.referralRewardQuery.topUpTimesValue,
                    topUpTimesValueTwo: vm.referralRewardQuery.topUpTimesValueTwo,
                },
                index: isExport ? 0 : (newSearch ? 0 : (vm.referralRewardQuery.index || 0)),
                limit: isExport ? 10000 : (vm.referralRewardQuery.limit || 10000),
                sortCol: vm.referralRewardQuery.sortCol || {registrationTime: -1},
                isExport: isExport
            };

            console.log('sendquery', sendquery);

            socketService.$socket($scope.AppSocket, 'getReferralRewardReport', sendquery, function (data) {
                $scope.$evalAsync(() => {
                    console.log('getReferralRewardReport data', data);
                    findReportSearchTime();
                    vm.referralRewardQuery.totalCount = data.data.size;
                    $('#loadingReferralRewardReportTableSpin').hide();
                    vm.drawReferralRewardReport(
                        data.data.data.map(item => {
                            item.platform$ = vm.platformList.filter(platform => platform._id.toString() === vm.referralRewardQuery.platformObjId.toString())[0].name;
                            item.topUpAmount$ = parseFloat(item.topUpAmount).toFixed(2);
                            item.bonusAmount$ = parseFloat(item.bonusAmount).toFixed(2);
                            item.rewardAmount$ = parseFloat(item.rewardAmount).toFixed(2);
                            item.consumptionReturnAmount$ = parseFloat(item.consumptionReturnAmount).toFixed(2);
                            item.consumptionAmount$ = parseFloat(item.consumptionAmount).toFixed(2);
                            item.validConsumptionAmount$ = parseFloat(item.validConsumptionAmount).toFixed(2);
                            item.consumptionBonusAmount$ = parseFloat(item.consumptionBonusAmount).toFixed(2);
                            item.referralRewardAmount$ = item.referralRewardAmount ? parseFloat(item.referralRewardAmount).toFixed(2) : 0;

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

                            item.bindStatus$ = item.bindStatus && (item.bindStatus.toString() === 'true') ?  $translate('REFERRAL_VALID') : $translate('REFERRAL_UNBIND');
                            item.bindTime$ = item.bindTime ? vm.dateReformat(item.bindTime) : '';

                            return item;
                        }), data.data.size, {}, newSearch, isExport);
                    $scope.$evalAsync();
                });
            });

        };

        vm.drawReferralRewardReport = function (data, size, summary, newSearch, isExport) {
            let tableOptions = {
                data: data,
                "order": vm.referralRewardQuery.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'name', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'bindTime', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'bindStatus', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'topUpAmount', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'bonusAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'rewardAmount', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'consumptionReturnAmount', 'aTargets': [8], bSortable: true},
                    {'sortCol': 'validConsumptionAmount', 'aTargets': [9], bSortable: true},
                    {'sortCol': 'consumptionBonusAmount', 'aTargets': [10], bSortable: true},
                    {'sortCol': 'referralRewardAmount', 'aTargets': [12], bSortable: true},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT_NAME'), data: "platform$"},
                    {title: $translate('PLAYERNAME'), data: "name", sClass: "realNameCell wordWrap"},
                    {title: $translate('Bind Time'), data: "bindTime$"},
                    {title: $translate('STATUS'), data: "bindStatus$"},
                    {
                        title: $translate('LOBBY'), data: "provider$", sClass: "expandReferralRewardReport sumText",
                        render: function (data) {
                            return "<a>" + data + "</a>";
                        }
                    },
                    {title: $translate('TOTAL_DEPOSIT'), data: "topUpAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('WITHDRAW_AMOUNT'), data: "bonusAmount$", sClass: 'sumFloat alignRight'},
                    {title: $translate('PROMOTION'), data: "rewardAmount$", sClass: 'sumFloat alignRight'},
                    {
                        title: $translate('CONSUMPTION_RETURN_AMOUNT'),
                        data: "consumptionReturnAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        data: "validConsumptionAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {
                        title: $translate('PLAYER_PROFIT_AMOUNT'),
                        data: "consumptionBonusAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                    {title: $translate('COMPANY_PROFIT'), data: "profit$", sClass: 'referrralRewardReportProfit alignRight'},
                    {
                        title: $translate('Referral Reward Amount'),
                        data: "referralRewardAmount$",
                        sClass: 'sumFloat alignRight'
                    },
                ],
                "sScrollY": "80vh",
                "bScrollCollapse": true,
                // "paging": false,
                // "dom": '<"top">rt<"bottom"il><"clear">',
                "language": {
                    "info": "Total _MAX_ records",
                    "emptyTable": $translate("No data available in table"),
                }
            };
            tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

            if(isExport){
                let referralRewardTbl = utilService.createDatatableWithFooter('#referralRewardReportExcelTable', tableOptions, {}, true);
                $('#referralRewardReportExcelTable_wrapper').hide();
                vm.exportToExcel("referralRewardReportExcelTable", "ReferralRewardReport");
            }else {
                let referralRewardTbl = utilService.createDatatableWithFooter('#referralRewardReportTable', tableOptions, {}, true);
                utilService.setDataTablePageInput('referralRewardReportTable', referralRewardTbl, $translate);
                vm.referralRewardQuery.pageObj.init({maxCount: size}, newSearch);
                $('#referralRewardReportTable tbody').off('click', 'td.expandReferralRewardReport');
                $('#referralRewardReportTable tbody').on('click', 'td.expandReferralRewardReport', function () {
                    var tr = $(this).closest('tr');
                    var row = referralRewardTbl.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        var data = row.data();
                        console.log('content', data);
                        var id = 'referralrewardtable' + data._id;
                        row.child(vm.createInnerTable(id)).show();
                        vm[id] = {};
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
                                    vm.drawPlatformTable(data, id, data.providerArr.length, newSearch, vm.referralRewardQuery);
                                }
                            )
                        }

                        tr.addClass('shown');
                    }
                });
                $('#referralRewardReportTable').off('order.dt');
                $('#referralRewardReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'referralRewardQuery', vm.searchReferralRewardReport);
                });
                $('#referralRewardReportTable').resize();
            }
        }
        //#endregion

        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }

        $scope.$on(eventName, () => {
            $scope.$evalAsync(loadPlatform());
        });

        $scope.$on('switchPlatform', () => {
            $scope.$evalAsync(loadPlatform());
        });
    };

    myApp.register.controller('reportCtrl', reportController);
});
