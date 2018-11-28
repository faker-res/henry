'use strict';

define(['js/app'], function (myApp) {
    let partnerController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, commonService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {
            let $translate = $filter('translate');
            let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
            let vm = this;

            // For debugging:
            window.VM = vm;

            //init local var data
            vm.updatePlatform = {};
            vm.editPlayer = {};
            vm.editPartner = {};
            vm.merchantTopupTypeJson = $scope.merchantTopupTypeJson;
            vm.provinceList = [];
            vm.cityList = [];
            vm.districtList = [];
            vm.creditChange = {};
            vm.existPhone = false;
            vm.existRealName = false;
            vm.rewardPointsChange = {};
            vm.rewardPointsConvert = {};
            vm.platformPageName = 'Partner';
            vm.platformToReplicate = "";

            // constants declaration
            vm.constPartnerCommisionType = {
                CLOSED_COMMISSION: 0,
                DAILY_BONUS_AMOUNT: 1,
                WEEKLY_BONUS_AMOUNT: 2,
                BIWEEKLY_BONUS_AMOUNT: 3,
                MONTHLY_BONUS_AMOUNT: 4,
                WEEKLY_CONSUMPTION: 5,
                OPTIONAL_REGISTRATION: 6
            };

            vm.constPartnerCommisionTypeOption = {
                DAILY_BONUS_AMOUNT: 1,
                WEEKLY_BONUS_AMOUNT: 2,
                BIWEEKLY_BONUS_AMOUNT: 3,
                MONTHLY_BONUS_AMOUNT: 4,
                WEEKLY_CONSUMPTION: 5,
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
                NOVERIFY: "NoVerify"
            };
            vm.allProposalStatus = [
                "PrePending",
                "Pending",
                "AutoAudit",
                "Processing",
                "Approved",
                "Rejected",
                "Success",
                "Fail",
                "Cancel",
                "Expired",
                "Undetermined",
                "Recover",
                "CsPending",
                "NoVerify"
            ];

            vm.inputDevice = {
                BACKSTAGE: 0,
                WEB_PLAYER: 1,
                WEB_AGENT: 2,
                H5_PLAYER: 3,
                H5_AGENT: 4,
                APP_PLAYER: 5,
                APP_AGENT: 6
            };

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

            vm.depositMethodList = $scope.depositMethodList;

            vm.allPlayerFeedbackString = {
                NORMAL: "Normal",
                MISSED_CALL: "MissedCall",
                PLAYER_BUSY: "PlayerBusy",
                OTHER: "Other",
                LAST_CALL: "LastCall"
            };

            vm.allPlayerLevelUpPeriod = {
                DAY: 1,
                WEEK: 2,
                MONTH: 3
                // 1: "DAY",
                // 2: "WEEK",
                // 3: "MONTH"
            };

            vm.soundChoice = {
                "tone1": "1.wav",
                "tone2": "2.wav",
                "tone3": "3.mp3",
                "tone4": "4.wav",
                "tone5": "5.mp3",
                "tone6": "6.wav",
                "tone7": "7.wav",
                "tone8": "8.ogg",
                "tone9": "9.ogg",
                // "tone10": "10.wav",
                // "tone11": "11.wav",
                // "tone12": "12.wav"
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

            vm.constRegistrationIntentRecordStatus = {
                INTENT: 1,
                VERIFICATION_CODE: 2,
                SUCCESS: 3,
                FAIL: 4,
                MANUAL: 5,
            };


            // player advertisement
            vm.currentImageButtonNo = 2;
            vm.playerAdvertisementStatus = {
                CLOSE: 0,
                OPEN: 1
            };
            vm.playerAdvertisementTitle = [];
            vm.editPlayerAdvertisementList = [];
            vm.addedButtonName = "activityBtn";
            vm.playerAdvertisementGroup = {};
            vm.playerAdvertisementGroup.orderNo = 0;
            vm.playerAdvertisementGroup.imageButton = [
                {
                    buttonName: "activityBtn1",
                    url: "",
                    hyperLink: "",
                    css: "position:absolute; width: auto; height: auto; top:87%; left: 20%",
                    hoverCss: ":hover{filter: contrast(200%);}"
                },
                {
                    buttonName: "activityBtn2",
                    url: "",
                    hyperLink: "",
                    css: "position:absolute; width: auto; height: auto; top:87%; left: 70%",
                    hoverCss: ":hover{filter: contrast(200%);}"
                }
            ];

            // partner advertisement
            vm.currentPartnerImageButtonNo = 2;
            vm.partnerAdvertisementStatus = {
                CLOSE: 0,
                OPEN: 1
            };
            vm.partnerAdvertisementTitle = [];
            vm.editPartnerAdvertisementList = [];
            vm.addedPartnerButtonName = "activityBtn";
            vm.partnerAdvertisementGroup = {};
            vm.partnerAdvertisementGroup.orderNo = 0;
            vm.partnerAdvertisementGroup.imageButton = [
                {
                    buttonName: "activityBtn1",
                    url: "",
                    hyperLink: "",
                    css: "position:absolute; width: auto; height: auto; top:87%; left: 20%",
                    hoverCss: ":hover{filter: contrast(200%);}"
                },
                {
                    buttonName: "activityBtn2",
                    url: "",
                    hyperLink: "",
                    css: "position:absolute; width: auto; height: auto; top:87%; left: 70%",
                    hoverCss: ":hover{filter: contrast(200%);}"
                }
            ];
            vm.editFrontEndDisplay = false;
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

            vm.getDepositMethodbyId = {
                1: 'Online',
                2: 'ATM',
                3: 'Counter',
                4: 'AliPayTransfer',
                5: 'weChatPayTransfer',
                6: 'CloudFlashPay'
            };

            vm.commissionType = {
                0: 'CLOSED_COMMISSION',
                1: 'DAILY_BONUS_AMOUNT',
                2: 'WEEKLY_BONUS_AMOUNT',
                3: 'BIWEEKLY_BONUS_AMOUNT',
                4: 'MONTHLY_BONUS_AMOUNT',
                5: 'WEEKLY_CONSUMPTION'
            };

            vm.partnerCommissionLog = {};

            vm.prepareToBeDeletedProviderGroupId = [];

            vm.longestDelayStatus = "rgb(0,180,0)";

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
            //specific proposal template
            vm.proposalTemplate = {
                1: '#modalProposal',
                2: '#newPlayerModal'
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
            vm.isValidCompanyId = function (live800CompanyIdTXT) {
                let live800Arr = live800CompanyIdTXT.split(",");
                live800Arr = live800Arr.filter(item => {
                    return item != ''
                });
                vm.showPlatform.live800CompanyId = live800Arr;
            }
            vm.isValidCSDepartment = function (departments) {
                if (!vm.showPlatform.csDepartmentTXT || vm.showPlatform.csDepartmentTXT == '') {
                    return
                }
                let result = vm.getDepartmentObjId(departments);
                Q.all([result]).then(data => {
                    let cData = data[0];
                    if (cData.data.length > 0) {
                        vm.showPlatform.csDepartment = cData.data ? cData.data : [];
                    }
                    if (cData.errMsg) {
                        vm.csDepartmentError = cData.errMsg;
                    } else {
                        vm.csDepartmentError = null;
                    }
                })
            };
            vm.isValidQIDepartment = function (departments) {
                if (!vm.showPlatform.qiDepartmentTXT || vm.showPlatform.qiDepartmentTXT == '') {
                    return
                }
                let result = vm.getDepartmentObjId(departments);
                Q.all([result]).then(data => {
                    let qData = data[0];
                    if (qData.data.length > 0) {
                        vm.showPlatform.qiDepartment = qData.data ? qData.data : [];
                    }
                    if (qData.errMsg) {
                        vm.qiDepartmentError = qData.errMsg;
                    } else {
                        vm.qiDepartmentError = null;
                    }
                })

            };
            vm.getDepartmentObjId = function (departments) {
                var deferred = Q.defer();
                socketService.$socket($scope.AppSocket, 'getAllDepartments', {}, function (data) {
                    let allDpt = data.data;
                    let noExist = 0;
                    vm.qiDepartmentError = null;
                    let result = [];
                    let departmentObjId = [];
                    let departArr = departments.split(',').map(item => {
                        return item.trim();
                    })
                    let errMsg = '';
                    let errDPT = [];
                    for (var d in departArr) {
                        let dpExist = allDpt.filter(item => {
                            if (item.departmentName == departArr[d]) {
                                result.push(item);
                                departmentObjId.push(item._id)
                                return item;
                            }
                        });
                        if (dpExist.length <= 0) {
                            errDPT.push(departArr[d])
                        }
                    }
                    if (errDPT.length > 0) {
                        let errDptArr = errDPT.join(',');
                        errMsg = errDptArr + '找不到相关部门，请再次输入';
                    }
                    deferred.resolve({data: departmentObjId, 'errMsg': errMsg});
                    $scope.safeApply();
                }, function (err) {
                    deferred.reject({});
                });
                return deferred.promise;
            }


            vm.setPlatformFooter = function (platformAction) {
                vm.platformAction = platformAction;
            };

            vm.retrievePlatformData = function(platformData) {

                let newList = [
                    'csEmailImageUrlList',
                    'csPhoneList',
                    'csQQList',
                    'csUrlList',
                    'csWeixinList',
                    'csSkypeList',
                    'csDisplayUrlList',
                    'playerInvitationUrlList',
                    'weixinPhotoUrlList',
                    'playerWebLogoUrlList',
                    'csPartnerEmailList',
                    'csPartnerPhoneList',
                    'csPartnerUrlList',
                    'csPartnerQQList',
                    'csPartnerWeixinList',
                    'csPartnerSkypeList',
                    'csPartnerDisplayUrlList',
                    'partnerInvitationUrlList',
                    'partnerWeixinPhotoUrlList',
                    'partnerWebLogoUrlList'
                ];

                // check if using new data list, else show up the old data
                let newListBoolean = false;
                for(let i = 0; i <newList.length; i++){
                    if (platformData[newList[i]].length > 0) {
                        newListBoolean = true;
                        break;
                    }
                }

                newList.forEach( listName => {

                    if (!newListBoolean){
                        //check the platform data is old or new
                        let nativeFieldName = listName.substr(0, listName.length-4);
                        if (platformData[nativeFieldName] && platformData[nativeFieldName].length > 0 && (!platformData[listName] || platformData[listName].length == 0)){
                            let oldData = platformData[nativeFieldName];
                            platformData[listName] = [{content: oldData}];
                        }
                    }

                    if(platformData[listName] && platformData[listName].length > 0){
                        platformData[listName].forEach(p => {
                            p.isImg = typeof p.isImg === 'number' ? p.isImg.toString() : null ;

                        })
                    }
                })

                return platformData;
            };

            vm.populatePlatformData = function () {
                vm.showPlatform = $.extend({}, vm.selectedPlatform.data);
            };

            vm.checkIsImg = function (data){
                data.forEach(p => {
                    p.isImg = typeof p.isImg === 'number' ? p.isImg.toString() : null ;

                })
                return data
            }

            vm.showTopupTab = function (tabName) {
                vm.selectedTopupTab = tabName == null ? "manual" : tabName;
            };

            vm.showRewardSettingsTab = function (tabName) {
                vm.selectedRewardSettingsTab = tabName == null ? "manual-reward" : tabName;

                if (tabName == "reward-progress") {
                    vm.currentFreeAmount = null;
                    vm.playerCreditDetails = null;
                    $('#rewardTaskLogTbl').empty();

                    $scope.$socketPromise('getPrevious10PlayerRTG', {
                        platformId: vm.selectedPlatform.id,
                        playerId: vm.selectedSinglePlayer._id
                    })
                        .then(last30Data => console.log('Player last 30 RTG', last30Data));
                }
            };

            vm.showReapplyLostOrderTab = function (tabName) {
                vm.selectedReapplyLostOrderTab = tabName == null ? "credit" : tabName;
            };

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

            vm.showPartnerSmsTab = function (tabName) {
                if (!tabName && (vm.selectedSinglePartner && vm.selectedSinglePartner.permission && vm.selectedSinglePartner.permission.SMSFeedBack === false)) {
                    vm.smsModalTab = "smsLogPartnerPanel";
                    vm.initSMSLogPartner("partner");
                }
                else {
                    vm.smsModalTab = tabName ? tabName : "smsToPartnerPanel";
                }
            };

            vm.showPlayerAccountingDetailTab = function (tabName) {
                vm.selectedPlayerAccountingDetailTab = tabName == null ? "current-credit" : tabName;
            };

            //before update platform
            function beforeUpdatePlatform () {
                let idStr = vm.showPlatform.department;
                vm.showPlatform.department = {_id: idStr};
                vm.updatePlatform._id = vm.selectedPlatform.id;
            }

            function getProposalTypeByPlatformId (id) {
                socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
                    $scope.$evalAsync(() => vm.allProposalType = utilService.processProposalType(data.data));
                });
            }

        function commonPageChangeHandler(curP, pageSize, objKey, serchFunc) {
            let isChange = false;
            if (!curP) {
                curP = 1;
            }
            if (vm[objKey] && pageSize != vm[objKey].limit) {
                isChange = true;
                vm[objKey].limit = pageSize;
            }
            if (vm[objKey] && (curP - 1) * pageSize != vm[objKey].index) {
                isChange = true;
                vm[objKey].index = (curP - 1) * pageSize;
            }
            if (isChange) return serchFunc.call(this);
        }

            //set selected platform node
            async function selectPlatformNode (platformObj, option)  {
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
                vm.isNotAllowEdit = true;
                vm.isCreateNewPlatform = false;
                $cookies.put("platform", vm.selectedPlatform.text);

                vm.showPlatform = commonService.convertDepartment(vm.selectedPlatform.data);
                beforeUpdatePlatform();
                vm.retrievePlatformData(vm.showPlatform);

                // if (option && !option.loadAll) {
                //     $scope.safeApply();
                //     return;
                // }
                getProposalTypeByPlatformId(vm.selectedPlatform.id);

                // Zero dependencies variable
                [vm.rewardList, vm.promoTypeList, vm.allAlipaysAcc, vm.allWechatpaysAcc, vm.allBankTypeList,
                    vm.allProviders, vm.allRewardEvent, vm.rewardPointsAllEvent, vm.allPartnerCommSettPreview,
                    vm.playerFeedbackTopic, vm.partnerFeedbackTopic, vm.allPlayerFeedbackResults,vm.allPartnerFeedbackResults,
                    [vm.allGameTypesList, vm.allGameTypes], vm.allRewardTypes,[vm.allGameProviders, vm.gameProvidersList],
                    [vm.gameProviderGroup, vm.gameProviderGroupNames]
                ] = await Promise.all([
                    commonService.getRewardList($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getPromotionTypeList($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getAllAlipaysByAlipayGroup($scope, $translate, vm.selectedPlatform.data.platformId).catch(err => Promise.resolve([])),
                    commonService.getAllWechatpaysByWechatpayGroup($scope, $translate, vm.selectedPlatform.data.platformId).catch(err => Promise.resolve([])),
                    commonService.getBankTypeList($scope).catch(err => Promise.resolve({})),
                    commonService.getPlatformProvider($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getRewardEventsByPlatform($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getRewardPointsEvent($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getAllPartnerCommSettPreview($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getPartnerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                    commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([])),
                    commonService.getAllPartnerFeedbackResults($scope).catch(err => Promise.resolve([])),
                    commonService.getAllGameTypes($scope).catch(err => Promise.resolve([[], []])),
                    commonService.getAllRewardTypes($scope).catch(err => Promise.resolve([])),
                    commonService.getAllGameProviders($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([[], []])),
                    commonService.getPlatformProviderGroup($scope, vm.selectedPlatform.data._id).catch(err => Promise.resolve([[], []]))
                ]);

                // 1st dependencies variable
                const preValue1 = await Promise.all([
                    commonService.getAllBankCard($scope, $translate, vm.selectedPlatform.data.platformId, vm.allBankTypeList).catch(err => Promise.resolve([])),
                ]);

                vm.bankCards = preValue1[0];

                // check settlement buttons
                let nowDate = new Date().toLocaleDateString();
                let dailyDate = new Date(vm.selectedPlatform.data.lastDailySettlementTime).toLocaleDateString();
                let weeklyDate = new Date(vm.selectedPlatform.data.lastWeeklySettlementTime).toLocaleDateString();
                vm.showDailySettlement = nowDate != dailyDate;
                vm.showWeeklySettlement = (nowDate != weeklyDate) && (vm.selectedPlatform.data.weeklySettlementDay == new Date().getDay());
                vm.platformSettlement = {};
                vm.advancedPartnerQueryObj = {limit: 10, index: 0};
                vm.partnerAdvanceSearchQuery = {
                    creditsOperator: ">=",
                    dailyActivePlayerOperator: ">=",
                    weeklyActivePlayerOperator: ">=",
                    monthlyActivePlayerOperator: ">=",
                    validPlayersOperator: ">=",
                    totalPlayerDownlineOperator: ">=",
                    totalChildrenDepositOperator: ">=",
                    totalChildrenBalanceOperator: ">=",
                    totalSettledCommissionOperator: ">=",
                };
                vm.playerAdvanceSearchQuery = {
                    creditOperator: ">=",
                    playerType: 'Real Player (all)'
                };
                vm.advancedQueryObj = {
                    creditOperator: ">=",
                    playerType: 'Real Player (all)'
                };

                //load partner
                utilService.actionAfterLoaded("#partnerTablePage", function () {
                    vm.advancedPartnerQueryObj.pageObj = utilService.createPageForPagingTable("#partnerTablePage", {pageSize: 10}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "advancedPartnerQueryObj", vm.getPlatformPartnersData);
                    });
                })

                $scope.$evalAsync(() => {
                    // vm.loadAlldepartment();
                    vm.getAllPartnerLevels();
                    vm.partnerCommission = {};
                    vm.getPlatformPartnersData();
                    vm.getCommissionRateGameProviderGroup();
                    vm.selectedCommissionTab('DAILY_BONUS_AMOUNT');
                    vm.onGoingLoadPlatformData = false;
                })
            }

            //search and select platform node
            function searchAndSelectPlatform (text, option) {
                var findNodes = vm.allPlatformData.filter(e => e.name === text);
                if (findNodes && findNodes.length > 0) {
                    selectPlatformNode(findNodes[0], option);
                } else {
                    selectPlatformNode(vm.allPlatformData[0], option);
                }
            }

            //build platform list based on platform data from server
            function buildPlatformList (data) {
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
                $('#platformTree').on('nodeSelected', function (event, data) {
                    selectPlatformNode(data);
                    vm.showPlatformDropDownList = false;
                });
            }

            //get all platform data from server
            function loadPlatformData (option) {
                if (vm.onGoingLoadPlatformData) {
                    return;
                }

                if (option && option.noParallelTrigger) {
                    vm.onGoingLoadPlatformData = true;
                }

                if ($('#platformRefresh').hasClass('fa-spin')) {
                    return
                }
                $('#platformRefresh').addClass('fa-spin');

                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    vm.allPlatformData = data.data;
                    if (data.data) {
                        buildPlatformList(data.data);
                    }
                    $('#platformRefresh').removeClass('fa-spin');

                    $('#platformRefresh').addClass('fa-check');
                    $('#platformRefresh').removeClass('fa-refresh');
                    setTimeout(function () {
                        $('#platformRefresh').removeClass('fa-check');
                        $('#platformRefresh').addClass('fa-refresh').fadeIn(100);
                        vm.onGoingLoadPlatformData = false;
                    }, 0);

                    //select platform from cookies data
                    let storedPlatform = $cookies.get("platform");
                    if (storedPlatform) {
                        searchAndSelectPlatform(storedPlatform, option);
                    }
                }, function (err) {
                    $('#platformRefresh').removeClass('fa-spin');
                });
            }

            $scope.$on('switchPlatform', () => {
                initPageParam();
                loadPlatformData({loadAll: true, noParallelTrigger: true});
            });

            ////////////////Mark::Platform functions//////////////////
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
                if (!authService.checkViewPermission('Platform', 'Platform', 'Read')) {
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

            vm.syncPlatform = function () {
                socketService.$socket($scope.AppSocket, 'syncPlatform', {}, function (data) {

                })
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

            vm.rebuildPlatformListDebounced = $scope.debounceSearch(() => buildPlatformList(vm.allPlatformData));

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
                vm.editFrontEndDisplay = true;
                vm.pickDay = null;
                vm.pickWeek = null;
                vm.listArray = [];
                //$("form[name='form_new_platform'] input").attr('disabled', !bool);
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
                vm.isNotAllowEdit = false;
                vm.isCreateNewPlatform = true;
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
                    loadPlatformData();
                    vm.syncPlatform();
                });
            };

            //Delete selected platform
            vm.deletePlatform = function () {
                socketService.$socket($scope.AppSocket, 'deletePlatformById', {_ids: [vm.selectedPlatform.id]}, function (data) {
                    vm.curPlatformText = "";
                    vm.selectedPlatform = null;
                    loadPlatformData();
                    vm.syncPlatform();
                });
            };

            function getAllPartnerCommSettPreview() {
                commonService.getAllPartnerCommSettPreview($scope, vm.selectedPlatform.id).then(
                    previewData => {
                        $scope.$evalAsync(() => {
                            vm.allPartnerCommSettPreview = previewData;
                        })
                    }
                );
            }

            vm.startPlatformPartnerCommissionSettlement = function ($event) {
                vm.partnerCommissionSettlement = {
                    data: [],
                    result: false,
                    status: 'ready'
                };

                let modes = [1, 2, 3, 4, 5];
                /* flags to disable settlement mode button after submit sucessfully*/
                vm.partnerSettlementSubmitted = {
                    1 : false,
                    2 : false,
                    3 : false,
                    4 : false,
                    5 : false
                };

                $scope.$socketPromise("getPlatformPartnerSettLog", {
                    platformObjId: vm.selectedPlatform.id,
                    modes: modes
                }).then(
                    logs => {
                        $scope.$evalAsync(() => {
                            vm.partnerCommissionSettlement.data = logs.data;
                            $('#partnerCommissionSettlementModal').modal('show');
                        })
                    }
                )

                getAllPartnerCommSettPreview();
            };

            vm.generatePartnerCommSettPreview = (modeObj) => {
                $scope.$socketPromise("generatePartnerCommSettPreview", {
                    platformObjId: vm.selectedPlatform.id,
                    settMode: modeObj.mode,
                    startTime: modeObj.settStartTime,
                    endTime: modeObj.settEndTime
                }).then(
                    () => {
                        vm.startPlatformPartnerCommissionSettlement()
                    },
                    error => {
                        socketService.showErrorMessage($translate(error.error.error));
                    }
                );
            };

            vm.skipNextPartnerCommissionPeriod = (modeObj, toLatest = false, isConfirm = false) => {
                if (!isConfirm) {
                    vm.modalYesNo = {};
                    vm.modalYesNo.modalTitle = $translate("Skip next partner commission settlement period");

                    if (toLatest) {
                        vm.modalYesNo.modalTitle = $translate("Skip to latest available commission settlement period");
                    }

                    vm.modalYesNo.modalText = $translate("Are you sure");
                    vm.modalYesNo.actionYes = () => vm.skipNextPartnerCommissionPeriod(modeObj, toLatest, true);
                    $('#modalYesNo').modal();
                }
                else {
                    $scope.$socketPromise("skipNextPartnerCommissionPeriod", {
                        platformObjId: vm.selectedPlatform.id,
                        settMode: modeObj.mode,
                        startTime: modeObj.settStartTime,
                        endTime: modeObj.settEndTime,
                        toLatest: toLatest
                    }).then(
                        () => {
                            vm.startPlatformPartnerCommissionSettlement();
                        },
                        error => {
                            socketService.showErrorMessage($translate(error.error.error));
                        }
                    )
                }
            };

            vm.initSettlePartnerComm = (prev) => {
                vm.partnerCommVar = {};
                vm.partnerDLCommDetailTotal = {};

                vm.partnerCommVar.platformFeeTab = 0;
                vm.partnerCommVar.settMode = prev.settMode;
                vm.partnerCommVar.startTime = prev.startTime;
                vm.partnerCommVar.endTime = prev.endTime;
                if (!vm.partnerSettlementSubmitted) {
                    vm.partnerSettlementSubmitted = {
                        1: false,
                        2: false,
                        3: false,
                        4: false,
                        5: false
                    };
                }

                vm.selectedSettlePartnerCommPrev = prev;

                $scope.$socketPromise("initSettlePartnerComm", {
                    platformObjId: vm.selectedPlatform.id,
                    settMode: prev.settMode,
                    startTime: prev.startTime,
                    endTime: prev.endTime
                }).then(
                    res => {
                        console.log('res', res);
                    }
                );

                $scope.$socketPromise("getPartnerCommissionLog", {
                    platformObjId: vm.selectedPlatform.id,
                    commissionType: prev.settMode,
                    startTime: prev.startTime,
                    endTime: prev.endTime
                }).then(
                    partnerCommObj => {
                        $scope.$evalAsync(() => {
                            vm.partnerCommissionLog = partnerCommObj.data;
                            vm.partnerCommissionLog.forEach( partner => {
                                    if (partner){
                                        partner.isAnyCustomPlatformFeeRate = false;
                                        partner.isPlatformFeeForcedZero = false;
                                        if (partner.rawCommissions && partner.rawCommissions.length > 0) {
                                            (partner.rawCommissions).forEach((group, idxgroup) => {
                                                    group.commissionRate = +(group.commissionRate*100).toFixed(2);
                                                    partner.isAnyCustomPlatformFeeRate = group.isCustomPlatformFeeRate ? true : partner.isAnyCustomPlatformFeeRate;
                                                    partner.isPlatformFeeForcedZero = group.isForcePlatformFeeToZero ? true : partner.isPlatformFeeForcedZero;
                                                    if (group.isCustomPlatformFeeRate == true) {
                                                        vm.partnerCommVar.platformFeeTab = idxgroup;
                                                    }
                                                    group.amount = $noRoundTwoDecimalPlaces(group.amount);
                                                }
                                            );
                                        }

                                        // Round to 2 dp
                                        for (let key in partner) {
                                            if (partner.hasOwnProperty(key) && typeof partner[key] === 'number') {
                                                partner[key] = $noRoundTwoDecimalPlaces(partner[key]);
                                            }

                                            if (key === 'pastNettCommission' && partner.hasOwnProperty(key) && partner[key].length) {
                                                partner[key] = partner[key].map(val => $noRoundTwoDecimalPlaces(val));
                                            }
                                        }
                                    }
                                }
                            );
                            $('#modalPartnerCommPreview').modal();
                        })
                    }
                )
            };

            /* Calculate sum for partner downlines commission details */
            vm.calculatePartnerDLTotalDetail= function (partnerDownLineCommDetail, detailType){
                for (var i in vm.partnerDLCommDetailTotal){
                    delete vm.partnerDLCommDetailTotal[i];
                }

                if (partnerDownLineCommDetail && partnerDownLineCommDetail.length > 0){
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

            /* Check for no remark entry if settleMethod is not normal settlement */
            vm.checkPartnerCommissionLogRemark = function () {
                delete vm.partnerCommVar.checkedRemark;
                let applyPartnerCommSettlementArray = [];
                vm.partnerCommissionLog.forEach( partner => {
                    if (partner) {
                        applyPartnerCommSettlementArray.push(
                            {
                                logId: partner._id,
                                settleType: parseInt(partner.settleMethod),
                                remark: partner.remarks ? partner.remarks : ""
                            }
                        );

                        switch (partner.settleMethod) {
                            case "2":
                            case "3":
                                if (!partner.remarks || partner.remarks == ""){
                                    vm.partnerCommVar.checkedRemark = "Please Add Remark If Not Normal Executed!";
                                }
                                break;
                        };
                    }
                });

                if (!vm.partnerCommVar.checkedRemark){
                    vm.partnerSettlementSubmitted[vm.partnerCommVar.settMode] = true;
                    vm.bulkApplyPartnerCommission(applyPartnerCommSettlementArray);
                }
            };

            /* Cancel preview */
            vm.cancelPreview = (isConfirm = false) => {
                if (!isConfirm) {
                    vm.modalYesNo = {};
                    vm.modalYesNo.modalTitle = $translate("CANCEL PREVIEW");
                    vm.modalYesNo.modalText = $translate("Are you sure");
                    vm.modalYesNo.actionYes = () => vm.cancelPreview(true);
                    $('#modalYesNo').modal();
                }
                else {
                    let sendData = {
                        commSettLog: vm.selectedSettlePartnerCommPrev,
                    };
                    let partnerCommLogIdArr = [];

                    vm.partnerCommissionLog.forEach( partnerCommLog => {
                        if (partnerCommLog) {
                            partnerCommLogIdArr.push(partnerCommLog._id);
                        }
                    });

                    sendData.partnerCommLogId = partnerCommLogIdArr;

                    socketService.$socket($scope.AppSocket, 'cancelPartnerCommissionPreview', sendData, function (data) {
                        getAllPartnerCommSettPreview();
                    });
                }
            };

            /* Apply bulk partner commission settlement */
            vm.bulkApplyPartnerCommission = function (applyPartnerCommSettlementArray) {
                let sendData = {
                    applySettlementArray: applyPartnerCommSettlementArray,
                    platformObjId: vm.selectedPlatform.data._id,
                    commissionType: vm.partnerCommVar.settMode,
                    startTime: vm.partnerCommVar.startTime,
                    endTime: vm.partnerCommVar.endTime
                };

                socketService.$socket($scope.AppSocket, 'bulkApplyPartnerCommission', sendData, function (data) {
                    console.log('returnOutput', data);
                });
            };

            /* Clear all platform fee */
            vm.forceTotalPlatformFeeToZero = function (selectedPartnerCommissionLog) {
                if (selectedPartnerCommissionLog && selectedPartnerCommissionLog.rawCommissions && selectedPartnerCommissionLog.rawCommissions.length > 0) {
                    let sendData = {
                        _id: selectedPartnerCommissionLog._id,
                        platform: selectedPartnerCommissionLog.platform,
                        partner: selectedPartnerCommissionLog.partner,
                        commissionType: selectedPartnerCommissionLog.commissionType,
                        rawCommissions: selectedPartnerCommissionLog.rawCommissions,
                        totalPlatformFee: selectedPartnerCommissionLog.totalPlatformFee,
                        nettCommission: selectedPartnerCommissionLog.nettCommission
                    };

                    socketService.$socket($scope.AppSocket, 'updateTotalPlatformFeeToZero', sendData, function (data) {
                        console.log('updateTotalPlatformFeeToZero', data);
                        vm.initSettlePartnerComm(vm.partnerCommVar);
                    });
                }
            };

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

            function getConsumptionReturnPeriodTime(event) {
                return $scope.$socketPromise('getConsumptionReturnPeriodTime', {period: event.settlementPeriod}).then(res => {
                    $scope.$evalAsync(() => {
                        event.settlementStartTime = vm.dateReformat(res.data.startTime);
                        event.settlementEndTime = vm.dateReformat(res.data.endTime);
                    })
                })
            };

            vm.startPlatformPlayerConsumptionReturnSettlement = function ($event) {
                vm.playerConsumptionReturnSettlement = {
                    result: false,
                    status: 'ready'
                };

                let p = Promise.resolve();

                vm.allRewardEvent.map(event => {
                    if (event && event.settlementPeriod && event.type.name == "PlayerConsumptionReturn") {
                        p = p.then(() => getConsumptionReturnPeriodTime(event))
                    }
                });

                $('#playerConsumptionReturnSettlementModal').modal('show');
            };

            vm.startPlatformRTGEventSettlement = function (event) {
                vm.platformRTGEventSettlement = {
                    result: false,
                    status: 'ready'
                };

                vm.selectedSettlementRewardEvent = event;

                let socketName;

                switch (event.condition.interval) {
                    case "1":
                    case 1:
                        socketName = "getYesterdaySGTime";
                        break;
                    case "2":
                    case 2:
                        socketName = "getLastWeekSGTime";
                        break;
                    case "3":
                    case 3:
                        socketName = "getLastBiWeekSGTime";
                        break;
                    case "4":
                    case 4:
                        socketName = "getLastMonthSGTime";
                }

                socketService.$socket($scope.AppSocket, socketName,
                    {},
                    ret => {
                        vm.platformRTGEventSettlement.startTime = vm.dateReformat(ret.data.startTime);
                        vm.platformRTGEventSettlement.endTime = vm.dateReformat(ret.data.endTime);
                        $scope.safeApply();
                    });

                $('#platformRTGEventSettlementModal').modal('show');
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

            var setPlayerTableData = function (data) {
                return setTableData(vm.playerTable, data);
            };

            // Clears the table data and shows the provided data instead, without re-creating the table object itself.
            var setTableData = function (table, data) {
                if (table) {
                    table.clear();
                }
                if (data) {
                    data.forEach(function (rowData) {
                        if (rowData) {
                            if (rowData.credits) {
                                rowData.credits = rowData.credits.toFixed(2);
                            }
                            if (rowData.totalChildrenDeposit) {
                                rowData.totalChildrenDeposit = rowData.totalChildrenDeposit.toFixed(2);
                            }
                            if (rowData.totalChildrenBalance) {
                                rowData.totalChildrenBalance = rowData.totalChildrenBalance.toFixed(2);
                            }
                            if (rowData.totalSettledCommission) {
                                rowData.totalSettledCommission = rowData.totalSettledCommission.toFixed(2);
                            }
                            if (rowData.registrationTime) {
                                rowData.registrationTime = utilService.getFormatTime(rowData.registrationTime);
                            }
                            if (rowData.lastAccessTime) {
                                rowData.lastAccessTime = utilService.getFormatTime(rowData.lastAccessTime)
                            }
                            if (table) {
                                table.row.add(rowData);
                            }
                        }
                    });
                }
                if (table) {
                    table.draw();
                }
            };

            // Multiply by this to convert hours to seconds
            var hours = 60 * 60;

            function createPartnerAdvancedSearchFilters(config) {
                var currentQueryValues = {};
                $(config.filtersElement).empty();

                function getRegTimeQueryValue() {
                    let startValue = $('#regDateTimePicker2').data('datetimepicker').getLocalDate();
                    let endValue = $('#regEndDateTimePicker2').data('datetimepicker').getLocalDate();
                    let queryValue = {};
                    if ($('#regDateTimePicker2 input').val()) {
                        queryValue["$gte"] = startValue;
                    }
                    if ($('#regEndDateTimePicker2 input').val()) {
                        queryValue["$lt"] = endValue;
                    }
                    return $.isEmptyObject(queryValue) ? null : queryValue;
                }

                function getAccessTimeQueryValue() {
                    let startValue = $('#lastAccessDateTimePicker2').data('datetimepicker').getLocalDate();
                    let endValue = $('#lastAccessEndDateTimePicker2').data('datetimepicker').getLocalDate();
                    let queryValue = {};
                    if ($('#lastAccessDateTimePicker2 input').val()) {
                        queryValue["$gte"] = startValue;
                    }
                    if ($('#lastAccessEndDateTimePicker2 input').val()) {
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
                        var newFilter = $('<div class="search-filter col-xs-12 col-sm-6 col-md-3">')
                            .append(label).append(input);
                        $(config.filtersElement).append(newFilter);

                        if (fieldName === "registrationTime") {
                            $('#regDateTimePicker2').datetimepicker().off('changeDate');
                            $('#regDateTimePicker2').datetimepicker().on('changeDate', function () {
                                getQueryFunction(config, filterConfig, 'registrationTime', getRegTimeQueryValue(), true);
                            });
                        }

                        if (fieldName === "registrationEndTime") {
                            $('#regEndDateTimePicker2').datetimepicker().off('changeDate');
                            $('#regEndDateTimePicker2').datetimepicker().on('changeDate', function () {
                                getQueryFunction(config, filterConfig, 'registrationTime', getRegTimeQueryValue(), true);
                            });
                        }

                        if (fieldName === "lastAccessTime") {
                            $('#lastAccessDateTimePicker2').datetimepicker().off('changeDate');
                            $('#lastAccessDateTimePicker2').datetimepicker().on('changeDate', function () {
                                getQueryFunction(config, filterConfig, 'lastAccessTime', getAccessTimeQueryValue(), true);
                            });
                        }

                        if (fieldName === "lastAccessEndTime") {
                            $('#lastAccessEndDateTimePicker2').datetimepicker().off('changeDate');
                            $('#lastAccessEndDateTimePicker2').datetimepicker().on('changeDate', function () {
                                getQueryFunction(config, filterConfig, 'lastAccessTime', getAccessTimeQueryValue(), true);
                            });
                        }

                        // Listen for user editing the textbox, and pass the search to datatable
                        //var ptCol = vm.playerTable.columns(i);
                        input.on('keyup change', (function (evt) {
                            //Text inputs do not fire the change event until they lose focus.
                            if (evt.currentTarget.tagName === "INPUT" && evt.type === 'change') return;
                            let queryValue = '';
                            // Do Additional listening to the keyup event of datetime picker by the className of the div
                            if (this.className === 'datetimepicker form-control') {
                                // assign the value of input (firstchild of the div) to queryValue
                                if (evt.currentTarget.id === "regDateTimePicker2" || evt.currentTarget.id === "regEndDateTimePicker2") {
                                    queryValue = getRegTimeQueryValue();
                                    getQueryFunction(config, filterConfig, "registrationTime", queryValue, false);
                                } else if (evt.currentTarget.id === "lastAccessDateTimePicker2" || evt.currentTarget.id === "lastAccessEndDateTimePicker2") {
                                    queryValue = getAccessTimeQueryValue();
                                    getQueryFunction(config, filterConfig, "lastAccessTime", queryValue, false);
                                }
                            }
                            else if (filterConfig && filterConfig.type === "multi") {
                                let values = [];
                                let options = this && this.options;
                                for (let i = 0; i < options.length; i++) {
                                    let option = options[i];
                                    if (option.selected && option.text !== "—") {
                                        values.push(option.value || option.text);
                                    }
                                }

                                if (values.length === 0) {
                                    values = null;
                                }
                                getQueryFunction(config, filterConfig, fieldName, values, false);
                            }
                            else {
                                queryValue = this.value;
                                getQueryFunction(config, filterConfig, fieldName, queryValue, false);
                            }
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

                if (filterConfig && filterConfig.type === 'multi') {
                    let select = $('<select multiple>');
                    let options = filterConfig.options.slice(0);
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

            vm.playerBatchPermitTableRowClick = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                $compile(nRow)($scope);
            };
            vm.playerTableRowClick = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                if(vm.ctiData && vm.ctiData.hasOnGoingMission) {
                    if(aData.callOutMissionStatus == $scope.constCallOutMissionCalleeStatus.SUCCEEDED) {
                        $(nRow).addClass('callOutSucceeded');
                    } else if(aData.callOutMissionStatus == $scope.constCallOutMissionCalleeStatus.FAILED) {
                        $(nRow).addClass('callOutFailed');
                    }
                }
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
                    FORBID_GAME: '#D2691E',
                    CHEAT_NEW_ACCOUNT_REWARD: '#800000',
                    TOPUP_ATTENTION: '#800000',
                    HEDGING: '#800000',
                    TOPUP_BONUS_SPAM: '#800000',
                    MULTIPLE_ACCOUNT: '#800000',
                    BANNED: 'red',
                    FORBID_ONLINE_TOPUP: '#800000',
                    BAN_PLAYER_BONUS: '#800000'
                }
                $(nRow).find('td:contains(' + $translate(statusKey) + ')').each(function (i, v) {
                    $(v).find('a').eq(0).css('color', colorObj[statusKey]);
                })

                // Row click
                $(nRow).off('click');
                $(nRow).on('click', function () {
                    $('#playerDataTable tbody tr').removeClass('selected');
                    $('#playerFeedbackDataTable tbody tr').removeClass('selected');
                    $(this).toggleClass('selected');
                    vm.selectedPlayersCount = 1;
                    vm.playerTableRowClicked(aData);
                    vm.playerTableClickedRow = vm.playerTable.row(this);
                    //display qq in email when no email added
                    vm.qqAddress = (vm.selectedSinglePlayer.qq ? vm.selectedSinglePlayer.qq + "@qq.com" : null);
                });
            };

            vm.getEncPhoneNumber = function (playerData) {
                return (playerData && playerData.phoneNumber) ? (playerData.phoneNumber.substring(0, 3) + "******" + playerData.phoneNumber.slice(-4)) : ''
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
            };

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
            };

            vm.sendMessageToPartnerBtn = function (partnerObjId) {
                vm.telphonePartner = vm.partners.find(p => String(p._id) === partnerObjId);
                $('#messagePartnerModal').modal('show');
            };

            vm.getSMSTemplate = function () {
                vm.smsTemplate = [];
                $scope.$socketPromise('getMessageTemplatesForPlatform', {
                    platform: vm.selectedPlatform.id,
                    format: 'smstpl'
                }).then(function (data) {
                    vm.smsTemplate = data.data;
                    console.log("vm.smsTemplate", vm.smsTemplate);
                }).done();
            };

            vm.changePartnerSMSTemplate = function () {
                vm.smsPartner.message = vm.smstpl ? vm.smstpl.content : '';
            };

            vm.callNewPlayerBtn = function (phoneNumber, data) {

                vm.getSMSTemplate();
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
                $scope.safeApply();
                $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
            }
            vm.smsNewPlayerBtn = function (phoneNumber, data) {
                vm.getSMSTemplate();
                vm.selectedSinglePlayer = data;
                vm.editPlayer = data.data ? data.data : "";
                vm.selectedPlayersCount = 1
                vm.smsPlayer = {
                    playerId: data.playerId,
                    name: data.name,
                    nickName: data.nickName || '',
                    platformId: vm.selectedPlatform.data.platformId,
                    channel: $scope.channelList[0],
                    hasPhone: phoneNumber
                }
                vm.sendSMSResult = {};
                $scope.safeApply();
                $('#smsPlayerModal').modal('show');
            };

            vm.telorMessageToPartnerBtn = function (type, partnerObjId, data) {
                data = vm.partners.find(p => String(p._id) === partnerObjId);
                vm.getSMSTemplate();

                if (type === 'msg' && authService.checkViewPermission('Partner', 'Partner', 'sendSMS')) {
                    vm.smsPartner = {
                        partnerId: data.partnerId,
                        partnerName: data.partnerName,
                        realName: data.realName,
                        platformId: vm.selectedPlatform.data.platformId,
                        channel: $scope.channelList[0],
                        hasPhone: data.phoneNumber
                    };
                    vm.sendSMSResult = {};
                    $scope.safeApply();
                    $('#smsPartnerModal').modal('show');
                    vm.showPartnerSmsTab(null);
                } else if (type === 'tel') {
                    let phoneCall = {
                        partnerId: data.partnerId,
                        name: data.realName,
                        toText: data.partnerName ? data.partnerName : data.realName,
                        platform: "jinshihao",
                        loadingNumber: true,
                    };
                    $scope.initPhoneCall(phoneCall);
                    socketService.$socket($scope.AppSocket, 'getPartnerPhoneNumber', {partnerObjId: partnerObjId}, function (data) {
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

            vm.editPlayerStatus = function (id) {
                console.log(id);
            }

            vm.isOneSelectedPartner = function () {
                return vm.selectedSinglePartner;
            };

            //check if update partner button can be enabled
            vm.canEditPartner = function () {
                return vm.isOneSelectedPartner();
            };

            vm.checkPlayerNameValidity = function (name, form, type) {
                if (!name) return;
                vm.euPrefixNotExist = false;
                if (type == 'edit' && name == vm.selectedSinglePlayer.name) {
                    vm.duplicateNameFound = false;
                    return;
                }

                if (type !== 'edit' && vm.selectedPlatform.data.name === "EU8" && name && name.charAt(0) !== "e") {
                    vm.euPrefixNotExist = true;
                }
                form.$setValidity('euPrefixNotExist', !vm.euPrefixNotExist);
                $scope.safeApply();


                socketService.$socket($scope.AppSocket, 'checkPlayerNameValidity', {
                    platform: vm.selectedPlatform.id,
                    name: name
                }, function (data) {
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

            vm.checkAdminNameValidity = ((adminName) => {
                if (!adminName || adminName == '') {
                    return
                }

                socketService.$socket($scope.AppSocket, 'getAdminInfo', {adminName: adminName}, function (data) {
                    $scope.$evalAsync(() => {
                        if (!data || !data.data) {
                            vm.isAdminNameValidity = true;
                        } else {
                            if (data.data._id) {
                                vm.csOfficer = data.data._id;
                            }
                            vm.isAdminNameValidity = false;
                        }
                    })
                });
            })

            var _ = {
                clone: function (obj) {
                    return $.extend({}, obj);
                }
            };



            //check if value is pass in before data table function is call
            vm.onClickPlayerCheck = function (recordId, callback, param) {
                if (!(param instanceof Array)) {
                    param = param ? [param] : [];
                }

                if (vm.currentSelectedPlayerObjId && recordId === vm.currentSelectedPlayerObjId) {
                    callback.apply(null, param);
                }
                else {
                    setTimeout(function () {
                        vm.onClickPlayerCheck(recordId, callback, param);
                    }, 50);
                }
            };

            vm.loadPartnerSMSSettings = function () {
                let selectedPartner = vm.isOneSelectedPartner();   // ~ 20 fields!
                let editPartner = vm.editPartner;                  // ~ 6 fields
                vm.partnerBeingEdited = {
                    smsSetting: editPartner.smsSetting,
                    receiveSMS: editPartner.receiveSMS
                };
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
                } else {
                    $('.partnerValidTrue').hide();
                    $('.partnerValidFalse').hide();
                    editObj.partner = null;
                }
            };

            vm.updatePartnerSMSSettings = function () {
                let partnerId = vm.isOneSelectedPartner()._id;

                let updateSMS = {
                    receiveSMS: vm.partnerBeingEdited.receiveSMS != null ? vm.partnerBeingEdited.receiveSMS : undefined,
                    smsSetting: vm.partnerBeingEdited.smsSetting,
                };

                socketService.$socket($scope.AppSocket, 'updatePartner', {
                    query: {_id: playerId},
                    updateData: updateSMS
                }, function (updated) {
                    console.log('updated', updated);
                    vm.getPlatformPartnersData();
                });

            }

            /// check the length of password of player/partner before signup
            vm.passwordLengthCheck = function (password) {
                if (password) {
                    return password.length < 6;
                }
                else return false;
            }
            vm.displayPhoneError = function (status) {
                if (status && status == 454) {
                    vm.existPhone = true;
                } else {
                    vm.existPhone = false;
                }
            }

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
                vm.showPartners = vm.partners ? vm.partners.map(item => {
                    item.parent$ = item.partnerName ? item.partnerName : '';
                    item.children$ = item.children.length;
                    item.registrationTime$ = vm.dateReformat(item.registrationTime);
                    item.level$ = $translate(item.level.name);
                    item.lastAccessTime$ = vm.dateReformat(item.lastAccessTime);
                    item.validPlayers$ = vm.partnerPlayerObj[item._id] ? vm.partnerPlayerObj[item._id].validPlayers : 0;
                    item.activePlayers$ = vm.partnerPlayerObj[item._id] ? vm.partnerPlayerObj[item._id].activePlayers : 0;
                    return item;
                }) : [];

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
                            title: $translate('PARTNER_NAME'),
                            data: "partnerName",
                            advSearch: true,
                            "sClass": "alignLeft",
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

            vm.initResetPlayerPasswordModal = () => {
                vm.customNewPassword = "888888";
                vm.playerNewPassword = "";
                vm.resetPartnerNewPassword = false;
            };

            vm.initPlayerCredibility = () => {
                vm.credibilityRemarkComment = "";
                vm.credibilityRemarkUpdateMessage = "";
                vm.somePlayerRemarksRemoved = false;
                vm.playerCredibilityRemarksUpdated = false;
                vm.prepareCredibilityConfig().then(
                    () => {
                        if (!vm.selectedSinglePlayer.credibilityRemarks) {
                            return;
                        }

                        let playerRemarksId = vm.selectedSinglePlayer.credibilityRemarks;
                        for (let i = 0; i < playerRemarksId.length; i++) {
                            for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                if (playerRemarksId[i] === vm.credibilityRemarks[j]._id) {
                                    vm.credibilityRemarks[j].selected = true;
                                }
                            }
                        }
                        vm.getPlayerCredibilityComment();
                        $scope.safeApply();
                    }
                );
            };

            vm.checkAnyPlayerRemarkRemoved = () => {
                let playerRemarksId = vm.selectedSinglePlayer.credibilityRemarks;
                for (let i = 0; i < playerRemarksId.length; i++) {
                    for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                        if (playerRemarksId[i] === vm.credibilityRemarks[j]._id) {
                            if (vm.credibilityRemarks[j].selected !== true) {
                                vm.somePlayerRemarksRemoved = true;
                                return;
                            }
                            break;
                        }
                    }
                }
                vm.somePlayerRemarksRemoved = false;
            };

            vm.submitRemarkUpdate = () => {
                let selectedRemarks = [];
                for (let i = 0; i < vm.credibilityRemarks.length; i++) {
                    if (vm.credibilityRemarks[i].selected === true) {
                        selectedRemarks.push(vm.credibilityRemarks[i]._id);
                    }
                }

                let sendQuery = {
                    admin: authService.adminName,
                    platformObjId: vm.selectedSinglePlayer.platform,
                    playerObjId: vm.selectedSinglePlayer._id,
                    remarks: selectedRemarks,
                    comment: vm.credibilityRemarkComment
                };

                socketService.$socket($scope.AppSocket, "updatePlayerCredibilityRemark", sendQuery, function (data) {
                    vm.playerCredibilityRemarksUpdated = true;
                    vm.credibilityRemarkUpdateMessage = "SUCCESS";
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }, function (error) {
                    vm.playerCredibilityRemarksUpdated = true;
                    vm.credibilityRemarkUpdateMessage = error.error.message;
                    $scope.safeApply();
                });
            };


            vm.submitResetPlayerPassword = function () {
                console.log('here', {_id: vm.isOneSelectedPlayer()._id});

                let queryObj = {
                    playerId: vm.isOneSelectedPlayer()._id,
                    platform: vm.isOneSelectedPlayer().platform,
                    newPassword: vm.customNewPassword,
                    creator: {type: "admin", name: authService.adminName, id: authService.adminId},
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

            vm.initPartnerMessageModal = function () {
                $('#sendMessageToPartnerTab').addClass('active');
                $('#messageLogPartnerTab').removeClass('active');
                vm.messageModalTab = "sendMessageToPartnerPanel";
                vm.messageForPartner = {};
            };

            vm.initPartnerSMSModal = function () {
                $('#smsToPartnerTab').addClass('active');
                $('#smsLogPartnerTab').removeClass('active');
                $('#smsSettingPartnerTab').removeClass('active');
                vm.smsModalTab = "smsToPartnerPanel";
                vm.partnerSmsSetting = {smsGroup:{}};
                vm.getPlatformSmsGroups();
                vm.getAllMessageTypes();
                $scope.safeApply();
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
            };

            vm.initPlayerDisplayDataModal = function () {
                $('#customerServiceTab').addClass('active');
                $('#advertisementTab').removeClass('active');
                $scope.safeApply();
                vm.playerDisplayDataTab = "customerServicePanel";
                vm.showAdvertisementRecord = true;
                vm.editAdvertisementRecord = false;
                vm.playerAdvertisementWebDevice = true;
            };

            vm.initPartnerDisplayDataModal = function () {
                $('#partnerServiceTab').addClass('active');
                $('#partnerAdvertisementTab').removeClass('active');
                $scope.safeApply();
                vm.partnerDisplayDataTab = "partnerPanel";
                vm.showPartnerAdvertisementRecord = true;
                vm.editPartnerAdvertisementRecord = false;
                vm.partnerAdvertisementWebDevice = true;
            };

            vm.prepareShowFeedbackRecord = function (rowData) {
                if (rowData && rowData.partnerId) {
                    vm.partnerFeedbackRecord = vm.partnerFeedbackRecord || {totalCount: 0};
                    utilService.actionAfterLoaded('#modalAddPartnerFeedback .searchDiv .startTime', function () {
                        vm.partnerFeedbackRecord.startTime = utilService.createDatePicker('#modalAddPartnerFeedback .searchDiv .startTime');
                        vm.partnerFeedbackRecord.endTime = utilService.createDatePicker('#modalAddPartnerFeedback .searchDiv .endTime');
                        vm.partnerFeedbackRecord.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 365)));
                        vm.partnerFeedbackRecord.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));

                        utilService.actionAfterLoaded('#partnerFeedbackRecord', function () {
                            vm.partnerFeedbackRecord.pageObj = utilService.createPageForPagingTable("#partnerFeedbackRecordTablePage", {}, $translate, function (curP, pageSize) {
                                commonPageChangeHandler(curP, pageSize, "partnerFeedbackRecord", vm.getFeedbackRecord)
                            });
                            vm.getFeedbackRecord(true);
                        });
                    });
                }
            };

            vm.getFeedbackRecord = function (newSearch) {
                vm.partnerFeedbackRecord.searching = true;
                let queryData = {
                    query: {
                        startTime: vm.partnerFeedbackRecord.startTime.data('datetimepicker').getLocalDate(),
                        endTime: vm.partnerFeedbackRecord.endTime.data('datetimepicker').getLocalDate(),
                        partnerId: vm.selectedSinglePartner._id
                    },
                    limit: newSearch ? 10 : (vm.partnerFeedbackRecord.limit || 10),
                    index: newSearch ? 0 : (vm.partnerFeedbackRecord.index || 0),
                    sortCol: vm.partnerFeedbackRecord.sortCol || null
                };

                console.log("queryData", queryData);
                vm.prepareFeedbackRecord(queryData, newSearch);
            }

            vm.prepareFeedbackRecord = function (queryData, newSearch) {
                vm.partnerFeedbackData = [];
                socketService.$socket($scope.AppSocket, 'getPartnerFeedbackReport', queryData, function (data) {
                    console.log('getPartnerFeedback', data);

                    vm.partnerFeedbackData = data.data.data;
                    vm.partnerFeedbackRecord.totalCount = data.data.size;
                    vm.partnerFeedbackRecord.searching = false;

                    var tableData = vm.partnerFeedbackData.map(
                        record => {
                            record.createTime = (record && record.createTime) ? vm.dateReformat(record.createTime) : "";
                            record.result =
                                (record && record.resultName) ? record.resultName : $translate(record.result);
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
                    var a = utilService.createDatatableWithFooter('#partnerFeedbackRecordTable', option, {});
                    vm.partnerFeedbackRecord.pageObj.init({maxCount: vm.partnerFeedbackRecord.totalCount}, newSearch);
                    $("#partnerFeedbackRecordTable").off('order.dt');
                    $("#partnerFeedbackRecordTable").on('order.dt', function (event, a, b) {
                        vm.commonSortChangeHandler(a, 'partnerFeedbackRecord', vm.getFeedbackRecord);
                    });
                    $('#partnerFeedbackRecordTable').resize();
                    $scope.safeApply();
                });
            };

            vm.updatePartnerFeedbackData = function (modalId, tableId, opt) {
                opt = opt || {'dom': 't'};
                vm.partnerFeedbackRecord.searching = true;
                socketService.$socket($scope.AppSocket, 'getPartnerFeedbackReport', {
                    query: {
                        startTime: vm.partnerFeedbackRecord.startTime.data('datetimepicker').getLocalDate(),
                        endTime: vm.partnerFeedbackRecord.endTime.data('datetimepicker').getLocalDate(),
                        partnerId: vm.selectedSinglePartner._id
                    }
                }, function (data) {
                    console.log('getPartnerFeedback', data);
                    vm.partnerFeedbackRecord.searching = false;
                    vm.partnerFeedbackData = data.data;

                    vm.partnerFeedbackData.data.forEach(item => {
                        item.result$ = item.resultName ? item.resultName : $translate(item.result);
                    });

                    $scope.safeApply();
                    vm.updateDataTableinModal(modalId, tableId, opt)
                });
            };

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
                vm.queryPlatformCreditTransferPlayerName = row.name;
                // vm.creditModal = $('#modalPlayerGameProviderCredit').modal();
                vm.creditModal = $('#modalPlayerAccountingDetail').modal();
                vm.playerCredit = {};
                vm.creditTransfer = {};
                vm.fixPlayerRewardAmount = {rewardInfo: row.rewardInfo};
                vm.transferAllCredit = {};
                vm.rewardTotalAmount = 0;
                vm.creditTransfer.needClose = false;
                vm.creditTransfer.transferResult = '';

                if (vm.selectedPlatform.data.useProviderGroup) {
                    vm.creditTransfer.showValidCredit = row.validCredit;
                    vm.creditTransfer.showRewardAmount = row.lockedCredit;
                } else {
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
                }

                for (var i in vm.platformProviderList) {
                    vm.getPlayerCreditInProvider(row.name, vm.platformProviderList[i].providerId, vm.playerCredit)
                }
                vm.showPlayerAccountingDetailTab(null);
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

            // todo :: comment these out since not use anymore
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
            vm.confirmUpdatePlayerTopupTypes = function (sendData) {
                sendData = sendData || {
                    query: {_id: vm.isOneSelectedPlayer()._id},
                    updateData: {forbidTopUpType: vm.showForbidTopupTypes || []}
                };

                console.log('sendData', sendData)
                socketService.$socket($scope.AppSocket, 'updatePlayerForbidPaymentType', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    let forbidTopUpNames = [];
                    for (let i = 0; i < data.data.forbidTopUpType.length; i++) {
                        forbidTopUpNames[i] = vm.merchantTopupTypeJson[data.data.forbidTopUpType[i]];
                    }
                    vm.updateForbidTopUpLog(data.data._id, forbidTopUpNames);
                    $scope.safeApply();
                });
            }

            vm.confirmBatchUpdatePlayerTopupTypes = function (sendData) {

                console.log('sendData', sendData)
                socketService.$socket($scope.AppSocket, 'updateBatchPlayerForbidPaymentType', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateBatchForbidTopUpLog(data);
                    $scope.safeApply();
                });
            }


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

                    let rowData = vm.playerTableClickedRow.data();
                    rowData.feedbackTimes++;
                    vm.playerTableClickedRow.data(rowData).draw();

                    if (vm.platformPageName == 'Feedback') {
                        vm.submitPlayerFeedbackQuery();
                    }
                    $scope.safeApply();
                });
            };

            vm.updatePartnerFeedback = function () {
                let resultName = vm.allPartnerFeedbackResults.filter(item => {
                    return item.key === vm.partnerFeedback.result;
                });
                resultName = resultName.length > 0 ? resultName[0].value : "";
                let sendData = {
                    partnerId: vm.isOneSelectedPartner()._id,
                    platform: vm.selectedPlatform.id,
                    createTime: Date.now(),
                    adminId: authService.adminId,
                    content: vm.partnerFeedback.content,
                    result: vm.partnerFeedback.result,
                    resultName: resultName,
                    topic: vm.partnerFeedback.topic
                };
                console.log('add feedback', sendData);
                socketService.$socket($scope.AppSocket, 'createPartnerFeedback', sendData, function (data) {
                    console.log('feedbackadded', data);
                    vm.partnerFeedback = {};

                    let rowData = vm.partnerTableClickedRow.data();
                    rowData.feedbackTimes++;
                    vm.partnerTableClickedRow.data(rowData).draw();

                    $scope.safeApply();
                });
            };

            vm.changeProvince = function (reset) {
                socketService.$socket($scope.AppSocket, 'getCityList', {provinceId: vm.currentProvince.province}, function (data) {
                    if (data) {
                        // vm.cityList = data.data.cities;
                        if (data.data.cities) {
                            vm.cityList.length = 0;
                            for (let i = 0, len = data.data.cities.length; i < len; i++) {
                                let city = data.data.cities[i];
                                city.id = city.id.toString();
                                vm.cityList.push(city);
                            }
                        }
                        if (reset) {
                            vm.currentCity.city = vm.cityList[0].id;
                            vm.changeCity(reset);
                            $scope.safeApply();
                        }
                    }
                }, null, true);
            }
            vm.changeCity = function (reset) {
                socketService.$socket($scope.AppSocket, 'getDistrictList', {
                    provinceId: vm.currentProvince.province,
                    cityId: vm.currentCity.city
                }, function (data) {
                    if (data) {
                        // vm.districtList = data.data.districts;
                        if (data.data.districts) {
                            vm.districtList.length = 0;
                            for (let i = 0, len = data.data.districts.length; i < len; i++) {
                                let district = data.data.districts[i];
                                district.id = district.id.toString();
                                vm.districtList.push(district);
                            }
                        }
                        if (reset && vm.districtList && vm.districtList[0]) {
                            // vm.currentDistrict.district = vm.districtList[0].id
                            vm.currentDistrict.district = ""
                        }
                        $scope.safeApply();
                    }
                }, null, true);
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

            vm.getPlayerContactHistory = function () {
                vm.playerContactHistoryCount = 0;
                let sendData = {
                    adminId: authService.adminId,
                    platformId: vm.selectedSinglePlayer.platform,
                    type: ["UpdatePlayerEmail", "UpdatePlayerPhone", "UpdatePlayerQQ", "UpdatePlayerWeChat"],
                    size: 2000,
                    // size: vm.queryProposal.limit || 10,
                    // index: newSearch ? 0 : (vm.queryProposal.index || 0),
                    // sortCol: vm.queryProposal.sortCol
                    status: vm.allProposalStatus,
                    playerId: vm.selectedSinglePlayer._id
                };

                socketService.$socket($scope.AppSocket, 'getQueryProposalsForAdminId', sendData, function (data) {
                    console.log('playercontact', data);

                    var drawData = data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        // item.fieldEdited = Object.keys(item.data.updateData)[0];
                        if (item.data.curData) {
                            item.contentBeforeEdited = item.data.curData[Object.keys(item.data.curData)[0]];
                        } else {
                            item.contentBeforeEdited = '';
                        }
                        if (item.data.updateData) {
                            item.fieldEdited = Object.keys(item.data.updateData)[0];
                            item.contentEdited = item.data.updateData[Object.keys(item.data.updateData)[0]];
                        }
                        return item;
                    })
                    vm.playerContactHistoryCount = data.data.data.length;
                    vm.drawPlayerContactHistory(drawData);
                }, null, true);
                $('#modalPlayerContactHistory').modal();
            }
            vm.drawPlayerContactHistory = function (tblData) {

                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('PROPOSAL_NO'), data: "proposalId"},
                        {title: $translate('CREATION TIME'), data: "createTime$"},
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
                        {title: $translate('CONTENT_CHANGED'), data: "fieldEdited"},
                        {title: $translate('curData'), data: "contentBeforeEdited"},
                        {title: $translate('updateData'), data: "contentEdited"},
                        {
                            "title": $translate('STATUS'),
                            "data": 'process',
                            render: function (data, type, row) {
                                let text = $translate(row.status ? row.status : (data.status ? data.status : 'UNKNOWN'));
                                text = text === "approved" ? "Approved" : text;

                                let textClass = '';
                                let fontStyle = {};
                                if (row.status === 'Pending') {
                                    textClass = "text-danger";
                                    fontStyle = {'font-weight': 'bold'};
                                }

                                let $link = $('<span>').text(text).addClass(textClass).css(fontStyle);
                                return $link.prop('outerHTML');
                            },
                        }
                    ],
                    "paging": true,
                });
                var aTable = $("#playerContactHistoryTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                $('#playerContactHistoryTbl').resize();
                $scope.safeApply();
            }

            vm.getPlayerInfoHistory = function () {
                vm.playerInfoHistoryCount = 0;
                $scope.$socketPromise('getProposalTypeByType', {
                    platformId: vm.selectedSinglePlayer.platform,
                    type: "UPDATE_PLAYER_INFO"
                })
                    .then(data => {

                        let sendData = {
                            type: data.data._id,
                            playerObjId: vm.selectedSinglePlayer._id,
                        };
                        socketService.$socket($scope.AppSocket, 'getProposalByPlayerIdAndType', sendData, function (data) {
                            console.log('playerInfo', data);
                            var drawData = data.data.map(item => {
                                item.createTime$ = vm.dateReformat(item.createTime);
                                item.playerLevel$ = item.data.newLevelName ? item.data.newLevelName : $translate('UNCHANGED');
                                item.realName$ = item.data.realName ? item.data.realName : $translate('UNCHANGED');
                                item.referralName$ = item.data.referralName ? item.data.referralName : $translate('UNCHANGED');
                                item.partnerName$ = item.data.partnerName ? item.data.partnerName : $translate('UNCHANGED');
                                item.DOB$ = item.data.DOB ? utilService.getFormatDate(item.data.DOB) : $translate('UNCHANGED');
                                item.gender$ = item.data.gender === undefined ? $translate('UNCHANGED') : item.data.gender ? $translate('Male') : $translate('Female');
                                item.updatePassword$ = item.data.updatePassword ? $translate('CHANGED') : $translate('UNCHANGED');
                                item.updateGamePassword$ = item.data.updateGamePassword ? $translate('CHANGED') : $translate('UNCHANGED');
                                return item;
                            })
                            vm.playerInfoHistoryCount = data.data.length;
                            vm.drawPlayerInfoHistory(drawData);
                        }, null, true);
                        $('#modalPlayerInfoHistory').modal();
                    })
            }

            vm.drawPlayerInfoHistory = function (tblData) {
                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    order: [[1, 'desc']],
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('PROPOSAL_NO'), data: "proposalId"},
                        {title: $translate('CREATION TIME'), data: "createTime$"},
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
                        // {title: $translate('REAL_NAME'), data: "data.realName"},
                        {title: $translate('REAL_NAME'), data: "realName$"},
                        {title: $translate('PLAYER_LEVEL'), data: "playerLevel$"},
                        {title: $translate('PARTNER'), data: "partnerName$"},
                        {title: $translate('REFERRAL'), data: "referralName$"},
                        {title: $translate('DOB'), data: "DOB$"},
                        {title: $translate('GENDER'), data: "gender$"},
                        {title: $translate('WEBSITE_PASS'), data: "updatePassword$"},
                        {title: $translate('GAME_PASS'), data: "updateGamePassword$"},
                        {
                            "title": $translate('STATUS'),
                            "data": 'process',
                            render: function (data, type, row) {
                                let text = $translate(row.status ? row.status : (data.status ? data.status : 'UNKNOWN'));
                                text = text === "approved" ? "Approved" : text;

                                let textClass = '';
                                let fontStyle = {};
                                if (row.status === 'Pending') {
                                    textClass = "text-danger";
                                    fontStyle = {'font-weight': 'bold'};
                                }

                                let $link = $('<span>').text(text).addClass(textClass).css(fontStyle);
                                return $link.prop('outerHTML');
                            },
                        }
                    ],
                    "paging": true,
                });
                var aTable = $("#playerInfoHistoryTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                $('#playerInfoHistoryTbl').resize();
                $scope.safeApply();
            }

            vm.getPaymentInfoHistory = function () {
                vm.paymetHistoryCount = 0;
                socketService.$socket($scope.AppSocket, 'getPaymentHistory', {
                    objectId: vm.isOneSelectedPartner()._id,
                    type: "PARTNERS"
                }, function (data) {
                    var drawData = data.data.map(item => {
                        item.province = item.provinceData || item.bankAccountProvince;
                        item.city = item.cityData || item.bankAccountCity;
                        item.district = item.districtData || item.bankAccountDistrict;
                        item.creatorName = item.creatorInfo.adminName || item.creatorInfo.name;
                        item.bankStr = vm.allBankTypeList[item.bankName] || item.bankName || $translate('Unknown');
                        item.createTime$ = vm.dateReformat(item.changeTime);
                        return item;
                    });
                    vm.paymetHistoryCount = data.data.length;
                    vm.drawPaymentHistory(drawData);

                }, null, true);
                $('#modalPartnerPaymentHistory').modal();
            }

            vm.drawPaymentHistory = function (tblData) {
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

                var aTable = $('#partnerPaymentHistoryTbl').DataTable(tableOptions);
                aTable.columns.adjust().draw();
                $('#partnerPaymentHistoryTbl').resize();
                $scope.safeApply();
            };

            vm.initPartnerMailLog = function () {
                vm.mailLogPartner = vm.mailLogPartner || {};
                vm.mailLogPartner.query = {};
                vm.mailLogPartner.receivedMails = [{}];
                vm.mailLogPartner.isAdmin = true;
                vm.mailLogPartner.isSystem = true;
                utilService.actionAfterLoaded('#messagePartnerModal.in #messageLogPartnerPanel #mailLogPartnerQuery .endTime', function () {
                    vm.mailLogPartner.startTime = utilService.createDatePicker('#messageLogPartnerPanel #mailLogPartnerQuery .startTime');
                    vm.mailLogPartner.endTime = utilService.createDatePicker('#messageLogPartnerPanel #mailLogPartnerQuery .endTime');
                    vm.mailLogPartner.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.mailLogPartner.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.searchPartnerMailLog();
                });
            };

            vm.searchPartnerMailLog = function () {
                let requestData = {
                    recipientId: vm.selectedSinglePartner._id,
                    startTime: vm.mailLogPartner.startTime.data('datetimepicker').getLocalDate() || new Date(0),
                    endTime: vm.mailLogPartner.endTime.data('datetimepicker').getLocalDate() || new Date()
                };
                if (!vm.mailLogPartner.isAdmin && vm.mailLogPartner.isSystem) {
                    requestData.senderType = 'System';
                } else if (vm.mailLogPartner.isAdmin && !vm.mailLogPartner.isSystem) {
                    requestData.senderType = 'admin';
                }
                $scope.$socketPromise('searchMailLog', requestData).then(result => {
                    console.log("result:", result);
                    vm.mailLogPartner.receivedMails = result.data;
                    $scope.safeApply();
                }).catch(console.error);
            };

            vm.initSMSLogPartner = function (type) {
                vm.smsLog = vm.smsLog || {index: 0, limit: 10};
                vm.smsLog.type = type;
                vm.smsLog.query = {};
                vm.smsLog.searchResults = [{}];
                vm.smsLog.query.status = "all";
                vm.smsLog.query.isAdmin = true;
                vm.smsLog.query.isSystem = false;
                let endTimeElementPath = '.modal.in #smsLogPartnerPanel #smsLogPartnerQuery .endTime';
                let tablePageId = "smsLogPartnerTablePage";
                if (type === "multi") {
                    endTimeElementPath = '#groupSmsLogQuery .endTime';
                    tablePageId = "groupSmsLogTablePage";
                }
                utilService.actionAfterLoaded(endTimeElementPath, function () {
                    vm.smsLog.query.startTime = utilService.createDatePicker('#smsLogPartnerPanel #smsLogPartnerQuery .startTime');
                    vm.smsLog.query.endTime = utilService.createDatePicker('#smsLogPartnerPanel #smsLogPartnerQuery .endTime');
                    if (type === "multi") {
                        vm.smsLog.query.startTime = utilService.createDatePicker('#groupSmsLogQuery .startTime');
                        vm.smsLog.query.endTime = utilService.createDatePicker('#groupSmsLogQuery .endTime');
                    }
                    vm.smsLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.smsLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.smsLog.pageObj = utilService.createPageForPagingTable(tablePageId, {}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "smsLog", vm.searchSMSLogPartner)
                    });
                    // Be user friendly: Fetch some results immediately!
                    vm.searchSMSLogPartner(true);
                });
            };

            vm.searchSMSLogPartner = function (newSearch) {
                let requestData = {
                    isAdmin: vm.smsLog.query.isAdmin,
                    isSystem: vm.smsLog.query.isSystem,
                    status: vm.smsLog.query.status,
                    startTime: vm.smsLog.query.startTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .startTime input').val() || undefined,
                    endTime: vm.smsLog.query.endTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .endTime   input').val() || undefined,
                    index: newSearch ? 0 : vm.smsLog.index,
                    limit: newSearch ? 10 : vm.smsLog.limit,
                };

                if (vm.smsLog.type === "partner") {
                    requestData.partnerId = vm.selectedSinglePartner.partnerId;
                }

                console.log("searchSMSLogPartner requestData:", requestData);
                $scope.$socketPromise('searchSMSLog', requestData).then(result => {
                    $scope.$evalAsync(() => {
                        console.log("searchSMSLogPartner result", result);
                        vm.smsLog.searchResults = result.data.data.map(item => {
                            item.createTime$ = vm.dateReformat(item.createTime);
                            if (item.status === "failure" && item.error && item.error.status === 430) {
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

            vm.constructProposalData = function (proposals) {
                let proposalData = [];

                proposals.map(item => {
                    let proposal = {
                        applyAmount: item.data.applyAmount ? item.data.applyAmount : 0,
                        rewardAmount: item.data.rewardAmount ? item.data.rewardAmount : 0,
                        //consumption
                        spendingAmount: item.data.spendingAmount ? item.data.spendingAmount : 0
                    }
                    proposalData.push(proposal);
                })
                return proposalData;
            }

            vm.isDiffConsumptionProvider = function (providerArr, showModal) {
                let isDiff = false;
                let providerSourceArr;
                if (providerArr) {
                    providerSourceArr = providerArr.sort();
                } else {
                    providerSourceArr = vm.allPlayerLvl[0].levelUpConfig[0].consumptionSourceProviderId.sort();
                }

                for (let i = 0; i < vm.allPlayerLvl.length; i++) {
                    for (let j = 0; j < vm.allPlayerLvl[i].levelUpConfig.length; j++) {
                        let providerSourceCompare = [];
                        if (vm.allPlayerLvl[i].levelUpConfig[j].consumptionSourceProviderId) {
                            providerSourceCompare = vm.allPlayerLvl[i].levelUpConfig[j].consumptionSourceProviderId.sort();
                        }
                        if (JSON.stringify(providerSourceArr) != JSON.stringify(providerSourceCompare)) {
                            isDiff = true;
                            break;
                        }
                    }
                    if (isDiff) {
                        break;
                    }
                }

                if (showModal && isDiff && !vm.autoCheckPlayerLevelUp) {
                    vm.autoCheckPlayerLevelUp = true;
                    $("#modalLevelUpProvider").modal('show');
                    $("#modalLevelUpProvider").on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })
                }

                return isDiff;
            }


            vm.diffLevelUpPeriod = function (childPeriod) {
                if (vm.allPlayerLevelUpPeriod[childPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod && !vm.autoCheckPlayerLevelUp) {
                    vm.autoCheckPlayerLevelUp = true;
                    $("#modalLevelUpPeriod").modal('show');
                    $("#modalLevelUpPeriod").on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })
                }
            }

            vm.isAutoCheckLevelUpChangeble = function () {
                let isEditable = true;
                for (let i = 0; i < Object.keys(vm.playerLvlData).length; i++) {
                    let levelUpConfig = vm.playerLvlData[Object.keys(vm.playerLvlData)[i]].levelUpConfig;
                    for (let j = 0; j < levelUpConfig.length; j++) {
                        if (vm.allPlayerLevelUpPeriod[levelUpConfig[j].topupPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod
                            || vm.allPlayerLevelUpPeriod[levelUpConfig[j].consumptionPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod) {
                            isEditable = false;
                            break;
                        }
                    }
                    if (isEditable == false) {
                        break;
                    }
                }
                return isEditable;
            }
            vm.autoCheckLevelUpPopUp = function () {
                if (!vm.isAutoCheckLevelUpChangeble()) {
                    vm.autoCheckPlayerLevelUp = true;
                    $("#modalLevelUpPeriod").modal('show');
                    $("#modalLevelUpPeriod").on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })
                } else {
                    vm.isDiffConsumptionProvider(null, true);
                }
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
                    if (!vm.correctVerifyPhoneNumber) {
                        vm.correctVerifyPhoneNumber = {str: ""};
                    }
                    $scope.emailConfirmation = null;
                    $scope.qqConfirmation = null;
                    $scope.weChatConfirmation = null;
                    if (!vm.modifyCritical) {
                        vm.modifyCritical = {
                            which: 'player',
                            title: $translate('MODIFY_PLAYER') + ' ' + vm.selectedSinglePlayer.name,
                            changeType: 'email',
                            curEmail: vm.selectedSinglePlayer.email,
                            curQQ: vm.selectedSinglePlayer.qq,
                            curWeChat: vm.selectedSinglePlayer.wechat,
                            phoneNumber: vm.selectedSinglePlayer.phoneNumber ? (vm.selectedSinglePlayer.phoneNumber.substring(0, 3) + "******" + vm.selectedSinglePlayer.phoneNumber.slice(-4)) : '',
                        }
                    } else {
                        vm.modifyCritical.which = 'player';
                        vm.modifyCritical.title = $translate('MODIFY_PLAYER') + ' ' + vm.selectedSinglePlayer.name;
                        vm.modifyCritical.changeType = 'email';
                        vm.modifyCritical.curEmail = vm.selectedSinglePlayer.email;
                        vm.modifyCritical.curQQ = vm.selectedSinglePlayer.qq;
                        vm.modifyCritical.curWeChat = vm.selectedSinglePlayer.wechat;
                        vm.modifyCritical.phoneNumber = vm.selectedSinglePlayer.phoneNumber ? (vm.selectedSinglePlayer.phoneNumber.substring(0, 3) + "******" + vm.selectedSinglePlayer.phoneNumber.slice(-4)) : '';

                    }
                } else if (which == 'partner') {
                    $scope.emailConfirmation = null;
                    $scope.qqConfirmation = null;
                    $scope.weChatConfirmation = null;
                    if (!vm.modifyCritical) {
                        vm.modifyCritical = {
                            which: 'partner',
                            title: $translate('MODIFY_PARTNER') + ' ' + vm.selectedSinglePartner.partnerName,
                            changeType: 'email',
                            curEmail: vm.selectedSinglePartner.email,
                            curQQ: vm.selectedSinglePartner.qq,
                            curWeChat: vm.selectedSinglePartner.wechat,
                            phoneNumber: vm.selectedSinglePartner.phoneNumber,
                        }
                    } else {
                        vm.modifyCritical.which = 'partner';
                        vm.modifyCritical.title = $translate('MODIFY_PARTNER') + ' ' + vm.selectedSinglePartner.partnerName;
                        vm.modifyCritical.changeType = 'email';
                        vm.modifyCritical.curEmail = vm.selectedSinglePartner.email;
                        vm.modifyCritical.curQQ = vm.selectedSinglePartner.qq;
                        vm.modifyCritical.curWeChat = vm.selectedSinglePartner.wechat;
                        vm.modifyCritical.phoneNumber = vm.selectedSinglePartner.phoneNumber;
                    }

                    delete vm.modifyCritical.correctVerifyPhoneNumber;
                    delete vm.modifyCritical.verifyPhoneNumber;
                }
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
                } else if (vm.modifyCritical.changeType == 'qq') {
                    sendStringKey += 2;
                    sendData.data.curData = {
                        qq: vm.modifyCritical.curQQ
                    }
                    sendData.data.updateData = {
                        qq: vm.modifyCritical.newQQ
                    }
                } else if (vm.modifyCritical.changeType == 'weChat') {
                    sendStringKey += 3;
                    sendData.data.curData = {
                        wechat: vm.modifyCritical.curWeChat
                    }
                    sendData.data.updateData = {
                        wechat: vm.modifyCritical.newWeChat
                    }
                }

                switch (sendStringKey) {
                    case 10:
                        sendString = 'createUpdatePlayerPhoneProposal';
                        break;
                    case 11:
                        sendString = 'createUpdatePlayerEmailProposal';
                        break;
                    case 12:
                        sendString = 'createUpdatePlayerQQProposal';
                        break;
                    case 13:
                        sendString = 'createUpdatePlayerWeChatProposal';
                        break;
                    case 20:
                        sendString = 'createUpdatePartnerPhoneProposal';
                        break;
                    case 21:
                        sendString = 'createUpdatePartnerEmailProposal';
                        break;
                    case 22:
                        sendString = 'createUpdatePartnerQQProposal';
                        break;
                    case 23:
                        sendString = 'createUpdatePartnerWeChatProposal';
                        break;

                }
                console.log(sendData, 'sendData', sendString);
                socketService.$socket($scope.AppSocket, sendString, sendData, function (data) {
                    console.log("func inside");
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

            vm.testSound = function (soundPath) {
                let soundUrl = "sound/notification/" + soundPath;
                let sound = new Audio(soundUrl);
                sound.play();
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
                    } else if (newObj[key] instanceof Date) {
                        let newValue = new Date(newObj[key]);
                        let oldValue = new Date(oldObj[key]);
                        if (newValue.getTime() !== oldValue.getTime()) {
                            changes[key] = newObj[key];
                        }
                    } else if (JSON.stringify(newObj[key]) !== JSON.stringify(oldObj[key]) && newObj[key] != oldObj[key]) {
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

            vm.updatePlayerForbidProviders = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updatePlayerForbidProviders', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateForbidGameLog(data.data._id, vm.findForbidCheckedName(data.data.forbidProviders, vm.allGameProviders));
                });
            };

            vm.updateBatchPlayerForbidProviders = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updateBatchPlayerForbidProviders', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateBatchForbidGameLog(data);
                });
            };

            vm.updatePlayerForbidRewardPointsEvent = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updatePlayerForbidRewardPointsEvent', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateForbidRewardPointsEventLog(data.data._id, vm.findForbidCheckedTitle(data.data.forbidRewardPointsEvent, vm.rewardPointsAllEvent));
                });
            };

            vm.updateBatchPlayerForbidRewardPointsEvent = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updateBatchPlayerForbidRewardPointsEvent', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateBatchForbidRewardPointsEventLog(data);
                });
            };

            vm.updatePlayerForbidRewardEvents = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updatePlayerForbidRewardEvents', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateForbidRewardLog(data.data._id, vm.findForbidCheckedName(data.data.forbidRewardEvents, vm.allRewardEvent), data.data);
                });
            };
            vm.updateBatchPlayerForbidRewardEvents = function (sendData) {
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'updateBatchPlayerForbidRewardEvents', sendData, function (data) {
                    vm.getPlatformPlayersData();
                    vm.updateBatchForbidRewardLog(data);
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

            vm.getPlatformRewardProposal = function () {
                if (!authService.checkViewPermission('Player', 'Reward', 'RewardHistory')) {
                    return;
                }
                socketService.$socket($scope.AppSocket, 'getPlatformRewardProposal', {platform: vm.selectedPlatform.id}, function (data) {
                    vm.platformRewardtype = data.data || [];
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
                        commonPageChangeHandler(curP, pageSize, "playerRewardHistory", vm.getPlayerRewardHistoryRecord)
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
                        commonPageChangeHandler(curP, pageSize, "playerBonusHistory", vm.getPlayerBonusHistoryRecord)
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
                    bonusId: 1
                };
            }

            vm.initPlayerCreditLog = function () {
                vm.playerCreditLog = vm.playerCreditLog || {totalCount: 0, limit: 50, index: 0, query: {}};
                // utilService.actionAfterLoaded('#modalPlayerCreditLog.in #playerCreditLogQuery .endTime', function () {
                utilService.actionAfterLoaded('#modalPlayerAccountingDetail #playerCreditLogQuery .endTime', function () {
                    vm.playerCreditLog.query.startTime = utilService.createDatePicker('#playerCreditLogQuery .startTime');
                    vm.playerCreditLog.query.endTime = utilService.createDatePicker('#playerCreditLogQuery .endTime');
                    vm.playerCreditLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.playerCreditLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.playerCreditLog.pageObj = utilService.createPageForPagingTable("#playerCreditLogTblPage", {pageSize: 50}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "playerCreditLog", vm.getPlayerCreditLogData)
                    });
                    vm.getPlayerCreditLogData(true);
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
                vm.playerApiLog.apiAction = "";
                utilService.actionAfterLoaded('#modalPlayerApiLog.in #playerApiLogQuery .endTime', function () {
                    vm.playerApiLog.startDate = utilService.createDatePicker('#playerApiLogQuery .startTime');
                    vm.playerApiLog.endDate = utilService.createDatePicker('#playerApiLogQuery .endTime');
                    vm.playerApiLog.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.playerApiLog.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.playerApiLog.pageObj = utilService.createPageForPagingTable("#playerApiLogTblPage", {}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "playerApiLog", vm.getPlayerApiLogData);
                    });
                    vm.getPlayerApiLogData(true);
                });
            };

            vm.getPlayerApiLogData = function (newSearch) {
                if (!authService.checkViewPermission('Player', 'Player', 'playerApiLog')) {
                    return;
                }

                let sendQuery = {
                    platform: vm.selectedPlatform.id,
                    playerObjId: vm.selectedSinglePlayer && vm.selectedSinglePlayer._id || "",
                    playerName: vm.playerApiLog.playerName || "",
                    startDate: vm.playerApiLog.startDate.data('datetimepicker').getLocalDate(),
                    endDate: vm.playerApiLog.endDate.data('datetimepicker').getLocalDate(),
                    ipAddress: vm.playerApiLog.ipAddress,
                    index: newSearch ? 0 : vm.playerApiLog.index,
                    limit: newSearch ? 10 : vm.playerApiLog.limit,
                    sortCol: vm.playerApiLog.sortCol || null
                };

                if (vm.playerApiLog.apiAction) {
                    sendQuery.action = vm.playerApiLog.apiAction;
                }
                socketService.$socket($scope.AppSocket, 'getPlayerActionLog', sendQuery, function (data) {
                    console.log("getPlayerApiLog", data);
                    let tblData = data && data.data ? data.data.data.map(item => {
                        item.operationTime$ = vm.dateReformat(item.operationTime);

                        if(item.providerId && item.providerId.name){
                            item.action$ = $translate(item.action) + item.providerId.name;
                        }else{
                            item.action$ = $translate("Login to main site");
                        }

                        if(item.player && item.player.name){
                            item.playerName = item.player.name;
                        }

                        item.os = item.userAgent[0] && item.userAgent[0].os ? item.userAgent[0].os : "";
                        item.browser = item.userAgent[0] && item.userAgent[0].browser ? item.userAgent[0].browser : "";
                        item.ipArea$ = item.ipArea && item.ipArea.province && item.ipArea.city ? item.ipArea.province + "," + item.ipArea.city : "";
                        if(item.domain){
                            var filteredDomain = item.domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
                            let indexNo = filteredDomain.indexOf("/")
                            if (indexNo != -1) {
                                filteredDomain = filteredDomain.substring(0,indexNo);
                            }
                            item.domain$ = filteredDomain;
                        }
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
                        {title: $translate('PLAYER_NAME'), data: "playerName"},
                        {title: $translate('Operation Time'), data: "operationTime$"},
                        {
                            title: $translate('DEVICE'),
                            data: "inputDevice",
                            render: function (data, type, row) {
                                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data) {
                                        return $translate(Object.keys(vm.inputDevice)[i]);
                                    }
                                }
                            }
                        },
                        {title: $translate('IP_ADDRESS'), data: "ipAddress"},
                        {title: $translate('IP_AREA'), data: "ipArea$"},
                        {title: $translate('OS'), data: "os"},
                        {title: $translate('Browser'), data: "browser"},
                        {title: $translate('Domain Name'), data: "domain$"}
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

            vm.initPlayerRewardPointLog = () => {
                vm.playerRewardPointsLog = {};
                utilService.actionAfterLoaded('#modalPlayerRewardPointsLog.in #playerRewardPointsLogTblPage', function () {
                    vm.playerRewardPointsLog.pageObj = utilService.createPageForPagingTable("#playerRewardPointsLogTblPage", {}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "playerRewardPointsLog", vm.getPlayerRewardPointsLogData);
                    });
                    vm.getPlayerRewardPointsLogData(true);
                });
            };

            vm.getPlayerRewardPointsLogData = function (newSearch) {

                let sendQuery = {
                    playerName: vm.selectedSinglePlayer.name,
                    index: newSearch ? 0 : vm.playerRewardPointsLog.index,
                    limit: newSearch ? 10 : vm.playerRewardPointsLog.limit,
                    sortCol: vm.playerRewardPointsLog.sortCol || null
                };

                socketService.$socket($scope.AppSocket, 'getPlayerRewardPointsLog', sendQuery, function (data) {
                    console.log("getPlayerRewardPointsLog", data);
                    let tblData = data && data.data ? data.data.data : [];
                    let total = data.data ? data.data.total : 0;
                    vm.playerRewardPointsLog.totalCount = total;
                    vm.drawPlayerRewardPointsLogTable(newSearch, tblData, total);
                });
            };

            vm.drawPlayerRewardPointsLogTable = function (newSearch, tblData, size) {
                let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('Reward Point ID'), data: "pointLogId"},
                        {title: $translate('Proposal Creator'), data: "creator"},
                        {
                            title: $translate('Reward Points Type'), data: "category",
                            render: function (data, type, row) {
                                return $translate($scope.constRewardPointsLogCategory[row.category]);
                            }
                        },
                        {
                            title: $translate('Reward Title'), data: "rewardTitle",
                            render: function (data, type, row) {
                                return row.rewardTitle ? row.rewardTitle : "-";
                            }
                        },
                        {
                            title: $translate('userAgent'), data: "userAgent",
                            render: function (data, type, row) {
                                return $translate($scope.constPlayerRegistrationInterface[row.userAgent]);
                            }
                        },
                        {
                            title: $translate('Proposal Status'), data: "status",
                            render: function (data, type, row) {
                                return $translate($scope.constRewardPointsLogStatus[row.status]);
                            }
                        },
                        {title: $translate('Member Account'), data: "playerName"},
                        {title: $translate('beforeChangeRewardPoint'), data: "oldPoints"},
                        {title: $translate('afterChangeRewardPoint'), data: "newPoints"},
                        {title: $translate('Reward Point Variable'), data: "amount", bSortable: true},
                        {
                            title: $translate('dailyMaxRewardPoint'), data: "maxDayApplyAmount",
                            render: function (data, type, row) {
                                return row.currentDayAppliedAmount != null && row.maxDayApplyAmount ? row.currentDayAppliedAmount + "/" + row.maxDayApplyAmount : "-";
                            }
                        },
                        {
                            title: $translate('createTime'), data: "createTime", bSortable: true,
                            render: function (data, type, row) {
                                return utilService.getFormatTime(data);
                            }
                        },
                        {
                            title: $translate('playerLevelName'), data: "playerLevelName",
                            render: function (data, type, row) {
                                return $translate(row.playerLevelName);
                            }
                        },
                        {
                            title: $translate('remark'), data: "remark",
                            render: function (data, type, row) {
                                return row.remark.replace('Proposal No', $translate('Proposal No'));
                            }
                        },
                        {
                            title: $translate('detail'),
                            render: function (data, type, row) {
                                var $a = $('<a>', {
                                    'ng-click': "vm.prepareShowRewardPointsLogDetail(" + JSON.stringify(row) + ")"
                                }).text($translate('detail'));
                                // $compile($a.prop('outerHTML'))($scope);
                                return $a.prop('outerHTML');
                            },
                            "fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
                                $compile(nTd)($scope)
                            }
                        },
                    ],
                    "paging": false,
                });
                let aTable = $("#playerRewardPointsLogTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                vm.playerRewardPointsLog.pageObj.init({maxCount: size}, newSearch);
                $('#playerRewardPointsLogTbl').resize();
                $('#playerRewardPointsLogTbl').off('order.dt');
                $('#playerRewardPointsLogTbl').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'playerRewardPointsLogTbl', vm.getPlayerRewardPointsLogData);
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
                vm.chosenBankAcc = {};
                socketService.$socket($scope.AppSocket, 'getManualTopupRequestList', {playerId: vm.selectedSinglePlayer.playerId}, function (data) {
                    vm.existingManualTopup = data.data ? data.data : false;
                    $scope.safeApply();
                });
                // utilService.actionAfterLoaded('#modalPlayerManualTopUp', function () {
                //     vm.playerManualTopUp.createTime = utilService.createDatePicker('#modalPlayerManualTopUp .createTime');
                utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                    vm.playerManualTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_manual_topup"] .createTime');
                    vm.playerManualTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
                });
                vm.refreshSPicker();
                $scope.safeApply();
            };

            // Player alipay topup
            vm.initPlayerAlipayTopUp = function () {
                vm.playerAlipayTopUp = {submitted: false};
                vm.existingAlipayTopup = null;
                commonService.resetDropDown('#alipayOption');

                socketService.$socket($scope.AppSocket, 'getAlipayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                    data => {
                        vm.existingAlipayTopup = data.data ? data.data : false;
                        $scope.safeApply();
                    });
                vm.alipaysAcc = '';

                // utilService.actionAfterLoaded('#modalPlayerAlipayTopUp', function () {
                //     vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerAlipayTopUp .createTime');
                utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                    vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_alipay_topup"] .createTime');
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
                        vm.getPlatformPlayersData();
                        $scope.safeApply();
                    },
                    error => {
                        vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                        // socketService.showErrorMessage(error.error.errorMessage);
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
                vm.playerWechatPayTopUp = {submitted: false, notUseQR: "true"};
                vm.existingWechatPayTopup = null;
                commonService.resetDropDown('#wechatpayOption');

                socketService.$socket($scope.AppSocket, 'getWechatPayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                    data => {
                        vm.existingWechatPayTopup = data.data ? data.data : false;
                        $scope.safeApply();
                    });
                vm.wechatpaysAcc = '';

                // utilService.actionAfterLoaded('#modalPlayerWechatPayTopUp', function () {
                //     vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerWechatPayTopUp .createTime');
                utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                    vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_wechatPay_topup"] .createTime');
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
                        vm.getPlatformPlayersData();
                        $scope.safeApply();
                    },
                    error => {
                        vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                        // socketService.showErrorMessage(error.error.errorMessage);
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
                    $scope.$evalAsync(() => {
                        vm.clearPlayerProposalLimit.resMsg = $translate("Success");
                    })
                }, function (err) {
                    $scope.$evalAsync(() => {
                        vm.clearPlayerProposalLimit.resMsg = err.error.errorMsg;
                    })
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
                    topUpTimes: "-1",
                    isNewSystem: ""
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
            };

            vm.setLastAccessTimeRange = function () {
                switch (vm.playerLastLoginRange) {
                    case '1_week':
                        vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 13)));
                        vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 6)));
                        vm.clearDatePicker("#lastFeedbackTime1");
                        vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 6)));
                        break;
                    case '2_week':
                        vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 29)));
                        vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 13)));
                        vm.clearDatePicker("#lastFeedbackTime1");
                        vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 13)));
                        break;
                    case '1_month':
                        vm.playerFeedbackQuery.lastAccessTime1.data('datetimepicker').setDate(new Date(1970, 1, 1));
                        vm.playerFeedbackQuery.lastAccessTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 29)));
                        vm.clearDatePicker("#lastFeedbackTime1");
                        vm.playerFeedbackQuery.lastFeedbackTime2.data('datetimepicker').setDate(utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), 29)));
                        break;
                    default:
                }
                $scope.safeApply();
            };

            vm.exportPlayerQuery = function () {
                // vm.exportQuery
                vm.exportPlayerSetting = {};
                $('#modalExportSetting').modal().show();
            }

            vm.showExportButton = function () {
                return (!(vm.feedbackPlayersPara && vm.feedbackPlayersPara.total)|| vm.feedbackPlayersPara.total <= 0);
            }

            vm.createExportPlayerProposal = function () {
                let chosenPlatform = JSON.parse(vm.exportPlayerSetting.platform);
                let playerName = "";
                let credibilityRemarkName = [];
                let gameProviderName = [];
                for (let i = 0; i < vm.allPlayerLvl.length; i++) {
                    if (vm.allPlayerLvl[i] && vm.allPlayerLvl[i].name && vm.allPlayerLvl[i]._id.toString() == vm.exportPlayerFilter.playerLevel.toString()) {
                        playerName = vm.allPlayerLvl[i].name;
                        break;
                    }
                }
                if (vm.exportPlayerFilter.credibilityRemarks.length) {
                    for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                        for (let k = 0; k < vm.exportPlayerFilter.credibilityRemarks.length; k++) {
                            if (vm.credibilityRemarks[j]._id && vm.credibilityRemarks[j]._id.toString() == vm.exportPlayerFilter.credibilityRemarks[k].toString()) {
                                credibilityRemarkName.push(vm.credibilityRemarks[j].name);
                            }
                        }
                    }
                }
                if (vm.exportPlayerFilter.gameProviderId.length) {
                    for (let j = 0; j < vm.allGameProviders.length; j++) {
                        for (let k = 0; k < vm.exportPlayerFilter.gameProviderId.length; k++) {
                            if (vm.allGameProviders[j]._id && vm.allGameProviders[j]._id.toString() == vm.exportPlayerFilter.gameProviderId[k].toString()) {
                                gameProviderName.push(vm.allGameProviders[j].name);
                            }
                        }
                    }
                }

                let sendQuery = {
                    title: vm.exportPlayerSetting.title,
                    playerType: vm.exportPlayerFilter.playerType,
                    playerLevelObjId: vm.exportPlayerFilter.playerLevel,
                    playerLevelName: playerName,
                    credibilityRemarkObjIdArray: vm.exportPlayerFilter.credibilityRemarks,
                    credibilityRemarkNameArray: credibilityRemarkName,
                    lastAccessTimeFrom: vm.exportQuery.lastAccessTime.$gte,
                    lastAccessTimeTo: vm.exportQuery.lastAccessTime.$lte || vm.exportQuery.lastAccessTime.$lt ,
                    lastAccessTimeRangeString: vm.exportPlayerFilter.lastAccess,
                    lastFeedbackTimeBefore: vm.exportPlayerFilter.filterFeedback,
                    depositCountOperator: vm.exportPlayerFilter.depositCountOperator,
                    depositCountFormal: vm.exportPlayerFilter.depositCountFormal,
                    depositCountLater: vm.exportPlayerFilter.depositCountLater,
                    bonusAmountOperator: vm.exportPlayerFilter.bonusAmountOperator,
                    bonusAmountFormal: vm.exportPlayerFilter.bonusAmountFormal,
                    bonusAmountLater: vm.exportPlayerFilter.bonusAmountLatter,
                    playerValueOperator: vm.exportPlayerFilter.playerValueOperator,
                    playerValueFormal: vm.exportPlayerFilter.playerValueFormal,
                    playerValueLater: vm.exportPlayerFilter.playerValueLatter,
                    consumptionTimesOperator: vm.exportPlayerFilter.consumptionTimesOperator,
                    consumptionTimesFormal: vm.exportPlayerFilter.consumptionTimesFormal,
                    consumptionTimesLater: vm.exportPlayerFilter.consumptionTimesLatter,
                    withdrawalTimesOperator: vm.exportPlayerFilter.withdrawTimesOperator,
                    withdrawalTimesFormal: vm.exportPlayerFilter.withdrawTimesFormal,
                    withdrawalTimesLater: vm.exportPlayerFilter.withdrawTimesLatter,
                    topUpSumOperator: vm.exportPlayerFilter.topUpSumOperator,
                    topUpSumFormal: vm.exportPlayerFilter.topUpSumFormal,
                    topUpSumLater: vm.exportPlayerFilter.topUpSumLatter,
                    gameProviderIdArray: vm.exportPlayerFilter.gameProviderId,
                    gameProviderNameArray: gameProviderName,
                    isNewSystem: vm.exportPlayerFilter.isNewSystem,
                    registrationTimeFrom: vm.exportQuery.registrationTime.$gte,
                    registrationTimeTo: vm.exportQuery.registrationTime.$lte || vm.exportQuery.registrationTime.$lt,
                    platformObjId: vm.selectedPlatform.data._id,
                    adminInfo: {
                        type: "admin",
                        name: authService.adminName,
                        id: authService.adminId
                    },
                    targetExportPlatformObjId: chosenPlatform._id,
                    targetExportPlatformName: chosenPlatform.name,
                    expirationTime: new Date(new Date().setMinutes(new Date().getMinutes() + (vm.exportPlayerSetting.expirationMins || 60))),
                    dataCount: vm.feedbackPlayersPara.total || 0
                }

                socketService.$socket($scope.AppSocket, 'createExportPlayerProposal',sendQuery
                    , function (data) {
                        socketService.showConfirmMessage("Success");
                    }, function (err){
                        socketService.showErrorMessage(err);
                    });
            }

            vm.getPlayerFeedbackQuery = () => {
                let startTime = $('#registerStartTimePicker').data('datetimepicker').getLocalDate();
                let endTime = $('#registerEndTimePicker').data('datetimepicker').getLocalDate();
                let sendQuery = {platform: vm.selectedPlatform.id};
                let sendQueryOr = [];

                if (vm.playerFeedbackQuery.playerType && vm.playerFeedbackQuery.playerType != null) {
                    sendQuery.playerType = vm.playerFeedbackQuery.playerType;
                }

                if (vm.playerFeedbackQuery.playerLevel !== "all") {
                    sendQuery.playerLevel = vm.playerFeedbackQuery.playerLevel;
                }

                if (vm.playerFeedbackQuery.credibilityRemarks && vm.playerFeedbackQuery.credibilityRemarks.length > 0) {
                    sendQuery.credibilityRemarks = {$in: vm.playerFeedbackQuery.credibilityRemarks};
                }

                if (vm.playerFeedbackQuery.lastAccess === "range") {
                    sendQuery.lastAccessTime = {
                        $lt: utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), vm.playerFeedbackQuery.lastAccessFormal)),
                        $gte: utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), vm.playerFeedbackQuery.lastAccessLatter)),
                    };
                } else {
                    let range = vm.playerFeedbackQuery.lastAccess.split("-");
                    sendQuery.lastAccessTime = {
                        $lt: utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), parseInt(range[0])))
                    };
                    if (range[1]) {
                        sendQuery.lastAccessTime["$gte"] = utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), parseInt(range[1])));
                    }
                }

                if (vm.playerFeedbackQuery.filterFeedback) {
                    let lastFeedbackTimeExist = {
                        lastFeedbackTime: null
                    };
                    let lastFeedbackTime = {
                        lastFeedbackTime: {
                            $lt: utilService.setLocalDayEndTime(utilService.setNDaysAgo(new Date(), vm.playerFeedbackQuery.filterFeedback))
                        }
                    };
                    sendQueryOr.push(lastFeedbackTimeExist);
                    sendQueryOr.push(lastFeedbackTime);
                    sendQuery["$or"] = sendQueryOr;
                }

                if (vm.playerFeedbackQuery.depositCountOperator && vm.playerFeedbackQuery.depositCountFormal != null) {
                    switch (vm.playerFeedbackQuery.depositCountOperator) {
                        case ">=":
                            sendQuery.topUpTimes = {
                                $gte: vm.playerFeedbackQuery.depositCountFormal
                            };
                            break;
                        case "=":
                            sendQuery.topUpTimes = vm.playerFeedbackQuery.depositCountFormal;
                            break;
                        case "<=":
                            sendQuery.topUpTimes = {
                                $lte: vm.playerFeedbackQuery.depositCountFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.depositCountLatter != null) {
                                sendQuery.topUpTimes = {
                                    $lte: vm.playerFeedbackQuery.depositCountLatter,
                                    $gte: vm.playerFeedbackQuery.depositCountFormal
                                };
                            }
                            break;
                    }
                }


                if (vm.playerFeedbackQuery.playerValueOperator && vm.playerFeedbackQuery.playerValueFormal != null) {
                    switch (vm.playerFeedbackQuery.playerValueOperator) {
                        case ">=":
                            sendQuery.valueScore = {
                                $gte: vm.playerFeedbackQuery.playerValueFormal
                            };
                            break;
                        case "=":
                            sendQuery.valueScore = vm.playerFeedbackQuery.playerValueFormal;
                            break;
                        case "<=":
                            sendQuery.valueScore = {
                                $lte: vm.playerFeedbackQuery.playerValueFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.playerValueLatter != null) {
                                sendQuery.valueScore = {
                                    $lte: vm.playerFeedbackQuery.playerValueLatter,
                                    $gte: vm.playerFeedbackQuery.playerValueFormal
                                };
                            }
                            break;
                    }
                }

                if (vm.playerFeedbackQuery.consumptionTimesOperator && vm.playerFeedbackQuery.consumptionTimesFormal != null) {
                    switch (vm.playerFeedbackQuery.consumptionTimesOperator) {
                        case ">=":
                            sendQuery.consumptionTimes = {
                                $gte: vm.playerFeedbackQuery.consumptionTimesFormal
                            };
                            break;
                        case "=":
                            sendQuery.consumptionTimes = vm.playerFeedbackQuery.consumptionTimesFormal;
                            break;
                        case "<=":
                            sendQuery.consumptionTimes = {
                                $lte: vm.playerFeedbackQuery.consumptionTimesFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.consumptionTimesLatter != null) {
                                sendQuery.consumptionTimes = {
                                    $lte: vm.playerFeedbackQuery.consumptionTimesLatter,
                                    $gte: vm.playerFeedbackQuery.consumptionTimesFormal
                                };
                            }
                            break;
                    }
                }

                if (vm.playerFeedbackQuery.bonusAmountOperator && vm.playerFeedbackQuery.bonusAmountFormal != null) {
                    switch (vm.playerFeedbackQuery.bonusAmountOperator) {
                        case ">=":
                            sendQuery.bonusAmountSum = {
                                $gte: vm.playerFeedbackQuery.bonusAmountFormal
                            };
                            break;
                        case "=":
                            sendQuery.bonusAmountSum = vm.playerFeedbackQuery.bonusAmountFormal;
                            break;
                        case "<=":
                            sendQuery.bonusAmountSum = {
                                $lte: vm.playerFeedbackQuery.bonusAmountFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.bonusAmountLatter != null) {
                                sendQuery.bonusAmountSum = {
                                    $lte: vm.playerFeedbackQuery.bonusAmountLatter,
                                    $gte: vm.playerFeedbackQuery.bonusAmountFormal
                                };
                            }
                            break;
                    }
                }

                if (vm.playerFeedbackQuery.withdrawTimesOperator && vm.playerFeedbackQuery.withdrawTimesFormal != null) {
                    switch (vm.playerFeedbackQuery.withdrawTimesOperator) {
                        case ">=":
                            sendQuery.withdrawTimes = {
                                $gte: vm.playerFeedbackQuery.withdrawTimesFormal
                            };
                            break;
                        case "=":
                            sendQuery.withdrawTimes = vm.playerFeedbackQuery.withdrawTimesFormal;
                            break;
                        case "<=":
                            sendQuery.withdrawTimes = {
                                $lte: vm.playerFeedbackQuery.withdrawTimesFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.withdrawTimesLatter != null) {
                                sendQuery.withdrawTimes = {
                                    $lte: vm.playerFeedbackQuery.withdrawTimesLatter,
                                    $gte: vm.playerFeedbackQuery.withdrawTimesFormal
                                };
                            }
                            break;
                    }
                }

                if (vm.playerFeedbackQuery.topUpSumOperator && vm.playerFeedbackQuery.topUpSumFormal != null) {
                    switch (vm.playerFeedbackQuery.topUpSumOperator) {
                        case ">=":
                            sendQuery.topUpSum = {
                                $gte: vm.playerFeedbackQuery.topUpSumFormal
                            };
                            break;
                        case "=":
                            sendQuery.topUpSum = vm.playerFeedbackQuery.topUpSumFormal;
                            break;
                        case "<=":
                            sendQuery.topUpSum = {
                                $lte: vm.playerFeedbackQuery.topUpSumFormal
                            };
                            break;
                        case "range":
                            if (vm.playerFeedbackQuery.topUpSumLatter != null) {
                                sendQuery.topUpSum = {
                                    $lte: vm.playerFeedbackQuery.topUpSumLatter,
                                    $gte: vm.playerFeedbackQuery.topUpSumFormal
                                };
                            }
                            break;
                    }
                }

                if (vm.playerFeedbackQuery.gameProviderId && vm.playerFeedbackQuery.gameProviderId.length > 0) {
                    sendQuery.gameProviderPlayed = {$in: vm.playerFeedbackQuery.gameProviderId};
                }

                if (vm.playerFeedbackQuery.isNewSystem === "old") {
                    sendQuery.isNewSystem = {$ne: true};
                } else if (vm.playerFeedbackQuery.isNewSystem === "new") {
                    sendQuery.isNewSystem = true;
                }
                if (startTime && endTime) {
                    sendQuery.registrationTime = {$gte: startTime, $lt: endTime};
                }

                let admins = [];

                if (vm.playerFeedbackQuery.departments) {
                    if (vm.playerFeedbackQuery.roles) {
                        vm.queryRoles.map(e => {
                            if (vm.playerFeedbackQuery.roles.indexOf(e._id) >= 0) {
                                e.users.map(f => admins.push(f._id))
                            }
                        })
                    } else {
                        vm.queryRoles.map(e => e.users.map(f => admins.push(f._id)))
                    }
                }

                if ( (vm.playerFeedbackQuery.admins && vm.playerFeedbackQuery.admins.length > 0) || admins.length) {
                    sendQuery.csOfficer = vm.playerFeedbackQuery.admins && vm.playerFeedbackQuery.admins.length > 0 ? vm.playerFeedbackQuery.admins : admins;
                }

                return sendQuery;
            };

            vm.getCallOutMissionPlayerDetail = function() {
                if(vm.playerFeedbackSearchType == "one") {
                    socketService.$socket($scope.AppSocket, 'getUpdatedAdminMissionStatusFromCti', {
                        platformObjId: vm.selectedPlatform.id
                    }, function (data) {
                        vm.ctiData = data.data;
                        let query = {
                            _id: vm.ctiData.callee[vm.feedbackPlayersPara.index - 1].player._id
                        };
                        socketService.$socket($scope.AppSocket, 'getSinglePlayerFeedbackQuery', {
                            query: query,
                            index: 0
                        }, function (data) {
                            console.log('_getSinglePlayerFeedbackQuery for CallOutMission', data);
                            vm.drawSinglePlayerFeedback(data);
                        });
                    });
                } else {
                    vm.getCtiData();
                }
            };

            vm.drawExtendedFeedbackTable = function (data) {
                var tableOptions = {
                    data: data,
                    "ordering": false,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {
                            title: $translate('LOBBY'), data: "provider$", sClass: "expandLobby sumText",
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
                        {title: $translate('TOTAL_CONSUMPTION'), data: "consumptionAmount$", sClass: 'sumFloat alignRight'}
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
                var playerTbl = $('#playerFeedbackDataTableExtended').DataTable(tableOptions);

                $('#playerFeedbackDataTableExtended').resize();
                $('#playerFeedbackDataTableExtended tbody').off('click', 'td.expandLobby');
                $('#playerFeedbackDataTableExtended tbody').on('click', 'td.expandLobby', function () {
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
                                        for (let j = 0; j < vm.allGame.length; j++) {
                                            if (data.gameDetail[i].gameId.toString() == vm.allGame[j]._id.toString()) {
                                                data.gameDetail[i].name = vm.allGame[j].name;
                                            }
                                        }
                                    }
                                    vm.drawPlatformTable(data, id, data.providerArr.length);
                                }
                            )
                        }

                        tr.addClass('shown');
                    }
                });

                vm.playerPlatformReport = {};
                vm.playerGameReport = {};
                vm.gameTable = {};
            };
            ///////draw Platform table inside player start///////
            vm.drawPlatformTable = function (data, id, size) {
                let holder = data;
                let tableOptions = {
                    data: data.providerArr,
                    "ordering": false,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {
                            title: $translate('*'),
                            data: null,
                            "className": 'expandLobbyRecord expand',
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
                utilService.setDataTablePageInput('playerFeedbackDataTableExtended', vm.gameTable[id], $translate);

                $('#' + id).resize();
                $('#' + id).off('click', 'td.expandLobbyRecord');
                $('#' + id).on('click', 'td.expandLobbyRecord', function () {
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

                        vm.drawPlatformGameTable(gameDetail, id, gameDetail.length);
                        tr.addClass('shown');
                    }
                });

            };
            ///////draw Platform table inside player start///////
            vm.drawPlatformGameTable = function (data, id, size) {
                let tableOptions = {
                    data: data,
                    "ordering": false,
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
                utilService.setDataTablePageInput('playerFeedbackDataTableExtended', vm.gameTable[id], $translate);
            };

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
                vm.submitPlayerFeedbackQuery();
                // vm.submitPlayerFeedbackQuery(vm.feedbackPlayersPara.index);
                $scope.safeApply();
            };

            vm.addPlayerFeedback = function (data) {
                let resultName = vm.allPlayerFeedbackResults.filter(item => {
                    return item.key == data.result;
                });
                resultName = resultName.length > 0 ? resultName[0].value : "";
                let sendData = {
                    playerId: data.playerId,
                    platform: data.platform,
                    createTime: Date.now(),
                    adminId: authService.adminId,
                    content: data.content,
                    result: data.result,
                    resultName: resultName,
                    topic: data.topic
                };
                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'createPlayerFeedback', sendData, function () {
                    vm.addFeedback.content = "";
                    vm.addFeedback.result = "";
                    // vm.submitPlayerFeedbackQuery(vm.feedbackPlayersPara.index);
                    vm.submitPlayerFeedbackQuery();
                });
            };

            vm.toggleCallOutMissionStatus = function() {
                socketService.$socket($scope.AppSocket, 'toggleCallOutMissionStatus', {
                    platformObjId: vm.selectedPlatform.id,
                    missionName: vm.ctiData.missionName
                }, function (data) {
                    console.log("toggleCallOutMissionStatus ret" , data);
                    if(data && data.data && data.data.hasOwnProperty('status')) {
                        vm.ctiData.status = data.data.status;
                        $scope.$evalAsync(function () {
                            if (vm.ctiData.status == $scope.constCallOutMissionStatus.ON_GOING) {
                                vm.callOutMissionStatusText = $translate("On Going");
                            } else if (vm.ctiData.status == $scope.constCallOutMissionStatus.PAUSED) {
                                vm.callOutMissionStatusText = $translate("Paused");
                            }
                        });
                    }
                });
            };

            vm.stopCallOutMission = function() {
                socketService.$socket($scope.AppSocket, 'stopCallOutMission', {
                    platformObjId: vm.selectedPlatform.id,
                    missionName: vm.ctiData.missionName
                }, function (data) {
                    console.log("stopCallOutMission ret" , data);
                    $scope.$evalAsync(function(){
                        vm.ctiData = {};
                        vm.feedbackPlayersPara.total = 0;
                        vm.callOutMissionStatus = "";
                        setTableData(vm.playerFeedbackTable, []);
                        vm.drawExtendedFeedbackTable([]);
                        vm.playerCredibilityComment = [];
                        vm.curPlayerFeedbackDetail = {};
                    });
                });
            };

            vm.getCtiData = function() {
                socketService.$socket($scope.AppSocket, 'getUpdatedAdminMissionStatusFromCti', {
                    platformObjId: vm.selectedPlatform.id,
                    limit: vm.playerFeedbackQuery.limit || 10,
                    index: vm.playerFeedbackQuery.index || 0,
                }, function (data) {
                    console.log("getCtiData ret",data);
                    vm.ctiData = data.data;
                    if(vm.ctiData.hasOnGoingMission) {
                        let playerFeedbackDetail = vm.ctiData.feedbackPlayerDetail;
                        setTableData(vm.playerFeedbackTable, playerFeedbackDetail.data);
                        vm.playerFeedbackQuery.total = playerFeedbackDetail.total || 0;
                        vm.playerFeedbackQuery.index = playerFeedbackDetail.index || 0;
                        vm.playerFeedbackQuery.pageObj.init({maxCount: vm.playerFeedbackQuery.total});
                        vm.feedbackPlayersPara.total = vm.playerFeedbackQuery.total;

                        let players = [];
                        let completedAmount = 0;
                        vm.callOutMissionStatusText = '';

                        vm.ctiData.callee.forEach(callee => {
                            players.push(Object.assign({},callee.player,{callOutMissionStatus: callee.status}));
                            if (status == $scope.constCallOutMissionStatus.SUCCEEDED || status == $scope.constCallOutMissionStatus.FAILED) {
                                completedAmount++;
                            }
                        });

                        if (vm.ctiData.status == $scope.constCallOutMissionStatus.ON_GOING) {
                            vm.callOutMissionStatusText = $translate("On Going");
                        } else if (vm.ctiData.status == $scope.constCallOutMissionStatus.PAUSED) {
                            vm.callOutMissionStatusText = $translate("Paused");
                        }

                        $scope.$evalAsync(function () {
                            vm.feedbackPlayersPara.total = vm.ctiData.callee.length;
                            vm.callOutMissionProgressText = completedAmount + '/' + vm.ctiData.callee.length;
                        });
                        // setTableData(vm.playerFeedbackTable, players);
                    }
                });
            };

            vm.getPlayerCreditinFeedbackInfo = function () {
                vm.curFeedbackPlayer.gameCredit = {};
                for (var i in vm.platformProviderList) {
                    vm.getPlayerCreditInProvider(vm.curFeedbackPlayer.name, vm.platformProviderList[i].providerId, vm.curFeedbackPlayer.gameCredit)
                }
            };

            vm.setQueryRole = (modal) => {
                vm.queryRoles = [];

                vm.queryRoles.push({_id:'', roleName:'N/A'});

                vm.queryDepartments.map(e => {
                    if (e._id != "" && (modal.departments.indexOf(e._id) >= 0)) {
                        vm.queryRoles = vm.queryRoles.concat(e.roles);
                    }
                });

                if (modal && modal.departments && modal.departments.length > 0) {
                    if (!vm.queryAdmins) {
                        vm.queryAdmins = [];
                        vm.queryAdmins.push({_id:'', adminName:'N/A'});
                    }

                    if (modal.departments.includes("")) {
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

                vm.refreshSPicker();
                $scope.safeApply();
            };

            vm.setQueryAdmins = (modal) => {
                vm.queryAdmins = [];

                vm.queryAdmins.push({_id:'', adminName:'N/A'});

                vm.queryRoles.map(e => {
                    if (e._id != "" && (modal.roles.indexOf(e._id) >= 0)) {
                        vm.queryAdmins = vm.queryAdmins.concat(e.users);
                    }
                });
                vm.refreshSPicker();
                $scope.safeApply();
            };

            ////////////////////////////////////////////////////////////////////////////////////Mark::partner functions//////////////////

            var setPartnerTableData = function (data) {
                return setTableData(vm.partnerTable, data);
            };

            //get all platform partners data from server
            vm.getPlatformPartnersData = function () {
                if (!authService.checkViewPermission('Partner', 'Partner', 'Read')) {
                    return;
                }
                $('#partnerRefreshIcon').addClass('fa-spin');
                $('#partnerLoadingIcon').addClass('fa fa-spinner fa-spin');

                vm.advancedPartnerQueryObj = vm.advancedPartnerQueryObj || {
                    "platformId": vm.selectedPlatform.id,
                    "index": 0,
                    "limit": 10,
                };

                vm.advancedPartnerQueryObj.sortCol = vm.advancedPartnerQueryObj.sortCol || {registrationTime: -1};

                var sendData = {
                    "platform": {
                        "platformId": vm.selectedPlatform.id,
                        "index": vm.advancedPartnerQueryObj.index,
                        "limit": vm.advancedPartnerQueryObj.limit,
                        "sortCol": vm.advancedPartnerQueryObj.sortCol
                    }
                };
                console.log('sendData', sendData);

                socketService.$socket($scope.AppSocket, 'getPartnersByPlatform', sendData, success);

                function success(data) {
                    console.log('getPartnersByPlatform output', data);
                    vm.partnerIdObj = {};
                    let partnersObjId = [];
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
                        vm.getPartnersByAdvanceQueryDebounced();

                        var sendQuery = {
                            query: {
                                platform: vm.selectedPlatform.id,
                                partner: {$in: partnersObjId}
                            }
                        };

                        socketService.$socket($scope.AppSocket, 'getCustomizeCommissionConfigPartner', sendQuery, function (customCommissionConfig) {
                            console.log('customCommissionConfig by getPlatformPartnersData', customCommissionConfig);
                            if (customCommissionConfig && customCommissionConfig.data && customCommissionConfig.data.length > 0) {
                                customCommissionConfig.data.forEach(customSetting => {
                                    if (data && data.data && data.data.data) {
                                        data.data.data.map(data => {
                                            if(data._id
                                                && customSetting.partner
                                                && (data._id.toString() == customSetting.partner.toString())) {
                                                data.isCustomizeSettingExist = true;
                                            }
                                        });
                                    }
                                });
                            }
                            vm.drawPartnerTable(data.data);
                        });
                    });

                    $('#partnerRefreshIcon').removeClass('fa-spin');

                }
            };

            vm.refreshPartnerBankInfo = function () {
                if (vm.selectedSinglePartner && vm.selectedSinglePartner._id) {
                    vm.getProvince(vm.currentProvince.province);
                    vm.getCity(vm.currentCity.city);
                    vm.getDistrict(vm.currentDistrict.district);
                }
            }

            vm.getPartnersByAdvanceQueryDebounced = $scope.debounceSearch(function (partnerQuery) {
                utilService.hideAllPopoversExcept();
                vm.advancedPartnerQueryObj = $.extend({}, vm.advancedPartnerQueryObj, partnerQuery);
                for (var k in partnerQuery) {
                    if (!partnerQuery[k] || $.isEmptyObject(partnerQuery)) {
                        delete vm.advancedPartnerQueryObj[k];
                    }
                }
                // vm.advancedPartnerQueryObj.index = 0;
                var apiQuery = {
                    platformId: vm.selectedPlatform.id,
                    query: vm.advancedPartnerQueryObj,
                    index: partnerQuery ? 0 : (vm.advancedPartnerQueryObj.index || 0),
                };
                console.log('apiQuery', apiQuery);
                socketService.$socket($scope.AppSocket, 'getPartnersByAdvancedQuery', apiQuery, function (reply) {
                    $scope.$evalAsync(() => {
                        console.log('partnerData', reply);
                        let size = reply.data.size || 0;
                        // setPartnerTableData(reply.data.data);
                        // vm.partners = reply.data.data;
                        if (reply && reply.data && reply.data.data && reply.data.data.length) {
                            let partnersObjId = [];

                            for (let i = 0, len = reply.data.data.length; i < len; i++) {
                                let partner = reply.data.data[i];

                                if (partner && partner._id) {
                                    partnersObjId.push(partner._id);
                                }
                            }

                            if (partnersObjId && partnersObjId.length > 0) {
                                let sendData = {
                                    query: {
                                        platform: vm.selectedPlatform.id,
                                        partner: {$in: partnersObjId}
                                    }
                                };

                                socketService.$socket($scope.AppSocket, 'getCustomizeCommissionConfigPartner', sendData, function (customCommissionConfig) {
                                    console.log('customCommissionConfig by getPartnersByAdvanceQueryDebounced', customCommissionConfig);
                                    if (customCommissionConfig && customCommissionConfig.data && customCommissionConfig.data.length > 0) {
                                        customCommissionConfig.data.forEach(customSetting => {
                                            if (reply && reply.data && reply.data.data) {
                                                reply.data.data.map(data => {
                                                    if(data._id
                                                        && customSetting.partner
                                                        && (data._id.toString() == customSetting.partner.toString())) {
                                                        data.isCustomizeSettingExist = true;
                                                    }
                                                });
                                            }
                                        });
                                    }
                                    vm.drawPartnerTable(reply.data);
                                });
                            } else {
                                vm.drawPartnerTable(reply.data);
                            }
                        } else {
                            setPartnerTableData([])
                        }

                        vm.searchPartnerCount = reply.data.size;
                    })
                });
            });

            vm.activatePlayerTab = function () {
                // if (vm.selectedPlatform && vm.selectedPlatform.id) {
                //     vm.getRewardPointsEvent(vm.selectedPlatform.id);
                // }

                setTimeout(() => {
                    $('#playerDataTable').resize();
                }, 0);
            };

            utilService.actionAfterLoaded('#resetPartnerQuery', function () {
                $('#resetPartnerQuery').off('click');
                $('#resetPartnerQuery').click(function () {
                    utilService.clearDatePickerDate('#regDateTimePicker2');
                    utilService.clearDatePickerDate('#regEndDateTimePicker2');
                    utilService.clearDatePickerDate('#lastAccessDateTimePicker2');
                    utilService.clearDatePickerDate('#lastAccessEndDateTimePicker2');
                    let resetQuery = {};
                    resetQuery.index = vm.advancedPartnerQueryObj.index;
                    resetQuery.limit = vm.advancedPartnerQueryObj.limit;
                    resetQuery.pageObj = vm.advancedPartnerQueryObj.pageObj;
                    resetQuery.sortCol = vm.advancedPartnerQueryObj.sortCol;
                    vm.advancedPartnerQueryObj = resetQuery;
                    vm.partnerAdvanceSearchQuery = {
                        creditsOperator: ">=",
                        dailyActivePlayerOperator: ">=",
                        weeklyActivePlayerOperator: ">=",
                        monthlyActivePlayerOperator: ">=",
                        validPlayersOperator: ">=",
                        totalPlayerDownlineOperator: ">=",
                        totalChildrenDepositOperator: ">=",
                        totalChildrenBalanceOperator: ">=",
                        totalSettledCommissionOperator: ">=",
                    };
                    vm.getPartnersByAdvanceQueryDebounced(vm.partnerAdvanceSearchQuery);
                })
            });

        function getTotalPlayerDownline(partner) {
            return $scope.$socketPromise('getTotalPlayerDownline', partner).then(function (data) {
                // append back total player downline into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId) {
                        let index = partner.data.findIndex(p => p._id === inData.partnerId);
                        if (index !== -1) {
                            partner.data[index].totalPlayerDownline = inData.size ? inData.size : 0;
                        }
                    }
                });
            })
        }

        function getDailyActivePlayerCount(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getDailyActivePlayerCount', sendQuery).then(function (data) {
                // append back daily active player into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId) {
                        let index = partner.data.findIndex(p => p._id === inData.partnerId);
                        if (index !== -1) {
                            partner.data[index].dailyActivePlayer = inData.size ? inData.size : 0;
                            partner.data[index].dailyActivePlayerObjArr = inData.downLiner ? inData.downLiner : [];
                        }
                    }
                });
            })
        }

        function getWeeklyActivePlayerCount(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getWeeklyActivePlayerCount', sendQuery).then(function (data) {
                // append back weekly active player into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId) {
                        let index = partner.data.findIndex(p => p._id === inData.partnerId);
                        if (index !== -1) {
                            partner.data[index].weeklyActivePlayer = inData.size ? inData.size : 0;
                            partner.data[index].weeklyActivePlayerObjArr = inData.downLiner ? inData.downLiner : [];
                        }
                    }
                });
            })
        }

        function getMonthlyActivePlayerCount(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getMonthlyActivePlayerCount', sendQuery).then(function (data) {
                // append back monthly active player into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId) {
                        let index = partner.data.findIndex(p => p._id === inData.partnerId);
                        if (index !== -1) {
                            partner.data[index].monthlyActivePlayer = inData.size ? inData.size : 0;
                            partner.data[index].monthlyActivePlayerObjArr = inData.downLiner ? inData.downLiner : [];
                        }
                    }
                });
            })
        }

        function getValidPlayersCount(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getValidPlayersCount', sendQuery).then(function (data) {
                // append back valid players into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId){
                        let index =  partner.data.findIndex(p => p._id === inData.partnerId);
                        if ( index !== -1) {
                            partner.data[index].validPlayers = inData.size ? inData.size : 0;
                            partner.data[index].validActivePlayerObjArr = inData.downLiner ? inData.downLiner : [];
                        }
                    }
                });
            })
        }

        function getTotalChildrenDeposit(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getTotalChildrenDeposit', sendQuery).then(function (data) {
                // append back total children deposit into draw table data
                data.data.forEach( inData => {
                    let index =  partner.data.findIndex(p => p._id === inData.partnerId);
                    if ( index !== -1) {
                        partner.data[index].totalChildrenDeposit = inData.amount ? inData.amount : 0;
                    }
                });
            })
        }

        function getTotalChildrenBalance(referral, partner) {
            let sendQuery = {
                referral: referral,
                platform: vm.selectedPlatform.id
            };

            return $scope.$socketPromise('getTotalChildrenBalance', sendQuery).then(function (data) {
                // append back total children balance into draw table data
                data.data.forEach( inData => {
                    let index =  partner.data.findIndex(p => p._id === inData.partnerId);
                    if ( index !== -1) {
                        partner.data[index].totalChildrenBalance = inData.amount ? inData.amount : 0;
                    }
                });
            })
        }

        function getTotalSettledCommission(partner) {
            return $scope.$socketPromise('getTotalSettledCommission', partner).then(function (data) {
                // append back total settled commission into draw table data
                data.data.forEach( inData => {
                    if (inData && inData.partnerId) {
                        let index =  partner.data.findIndex(p => p._id === inData.partnerId);
                        if ( index !== -1) {
                            partner.data[index].totalSettledCommission = inData.amount ? inData.amount : 0;
                        }
                    }
                });
            })
        }

        function getReferralsList(partner) {
            return $scope.$socketPromise('getReferralsList', partner).then(function (data) {
                let promArr = [];

                promArr.push(getTotalPlayerDownline(partner));
                promArr.push(getDailyActivePlayerCount(data.data, partner));
                promArr.push(getWeeklyActivePlayerCount(data.data, partner));
                promArr.push(getMonthlyActivePlayerCount(data.data, partner));
                promArr.push(getValidPlayersCount(data.data, partner));
                promArr.push(getTotalChildrenDeposit(data.data, partner));
                promArr.push(getTotalChildrenBalance(data.data, partner));
                promArr.push(getTotalSettledCommission(partner));

                return Promise.all(promArr).then(() => partner.data);
            })
        }

            vm.getChildrenDetails = function (partnerId) {
                let sendQuery = {
                    partnerId: partnerId,
                    platform: vm.selectedPlatform.id
                };

                socketService.$socket($scope.AppSocket, 'getChildrenDetails', sendQuery, function (data) {
                    let sumOfManualTopUp = 0;
                    let sumOfOnlineTopUp = 0;
                    let sumOfAliPayTopUp = 0;
                    let sumOfWechatTopUp = 0;
                    let sumOfTotalTopUp = 0;
                    let sumOfTotalBonus = 0;
                    let sumOfTotalDeposit = 0;
                    let sumOfTotalBalance = 0;

                    if(data && data.data){
                        data.data.forEach(result => {
                            if(result){
                                if(result.manualTopUp){
                                    sumOfManualTopUp = sumOfManualTopUp + result.manualTopUp;
                                }

                                if(result.onlineTopUp){
                                    sumOfOnlineTopUp = sumOfOnlineTopUp + result.onlineTopUp;
                                }

                                if(result.aliPayTopUp){
                                    sumOfAliPayTopUp = sumOfAliPayTopUp + result.aliPayTopUp;
                                }

                                if(result.wechatTopUp){
                                    sumOfWechatTopUp = sumOfWechatTopUp + result.wechatTopUp;
                                }

                                if(result.topUpSum){
                                    sumOfTotalTopUp = sumOfTotalTopUp + result.topUpSum;
                                }

                                if(result.totalBonus){
                                    sumOfTotalBonus = sumOfTotalBonus + result.totalBonus;
                                }

                                if(result.totalDepositAmount){
                                    sumOfTotalDeposit = sumOfTotalDeposit + result.totalDepositAmount;
                                }

                                if(result.validCredit){
                                    sumOfTotalBalance = sumOfTotalBalance + result.validCredit;
                                }
                            }
                        });

                        $scope.$evalAsync(() => {
                            vm.playerDetailsSummary = data.data;
                            vm.playerDetailsSummary.totalCount = data.data.length;
                            vm.playerDetailsSummary.sumOfManualTopUp = sumOfManualTopUp;
                            vm.playerDetailsSummary.sumOfOnlineTopUp = sumOfOnlineTopUp;
                            vm.playerDetailsSummary.sumOfAliPayTopUp = sumOfAliPayTopUp;
                            vm.playerDetailsSummary.sumOfWechatTopUp = sumOfWechatTopUp;
                            vm.playerDetailsSummary.sumOfTotalTopUp = sumOfTotalTopUp;
                            vm.playerDetailsSummary.sumOfTotalBonus = sumOfTotalBonus;
                            vm.playerDetailsSummary.sumOfTotalDeposit = sumOfTotalDeposit;
                            vm.playerDetailsSummary.sumOfTotalBalance = sumOfTotalBalance;
                            $('#modalPlayerDetailsSummaryTable').modal().show();
                        })
                    }
                })
            };

            //draw partner table based on data
            vm.drawPartnerTable = async function (data) {
                //convert decimal to 2 digits
                data.data.forEach((partner) => {
                    if (partner.credits) {
                        partner.credits = partner.credits ? partner.credits.toFixed(2) : 0;
                    }
                    if (partner.registrationTime) {
                        partner.registrationTime = utilService.getFormatTime(partner.registrationTime);
                    }
                    if (partner.lastAccessTime) {
                        partner.lastAccessTime = utilService.getFormatTime(partner.lastAccessTime)
                    }

                    partner.totalPlayerDownline = partner.totalPlayerDownline ? partner.totalPlayerDownline : 0;
                    partner.dailyActivePlayer = partner.dailyActivePlayer ? partner.dailyActivePlayer : 0;
                    partner.weeklyActivePlayer = partner.weeklyActivePlayer ? partner.weeklyActivePlayer : 0;
                    partner.monthlyActivePlayer = partner.monthlyActivePlayer ? partner.monthlyActivePlayer : 0;
                    partner.validPlayers = partner.validPlayers ? partner.validPlayers : 0;
                    partner.totalChildrenDeposit = partner.totalChildrenDeposit ? partner.totalChildrenDeposit : 0;
                    partner.totalChildrenBalance = partner.totalChildrenBalance ? partner.totalChildrenBalance : 0;
                    partner.totalSettledCommission = partner.totalSettledCommission ? parseFloat(partner.totalSettledCommission).toFixed(2) : 0;
                });

                vm.partners = await getReferralsList(data);
                vm.platformPartnerCount = data.size;
                vm.selectedPartnerCount = 0;
                vm.searchPartnerCount = data.size;

                var emptyString = (vm.curPlatformText) ? ('No partner found in ' + vm.curPlatformText) : 'Please select platform';
                var tableOptions = {
                    data: data.data,
                    aaSorting: [],
                    columns: [
                        {
                            title: $translate('PARTNER_NAME'), data: "partnerName", advSearch: true, "sClass": "",
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'class': (row.permission.forbidPartnerFromLogin === true ? "text-danger" : "text-primary"),
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
                            title: $translate('COMMISSION_TYPE'), "data": 'commissionType', advSearch: true, "sClass": "",
                            render: function (data, type, row) {
                                data = data || '';
                                if ($scope.checkViewPermission('Partner', 'Partner', 'EditCommission')) {
                                    if (row && row.isCustomizeSettingExist) {
                                        return $('<a style="z-index: auto; color:red" data-toggle="modal" data-container="body" ' +
                                            'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#" ' +
                                            'ng-click="vm.onClickPartnerCheck(\'' + row._id + '\', vm.openEditPartnerDialog, \'commissionInfo\');"></a>')
                                            .attr('data-row', JSON.stringify(row))
                                            .text($translate(vm.commissionType[data]) || "-")
                                            .prop('outerHTML');
                                    } else {
                                        return $('<a style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                            'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#" ' +
                                            'ng-click="vm.onClickPartnerCheck(\'' + row._id + '\', vm.openEditPartnerDialog, \'commissionInfo\');"></a>')
                                            .attr('data-row', JSON.stringify(row))
                                            .text($translate(vm.commissionType[data]) || "-")
                                            .prop('outerHTML');
                                    }
                                } else {
                                    return $('<span style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                        'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#" ></span>')
                                        .attr('data-row', JSON.stringify(row))
                                        .text($translate(vm.commissionType[data]))
                                        .prop('outerHTML');
                                }
                            },
                        },
                        {
                            title: $translate('CREDIT'), advSearch: true,
                            "sClass": "alignRight sumFloat",
                            data: 'credits',
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showTransferPartnerCreditToPlayerModal("' + row._id + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('REGISTRATION_TIME'),
                            data: 'registrationTime',
                            advSearch: true,
                            filterConfig: {
                                type: "datetimepicker",
                                id: "regDateTimePicker2",
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
                                id: "regEndDateTimePicker2",
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
                                id: "lastAccessDateTimePicker2",
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
                                id: "lastAccessEndDateTimePicker2",
                                options: {
                                    language: 'en',
                                    format: 'dd/MM/yyyy hh:mm:ss',
                                }
                            },
                            "sClass": "alignLeft"
                        },
                        {
                            title: $translate('LOGIN_TIMES'), data: "loginTimes",
                            render: function (data, type, row) {
                                data = data || '0';
                                return $('<a data-target="#modalPartnerApiLog" style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                    'data-placement="bottom" data-trigger="focus" type="button" ng-click="vm.initPartnerApiLog()" data-html="true" href="#"></a>')
                                    .attr('data-row', JSON.stringify(row))
                                    .text((data))
                                    .prop('outerHTML');
                            },
                            "sClass": "alignRight"
                        },
                        {
                            title: $translate('phoneNumber'), data: "phoneNumber", advSearch: true, "sClass": "", //"visible": false,
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showPartnerInfoModal("' + data + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('DAILY_ACTIVE'), data: "dailyActivePlayer", advSearch: true, "sClass": "",
                            render: function (data, type, row, index) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showActivePartnerInfoModal("' + row._id + '","DAILY_ACTIVE")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('WEEKLY_ACTIVE'), data: "weeklyActivePlayer", advSearch: true, "sClass": "",
                            render: function (data, type, row, index) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showActivePartnerInfoModal("' + row._id + '","WEEKLY_ACTIVE")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('MONTHLY_ACTIVE'), data: "monthlyActivePlayer", advSearch: true, "sClass": "",
                            render: function (data, type, row, index) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showActivePartnerInfoModal("' + row._id + '","MONTHLY_ACTIVE")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('VALID_PLAYER'), data: "validPlayers", advSearch: true, "sClass": "",
                            render: function (data, type, row, index) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showActivePartnerInfoModal("' + row._id + '","VALID_ACTIVE")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate("TOTAL_CHILDREN") + "<br>" + $translate("CHILDREN_COUNT"), data: "totalPlayerDownline", advSearch: true, "sClass": "",
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.getChildrenDetails("' + row._id + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate("TOTAL_CHILDREN") + "<br>" + $translate("CHILDREN_DEPOSIT"),
                            data: "totalChildrenDeposit",
                            advSearch: true,
                            "sClass": "alignRight sumFloat",
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.getChildrenDetails("' + row._id + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate("TOTAL_CHILDREN") + "<br>" + $translate("CHILDREN_BALANCE"),
                            data: "totalChildrenBalance",
                            advSearch: true,
                            "sClass": "alignRight sumFloat",
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.getChildrenDetails("' + row._id + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate("settled commission") + "<br>" + $translate("(TOTAL)"),
                            data: "totalSettledCommission",
                            advSearch: true,
                            "sClass": "alignRight sumFloat",
                            render: function (data, type, row) {
                                let link = $('<a>', {
                                    'ng-click': 'vm.showPartnerInfoModal("' + data + '")'
                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {
                            title: $translate('Function'),
                            orderable: false,
                            render: function (data, type, row) {
                                data = data || '';
                                let partnerObjId = row._id ? row._id : "";
                                let link = $('<div>', {});
                                link.append($('<a>', {
                                    'class': 'fa fa-envelope margin-right-5',
                                    'ng-click': 'vm.initPartnerMessageModal(); vm.sendMessageToPartnerBtn("' + partnerObjId + '");',
                                    // 'data-row': JSON.stringify(row),
                                    'data-toggle': 'tooltip',
                                    'title': $translate("SEND_MESSAGE_TO_PARTNER"),
                                    'data-placement': 'left',
                                }));
                                link.append($('<a>', {
                                    'class': 'fa fa-comment margin-right-5' + (row.permission.SMSFeedBack === false ? " text-danger" : ""),
                                    'ng-click': 'vm.initPartnerSMSModal();' + "vm.onClickPartnerCheck('" +
                                    partnerObjId + "', " + "vm.telorMessageToPartnerBtn" +
                                    ", " + "[" + '"msg"' + ", '" + partnerObjId + "']);",
                                    // 'data-row': JSON.stringify(row),
                                    'data-toggle': 'tooltip',
                                    'title': $translate("SEND_SMS_TO_PARTNER"),
                                    'data-placement': 'left',
                                }));
                                link.append($('<a>', {
                                    'class': 'fa fa-volume-control-phone margin-right-5' + (row.permission.phoneCallFeedback === false ? " text-danger" : ""),
                                    'ng-click': 'vm.telorMessageToPartnerBtn(' + '"tel", "' + partnerObjId + '");',
                                    // 'data-row': JSON.stringify(row),
                                    'data-toggle': 'tooltip',
                                    'title': $translate("PHONE"),
                                    'data-placement': 'left',
                                }));
                                if ($scope.checkViewPermission('Partner', 'Feedback', 'AddFeedback')) {
                                    link.append($('<a>', {
                                        'class': 'fa fa-commenting margin-right-5',
                                        'ng-click': 'vm.initFeedbackModal("' + partnerObjId + '");',
                                        // 'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalAddPartnerFeedback',
                                        'title': $translate("ADD_FEEDBACK"),
                                        'data-placement': 'left',
                                    }));
                                }
                                if ($scope.checkViewPermission('Partner', 'Partner', 'ApplyBonus')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5 margin-right-5',
                                        'src': (row.permission.applyBonus === false ? "images/icon/withdrawRed.png" : "images/icon/withdrawBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.initPartnerBonus();',
                                        // 'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPartnerBonus',
                                        'title': $translate("Bonus"),
                                        'data-placement': 'left',
                                    }));
                                }
                                if ($scope.checkViewPermission('Partner', 'Partner', 'CreditAdjustment')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5',
                                        'src': "images/icon/creditAdjustBlue.png",
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.onClickPartnerCheck("' + partnerObjId + '", vm.prepareShowPartnerCreditAdjustment, \'adjust\')',
                                        // 'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPartnerCreditAdjustment',
                                        'title': $translate("CREDIT_ADJUSTMENT"),
                                        'data-placement': 'right',
                                    }));
                                }
                                return link.prop('outerHTML');
                            },
                            "sClass": "alignLeft"
                        },
                        {
                            title: $translate('MAIN') + $translate('PERMISSION'),
                            orderable: false,
                            render: function (data, type, row) {
                                data = data || {permission: {}};
                                let partnerObjId = row._id ? row._id : "";

                                let link = $('<a>', {
                                    'class': 'partnerPermissionPopover',
                                    'ng-click': "vm.initPermissionPartner('" + partnerObjId + "');",
                                    'data-toggle': 'popover',
                                    'data-trigger': 'focus',
                                    'data-placement': 'left',
                                    'data-container': 'body',
                                });

                                let perm = (row && row.permission) ? row.permission : {};

                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.applyBonus === true ? "withdrawBlue.png" : "withdrawRed.png"),
                                    height: "14px",
                                    width: "14px",
                                }));

                                link.append($('<i>', {
                                    'class': 'fa margin-right-5 ' + (perm.forbidPartnerFromLogin === true ? "fa-sign-out text-danger" : "fa-sign-in  text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-volume-control-phone margin-right-5 ' + (perm.phoneCallFeedback === false ? "text-danger" : "text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-comment margin-right-5 ' + (perm.SMSFeedBack === false ? "text-danger" : "text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-user-times margin-right-5 ' + (perm.disableCommSettlement === true ? "text-danger" : "text-primary"),
                                }));

                                return link.prop('outerHTML') + "&nbsp;";
                            },
                            "sClass": "alignLeft"
                        },
                        {
                            title: $translate('SECONDARY') + $translate('PERMISSION'),
                            orderable: false,
                            "sClass": "alignLeft"
                        },
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
                                $('.partnerStatusConfirmation').hide();
                                return $compile($('#partnerStatusPopover').html())($scope);
                            },
                            callback: function () {
                                var data = JSON.parse(this.dataset.row);
                                var thisPopover = utilService.$getPopoverID(this);
                                var rowData = JSON.parse(this.dataset.row);
                                var status = rowData.status;

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
                                        $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
                                    }, function (err) {
                                        $scope.phoneCall.loadingNumber = false;
                                        $scope.phoneCall.err = err.error.message;
                                        alert($scope.phoneCall.err);
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
                                let row = vm.permissionPartner;
                                vm.partnerPermissionTypes = {
                                    applyBonus: {
                                        imgType: 'img',
                                        src: "images/icon/withdrawBlue.png",
                                        width: '26px',
                                        height: '26px'
                                    },
                                    forbidPartnerFromLogin: {
                                        imgType: 'i',
                                        iconClass: "fa fa-sign-in"
                                    },
                                    phoneCallFeedback: {
                                        imgType: 'i',
                                        iconClass: "fa fa-volume-control-phone"
                                    },
                                    SMSFeedBack: {
                                        imgType: 'i',
                                        iconClass: "fa fa-comment"
                                    },
                                    disableCommSettlement: {
                                        imgType: 'i',
                                        iconClass: "fa fa-user-times"
                                    }
                                };
                                $("#partnerPermissionTable td").removeClass('hide');

                                vm.popOverPartnerPermission = row;

                                // // Invert second render
                                // row.permission.forbidPartnerFromLogin = !row.permission.forbidPartnerFromLogin;
                                // row.permission.disableCommSettlement = !row.permission.disableCommSettlement;

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
                                    $(thisPopover + " .togglePartner").off('click');
                                    $remark.off('input selectionchange propertychange');

                                    if (changeObj.hasOwnProperty('forbidPartnerFromLogin')) {
                                        changeObj.forbidPartnerFromLogin = !changeObj.forbidPartnerFromLogin;
                                    }

                                    if (changeObj.hasOwnProperty('disableCommSettlement')) {
                                        changeObj.disableCommSettlement = !changeObj.disableCommSettlement;
                                    }

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
                        vm.sendMessageToPartner = function () {
                            // Currently we are passing the adminId from the client side, but we should really pick it up on the server side.
                            let sendData = {
                                //adminId: authService.adminId,
                                adminName: authService.adminName,
                                platformId: vm.selectedPlatform.id,
                                partnerId: vm.selectedSinglePartner.data._id,
                                title: vm.messageForPartner.title,
                                content: vm.messageForPartner.content
                            };
                            $scope.$socketPromise('sendPlayerMailFromAdminToPartner', sendData).then(function () {
                                // We could show a confirmation message, but currently showConfirmMessage() is doing that for us.
                            }).done();
                        };

                        $('#partnerDataTable').resize();
                    }
                };
                $.each(tableOptions.columns, function (i, v) {
                    v.defaultContent = "";
                });
                vm.partnerTable = $('#partnerDataTable').DataTable(tableOptions);
                utilService.setDataTablePageInput('partnerDataTable', vm.partnerTable, $translate);
                vm.advancedPartnerQueryObj.pageObj.init({maxCount: data.size}, !Boolean(vm.advancedPartnerQueryObj.index));

                createPartnerAdvancedSearchFilters({
                    tableOptions: tableOptions,
                    // filtersElement: '#partnerTable-search-filters',
                    filtersElement: '',
                    queryFunction: vm.getPartnersByAdvanceQueryDebounced
                });
                //vm.advancedPartnerQueryObj.pageObj.init({maxCount: data.size});
                $('#partnerLoadingIcon').removeClass('fa fa-spinner fa-spin');

                if (vm.selectedSinglePartner) {
                    vm.partnerTable
                        .rows( function ( idx, data, node ) {
                            if (data._id == vm.selectedSinglePartner._id) {
                                vm.maskPartnerInfo(data);
                                vm.selectedSinglePartner = data;
                                vm.partnerTableRowClick(data);
                                vm.selectedPartnerCount = 1;
                                $(node).addClass('selected');
                                vm.currentSelectedPartnerObjId = vm.selectedSinglePartner._id;
                                vm.editPartner = {
                                    partnerName: vm.selectedSinglePartner.partnerName,
                                    partnerId: vm.selectedSinglePartner.partnerId,
                                    registrationTime: vm.selectedSinglePartner.registrationTime,
                                    email: vm.selectedSinglePartner.email,
                                    realName: vm.selectedSinglePartner.realName,
                                    platform: vm.selectedSinglePartner.platform,
                                    phoneNumber: vm.selectedSinglePartner.phoneNumber,
                                    gender: vm.selectedSinglePartner.gender,
                                    DOB: vm.selectedSinglePartner.DOB,
                                    ownDomain: vm.selectedSinglePartner.ownDomain,
                                    bankAccount: vm.selectedSinglePartner.bankAccount,
                                    bankAccountCity: vm.selectedSinglePartner.bankAccountCity,
                                    bankAccountDistrict: vm.selectedSinglePartner.bankAccountDistrict,
                                    bankAccountProvince: vm.selectedSinglePartner.bankAccountProvince,
                                    commissionType: vm.selectedSinglePartner.commissionType,
                                    player: vm.selectedSinglePartner.player,
                                };
                            }
                        } ).data();
                }
            };
            vm.initPermissionPartner = function (partnerObjId) {
                vm.permissionPartner = {};
                vm.permissionPartner = vm.partners.find(p => String(p._id) === partnerObjId);

                if (vm.permissionPartner && vm.permissionPartner.permission) {
                    vm.permissionPartner.permission.forbidPartnerFromLogin = !vm.permissionPartner.permission.forbidPartnerFromLogin;
                    vm.permissionPartner.permission.disableCommSettlement = !vm.permissionPartner.permission.disableCommSettlement;
                }
            }
            vm.sendSMSToPartner = function () {
                vm.sendSMSResult = {sent: "sending"};
                return $scope.sendSMSToPlayer(vm.smsPartner, function (data) {
                    vm.sendSMSResult = {sent: true, result: data.success};
                    $scope.safeApply();
                });
            };
            vm.partnerTableRowClick = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                // Row click
                $compile(nRow)($scope);
                vm.currentSelectedPartnerObjId = '';
                var status = aData && aData.status ? aData.status : 1;
                if (aData && aData.credits) {
                    aData.credits = parseFloat(aData.credits);
                }
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
                    FORBID_GAME: '#D2691E',
                    CHEAT_NEW_ACCOUNT_REWARD: '#800000',
                    TOPUP_ATTENTION: '#800000',
                    HEDGING: '#800000',
                    TOPUP_BONUS_SPAM: '#800000',
                    MULTIPLE_ACCOUNT: '#800000',
                    BANNED: '#800000',
                    FORBID_ONLINE_TOPUP: '#800000',
                    BAN_PLAYER_BONUS: '#800000'
                }

                $(nRow).find('td:contains(' + $translate(statusKey) + ')').each(function (i, v) {
                    $(v).find('a').eq(0).css('color', colorObj[statusKey]);
                })
                $(nRow).off('click');
                $(nRow).on('click', function () {
                    $scope.$evalAsync(() => {
                        $('#partnerDataTable tbody tr').removeClass('selected');
                        $(this).toggleClass('selected');
                        vm.partnerTableClickedRow = vm.partnerTable.row(this);
                        vm.selectedSinglePartner = aData;
                        vm.isOneSelectedPartner = function () {
                            return vm.selectedSinglePartner;
                        };
                        vm.maskPartnerInfo(vm.selectedSinglePartner);
                        vm.selectedPartnerCount = 1;
                        console.log('partner selected', vm.selectedSinglePartner);
                        vm.getProvince();
                        vm.getCity();
                        vm.getDistrict();
                        vm.currentSelectedPartnerObjId = vm.selectedSinglePartner._id;
                        vm.editPartner = {
                            partnerName: vm.selectedSinglePartner.partnerName,
                            partnerId: vm.selectedSinglePartner.partnerId,
                            registrationTime: vm.selectedSinglePartner.registrationTime,
                            email: vm.selectedSinglePartner.email,
                            realName: vm.selectedSinglePartner.realName,
                            platform: vm.selectedSinglePartner.platform,
                            phoneNumber: vm.selectedSinglePartner.phoneNumber,
                            gender: vm.selectedSinglePartner.gender,
                            DOB: vm.selectedSinglePartner.DOB,
                            ownDomain: vm.selectedSinglePartner.ownDomain,
                            bankAccount: vm.selectedSinglePartner.bankAccount,
                            bankAccountCity: vm.selectedSinglePartner.bankAccountCity,
                            bankAccountDistrict: vm.selectedSinglePartner.bankAccountDistrict,
                            bankAccountProvince: vm.selectedSinglePartner.bankAccountProvince,
                            commissionType: vm.selectedSinglePartner.commissionType,
                            player: vm.selectedSinglePartner.player,
                        };
                    });
                });
            };
            vm.maskPartnerInfo = function (data) {
                // Mask partners bank account
                data.encodedBankAccount = data.bankAccount ?
                    data.bankAccount.slice(0, 6) + "**********" + data.bankAccount.slice(-4) : null;

                if (data.domain && data.domain.length > 35) {
                    data.$displayDomain = data.domain.substring(0, 30) + "...";
                } else {
                    data.$displayDomain = data.domain || null;
                }

                if (data && data.ownDomain && data.ownDomain.length > 0) {
                    data.ownDomain$ = data.ownDomain.join('\n');
                } else {
                    data.ownDomain$ = null;
                }
            }
            //show partner info modal
            vm.showPartnerInfoModal = function (partnerName) {
                $('#modalPartnerInfo').modal().show();
                $scope.$evalAsync(() => {
                    vm.selectedPartnerCommissionPreview = false;
                });
                $scope.$socketPromise('getSelectedPartnerCommissionPreview', {platformObjId: vm.selectedPlatform.id, partnerName: partnerName}).then(data => {
                    console.log('getSelectedPartnerCommissionPreview', data);
                    $scope.$evalAsync(() => {
                        vm.selectedPartnerCommissionPreview = data && data.data ? data.data : false;
                    });
                });
            };

            vm.showActivePartnerInfoModal = function (partnerObjId, activeType) {

                vm.selectedPartnerObjArr = {}
                switch(activeType){
                    case "DAILY_ACTIVE":
                        vm.selectedPartnerObjArr.title = "Daily Active Player";
                        vm.selectedPartnerObjArr.data =  vm.partners.find(p => p._id == partnerObjId).dailyActivePlayerObjArr || [];
                        vm.selectedPartnerObjArr.size = vm.partners.find(p => p._id == partnerObjId).dailyActivePlayerObjArr && vm.partners.find(p => p._id == partnerObjId).dailyActivePlayerObjArr.length ? vm.partners.find(p => p._id == partnerObjId).dailyActivePlayerObjArr.length : 0;
                        break;
                    case "WEEKLY_ACTIVE":
                        vm.selectedPartnerObjArr.title = "Weekly Active Player";
                        vm.selectedPartnerObjArr.data =  vm.partners.find(p => p._id == partnerObjId).weeklyActivePlayerObjArr || [];
                        vm.selectedPartnerObjArr.size = vm.partners.find(p => p._id == partnerObjId).weeklyActivePlayerObjArr && vm.partners.find(p => p._id == partnerObjId).weeklyActivePlayerObjArr.length ? vm.partners.find(p => p._id == partnerObjId).weeklyActivePlayerObjArr.length : 0;
                        break;
                    case "MONTHLY_ACTIVE":
                        vm.selectedPartnerObjArr.title = "Monthly Active Player";
                        vm.selectedPartnerObjArr.data =  vm.partners.find(p => p._id == partnerObjId).monthlyActivePlayerObjArr || [];
                        vm.selectedPartnerObjArr.size = vm.partners.find(p => p._id == partnerObjId).monthlyActivePlayerObjArr && vm.partners.find(p => p._id == partnerObjId).monthlyActivePlayerObjArr.length ? vm.partners.find(p => p._id == partnerObjId).monthlyActivePlayerObjArr.length : 0;
                        break;
                    case "VALID_ACTIVE":
                        vm.selectedPartnerObjArr.title = "Valid Active Player";
                        vm.selectedPartnerObjArr.data =  vm.partners.find(p => p._id == partnerObjId).validActivePlayerObjArr || [];
                        vm.selectedPartnerObjArr.size =  vm.partners.find(p => p._id == partnerObjId).validActivePlayerObjArr && vm.partners.find(p => p._id == partnerObjId).validActivePlayerObjArr.length ? vm.partners.find(p => p._id == partnerObjId).validActivePlayerObjArr.length : 0;
                        break;
                }

                $('#modalActivePartnerInfo').modal().show();
            };

            vm.getProvince = function (curProvince) {
                vm.showProvinceStr = '';
                let province = curProvince ? curProvince : vm.selectedSinglePartner && vm.selectedSinglePartner.bankAccountProvince ? vm.selectedSinglePartner.bankAccountProvince : '';
                $scope.getProvinceStr(province).then(data => {
                    vm.showProvinceStr = data.data.province ? data.data.province.name : province;
                    $scope.safeApply();
                }, err => {
                    vm.showProvinceStr = province || $translate("Unknown");
                    $scope.safeApply();
                });
            };

            vm.getCity = function (curCity) {
                vm.showCityStr = '';
                let city = curCity ? curCity : vm.selectedSinglePartner && vm.selectedSinglePartner.bankAccountCity ? vm.selectedSinglePartner.bankAccountCity : '';
                $scope.getCityStr(city).then(data => {
                    vm.showCityStr = data.data.city ? data.data.city.name : city;
                    $scope.safeApply();
                }, err => {
                    vm.showCityStr = city || $translate("Unknown");
                    $scope.safeApply();
                });
            };

            vm.getDistrict = function (curDistrict) {
                vm.showDistrictStr = '';
                let district = curDistrict ? curDistrict : vm.selectedSinglePartner && vm.selectedSinglePartner.bankAccountDistrict ? vm.selectedSinglePartner.bankAccountDistrict : '';
                $scope.getDistrictStr(district).then(data => {
                    vm.showDistrictStr = data.data.district ? data.data.district.name : district;
                    $scope.safeApply();
                }, err => {
                    vm.showProvinceStr = district || $translate("Unknown");
                    $scope.safeApply();
                });
            }

            //Create new partner
            vm.prepareCreatePartner = function () {
                vm.partnerDOB = utilService.createDatePicker('#datepickerPartnerDOB', {
                    language: 'en',
                    format: 'yyyy/MM/dd',
                    endDate: new Date(),
                    maxDate: new Date()
                });
                vm.partnerDOB.data('datetimepicker').setDate(utilService.getLocalTime(new Date("January 01, 1990")));

                vm.newPartner = {};
                vm.newPartner.gender = "true";
                vm.tempPassword = "";
                vm.partnerValidity = {};
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
                vm.newPartner.DOB = vm.partnerDOB.data('datetimepicker').getLocalDate();
                vm.newPartner.DOB = vm.newPartner.DOB.toISOString();
                vm.newPartner.gender = (vm.newPartner.gender && vm.newPartner.gender == "true") ? true : false;
                if (vm.newPartner.commissionType) {
                    vm.newPartner.commissionType = Number(vm.newPartner.commissionType);
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

            vm.initFeedbackModal = function (partnerObjId) {
                let rowData = vm.partners.find(p => String(p._id) === partnerObjId);
                if (rowData && rowData.partnerId) {
                    $scope.$evalAsync(() => {
                        $('#addPartnerFeedbackTab').addClass('active');
                        $('#partnerFeedbackHistoryTab').removeClass('active');
                    });
                    vm.feedbackModalTabPartner = "addPartnerFeedbackPanel";
                }
            };

            // Add / Delete Feedback Topic & Feedback Result
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
                    reqData.platform = vm.selectedPlatform.id;
                    console.log(reqData);
                    return $scope.$socketPromise('createPlayerFeedbackTopic', reqData).then(
                        () => $scope.$evalAsync(async () => {
                            vm.addPlayerFeedbackTopicData.message = "SUCCESS";
                            vm.addPlayerFeedbackTopicData.success = true;
                            vm.playerFeedbackTopic = await commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([]));
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
                    reqData.platform = vm.selectedPlatform.id;
                    console.log(reqData);
                    return $scope.$socketPromise('createPartnerFeedbackTopic', reqData).then(
                        () => $scope.$evalAsync(async () => {
                            vm.addPartnerFeedbackTopicData.message = "SUCCESS";
                            vm.addPartnerFeedbackTopicData.success = true;
                            vm.partnerFeedbackTopic = await commonService.getPartnerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([]));
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
                            vm.playerFeedbackTopic = await commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([]));
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
                            vm.partnerFeedbackTopic = await commonService.getPartnerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([]));
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
            // End Add / Delete Feedback Topic & Feedback Result

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
                        commonPageChangeHandler(curP, pageSize, "duplicatePhoneNumber", vm.loadPhoneNumberRecord);
                    });
                    vm.loadPhoneNumberRecord(true);
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
                    platformId: vm.selectedPlatform.id,
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

            //check if value is pass in before data table function is call
            vm.onClickPartnerCheck = function (recordId, callback, param) {
                if (!(param instanceof Array)) {
                    param = param ? [param] : [];
                }

                if (vm.currentSelectedPartnerObjId && recordId === vm.currentSelectedPartnerObjId) {
                    callback.apply(null, param);
                }
                else {
                    setTimeout(function () {
                        vm.onClickPartnerCheck(recordId, callback, param);
                    }, 50);
                }
            };

            vm.tabClicked = function (tab) {
                vm.editPartnerSelectedTab = tab;
            }

            vm.openEditPartnerDialog = function (selectedTab) {
                vm.editPartnerSelectedTab = "";
                vm.editPartnerSelectedTab = selectedTab ? selectedTab.toString() : "basicInfo";
                vm.prepareEditCritical('partner');
                vm.prepareEditPartnerPayment();
                vm.tabClicked(selectedTab);
                vm.partnerValidity = {};
                dialogDetails();

                function dialogDetails() {
                    let selectedPartner = vm.isOneSelectedPartner();
                    let editPartner = vm.editPartner;
                    vm.editPartner.DOB = new Date(vm.editPartner.DOB);
                    vm.selectedCommissionTab(
                        $scope.constPartnerCommissionSettlementType[vm.editPartner.commissionType],
                        selectedPartner._id
                    );
                    vm.commissionRateConfig = jQuery.extend(true, {}, vm.srcCommissionRateConfig);
                    vm.commissionRateConfig.isEditing = vm.commissionRateConfig.isEditing || {};
                    vm.partnerCommissionObj = {};
                    vm.partnerCommissionObj.data = commonService.applyPartnerCustomRate(selectedPartner._id, vm.partnerCommission, vm.customPartnerCommission);
                    vm.commissionSettingIsEditAll = {};
                    vm.commissionRateIsEditAll = false;

                    let option = {
                        $scope: $scope,
                        $compile: $compile,
                        childScope: {
                            editPartnerPermission: $scope.checkViewPermission('Partner', 'Partner', 'Edit'),
                            editPartnerContactPermission: $scope.checkViewPermission('Partner', 'Partner', 'EditContact'),
                            editPartnerWithdrawPermission: $scope.checkViewPermission('Partner', 'Partner', 'BankDetail'),
                            editPartnerCommissionPermission: $scope.checkViewPermission('Partner', 'Partner', 'EditCommission'),
                            selectedTab: vm.editPartnerSelectedTab,
                            tabClicked: vm.tabClicked,
                            modifyCritical: vm.modifyCritical,
                            verifyPartnerPhoneNumber: vm.verifyPartnerPhoneNumber,
                            platformPageName: vm.platformPageName,
                            prepareEditCritical: vm.prepareEditCritical,
                            submitCriticalUpdate: vm.submitCriticalUpdate,
                            isEditingPartnerPayment: vm.isEditingPartnerPayment,
                            checkPartnerField: vm.checkPartnerField,
                            partnerValidity: vm.partnerValidity,
                            checkOwnDomain: vm.checkOwnDomain,
                            partnerPayment: vm.partnerPayment,
                            allBankTypeList: vm.allBankTypeList,
                            filteredBankTypeList: vm.filteredBankTypeList,
                            filterBankName: vm.filterBankName,
                            isEditingPartnerPaymentShowVerify: vm.isEditingPartnerPaymentShowVerify,
                            partnerCommission: vm.partnerCommissionObj.data,
                            commissionSettingTab: vm.commissionSettingTab,
                            playerConsumptionTableHeader: vm.playerConsumptionTableHeader,
                            rateAfterRebatePromo: vm.rateAfterRebatePromo,
                            rateAfterRebatePlatform: vm.rateAfterRebatePlatform,
                            rateAfterRebateGameProviderGroup: vm.rateAfterRebateGameProviderGroup,
                            rateAfterRebateTotalDeposit: vm.rateAfterRebateTotalDeposit,
                            rateAfterRebateTotalWithdrawal: vm.rateAfterRebateTotalWithdrawal,
                            commissionRateConfig: commonService.applyPartnerCustomRate(selectedPartner._id, vm.commissionRateConfig, vm.custCommissionRateConfig),
                            commissionSettingEditRow: vm.commissionSettingEditRow,
                            commissionSettingEditAll: vm.commissionSettingEditAll,
                            commissionSettingIsEditAll: vm.getCommissionSettingIsEditAll,
                            commissionSettingCancelRow: vm.commissionSettingCancelRow,
                            selectedCommissionTab: vm.selectedCommissionTab,
                            customizeCommissionRate: vm.customizeCommissionRate,
                            customizeCommissionRateAll: vm.customizeCommissionRateAll,
                            isDetectChangeCustomizeCommissionRate: vm.isDetectChangeCustomizeCommissionRate,
                            updateAllCustomizeCommissionRate: vm.updateAllCustomizeCommissionRate,
                            resetAllCustomizedCommissionRate: vm.resetAllCustomizedCommissionRate,
                            customizePartnerRate: vm.customizePartnerRate,
                            commissionRateEditRow: vm.commissionRateEditRow,
                            commissionRateEditAll: vm.commissionRateEditAll,
                            commissionRateIsEditAll: vm.getCommissionRateIsEditAll,
                            currentProvince: vm.currentProvince,
                            provinceList: vm.provinceList,
                            changeProvince: vm.changeProvince,
                            currentCity: vm.currentCity,
                            cityList: vm.cityList,
                            changeCity: vm.changeCity,
                            currentDistrict: vm.currentDistrict,
                            districtList: vm.districtList,
                            verifyPartnerBankAccount: vm.verifyPartnerBankAccount,
                            updatePartnerPayment: vm.updatePartnerPayment,
                            today: new Date().toISOString(),
                            commissionType: vm.constPartnerCommisionType,
                            partnerId: selectedPartner._id,
                            isIdInList: commonService.isIdInList,
                            partnerBeforeEditing: _.clone(editPartner),
                            newPartner: _.clone(editPartner),
                            updateEditedPartner: function () {
                                // this ng-model has to be in date object
                                this.newPartner.DOB = new Date(this.newPartner.DOB);
                                if (this.newPartner.playerName) {
                                    if (vm.partnerValidity && vm.partnerValidity.player && Object.keys(vm.partnerValidity.player).length > 0)
                                        this.newPartner.player = vm.partnerValidity.player.id;
                                }
                                sendPartnerUpdate(this.partnerId, this.partnerBeforeEditing, this.newPartner, selectedPartner.permission);
                            },
                            checkDuplicatedBankAccount: function (partnerPaymentData){

                                if (partnerPaymentData.newBankAccount == selectedPartner.bankAccount){
                                    partnerPaymentData.invalid = false;
                                    partnerPaymentData.showAlert = false;
                                }
                                else {
                                    if (partnerPaymentData.newBankAccount && partnerPaymentData.newBankAccount.length) {

                                        socketService.$socket($scope.AppSocket, 'checkDuplicatedPartnerBankAccount', {
                                            bankAccount: partnerPaymentData.newBankAccount,
                                            platform: vm.selectedPlatform.id
                                        }, function (data) {
                                            if (data && data.data) {
                                                if (partnerPaymentData.newBankAccount.length >= 16 && partnerPaymentData.newBankAccount.length <= 19) {
                                                    partnerPaymentData.invalid = false;
                                                    if (partnerPaymentData.newBankAccount.match(/[a-z]/i)){
                                                        partnerPaymentData.invalid = true;
                                                    }
                                                }
                                                else {
                                                    partnerPaymentData.invalid = true;
                                                }

                                                partnerPaymentData.showAlert = false;
                                                $scope.$evalAsync();

                                            }
                                            else {
                                                partnerPaymentData.showAlert = true;
                                                partnerPaymentData.invalid = true;
                                                partnerPaymentData.alertMsg = "The same bank account has been registered";
                                                $scope.$evalAsync();
                                            }

                                        })
                                    }
                                    else {
                                        playerPaymentData.invalid = false;
                                        playerPaymentData.showAlert = false;
                                    }
                                }
                            },
                        }
                    };

                    option.childScope.activePlayerTableHeader = getActivePlayerTableHeader(option.childScope.commissionSettingTab);

                    option.childScope.prepareEditPartnerPayment = function () {
                        vm.prepareEditPartnerPayment();
                        this.isEditingPartnerPayment = vm.isEditingPartnerPayment;
                        this.partnerPayment = vm.partnerPayment;
                        this.allBankTypeList = vm.allBankTypeList;
                        this.filteredBankTypeList = vm.filteredBankTypeList;
                        this.filterBankName = vm.filterBankName;
                        this.isEditingPartnerPaymentShowVerify = vm.isEditingPartnerPaymentShowVerify;
                    };
                    $('#dialogEditPartner').floatingDialog(option);
                    $('#dialogEditPartner').focus();
                    $scope.safeApply();
                };
            };

            vm.partnerPaymentKeys = [
                "bankName", "bankAccount", "encodedBankAccount", "bankAccountName", "bankAccountType", "bankAccountProvince", "bankAccountCity", "bankAccountDistrict", "bankAddress", "bankBranch"
            ];

            vm.prepareEditPartnerPayment = function () {
                return new Promise(function (resolve) {
                    console.log('partnerID', vm.isOneSelectedPartner()._id);
                    if (!vm.currentCity) {
                        vm.currentCity = {};
                    }
                    if (!vm.currentProvince) {
                        vm.currentProvince = {};
                    }
                    if (!vm.currentDistrict) {
                        vm.currentDistrict = {};
                    }
                    vm.isEditingPartnerPayment = false;
                    vm.isEditingPartnerPaymentShowVerify = false;
                    vm.partnerPayment = utilService.assignObjKeys(vm.isOneSelectedPartner(), vm.partnerPaymentKeys);
                    vm.partnerPayment.bankAccountName = (vm.partnerPayment.bankAccountName) ? vm.partnerPayment.bankAccountName : vm.isOneSelectedPartner().realName;
                    vm.partnerPayment.newBankAccount = vm.partnerPayment.encodedBankAccount;
                    vm.partnerPayment.showNewAccountNo = false;
                    vm.filteredBankTypeList = $.extend({}, vm.allBankTypeList);
                    vm.filterBankName = '';
                    vm.currentProvince.province = vm.partnerPayment.bankAccountProvince;
                    vm.currentCity.city = vm.partnerPayment.bankAccountCity;
                    vm.currentDistrict.district = vm.partnerPayment.bankAccountDistrict;
                    socketService.$socket($scope.AppSocket, 'getProvinceList', {}, function (data) {
                        if (data) {
                            vm.provinceList.length = 0;
                            for (let i = 0, len = data.data.provinces.length; i < len; i++) {
                                let province = data.data.provinces[i];
                                province.id = province.id.toString();
                                vm.provinceList.push(province);
                            }
                            vm.changeProvince(false);
                            vm.changeCity(false);
                            $scope.safeApply();
                            resolve(vm.provinceList);
                        }
                    }, null, true);
                    $scope.safeApply();
                })
            };

            vm.verifyPartnerBankAccount = function () {
                socketService.$socket($scope.AppSocket, 'verifyPartnerBankAccount', {
                    partnerObjId: vm.selectedSinglePartner._id,
                    bankAccount: vm.partnerPayment.verifyBankAccount
                }, function (data) {
                    console.log("verifyPartnerBankAccount:", data);
                    vm.partnerPayment.correctVerifyBankAccount = data.data;
                    $scope.safeApply();
                });
            };

            function sendPartnerUpdate(partnerId, oldPartnerData, newPartnerData, partnerPermission) {
                var updateData = newAndModifiedFields(oldPartnerData, newPartnerData);
                let updatedKeys = Object.keys(updateData);
                var updateBankData = {};

                delete updateData.verifyPhoneNumber;
                delete updateData.correctVerifyPhoneNumber;

                if (Object.keys(updateData).length > 0) {
                    updateData._id = partnerId;
                    var isUpdate = false;
                    let isRealName = false;
                    let realNameObj = {
                        isPartner: true
                    };
                    updateData.partnerName = newPartnerData.name || vm.editPartner.name;
                    updatedKeys.forEach(function (key) {
                        if (key == "bankCardGroup" || key == "alipayGroup" || key == "wechatPayGroup" || key == "merchantGroup" || key == "quickPayGroup" || key == "referralName") {
                            //do nothing
                        } else if(key == "realName"){
                            isRealName = true;
                            realNameObj.realName = updateData.realName;
                            delete updateData.realName;
                        } else {
                            isUpdate = true;
                        }
                    });

                    if (vm.editPartnerSelectedTab != 'commissionInfo') {
                        delete updateData.commissionType;
                    }

                    updateData.remark = "";
                    if (updateData.DOB) {
                        if (updateData.remark) {
                            updateData.remark += ", ";
                        }
                        updateData.remark += $translate("DOB");
                    }
                    if (updateData.hasOwnProperty("gender")) {
                        if (updateData.remark) {
                            updateData.remark += ", ";
                        }
                        updateData.remark += $translate("GENDER");
                    }
                    if (updateData.commissionType) {
                        if (updateData.remark) {
                            updateData.remark += ", ";
                        }
                        updateData.remark += $translate(vm.commissionType[updateData.commissionType]);
                    }
                    if (updateData.ownDomain) {
                        updateData.ownDomain = updateData.ownDomain.split('\n');

                        if (updateData.remark) {
                            updateData.remark += ", ";
                        }
                        updateData.remark += $translate("own domain");
                    }
                    if (updateData.player) {
                        if (updateData.remark) {
                            updateData.remark += ", ";
                        }
                        updateData.remark += $translate("Bind Player");
                    }

                    if (isUpdate) {
                        if (updateData) {
                            updateData.updateData = $.extend({}, updateData);
                            updateData.partnerObjId = partnerId;
                            updateData.partnerName = vm.selectedSinglePartner.partnerName;
                        }

                        let updateString = 'createUpdatePartnerInfoProposal';
                        if (vm.editPartnerSelectedTab == 'commissionInfo') {
                            updateString = 'createUpdatePartnerCommissionTypeProposal';
                        }

                        socketService.$socket($scope.AppSocket, updateString, {
                            creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                            data: updateData,
                            platformId: vm.selectedPlatform.id
                        }, function (data) {
                            if (data.data && data.data.stepInfo) {
                                socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                            }
                            vm.getPlatformPartnersData();
                        }, null, true);
                    }

                    if (isRealName) {
                        if (realNameObj) {
                            realNameObj.updateData = $.extend({}, realNameObj);
                            realNameObj.partnerObjId = partnerId;
                            realNameObj.partnerName = vm.selectedSinglePartner.partnerName;
                        }

                        socketService.$socket($scope.AppSocket, "createUpdatePartnerRealNameProposal", {
                            creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                            data: realNameObj,
                            platformId: vm.selectedPlatform.id,
                            partnerId: vm.isOneSelectedPartner().partnerId
                        }, function (data) {
                            if (data.data && data.data.stepInfo) {
                                socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                            }
                            vm.getPlatformPartnersData();
                        }, null, true);
                    }
                }
                if (Object.keys(updateBankData).length > 0) {
                    socketService.$socket($scope.AppSocket, 'updatePartner', {
                        query: {_id: partnerId},
                        updateData: updateBankData
                    }, function (updated) {
                        console.log('updated', updated);
                        vm.getPlatformPlayersData();
                    });
                }
            };

            vm.updatePartnerPayment = function () {
                if (vm.currentDistrict && Object.keys(vm.currentDistrict).length) {
                    if (vm.partnerPayment && vm.partnerPayment.bankAccountDistrict) {
                        vm.partnerPayment.bankAccountDistrict = vm.currentDistrict.district;
                    }
                }

                if (vm.currentCity && Object.keys(vm.currentCity).length) {
                    if (vm.partnerPayment && vm.partnerPayment.bankAccountCity) {
                        vm.partnerPayment.bankAccountCity = vm.currentCity.city;
                    }
                }

                if (vm.currentProvince && Object.keys(vm.currentProvince).length) {
                    if (vm.partnerPayment && vm.partnerPayment.bankAccountProvince) {
                        vm.partnerPayment.bankAccountProvince = vm.currentProvince.province;
                    }
                }

                console.log('before after', vm.selectedSinglePartner, vm.partnerPayment);

                delete vm.partnerPayment.verifyBankAccount;
                delete vm.partnerPayment.correctVerifyBankAccount;

                var result = socketService.$compareObj(vm.selectedSinglePartner, vm.partnerPayment);

                var sendData = {
                    creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                    platformId: vm.selectedPlatform.id,
                    data: {
                        partnerName: vm.selectedSinglePartner.partnerName,
                        _id: vm.selectedSinglePartner._id,
                        partnerId: vm.selectedSinglePartner.partnerId,
                        bankAccount: vm.partnerPayment.bankAccount,
                        bankAccountName: vm.partnerPayment.bankAccountName,
                        bankName: vm.partnerPayment.bankName,
                        bankAccountType: vm.partnerPayment.bankAccountType,
                        bankAccountProvince: vm.currentProvince.province,
                        bankAccountCity: vm.currentCity.city,
                        bankAccountDistrict: vm.currentDistrict.district,
                        bankAddress: vm.partnerPayment.bankAddress,
                        curData: result.before,
                        updateData: result.after
                    }
                }

                if (sendData.data && sendData.data.updateData && sendData.data.updateData.newBankAccount && vm.selectedSinglePartner && vm.selectedSinglePartner.encodedBankAccount
                    && (sendData.data.updateData.newBankAccount != vm.selectedSinglePartner.encodedBankAccount)) {
                    sendData.data.bankAccount = sendData.data.updateData.newBankAccount;
                    sendData.data.updateData.bankAccount = sendData.data.updateData.newBankAccount;
                    sendData.data.curData.bankAccount = vm.selectedSinglePartner.bankAccount;
                } else if (!vm.selectedSinglePartner.encodedBankAccount) {
                    sendData.data.bankAccount = sendData.data.updateData.newBankAccount;
                }

                delete sendData.data.curData.newBankAccount;
                delete sendData.data.curData.showNewAccountNo;
                delete sendData.data.updateData.newBankAccount;
                delete sendData.data.updateData.showNewAccountNo;

                console.log('sendData', sendData);

                socketService.$socket($scope.AppSocket, 'createUpdatePartnerBankInfoProposal', sendData, function (data) {
                    console.log('valid', data);
                    if (data.data && data.data.stepInfo) {
                        socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                    }
                    vm.getPlatformPartnersData();
                    vm.refreshPartnerBankInfo();
                    $scope.safeApply();
                });
            };

            vm.verifyPartnerPhoneNumber = function () {
                socketService.$socket($scope.AppSocket, 'verifyPartnerPhoneNumber', {
                    partnerObjId: vm.isOneSelectedPartner()._id,
                    phoneNumber: vm.modifyCritical.verifyPhoneNumber
                }, function (data) {
                    console.log("verifyPartnerPhoneNumber:", data);
                    vm.modifyCritical.correctVerifyPhoneNumber = data.data;
                    $scope.safeApply();
                });
            };

            vm.getPartnerInfoHistory = function () {
                vm.partnerInfoHistoryCount = 0;
                $scope.$socketPromise('getProposalTypeByType', {
                    platformId: vm.selectedSinglePartner.platform,
                    type: "UPDATE_PARTNER_INFO"
                })
                    .then(data => {

                        let sendData = {
                            type: data.data._id,
                            partnerObjId: vm.selectedSinglePartner._id,
                        };
                        socketService.$socket($scope.AppSocket, 'getProposalByPartnerIdAndType', sendData, function (data) {
                            console.log('partnerInfo', data);
                            var drawData = data.data.map(item => {
                                item.createTime$ = vm.dateReformat(item.createTime);
                                item.realName$ = item.data.realName ? item.data.realName : $translate('UNCHANGED');
                                item.DOB$ = item.data.DOB ? utilService.getFormatDate(item.data.DOB) : $translate('UNCHANGED');
                                item.gender$ = item.data.gender === undefined ? $translate('UNCHANGED') : item.data.gender ? $translate('Male') : $translate('Female');
                                item.updatePassword$ = item.data.updatePassword ? $translate('CHANGED') : $translate('UNCHANGED');
                                item.commissionType$ = item.data.commissionType ? $translate('CHANGED') : $translate('UNCHANGED');
                                return item;
                            })
                            vm.partnerInfoHistoryCount = data.data.length;
                            vm.drawPartnerInfoHistory(drawData);
                        }, null, true);
                        $('#modalPartnerInfoHistory').modal();
                    })
            };

            vm.drawPartnerInfoHistory = function (tblData) {
                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    order: [[1, 'desc']],
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('PROPOSAL_NO'), data: "proposalId"},
                        {title: $translate('CREATION TIME'), data: "createTime$"},
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
                        {title: $translate('REAL_NAME'), data: "realName$"},
                        {title: $translate('DOB'), data: "DOB$"},
                        {title: $translate('GENDER'), data: "gender$"},
                        {title: $translate('WEBSITE_PASS'), data: "updatePassword$"},
                        {
                            "title": $translate('STATUS'),
                            "data": 'process',
                            render: function (data, type, row) {
                                let text = $translate(row.status ? row.status : (data.status ? data.status : 'UNKNOWN'));
                                text = text === "approved" ? "Approved" : text;

                                let textClass = '';
                                let fontStyle = {};
                                if (row.status === 'Pending') {
                                    textClass = "text-danger";
                                    fontStyle = {'font-weight': 'bold'};
                                }

                                let $link = $('<span>').text(text).addClass(textClass).css(fontStyle);
                                return $link.prop('outerHTML');
                            },
                        }
                    ],
                    "paging": true,
                });
                var aTable = $("#partnerInfoHistoryTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                $('#partnerInfoHistoryTbl').resize();
                $scope.safeApply();
            };

            vm.getPartnerContactHistory = function () {
                vm.partnerContactHistoryCount = 0;
                let sendData = {
                    adminId: authService.adminId,
                    platformId: vm.selectedSinglePartner.platform,
                    type: ["UpdatePartnerEmail", "UpdatePartnerPhone", "UpdatePartnerQQ", "UpdatePartnerWeChat"],
                    size: 2000,
                    status: vm.allProposalStatus,
                    partnerId: vm.selectedSinglePartner._id
                };

                socketService.$socket($scope.AppSocket, 'getQueryProposalsForAdminId', sendData, function (data) {
                    console.log('partnercontact', data);

                    var drawData = data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        if (item.data.curData) {
                            item.contentBeforeEdited = item.data.curData[Object.keys(item.data.curData)[0]];
                        } else {
                            item.contentBeforeEdited = '';
                        }
                        if (item.data.updateData) {
                            item.fieldEdited = Object.keys(item.data.updateData)[0];
                            item.contentEdited = item.data.updateData[Object.keys(item.data.updateData)[0]];
                        }
                        return item;
                    })
                    vm.partnerContactHistoryCount = data.data.data.length;
                    vm.drawPartnerContactHistory(drawData);
                }, null, true);
                $('#modalPartnerContactHistory').modal();
            }

            vm.drawPartnerContactHistory = function (tblData) {

                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('PROPOSAL_NO'), data: "proposalId"},
                        {title: $translate('CREATION TIME'), data: "createTime$"},
                        {
                            title: $translate('CREATOR'),
                            data: null,
                            render: function (data, type, row) {
                                if (data.hasOwnProperty('creator')) {
                                    return data.creator.name;
                                } else {
                                    var creator = $translate('System');
                                    if (data && data.data && data.data.partnerName) {
                                        creator += "(" + data.data.partnerName + ")";
                                    }
                                    return creator;
                                }
                            }
                        },
                        {title: $translate('CONTENT_CHANGED'), data: "fieldEdited"},
                        {title: $translate('curData'), data: "contentBeforeEdited"},
                        {title: $translate('updateData'), data: "contentEdited"},
                        {
                            "title": $translate('STATUS'),
                            "data": 'process',
                            render: function (data, type, row) {
                                let text = $translate(row.status ? row.status : (data.status ? data.status : 'UNKNOWN'));
                                text = text === "approved" ? "Approved" : text;

                                let textClass = '';
                                let fontStyle = {};
                                if (row.status === 'Pending') {
                                    textClass = "text-danger";
                                    fontStyle = {'font-weight': 'bold'};
                                }

                                let $link = $('<span>').text(text).addClass(textClass).css(fontStyle);
                                return $link.prop('outerHTML');
                            },
                        }
                    ],
                    "paging": true,
                });
                var aTable = $("#partnerContactHistoryTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                $('#partnerContactHistoryTbl').resize();
                $scope.safeApply();
            }

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
            // vm.preUpdatePartner = function () {
            //     vm.newPartner = $.extend({}, vm.selectedSinglePartner);
            //     vm.newPartner.ownDomain$ = vm.newPartner.ownDomain.join('\n');
            //     vm.newPartner.registrationTime$ = vm.dateReformat(vm.newPartner.registrationTime);
            //     vm.isEditingPartner = false;
            //     vm.partnerValidity = {};
            //     vm.tempPlayerId = null;
            //     vm.partnerParentChange("id");
            //     if (vm.newPartner.player) {
            //         vm.getPlayerInfo({_id: vm.newPartner.player});
            //     }
            //     // $scope["form_edit_partner"].$setValidity('invalidOwnDomain', false)
            //     $scope.safeApply();
            // }
            // vm.updatePartner = function () {
            //     if (vm.selectedSinglePartner) {
            //         delete vm.newPartner.phoneNumber;
            //         if (vm.tempPlayerId && vm.partnerValidity.player.validPlayerId
            //             && vm.partnerValidity.player.exists === false && vm.partnerValidity.player.playerId == vm.tempPlayerId) {
            //             vm.newPartner.player = vm.partnerValidity.player.id;
            //         }
            //         if (vm.newPartner.ownDomain$) {
            //             vm.newPartner.ownDomain = vm.newPartner.ownDomain$.split('\n');
            //         } else {
            //             vm.newPartner.ownDomain = [];
            //         }
            //         delete vm.newPartner.ownDomain$;
            //         delete vm.newPartner.registrationTime$;
            //         delete vm.newPartner.parentName;
            //         var updateData = newAndModifiedFields(vm.selectedSinglePartner, vm.newPartner);
            //         updatePartnerData(vm.selectedSinglePartner._id, updateData);
            //     }
            // };
            //
            // function updatePartnerData(partnerId, newData) {
            //     if (newData) {
            //         newData.updateData = $.extend({}, newData);
            //         newData.partnerObjId = partnerId;
            //         newData.partnerName = vm.selectedSinglePartner.partnerName;
            //     }
            //     socketService.$socket($scope.AppSocket, 'createUpdatePartnerInfoProposal', {
            //         creator: {type: "admin", name: authService.adminName, id: authService.adminId},
            //         data: newData,
            //         platformId: vm.selectedPlatform.id
            //
            //     }, function (data) {
            //         if (data.data && data.data.stepInfo) {
            //             socketService.showProposalStepInfo(data.data.stepInfo, $translate);
            //         }
            //         vm.getPlatformPartnersData();
            //     }, null, true);
            // }

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
                    partner: vm.selectedSinglePartner._id,
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
                if (value != '') {
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
                                    validPlayerName: data.data.valid,
                                    exists: data.data.exists,
                                    id: data.data.player_id,
                                    playerId: value
                                }
                            }
                        } else {
                            vm.partnerValidity[fieldName] = false;
                        }

                        if (vm.partnerValidity && vm.partnerValidity.player) {
                            form.$setValidity('invalidPartnerPlayer', vm.partnerValidity.player.validPlayerName);
                        } else {
                            form.$setValidity('invalidPartnerPlayer', vm.partnerValidity[fieldName]);
                        }
                        $scope.safeApply();
                    });
                }else{
                    vm.partnerValidity = {};
                    form.$setValidity('invalidPartnerPlayer', true);
                }
            }

            vm.initPartnerApiLog = function () {
                vm.partnerApiLog = {totalCount: 0, limit: 10, index: 0};
                vm.partnerApiLog.apiAction = "login";
                utilService.actionAfterLoaded('#modalPartnerApiLog.in #partnerApiLogQuery .endTime', function () {
                    vm.partnerApiLog.startDate = utilService.createDatePicker('#partnerApiLogQuery .startTime');
                    vm.partnerApiLog.endDate = utilService.createDatePicker('#partnerApiLogQuery .endTime');
                    vm.partnerApiLog.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    vm.partnerApiLog.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.partnerApiLog.pageObj = utilService.createPageForPagingTable("#partnerApiLogTblPage", {}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "partnerApiLog", vm.getPartnerApiLogData);
                    });
                    vm.getPartnerApiLogData(true);
                });
            };

            vm.getPartnerApiLogData = function (newSearch) {
                vm.loadingPartnerApiLogTable = true;
                if (!authService.checkViewPermission('Partner', 'Partner', 'partnerApiLog')) {
                    vm.loadingPartnerApiLogTable = false;
                    return;
                }

                let sendQuery = {
                    partnerObjId: vm.selectedSinglePartner._id,
                    startDate: vm.partnerApiLog.startDate.data('datetimepicker').getLocalDate(),
                    endDate: vm.partnerApiLog.endDate.data('datetimepicker').getLocalDate(),
                    index: newSearch ? 0 : vm.partnerApiLog.index,
                    limit: newSearch ? 10 : vm.partnerApiLog.limit,
                    sortCol: vm.partnerApiLog.sortCol || null
                };

                socketService.$socket($scope.AppSocket, 'getPartnerApiLog', sendQuery, function (data) {
                    console.log("getPartnerApiLog", data);
                    let tblData = data && data.data ? data.data.data.map(item => {
                        item.loginTime$ = vm.dateReformat(item.loginTime);
                        //item.action$ = $translate(item.action);
                        return item;
                    }) : [];
                    let total = data.data ? data.data.total : 0;
                    vm.partnerApiLog.totalCount = total;
                    vm.drawPartnerApiLogTable(newSearch, tblData, total);
                    vm.loadingPartnerApiLogTable = false;
                    $scope.$evalAsync();
                });
            };

            vm.drawPartnerApiLogTable = function (newSearch, tblData, size) {
                let tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('LOGIN_TIME'), data: "loginTime$"},
                        {title: $translate('IP_ADDRESS'), data: "loginIP"}
                    ],
                    "paging": false,
                });
                let aTable = $("#partnerApiLogTbl").DataTable(tableOptions);
                aTable.columns.adjust().draw();
                vm.partnerApiLog.pageObj.init({maxCount: size}, newSearch);
                $('#partnerApiLogTbl').resize();
                $('#partnerApiLogTbl').off('order.dt');
                $('#partnerApiLogTbl').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'partnerApiLog', vm.getPartnerApiLogData);
                });

                $scope.safeApply();
            };

            vm.getGenderFromBool = function (genderBool) {
                if (genderBool === true) {
                    return "Male";
                }
                else if (genderBool === false) {
                    return "Female";
                }
                else {
                    return "";
                }
            }

            vm.convertDOBFormat = function (DOBDate) {
                // conversion to new Date() from ISOString date format by using toLocaleString() will have delay after year 1982
                // the delay will result wrong displaying date
                // solution to this: generat the string format from new Date() by using basic functions (getFullYear(), geMonth(), getDate())
                if (DOBDate) {

                    let displayedDOB = new Date(DOBDate);
                    var y = displayedDOB.getFullYear();
                    var m = displayedDOB.getMonth() + 1;
                    if (m < 10) {
                        m = '0' + m;
                    }

                    var d = displayedDOB.getDate();
                    if (d < 10) {
                        d = '0' + d;
                    }

                    return y + "-" + m + "-" + d
                    // return utilService.getFormatTime(DOBDate).slice(0, 10);
                }

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

            vm.initResetPartnerPasswordModal = () => {
                vm.customNewPassword = "888888";
                vm.newPartner=vm.selectedSinglePartner;
                vm.partnerNewPassword = false;
            };

            vm.submitResetPartnerPassword = function () {
                let sendData = {
                    _id: vm.selectedSinglePartner._id,
                    platform: vm.selectedPlatform.id,
                    newPassword: vm.customNewPassword,
                };

                socketService.$socket($scope.AppSocket, 'resetPartnerPassword', sendData, function (data) {
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
                        commonPageChangeHandler(curP, pageSize, "totalReferralPlayer", vm.getPagePartnerReferralPlayers)
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

            }
            vm.getPartnerReferralPlayers = function (src, callback) {
                console.log('src', {partnerObjId: src._id});
                socketService.$socket($scope.AppSocket, 'getPartnerReferralPlayers', {partnerObjId: src._id}, function (data) {
                    console.log('referral', data);
                    vm.referralPartner = data.data;
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
                    bonusId: 1
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
                        vm.platformBankCardGroupListCheck[v._id] = v.displayName ? v.displayName : true;
                    })
                })
            }

            vm.pickBankCardAcc = function (bankcard) {
                if (bankcard.accountNumber) {
                    vm.playerManualTopUp.groupBankcardList = [bankcard.accountNumber];
                    vm.playerManualTopUp.bankTypeId = bankcard.bankTypeId;
                    vm.playerManualTopUp.lastBankcardNo = bankcard['accountNumber'].substr(bankcard['accountNumber'].length - 4);
                };
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
                        vm.platformMerchantGroupListCheck[v._id] = v.displayName ? v.displayName : true;
                    })
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
                    $scope.$evalAsync(() => {
                        console.log('Alipaygroup', data);
                        //provider list init
                        vm.platformAlipayGroupList = data.data;
                        vm.platformAlipayGroupListCheck = {};
                        $.each(vm.platformAlipayGroupList, function (i, v) {
                            vm.platformAlipayGroupListCheck[v._id] = v.displayName ? v.displayName : true;
                        })
                    })
                })
            }

            vm.pickAlipayAcc = function () {
                vm.playerAlipayTopUp.alipayName = '';
                vm.playerAlipayTopUp.alipayAccount = '';
                if (vm.alipaysAcc != '') {
                    var alipayAcc = vm.alipaysAcc;
                    vm.playerAlipayTopUp.alipayName = alipayAcc['name'];
                    vm.playerAlipayTopUp.alipayAccount = alipayAcc['accountNumber'];
                }

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
                //todo::no need quick pay for now
                // socketService.$socket($scope.AppSocket, 'getPlatformQuickPayGroup', {platform: vm.selectedPlatform.id}, function (data) {
                //     console.log('QuickPayGroup', data);
                //     //provider list init
                //     vm.platformQuickPayGroupList = data.data;
                //     vm.platformQuickPayGroupListCheck = {};
                //     $.each(vm.platformQuickPayGroupList, function (i, v) {
                //         vm.platformQuickPayGroupListCheck[v._id] = true;
                //     })
                //     $scope.safeApply();
                // })
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
                        vm.platformWechatPayGroupListCheck[v._id] = v.displayName ? v.displayName : true;
                    });
                })
            };

            vm.pickWechatPayAcc = function () {
                vm.playerWechatPayTopUp.wechatPayName = '';
                vm.playerWechatPayTopUp.wechatPayAccount = '';
                if (vm.wechatpaysAcc != '') {
                    var wechatpayAcc = vm.wechatpaysAcc;
                    vm.playerWechatPayTopUp.wechatPayName = wechatpayAcc['name'];
                    vm.playerWechatPayTopUp.wechatPayAccount = wechatpayAcc['accountNumber'];
                }
                $scope.safeApply();
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
                            } else {
                                if (inputFieldValue == '') {
                                    $("#rewardValidStartTime").datetimepicker('setDate', null);
                                }
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
                            } else {
                                if (inputFieldValue == '') {
                                    $("#rewardValidEndTime").datetimepicker('setDate', null);
                                }
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
            vm.getFullDate = function (num) {
                if (num < 10) {
                    return '0' + num;
                } else {
                    return '' + num + '';
                }
            };
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
                if (!vm.platformRewardPageName && type) return false;
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

                if (vm.platformRewardPageName == "newReward" || vm.platformRewardPageName == "updateReward") {
                    return false
                } else {
                    return true;
                }
            }

            vm.disableAllRewardInput = function (disabled) {
                typeof disabled == "boolean" ? vm.rewardDisabledInput = disabled : disabled = vm.rewardDisabledInput;
                $("#rewardMainTasks :input").prop("disabled", disabled);
                if (!disabled) {
                    $("#rewardMainTasks :input").removeClass("disabled");
                }
                vm.platformRewardIsEnabled = !disabled;
                if (vm.isRandomReward) {
                    $("#rewardMainTasks [data-cond-name='applyType']").prop("disabled", true);
                    $("#rewardMainTasks [data-cond-name='canApplyFromClient']").prop("disabled", disabled);
                }
            }

            vm.clearCanApplyFromClient = function () {
                if (!vm.showReward.needApply) {
                    vm.showReward.canApplyFromClient = false;
                }
            }

            vm.clearRewardFormData = function () {
                // vm.rewardCondition = null;
                //vm.showReward = null;
                // vm.rewardParams = null;
                // vm.showRewardTypeId = null;
                // after clearing, force it back to 'ALL' checkbox
                vm.rewardEventClicked(0, vm.showReward);
                vm.daySelection['0'] = true;
                vm.rewardParamsDaySelectedAll();
                $scope.safeApply();
            }

            vm.clearProvider = function (rowIndex) {
                for (var providers in vm.rewardParams.reward[rowIndex].providers) {
                    if (vm.rewardParams.reward[rowIndex].providers[providers] == 'ANY') {
                        vm.rewardParams.reward[rowIndex].providers = [];
                    }
                }
                console.log(vm.rewardParams.reward[rowIndex]);
                $scope.safeApply();
            }

            vm.clearWeekDay = function (rowIndex) {
                vm.rewardParams.reward[rowIndex].repeatWeekDay = [];
                $scope.safeApply();
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
            vm.updateLimitedOffersEdit = function (type, data, id) {
                if (type == 'add') {
                    socketService.$socket($scope.AppSocket, 'generateObjectId', {}, function (result) {
                        var objectId = result.data
                        if (objectId) {
                            data._id = objectId;

                            if (vm.rewardParams.reward) {
                                // first time create the data
                                if (vm.rewardParams.reward.length == 0) {
                                    vm.rewardParams.reward.push(JSON.parse(JSON.stringify(data)));
                                    vm.rewardParamsFilter = vm.rewardParams.reward;
                                }
                                else {
                                    if (vm.rewardParamsFilter.length == vm.rewardParams.reward.length) {
                                        vm.rewardParams.reward.push(JSON.parse(JSON.stringify(data)));
                                    }
                                    else {
                                        vm.rewardParamsFilter.push(JSON.parse(JSON.stringify(data)));
                                        vm.rewardParams.reward.push(JSON.parse(JSON.stringify(data)));
                                    }
                                }

                            }
                            $scope.safeApply();
                        }
                    });
                } else if (type == 'remove') {
                    if (vm.rewardParamsFilter) {
                        vm.rewardParamsFilter = vm.rewardParamsFilter.filter(item => {
                            return item._id != id;
                        })
                    }

                    if (vm.rewardParams.reward) {
                        vm.rewardParams.reward = vm.rewardParams.reward.filter(item => {
                            return item._id != id;
                        })
                    }
                    $scope.safeApply();
                }
            };
            vm.weekDayList = {
                '1': 'Mon',
                '2': 'Tue',
                '3': 'Wed',
                '4': 'Thu',
                '5': 'Fri',
                '6': 'Sat',
                '7': 'Sun'
            };

            vm.daySelection = {
                '0': true,
                '1': true,
                '2': true,
                '3': true,
                '4': true,
                '5': true,
                '6': true,
                '7': true
            };

            vm.rewardParamsDaySelectedAll = function () {
                vm.rewardParamsFilter = [];
                vm.rewardParamsFilter = vm.rewardParams.reward;

                for (let i in vm.daySelection) {
                    vm.daySelection[i] = true;

                }
                console.log('rewardParamsFilter', vm.rewardParamsFilter);
                $scope.safeApply();
                vm.endLoadWeekDay();
            };

            vm.isDayChecked = function (index) {

                for (let i in vm.daySelection) {
                    if (i == index) {
                        vm.daySelection[i] = true;
                    }
                    else {
                        vm.daySelection[i] = false;
                    }
                }

                vm.rewardParamsFilter = [];

                vm.rewardParams.reward.map(
                    item => {
                        if (item.repeatWeekDay === undefined || item.repeatWeekDay.length === 0) {
                            vm.rewardParamsFilter.push(item);
                        }
                        else if (item.repeatWeekDay.includes(index)) {
                            vm.rewardParamsFilter.push(item);
                        }
                        else {
                        }
                    });
                console.log('rewardParamsFilter', vm.rewardParamsFilter);
                $scope.safeApply();
                vm.endLoadWeekDay();
            };

            vm.endLoadWeekDay = function () {
                vm.refreshSPicker();
            };

            vm.refreshSPicker = () => {
                // without this timeout, 'selectpicker refresh' might done before the DOM able to refresh, which evalAsync doesn't help
                $timeout(function () {
                    $('.spicker').selectpicker('refresh');
                }, 0);
            };

            vm.updatePlayerValueConfigInEdit = function (type, configType, data) {
                if (type == 'add') {
                    switch (configType) {
                        case 'topUpScore':
                            vm.playerValueBasic.topUpTimesScores.push({name: data.minTopUpTimes, score: data.score});
                            break;
                        case 'gameTypeScore':
                            vm.playerValueBasic.gameTypeCountScores.push({name: data.name, score: data.score});
                            break;
                        case 'WinRatio':
                            vm.playerValueBasic.winRatioScores.push({name: data.name, score: data.score});
                            break;
                    }
                } else if (type == 'remove') {
                    configType.splice(data, 1);
                }
            };

            vm.updateCallRequestConfigInEdit = function (type, data, arrayToRemove) {
                if (type == 'add') {
                    if (data && data.hasOwnProperty('lineId') && data.hasOwnProperty('lineName')) {
                        vm.callRequestConfig.callRequestLineConfig.push({
                            lineId: data.lineId,
                            lineName: data.lineName,
                            minLevel: data.minLevel? data.minLevel: ""
                        });
                    }
                } else if (type == 'remove') {
                    arrayToRemove.splice(data, 1);
                }
            };

            vm.updateCollectionInEdit = function (type, collection, data) {
                if (type == 'add') {
                    let newObj = {};

                    Object.keys(data).forEach(e => {
                        newObj[e] = data[e];
                    });

                    collection.push(newObj);
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

            vm.removeGameGroupInEdit = (index) => {
                vm.gameProviderGroup.splice(index, 1);
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
            };

            vm.getProviderGames = function (id, callback) {
                if (!id) return;
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
                if (!providerId || !vm.allGameProviders) return false;
                var result = '';
                $.each(vm.allGameProviders, function (i, v) {
                    if (providerId == v._id || providerId == v.providerId) {
                        result = v.name;
                        return true;
                    }
                    //console.log('all provider', i, v);
                })
                //console.log('provider text', result);
                return result;
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

            vm.getGameTextbyId = function (id) {
                if (!vm.allGames) return;
                if (!id) return false;
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

            vm.keywordFilterTypeChange = (type) => {
                vm.keywordFilterType = type;

                vm.updateCurrentKeywords();
            };

            vm.updateCurrentKeywords = () => {
                vm.keywordRemoveList = [];
                vm.currentKeywords = [];
                for (let i = 0; i < vm.filteredKeywordList.length; i++) {
                    if (vm.filteredKeywordList[i].type === vm.keywordFilterType) {
                        if (vm.keywordFilterType === 'sms' && vm.filteredKeywordList[i].smsChannel != vm.keywordFilterChannel) {
                            continue;
                        }

                        vm.currentKeywords = vm.filteredKeywordList[i].keywords;
                        break;
                    }
                }

                $scope.safeApply();
                setTimeout(vm.setupMultiSelect, 0);
            };


            vm.getAllFilteredKeywords = () => {
                vm.filteredKeywordList = [];
                socketService.$socket($scope.AppSocket, 'getAllFilteredKeyword', {
                    platformObjId: vm.selectedPlatform.id
                }, function (data) {
                    console.log('getAllFilteredKeyword', data);
                    vm.filteredKeywordList = data.data;

                    vm.updateCurrentKeywords();
                });
            };

            vm.addFilterKeywords = () => {
                let keywordArr = [];
                if (vm.keywordFilterNew) {
                    let keywords = vm.keywordFilterNew.split(/\r?\n/);
                    for (let i = 0, len = keywords.length; i < len; i++) {
                        let keyword = keywords[i].trim();
                        if (keyword) keywordArr.push(keyword);
                    }
                }

                socketService.$socket($scope.AppSocket, 'setFilteredKeywords', {
                    keywords: keywordArr,
                    smsChannel: vm.keywordFilterChannel || $scope.channelList && $scope.channelList[0] || "0",
                    type: vm.keywordFilterType,
                    platformObjId: vm.selectedPlatform.id
                }, function (data) {
                    console.log('setFilteredKeywords', data);
                    if (data && data.data) {
                        vm.keywordFilterNew = "";
                        vm.getAllFilteredKeywords();
                    }
                });

            };

            vm.setupMultiSelect = () => {
                $('#keywordFilterSelect option').mousedown(function(e) {
                    e.preventDefault();
                    var originalScrollTop = $(this).parent().scrollTop();
                    $(this).prop('selected', $(this).prop('selected') ? false : true);
                    var self = this;
                    $(this).parent().focus();
                    setTimeout(function() {
                        $(self).parent().scrollTop(originalScrollTop);
                    }, 0);
                    if ($(this).prop('selected')) {
                        vm.keywordRemoveList.push($(this).html());
                    }
                    else {
                        vm.keywordRemoveList = vm.keywordRemoveList.filter( val => val != $(this).html() );
                    }

                    return false;
                });

            };

            vm.removeKeywordsFromFilter = () => {
                socketService.$socket($scope.AppSocket, 'removeFilteredKeywords', {
                    keywords: vm.keywordRemoveList,
                    smsChannel: vm.keywordFilterChannel || $scope.channelList && $scope.channelList[0] || "0",
                    type: vm.keywordFilterType,
                    platformObjId: vm.selectedPlatform.id
                }, function (data) {
                    console.log('removeFilteredKeywords', data);
                    if (data && data.data) {
                        vm.keywordRemoveList = [];
                        vm.getAllFilteredKeywords();
                    }
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
            }

            function updateSmsGroup() {
                socketService.$socket($scope.AppSocket, 'updatePlatformSmsGroups', {
                    smsGroups: vm.smsGroups,
                    platformObjId: vm.selectedPlatform.data._id
                }, function (data) {
                    vm.configTabClicked("smsGroup")
                });
            }

            vm.addSmsSettingToGroup = (smsSetting, index) => {
                if (!smsSetting.group) return;
                vm.smsGroups.push({
                    smsName: smsSetting.name,
                    smsParentSmsId: smsSetting.group,
                    platformObjId: vm.selectedPlatform.data._id
                });
                vm.noGroupSmsSetting.splice(index, 1);
            }

            vm.filterSmsSettingGroup = (parentSmsId) => {
                return (smsSettingGroup) => {
                    return smsSettingGroup.smsParentSmsId == parentSmsId;
                }
            };

            vm.addNewSmsGroup = () => {
                socketService.$socket($scope.AppSocket, 'addNewSmsGroup', {platformObjId: vm.selectedPlatform.data._id}, function (data) {
                    vm.smsGroups.push(data.data)
                    $scope.safeApply();
                });
            }

            vm.removeSmsSettingFromGroup = (smsSettingGroup) => {
                vm.smsGroups = vm.smsGroups.filter(smsGroup => smsGroup.smsName !== smsSettingGroup.smsName && smsSettingGroup.smsParentSmsId !== -1);
                vm.getNoInGroupSmsSetting();
                $scope.safeApply();
            };

            vm.getPlatformSmsGroups = () => {
                return $scope.$socketPromise('getPlatformSmsGroups', {platformObjId: vm.selectedPlatform.data._id}).then(function (data) {
                    vm.smsGroups = data.data;
                    console.log('vm.smsGroups', vm.smsGroups);
                    vm.getNoInGroupSmsSetting();
                    $scope.safeApply();
                });
            };

            vm.deleteSmsGroup = (smsGroup) => {
                return $scope.$socketPromise('deletePlatformSmsGroup', {_id: smsGroup._id}).then(function (data) {
                    vm.getPlatformSmsGroups();
                });
            };


            // get id for game provider that are required to manually insert game id in game reward points
            vm.getGameProviderToManuallyInsertGameId = () => {
                let gameProviders = vm.allGameProviders;
                vm.gameProviderManuallyInsertGameId = [];

                gameProviders.forEach(provider => {
                    if ((provider.code === 'PTOTHS' && provider.providerId === '18') || (provider.code === 'MGEBET' && provider.providerId === '41') ||
                        (provider.code === 'DTOTHS' && provider.providerId === '45') || (provider.code === 'QTOTHS' && provider.providerId === '46') ||
                        (provider.code === 'BYOTHS' && provider.providerId === '47') || (provider.code === 'ISBSLOTS' && provider.providerId === '57')) {
                        vm.gameProviderManuallyInsertGameId.push(provider._id);
                    }
                });
            };

            vm.rewardPointsEventSetDisable = (idx, rewardPointsEvent, isDisable, isMultiple) => {
                rewardPointsEvent.isEditing = !isDisable;
                if (rewardPointsEvent.period == 6) {
                    let startDateId = "#rewardPointsEventStartDate-" + idx;
                    let endDateId = "#rewardPointsEventEndDate-" + idx;
                    vm.datetimePickerSetDisable(startDateId, isDisable);
                    vm.datetimePickerSetDisable(endDateId, isDisable);
                }
                if (!isMultiple) {
                    $scope.safeApply();
                    vm.refreshSPicker();
                }
            };

            vm.rewardPointsEventAddNewRow = (rewardPointsEventCategory, otherEventParam = {}) => {
                // userAgent -1 means accept all userAgent
                let defaultEvent = {
                    category: rewardPointsEventCategory,
                    isEditing: true,
                    userAgent: -1,
                    level: vm.allPlayerLvl.sort((a, b) => a.value > b.value)[0]._id
                };
                vm.rewardPointsEvent.push(Object.assign(defaultEvent, otherEventParam));
            };

            vm.submitRewardPointsLogQuery = function (newSearch) {
                $('#loadRewardPointsLogIcon').show();
                vm.searchRewardPointsLog(newSearch ? 0 : vm.rewardPointsLogPageAASorting.index, vm.rewardPointsLogPageAASorting.limit).then(
                    (data) => {
                        $scope.safeApply();
                        vm.allRewardPointsLog = data;
                        console.log('vm.allRewardPointsLog', vm.allRewardPointsLog);
                        vm.drawRewardPointsLogTable(vm.allRewardPointsLog.data, vm.allRewardPointsLog.size, newSearch, {});
                        $('#loadRewardPointsLogIcon').hide();
                    }
                )
            };

            vm.searchRewardPointsLog = (index, limit) => {
                var sendQuery = {
                    query: {
                        platformId: vm.selectedPlatform.id
                    },
                    index: index,
                    limit: limit || 10,
                    sort: vm.rewardPointsLogPageAASorting.sortCol || {'createTime': -1}
                };
                $.each(vm.rewardPointsLogQuery, function (idx, val) {
                    if (val && val != '' && val != 'all') {
                        sendQuery.query[idx] = val;
                    }
                });
                delete sendQuery.query.rewardPointsOperator;
                delete sendQuery.query.rewardPointsAmountOne;
                delete sendQuery.query.rewardPointsAmountTwo;
                var rewardPointsOperator = vm.rewardPointsLogQuery.rewardPointsOperator;
                var rewardPointsAmountOne = vm.rewardPointsLogQuery.rewardPointsAmountOne ? vm.rewardPointsLogQuery.rewardPointsAmountOne : 0;
                var rewardPointsAmountTwo = vm.rewardPointsLogQuery.rewardPointsAmountTwo ? vm.rewardPointsLogQuery.rewardPointsAmountTwo : 0;
                if (rewardPointsOperator && $.isNumeric(rewardPointsAmountOne)) {
                    switch (rewardPointsOperator) {
                        case '<=':
                            sendQuery.query.amount = {$lte: rewardPointsAmountOne};
                            break;
                        case '>=':
                            sendQuery.query.amount = {$gte: rewardPointsAmountOne};
                            break;
                        case '=':
                            sendQuery.query.amount = rewardPointsAmountOne;
                            break;
                        case 'range':
                            if ($.isNumeric(rewardPointsAmountTwo)) sendQuery.query.amount = {
                                $gte: rewardPointsAmountOne,
                                $lte: rewardPointsAmountTwo
                            };
                            break;
                    }
                }

                console.log("rewardPointsLogQuery", sendQuery);
                return $scope.$socketPromise('getRewardPointsLogsQuery', sendQuery).then(
                    (data) => data.data
                );

            };

            vm.drawRewardPointsLogTable = function (data, size, newSearch, summary) {
                var showData = [];
                $.each(data, function (i, j) {
                    j.createTime$ = utilService.getFormatTime(j.createTime);
                    showData.push(j);
                });
                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: showData,
                    order: vm.rewardPointsLogPageAASorting || [[11, 'desc']],
                    aoColumnDefs: [
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [11]},
                        {'sortCol': 'amount', bSortable: true, 'aTargets': [9]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [
                        {title: $translate('Reward Point ID'), data: "pointLogId"},
                        {title: $translate('Proposal Creator'), data: "creator"},
                        {
                            title: $translate('Reward Points Type'), data: "category",
                            render: function (data, type, row) {
                                return $translate($scope.constRewardPointsLogCategory[row.category]);
                            }
                        },
                        {
                            title: $translate('Reward Title'), data: "rewardTitle",
                            render: function (data, type, row) {
                                return row.rewardTitle ? row.rewardTitle : "-";
                            }
                        },
                        {
                            title: $translate('userAgent'), data: "userAgent",
                            render: function (data, type, row) {
                                return $translate($scope.constPlayerRegistrationInterface[row.userAgent]);
                            }
                        },
                        {
                            title: $translate('Proposal Status'), data: "status",
                            render: function (data, type, row) {
                                return $translate($scope.constRewardPointsLogStatus[row.status]);
                            }
                        },
                        {title: $translate('Member Account'), data: "playerName"},
                        {title: $translate('beforeChangeRewardPoint'), data: "oldPoints"},
                        {title: $translate('afterChangeRewardPoint'), data: "newPoints"},
                        {title: $translate('Reward Point Variable'), data: "amount", bSortable: true},
                        {
                            title: $translate('dailyMaxRewardPoint'), data: "maxDayApplyAmount",
                            render: function (data, type, row) {
                                return row.currentDayAppliedAmount != null && row.maxDayApplyAmount ? row.currentDayAppliedAmount + "/" + row.maxDayApplyAmount : "-";
                            }
                        },
                        {title: $translate('createTime'), data: "createTime$", bSortable: true},
                        {
                            title: $translate('playerLevelName'), data: "playerLevelName",
                            render: function (data, type, row) {
                                return $translate(row.playerLevelName);
                            }
                        },
                        {
                            title: $translate('remark'), data: "remark",
                            render: function (data, type, row) {
                                return row.remark.replace('Proposal No', $translate('Proposal No'));
                            }
                        },
                        {
                            title: $translate('detail'),
                            render: function (data, type, row) {
                                var $a = $('<a>', {
                                    'ng-click': "vm.prepareShowRewardPointsLogDetail(" + JSON.stringify(row) + ")"
                                }).text($translate('detail'));
                                // $compile($a.prop('outerHTML'))($scope);
                                return $a.prop('outerHTML');
                            },
                            "fnCreatedCell": function (nTd, sData, oData, iRow, iCol) {
                                $compile(nTd)($scope)
                            }
                        },
                    ],
                    "paging": false,
                });
                var aTable = utilService.createDatatableWithFooter("#allRewardPointsTable", tableOptions, summary, true);
                vm.rewardPointsLogPageObjs.allRewardPoints.init({maxCount: size}, newSearch);
                $("#allRewardPointsTable").off('order.dt');
                $("#allRewardPointsTable").on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'rewardPointsLogPageAASorting', vm.submitRewardPointsLogQuery);
                });

                $scope.safeApply();
                aTable.columns.adjust().draw();
                $("#allRewardPointsTable").resize();
            };

            vm.prepareShowRewardPointsLogDetail = (rewardPointsLog) => {
                rewardPointsLog.category = $scope.constRewardPointsLogCategory[rewardPointsLog.category];
                rewardPointsLog.status = $scope.constRewardPointsLogStatus[rewardPointsLog.status];
                rewardPointsLog.remark = rewardPointsLog.remark.replace('Proposal No', $translate('Proposal No'));
                $scope.$socketPromise('getProposal', {'proposalId': rewardPointsLog.proposalId}).then(
                    (data) => {
                        rewardPointsLog.proposal = data.data;
                        vm.rewardPointsLogDetail = rewardPointsLog;
                        console.log(rewardPointsLog);
                        $('#modalRewardPointsLogDetail').modal();
                        $scope.safeApply();
                    }
                );
            };

            vm.datetimePickerSetDisable = (eleId, isDisable) => {
                utilService.actionAfterLoaded(eleId, () => {
                    $(eleId + " :input").prop("disabled", isDisable);
                    //fix disable datetimepicker, calendar icon still clickable
                    $(eleId + " :input~*").toggle(!isDisable);
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
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                });
            };

            vm.showProposalModalNoObjId = function (proposalId, templateNo) {
                socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                    platformId: vm.selectedPlatform.id,
                    proposalId: proposalId
                }, function (data) {
                    vm.selectedProposal = data.data;
                    vm.proposalDetailStyle = {};

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "SettlePartnerCommission") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        let grossCommission = 0;
                        let totalPlatformFee = 0;

                        let customizedStyle = {
                            'font-weight': 'bold',
                            'color': 'red'
                        };
                        let isCustomized = false;

                        let consumptionUsed = vm.selectedProposal.data.commissionType == 5 ? "CONSUMPTION" : "SITE_LOSE_WIN";

                        proposalDetail["MAIN_TYPE"] = $translate("SettlePartnerCommission");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["CREATION_TIME"] = $scope.timeReformat(vm.selectedProposal.createTime);
                        proposalDetail["COMMISSION_PERIOD"] = $scope.dateReformat(vm.selectedProposal.data.startTime) + " - " + $scope.dateReformat(vm.selectedProposal.data.endTime);
                        proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                        proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                        proposalDetail["Proposal Status"] = $translate(vm.selectedProposal.data.status);
                        proposalDetail["COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.commissionType]);

                        vm.selectedProposal.data.rawCommissions = vm.selectedProposal.data.rawCommissions || [];
                        vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                            grossCommission += rawCommission.amount;
                            let str = rawCommission.amount + $translate("YEN") + " "
                                + "(" + $translate(consumptionUsed) + ": " + (-rawCommission.totalConsumption) + "/"
                                + $translate("RATIO") + ": " + (rawCommission.commissionRate * 100) + "%)";

                            proposalDetail[rawCommission.groupName + " " + $translate("Commission")] =  str;

                            if (rawCommission.isCustomCommissionRate) {
                                vm.proposalDetailStyle[rawCommission.groupName + " " + $translate("Commission")] = customizedStyle;
                                isCustomized = true;
                            }
                        });

                        proposalDetail["REQUIRED_PROMO_DEDUCTION"] = vm.selectedProposal.data.totalRewardFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalReward + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebatePromo) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebatePromoIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_PROMO_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        proposalDetail["REQUIRED_PLATFORM_FEES_DEDUCTION"] = "";
                        vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                            totalPlatformFee += rawCommission.platformFee;
                            let str = rawCommission.platformFee + $translate("YEN") + " "
                                + "(" + $translate("SITE_LOSE_WIN") + ": " + rawCommission.siteBonusAmount + "/"
                                + $translate("RATIO") + ": " + (rawCommission.platformFeeRate) + "%)";
                            let forcedZeroStr = rawCommission.isForcePlatformFeeToZero ? rawCommission.platformFee + $translate("YEN") + " "
                                + "(" + $translate("Forced 0") + "/" + rawCommission.forcePlatformFeeToZeroBy.name + ")" : "";

                            if (rawCommission && rawCommission.isForcePlatformFeeToZero) {
                                proposalDetail["- " + rawCommission.groupName] =  forcedZeroStr;
                            } else {
                                proposalDetail["- " + rawCommission.groupName] =  str;

                                if (rawCommission.isCustomPlatformFeeRate) {
                                    vm.proposalDetailStyle["- " + rawCommission.groupName] = customizedStyle;
                                    isCustomized = true;
                                }
                            }
                        });

                        proposalDetail["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = vm.selectedProposal.data.totalTopUpFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalTopUp + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalDeposit) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebateTotalDepositIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        proposalDetail["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = vm.selectedProposal.data.totalWithdrawalFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalWithdrawal + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebateTotalWithdrawalIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        if (isCustomized) {
                            vm.proposalDetailStyle["COMMISSION_TYPE"] = customizedStyle;
                        }

                        let totalFee = Number(vm.selectedProposal.data.totalRewardFee) + Number(totalPlatformFee) + Number(vm.selectedProposal.data.totalTopUpFee) + Number(vm.selectedProposal.data.totalWithdrawalFee);

                        proposalDetail["COMMISSION_TOTAL"] = vm.selectedProposal.data.amount + " "
                            + "(" + grossCommission + "-" + totalFee + ")";

                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "ManualPlayerTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }

                        proposalDetail["MAIN_TYPE"] = $translate("ManualPlayerTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["DEPOSIT_METHOD"] = $translate(vm.getDepositMethodbyId[vm.selectedProposal.data.depositMethod]);
                        proposalDetail["ACCNAME"] = vm.selectedProposal.data.realName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECEIVE_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankTypeId] || (vm.selectedProposal.data.bankTypeId + " ! " + $translate("not in bank type list"));
                        proposalDetail["RECEIVE_BANK_ACC"] = vm.selectedProposal.data.bankCardNo;
                        proposalDetail["RECEIVE_BANK_ACC_NAME"] = vm.selectedProposal.data.cardOwner;
                        proposalDetail["RECEIVE_BANK_ACC_PROVINCE"] = vm.selectedProposal.data.provinceId;
                        proposalDetail["RECEIVE_BANK_ACC_CITY"] = vm.selectedProposal.data.cityId;
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["bankCardGroup"] = vm.selectedProposal.data.bankCardGroupName || " ";
                        proposalDetail["REQUEST_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankCardType] || (vm.selectedProposal.data.bankCardType + " ! " + $translate("not in bank type list"));
                        proposalDetail["USE_PMS_CARD_GROUP"] = vm.selectedProposal.data.bPMSGroup || false;
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = " ";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["OnlineTopUpType"] = $translate($scope.merchantTopupTypeJson[vm.selectedProposal.data.topupType]) || " ";
                        proposalDetail["3rdPartyPlatform"] = vm.selectedProposal.data.merchantUseName || " ";
                        proposalDetail["merchantNo"] = vm.selectedProposal.data.merchantNo || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        if(vm.selectedProposal.data.hasOwnProperty("rate")){
                            proposalDetail["Service Charge Fee"] = $noRoundTwoDecimalPlaces(vm.selectedProposal.data.amount * vm.selectedProposal.data.rate) + '（' + $translate("Service Charge Ratio") + '：' + (vm.selectedProposal.data.rate * 100) + '%)';
                        }
                        if(vm.selectedProposal.data.hasOwnProperty('actualAmountReceived')){
                            proposalDetail["ActualReceivedAmount"] = vm.selectedProposal.data.actualAmountReceived;
                        }
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["MerchantGroup"] = vm.selectedProposal.data.merchantGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.permerchantLimits || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.transactionForPlayerOneDay || "0");
                        vm.selectedProposal.data = proposalDetail;
                    }


                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerWechatTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerWechatTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECIPIENTS_WECHAT_ACC"] = vm.selectedProposal.data.weChatAccount || " ";
                        proposalDetail["RECIPIENTS_WECHAT_NAME"] = vm.selectedProposal.data.name || " ";
                        proposalDetail["RECIPIENTS_WECHAT_NICK"] = vm.selectedProposal.data.nickname || " ";
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["PERSONAL_WECHAT_GROUP"] = vm.selectedProposal.data.wechatPayGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.weChatQRCode || " ";
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerAlipayTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerAlipayTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["PLAYER_ALIPAY_NAME_ID"] = vm.selectedProposal.data.userAlipayName;
                        proposalDetail["PLAYER_ALIPAY_REALNAME"] = vm.selectedProposal.data.realName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECIPIENTS_APLIPAY_ACC"] = vm.selectedProposal.data.alipayAccount;
                        proposalDetail["RECIPIENTS_APLIPAY_NAME"] = vm.selectedProposal.data.alipayName || " ";
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["PERSONAL_ALIPAY_GROUP"] = vm.selectedProposal.data.aliPayGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.alipayQRCode || " ";
                        proposalDetail["ALIPAY_QR_ADDRESS"] = vm.selectedProposal.data.qrcodeAddress || " ";
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["alipayer"] = vm.selectedProposal.data.alipayer || " ";
                        proposalDetail["alipayerAccount"] = vm.selectedProposal.data.alipayerAccount || " ";
                        proposalDetail["alipayerNickName"] = vm.selectedProposal.data.alipayerNickName || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal.data.inputData) {
                        if (vm.selectedProposal.data.inputData.provinceId) {
                            vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        }
                        if (vm.selectedProposal.data.inputData.cityId) {
                            vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        }
                    } else {
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                            vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE")
                        }
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                            vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        }
                    }

                    let proposalDetail = $.extend({}, vm.selectedProposal.data);
                    let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
                    for (let i in proposalDetail) {
                        if (checkForHexRegExp.test(proposalDetail[i])) {
                            delete proposalDetail[i];
                        }
                    }
                    vm.selectedProposal.data = $.extend({}, proposalDetail);
                    let tmpt = vm.proposalTemplate[templateNo];
                    $(tmpt).modal('show');
                    if (templateNo == 1) {
                        $(tmpt).css('z-Index', 1051).modal();
                    }

                    $(tmpt).on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })
                })
            };

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

            vm.showProposalModal = function (proposalId, templateNo) {
                socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                    platformId: vm.selectedPlatform.id,
                    proposalId: proposalId
                }, function (data) {
                    vm.selectedProposal = data.data;
                    vm.proposalDetailStyle = {};

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "SettlePartnerCommission") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        let grossCommission = 0;
                        let totalPlatformFee = 0;

                        let customizedStyle = {
                            'font-weight': 'bold',
                            'color': 'red'
                        };
                        let isCustomized = false;

                        let consumptionUsed = vm.selectedProposal.data.commissionType == 5 ? "CONSUMPTION" : "SITE_LOSE_WIN";

                        proposalDetail["MAIN_TYPE"] = $translate("SettlePartnerCommission");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["CREATION_TIME"] = $scope.timeReformat(vm.selectedProposal.createTime);
                        proposalDetail["COMMISSION_PERIOD"] = $scope.dateReformat(vm.selectedProposal.data.startTime) + " - " + $scope.dateReformat(vm.selectedProposal.data.endTime);
                        proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                        proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                        proposalDetail["Proposal Status"] = $translate(vm.selectedProposal.data.status);
                        proposalDetail["COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.commissionType]);

                        vm.selectedProposal.data.rawCommissions = vm.selectedProposal.data.rawCommissions || [];
                        vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                            grossCommission += rawCommission.amount;
                            let str = rawCommission.amount + $translate("YEN") + " "
                                + "(" + $translate(consumptionUsed) + ": " + (-rawCommission.totalConsumption) + "/"
                                + $translate("RATIO") + ": " + (rawCommission.commissionRate * 100) + "%)";

                            proposalDetail[rawCommission.groupName + " " + $translate("Commission")] =  str;

                            if (rawCommission.isCustomCommissionRate) {
                                vm.proposalDetailStyle[rawCommission.groupName + " " + $translate("Commission")] = customizedStyle;
                                isCustomized = true;
                            }
                        });

                        proposalDetail["REQUIRED_PROMO_DEDUCTION"] = vm.selectedProposal.data.totalRewardFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalReward + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebatePromo) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebatePromoIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_PROMO_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        proposalDetail["REQUIRED_PLATFORM_FEES_DEDUCTION"] = "";
                        vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                            totalPlatformFee += rawCommission.platformFee;
                            let str = rawCommission.platformFee + $translate("YEN") + " "
                                + "(" + $translate("SITE_LOSE_WIN") + ": " + rawCommission.siteBonusAmount + "/"
                                + $translate("RATIO") + ": " + (rawCommission.platformFeeRate) + "%)";
                            let forcedZeroStr = rawCommission.isForcePlatformFeeToZero ? rawCommission.platformFee + $translate("YEN") + " "
                                + "(" + $translate("Forced 0") + "/" + rawCommission.forcePlatformFeeToZeroBy.name + ")" : "";

                            if (rawCommission && rawCommission.isForcePlatformFeeToZero) {
                                proposalDetail["- " + rawCommission.groupName] =  forcedZeroStr;
                            } else {
                                proposalDetail["- " + rawCommission.groupName] =  str;

                                if (rawCommission.isCustomPlatformFeeRate) {
                                    vm.proposalDetailStyle["- " + rawCommission.groupName] = customizedStyle;
                                    isCustomized = true;
                                }
                            }
                        });

                        proposalDetail["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = vm.selectedProposal.data.totalTopUpFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalTopUp + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalDeposit) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebateTotalDepositIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        proposalDetail["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = vm.selectedProposal.data.totalWithdrawalFee + $translate("YEN")
                            + "(" + $translate("Total") + ": " + vm.selectedProposal.data.totalWithdrawal + "/"
                            + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal) + "%)";

                        if (vm.selectedProposal.data.rateAfterRebateTotalWithdrawalIsCustom) {
                            vm.proposalDetailStyle["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = customizedStyle;
                            isCustomized = true;
                        }

                        if (isCustomized) {
                            vm.proposalDetailStyle["COMMISSION_TYPE"] = customizedStyle;
                        }

                        let totalFee = Number(vm.selectedProposal.data.totalRewardFee) + Number(totalPlatformFee) + Number(vm.selectedProposal.data.totalTopUpFee) + Number(vm.selectedProposal.data.totalWithdrawalFee);

                        proposalDetail["COMMISSION_TOTAL"] = vm.selectedProposal.data.amount + " "
                            + "(" + grossCommission + "-" + totalFee + ")";

                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "ManualPlayerTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }

                        proposalDetail["MAIN_TYPE"] = $translate("ManualPlayerTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["DEPOSIT_METHOD"] = $translate(vm.getDepositMethodbyId[vm.selectedProposal.data.depositMethod]);
                        proposalDetail["ACCNAME"] = vm.selectedProposal.data.realName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECEIVE_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankTypeId] || (vm.selectedProposal.data.bankTypeId + " ! " + $translate("not in bank type list"));
                        proposalDetail["RECEIVE_BANK_ACC"] = vm.selectedProposal.data.bankCardNo;
                        proposalDetail["RECEIVE_BANK_ACC_NAME"] = vm.selectedProposal.data.cardOwner;
                        proposalDetail["RECEIVE_BANK_ACC_PROVINCE"] = vm.selectedProposal.data.provinceId;
                        proposalDetail["RECEIVE_BANK_ACC_CITY"] = vm.selectedProposal.data.cityId;
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["bankCardGroup"] = vm.selectedProposal.data.bankCardGroupName || " ";
                        proposalDetail["REQUEST_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankCardType] || (vm.selectedProposal.data.bankCardType + " ! " + $translate("not in bank type list"));
                        proposalDetail["USE_PMS_CARD_GROUP"] = vm.selectedProposal.data.bPMSGroup || false;
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = " ";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["OnlineTopUpType"] = $translate($scope.merchantTopupTypeJson[vm.selectedProposal.data.topupType]) || " ";
                        proposalDetail["3rdPartyPlatform"] = vm.selectedProposal.data.merchantUseName || " ";
                        proposalDetail["merchantNo"] = vm.selectedProposal.data.merchantNo || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        if(vm.selectedProposal.data.hasOwnProperty("rate")){
                            proposalDetail["Service Charge Fee"] = $noRoundTwoDecimalPlaces(vm.selectedProposal.data.amount * vm.selectedProposal.data.rate) + '（' + $translate("Service Charge Ratio") + '：' + (vm.selectedProposal.data.rate * 100) + '%)';
                        }
                        if(vm.selectedProposal.data.hasOwnProperty('actualAmountReceived')){
                            proposalDetail["ActualReceivedAmount"] = vm.selectedProposal.data.actualAmountReceived;
                        }
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["MerchantGroup"] = vm.selectedProposal.data.merchantGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.permerchantLimits || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.transactionForPlayerOneDay || "0");
                        vm.selectedProposal.data = proposalDetail;
                    }


                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerWechatTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerWechatTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECIPIENTS_WECHAT_ACC"] = vm.selectedProposal.data.weChatAccount;
                        proposalDetail["RECIPIENTS_WECHAT_NAME"] = vm.selectedProposal.data.name;
                        proposalDetail["RECIPIENTS_WECHAT_NICK"] = vm.selectedProposal.data.nickname;
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["PERSONAL_WECHAT_GROUP"] = vm.selectedProposal.data.wechatPayGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.weChatQRCode || " ";
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerAlipayTopUp") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["MAIN_TYPE"] = $translate("PlayerAlipayTopUp");
                        proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                        proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                        proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                        proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                        proposalDetail["PLAYER_ALIPAY_NAME_ID"] = vm.selectedProposal.data.userAlipayName;
                        proposalDetail["PLAYER_ALIPAY_REALNAME"] = vm.selectedProposal.data.realName || " ";
                        proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                        proposalDetail["RECIPIENTS_APLIPAY_ACC"] = vm.selectedProposal.data.alipayAccount;
                        proposalDetail["RECIPIENTS_APLIPAY_NAME"] = vm.selectedProposal.data.alipayName || " ";
                        proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                        proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                        proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                        proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                        proposalDetail["PERSONAL_ALIPAY_GROUP"] = vm.selectedProposal.data.aliPayGroupName || " ";
                        proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                        proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                        proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                        proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                        proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                        proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                        proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.alipayQRCode || " ";
                        proposalDetail["ALIPAY_QR_ADDRESS"] = vm.selectedProposal.data.qrcodeAddress || " ";
                        proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                        proposalDetail["alipayer"] = vm.selectedProposal.data.alipayer || " ";
                        proposalDetail["alipayerAccount"] = vm.selectedProposal.data.alipayerAccount || " ";
                        proposalDetail["alipayerNickName"] = vm.selectedProposal.data.alipayerNickName || " ";
                        proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PartnerBonus") {
                        let proposalDetail = {};
                        if (!vm.selectedProposal.data) {
                            vm.selectedProposal.data = {};
                        }
                        proposalDetail["partnerRealName"] = vm.selectedProposal.data.realNameBeforeEdit;
                        proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                        proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                        proposalDetail["Withdrawal amount (system does not support transaction fee)"] = vm.selectedProposal.data.amount;
                        if(typeof vm.selectedProposal.data.isAutoApproval != "undefined"){
                            proposalDetail["isAutoApproval"] = vm.selectedProposal.data.isAutoApproval ? $translate("Open") : $translate("Closed");
                        }
                        proposalDetail["autoAuditTime"] = vm.selectedProposal.data.autoAuditTime;
                        proposalDetail["autoAuditRemark"] = vm.selectedProposal.data.autoAuditRemarkChinese;
                        proposalDetail["autoAuditDetail"] = vm.selectedProposal.data.detailChinese;
                        proposalDetail["Total commission since the last withdrawal (include first level partner commission)"] = vm.selectedProposal.data.lastWithdrawalTotalCommission;

                        vm.selectedProposal.data = proposalDetail;
                    }

                    if (vm.selectedProposal.data.inputData) {
                        if (vm.selectedProposal.data.inputData.provinceId) {
                            vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        }
                        if (vm.selectedProposal.data.inputData.cityId) {
                            vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        }
                    } else {
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                            vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE")
                        }
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                            vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        }
                    }

                    let tmpt = vm.proposalTemplate[templateNo];
                    $(tmpt).modal('show');
                    if (templateNo == 1) {
                        $(tmpt).css('z-Index', 1051).modal();
                    }

                    $(tmpt).on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })


                })
            };

            vm.getProvinceName = function (provinceId, fieldName) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, function (data) {
                    var text = data.data.province ? data.data.province.name : '';
                    if (fieldName) {
                        vm.selectedProposal.data[fieldName] = text;
                    } else {
                        vm.selectedProposal.data.provinceName = text;
                    }
                    $scope.safeApply();
                });
            }

            vm.getCityName = function (cityId, fieldName) {
                socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, function (data) {
                    var text = data.data.city ? data.data.city.name : '';
                    if (fieldName) {
                        vm.selectedProposal.data[fieldName] = text;
                    } else {
                        vm.selectedProposal.data.cityName = text;
                    }
                    $scope.safeApply();
                });
            }

            vm.showNewPlayerModal = function (data, templateNo) {
                vm.newPlayerProposal = data;

                if (vm.newPlayerProposal.status === "Success" || vm.newPlayerProposal.status === "Manual") {
                    if (vm.newPlayerProposal.data && vm.newPlayerProposal.data.phoneNumber) {
                        let str = vm.newPlayerProposal.data.phoneNumber;
                        vm.newPlayerProposal.data.phoneNumber = str.substring(0, 3) + "******" + str.slice(-4);
                    }
                }

                let tmpt = vm.proposalTemplate[templateNo];
                $(tmpt).modal('show');
                $(tmpt).on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })

            };
            // display  proposal detail
            vm.showProposalDetailField = function (obj, fieldName, val) {
                if (!obj) return '';
                var result = val ? val.toString() : (val === 0) ? "0" : "";
                if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                    var str = val.phoneNumber
                    result = val.phoneNumber; //str.substring(0, 3) + "******" + str.slice(-4);
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
                    result = vm.getProviderGroupNameById(val);
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
                    result = vm.allBankTypeList[val] || (val + " ! " + $translate("not in bank type list"));
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
                                newReturnDetail[splitGameTypeIdArr[0] + ':' + vm.allGameTypes[gameTypeId]] = val[key];
                            }
                        });
                    result = JSON.stringify(newReturnDetail || val)
                        .replace(new RegExp('GameType', "gm"), $translate('GameType'))
                        .replace(new RegExp('ratio', 'gm'), $translate('RATIO'))
                        .replace(new RegExp('consumeValidAmount', "gm"), $translate('consumeValidAmount'));
                } else if (fieldName === 'nonXIMADetail') {
                    let newNonXIMADetail = {};
                    Object.keys(val).forEach(
                        key => {
                            if (key && key.indexOf(':') != -1) {
                                let splitGameTypeIdArr = key.split(':');
                                let gameTypeId = splitGameTypeIdArr[1];
                                newNonXIMADetail[splitGameTypeIdArr[0] + ':' + vm.allGameTypes[gameTypeId]] = val[key];
                            }
                        });
                    result = JSON.stringify(newNonXIMADetail || val)
                        .replace(new RegExp('GameType', "gm"), $translate('GameType'))
                        .replace(new RegExp('nonXIMAAmt', "gm"), $translate('totalNonXIMAAmt'));
                } else if (typeof(val) == 'object') {
                    result = JSON.stringify(val);
                } else if (fieldName === "upOrDown") {
                    result = $translate(val);
                }
                return $sce.trustAsHtml(result);
            };
            // end iof proposal detail

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
            };

            vm.saveDelayDurationGroup = function (isDelete, index) {
                console.log('durationGroupConfig', vm.durationGroupConfig);

                let sendData = {
                    platformObjId: vm.selectedPlatform.id,
                    groupData: vm.durationGroupConfig
                };

                socketService.$socket($scope.AppSocket, 'saveDelayDurationGroup', sendData);
            };

            vm.getDelayDurationGroup = function () {
                socketService.$socket($scope.AppSocket, 'getDelayDurationGroup', {platformObjId: vm.selectedPlatform.id}, function (data) {
                    console.log('getDelayDurationGroup', data);

                    if (data.data[0].consumptionTimeConfig) {
                        vm.durationGroupConfig = data.data[0].consumptionTimeConfig;
                        $scope.safeApply();
                    }

                });
            }

            vm.getAllPartnerLevels = function () {
                if (!authService.checkViewPermission('Partner', 'Partner', 'Read')) {
                    return;
                }
                return $scope.$socketPromise(commonAPIs.partnerLevel.getByPlatform, {platformId: vm.selectedPlatform.id})
                    .then(function (data) {
                        vm.allPartnerLevels = data.data;
                        vm.allPartnerLevels.sort(function (a, b) {
                            return a.value > b.value;
                        });
                        vm.allPartnerLevelsByName = Lodash.keyBy(vm.allPartnerLevels, 'name');
                    });
            };

            vm.getProviderNameById = function (providerObjIdArr) {
                let providerString = "";
                for (let i = 0; i < providerObjIdArr.length; i++) {
                    vm.allProviders.forEach(provider => {
                        if (providerObjIdArr[i].toString() == provider._id.toString()) {
                            if (providerString) {
                                providerString += ", ";
                            }
                            providerString += provider.name;
                        }
                    })
                }
                if (!providerString) {
                    providerString = $translate("EMPTY_SELECT");
                }
                return providerString;
            }

            vm.getAllPlayerLevels = function () {
                vm.playerIDArr = [];
                vm.autoCheckPlayerLevelUp = null;
                vm.manualPlayerLevelUp = null;
                vm.playerLevelDisplayList = [];
                return $scope.$socketPromise('getPlayerLevelByPlatformId', {platformId: vm.selectedPlatform.id})
                    .then(function (data) {
                        $scope.$evalAsync(() => {
                            vm.playerLevelPeriod = {};
                            vm.allPlayerLvl = data.data;
                            vm.platformBatchLevelUp = true;
                            vm.autoCheckPlayerLevelUp = vm.selectedPlatform.data.autoCheckPlayerLevelUp;
                            vm.manualPlayerLevelUp = vm.selectedPlatform.data.manualPlayerLevelUp;
                            vm.playerLevelPeriod.playerLevelUpPeriod = vm.selectedPlatform.data.playerLevelUpPeriod ? vm.selectedPlatform.data.playerLevelUpPeriod : vm.allPlayerLevelUpPeriod.MONTH;
                            vm.playerLevelPeriod.playerLevelDownPeriod = vm.selectedPlatform.data.playerLevelDownPeriod ? vm.selectedPlatform.data.playerLevelDownPeriod : vm.allPlayerLevelUpPeriod.MONTH;
                            vm.allPlayerLvlReordered = false;
                            vm.sortPlayerLevels();
                            console.log("vm.allPlayerLvl", data.data);
                            if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.display && vm.selectedPlatform.data.display.length > 0) {
                                vm.playerLevelDisplayList = vm.selectedPlatform.data.display;
                            } else {
                                vm.playerLevelDisplayList.push({displayId:"", displayTitle:"", displayTextContent: "", btnOrImageList: []});
                            }

                            vm.playerLvlData = {};
                            if (vm.allPlayerLvl) {
                                $.each(vm.allPlayerLvl, function (i, v) {
                                    vm.playerIDArr.push(v._id);
                                    vm.playerLvlData[v._id] = v;
                                })
                            }
                            vm.playerLevelPeriod.levelUpPeriodName = vm.getPlayerLevelUpPeriodName(vm.playerLevelPeriod.playerLevelUpPeriod);
                            vm.playerLevelPeriod.levelDownPeriodName = vm.getPlayerLevelUpPeriodName(vm.playerLevelPeriod.playerLevelDownPeriod);
                            vm.initiateLevelDownPeriodAllField();
                        })
                    });
            };

            vm.getPlayerLevelUpPeriodName = function (value) {
                let name = '';
                for (let i = 0; i < Object.keys(vm.allPlayerLevelUpPeriod).length; i++) {
                    if (vm.allPlayerLevelUpPeriod[Object.keys(vm.allPlayerLevelUpPeriod)[i]] == value) {
                        name = Object.keys(vm.allPlayerLevelUpPeriod)[i];
                        break;
                    }
                }
                return name;
            }

            //force change all field (follow period setting)
            vm.changeLevelPeriodAllField = function () {
                for (let i = 0; i < vm.allPlayerLvl.length; i++) {
                    for (let j = 0; j < vm.allPlayerLvl[i].levelDownConfig.length; j++) {
                        vm.allPlayerLvl[i].levelDownConfig[j].consumptionPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                        vm.allPlayerLvl[i].levelDownConfig[j].topupPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                    }
                    for (let k = 0; k < vm.allPlayerLvl[i].levelUpConfig.length; k++) {
                        vm.allPlayerLvl[i].levelUpConfig[k].consumptionPeriod = vm.playerLevelPeriod.levelUpPeriodName;
                        vm.allPlayerLvl[i].levelUpConfig[k].topupPeriod = vm.playerLevelPeriod.levelUpPeriodName;
                    }
                }
            }

            //initiate level down period field
            vm.initiateLevelDownPeriodAllField = function () {
                for (let i = 0; i < vm.allPlayerLvl.length; i++) {
                    for (let j = 0; j < vm.allPlayerLvl[i].levelDownConfig.length; j++) {
                        vm.allPlayerLvl[i].levelDownConfig[j].consumptionPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                        vm.allPlayerLvl[i].levelDownConfig[j].topupPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                    }
                }
            }

            vm.sortPlayerLevels = function () {
                vm.allPlayerLvl.sort((a, b) => a.value - b.value);
            };

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
                vm.newPlayerLevelUpConfig = [{
                    topupLimit: 1,
                    topupPeriod: vm.playerLevelPeriod.levelUpPeriodName,
                    consumptionLimit: 1,
                    consumptionPeriod: vm.playerLevelPeriod.levelUpPeriodName,
                    andConditions: true,
                    consumptionSourceProviderId: []
                }];

                vm.newPlayerLvl = {
                    name: "请更改名称",
                    value: vm.allPlayerLvl.length,
                    levelUpConfig: vm.newPlayerLevelUpConfig,
                    levelDownConfig: [{
                        // topupMinimum: 1,
                        // topupPeriod: period,
                        topupPeriod: vm.playerLevelPeriod.levelDownPeriodName,
                        // consumptionMinimum: 1,
                        // consumptionPeriod: period,
                        consumptionPeriod: vm.playerLevelPeriod.levelDownPeriodName
                    }]
                };
            }
            vm.configAddPlayerLevelValid = function () {
                //up level condition check
                var upLevelConditionValid = true;
                var obj = vm.newPlayerLvl.levelUpConfig[0];
                if (obj.topupLimit == undefined) {
                    upLevelConditionValid = false;
                } else if (obj.consumptionLimit == undefined) {
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

            vm.initPlayerLevelPeriod = function () {
                if (vm.playerLevelPeriod && vm.playerLevelPeriod.playerLevelUpPeriod) {
                    vm.playerLevelByMaxPeriod = {};

                    switch (vm.playerLevelPeriod.playerLevelUpPeriod) {
                        case 1:
                            vm.playerLevelByMaxPeriod.DAY = "DAY";
                            break;
                        case 2:
                            vm.playerLevelByMaxPeriod.DAY = "DAY";
                            vm.playerLevelByMaxPeriod.WEEK = "WEEK";
                            break;
                        case 3:
                            vm.playerLevelByMaxPeriod.DAY = "DAY";
                            vm.playerLevelByMaxPeriod.WEEK = "WEEK";
                            vm.playerLevelByMaxPeriod.MONTH = "MONTH";
                            break;
                    }

                }
            };
            // player level codes==============end===============================

            vm.downloadTranslationCSV = function () {
                vm.prepareTranslationCSV = false;
                let platformId = vm.selectedPlatform.data.platformId;

                socketService.$socket($scope.AppSocket, 'downloadTranslationCSV', {platformId: platformId}, function (data) {
                    vm.fileNameCSV = "ch_SP" + "_" + platformId;
                    vm.prepareTranslationCSV = true;
                    vm.exportTranslationCSV = data.data;
                    $scope.safeApply();
                });
            };

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
            vm.uploadPhoneFileXLS = function (data, importXLS, dxMission) {
                var data = [
                    [] // header row
                ];
                var rows = uiGridExporterService.getData(vm.gridApi.grid, uiGridExporterConstants.VISIBLE, uiGridExporterConstants.VISIBLE);
                var sheet = {};
                var rowArray = [];
                var rowArrayMerge;

                for (let z = 0; z < rows.length; z++) {
                    let rowObject = rows[z][0];
                    let rowObjectValue = Object.values(rowObject);
                    rowArray.push(rowObjectValue);
                    rowArrayMerge = [].concat.apply([], rowArray);
                }

                let sendData = {
                    filterAllPlatform: vm.filterAllPlatform,
                    platformObjId: vm.selectedPlatform.id,
                    arrayPhoneXLS: rowArrayMerge
                };

                socketService.$socket($scope.AppSocket, 'uploadPhoneFileXLS', sendData, function (data) {
                    vm.diffPhoneXLS = data.data.diffPhoneXLS;
                    vm.samePhoneXLS = data.data.samePhoneXLS;
                    vm.diffPhoneTotalXLS = data.data.diffPhoneTotalXLS;
                    vm.samePhoneTotalXLS = data.data.samePhoneTotalXLS;
                    vm.xlsTotal = rows.length;
                    var rowsFilter = rows;

                    for (let x = 0; x < rowsFilter.length; x++) {
                        let rowObject = rowsFilter[x][0];
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
                            var loc = XLSX.utils.encode_cell({r: 0, c: i});
                            sheet[loc] = {
                                v: col.displayName
                            };
                        }
                    });

                    var endLoc;
                    rowsFilter.forEach(function (row, ri) {
                        ri += 1;
                        vm.gridApi.grid.columns.forEach(function (col, ci) {
                            var loc = XLSX.utils.encode_cell({r: ri, c: ci});
                            sheet[loc] = {
                                v: row[ci].value,
                                t: 's'
                            };
                            endLoc = loc;
                        });
                    });

                    sheet['!ref'] = XLSX.utils.encode_range({s: 'A1', e: endLoc});
                    var workbook = {
                        SheetNames: ['Sheet1'],
                        Sheets: {
                            Sheet1: sheet
                        }
                    };

                    if (importXLS) {
                        vm.importDiffPhoneNum(vm.diffPhoneXLS, dxMission)
                    } else {
                        var wopts = {bookType: 'xlsx', bookSST: false, type: 'binary'};
                        // write workbook (use type 'binary')
                        var wbout = XLSX.write(workbook, wopts);
                        saveAs(new Blob([vm.s2ab(wbout)], {type: ""}), "phoneNumberFilter.xlsx");
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
            vm.getPartnerCommissionConfigWithGameProviderConfig = function (partnerObjId) {
                vm.isSettingExist = true;
                vm.partnerCommission = {isCustomized: false};
                vm.partnerCommission.gameProviderGroup = [];
                vm.partnerCommission.isGameProviderIncluded = false;

                var sendData = {};
                if (vm.gameProviderGroup && vm.gameProviderGroup.length) {
                    let gameProviderGroupId = [];
                    vm.partnerCommission.isGameProviderIncluded = true;

                    vm.gameProviderGroup.forEach(gameProviderGroup => {
                        if (gameProviderGroup && gameProviderGroup._id) {
                            gameProviderGroupId.push(gameProviderGroup._id);
                        }
                    });

                    sendData = {
                        query: {
                            platform: vm.selectedPlatform.id,
                            commissionType: vm.constPartnerCommisionType[vm.commissionSettingTab].toString(),
                            provider: {$in: gameProviderGroupId}
                        }
                    }
                }

                socketService.$socket($scope.AppSocket, 'getPartnerCommissionConfigWithGameProviderGroup', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        let existProviderCommissionSetting = [];
                        vm.customPartnerCommission = [];

                        if (data && data.data && data.data.length) {
                            data.data.filter(existSetting => {
                                vm.gameProviderGroup.filter(gameProviderGroup => {
                                    if (gameProviderGroup._id == existSetting.provider && !vm.partnerCommission.gameProviderGroup.some(e => e.name === gameProviderGroup.name)) {
                                        vm.partnerCommission.gameProviderGroup.push(gameProviderGroup);
                                        if (vm.partnerCommission.gameProviderGroup.length > 0) {
                                            vm.partnerCommission.gameProviderGroup.filter(data => {
                                                if (data._id == existSetting.provider && !existSetting.partner) {
                                                    data.srcConfig = existSetting;
                                                    data.showConfig = JSON.parse(JSON.stringify(existSetting));
                                                }
                                            });
                                        }
                                    }
                                });

                                if (existSetting.partner) {
                                    vm.customPartnerCommission.push(existSetting);
                                }
                            });

                            // get which provider is available
                            data.data.forEach(exist => {
                                existProviderCommissionSetting.push(exist.provider);
                            });

                            if (vm.gameProviderGroup && vm.gameProviderGroup.length) {
                                vm.gameProviderGroup.forEach(function (obj) {
                                    if (existProviderCommissionSetting.indexOf(obj._id) == -1) {
                                        let tempGameProviderGroupId = obj._id;
                                        vm.partnerCommission.gameProviderGroup.push(obj);
                                        if (vm.partnerCommission.gameProviderGroup.length > 0) {
                                            vm.partnerCommission.gameProviderGroup.forEach(data => {
                                                if (data._id == tempGameProviderGroupId) {
                                                    data.srcConfig = null;
                                                    data.showConfig = {};
                                                    data.showConfig.commissionSetting = [];
                                                    data.showConfig.commissionSetting.push({
                                                        playerConsumptionAmountFrom: "",
                                                        playerConsumptionAmountTo: "",
                                                        activePlayerValueFrom: "",
                                                        activePlayerValueTo: "",
                                                        commissionRate: "",
                                                        isEditing: false,
                                                        isCreateNew: true
                                                    });
                                                    data.showConfig.platform = vm.selectedPlatform.id;
                                                    data.showConfig.commissionType = vm.constPartnerCommisionType[vm.commissionSettingTab];
                                                }
                                            })
                                        }
                                    }
                                });
                            }

                        } else {
                            if (vm.gameProviderGroup.length > 0) {
                                vm.gameProviderGroup.forEach(data => {
                                    let tempGameProviderGroupId = data._id;
                                    vm.partnerCommission.gameProviderGroup.push(data);
                                    if (vm.partnerCommission.gameProviderGroup.length > 0) {
                                        vm.partnerCommission.gameProviderGroup.forEach(data => {
                                            if (data._id == tempGameProviderGroupId) {
                                                data.srcConfig = null;
                                                data.showConfig = {};
                                                data.showConfig.commissionSetting = [];
                                                data.showConfig.commissionSetting.push({
                                                    playerConsumptionAmountFrom: "",
                                                    playerConsumptionAmountTo: "",
                                                    activePlayerValueFrom: "",
                                                    activePlayerValueTo: "",
                                                    commissionRate: "",
                                                    isEditing: false,
                                                    isCreateNew: true
                                                });
                                                data.showConfig.platform = vm.selectedPlatform.id;
                                                data.showConfig.commissionType = vm.constPartnerCommisionType[vm.commissionSettingTab];
                                            }
                                        })
                                    }
                                });
                                vm.partnerCommission.isEditing = false;
                                vm.isSettingExist = false;
                            }
                        }

                        if (partnerObjId) {
                            vm.partnerCommission = commonService.applyPartnerCustomRate(partnerObjId, vm.partnerCommission, vm.customPartnerCommission);
                        }

                        if (vm.partnerCommission.gameProviderGroup && vm.partnerCommission.gameProviderGroup.length > 0) {
                            vm.partnerCommission.gameProviderGroup.forEach(grp => {
                                if (grp.showConfig && grp.showConfig.commissionSetting && grp.showConfig.commissionSetting.length > 0) {
                                    grp.showConfig.commissionSetting.forEach(e => {
                                        // Change to percentage format
                                        e.commissionRate = parseFloat((e.commissionRate * 100).toFixed(2));
                                    });

                                    //clone a copy of original customized config for cancel setting purpose
                                    grp.srcCustomConfig = grp.showConfig ? JSON.parse(JSON.stringify(grp.showConfig)) : {};
                                }
                            });
                        }
                    })
                });
            }
            vm.getPartnerCommisionConfig = function () {
                vm.isSettingExist = true;
                vm.partnerCommission.isGameProviderIncluded = false;
                var sendData = {
                    query: {
                        platform: vm.selectedPlatform.id,
                        commissionType: vm.constPartnerCommisionType[vm.commissionSettingTab].toString()
                    }
                }

                socketService.$socket($scope.AppSocket, 'getPartnerCommissionConfig', sendData, function (data) {
                    vm.partnerCommission.srcConfig = data.data;
                    vm.partnerCommission.showConfig = data.data ? $.extend({}, data.data) : {};
                    if (!Object.keys(vm.partnerCommission.showConfig).length) {
                        vm.partnerCommission.showConfig = {};
                        vm.partnerCommission.showConfig.commissionSetting = [];
                        vm.commissionSettingNewRow(vm.partnerCommission.showConfig.commissionSetting);

                    }

                    $scope.safeApply();
                });
            }

            function getActivePlayerTableHeader (commissionSettingTab) {
                switch (vm.commissionSettingTab) {
                    case 'DAILY_BONUS_AMOUNT':
                        return 'DAILY_ACTIVE_PLAYER';
                    case 'WEEKLY_BONUS_AMOUNT':
                    case 'WEEKLY_CONSUMPTION':
                        return 'WEEKLY_ACTIVE_PLAYER';
                    case 'BIWEEKLY_BONUS_AMOUNT':
                        return 'HALFMONTH_ACTIVE_PLAYER';
                    case 'MONTHLY_BONUS_AMOUNT':
                        return 'MONTHLY_ACTIVE_PLAYER';
                    default:
                        return '';
                }
            }

            vm.selectedCommissionTab = function (tab, partnerObjId) {
                let isGetConfig = true;

                vm.commissionSettingTab = tab ? tab : 'DAILY_BONUS_AMOUNT';
                vm.partnerCommission.isEditing = false;
                vm.partnerCommission.isCustomized = false;

                if (vm.commissionSettingTab != 'WEEKLY_CONSUMPTION') {
                    vm.playerConsumptionTableHeader = 'TotalPlayerConsumptionBonusAmount';
                } else {
                    vm.playerConsumptionTableHeader = 'TotalPlayerValidAmount';
                }

                switch (vm.commissionSettingTab) {
                    case 'DAILY_BONUS_AMOUNT':
                        vm.activePlayerTableHeader = 'DAILY_ACTIVE_PLAYER';
                        break;
                    case 'WEEKLY_BONUS_AMOUNT':
                    case 'WEEKLY_CONSUMPTION':
                        vm.activePlayerTableHeader = 'WEEKLY_ACTIVE_PLAYER';
                        break;
                    case 'BIWEEKLY_BONUS_AMOUNT':
                        vm.activePlayerTableHeader = 'HALFMONTH_ACTIVE_PLAYER';
                        break;
                    case 'MONTHLY_BONUS_AMOUNT':
                        vm.activePlayerTableHeader = 'MONTHLY_ACTIVE_PLAYER';
                        break;
                    default:
                        isGetConfig = false;
                }

                if (isGetConfig) {
                    if (vm.gameProviderGroup && vm.gameProviderGroup.length > 0) {
                        vm.getPartnerCommissionConfigWithGameProviderConfig(partnerObjId);
                    } else {
                        vm.getPartnerCommisionConfig();
                    }
                }

            };
            vm.commissionSettingNewRow = (valueCollection, idx) => {
                if (!valueCollection.length) {
                    valueCollection.splice(idx + 1, 0, {
                        playerConsumptionAmountFrom: "",
                        playerConsumptionAmountTo: "",
                        activePlayerValueFrom: "",
                        activePlayerValueTo: "",
                        commissionRate: "",
                        isEditing: false,
                        isCreateNew: true
                    });
                    vm.partnerCommission.isEditing = false;
                    vm.isSettingExist = false
                } else {
                    valueCollection.splice(idx + 1, 0, {
                        playerConsumptionAmountFrom: "",
                        playerConsumptionAmountTo: "",
                        activePlayerValueFrom: "",
                        activePlayerValueTo: "",
                        commissionRate: "",
                        isEditing: true,
                        isCreateNew: true
                    });
                    vm.partnerCommission.isEditing = true;
                }

                if (vm.gameProviderGroup && vm.gameProviderGroup.length <= 0) {
                    vm.partnerCommission.showConfig.platform = vm.selectedPlatform.id;
                    vm.partnerCommission.showConfig.commissionType = vm.constPartnerCommisionType[vm.commissionSettingTab];
                }

            };
            vm.commissionSettingDeleteRow = (idx, valueCollection) => {
                valueCollection.splice(idx, 1);

                if (valueCollection.length == 0) {
                    valueCollection.push({
                        playerConsumptionAmountFrom: "",
                        playerConsumptionAmountTo: "",
                        activePlayerValueFrom: "",
                        activePlayerValueTo: "",
                        commissionRate: "",
                        isEditing: true,
                        isCreateNew: true
                    });
                }

                if (vm.partnerCommission.showConfig != vm.partnerCommission.srcConfig) {
                    vm.partnerCommission.isEditing = true;
                } else {
                    vm.showHideSubmitCommissionConfigButton(valueCollection);
                }
            };
            vm.commissionSettingEditRow = (idx, valueCollection) => {
                valueCollection[idx].isEditing = true;
                vm.partnerCommission.isEditing = true;
            };

            vm.commissionSettingEditAll = (data, flag) => {
                if (data && data.length > 0) {
                    data.forEach((providerGroup, index) => {
                        if (providerGroup && providerGroup.showConfig && providerGroup.showConfig.commissionSetting) {
                            providerGroup.showConfig.commissionSetting.forEach(setting => {
                                setting.isEditing = flag;
                            })
                        }

                        vm.commissionSettingIsEditAll[index] = flag;
                    });
                }
            }

            vm.getCommissionSettingIsEditAll = (index) => {
                return vm.commissionSettingIsEditAll[index];
            }

            vm.commissionSettingCancelRow = (idx, valueCollection, originalCollection, isCancelByRow, isFromCustomizedPage, originalCustomizedConfig) => {
                if (valueCollection[idx].isCreateNew) {
                    valueCollection[idx].isCreateNew = false;
                    valueCollection.splice(idx, 1);
                }

                if (valueCollection[idx] && valueCollection[idx].isEditing) {
                    valueCollection[idx].isEditing = false;
                }

                vm.showHideSubmitCommissionConfigButton(valueCollection);
                if (vm.partnerCommission.isGameProviderIncluded) {
                    if(valueCollection[idx] && !valueCollection[idx].isEditing) {
                        if (valueCollection[idx] && valueCollection[idx].isCustomized) {
                            if (originalCustomizedConfig && originalCustomizedConfig[idx] && Object.keys(originalCustomizedConfig[idx]).length > 0) {
                                valueCollection[idx] = JSON.parse(JSON.stringify(originalCustomizedConfig[idx]));
                            }
                        } else {
                            if (isCancelByRow) {
                                if (isFromCustomizedPage) {
                                    valueCollection[idx] = JSON.parse(JSON.stringify(originalCustomizedConfig[idx]));
                                } else {
                                    valueCollection[idx] = JSON.parse(JSON.stringify(originalCollection[idx]));
                                    vm.convertCommissionRate(valueCollection[idx], false);
                                }
                            } else {
                                originalCollection.filter(originalSetting => {
                                    if (valueCollection[idx]._id == originalSetting._id) {
                                        valueCollection[idx] = JSON.parse(JSON.stringify(originalSetting));
                                        vm.convertCommissionRate(valueCollection[idx], true);
                                    }
                                });
                            }
                        }
                    }
                } else {
                    vm.partnerCommission.showConfig = vm.partnerCommission.srcConfig;
                }
            };

            vm.convertCommissionRate = function(config, isMultiple) {
                // Change to percentage format
                if (!isMultiple) {
                    if (config && Object.keys(config).length > 0) {
                        if (config.commissionRate) {
                            config.commissionRate = parseFloat((config.commissionRate * 100).toFixed(2));
                        }
                    }
                } else {
                    if (config.showConfig && config.showConfig.commissionSetting && config.showConfig.commissionSetting.length > 0) {
                        config.showConfig.commissionSetting.forEach(e => {
                            e.commissionRate = parseFloat((e.commissionRate * 100).toFixed(2));
                        });
                    }
                }
            };

            vm.isSetAllDisablePartnerConfigSetting = function (showSetting, isEditing, isProviderGroupIncluded, srcSetting) {
                if (isProviderGroupIncluded) {
                    for (var i in showSetting) {
                        if (showSetting[i].showConfig && showSetting[i].showConfig.commissionSetting) {
                            for (var j in showSetting[i].showConfig.commissionSetting) {
                                showSetting[i].showConfig.commissionSetting[j].isEditing = isEditing;
                            }
                        }
                    }
                } else {
                    if (showSetting.commissionSetting && showSetting.commissionSetting.length) {
                        for (var i in showSetting.commissionSetting) {
                            showSetting.commissionSetting[i].isEditing = isEditing;
                        }
                    }
                }

                if (isEditing) {
                    vm.partnerCommission.isEditing = true;
                    vm.isSettingExist = true;
                } else {
                    vm.partnerCommission.isEditing = false;
                    vm.isSettingExist = false;

                    if (isProviderGroupIncluded) {
                        for (var i in showSetting) {
                            for (var j in srcSetting) {
                                if (showSetting[i]._id == srcSetting[j]._id) {

                                    if (!showSetting[i].srcConfig) {
                                        showSetting[i].showConfig = JSON.parse(JSON.stringify(srcSetting[j].showConfig));
                                    } else {
                                        showSetting[i].showConfig = JSON.parse(JSON.stringify(srcSetting[j].srcConfig));
                                        vm.convertCommissionRate(showSetting[i], true);
                                    }
                                }
                            }
                        }
                    } else {
                        if (!srcSetting) {
                            showSetting.commissionSetting = showSetting.commissionSetting;
                        } else {
                            showSetting.commissionSetting = srcSetting.commissionSetting;
                        }
                    }
                }
            };

            vm.commissionRateEditRow = (field, flag) => {
                vm.commissionRateConfig.isEditing[field] = flag;
            };

            vm.commissionRateEditAll = (flag) => {
                vm.commissionRateConfig.isEditing["rateAfterRebatePromo"] = flag;
                vm.commissionRateConfig.isEditing["rateAfterRebatePlatform"] = flag;
                vm.commissionRateConfig.isEditing["rateAfterRebateGameProviderGroup"] = flag;
                vm.commissionRateConfig.isEditing["rateAfterRebateTotalDeposit"] = flag;
                vm.commissionRateConfig.isEditing["rateAfterRebateTotalWithdrawal"] = flag;
                vm.commissionRateIsEditAll = flag
            };

            vm.getCommissionRateIsEditAll = () => {
                return vm.commissionRateIsEditAll;
            }

            vm.showHideSubmitCommissionConfigButton = (valueCollection) => {
                if (valueCollection && valueCollection.length > 0) {
                    vm.partnerCommission.isEditing = false;
                    for (let i = 0; i < valueCollection.length; i++) {
                        if (valueCollection[i] && valueCollection[i].isEditing) {
                            vm.partnerCommission.isEditing = true;
                        }
                    }
                }
            };
            vm.submitPartnerCommissionConfigWithGameProviderGroup = function () {
                if (vm.partnerCommission && vm.partnerCommission.gameProviderGroup && vm.partnerCommission.gameProviderGroup.length) {
                    let p = Promise.resolve();

                    vm.partnerCommission.gameProviderGroup.forEach(gameProviderGroup => {
                        if (gameProviderGroup && gameProviderGroup.showConfig && gameProviderGroup.showConfig.commissionSetting.length > 0) {
                            if (JSON.stringify(gameProviderGroup.showConfig) != JSON.stringify(gameProviderGroup.srcConfig)) {
                                let tempShowConfig = gameProviderGroup.showConfig;

                                // Convert back commissionRate to percentage
                                tempShowConfig.commissionSetting.forEach(e => {
                                    e.commissionRate = parseFloat((e.commissionRate / 100).toFixed(4));
                                });

                                if(tempShowConfig.commissionSetting && tempShowConfig.commissionSetting.length > 0) {
                                    for (let i = 0; i < tempShowConfig.commissionSetting.length; i++) {
                                        if ((tempShowConfig.commissionSetting[i].playerConsumptionAmountFrom == '' || tempShowConfig.commissionSetting[i].playerConsumptionAmountFrom == null) &&
                                            (tempShowConfig.commissionSetting[i].activePlayerValueFrom == '' || tempShowConfig.commissionSetting[i].activePlayerValueFrom == null) &&
                                            (tempShowConfig.commissionSetting[i].commissionRate == '' || tempShowConfig.commissionSetting[i].commissionRate == null)) {

                                            tempShowConfig.commissionSetting.splice(i, 1);
                                        }
                                    }
                                }

                                if(tempShowConfig.commissionSetting && tempShowConfig.commissionSetting.length > 0) {
                                    gameProviderGroup.showConfig.provider = gameProviderGroup._id;

                                    var sendData = {
                                        query: {
                                            platform: tempShowConfig.platform ? tempShowConfig.platform : vm.selectedPlatform.id,
                                            _id: tempShowConfig._id
                                        },
                                        updateData: tempShowConfig
                                    }

                                    p = p.then(function () {
                                        return $scope.$socketPromise('createUpdatePartnerCommissionConfigWithGameProviderGroup', sendData).then(res => {
                                            console.log('success', res);
                                        })
                                    });
                                }
                            }
                        }
                    });

                    return p.then(()=> {
                        $scope.$evalAsync(vm.getPartnerCommissionConfigWithGameProviderConfig);
                    });
                }
            }
            vm.createUpdatePartnerCommissionConfig = function () {
                var sendData = {
                    query: {
                        platform: vm.selectedPlatform.id,
                        _id: vm.partnerCommission.showConfig._id
                    },
                    updateData: vm.partnerCommission.showConfig
                }
                socketService.$socket($scope.AppSocket, 'createUpdatePartnerCommissionConfig', sendData, function (data) {
                    console.log('createUpdatePartnerCommissionConfig success:', data);
                    vm.partnerCommission.isEditing = false;
                    vm.getPartnerCommisionConfig();
                    $scope.safeApply();
                });
            };
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
                if (vm.partnerCommission.showConfig) {
                    if (vm.commissionSettingTab) {
                        vm.partnerCommission.showConfig.commissionType = vm.constPartnerCommisionType[vm.commissionSettingTab];
                    }
                }

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
            };

            vm.customizeCommissionRate = (idx, setting, newConfig, oldConfig, isRevert = false) => {
                if (vm.commissionSettingIsEditAll) {
                    for (let key in vm.commissionSettingIsEditAll) {
                        vm.commissionSettingIsEditAll[key] = false;
                    }
                }

                if (isRevert) {
                    let customCount = newConfig.commissionSetting.filter(e => e.isCustomized).length;
                    newConfig.commissionSetting[idx].commissionRate = parseFloat((oldConfig.commissionSetting[idx].commissionRate * 100).toFixed(2));
                    isRevert = --customCount === 0;
                }

                // Convert back commissionRate to percentage
                newConfig.commissionSetting.forEach(e => {
                    e.commissionRate = parseFloat((e.commissionRate / 100).toFixed(4));
                });

                // Check setting has changed or not
                if (newConfig || isRevert) {
                    let sendData = {
                        partnerObjId: vm.selectedSinglePartner._id,
                        settingObjId: setting.srcConfig._id,
                        field: "commissionRate",
                        oldConfig: oldConfig,
                        newConfig: newConfig,
                        isRevert: isRevert,
                        isPlatformRate: false,
                        commissionType: setting.srcConfig.commissionType
                    };

                    socketService.$socket($scope.AppSocket, 'customizePartnerCommission', sendData, function (data) {
                        $scope.$evalAsync(() => {
                            vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                            vm.getPlatformPartnersData();
                        });
                    });
                }
            };

            vm.isDetectChangeCustomizeCommissionRate = (setting) => {
                if (setting) {
                    setting.isDetectChangeCustomizeRate = true;
                }
            };

            vm.updateAllCustomizeCommissionRate = (setting) => {
                let oldConfigArr = [];
                let newConfigArr = [];
                if (setting && setting.length > 0) {
                    setting.forEach(providerGroup => {
                        if (providerGroup.showConfig && providerGroup.srcConfig && providerGroup.showConfig.hasOwnProperty('isDetectChangeCustomizeRate')) {
                            delete providerGroup.showConfig.isDetectChangeCustomizeRate;
                            oldConfigArr.push(providerGroup.srcConfig);
                            newConfigArr.push(providerGroup.showConfig);
                        }
                    });
                }

                if (oldConfigArr && newConfigArr && oldConfigArr.length > 0 && newConfigArr.length > 0) {
                    let sendData = {
                        partnerObjId: vm.selectedSinglePartner._id,
                        commissionType: vm.constPartnerCommisionType[vm.commissionSettingTab],
                        oldConfigArr: oldConfigArr,
                        newConfigArr: newConfigArr
                    };

                    socketService.$socket($scope.AppSocket, 'updateAllCustomizeCommissionRate', sendData, function (data) {
                        $scope.$evalAsync(() => {
                            vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                            vm.getPlatformPartnersData();
                        });
                    }, function (err) {
                        vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                        vm.getPlatformPartnersData();
                    });
                }
            }

            vm.customizeCommissionRateAll = (idx, setting, newConfig, oldConfig) => {
                // let setting;
                // let newConfig;
                // let oldConfig;

                // Convert back commissionRate to percentage
                newConfig.commissionSetting.forEach(e => {
                    e.commissionRate = parseFloat((e.commissionRate / 100).toFixed(4));
                });

                // Check setting has changed or not
                if (newConfig || isRevert) {
                    let sendData = {
                        partnerObjId: vm.selectedSinglePartner._id,
                        settingObjId: setting.srcConfig._id,
                        field: "commissionRate",
                        oldConfig: oldConfig,
                        newConfig: newConfig,
                        isRevert: false,
                        isPlatformRate: false,
                        commissionType: setting.srcConfig.commissionType,
                    };

                    socketService.$socket($scope.AppSocket, 'customizePartnerCommission', sendData, function (data) {
                        $scope.$evalAsync(() => {
                            vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                            vm.getPlatformPartnersData();
                        });
                    });
                }
            };

            vm.resetAllCustomizedCommissionRate = function () {
                if (vm.commissionSettingIsEditAll) {
                    for (let key in vm.commissionSettingIsEditAll) {
                        vm.commissionSettingIsEditAll[key] = false;
                    }
                }

                let sendData = {
                    partnerObjId: vm.selectedSinglePartner._id,
                    field: "Reset all commission rate",
                    isResetAll: true,
                    commissionType: vm.constPartnerCommisionType[vm.commissionSettingTab]
                };

                socketService.$socket($scope.AppSocket, 'resetAllCustomizedCommissionRate', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                        vm.getPlatformPartnersData();
                    });
                });
            };

            vm.customizePartnerRate = (config, field, isRevert = false) => {
                let isDelete = true;
                let normalRates = ['rateAfterRebatePromo', 'rateAfterRebatePlatform', 'rateAfterRebateTotalDeposit', 'rateAfterRebateTotalWithdrawal'];

                if (isRevert) {
                    if (field === 'rateAfterRebateGameProviderGroup') {
                        let oriSett = vm.srcCommissionRateConfig.rateAfterRebateGameProviderGroup;

                        config.rateAfterRebateGameProviderGroup = config.rateAfterRebateGameProviderGroup.map(e => {
                            if (e.isRevert) {
                                oriSett.forEach(h => {
                                    if (String(h.gameProviderGroupId) === String(e.gameProviderGroupId)) {
                                        e.rate = h.rate;
                                        delete e.isRevert;
                                        delete e.isCustomized;
                                    }
                                })
                            }

                            return e;
                        })
                    } else {
                        config[field] = vm.srcCommissionRateConfig[field];
                    }
                }

                normalRates.forEach(e => {
                    if (config[e] != vm.srcCommissionRateConfig[e]) {
                        isDelete = false;
                    }
                });

                config.rateAfterRebateGameProviderGroup.forEach(e => {
                    let src = vm.srcCommissionRateConfig.rateAfterRebateGameProviderGroup.filter(grp => String(grp.gameProviderGroupId) === String(e.gameProviderGroupId))[0];

                    if (e.rate != src.rate) {
                        isDelete = false;
                    }
                });

                let sendData = {
                    partnerObjId: vm.selectedSinglePartner._id,
                    settingObjId: config._id,
                    field: "partnerRate",
                    oldConfig: vm.srcCommissionRateConfig,
                    newConfig: config,
                    isRevert: isRevert,
                    isPlatformRate: true,
                    isDelete: isDelete,
                    commissionType: vm.constPartnerCommisionType[vm.commissionSettingTab]
                };

                socketService.$socket($scope.AppSocket, 'customizePartnerCommission', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        vm.selectedCommissionTab(vm.commissionSettingTab, vm.selectedSinglePartner._id);
                        vm.getCommissionRateGameProviderGroup();
                        vm.getPlatformPartnersData();
                        vm.commissionRateEditRow(field, false);
                    })
                });

            };

            vm.getCommissionRateGameProviderGroup = function () {
                vm.isCommissionRateEditing = false;
                vm.rateAfterRebateGameProviderGroup = [];
                vm.rateAfterRebatePromo = null;
                vm.rateAfterRebatePlatform = null;
                vm.rateAfterRebateTotalDeposit = null;
                vm.rateAfterRebateTotalWithdrawal = null;
                vm.custCommissionRateConfig = [];
                vm.srcCommissionRateConfig = {};

                let sendData = {
                    query: { platform: vm.selectedPlatform.id }
                };

                socketService.$socket($scope.AppSocket, 'getPartnerCommissionRateConfig', sendData, function (data) {
                    if (data && data.data && data.data.length > 0) {
                        data.data.forEach(config => {
                            if (config.partner) {
                                vm.custCommissionRateConfig.push(config);
                            } else {
                                // source config
                                vm.srcCommissionRateConfig = config;
                                vm.commissionRateConfig = JSON.parse(JSON.stringify(config));

                                vm.rateAfterRebatePromo = vm.commissionRateConfig.rateAfterRebatePromo;
                                vm.rateAfterRebatePlatform = vm.commissionRateConfig.rateAfterRebatePlatform;
                                if (vm.gameProviderGroup && vm.gameProviderGroup.length > 0) {
                                    vm.gameProviderGroup.forEach(gameProviderGroup => {
                                        let providerGroupRate = {gameProviderGroupId: gameProviderGroup._id, name: gameProviderGroup.name};
                                        if (vm.commissionRateConfig && vm.commissionRateConfig.rateAfterRebateGameProviderGroup && vm.commissionRateConfig.rateAfterRebateGameProviderGroup.length > 0) {
                                            vm.commissionRateConfig.rateAfterRebateGameProviderGroup.map(availableProviderGroupRate => {
                                                if (gameProviderGroup._id == availableProviderGroupRate.gameProviderGroupId) {
                                                    providerGroupRate = availableProviderGroupRate;
                                                }
                                            })
                                        }
                                        vm.rateAfterRebateGameProviderGroup.push(providerGroupRate);
                                    })
                                }

                                vm.rateAfterRebateTotalDeposit = vm.commissionRateConfig.rateAfterRebateTotalDeposit;
                                vm.rateAfterRebateTotalWithdrawal = vm.commissionRateConfig.rateAfterRebateTotalWithdrawal;
                                vm.commissionRateConfig.isEditing = vm.commissionRateConfig.isEditing || {};
                            }
                        })
                    } else {
                        if (vm.gameProviderGroup && vm.gameProviderGroup.length > 0) {
                            vm.gameProviderGroup.forEach(gameProviderGroup => {
                                vm.rateAfterRebateGameProviderGroup.push({gameProviderGroupId: gameProviderGroup._id, name: gameProviderGroup.name});
                            })
                        }
                    }
                });
            };

            vm.editPartnerRateSetting = function () {
                vm.isCommissionRateEditing = true;
            };

            vm.cancelPartnerRateSetting = function () {
                vm.isCommissionRateEditing = false;
                vm.rateAfterRebatePromo = vm.srcCommissionRateConfig.rateAfterRebatePromo;
                vm.rateAfterRebatePlatform = vm.srcCommissionRateConfig.rateAfterRebatePlatform;
                vm.rateAfterRebateGameProviderGroup = vm.srcCommissionRateConfig.rateAfterRebateGameProviderGroup;
                vm.rateAfterRebateTotalDeposit = vm.srcCommissionRateConfig.rateAfterRebateTotalDeposit;
                vm.rateAfterRebateTotalWithdrawal = vm.srcCommissionRateConfig.rateAfterRebateTotalWithdrawal;
            };

            vm.createUpdateCommissionRateSetting = function () {

                var updateDate = {
                    platform: vm.selectedPlatform.id,
                    rateAfterRebatePromo: vm.rateAfterRebatePromo,
                    rateAfterRebatePlatform: vm.rateAfterRebatePlatform,
                    rateAfterRebateGameProviderGroup: vm.rateAfterRebateGameProviderGroup,
                    rateAfterRebateTotalDeposit: vm.rateAfterRebateTotalDeposit,
                    rateAfterRebateTotalWithdrawal: vm.rateAfterRebateTotalWithdrawal
                }

                var sendData = {
                    query: {
                        platform: vm.selectedPlatform.id
                    },
                    updateData: updateDate
                }
                socketService.$socket($scope.AppSocket, 'createUpdatePartnerCommissionRateConfig', sendData, function (data) {
                    console.log('commissionRateConfig success ',data);
                    vm.isCommissionRateEditing = false;
                    $scope.safeApply();
                });
            };

            vm.validateNumber = function (value, fieldName, idx) {
                var rgx = /^[0-9]*\.?[0-9]*$/;

                if(value.match(rgx)) {
                    return value.match(rgx);
                } else {
                    if (fieldName = 'rateAfterRebateGameProviderGroup') {
                        vm[fieldName][idx].rate = '';
                    } else {
                        vm[fieldName] = '';
                    }
                }

            }
            // partner commission config end

            vm.submitAddPlayerLvl = function () {
                var sendData = vm.newPlayerLvl;
                vm.newPlayerLvl.platform = vm.selectedPlatform.id;
                let levelUpConfig = vm.newPlayerLvl.levelUpConfig;
                for (let j = 0; j < levelUpConfig.length; j++) {
                    if (vm.allPlayerLevelUpPeriod[levelUpConfig[j].topupPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod
                        || vm.allPlayerLevelUpPeriod[levelUpConfig[j].consumptionPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod) {
                        vm.platformBatchLevelUp = false;
                        break;
                    } else if (vm.isDiffConsumptionProvider(levelUpConfig[j].consumptionSourceProviderId)) {
                        vm.platformBatchLevelUp = false;
                        break;
                    }
                }
                $scope.$socketPromise('createPlayerLevel', sendData)
                    .done(function (data) {
                        if (!vm.platformBatchLevelUp) {
                            let updateData = {
                                query: {_id: vm.selectedPlatform.id},
                                updateData: {
                                    platformBatchLevelUp: vm.platformBatchLevelUp,
                                    autoCheckPlayerLevelUp: vm.autoCheckPlayerLevelUp
                                }
                            }
                            socketService.$socket($scope.AppSocket, 'updatePlatform', updateData, function (data) {
                                loadPlatformData({loadAll: false});
                                vm.configTabClicked('player');

                            });
                        } else {
                            vm.configTabClicked('player');
                        }
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
                        vm.playerLevelDisplayListBeforeEdit = Lodash.cloneDeep(vm.playerLevelDisplayList);
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
                        vm.autoCheckPlayerLevelUp = vm.selectedPlatform.data.autoCheckPlayerLevelUp;

                        if (vm.playerLevelDisplayListBeforeEdit && vm.playerLevelDisplayListBeforeEdit.length > 0) {
                            vm.playerLevelDisplayList = vm.playerLevelDisplayListBeforeEdit;
                        } else {
                            if (vm.playerLevelDisplayList && !vm.playerLevelDisplayList.length) {
                                vm.playerLevelDisplayList.push({displayId:"", displayTitle:"", displayTextContent: "", btnOrImageList: []});
                            }
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

                        for (let i = 0; i < Object.keys(vm.playerLvlData).length; i++) {
                            let levelUpConfig = vm.playerLvlData[Object.keys(vm.playerLvlData)[i]].levelUpConfig;
                            for (let j = 0; j < levelUpConfig.length; j++) {
                                if (vm.allPlayerLevelUpPeriod[levelUpConfig[j].topupPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod
                                    || vm.allPlayerLevelUpPeriod[levelUpConfig[j].consumptionPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod) {
                                    vm.platformBatchLevelUp = false;
                                    break;
                                } else if (vm.isDiffConsumptionProvider(levelUpConfig[j].consumptionSourceProviderId)) {
                                    vm.platformBatchLevelUp = false;
                                    break;
                                }
                            }
                            if (vm.platformBatchLevelUp == false) {
                                break;
                            }
                        }

                        if (vm.playerLevelDisplayList && vm.playerLevelDisplayList.length > 0) {
                            for (let i=0; i < vm.playerLevelDisplayList.length; i++) {
                                if (vm.playerLevelDisplayList[i].displayId == "" && vm.playerLevelDisplayList[i].displayTitle == "" && vm.playerLevelDisplayList[i].displayTextContent == "") {
                                    vm.playerLevelDisplayList.splice(i, 1);
                                }
                            }

                            vm.playerLevelDisplayList = vm.playerLevelDisplayList || [];
                        }

                        updatePlatformBasic({
                            autoCheckPlayerLevelUp: vm.autoCheckPlayerLevelUp,
                            manualPlayerLevelUp: vm.manualPlayerLevelUp,
                            playerLevelUpPeriod: vm.playerLevelPeriod.playerLevelUpPeriod,
                            playerLevelDownPeriod: vm.playerLevelPeriod.playerLevelDownPeriod,
                            platformBatchLevelUp: vm.platformBatchLevelUp,
                            display: vm.playerLevelDisplayList
                        });
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
                    case 'partnerBasic':
                        updatePartnerBasic(vm.partnerBasic);
                        break;
                    case 'bonusBasic':
                        updatePlatformBasic(vm.bonusBasic);
                        break;
                    case 'autoApproval':
                        updateAutoApprovalConfig(vm.autoApprovalBasic);
                        break;
                    case 'monitor':
                        updateMonitorBasic(vm.monitorBasic);
                        break;
                    case 'PlayerValue':
                        updatePlayerValueConfig(vm.playerValueBasic);
                        updatePlayerLevelScore();
                        break;
                    case 'credibility':
                        updateCredibilityRemark();
                        break;
                    case 'promoSMSContent':
                        updatePromoSMSContent();
                        break;
                    case 'providerGroup':
                        updateProviderGroup();
                        break;
                    case 'smsGroup':
                        updateSmsGroup();
                        break;
                    case 'bulkPhoneCallSetting':
                        updateBulkCallBasic(vm.bulkCallBasic);
                        break;
                    case 'callRequestConfig':
                        updateCallRequestConfig(vm.callRequestConfig);
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

            function updateBulkCallBasic(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        maxRingTime: srcData.maxRingTime,
                        redialTimes: srcData.redialTimes,
                        minRedialInterval: srcData.minRedialInterval,
                        idleAgentMultiple: srcData.idleAgentMultiple,
                    }
                };

                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                });
            }

            function updateCallRequestConfig(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        callRequestUrlConfig: srcData.callRequestUrlConfig,
                        callRequestLineConfig: srcData.callRequestLineConfig
                    }
                };

                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                });
            }

            function updatePlatformBasic(srcData) {
                let whiteListingPhoneNumbers = [];
                let blackListingPhoneNumbers = [];

                if (srcData.whiteListingPhoneNumbers$) {
                    let phones = srcData.whiteListingPhoneNumbers$.split(/\r?\n/);
                    for (let i = 0, len = phones.length; i < len; i++) {
                        let phone = phones[i].trim();
                        if (phone) whiteListingPhoneNumbers.push(phone);
                    }
                }

                if (srcData.blackListingPhoneNumbers$) {
                    let phones = srcData.blackListingPhoneNumbers$.split(/\r?\n/);
                    for (let i = 0, len = phones.length; i < len; i++) {
                        let phone = phones[i].trim();
                        if (phone) blackListingPhoneNumbers.push(phone);
                    }
                }

                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        minTopUpAmount: srcData.showMinTopupAmount,
                        allowSameRealNameToRegister: srcData.showAllowSameRealNameToRegister,
                        allowSamePhoneNumberToRegister: srcData.showAllowSamePhoneNumberToRegister,
                        demoPlayerValidDays: srcData.demoPlayerValidDays,
                        samePhoneNumberRegisterCount: srcData.samePhoneNumberRegisterCount,
                        canMultiReward: srcData.canMultiReward,
                        autoCheckPlayerLevelUp: srcData.autoCheckPlayerLevelUp,
                        manualPlayerLevelUp: srcData.manualPlayerLevelUp,
                        platformBatchLevelUp: srcData.platformBatchLevelUp,
                        playerLevelUpPeriod: srcData.playerLevelUpPeriod,
                        playerLevelDownPeriod: srcData.playerLevelDownPeriod,
                        requireLogInCaptcha: srcData.requireLogInCaptcha,
                        requireCaptchaInSMS: srcData.requireCaptchaInSMS,
                        onlyNewCanLogin: srcData.onlyNewCanLogin,
                        useLockedCredit: srcData.useLockedCredit,
                        playerNameMaxLength: srcData.playerNameMaxLength,
                        playerNameMinLength: srcData.playerNameMinLength,
                        bonusSetting: srcData.bonusSetting,
                        requireSMSVerification: srcData.requireSMSVerification,
                        requireSMSVerificationForDemoPlayer: srcData.requireSMSVerificationForDemoPlayer,
                        requireSMSVerificationForPasswordUpdate: srcData.requireSMSVerificationForPasswordUpdate,
                        requireSMSVerificationForPaymentUpdate: srcData.requireSMSVerificationForPaymentUpdate,
                        smsVerificationExpireTime: srcData.smsVerificationExpireTime,
                        useProviderGroup: srcData.useProviderGroup,
                        whiteListingPhoneNumbers: whiteListingPhoneNumbers,
                        blackListingPhoneNumbers: blackListingPhoneNumbers,
                        usePointSystem: srcData.usePointSystem,
                        usePhoneNumberTwoStepsVerification: srcData.usePhoneNumberTwoStepsVerification,
                        playerForbidApplyBonusNeedCsApproval: srcData.playerForbidApplyBonusNeedCsApproval,
                        unreadMailMaxDuration: srcData.unreadMailMaxDuration,
                        manualRewardSkipAuditAmount: srcData.manualRewardSkipAuditAmount,
                        display: srcData.display,
                    }
                };
                let isProviderGroupOn = false;
                if (vm.selectedPlatform.data.useProviderGroup && !srcData.useProviderGroup) {
                    isProviderGroupOn = true;
                }
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                    if (isProviderGroupOn) {
                        vm.unlockPlatformProviderGroup()
                    }

                });
            }

            vm.partnerCommissionName = function getPartnerCommisionName() {
                if (vm.partnerBasic.partnerDefaultCommissionGroup) {
                    return Object.keys(vm.constPartnerCommisionType)[vm.partnerBasic.partnerDefaultCommissionGroup];
                } else {
                    return "CLOSED_COMMISSION";
                }
            }

            function updatePartnerBasic(srcData) {
                let whiteListingPhoneNumbers = [];
                let blackListingPhoneNumbers = [];

                if (srcData.whiteListingPhoneNumbers) {
                    let phones = srcData.whiteListingPhoneNumbers.split(/\r?\n/);
                    for (let i = 0, len = phones.length; i < len; i++) {
                        let phone = phones[i].trim();
                        if (phone) whiteListingPhoneNumbers.push(phone);
                    }
                }

                if (srcData.blackListingPhoneNumbers) {
                    let phones = srcData.blackListingPhoneNumbers.split(/\r?\n/);
                    for (let i = 0, len = phones.length; i < len; i++) {
                        let phone = phones[i].trim();
                        if (phone) blackListingPhoneNumbers.push(phone);
                    }
                }
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        partnerNameMaxLength: srcData.partnerNameMaxLength,
                        partnerNameMinLength: srcData.partnerNameMinLength,
                        partnerAllowSamePhoneNumberToRegister: srcData.partnerAllowSamePhoneNumberToRegister,
                        partnerSamePhoneNumberRegisterCount: srcData.partnerAllowSamePhoneNumberToRegister,
                        partnerAllowSameRealNameToRegister: srcData.partnerAllowSameRealNameToRegister,
                        whiteListingPhoneNumbers: whiteListingPhoneNumbers,
                        blackListingPhoneNumbers: blackListingPhoneNumbers,
                        partnerRequireSMSVerification: srcData.partnerRequireSMSVerification,
                        partnerRequireSMSVerificationForPasswordUpdate: srcData.partnerRequireSMSVerificationForPasswordUpdate,
                        partnerRequireSMSVerificationForPaymentUpdate: srcData.partnerRequireSMSVerificationForPaymentUpdate,
                        partnerSmsVerificationExpireTime: srcData.partnerSmsVerificationExpireTime,
                        partnerRequireLogInCaptcha: srcData.partnerRequireLogInCaptcha,
                        partnerRequireCaptchaInSMS: srcData.partnerRequireCaptchaInSMS,
                        partnerUsePhoneNumberTwoStepsVerification: srcData.partnerUsePhoneNumberTwoStepsVerification,
                        partnerUnreadMailMaxDuration: srcData.partnerUnreadMailMaxDuration,
                        partnerDefaultCommissionGroup: srcData.partnerDefaultCommissionGroup
                    }
                };
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                });
            }

            function updateAutoApprovalConfig(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        enableAutoApplyBonus: srcData.enableAutoApplyBonus,
                        manualAuditFirstWithdrawal: srcData.manualAuditFirstWithdrawal,
                        manualAuditAfterBankChanged: srcData.manualAuditAfterBankChanged,
                        manualAuditBanWithdrawal: srcData.manualAuditBanWithdrawal,
                        autoApproveWhenSingleBonusApplyLessThan: srcData.showAutoApproveWhenSingleBonusApplyLessThan,
                        autoApproveWhenSingleDayTotalBonusApplyLessThan: srcData.showAutoApproveWhenSingleDayTotalBonusApplyLessThan,
                        autoApproveLostThreshold: srcData.lostThreshold,
                        autoApproveConsumptionOffset: srcData.consumptionOffset,
                        autoApproveProfitTimes: srcData.profitTimes,
                        autoApproveProfitTimesMinAmount: srcData.profitTimesMinAmount,
                        autoApproveBonusProfitOffset: srcData.bonusProfitOffset,autoUnlockWhenInitAmtLessThanLostThreshold: srcData.autoUnlockWhenInitAmtLessThanLostThreshold,
                    }
                };
                console.log('\n\n\nupdateAutoApprovalConfig sendData', JSON.stringify(sendData));

                socketService.$socket($scope.AppSocket, 'updateAutoApprovalConfig', sendData, function (data) {
                    console.log('update auto approval socket', JSON.stringify(data));
                    loadPlatformData({loadAll: false});
                });
            }

            function updateMonitorBasic(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        monitorMerchantCount: srcData.monitorMerchantCount,
                        monitorPlayerCount: srcData.monitorPlayerCount,
                        monitorMerchantUseSound: srcData.monitorMerchantUseSound,
                        monitorPlayerUseSound: srcData.monitorPlayerUseSound,
                        monitorMerchantSoundChoice: srcData.monitorMerchantSoundChoice,
                        monitorPlayerSoundChoice: srcData.monitorPlayerSoundChoice
                    }
                };
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                });
            }

            function updatePlayerValueConfig(srcData) {
                let sendData = {
                    platformObjId: vm.selectedPlatform.id,
                    playerValueConfig: srcData
                };
                socketService.$socket($scope.AppSocket, 'updatePlayerValueConfig', sendData, function (data) {
                    loadPlatformData({loadAll: false});
                });
            }

            function updatePlayerLevelScore() {
                let sendData = {
                    platformObjId: vm.selectedPlatform.id,
                    playerLevel: vm.allPlayerLvl
                };
                socketService.$socket($scope.AppSocket, 'updatePlayerLevelScores', sendData, function (data) {
                    // do nothing
                });
            }

            function updateCredibilityRemark() {
                let updatedRemarks = vm.neutralRemarks.concat(vm.positiveRemarks, vm.negativeRemarks);
                let addRemarks = [];
                let updateRemarks = [];
                let deleteRemarks = [];

                for (let i = 0; i < updatedRemarks.length; i++) {
                    let updatedRemark = updatedRemarks[i];

                    if (!updatedRemark._id) {
                        addRemarks.push(updatedRemark);
                        continue;
                    }
                    if (updatedRemark.changed) {
                        updateRemarks.push(updatedRemark);
                    }
                }

                for (let i = 0; i < vm.removedRemarkId.length; i++) {
                    deleteRemarks.push({_id: vm.removedRemarkId[i]});
                }

                $scope.$socketPromise('updateCredibilityRemarksInBulk', {
                    platformObjId: vm.selectedPlatform.data._id,
                    addRemarks: addRemarks,
                    updateRemarks: updateRemarks,
                    deleteRemarks: deleteRemarks
                }).then(
                    data => {
                        vm.prepareCredibilityConfig();
                    }
                );
            }

            function updatePromoSMSContent(srcData) {
                vm.promoCodeType1.forEach(entry => entry.type = 1);
                vm.promoCodeType2.forEach(entry => entry.type = 2);
                vm.promoCodeType3.forEach(entry => entry.type = 3);

                let promoCodeSMSContent = vm.promoCodeType1.concat(vm.promoCodeType2, vm.promoCodeType3);

                if (vm.removeSMSContent && vm.removeSMSContent.length > 0) {
                    vm.removeSMSContent.map(r => {
                        let sendData = {
                            platformObjId: r.smsContent[0].platformObjId,
                            promoCodeSMSContent: r.smsContent,
                            promoCodeTypeObjId: r.smsContent[0]._id,
                            isDelete: r.isDelete ? r.isDelete : false,
                            isDeleted: r.updateIsDeletedFlag ? r.updateIsDeletedFlag : false
                        };

                        if (sendData.isDelete == true) {
                            // delete from the promoCodeType dB
                            socketService.$socket($scope.AppSocket, 'updatePromoCodeSMSContent', sendData, function (data) {
                                loadPlatformData({loadAll: false});
                            });
                        }

                        if (sendData.isDeleted == true) {
                            // delete the promoCodeType by setting the deleteFlag
                            // set the deleteFlag to be true for affected promoCodeType
                            sendData.promoCodeSMSContent[0].deleteFlag = true;
                            socketService.$socket($scope.AppSocket, 'updatePromoCodeSMSContent', sendData, function (data) {
                                // update the isDelete flag of each promoCode inherited from the deleted promoCodeType
                                socketService.$socket($scope.AppSocket, 'updatePromoCodeIsDeletedFlag', sendData, function (data) {
                                    loadPlatformData({loadAll: false});
                                });
                            });
                        }
                    });
                } else {
                    let sendData = {
                        platformObjId: vm.selectedPlatform.id,
                        promoCodeSMSContent: promoCodeSMSContent,
                        isDelete: false
                    };

                    socketService.$socket($scope.AppSocket, 'updatePromoCodeSMSContent', sendData, function (data) {
                        loadPlatformData({loadAll: false});
                    });
                }
            }

            vm.checkProviderGrouped = (providerId, curCollection) => {
                let isUsed = false;

                vm.gameProviderGroup.map((e) => {
                    if (e.providers && e.providers.indexOf(String(providerId)) > -1 && (!curCollection || curCollection.indexOf(String(providerId)) < 0)) {
                        isUsed = true;
                    }
                });
                vm.refreshDropDown();
                return isUsed;
            };

            vm.refreshDropDown = () => {
                $('.spicker').selectpicker('refresh');
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

            vm.playerLevelChangeIsRewardTask = level => {
                if (level && level.reward) {
                    if (level.reward.requiredUnlockTimes) {
                        level.reward.isRewardTask = true;
                    }
                    else {
                        level.reward.isRewardTask = false;
                    }
                }
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
                                    () => {
                                        vm.ensurePlayerLevelOrder();
                                        if (!vm.selectedPlatform.data.platformBatchLevelUp) {
                                            for (let i = 0; i < Object.keys(vm.playerLvlData).length; i++) {
                                                let levelUpConfig = vm.playerLvlData[Object.keys(vm.playerLvlData)[i]].levelUpConfig;
                                                for (let j = 0; j < levelUpConfig.length; j++) {
                                                    if (vm.allPlayerLevelUpPeriod[levelUpConfig[j].topupPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod
                                                        || vm.allPlayerLevelUpPeriod[levelUpConfig[j].consumptionPeriod] != vm.playerLevelPeriod.playerLevelUpPeriod) {
                                                        vm.platformBatchLevelUp = false;
                                                        break;
                                                    } else if (vm.isDiffConsumptionProvider(levelUpConfig[j].consumptionSourceProviderId)) {
                                                        vm.platformBatchLevelUp = false;
                                                        break;
                                                    }
                                                }
                                                if (vm.platformBatchLevelUp == false) {
                                                    break;
                                                }
                                            }

                                            let updateData = {
                                                query: {_id: vm.selectedPlatform.id},
                                                updateData: {
                                                    platformBatchLevelUp: vm.platformBatchLevelUp,
                                                    autoCheckPlayerLevelUp: vm.autoCheckPlayerLevelUp
                                                }
                                            }
                                            socketService.$socket($scope.AppSocket, 'updatePlatform', updateData, function (data) {
                                                loadPlatformData({loadAll: false});
                                            });
                                        }
                                    }
                                );
                                $scope.safeApply();
                            });
                        });
                        break;
                }
            };
            // partner level codes==============end===============================

            vm.getDepartmentUserIds = function (departmentId) {
                var userIds = [];

                if (!vm.departmentListObj) {
                    vm.departmentListObj = {};
                    for (let i = 0; i < vm.departments.length; i++) {
                        vm.departmentListObj[vm.departments[i]._id] = vm.departments[i];
                    }
                }

                if (!vm.departmentListObj[departmentId]) {
                    return [];
                }

                let currentDepartment = vm.departmentListObj[departmentId];
                userIds = userIds.concat(currentDepartment.users);
                if (currentDepartment.children && currentDepartment.children.length > 0) {
                    for (let i = 0; i < currentDepartment.children.length; i++) {
                        let childDepartmentId = currentDepartment.children[i];
                        userIds = userIds.concat(vm.getDepartmentUserIds(childDepartmentId));
                    }
                }

                return userIds;
            };

            vm.getPlatformAnnouncements = function () {
                if (!vm.selectedPlatform) return;
                $scope.$socketPromise('getPlatformAnnouncementsByPlatformId', {platformId: vm.selectedPlatform.data.platformId}).then(function (data) {
                    vm.allPlatformAnnouncements = data.data;
                    vm.allPlatformAnnouncements.sort((a, b) => a.order - b.order);
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
                    $scope.$evalAsync(() => {
                        vm.departments = data.data;
                    })
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

                vm.setSelectedMessageTemplateTypeIndex = function () {
                    for (let messageType in vm.allMessageTypes) {
                        if (vm.allMessageTypes[messageType].name == vm.displayedMessageTemplate.type) {
                            vm.displayedMessageTemplate.typeIndex = messageType;
                            if (vm.displayedMessageTemplate.type == "PromoCodeSend" && !vm.displayedMessageTemplate.content) {
                                vm.displayedMessageTemplate.content = $translate("*Please config message template at 『PromoCode』~『SmsContent』");
                            }
                            break;
                        }
                    }
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

                vm.messageTemplateInsertParameter = function (param) {
                    var box = document.getElementById('messageTemplateEditBox');
                    // var param = vm.messageTemplateParameterToInsert;
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
                    $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
                }, function (err) {
                    $scope.phoneCall.loadingNumber = false;
                    $scope.phoneCall.err = err.error.message;
                    alert($scope.phoneCall.err);
                    $scope.safeApply();
                }, true);
            }

            //////////////////////////initial socket actions//////////////////////////////////
            vm.setValue = function (obj, key, val) {
                if (obj && key) {
                    obj[key] = val;
                }
                return val;
            }
            vm.clearDatePicker = function (id) {
                utilService.clearDatePickerDate(id);
            }

        function initPageParam() {
            vm.phonePattern = /^[0-9]{8,11}$/;
            vm.showPlatformList = true;
            vm.showPlatformDropDownList = false;
            vm.ctiData = {};

            $('#partnerDataTable').on('order.dt', function (event, a, b) {
                // console.log(event, a, b);
                if (!a.aaSorting[0]) return;
                var sortCol = a.aaSorting[0][0];
                var sortDire = a.aaSorting[0][1];
                var sortKey = a.aoColumns[sortCol].data;
                // vm.advancedPartnerQueryObj.aaSorting = a.aaSorting;
                if (sortKey) {
                    vm.advancedPartnerQueryObj.sortCol = vm.advancedPartnerQueryObj.sortCol || {};
                    var preVal = vm.advancedPartnerQueryObj.sortCol[sortKey];
                    vm.advancedPartnerQueryObj.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                    if (vm.advancedPartnerQueryObj.sortCol[sortKey] != preVal) {
                        vm.advancedPartnerQueryObj.sortCol = {};
                        vm.advancedPartnerQueryObj.sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                        vm.getPartnersByAdvanceQueryDebounced();
                    }
                }
            });
            vm.getAllMessageTypes();
            $.getScript("dataSource/data.js").then(
                () => {
                    $scope.creditChangeTypeStrings = creditChangeTypeStrings.sort(function (a, b) {
                        return a < b;
                    })
                }
            );

            window.document.title = $translate(vm.platformPageName);
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
        }

            ////////////////Mark::$viewContentLoaded function//////////////////
            //##Mark content loaded function
            // $scope.$on('$viewContentLoaded', function () {
            var eventName = "$viewContentLoaded";
            if (!$scope.AppSocket) {
                eventName = "socketConnected";
                $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
            }
            $scope.$on(eventName, () => {
                initPageParam();
                loadPlatformData({loadAll: true, noParallelTrigger: true});
            });



            vm.initPlatformOfficer = function () {
                vm.csUrlSearchQuery = {
                    admin: "",
                    promoteWay: "",
                    url: ""
                };
                vm.platformOfficer = {};
                vm.officerPromoteMessage = "";
                vm.officerCreateMessage = "";
                vm.officerUrlMessage = "";
                vm.deletePromoteMessage = "";
                vm.deleteOfficer = {};
                vm.currentUrlEditSelect = {};
                vm.urlTableEdit = false;
                vm.getAllPromoteWay();
                vm.getAllUrl();
            };

            vm.initClearMessage = function () {
                vm.officerPromoteMessage = "";
                vm.deletePromoteMessage = "";
                vm.officerCreateMessage = "";
                vm.deleteOfficerMessage = "";
                vm.officerUrlMessage = "";
            };

            vm.initCreateUrl = function () {
                vm.urlTableAdd = true;
                vm.addOfficerUrl = {};
                vm.currentlyFocusedAnnouncement = vm.addOfficerUrl;
            };

            vm.urlCancelEditOrAdd = function () {
                vm.urlTableEdit = false;
                vm.urlTableAdd = false;
            };

            vm.addPromoteWay = function () {
                let officerPromoteMessageId = $("#officer-promote-message");
                vm.initClearMessage();
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    name: vm.platformOfficer.way
                };
                socketService.$socket($scope.AppSocket, 'addPromoteWay', sendData, function () {
                        console.log("PromoteWay created");
                        vm.platformOfficer.way = "";
                        vm.officerPromoteMessage = $translate('Approved');
                        officerPromoteMessageId.css("color", "green");
                        officerPromoteMessageId.css("font-weight", "bold");
                        vm.getAllPromoteWay();
                        $scope.safeApply();
                    },
                    function (err) {
                        officerPromoteMessageId.css("color", "red");
                        officerPromoteMessageId.css("font-weight", "normal");
                        vm.officerPromoteMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.getAllPromoteWay = function () {
                vm.allPromoteWay = {};
                let query = {
                    platformId: vm.selectedPlatform.id
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

            vm.deletePromoteWay = function () {
                let deletePromoteMessageId = $("#delete-promote-message");
                vm.initClearMessage();
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    promoteWayId: vm.deleteOfficer.promoteWay
                };
                socketService.$socket($scope.AppSocket, 'deletePromoteWay', sendData, function () {
                        console.log("PromoteWay deleted");
                        vm.deleteOfficer.promoteWay = "";
                        vm.deletePromoteMessage = $translate('Approved');
                        deletePromoteMessageId.css("color", "green");
                        deletePromoteMessageId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        deletePromoteMessageId.css("color", "red");
                        deletePromoteMessageId.css("font-weight", "normal");
                        vm.deletePromoteMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.createOfficer = function () {
                vm.initClearMessage();
                let createOfficerId = $("#officer-message");
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    name: vm.platformOfficer.name
                };
                socketService.$socket($scope.AppSocket, 'createOfficer', sendData, function () {
                        console.log("Officer created");
                        vm.platformOfficer.name = "";
                        vm.officerCreateMessage = $translate('Approved');
                        createOfficerId.css("color", "green");
                        createOfficerId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        createOfficerId.css("color", "red");
                        createOfficerId.css("font-weight", "normal");
                        vm.officerCreateMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.deleteOfficerById = function () {
                let deleteOfficerMessageId = $("#delete-officer-message");
                vm.initClearMessage();
                let sendData = {
                    officerId: vm.deleteOfficer.officerId
                };
                socketService.$socket($scope.AppSocket, 'deleteOfficer', sendData, function () {
                        console.log("Officer deleted");
                        vm.deleteOfficer.officerId = "";
                        vm.deleteOfficerMessage = $translate('Approved');
                        deleteOfficerMessageId.css("color", "green");
                        deleteOfficerMessageId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        deleteOfficerMessageId.css("color", "red");
                        deleteOfficerMessageId.css("font-weight", "normal");
                        vm.deleteOfficerMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.pickOfficer = function () {
                vm.platformOfficer.url = '';
                $scope.safeApply();
            };

            vm.addUrl = function () {
                let officeraddUrlMessageId = $("#officer-addUrl-message");
                vm.initClearMessage();
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    officerId: vm.addOfficerUrl.officer,
                    domain: vm.addOfficerUrl.url,
                    way: vm.addOfficerUrl.promoteWay
                };
                vm.selectedOfficerUrl = null;
                socketService.$socket($scope.AppSocket, 'addUrl', sendData, function () {
                        console.log("Officer Url created");
                        vm.getAllUrl();
                        vm.addOfficerUrl.url = "";
                        vm.addOfficerUrl.officer = '';
                        vm.addOfficerUrl.promoteWay = '';
                        vm.officerUrlMessage = $translate('Approved');
                        officeraddUrlMessageId.css("color", "green");
                        officeraddUrlMessageId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        officeraddUrlMessageId.css("color", "red");
                        officeraddUrlMessageId.css("font-weight", "normal");
                        vm.officerUrlMessage = err.error.errorMessage;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.deleteUrl = function () {
                let officeraddUrlMessageId = $("#officer-addUrl-message");
                vm.initClearMessage();
                let sendData = {
                    urlId: vm.currentUrlEditSelect._id,
                };
                vm.selectedOfficerUrl = null;
                socketService.$socket($scope.AppSocket, 'deleteUrl', sendData, function () {
                        console.log("Url deleted");
                        vm.getAllUrl();
                        vm.officerUrlMessage = $translate('Approved');
                        officeraddUrlMessageId.css("color", "green");
                        officeraddUrlMessageId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        officeraddUrlMessageId.css("color", "red");
                        officeraddUrlMessageId.css("font-weight", "normal");
                        vm.officerUrlMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            };

            vm.updateUrl = function () {
                let officeraddUrlMessageId = $("#officer-addUrl-message");
                vm.initClearMessage();
                let sendData = {
                    urlId: vm.currentUrlEditSelect._id,
                    domain: vm.currentUrlEditSelect.domain,
                    officerId: vm.currentUrlEditSelect.admin,
                    way: vm.currentUrlEditSelect.way,
                };
                console.log("sendData", sendData);
                vm.selectedOfficerUrl = null;
                socketService.$socket($scope.AppSocket, 'updateUrl', sendData, function () {
                        console.log("Url updated");
                        vm.getAllUrl();
                        vm.officerUrlMessage = $translate('Approved');
                        officeraddUrlMessageId.css("color", "green");
                        officeraddUrlMessageId.css("font-weight", "bold");
                        $scope.safeApply();
                    },
                    function (err) {
                        vm.getAllUrl();
                        officeraddUrlMessageId.css("color", "red");
                        officeraddUrlMessageId.css("font-weight", "normal");
                        vm.officerUrlMessage = err.error.message;
                        console.log(err);
                        $scope.safeApply();
                    });
            }

            vm.getPlayerCredibilityComment = function (playerObjId) {
                playerObjId = playerObjId || vm.selectedSinglePlayer._id;
                vm.playerCredibilityComment = [];
                let query = {
                    playerObjId: playerObjId
                };
                socketService.$socket($scope.AppSocket, 'getUpdateCredibilityLog', query, function (data) {
                        vm.playerCredibilityComment = data.data;
                        for (let i = 0, len = vm.playerCredibilityComment.length; i < len; i++) {
                            let log = vm.playerCredibilityComment[i];
                            log.remarks$ = "";
                            for (let j = 0, len = log.credibilityRemarkNames.length; j < len; j++) {
                                log.remarks$ += log.credibilityRemarkNames[j];
                                j < (len - 1) ? log.remarks$ += ", " : null;
                            }
                            log.createTime = $scope.timeReformat(new Date(log.createTime));
                        }
                        console.log("vm.playerCredibilityComment", vm.playerCredibilityComment);
                        $scope.safeApply();
                    },
                    function (err) {
                        console.log(err);
                    });
            };
            vm.setupRemarksMultiInputMultiMsg = function () {
                let remarkSelect = $('select#selectCredibilityRemarkMultiMsg');
                if (remarkSelect.css('display') && remarkSelect.css('display').toLowerCase() === "none") {
                    return;
                }
                remarkSelect.multipleSelect({
                    showCheckbox: true,
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: false,
                    countSelected: $translate('# of % selected')
                });
                remarkSelect.multipleSelect('refresh');
            };

            vm.setupRemarksMultiInput = function () {
                let remarkSelect = $('select#selectCredibilityRemark');
                if (remarkSelect.css('display') && remarkSelect.css('display').toLowerCase() === "none") {
                    return;
                }
                remarkSelect.multipleSelect({
                    showCheckbox: true,
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: false,
                    countSelected: $translate('# of % selected')
                });
                remarkSelect.multipleSelect('refresh');
            };

            utilService.actionAfterLoaded('#resetPlayerQuery', function () {
                $('#resetPlayerQuery').off('click');
                $('#resetPlayerQuery').click(function () {
                    utilService.clearDatePickerDate('#regDateTimePicker');
                    utilService.clearDatePickerDate('#regEndDateTimePicker');
                    utilService.clearDatePickerDate('#lastAccessDateTimePicker');
                    utilService.clearDatePickerDate('#lastAccessEndDateTimePicker');
                    $("select#selectCredibilityRemark").multipleSelect("enable");
                    $("select#selectCredibilityRemark").multipleSelect("uncheckAll");
                    vm.playerAdvanceSearchQuery = {
                        creditOperator: ">=",
                        playerType: 'Real Player (all)'
                    };
                    vm.getPlayersByAdvanceQueryDebounced(function () {
                    });
                    vm.advancedQueryObj = {
                        creditOperator: ">=",
                        playerType: 'Real Player (all)'
                    };
                    vm.advancedPlayerQuery(true);
                })

            });

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
            vm.setupGameProviderMultiInputFeedback = function () {
                let gameProviderSelect = $('select#selectGameProvider');
                gameProviderSelect.multipleSelect({
                    showCheckbox: true,
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: false,
                    countSelected: $translate('# of % selected')
                });
                gameProviderSelect.multipleSelect("uncheckAll");
            };

            vm.isForbidChanged = function (newForbid, oldForbid) {
                var disableSubmit = true;
                if (!oldForbid) {
                    oldForbid = [];
                }
                if (newForbid.length == oldForbid.length) {
                    for (let i = 0; i < newForbid.length; i++) {
                        if (oldForbid.indexOf(newForbid[i]) > -1) {
                            disableSubmit = true;
                        } else {
                            return disableSubmit = false;
                        }
                    }
                } else {
                    disableSubmit = false;
                }
                return disableSubmit;
            }

            vm.findForbidCheckedName = function (forbidArray, forbidObj) {
                var forbidNames = [];
                for (let i = 0; i < forbidArray.length; i++) {
                    for (let j = 0; j < forbidObj.length; j++) {
                        if (forbidArray[i] == forbidObj[j]._id) {
                            forbidNames[i] = forbidObj[j].name;
                            break;
                        }
                    }
                    if (!forbidNames[i]) {
                        forbidNames[i] = $translate(forbidArray[i]);
                    }
                }
                return forbidNames;
            }

            vm.findForbidCheckedTitle = function (forbidArray, forbidObj) {
                var forbidNames = [];
                for (let i = 0; i < forbidArray.length; i++) {
                    for (let j = 0; j < forbidObj.length; j++) {
                        if (forbidArray[i] == forbidObj[j]._id) {
                            forbidNames[i] = forbidObj[j].rewardTitle;
                            break;
                        }
                    }
                    if (!forbidNames[i]) {
                        forbidNames[i] = $translate(forbidArray[i]);
                    }
                }
                return forbidNames;
            }

            //region forbidGame
            vm.updateForbidGameLog = function (playerId, forbidGame) {
                let queryData = {
                    playerId: playerId,
                    remark: vm.forbidGameRemark,
                    adminId: authService.adminId,
                    forbidGameNames: forbidGame
                };

                socketService.$socket($scope.AppSocket, 'createForbidGameLog', queryData, function (created) {
                    vm.forbidGameRemark = '';
                    console.log('Forbid game log created', created);
                });
            }

            vm.updateBatchForbidGameLog = function (data) {

                let proms = []
                data.data.forEach(item => {
                    let prom = vm.updateForbidGameLog(item._id, vm.findForbidCheckedName(item.forbidProviders, vm.allGameProviders));
                    proms.push(prom);
                });
                return Promise.all(proms).then(data => {
                    vm.batchPermitModifySucc = true;
                    return data;
                });
            }
            /*vm.updateForbidRewardPointsEventLog = function (playerId, forbidRewardPointsEvent) {
                let queryData = {
                    playerId: playerId,
                    // remark: vm.forbidGameRemark,
                    adminId: authService.adminId,
                    forbidRewardPointsEventName: forbidRewardPointEvent
                };

                socketService.$socket($scope.AppSocket, 'createForbidRewardPointsEventLog', queryData, function (created) {
                    //vm.forbidGameRemark = '';
                    console.log('Forbid RewardPointsEvent log created', created);
                });
            }*/

            $("button.forbidGameConfirm").on('click', function () {
                vm.getForbidGame();
            });
            vm.getForbidGame = function () {
                vm.forbidGameLog = {};
                utilService.actionAfterLoaded('#modalForbidGameLog.in #forbidGameSearch .endTime', function () {
                    vm.forbidGameLog.startTime = utilService.createDatePicker('#forbidGameSearch .startTime');
                    vm.forbidGameLog.endTime = utilService.createDatePicker('#forbidGameSearch .endTime');
                    vm.forbidGameLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                    vm.forbidGameLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    vm.forbidGameLog.pageObj = utilService.createPageForPagingTable("#forbidGameTblPage", {}, $translate, function (curP, pageSize) {
                        commonPageChangeHandler(curP, pageSize, "forbidGameLog", vm.getForbidGameLog)
                    });
                    vm.getForbidGameLog(true);
                });
            }
            vm.getForbidGameLog = function (newSearch) {
                var sendQuery = {
                    startTime: vm.forbidGameLog.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.forbidGameLog.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.prohibitGamePopover._id,
                    limit: newSearch ? 10 : vm.forbidGameLog.limit,
                    index: newSearch ? 0 : vm.forbidGameLog.index,
                    sortCol: vm.forbidGameLog.sortCol || undefined
                };
                if (vm.forbidGameLog.status) {
                    sendQuery.status = vm.forbidGameLog.status;
                }
                vm.forbidGameLog.isSearching = true;
                console.log("Second:Query:", sendQuery);
                $scope.safeApply();
                socketService.$socket($scope.AppSocket, 'getForbidGameLog', sendQuery, function (data) {
                    var showData = data.data ? data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        item.curAmount$ = item.data && item.data.curAmount ? item.data.curAmount.toFixed(2) : 0;
                        for (let i = 0; i < item.forbidGameNames.length; i++) {
                            if (i > 0)
                                item.forbidGameNames[i] = " " + item.forbidGameNames[i];
                        }
                        return item;
                    }) : [];
                    vm.forbidGameLog.totalCount = data.data ? data.data.total : 0;
                    let summary = data.data ? data.data.summary : {sumAmt: 0};
                    console.log("ForbidGameLog:length:", showData);
                    vm.drawForbidGameLogTbl(showData, vm.forbidGameLog.totalCount, newSearch, summary);
                    vm.forbidGameLog.isSearching = false;
                    $scope.safeApply();
                });
            }
            //endregion

            //region forbidTopUp
            vm.updateForbidTopUpLog = function (playerId, forbidTopUp) {
                let queryData = {
                    playerId: playerId,
                    remark: vm.forbidTopUpRemark,
                    adminId: authService.adminId,
                    forbidTopUpNames: forbidTopUp
                };

                socketService.$socket($scope.AppSocket, 'createForbidTopUpLog', queryData, function (created) {
                    vm.forbidTopUpRemark = '';
                    console.log('Forbid topup log created', created);
                });
            }

            vm.updateBatchForbidTopUpLog = function (data) {
                let proms = [];

                data.data.forEach(item => {
                    let forbidTopUpNames = [];
                    for (let i = 0; i < item.forbidTopUpType.length; i++) {
                        forbidTopUpNames[i] = vm.merchantTopupTypeJson[item.forbidTopUpType[i]];
                    }
                    let prom = vm.updateForbidTopUpLog(item._id, forbidTopUpNames);
                    proms.push(prom);
                })
                return Promise.all(proms).then(data => {
                    vm.batchPermitModifySucc = true;
                    return data;
                })
            }

            $("button.forbidTopUpConfirm").on('click', function () {
                vm.getForbidTopUp();
            });
            vm.getForbidTopUpLog = function (newSearch) {
                var sendQuery = {
                    startTime: vm.forbidTopUpLog.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.forbidTopUpLog.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.forbidTopUpPopover._id,
                    limit: newSearch ? 10 : vm.forbidTopUpLog.limit,
                    index: newSearch ? 0 : vm.forbidTopUpLog.index,
                    sortCol: vm.forbidTopUpLog.sortCol || undefined
                };
                if (vm.forbidTopUpLog.status) {
                    sendQuery.status = vm.forbidTopUpLog.status;
                }
                vm.forbidTopUpLog.isSearching = true;
                console.log("Second:Query:", sendQuery);
                $scope.safeApply();
                socketService.$socket($scope.AppSocket, 'getForbidTopUpLog', sendQuery, function (data) {
                    var showData = data.data ? data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        item.curAmount$ = item.data && item.data.curAmount ? item.data.curAmount.toFixed(2) : 0;
                        for (let i = 0; i < item.forbidTopUpNames.length; i++) {
                            if (i > 0)
                                item.forbidTopUpNames[i] = " " + item.forbidTopUpNames[i];
                        }
                        return item;
                    }) : [];
                    vm.forbidTopUpLog.totalCount = data.data ? data.data.total : 0;
                    let summary = data.data ? data.data.summary : {sumAmt: 0};
                    console.log("ForbidTopUpLog:length:", showData);
                    vm.drawForbidTopUpLogTbl(showData, vm.forbidTopUpLog.totalCount, newSearch, summary);
                    vm.forbidTopUpLog.isSearching = false;
                    $scope.safeApply();
                });
            }
            //endregion

            //region forbidReward
            vm.updateForbidRewardLog = function (playerId, forbidReward, playerObj) {
                if (playerObj && playerObj.forbidPromoCode) {
                    forbidReward.push("优惠代码");
                }

                let queryData = {
                    playerId: playerId,
                    remark: vm.forbidRewardRemark,
                    adminId: authService.adminId,
                    forbidRewardNames: forbidReward
                };
                socketService.$socket($scope.AppSocket, 'createForbidRewardLog', queryData, function (created) {
                    vm.forbidRewardRemark = '';
                    console.log('Forbid reward log created', created);
                });
            }

            vm.updateBatchForbidRewardLog = function (data) {
                let proms = [];

                data.data.forEach(player => {
                    let prom = vm.updateForbidRewardLog(player._id, vm.findForbidCheckedName(player.forbidRewardEvents, vm.allRewardEvent), player);
                    proms.push(prom);
                });

                return Promise.all(proms).then(data => {
                    vm.batchPermitModifySucc = true;
                    return data;
                })
            }

            $("button.forbidRewardEventConfirm").on('click', function () {
                vm.getForbidReward();
            });
            vm.getForbidRewardLog = function (newSearch) {
                var sendQuery = {
                    startTime: vm.forbidRewardLog.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.forbidRewardLog.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.forbidRewardEventPopover._id,
                    limit: newSearch ? 10 : vm.forbidRewardLog.limit,
                    index: newSearch ? 0 : vm.forbidRewardLog.index,
                    sortCol: vm.forbidRewardLog.sortCol || undefined
                };
                if (vm.forbidRewardLog.status) {
                    sendQuery.status = vm.forbidRewardLog.status;
                }
                vm.forbidRewardLog.isSearching = true;
                console.log("Second:Query:", sendQuery);
                $scope.safeApply();
                socketService.$socket($scope.AppSocket, 'getForbidRewardLog', sendQuery, function (data) {
                    var showData = data.data ? data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        item.curAmount$ = item.data && item.data.curAmount ? item.data.curAmount.toFixed(2) : 0;
                        for (let i = 0; i < item.forbidRewardNames.length; i++) {
                            if (i > 0)
                                item.forbidRewardNames[i] = " " + item.forbidRewardNames[i];
                        }
                        return item;
                    }) : [];
                    vm.forbidRewardLog.totalCount = data.data ? data.data.total : 0;
                    let summary = data.data ? data.data.summary : {sumAmt: 0};
                    console.log("ForbidRewardLog:length:", showData);
                    vm.drawForbidRewardLogTbl(showData, vm.forbidRewardLog.totalCount, newSearch, summary);
                    vm.forbidRewardLog.isSearching = false;
                    $scope.safeApply();
                });
            }
            //endregion here

            //Region for forbidRewardPointsEvent
            vm.updateForbidRewardPointsEventLog = function (playerId, forbidRewardPointsEvent) {
                let queryData = {
                    playerId: playerId,
                    remark: vm.forbidRewardPointsEventRemark,
                    adminId: authService.adminId,
                    forbidRewardPointsEventNames: forbidRewardPointsEvent
                };

                socketService.$socket($scope.AppSocket, 'createForbidRewardPointsEventLog', queryData, function (created) {
                    vm.forbidRewardPointsEventRemark = '';
                    console.log('Forbid reward points event log created', created);
                });
            }
            vm.updateBatchForbidRewardPointsEventLog = function (data) {
                let proms = [];

                data.data.forEach(player => {
                    let prom = vm.updateForbidRewardPointsEventLog(player._id, vm.findForbidCheckedTitle(player.forbidRewardPointsEvent, vm.rewardPointsAllEvent));
                    proms.push(prom);
                });
                return Promise.all(proms).then(data => {
                    vm.batchPermitModifySucc = true;
                    return data;
                })
            }

            $("button.forbidRewardPointsEventConfirm").on('click', function () {
                vm.getForbidRewardPointsEvent();
            });
            vm.getForbidRewardPointsEventLog = function (newSearch) {
                var sendQuery = {
                    startTime: vm.forbidRewardPointsEventLog.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.forbidRewardPointsEventLog.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.forbidRewardPointsEventPopover._id,
                    limit: newSearch ? 10 : vm.forbidRewardPointsEventLog.limit,
                    index: newSearch ? 0 : vm.forbidRewardPointsEventLog.index,
                    sortCol: vm.forbidRewardPointsEventLog.sortCol || undefined
                };
                if (vm.forbidRewardPointsEventLog.status) {
                    sendQuery.status = vm.forbidRewardPointsEventLog.status;
                }
                vm.forbidRewardPointsEventLog.isSearching = true;
                console.log("Second:Query:", sendQuery);
                $scope.safeApply();
                socketService.$socket($scope.AppSocket, 'getForbidRewardPointsEventLog', sendQuery, function (data) {
                    var showData = data.data ? data.data.data.map(item => {
                        item.createTime$ = vm.dateReformat(item.createTime);
                        item.curAmount$ = item.data && item.data.curAmount ? item.data.curAmount.toFixed(2) : 0;
                        for (let i = 0; i < item.forbidRewardPointsEventNames.length; i++) {
                            if (i > 0)
                                item.forbidRewardPointsEventNames[i] = " " + item.forbidRewardPointsEventNames[i];
                        }
                        return item;
                    }) : [];
                    vm.forbidRewardPointsEventLog.totalCount = data.data ? data.data.total : 0;
                    let summary = data.data ? data.data.summary : {sumAmt: 0};
                    console.log("ForbidRewardPointsEventLog:length:", showData);
                    vm.drawForbidRewardPointsEventLogTbl(showData, vm.forbidRewardPointsEventLog.totalCount, newSearch, summary);
                    vm.forbidRewardPointsEventLog.isSearching = false;
                    $scope.safeApply();
                });
            }
            //endregion here


            vm.getProposalTypeOptionValue = function (proposalType) {
                var result = utilService.getProposalGroupValue(proposalType);
                return $translate(result);
            };

            //Player advertisement
            vm.addNewPlayerAdvertisementRecord = function () {
                if (!vm.duplicateOrderNo && !vm.duplicateAdCode) {
                    if (vm.playerAdvertisementGroup) {
                        let query = {
                            platformId: vm.selectedPlatform.id,
                            orderNo: vm.playerAdvertisementGroup.orderNo ? vm.playerAdvertisementGroup.orderNo : 0,
                            advertisementCode: vm.playerAdvertisementGroup.advertisementCode ? vm.playerAdvertisementGroup.advertisementCode : "",
                            title: vm.playerAdvertisementTitle ? vm.playerAdvertisementTitle : [],
                            backgroundBannerImage: {
                                url: vm.playerAdvertisementGroup.backgroundUrl ? vm.playerAdvertisementGroup.backgroundUrl : "",
                                hyperLink: vm.playerAdvertisementGroup.backgroundHyperLink ? vm.playerAdvertisementGroup.backgroundHyperLink : ""
                            },
                            imageButton: vm.playerAdvertisementGroup.imageButton ? vm.playerAdvertisementGroup.imageButton : [],
                            inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                        }

                        if (query.imageButton) {
                            query.imageButton.map(b => {
                                if (b) {
                                    if (b.url && b.url.length > 35) {
                                        b.urlDisplay = b.url.substring(0, 30) + "...";
                                    } else {
                                        b.urlDisplay = b.url || null;
                                    }

                                    if (b.hyperLink && b.hyperLink.length > 35) {
                                        b.hyperLinkDisplay = b.hyperLink.substring(0, 30) + "...";
                                    } else {
                                        b.hyperLinkDisplay = b.hyperLink || null;
                                    }
                                }
                            })
                        }

                        if (query.backgroundBannerImage) {
                            if (query.backgroundBannerImage.url && query.backgroundBannerImage.url.length > 35) {
                                query.backgroundBannerImage.urlDisplay = query.backgroundBannerImage.url.substring(0, 30) + "...";
                            } else {
                                query.backgroundBannerImage.urlDisplay = query.backgroundBannerImage.url || null;
                            }

                            if (query.backgroundBannerImage.hyperLink && query.backgroundBannerImage.hyperLink.length > 35) {
                                query.backgroundBannerImage.hyperLinkDisplay = query.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                            } else {
                                query.backgroundBannerImage.hyperLinkDisplay = query.backgroundBannerImage.hyperLink || null;
                            }
                        }

                        socketService.$socket($scope.AppSocket, 'createNewPlayerAdvertisementRecord', query, function (data) {
                            if (data) {
                                vm.resetPlayerAddTable();
                            }
                        });
                    }

                }
            }

            vm.savePlayerAdvertisementRecordChanges = function () {
                if (!vm.duplicateOrderNo && !vm.duplicateAdCode) {
                    if (vm.displayAdvertisementList) {
                        vm.displayAdvertisementList.forEach(record => {

                            let sendData = record;

                            if (sendData.imageButton) {
                                sendData.imageButton.map(b => {
                                    if (b) {
                                        if (b.url && b.url.length > 35) {
                                            b.urlDisplay = b.url.substring(0, 30) + "...";
                                        } else {
                                            b.urlDisplay = b.url || null;
                                        }

                                        if (b.hyperLink && b.hyperLink.length > 35) {
                                            b.hyperLinkDisplay = b.hyperLink.substring(0, 30) + "...";
                                        } else {
                                            b.hyperLinkDisplay = b.hyperLink || null;
                                        }
                                    }
                                })
                            }

                            if (sendData.backgroundBannerImage) {
                                if (sendData.backgroundBannerImage.url && sendData.backgroundBannerImage.url.length > 35) {
                                    sendData.backgroundBannerImage.urlDisplay = sendData.backgroundBannerImage.url.substring(0, 30) + "...";
                                } else {
                                    sendData.backgroundBannerImage.urlDisplay = sendData.backgroundBannerImage.url || null;
                                }

                                if (sendData.backgroundBannerImage.hyperLink && sendData.backgroundBannerImage.hyperLink.length > 35) {
                                    sendData.backgroundBannerImage.hyperLinkDisplay = sendData.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                                } else {
                                    sendData.backgroundBannerImage.hyperLinkDisplay = sendData.backgroundBannerImage.hyperLink || null;
                                }
                            }

                            socketService.$socket($scope.AppSocket, 'savePlayerAdvertisementRecordChanges', sendData, function (data) {
                                //do nothing
                            });

                            vm.editAdvertisementRecord = false;
                            vm.showAdvertisementRecord = true;
                        });
                    }

                }
            }

            vm.deletePlayerAdvertisementRecord = function (advertisementId, index) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        advertisementId: advertisementId,
                    };

                    GeneralModal.confirm({
                        title: $translate('DELETE_ADVERTISEMENT'),
                        text: $translate('Confirm to delete advertisement ?')
                    }).then(function () {
                        socketService.$socket($scope.AppSocket, 'deleteAdvertisementRecord', sendData, function (data) {
                            if (data) {
                                if (typeof index !== "undefined") {
                                    vm.displayAdvertisementList.splice(index, 1);
                                }
                            }
                        });
                    });
                }
            }

            vm.playerAdvertisementList = function () {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                };

                socketService.$socket($scope.AppSocket, 'getPlayerAdvertisementList', sendData, function (data) {
                    console.log("player advertisement list", data);
                    if (data && data.data) {

                        data.data.map(d => {
                            if (d) {
                                if (d.backgroundBannerImage) {
                                    if (d.backgroundBannerImage.url && d.backgroundBannerImage.url.length > 35) {
                                        d.backgroundBannerImage.urlDisplay = d.backgroundBannerImage.url.substring(0, 30) + "...";
                                    } else {
                                        d.backgroundBannerImage.urlDisplay = d.backgroundBannerImage.url || null;
                                    }

                                    if (d.backgroundBannerImage.hyperLink && d.backgroundBannerImage.hyperLink.length > 35) {
                                        d.backgroundBannerImage.hyperLinkDisplay = d.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                                    } else {
                                        d.backgroundBannerImage.hyperLinkDisplay = d.backgroundBannerImage.hyperLink || null;
                                    }
                                }

                                d.status = d.status == vm.playerAdvertisementStatus["OPEN"] ? d.status : vm.playerAdvertisementStatus["CLOSE"];
                            }
                        })

                        vm.displayAdvertisementList = data.data;

                        $scope.safeApply();
                    }
                });
            }

            vm.selectedAdvListData = function (id, subject) {

                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    _id: id,
                    subject: subject
                };

                socketService.$socket($scope.AppSocket, 'getSelectedAdvList', sendData, function (data) {

                    if (data && data.data) {
                        vm.selectedAdvList = data.data;
                        vm.drawUIPlatformCSS(vm.selectedAdvList);
                        console.log("vm.selectedAdvList", vm.selectedAdvList);
                        vm.CSSContentEdit = false;
                        $scope.safeApply();
                    }
                    else {
                        Q.reject('Advertisement list is not found.');
                    }
                });

            };

            vm.drawUIPlatformCSS = function (elem) {
                if (vm.hoverStyle) {
                    vm.clearStyle();
                }

                // generate the css
                setTimeout(function () {
                    vm.hoverStyle = document.createElement('style');
                    if (vm.hoverStyle.styleSheet) {
                        vm.hoverStyle.styleSheet.cssText = '';
                    }
                    else {
                        vm.hoverStyle.appendChild(document.createTextNode(''));
                    }

                    let temp = '';
                    elem.imageButton.forEach(item => {
                        let css = '#' + item.buttonName + "{" + item.css + "}";
                        temp += css;
                    });

                    elem.imageButton.forEach(item => {
                        let css = '#' + item.buttonName + item.hoverCss;
                        temp += css;

                    });
                    vm.hoverStyle.appendChild(document.createTextNode(temp));
                    document.getElementsByTagName('head')[0].appendChild(vm.hoverStyle);
                    $scope.safeApply();
                }, 0);
            };

            vm.clearStyle = function () {
                document.getElementsByTagName('head')[0].removeChild(vm.hoverStyle);
                vm.hoverStyle = null;
                $scope.safeApply();
            };

            vm.advSettingUpdate = function (elem, subject) {
                if (elem) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: elem._id,
                        imageButton: elem.imageButton,
                        subject: subject
                    };
                    socketService.$socket($scope.AppSocket, 'updateAdvertisementRecord', sendData, function (data) {
                    });
                }
            };

            vm.changeAdvertisementStatus = function (advertisementId, advertisementStatus) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        status: advertisementStatus ? advertisementStatus : 0
                    }

                    let statusChangeConfirmText = "";

                    if (advertisementStatus == vm.playerAdvertisementStatus["CLOSE"]) {
                        statusChangeConfirmText = "Confirm to turn advertisement on ?";
                    } else {
                        statusChangeConfirmText = "Confirm to turn advertisement off ?";
                    }

                    GeneralModal.confirm({
                        title: $translate('DELETE_ADVERTISEMENT'),
                        text: $translate(statusChangeConfirmText)
                    }).then(function () {
                        socketService.$socket($scope.AppSocket, 'changeAdvertisementStatus', sendData, function (data) {
                            if (data) {
                                vm.playerAdvertisementList();
                            }
                        });
                    });
                }
            }

            vm.checkDuplicateOrderNoWithId = function (orderNo, advertisementId) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        orderNo: orderNo,
                        inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkDuplicateOrderNoWithId', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateOrderNo = true;
                            vm.errMessage = "Order no is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateOrderNo = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }

            }

            vm.checkDuplicateAdCodeWithId = function (advertisementCode, advertisementId) {
                if (advertisementId && advertisementCode) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        advertisementCode: advertisementCode,
                        inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkDuplicateAdCodeWithId', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateAdCode = true;
                            vm.errMessage = "Advertisement code is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateAdCode = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }
            }

            vm.checkDuplicateOrderNo = function (orderNo) {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    orderNo: orderNo,
                    inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                }
                socketService.$socket($scope.AppSocket, 'checkDuplicateOrderNo', sendData, function (data) {
                    if (data && data.data) {
                        vm.duplicateOrderNo = true;
                        vm.errMessage = "Order no is duplicated";
                        $scope.safeApply();
                    } else {
                        vm.duplicateOrderNo = false;
                        vm.errMessage = "";
                        $scope.safeApply();
                    }
                });
            }

            vm.checkDuplicateAdCode = function (advertisementCode) {
                if (advertisementCode) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        advertisementCode: advertisementCode,
                        inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkDuplicateAdCode', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateAdCode = true;
                            vm.errMessage = "Advertisement code is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateAdCode = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }
            }

            vm.setNewImageButtonName = function () {
                let buttonNo = vm.currentImageButtonNo + 1;
                vm.playerAdvertisementGroup.imageButton.push(
                    {
                        buttonName: 'activityBtn' + buttonNo,
                        url: '',
                        hyperLink: '',
                        css: "position:absolute; width: auto; height: auto; top:50%; left: 50%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    }
                );

                vm.currentImageButtonNo += 1;
            }

            vm.getNextOrderNo = function () {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                }

                socketService.$socket($scope.AppSocket, 'getNextOrderNo', sendData, function (data) {
                    if (data && data.data) {
                        if (data.data.hasOwnProperty("orderNo")) {
                            vm.playerAdvertisementGroup.orderNo = data.data.orderNo + 1;

                            $scope.safeApply();
                        }
                    }
                });
            };

            vm.openReplicatePlatformSettingModal = () => {
                $('#modalReplicatePlatformSetting').modal('show');
            };

            vm.replicatePlatformSetting = function (isConfirm) {
                if (!isConfirm) {
                    vm.modalYesNo = {};
                    vm.modalYesNo.modalTitle = $translate("Replicate Other Platform Setting");
                    vm.modalYesNo.modalText = $translate("Warning! Once replicate, there is no revert option. Are you sure you want to replicate platform setting?");
                    vm.modalYesNo.actionYes = () => vm.replicatePlatformSetting(true);
                    $('#modalYesNo').modal();
                    return;
                }

                $scope.$socketPromise("replicatePlatformSetting", {replicateFrom: vm.platformToReplicate, replicateTo: vm.selectedPlatform.id}).then(data => {
                    console.log(data);
                    $socket.showConfirmMessage("Replication succeed.");
                    loadPlatformData();
                });
            };

            vm.resetPlayerAddTable = function () {
                //reset the adding table
                vm.addNewPlayerAdvertisement = false;
                vm.currentImageButtonNo = 2;
                vm.playerAdvertisementGroup = [];
                vm.playerAdvertisementTitle = [];
                vm.playerAdvertisementGroup.imageButton = [
                    {
                        buttonName: "activityBtn1",
                        url: "",
                        hyperLink: "",
                        css: "position:absolute; width: auto; height: auto; top:87%; left: 20%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    },
                    {
                        buttonName: "activityBtn2",
                        url: "",
                        hyperLink: "",
                        css: "position:absolute; width: auto; height: auto; top:87%; left: 70%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    }
                ];

                $scope.safeApply();
            }

            // Batch Permit Edit
            vm.initBatchPermit = function () {
                vm.prepareCredibilityConfig();
                vm.resetBatchEditData();
                // init edit data
                vm.forbidCredibilityAddList = [];
                vm.forbidCredibilityRemoveList = [];

                vm.forbidRewardEventAddList = [];
                vm.forbidRewardEventRemoveList = [];

                vm.forbidGameAddList = [];
                vm.forbidGameRemoveList = [];

                vm.forbidTopUpAddList = [];
                vm.forbidTopUpRemoveList = [];

                vm.forbidRewardPointsAddList = [];
                vm.forbidRewardPointsRemoveList = [];

                vm.drawBatchPermitTable();

                vm.playerCredibilityRemarksUpdated = false;
            };
            vm.localRemarkUpdate = function () {
                if (vm.forbidCredibilityAddList.length == 0 && vm.forbidCredibilityRemoveList == 0) {
                    var ans = confirm("不选取选项 ，将重置权限！ 确定要执行 ?");
                    if (!ans) {
                        return
                    }
                }

                let selectedRemarks = [];
                for (let i = 0; i < vm.credibilityRemarks.length; i++) {
                    if (vm.credibilityRemarks[i].selected === true) {
                        selectedRemarks.push(vm.credibilityRemarks[i]._id);
                    }
                }
                let playerNames = vm.splitBatchPermit();
                let sendQuery = {
                    admin: authService.adminName,
                    platformObjId: vm.selectedPlatform.id,
                    playerNames: playerNames,
                    remarks: {
                        'addList': vm.forbidCredibilityAddList,
                        'removeList': vm.forbidCredibilityRemoveList
                    },
                    comment: vm.credibilityRemarkComment
                };

                socketService.$socket($scope.AppSocket, "updateBatchPlayerCredibilityRemark", sendQuery, function (data) {
                    vm.playerCredibilityRemarksUpdated = true;
                    vm.credibilityRemarkUpdateMessage = "SUCCESS";
                    vm.getPlatformPlayersData();
                    $scope.safeApply();
                }, function (error) {
                    vm.playerCredibilityRemarksUpdated = true;
                    vm.credibilityRemarkUpdateMessage = error.error.message;
                    $scope.safeApply();
                });
                vm.drawBatchPermitTable();
            };
            vm.resetBatchEditData = function () {
                //generate a sample to render in datatable, only using for edit multi purpose.
                vm.batchEditData = {
                    "_id": "xxxxxxxxx",
                    "permission": {
                        "alipayTransaction": true,
                        "topupManual": true,
                        "topupOnline": true,
                        "transactionReward": true,
                        "advanceConsumptionReward": true,
                        "applyBonus": true,
                        "banReward": false
                    },
                    "forbidProviders": [],
                    "smsSetting": {
                        "updatePassword": false,
                        "updatePaymentInfo": false,
                        "consumptionReturn": false,
                        "applyReward": false,
                        "cancelBonus": false,
                        "applyBonus": false,
                        "manualTopup": false
                    },
                };
            }

            vm.permissionChangeMark = function () {
                // a object to record which permission is been change;
                vm.playerPermissionChange = {};
                Object.keys(vm.playerPermissionTypes).map(item => {
                    vm.playerPermissionChange[item] = false;
                });
            }
            vm.drawBatchPermitTable = function () {

                vm.selectedPlayers = {};
                vm.selectedPlayersCount = 0;

                var tableOptions = {
                    data: [vm.batchEditData],
                    columnDefs: [
                        {targets: '_all', defaultContent: ' '}
                    ],
                    columns: [
                        {
                            title: $translate('PLAYERNAME'), data: "name", advSearch: true, "sClass": "",
                            render: function (data, type, row) {
                                let result = '<textarea rows="8" ng-model="vm.multiUsersList" style="width:100%">'
                                return result;
                            }
                        },
                        {
                            // this object is use for column show
                            // credibility remark advsearch column's object will appear later in the code
                            title: $translate("CREDIBILITY_REMARK"),
                            data: "credibilityRemarks",
                            advSearch: false,
                            orderable: false,
                            sClass: "remarkCol text-center",
                            render: (data, type, row) => {
                                let emptyOutput = "<a data-toggle=\"modal\" data-target='#modalPlayerCredibilityRemarks'> - </a>";
                                if (!data || data.length === 0) {
                                    return emptyOutput;
                                }
                                let initOutput = "<a data-toggle=\"modal\" data-target='#modalPlayerCredibilityRemarks'>";
                                let output = initOutput;
                                let remarkMatches = false;
                                data.map(function (remarkId) {
                                    for (let i = 0; i < vm.credibilityRemarks.length; i++) {
                                        if (vm.credibilityRemarks[i]._id === remarkId) {
                                            if (output && output !== initOutput) {
                                                output += "<br>";
                                            }
                                            output += vm.credibilityRemarks[i].name;
                                            remarkMatches = true;
                                        }
                                    }
                                });
                                output += "</a>";

                                if (remarkMatches) {
                                    return output;
                                } else {
                                    return emptyOutput;
                                }
                            }
                        },
                        {
                            title: $translate('MAIN') + $translate('PERMISSION'), //data: 'phoneNumber',
                            orderable: false,
                            render: function (data, type, row) {
                                data = data || {permission: {}};

                                var link = $('<a>', {
                                    'class': 'playerPermissionPopover',
                                    'ng-click': "vm.permissionPlayer = " + JSON.stringify(row)
                                    + "; vm.permissionPlayer.permission.banReward = !vm.permissionPlayer.permission.banReward;"
                                    + "; vm.permissionPlayer.permission.disableWechatPay = !vm.permissionPlayer.permission.disableWechatPay;"
                                    + "; vm.permissionPlayer.permission.forbidPlayerConsumptionReturn = !vm.permissionPlayer.permission.forbidPlayerConsumptionReturn;"
                                    + "; vm.permissionPlayer.permission.forbidPlayerConsumptionIncentive = !vm.permissionPlayer.permission.forbidPlayerConsumptionIncentive;"
                                    + "; vm.permissionPlayer.permission.forbidPlayerFromLogin = !vm.permissionPlayer.permission.forbidPlayerFromLogin;"
                                    + "; vm.permissionPlayer.permission.forbidPlayerFromEnteringGame = !vm.permissionPlayer.permission.forbidPlayerFromEnteringGame;"
                                    + ";",

                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'popover',
                                    'data-trigger': 'focus',
                                    'data-placement': 'left',
                                    'data-container': 'body',
                                });

                                let perm = (row && row.permission) ? row.permission : {};

                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.applyBonus === true ? "withdrawBlue.png" : "withdrawRed.png"),
                                    height: "14px",
                                    width: "14px",
                                }));
                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.topupOnline === true ? "onlineTopUpBlue.png" : "onlineTopUpRed.png"),
                                    height: "13px",
                                    width: "15px",
                                }));
                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.topupManual === true ? "manualTopUpBlue.png" : "manualTopUpRed.png"),
                                    height: "14px",
                                    width: "14px",
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

                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.topUpCard === false ? "cardTopUpRed.png" : "cardTopUpBlue.png"),
                                    height: "14px",
                                    width: "14px",
                                }));

                                link.append($('<i>', {
                                    'class': 'fa margin-right-5 ' + (perm.forbidPlayerFromLogin === true ? "fa-sign-out text-danger" : "fa-sign-in  text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-gamepad margin-right-5 ' + (perm.forbidPlayerFromEnteringGame === true ? "text-danger" : "text-primary"),
                                }));

                                link.append($('<br>'));

                                link.append($('<i>', {
                                    'class': 'fa fa-volume-control-phone margin-right-5 ' + (perm.phoneCallFeedback === false ? "text-danger" : "text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-comment margin-right-5 ' + (perm.SMSFeedBack === false ? "text-danger" : "text-primary"),
                                }));

                                link.append($('<i>', {
                                    'class': 'fa fa-gift margin-right-5 ' + (perm.banReward === false ? "text-primary" : "text-danger"),
                                }));

                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.rewardPointsTask === false ? "rewardPointsRed.png" : "rewardPointsBlue.png"),
                                    height: "14px",
                                    width: "14px",
                                }));

                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.levelChange === false ? "levelRed.png" : "levelBlue.png"),
                                    height: "14px",
                                    width: "14px",
                                }));

                                return link.prop('outerHTML') + "&nbsp;";
                            },
                            "sClass": "alignLeft"
                        },
                        {
                            title: $translate('SECONDARY') + $translate('PERMISSION'),
                            orderable: false,
                            render: function (data, type, row) {
                                // data = data || {permission: {}};

                                var link = $('<div>', {});
                                var playerObjId = row._id ? row._id : "";

                                link.append($('<a>', {
                                    'class': 'forbidRewardEventPopover fa fa-gift margin-right-5' + (row.forbidRewardEvents && row.forbidRewardEvents.length > 0 ? " text-danger" : ""),
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'popover',
                                    // 'title': $translate("PHONE"),
                                    'data-placement': 'left',
                                    'data-trigger': 'focus',
                                    'type': 'button',
                                    'data-html': true,
                                    'href': '#',
                                    'style': "z-index: auto; min-width:23px",
                                    'data-container': "body",
                                    'html': (row.forbidRewardEvents && row.forbidRewardEvents.length > 0 ? '<sup>' + row.forbidRewardEvents.length + '</sup>' : ''),
                                }));


                                link.append($('<a>', {
                                    'class': 'prohibitGamePopover fa fa-gamepad margin-right-5 ' + (row.forbidProviders && row.forbidProviders.length > 0 ? " text-danger" : ""),
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'popover',
                                    // 'title': $translate("PHONE"),
                                    'data-placement': 'left',
                                    'data-trigger': 'focus',
                                    'type': 'button',
                                    'data-html': true,
                                    'href': '#',
                                    'style': "z-index: auto; min-width:23px",
                                    'data-container': "body",
                                    'html': (row.forbidProviders && row.forbidProviders.length > 0 ? '<sup>' + row.forbidProviders.length + '</sup>' : ''),
                                }));


                                link.append($('<a>', {
                                    'class': 'forbidTopUpPopover margin-right-5' + (row.forbidTopUpTypes && row.forbidTopUpTypes.length > 0 ? " text-danger" : ""),
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'popover',
                                    // 'title': $translate("PHONE"),
                                    'data-placement': 'left',
                                    'data-trigger': 'focus',
                                    'type': 'button',
                                    'data-html': true,
                                    'href': '#',
                                    // 'style': "z-index: auto; min-width:23px",
                                    'data-container': "body",
                                    'html': '<img width="15px" height="12px" src="images/icon/' + (row.forbidTopUpTypes && row.forbidTopUpTypes.length > 0 ? "onlineTopUpRed.png" : "onlineTopUpBlue.png") + '"></img>'
                                    + (row.forbidTopUpTypes && row.forbidTopUpTypes.length > 0 ? '<sup>' + row.forbidTopUpTypes.length + '</sup>' : ''),
                                    'style': "z-index: auto; width:23px; display:inline-block;",
                                }));

                                link.append($('<a>', {
                                    'class': 'forbidRewardPointsEventPopover margin-right-5' + (row.forbidRewardPointsEvent && row.forbidRewardPointsEvent.length > 0 ? " text-danger" : ""),
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'popover',
                                    'data-placement': 'left',
                                    'data-trigger': 'focus',
                                    'type': 'button',
                                    'data-html': true,
                                    'href': '#',
                                    'data-container': "body",
                                    'html': '<img width="14px" height="14px" src="images/icon/' + (row.forbidRewardPointsEvent && row.forbidRewardPointsEvent.length > 0 ? "rewardPointsRed.png" : "rewardPointsBlue.png") + '"></img>'
                                    + (row.forbidRewardPointsEvent && row.forbidRewardPointsEvent.length > 0 ? '<sup>' + row.forbidRewardPointsEvent.length + '</sup>' : ''),
                                    'style': "z-index: auto; width:23px; display: inline-block;",
                                }));

                                return link.prop('outerHTML');
                            },
                            "sClass": "alignLeft"
                        }
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
                    dom: "Z<'row'<'col-sm-12'tr>>",
                    fnRowCallback: vm.playerBatchPermitTableRowClick,
                    fnDrawCallback: function (oSettings) {
                        var container = oSettings.nTable;

                        $(container).find('[title]').tooltip();

                        let uData = vm.batchEditData;

                        utilService.setupPopover({
                            context: container,
                            elem: '.playerPermissionPopover',
                            onClickAsync: function (showPopover) {
                                var that = this;
                                var row = uData;
                                vm.playerPermissionTypes = {
                                    applyBonus: {
                                        imgType: 'img',
                                        src: "images/icon/withdrawBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                    // transactionReward: {imgType: 'i', iconClass: "fa fa-share-square"},
                                    topupOnline: {
                                        imgType: 'img',
                                        src: "images/icon/onlineTopUpBlue.png",
                                        width: "26px",
                                        height: '20px'
                                    },
                                    topupManual: {
                                        imgType: 'img',
                                        src: "images/icon/manualTopUpBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                    alipayTransaction: {
                                        imgType: 'img',
                                        src: "images/icon/aliPayBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                    disableWechatPay: {imgType: 'i', iconClass: "fa fa-comments"},
                                    topUpCard: {
                                        imgType: 'img',
                                        src: "images/icon/cardTopUpBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                    forbidPlayerFromLogin: {imgType: 'i', iconClass: "fa fa-sign-in"},
                                    forbidPlayerFromEnteringGame: {imgType: 'i', iconClass: "fa fa-gamepad"},
                                    phoneCallFeedback: {imgType: 'i', iconClass: "fa fa-volume-control-phone"},
                                    SMSFeedBack: {imgType: 'i', iconClass: "fa fa-comment"},
                                    banReward: {imgType: 'i', iconClass: "fa fa-gift"},
                                    rewardPointsTask: {
                                        imgType: 'img',
                                        src: "images/icon/rewardPointsBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                    levelChange: {
                                        imgType: 'img',
                                        src: "images/icon/levelBlue.png",
                                        width: "26px",
                                        height: '26px'
                                    },
                                };
                                $("#playerPermissionTable td").removeClass('hide');
                                vm.popOverPlayerPermission = row;
                                row.permission.banReward = true;

                                $.each(vm.playerPermissionTypes, function (key, v) {
                                    if (row.permission && row.permission[key] === false) {
                                        $("#playerPermissionTable .permitOn." + key).addClass('hide');
                                    } else {
                                        $("#playerPermissionTable .permitOff." + key).addClass('hide');
                                    }
                                });

                                vm.permissionChangeMark();
                                showPopover(that, '#playerBatchPermissionPopover', row);
                                $scope.safeApply();

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
                                    $(thisPopover + ' #' + key).html($translate('ModifyIt'));

                                    $scope.safeApply();
                                })

                                $remark.on('input selectionchange propertychange', function () {
                                    $submit.prop('disabled', this.value.length === 0 || changeObj == {})
                                })
                                $submit.on('click', function () {
                                    $submit.off('click');
                                    $(thisPopover + " .togglePlayer").off('click');
                                    $remark.off('input selectionchange propertychange');

                                    // Invert faked permission display
                                    if (changeObj.hasOwnProperty('banReward')) {
                                        changeObj.banReward = !changeObj.banReward;
                                    }

                                    if (changeObj.hasOwnProperty('disableWechatPay')) {
                                        changeObj.disableWechatPay = !changeObj.disableWechatPay;
                                    }

                                    if (changeObj.hasOwnProperty('forbidPlayerConsumptionReturn')) {
                                        changeObj.forbidPlayerConsumptionReturn = !changeObj.forbidPlayerConsumptionReturn;
                                    }

                                    if (changeObj.hasOwnProperty('forbidPlayerConsumptionIncentive')) {
                                        changeObj.forbidPlayerConsumptionIncentive = !changeObj.forbidPlayerConsumptionIncentive;
                                    }

                                    if (changeObj.hasOwnProperty('forbidPlayerFromLogin')) {
                                        changeObj.forbidPlayerFromLogin = !changeObj.forbidPlayerFromLogin;
                                    }

                                    if (changeObj.hasOwnProperty('forbidPlayerFromEnteringGame')) {
                                        changeObj.forbidPlayerFromEnteringGame = !changeObj.forbidPlayerFromEnteringGame;
                                    }

                                    let playerNames = vm.splitBatchPermit();
                                    vm.batchPermitModifySucc = false;
                                    socketService.$socket($scope.AppSocket, 'updateBatchPlayerPermission', {
                                        query: {
                                            platformObjId: vm.selectedPlatform.id,
                                            playerNames: playerNames
                                        },
                                        admin: authService.adminId,
                                        permission: changeObj,
                                        remark: $remark.val()
                                    }, function (data) {
                                        let errorList = data.data;
                                        errorList = errorList.filter(item => {
                                            return (typeof item === 'string');
                                        })

                                        if (errorList < 1) {
                                            vm.batchPermitModifySucc = true;
                                        } else {
                                            vm.errorListMsg = errorList.join(',');
                                        }

                                        vm.getPlatformPlayersData();
                                    }, null, true);

                                    $(thisPopover).popover('hide');
                                })

                            }
                        });

                        utilService.setupPopover({
                            context: container,
                            elem: '.forbidRewardEventPopover',
                            content: function () {
                                var data = uData;
                                vm.forbidRewardEventPopover = data;
                                vm.forbidRewardEvents = [];
                                vm.forbidRewardDisable = true;
                                $scope.safeApply();
                                return $compile($('#forbidRewardEventPopover').html())($scope);
                            },
                            callback: function () {
                                let thisPopover = utilService.$getPopoverID(this);
                                let rowData = uData;
                                $scope.safeApply();

                                $("input.playerRewardEventForbid").on('click', function () {
                                    let forbidRewardEventList = $(thisPopover).find('.playerRewardEventForbid');
                                    let forbidRewardEvents = [];
                                    $.each(forbidRewardEventList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidRewardEvents.push($(v).attr('data-provider'));
                                        }
                                    });
                                    vm.forbidRewardDisable = vm.isForbidChanged(forbidRewardEvents, vm.forbidRewardEventPopover.forbidRewardEvents);
                                    $scope.safeApply();
                                });

                                $("button.forbidRewardEventCancel").on('click', function () {
                                    $(".forbidRewardEventPopover").popover('hide');
                                });

                                $("button.showForbidreward").on('click', function () {
                                    $(".forbidRewardEventPopover").popover('hide');
                                });

                                $("button.forbidBatchRewardEventConfirm").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    if (vm.forbidRewardEventAddList.length == 0 && vm.forbidRewardEventRemoveList == 0) {
                                        var ans = confirm("不选取选项 ，将重置权限！ 确定要执行 ?");
                                        if (!ans) {
                                            return
                                        }
                                    }

                                    let forbidRewardEventList = $(thisPopover).find('.playerRewardEventForbid');
                                    let forbidRewardEvents = [];
                                    $.each(forbidRewardEventList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidRewardEvents.push($(v).attr('data-provider'));
                                        }
                                    });
                                    let playerNames = vm.splitBatchPermit();
                                    let sendData = {
                                        platformObjId: vm.selectedPlatform.id,
                                        playerNames: playerNames,
                                        forbidRewardEvents: {
                                            'addList': vm.forbidRewardEventAddList,
                                            'removeList': vm.forbidRewardEventRemoveList
                                        },
                                        adminName: authService.adminName
                                    };
                                    // subcategory 1
                                    vm.batchPermitModifySucc = false;
                                    $(".forbidRewardEventPopover").popover('hide');
                                    vm.updateBatchPlayerForbidRewardEvents(sendData);
                                    vm.drawBatchPermitTable();

                                });
                            }
                        });
                        utilService.setupPopover({
                            context: container,
                            elem: '.prohibitGamePopover',
                            content: function () {

                                // var data = JSON.parse(this.dataset.row);
                                var data = uData;
                                vm.prohibitGamePopover = data;
                                vm.forbidGameDisable = true;
                                vm.forbidGameRemark = '';
                                $scope.safeApply();
                                return $compile($('#prohibitGamePopover').html())($scope);
                            },
                            callback: function () {
                                let thisPopover = utilService.$getPopoverID(this);
                                let rowData = uData;
                                $scope.safeApply();

                                $("button.forbidGameCancel").on('click', function () {
                                    $(".prohibitGamePopover").popover('hide');
                                });

                                $("button.showForbidGame").on('click', function () {
                                    $(".prohibitGamePopover").popover('hide');
                                });

                                $("input.playerStatusProviderForbid").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    let forbidProviderList = $(thisPopover).find('.playerStatusProviderForbid');
                                    let forbidProviders = [];
                                    $.each(forbidProviderList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidProviders.push($(v).attr('data-provider'));
                                        }
                                    });
                                    vm.forbidGameDisable = vm.isForbidChanged(forbidProviders, vm.prohibitGamePopover.forbidProviders);
                                    $scope.safeApply();
                                });

                                $("button.forbidBatchGameConfirm").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    if (vm.forbidGameAddList.length == 0 && vm.forbidGameRemoveList == 0) {
                                        var ans = confirm("不选取选项 ，将重置权限！ 确定要执行 ?");
                                        if (!ans) {
                                            return
                                        }
                                    }
                                    let forbidProviderList = $(thisPopover).find('.playerStatusProviderForbid');
                                    let forbidProviders = [];
                                    $.each(forbidProviderList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidProviders.push($(v).attr('data-provider'));
                                        }
                                    });
                                    let playerNames = vm.splitBatchPermit();
                                    let sendData = {
                                        platformObjId: vm.selectedPlatform.id,
                                        playerNames: playerNames,
                                        forbidProviders: {
                                            'addList': vm.forbidGameAddList,
                                            'removeList': vm.forbidGameRemoveList
                                        },
                                        adminName: authService.adminName
                                    };
                                    //subcategory 2
                                    vm.batchPermitModifySucc = false;
                                    $(".prohibitGamePopover").popover('hide');
                                    vm.updateBatchPlayerForbidProviders(sendData);
                                    vm.drawBatchPermitTable();
                                });
                            }
                        });


                        utilService.setupPopover({
                            context: container,
                            elem: '.forbidTopUpPopover',
                            content: function () {
                                // var data = JSON.parse(this.dataset.row);
                                var data = uData;
                                vm.forbidTopUpPopover = data;
                                vm.forbidTopUpDisable = true;
                                vm.forbidTopUpRemark = '';
                                $scope.safeApply();
                                return $compile($('#forbidTopUpPopover').html())($scope);
                            },
                            callback: function () {
                                let thisPopover = utilService.$getPopoverID(this);
                                let rowData = uData;
                                $scope.safeApply();

                                $("button.forbidTopUpCancel").on('click', function () {
                                    $(".forbidTopUpPopover").popover('hide');
                                });

                                $("button.showForbidTopUp").on('click', function () {
                                    $(".forbidTopUpPopover").popover('hide');
                                });

                                $("input.playerTopUpTypeForbid").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    let forbidTopUpList = $(thisPopover).find('.playerTopUpTypeForbid');
                                    let forbidTopUpTypes = [];
                                    $.each(forbidTopUpList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidTopUpTypes.push($(v).attr('data-provider'));
                                        }
                                    });
                                    vm.forbidTopUpDisable = vm.isForbidChanged(forbidTopUpTypes, vm.forbidTopUpPopover.forbidTopUpType);
                                    $scope.safeApply();
                                });

                                $("button.forbidBatchTopUpConfirm").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    if (vm.forbidTopUpAddList.length == 0 && vm.forbidTopUpRemoveList == 0) {
                                        var ans = confirm("不选取选项 ，将重置权限！ 确定要执行 ?");
                                        if (!ans) {
                                            return
                                        }
                                    }
                                    let forbidTopUpList = $(thisPopover).find('.playerTopUpTypeForbid');
                                    let forbidTopUpTypes = [];
                                    $.each(forbidTopUpList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidTopUpTypes.push($(v).attr('data-provider'));
                                        }
                                    });

                                    let playerNames = vm.splitBatchPermit();
                                    let sendData = {
                                        query: {
                                            playerNames: playerNames,
                                            platformObjId: vm.selectedPlatform.id
                                        },
                                        updateData: {
                                            forbidTopUpType: {
                                                'addList': vm.forbidTopUpAddList,
                                                'removeList': vm.forbidTopUpRemoveList
                                            }
                                        },
                                        adminName: authService.adminName
                                    };
                                    //subcategory 3
                                    vm.batchPermitModifySucc = false;
                                    $(".forbidTopUpPopover").popover('hide');
                                    vm.confirmBatchUpdatePlayerTopupTypes(sendData);
                                    vm.drawBatchPermitTable();
                                });
                            }
                        });
                        utilService.setupPopover({
                            context: container,
                            elem: '.forbidRewardPointsEventPopover',
                            content: function () {
                                var data = uData;
                                vm.forbidRewardPointsEventPopover = data;
                                vm.forbidRewardPointsEventDisable = true;
                                vm.forbidRewardPointsEventRemark = '';
                                $scope.safeApply();
                                return $compile($('#forbidRewardPointsEventPopover').html())($scope);
                            },
                            callback: function () {
                                let thisPopover = utilService.$getPopoverID(this);
                                let rowData = uData;
                                $scope.safeApply();

                                $("button.forbidRewardPointsEventCancel").on('click', function () {
                                    $(".forbidRewardPointsEventPopover").popover('hide');
                                });

                                $("button.showForbidRewardPointsEvent").on('click', function () {
                                    $(".forbidRewardPointsEventPopover").popover('hide');
                                });

                                $("input.playerRewardPointsEventForbid").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    let forbidRewardPointsEventList = $(thisPopover).find('.playerRewardPointsEventForbid');
                                    let forbidRewardPointsEvent = [];
                                    $.each(forbidRewardPointsEventList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidRewardPointsEvent.push($(v).attr('data-provider'));
                                        }
                                    });
                                    vm.forbidRewardPointsEventDisable = vm.isForbidChanged(forbidRewardPointsEvent, vm.forbidRewardPointsEventPopover.forbidRewardPointsEvent);
                                    $scope.safeApply();
                                });

                                $("button.forbidBatchRewardPointsEventConfirm").on('click', function () {
                                    if ($(this).hasClass('disabled')) {
                                        return;
                                    }
                                    if (vm.forbidRewardPointsAddList.length == 0 && vm.forbidRewardPointsRemoveList == 0) {
                                        var ans = confirm("不选取选项 ，将重置权限！ 确定要执行 ?");
                                        if (!ans) {
                                            return
                                        }
                                    }
                                    let forbidRewardPointsEventList = $(thisPopover).find('.playerRewardPointsEventForbid');
                                    let forbidRewardPointsEvent = [];
                                    $.each(forbidRewardPointsEventList, function (i, v) {
                                        if ($(v).prop('checked')) {
                                            forbidRewardPointsEvent.push($(v).attr('data-provider'));
                                        }
                                    });
                                    let playerNames = vm.splitBatchPermit();
                                    let sendData = {
                                        playerNames: playerNames,
                                        platformObjId: vm.selectedPlatform.id,
                                        forbidRewardPointsEvent: {
                                            'addList': vm.forbidRewardPointsAddList,
                                            'removeList': vm.forbidRewardPointsRemoveList
                                        },
                                        adminName: authService.adminName
                                    };
                                    // subcategory 4
                                    vm.batchPermitModifySucc = false;
                                    $(".forbidRewardPointsEventPopover").popover('hide');
                                    vm.updateBatchPlayerForbidRewardPointsEvent(sendData);
                                    vm.drawBatchPermitTable();
                                });
                            }
                        });
                    }
                }
                vm.batchPlayerTable = $('#batchPlayerDataTable').DataTable(tableOptions);
                $scope.safeApply();
            }
            vm.splitBatchPermit = function () {

                let playerNames = [];
                if (vm.multiUsersList) {
                    let multiUsersArr = vm.multiUsersList.split('\n');
                    multiUsersArr.forEach(item => {
                        playerNames.push(item);
                    });
                }
                return playerNames;
            }
            vm.forbidModification = function (id, val, addList, removeList) {
                if (val === true) {
                    if (vm[addList].indexOf(id) == -1) {
                        vm[addList].push(String(id));
                    }
                    vm[removeList] = vm[removeList].filter(item => {
                        if (item != id) {
                            return item;
                        }
                    });
                } else {
                    if (vm[removeList].indexOf(id == -1)) {
                        vm[removeList].push(String(id));
                    }
                    vm[addList] = vm[addList].filter(item => {
                        if (item != id) {
                            return item;
                        }
                    })
                }
                // add to record which is selected to edit
                $('#c-' + id).html($translate("ModifyIt"));
            }

            ///
            //Partner Advertisement
            vm.addNewPartnerAdvertisementRecord = function () {
                if (!vm.duplicatePartnerOrderNo && !vm.duplicatePartnerAdCode) {
                    if (vm.partnerAdvertisementGroup) {
                        let query = {
                            platformId: vm.selectedPlatform.id,
                            orderNo: vm.partnerAdvertisementGroup.orderNo ? vm.partnerAdvertisementGroup.orderNo : 0,
                            advertisementCode: vm.partnerAdvertisementGroup.advertisementCode ? vm.partnerAdvertisementGroup.advertisementCode : "",
                            title: vm.partnerAdvertisementTitle ? vm.partnerAdvertisementTitle : [],
                            backgroundBannerImage: {
                                url: vm.partnerAdvertisementGroup.backgroundUrl ? vm.partnerAdvertisementGroup.backgroundUrl : "",
                                hyperLink: vm.partnerAdvertisementGroup.backgroundHyperLink ? vm.partnerAdvertisementGroup.backgroundHyperLink : ""
                            },
                            imageButton: vm.partnerAdvertisementGroup.imageButton ? vm.partnerAdvertisementGroup.imageButton : [],
                            inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                        }

                        if (query.imageButton) {
                            query.imageButton.map(b => {
                                if (b) {
                                    if (b.url && b.url.length > 35) {
                                        b.urlDisplay = b.url.substring(0, 30) + "...";
                                    } else {
                                        b.urlDisplay = b.url || null;
                                    }

                                    if (b.hyperLink && b.hyperLink.length > 35) {
                                        b.hyperLinkDisplay = b.hyperLink.substring(0, 30) + "...";
                                    } else {
                                        b.hyperLinkDisplay = b.hyperLink || null;
                                    }
                                }
                            })
                        }

                        if (query.backgroundBannerImage) {
                            if (query.backgroundBannerImage.url && query.backgroundBannerImage.url.length > 35) {
                                query.backgroundBannerImage.urlDisplay = query.backgroundBannerImage.url.substring(0, 30) + "...";
                            } else {
                                query.backgroundBannerImage.urlDisplay = query.backgroundBannerImage.url || null;
                            }

                            if (query.backgroundBannerImage.hyperLink && query.backgroundBannerImage.hyperLink.length > 35) {
                                query.backgroundBannerImage.hyperLinkDisplay = query.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                            } else {
                                query.backgroundBannerImage.hyperLinkDisplay = query.backgroundBannerImage.hyperLink || null;
                            }
                        }

                        socketService.$socket($scope.AppSocket, 'createNewPartnerAdvertisementRecord', query, function (data) {
                            if (data) {
                                vm.resetPartnerAddTable();
                            }
                        });
                    }

                }
            }

            vm.savePartnerAdvertisementRecordChanges = function () {
                if (!vm.duplicatePartnerOrderNo && !vm.duplicatePartnerAdCode) {
                    if (vm.displayPartnerAdvertisementList) {
                        vm.displayPartnerAdvertisementList.forEach(record => {

                            let sendData = record;

                            if (sendData.imageButton) {
                                sendData.imageButton.map(b => {
                                    if (b) {
                                        if (b.url && b.url.length > 35) {
                                            b.urlDisplay = b.url.substring(0, 30) + "...";
                                        } else {
                                            b.urlDisplay = b.url || null;
                                        }

                                        if (b.hyperLink && b.hyperLink.length > 35) {
                                            b.hyperLinkDisplay = b.hyperLink.substring(0, 30) + "...";
                                        } else {
                                            b.hyperLinkDisplay = b.hyperLink || null;
                                        }
                                    }
                                })
                            }

                            if (sendData.backgroundBannerImage) {
                                if (sendData.backgroundBannerImage.url && sendData.backgroundBannerImage.url.length > 35) {
                                    sendData.backgroundBannerImage.urlDisplay = sendData.backgroundBannerImage.url.substring(0, 30) + "...";
                                } else {
                                    sendData.backgroundBannerImage.urlDisplay = sendData.backgroundBannerImage.url || null;
                                }

                                if (sendData.backgroundBannerImage.hyperLink && sendData.backgroundBannerImage.hyperLink.length > 35) {
                                    sendData.backgroundBannerImage.hyperLinkDisplay = sendData.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                                } else {
                                    sendData.backgroundBannerImage.hyperLinkDisplay = sendData.backgroundBannerImage.hyperLink || null;
                                }
                            }

                            socketService.$socket($scope.AppSocket, 'savePartnerAdvertisementRecordChanges', sendData, function (data) {
                                //do nothing
                            });

                            vm.editPartnerAdvertisementRecord = false;
                            vm.showPartnerAdvertisementRecord = true;
                        });
                    }
                }
            }

            vm.deletePartnerAdvertisementRecord = function (advertisementId, index) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        advertisementId: advertisementId,
                    };

                    GeneralModal.confirm({
                        title: $translate('DELETE_ADVERTISEMENT'),
                        text: $translate('Confirm to delete advertisement ?')
                    }).then(function () {
                        socketService.$socket($scope.AppSocket, 'deletePartnerAdvertisementRecord', sendData, function (data) {
                            if (data) {
                                if (typeof index !== "undefined") {
                                    vm.displayPartnerAdvertisementList.splice(index, 1);
                                }
                            }
                        });
                    });
                }
            }

            vm.partnerAdvertisementList = function () {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                };

                socketService.$socket($scope.AppSocket, 'getPartnerAdvertisementList', sendData, function (data) {
                    console.log("partner advertisement list", data);
                    if (data && data.data) {

                        data.data.map(d => {
                            if (d) {
                                if (d.backgroundBannerImage) {
                                    if (d.backgroundBannerImage.url && d.backgroundBannerImage.url.length > 35) {
                                        d.backgroundBannerImage.urlDisplay = d.backgroundBannerImage.url.substring(0, 30) + "...";
                                    } else {
                                        d.backgroundBannerImage.urlDisplay = d.backgroundBannerImage.url || null;
                                    }

                                    if (d.backgroundBannerImage.hyperLink && d.backgroundBannerImage.hyperLink.length > 35) {
                                        d.backgroundBannerImage.hyperLinkDisplay = d.backgroundBannerImage.hyperLink.substring(0, 30) + "...";
                                    } else {
                                        d.backgroundBannerImage.hyperLinkDisplay = d.backgroundBannerImage.hyperLink || null;
                                    }
                                }

                                d.status = d.status == vm.playerAdvertisementStatus["OPEN"] ? d.status : vm.playerAdvertisementStatus["CLOSE"];
                            }
                        })

                        vm.displayPartnerAdvertisementList = data.data;

                        $scope.safeApply();
                    }
                });
            };

            vm.changePartnerAdvertisementStatus = function (advertisementId, advertisementStatus) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        status: advertisementStatus
                    }


                    let statusChangeConfirmText = "";

                    if (advertisementStatus == vm.playerAdvertisementStatus["CLOSE"]) {
                        statusChangeConfirmText = "Confirm to turn advertisement on ?";
                    } else {
                        statusChangeConfirmText = "Confirm to turn advertisement off ?";
                    }

                    GeneralModal.confirm({
                        title: $translate('DELETE_ADVERTISEMENT'),
                        text: $translate(statusChangeConfirmText)
                    }).then(function () {
                        socketService.$socket($scope.AppSocket, 'changePartnerAdvertisementStatus', sendData, function (data) {
                            if (data) {
                                vm.partnerAdvertisementList();
                            }
                        });
                    });
                }
            }

            vm.checkPartnerDuplicateOrderNoWithId = function (orderNo, advertisementId) {
                if (advertisementId) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        orderNo: orderNo,
                        inputDevice: vm.playerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkPartnerDuplicateOrderNoWithId', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateOrderNo = true;
                            vm.errMessage = "Order no is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateOrderNo = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }
            }

            vm.checkPartnerDuplicateAdCodeWithId = function (advertisementCode, advertisementId) {
                if (advertisementId && advertisementCode) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        _id: advertisementId,
                        advertisementCode: advertisementCode,
                        inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkPartnerDuplicateAdCodeWithId', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateAdCode = true;
                            vm.errMessage = "Advertisement code is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateAdCode = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }
            }

            vm.checkPartnerDuplicateOrderNo = function (orderNo) {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    orderNo: orderNo,
                    inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                }
                socketService.$socket($scope.AppSocket, 'checkPartnerDuplicateOrderNo', sendData, function (data) {
                    if (data && data.data) {
                        vm.duplicateOrderNo = true;
                        vm.errMessage = "Order no is duplicated";
                        $scope.safeApply();
                    } else {
                        vm.duplicateOrderNo = false;
                        vm.errMessage = "";
                        $scope.safeApply();
                    }
                });
            };


            vm.checkPartnerDuplicateAdCode = function (advertisementCode) {
                if (advertisementCode) {
                    let sendData = {
                        platformId: vm.selectedPlatform.id,
                        advertisementCode: advertisementCode,
                        inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                    }
                    socketService.$socket($scope.AppSocket, 'checkPartnerDuplicateAdCode', sendData, function (data) {
                        if (data && data.data) {
                            vm.duplicateAdCode = true;
                            vm.errMessage = "Advertisement code is duplicated";
                            $scope.safeApply();
                        } else {
                            vm.duplicateAdCode = false;
                            vm.errMessage = "";
                            $scope.safeApply();
                        }
                    });
                }
            }

            vm.setPartnerNewImageButtonName = function () {
                let buttonNo = vm.currentImageButtonNo + 1;
                vm.partnerAdvertisementGroup.imageButton.push(
                    {
                        buttonNo: buttonNo,
                        buttonName: 'activityBtn' + buttonNo,
                        url: '',
                        hyperLink: '',
                        css: "position:absolute; width: auto; height: auto; top:87%; left: 70%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    }
                );

                vm.currentImageButtonNo += 1;
            }

            vm.getPartnerNextOrderNo = function () {
                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    inputDevice: vm.partnerAdvertisementWebDevice ? vm.inputDevice["WEB_PLAYER"] : vm.inputDevice["H5_PLAYER"]
                }

                socketService.$socket($scope.AppSocket, 'getPartnerNextOrderNo', sendData, function (data) {
                    if (data && data.data) {
                        if (data.data.hasOwnProperty("orderNo")) {
                            vm.partnerAdvertisementGroup.orderNo = data.data.orderNo + 1;

                            $scope.safeApply();
                        }
                    }
                });
            }

            vm.resetPartnerAddTable = function () {
                //reset the adding table
                vm.addNewPartnerAdvertisement = false;
                vm.currentPartnerImageButtonNo = 2;
                vm.partnerAdvertisementGroup = {};
                vm.partnerAdvertisementTitle = [];
                vm.partnerAdvertisementGroup.imageButton = [
                    {
                        buttonName: "activityBtn1",
                        url: "",
                        hyperLink: "",
                        css: "position:absolute; width: auto; height: auto; top:87%; left: 20%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    },
                    {
                        buttonName: "activityBtn2",
                        url: "",
                        hyperLink: "",
                        css: "position:absolute; width: auto; height: auto; top:87%; left: 70%",
                        hoverCss: ":hover{filter: contrast(200%);}"
                    }
                ];

                $scope.safeApply();
            };

            vm.getPlayersByAdvanceQueryDebounced = $scope.debounceSearch(vm.getPlayersByAdvanceQuery);

            vm.reArrangeArr = function (oriTXT, targetField, targetArr) {

                if (typeof(oriTXT) == 'string' && oriTXT != '') {
                    let convertArr = oriTXT.split(',');
                    targetArr[targetField] = convertArr;
                    targetArr = targetArr.filter(item => {
                        return item != '';
                    })
                    console.log(targetArr);
                }
            };

            vm.createCallOutMission = function () {
                let sendQuery = {};

                sendQuery.platformObjId = vm.selectedPlatform.id;
                sendQuery.adminObjId = authService.adminId;
                sendQuery.searchFilter = JSON.stringify(vm.playerFeedbackQuery);
                sendQuery.searchQuery = JSON.stringify(vm.getPlayerFeedbackQuery());
                sendQuery.sortCol = VM.playerFeedbackQuery.sortCol || {registrationTime: -1};

                $scope.$socketPromise("createCallOutMission", sendQuery).then(data => {
                    console.log(data);
                    vm.getCtiData();
                });
            };

            // Edit Child Partner
            vm.initEditChildPartner = function () {
                vm.isChildPartnerEditing = false;
                vm.disableEditChildPartner = true;
                vm.totalChildPartner = vm.selectedSinglePartner.childrencount || 0;
                vm.childPartnerList = [];
                vm.curChildPartner = [];
                vm.updateChildPartner = [];

                let sendData = {
                    platform: vm.selectedPlatform.id,
                    _id: vm.selectedSinglePartner._id
                }

                socketService.$socket($scope.AppSocket, 'getChildPartnerRecords', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        console.log('child partner records',data);
                        if (data && data.data && data.data.length > 0) {
                            vm.childPartnerList = data.data;
                            if (vm.childPartnerList && vm.childPartnerList.length > 0) {
                                for (let i = 0, len = vm.childPartnerList.length; i<len; i++) {
                                    vm.curChildPartner.push(vm.childPartnerList[i].partnerName);
                                }
                                vm.updateChildPartner = JSON.parse(JSON.stringify(vm.curChildPartner));
                                if (vm.curChildPartner == vm.updateChildPartner) {
                                    vm.disableEditChildPartner = true;
                                }
                            }
                        }
                    });
                });

            };

            vm.editChildPartner = function () {
                vm.isChildPartnerEditing = true;
                if (vm.childPartnerList.length == 0) {
                    vm.childPartnerList.push({partnerName: ""});
                    vm.disableEditChildPartner = true;
                    vm.totalChildPartner = vm.totalChildPartner + 1;
                }
            };

            vm.checkChildPartnerNameValidity = function (name, idx) {
                vm.childPartnerErrorMessage = null;
                if (!name) return;

                if (name == vm.selectedSinglePartner.partnerName) {
                    vm.disableEditChildPartner = true;
                    if (vm.childPartnerList[idx] && vm.childPartnerList[idx].errorMessage) {
                        delete vm.childPartnerList[idx].errorMessage;
                    }
                    return;
                }

                socketService.$socket($scope.AppSocket, 'checkChildPartnerNameValidity', {
                    platform: vm.selectedPlatform.id,
                    partnerName: name,
                    partnerObjId: vm.selectedSinglePartner._id
                }, function (data) {
                    $scope.$evalAsync(() => {
                        if (data && data.data && data.data.hasOwnProperty('isExist') && !data.data.isExist) {
                            vm.disableEditChildPartner = true;
                            vm.childPartnerList[idx].errorMessage = $translate('PARTNER_NAME_DOES_NOT_EXISTS');
                        } else if (data && data.data && data.data.hasOwnProperty('isExist') && data.data.isExist) {
                            vm.disableEditChildPartner = true;
                            vm.childPartnerList[idx].errorMessage = $translate('PARTNER_NAME_ALREADY_HAS_A_PARENT') + data.data.parent + $translate('REMOVE_IT_FROM_THE_ORIGINAL_PARENT');
                        } else if (data && data.data && data.data.hasOwnProperty('isOwnParent') && data.data.isOwnParent) {
                            vm.disableEditChildPartner = true;
                            vm.childPartnerList[idx].errorMessage = $translate('Partner Name cannot be used for its own parent(cannot be edited)');
                        } else {
                            vm.disableEditChildPartner = false;
                            delete vm.childPartnerList[idx].errorMessage;
                        }
                    });
                });
            }

            vm.childPartnerNewRow = function (valueCollection, idx) {
                valueCollection.push({partnerName: ""});
                vm.totalChildPartner = vm.totalChildPartner + 1;
            };

            vm.childPartnerDeleteRow = function (idx, valueCollection) {
                valueCollection.splice(idx, 1);

                if (valueCollection.length == 0) {
                    valueCollection.push({partnerName: ""});
                    vm.totalChildPartner = 1;
                } else {
                    vm.totalChildPartner = vm.totalChildPartner - 1;
                }

                if (!vm.curChildPartner.length && valueCollection.length == 1) {
                    valueCollection.forEach(el => {
                        if (el && !el.partnerName) {
                            vm.disableEditChildPartner = true;
                        }
                    });
                } else {
                    vm.disableEditChildPartner = false;
                }
            };

            vm.getUpdateChildPartnerName = function () {
                vm.updateChildPartner = [];
                if (vm.childPartnerList && vm.childPartnerList.length > 0) {
                    for (let i = 0, len = vm.childPartnerList.length; i<len; i++) {
                        vm.updateChildPartner.push(vm.childPartnerList[i].partnerName);
                    }
                }
            };

            vm.submitChildPartner = function () {
                vm.getUpdateChildPartnerName();
                console.log('updateData', vm.updateChildPartner);
                let countUpdateChildPartner = vm.updateChildPartner.length;

                if (vm.updateChildPartner && vm.updateChildPartner.length == 1) {
                    vm.updateChildPartner.forEach(el => {
                        if (el == "") {
                            countUpdateChildPartner = 0;
                        }
                    });
                }

                var sendData = {
                    creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                    platformId: vm.selectedPlatform.id,
                };

                sendData.data = {
                    partnerId: vm.selectedSinglePartner.partnerId,
                    partnerName: vm.selectedSinglePartner.partnerName,
                    partnerObjId: vm.selectedSinglePartner._id,
                    curChildPartnerHeadCount: vm.curChildPartner ? vm.curChildPartner.length : 0,
                    updateChildPartnerHeadCount: countUpdateChildPartner,
                    curChildPartnerName: vm.curChildPartner,
                    updateChildPartnerName: vm.updateChildPartner
                }

                console.log('sendData',sendData);
                socketService.$socket($scope.AppSocket, 'updateChildPartner', sendData, function (data) {
                    console.log('sent', data);
                    if (data.data && data.data.stepInfo) {
                        socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                    }
                    if (vm.selectedSinglePartner && data && data.data && data.data.data && data.data.data.updateChildPartnerHeadCount) {
                        vm.selectedSinglePartner.childrencount = data.data.data.updateChildPartnerHeadCount;
                    }
                    vm.getPlatformPartnersData();
                }, function (err) {
                    console.log('err',err);
                });
            };
            // End of Edit Child Partner

            // Transfer Partner Credit to Player
            vm.showTransferPartnerCreditToPlayerModal = function (partnerObjId) {
                vm.isEditingTransferPartnerCredit = false;
                vm.downlinePlayerName = null;
                vm.selectedPartnerObjId = partnerObjId;
                vm.downlinePlayers = {};
                vm.downlinePlayers.limit = 50;
                vm.downlinePlayers.index = 0;
                vm.downlinePlayers.currentPage = 1;
                vm.downlinePlayers.totalPage = 1;
                vm.downlinePlayers.totalCount = 0;

                vm.loadDownlinePlayersRecord();
                $('#modalTransferPartnerCreditToPlayer').modal().show();
            };

            vm.loadDownlinePlayersRecord = function () {
                vm.downlinePlayersData = [];
                vm.sumTotalTransferAmount = 0;
                vm.isEditingTransferPartnerCredit = false;
                if (vm.downlinePlayerName && vm.downlinePlayers) {
                    vm.downlinePlayers.currentPage = 1;
                    vm.downlinePlayers.index = 0;
                    vm.downlinePlayers.limit = 50;
                }

                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    partnerObjId: vm.selectedPartnerObjId || vm.selectedSinglePartner._id,
                    playerName: vm.downlinePlayerName,
                    limit: vm.downlinePlayers.limit || 50,
                    index: vm.downlinePlayers.index || 0,
                    sortCol: vm.downlinePlayers.sortCol || null
                };
                console.log('sendData ',sendData);
                socketService.$socket($scope.AppSocket, 'getDownlinePlayersRecord', sendData, function (data) {
                    console.log("getDownlinePlayersRecord", data);
                    $scope.$evalAsync(() => {
                        let tblData = data && data.data ? data.data.data : []
                        if (tblData && tblData.length > 0) {
                            tblData.forEach((record, index) => {
                                record.orderNo = index + sendData.index + 1;
                                vm.downlinePlayersData.push({
                                    orderNo: record.orderNo,
                                    _id: record._id,
                                    name: record.name,
                                    playerId: record.playerId,
                                });
                            });
                        }

                        if(data && data.data && data.data.size){
                            let itemTotal = data && data.data && data.data.size ? data.data.size : 0;
                            let totalPage = itemTotal / vm.downlinePlayers.limit
                            vm.downlinePlayers.totalPage = Math.ceil(totalPage);
                            vm.downlinePlayers.totalCount = data.data.size;
                        }else{
                            vm.downlinePlayers.totalPage  = 1;
                            vm.downlinePlayers.totalCount = 0;
                        }
                        vm.downlinePlayersPages = [];
                        for(let i = 0; i < vm.downlinePlayers.totalPage; i++){
                            vm.downlinePlayersPages.push(i);
                        }
                    });
                });
            };

            vm.getSumTotalTransferAmount = function (data) {
                let sum = 0;
                data.forEach(el => {
                    if (el && el.amount && el.amount >= 0) {
                        sum += el.amount;
                    }
                });
                vm.sumTotalTransferAmount = $noRoundTwoDecimalPlaces(sum);
            };

            vm.editTransferPartnerCreditToPlayer = function () {
                vm.isEditingTransferPartnerCredit = true;
                vm.isTransferPartnerCreditToPlayer = true;
            };

            vm.disableTransferPartnerCreditToPlayer = function (value) {
                if ($noRoundTwoDecimalPlaces(vm.sumTotalTransferAmount) == 0 || value < 0 || (value && value.toString == 'undefined')) {
                    vm.isTransferPartnerCreditToPlayer = true;
                } else if ($noRoundTwoDecimalPlaces(vm.sumTotalTransferAmount) <= vm.selectedSinglePartner.credits) {
                    vm.isTransferPartnerCreditToPlayer = false;
                } else {
                    vm.isTransferPartnerCreditToPlayer = true;
                }
            };

            vm.checkIsDisableTransferPartnerCreditToPlayer = function (providerGroupId, withdrawConsumption) {
                if (providerGroupId && (!withdrawConsumption || withdrawConsumption < 0)) {
                    vm.isTransferPartnerCreditToPlayer = true;
                } else {
                    vm.isTransferPartnerCreditToPlayer = false;
                }
            };

            vm.nextDownlinePlayerPage = function(){
                vm.downlinePlayers.currentPage += 1;
                vm.downlinePlayers.index = (vm.downlinePlayers.currentPage - 1) * vm.downlinePlayers.limit;
                if (vm.downlinePlayers.currentPage > 0 && vm.downlinePlayers.currentPage <= vm.downlinePlayers.totalPage) {
                    vm.loadDownlinePlayersRecord();
                }
            };

            vm.gotoDownlinePlayerPage = function(pg, $event){
                $('body .pagination li').removeClass('active');
                if($event){
                    $($event.currentTarget).addClass('active');
                }
                let pgNo = null;
                if(pg<=0){
                    pgNo = 0
                }else if(pg >= 1){
                    pgNo = pg;
                }
                vm.downlinePlayers.index = ((pgNo - 1) * vm.downlinePlayers.limit);
                vm.downlinePlayers.currentPage = pgNo;
                if (vm.downlinePlayers.currentPage > 0 && vm.downlinePlayers.currentPage <= vm.downlinePlayers.totalPage) {
                    vm.loadDownlinePlayersRecord();
                }
            };

            vm.submitTransferPartnerCreditToPlayer = function () {
                let playerArr = [];

                if (vm.downlinePlayersData && vm.downlinePlayersData.length > 0) {
                    for (let i = 0, len = vm.downlinePlayersData.length; i < len; i++) {
                        let player = vm.downlinePlayersData[i];

                        if (player && player.amount) {
                            playerArr.push({
                                playerObjId: player._id,
                                playerName: player.name,
                                amount: player.amount,
                                providerGroup: player.providerGroup,
                                withdrawConsumption: player.withdrawConsumption || 0
                            });
                        }
                    }
                };

                let sendData = {
                    platformId: vm.selectedPlatform.id,
                    partnerObjId: vm.selectedPartnerObjId || vm.selectedSinglePartner._id,
                    currentCredit: parseFloat(vm.selectedSinglePartner.credits).toFixed(2) || 0,
                    updateCredit: $noRoundTwoDecimalPlaces(vm.sumTotalTransferAmount) > 0 ? vm.selectedSinglePartner.credits - $noRoundTwoDecimalPlaces(vm.sumTotalTransferAmount) : 0 || 0,
                    totalTransferAmount: $noRoundTwoDecimalPlaces(vm.sumTotalTransferAmount) || 0,
                    transferToPlayers: playerArr
                };
                console.log('sendData', sendData);

                socketService.$socket($scope.AppSocket, 'transferPartnerCreditToPlayer', sendData, function (data) {
                    console.log('sent', data);
                    vm.getPlatformPartnersData();
                }, function (err) {
                    console.log('err',err);
                });
            };

            // end of Transfer Partner Credit to Player

            // Partner Main Permission Log
            $('body').on('click', '#permissionRecordButtonByPartnerTab', function () {
                vm.getPartnerPermissionChangeByPartnerTab("new")
            });

            vm.getPartnerPermissionChangeByPartnerTab = function (flag) {
                $('.partnerPermissionPopover').popover('hide');
                vm.partnerPermissionQuery = vm.partnerPermissionQuery || {};
                vm.partnerPermissionQuery.searching = true;
                vm.partnerPermissionHistory = [];
                $scope.$evalAsync();
                if (flag == 'new') {
                    utilService.actionAfterLoaded('#modalPartnerPermissionChangeLog .searchDiv .startTime', function () {
                        vm.partnerPermissionQuery.startTime = utilService.createDatePicker('#modalPartnerPermissionChangeLog .searchDiv .startTime');
                        vm.partnerPermissionQuery.endTime = utilService.createDatePicker('#modalPartnerPermissionChangeLog .searchDiv .endTime');
                        vm.partnerPermissionQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                        vm.partnerPermissionQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                    });
                }

                let tempPartnerObjId = vm.popOverPartnerPermission && vm.popOverPartnerPermission._id ? vm.popOverPartnerPermission._id :
                    vm.selectedSinglePartner && vm.selectedSinglePartner._id ? vm.selectedSinglePartner._id : null;

                let sendData = {
                    partnerObjId: tempPartnerObjId,
                    platform: vm.selectedPlatform.id,
                    createTime: {
                        $gte: new Date(vm.partnerPermissionQuery.startTime.data('datetimepicker').getLocalDate()),
                        $lt: new Date(vm.partnerPermissionQuery.endTime.data('datetimepicker').getLocalDate())
                    }
                }

                socketService.$socket($scope.AppSocket, 'getPartnerPermissionLog', sendData, function (data) {
                    data.data.forEach(row => {
                        row.admin = row.isSystem ? {adminName: "System"} : row.admin;
                    });
                    vm.partnerPermissionHistory = data.data || [];
                    vm.partnerPermissionQuery.searching = false;
                    $scope.$evalAsync();
                });
            };
            // end of Partner Permission Log
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
            'commonService',
            'CONFIG',
            "$cookies",
            "$timeout",
            '$http',
            'uiGridExporterService',
            'uiGridExporterConstants'
        ];

        partnerController.$inject = injectParams;
        myApp.register.controller('partnerCtrl', partnerController);
    }
);
