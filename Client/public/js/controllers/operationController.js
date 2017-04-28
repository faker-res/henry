'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', '$translate', 'CONFIG', "$cookies"];

    var operationController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, $translate, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;

        vm.newProposalNum = 0;
        var allProposalStatusClr = {
            Pending: 'colorYellow',
            Approved: 'colorLimegreen',
            Success: 'colorGreen',
            Fail: 'colorRed',
            Rejected: 'colorRed'
        }
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
            $scope.safeApply();
        }

        ///////////////////////////////////Proposal related functions///////////////////////////////////
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
            vm.allTopUpIntentionString = null;
            vm.allNewAccountString = null;
            vm.allProposalString = null;
            // vm.getPlayerTopUpIntentRecordStatusList();
            // vm.getNewAccountProposal().done();
            vm.getProposalTypeByPlatformId(vm.allPlatformId).then(
                function (data) {
                    $('select#selectProposalType').multipleSelect({
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
                    var $multi = ($('select#selectProposalType').next().find('.ms-choice'))[0];
                    $('select#selectProposalType').next().on('click', 'li input[type=checkbox]', function () {
                        var upText = $($multi).text().split(',').map(item => {
                            return $translate(item);
                        }).join(',');
                        $($multi).find('span').text(upText)
                    });
                    $("select#selectProposalType").multipleSelect("checkAll");
                    vm.proposalTypeClicked("total");
                    // vm.allProposalClicked();
                }
            );
            $scope.safeApply();

        }
        vm.proposalTypeClicked = function (i, v) {
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
            } else if (i == 'approval') {
                vm.rightPanelTitle = 'APPROVAL_PROPOSAL';
                vm.showProposalIndicator = {};
                vm.multiProposalSelected = [];
            }
            vm.loadProposalQueryData(true);
            $scope.safeApply();
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
                var te = $("#proposalDataTableDiv #search .inlineBlk").not(":nth-child(1)").find(".form-control");
                te.prop("disabled", true).css("background-color", "#eee");
                te.find("input").prop("disabled", true).css("background-color", "#eee")
                te.find(".ms-choice").prop("disabled", true).css("background-color", "#eee")
            } else {
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control").prop("disabled", false).css("background-color", "#fff");
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control input").prop("disabled", false).css("background-color", "#fff");
                $("#proposalDataTableDiv #search .inlineBlk").find(".form-control .ms-choice").prop("disabled", false).css("background-color", "transparent")
            }
        }
        vm.getOneProposal = function (callback) {
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
        }
        vm.setDateRange = function (option) {
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
            }
            $("#datetimepicker").data('datetimepicker').setLocalDate(startDate);
            $("#datetimepicker2").data('datetimepicker').setLocalDate(utilService.getTodayEndTime());
            vm.loadProposalQueryData(true);
        }
        vm.loadProposalQueryData = function (newSearch, callback) {
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
            var startTime = $('#datetimepicker').data('datetimepicker');
            var endTime = $('#datetimepicker2').data('datetimepicker');
            var newEndTime = endTime.getLocalDate();

            var sendData = {
                adminId: authService.adminId,
                platformId: vm.allPlatformId,
                type: vm.proposalTypeSelected,
                startDate: startTime.getLocalDate(),
                endDate: newEndTime,
                relateUser: vm.queryProposalRelatedUser,
                entryType: vm.queryProposalEntryType,
                size: newSearch ? 10 : (vm.queryProposal.limit || 10),
                index: newSearch ? 0 : (vm.queryProposal.index || 0),
                sortCol: vm.queryProposal.sortCol
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
            var queryString = vm.rightPanelTitle == "APPROVAL_PROPOSAL" ? 'getQueryApprovalProposalsForAdminId' : 'getQueryProposalsForAdminId';
            socketService.$socket($scope.AppSocket, queryString, sendData, function (data) {
                console.log('proposal allData', data);
                vm.proposals = data.data.data;
                $('.proposalMessage > a > .fa').removeClass('fa-spin');
                $('.proposalMessage').next().show();
                // vm.proposalTable.destroy();
                vm.queryProposal.totalCount = data.data.size;
                vm.drawProposalTable(vm.proposals, data.data.size, data.data.summary, newSearch);
                $scope.safeApply();
                // vm.proposalTable.draw();
                // if (callback) {
                //     callback();
                // }
            });
        }
        vm.initQueryPara = function () {
            utilService.actionAfterLoaded($('#datetimepicker2'), function () {
                $('select#selectProposalStatus').multipleSelect({
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
                $("select#selectProposalStatus").multipleSelect("checkAll");

                $('#datetimepicker').datetimepicker({
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss',
                });
                var lastMonth = utilService.setNDaysAgo(new Date(), 1);
                var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
                vm.queryProposalstartTime = $("#datetimepicker").data('datetimepicker').setLocalDate(lastMonthDateStartTime);

                $('#datetimepicker2').datetimepicker({
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss',
                });
                vm.queryProposalendTime = $('#datetimepicker2').data('datetimepicker').setLocalDate(utilService.getTodayEndTime());
            })
        }
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
            vm.proposalTypeSelected = $('select#selectProposalType').multipleSelect("getSelects")
            // .map(a => {
            //     return a.substring(7);
            // });
            // if (vm.allProposalType) {
            //     vm.allProposalTypeTranslate = vm.allProposalType.map((a, b) => {
            //         return $translate(a.name);
            //     });
            // }
            // if (vm.proposalTable) {
            //     vm.proposalTable.draw();
            // }
        }
        vm.proposalStatusUpdated = function () {
            vm.proposalStatusSelected = $('select#selectProposalStatus').multipleSelect("getSelects");
            vm.proposalStatusSelectedTrans = vm.proposalStatusSelected.map(a => {
                return $translate(a);
            });
            if (vm.proposalTable) {
                vm.proposalTable.draw();
            }
        }

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
            } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                result = utilService.getFormatTime(val);
            } else if (fieldName == 'bankAccountType') {
                if (val == 1 || val == '1') {
                    return $translate('Credit Card');
                } else if (val == 2 || val == '2') {
                    return $translate('Debit Card');
                } else {
                    return val;
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
            } else if (typeof(val) == 'object') {
                result = JSON.stringify(val);
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
                delayTime: parseInt((nowDate.getTime() + 24 * 3600000 - oldDate.getTime()) / 60000)
            }
            socketService.$socket($scope.AppSocket, 'delayManualTopupRequest', sendData, function (data) {
                console.log("update data", data);
                vm.selectedProposal.status = 'Pending';
                $scope.safeApply();
                if (callback) {
                    callback(data.data);
                }
            });
        }

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
                    v.mainType$ = $translate(v.mainType);
                    v.priority$ = $translate(v.data.proposalPlayerLevel ? v.data.proposalPlayerLevel : "Normal");
                    v.playerStatus$ = v.data.playerStatus;
                    v.entryType$ = $translate(vm.proposalEntryTypeList[v.entryType]);
                    v.userType$ = $translate(v.userType ? vm.proposalUserTypeList[v.userType] : "");
                    v.createTime$ = utilService.getFormatTime(v.createTime).substring(5);
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
                    v.playerLevel$ = v.data.playerLevelName ? $translate(v.data.playerLevelName) : '';
                    tableData.push(v);
                }
            })
            var tableOptions = {
                data: tableData,
                deferRender: true,
                "bProcessing": true,
                bDeferRender: true,
                // filterProposalType: true,
                "aaSorting": vm.queryProposal.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [1]},
                    {'sortCol': 'relatedAmount', bSortable: true, 'aTargets': [7]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [13]},
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
                        "title": $translate('MAIN_TYPE'),
                        "data": "mainType$",
                        "sClass": "alignLeft"
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
                        "data": 'createTime$',
                        bSortable: true
                    },
                    {
                        "title": $translate('REMARK'),
                        data: "remark$",
                        sClass: "maxWidth100 wordWrap",
                        visible: vm.rightPanelTitle == "APPROVAL_PROPOSAL"
                    }
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
            vm.proposalTable = utilService.createDatatableWithFooter('#proposalDataTable', tableOptions, {8: (summary ? summary.amount : 0)});
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
            $scope.safeApply();
        };

        vm.updateMultiselectProposal = function () {
            var allClicked = $("#proposalDataTable tr input:checked[type='checkbox']");
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
            var checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
            for (var i in proposalDetail) {
                //remove objectIDs
                if (checkForHexRegExp.test(proposalDetail[i])) {
                    delete proposalDetail[i];
                }
                if (i == 'providers') {
                    var temp = [];
                    proposalDetail.providers.map(item => {
                        temp.push(item.name);
                    });
                    proposalDetail.providers = temp;
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
            // delete vm.selectedProposalDetailForDisplay.remark;
            function canCancelProposal(proposal) {
                if (!proposal || vm.rightPanelTitle == "APPROVAL_PROPOSAL")return false;
                var creatorId = (proposal && proposal.creator) ? proposal.creator.id : '';
                var proposalStatus = proposal.status || proposal.process.status;
                return (creatorId == authService.adminId) && (proposalStatus == "Pending");
            }

            vm.selectedProposal.showCancel = canCancelProposal(vm.selectedProposal);
            $scope.safeApply();
            //console.log(data);
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
        }

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
                case (aData.creditAmount$ >= 5000 && aData.creditAmount$ < 50000): {
                    $(nRow).css('background-color', 'rgba(255, 209, 202, 100)');
                    break;
                }
                case (aData.creditAmount$ >= 50000 && aData.creditAmount$ < 500000): {
                    $(nRow).css('background-color', 'rgba(195, 39, 43, 100)');
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
                platform: vm.selectedPlatform._id,
                noOfPlayers: isContinue ? vm.playerCountLimit : 20,
                name: vm.playerSearchText
            }
            if ($('#operPlayerList').next(".fa-spin").attr('isHidden') === false) {
                return;
            }
            $('#gettingOnlinePlayer').addClass('fa-spin');
            $('#operPlayerList').next(".fa-spin").show().attr('isHidden', false);
            socketService.$socket($scope.AppSocket, 'getLoggedInPlayers', sendData, function (data) {
                console.log(data);
                vm.loggedPlayers = data.data;
                vm.activePlayerDataPropertyList = [
                    {key: 'realName', func: vm.self},
                    {key: 'registrationTime', func: utilService.$getTimeFromStdTimeFormat},
                    {key: 'lastAccessTime', func: utilService.$getTimeFromStdTimeFormat},
                    {key: 'lastLoginIp', func: vm.self},
                    {key: 'topUpTimes', func: vm.self},
                ];
                $scope.safeApply();
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
                console.log("getLoggedInPlayerCount", data.data);
                vm.loggedInPlayerCount = data.data;
                $scope.safeApply();
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

        vm.getProposalTypeByPlatformId = function (allPlatformId) {
            var deferred = Q.defer();

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
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        vm.getProposalTypeOptionValue = function (proposalType) {
            var result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };

        vm.getProposalEntryTypeList = function () {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getProposalEntryTypeList', {}, function (data) {
                vm.proposalEntryTypeList = {};
                for (var key in data.data) {
                    vm.proposalEntryTypeList[data.data[key]] = "ENTRY_TYPE_" + key;
                }
                console.log('vm.proposalEntryTypeList', vm.proposalEntryTypeList);
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        vm.getProposalPriorityList = function () {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getProposalPriorityList', {}, function (data) {
                vm.proposalPriorityList = {};
                for (var key in data.data) {
                    vm.proposalPriorityList[data.data[key]] = key;
                }
                console.log('vm.proposalPriorityList', vm.proposalPriorityList);
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        vm.getProposalUserTypeList = function () {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getProposalUserTypeList', {}, function (data) {
                vm.proposalUserTypeList = {};
                for (var key in data.data) {
                    vm.proposalUserTypeList[data.data[key]] = key;
                }
                console.log('vm.proposalUserTypeList', vm.proposalUserTypeList);
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        vm.getAllProposalStatus = function () {

            var deferred = Q.defer();
            socketService.$socket($scope.AppSocket, 'getAllProposalStatus', {}, function (data, callback) {
                delete data.data.APPROVED;
                delete data.data.REJECTED;
                //delete data.data.PROCESSING;
                vm.proposalStatusList = data.data;
                console.log('vm.getAllProposalStatus:', vm.proposalStatusList);
                deferred.resolve(true);
                //$scope.safeApply();
                if (callback) {
                    callback();
                }
            }, function (error) {
                deferred.reject(error);
                //console.log("getAllProposalStatus:error", error);
            });
            return deferred.promise;
        }


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
        }

        $scope.$on('$viewContentLoaded', function () {
            setTimeout(
                function () {
                    vm.blinkAllProposal = false;
                    vm.blinkNewAccount = false;
                    vm.blinkTopUp = false;
                    vm.showOperationList = true;
                    vm.needRefreshTable = false;
                    vm.allBankTypeList = {};
                    vm.queryProposal = {};
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

                    utilService.actionAfterLoaded("#proposalDataTablePage", function () {
                        vm.queryProposal.pageObj = utilService.createPageForPagingTable("#proposalDataTablePage", {}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "queryProposal", vm.loadProposalQueryData)
                        });
                    });

                    Q.all([vm.getAllPlatforms(), vm.getProposalEntryTypeList(), vm.getProposalPriorityList(),
                        vm.getProposalUserTypeList(), vm.getAllProposalStatus()])
                    //removed vm.getPlayerTopUpIntentRecordStatusList()
                        .then(
                            function (data) {
                                //todo::refactor the process here
                                socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                                    if (data && data.data && data.data.data) {
                                        console.log('banktype', data.data.data);
                                        data.data.data.forEach(item => {
                                            if (item && item.bankTypeId) {
                                                vm.allBankTypeList[item.id] = item.name + ' (' + item.bankTypeId + ')';
                                            }
                                        })
                                    }
                                    // $scope.safeApply();
                                })

                                socketService.$socket($scope.AppSocket, 'getDepositMethodList', {}, function (data) {
                                    console.log("vm.depositMethodList", data.data);
                                    vm.depositMethodList = data.data;
                                    vm.getDepositMethodbyId = {};
                                    $.each(data.data, function (i, v) {
                                        vm.getDepositMethodbyId[v] = i;
                                    })
                                    // $scope.safeApply();
                                })
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
                            if (showLeft === 'false') {
                                vm.toggleShowOperationList(false)
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
                    var a = setInterval(function () {
                        var item = $('#autoRefreshProposalFlag');
                        var isRefresh = item && item.length > 0 && item[0].checked;
                        var mark = $('#timeLeftRefreshOperation')[0];
                        $(mark).parent().toggleClass('hidden', countDown < 0);
                        if (isRefresh) {
                            if (countDown < 0) {
                                countDown = 11
                            }
                            if (countDown == 0) {
                                vm.loadProposalQueryData();
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
