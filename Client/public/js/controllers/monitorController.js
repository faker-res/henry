'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies"];
    let monitorController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies) {
        let $translate = $filter('translate');
        let vm = this;

        window.monitorVM = vm;

        // declare constant
        vm.proposalStatusList = {
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
        vm.getDepositMethodbyId = {
            1: 'Online',
            2: 'ATM',
            3: 'Counter'
        };

        vm.seleDataType = {};

        vm.setPlatform = function (platObj) {
            vm.operSelPlatform = false;
            vm.selectedPlatform = JSON.parse(platObj);
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getProposalTypeByPlatformId(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage(vm.showPageName); // 5
            $scope.safeApply();
        };

        vm.setPlatformById = function (id) {
            let platObj = vm.platformList.filter(p => p._id === id)[0];
            console.log("platObj:", platObj);
            vm.showPageName = '';
            vm.setPlatform(JSON.stringify(platObj));
            $scope.safeApply();
        };

        vm.getPlatformByAdminId = function (adminId) {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: adminId}, function (data) {
                    vm.platformList = data.data;
                    console.log("platformList", vm.platformList);
                    $scope.safeApply();
                    resolve();
                }, function (err) {
                    console.error(err);
                    resolve();
                });
            });
        };

        vm.selectStoredPlatform = function () {
            if (vm.platformList.length === 0) return;
            let storedPlatform = $cookies.get("platform");
            let selectedPlatform = {};

            if (storedPlatform) {
                vm.platformList.forEach(
                    platform => {
                        if (platform.name === storedPlatform) {
                            selectedPlatform = platform;
                        }
                    }
                );
            } else {
                selectedPlatform = vm.platformList[0];
            }

            vm.selectedPlatform = selectedPlatform;
            vm.selectedPlatformID = selectedPlatform._id;
            vm.setPlatform(JSON.stringify(selectedPlatform));
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

        vm.loadPage = function (choice) {
            socketService.clearValue();
            vm.seleDataType[choice] = 'bg-bright';

            switch (choice) {
                case 'PAYMENT_MONITOR':
                    vm.pageName = "Payment Monitor";
                    vm.preparePaymentMonitorPage();
                    break;
                default:
                    // keeping this format just in case there will be other monitoring coming in
            }
        };

        vm.preparePaymentMonitorPage = function () {
            vm.lastTopUpRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.paymentMonitorQuery = {};
            vm.paymentMonitorQuery.totalCount = 0;
            Promise.all([getMerchantList(), getMerchantTypeList()]).then(
                data => {
                    vm.merchants = data[0];
                    vm.merchantTypes = data[1];

                    vm.merchantGroups = getMerchantGroups(vm.merchants, vm.merchantTypes);
                    vm.merchantNumbers = getMerchantNumbers(vm.merchants);
                    vm.getPaymentMonitorRecord();
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

        // TODO:: work in progress
        vm.getPaymentMonitorRecord = function (isNewSearch) {
            if (isNewSearch) {
                $('#autoRefreshProposalFlag').attr('checked', false);
            }
            vm.paymentMonitorQuery.platformId = vm.curPlatformId;
            $('#paymentMonitorTableSpin').show();

            if (vm.paymentMonitorQuery.mainTopupType === '0' || vm.paymentMonitorQuery.mainTopupType === '1' || vm.paymentMonitorQuery.mainTopupType === '3' || vm.paymentMonitorQuery.mainTopupType === '4' || vm.paymentMonitorQuery.mainTopupType === '5') {
                vm.paymentMonitorQuery.topupType = '';
                vm.paymentMonitorQuery.merchantGroup = '';
                vm.paymentMonitorQuery.merchantNo = '';
            }

            let sendObj = {
                startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),
                platformId: vm.paymentMonitorQuery.platformId,
                mainTopupType: vm.paymentMonitorQuery.mainTopupType,
                topupType: vm.paymentMonitorQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
                playerName: vm.paymentMonitorQuery.playerName,
                index: isNewSearch ? 0 : (vm.paymentMonitorQuery.index || 0),
                limit: vm.paymentMonitorQuery.limit || 10,
                sortCol: vm.paymentMonitorQuery.sortCol
            };

            vm.paymentMonitorQuery.merchantNo ? sendObj.merchantNo = vm.paymentMonitorQuery.merchantNo : null;
            console.log('sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'getPaymentMonitorResult', sendObj, function (data) {
                $('#paymentMonitorTableSpin').hide();
                console.log('Payment Monitor Result', data);
                vm.paymentMonitorQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawPaymentRecordTable(
                    data.data.data.map(item => {
                        item.amount$ = parseFloat(item.data.amount).toFixed(2);
                        item.proposalId$ = item.proposalId.slice(-3);
                        
                        item.merchantNo$ = item.data.merchantNo != null
                            ? item.data.merchantNo
                            : item.data.weChatAccount != null
                                ? item.data.weChatAccount
                                : item.data.alipayAccount != null
                                    ? item.data.alipayAccount
                                    : item.data.bankCardNo != null
                                        ? item.data.bankCardNo
                                        : null;

                        item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                        item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                        item.status$ = $translate(item.status);
                        item.merchantName = vm.merchantNumbers[item.data.merchantNo];
                        if (item.type.name == 'PlayerTopUp') {
                            //show detail topup type info for online topup.
                            let typeID = item.data.topUpType || item.data.topupType;
                            item.topupTypeStr = typeID
                                ? $translate(vm.topUpTypeList[typeID])
                                : $translate("Unknown")
                        } else {
                            //show topup type for other types
                            item.topupTypeStr = $translate(item.type.name)
                        }
                        item.startTime$ = utilService.$getTimeFromStdTimeFormat(new Date(item.createTime));
                        item.endTime$ = item.data.lastSettleTime ? utilService.$getTimeFromStdTimeFormat(item.data.lastSettleTime) : "-";

                        return item;
                    }), data.data.size, {}, isNewSearch
                );
            }, function (err) {
                console.error(err);
            }, true);

        };

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

        vm.drawPaymentRecordTable  = function (data, size, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorQuery.aaSorting || [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [8]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        title: $translate('proposalId'),
                        data: 'proposalId$',
                        render: function (data, type, row) {
                            let $link = $('<a>').text(data);
                            // $link.attr('onclick', 'monitorVM.showProposalDetail('+row.proposalId+')');
                            return $link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TYPE'),
                        data: "type",
                        sClass:'merchantCount',
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('topupType'),
                        data: "data.topupType",
                        sClass:'merchantCount',
                        render: function (data, type, row) {
                            let text = ($translate($scope.merchantTopupTypeJson[data])) ? $translate($scope.merchantTopupTypeJson[data]) : "";
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Merchant'),
                        data: "merchantName",
                        sClass:'merchantCount'
                    },
                    {
                        title: $translate('Merchant No'),
                        data: "merchantNo$",
                        sClass:'merchantCount'
                    },
                    {
                        title: $translate('merchantCount'),
                        data: "merchantCount$",
                        sClass:'merchantCount'
                    },
                    {
                        title: $translate('STATUS'),
                        data: "status$"
                    },
                    {
                        title:
                        $translate('PLAYER_NAME'),
                        data: "data.playerName",
                        sClass:'playerCount'
                    },
                    {
                        title: $translate('realName'),
                        data: "data.playerObjId.realName",
                        sClass: "sumText playerCount"
                    },
                    {
                        title: $translate('playerCount'),
                        data: "playerCount$",
                        sClass:'playerCount'
                    },
                    {
                        title: $translate('CREDIT'),
                        data: "amount$",
                        sClass: "sumFloat alignRight"
                    },
                    {
                        title: $translate('START_TIME'),
                        data: "startTime$"
                    },
                    {
                        title: $translate('END_TIME'),
                        data: "endTime$"
                    }
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    // to allow customization, turn these numbers to variable
                    if (aData.$merchantAllCount >= (vm.selectedPlatform.monitorMerchantCount || 10)) {
                        $(nRow).addClass('merchantExceed');
                    }

                    if (aData.$playerAllCount >= (vm.selectedPlatform.monitorPlayerCount || 4)) {
                        $(nRow).addClass('playerExceed');
                    }
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

        vm.tableRowClicked = function (event) {
            if (event.target.tagName == 'A') {
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
                socketService.$socket($scope.AppSocket, 'getFullProposalProcess', {_id: vm.selectedProposal.process._id}, function processSuccess(data){
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
                    if( proposalDetail.providers ){
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
            } else if (fieldName === 'bankAccountType') {
                switch(parseInt(val)) {
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
                socketService.$socket($scope.AppSocket, 'getMerchantList', {platformId: vm.selectedPlatform.platformId}, function (data) {
                    if (data.data && data.data.merchants) {
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
                if (item.status !== 'DISABLED') {
                    merchantGroupList[item.merchantTypeId] = merchantGroupList[item.merchantTypeId] || {list: []};
                    merchantGroupList[item.merchantTypeId].list.push(item.merchantNo);
                }
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



        $scope.$on('$viewContentLoaded', function () {
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};

            setTimeout(function () {
                vm.getPlatformByAdminId(authService.adminId).then(vm.selectStoredPlatform);
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
                        if (countDown == 0) {
                            vm.getPaymentMonitorRecord();
                            countDown = 11;
                        }
                        countDown--;
                        $(mark).text(countDown);
                    } else {
                        countDown = -1;
                    }
                }, 1000);
            });
        });
    };

    monitorController.$inject = injectParams;

    myApp.register.controller('monitorCtrl', monitorController);
});