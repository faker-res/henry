'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', '$translate', 'CONFIG', "$cookies","commonService"];

    var operationController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, $translate, CONFIG, $cookies, commonService) {
        var $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let $fixTwoDecimalStr = (value) => {
            if (typeof value != 'number') {
                return value;
            }
            return $filter('noRoundTwoDecimalPlaces')(value).toFixed(2);
        };
        var vm = this;

        // For debugging:
        window.VM = vm;

        // declare constants
        vm.proposalEntryTypeList = {
            0: "ENTRY_TYPE_CLIENT",
            //proposal entry type is admin
            1: "ENTRY_TYPE_ADMIN",
            //proposal is created by system
            2: "ENTRY_TYPE_SYSTEM"
        };
        vm.proposalPriorityList = {
            0: "GENERAL",
            1: "HIGH",
            2: "HIGHER",
            3: "HIGHEST"
        };
        vm.proposalUserTypeList = {
            0: "PLAYERS",
            1: "PARTNERS",
            2: "SYSTEM_USERS",
            3: "TEST_PLAYERS"
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
            AUTOAUDIT: "AutoAudit",
            RECOVER: "Recover",
            MANUAL: "Manual",
            CSPENDING: "CsPending",
            NOVERIFY: "NoVerify"
        };

        vm.depositMethodList = $scope.depositMethodList;

        vm.getDepositMethodbyId = {
            1: 'Online',
            2: 'ATM',
            3: 'Counter',
            4: 'AliPayTransfer',
            5: 'weChatPayTransfer',
            6: 'CloudFlashPay'
        };
        vm.inputDevice = {
            BACKSTAGE: 0,
            WEB_PLAYER: 1,
            WEB_AGENT: 2,
            H5_PLAYER: 3,
            H5_AGENT: 4,
            APP_PLAYER: 5,
            APP_AGENT: 6
        };

        vm.newProposalNum = 0;
        var allProposalStatusClr = {
            Pending: 'colorYellow',
            Approved: 'colorLimegreen',
            Success: 'colorGreen',
            Fail: 'colorRed',
            Rejected: 'colorRed'
        };
        vm.toggleShowOperationList = function (flag) {
            if (flag) {
                vm.leftPanelClass = 'widthto25';
                vm.rightPanelClass = 'widthto75';
                vm.showOperationList = true;
            } else {
                vm.leftPanelClass = 'widthto5 subAll0';
                vm.rightPanelClass = 'widthto95';
                vm.showOperationList = false;
            }
            $cookies.put("operationShowLeft", vm.showOperationList);
        };

        ///////////////////////////////////Proposal related functions///////////////////////////////////
        vm.autoRefresh = true;

        //get all operation data from server
        vm.selectPlatform = function (id) {
            vm.newProposalNum = 0;
            vm.operSelPlatform = false;
            vm.allPlatformId = [];

            $.each(vm.platformList, function (i, v) {
                if (v._id == id) {
                    vm.selectedPlatform = v;
                    vm.playerCountLimit = 20;
                    $cookies.put("platform", vm.selectedPlatform.name);
                    vm.allPlatformId.push(v._id);
                    //return;
                } else if (id == "_allPlatform") {
                    vm.selectedPlatform = '_allPlatform';
                    $cookies.put("platform", id);
                    vm.allPlatformId.push(v._id);
                }
            });
            vm.playerCountLimit = 20;
            console.log('vm.selectedPlatform', vm.allPlatformId);
            vm.getLoggedInPlayerCount();
            vm.getLoggedInPlayer();
            // vm.loadProposalData();
            // vm.getTopupIntentionData();
            vm.getRewardList(vm.setUpRewardMultiSelect);
            vm.getPromotionTypeList(vm.setUpPromoCodeMultiSelect);
            vm.allTopUpIntentionString = null;
            vm.allNewAccountString = null;
            vm.allProposalString = null;
            // vm.getPlayerTopUpIntentRecordStatusList();
            // vm.getNewAccountProposal().done();
            vm.getProposalTypeByPlatformId(vm.allPlatformId).then(() => {
                vm.renderMultipleSelectDropDownList('select#selectProposalType');
                vm.renderMultipleSelectDropDownList('select#selectProposalAuditType');
            });
            vm.getPlatformProviderGroup();
            vm.getAllGameTypes();
        };

        vm.renderMultipleSelectDropDownList = function(elem) {
            let dropDownElement = $(elem);
            dropDownElement.multipleSelect({
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: true,
                countSelected: $translate('# of % selected'),
                onClick: function () {
                    vm.proposalTypeUpdated();
                },
                onCheckAll: function () {
                    vm.proposalTypeUpdated();
                },
                onUncheckAll: function () {
                    vm.proposalTypeUpdated();
                }
            });
            var $multi = (dropDownElement.next().find('.ms-choice'))[0];
            dropDownElement.next().on('click', 'li input[type=checkbox]', function () {
                var upText = $($multi).text().split(',').map(item => {
                    return $translate(item);
                }).join(',');
                $($multi).find('span').text(upText)
            });
            dropDownElement.multipleSelect("refresh");
            dropDownElement.multipleSelect("checkAll");
            vm.proposalTypeClicked("total");
        };

        vm.setUpRewardMultiSelect = () => {
            let selectRewardType = $('select#selectRewardType');
            selectRewardType.multipleSelect({
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: true,
                countSelected: $translate('# of % selected'),
            });
            var $multi = (selectRewardType.next().find('.ms-choice'))[0];
            selectRewardType.next().on('click', 'li input[type=checkbox]', function () {
                var upText = $($multi).text().split(',').map(item => {
                    return $translate(item);
                }).join(',');
                $($multi).find('span').text(upText)
            });
            selectRewardType.multipleSelect("refresh");
            selectRewardType.multipleSelect("checkAll");
        };

        vm.setUpPromoCodeMultiSelect = () => {
            let selectPromoType = $('select#selectPromoType');
            selectPromoType.multipleSelect({
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                displayValues: true,
                countSelected: $translate('# of % selected'),
            });
            var $multi = (selectPromoType.next().find('.ms-choice'))[0];
            selectPromoType.next().on('click', 'li input[type=checkbox]', function () {
                var upText = $($multi).text().split(',').map(item => {
                    return $translate(item);
                }).join(',');
                $($multi).find('span').text(upText)
            });
            selectPromoType.multipleSelect("refresh");
            selectPromoType.multipleSelect("checkAll");
        };

        vm.resetFilter = function () {
            vm.queryProposalId = "";
            $('#autoRefreshProposalFlag')[0].checked = true;

            vm.queryProposalIdUpdate();

            vm.queryProposalEntryType = "";
            vm.queryProposalMinCredit = "";
            vm.queryProposalMaxCredit = "";
            vm.queryProposalRelatedUser = "";

            let platformId = vm.selectedPlatform === "_allPlatform" ? "_allPlatform" : vm.selectedPlatform._id;
            vm.selectPlatform(platformId);

            vm.initQueryPara();
            vm.dateRange = "";

            $scope.safeApply();
        };

        vm.proposalTypeClicked = function (i, v) {

            vm.merchantNoNameObj = {};
            vm.merchantGroupObj = [];
            let merGroupName = {};
            let merGroupList = {};

            socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                $scope.$evalAsync(() => {
                    data.data.merchantTypes.forEach(mer => {
                        merGroupName[mer.merchantTypeId] = mer.name;
                    })
                    vm.merchantTypes = data.data.merchantTypes;
                    vm.merchantGroupObj = createMerGroupList(merGroupName, merGroupList);
                })
            }, function (data) {
                console.log("merchantList", data);
            });

            socketService.$socket($scope.AppSocket, 'getMerchantNBankCard', {platformId: vm.selectedPlatform.platformId}, function (data) {
                $scope.$evalAsync(() => {
                    if (data.data && data.data.merchants) {
                        vm.merchantLists = data.data.merchants;
                        vm.merchantNoList = data.data.merchants.filter(mer => {
                            vm.merchantNoNameObj[mer.merchantNo] = mer.name;
                            return mer.status != 'DISABLED';
                        });
                        vm.merchantNoList.forEach(item => {
                            merGroupList[item.merchantTypeId] = merGroupList[item.merchantTypeId] || {list: []};
                            merGroupList[item.merchantTypeId].list.push(item.merchantNo);
                        }) || [];

                        Object.keys(vm.merchantNoList).forEach(item => {
                            let merchantTypeId = vm.merchantNoList[item].merchantTypeId;
                            if (merchantTypeId == "9999") {
                                vm.merchantNoList[item].merchantTypeName = $translate('BankCardNo');
                            } else if (merchantTypeId == "9998") {
                                vm.merchantNoList[item].merchantTypeName = $translate('PERSONAL_WECHAT_GROUP');
                            } else if (merchantTypeId == "9997") {
                                vm.merchantNoList[item].merchantTypeName = $translate('PERSONAL_ALIPAY_GROUP');
                            } else if (merchantTypeId != "9997" && merchantTypeId != "9998" && merchantTypeId != "9999") {
                                let merchantInfo = vm.merchantTypes.filter(mitem => {
                                    return mitem.merchantTypeId == merchantTypeId;
                                })
                                vm.merchantNoList[item].merchantTypeName = merchantInfo[0] ? merchantInfo[0].name : "";
                            } else {
                                vm.merchantNoList[item].merchantTypeName = '';
                            }
                        });
                        vm.merchantCloneList = angular.copy(vm.merchantNoList);
                        vm.merchantGroupObj = createMerGroupList(merGroupName, merGroupList);
                        vm.merchantGroupCloneList = vm.merchantGroupObj;
                    }
                });
            }, function (data) {
                console.log("merchantList", data);
            });

            //vm.highlightProposalListSelection[i];
            vm.highlightProposalListSelection = {};
            console.log(i, v);
            if (typeof(i) == 'string') {
                vm.highlightProposalListSelection[i] = 'highlightProposalType';
                vm.proposalCategorySelected = i;
            } else {
                vm.highlightProposalListSelection[v._id] = 'highlightProposalType';
            }

            vm.blinkAllProposal = false;
            if (i == 'total') {
                vm.rightPanelTitle = 'ALL_PROPOSAL';
                vm.loadProposalQueryData(true);
            } else if (i == 'approval') {
                vm.rightPanelTitle = 'APPROVAL_PROPOSAL';
                vm.showProposalIndicator = {};
                vm.multiProposalSelected = [];
                vm.loadProposalAuditQueryData(true);
            }
        }
        // vm.loadProposalByType = function () {
        //     if (vm.proposalCategorySelected == 'total') {
        //         vm.loadProposalQueryData();
        //     } else if (vm.proposalTypeSelected == 'approval') {
        //         // vm.loadApprovalProposalData();
        //         vm.loadProposalQueryData();
        //     }
        // }
        vm.selectProposal = function (which) {
            //console.log(which);
            //if(vm.selectProposal[which.name]){}
            vm.selectedRewardList = {};
            var hasElement = false;
            $.each(vm.selectProposal, function (i, v) {
                if (v) {
                    //console.log('string', i, v);
                    hasElement = true;
                    vm.selectedRewardList[i] = i;
                }
            })
            if (!hasElement) {
                vm.selectedRewardList = null;
            }
            vm.proposalTable.search($(this).val()).draw();
            $scope.safeApply();
        }
        vm.loadProposalData = function (callback) {
            $('.proposalMessage > a > .fa').addClass('fa-spin fa-2x');
            socketService.$socket($scope.AppSocket, 'getAvailableProposalsForAdminId', {
                adminId: authService.adminId,
                platformId: vm.selectedPlatformID
            }, function (data) {
                vm.proposals = data.data;
                // console.log("vm.proposals", vm.proposals);
                $(vm.spinning).removeClass('fa-spin fa-2x');
                $('.proposalMessage > a > .fa').removeClass('fa-spin fa-2x');
                console.log("Stop spinning!!!");
                $scope.safeApply(vm.drawProposalTable(vm.proposals));
                if (callback) {
                    callback();
                }
            });
        };
        vm.queryProposalIdUpdate = function () {
            if (vm.queryProposalId) {
                var te = $("#proposalDataTableDiv #search .inlineBlk").not(":nth-child(9)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
                te.find(".ms-choice").prop("disabled", true).css("background-color", "#eee")
            } else {
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control").prop("disabled", false).css("background-color", "#fff");
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control input").prop("disabled", false).css("background-color", "#fff");
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control .ms-choice").prop("disabled", false).css("background-color", "transparent")
            }
        };

        vm.queryProposalAuditIdUpdate = function () {
            let searchFilterColumns = $("#proposalAuditDataTableDiv #searchAudit .inlineBlk");
            if (vm.queryProposalAuditId) {
                var te = searchFilterColumns.not(":nth-child(1)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
                te.find(".ms-choice").prop("disabled", true).css("background-color", "#eee")
            } else {
                searchFilterColumns.find(".form-control").prop("disabled", false).css("background-color", "#fff");
                searchFilterColumns.find(".form-control input").prop("disabled", false).css("background-color", "#fff");
                searchFilterColumns.find(".form-control .ms-choice").prop("disabled", false).css("background-color", "transparent")
            }
        };

        vm.getOneProposal = function (callback) {
            $('#autoRefreshProposalFlag').attr('checked', false);
            socketService.$socket($scope.AppSocket, "getPlatformProposal", {
                platformId: vm.allPlatformId,
                proposalId: vm.queryProposalId
            }, function (data) {
                if (data && !data.data) {
                    console.log('tbd');
                }
                vm.proposals = [data.data];
                console.log("vm.proposals", vm.proposals);
                $(vm.spinning).removeClass('fa-spin');
                $scope.safeApply();

                vm.drawProposalTable(vm.proposals, vm.proposals.length, {}, true);
                if (callback) {
                    callback();
                }
            });
        };

        vm.getOneProposalAudit = function (callback) {
            $('#autoRefreshProposalAuditFlag').attr('checked', false);
            socketService.$socket($scope.AppSocket, "getPlatformProposal", {
                platformId: vm.allPlatformId,
                proposalId: vm.queryProposalAuditId
            }, function (data) {
                if (data && !data.data) {
                    console.log('tbd');
                }
                vm.proposals = [data.data];
                console.log("vm.proposals", vm.proposals);
                $(vm.spinning).removeClass('fa-spin');
                $scope.safeApply();

                vm.drawProposalAuditTable(vm.proposals, vm.proposals.length, {}, true);
                if (callback) {
                    callback();
                }
            });
        };

        vm.proposalSetDateRange = (option) => {
            vm.setDateRange(option, "#datetimepicker", "#datetimepicker2");
        };

        vm.proposalAuditSetDateRange = (option) => {
            vm.setDateRange(option, "#datetimepickerAudit", "#datetimepickerAudit2");
        };

        vm.setDateRange = function (option, dateTimePickerStartSelector, dateTimePickerEndSelector) {
            var startDate;
            switch (option) {
                case 'day':
                    startDate = utilService.getTodayStartTime();
                    break;
                case 'week':
                    startDate = new Date(utilService.setNDaysAgo(utilService.getTodayStartTime(), utilService.getTodayStartTime().getDay()));
                    break;
                case 'month':
                    startDate = new Date(new Date(utilService.getTodayStartTime()).setDate(1));
                    break;
                default:
                    startDate = "";
            }
            if (startDate) {
                $(dateTimePickerStartSelector).data('datetimepicker').setLocalDate(startDate);
                $(dateTimePickerEndSelector).data('datetimepicker').setLocalDate(utilService.getTodayEndTime());
                // vm.loadProposalQueryData(true);
            }
        };

        vm.searchProposalByQuery = function (newSearch) {
            newSearch ? vm.autoRefresh = false : null;
            if (vm.rightPanelTitle === 'ALL_PROPOSAL') vm.loadProposalQueryData(newSearch);
            if (vm.rightPanelTitle === 'APPROVAL_PROPOSAL') vm.loadProposalAuditQueryData(newSearch);

        };

        vm.loadProposalQueryData = function (newSearch) {
            var selectedStatus = [];
            vm.proposalTypeUpdated();
            if (vm.proposalStatusSelected) {
                vm.proposalStatusSelected.forEach(
                    status => {
                        selectedStatus.push(status);
                        if (status == "Success") {
                            selectedStatus.push("Approved");
                        }
                        if (status == "Fail") {
                            selectedStatus.push("Rejected");
                        }
                    }
                );
            }
            let rewardNames = $('select#selectRewardType').multipleSelect("getSelects");
            //For limitedOffer intention
            $.each(rewardNames, function(idx,val){
                rewardNames[idx] = rewardNames[idx].replace(" "+$translate('Intention')," Intention");
            });

            let rewardEventName = [];

            if (vm.rewardList.length != rewardNames.length) {
                vm.rewardList.filter(item => {
                    if (rewardNames.indexOf(item.name) > -1) {
                        rewardEventName.push(item.name);
                    }
                });
            }

            let totalProposalType = 0;
            if (vm.rightPanelTitle == 'ALL_PROPOSAL') {
                totalProposalType = $('select#selectProposalType option').length;
            }
            else if (vm.rightPanelTitle == 'APPROVAL_PROPOSAL') {
                totalProposalType = $('select#selectProposalAuditType option').length;
            }

            let proposalTypeNames = [];

            if (totalProposalType != vm.proposalTypeSelected.length) {
                vm.allProposalType.filter(item => {
                    if (vm.proposalTypeSelected.indexOf(item.name) > -1 && proposalTypeNames.indexOf(item.name) < 0) {
                        proposalTypeNames.push(item.name);
                    }
                });
            }

            let startTime = $('#datetimepicker').data('datetimepicker').getLocalDate();
            let endTime = $('#datetimepicker2').data('datetimepicker').getLocalDate();

            let searchInterval = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime());
            if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
                socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
                return;
            }

            let sendData = {
                adminId: authService.adminId,
                platformId: vm.allPlatformId,
                inputDevice: vm.proposalInputDevice,
                //eventName: rewardNames,
                eventName: rewardEventName,
                promoTypeName: [],
                //type: vm.proposalTypeSelected,
                type: proposalTypeNames,
                startDate: startTime,
                endDate: endTime,
                entryType: vm.queryProposalEntryType,
                size: vm.queryProposal.limit || 10,
                index: newSearch ? 0 : (vm.queryProposal.index || 0),
                sortCol: vm.queryProposal.sortCol
            };

            let promoType = $('select#selectPromoType').multipleSelect("getSelects");

            if (vm.promoTypeList.length != promoType.length) {
                vm.promoTypeList.filter(item => {
                    if (promoType.indexOf(item.name) > -1) {
                        sendData.promoTypeName.push(item.name);
                    }
                });
            }

            if (vm.queryProposalRelatedUser) {
                sendData.relateUser = vm.queryProposalRelatedUser.toLowerCase();
            }

            if (selectedStatus) {
                sendData.status = selectedStatus
            }
            if (vm.queryProposalMinCredit || vm.queryProposalMaxCredit) {
                sendData.credit = {
                    $gte: vm.queryProposalMinCredit || 0,
                    $lt: vm.queryProposalMaxCredit || 1000000000
                }
            }
            $('.proposalMessage > a > .fa').addClass('fa-spin');
            $('.proposalMessage').next().hide();

            console.log('send proposal query', sendData);

            socketService.$socket($scope.AppSocket, 'getQueryProposalsForAdminId', sendData, function (data) {
                console.log('proposal allData', data);
                vm.proposals = data.data.data;
                $('.proposalMessage > a > .fa').removeClass('fa-spin');
                $('.proposalMessage').next().show();

                vm.queryProposal.totalCount = data.data.size;
                vm.drawProposalTable(vm.proposals, data.data.size, data.data.summary, newSearch);
            });
        }

        vm.loadProposalAuditQueryData = function (newSearch, callback) {
            var selectedStatus = [];
            vm.proposalTypeUpdated();
            let totalProposalType = 0;
            let proposalTypeNames = [];
            // if (vm.proposalStatusSelected) {
            //     vm.proposalStatusSelected.forEach(
            //         status => {
            //             selectedStatus.push(status);
            //             if (status == "Success") {
            //                 selectedStatus.push("Approved");
            //             }
            //             if (status == "Fail") {
            //                 selectedStatus.push("Rejected");
            //             }
            //         }
            //     );
            // }
            var startTime = $('#datetimepickerAudit').data('datetimepicker');
            var endTime = $('#datetimepickerAudit2').data('datetimepicker');
            var newEndTime = endTime.getLocalDate();

            let searchInterval = Math.abs(new Date(endTime.getLocalDate()).getTime() - new Date(startTime.getLocalDate()).getTime());
            if (searchInterval > $scope.PROPOSAL_SEARCH_MAX_TIME_FRAME) {
                socketService.showErrorMessage($translate("Exceed proposal search max time frame"));
                return;
            }

            totalProposalType = $('select#selectProposalAuditType option').length;

            if (totalProposalType != vm.proposalAuditTypeSelected.length) {
                vm.allProposalType.filter(item => {
                    if (vm.proposalAuditTypeSelected.indexOf(item.name) > -1 && proposalTypeNames.indexOf(item.name) < 0) {
                        proposalTypeNames.push(item.name);
                    }
                });
            }

            let sendData = {
                adminId: authService.adminId,
                platformId: vm.allPlatformId,
                type: proposalTypeNames,
                startDate: startTime.getLocalDate(),
                endDate: newEndTime,
                entryType: vm.queryProposalEntryType,
                size: vm.queryAuditProposal.limit || 10,
                index: newSearch ? 0 : (vm.queryAuditProposal.index || 0),
                sortCol: vm.queryAuditProposal.sortCol || {expirationTime: 1}
            };

            if (vm.queryProposalRelatedUser) {
                sendData.relateUser = vm.queryProposalRelatedUser.toLowerCase();
            }

            if (selectedStatus) {
                sendData.status = selectedStatus
            }
            if (vm.queryProposalMinCredit || vm.queryProposalMaxCredit) {
                sendData.credit = {
                    $gte: vm.queryProposalMinCredit || 0,
                    $lt: vm.queryProposalMaxCredit || 1000000000
                }
            }
            $('.proposalMessage > a > .fa').addClass('fa-spin');
            $('.proposalMessage').next().hide();
            console.log('send proposal query', sendData);
            var queryString =  'getQueryApprovalProposalsForAdminId' ;
            socketService.$socket($scope.AppSocket, queryString, sendData, function (data) {
                console.log('proposal allData', data);
                vm.proposals = data.data.data;
                $('.proposalMessage > a > .fa').removeClass('fa-spin');
                $('.proposalMessage').next().show();
                // vm.proposalTable.destroy();
                vm.queryProposal.totalCount = data.data.size;
                vm.drawProposalAuditTable(vm.proposals, data.data.size, data.data.summary, newSearch); //, "#proposalAuditDataTable"
                // vm.proposalTable.draw();
                // if (callback) {
                //     callback();
                // }
            });
        }

        vm.initQueryPara = function () {
            utilService.actionAfterLoaded($('#datetimepicker2'), function () {
                vm.initMultiProposalStatusDropdown('select#selectProposalStatus');

                let defaultStartTime = new Date();
                // let default start time to be 3 hours ago
                defaultStartTime.setHours(defaultStartTime.getHours() - 3);

                vm.queryProposalstartTime = vm.setDateTimePicker("#datetimepicker", defaultStartTime);
                vm.queryProposalendTime = vm.setDateTimePicker("#datetimepicker2", utilService.getTodayEndTime());
                vm.queryProposalAuditstartTime = vm.setDateTimePicker("#datetimepickerAudit", defaultStartTime);
                vm.queryProposalAuditendTime = vm.setDateTimePicker("#datetimepickerAudit2", utilService.getTodayEndTime());
            })
        };

        vm.initMultiProposalStatusDropdown = function (elem) {
            let dropDownElem = $(elem);
            dropDownElem.multipleSelect({
                allSelected: $translate("All Selected"),
                selectAllText: $translate("Select All"),
                countSelected: $translate('# of % selected'),
                onClick: function () {
                    vm.proposalStatusUpdated();
                },
                onCheckAll: function () {
                    vm.proposalStatusUpdated();
                },
                onUncheckAll: function () {
                    vm.proposalStatusUpdated();
                }
            });
            dropDownElem.multipleSelect("checkAll");
        };


        vm.setDateTimePicker = function (elem, dateTime) {
            let dateTimePickerElem = $(elem);

            dateTimePickerElem.datetimepicker({
                language: 'en',
                format: 'yyyy/MM/dd hh:mm:ss',
            });

            return dateTimePickerElem.data('datetimepicker').setLocalDate(dateTime);
        };
        // vm.allProposalClicked = function (callback) {
        //     vm.blinkAllProposal = false;
        //     vm.rightPanelTitle = 'ALL_PROPOSAL';
        //
        //     // $('#proposalDataTable').resize();
        //     // $('#proposalDataTable').resize();
        //     vm.loadProposalQueryData();
        //     // vm.loadProposalData();
        //     if (callback) {
        //         callback();
        //     }
        // }

        vm.proposalTypeUpdated = function () {
            if (vm.rightPanelTitle == 'ALL_PROPOSAL') {
                vm.proposalTypeSelected = $('select#selectProposalType').multipleSelect("getSelects");
            }
            else if (vm.rightPanelTitle == 'APPROVAL_PROPOSAL') {
                vm.proposalAuditTypeSelected = $('select#selectProposalAuditType').multipleSelect("getSelects");
            }

        };

        vm.proposalAuditTypeUpdated = function () {
            vm.proposalAuditTypeSelected = $('select#selectProposalAuditType').multipleSelect("getSelects");
        };

        vm.proposalStatusUpdated = function () {
            vm.proposalStatusSelected = $('select#selectProposalStatus').multipleSelect("getSelects");
            vm.proposalStatusSelectedTrans = vm.proposalStatusSelected.map(a => {
                return $translate(a);
            });
            if (vm.proposalTable) {
                vm.proposalTable.draw();
            }
        };

        vm.telToPlayer = function (data) {
            $scope.$evalAsync(() => {
                let player = {};
                let phoneCall = {};

                if (data && data.data && data.data.playerObjId && typeof data.data.playerObjId == 'object') {
                    player = data.data.playerObjId;
                    phoneCall = {
                        playerId: player.playerId,
                        name: player.name,
                        toText: data.data.playerName ? data.data.playerName : player.name,
                        platform: "jinshihao",
                        loadingNumber: true,
                    }
                } else if (data.data && data.data.playerObjId && typeof data.data.playerObjId == 'string') {
                    phoneCall = {
                        playerId: data.data.playerId,
                        name: data.data.playerName,
                        toText: data.data.playerName,
                        platform: "jinshihao",
                        loadingNumber: true,
                    }
                }

                $scope.initPhoneCall(phoneCall);
                $scope.phoneCall.phone = data.data.updateData.phoneNumber;
                $scope.phoneCall.loadingNumber = false;
                $scope.makePhoneCall(vm.selectedPlatform.platformId);
            });
        };

        // vm.topupClicked = function () {
        //     vm.blinkTopUp = false;
        //     if (!authService.checkViewPermission('Operation', 'Proposal', 'TopupIntentionDetail')) {
        //         return;
        //     }
        //     vm.rightPanelTitle = $translate('TOPUP_PROPOSAL');
        //
        //     vm.getTopupIntentionData();
        //     vm.drawTopupMonitorTable(vm.allTopupAccount);
        //     $('#proposalDataTable').resize();
        //     $('#proposalDataTable').resize();
        //
        // };
        vm.showProposalDetailField = function (obj, fieldName, val) {
            if (!obj) return '';
            var result = val ? val.toString() : (val === 0) ? "0" : "";
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
            } else if (obj.status === "Expired" && (fieldName === "validTime" || fieldName === "EXPIRY_DATE")) {
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
                            obj.validTime = newData.newValidTime;
                            obj.status = "Pending";
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
                // } else if (fieldName == 'provinceId' || fieldName == 'bankAccountProvince') {
                //     var $id = $('<text>').text(val);
                //     var $name = $('<text>', {
                //         class: 'margin-left-5 proposalProvinceId',
                //     });
                //     socketService.$socket($scope.AppSocket, "getProvince", {provinceId: val}, function (data) {
                //         var text = data.data.province ? data.data.province.name : val;
                //         $("#ProposalDetail .proposalProvinceId").text(text);
                //     });
                //     result = $id.prop('outerHTML') + $name.prop('outerHTML');
                // } else if (fieldName == 'cityId' || fieldName == 'bankAccountCity') {
                //     var $id = $('<text>').text(val);
                //     var $name = $('<text>', {
                //         class: 'margin-left-5 proposalCityId',
                //     });
                //     socketService.$socket($scope.AppSocket, "getCity", {cityId: val}, function (data) {
                //         var text = data.data.city ? data.data.city.name : val;
                //         $("#ProposalDetail .proposalCityId").text(text);
                //     });
                //     result = $id.prop('outerHTML') + $name.prop('outerHTML');
                // } else if (fieldName == 'districtId' || fieldName == 'bankAccountDistrict') {
                //     var $id = $('<text>').text(val);
                //     var $name = $('<text>', {
                //         class: 'margin-left-5 proposalDistrictId',
                //     });
                //     socketService.$socket($scope.AppSocket, "getDistrict", {districtId: val}, function (data) {
                //         console.log('data', data);
                //         var text = data.data.district ? data.data.district.name : val;
                //         $("#ProposalDetail .proposalDistrictId").text(text);
                //     });
                //     result = $id.prop('outerHTML') + $name.prop('outerHTML');
            } else if (fieldName === 'playerStatus') {
                result = $translate($scope.constPlayerStatus[val]);
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
                            newReturnDetail[splitGameTypeIdArr[0]+':'+vm.allGameTypes[gameTypeId]] = val[key];
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
            } else if (fieldName === 'userAgent') {
                result = $translate($scope.userAgentType[val]) || '';
            } else if (fieldName === 'defineLoseValue') {
                result = $translate($scope.loseValueType[val]);
            } else if (fieldName === 'rewardPercent') {
                result = val + "%";
            }
            return $sce.trustAsHtml(result);
        };
        // vm.getTopupIntentionData = function (callback) {
        //     socketService.$socket($scope.AppSocket, 'getPlayerTopUpIntentRecordByPlatform', {platformId: vm.selectedPlatform._id}, function (data) {
        //         vm.allTopupAccount = data.data;
        //         // console.log("vm.allTopupAccount", vm.allTopupAccount);
        //         $(vm.spinning).removeClass('fa-spin');
        //         $scope.safeApply();
        //         if (callback) {
        //             callback();
        //         }
        //     });
        // }
        // vm.newAccountClicked = function () {
        //     vm.blinkNewAccount = false;
        //     if (!authService.checkViewPermission('Operation', 'Proposal', 'NewAccountListDetail')) {
        //         return;
        //     }
        //     vm.rightPanelTitle = $translate('NEW_ACCOUNT_PROPOSAL');
        //     // if (!vm.registrationIntentStatus) {
        //     //     vm.getPlayerTopUpIntentRecordStatusList()
        //     //         .then(vm.getNewAccountProposal)
        //     //         .then(vm.drawRegistrationMonitorTable);
        //     // } else {
        //     vm.getNewAccountProposal()
        //         .then(function (data) {
        //             vm.drawRegistrationMonitorTable(data);
        //         });
        //
        // }
        // vm.getPlayerTopUpIntentRecordStatusList = function () {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getPlayerTopUpIntentRecordStatusList', '', function (data) {
        //         vm.registrationIntentStatus = {};
        //         $.each(data.data, function (i, v) {
        //             console.log('i,v', i, v);
        //             vm.registrationIntentStatus[v] = i;
        //         });
        //         console.log("vm.registrationIntentStatus", vm.registrationIntentStatus);
        //
        //         deferred.resolve(vm.registrationIntentStatus);
        //         $(vm.spinning).removeClass('fa-spin');
        //     }, deferred.reject);
        //
        //     return deferred.promise;
        // };
        // vm.getNewAccountProposal = function (callback) {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getPlayerRegistrationIntentRecordByPlatform', {platformId: vm.selectedPlatform._id}, function (data) {
        //         vm.allNewAccount = data.data;
        //         // console.log("vm.allNewAccount", vm.allNewAccount);
        //         $(vm.spinning).removeClass('fa-spin');
        //         $scope.safeApply();
        //
        //         deferred.resolve(vm.allNewAccount);
        //     }, deferred.reject);
        //
        //     return deferred.promise;
        // }
        vm.delayTopupExpirDate = function (src, callback) {
            var nowDate = new Date();
            var oldDate = new Date(src.data.validTime);

            var sendData = {
                playerId: src.data.playerId,
                proposalId: src.proposalId,
                delayTime: parseInt((nowDate.getTime() + 1 * 3600000 - oldDate.getTime()) / 60000)
            }
            socketService.$socket($scope.AppSocket, 'delayManualTopupRequest', sendData, function (data) {
                console.log("update data", data);
                vm.selectedProposal.status = 'Pending';
                vm.selectedProposal.data.validTime = data.data.newValidTime;
                vm.selectedProposalDetailForDisplay.validTime = data.data.newValidTime;
                $scope.safeApply();
                if (callback) {
                    callback(data.data);
                }
            });
        };

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

        vm.getRewardList = function (callback) {
            vm.rewardList = [];
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: {$in: vm.allPlatformId}}, function (data) {
                vm.rewardList = data.data;
                //For limitedOffer intention

                vm.rewardList.forEach(
                    reward => {
                        if (reward.type && reward.type.name == "PlayerLimitedOfferReward") {
                            let isNameExist = false;
                            vm.rewardList.forEach(
                                reward2 => {
                                    if(reward2.name == reward.name +" " + $translate('Intention'))
                                        isNameExist = true;
                                }
                            );
                            if(!isNameExist)
                                vm.rewardList.push({name:reward.name +" " + $translate('Intention')});
                        }
                    }
                );

                if (callback) {
                    callback();
                }
            });
        };

        vm.getPromotionTypeList = function (callback) {
            socketService.$socket($scope.AppSocket, 'getPromoCodeTypes', {platformObjId: {$in: vm.allPlatformId}, deleteFlag: false}, function (data) {
                vm.promoTypeList = data.data;
                if (callback) {
                    callback();
                }
            });
        };

        vm.getPlatformProviderGroup = () => {
            let query = (vm.selectedPlatform && vm.selectedPlatform._id)
                ? {platformObjId: vm.selectedPlatform._id}
                : {platformObjId: {$in: vm.allPlatformId}};

            $scope.$socketPromise('getPlatformProviderGroup', query).then(function (data) {
                vm.gameProviderGroup = data.data;
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

        // vm.startSpin = function (event, callback) {
        //     var item = $(event.target).addClass('fa-spin');
        //     vm.spinning = item;
        //     $scope.safeApply();
        //     if (callback) {
        //         callback();
        //     }
        // }

        //draw player table based on data
        vm.drawProposalTable = function (data, size, summary, newSearch) {
            console.log("whole data", data);
            vm.newProposalNum = 0;
            vm.blinkAllProposal = false;

            var tableData = [];
            $.each(data, function (i, v) {
                if (v) {
                    if (v.mainType == 'Reward') {
                        v.type.name = v.data && v.data.eventName ? v.data.eventName : v.type.name;
                    }
                    if (v.mainType == 'Others')
                        v.data.eventName = v.data && v.data.eventName ? v.data.eventName.replace('Intention',$translate('Intention')) : v.data.eventName;

                    v.mainType$ = $translate(v.mainType);
                    if (v.mainType === "PlayerBonus")
                        v.mainType$ = $translate("Bonus");
                    v.priority$ = $translate(v.data.proposalPlayerLevel ? v.data.proposalPlayerLevel : "Normal");
                    v.playerStatus$ = v.data.playerStatus;
                    v.entryType$ = $translate(vm.proposalEntryTypeList[v.entryType]);
                    v.userType$ = $translate(v.userType ? vm.proposalUserTypeList[v.userType] : "");
                    v.createTime$ = utilService.getFormatTime(v.createTime).substring(5);
                    v.expirationTime$ = v.createTime == v.expirationTime ? 0 : new Date(v.expirationTime) - Date.now();
                    v.lockUser$ = $translate(v.isLocked);
                    v.creditAmount$ = (v.data.amount != null)
                        ? $noRoundTwoDecimalPlaces(parseFloat(v.data.amount)).toString()
                        : (v.data.rewardAmount != null
                        ? $noRoundTwoDecimalPlaces(parseFloat(v.data.rewardAmount)).toString()
                        : v.data.commissionAmount != null
                        ? $noRoundTwoDecimalPlaces(parseFloat(v.data.commissionAmount)).toString()
                        : v.data.negativeProfitAmount != null
                        ? $noRoundTwoDecimalPlaces(parseFloat(v.data.negativeProfitAmount)).toString()
                        : $translate("N/A"));
                    if (v.data.updateAmount != null) {
                        v.creditAmount$ = $noRoundTwoDecimalPlaces(parseFloat(v.data.updateAmount)).toString()
                    }
                    if (v.mainType == "PlayerBonus" && v.data.bankTypeId) {
                        v.bankType$ = vm.allBankTypeList[v.data.bankTypeId]
                    }
                    if (v.mainType == "PlayerBonus" && v.status == "Approved") {
                        v.status = "approved";
                    }
                    if (v.data.commissionAmount && v.data.commissionAmountFromChildren) {
                        v.creditAmount$ = parseFloat(v.data.commissionAmount + v.data.commissionAmountFromChildren).toFixed(2);
                    }
                    // v.remark$ = v.remark.map(item => {
                    //     return item ? item.content : '';
                    // });
                    if (v.data && v.data.remark) {
                        v.remark$ = v.data.remark.replace('event name',$translate('event name')).replace('topup proposal id',$translate('topup proposal id'));
                    }
                    v.playerLevel$ = v.data.playerLevelName ? $translate(v.data.playerLevelName) : '';
                    v.merchantNo$ = v.data.merchantNo != null
                        ? v.data.merchantNo
                        : v.data.weChatAccount != null
                        ? v.data.weChatAccount
                        : v.data.alipayAccount != null
                        ? v.data.alipayAccount
                        : null;
                    // remove the time from the ISO date for display purpose
                    // if (v.data.DOB) {
                    //     v.data.DOB = v.data.DOB.slice(0, 10);
                    // }
                    // convert the status of gender from Boolean to string for display purpose
                    if (v.data.gender == true) {
                        v.data.gender = "男";
                    }
                    if (v.data.gender == false) {
                        v.data.gender = "女";
                    }

                    if (v.data && v.data.rawCommissions && v.data.rawCommissions.length) {
                        v.data.rawCommissions.map(rawCommission => {
                            if (rawCommission.isCustomCommissionRate || rawCommission.isCustomPlatformFeeRate) {
                                v.data.redRemark$ = true;
                            }
                        });
                    }

                    if (v.data.rateAfterRebatePromoIsCustom || v.data.rateAfterRebateTotalDepositIsCustom || v.data.rateAfterRebateTotalWithdrawalIsCustom) {
                        v.data.redRemark$ = true;
                    }

                    tableData.push(v);
                }
            });

            // Plug-in to sort signed numbers
            jQuery.extend(jQuery.fn.dataTableExt.oSort, {
                "signed-num-asc": function (a, b) {
                    a = a == 0 ? Infinity : a;
                    b = b == 0 ? Infinity : b;

                    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
                },

                "signed-num-desc": function (a, b) {
                    a = a == 0 ? -Infinity : a;
                    b = b == 0 ? -Infinity : b;

                    return ((a < b) ? 1 : ((a > b) ? -1 : 0));
                }
            });

            let tableOptions = {
                data: tableData,
                deferRender: true,
                "bProcessing": true,
                bDeferRender: true,
                // filterProposalType: true,
                "aaSorting": vm.queryProposal.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'relatedAmount', bSortable: true, 'aTargets': [7]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [8]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('PROPOSAL_NO'),
                        "data": "proposalId",
                        render: function (data, type, row) {
                            var $link = $('<a>').text(data);
                            return $link.prop('outerHTML');
                        },
                        bSortable: true
                    },
                    {
                        "title": $translate('CREATOR'),
                        "data": null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator')) {
                                if(data.creator && data.creator.type){
                                    if (data.type && data.type.name && data.type.name == "CustomizePartnerCommRate" && data.creator.type == "admin") {
                                        return $translate('CUSTOMER_SERVICE') + ": " + data.creator.name;
                                    } else if (data.creator.type == "partner") {
                                        if (data.creator.name) {
                                            return $translate('PARTNER') + ": " + data.creator.name;
                                        } else {
                                            return $translate('PARTNER') + ": " + data.creator.id;
                                        }
                                    }
                                }
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
                            for (let i = 0; i < Object.keys(vm.inputDevice).length; i++){
                                if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data ){
                                    return $translate(Object.keys(vm.inputDevice)[i]);
                                }
                            }
                        }
                    },
                    {
                        "title": $translate('MAIN_TYPE'),
                        "data": "mainType$"
                    },
                    {
                        title: $translate('PROPOSAL_SUB_TYPE'), data: null,
                        orderable: false,
                        render: function (data, type, row) {
                            if (data && data.data && data.data.PROMO_CODE_TYPE) {
                                return data.data.PROMO_CODE_TYPE;
                            }else if(data && data.data && data.data.eventName){
                                return data.data.eventName;
                            }else {
                                return $translate(row.type ? row.type.name : "");
                            }
                        }
                    },
                    {
                        "title": $translate('STATUS'),
                        "data": 'process',
                        render: function (data, type, row) {
                            let status = row.status;
                            if (row.type && row.type.name == "BulkExportPlayerData") {
                                status = status === "Approved" ? "approved" : status;
                            }
                            let text = $translate(status ? status : (data.status ? data.status : 'UNKNOWN'));
                            text = text === "approved" ? "Approved" : text;

                            let textClass = '';
                            let fontStyle = {};
                            if (row.status === 'Pending' || row.status === 'CsPending') {
                                textClass = "text-danger";
                                fontStyle = {'font-weight': 'bold'};
                            }

                            let $link = $('<a>').text(text).addClass(textClass).css(fontStyle);
                            return $link.prop('outerHTML');
                        },
                    },
                    {
                        "title": $translate('RELATED_USER'),
                        "data": null,
                        "sClass": "sumText",
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
                        }
                    },
                    {
                        "title": $translate('Credit Amount'),
                        "data": "creditAmount$",
                        "sClass": "alignRight creditAmount sumFloat"
                    },
                    {
                        "title": $translate('CREATION_TIME'),
                        "data": 'createTime$',
                        bSortable: true
                    },
                    {
                        "title": $translate('PlayerLevel'),
                        bSortable: false,
                        data: "playerLevel$",
                        // visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
                    {
                        "title": $translate('REMARK'),
                        data: "remark$",
                        sClass: "maxWidth100 wordWrap",
                        render: function (data, type, row) {
                            if (row.data.redRemark$) {
                                let $text = $('<span>').text(data).css({color: 'red'});
                                return $text.prop('outerHTML');
                            }
                            return data;
                        }
                    },


                    // {
                    //     "title": $translate('TYPE'),
                    //     "data": "type",
                    //     render: function (data, type, row) {
                    //         var text = $translate(row.type ? row.type.name : "");
                    //         return "<div>" + text + "</div>";
                    //     }
                    // },


                    // {
                    //     "title": $translate('request Id'),
                    //     "data": "data.requestId"
                    // },
                    // {
                    //     "title": $translate('Merchant No'),
                    //     "data": "merchantNo$"
                    // },
                    //
                    // {
                    //     "title": $translate('topupType'),
                    //     "data": "data.topupType",
                    //     render: function (data, type, row) {
                    //         let text = ($translate($scope.merchantTopupTypeJson[data])) ? $translate($scope.merchantTopupTypeJson[data]) : ""
                    //         return "<div>" + text + "</div>";
                    //     },
                    //     bSortable: true
                    // },
                    // {
                    //     "title": $translate('PRIORITY'),
                    //     "data": "priority$"
                    // },
                    // {
                    //     "title": $translate('playerStatus'),
                    //     "data": "playerStatus$",
                    //     render: function (data, type, row) {
                    //         let showText = $translate($scope.constPlayerStatus[data] ?
                    //             $scope.constPlayerStatus[data] : "Normal");
                    //         let textClass = '';
                    //         let fontStyle = {};
                    //         if (data === 4) {
                    //             textClass = "bold";
                    //             fontStyle = {'font-weight': 'bold'};
                    //         } else if (data === 5) {
                    //             textClass = "text-danger";
                    //             fontStyle = {'font-weight': 'bold'};
                    //         }
                    //
                    //         return $('<div>')
                    //             .text(showText)
                    //             .addClass(textClass)
                    //             .css(fontStyle)
                    //             .prop('outerHTML');
                    //     }
                    // },
                    // {
                    //     "title": $translate('ENTRY_TYPE'),
                    //     "data": "entryType$"
                    // },
                    // {
                    //     "title": $translate('USER_TYPE'),
                    //     "data": "userType$",
                    //     "sClass": "sumText"
                    // },
                    // {
                    //     "title": $translate('bankTypeId'),
                    //     "data": "bankType$",
                    //     visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    // },
                    // {
                    //     "title": $translate('LOCK_USER'),
                    //     "data": "lockUser$",
                    //     render: function (data, type, row) {
                    //         var text = row.isLocked ? row.isLocked.adminName : "";
                    //         return "<div>" + text + "</div>";
                    //     },
                    //     visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    // },
                    //
                    //
                    // {
                    //     "title": $translate('EXPIRY_DATE'),
                    //     "data": 'expirationTime$',
                    //     type: 'signed-num',
                    //     render: function (data, type, row) {
                    //         if (type === 'sort' || type === 'type') {
                    //             return data;
                    //         }
                    //         else {
                    //             if (data > 0) {
                    //                 // Not expired
                    //                 let expireTime = Math.floor((data / 1000) / 60);
                    //                 return "<div>" + $translate("Left") + " " + expireTime + " " + $translate("mins") + "</div>";
                    //             }
                    //             else if (data < 0) {
                    //                 // Expired
                    //                 let expireTime = Math.ceil((data / 1000) / 60);
                    //                 return "<div>" + $translate("Expired") + " " + -expireTime + " " + $translate("mins") + "</div>";
                    //             }
                    //             else {
                    //                 return "<div>" + $translate("N/A") + "</div>";
                    //             }
                    //         }
                    //     },
                    //     bSortable: true,
                    //     visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    // },
                ],
                "bSortClasses": false,
                "scrollX": true,
                "destroy": true,
                "paging": false,
                "language": {
                    "info": "Total _MAX_ proposals",
                    "emptyTable": $translate("No data available in table"),
                },
                dom: 'Zrt<"footer">lp',
                fnRowCallback: vm.proposalTableRow
            };
            $.fn.dataTable.ext.search.push(
                function (settings, rdata, dataIndex) {
                    if (settings.oInit.filterProposalType) {
                        var selectedStatus = [];
                        vm.proposalStatusSelected.forEach(
                            status => {
                                selectedStatus.push(status);
                                if (status == "Success") {
                                    selectedStatus.push("Approved");
                                }
                                if (status == "Fail") {
                                    selectedStatus.push("Rejected");
                                }
                            }
                        );
                        var typeName = settings.aoData[dataIndex]._aData.type.name;
                        var statusName = settings.aoData[dataIndex]._aData.status || settings.aoData[dataIndex]._aData.process.status;
                        if (
                            (vm.proposalTypeSelected && vm.proposalTypeSelected.indexOf(typeName) != -1)
                            && (selectedStatus && selectedStatus.indexOf(statusName) != -1)) {
                            return true;
                        } else return false;
                    } else return true;
                }
            );
            vm.queryProposal.pageObj.init({maxCount: size}, newSearch);
            $('#proposalDataTable').empty();
            //no idea why is 7, and 7 is not working, so I change it to 8
            //lizhu: the number here indicates the data should be listed in N-th column
            vm.proposalTable = utilService.createDatatableWithFooter('#proposalDataTable', tableOptions, {7: summary.amount});
            // utilService.setDataTablePageInput('proposalDataTable', vm.proposalTable, $translate);

            //update select all in table
            var $checkAll = $(".dataTables_scrollHead thead .approvalProposalSelected");
            if ($checkAll.length == 1) {
                var $showBtn = $('<input>', {
                    type: 'checkbox',
                    class: "approvalProposalSelected transform150 checkAllProposal"
                });
                $checkAll.html($showBtn);
                $('.approvalProposalSelected.checkAllProposal').on('click', function () {
                    var $checkAll = $(this) && $(this).length == 1 ? $(this)[0] : null;
                    setCheckAllProposal($checkAll.checked);
                })
            }
            function setCheckAllProposal(flag) {
                var s = $("#proposalDataTable tbody td.approvalProposalSelected input").each(function () {
                    $(this).prop("checked", flag);
                });
                vm.updateMultiselectProposal();
            }

            vm.timeAllProposal = utilService.$getTimeFromStdTimeFormat();
            $("#proposalDataTableDiv .newProposalAlert").text('');
            setTimeout(function () {
                $('#proposalDataTable').resize();
            }, 100)

            function tableRowClicked(event) {
                if (event.target.tagName == "INPUT" && event.target.type == 'checkbox') {
                    var flagAllChecked = $("#proposalDataTable tbody td.approvalProposalSelected input[type='checkbox']:not(:checked)");
                    $('.approvalProposalSelected.checkAllProposal').prop('checked', flagAllChecked.length == 0);
                    vm.updateMultiselectProposal();
                }
                if (event.target.tagName == 'A') {
                    var data = vm.proposalTable.row(this).data();
                    vm.proposalRowClicked(data);
                }
            }

            $('#proposalDataTable tbody').off('click', "**");
            $('#proposalDataTable tbody').on('click', 'tr', tableRowClicked);
            $('#proposalDataTable').off('order.dt');
            $('#proposalDataTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'queryProposal', vm.loadProposalQueryData);
            });
        };

        vm.drawProposalAuditTable = function (data, size, summary, newSearch) {
            console.log("whole data", data);
            vm.newProposalNum = 0;
            vm.blinkAllProposal = false;

            var tableData = [];
            $.each(data, function (i, v) {
                if (v) {
                    if (v.mainType == 'Reward') {
                        v.type.name = v.data && v.data.eventName ? v.data.eventName : v.type.name;
                    }
                    v.mainType$ = $translate(v.mainType);
                    if (v.mainType === "PlayerBonus")
                        v.mainType$ = $translate("Bonus");
                    v.priority$ = $translate(v.data.proposalPlayerLevel ? v.data.proposalPlayerLevel : "Normal");
                    v.playerStatus$ = v.data.playerStatus;
                    v.entryType$ = $translate(vm.proposalEntryTypeList[v.entryType]);
                    v.userType$ = $translate(v.userType ? vm.proposalUserTypeList[v.userType] : "");
                    v.createTime$ = utilService.getFormatTime(v.createTime).substring(5);
                    v.expirationTime$ = v.createTime == v.expirationTime || new Date(v.expirationTime).getTime() == $scope.constMaxDateTime.getTime()
                        ? 0 : new Date(v.expirationTime) - Date.now();
                    v.lockUser$ = $translate(v.isLocked);
                    v.creditAmount$ = (v.data.amount != null)
                        ? parseFloat(v.data.amount).toFixed(2)
                        : (v.data.rewardAmount != null
                            ? parseFloat(v.data.rewardAmount).toFixed(2)
                            : v.data.commissionAmount != null
                                ? parseFloat(v.data.commissionAmount).toFixed(2)
                                : v.data.negativeProfitAmount != null
                                    ? parseFloat(v.data.negativeProfitAmount).toFixed(2)
                                    : $translate("N/A"));
                    if (v.data.updateAmount != null) {
                        v.creditAmount$ = parseFloat(v.data.updateAmount).toFixed(2);
                    }
                    if (v.mainType == "PlayerBonus" && v.data.bankTypeId) {
                        v.bankType$ = vm.allBankTypeList[v.data.bankTypeId]
                    }
                    if (v.mainType == "PlayerBonus" && v.status == "Approved") {
                        v.status = "approved";
                    }
                    if (v.data.commissionAmount && v.data.commissionAmountFromChildren) {
                        v.creditAmount$ = parseFloat(v.data.commissionAmount + v.data.commissionAmountFromChildren).toFixed(2);
                    }
                    // v.remark$ = v.remark.map(item => {
                    //     return item ? item.content : '';
                    // });
                    if (v.data && v.data.remark) {
                        v.remark$ = v.data.remark;
                    }
                    v.playerLevel$ = v.data.playerLevelName ? $translate(v.data.playerLevelName) : '';
                    v.merchantNo$ = v.data.merchantNo != null
                        ? v.data.merchantNo
                        : v.data.weChatAccount != null
                            ? v.data.weChatAccount
                            : v.data.alipayAccount != null
                                ? v.data.alipayAccount
                                : null;

                    if (v.data && v.data.rawCommissions && v.data.rawCommissions.length) {
                        v.data.rawCommissions.map(rawCommission => {
                            if (rawCommission.isCustomCommissionRate || rawCommission.isCustomPlatformFeeRate) {
                                v.data.redRemark$ = true;
                            }
                        });
                    }

                    if (v.data.rateAfterRebatePromoIsCustom || v.data.rateAfterRebateTotalDepositIsCustom || v.data.rateAfterRebateTotalWithdrawalIsCustom) {
                        v.data.redRemark$ = true;
                    }

                    tableData.push(v);
                }
            });

            // Plug-in to sort signed numbers
            jQuery.extend(jQuery.fn.dataTableExt.oSort, {
                "signed-num-asc": function (a, b) {
                    a = a == 0 ? Infinity : a;
                    b = b == 0 ? Infinity : b;

                    return ((a < b) ? -1 : ((a > b) ? 1 : 0));
                },

                "signed-num-desc": function (a, b) {
                    a = a == 0 ? -Infinity : a;
                    b = b == 0 ? -Infinity : b;

                    return ((a < b) ? 1 : ((a > b) ? -1 : 0));
                }
            });

            let tableOptions = {
                data: tableData,
                deferRender: true,
                "bProcessing": true,
                bDeferRender: true,
                // filterProposalType: true,
                "aaSorting": vm.queryAuditProposal.aaSorting || [[20, 'asc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'priority', bSortable: true, 'aTargets': [7]},
                    {'sortCol': 'relatedUser', bSortable: true, 'aTargets': [13]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [18]},
                    {'sortCol': 'expirationTime', bSortable: true, 'aTargets': [20]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        "title": $translate('Multiselect'),
                        bSortable: false,
                        sClass: "approvalProposalSelected",
                        render: function (data, type, row) {
                            if (!row.isLocked || row.isLocked._id == authService.adminId) {
                                var link = $('<input>', {
                                    type: 'checkbox',
                                    "data-proposalId": row._id,
                                    class: "transform150"
                                })
                                return link.prop('outerHTML');
                            } else return null;
                        },
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
                    {
                        "title": $translate('PROPOSAL_NO'),
                        "data": "proposalId",
                        render: function (data, type, row) {
                            var $link = $('<a>').text(data);
                            return $link.prop('outerHTML');
                        },
                        bSortable: true
                    },
                    {
                        "title": $translate('request Id'),
                        "data": "data.requestId"
                    },
                    {
                        "title": $translate('Merchant No'),
                        "data": "merchantNo$"
                    },
                    {
                        "title": $translate('MAIN_TYPE'),
                        "data": "mainType$"
                    },
                    {
                        "title": $translate('TYPE'),
                        "data": "type",
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('topupType'),
                        "data": "data.topupType",
                        render: function (data, type, row) {
                            let text = ($translate($scope.merchantTopupTypeJson[data])) ? $translate($scope.merchantTopupTypeJson[data]) : ""
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('PRIORITY'),
                        "data": "priority$"
                    },
                    {
                        "title": $translate('playerStatus'),
                        "data": "playerStatus$",
                        render: function (data, type, row) {
                            let showText = $translate($scope.constPlayerStatus[data] ?
                                $scope.constPlayerStatus[data] : "Normal");
                            let textClass = '';
                            let fontStyle = {};
                            if (data === 4) {
                                textClass = "bold";
                                fontStyle = {'font-weight': 'bold'};
                            } else if (data === 5) {
                                textClass = "text-danger";
                                fontStyle = {'font-weight': 'bold'};
                            }

                            return $('<div>')
                                .text(showText)
                                .addClass(textClass)
                                .css(fontStyle)
                                .prop('outerHTML');
                        }
                    },
                    {
                        "title": $translate('ENTRY_TYPE'),
                        "data": "entryType$"
                    },
                    {
                        "title": $translate('USER_TYPE'),
                        "data": "userType$",
                        "sClass": "sumText"
                    },
                    {
                        "title": $translate('Credit Amount'),
                        "data": "creditAmount$",
                        "sClass": "alignRight creditAmount sumFloat"
                    },
                    {
                        "title": $translate('bankTypeId'),
                        "data": "bankType$",
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
                    {
                        "title": $translate('RELATED_USER'),
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
                        }
                    },
                    {
                        "title": $translate('PlayerLevel'),
                        bSortable: false,
                        data: "playerLevel$",
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
                    {
                        "title": $translate('CREATOR'),
                        "data": null,
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
                        "title": $translate('LOCK_USER'),
                        "data": "lockUser$",
                        render: function (data, type, row) {
                            var text = row.isLocked ? row.isLocked.adminName : "";
                            return "<div>" + text + "</div>";
                        },
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
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

                            let $link = $('<a>').text(text).addClass(textClass).css(fontStyle);
                            return $link.prop('outerHTML');
                        },
                    },
                    {
                        "title": $translate('CREATION_TIME'),
                        "data": 'createTime$'
                    },
                    {
                        "title": $translate('REMARK'),
                        data: "remark$",
                        sClass: "maxWidth100 wordWrap",
                        render: function (data, type, row) {
                            if (row.data.redRemark$) {
                                let $text = $('<span>').text(data).css({color: 'red'});
                                return $text.prop('outerHTML');
                            }
                            return data;
                        }
                    },
                    {
                        "title": $translate('EXPIRY_DATE'),
                        "data": 'expirationTime',
                        // type: 'signed-num',
                        render: function (data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                return data;
                            }
                            else {
                                if (row.expirationTime$ > 0) {
                                    // Not expired
                                    let expireTime = Math.floor((row.expirationTime$ / 1000) / 60);
                                    return "<div>" + $translate("Left") + " " + expireTime + " " + $translate("mins") + "</div>";
                                }
                                else if (row.expirationTime$ < 0) {
                                    // Expired
                                    let expireTime = Math.ceil((row.expirationTime$ / 1000) / 60);
                                    return "<div>" + $translate("Expired") + " " + -expireTime + " " + $translate("mins") + "</div>";
                                }
                                else {
                                    return "<div>" + $translate("N/A") + "</div>";
                                }
                            }
                        },
                        bSortable: true,
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    },
                ],
                "bSortClasses": false,
                "scrollX": true,
                "destroy": true,
                "paging": false,
                "language": {
                    "info": "Total _MAX_ proposals",
                    "emptyTable": $translate("No data available in table"),
                },
                dom: 'Zrt<"footer">lp',
                fnRowCallback: vm.proposalTableRow
            };
            $.fn.dataTable.ext.search.push(
                function (settings, rdata, dataIndex) {
                    if (settings.oInit.filterProposalType) {
                        var selectedStatus = [];
                        vm.proposalStatusSelected.forEach(
                            status => {
                                selectedStatus.push(status);
                                if (status == "Success") {
                                    selectedStatus.push("Approved");
                                }
                                if (status == "Fail") {
                                    selectedStatus.push("Rejected");
                                }
                            }
                        );
                        var typeName = settings.aoData[dataIndex]._aData.type.name;
                        var statusName = settings.aoData[dataIndex]._aData.status || settings.aoData[dataIndex]._aData.process.status;
                        if (
                            (vm.proposalAuditTypeSelected && vm.proposalAuditTypeSelected.indexOf(typeName) != -1)
                            && (selectedStatus && selectedStatus.indexOf(statusName) != -1)) {
                            return true;
                        } else return false;
                    } else return true;
                }
            );
            vm.queryAuditProposal.pageObj.init({maxCount: size}, newSearch);

            $('#proposalAuditDataTable').empty();
            //no idea why is 7, and 7 is not working, so I change it to 8
            //lizhu: the number here indicates the data should be listed in N-th column
            vm.proposalTable = utilService.createDatatableWithFooter('#proposalAuditDataTable', tableOptions, {11: summary.amount});
            // utilService.setDataTablePageInput('proposalDataTable', vm.proposalTable, $translate);

            //update select all in table
            var $checkAll = $(".dataTables_scrollHead thead .approvalProposalSelected");
            if ($checkAll.length == 1) {
                var $showBtn = $('<input>', {
                    type: 'checkbox',
                    class: "approvalProposalSelected transform150 checkAllProposal"
                });
                $checkAll.html($showBtn);
                $('.approvalProposalSelected.checkAllProposal').on('click', function () {
                    var $checkAll = $(this) && $(this).length == 1 ? $(this)[0] : null;
                    setCheckAllProposal($checkAll.checked);
                })
            }
            function setCheckAllProposal(flag) {
                var s = $("#proposalAuditDataTable tbody td.approvalProposalSelected input").each(function () {
                    $(this).prop("checked", flag);
                });
                vm.updateMultiselectProposal();
            }

            vm.timeAllProposal = utilService.$getTimeFromStdTimeFormat();
            $("#proposalAuditDataTableDiv .newProposalAlert").text('');
            setTimeout(function () {
                $('#proposalAuditDataTable').resize();
            }, 100)

            function tableRowClicked(event) {
                if (event.target.tagName == "INPUT" && event.target.type == 'checkbox') {
                    var flagAllChecked = $("#proposalAuditDataTable tbody td.approvalProposalSelected input[type='checkbox']:not(:checked)");
                    $('.approvalProposalSelected.checkAllProposal').prop('checked', flagAllChecked.length == 0);
                    vm.updateMultiselectProposal();
                }
                if (event.target.tagName == 'A') {
                    var data = vm.proposalTable.row(this).data();
                    vm.proposalRowClicked(data);
                }
            }

            $('#proposalAuditDataTable tbody').off('click', "**");
            $('#proposalAuditDataTable tbody').on('click', 'tr', tableRowClicked);
            $('#proposalAuditDataTable').off('order.dt');
            $('#proposalAuditDataTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'queryAuditProposal', vm.loadProposalAuditQueryData);
            });
        };

        vm.updateMultiselectProposal = function () {
            var allClicked = $("#proposalAuditDataTable tr input:checked[type='checkbox']");
            vm.multiProposalSelected = [];
            if (allClicked.length > 0) {
                allClicked.each(function () {
                    var id = $(this)[0].dataset.proposalid;
                    if (id) {
                        vm.multiProposalSelected.push(id);
                    }
                })
            }
            console.log(vm.multiProposalSelected);
            $scope.safeApply();
        };

        vm.updateProposalProcessStepProm = function (proposalId, bApprove) {
            var deferred = Q.defer();
            socketService.$socket($scope.AppSocket, 'updateProposalProcessStep', {
                proposalId: proposalId,
                adminId: authService.adminId,
                memo: $translate(bApprove ? "Approved" : "Rejected") + " " + $('#proposalRemark').val(),
                bApprove: bApprove,
                remark: $('#proposalRemark').val()
            }, function (data) {
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        };

        vm.updateMultiProposal = function (bApprove) {
            console.log("updateMultiProposal", vm.multiProposalSelected);
            if (bApprove) {
                vm.showProposalIndicator.approve = true;
            } else {
                vm.showProposalIndicator.reject = true;
            }
            if (vm.multiProposalSelected && vm.multiProposalSelected.length > 0) {
                var proms = vm.multiProposalSelected.map(
                    proposalId => vm.updateProposalProcessStepProm(proposalId, bApprove)
                );
                Q.all(proms).then(
                    data => {
                        console.log("updateMultiProposal done:", data);
                        vm.multiProposalSelected = [];
                        setTimeout(vm.loadProposalQueryData, 500);
                        vm.showProposalIndicator = {};
                    },
                    error => {
                        console.log(error);
                        vm.multiProposalSelected = [];
                        setTimeout(vm.loadProposalQueryData, 500);
                        vm.showProposalIndicator = {};
                    }
                );
            }
        };

        vm.proposalTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $compile(nRow)($scope);
            vm.OperationProposalTableRow(nRow, aData, iDisplayIndex, iDisplayIndexFull);
            //console.log("row", nRow, aData, iDisplayIndex, iDisplayIndexFull);
        };
        vm.proposalRowClicked = function (data) {
            if (!data) {
                return;
            }
            vm.proposalDetailStyle = {};
            vm.changeStatusToPendingFromAutoAuditMessage = "";
            vm.selectedProposal = data;
            vm.updateProposalLockBtnStatus();
            $('#modalOperationProposal').modal();
            $('#modalOperationProposal').off('hidden.bs.modal');
            $('#modalOperationProposal').on('hidden.bs.modal', function () {
                $('#modalOperationProposal').off('hidden.bs.modal');
                $('#proposalRemark').val('');
                if (vm.rightPanelTitle == "APPROVAL_PROPOSAL") {
                    vm.unlockProposal(vm.selectedProposal.proposalId);
                }
                if (vm.needRefreshTable) {
                    vm.needRefreshTable = false;
                    // vm.loadProposalByType();
                    vm.loadProposalQueryData();
                }
            });
            if (vm.rightPanelTitle == "APPROVAL_PROPOSAL") {
                vm.lockProposal(vm.selectedProposal.proposalId);
            }
            vm.chartData = null;
            vm.repairPaymentStage = 0;
            console.log('vm.selectedProposal', vm.selectedProposal);
            vm.thisProposalSteps = [];
            if (vm.selectedProposal.process != null && typeof vm.selectedProposal.process == 'object') {
                socketService.$socket($scope.AppSocket, 'getFullProposalProcess', {_id: vm.selectedProposal.process._id}, processSuccess);
            }
            function processSuccess(data) {
                console.log('full proposal data', data);
                vm.thisProposalSteps = data.data.steps;
                vm.chartData = {};
                vm.chartData.nextNodeID = 10;
                var para = [$translate("START_PROPOSAL"), $translate("END_PROPOSAL"), $translate("FAIL_PROPOSAL")];
                vm.chartViewModel.setDefaultLabel(para);
                vm.chartViewModel.setEditable(false);
                $.each(data.data.steps, function (i, v) {
                    if (v._id == data.data.currentStep) {
                        vm.chartData.curStep = v.type;
                        return false;
                    }
                })
                vm.drawProcessSteps(data.data);
            }

            var proposalDetail = $.extend({}, vm.selectedProposal.data);

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "SettlePartnerCommission") {
                proposalDetail = {};
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
                let consumptionUsedKey = vm.selectedProposal.data.commissionType == 5 ? "totalConsumption" : "siteBonusAmount";

                proposalDetail["MAIN_TYPE"] = $translate("SettlePartnerCommission");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["CREATION_TIME"] = $scope.timeReformat(vm.selectedProposal.createTime);
                proposalDetail["COMMISSION_PERIOD"] = $scope.dateReformat(vm.selectedProposal.data.startTime) + " - " + $scope.dateReformat(vm.selectedProposal.data.endTime);
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                proposalDetail["Proposal Status"] = $translate(vm.selectedProposal.status);
                proposalDetail["COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.commissionType]);

                vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                    grossCommission += rawCommission.amount;
                    let str = $fixTwoDecimalStr(rawCommission.amount)+ $translate("YEN") + " "
                        + "(" + $translate(consumptionUsed) + ": " + $fixTwoDecimalStr(rawCommission[consumptionUsedKey]) + "/"
                        + $translate('active') + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.activeCount || 0) + "/"
                        + $translate("RATIO") + ": " + (rawCommission.commissionRate * 100) + "%)";

                    proposalDetail[rawCommission.groupName + " " + $translate("Commission")] =  str;

                    if (rawCommission.isCustomCommissionRate) {
                        vm.proposalDetailStyle[rawCommission.groupName + " " + $translate("Commission")] = customizedStyle;
                        isCustomized = true;
                    }
                });

                proposalDetail["REQUIRED_PROMO_DEDUCTION"] = $fixTwoDecimalStr(vm.selectedProposal.data.totalRewardFee) + $translate("YEN")
                    + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalReward) + "/"
                    + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebatePromo) + "%)";

                if (vm.selectedProposal.data.rateAfterRebatePromoIsCustom) {
                    vm.proposalDetailStyle["REQUIRED_PROMO_DEDUCTION"] = customizedStyle;
                    isCustomized = true;
                }

                proposalDetail["REQUIRED_PLATFORM_FEES_DEDUCTION"] = "";
                vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                    totalPlatformFee += rawCommission.platformFee;
                    let str = $fixTwoDecimalStr(rawCommission.platformFee) + $translate("YEN") + " "
                        + "(" + $translate("SITE_LOSE_WIN") + ": " + $fixTwoDecimalStr(rawCommission.siteBonusAmount) + "/"
                        + $translate("RATIO") + ": " + (rawCommission.platformFeeRate) + "%)";

                    proposalDetail["- " + rawCommission.groupName] =  str;

                    if (rawCommission.isCustomPlatformFeeRate) {
                        vm.proposalDetailStyle["- " + rawCommission.groupName] = customizedStyle;
                        isCustomized = true;
                    }
                });

                proposalDetail["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = $fixTwoDecimalStr(vm.selectedProposal.data.totalTopUpFee) + $translate("YEN")
                    + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalTopUp) + "/"
                    + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalDeposit) + "%)";

                if (vm.selectedProposal.data.rateAfterRebateTotalDepositIsCustom) {
                    vm.proposalDetailStyle["REQUIRED_DEPOSIT_FEES_DEDUCTION"] = customizedStyle;
                    isCustomized = true;
                }

                proposalDetail["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = $fixTwoDecimalStr(vm.selectedProposal.data.totalWithdrawalFee) + $translate("YEN")
                    + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalWithdrawal) + "/"
                    + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal) + "%)";

                if (vm.selectedProposal.data.rateAfterRebateTotalWithdrawalIsCustom) {
                    vm.proposalDetailStyle["REQUIRED_WITHDRAWAL_FEES_DEDUCTION"] = customizedStyle;
                    isCustomized = true;
                }

                if (isCustomized) {
                    vm.proposalDetailStyle["COMMISSION_TYPE"] = customizedStyle;
                }

                let totalFee = Number(vm.selectedProposal.data.totalRewardFee) + Number(totalPlatformFee) + Number(vm.selectedProposal.data.totalTopUpFee) + Number(vm.selectedProposal.data.totalWithdrawalFee);

                proposalDetail["COMMISSION_TOTAL"] = $fixTwoDecimalStr(vm.selectedProposal.data.amount) + " "
                    + "(" + $fixTwoDecimalStr(grossCommission) + "-" + $fixTwoDecimalStr(totalFee) + ")";
            }

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "ManualPlayerTopUp") {
                proposalDetail = {};
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
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
            }

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerTopUp") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["MAIN_TYPE"] = $translate("PlayerTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["OnlineTopUpType"] = $translate($scope.merchantTopupTypeJson[vm.selectedProposal.data.topupType]) || " ";
                proposalDetail["3rdPartyPlatform"] = vm.getMerchantName(vm.selectedProposal.data.merchantNo) || " ";
                proposalDetail["merchantNo"] = vm.selectedProposal.data.merchantNo || " ";
                proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                proposalDetail["SUBMIT_DEVICE"] = $scope.userAgentType[vm.selectedProposal.data.userAgent] || $translate("BACKSTAGE");
                proposalDetail["MerchantGroup"] = vm.selectedProposal.data.merchantGroupName || " ";
                proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.permerchantLimits || "0";
                proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.transactionForPlayerOneDay || "0");
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
            }


            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerWechatTopUp") {
                proposalDetail = {};
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
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
            }

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerAlipayTopUp") {
                proposalDetail = {};
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
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
            }

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "BulkExportPlayerData") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                let depositCountQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.depositCountOperator, vm.selectedProposal.data.depositCountFormal, vm.selectedProposal.data.depositCountLater);
                let topUpSumQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.topUpSumOperator, vm.selectedProposal.data.topUpSumFormal, vm.selectedProposal.data.topUpSumLater);
                let playerValueQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.playerValueOperator, vm.selectedProposal.data.playerValueFormal, vm.selectedProposal.data.playerValueLater);
                let totalConsumptionQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.consumptionTimesOperator, vm.selectedProposal.data.consumptionTimesFormal, vm.selectedProposal.data.consumptionTimesLater);
                let bonusAmountQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.bonusAmountOperator, vm.selectedProposal.data.bonusAmountFormal, vm.selectedProposal.data.bonusAmountLater);
                let withdrawalTimesQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.withdrawalTimesOperator, vm.selectedProposal.data.withdrawalTimesFormal, vm.selectedProposal.data.withdrawalTimesLater);


                proposalDetail["MAIN_TYPE"] = $translate("BulkExportPlayerData");
                proposalDetail["USER_TYPE"] = $translate(vm.selectedProposal.data.playerType) || " ";
                proposalDetail["BANNER TITLE"] = $translate(vm.selectedProposal.data.title) || " ";
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName || $translate("ALL");
                proposalDetail["CREDIBILITY"] = vm.selectedProposal.data.credibilityRemarkNames && vm.selectedProposal.data.credibilityRemarkNames.length > 0 ? vm.selectedProposal.data.credibilityRemarkNames.join(', ') : " ";
                proposalDetail["LAST_ACCESS_TILL_NOW"] = vm.selectedProposal.data.lastAccessTimeRangeString || " ";
                proposalDetail["FILTER_FEEDBACK_DAY"] = vm.selectedProposal.data.lastFeedbackTimeBefore || " ";
                proposalDetail["DEPOSIT_COUNT"] = depositCountQueryString || " ";
                proposalDetail["PLAYER_VALUE"] = playerValueQueryString || " ";
                proposalDetail["TOTAL_CONSUMPTION_TIMES"] = totalConsumptionQueryString || " ";
                proposalDetail["PLAYER_PROFIT_AMOUNT"] = bonusAmountQueryString || " ";
                proposalDetail["WITHDRAWAL_TIMES"] = withdrawalTimesQueryString || " ";
                proposalDetail["TOTAL_TOP_UP"] = topUpSumQueryString || " ";
                proposalDetail["GAME_LOBBY"] = vm.selectedProposal.data.gameProviderNames && vm.selectedProposal.data.gameProviderNames.length > 0 ? vm.selectedProposal.data.gameProviderNames.join(', ') : " ";
                proposalDetail["REGISTRATION_TIME_START"] = vm.selectedProposal.data.registrationTimeFrom ? $scope.timeReformat(new Date(vm.selectedProposal.data.registrationTimeFrom)) : " ";
                proposalDetail["REGISTRATION_TIME_END"] = vm.selectedProposal.data.registrationTimeTo ? $scope.timeReformat(new Date(vm.selectedProposal.data.registrationTimeTo)) : " ";
                proposalDetail["EXPORT_PLAYER_COUNT"] = vm.selectedProposal.data.exportCount || " ";
                proposalDetail["TARGET_SITE"] = vm.selectedProposal.data.targetExportPlatformName || " ";
                proposalDetail["expirationTime"] = vm.selectedProposal.expirationTime ? $scope.timeReformat(new Date(vm.selectedProposal.expirationTime)) : " ";

                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || "";
                proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || "";
            }

            var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            for (let i in proposalDetail) {
                // Add provider group name
                if (i == "providerGroup") {
                    proposalDetail.providerGroup = proposalDetail[i] ? vm.getProviderGroupNameById(proposalDetail[i]) : $translate("LOCAL_CREDIT");
                }

                //remove objectIDs/null/blank objects
                if (checkForHexRegExp.test(proposalDetail[i]) || proposalDetail[i] === null || proposalDetail[i] === "") {
                    delete proposalDetail[i];
                }

                if (i == 'providers') {
                    var temp = [];
                    if (proposalDetail.providers) {
                        proposalDetail.providers.map(item => {
                            temp.push(item.name);
                        });
                        proposalDetail.providers = temp;
                    }
                }
            }
            vm.selectedProposalDetailForDisplay = $.extend({}, proposalDetail);
            if (vm.selectedProposalDetailForDisplay['provinceId'] || vm.selectedProposalDetailForDisplay['RECEIVE_BANK_ACC_PROVINCE']) {
                let provinceField  = 'provinceId';
                if (vm.selectedProposalDetailForDisplay['RECEIVE_BANK_ACC_PROVINCE'] ) {
                    provinceField = 'RECEIVE_BANK_ACC_PROVINCE'
                }
                socketService.$socket($scope.AppSocket, "getProvince", {provinceId: vm.selectedProposalDetailForDisplay[provinceField]}, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay[provinceField] = text;
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

            if (vm.selectedProposalDetailForDisplay['cityId'] || vm.selectedProposalDetailForDisplay['RECEIVE_BANK_ACC_CITY']) {
                let provinceField = 'cityId';
                if (vm.selectedProposalDetailForDisplay['RECEIVE_BANK_ACC_CITY']) {
                    provinceField = "RECEIVE_BANK_ACC_CITY";
                }
                socketService.$socket($scope.AppSocket, "getCity", {cityId: vm.selectedProposalDetailForDisplay[provinceField]}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay[provinceField] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountCity']) {
                socketService.$socket($scope.AppSocket, "getCity", {cityId: vm.selectedProposalDetailForDisplay['bankAccountCity']}, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountCity'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['districtId']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {districtId: vm.selectedProposalDetailForDisplay['districtId']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['districtId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountDistrict']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {districtId: vm.selectedProposalDetailForDisplay['bankAccountDistrict']}, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountDistrict'] = text;
                    $scope.safeApply();
                });
            }

            // Remove fields for detail viewing
            delete vm.selectedProposalDetailForDisplay.creator;
            delete vm.selectedProposalDetailForDisplay.platform;
            delete vm.selectedProposalDetailForDisplay.partner;
            delete vm.selectedProposalDetailForDisplay.playerObjId;
            delete vm.selectedProposalDetailForDisplay.playerLevelName;
            delete vm.selectedProposalDetailForDisplay.playerLevelValue;
            delete vm.selectedProposalDetailForDisplay.devCheckMsg;
            delete vm.selectedProposalDetailForDisplay.useLockedCredit;
            // delete vm.selectedProposalDetailForDisplay.remark;
            delete vm.selectedProposalDetailForDisplay.isIgnoreAudit;
            delete vm.selectedProposalDetailForDisplay.forbidWithdrawAfterApply;

            function canCancelProposal(proposal) {
                if (!proposal || vm.rightPanelTitle == "APPROVAL_PROPOSAL")return false;
                var creatorId = (proposal && proposal.creator) ? proposal.creator.id : '';
                var proposalStatus = proposal.status || proposal.process.status;
                return ((creatorId == authService.adminId) && (proposalStatus == "Pending" || proposalStatus === "AutoAudit"))
                    || (proposal.type.name === "PlayerBonus" && (proposalStatus === "Pending" || proposalStatus === "AutoAudit" || proposalStatus === "CsPending"));
            }

            vm.selectedProposal.showCancel = canCancelProposal(vm.selectedProposal);
            $scope.safeApply();
            //console.log(data);
        }

        vm.getMerchantName = function (merchantNo) {
            let result = '';
            if (merchantNo && vm.merchantNoList) {
                let merchant = vm.merchantNoList.filter(item => {
                    return item.merchantNo == merchantNo
                })
                if (merchant.length > 0) {
                    let merchantName = vm.merchantTypes.filter(item => {
                        return item.merchantTypeId == merchant[0].merchantTypeId;
                    })
                    if (merchantName[0]) {
                        result = merchantName[0].name;
                    }
                }
            }
            return result;
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

        vm.copyTopUpProposal = function () {
            if (vm.selectedProposalDetailForDisplay) {
                commonService.copyObjToText($translate, vm.selectedProposalDetailForDisplay, "REMARKS","modalOperationProposal");
            }
        }

        vm.showCopyProposal = function () {
            if (vm.selectedProposal && vm.selectedProposal.mainType && vm.selectedProposal.mainType == "TopUp" && vm.selectedProposalDetailForDisplay) {
                return true;
            };
            return false;
        }

        vm.updateProposalLockBtnStatus = function () {
            if (!vm.selectedProposal) {
                return
            }
            vm.selectedProposal.showUnlockBtn = vm.selectedProposal.isLocked && (vm.selectedProposal.isLocked.adminName == authService.adminName);
            vm.selectedProposal.showLockBtn = !vm.selectedProposal.isLocked;
        }
        vm.lockProposal = function (id) {
            socketService.$socket($scope.AppSocket, 'lockProposalById', {
                proposalId: id
            }, function (data) {
                vm.selectedProposal.isLocked = data.data ? data.data.isLocked : null;
                vm.updateProposalLockBtnStatus();
                $scope.safeApply();
            });
        }
        vm.unlockProposal = function (id) {
            socketService.$socket($scope.AppSocket, 'unlockProposalById', {
                proposalId: id
            }, function (data) {
                // vm.selectedProposal.isLocked = data.data ? data.data.isLocked : null;
                vm.updateProposalLockBtnStatus();
                $scope.safeApply();
            });
        }

        vm.submitCancelProposal = function (proposal) {
            vm.selectedProposal.cancelling = true;
            vm.selectedProposal.showCancel = false;
            socketService.$socket($scope.AppSocket, 'cancelProposal', {
                proposalId: proposal._id,
                remark: $('#proposalRemark').val()
            }, function (data) {
                vm.selectedProposal.cancelling = false;
                vm.selectedProposal.cancelled = true;
                console.log(data.data);
                vm.loadProposalQueryData();
            });
        }

        vm.updateProposal = function (proposalId, bApprove) {
            console.log("approveProposal", proposalId, bApprove);
            socketService.$socket($scope.AppSocket, 'updateProposalProcessStep', {
                proposalId: proposalId,
                adminId: authService.adminId,
                memo: $translate(bApprove ? "Approved" : "Rejected") + " " + $('#proposalRemark').val(),
                bApprove: bApprove,
            }, function (data) {
                console.log(data.data);
                vm.loadProposalQueryData();
            });
        };

        vm.submitRepairPayment = function (prop) {
            vm.repairPaymentStage = 1;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'submitRepairPaymentProposal', {proposalId: prop.proposalId}, function (data) {
                vm.repairPaymentStage = 2;
                console.log('data', data);
                $scope.safeApply();
            }, function (error) {
                vm.repairPaymentStage = 3;
                console.log('error', error);
                $scope.safeApply();
            })
        }

        vm.submitPlayerBonusStatus = function (proposal, status, remark) {
            vm.submitPlayerBonusProcess = 1;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'setBonusProposalStatus', {
                proposalId: proposal.proposalId,
                orderStatus: status,
                remark: remark
            }, function (data) {
                console.log('playerbonus data', data);
                vm.submitPlayerBonusProcess = 2;
                $scope.safeApply();
            }, function (error) {
                vm.submitPlayerBonusProcess = 3;
                console.log('playerbonus error', error);
                $scope.safeApply();
            })
        };


        vm.changeStatusToPendingFromAutoAudit = function () {
            socketService.$socket($scope.AppSocket, 'changeStatusToPendingFromAutoAudit', {
                proposalObjId: vm.selectedProposal._id,
                createTime: vm.selectedProposal.createTime
            }, function (data) {
                console.log("changeStatusToPendingFromAutoAudit", data);
                vm.changeStatusToPendingFromAutoAuditMessage = $translate("SUCCESS");
                $scope.safeApply();
                vm.loadProposalQueryData(true);
            }, function (error) {
                console.error(error);
                vm.changeStatusToPendingFromAutoAuditMessage = $translate("FAIL") + " - " + error.error.message;
                $scope.safeApply();
            })
        };

        vm.approveCsPendingAndChangeStatus = function () {
            socketService.$socket($scope.AppSocket, 'approveCsPendingAndChangeStatus', {
                proposalObjId: vm.selectedProposal._id,
                createTime: vm.selectedProposal.createTime,
                adminName: authService.adminName
            }, function (data) {
                vm.loadProposalQueryData(true);
            }, function (error) {
                console.log('error', error);
            })
        };

        ///////////////////////////////// approval proposal table
        // vm.loadApprovalProposalData = function (callback) {
        //     $('.proposalMessage > a > .fa').addClass('fa-spin fa-2x');
        //     socketService.$socket($scope.AppSocket, 'getApprovalProposalsForAdminId', {
        //         adminId: authService.adminId,
        //         platformId: vm.selectedPlatformID
        //     }, function (data) {
        //         vm.proposals = data.data;
        //         console.log("vm.proposals", vm.proposals);
        //         $(vm.spinning).removeClass('fa-spin fa-2x');
        //         $('.proposalMessage > a > .fa').removeClass('fa-spin fa-2x');
        //         console.log("Stop spinning!!!");
        //         $scope.safeApply(vm.drawProposalTable(vm.proposals));
        //         if (callback) {
        //             callback();
        //         }
        //     });
        // };

        // vm.approvalProposalClicked = function () {
        //     vm.blinkAllProposal = false;
        //     vm.rightPanelTitle = 'APPROVAL_PROPOSAL';
        //     // vm.loadApprovalProposalData();
        //     vm.loadProposalQueryData(true);
        // }

        // vm.OperationIntentionTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
        //     switch (aData.status) {
        //         case '1':
        //             $(nRow).addClass('bg-yellow');
        //             break;
        //         case '2':
        //             $(nRow).addClass('bg-pink');
        //             break;
        //         case '3':
        //             $(nRow).addClass('bg-green');
        //             break;
        //         case '4':
        //             $(nRow).addClass('bg-red');
        //             break;
        //     }
        // }
        vm.OperationProposalTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            switch (true) {
                case (aData.expirationTime$ < 0 && aData.status == "Pending" && vm.rightPanelTitle == 'APPROVAL_PROPOSAL'): {
                    $(nRow).css('background-color', 'rgba(135, 206, 250, 100)');
                    break;
                }
                case (aData.creditAmount$ >= 5000 && aData.creditAmount$ < 50000): {
                    $(nRow).css('background-color', 'rgba(255, 209, 202, 100)');
                    break;
                }
                case (aData.creditAmount$ >= 50000 && aData.creditAmount$ < 500000): {
                    $(nRow).css('background-color', 'rgba(236,100,75, 100)');
                    break;
                }
                case (aData.creditAmount$ >= 500000 && aData.creditAmount$ < 1000000): {
                    $(nRow).css('background-color', 'rgba(255, 184, 133, 100)');
                    break;
                }
                case (aData.creditAmount$ >= 1000000): {
                    $(nRow).css('background-color', 'rgba(188, 230, 114, 100)');
                    break;
                }
                default: {
                    $(nRow).css('background-color', 'rgba(255, 255, 255, 100)');
                    break;
                }
            }
        };

        ///////players panel///////////////////// start
        vm.getLoggedInPlayer = function (isContinue) {
            var sendData = {
                platform: vm.allPlatformId,
                noOfPlayers: isContinue ? vm.playerCountLimit : 20,
                name: vm.playerSearchText
            }
            if ($('#operPlayerList').next(".fa-spin").attr('isHidden') === false) {
                return;
            }
            $('#gettingOnlinePlayer').addClass('fa-spin');
            $('#operPlayerList').next(".fa-spin").show().attr('isHidden', false);
            socketService.$socket($scope.AppSocket, 'getLoggedInPlayers', sendData, function (data) {
                vm.loggedPlayers = data.data;
                vm.activePlayerDataPropertyList = [
                    {key: 'realName', func: vm.self},
                    {key: 'registrationTime', func: utilService.$getTimeFromStdTimeFormat},
                    {key: 'lastAccessTime', func: utilService.$getTimeFromStdTimeFormat},
                    {key: 'lastLoginIp', func: vm.self},
                    {key: 'topUpTimes', func: vm.self},
                ];
                $('#operPlayerList').next(".fa-spin").hide().attr('isHidden', true);
                $('#gettingOnlinePlayer').removeClass('fa-spin');
                utilService.setupPopover({
                    context: '#operPlayerList',
                    elem: '.list-group-item',
                    content: function () {
                        var data = JSON.parse(this.dataset.player);
                        vm.activePlayerData = data;
                        $scope.safeApply();
                        return $('#activePlayerPopover').html();
                    },
                    onClick: undefined,
                    callback: function () {
                        $("button.playerMessage").on('click', function () {
                            if (authService.checkViewPermission('Operation', 'Player', 'smsPlayer')) {
                                var data = JSON.parse(this.dataset.player);
                                // var message1 = 'will send message to ' + data.name;
                                // alert(message1);
                                vm.smsPlayer = {
                                    playerId: data.playerId,
                                    name: data.name,
                                    nickName: data.nickName,
                                    platformId: vm.selectedPlatform.platformId,
                                    channel: $scope.channelList[0],
                                    hasPhone: data.phoneNumber
                                }
                                vm.sendSMSResult = {};
                                $("#operPlayerList .list-group-item").popover('hide');
                                $scope.safeApply();
                                $('#smsPlayerModal').modal('show');
                            }
                        });
                        $("button.playerTelephone").on('click', function () {
                            var data = JSON.parse(this.dataset.player);
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
                                $('#phoneCallModal').modal('show');
                                $scope.safeApply();
                            }, true);
                            $("#operPlayerList .list-group-item").popover('hide');
                        });
                    }
                });
            });
        }
        vm.sendSMSToPlayer = function () {
            vm.sendSMSResult = {sent: "sending"};
            return $scope.sendSMSToPlayer(vm.smsPlayer, function (data) {
                vm.sendSMSResult = {sent: true, result: data.success};
                $scope.safeApply();
            });
        }
        vm.getLoggedInPlayerCount = function () {
            socketService.$socket($scope.AppSocket, 'getLoggedInPlayersCount', {platform: vm.allPlatformId}, function (data) {
                vm.loggedInPlayerCount = data.data;
            });
        }
        ///////players panel///////////////////// end

        var startX = 0;
        var startY = 0;
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
                $('#flowChart').height(350);
            }
            vm.chartViewModel.deselectAll();
            $scope.safeApply();
        };

        vm.addNodeFromStep = function (data) {
            var newNodeDataModel = {
                name: data.title,
                id: vm.chartData.nextNodeID++,
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
            if (vm.chartData.curStep == data.type) {
                newNodeDataModel.highlight = true;
            }
            newNode.select();

            startY += 150;
            if (startY >= 550) {
                $('#flowChart').height(startY + 50);
                //console.log('vm.chartViewModel',vm.chartViewModel);
                vm.chartViewModel.points[1].data.y = startY;
            } else {
                $('#flowChart').height(550);
            }
        };
        // code to draw proposal flowchart end =========================================================


        ///////////////////////////##initial data socket functions////////////////////////////
        vm.getAllPlatforms = function () {
            var deferred = Q.defer();

            // if (!authService.checkViewPermission('Operation', 'Proposal', 'Read')) {
            //     return;
            // }

            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                vm.platformList = data.data;
                console.log("vm.getAllPlatforms", data);
                if (vm.platformList.length == 0) {
                    return;
                }
                var storedPlatform = $cookies.get("platform");
                if (storedPlatform) {
                    vm.platformList.forEach(
                        platform => {
                            if (platform.name == storedPlatform) {
                                vm.selectedPlatform = platform;
                            }
                        }
                    );
                }
                if (!vm.selectedPlatform) {
                    var objAllPlatform = {_id: "_allPlatform"};
                    vm.selectedPlatform = objAllPlatform;
                }
                vm.selectedPlatformID = vm.selectedPlatform._id;
                vm.selectPlatform(vm.selectedPlatformID);
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        };

        vm.getProposalTypeByPlatformId = function (id) {
            var deferred = Q.defer();
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
                vm.allProposalType = data.data;
                // add index to data
                for (let x = 0; x < vm.allProposalType.length; x++) {
                    let groupName = utilService.getProposalGroupValue(vm.allProposalType[x],false);
                    switch (vm.allProposalType[x].name) {
                        case "AddPlayerRewardTask":
                            vm.allProposalType[x].seq = 3.01;
                            break;
                        case "PlayerLevelUp":
                            vm.allProposalType[x].seq = 3.02;
                            break;
                        case "PlayerPromoCodeReward":
                            vm.allProposalType[x].seq = 3.03;
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
                    if(!vm.allProposalType[x].seq) {
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
                    if(groupName.toLowerCase() == "omit") {
                        vm.allProposalType.splice(x,1);
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
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });
            return deferred.promise;
        };

        // vm.getProposalTypeByPlatformId = function (allPlatformId) {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: allPlatformId}, function (data) {
        //         vm.allProposalType = data.data;
        //         vm.allProposalType.sort(
        //             function (a, b) {
        //                 if (vm.getProposalTypeOptionValue(a) > vm.getProposalTypeOptionValue(b)) return 1;
        //                 if (vm.getProposalTypeOptionValue(a) < vm.getProposalTypeOptionValue(b)) return -1;
        //                 return 0;
        //             }
        //         );
        //         console.log("vm.allProposalType:", vm.allProposalType);
        //         $scope.safeApply();
        //         deferred.resolve(true);
        //     }, function (error) {
        //         deferred.reject(error);
        //     });
        //
        //     return deferred.promise;
        // };

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

        vm.getProposalTypeOptionValue = function (proposalType) {
            var result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };

        // vm.getProposalEntryTypeList = function () {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getProposalEntryTypeList', {}, function (data) {
        //         vm.proposalEntryTypeList = {};
        //         for (var key in data.data) {
        //             vm.proposalEntryTypeList[data.data[key]] = "ENTRY_TYPE_" + key;
        //         }
        //         console.log('vm.proposalEntryTypeList', vm.proposalEntryTypeList);
        //         deferred.resolve(true);
        //     }, function (error) {
        //         deferred.reject(error);
        //     });
        //
        //     return deferred.promise;
        // };

        // vm.getProposalPriorityList = function () {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getProposalPriorityList', {}, function (data) {
        //         vm.proposalPriorityList = {};
        //         for (var key in data.data) {
        //             vm.proposalPriorityList[data.data[key]] = key;
        //         }
        //         console.log('vm.proposalPriorityList', vm.proposalPriorityList);
        //         deferred.resolve(true);
        //     }, function (error) {
        //         deferred.reject(error);
        //     });
        //
        //     return deferred.promise;
        // };

        // vm.getProposalUserTypeList = function () {
        //     var deferred = Q.defer();
        //
        //     socketService.$socket($scope.AppSocket, 'getProposalUserTypeList', {}, function (data) {
        //         vm.proposalUserTypeList = {};
        //         for (var key in data.data) {
        //             vm.proposalUserTypeList[data.data[key]] = key;
        //         }
        //         console.log('vm.proposalUserTypeList', vm.proposalUserTypeList);
        //         deferred.resolve(true);
        //     }, function (error) {
        //         deferred.reject(error);
        //     });
        //
        //     return deferred.promise;
        // };

        // vm.getAllProposalStatus = function () {
        //
        //     var deferred = Q.defer();
        //     socketService.$socket($scope.AppSocket, 'getAllProposalStatus', {}, function (data, callback) {
        //         delete data.data.APPROVED;
        //         delete data.data.REJECTED;
        //         //delete data.data.PROCESSING;
        //         vm.proposalStatusList = data.data;
        //         console.log('vm.getAllProposalStatus:', vm.proposalStatusList);
        //         deferred.resolve(true);
        //         //$scope.safeApply();
        //         if (callback) {
        //             callback();
        //         }
        //     }, function (error) {
        //         deferred.reject(error);
        //         //console.log("getAllProposalStatus:error", error);
        //     });
        //     return deferred.promise;
        // }


        vm.updateProposalData = function () {
            //vm.loadProposalData(function () {
            var str = JSON.stringify(vm.proposals);
            if (!vm.allProposalString) {
                vm.allProposalString = str;
                vm.blinkAllProposal = false;
            } else if (vm.allProposalString != str) {
                vm.allProposalString = str;
                // vm.drawProposalTable(vm.proposals);
                vm.blinkAllProposal = true;
                $("#proposalDataTableDiv .newProposalAlert").text('New proposal coming');
            }
            $scope.safeApply()
            //});
        };

        // vm.updateTopupIntentionData = function () {
        //     vm.getTopupIntentionData(function () {
        //         var str = JSON.stringify(vm.allTopupAccount);
        //         if (!vm.allTopUpIntentionString) {
        //             vm.allTopUpIntentionString = str;
        //             vm.blinkTopUp = false;
        //         } else if (vm.allTopUpIntentionString != str) {
        //             vm.allTopUpIntentionString = str;
        //             // vm.drawTopupMonitorTable(vm.allTopupAccount);
        //             $("#topupMonitorTableDiv .newProposalAlert").text('New intention coming');
        //             vm.blinkTopUp = true;
        //         }
        //     });
        // };

        // vm.updateNewAccountProposal = function () {
        //     vm.getNewAccountProposal().done(function () {
        //         var str = JSON.stringify(vm.allNewAccount);
        //         if (!vm.allNewAccountString) {
        //             vm.allNewAccountString = str;
        //             vm.blinkNewAccount = false;
        //         } else if (vm.allNewAccountString != str) {
        //             vm.allNewAccountString = str;
        //             // vm.drawRegistrationMonitorTable(vm.allNewAccount);
        //             $("#registrationMonitorTableDiv .newProposalAlert").text('New intention coming');
        //             vm.blinkNewAccount = true;
        //         }
        //     });
        // };

        ///////////////////////////##Mark content loaded function////////////////////////////
        vm.dateReformat = function (data) {
            //if (!data) return '';
            //return new Date(data).toLocaleString();
            return utilService.$getTimeFromStdTimeFormat(data);
        };
        vm.self = function (data) {
            return data;
        }
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

        var firstTopUpPeriodTypeJson = {
            '0': "First Time",
            '1': "Weekly",
            '2': "Monthly"
        }
        vm.getProviderText = function (item) {
            var result = '';
            $.each(vm.allGameProviderById, (i, v) => {
                if (v && (v._id == item || v.provierId == item)) {
                    result = v.name;
                    return false;
                }
            })
            return result;
        };

        function loadPlatform () {
            vm.blinkAllProposal = false;
            vm.blinkNewAccount = false;
            vm.blinkTopUp = false;
            vm.showOperationList = true;
            vm.needRefreshTable = false;
            vm.allBankTypeList = {};
            vm.queryProposal = {};
            vm.queryAuditProposal = {};
            //todo::check why need to use timeOut here
            vm.proposalTypeIdtoText = {};
            $.fn.dataTable.ext.search = [];
            vm.rightPanelTitle = $translate('ALL_PROPOSAL');
            vm.chartViewModel = new flowchart.ChartViewModel();

            utilService.actionAfterLoaded('#operPlayerList', function () {
                $("#operPlayerList").off('scroll');
                $("#operPlayerList").scroll(function () {
                    var scrll = $("#operPlayerList").scrollTop();
                    var height = $("#operPlayerList").prop('scrollHeight');
                    var wheight = $("#operPlayerList").height();
                    if (height - scrll - wheight < 50) {
                        vm.playerCountLimit += 20;
                        if (vm.loggedInPlayerCount && vm.loggedPlayers.length < vm.loggedInPlayerCount) {
                            vm.getLoggedInPlayer(true);
                        } else {
                            vm.playerCountLimit = vm.loggedInPlayerCount;
                        }
                    }
                });
            });

            $scope.$evalAsync(() => {
                utilService.actionAfterLoaded("#proposalDataTablePage", function () {
                    vm.queryProposal.pageObj = utilService.createPageForPagingTable("#proposalDataTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "queryProposal", vm.loadProposalQueryData)
                    });
                });
            });
            // setTimeout(function () {
            //     utilService.actionAfterLoaded("#proposalDataTablePage", function () {
            //         vm.queryProposal.pageObj = utilService.createPageForPagingTable("#proposalDataTablePage", {}, $translate, function (curP, pageSize) {
            //             vm.commonPageChangeHandler(curP, pageSize, "queryProposal", vm.loadProposalQueryData)
            //         });
            //     });
            // }, 0);

            $scope.$evalAsync(() => {
                utilService.actionAfterLoaded("#proposalAuditDataTablePage", function () {
                    vm.queryAuditProposal.pageObj = utilService.createPageForPagingTable("#proposalAuditDataTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "queryAuditProposal", vm.loadProposalAuditQueryData)
                    });
                });
            })

            // // for some reason, the pagination wont translate when it does not put inside setTimeout
            // setTimeout(function() {
            //     utilService.actionAfterLoaded("#proposalAuditDataTablePage", function () {
            //         vm.queryAuditProposal.pageObj = utilService.createPageForPagingTable("#proposalAuditDataTablePage", {}, $translate, function (curP, pageSize) {
            //             vm.commonPageChangeHandler(curP, pageSize, "queryAuditProposal", vm.loadProposalAuditQueryData)
            //         });
            //     });
            // }, 0);


            // Q.all([vm.getAllPlatforms(), vm.getProposalEntryTypeList(), vm.getProposalPriorityList(),
            //     vm.getProposalUserTypeList(), vm.getAllProposalStatus()])
            Q.all([vm.getAllPlatforms()])
            //removed vm.getPlayerTopUpIntentRecordStatusList()
                .then(
                    function (data) {
                        //todo::refactor the process here
                        socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                            if (data && data.data && data.data.data) {
                                console.log('banktype', data.data.data);
                                data.data.data.forEach(item => {
                                    if (item && item.bankTypeId) {
                                        vm.allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                                    }
                                })
                            }
                            // $scope.safeApply();
                        });

                        // socketService.$socket($scope.AppSocket, 'getDepositMethodList', {}, function (data) {
                        //     console.log("vm.depositMethodList", data.data);
                        //     vm.depositMethodList = data.data;
                        //     vm.getDepositMethodbyId = {};
                        //     $.each(data.data, function (i, v) {
                        //         vm.getDepositMethodbyId[v] = i;
                        //     })
                        //     // $scope.safeApply();
                        // });
                        socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                            vm.allGameProviderById = {};
                            data.data.map(item => {
                                vm.allGameProviderById[item._id] = item;
                            });
                            console.log("vm.allGameProviderById", vm.allGameProviderById);
                            // $scope.safeApply();
                        }, function (data) {
                        });

                    },
                    function (error) {
                    }
                ).then(
                function (data) {
                    // vm.updateProposalData();
                    $scope.AppSocket.removeAllListeners('notifyNewProposal');
                    $scope.AppSocket.on('notifyNewProposal', function (message) {
                        console.log("notifyNewProposal event", message);
                        vm.newProposalNum++;
                        vm.updateProposalData();
                    });
                    var showLeft = $cookies.get("operationShowLeft");
                    if (showLeft === 'true') {
                        vm.toggleShowOperationList(true);
                    }
                    else {
                        vm.toggleShowOperationList(false);
                    }
                    vm.initQueryPara();
                }
            );

            var blinkFreq = 600;
            setInterval(function () {
                if (vm.blinkAllProposal) {
                    $('#operPlatform a.list-group-item[href="#proposalDataTableDiv"] .badge').fadeOut(blinkFreq / 2).fadeIn(blinkFreq / 2);
                }
            }, blinkFreq);
            var countDown = -1;
            clearInterval(vm.refreshInterval);
            vm.refreshInterval = setInterval(function () {
                var item = $('#autoRefreshProposalFlag');
                var isRefresh = item && item.length > 0 && item[0].checked;
                var mark = $('.timeLeftRefreshOperation');
                $(mark).parent().toggleClass('hidden', countDown < 0);
                if (isRefresh) {
                    if (countDown < 0) {
                        countDown = 11
                    }
                    if (countDown == 0) {
                        if (vm.rightPanelTitle === 'ALL_PROPOSAL') vm.loadProposalQueryData();
                        if (vm.rightPanelTitle === 'APPROVAL_PROPOSAL') vm.loadProposalAuditQueryData();
                        countDown = 11;
                    }
                    if (window.location.pathname != '/operation') {
                        clearInterval(vm.refreshInterval);
                    }
                    countDown--;
                    mark.text(countDown);
                } else {
                    if (window.location.pathname != '/operation') {
                        clearInterval(vm.refreshInterval);
                    }

                    countDown = -1;
                }
            }, 1000);
        }

        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'operationControllerLoaded');
        }

        $scope.$on(eventName, function (e, d) {
            $scope.$evalAsync(loadPlatform());
        });

        $scope.$on('switchPlatform', function (e, d) {
            $scope.$evalAsync(loadPlatform());
        });

        $scope.$on('$destroy', function () {
            // clearInterval(vm.intentionInterval);
            $scope.AppSocket.removeAllListeners('notifyNewProposal');
            // $scope.AppSocket.removeAllListeners('notifyTopUpIntentionUpdate');
            // $scope.AppSocket.removeAllListeners('notifyRegistrationIntentionUpdate');
        })
    };

    operationController.$inject = injectParams;

    myApp.register.controller('operationCtrl', operationController);

});
