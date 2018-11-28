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
            WechatPay: 4
        };
        vm.getDepositMethodbyId = {
            1: 'Online',
            2: 'ATM',
            3: 'Counter',
            4: 'AliPayTransfer',
            5: 'weChatPayTransfer',
            6: 'CloudFlashPay'
        };
        vm.topUpField = {
            "ManualPlayerTopUp": 'bankCardNo',
            "PlayerAlipayTopUp": 'alipayAccount',
            "PlayerWechatTopUp": 'wechatAccount',
            "PlayerTopUp": 'merchantNo'
        }
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
                        vm.platformByAdminId = data.data;
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
            if(window.location.pathname == "/monitor/payment"){
                vm.preparePaymentMonitorPage();
            }
            else{
                vm.preparePaymentMonitorTotalPage();
            }
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
            $('#autoRefreshProposalFlag')[0].checked = true;
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.paymentMonitorTotalQuery = {};
            vm.paymentMonitorTotalQuery.totalCount = 0;
            vm.getAllPaymentAcc();

            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];
                    vm.merchantsNBcard();
                    vm.getMerchantTypeName();
                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    vm.getPaymentMonitorTotalRecord();
                    vm.merchantGroupCloneList = vm.merchantGroups;
                    vm.getPlatformByAdminId();
                }
            );

            utilService.actionAfterLoaded("#paymentMonitorTotalTablePage", function () {
                vm.commonInitTime(vm.paymentMonitorTotalQuery, '#paymentMonitorTotalQuery');
                vm.paymentMonitorTotalQuery.merchantType = null;
                // vm.paymentMonitorTotalQuery.pageObj = utilService.createPageForPagingTable("#paymentMonitorTotalTablePage", {}, $translate, function (curP, pageSize) {
                //     vm.commonPageChangeHandler(curP, pageSize, "paymentMonitorTotalQuery", vm.getPaymentMonitorTotalRecord)
                // });
                $scope.safeApply();
            })
        };
        vm.prepareWechatMonitorPage = function () {
            $('#autoRefreshProposalFlag')[0].checked = true;
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.wechatGroupControlQuery = {};
            vm.wechatGroupControlQuery.totalCount = 0;
            vm.getAllPaymentAcc();

            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];
                    vm.merchantsNBcard();
                    vm.getMerchantTypeName();
                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    vm.getWechatMonitorRecord();
                    vm.merchantGroupCloneList = vm.merchantGroups;
                }
            );
            utilService.actionAfterLoaded("#wechatGroupMonitorTablePage", function () {
                vm.commonInitTime(vm.wechatGroupControlQuery, '#wechatGroupControlQuery');
                vm.wechatGroupControlQuery.merchantType = null;
                vm.wechatGroupControlQuery.pageObj = utilService.createPageForPagingTable("#wechatGroupMonitorTablePage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "wechatGroupControlQuery", vm.getWechatMonitorRecord)
                });
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
        vm.getProvinceName = function (provinceId) {
            socketService.$socket($scope.AppSocket, "getProvince", {provinceId: provinceId}, function (data) {
                var text = data.data.province ? data.data.province.name : '';
                vm.selectedProposal.data.provinceName = text;
                $scope.safeApply();
            });
        }

        vm.getCityName = function (cityId) {
            socketService.$socket($scope.AppSocket, "getCity", {cityId: cityId}, function (data) {
                var text = data.data.city ? data.data.city.name : '';
                vm.selectedProposal.data.cityName = text;
                $scope.safeApply();
            });
        }
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
        vm.filterMerchant = function () {
            vm.merchantCloneList = angular.copy(vm.merchants);
            vm.merchantGroupCloneList = vm.merchantGroups;
            let agent = vm.paymentMonitorQuery.userAgent;
            let thirdParty = vm.paymentMonitorQuery.merchantGroup;
            let mainTopupType = vm.paymentMonitorQuery.mainTopupType;
            let topupType = vm.paymentMonitorQuery.topupType;
            let bankTypeId = vm.paymentMonitorQuery.bankTypeId;
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
                                item.merchantNo$ = vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
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
                $('#autoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorTotalQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();

            if (vm.paymentMonitorTotalQuery.mainTopupType === '0' || vm.paymentMonitorTotalQuery.mainTopupType === '1' || vm.paymentMonitorTotalQuery.mainTopupType === '3' || vm.paymentMonitorTotalQuery.mainTopupType === '4' || vm.paymentMonitorTotalQuery.mainTopupType === '5') {
                vm.paymentMonitorTotalQuery.topupType = '';
                vm.paymentMonitorTotalQuery.merchantGroup = '';
                vm.paymentMonitorTotalQuery.merchantNo = '';
            }
            var staArr = vm.paymentMonitorTotalQuery.status ? vm.paymentMonitorTotalQuery.status : [];
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
                status: staArr,
                startTime: vm.paymentMonitorTotalQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorTotalQuery.endTime.data('datetimepicker').getLocalDate(),
                platformList: vm.paymentMonitorTotalQuery.platformList,
                index: 0,
                limit: 1000,
                sortCol: vm.paymentMonitorTotalQuery.sortCol,

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

            return $scope.$socketPromise('getPaymentMonitorTotalResult', sendObj).then(
                data => {
                    $scope.$evalAsync(() => {

                        console.log('Payment Monitor Total Result', data);
                        vm.paymentMonitorTotalData = data.data.data;

                        vm.drawPaymentRecordTotalTable(
                            data.data.data.filter(item => {
                                if (item && item.$merchantCurrentCount && item.$merchantAllCount && item.$playerCurrentCount && item.$playerAllCount
                                    && ((item.$merchantCurrentCount == item.$merchantAllCount && item.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)
                                        || (item.$playerCurrentCount == item.$playerAllCount && item.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4))))) {

                                    item.amount$ = parseFloat(item.data.amount).toFixed(2);
                                    item.merchantNo$ = item.data.merchantNo ? item.data.merchantNo
                                        : item.data.wechatAccount ? item.data.wechatAccount
                                            : item.data.weChatAccount != null ? item.data.weChatAccount
                                                : item.data.alipayAccount ? item.data.alipayAccount
                                                    : item.data.bankCardNo ? item.data.bankCardNo
                                                        : item.data.accountNo ? item.data.accountNo : null;
                                    item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                                    item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                                    item.status$ = $translate(item.status);
                                    item.merchantName = vm.getMerchantName(item.data.merchantNo, item.inputDevice);
                                    item.website = item && item.data && item.data.platform && item.data.platformId ?
                                        item.data.platform + "." + getPlatformNameByPlatformObjId(item.data.platformId) : "";

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
                                        item.merchantNo$ = vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
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
                                    }

                                    return item;
                                }
                            }), data.data.size, {}, isNewSearch
                        );

                        sendObj.searchType = "completed";
                        utilService.actionAfterLoaded("#paymentMonitorTotalTable", function () {
                                $scope.$socketPromise('getPaymentMonitorTotalResult', sendObj).then(
                                    data => {
                                        $scope.$evalAsync(() => {
                                            $('#paymentMonitorTableSpin').hide();
                                            console.log('Payment Monitor Total  Completed Result', data);

                                            vm.drawPaymentRecordTotalCompletedTable(
                                                data.data.data.filter(item => {
                                                    if (item && item.$merchantCurrentCount && item.$merchantAllCount && item.$playerCurrentCount && item.$playerAllCount
                                                        && ((item.$merchantCurrentCount == item.$merchantAllCount && item.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)
                                                            || (item.$playerCurrentCount == item.$playerAllCount && item.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4))))) {

                                                        item.amount$ = parseFloat(item.data.amount).toFixed(2);
                                                        item.merchantNo$ = item.data.merchantNo ? item.data.merchantNo
                                                            : item.data.wechatAccount ? item.data.wechatAccount
                                                                : item.data.weChatAccount != null ? item.data.weChatAccount
                                                                    : item.data.alipayAccount ? item.data.alipayAccount
                                                                        : item.data.bankCardNo ? item.data.bankCardNo
                                                                            : item.data.accountNo ? item.data.accountNo : null;
                                                        item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                                                        item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                                                        item.status$ = $translate(item.status);
                                                        item.merchantName = vm.getMerchantName(item.data.merchantNo, item.inputDevice);
                                                        item.website = item && item.data && item.data.platform && item.data.platformId ?
                                                            item.data.platform + "." + getPlatformNameByPlatformObjId(item.data.platformId) : "";

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
                                                            item.merchantNo$ = vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
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
                                                        }

                                                        return item;
                                                    }
                                                }), data.data.size, {}, isNewSearch
                                            );
                                        });
                                }, err => {
                                    console.error(err);
                                }, true);
                        });
                    });
                }, err => {
                    console.error(err);
                }, true
            );
        };


        vm.getWechatMonitorRecord = function (isNewSearch) {
            // let queryStartTime = vm.wechatGroupControlQuery.startTime.data('datetimepicker').getLocalDate();
            // let queryEndTime = vm.wechatGroupControlQuery.endTime.data('datetimepicker').getLocalDate();
            //
            // let searchInterval = Math.abs(new Date(queryEndTime).getTime() - new Date(queryStartTime).getTime());
            // if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
            //     socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
            //     return;
            // }

            if (isNewSearch) {
                $('#autoRefreshProposalFlag').attr('checked', false);
            }
            vm.wechatGroupControlQuery.platformId = vm.curPlatformId;
            $('#wechatGroupMonitorTableSpin').show();

            var staArr = vm.wechatGroupControlQuery.status ? vm.wechatGroupControlQuery.status : [];
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
            vm.wechatGroupControlQuery.index = isNewSearch ? 0 : (vm.wechatGroupControlQuery.index || 0);
            var sendObj = {
                department: vm.wechatGroupControlQuery.department,
                deviceName: vm.wechatGroupControlQuery.deviceName,
                loginAccount: vm.wechatGroupControlQuery.loginAccount,
                status: staArr,
                platformId: vm.curPlatformId,
                index: vm.wechatGroupControlQuery.index,
                limit: vm.wechatGroupControlQuery.limit || 10,
                sortCol: vm.wechatGroupControlQuery.sortCol,


            }
            vm.wechatGroupControlQuery.merchantNo ? sendObj.merchantNo = vm.wechatGroupControlQuery.merchantNo : null;
            console.log('sendObj', sendObj);
            if(vm.wechatGroupControlQuery.merchantNo && vm.wechatGroupControlQuery.merchantNo.length == 1 && vm.wechatGroupControlQuery.merchantNo.indexOf('MMM4-line2') != -1){
                sendObj.line = '2';
                vm.wechatGroupControlQuery.line = '2';
                sendObj.merchantNo = vm.wechatGroupControlQuery.merchantNo.filter(merchantData=>{
                    return merchantData != 'MMM4-line2';
                })
            }else{
                vm.wechatGroupControlQuery.line = null;
            }
            socketService.$socket($scope.AppSocket, 'getWechatMonitorResult', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    $('#wechatGroupMonitorTableSpin').hide();
                    console.log('Wechat Monitor Result', data);
                    vm.wechatGroupControlQuery.totalCount = data.data.size;

                    vm.drawWechatGroupRecordTable(
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
                                item.merchantNo$ = vm.getOnlineMerchantId(merchantNo, item.inputDevice, typeID);
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
            $scope.safeApply();
        };

        vm.resetWechatMonitorQuery = function () {
            vm.wechatGroupControlQuery.department = "";
            vm.wechatGroupControlQuery.deviceName = "";
            vm.wechatGroupControlQuery.loginAccount = "";
            vm.commonInitTime(vm.wechatGroupControlQuery, '#wechatGroupControlQuery');
            vm.getWechatMonitorRecord(true);
            $('#autoRefreshProposalFlag')[0].checked = true;
            $scope.safeApply();
        };
        vm.showProposalModal = function (proposalId) {
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: vm.selectedPlatform._id,
                proposalId: proposalId
            }, function (data) {
                $scope.$evalAsync(() => {
                    vm.selectedProposal = data.data;
                    let playerName = vm.selectedProposal.data.playerName;
                    let typeId = vm.selectedProposal.type._id;
                    let typeName = [vm.selectedProposal.type.name];
                    let playerId = vm.selectedProposal.data.playerId;

                    if (vm.selectedProposal.data.inputData) {
                        if (vm.selectedProposal.data.inputData.provinceId) {
                            vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                        }
                        if (vm.selectedProposal.data.inputData.cityId) {
                            vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                        }
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
                        title: $translate('DEVICE'), data: "data.userAgent",
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
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
                            var text = data ? data : merchantName;
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

        vm.drawPaymentRecordTotalTable = function (data, size, summary, newSearch) {
            size = data.length;
            vm.paymentMonitorTotalQuery.totalCount = data.length;
            console.log('data', data);
            vm.paymentMonitorTotalData.followUpContent = {};
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorTotalQuery.aaSorting || [[14, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
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
                        title: $translate('DEVICE'), data: "data.userAgent",
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'data.topupType',
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {title: $translate('3rd Party Platform'), data: "merchantName", sClass: 'merchantCount'},
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
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight playerCount"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {
                        title: $translate('Admin_Locked'),
                        data: "lockedButtonDisplay",
                        render: function (data, type, row) {
                            if(row.data.lockedAdminId && authService.adminId == row.data.lockedAdminId && !row.data.followUpContent){
                                return '<div id="link' + row.proposalId +'"><a ng-click="vm.unlockProposal(\'' + row.proposalId + '\', \'link' + row.proposalId + '\', \'content' + row.proposalId + '\')">' + authService.adminName + " - " + $translate("UNLOCK")  + '</a></div>';
                            }else if(row.data.lockedAdminId && !row.data.followUpContent) {
                                return row.data.lockedAdminName + " " + $translate("is following up");
                            }else if(row.data.lockedAdminId && row.data.followUpContent && row.data.followUpCompletedTime){
                                let completedDate = utilService.$getTimeFromStdTimeFormat(new Date(row.data.followUpCompletedTime));
                                return row.data.lockedAdminName + " " + $translate("follow up completed") + "<br> (" + completedDate + ")";
                            }else{
                                return '<div id="link' + row.proposalId +'"><a ng-click="vm.lockProposal(\'' + row.proposalId + '\', \'link' + row.proposalId + '\', \'content' + row.proposalId + '\')">' + data + '</a></div>';
                            }
                        }
                    },
                    {
                        title: $translate('Followup_Content'),
                        data: "remark$",
                        "width": "200px",
                        render: function(data, type, row){
                            //ng-submit="vm.editFollowUpContent(\'' + row.proposalId + ',' + +'\');"
                            if(row.data.lockedAdminId && authService.adminId == row.data.lockedAdminId && !row.data.followUpContent){
                                return '<div id="content' + row.proposalId +'"><a ng-click="vm.showEditFollowUpContent = true;" ng-if="!vm.showEditFollowUpContent">' + $translate("EDIT")  + '</a>' +
                                    '<div ng-if="vm.showEditFollowUpContent"><form ng-submit="vm.editFollowUpContent(\'' + row.proposalId + '\')"><input type="text" ng-model="vm.paymentMonitorTotalQuery.followUpContent[' + row.proposalId + ']"></form></div></div>';
                            }else if(row.data.lockedAdminId && row.data.followUpContent){
                                return '<div>' + row.data.followUpContent + '</div>';
                            }else{
                                return '<div id="content' + row.proposalId +'">-</div>';
                            }
                        }
                    },
                ],
                "autoWidth": true,
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

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTotalTable', tableOptions, {}, true);

            $('#paymentMonitorTotalTable').resize();

            $('#paymentMonitorTotalTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.drawPaymentRecordTotalCompletedTable = function (data, size, summary, newSearch) {
            size = data.length;
            vm.paymentMonitorTotalQuery.totalCompletedCount = data.length;
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorTotalQuery.aaSorting || [[14, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
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
                        title: $translate('DEVICE'), data: "data.userAgent",
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Online Topup Type'), "data": 'data.topupType',
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.merchantTopupTypeJson[data] : "");
                            return "<div>" + text + "</div>";
                        },
                        sClass: 'merchantCount'
                    },
                    {title: $translate('3rd Party Platform'), data: "merchantName", sClass: 'merchantCount'},
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
                    {title: $translate('TopUp Amount'), data: "amount$", sClass: "sumFloat alignRight playerCount"},

                    {title: $translate('START_TIME'), data: "startTime$"},
                    {
                        title: $translate('Admin_Locked'),
                        data: "lockedButtonDisplay",
                        render: function (data, type, row) {
                            if(row.data.lockedAdminId && row.data.followUpContent && row.data.followUpCompletedTime){
                                let completedDate = utilService.$getTimeFromStdTimeFormat(new Date(row.data.followUpCompletedTime));
                                return row.data.lockedAdminName + " " + $translate("follow up completed") + "<br> (" + completedDate + ")";
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
                            if(row.data.lockedAdminId && row.data.followUpContent){
                                return row.data.followUpContent;
                            }else{
                                return '-';
                            }
                        }
                    },
                ],
                "autoWidth": true,
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

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#paymentMonitorTotalCompletedTable', tableOptions, {}, true);

            $('#paymentMonitorTotalCompletedTable').resize();

            $('#paymentMonitorTotalCompletedTable tbody').on('click', 'tr', vm.tableRowClicked);
        };


        vm.drawWechatGroupRecordTable = function (data, size, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.wechatGroupControlQuery.aaSorting || [[6, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'This Connection is Abnormally Clicked', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'Connection Time', bSortable: true, 'aTargets': [5]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('PRODUCT'),
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('Create Device Name'),
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Last Login Account (Offline) / Current Login Account (Online)'),
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Current System Status'),
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('This Connection is Abnormally Clicked'),
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            // var link =$('<div>',{});
                            // link.append($('<a>', {
                            //     'class': 'fa fa-envelope margin-right-5',
                            //     'ng-click': 'vm.initMessageModal(); vm.sendMessageToPlayerBtn(' + '"msg", ' + JSON.stringify(row) + ');',
                            //     'data-row': JSON.stringify(row),
                            //     'data-toggle': 'tooltip',
                            //     'title': $translate("SEND_MESSAGE_TO_PLAYER"),
                            //     'data-placement': 'left',   // because top and bottom got hidden behind the table edges
                            // }));
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Connection Time'),
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Equipment History'),
                        render: function (data, type, row) {
                            var text = $translate(data ? $scope.userAgentType[data] : "");
                            return "<div>" + text + "</div>";
                        }
                    },

                ],
                "autoWidth": true,
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

            vm.topUpProposalTable = utilService.createDatatableWithFooter('#wechatGroupMonitorTable', tableOptions, {}, true);

            vm.wechatGroupControlQuery.pageObj.init({maxCount: size}, newSearch);

            $('#wechatGroupMonitorTable').off('order.dt');
            $('#wechatGroupMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'wechatGroupControlQuery', vm.getWechatMonitorRecord);
            });
            $('#wechatGroupMonitorTable').resize();

            $('#wechatGroupMonitorTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.lockProposal = function (proposalId, linkId, contentId){
            let sendObj = {
                proposalId: proposalId,
                adminId: authService.adminId,
                adminName: authService.adminName
            }
            socketService.$socket($scope.AppSocket, 'lockProposalByAdmin', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    //re-structure Admin_Locked
                    $('#' + linkId).empty();
                    $('#' + linkId).append('<a>' + authService.adminName + " - " + $translate("UNLOCK")  + '</a>');
                    $('#' + linkId + ' a').click(function () {vm.unlockProposal(proposalId, linkId, contentId);});

                    //re-structure Followup_Content
                    $('#' + contentId).empty();
                    $('#' + contentId).append('<a ng-if="!vm.showEditFollowUpContent">' + $translate("EDIT")  + '</a>');
                    $('#' + contentId).append('<div ng-if="vm.showEditFollowUpContent"><input ng-model="vm.paymentMonitorTotalQuery.followUpContent[' + proposalId + ']"></div>');
                    $('#' + contentId + ' div').hide();
                    $('#' + contentId + ' a').click(function () { $('#' + contentId + ' a').hide(); $('#' + contentId + ' div').show();});
                    $('#' + contentId + ' input').keypress(function (e) {
                        if(e.keyCode == 13){
                            vm.editFollowUpContent(proposalId)
                        }

                    });
                    $compile('#' + contentId + ' input')($scope)
                })
            });
        };

        vm.unlockProposal = function (proposalId, linkId, contentId){
            let sendObj = {
                proposalId: proposalId,
                adminId: authService.adminId,
            };

            socketService.$socket($scope.AppSocket, 'unlockProposalByAdmin', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    let proposalObj = vm.paymentMonitorTotalData.filter(p => p.proposalId == proposalId);
                    let textToDisplay = proposalObj && proposalObj[0].lockedButtonDisplay ? proposalObj[0].lockedButtonDisplay : "";

                    $('#' + linkId).empty();
                    $('#' + linkId).append('<a>' + textToDisplay  + '</a>');
                    $('#' + linkId + ' a').click(function () {vm.lockProposal(proposalId, linkId, contentId);});
                    $('#' + contentId).empty();
                    $('#' + contentId).append('-');
                })
            });
        };

        vm.editFollowUpContent = function(proposalId){
            if(!vm.paymentMonitorTotalQuery.followUpContent || !vm.paymentMonitorTotalQuery.followUpContent[proposalId]){
                vm.showEditFollowUpContent = false;

                $('#content' + proposalId + ' a').show();
                $('#content' + proposalId + ' input').hide();
                return;
            }
            let sendObj = {
                proposalId: proposalId,
                followUpContent: vm.paymentMonitorTotalQuery.followUpContent[proposalId] ? vm.paymentMonitorTotalQuery.followUpContent[proposalId] : ""
            };

            socketService.$socket($scope.AppSocket, 'updateFollowUpContent', sendObj, function (data) {
                vm.showEditFollowUpContent = false;
                vm.getPaymentMonitorTotalRecord(true);
            });
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
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['provinceId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountProvince']) {
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountProvince']}, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountProvince'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['cityId']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['cityId']}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['cityId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountCity']) {
                socketService.$socket($scope.AppSocket, "getCity", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountCity']}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountCity'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['districtId']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['districtId']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['districtId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountDistrict']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {provinceId: vm.selectedProposalDetailForDisplay['bankAccountDistrict']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
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


        function getMerchantList() {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getMerchantNBankCard', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data.data && data.data.merchants) {
                        let line2Acc = commonService.getAlipayLine2Acc($translate);
                        data.data.merchants.push(line2Acc);
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
                socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
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
            return vm.platformByAdminId.find(p => p._id == platformObjId).name || "";
        }


        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });

        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};
            setTimeout(function () {
                // vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
                socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                    if (data && data.data && data.data.data) {
                        console.log('banktype', data.data.data);
                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId) {
                                vm.allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                            }
                        })
                    }
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
