'use strict';

define(['js/app'], function (myApp) {
    let teleMarketingController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants, commonService) {
        var $translate = $filter('translate');
        var vm = this;
        let $noRoundTwoDecimalToFix = $filter('noRoundTwoDecimalToFix');

        // For debugging:
        window.VM = vm;
        vm.scope = $scope;

        vm.teleMarketingOverview = {};
        vm.teleMarketingSendSMS = {};
        vm.teleMarketingPlayerInfo = {};
        vm.playerInfoQuery = {};
        vm.creditChange = {};
        vm.rewardPointsChange = {};
        vm.rewardPointsConvert = {};
        vm.phoneNumberInfo = {};
        vm.depositMethodList = $scope.depositMethodList;
        vm.createTeleMarketingDefault = {
            description: '',
            creditAmount: 0,
            providerGroup: '',
            invitationTemplate: "尊贵的客户，你的帐号{{username}}，密码{{password}}，请点击{{registrationUrl}}登入，送您{{creditAmount}}元，可在{{providerGroup}}游戏，流水{{requiredConsumption}}",
            welcomeContent: "尊贵的客户，你的帐号{{username}}，密码{{password}}，请点击{{loginUrl}}登入，送您{{creditAmount}}元，可在{{providerGroup}}游戏，流水{{requiredConsumption}}"
        };
        vm.createTeleMarketing = Object.assign({}, vm.createTeleMarketingDefault);
        vm.createTaskResult = '';
        vm.editTaskResult = '';
        vm.phoneListSearch = {};
        vm.checkFilterIsDisable = true;

        vm.updatePageTile = function () {
            window.document.title = $translate("teleMarketing") + "->" + $translate(vm.teleMarketingPageName);
        };

        vm.constTsPhoneListStatus = {
            0: "PRE_DISTRIBUTION",
            1: "DISTRIBUTING",
            2: "NOT_ENOUGH_CALLER",
            3: "MANUAL_PAUSED",
            4: "HALF_COMPLETE",
            5: "PERFECTLY_COMPLETED",
            6: "FORCE_COMPLETED",
            7: "DECOMPOSED"
        };

        vm.constProposalType = {
            UPDATE_PLAYER_INFO: "UpdatePlayerInfo",
            UPDATE_PLAYER_CREDIT: "UpdatePlayerCredit",
            FIX_PLAYER_CREDIT_TRANSFER: "FixPlayerCreditTransfer",
            UPDATE_PLAYER_EMAIL: "UpdatePlayerEmail",
            UPDATE_PLAYER_PHONE: "UpdatePlayerPhone",
            UPDATE_PLAYER_QQ: "UpdatePlayerQQ",
            UPDATE_PLAYER_WECHAT: "UpdatePlayerWeChat",
            UPDATE_PLAYER_BANK_INFO: "UpdatePlayerBankInfo",
            ADD_PLAYER_REWARD_TASK: "AddPlayerRewardTask",
            UPDATE_PARTNER_BANK_INFO: "UpdatePartnerBankInfo",
            UPDATE_PARTNER_PHONE: "UpdatePartnerPhone",
            UPDATE_PARTNER_EMAIL: "UpdatePartnerEmail",
            UPDATE_PARTNER_QQ: "UpdatePartnerQQ",
            UPDATE_PARTNER_WECHAT: "UpdatePartnerWeChat",
            UPDATE_PARTNER_INFO: "UpdatePartnerInfo",
            UPDATE_PARTNER_COMMISSION_TYPE: "UpdatePartnerCommissionType",
            FULL_ATTENDANCE: "FullAttendance",
            PLAYER_CONSUMPTION_RETURN: "PlayerConsumptionReturn",
            PARTNER_CONSUMPTION_RETURN: "PartnerConsumptionReturn",
            FIRST_TOP_UP: "FirstTopUp",
            PARTNER_INCENTIVE_REWARD: "PartnerIncentiveReward",
            PARTNER_REFERRAL_REWARD: "PartnerReferralReward",
            GAME_PROVIDER_REWARD: "GameProviderReward",
            PLATFORM_TRANSACTION_REWARD: "PlatformTransactionReward",
            PLAYER_MANUAL_TOP_UP: "ManualPlayerTopUp",
            PLAYER_ALIPAY_TOP_UP: "PlayerAlipayTopUp",
            PLAYER_WECHAT_TOP_UP: "PlayerWechatTopUp",
            PLAYER_TOP_UP: "PlayerTopUp",
            PLAYER_BONUS: "PlayerBonus",
            PLAYER_TOP_UP_RETURN: "PlayerTopUpReturn",
            PLAYER_CONSUMPTION_INCENTIVE: "PlayerConsumptionIncentive",
            PLAYER_LEVEL_UP: "PlayerLevelUp",
            PARTNER_TOP_UP_RETURN: "PartnerTopUpReturn",
            PLAYER_TOP_UP_REWARD: "PlayerTopUpReward",
            PLAYER_REFERRAL_REWARD: "PlayerReferralReward",
            PARTNER_BONUS: "PartnerBonus",
            PLAYER_CONSUMPTION_RETURN_FIX: "PlayerConsumptionReturnFix",
            PLAYER_REGISTRATION_REWARD: "PlayerRegistrationReward",
            PARTNER_COMMISSION: "PartnerCommission",
            MANUAL_UNLOCK_PLAYER_REWARD: "ManualUnlockPlayerReward",
            PLAYER_DOUBLE_TOP_UP_REWARD: "PlayerDoubleTopUpReward",
            UPDATE_PARTNER_CREDIT:"UpdatePartnerCredit",
            PLAYER_CONSECUTIVE_LOGIN_REWARD: "PlayerConsecutiveLoginReward",
            PLAYER_REGISTRATION_INTENTION: "PlayerRegistrationIntention",
            PLAYER_EASTER_EGG_REWARD: "PlayerEasterEggReward",
            PLAYER_QUICKPAY_TOP_UP: "PlayerQuickpayTopUp",
            PLAYER_TOP_UP_PROMO: "PlayerTopUpPromo",
            PLAYER_LEVEL_MIGRATION: "PlayerLevelMigration",
            PLAYER_CONSECUTIVE_CONSUMPTION_REWARD: "PlayerConsecutiveConsumptionReward",
            PLAYER_PACKET_RAIN_REWARD: "PlayerPacketRainReward",
            PLAYER_PROMO_CODE_REWARD: "PlayerPromoCodeReward",
            PLAYER_LIMITED_OFFER_INTENTION: "PlayerLimitedOfferIntention",
            PLAYER_LIMITED_OFFER_REWARD: "PlayerLimitedOfferReward",
            PLAYER_CONSECUTIVE_REWARD_GROUP: "PlayerConsecutiveRewardGroup",
            PLAYER_TOP_UP_RETURN_GROUP: "PlayerTopUpReturnGroup",
            PLAYER_RANDOM_REWARD_GROUP: "PlayerRandomRewardGroup",
            PLAYER_CONSUMPTION_REWARD_GROUP: "PlayerConsumptionRewardGroup",
            PLAYER_FREE_TRIAL_REWARD_GROUP: "PlayerFreeTrialRewardGroup",
            PLAYER_ADD_REWARD_POINTS: "PlayerAddRewardPoints",
            PLAYER_MINUS_REWARD_POINTS: "PlayerMinusRewardPoints",
            PLAYER_CONVERT_REWARD_POINTS: "PlayerConvertRewardPoints",
            PLAYER_AUTO_CONVERT_REWARD_POINTS: "PlayerAutoConvertRewardPoints"
        };

        vm.loadAdminNames = function () {
            vm.adminList = [];
            vm.platformDepartmentObjId = "";
            socketService.$socket($scope.AppSocket, 'getDepartmentDetailsByPlatformObjId', {platformObjId: vm.selectedPlatform.id},
                data => {
                    vm.currentPlatformDepartment = data.data;

                    if (vm.currentPlatformDepartment && vm.currentPlatformDepartment.length) {
                        vm.currentPlatformDepartment.map(department => {
                            if (department.departmentName == vm.selectedPlatform.data.name) {
                                vm.platformDepartmentObjId = department._id;
                                socketService.$socket($scope.AppSocket, 'getAdminNameByDepartment', {departmentId: vm.platformDepartmentObjId}, function (data) {
                                    vm.adminList = data.data;
                                    vm.adminList.sort((a, b) => {
                                        if(a.adminName > b.adminName) {
                                            return 1;
                                        } else if(a.adminName < b.adminName) {
                                            return -1;
                                        } else {
                                            return 0;
                                        }
                                    })
                                });
                            }
                        });
                    }
                }
            );
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
            $cookies.put("teleMarketShowLeft", vm.showPlatformList);
            $scope.safeApply();
        };

        vm.setAnchor = function (anchor) {
            location.hash = '';
            location.hash = anchor.toString();
        };

        $scope.$on('switchPlatform', () => {
            $scope.$evalAsync(vm.loadPlatformData());
        });

        vm.loadPlatformData = function (option) {
            vm.showPlatformSpin = true;
            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                console.log('all platform data', data.data);
                vm.showPlatformSpin = false;
                // vm.buildPlatformList(data.data);
                vm.allPlatformData = data.data;

                //select platform from cookies data
                let storedPlatform = $cookies.get("platform");
                if (storedPlatform) {
                    vm.searchAndSelectPlatform(storedPlatform, option);
                }
                vm.loadAdminNames();
            }, function (err) {
                vm.showPlatformSpin = false;
            });
        };

        vm.getConversationDefinition = function (platformData) {
            if (!platformData){
                platformData=vm.selectedPlatform.data;
            }

            vm.conversationDefinition = vm.conversationDefinition || {};
            vm.conversationDefinition.totalSec = platformData.conversationDefinition.totalSec;
            vm.conversationDefinition.askingSentence = platformData.conversationDefinition.askingSentence;
            vm.conversationDefinition.replyingSentence = platformData.conversationDefinition.replyingSentence;
        };

        //build platform list based on platform data from server
        vm.buildPlatformList = function (data) {
            vm.platformList = [];
            for (var i = 0; i < data.length; i++) {

                // load the default setting for quality inspection evalutation to each platform
                if (!data[i].overtimeSetting || data[i].overtimeSetting.length ===0){
                    vm.getOvertimeSetting(data[i]);
                }
                // create the conversationDefinition object for old platform without the field
                let id=data[i]._id;
                let query = {_id: data[i]._id, conversationDefinition: {$exists: true}};
                socketService.$socket($scope.AppSocket, 'getPlatformSetting', query, function (data) {
                    if (data.data.length === 0) {
                        let sendData = {
                            query: {_id: id},
                            updateData: {
                                'conversationDefinition.totalSec': 40,
                                'conversationDefinition.askingSentence': 2,
                                'conversationDefinition.replyingSentence': 2
                            }
                        };
                        socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                            vm.loadPlatformData({loadAll: false});
                            $scope.safeApply();
                        });
                    }
                });
                vm.getConversationDefinition(data[i]);
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
                selectPlatformNode(data);
            });
        };

        vm.showPlatformDetailTab = function (tabName) {
            vm.selectedPlatformDetailTab = tabName == null ? "backstage-settings" : tabName;
            if (tabName && tabName == "player-display-data") {
                vm.initPlayerDisplayDataModal();
            } else if (tabName && tabName == "partner-display-data") {
                vm.initPartnerDisplayDataModal();
            } else if (tabName && tabName == "system-settlement") {
                vm.prepareSettlementHistory();
            }
        };

        vm.getOvertimeSetting = function (platformData) {
            if (!platformData){
                platformData=vm.selectedPlatform.data;

            }
            vm.overtimeSetting = vm.overtimeSetting || {};
            // initiate a basic setting if the setting is empty
            if (!platformData.overtimeSetting || platformData.overtimeSetting.length === 0) {

                let overtimeSetting = [{
                    conversationInterval: 30,
                    presetMark: 1,
                    color: ""
                },
                    {
                        conversationInterval: 60,
                        presetMark: 0,
                        color: ""
                    },
                    {
                        conversationInterval: 90,
                        presetMark: -1.5,
                        color: ""
                    },
                    {
                        conversationInterval: 120,
                        presetMark: -2,
                        color: ""

                    }];

                let sendData = {
                    query: {_id: platformData._id},
                    updateData: {overtimeSetting: overtimeSetting}
                };
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    vm.loadPlatformData({loadAll: false});
                });

                vm.overtimeSetting = overtimeSetting;
            }
            else {
                vm.overtimeSetting = platformData.overtimeSetting;
            }

            vm.overtimeSetting.sort(function (a, b) {
                return a.conversationInterval - b.conversationInterval;
            });

        };

        vm.toggleShowPlatformDropDownList = function () {
            vm.showPlatformDropDownList = !vm.showPlatformDropDownList;

            $scope.safeApply();
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
            vm.rightPanelTitle == 'ALL_PROPOSAL'
            return obj;
        };

        vm.getPlatformProviderGroup = () => {
            return $scope.$socketPromise('getPlatformProviderGroup', {platformObjId: vm.selectedPlatform.data._id}).then(function (data) {
                vm.gameProviderGroup = data.data;
                vm.gameProviderGroupNames = {};
                for (let i = 0; i < vm.gameProviderGroup.length; i++) {
                    let providerGroup = vm.gameProviderGroup[i];
                    vm.gameProviderGroupNames[providerGroup._id] = providerGroup.name;
                }

                $scope.safeApply();
            });
        };

        vm.loadTab = function (tabName) {
            vm.selectedTab = tabName;

            switch(tabName) {
                case 'NEW_PHONE_LIST':
                    vm.tsNewList = {phoneIdx: 0};
                    vm.phoneNumFilterClicked();
                    vm.getPlatformTsListName();
                    break;
                case 'PHONE_LIST_ANALYSE_AND_MANAGEMENT':
                    commonService.commonInitTime(utilService, vm, 'phoneListSearch', 'startTime', '#phoneListStartTimePicker', utilService.getNdayagoStartTime(30));
                    commonService.commonInitTime(utilService, vm, 'phoneListSearch', 'endTime', '#phoneListEndTimePicker', utilService.getTodayEndTime());
                    break;
                case 'MY_PHONE_LIST_OR_REMINDER_PHONE_LIST':
                    break;
                case 'WORKLOAD REPORT':
                    break;
                case 'RECYCLE_BIN':
                    break;
                case 'PHONE_MISSION':
                    vm.initTeleMarketingOverview();
            }
        };

        //set selected platform node
        async function selectPlatformNode (platformObj, option) {
            vm.selectedPlatform = {
                text: platformObj.name,
                id: platformObj._id,
                selectable: true,
                data: platformObj,
                image: {
                    url: platformObj.icon,
                    width: 30,
                    height: 30,
                }
            };

            vm.curPlatformText = vm.selectedPlatform.text;
            $cookies.put("platform", vm.selectedPlatform.text);
            if (option && !option.loadAll) {
                $scope.safeApply();
                return;
            }
            vm.getPlatformProviderGroup();
            vm.getAllPlayerFeedbackResults();
            vm.getPlayerFeedbackTopic();
            vm.getTsDistributedPhoneDetail($scope.tsDistributedPhoneObjId);

            // Zero dependencies variable
            [vm.allTSList, [vm.queryDepartments, vm.queryRoles, vm.queryAdmins], vm.playerFeedbackTopic, vm.allPlayerFeedbackResults] = await Promise.all([
                commonService.getTSPhoneListName($scope, {platform: vm.selectedPlatform.id}).catch(err => Promise.resolve([])),
                commonService.getAllDepartmentInfo($scope, vm.selectedPlatform.id, vm.selectedPlatform.data.name).catch(err => Promise.resolve([[], [], []])),
                commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([])),
            ]);
        };

        //search and select platform node
        vm.searchAndSelectPlatform = function (text, option) {
            let findNodes = vm.allPlatformData.filter(e => e.name === text);
            if (findNodes && findNodes.length > 0) {
                selectPlatformNode(findNodes[0], option);
            } else {
                selectPlatformNode(vm.allPlatformData[0], option);
            }
        };

        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'teleMarketingControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {
            vm.loadPlatformData();
        });

        vm.getTsDistributedPhoneDetail = (distributedPhoneObjId) => {
            if (!distributedPhoneObjId) {
                return;
            }

            $scope.$socketPromise('getTsDistributedPhoneDetail', {tsDistributedPhoneObjId: distributedPhoneObjId}).then(function (data) {
                console.log('getTsDistributedPhoneDetail', data);
                if (data && data.data) {
                    vm.targetedTsDistributedPhoneDetail = data.data;
                }
            }).done();
        };

        vm.initTeleMarketingOverview = function () {
            vm.createTaskResult = '';
            if(vm.selectedPlatform){
                vm.teleMarketingTaskTab = 'TELEMARKETING_TASK_OVERVIEW';

                utilService.actionAfterLoaded('#teleMarketingOverviewEndDatetimePicker', function () {
                    $('#teleMarketingOverviewStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#teleMarketingOverviewStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                    $('#teleMarketingOverviewEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#teleMarketingOverviewEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                });
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

        //search telemarketing overview

        vm.showTeleMarketingOverview = function () {
            vm.responseMsg = false;
            utilService.actionAfterLoaded(('#teleMarketingOverview'), function () {
                vm.teleMarketingOverview.pageObj = utilService.createPageForPagingTable("#teleMarketingOverviewTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "teleMarketingOverview", vm.getTeleMarketingOverview);
                });
                vm.getTeleMarketingOverview(true);
            });
        }

        vm.getTeleMarketingOverview = function (newSearch) {
            vm.loadingTeleMarketingOverviewTable = true;

            let sendquery = {
                platform: vm.selectedPlatform.id,
                query: {
                },
                index: newSearch ? 0 : (vm.teleMarketingOverview.index || 0),
                limit: vm.teleMarketingOverview.limit || 10,
                sortCol: vm.teleMarketingOverview.sortCol || -1,
            };

            if(vm.teleMarketingOverview){
                sendquery.query.start = $('#teleMarketingOverviewStartDatetimePicker').data('datetimepicker').getLocalDate(),
                sendquery.query.end = $('#teleMarketingOverviewEndDatetimePicker').data('datetimepicker').getLocalDate()
                sendquery.query.name = vm.teleMarketingOverview.taskName ? vm.teleMarketingOverview.taskName : "";
                sendquery.query.totalImportedListOperator = vm.teleMarketingOverview.totalImportedListOperator ? vm.teleMarketingOverview.totalImportedListOperator : "";
                sendquery.query.totalImportedListValue = vm.teleMarketingOverview.totalImportedListValue ? vm.teleMarketingOverview.totalImportedListValue : "";
                sendquery.query.totalImportedListValueTwo = vm.teleMarketingOverview.totalImportedListValueTwo ? vm.teleMarketingOverview.totalImportedListValueTwo : "";
                sendquery.query.totalPlayerRegistrationOperator = vm.teleMarketingOverview.totalPlayerRegistrationOperator ? vm.teleMarketingOverview.totalPlayerRegistrationOperator : "";
                sendquery.query.totalPlayerRegistrationValue = vm.teleMarketingOverview.totalPlayerRegistrationValue ? vm.teleMarketingOverview.totalPlayerRegistrationValue : "";
                sendquery.query.totalPlayerRegistrationValueTwo = vm.teleMarketingOverview.totalPlayerRegistrationValueTwo ? vm.teleMarketingOverview.totalPlayerRegistrationValueTwo : "";
                sendquery.query.totalPlayerDepositOperator = vm.teleMarketingOverview.totalPlayerDepositOperator ? vm.teleMarketingOverview.totalPlayerDepositOperator : "";
                sendquery.query.totalPlayerDepositValue = vm.teleMarketingOverview.totalPlayerDepositValue ? vm.teleMarketingOverview.totalPlayerDepositValue : "";
                sendquery.query.totalPlayerDepositValueTwo = vm.teleMarketingOverview.totalPlayerDepositValueTwo ? vm.teleMarketingOverview.totalPlayerDepositValueTwo : "";
                sendquery.query.totalPlayerMultiDepositOperator = vm.teleMarketingOverview.totalPlayerMultiDepositOperator ? vm.teleMarketingOverview.totalPlayerMultiDepositOperator : "";
                sendquery.query.totalPlayerMultiDepositValue = vm.teleMarketingOverview.totalPlayerMultiDepositValue ? vm.teleMarketingOverview.totalPlayerMultiDepositValue : "";
                sendquery.query.totalPlayerMultiDepositValueTwo = vm.teleMarketingOverview.totalPlayerMultiDepositValueTwo ? vm.teleMarketingOverview.totalPlayerMultiDepositValueTwo : "";
                sendquery.query.totalValidPlayerOperator = vm.teleMarketingOverview.totalValidPlayerOperator ? vm.teleMarketingOverview.totalValidPlayerOperator : "";
                sendquery.query.totalValidPlayerValue = vm.teleMarketingOverview.totalValidPlayerValue ? vm.teleMarketingOverview.totalValidPlayerValue : "";
                sendquery.query.totalValidPlayerValueTwo = vm.teleMarketingOverview.totalValidPlayerValueTwo ? vm.teleMarketingOverview.totalValidPlayerValueTwo : "";
                sendquery.query.totalDepositAmountOperator = vm.teleMarketingOverview.totalDepositAmountOperator ? vm.teleMarketingOverview.totalDepositAmountOperator : "";
                sendquery.query.totalDepositAmountValue = vm.teleMarketingOverview.totalDepositAmountValue ? vm.teleMarketingOverview.totalDepositAmountValue : "";
                sendquery.query.totalDepositAmountValueTwo = vm.teleMarketingOverview.totalDepositAmountValueTwo ? vm.teleMarketingOverview.totalDepositAmountValueTwo : "";
                sendquery.query.totalValidConsumptionOperator = vm.teleMarketingOverview.totalValidConsumptionOperator ? vm.teleMarketingOverview.totalValidConsumptionOperator : "";
                sendquery.query.totalValidConsumptionValue = vm.teleMarketingOverview.totalValidConsumptionValue ? vm.teleMarketingOverview.totalValidConsumptionValue : "";
                sendquery.query.totalValidConsumptionValueTwo = vm.teleMarketingOverview.totalValidConsumptionValueTwo ? vm.teleMarketingOverview.totalValidConsumptionValueTwo : "";
            }

            socketService.$socket($scope.AppSocket, 'getTeleMarketingOverview', sendquery, function (data) {
                if(data && data.data){
                    console.log('getTeleMarketingOverview', data.data.dxMissionData);
                    let result = data.data.dxMissionData;
                    vm.teleMarketingOverview.totalCount = data.data.totalCount;
                    result.forEach((item,index) => {
                        item['createTime'] = vm.dateReformat(item.createTime);
                        item.sentMessageListCount$ = item.sentMessageListCount + "/" + item.importedListCount;
                        //item['targetProviderGroup'] = $translate(item.targetProviderGroup);
                    });

                    $scope.$evalAsync(vm.drawTeleMarketingOverviewTable(newSearch, result, vm.teleMarketingOverview.totalCount));
                    vm.loadingTeleMarketingOverviewTable = false;

                    //hide sub table after search
                    vm.showPlayerTable = false;
                    vm.showSMSTable = false;

                }
            });
        };

        vm.drawTeleMarketingOverviewTable = function (newSearch, tblData, size) {
            console.log("teleMarketingOverviewTable",tblData);

            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.teleMarketingOverview.sortCol || {},
                aoColumnDefs: [
                    // {'sortCol': 'createTime$', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 550,
                "scrollCollapse": true,
                columns: [

                    {
                        title: $translate('ORDER'),
                        render: function(data, type, row, index){
                            return index.row+1 ;
                        }

                    },
                    {
                        title: $translate('TASK_NAME'),
                        data: "name",
                        render: function (data, type, row) {
                            var link = $('<a>', {

                                'ng-click': 'vm.showTeleMarketingTaskModal("' + row['_id'] + '")'

                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {title: $translate('TASK_REMARK'), data: "description"},
                    {title: $translate('TASK_CREATE_TIME'), data: "createTime"},
                    {title: $translate('TOTAL_IMPORTED_LIST'), data: "importedListCount"},
                    {
                        title: $translate('TOTAL_SENT_MESSAGE'),
                        data: "sentMessageListCount$",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.showTelePlayerSendingMsgTable("' + row['_id'] + '");  vm.setAnchor("smsTableAnchor"); vm.initTelePlayerSendingMsgTable()'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_PLAYER_CLICKED'),
                        data: "registeredPlayerCount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'style': (row.alerted ? "color:red;" : ""),
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalPlayer"); vm.showPagedTelePlayerTable(); vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_PLAYER_DEPOSIT'),
                        data: "topUpPlayerCount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalPlayerTopUp","' + row['topUpPlayerArr'] +'"); vm.showPagedTelePlayerTable();vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_PLAYER_MULTI_DEPOSIT'),
                        data: "multiTopUpPlayerCount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalPlayerMultiTopUp","' + row['multiTopUpPlayerArr'] +'"); vm.showPagedTelePlayerTable();vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_VALID_PLAYER'),
                        data: "totalValidConsumptionCount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalValidPlayer","' + row['validPlayerArr'] +'"); vm.showPagedTelePlayerTable();vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_DEPOSIT_AMOUNT'),
                        data: "totalPlayerDepositAmount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalDepositAmount","' + row['depositPlayerArr'] +'"); vm.showPagedTelePlayerTable();vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_VALID_CONSUMPTION'),
                        data: "totalValidConsumptionAmount",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.setPlayerInfoQuery("' + row['_id'] + '","TotalValidConsumption","' + row['consumptionPlayerArr'] +'"); vm.showPagedTelePlayerTable();vm.setAnchor("telePlayerTableAnchor")'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('ACTION_BUTTON'),
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': "vm.showDeleteDXModal(" + JSON.stringify(row) + ")",
                            }).text($translate("DELETE"));
                            return link.prop('outerHTML');
                        }
                    }
                ],
                "paging": false,
                // "scrollX": true,
                // "autoWidth": true,
                // "sScrollY": 350,
                // "scrollCollapse": true,
                // "destroy": true,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            tableOptions.language.emptyTable=$translate("No data available in table");

            utilService.createDatatableWithFooter('#teleMarketingOverviewTable', tableOptions, {
            });

            vm.teleMarketingOverview.pageObj.init({maxCount: size}, newSearch);
            $('#teleMarketingOverviewTable').off('order.dt');
            $('#teleMarketingOverviewTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'teleMarketingOverview', vm.getTeleMarketingOverview);
            });
            $('#teleMarketingOverviewTable').resize();

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
        };

        vm.showDeleteDXModal = function (data) {
            if (data._id) {
                vm.dxMissionToDeleteObjId = data._id
                $("#modalDeleteDXMission").modal('show');
            }
        }

        vm.deleteDXMission = function () {
            socketService.$socket($scope.AppSocket, 'deleteDxMissionDxPhone', {
                _id: vm.dxMissionToDeleteObjId
            },data => {
                vm.showTeleMarketingOverview();
            });
        }

        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };

        vm.showTeleMarketingTaskModal = function (id) {
            vm.editTeleMarketing = null;
            vm.editTaskResult = ''
            socketService.$socket($scope.AppSocket, 'getDxMission', {
                platformId: vm.selectedPlatform.id,
                '_id': id
            }, function (data) {
                vm.editTeleMarketing = data.data[0];
                vm.editTeleMarketingDefault = data.data[0];
                //let tmpt = vm.proposalTemplate[templateNo];
                $("#modalDXMission").modal('show');
                $("#modalDXMission").css('z-Index', 1051).modal();

                $("#modalDXMission").on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })
            })
        };

        //create teleMarketing task
        vm.createTeleMarketingTask = function () {
            let sendData = {
                platform: vm.selectedPlatform.data._id,
                name: vm.createTeleMarketing.name,
                description: vm.createTeleMarketing.description,
                playerPrefix: vm.createTeleMarketing.playerPrefix,
                lastXDigit: vm.createTeleMarketing.lastXDigit,
                password: vm.createTeleMarketing.password,
                domain: vm.createTeleMarketing.domain,
                loginUrl: vm.createTeleMarketing.loginUrl,
                creditAmount: vm.createTeleMarketing.creditAmount,
                providerGroup: vm.createTeleMarketing.providerGroup,
                requiredConsumption: vm.createTeleMarketing.requiredConsumption,
                invitationTemplate: vm.createTeleMarketing.invitationTemplate,
                welcomeTitle: vm.createTeleMarketing.welcomeTitle,
                welcomeContent: vm.createTeleMarketing.welcomeContent,
                alertDays: vm.createTeleMarketing.alertDays,
                forbidWithdrawIfBalanceAfterUnlock: vm.createTeleMarketing.forbidWithdrawIfBalanceAfterUnlock,
            };

            console.log("creteTeleMarketingTask send", sendData);
            socketService.$socket($scope.AppSocket, 'createDxMission', sendData, function (data) {
                console.log("create DX Mission retData", data);
                if(data.success && data.data) {
                    //display success
                    vm.createTaskResult = 'SUCCESS';
                    vm.resetTeleMarketing();
                } else {
                    //display error
                    vm.createTaskResult = 'FAIL';
                    vm.resetTeleMarketing();
                }
            });
        };

        vm.resetTeleMarketing = function(){
            vm.createTeleMarketing = Object.assign({}, vm.createTeleMarketingDefault);
            $scope.safeApply();
        };

        vm.resetEditTeleMarketing = function(){
          vm.editTeleMarketing = Object.assign({}, vm.editTeleMarketingDefault);
          $scope.safeApply();
        }
        //update teleMarketing task
        vm.updateTeleMarketingTask = function () {
            let updateData = {
                name: vm.editTeleMarketing.name,
                description: vm.editTeleMarketing.description,
                playerPrefix: vm.editTeleMarketing.playerPrefix,
                lastXDigit: vm.editTeleMarketing.lastXDigit,
                password: vm.editTeleMarketing.password,
                domain: vm.editTeleMarketing.domain,
                loginUrl: vm.editTeleMarketing.loginUrl,
                creditAmount: vm.editTeleMarketing.creditAmount,
                providerGroup: vm.editTeleMarketing.providerGroup,
                requiredConsumption: vm.editTeleMarketing.requiredConsumption,
                invitationTemplate: vm.editTeleMarketing.invitationTemplate,
                welcomeTitle: vm.editTeleMarketing.welcomeTitle,
                welcomeContent: vm.editTeleMarketing.welcomeContent,
                alertDays: vm.editTeleMarketing.alertDays,
                forbidWithdrawIfBalanceAfterUnlock: vm.editTeleMarketing.forbidWithdrawIfBalanceAfterUnlock,
            };
            let id = vm.editTeleMarketing._id ? vm.editTeleMarketing._id : null;
            console.log("editTeleMarketingTask send", updateData);
            socketService.$socket($scope.AppSocket, 'updateDxMission', { '_id': id , 'data': updateData }, function (data) {
                console.log("create DX Mission retData", data);
                if(data.success && data.data) {
                    //display success
                    vm.editTaskResult = 'SUCCESS';
                    vm.resetEditTeleMarketing();
                } else {
                    //display error
                    vm.editTaskResult = 'FAIL';
                    vm.resetEditTeleMarketing();
                }
                vm.showTeleMarketingOverview();
            });
        };

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

        // phone number filter codes==============start===============================
        vm.phoneNumFilterClicked = function () {
            vm.filterAllPlatform = false;
            vm.inputNewPhoneNum = [];
            vm.phoneNumCSVResult = false;
            vm.phoneNumTXTResult = false;
            vm.phoneNumListResult = false;
            vm.phoneNumXLSResult = false;
            vm.resetInputCSV = false;
            vm.resetInputTXT = false;
            vm.gridOptions = {
                enableFiltering: true,
                onRegisterApi: function (api) {
                    vm.gridApi = api;
                }
            };
            vm.allDxMission = [];
            vm.getAllDxMission();
            vm.importPhoneResult = '';
        };

        vm.getAllDxMission = function () {
            let sendData = {
                platform: vm.selectedPlatform.id
            };

            socketService.$socket($scope.AppSocket, 'getAllDxMission', sendData, function (data) {
                vm.allDxMission = data.data;
                $scope.safeApply();
            });
        };

        // import phone number to system
        vm.importDiffPhoneNum = function (diffPhoneNum, dxMission) {
            vm.selectedDxMission = '';

            let sendData = {
                platform: vm.selectedPlatform.id,
                phoneNumber: diffPhoneNum,
                dxMission: dxMission
            };

            socketService.$socket($scope.AppSocket, 'importDiffPhoneNum', sendData, function (data) {
                if (data.success && data.data) {
                    //display success
                    vm.importPhoneResult = 'IMPORT_SUCCESS';
                } else {
                    //display error
                    vm.importPhoneResult = 'IMPORT_FAIL';
                }

                $scope.safeApply();
            });
        };

        vm.getPlatformTsListName = function () {
            let sendData = {
                platform: vm.selectedPlatform.id
            }
            socketService.$socket($scope.AppSocket, 'getTsNewListName', sendData, function (data) {
                vm.platformTsListName = data.data || [];
            });
        };

        // import phone number to system
        vm.importTSNewList = function (uploadData, tsNewListObj) {
            let dailyDistributeTaskDate = $('#dxTimePicker').data('datetimepicker').getLocalDate();
            let sendData = {
                phoneListDetail: uploadData,
                isUpdateExisting: vm.tsNewList && vm.tsNewList.checkBoxA || false,
                updateData: {
                    platform: vm.selectedPlatform.id,
                    creator: authService.adminId,
                    name: tsNewListObj.name,
                    description: tsNewListObj.description,
                    failFeedBackResult: tsNewListObj.failFeedBackResult,
                    failFeedBackTopic: tsNewListObj.failFeedBackTopic,
                    failFeedBackContent: tsNewListObj.failFeedBackContent,
                    callerCycleCount: tsNewListObj.callerCycleCount,
                    dailyCallerMaximumTask: tsNewListObj.dailyCallerMaximumTask,
                    dailyDistributeTaskHour: dailyDistributeTaskDate.getHours(),
                    dailyDistributeTaskMinute: dailyDistributeTaskDate.getMinutes(),
                    dailyDistributeTaskSecond: dailyDistributeTaskDate.getSeconds(),
                    distributeTaskStartTime: $('#dxDatePicker').data('datetimepicker').getLocalDate(),
                    reclaimDayCount: tsNewListObj.reclaimDayCount,
                    isCheckWhiteListAndRecycleBin: tsNewListObj.isCheckWhiteListAndRecycleBin,
                    dangerZoneList: tsNewListObj.dangerZoneList,
                }
            };

            console.log('sendData', sendData);

            socketService.$socket($scope.AppSocket, 'importTSNewList', sendData, function (data) {
                $scope.$evalAsync(() => {
                    if (data.success && data.data) {
                        vm.getPlatformTsListName();
                        //display success
                        vm.importPhoneResult = 'IMPORT_SUCCESS';
                    } else {
                        //display error
                        vm.importPhoneResult = 'IMPORT_FAIL';
                    }
                })
            });
        };

        /****************** CSV - start ******************/
        // upload phone file: csv
        vm.uploadPhoneFileCSV = function (content) {
            vm.splitPhoneCSV = content.split(/\n/g).map((item) => item.trim());
            vm.arrayPhoneCSV = vm.splitPhoneCSV.slice(0, vm.splitPhoneCSV.length - 1);

            let sendData = {
                filterAllPlatform: vm.filterAllPlatform,
                platformObjId: vm.selectedPlatform.id,
                arrayPhoneCSV: vm.arrayPhoneCSV
            };

            socketService.$socket($scope.AppSocket, 'uploadPhoneFileCSV', sendData, function (data) {
                vm.diffPhoneCSV = data.data.diffPhoneCSV;

                // convert string to array, csv only accept array format
                vm.diffPhoneCSVArray = JSON.parse('[' + vm.diffPhoneCSV + ']');
                vm.diffPhoneCSVArray = vm.diffPhoneCSVArray.map(phoneNumber => {
                    return [phoneNumber];
                });

                vm.samePhoneCSV = data.data.samePhoneCSV;
                vm.diffPhoneTotalCSV = data.data.diffPhoneTotalCSV;
                vm.samePhoneTotalCSV = data.data.samePhoneTotalCSV;
                $scope.safeApply();
            });
        };

        // display content from CSV file
        vm.showContentCSV = function (fileContent) {
            vm.contentCSV = fileContent;
        };

        // reset phone number CSV
        vm.resetCSV = function () {
            vm.contentCSV = false;
            vm.resetInputCSV = !vm.resetInputCSV;
            vm.phoneNumCSVResult = false;
            vm.samePhoneCSV = '';
            vm.diffPhoneCSV = '';
            vm.samePhoneTotalCSV = '';
            vm.diffPhoneTotalCSV = '';
        };
        /****************** CSV - end ******************/

        /****************** TXT - start ******************/
        // upload phone file: txt
        vm.uploadPhoneFileTXT = function (content) {
            vm.arrayPhoneTXT = content.split(/,|, /).map((item) => item.trim());
            vm.arrayPhoneTXT = vm.arrayPhoneTXT.filter(Boolean); //filter out empty strings (due to extra comma)

            let sendData = {
                filterAllPlatform: vm.filterAllPlatform,
                platformObjId: vm.selectedPlatform.id,
                arrayPhoneTXT: vm.arrayPhoneTXT
            };

            socketService.$socket($scope.AppSocket, 'uploadPhoneFileTXT', sendData, function (data) {
                vm.diffPhoneTXT = data.data.diffPhoneTXT;
                vm.samePhoneTXT = data.data.samePhoneTXT;
                vm.diffPhoneTotalTXT = data.data.diffPhoneTotalTXT;
                vm.samePhoneTotalTXT = data.data.samePhoneTotalTXT;
                $scope.safeApply();
            });
        };

        // export phone number to txt
        vm.exportTXTFile = function (data) {
            let fileText = data;
            let fileName = "phoneNumberFilter.txt";
            vm.saveTextAsFile(fileText, fileName);
        };

        // export phone number as txt file
        vm.saveTextAsFile = function (data, filename) {
            if (!data) {
                console.error('Console.save: No data');
                return;
            }

            if (!filename) filename = 'console.json';


            let blob = new Blob([data], {type: 'text/plain'});
            let event = document.createEvent('MouseEvents');
            let tagA = document.createElement('a');

            // for IE:
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, filename);
            } else {
                let event = document.createEvent('MouseEvents');
                let tagA = document.createElement('a');


                tagA.download = filename;
                tagA.href = window.URL.createObjectURL(blob);
                tagA.dataset.downloadurl = ['text/plain', tagA.download, tagA.href].join(':');
                event.initEvent('click', true, false, window,
                    0, 0, 0, 0, 0, false, false, false, false, 0, null);
                tagA.dispatchEvent(event);
            }
        };

        // display content from TXT file
        vm.showContentTXT = function (fileContent) {
            vm.contentTXT = fileContent;
        };

        // reset phone number TXT
        vm.resetTXT = function () {
            vm.contentTXT = false;
            vm.resetInputTXT = !vm.resetInputTXT;
            vm.phoneNumTXTResult = false;
            vm.samePhoneTXT = '';
            vm.diffPhoneTXT = '';
            vm.samePhoneTotalTXT = '';
            vm.diffPhoneTotalTXT = '';
            vm.selectedDxMission = '';
            vm.importPhoneResult = '';
        };
        /****************** TXT - end ******************/

        /****************** List - start ******************/
        // compare a new list pf phone numbers with existing player info database
        // generate a new list of phone numbers without existing player phone number
        vm.comparePhoneNum = function () {
            vm.arrayInputPhone = vm.inputNewPhoneNum.split(/,|, /).map((item) => item.trim());
            vm.arrayInputPhone = vm.arrayInputPhone.filter(Boolean); //filter out empty strings (due to extra comma)

            let sendData = {
                filterAllPlatform: vm.filterAllPlatform,
                platformObjId: vm.selectedPlatform.id,
                arrayInputPhone: vm.arrayInputPhone
            };

            socketService.$socket($scope.AppSocket, 'comparePhoneNum', sendData, function (data) {
                vm.diffPhoneList = data.data.diffPhoneList;
                vm.samePhoneList = data.data.samePhoneList;
                vm.diffPhoneTotal = data.data.diffPhoneTotal;
                vm.samePhoneTotal = data.data.samePhoneTotal;
                $scope.safeApply();
            });
        };


        // reset phone number textarea
        vm.resetTextarea = function () {
            vm.inputNewPhoneNum = '';
            vm.phoneNumListResult = false;
            vm.samePhoneList = '';
            vm.diffPhoneList = '';
            vm.selectedDxMission = '';
            vm.importPhoneResult = '';
        };

        // copy phone number list
        vm.copyToClipboard = function (elementId) {
            vm.copyHere = false;
            // Create an auxiliary hidden input
            var aux = document.createElement("input");
            // Get the text from the element passed into the input
            aux.setAttribute("value", document.getElementById(elementId).innerHTML);
            // Append the aux input to the body
            document.body.appendChild(aux);
            // Highlight the content
            aux.select();
            // Execute the copy command
            document.execCommand("copy");
            // Remove the input from the body
            document.body.removeChild(aux);
        };
        /****************** List - end ******************/

        /****************** XLS - start ******************/
        vm.uploadPhoneFileXLS = function (data, importXLS, dxMission, isCreateTsNewList) {
            let rows = uiGridExporterService.getData(vm.gridApi.grid, uiGridExporterConstants.VISIBLE, uiGridExporterConstants.VISIBLE);
            let sheet = {};
            let rowArray = [];
            let rowArrayMerge;
            let isTSNewList = Boolean(!dxMission && isCreateTsNewList);
            let phoneList = {};

            for (let z = 0; z < rows.length; z++) {
                let rowObject = rows[z][vm.tsNewList.phoneIdx];
                let rowObjectValue = Object.values(rowObject);
                rowArray.push(rowObjectValue);
                rowArrayMerge = [].concat.apply([], rowArray);
                phoneList[rows[z][vm.tsNewList.phoneIdx].value] = {
                    phoneNumber: rows[z][vm.tsNewList.phoneIdx].value,
                };
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].playerName = rows[z][vm.tsNewList.phoneIdx+2] && rows[z][vm.tsNewList.phoneIdx+2].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].realName = rows[z][vm.tsNewList.phoneIdx+3] && rows[z][vm.tsNewList.phoneIdx+3].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].gender = rows[z][vm.tsNewList.phoneIdx+4] && rows[z][vm.tsNewList.phoneIdx+4].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].dob = rows[z][vm.tsNewList.phoneIdx+5] && rows[z][vm.tsNewList.phoneIdx+5].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].wechat = rows[z][vm.tsNewList.phoneIdx+6] && rows[z][vm.tsNewList.phoneIdx+6].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].qq = rows[z][vm.tsNewList.phoneIdx+7] && rows[z][vm.tsNewList.phoneIdx+7].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].email = rows[z][vm.tsNewList.phoneIdx+8] && rows[z][vm.tsNewList.phoneIdx+8].value;
                phoneList[rows[z][vm.tsNewList.phoneIdx].value].remark = rows[z][vm.tsNewList.phoneIdx+9] && rows[z][vm.tsNewList.phoneIdx+9].value;
            }

            let sendData = {
                filterAllPlatform: vm.filterAllPlatform,
                platformObjId: vm.selectedPlatform.id,
                arrayPhoneXLS: rowArrayMerge,
                isTSNewList: isTSNewList
            };

            socketService.$socket($scope.AppSocket, 'uploadPhoneFileXLS', sendData, function (data) {
                console.log("uploadPhoneFileXLS ret", data);
                vm.diffPhoneXLS = data.data.diffPhoneXLS;
                vm.samePhoneXLS = data.data.samePhoneXLS;
                vm.diffPhoneTotalXLS = data.data.diffPhoneTotalXLS;
                vm.samePhoneTotalXLS = data.data.samePhoneTotalXLS;
                vm.xlsTotal = rows.length;
                let rowsFilter = rows;

                if (vm.diffPhoneTotalXLS) {
                    for (let x = 0; x < rowsFilter.length; x++) {
                        let rowObject = rowsFilter[x][vm.tsNewList.phoneIdx];
                        let rowObjectValue = Object.values(rowObject);
                        for (let y = 0; y < vm.samePhoneXLS.length; y++) {
                            if (rowObjectValue == vm.samePhoneXLS[y]) {
                                rowsFilter.splice(x, 1);
                                --x;
                                break;
                            }
                        }
                    }

                    vm.gridApi.grid.columns.forEach(function (col, i) {
                        if (col.visible) {
                            let loc = XLSX.utils.encode_cell({r: 0, c: i});
                            sheet[loc] = {
                                v: col.displayName
                            };
                        }
                    });

                    var endLoc;
                    rowsFilter.forEach(function (row, ri) {
                        ri += 1;
                        vm.gridApi.grid.columns.forEach(function (col, ci) {
                            let loc = XLSX.utils.encode_cell({r: ri, c: ci});
                            sheet[loc] = {
                                v: row[ci].value,
                                t: 's'
                            };
                            endLoc = loc;
                        });
                    });

                    sheet['!ref'] = XLSX.utils.encode_range({s: 'A1', e: endLoc});
                    let workbook = {
                        SheetNames: ['Sheet1'],
                        Sheets: {
                            Sheet1: sheet
                        }
                    };

                    if (vm.phoneNumXLSResult) {
                        var wopts = {bookType: 'xlsx', bookSST: false, type: 'binary'};
                        // write workbook (use type 'binary')
                        var wbout = XLSX.write(workbook, wopts);
                        saveAs(new Blob([vm.s2ab(wbout)], {type: ""}), "phoneNumberFilter.xlsx");
                    } else if (isTSNewList) {
                        let uploadData = [];
                        let phoneArr = vm.diffPhoneXLS.split(/[\n,]+/).map((item) => item.trim());
                        phoneArr.forEach(phoneNumber => {
                            uploadData.push(phoneList[phoneNumber]);
                        });
                        vm.importTSNewList(uploadData, vm.tsNewList)
                    } else if (importXLS) {
                        vm.importDiffPhoneNum(vm.diffPhoneXLS, dxMission)
                    }
                } else {
                    vm.importPhoneResult = 'THERE_IS_NO_DIFFERENT_NUMBER_IN_LIST';
                }

                $scope.safeApply();
            });
        };

        // generate a download for xls
        vm.s2ab = function (s) {
            var buf = new ArrayBuffer(s.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
            return buf;
        };

        // convert data array to spreadsheet format
        vm.sheet_from_array_of_arrays = function (data, opts) {
            var ws = {};
            // var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
            var range = {e: {c: 10000000, r: 10000000}, s: {c: 0, r: 0}};
            for (var R = 0; R != data.length; ++R) {
                for (var C = 0; C != data[R].length; ++C) {
                    if (range.s.r > R) range.s.r = R;
                    if (range.s.c > C) range.s.c = C;
                    if (range.e.r < R) range.e.r = R;
                    if (range.e.c < C) range.e.c = C;
                    var cell = {v: data[R][C]};
                    if (cell.v == null) continue;
                    var cell_ref = XLSX.utils.encode_cell({c: C, r: R});

                    if (typeof cell.v === 'number') cell.t = 'n';
                    else if (typeof cell.v === 'boolean') cell.t = 'b';
                    else if (cell.v instanceof Date) {
                        cell.t = 'n';
                        cell.z = XLSX.SSF._table[14];
                        cell.v = datenum(cell.v);
                    }
                    else cell.t = 's';
                    ws[cell_ref] = cell;
                }
            }
            if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
            return ws;
        };

        // reset phone number XLS
        vm.resetUIGrid = function () {
            vm.gridOptions.data = [];
            vm.gridOptions.columnDefs = [];
            vm.xlsTotal = '';
            vm.samePhoneTotalXLS = '';
            vm.diffPhoneTotalXLS = '';
            vm.phoneNumXLSResult = false;
            vm.selectedDxMission = '';
            vm.importPhoneResult = '';
        };
        /****************** XLS - end ******************/
        // phone number filter codes==============end===============================



        // generate telePlayer function table ====================Start==================

        vm.isOneSelectedPlayer = function () {
            return vm.selectedSinglePlayer;
        };

        //check if update player button can be enabled
        vm.canEditPlayer = function () {
            return vm.isOneSelectedPlayer();
        };


        //********************************** start of Message Sending functions **********************************
        vm.initMessageModal = function () {

            $('#sendMessageToPlayerTab').addClass('active');
            $('#messageLogTab').removeClass('active');

            $scope.safeApply();
            vm.messageModalTab = "sendMessageToPlayerPanel";
            vm.messageForPlayer = {};
        };

        vm.sendMessageToPlayerBtn = function (type, data) {
            vm.telphonePlayer = data;
            $('#messagePlayerModal').modal('show');
        };

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

        vm.initMailLog = function () {
            vm.mailLog = vm.mailLog || {};
            vm.mailLog.query = {};
            vm.mailLog.receivedMails = [{}];
            vm.mailLog.isAdmin = true;
            vm.mailLog.isSystem = true;
            utilService.actionAfterLoaded('#messagePlayerModal.in #messageLogPanel #mailLogQuery .endTime', function () {
                vm.mailLog.startTime = utilService.createDatePicker('#messageLogPanel #mailLogQuery .startTime');
                vm.mailLog.endTime = utilService.createDatePicker('#messageLogPanel #mailLogQuery .endTime');
                vm.mailLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.mailLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.searchMailLog();
            });
        };

        vm.searchMailLog = function () {
            let requestData = {
                recipientId: vm.selectedSinglePlayer._id,
                startTime: vm.mailLog.startTime.data('datetimepicker').getLocalDate() || new Date(0),
                endTime: vm.mailLog.endTime.data('datetimepicker').getLocalDate() || new Date()
            };
            if(!vm.mailLog.isAdmin && vm.mailLog.isSystem){
                requestData.senderType = 'System';
            } else if (vm.mailLog.isAdmin && !vm.mailLog.isSystem) {
                requestData.senderType = 'admin';
            }
            $scope.$socketPromise('searchMailLog', requestData).then(result => {
                console.log("result:", result);
                vm.mailLog.receivedMails = result.data;
                for (let i = 0; i < vm.mailLog.receivedMails.length; i++) {
                    vm.mailLog.receivedMails[i].mailStatus$ = "UNREAD";
                    if (vm.mailLog.receivedMails[i].hasBeenRead) {
                        vm.mailLog.receivedMails[i].mailStatus$ = "MARK_AS_READ";
                    }
                    if (vm.mailLog.receivedMails[i].bDelete) {
                        vm.mailLog.receivedMails[i].mailStatus$ = "DELETE";
                    }
                }
                $scope.safeApply();
            }).catch(console.error);
        };

        //********************************** end of Message Sending functions **********************************

        //********************************** start of SMS Sending functions **********************************
        vm.getAllMessageTypes = function () {
            return $scope.$socketPromise('getAllMessageTypes', '').then(function (data) {
                vm.allMessageTypes = data.data;
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

                if(!isInGroup)
                    vm.noGroupSmsSetting.push(vm.allMessageTypes[messageType]);
            }
            $scope.safeApply();
        };

        vm.getPlatformSmsGroups =  () => {
            return $scope.$socketPromise('getPlatformSmsGroups', {platformObjId: vm.selectedPlatform.data._id}).then(function (data) {
                vm.smsGroups = data.data;
                console.log('vm.smsGroups', vm.smsGroups);
                vm.getNoInGroupSmsSetting();
                $scope.safeApply();
            });
        };

        vm.initSMSModal = function () {
            $('#smsToPlayerTab').addClass('active');
            $('#smsLogTab').removeClass('active');
            $('#smsSettingTab').removeClass('active');
            vm.smsModalTab = "smsToPlayerPanel";
            vm.playerSmsSetting = {smsGroup:{}};
            vm.getPlatformSmsGroups();
            vm.getAllMessageTypes();
            $scope.safeApply();
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

        vm.onClickPlayerCheck = function (recordId, callback, param) {
            if (!(param instanceof Array)) {
                param = param ? [param] : [];
            }

            if (vm.selectedSinglePlayer._id && recordId === vm.selectedSinglePlayer._id) {
                callback.apply(null, param);
            }
            else {
                setTimeout(function () {
                    vm.onClickPlayerCheck(recordId, callback, param);
                }, 50);
            }
        };

        vm.getSMSTemplate = function () {
            vm.smsTemplate = [];
            $scope.$socketPromise('getMessageTemplatesForPlatform', {
                platform: vm.selectedPlatform.id,
                format: 'smstpl'
            }).then(function (data) {
                vm.smsTemplate = data.data;
                console.log("vm.smsTemplate", vm.smsTemplate);
                $scope.safeApply();
            }).done();
        };

        vm.useSMSTemplate = function () {
            vm.sendMultiMessage.messageContent = vm.smsTplSelection[0] ? vm.smsTplSelection[0].content : '';
            vm.messagesChange();
        };

        vm.changeSMSTemplate = function () {
            vm.smsPlayer.message = vm.smstpl ? vm.smstpl.content : '';
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
            if(type=="multi") {
                endTimeElementPath = '#groupSmsLogQuery .endTime';
                tablePageId = "groupSmsLogTablePage";
            }
            utilService.actionAfterLoaded(endTimeElementPath, function () {
                vm.smsLog.query.startTime = utilService.createDatePicker('#smsLogPanel #smsLogQuery .startTime');
                vm.smsLog.query.endTime = utilService.createDatePicker('#smsLogPanel #smsLogQuery .endTime');
                if(type=="multi") {
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

        vm.telorMessageToPlayerBtn = function (type, data) {
            // var rowData = JSON.parse(data);
            console.log(type, data);
            vm.getSMSTemplate();
            var title, text;
            if (type == 'msg' && authService.checkViewPermission('Player', 'Player', 'sendSMS')) {
                vm.smsPlayer = {
                    playerId: data.playerId,
                    name: data.name,
                    nickName: data.nickName || "",
                    platformId: vm.selectedPlatform.data.platformId,
                    channel: $scope.channelList[0],
                    hasPhone: data.phoneNumber
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
                socketService.$socket($scope.AppSocket, 'getPlayerPhoneNumber', {playerObjId: data._id}, function (data) {
                    $scope.phoneCall.phone = data.data;
                    $scope.phoneCall.loadingNumber = false;
                    $scope.safeApply();
                    $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
                }, function (err) {
                    $scope.phoneCall.loadingNumber = false;
                    $scope.phoneCall.err = err.error.message;
                    alert($scope.phoneCall.err);
                    $scope.safeApply();
                }, true);
            }
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

        vm.loadSMSSettings = function () {
            let selectedPlayer = vm.isOneSelectedPlayer();   // ~ 20 fields!
            let editPlayer = vm.editPlayer;                  // ~ 6 fields
            vm.playerBeingEdited = {
                smsSetting: selectedPlayer.smsSetting,
                receiveSMS: selectedPlayer.receiveSMS
            };

        };

        vm.updateSMSSettings = function () {
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
            });

        };

        //********************************** end of SMS Sending functions **********************************

        //********************************** start of AddFeedBack functions **********************************
        vm.initFeedbackModal = function (selectedPlayer) {
            vm.selectedSinglePlayer = selectedPlayer;
            $('#addFeedbackTab').addClass('active');
            $('#feedbackHistoryTab').removeClass('active');
            vm.getAllPlayerFeedbackResults();
            vm.getPlayerFeedbackTopic();
            $scope.safeApply();
            vm.feedbackModalTab = "addFeedbackPanel";
        };

        vm.getAllPlayerFeedbackResults = function () {
            return $scope.$socketPromise('getAllPlayerFeedbackResults').then(
                function (data) {
                    vm.allPlayerFeedbackResults = data.data;
                    console.log("vm.allPlayerFeedbackResults", data.data);
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.allPlayerFeedbackResults", err);
                }
            ).catch(function (err) {
                console.log("vm.allPlayerFeedbackResults", err)
            });
        };
        vm.getAllPlayerFeedbackTopics = function () {
            return $scope.$socketPromise('getAllPlayerFeedbackTopics').then(
                function (data) {
                    vm.allPlayerFeedbackTopics = data.data;
                    console.log("vm.allPlayerFeedbackTopics", data.data);
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.allPlayerFeedbackTopics", err);
                }
            ).catch(function (err) {
                console.log("vm.allPlayerFeedbackTopics", err)
            });
        };
        vm.getPlayerFeedbackTopic = function () {
            return $scope.$socketPromise('getPlayerFeedbackTopic', {platform: vm.selectedPlatform.id}).then(
                function (data) {
                    vm.playerFeedbackTopic = data.data;
                    console.log("vm.allPlayerFeedbackTopics", data.data);
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.allPlayerFeedbackTopics", err);
                }
            ).catch(function (err) {
                console.log("vm.allPlayerFeedbackTopics", err)
            });
        };

        vm.clearPlayerFeedBackResultDataStatus = function () {
            vm.addPlayerFeedbackResultData.message = null;
            vm.addPlayerFeedbackResultData.success = null;
            vm.addPlayerFeedbackResultData.failure = null;

            vm.deletePlayerFeedbackResultData.message = null;
            vm.deletePlayerFeedbackResultData.success = null;
            vm.deletePlayerFeedbackResultData.failure = null;
        };

        vm.addPlayerFeedbackResult = function () {
            vm.clearPlayerFeedBackResultDataStatus();
            let reqData = {};
            reqData.key = vm.addPlayerFeedbackResultData.key;
            reqData.value = vm.addPlayerFeedbackResultData.value;
            console.log(reqData);
            return $scope.$socketPromise('createPlayerFeedbackResult', reqData).then(
                function (data) {
                    console.log("vm.addPlayerFeedbackResults()", data);
                    vm.addPlayerFeedbackResultData.message = "SUCCESS";
                    vm.addPlayerFeedbackResultData.success = true;
                    vm.getAllPlayerFeedbackResults();
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.addPlayerFeedbackResults()ErrIn", err);
                    vm.addPlayerFeedbackResultData.message = "FAILURE";
                    vm.addPlayerFeedbackResultData.failure = true;
                    $scope.safeApply();
                }
            ).catch(
                function (err) {
                    console.log("vm.addPlayerFeedbackResults()ErrOut", err);
                    vm.addPlayerFeedbackResultData.message = "FAILURE";
                    vm.addPlayerFeedbackResultData.failure = true;
                    $scope.safeApply();
                }
            );
        };

        vm.deletePlayerFeedbackResult = function () {
            vm.clearPlayerFeedBackResultDataStatus();
            let reqData = {};
            reqData._id = vm.deletePlayerFeedbackResultData._id;
            return $scope.$socketPromise('deletePlayerFeedbackResult', reqData).then(
                function (data) {
                    console.log("vm.addPlayerFeedbackResults()", data);
                    vm.deletePlayerFeedbackResultData.message = "SUCCESS";
                    vm.deletePlayerFeedbackResultData.success = true;
                    vm.getAllPlayerFeedbackResults();
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.addPlayerFeedbackResults()ErrIn", err);
                    vm.deletePlayerFeedbackResultData.message = "FAILURE";
                    vm.deletePlayerFeedbackResultData.failure = true;
                    $scope.safeApply();
                }
            ).catch(
                function (err) {
                    console.log("vm.addPlayerFeedbackResults()Out", err);
                    vm.deletePlayerFeedbackResultData.message = "FAILURE";
                    vm.deletePlayerFeedbackResultData.failure = true;
                    $scope.safeApply();
                }
            );
        };

        vm.clearPlayerFeedBackTopicDataStatus = function () {
            vm.addPlayerFeedbackTopicData.message = null;
            vm.addPlayerFeedbackTopicData.success = null;
            vm.addPlayerFeedbackTopicData.failure = null;

            vm.deletePlayerFeedbackTopicData.message = null;
            vm.deletePlayerFeedbackTopicData.success = null;
            vm.deletePlayerFeedbackTopicData.failure = null;
        };

        vm.addPlayerFeedbackTopic = function () {
            vm.clearPlayerFeedBackTopicDataStatus();
            let reqData = {};
            reqData.key = vm.addPlayerFeedbackTopicData.value;
            reqData.value = vm.addPlayerFeedbackTopicData.value;
            reqData.platform = vm.selectedPlatform.id;
            console.log(reqData);
            return $scope.$socketPromise('createPlayerFeedbackTopic', reqData).then(
                function (data) {
                    console.log("vm.addPlayerFeedbackTopics()", data);
                    vm.addPlayerFeedbackTopicData.message = "SUCCESS";
                    vm.addPlayerFeedbackTopicData.success = true;
                    vm.getPlayerFeedbackTopic();
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.addPlayerFeedbackTopics()ErrIn", err);
                    vm.addPlayerFeedbackTopicData.message = "FAILURE";
                    vm.addPlayerFeedbackTopicData.failure = true;
                    if(err.error && err.error.error && err.error.error.code == '11000'){
                        vm.addPlayerFeedbackTopicData.message = '失败，回访主题已存在'
                    }
                    $scope.safeApply();
                }
            ).catch(
                function (err) {
                    console.log("vm.addPlayerFeedbackTopics()ErrOut", err);
                    vm.addPlayerFeedbackTopicData.message = "FAILURE";
                    vm.addPlayerFeedbackTopicData.failure = true;
                    if(err.error && err.error.error && err.error.error.code == '11000'){
                        vm.addPlayerFeedbackTopicData.message = '失败，回访主题已存在'
                    }
                    $scope.safeApply();
                }
            );
        };

        vm.deletePlayerFeedbackTopic = function () {
            vm.clearPlayerFeedBackTopicDataStatus();
            let reqData = {};
            reqData._id = vm.deletePlayerFeedbackTopicData._id;
            return $scope.$socketPromise('deletePlayerFeedbackTopic', reqData).then(
                function (data) {
                    console.log("vm.addPlayerFeedbackTopics()", data);
                    vm.deletePlayerFeedbackTopicData.message = "SUCCESS";
                    vm.deletePlayerFeedbackTopicData.success = true;
                    vm.getPlayerFeedbackTopic();
                    $scope.safeApply();
                },
                function (err) {
                    console.log("vm.addPlayerFeedbackTopics()ErrIn", err);
                    vm.deletePlayerFeedbackTopicData.message = "FAILURE";
                    vm.deletePlayerFeedbackTopicData.failure = true;
                    $scope.safeApply();
                }
            ).catch(
                function (err) {
                    console.log("vm.addPlayerFeedbackTopics()Out", err);
                    vm.deletePlayerFeedbackTopicData.message = "FAILURE";
                    vm.deletePlayerFeedbackTopicData.failure = true;
                    $scope.safeApply();
                }
            );
        };

        vm.updatePlayerFeedback = function () {
            let resultName = vm.allPlayerFeedbackResults.filter(item => {
                return item.key == vm.playerFeedback.result;
            });
            resultName = resultName.length > 0 ? resultName[0].value : "";
            let sendData = {
                playerId: vm.isOneSelectedPlayer()._id,
                platform: vm.selectedPlatform.id,
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

                // let rowData = vm.playerTableClickedRow.data();
                // rowData.feedbackTimes++;
                // vm.playerTableClickedRow.data(rowData).draw();
                vm.getPagedTelePlayerTable(true);
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

        vm.prepareShowFeedbackRecord = function () {
            vm.playerFeedbackData = [];
            vm.processDataTableinModal('#modalAddPlayerFeedback', '#playerFeedbackRecordTable', {'dom': 't'});
            vm.playerFeedbackRecord = vm.playerFeedbackRecord || {};
            utilService.actionAfterLoaded('#modalAddPlayerFeedback .searchDiv .startTime', function () {
                vm.playerFeedbackRecord.startTime = utilService.createDatePicker('#modalAddPlayerFeedback .searchDiv .startTime');
                vm.playerFeedbackRecord.endTime = utilService.createDatePicker('#modalAddPlayerFeedback .searchDiv .endTime');
                vm.playerFeedbackRecord.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerFeedbackRecord.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.updatePlayerFeedbackData('#modalAddPlayerFeedback', '#playerFeedbackRecordTable', {'dom': 't'});
            });
        };

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
        //********************************** end of AddFeedBack functions **********************************

        //********************************** start of TopUp functions **********************************
        // Bank Card Top Up
        vm.showTopupTab = function (tabName) {
            vm.selectedTopupTab = tabName == null ? "manual" : tabName;
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

        vm.filterBankname = function (which) {
            var key = '';
            if (event && event.target) {
                key = event.target.value || '';
            }
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

        vm.initPlayerManualTopUp = function () {
            vm.getZoneList();
            vm.getBankTypeList();
            vm.provinceList = [];
            vm.cityList = [];
            vm.districtList = [];
            vm.freezeZoneSelection = false;
            vm.playerManualTopUp = {submitted: false};
            vm.filterBankname("playerManualTopUp");
            vm.existingManualTopup = null;
            vm.chosenBankAcc = {};
            socketService.$socket($scope.AppSocket, 'getManualTopupRequestList', {playerId: vm.selectedSinglePlayer.playerId}, function (data) {
                vm.existingManualTopup = data.data ? data.data : false;
            });
            // utilService.actionAfterLoaded('#modalPlayerManualTopUp', function () {
            //     vm.playerManualTopUp.createTime = utilService.createDatePicker('#modalPlayerManualTopUp .createTime');
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerManualTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_manual_topup"] .createTime');
                vm.playerManualTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
        };

        vm.pickBankCardAcc = function (bankcard) {
            console.log(bankcard);
            bankcard = JSON.parse(bankcard);
            if (bankcard.accountNumber) {
                vm.playerManualTopUp.groupBankcardList = [bankcard.accountNumber];
                vm.playerManualTopUp.bankTypeId = bankcard.bankTypeId;
                vm.playerManualTopUp.lastBankcardNo = bankcard['accountNumber'].substr(bankcard['accountNumber'].length - 4);
            }

        };

        vm.getAllBankCard = function () {
            socketService.$socket($scope.AppSocket, 'getAllBankCard', {platform: vm.selectedPlatform.data.platformId},
                data => {
                    var data = data.data;
                    vm.bankCards = data.data ? data.data : false;
                });
        }

        vm.getBankTypeList = function () {
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
        }

        vm.getBankCardTypeTextbyId = function (id) {
            if (!vm.allBankTypeList) {
                return id;
            } else {
                return vm.allBankTypeList[id];
            }
        };

        vm.selectedDepositMethod = function(depositMethod) {
            if(depositMethod == "1" || depositMethod == "3" || depositMethod == "4") {
                vm.playerManualTopUp.realName = vm.selectedSinglePlayer.realName;
            }
            if(depositMethod == "3"){
                vm.playerManualTopUp.remark = vm.selectedSinglePlayer.playerId;
            } else {
                vm.playerManualTopUp.remark = "";
            }
        };

        vm.applyPlayerManualTopUp = function () {
            var sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                depositMethod: vm.playerManualTopUp.depositMethod,
                amount: vm.playerManualTopUp.amount,
                lastBankcardNo: vm.playerManualTopUp.lastBankcardNo,
                bankTypeId: vm.playerManualTopUp.bankTypeId,
                provinceId: vm.playerManualTopUp.provinceId,
                cityId: vm.playerManualTopUp.cityId,
                districtId: vm.playerManualTopUp.districtId,
                fromFPMS: true,
                createTime: vm.playerManualTopUp.createTime.data('datetimepicker').getLocalDate(),
                remark: vm.playerManualTopUp.remark,
                groupBankcardList: vm.playerManualTopUp.groupBankcardList,
                bonusCode: vm.playerManualTopUp.bonusCode,
                realName: vm.playerManualTopUp.realName,
                topUpReturnCode: vm.playerManualTopUp.topUpReturnCode
            };
            vm.playerManualTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyManualTopUpRequest', sendData,
                function (data) {
                    console.log('manualTopup success', data);
                    vm.playerManualTopUp.responseData = data.data;
                    //vm.getPlatformPlayersData();
                    $scope.safeApply();
                }, function (error) {
                    vm.playerManualTopUp.responseMsg = $translate(error.error.errorMessage);
                    // socketService.showErrorMessage(error.error.errorMessage);
                    //vm.getPlatformPlayersData();
                    $scope.safeApply();
                });
        };

        vm.cancelPlayerManualTop = function () {
            if (!vm.existingManualTopup) {
                return;
            }
            var sendQuery = {
                playerId: vm.selectedSinglePlayer.playerId,
                proposalId: vm.existingManualTopup.proposalId
            };
            socketService.$socket($scope.AppSocket, 'cancelManualTopupRequest', sendQuery, function (data) {
                console.log(data.data);
                if (vm.existingManualTopup.proposalId == data.data.proposalId) {
                    vm.existingManualTopup.isCanceled = true;
                }
                $scope.safeApply();
            });
        }

        //AliPay Top Up
        vm.initPlayerAlipayTopUp = function () {
            vm.getAllAlipaysByAlipayGroup();
            vm.playerAlipayTopUp = {submitted: false};
            vm.existingAlipayTopup = null;
            commonService.resetDropDown('#alipayOption');
            socketService.$socket($scope.AppSocket, 'getAlipayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                     $scope.$evalAsync(()=>{
                         vm.existingAlipayTopup = data.data ? data.data : false;
                     });
                });
            vm.alipaysAcc = '';

            // utilService.actionAfterLoaded('#modalPlayerAlipayTopUp', function () {
            //     vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerAlipayTopUp .createTime');
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_alipay_topup"] .createTime');
                vm.playerAlipayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
        };

        vm.pickAlipayAcc = function () {
            vm.playerAlipayTopUp.alipayName = '';
            vm.playerAlipayTopUp.alipayAccount = '';
            if (vm.alipaysAcc != '') {
                var alipayAcc = vm.alipaysAcc;
                vm.playerAlipayTopUp.alipayName = alipayAcc['name'];
                vm.playerAlipayTopUp.alipayAccount = alipayAcc['accountNumber'];
            }

        }

        vm.getAllAlipaysByAlipayGroup = function () {
            socketService.$socket($scope.AppSocket, 'getAllAlipaysByAlipayGroup', {platform: vm.selectedPlatform.data.platformId},
                data => {

                  $scope.$evalAsync(()=>{
                      let alipayAccs = data && data.data && data.data.data ? data.data.data : false;
                      alipayAccs.forEach(alipayAcc=>{
                          let stateName = $translate(alipayAcc.state == 'DISABLED' ? 'DISABLE' : alipayAcc.state);
                          alipayAcc.displayText = alipayAcc.accountNumber +' '+ alipayAcc.name + ' (' + stateName+')'
                      })
                      vm.allAlipaysAcc = alipayAccs;
                  });
                });
        }

        vm.applyPlayerAlipayTopUp = () => {
            let sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerAlipayTopUp.amount,
                alipayName: vm.playerAlipayTopUp.alipayName,
                alipayAccount: vm.playerAlipayTopUp.alipayAccount,
                bonusCode: vm.playerAlipayTopUp.bonusCode,
                remark: vm.playerAlipayTopUp.remark,
                realName: vm.playerAlipayTopUp.realName,
                createTime: vm.playerAlipayTopUp.createTime.data('datetimepicker').getLocalDate(),
                topUpReturnCode: vm.playerAlipayTopUp.topUpReturnCode
            };
            vm.playerAlipayTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyAlipayTopUpRequest', sendData,
                data => {
                    vm.playerAlipayTopUp.responseMsg = $translate('SUCCESS');
                    //vm.getPlatformPlayersData();
                    $scope.safeApply();
                },
                error => {
                    vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                    // socketService.showErrorMessage(error.error.errorMessage);
                    //vm.getPlatformPlayersData();
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

        // WechatPay TopUp
        vm.initPlayerWechatPayTopUp = function () {
            vm.getAllWechatpaysByWechatpayGroup();
            commonService.resetDropDown('#wechatpayOption');
            vm.playerWechatPayTopUp = {submitted: false, notUseQR: "true"};
            vm.existingWechatPayTopup = null;
            socketService.$socket($scope.AppSocket, 'getWechatPayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    $scope.$evalAsync(()=>{
                        vm.existingWechatPayTopup = data.data ? data.data : false;
                    });
                });
            vm.wechatpaysAcc = '';

            // utilService.actionAfterLoaded('#modalPlayerWechatPayTopUp', function () {
            //     vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerWechatPayTopUp .createTime');
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_wechatPay_topup"] .createTime');
                vm.playerWechatPayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
        };

        vm.getAllWechatpaysByWechatpayGroup = function () {
            socketService.$socket($scope.AppSocket, 'getAllWechatpaysByWechatpayGroup', {platform: vm.selectedPlatform.data.platformId},
                data => {
                  $scope.$evalAsync(()=>{
                      let wechatAccs = data && data.data && data.data.data ? data.data.data : false;
                      wechatAccs.forEach(wechatAcc=>{
                          let stateName = $translate(wechatAcc.state == 'DISABLED' ? 'DISABLE' : wechatAcc.state);
                          wechatAcc.displayText = (wechatAcc.nickName || '') + ' ' + wechatAcc.accountNumber + ' (' + stateName+')'
                      })
                      vm.allWechatpaysAcc = wechatAccs;
                  });
                });
        }

        vm.applyPlayerWechatPayTopUp = () => {
            let sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                amount: vm.playerWechatPayTopUp.amount,
                wechatPayName: vm.playerWechatPayTopUp.wechatPayName || " ",
                wechatPayAccount: vm.playerWechatPayTopUp.wechatPayAccount,
                bonusCode: vm.playerWechatPayTopUp.bonusCode,
                remark: vm.playerWechatPayTopUp.remark,
                createTime: vm.playerWechatPayTopUp.createTime.data('datetimepicker').getLocalDate(),
                notUseQR: !!vm.playerWechatPayTopUp.notUseQR,
                topUpReturnCode: vm.playerWechatPayTopUp.topUpReturnCode
            };
            console.log("applyPlayerWechatPayTopUp", sendData);
            vm.playerWechatPayTopUp.submitted = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'applyWechatPayTopUpRequest', sendData,
                data => {
                    vm.playerWechatPayTopUp.responseMsg = $translate('SUCCESS');
                    //vm.getPlatformPlayersData();
                    $scope.safeApply();
                },
                error => {
                    vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                    // socketService.showErrorMessage(error.error.errorMessage);
                    //vm.getPlatformPlayersData();
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

        vm.pickWechatPayAcc = function () {
            vm.playerWechatPayTopUp.wechatPayName = '';
            vm.playerWechatPayTopUp.wechatPayAccount = '';
            if (vm.wechatpaysAcc != '') {
                var wechatpayAcc = vm.wechatpaysAcc;
                vm.playerWechatPayTopUp.wechatPayName = wechatpayAcc['name'];
                vm.playerWechatPayTopUp.wechatPayAccount = wechatpayAcc['accountNumber'];
            }
        };
        //********************************** end of TopUp functions **********************************

        //********************************** start of ApplyBonus functions **********************************
        vm.initPlayerBonus = function () {
            vm.playerBonus = {
                resMsg: '',
                showSubmit: true,
                notSent: true,
                bonusId: 1
            };
        };

        vm.calSpendingAmt = function (rowId) {
            let rewardTaskGroup = vm.dynRewardTaskGroupId[0] ? vm.dynRewardTaskGroupId[0] :null;

            if(!rewardTaskGroup){
                return {'incCurConsumption': 0, 'currentAmt': 0, 'currentMax': 0}
            }else{
                let spendingAmt = 0;

                //calculate the value between this rowId
                let currentMax = 0;
                let AmtNow = 0;
                let curConsumption = rewardTaskGroup.curConsumption ? rewardTaskGroup.curConsumption : 0;
                for (let i = 0; i <= rowId; i++) {
                    if (vm.rewardTaskProposalData[i]) {
                        let proposalSpendingAmt =
                            vm.rewardTaskProposalData[i].data.spendingAmount
                            || vm.rewardTaskProposalData[i].data.requiredUnlockAmount
                            || vm.rewardTaskProposalData[i].data.amount
                            || 0;

                        let forbidXIMAAmt = 0;
                        let spendingAmount = proposalSpendingAmt;
                        let rewardTaskGroup = vm.dynRewardTaskGroupId[0] ? vm.dynRewardTaskGroupId[0] : null;
                        if(rewardTaskGroup){
                            forbidXIMAAmt = rewardTaskGroup.forbidXIMAAmt ? rewardTaskGroup.forbidXIMAAmt:0;
                        }
                        currentMax = proposalSpendingAmt;
                        spendingAmt += spendingAmount;
                    }
                }
                let incCurConsumption = curConsumption - spendingAmt;

                if(incCurConsumption >= 0 ){
                    AmtNow = currentMax;
                }else{
                    AmtNow = currentMax + incCurConsumption;
                    if(AmtNow <= 0){
                        AmtNow = 0;
                    }
                }

                return {'incCurConsumption': incCurConsumption, 'currentAmt': AmtNow, 'currentMax': currentMax}
            }
        };

        vm.applyPlayerBonus = function () {

            // retrieve the related rewardTasks
            if (vm.playerBonus.bForce == true){
                let sendQuery = {
                    playerObjId: vm.isOneSelectedPlayer()._id,
                    platformId: vm.selectedPlatform.id,
                };
                socketService.$socket($scope.AppSocket, 'getRewardTaskGroupProposalById', sendQuery, function (data) {

                    if (!data && data.data[0] && data.data[1]){
                        return Q.reject("Record is not found");
                    }

                    vm.rewardTaskGroupProposalList = [];
                    let providerGroupId;
                    vm.isUnlockTaskGroup = true;
                    vm.rtgBonusAmt = {};

                    data.data[1].forEach( inData => {
                        inData.currentAmount$ = inData.currentAmt - inData.initAmt;
                        inData.bonusAmount$ = -inData.initAmt;

                        if (inData.providerGroup) {
                            providerGroupId = inData.providerGroup._id;
                        }
                        vm.rtgBonusAmt[providerGroupId] = inData.currentAmount$;
                    });

                    data.data[1].forEach( (inData, indexInData) => {
                        vm.dynRewardTaskGroupId =[];
                        vm.dynRewardTaskGroupId.push(inData);
                        vm.rewardTaskProposalData = data.data[0][indexInData];
                        let result = data.data[0][indexInData];
                        let usedTopUp = [];
                        result.forEach((item,index) => {
                            item.proposalId = item.proposalId || item.data.proposalId;
                            item['createTime$'] = vm.dateReformat(item.data.createTime$);
                            item.useConsumption = item.data.useConsumption;
                            item.topUpProposal = item.data.topUpProposalId ? item.data.topUpProposalId: item.data.topUpProposal;
                            item.topUpAmount = item.data.topUpAmount;
                            item.bonusAmount = item.data.rewardAmount;
                            item.applyAmount = item.data.applyAmount || item.data.amount;
                            item.requiredUnlockAmount = item.data.spendingAmount;
                            item.requiredBonusAmount = item.data.requiredBonusAmount;
                            item['provider$'] = $translate(item.data.provider$);
                            item.rewardType = item.data.rewardType;

                            item.requiredUnlockAmount$ = item.requiredUnlockAmount;
                            if(vm.isUnlockTaskGroup){
                                let spendingAmt = vm.calSpendingAmt(index);

                                item.curConsumption$ = spendingAmt.currentAmt;
                                item.maxConsumption$ = spendingAmt.currentMax;
                            } else {
                                item.curConsumption$ = item.requiredBonusAmount;
                                item.maxConsumption$ = item.requiredUnlockAmount;
                            }
                            item.bonusAmount$ = item.data.bonusAmount;
                            item.requiredBonusAmount$ = item.requiredBonusAmount;
                            item.currentAmount$ = item.data.currentAmount;

                            item.availableAmt$ = (item.applyAmount || 0) + (item.bonusAmount || 0);
                            item.archivedAmt$ = 0;
                            if (vm.rtgBonusAmt[item.data.providerGroup] <= -(item.availableAmt$)) {
                                vm.rtgBonusAmt[item.data.providerGroup] -= -(item.availableAmt$);
                                item.archivedAmt$ = item.availableAmt$
                            } else if (vm.rtgBonusAmt[item.data.providerGroup] != 0) {
                                if (item.data.providerGroup === '') {
                                    let archivedAmtEmpty = vm.rtgBonusAmt["undefined"] ? vm.rtgBonusAmt["undefined"] : 0;
                                    item.archivedAmt$ = -archivedAmtEmpty;
                                    vm.rtgBonusAmt["undefined"] = 0;

                                } else {
                                    item.archivedAmt$ = -vm.rtgBonusAmt[item.data.providerGroup];
                                    vm.rtgBonusAmt[item.data.providerGroup] = 0;
                                    item.archivedAmt$ = item.archivedAmt$? item.archivedAmt$: 0;
                                }
                            }
                            item.isArchived =
                                item.archivedAmt$ == item.availableAmt$ || item.curConsumption$ == item.requiredUnlockAmount$;

                            if (item.data.isDynamicRewardAmount || (item.data.promoCodeTypeValue && item.data.promoCodeTypeValue == 3) || item.data.limitedOfferObjId){
                                usedTopUp.push(item.topUpProposal)
                            }

                        });

                        if (usedTopUp.length > 0) {
                            result = result.filter((item, index) => {
                                for (let i = 0; i < usedTopUp.length; i++) {
                                    if (usedTopUp.indexOf(item.proposalId) < 0) {
                                        return item;
                                    }
                                }
                            });
                        }

                        vm.rewardTaskGroupProposalList.push(result);

                    })

                })

            }

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
                $scope.$evalAsync(() => {
                    console.log('applyBonusRequest success', data);
                    vm.playerBonus.resMsg = $translate('Approved');
                    vm.playerBonus.showSubmit = false;
                    //vm.getPlatformPlayersData();
                    // save the rewardTask that is manually unlocked
                    if(vm.playerBonus.bForce && vm.rewardTaskGroupProposalList && vm.rewardTaskGroupProposalList.length > 0){
                        vm.rewardTaskGroupProposalList.forEach( listData => {
                            listData.forEach( rewardTask => {
                                let sendData = {
                                    platformId: vm.selectedPlatform.id,
                                    playerId: vm.isOneSelectedPlayer()._id,
                                    unlockTime: new Date().toISOString(),
                                    creator: {
                                        type: rewardTask.creator.type,
                                        name: rewardTask.creator.name,
                                        id: rewardTask.creator.id
                                    },
                                    rewardTask: {
                                        type: rewardTask.type.name,
                                        id: rewardTask.type._id,
                                    },
                                    currentConsumption: rewardTask.curConsumption$,
                                    maxConsumption: rewardTask.maxConsumption$,
                                    currentAmount: -rewardTask.archivedAmt$,
                                    targetAmount: rewardTask.availableAmt$,
                                    topupAmount: rewardTask.topUpAmount,
                                    proposalId: rewardTask._id,
                                    proposalNumber: rewardTask.proposalId,
                                    topupProposalNumber: rewardTask.topUpProposal,
                                    bonusAmount: rewardTask.bonusAmount,
                                    targetProviderGroup: rewardTask.data.provider$,
                                    status: "ManualUnlock",
                                    useConsumption: rewardTask.useConsumption,
                                    inProvider: rewardTask.inProvider,

                                };

                                socketService.$socket($scope.AppSocket, 'createRewardTaskGroupUnlockedRecord', sendData, function (data) {
                                    console.log('createRewardTaskGroupUnlockedRecord', sendData);
                                    $scope.safeApply();
                                })
                            })
                        })
                    }
                })
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
        //********************************** end of ApplyBonus functions **********************************

        //********************************** start of AddReward functions **********************************
        vm.showRewardSettingsTab = function (tabName) {
            vm.selectedRewardSettingsTab = tabName == null ? "manual-reward" : tabName;

            if (tabName == "reward-progress") {
                vm.currentFreeAmount = null;
                vm.playerCreditDetails = null;
                $('#rewardTaskLogTbl').empty();

                $scope.$socketPromise('getPrevious10PlayerRTG', {platformId: vm.selectedPlatform.id , playerId: vm.selectedSinglePlayer._id})
                    .then(last30Data => console.log('Player last 30 RTG', last30Data));
            }
        };

        vm.initPlayerAddRewardTask = function () {
            vm.playerAddRewardTask = {
                showSubmit: true,
                providerGroup: ''
            };
            vm.showRewardSettingsTab(null);
        };

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
            if (!obj) return;
            let rewardObj = angular.fromJson(obj);
            if (!rewardObj) return;
            vm.playerApplyRewardPara.code = rewardObj.code;
            vm.playerApplyRewardShow.TopupRecordSelect = false;
            let type = rewardObj.type ? rewardObj.type.name : null;

            if (type == 'FirstTopUp') {
                vm.playerApplyRewardShow.selectTopupRecordsMulti = true;
                vm.playerApplyRewardShow.topUpRecordIds = {};
            } else {
                vm.playerApplyRewardShow.selectTopupRecordsMulti = false;
                vm.playerApplyRewardShow.topUpRecordIds = {};
            }

            if (type == "FirstTopUp" || type == "PlayerTopUpReturn" || type == "PartnerTopUpReturn" || type == "PlayerDoubleTopUpReward" || type == "PlayerTopUpReturnGroup") {
                vm.playerApplyRewardShow.TopupRecordSelect = true;
                vm.playerAllTopupRecords = null;
                vm.getPlayerTopupRecord(null, rewardObj);
            }

            vm.playerApplyRewardShow.AmountInput = type == "GameProviderReward";
            vm.playerApplyRewardShow.showReferral = type == "PlayerReferralReward"

            // PlayerConsumptionReturn
            vm.playerApplyRewardShow.showConsumptionReturn = type == "PlayerConsumptionReturn";
            vm.playerApplyRewardShow.consumptionReturnData = {};
            if (type == "PlayerConsumptionReturn") {
                socketService.$socket($scope.AppSocket, 'getConsumeRebateAmount', {playerId: vm.isOneSelectedPlayer().playerId, eventCode: vm.playerApplyRewardPara.code}, function (data) {
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
                        vm.playerApplyRewardShow.consumptionReturnData[key].nonXIMAAmt = parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].nonXIMAAmt).toFixed(2);
                        vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')] = vm.playerApplyRewardShow.consumptionReturnData[key];
                        // hide consumption type that is not in current selecting platform
                        if(vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')].ratio ==0)
                            delete vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')]
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

        vm.initPlayerApplyReward = function () {
            vm.playerApplyRewardPara = {};
            vm.playerApplyRewardShow = {};
            vm.playerApplyEventResult = null;
            $scope.rewardObj = vm.allRewardEvent[0];
            vm.playerApplyRewardCodeChange(vm.playerApplyRewardPara);
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
            vm.selectedRewards = [];
            // $('#modalManualUnlockRewardTask').modal();
            $scope.safeApply();
        };

        vm.getRewardTaskDetail = (playerId, callback) => {
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

        vm.getRewardTaskLogData = function (newSearch, isFreeAmt) {
            vm.isUnlockTaskGroup = false;
            let sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform,
                from: vm.rewardTaskLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.rewardTaskLog.query.endTime.data('datetimepicker').getLocalDate(),
                unlockStatus: vm.unlockStatus,
                rewardProposalId: vm.rewardProposalId,
                topUpProposalId: vm.topUpProposalId,
                selectedProviderGroupID: vm.selectedProviderGroupID,
                showProposal: false,
                index: newSearch ? 0 : vm.rewardTaskLog.index,
                limit: newSearch ? 10 : vm.rewardTaskLog.limit,
                sortCol: vm.rewardTaskLog.sortCol || null,
                useProviderGroup: vm.selectedPlatform.data.useProviderGroup
            };

            if (isFreeAmt) {
                sendQuery.selectedProviderGroupID = 'free';
                sendQuery.showProposal = true;
            }
            socketService.$socket($scope.AppSocket, 'getPlayerRewardTask', sendQuery, function (data) {
                vm.curRewardTask = data.data;
                console.log('Player reward task log:', vm.curRewardTask);
                let tblData = data && data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.topUpAmount = (item.topUpAmount);
                    item.bonusAmount$ = -item.data.currentAmt;
                    item.requiredBonusAmount$ = (item.requiredBonusAmount);
                    item.currentAmount$ = 0;
                    item.providerStr$ = '(' + ((item.targetProviders && item.targetProviders.length > 0) ? item.targetProviders.map(pro => {
                        return pro.name + ' ';
                    }) : $translate('all')) + ')';

                    if (!item.targetEnable && item.targetProviders && item.targetProviders.length > 0) {
                        item.provider$ = $translate('Excluded') + ' ' + item.providerStr$
                    } else {
                        item.provider$ = item.providerStr$;
                    }

                    if (item.rewardType) {
                        item.rewardType = $translate(item.rewardType);
                    }
                    // if search from topupProposalId
                    if (data.data.topUpProposal && data.data.topUpProposal != '') {
                        item.topUpProposal = data.data.topUpProposal;
                        item.topUpAmount = data.data.topUpAmountSum;
                    }
                    // if search from topupProposalId
                    if (data.data.topUpAmountSum) {
                        item.topUpAmount$ = data.data.topUpAmountSum;
                    }
                    if (data.data.creator) {
                        item.creator = data.data.creator
                    }
                    if (item.data) {
                        item.currentAmount = item.data.currentAmount;
                        item.bonusAmount = item.data.currentAmt;
                        item.requiredBonusAmount = item.data.requiredBonusAmount;
                        item.bonusAmount$ = item.data.bonusAmount;
                        item.requiredBonusAmount$ = item.data.requiredBonusAmount;
                        item.requiredUnlockAmount = item.data.requiredUnlockAmount;
                        item.rewardType = item.data.rewardType;
                    }

                    return item;
                }) : [];
                let size = data.data ? data.data.size : 0;
                let summary = data.data ? data.data.summary : [];
                let topUpAmountSum = data.data ? data.data.topUpAmountSum : 0;
                vm.rewardTaskLog.totalCount = size;

                $scope.$evalAsync(vm.drawRewardTaskGroupTable(newSearch, data, size, summary, topUpAmountSum));
            });
        };

        vm.drawRewardTaskGroupTable = function (newSearch, tdata, size, summary, topUpAmountSum) {
            let tblData = null;

            if (vm.selectedPlatform.data.useProviderGroup) {
                tblData = tdata && tdata.data ? tdata.data.displayRewardTaskGroup.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.currentAmount$ = item.currentAmt - item.initAmt;
                    item.bonusAmount$ = -item.initAmt;
                    return item;
                }) : [];
                tblData = tblData.filter(item => {
                    return item.status == 'Started'
                });
                vm.rewardTaskGroupDetails = tblData;
            }

            let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [

                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('Reward Task Group(Progress)'),
                        data: "providerGroup.name",
                        advSearch: true,
                        sClass: "",
                        render: function (data, type, row) {
                            data = data || '';
                            let providerGroupId = row.providerGroup ? row.providerGroup._id : null;
                            let link = $('<div>', {});

                            if (data) {
                                link.append($('<a>', {
                                    'ng-click': 'vm.getRewardTaskGroupProposal("' + providerGroupId + '");',
                                }).text(data ? data : 0));
                            }
                            else {

                                link.append($('<a>', {
                                    'ng-click': 'vm.getRewardTaskGroupProposal();'
                                }).text(data ? data : $translate('Valid Progress')));
                            }
                            return link.prop('outerHTML')
                        }
                    },
                    {
                        title: $translate('Unlock Progress(Consumption)'),
                        advSearch: true,
                        sClass: "",
                        render: function (data, type, row) {
                            let providerGroupId = row.providerGroup ? row.providerGroup._id : '';
                            let forbidXIMAAmt = Number(row.forbidXIMAAmt ? row.forbidXIMAAmt :0);
                            let targetConsumption = Number(row.targetConsumption);
                            var text = row.curConsumption + '/' + (targetConsumption + forbidXIMAAmt);
                            var result = '<div id="' + "pgConsumpt" + providerGroupId + '">' + text + '</div>';
                            return result;
                        }
                    },
                    {
                        title: $translate('Unlock Progress(WinLose)'),
                        advSearch: true,
                        sClass: "",
                        render: function (data, type, row) {
                            let providerGroupId;

                            if (row.providerGroup) {
                                providerGroupId = row.providerGroup._id;
                            }

                            let text = row.currentAmount$ + '/' + row.bonusAmount$;
                            vm.rtgBonusAmt[providerGroupId] = row.currentAmount$;
                            vm.rewardTaskGroupCurrentAmt = row.currentAmount$;
                            var result = '<div id="' + "pgReward" + providerGroupId + '">' + text + '</div>';
                            return result;
                        }
                    },
                ],
                "paging": false,
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 350,
                "scrollCollapse": true,
                "destroy": true,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }

            });

            let aTable = $("#rewardTaskGroupLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.rewardTaskLog.pageObj.init({maxCount: size}, newSearch);
            $('#rewardTaskGroupLogTbl').off('order.dt');
            $('#rewardTaskGroupLogTbl').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'rewardTaskLog', vm.getRewardTaskLogData);
            });
            $("#rewardTaskGroupLogTbl").resize();
        };


        vm.displayProviderGroupCredit = function(){
            console.log('displayProviderGroupCredit');
            let playerId = vm.selectedSinglePlayer.playerId;
            let platformId = vm.selectedPlatform.data.platformId;
            socketService.$socket($scope.AppSocket, 'getCreditDetail', {playerObjId: vm.selectedSinglePlayer._id}, function (data) {
                console.log('getCreditDetail', data);
                vm.playerCreditDetails = data.data.lockedCreditList;
                vm.currentFreeAmount = data.data ? data.data.credit : '';
                vm.currentFreeAmount =  $noRoundTwoDecimalPlaces(vm.currentFreeAmount);
                vm.playerCreditDetails.map(d=>{
                    if(d.validCredit == 'unknown'){
                        d.validCredit = '';
                    }
                })
                vm.getPlatformProviderGroup().then(
                    allProviderGroup => {
                        let allGameProviderGroup = [];
                        for (let i = 0; i < vm.gameProviderGroup.length; i++) {
                            allGameProviderGroup.push({
                                nickName: vm.gameProviderGroup[i].name? vm.gameProviderGroup[i].name: "",
                                validCredit: 0
                            })
                        }
                        if (vm.playerCreditDetails.length > 0) {
                            allGameProviderGroup = allGameProviderGroup.filter(a => {
                                let isFound = false;
                                for (let j = 0; j < vm.playerCreditDetails.length; j++) {
                                    if (vm.playerCreditDetails[j].nickName == a.nickName) {
                                        isFound = true;
                                    }
                                    ;
                                }
                                ;
                                if (!isFound) {
                                    return a;
                                }
                            });
                        }
                        vm.playerCreditDetails = vm.playerCreditDetails.concat(allGameProviderGroup);
                        function compare(a,b) {
                            if (a.nickName < b.nickName)
                                return -1;
                            if (a.nickName > b.nickName)
                                return 1;
                            return 0;
                        }
                        vm.playerCreditDetails.sort(compare);
                        $scope.safeApply();
                    }
                )
            })
        }

        vm.initRewardTaskLog = function () {
            vm.rewardTaskLog = vm.rewardTaskLog || {totalCount: 0, limit: 10, index: 0, query: {}};
            vm.isUnlockTaskGroup = false;
            vm.chosenProviderGroupId = null;
            vm.rtgBonusAmt = {};
            utilService.actionAfterLoaded('#rewardTaskLogQuery .endTime', function () {
                vm.rewardTaskLog.query.startTime = utilService.createDatePicker('#rewardTaskLogQuery .startTime');
                vm.rewardTaskLog.query.endTime = utilService.createDatePicker('#rewardTaskLogQuery .endTime');
                vm.rewardTaskLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.rewardTaskLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.rewardTaskLog.pageObj = utilService.createPageForPagingTable("#rewardTaskLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "rewardTaskLog", vm.getRewardTaskLogData)
                });
                $scope.$evalAsync(vm.getRewardTaskLogData(true));
            });

            $scope.$evalAsync(vm.displayProviderGroupCredit());
        };

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
        };

        vm.applyPlayerReward = function (isForceApply = false) {
            vm.applyXM = true;
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
            if (isForceApply) {
                sendQuery.data.isForceApply = isForceApply;
            }
            socketService.$socket($scope.AppSocket, 'applyRewardEvent', sendQuery, function (data) {
                console.log('sent', data);
                vm.applyXM = false;
                vm.playerApplyEventResult = data;
                $scope.safeApply();
            }, function (err) {
                vm.applyXM = false;
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.safeApply();
            });
        };

        vm.updateManualUnlockRewardTaskIndexList = function (index, checked) {
            if (checked) {
                vm.manualUnlockRewardTaskIndexList.push(index);
            } else {
                vm.manualUnlockRewardTaskIndexList.splice(vm.manualUnlockRewardTaskIndexList.indexOf(index), 1);
            }
        };

        vm.unlockSearch = function(){
            if(vm.selectedProviderGroupID!='all'){
                let providerGroupId = vm.selectedProviderGroupID;
                if(providerGroupId == 'free'){
                    vm.getRewardTaskGroupProposal();
                }else{
                    vm.getRewardTaskGroupProposal(providerGroupId);
                }
            }
            else if(vm.chosenProviderGroupId){
                if(vm.chosenProviderGroupId == 'localCredit'){
                    vm.getRewardTaskLogData(true,true);
                }else{
                    vm.getRewardTaskGroupProposal(vm.chosenProviderGroupId);
                }
            }else{
                vm.getRewardTaskLogData(true);
            }
        };

        vm.getRewardTaskLogData = function (newSearch, isFreeAmt) {
            vm.isUnlockTaskGroup = false;
            let sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform,
                from: vm.rewardTaskLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.rewardTaskLog.query.endTime.data('datetimepicker').getLocalDate(),
                unlockStatus: vm.unlockStatus,
                rewardProposalId: vm.rewardProposalId,
                topUpProposalId: vm.topUpProposalId,
                selectedProviderGroupID: vm.selectedProviderGroupID,
                showProposal: false,
                index: newSearch ? 0 : vm.rewardTaskLog.index,
                limit: newSearch ? 10 : vm.rewardTaskLog.limit,
                sortCol: vm.rewardTaskLog.sortCol || null,
                useProviderGroup: vm.selectedPlatform.data.useProviderGroup
            };

            if (isFreeAmt) {
                sendQuery.selectedProviderGroupID = 'free';
                sendQuery.showProposal = true;
            }
            socketService.$socket($scope.AppSocket, 'getPlayerRewardTask', sendQuery, function (data) {
                vm.curRewardTask = data.data;
                console.log('Player reward task log:', vm.curRewardTask);
                let tblData = data && data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.topUpAmount = (item.topUpAmount);
                    item.bonusAmount$ = -item.data.currentAmt;
                    item.requiredBonusAmount$ = (item.requiredBonusAmount);
                    item.currentAmount$ = 0;
                    item.providerStr$ = '(' + ((item.targetProviders && item.targetProviders.length > 0) ? item.targetProviders.map(pro => {
                        return pro.name + ' ';
                    }) : $translate('all')) + ')';

                    if (!item.targetEnable && item.targetProviders && item.targetProviders.length > 0) {
                        item.provider$ = $translate('Excluded') + ' ' + item.providerStr$
                    } else {
                        item.provider$ = item.providerStr$;
                    }

                    if (item.rewardType) {
                        item.rewardType = $translate(item.rewardType);
                    }
                    // if search from topupProposalId
                    if (data.data.topUpProposal && data.data.topUpProposal != '') {
                        item.topUpProposal = data.data.topUpProposal;
                        item.topUpAmount = data.data.topUpAmountSum;
                    }
                    // if search from topupProposalId
                    if (data.data.topUpAmountSum) {
                        item.topUpAmount$ = data.data.topUpAmountSum;
                    }
                    if (data.data.creator) {
                        item.creator = data.data.creator
                    }
                    if (item.data) {
                        item.currentAmount = item.data.currentAmount;
                        item.bonusAmount = item.data.currentAmt;
                        item.requiredBonusAmount = item.data.requiredBonusAmount;
                        item.bonusAmount$ = item.data.bonusAmount;
                        item.requiredBonusAmount$ = item.data.requiredBonusAmount;
                        item.requiredUnlockAmount = item.data.requiredUnlockAmount;
                        item.rewardType = item.data.rewardType;
                    }

                    return item;
                }) : [];
                let size = data.data ? data.data.size : 0;
                let summary = data.data ? data.data.summary : [];
                let topUpAmountSum = data.data ? data.data.topUpAmountSum : 0;
                vm.rewardTaskLog.totalCount = size;

                $scope.$evalAsync(vm.drawRewardTaskGroupTable(newSearch, data, size, summary, topUpAmountSum));
            });
        };

        vm.getRewardTaskGroupProposal = function (id) {
            vm.isUnlockTaskGroup = true;
            vm.dynRewardTaskGroupId = vm.rewardTaskGroupDetails.filter(item => {
                if (item.providerGroup) {
                    return item.providerGroup._id == id;
                }
            });

            if(!id){
                vm.dynRewardTaskGroupId = vm.rewardTaskGroupDetails.filter(item => {
                    return !item.providerGroup && item.status == 'Started';
                });
            }

            vm.chosenProviderGroupId = id;
            let sendQuery = {
                _id: id,
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform,
                from: vm.rewardTaskLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.rewardTaskLog.query.endTime.data('datetimepicker').getLocalDate(),
                index:  vm.rewardTaskLog.index ? vm.rewardTaskLog.index: 0,
                limit:  vm.rewardTaskLog.limit ? vm.rewardTaskLog.limit: 0,
                sortCol: vm.rewardTaskLog.sortCol || null
            };

            if (!id) {
                $('#rewardTaskGroupProposalTbl').DataTable().clear().draw();
            }

            if (!vm.getRewardTaskGroupProposalLoading) {
                vm.getRewardTaskGroupProposalLoading = true;
                socketService.$socket($scope.AppSocket, 'getRewardTaskGroupProposal', sendQuery, function (data) {
                    console.log("vm.getRewardTaskGroupProposal data", data);
                    vm.rewardTaskProposalData = data.data.data;
                    vm.simpleRewardProposalData = vm.constructProposalData(data.data.data);
                    let summary = data.data.summary;
                    let result = data.data.data;
                    let usedTopUp = [];
                    result.forEach((item,index) => {
                        item.proposalId = item.proposalId || item.data.proposalId;
                        item['createTime$'] = vm.dateReformat(item.data.createTime$);
                        item.useConsumption = item.data.useConsumption;
                        item.topUpProposal = item.data.topUpProposalId?item.data.topUpProposalId: item.data.topUpProposal;
                        item.topUpAmount = item.data.topUpAmount;
                        item.bonusAmount = item.data.rewardAmount;
                        item.applyAmount = item.data.applyAmount || item.data.amount;
                        item.requiredUnlockAmount = item.data.spendingAmount;
                        item.requiredBonusAmount = item.data.requiredBonusAmount;
                        item['provider$'] = $translate(item.data.provider$);
                        item.rewardType = item.data.rewardType;

                        item.requiredUnlockAmount$ = item.requiredUnlockAmount;
                        // item.curConsumption$ = item.curConsumption;
                        if(vm.isUnlockTaskGroup){
                            let spendingAmt = vm.calSpendingAmt(index);

                            item.curConsumption$ = spendingAmt.currentAmt;
                            item.maxConsumption$ = spendingAmt.currentMax;
                        } else {
                            item.curConsumption$ = item.requiredBonusAmount;
                            item.maxConsumption$ = item.requiredUnlockAmount;
                        }
                        item.bonusAmount$ = item.data.bonusAmount;
                        item.requiredBonusAmount$ = item.requiredBonusAmount;
                        item.currentAmount$ = item.data.currentAmount;

                        item.availableAmt$ = (item.applyAmount || 0) + (item.bonusAmount || 0);
                        item.archivedAmt$ = 0;
                        if (vm.rtgBonusAmt[item.data.providerGroup] <= -(item.availableAmt$)) {
                            vm.rtgBonusAmt[item.data.providerGroup] -= -(item.availableAmt$);
                            item.archivedAmt$ = item.availableAmt$
                        } else if (vm.rtgBonusAmt[item.data.providerGroup] != 0) {
                            if (item.data.providerGroup === '') {
                                let archivedAmtEmpty = vm.rtgBonusAmt["undefined"] ? vm.rtgBonusAmt["undefined"] : 0;
                                item.archivedAmt$ = -archivedAmtEmpty;
                                vm.rtgBonusAmt["undefined"] = 0;

                            } else {
                                item.archivedAmt$ = -vm.rtgBonusAmt[item.data.providerGroup];
                                vm.rtgBonusAmt[item.data.providerGroup] = 0;
                                item.archivedAmt$ = item.archivedAmt$? item.archivedAmt$: 0;
                            }
                        }
                        item.isArchived =
                            item.archivedAmt$ == item.availableAmt$ || item.curConsumption$ == item.requiredUnlockAmount$;

                        if (item.data.isDynamicRewardAmount || (item.data.promoCodeTypeValue && item.data.promoCodeTypeValue == 3) || item.data.limitedOfferObjId){
                            usedTopUp.push(item.topUpProposal)
                        }

                    });

                    if (usedTopUp.length > 0) {
                        result = result.filter(item => {
                            for (let i = 0; i < usedTopUp.length; i++) {
                                if (usedTopUp.indexOf(item.proposalId) < 0) {
                                    return item;
                                }
                            }
                        });
                    }

                    console.log("vm.getRewardTaskGroupProposal", result);
                    vm.rewardTaskGroupProposalList = [];
                    Object.assign(vm.rewardTaskGroupProposalList ,result);
                    $scope.$evalAsync(vm.drawRewardTaskTable(true, result, 0, summary, 0, 0));
                    vm.curRewardTask = data;
                    vm.getRewardTaskGroupProposalLoading = false;
                })
            }
        };

        vm.drawRewardTaskTable = function (newSearch, tblData, size, summary, topUpAmountSum) {
            console.log("tblData",tblData);
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.rewardTaskLog.aaSorting || [[3, 'desc']],
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('UnlockStatus'),data:"status",
                        render: function (data, type, row, meta) {
                            let text;
                            let rowId = String(meta.row);
                            let adminName = row.creator ? row.creator.name : '';

                            if (row.isArchived) {
                                text = '<a class="fa fa-check margin-right-5"></a><span>(' + adminName + ')</span>';
                            } else {
                                text = '<input type="checkbox" class="unlockTaskGroupProposal" value="' + [row.availableAmt$ , row.maxConsumption$ - row.curConsumption$, rowId] + '" ng-click="vm.setUnlockTaskGroup(\'' + rowId + '\')">';
                            }

                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('RewardProposalId'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            var link = $('<a>', {

                                'ng-click': 'vm.showProposalModal("' + data + '",1)'

                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {title: $translate('SubRewardType'), data: "rewardType",
                        render: function(data,type,row){
                            var text = $translate(data);
                            return text;
                        }

                    },
                    {title: $translate('CREATETIME'), data: "createTime$"},
                    //相關存款金額
                    {title: $translate('Deposit Amount'), data: "topUpAmount"},
                    {title: $translate('Deposit ProposalId'),
                        data: "data.topUpProposal",
                        render: function (data, type, row) {
                            var link = $('<a>', {
                                'ng-click': 'vm.showProposalModal("' + data + '",1)'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    //相關存款提案號
                    {title: $translate('REWARD_AMOUNT'), data: "bonusAmount"},
                    {
                        //解锁进度（投注额）
                        "title": $translate('Unlock Progress(Consumption)'),data:"curConsumption$",
                        render: function (data, type, row, meta) {
                            let text = row.curConsumption$ +"/"+row.maxConsumption$;
                            return "<div>" + text + "</div>";
                        }
                    },

                    // 解鎖進度
                    {
                        //解锁进度（输赢值）
                        "title": $translate('Unlock Progress(WinLose)'),data:"currentAmount",
                        render: function (data, type, row ,meta) {
                            let text = -row.archivedAmt$ + "/-" + row.availableAmt$;

                            return "<div>" + text + "</div>";
                        }
                    },
                    {title: $translate('GAME LOBBY / REWARD TASK GROUP'), data: "provider$"},
                    {
                        "title": $translate('IsConsumption'),data: "useConsumption",
                        render: function (data, type, row) {
                            var text = $translate(data);
                            return "<div>" + text + "</div>";
                        }
                    },
                ],
                "paging": false,
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 350,
                "scrollCollapse": true,
                "destroy": true,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });

            utilService.createDatatableWithFooter('#rewardTaskLogTbl', tableOptions, {
                4: topUpAmountSum,
                6: summary ? summary.bonusAmountSum: 0,
                7: summary ? summary.requiredBonusAmountSum: 0,
                8: summary ? summary.currentAmountSum :0
            });

            var aTable = $("#rewardTaskLogTbl").DataTable(tableOptions);
            aTable.columns.adjust().draw();
            vm.rewardTaskLog.pageObj.init({maxCount: size}, newSearch);

            $('#rewardTaskLogTbl').off('order.dt');
            $('#rewardTaskLogTbl').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'rewardTaskLog', vm.getRewardTaskLogData);
            });
        }

        vm.constructProposalData = function(proposals){
            let proposalData = [];

            proposals.map(item=>{
                let proposal = {
                    applyAmount:item.data.applyAmount ? item.data.applyAmount:0,
                    rewardAmount:item.data.rewardAmount ? item.data.rewardAmount:0,
                    //consumption
                    spendingAmount:item.data.spendingAmount ? item.data.spendingAmount:0
                }
                proposalData.push(proposal);
            })
            return proposalData;
        };

        vm.submitAddPlayerRewardTask = function () {
            vm.playerAddRewardTask.showSubmit = false;
            let providerArr = [];
            for (let key in vm.playerAddRewardTask.provider) {
                if (vm.playerAddRewardTask.provider[key]) {
                    providerArr.push(key);
                }
            }
            let sendObj = {
                type: vm.playerAddRewardTask.type,
                rewardType: vm.playerAddRewardTask.type,
                platformId: vm.selectedSinglePlayer.platform,
                playerId: vm.selectedSinglePlayer._id,
                playerObjId: vm.selectedSinglePlayer._id,
                playerName: vm.selectedSinglePlayer.name,
                requiredUnlockAmount: vm.playerAddRewardTask.requiredUnlockAmount,
                currentAmount: vm.playerAddRewardTask.currentAmount,
                rewardAmount: vm.playerAddRewardTask.currentAmount,
                initAmount: vm.playerAddRewardTask.currentAmount,
                useConsumption: Boolean(vm.playerAddRewardTask.useConsumption),
                remark: vm.playerAddRewardTask.remark,
                eventCode: "manualReward"
            };

            if(!vm.selectedPlatform.data.useProviderGroup){
                sendObj.targetProviders = providerArr;
            }else{
                sendObj.type= vm.constProposalType.ADD_PLAYER_REWARD_TASK,
                    sendObj.rewardType= vm.constProposalType.ADD_PLAYER_REWARD_TASK,
                    sendObj.providerGroup = vm.playerAddRewardTask.providerGroup;
                sendObj.isGroupReward = true;
            }

            console.log('sendObj', sendObj);
            socketService.$socket($scope.AppSocket, 'createPlayerRewardTask', sendObj, function (data) {
                vm.playerAddRewardTask.resMsg = $translate('SUCCESS');
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                $scope.safeApply();
            }, function (err) {
                vm.playerAddRewardTask.resMsg = err.error.message || $translate('FAIL');
                $scope.safeApply();
            })
        };

        vm.applyPreviousConsecutiveLoginReward = function () {
            let sendQuery = {
                code: vm.playerApplyRewardPara.code,
                playerId: vm.isOneSelectedPlayer().playerId
            };
            socketService.$socket($scope.AppSocket, 'applyPreviousConsecutiveLoginReward', sendQuery, function (data) {
                console.log('sent', data);
                vm.playerApplyEventResult = data;
                //vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (err) {
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.safeApply();
            });
        };

        vm.unlockTaskGroup = () => {
            let incRewardAmt = 0;
            let incConsumptAmt = 0;
            let rewardTaskGroup = vm.dynRewardTaskGroupId[0] ? vm.dynRewardTaskGroupId[0] : {};
            let index = [];
            vm.dynRewardTaskGroupIndex.forEach(item => {
                incRewardAmt += Number(item[0]);
                incConsumptAmt += Number(item[1]);
                index.push(Number(item[2]));
            });

            let sendQuery = {
                'rewardTaskGroupId': rewardTaskGroup._id,
                'incRewardAmount': incRewardAmt,
                'incConsumptionAmount': incConsumptAmt
            };

            socketService.$socket($scope.AppSocket, 'unlockRewardTaskInRewardTaskGroup', sendQuery, function (data) {
                vm.getRewardTaskLogData(true);
                $('#rewardTaskGroupProposalTbl').DataTable().clear().draw();
                $('#rewardTaskLogTbl').DataTable().clear().draw();
                //  save the rewardTask Progress that is  manual unlocked
                index.forEach( indexNO => {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        playerId: vm.isOneSelectedPlayer()._id,
                        unlockTime: new Date().toISOString(),
                        creator: {
                            type: vm.rewardTaskGroupProposalList[indexNO].creator.type,
                            name: vm.rewardTaskGroupProposalList[indexNO].creator.name,
                            id: vm.rewardTaskGroupProposalList[indexNO].creator.id
                        },
                        rewardTask: {
                            type: vm.rewardTaskGroupProposalList[indexNO].type.name,
                            id: vm.rewardTaskGroupProposalList[indexNO].type._id,
                        },
                        currentConsumption: vm.rewardTaskGroupProposalList[indexNO].curConsumption$,
                        maxConsumption: vm.rewardTaskGroupProposalList[indexNO].maxConsumption$,
                        currentAmount: -vm.rewardTaskGroupProposalList[indexNO].archivedAmt$,
                        targetAmount: vm.rewardTaskGroupProposalList[indexNO].availableAmt$,
                        topupAmount: vm.rewardTaskGroupProposalList[indexNO].topUpAmount,
                        proposalId: vm.rewardTaskGroupProposalList[indexNO]._id,
                        proposalNumber: vm.rewardTaskGroupProposalList[indexNO].proposalId,
                        topupProposalNumber: vm.rewardTaskGroupProposalList[indexNO].topUpProposal,
                        bonusAmount: vm.rewardTaskGroupProposalList[indexNO].bonusAmount,
                        targetProviderGroup: vm.rewardTaskGroupProposalList[indexNO].data.provider$,
                        status: "ManualUnlock",
                        useConsumption: vm.rewardTaskGroupProposalList[indexNO].useConsumption,
                        inProvider: vm.rewardTaskGroupProposalList[indexNO].inProvider,

                    };

                    socketService.$socket($scope.AppSocket, 'createRewardTaskGroupUnlockedRecord', sendData, function (data) {
                        console.log('createRewardTaskGroupUnlockedRecord', sendData);
                        $scope.safeApply();
                    })

                })
            })
        };

        vm.submitManualUnlockRewardTask = function (rewards) {

            if (!rewards) {
                vm.manualUnlockRewardTask.resMsg = "No reward tasks are selected to unlock.";
                $scope.safeApply();
                return;
            }

            let updateStatus = function updateStatus() {
                vm.manualUnlockRewardTask.resMsg =
                    taskCount == rewards.length ?
                        numberOfRewardUnlocked == rewards.length ?
                            $translate('Submitted proposal for approval') :
                            $translate('FAIL')
                        : "";

                $scope.safeApply();
            };
            let numberOfRewardUnlocked = 0, taskCount = 0;
            rewards.forEach(function (index) {
                taskCount++;
                index = Number(index);
                delete vm.selectedSinglePlayer.$displayDomain;
                delete vm.selectedSinglePlayer.$displaySourceUrl;
                socketService.$socket($scope.AppSocket, 'manualUnlockRewardTask', [vm.curRewardTask.data[index], vm.selectedSinglePlayer], function (data) {
                    console.log("Proposal to unlock reward " + vm.curRewardTask.data[index]._id + " is submitted for approval.");
                    numberOfRewardUnlocked++;
                    updateStatus();
                    vm.getRewardTaskLogData(true);

                }, function (err) {
                    if (err.error.message) {
                        console.log("Proposal to unlock reward " + vm.curRewardTask.data[index]._id + " failed to submit, error: " + err.error.message);
                    } else {
                        console.log("Proposal to unlock reward " + vm.curRewardTask.data[index]._id + " failed to submit.");
                    }
                    updateStatus();
                });
            });
        };

        vm.getRewardEventsByPlatform = function () {
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform.id}, function (data) {
                vm.allRewardEvent = data.data;
                console.log("vm.allRewardEvent", data.data);
            });
        };

        vm.getFullDate = function (num) {
            if (num < 10) {
                return '0' + num;
            } else {
                return '' + num + '';
            }
        };

        vm.rewardTabClicked = function (callback) {
            vm.forbidRewardRemark = '';
            vm.dayHrs = {};
            vm.dayMin = {};
            for (var i = 0; i < 24; i++) {
                vm.dayHrs[i] = vm.getFullDate(i);
            }
            for (var i = 0; i < 60; i++) {
                vm.dayMin[i] = vm.getFullDate(i);
            }
            if (!vm.selectedPlatform) return;
            if (!authService.checkViewPermission('Platform', 'Reward', 'Read')) {
                return;
            }
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.selectedPlatform.id}, function (data) {
                vm.allRewardEvent = data.data;
                console.log("vm.allRewardEvent", data.data);
                vm.showApplyRewardEvent = data.data.filter(item => {
                    return item.needApply || (item.condition && item.condition.applyType && item.condition.applyType == "1")
                }).length > 0
                vm.curContentRewardType = {};
                vm.settlementRewardGroupEvent = [];
                $.each(vm.allRewardEvent, function (i, v) {
                    $.each(vm.allRewardTypes, function (a, b) {
                        if (b._id == v.type._id) {
                            vm.curContentRewardType[v._id] = b;
                            return true;
                        }
                    })

                    // Setup settlement reward group events entry
                    if (v && v.condition && v.condition.applyType == "3" && v.condition.interval != "5") {
                        vm.settlementRewardGroupEvent.push(v);
                    }
                });
                console.log(vm.curContentRewardType);
                $scope.safeApply();
                if (callback) {
                    callback();
                }
            });

            vm.getPlatformProviderGroup();
        };

        //********************************** end of AddReward functions **********************************

        //********************************** start of RepairPayment functions **********************************
        vm.showReapplyLostOrderTab = function (tabName) {
            vm.selectedReapplyLostOrderTab = tabName == null ? "credit" : tabName;
        };

        vm.getProviderText = function (providerId) {
            if (!providerId || !vm.allGameProvider) return false;
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
        };

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

                            vm.linkedPlayerTransfer = playerTransfer;
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
                                vm.repairProposalId = tbl.row(this).data()[1];
                            }
                            $scope.safeApply();
                        });
                    });
                });
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
                        //vm.getPlatformPlayersData();
                        $scope.safeApply();
                    });
                });
        };

        vm.submitRepairPayment = function () {
            vm.submitRepairePayementStep = 1;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'submitRepairPaymentProposal', {proposalId: vm.repairProposalId}, function (data) {
                vm.submitRepairePayementStep = 2;
                //vm.getPlatformPlayersData();
                $scope.safeApply();
            }, function (error) {
                vm.submitRepairePayementStep = 3;
                //vm.getPlatformPlayersData();
                $scope.safeApply();
            })
        }
        //********************************** end of RepairPayment functions **********************************

        //********************************** start of CreditAdjustment functions **********************************
        vm.prepareShowPlayerCreditAdjustment = function (type) {
            vm.creditChange.finalValidAmount = vm.isOneSelectedPlayer().validCredit;
            vm.creditChange.finalLockedAmount = null;
            vm.creditChange.remark = '';
            vm.creditChange.updateAmount = 0;


            vm.linkedPlayerTransferId = null;
            vm.playerTransferErrorLog = null;
            if (type == "adjust") {
                vm.creditChange.socketStr = "createUpdatePlayerCreditProposal";
                vm.creditChange.modaltitle = "CREDIT_ADJUSTMENT";
            } else if (type == "returnFix") {
                vm.creditChange.socketStr = "createReturnFixProposal";
                vm.creditChange.modaltitle = "ConsumptionReturnFix";
            }

            $scope.safeApply();
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
                //vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        };
        //********************************** end of CreditAdjustment functions **********************************

        //********************************** start of RewardPointAdjustment functions **********************************
        vm.showRewardPointsAdjustmentTab = function (tabName) {
            vm.selectedRewardPointsAdjustmentTab = tabName == null ? "change" : tabName;
            if (tabName === 'convert') {
                vm.playerRewardPointsDailyLimit = 0;
                vm.playerRewardPointsDailyConvertedPoints = 0;
                vm.playerRewardPointsConversionRate = 0;
                vm.getPlayerRewardPointsDailyLimit();
                vm.getPlayerRewardPointsDailyConvertedPoints();
                vm.getPlayerRewardPointsConversionRate();
            }
        };

        vm.getPlayerRewardPointsDailyLimit = function () {
            let sendData = {
                platformObjId: vm.isOneSelectedPlayer().platform,
                playerLevel: vm.isOneSelectedPlayer().playerLevel
            };

            socketService.$socket($scope.AppSocket, 'getPlayerRewardPointsDailyLimit', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerRewardPointsDailyLimit = data.data;
                });
            });
        };

        vm.getPlayerRewardPointsDailyConvertedPoints = function () {
            let sendData = {
                rewardPointsObjId: vm.isOneSelectedPlayer().rewardPointsObjId._id
            };

            socketService.$socket($scope.AppSocket, 'getPlayerRewardPointsDailyConvertedPoints', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerRewardPointsDailyConvertedPoints = data.data;
                });
            });
        };

        vm.getPlayerRewardPointsConversionRate = function () {
            let sendData = {
                platformObjId: vm.isOneSelectedPlayer().platform,
                playerLevel: vm.isOneSelectedPlayer().playerLevel
            };

            socketService.$socket($scope.AppSocket, 'getPlayerRewardPointsConversionRate', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerRewardPointsConversionRate = data.data;
                });
            });
        };

        vm.prepareShowPlayerRewardPointsAdjustment = function () {
            vm.rewardPointsChange.finalValidAmount = vm.isOneSelectedPlayer().rewardPointsObjId.points;
            vm.rewardPointsChange.remark = '';
            vm.rewardPointsChange.updateAmount = 0;
            vm.rewardPointsConvert.finalValidAmount = vm.isOneSelectedPlayer().rewardPointsObjId.points;
            vm.rewardPointsConvert.remark = '';
            vm.rewardPointsConvert.updateAmount = 0;
            $scope.safeApply();
        };

        vm.updatePlayerRewardPointsRecord = function () {
            let sendData = {
                playerObjId: vm.isOneSelectedPlayer()._id,
                platformObjId: vm.isOneSelectedPlayer().platform,
                updateAmount: vm.rewardPointsChange.updateAmount,
                remark: vm.rewardPointsChange.remark
            };

            socketService.$socket($scope.AppSocket, 'updatePlayerRewardPointsRecord', sendData, function () {
                //vm.advancedPlayerQuery();
                $scope.safeApply();
            });
        };

        vm.convertPlayerRewardPoints = () => {
            var sendData = {
                playerId: vm.isOneSelectedPlayer().playerId,
                convertRewardPointsAmount: vm.rewardPointsConvert.updateAmount,
                remark: vm.rewardPointsConvert.remark
            };
            socketService.$socket($scope.AppSocket, 'convertRewardPointsToCredit', sendData, function (data) {
                console.log('convertRewardPointsToCredit', data.data);
                //vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        };
        //********************************** end of RewardPointAdjustment functions **********************************

        vm.setPlayerInfoQuery = function(dxMissionId, type, searchCriteria) {
            vm.playerInfoQuery.dxMission = dxMissionId;
            vm.playerInfoQuery.type = type;
            vm.playerInfoQuery.searchCriteria = searchCriteria
        };

        vm.showPagedTelePlayerTable = function () {
            vm.telePlayerTable = {};
            utilService.actionAfterLoaded(('#telePlayerTable'), function () {

                vm.telePlayerTable.pageObj = utilService.createPageForPagingTable("#telePlayerTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "teleMarketingPlayerInfo", vm.getPagedTelePlayerTable)
                });
                vm.getPagedTelePlayerTable(true);
            });
        };

        vm.getPagedTelePlayerTable = function (newSearch) {
            vm.loadingTeleMarketingOverviewTable = true;
            let sendQuery = {
                platform: vm.selectedPlatform.id ,
                dxMission: vm.playerInfoQuery.dxMission || "",
                type: vm.playerInfoQuery.type || "",
                searchCriteria: vm.playerInfoQuery.searchCriteria || "",
                index: newSearch ? 0 : (vm.teleMarketingPlayerInfo.index || 0),
                limit: vm.teleMarketingPlayerInfo.limit || 10,
                sortCol: vm.teleMarketingPlayerInfo.sortCol || -1
            }

            socketService.$socket($scope.AppSocket, 'getDXPlayerInfo', sendQuery, function (data) {
                if(data){
                    vm.teleMarketingPlayerInfo.count = data.data && data.data.totalCount ? data.data.totalCount : 0;
                    vm.teleMarketingPlayerInfo.data = data.data && data.data.dxPhoneData ? data.data.dxPhoneData : {};
                    vm.teleMarketingPlayerInfo.missionData = data.data && data.data.dxMissionData ? data.data.dxMissionData : {};
                }

                vm.showPlayerTable = true;

                vm.teleMarketingPlayerInfo.data.forEach((item) => {
                    if(item){
                        item.registrationTime = item.registrationTime ? vm.dateReformat(item.registrationTime) : "";
                    }
                });

                vm.loadingTeleMarketingOverviewTable = false;
                $scope.$evalAsync(() => {
                    vm.drawTelePlayerTable(newSearch, vm.teleMarketingPlayerInfo.data, vm.teleMarketingPlayerInfo.count);
                    $('#telePlayerTable').resize();
                });
            })
        };

        vm.drawTelePlayerTable = function (newSearch, tblData, size) {
            console.log("telePlayerTable",tblData);

            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.telePlayerTable.sortCol || {},
                aoColumnDefs: [
                    // {'sortCol': 'createTime$', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 550,
                "scrollCollapse": true,
                columns: [
                    {
                        title: $translate('ORDER'),
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(index.row+1);
                            return link.prop('outerHTML');
                            // return index.row+1 ;
                        }

                    },
                    {
                        title: $translate('IMPORTED_PHONE_NUMBER'),
                        data: "phoneNumber",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }

                    },
                    {
                        title: $translate('CUSTOMER_ACCOUNT_ID'),
                        data: "name",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TIME_OPENING_ACCOUNT'),
                        data: "registrationTime",
                        sClass: "sumText wordWrap",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('loginTimes'),
                        data: "loginTimes",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOP_UP_TIMES'),
                        data: "topUpTimes",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOP_UP_AMOUNT'),
                        data: "topUpSum",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TIMES_CONSUMED'),
                        data: "consumptionTimes",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_DEPOSIT_AMOUNT'),
                        data: "totalDepositAmount",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('VALID_CONSUMPTION'),
                        data: "consumptionSum",
                        sClass: "sumFloat textRight",
                        render: function(data, type, row, index){
                            var link = $('<span>', {
                                'style': (row.alerted ? "color:red;" : ""),
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('Function'), //data: 'phoneNumber',
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || '';
                            var playerObjId = row._id ? row._id : "";
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'style': (row.alerted ? "color:red;" : ""),
                                'class': 'fa fa-envelope margin-right-5',
                                'ng-click': 'vm.selectedSinglePlayer={_id:' + JSON.stringify(row._id) + '}; vm.initMessageModal(); vm.sendMessageToPlayerBtn(' + '"msg", ' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("SEND_MESSAGE_TO_PLAYER"),
                                'data-placement': 'left',   // because top and bottom got hidden behind the table edges
                            }));
                            link.append($('<a>', {
                                'style': (row.alerted ? "color:red;" : ""),
                                'class': 'fa fa-comment margin-right-5' + (row.permission.SMSFeedBack === false ? " text-danger" : ""),
                                'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.initSMSModal();' + "vm.onClickPlayerCheck(" +
                                JSON.stringify(row._id) + ", " + "vm.telorMessageToPlayerBtn" +
                                ", " + "[" + '"msg"' + ", " + JSON.stringify(row) + "]);",
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("Send SMS to Player"),
                                'data-placement': 'left',
                            }));
                            link.append($('<a>', {
                                'style': (row.alerted ? "color:red;" : ""),
                                'class': 'fa fa-volume-control-phone margin-right-5' + (row.permission.phoneCallFeedback === false ? " text-danger" : ""),
                                'ng-click': 'vm.telorMessageToPlayerBtn(' + '"tel",' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("PHONE"),
                                'data-placement': 'left',
                            }));
                            if ($scope.checkViewPermission('Player', 'Feedback', 'AddFeedback')) {
                                link.append($('<a>', {
                                    'style': (row.alerted ? "color:red;" : ""),
                                    'class': 'fa fa-commenting margin-right-5',
                                    'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.initFeedbackModal(' + JSON.stringify(row) + ');',
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'modal',
                                    'data-target': '#modalAddPlayerFeedback',
                                    'title': $translate("ADD_FEEDBACK"),
                                    'data-placement': 'right',
                                }));
                            }
                            //if(row.isRealPlayer) {
                                if ($scope.checkViewPermission('Player', 'TopUp', 'ApplyManualTopup')) {
                                    link.append($('<a>', {
                                        'class': 'fa fa-plus-circle',
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.getAllBankCard(); vm.showTopupTab(null);vm.onClickPlayerCheck("' + playerObjId + '", vm.initPlayerManualTopUp);',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerTopUp',
                                        'title': $translate("TOP_UP"),
                                        'data-placement': 'left',
                                        'style': (row.alerted ? "color:red;" : "color: #68C60C;")
                                        //'style': 'color: #68C60C'
                                    }));
                                }
                                link.append($('<br>'));
                                if ($scope.checkViewPermission('Player', 'Bonus', 'applyBonus')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5 margin-right-5',
                                        'src': (row.alerted ? "images/icon/withdrawRed.png" : "images/icon/withdrawBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.initPlayerBonus();',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerBonus',
                                        'title': $translate("Bonus"),
                                        'data-placement': 'left',   // because top and bottom got hidden behind the table edges
                                    }));
                                }
                                if ($scope.checkViewPermission('Player', 'Reward', 'AddRewardTask')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5 margin-right-5',
                                        'src': (row.alerted ? "images/icon/rewardRed.png" : "images/icon/rewardBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.rewardTabClicked();vm.initPlayerAddRewardTask();',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerAddRewardTask',
                                        'title': $translate("REWARD_ACTION"),
                                        'data-placement': 'left',
                                    }));
                                }
                                if ($scope.checkViewPermission('Player', 'Player', 'RepairPayment') || $scope.checkViewPermission('Player', 'Player', 'RepairTransaction')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5',
                                        'src': (row.alerted ? "images/icon/reapplyRed.png" : "images/icon/reapplyBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.showReapplyLostOrderTab(null);vm.prepareShowPlayerCredit();vm.prepareShowRepairPayment(\'#modalReapplyLostOrder\');',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'title': $translate("ALL_REAPPLY_ORDER"),
                                        'data-placement': 'right',
                                    }));
                                }
                                if ($scope.checkViewPermission('Player', 'Credit', 'CreditAdjustment')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5',
                                        'src': (row.alerted ? "images/icon/creditAdjustRed.png" : "images/icon/creditAdjustBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.onClickPlayerCheck("' + playerObjId + '", vm.prepareShowPlayerCreditAdjustment, \'adjust\')',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerCreditAdjustment',
                                        'title': $translate("CREDIT_ADJUSTMENT"),
                                        'data-placement': 'right',
                                    }));
                                }
                                if ($scope.checkViewPermission('Player', 'RewardPoints', 'RewardPointsChange') || $scope.checkViewPermission('Player', 'RewardPoints', 'RewardPointsConvert')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5',
                                        'src': (row.alerted ? "images/icon/rewardPointsRed.png" : "images/icon/rewardPointsBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.selectedSinglePlayer =' + JSON.stringify(row) + ' ;vm.showRewardPointsAdjustmentTab(null);vm.onClickPlayerCheck("' + playerObjId + '", vm.prepareShowPlayerRewardPointsAdjustment);',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerRewardPointsAdjustment',
                                        'title': $translate("REWARD_POINTS_ADJUSTMENT"),
                                        'data-placement': 'right',
                                    }));
                                }
                            //}
                            return link.prop('outerHTML');
                            },
                            "sClass": "alignLeft"
                        }
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                },
                fnDrawCallback: function (oSettings) {
                    var container = oSettings.nTable;
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
                                // showMessagePlayerModalFor(vm.teleplhonePlayer);

                            });
                            $("button.playerTelephone").on('click', function () {
                                alert("will call " + vm.telphonePlayer.name);
                            });
                        }
                    });
                    $('#telePlayerTable').resize();
                }
            });
            tableOptions.language.emptyTable=$translate("No data available in table");

            let a = utilService.createDatatableWithFooter('#telePlayerTable', tableOptions, {}, true);

            vm.telePlayerTable.pageObj.init({maxCount: size}, newSearch);
            $('#telePlayerTable').off('order.dt');
            $('#telePlayerTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'telePlayerTable', vm.getPagedTelePlayerTable);
            });
            $('#telePlayerTable').resize();
        }

        // generate telePlayer function table ====================End==================

        vm.initTelePlayerSendingMsgTable = function () {

            if(vm.selectedPlatform){
                // vm.teleMarketingTaskTab = 'TELEMARKETING_TASK_OVERVIEW';

                utilService.actionAfterLoaded('#teleMarketingOverview', function () {

                    vm.telePlayerSendingMsgTable.customerType='all';
                    vm.telePlayerSendingMsgTable.msgTimesOperator='>=';

                    $('#sendSMSTableStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });


                    $("#sendSMSTableStartDatetimePicker").data('datetimepicker').setLocalDate( $('#teleMarketingOverviewStartDatetimePicker').data('datetimepicker').getLocalDate() );

                    $('#sendSMSTableEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#sendSMSTableEndDatetimePicker").data('datetimepicker').setLocalDate( $('#teleMarketingOverviewEndDatetimePicker').data('datetimepicker').getLocalDate() );

                    $('#sendSMSTableMsgStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#sendSMSTableMsgStartDatetimePicker").data('datetimepicker').setLocalDate(null);

                    $('#sendSMSTableMsgEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#sendSMSTableMsgEndDatetimePicker").data('datetimepicker').setLocalDate(null);
                });
            }
        };
        // generate telePlayer Sending Message function table ====================Start==================
        vm.showTelePlayerSendingMsgTable = function (dxMission) {
            vm.telePlayerSendingMsgTable = {};

            vm.telePlayerSendingMsgTable.dxMissionId = dxMission;
            // vm.telePlayerTable.type = 'none';
            utilService.actionAfterLoaded(('#telePlayerSendingMsgTable'), function () {

                // vm.telePlayerSendingMsgTable.pageObj = utilService.createPageForPagingTable("#telePlayerSendingMsgTablePage", {}, $translate, function (curP, pageSize) {
                //     vm.commonPageChangeHandler(curP, pageSize, "telePlayerSendingMsgTable", vm.getTelePlayerSendingMsgTable)
                // });
                vm.getTelePlayerSendingMsgTable(true, dxMission);
                $scope.safeApply()
            });
        }

        vm.getTelePlayerSendingMsgTable = function (newSearch, dxMission) {
            vm.loadingTelePlayerSendingSMSTable = true;
            let sendQuery = {
                platform: vm.selectedPlatform.id,
                dxMission: dxMission ? dxMission : vm.telePlayerSendingMsgTable.dxMissionId,
                index: newSearch ? 0 : vm.telePlayerSendingMsgTable.index,
                limit: newSearch ? 10 : vm.telePlayerSendingMsgTable.limit,
                sortCol: vm.telePlayerSendingMsgTable.sortCol,

            }
            if (vm.telePlayerSendingMsgTable){
                sendQuery.customerType= vm.telePlayerSendingMsgTable.customerType ? vm.telePlayerSendingMsgTable.customerType : "all";

                sendQuery.importedTelStartTime = $('#sendSMSTableStartDatetimePicker').data('datetimepicker') ? $('#sendSMSTableStartDatetimePicker').data('datetimepicker').getLocalDate() : $('#teleMarketingOverviewStartDatetimePicker').data('datetimepicker').getLocalDate();
                sendQuery.importedTelEndTime = $('#sendSMSTableEndDatetimePicker').data('datetimepicker') ? $('#sendSMSTableEndDatetimePicker').data('datetimepicker').getLocalDate() : $('#teleMarketingOverviewEndDatetimePicker').data('datetimepicker').getLocalDate();

                sendQuery.lastSendingStartTime =$('#sendSMSTableMsgStartDatetimePicker').data('datetimepicker') ? $('#sendSMSTableMsgStartDatetimePicker').data('datetimepicker').getLocalDate() : null;
                sendQuery.lastSendingEndTime = $('#sendSMSTableMsgEndDatetimePicker').data('datetimepicker') ? $('#sendSMSTableMsgEndDatetimePicker').data('datetimepicker').getLocalDate() : null;

                sendQuery.msgTimes = Number.isInteger(vm.telePlayerSendingMsgTable.msgTimes) ? vm.telePlayerSendingMsgTable.msgTimes : null;
                sendQuery.msgTimes2 = Number.isInteger(vm.telePlayerSendingMsgTable.msgTimes2) ? vm.telePlayerSendingMsgTable.msgTimes2 : null;
                sendQuery.operator = vm.telePlayerSendingMsgTable.msgTimesOperator ? vm.telePlayerSendingMsgTable.msgTimesOperator : ">=";
                sendQuery.phoneNumber = vm.telePlayerSendingMsgTable.phoneNumber ? vm.telePlayerSendingMsgTable.phoneNumber : null;

            }

            socketService.$socket($scope.AppSocket, 'getDXPhoneNumberInfo', sendQuery, function (data) {
                if(data){
                    vm.teleMarketingSendSMS.count = data.data && data.data.dxPhoneData ? data.data.dxPhoneData.length : 0;
                    vm.teleMarketingSendSMS.data = data.data && data.data.dxPhoneData ? data.data.dxPhoneData : [];
                    vm.msgTemplate = data.data && data.data.dxMissionData ? data.data.dxMissionData : 0

                }
                vm.showSMSTable = true;
                if ( vm.teleMarketingSendSMS.data &&  vm.teleMarketingSendSMS.data.length > 0){
                    vm.teleMarketingSendSMS.data.forEach((item, index) => {
                        item['createTime'] = vm.dateReformat(item.createTime);
                        item['lastTime'] = item.lastTime ? vm.dateReformat(item.lastTime) : '-';
                        item['playerName'] = item.playerObjId && item.playerObjId.name ? item.playerObjId.name : '-';
                        item['topupTimes'] = item.playerObjId && item.playerObjId.topUpTimes ? item.playerObjId.topUpTimes : 0;
                        item['loginTimes'] = item.playerObjId && item.playerObjId.loginTimes ? item.playerObjId.loginTimes : 0;
                        item['count'] = item.count ? item.count : 0;
                        item['remark$'] = item.remark ? item.remark : "";
                        // if ( item['playerName'] == '-') {
                        //     item['isLocked'] = false;
                        // }
                        // else {
                        //     item['isLocked'] = true;
                        // }
                    });
                }
                vm.loadingTelePlayerSendingSMSTable = false;
                vm.teleSendSmsDataholder = {};
                if (vm.teleMarketingSendSMS && vm.teleMarketingSendSMS.data) {
                    vm.teleMarketingSendSMS.data.map(record => {
                        vm.teleSendSmsDataholder[record._id] = record;
                    })
                }

                $scope.$evalAsync(vm.drawTelePlayerMsgTable(newSearch, vm.teleMarketingSendSMS.data));
                // $scope.$evalAsync(vm.drawTelePlayerMsgTable(newSearch, vm.teleMarketingSendSMS.data, vm.teleMarketingSendSMS.count));
            })
        };

        vm.updateCollectionInEdit = function (type, collection, data, collectionCopy, isNotObject) {
            if (type == 'add') {
                if (!isNotObject) {

                    let newObj = {};

                    // // check again if there is duplication of sms title after updating the promoCodeType
                    // if (data.smsTitle && vm.promoCodeType1BeforeEdit && vm.promoCodeType2BeforeEdit && vm.promoCodeType3BeforeEdit){
                    //
                    //     let filterPromoCodeType1 = vm.promoCodeType1BeforeEdit.map(p => p.smsTitle);
                    //     let filterPromoCodeType2 = vm.promoCodeType2BeforeEdit.map(p => p.smsTitle);
                    //     let filterPromoCodeType3 = vm.promoCodeType3BeforeEdit.map(p => p.smsTitle);
                    //
                    //     let promoCodeSMSTitleCheckList = filterPromoCodeType1.concat(filterPromoCodeType2, filterPromoCodeType3);
                    //
                    //     if (promoCodeSMSTitleCheckList.indexOf(data.smsTitle) != -1){
                    //         vm.smsTitleDuplicationBoolean = true;
                    //         return socketService.showErrorMessage($translate("Banner title cannot be repeated!"));
                    //     }
                    //     else{
                    //         vm.smsTitleDuplicationBoolean = false;
                    //     }
                    // }

                    Object.keys(data).forEach(e => {
                        newObj[e] = data[e];
                    });

                    // update the copy to check for duplication
                    if (collectionCopy) {
                        collectionCopy.push(newObj);
                    }

                    collection.push(newObj);
                }
                else{
                    collection.push(data);
                }
                collection.forEach((elem, index, arr) => {
                    let id = '#expDate1-' + index;
                    let provId = '#promoProviders-' + index;
                    if (!$(id).data("datetimepicker")) {
                        utilService.actionAfterLoaded(id, function () {
                            collection[index].expDate = utilService.createDatePicker(id, {
                                language: 'en',
                                format: 'yyyy/MM/dd hh:mm:ss'
                            });
                            collection[index].expDate.data('datetimepicker').setDate(new Date(), 1);
                        });
                    }

                    if (!$(provId).data("multipleSelect")) {
                        utilService.actionAfterLoaded(provId, function () {
                            $(provId).multipleSelect({
                                allSelected: $translate("All Selected"),
                                selectAllText: $translate("Select All"),
                                countSelected: $translate('# of % selected'),
                                onClick: function () {
                                    //vm.proposalStatusUpdated();
                                },
                                onCheckAll: function () {
                                    //vm.proposalStatusUpdated();
                                },
                                onUncheckAll: function () {
                                    //vm.proposalStatusUpdated();
                                }
                            });
                            $(provId).multipleSelect("checkAll");
                        });
                    }
                })


            } else if (type == 'remove') {

                // delete immediately the constructed promoCodeType before saving into dB
                if (collection[data]._id == null) {
                    collection.splice(data, 1);
                }
                else {

                    let sendData = {
                        platformObjId: vm.selectedPlatform.id,
                        promoCodeTypeObjId: collection[data]._id
                    };

                    // check the availability of the promocode type, can only remove if it is expired
                    socketService.$socket($scope.AppSocket, 'checkPromoCodeTypeAvailability', sendData, function (result) {
                        if (result) {
                            if (!result.data.deleteFlag && !result.data.delete) {
                                socketService.showErrorMessage($translate("The promoCode Type is still valid"));
                            }
                            else if (!result.data.deleteFlag && result.data.delete) {
                                // delete the PromoCodeType from the dB (generated promoCodeType but not using)
                                vm.removeSMSContent.push({
                                    smsContent: collection.splice(data, 1),
                                    isDelete: true
                                });
                                $scope.safeApply();
                            }
                            else if (result.data.deleteFlag && !result.data.delete) {
                                // change the deleteFlag status in dB (as it had been used before)
                                vm.removeSMSContent.push({
                                    smsContent: collection.splice(data, 1),
                                    updateIsDeletedFlag: true
                                });
                                $scope.safeApply();
                            }
                            else {
                            }

                        }
                        else {
                            return Q.reject("data was empty: " + result);
                        }
                    });
                }
            }
        };

        // vm.drawTelePlayerMsgTable = function (newSearch, tblData, size) {
        vm.drawTelePlayerMsgTable = function (newSearch, tblData) {
            console.log("telePlayerSendingMsgTable",tblData);
            vm.phoneNumberInfo.remark = {};
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.telePlayerSendingMsgTable.sortCol || [[4, 'desc']],
                aoColumnDefs: [
                    // {'sortCol': 'createTime$', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 550,
                "scrollCollapse": true,
                columns: [
                    {
                        title: $translate('ORDER'),
                        render: function(data, type, row, index){
                            return index.row+1 ;
                        }

                    },
                    {
                        title: $translate('IMPORTED_PHONE_NUMBER'),
                        data: "phoneNumber$",
                        render: function (data, type, row) {
                            var link = $('<a>', {

                                'ng-click': 'vm.callNewPlayerBtn(' + '"' + row.phoneNumber + '",' + JSON.stringify(row) + ');',

                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    { title: $translate('SMS URL'), data: "url"},
                    { title: $translate('CUSTOMER_ACCOUNT_ID'), data: "playerName"},
                    { title: $translate('TIME_IMPORTED_PHONE_NUMBER'), data: "createTime"},

                    { title: $translate('LAST_SENDING'), data: "lastTime"},
                    { title: $translate('SENDING_TIMES'), data: "count"},
                    { title: $translate('loginTimes'), data: "loginTimes"},
                    { title: $translate('TOP_UP_TIMES'), data: "topupTimes"},
                    {
                        "title": $translate('Multiselect'),
                        bSortable: false,
                        sClass: "customerSelected",
                        render: function (data, type, row) {
                            // if (!row.isLocked || row.isLocked._id == authService.adminId) {
                            if (!row.isLocked) {
                                var link = $('<input>', {
                                    type: 'checkbox',
                                    "data-platformId": row.platform,
                                   // "data-playerId": row.platform,
                                    "data-phoneNumber": row.phoneNumber,
                                    "data-_id": row._id,
                                    class: "transform150"
                                })
                                return link.prop('outerHTML');
                            } else {
                                let text = '<span>'+ '-' +'</span>';
                                return "<div>" + text + "</div>";
                            };
                        },
                    },
                    {
                        "title": $translate('REMARKS'),
                        render: function (data, type, row, index) {
                            var link = $('<div>', {});
                            if (!row.isLocked) {

                                link.append($('<input>', {
                                    type: 'text',
                                    "ng-init": "vm.changePlayerMsgTableRemark(" + JSON.stringify(row) + ")",
                                    "ng-show": '!vm.showPhoneNumberRemark',
                                    "ng-model": "vm.phoneNumberInfo.remark['" + row._id + "']",
                                    "disabled": "true",
                                    'style': "margin-right: 5px;",
                                }));

                                link.append($('<button>', {
                                    type: 'edit',
                                    text: $translate('EDIT'),
                                    "ng-click": 'vm.showPhoneNumberRemark = true;',
                                    "ng-show": '!vm.showPhoneNumberRemark',
                                    class: "btn btn-danger"
                                }));

                                link.append($('<input>', {
                                    type: 'text',
                                    "ng-model": "vm.phoneNumberInfo.remark['" + row._id + "']",
                                    "ng-show": 'vm.showPhoneNumberRemark',
                                    "data-_id": row._id,
                                    'style': "margin-right: 5px;",
                                }));

                                link.append($('<button>', {
                                    type: 'edit',
                                    text: $translate('SAVE'),
                                    "ng-click": 'vm.savePhoneNumberInfoRemark();',
                                    "ng-show": 'vm.showPhoneNumberRemark',
                                    class: "btn btn-success"
                                }));

                                return link.prop('outerHTML');
                            } else {
                                let text = '<span>'+ '-' +'</span>';
                                return "<div>" + text + "</div>";
                            };
                        },
                    }


                ],
                "paging": true,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            tableOptions.language.emptyTable=$translate("No data available in table");
            // $('#' + 'label').text($translate("total") + ' ' + 100 + ' ' + $translate("records"));



            if (reportTbl) {
                reportTbl.clear();
            }
            var reportTbl = $("#telePlayerSendingMsgTable").DataTable(tableOptions);
            utilService.setDataTablePageInput('telePlayerSendingMsgTable', reportTbl, $translate);
             // vm.telePlayerSendingMsgTable.pageObj.init({maxCount: 100}, newSearch);

            // let telePlayerSendingMsg = utilService.createDatatableWithFooter('#telePlayerSendingMsgTable', tableOptions, {});
            // telePlayerSendingMsg.on( 'order.dt', function () {
            //     telePlayerSendingMsg.column(0, {order:'applied'}).nodes().each( function (cell, i) {
            //         cell.innerHTML = i+1;
            //     } );
            // } ).draw();

            var $checkAll = $(".dataTables_scrollHead thead .customerSelected");
            if ($checkAll.length == 1) {
                var $showBtn = $('<input>', {
                    type: 'checkbox',
                    class: "customerSelected transform150 checkAllProposal"
                });
                $checkAll.html($showBtn);
                $('.customerSelected.checkAllProposal').on('click', function () {
                    var $checkAll = $(this) && $(this).length == 1 ? $(this)[0] : null;
                    setCheckAllProposal($checkAll.checked);
                })
            }
            function setCheckAllProposal(flag) {
                var s = $("#telePlayerSendingMsgTable tbody td.customerSelected input").each(function () {
                    $(this).prop("checked", flag);
                });
                vm.updateMultiselectCustomer();
            }

            function tableRowClicked(event) {
                if (event.target.tagName == "INPUT" && event.target.type == 'checkbox') {
                    var flagAllChecked = $("#telePlayerSendingMsgTable tbody td.customerSelected input[type='checkbox']:not(:checked)");
                    $('.customerSelected.checkAllProposal').prop('checked', flagAllChecked.length == 0);
                    vm.updateMultiselectCustomer();
                }

            }
            $('#telePlayerSendingMsgTable tbody').off('click', "**");
            $('#telePlayerSendingMsgTable tbody').on('click', 'tr', tableRowClicked);

            $('#telePlayerSendingMsgTable').off('order.dt');
            $('#telePlayerSendingMsgTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'telePlayerSendingMsgTable', vm.getTelePlayerSendingMsgTable);
            });
            $('#telePlayerSendingMsgTable').resize();

        }

        vm.changePlayerMsgTableRemark = function (obj) {
            let remark = "";
            if (vm.teleSendSmsDataholder && vm.teleSendSmsDataholder.hasOwnProperty(obj._id) && vm.teleSendSmsDataholder[obj._id].hasOwnProperty("remark$")) {
                remark = vm.teleSendSmsDataholder[obj._id].remark$;
            }
            vm.phoneNumberInfo.remark[obj._id] = remark;
        }

        vm.savePhoneNumberInfoRemark = function (data){

            var sendObj = {
                platform: vm.selectedPlatform.id,
                dxMission: vm.telePlayerSendingMsgTable.dxMissionId,
                remarkObj: vm.phoneNumberInfo.remark
            }

            socketService.$socket($scope.AppSocket, 'updatePhoneNumberRemark', sendObj, function (data) {
                //assign remark to old data
                if (vm.teleMarketingSendSMS && vm.teleMarketingSendSMS.data && vm.phoneNumberInfo && vm.phoneNumberInfo.remark) {
                    for (let i = 0; i < vm.teleMarketingSendSMS.data.length; i++) {
                        for (let dxPhoneObjId in vm.phoneNumberInfo.remark) {
                            if (vm.teleMarketingSendSMS.data[i]._id && dxPhoneObjId == String(vm.teleMarketingSendSMS.data[i]._id)) {
                                vm.teleMarketingSendSMS.data[i].remark = vm.phoneNumberInfo.remark[dxPhoneObjId];
                                vm.teleMarketingSendSMS.data[i].remark$ = vm.phoneNumberInfo.remark[dxPhoneObjId];
                            }
                        }
                    }
                }
                console.log("update phone number remark status", data)
            }, function (error) {
                console.log("error", error);
            })

            vm.showPhoneNumberRemark = false;
        }

        vm.callNewPlayerBtn = function (phoneNumber, data) {

            vm.getSMSTemplate();
            var phoneCall = {
                playerId: data && data.playerObjId && data.playerObjId.playerId ? data.playerObjId.playerId : "",
                name: data && data.playerObjId && data.playerObjId.name ? data.playerObjId.name : "",
                toText: data.playerName ? data.playerName : data.playerObjId.name || "",
                platform: "jinshihao",
                loadingNumber: true,
            }
            $scope.initPhoneCall(phoneCall);

            $scope.phoneCall.phone = phoneNumber;
            $scope.phoneCall.loadingNumber = false;
            $scope.safeApply();
            $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
        }

        // generate telePlayer Sending Message function table ====================End==================

        vm.updateMultiselectCustomer = function () {
            var allClicked = $("#telePlayerSendingMsgTable tr input:checked[type='checkbox']");
            vm.msgSendingGroupData = [];
            if (allClicked.length > 0) {
                allClicked.each(function () {
                    let dxMissionId = $(this)[0].dataset._id;
                    let platformId = $(this)[0].dataset.platformid;
                    let phoneNumber = $(this)[0].dataset.phonenumber;
                    if (dxMissionId && platformId && phoneNumber) {
                        vm.msgSendingGroupData.push({dxMissionId: dxMissionId, platformId: platformId, phoneNumber: phoneNumber.trim()});
                    }
                })
            }
            console.log(vm.msgSendingGroupData);
            vm.totalmsg = vm.msgSendingGroupData.length;
            $scope.safeApply();
        };

        vm.setSendingMsgGroup = function (index) {
            vm.msgSendingGroupData = [];
            $('.unlockTaskGroupProposal:checked').each(function () {
                let result = $(this).val().split(',');
                vm.msgSendingGroupData.push(result);
            })

            vm.totalmsg = vm.msgSendingGroupData.length;
            $scope.safeApply();
        }

        vm.sendMsgToTelePlayer = function () {
            if (vm.msgSendingGroupData && vm.msgSendingGroupData.length > 0) {

                let counterSuccess = 0, counterFailure = 0;

                let sendObj = {
                    channel: vm.smsChannel, //vm.smsChannel,
                    msgDetail: vm.msgSendingGroupData,
                };

                socketService.$socket($scope.AppSocket, 'sendSMSToDXPlayer', sendObj, function (data) {
                    console.log("sendSMSToDXPlayer RET Data", data.data)
                    if (data.data && data.data.length > 0) {
                        data.data.forEach(inData => {
                            if (inData.failure) {
                                counterFailure++;
                            }
                            else {
                                counterSuccess++;
                            }
                        })

                        if (counterSuccess == vm.msgSendingGroupData.length) {
                            vm.responseMsg = $translate("SUCCESS");
                        }
                        else {
                            vm.responseMsg = $translate("FAIL") + '(' + counterFailure + ')' ;
                        }

                        $scope.safeApply();
                    }
                }, function (error) {
                    console.log("error", error);
                })
            }
        }

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
        };

        vm.initFilterAndImportDXSystem = function () {
            vm.isShowNewListModal = true;
            vm.tsNewListEnableSubmit = true;
            vm.disableAll = false;
            vm.tsNewList = {phoneIdx: 0};
            vm.tsNewList.dangerZoneList = [];
            utilService.actionAfterLoaded("#dxDatePicker", function () {
                $('#dxDatePicker').datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy',
                    pickTime: false,
                });
                $('#dxDatePicker').data('datetimepicker').setDate(utilService.setLocalDayStartTime(new Date()));
                $('#dxTimePicker').datetimepicker({
                    language: 'en',
                    format: 'HH:mm:ss',
                    pick12HourFormat: true,
                    pickDate: false,
                });
                $('#dxTimePicker').data('datetimepicker').setDate(utilService.setLocalDayStartTime(new Date()));
            });

            vm.tsProvince = "";
            vm.tsCity = "";
        }


        vm.initAnalyticsFilterAndImportDXSystem = function (rowData) {
            vm.isShowNewListModal = true;
            vm.tsNewListEnableSubmit = true;
            vm.analyticsdisableAll = true;
            vm.analyticsPhoneListEdit = true;
            vm.tsAnalyticsPhoneList = {dangerZoneList: [], time_operator_description: []};
            vm.checkFilterIsDisable = true;

            utilService.actionAfterLoaded("#tsAnalyticsDatePicker", function () {
                $('#tsAnalyticsDatePicker').datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy',
                    pickTime: false,
                });

                $('#tsAnalyticsTimePicker').datetimepicker({
                    language: 'en',
                    format: 'HH:mm:ss',
                    pick12HourFormat: true,
                    pickDate: false,
                });

                if (rowData) {
                    vm.tsAnalyticsPhoneList._id = rowData._id;
                    vm.tsAnalyticsPhoneList.name = rowData.name;
                    vm.tsAnalyticsPhoneList.failFeedBackResult = rowData.failFeedBackResult;
                    vm.tsAnalyticsPhoneList.failFeedBackTopic = rowData.failFeedBackTopic;
                    vm.tsAnalyticsPhoneList.failFeedBackContent = rowData.failFeedBackContent;
                    vm.tsAnalyticsPhoneList.callerCycleCount = rowData.callerCycleCount;
                    vm.tsAnalyticsPhoneList.dailyCallerMaximumTask = rowData.dailyCallerMaximumTask;
                    let tsPhoneListTime = new Date();
                    if (rowData.hasOwnProperty("dailyDistributeTaskHour") && rowData.hasOwnProperty("dailyDistributeTaskMinute")
                        && rowData.hasOwnProperty("dailyDistributeTaskSecond")) {
                        tsPhoneListTime.setHours(rowData.dailyDistributeTaskHour);
                        tsPhoneListTime.setMinutes(rowData.dailyDistributeTaskMinute);
                        tsPhoneListTime.setSeconds(rowData.dailyDistributeTaskSecond);
                        $('#tsAnalyticsTimePicker').data('datetimepicker').setDate(utilService.getLocalTime(tsPhoneListTime));
                    } else {
                        $('#tsAnalyticsTimePicker').data('datetimepicker').setDate(utilService.setLocalDayStartTime(new Date()));
                    }
                    $('#tsAnalyticsDatePicker').data('datetimepicker').setDate(utilService.getLocalTime(new Date(rowData.distributeTaskStartTime)));
                    vm.tsAnalyticsPhoneList.reclaimDayCount = rowData.reclaimDayCount;
                    vm.tsAnalyticsPhoneList.isCheckWhiteListAndRecycleBin = rowData.isCheckWhiteListAndRecycleBin;
                    vm.tsAnalyticsPhoneList.dangerZoneList = rowData.dangerZoneList;
                    vm.checkAnalyticsFilterAndImportSystem();
                }

                socketService.$socket($scope.AppSocket, 'getTsPhoneImportRecord', {platform: vm.selectedPlatform.id, tsPhoneList: rowData._id}, function (data) {
                    if (data && data.data  && data.data.length) {
                        $scope.$evalAsync(() => {
                            data.data.forEach(tsImportRecord => {
                                if (tsImportRecord.description) {
                                    vm.tsAnalyticsPhoneList.time_operator_description.push(tsImportRecord);
                                }
                            });
                        });
                    }
                })
            });

            vm.editTsNewList = function () {
                let dailyDistributeTaskDate = $('#tsAnalyticsTimePicker').data('datetimepicker').getLocalDate();
                let sendData = {
                    query: {
                        _id: vm.tsAnalyticsPhoneList._id
                    },
                    updateData: {
                        failFeedBackResult: vm.tsAnalyticsPhoneList.failFeedBackResult,
                        failFeedBackTopic: vm.tsAnalyticsPhoneList.failFeedBackTopic,
                        failFeedBackContent: vm.tsAnalyticsPhoneList.failFeedBackContent,
                        callerCycleCount: vm.tsAnalyticsPhoneList.callerCycleCount,
                        dailyCallerMaximumTask:vm. tsAnalyticsPhoneList.dailyCallerMaximumTask,
                        dailyDistributeTaskHour: dailyDistributeTaskDate.getHours(),
                        dailyDistributeTaskMinute: dailyDistributeTaskDate.getMinutes(),
                        dailyDistributeTaskSecond: dailyDistributeTaskDate.getSeconds(),
                        reclaimDayCount: vm.tsAnalyticsPhoneList.reclaimDayCount,
                        dangerZoneList: vm.tsAnalyticsPhoneList.dangerZoneList
                    }
                };

                socketService.$socket($scope.AppSocket, 'updateTsPhoneList', sendData, function () {})
            }



            vm.tsAnalyticsProvince = "";
            vm.tsAnalyticsCity = "";

        }

        vm.resetAnalyticsProvince = function () {
            vm.tsAnalyticsProvince = "";
            vm.tsAnalyticsCity = "";
        }

        vm.resetProvince = function () {
            vm.tsProvince = "";
            vm.tsCity = "";
        }

        vm.showPhoneListManagement = function () {
            vm.responseMsg = false;
            utilService.actionAfterLoaded(('#phoneListSearch'), function () {
                vm.phoneListSearch.pageObj = utilService.createPageForPagingTable("#phoneListManagementTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "phoneListSearch", vm.filterPhoneListManagement);
                });
                vm.filterPhoneListManagement(true);
            });
        }

        vm.filterPhoneListManagement = (newSearch) => {
            let sendQuery = {
                platform: vm.selectedPlatform.id,
                startTime: $('#phoneListStartTimePicker').data('datetimepicker').getLocalDate(),
                endTime: $('#phoneListEndTimePicker').data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : (vm.phoneListSearch.index || 0),
                limit: vm.phoneListSearch.limit || 10,
                sortCol: vm.phoneListSearch.sortCol,
            }

            if (vm.phoneListSearch) {
                if (vm.phoneListSearch.name && vm.phoneListSearch.name.length) {
                    sendQuery.name = vm.phoneListSearch.name;
                }

                if (vm.phoneListSearch.sendStatus && vm.phoneListSearch.sendStatus.length) {
                    sendQuery.status = vm.phoneListSearch.sendStatus;
                }
            }

            socketService.$socket($scope.AppSocket, 'getTsPhoneList', sendQuery, function (data) {
                if(data && data.data && data.data.data){
                    $scope.$evalAsync(() => {
                        vm.tsPhoneList = data.data.data;
                        let size = data.data.size || 0;
                        vm.drawPhoneListManagementTable(newSearch, vm.tsPhoneList, size);
                    })
                }
            });
        };

        vm.showAssignmentStatusDetail = (tsPhoneListObjId)=>{
            vm.currentPhoneListObjId = tsPhoneListObjId;
            vm.allowDistributionSettingsEdit = false;
            vm.tsAssigneesDisplay = [];
            vm.selectedAssignees = [];
            vm.newAssigneesExecuteStatus = 1;   //refer to constTsAssigneeStatus.js at 'Server/const/' directory
            vm.newAssignees = [];
            vm.assigneeRemovalList = [];
            vm.getTsAssignees();
            $('#modalAssignmentStatusDetail').modal('show');
            $('.spicker').selectpicker('refresh');
        };
        vm.getTsAssignees = () => {
            vm.tsAssignees = [];
            return $scope.$socketPromise('getTsAssignees', {tsPhoneListObjId: vm.currentPhoneListObjId}).then(data => {
                console.log("getTsAssignees_ret", data);
                if(data && data.data){
                    $scope.$evalAsync(() => {
                        vm.tsAssignees = data.data;
                        vm.updateTsAssigneesDisplay();
                        vm.selectedAssignees = vm.tsAssigneesDisplay.map(assignee=>assignee.adminName);
                    })
                }
            });
        };

        vm.removeAssignee = (adminName) => {
            vm.assigneeRemovalList = [];
            let isNew = true;

            if(vm.tsAssignees && vm.tsAssignees.length > 0) {
                vm.tsAssignees.forEach(assignee => {
                    if (assignee.adminName == adminName) {
                        isNew = false;
                    }
                });
            }
            if(vm.selectedAssignees && vm.selectedAssignees.length > 0) {
                let selectedAssigneeIndex = vm.selectedAssignees.indexOf(adminName);
                if (selectedAssigneeIndex > -1) {
                    vm.selectedAssignees.splice(selectedAssigneeIndex, 1);
                }
            }
            if(isNew) {
                if(vm.newAssignees && vm.newAssignees.length > 0) {
                    vm.newAssignees.forEach((assignee, index) => {
                        if (assignee.adminName == adminName) {
                            vm.newAssignees.splice(index, 1);
                        }
                    });
                }
            } else {
                if(vm.assigneeRemovalList.indexOf(adminName) < 0) {
                    vm.assigneeRemovalList.push(adminName);
                }
            }

            vm.updateTsAssigneesDisplay();
            setTimeout(()=>{
                $('.spicker').selectpicker('refresh');
            }, 1);
        };
        vm.addAssignee = () => {
            vm.newAssignees = [];
            if(vm.selectedAssignees && vm.selectedAssignees.length > 0) {
                // get vm.newAssignees by filtering all selected assignees against existing assignees
                vm.selectedAssignees.forEach(adminName => {
                    let isNew = true;
                    vm.tsAssignees.forEach(assignee => {
                        if (assignee.adminName == adminName) {
                            isNew = false;
                        }
                    });
                    if (isNew) {
                        vm.newAssignees.push({
                            adminName: adminName,
                            status: vm.newAssigneesExecuteStatus
                        });
                    }
                    // delete from removalList if it has been removed before this
                    let removeAssigneeIndex = vm.assigneeRemovalList.indexOf(adminName);
                    if(removeAssigneeIndex > -1) {
                        vm.assigneeRemovalList.splice(removeAssigneeIndex, 1);
                    }
                });
                vm.updateTsAssigneesDisplay();
            }
        };
        vm.updateAssigneeStatus = (currentAssignee) => {
            let exist = false;
            vm.newAssignees.forEach((assignee, index) => {
                if(assignee.adminName == currentAssignee.adminName) {
                    vm.newAssignees.splice(index, 1, currentAssignee);
                    exist = true;
                }
            });
            if(!exist) {
                vm.newAssignees.push(currentAssignee);
            }
        };
        vm.updateTsAssigneesDisplay = () => {
            vm.tsAssigneesDisplay = [];
            // get vm.tsAssigneesDisplay by filtering existing assignees against removed assignees, display what is left
            vm.tsAssignees.forEach(assignee => {
                let removed = false;
                vm.assigneeRemovalList.forEach(adminName => {
                    if(assignee.adminName == adminName) {
                        removed = true;
                    }
                });
                if(!removed) {
                    vm.tsAssigneesDisplay.push(assignee);
                }
            });
            // merge (existing assignees less removed assignees) with new assignees
            vm.tsAssigneesDisplay = vm.tsAssigneesDisplay.concat(vm.newAssignees);
        };

        vm.enableDistributionSettingsEdit = () => {
            vm.allowDistributionSettingsEdit = true;
            $('.spicker').selectpicker('refresh');
        };
        vm.cancelDistributionSettingsEdit = () => {
            vm.newAssignees = [];
            vm.assigneeRemovalList = [];
            vm.tsAssigneesDisplay = vm.tsAssignees;
            vm.allowDistributionSettingsEdit = false;
            vm.updateTsAssigneesDisplay();
            vm.selectedAssignees = vm.tsAssigneesDisplay.map(assignee=>assignee.adminName);
        };
        vm.updateDistributionSettings = () => {
            //add and remove ts Assignee commands will be triggered synchronously
            let commonSendData = {
                platformObjId: vm.selectedPlatform.id,
                tsPhoneListObjId: vm.currentPhoneListObjId
            };
            let socketProms = [];
            if(vm.newAssignees && vm.newAssignees.length > 0) {
                let addAssigneeSendData = Object.assign(commonSendData, {
                    assignees: vm.tsAssigneesDisplay
                });
                console.log("updateTsAssignees_send", addAssigneeSendData);
                socketProms.push(
                    $scope.$socketPromise('updateTsAssignees', addAssigneeSendData).then(data => {
                        if(data){
                            console.log("updateTsAssignees_ret", data);
                        }
                    })
                );
            }
            if(vm.assigneeRemovalList && vm.assigneeRemovalList.length > 0) {
                let removeAssigneeSendData = Object.assign(commonSendData, {
                    adminNames: vm.assigneeRemovalList
                });
                console.log("removeTsAssignees_send", removeAssigneeSendData);
                socketProms.push(
                    $scope.$socketPromise('removeTsAssignees', removeAssigneeSendData).then(data => {
                        if(data){
                            console.log("removeTsAssignees_ret", data);
                        }
                    })
                );
            }
            if(socketProms && socketProms.length > 0) {
                return Promise.all(socketProms).then(() => {
                    vm.newAssignees = [];
                    vm.assigneeRemovalList = [];
                    vm.getTsAssignees();
                    vm.allowDistributionSettingsEdit = false;
                })
            }
        };

        vm.drawPhoneListManagementTable = function (newSearch, tblData, size) {
            console.log("phoneListManagementTable",tblData);
            vm.phoneNumberInfo.remark = {};
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                aoColumnDefs: [
                    // {'sortCol': 'createTime$', bSortable: true, 'aTargets': [3]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                "scrollX": true,
                "autoWidth": true,
                "sScrollY": 550,
                "scrollCollapse": true,
                columns: [
                    {
                        title: $translate('NAME_LIST_TITLE'), data: "name",
                        render: function (data, type, row, index) {
                            var link = $('<a>', {
                                'ng-click': 'vm.initAnalyticsFilterAndImportDXSystem(' + JSON.stringify(row) + ');',
                                'data-toggle': 'modal',
                                'data-target': '#modaltsAnalyticsPhoneList'
                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('SEND_STATUS'), data: "status",
                        render: function (data, type, row, index) {
                            let link = $('<a>', {
                                'ng-click': 'vm.showAssignmentStatusDetail("'+row._id+'");',
                            }).text($translate(vm.constTsPhoneListStatus[data]));
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_NAME_LIST'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'text': row.totalPhone || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_DISTRIBUTED'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "曾经指派给电销员的总电话数量。（同一电话循环2人，派发＝1）",
                                'text': row.totalDistributed || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_USED'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "所有曾经添加『回访结果』的电话。（同一电话循环2人，使用＝1）",
                                'text': row.totalUsed || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_UNUSED'),
                        render: function(data, type, row, index){
                            let totalUnused = (row.totalPhone - row.totalUsed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "名单总数当中，尚未添加回访的电话量",
                                'text': totalUnused
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_SUCCESS'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "基础数据中，定义何谓成功接听（选择回访状态）的设定（同一电话 2 电销员都有接听，接听人＝1）",
                                'text': row.totalSuccess || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_SUCCESS_RATE'),
                        render: function(data, type, row, index){
                            let percentage = (row.totalSuccess / row.totalDistributed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "成功接听量/已使用量",
                                'text': $noRoundTwoDecimalToFix(percentage)
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_REGISTERED'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "已使用量当中，电话在系统有开户（不管帐号禁用与否）",
                                'text': row.totalRegistration || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_REGISTERED_RATE'),
                        render: function(data, type, row, index){
                            let percentage = (row.totalRegistration / row.totalDistributed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "成功开户量/已使用量",
                                'text': $noRoundTwoDecimalToFix(percentage)
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_TOPUP'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "已使用量当中，有成功存款的人数",
                                'text': row.totalTopUp || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_TOPUP_RATE'),
                        render: function(data, type, row, index){
                            let percentage =  (row.totalTopUp / row.totalDistributed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "成功存款人数/已使用量",
                                'text': $noRoundTwoDecimalToFix(percentage)
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_MULTIPLE_TOPUP'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "已使用量当中，存款 2 笔以上的人数",
                                'text': row.totalMultipleTopUp || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_MULTIPLE_TOPUP_RATE'),
                        render: function(data, type, row, index){
                            let percentage = (row.totalMultipleTopUp / row.totalDistributed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "成功存款2笔人数/已使用量",
                                'text': $noRoundTwoDecimalToFix(percentage)
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_VALID'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "已使用量当中，系统定义的有效开户人数",
                                'text': row.totalValidPlayer || 0
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TOTAL_VALID_RATE'),
                        render: function(data, type, row, index){
                            let percentage = (row.totalValidPlayer / row.totalDistributed) || 0;
                            let divWithToolTip = $('<div>', {
                                'title': "有效开户量/已使用量",
                                'text': $noRoundTwoDecimalToFix(percentage)
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('PLAYER_RETENTION'),
                        render: function(data, type, row, index){
                            let divWithToolTip = $('<div>', {
                                'title': "根据『分析』功能给出报表。（首次导入后30日分析）",
                                'text': "详情"
                            });

                            return divWithToolTip.prop('outerHTML');
                        }
                    },
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            tableOptions.language.emptyTable=$translate("No data available in table");

            utilService.createDatatableWithFooter('#phoneListManagementTable', tableOptions, {
            });

            vm.phoneListSearch.pageObj.init({maxCount: size}, newSearch);
            $('#phoneListManagementTable').off('order.dt');
            $('#phoneListManagementTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'phoneListSearch', vm.getTeleMarketingOverview);
            });
            $('#phoneListManagementTable').resize();
        }

        vm.distributePhoneNumber = (tsListObjId) => {
            socketService.$socket($scope.AppSocket, 'distributePhoneNumber', {platform: vm.selectedPlatform.id, tsListObjId: tsListObjId}, function (data) {
                console.log("distributePhoneNumber", data)
            })
        }


        vm.tsAnalyticsPhoneListEdit = () => {
            vm.analyticsPhoneListEdit = false;
        }

        vm.checkAnalyticsFilterAndImportSystem = () => {
            vm.checkFilterIsDisable = true;
            if (vm.isShowNewListModal) {
                let tsTimePicker = $('#tsAnalyticsTimePicker').data('datetimepicker').getLocalDate();
                let tsDatePicker = $('#tsAnalyticsDatePicker').data('datetimepicker').getLocalDate();

                if (vm.tsAnalyticsPhoneList) {
                    if (vm.tsAnalyticsPhoneList.failFeedBackResult && vm.tsAnalyticsPhoneList.failFeedBackTopic
                        && vm.tsAnalyticsPhoneList.failFeedBackContent && vm.tsAnalyticsPhoneList.callerCycleCount
                        && vm.tsAnalyticsPhoneList.dailyCallerMaximumTask
                        && vm.tsAnalyticsPhoneList.reclaimDayCount && tsTimePicker) {
                        vm.checkFilterIsDisable = false;
                    }
                }
            }
            return vm.checkFilterIsDisable;
        };

        vm.checkFilterAndImportSystem = () => {
          vm.checkFilterIsDisable = true;
          if (vm.isShowNewListModal) {
              let timePicker = $('#dxTimePicker').data('datetimepicker').getLocalDate();
              let datePicker = $('#dxDatePicker').data('datetimepicker').getLocalDate();

              if (vm.tsNewList) {
                  if (vm.tsNewList.name && vm.tsNewList.description && vm.tsNewList.failFeedBackResult && vm.tsNewList.failFeedBackTopic
                      && vm.tsNewList.failFeedBackContent && vm.tsNewList.callerCycleCount && vm.tsNewList.dailyCallerMaximumTask
                      && vm.tsNewList.reclaimDayCount && timePicker && datePicker && vm.tsNewListEnableSubmit) {
                      vm.checkFilterIsDisable = false;
                  }
              }
          }
          return vm.checkFilterIsDisable;
        };



        vm.checkBox = () => {
            let isDisable = true;
                if(vm.tsNewList.checkBoxA == true || vm.tsNewList.checkBoxB == true){
                    isDisable = false;
                }
            return isDisable;
        };

        vm.checkTsNewListName = () => {
           if(vm.platformTsListName.indexOf(vm.tsNewList.name) == -1){
               vm.tsNewListEnableSubmit = true;
               vm.checkFilterAndImportSystem();
           }
           else{
               vm.tsNewList.checkBoxA = false;
               vm.tsNewList.checkBoxB = false;
               $('#modalTSNewListNameRepeat').show();
               $('#modalTSNewListNameRepeat').css("opacity", "1");
               $('#modalTSNewListNameRepeat').css("z-index", "12000");

           }
        };

        vm.returnToInput = () => {
            vm.disableAll = false;
            $('#modalTSNewListNameRepeat').hide();
            if(vm.tsNewList.checkBoxB === true){
                $('#nameInput').focus();
            }
            else if(vm.tsNewList.checkBoxA === true){
                $('#descInput').focus();
                vm.disableAll = true;
                vm.tsNewListEnableSubmit = false;
                socketService.$socket($scope.AppSocket, 'getOneTsNewList', {platform: vm.selectedPlatform.id, name: vm.tsNewList.name}, function (data) {
                    if (data && data.data) {
                        $scope.$evalAsync(() => {
                            vm.tsNewListEnableSubmit = true;
                            vm.tsNewList.name = data.data.name;
                            vm.tsNewList.description = "";
                            vm.tsNewList.failFeedBackResult = data.data.failFeedBackResult;
                            vm.tsNewList.failFeedBackTopic = data.data.failFeedBackTopic;
                            vm.tsNewList.failFeedBackContent = data.data.failFeedBackContent;
                            vm.tsNewList.callerCycleCount = data.data.callerCycleCount;
                            vm.tsNewList.dailyCallerMaximumTask = data.data.dailyCallerMaximumTask;
                            let tsPhoneListTime = new Date();
                            tsPhoneListTime.setHours(data.data.dailyDistributeTaskHour);
                            tsPhoneListTime.setMinutes(data.data.dailyDistributeTaskMinute);
                            tsPhoneListTime.setSeconds(data.data.dailyDistributeTaskSecond);
                            $('#dxTimePicker').data('datetimepicker').setDate(utilService.getLocalTime(tsPhoneListTime));
                            $('#dxDatePicker').data('datetimepicker').setDate(utilService.getLocalTime(new Date(data.data.distributeTaskStartTime)));
                            vm.tsNewList.reclaimDayCount = data.data.reclaimDayCount;
                            vm.tsNewList.isCheckWhiteListAndRecycleBin = data.data.isCheckWhiteListAndRecycleBin;
                            vm.tsNewList.dangerZoneList = data.data.dangerZoneList;
                            vm.checkFilterAndImportSystem();
                        });
                    }
                })

            }
        };

        vm.closeModalTSNewListNameRepeat = function () {
            $('#modalTSNewListNameRepeat').hide();
            $('#nameInput').focus();
        };


    };

    let injectParams = [
        '$sce',
        '$compile',
        '$scope',
        '$filter',
        '$location',
        '$log',
        'authService',
        'socketService',
        'utilService',
        'CONFIG',
        "$cookies",
        "$timeout",
        '$http',
        'uiGridExporterService',
        'uiGridExporterConstants',
        'commonService'
    ];

    teleMarketingController.$inject = injectParams;
    myApp.register.controller('teleMarketingCtrl', teleMarketingController);
});
