'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", "$state"];
    let monitorProposalAndPaymentController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies, $state) {
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let vm = this;

        window.mPVM = vm;

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

        vm.setPlatform = function () {
            vm.selectedPlatform = $scope.$parent.vm.selectedPlatform;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            vm.getPlatformProvider(vm.selectedPlatform._id);
            vm.getPlayerLevelByPlatformId(vm.selectedPlatform._id);
            vm.getRewardList();
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage(vm.showPageName); // 5
            vm.getProposalTypeByPlatformId([vm.curPlatformId]);
            // $scope.safeApply();
        };

        vm.getProposalTypeByPlatformId = function (allPlatformId) {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {
                platformId: allPlatformId
            }, function (data) {
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

        vm.getPlatformProvider = function (id) {
            if (!id) return;
            socketService.$socket($scope.AppSocket, 'getPlatform', {
                _id: id
            }, function (data) {
                vm.allProviders = data.data.gameProviders;
                console.log('vm.allProviders', data.data.gameProviders);
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        };

        vm.getProposalTypeOptionValue = function (proposalType) {
            let result = utilService.getProposalGroupValue(proposalType);
            return $translate(result);
        };

        vm.getPlayerLevelByPlatformId = function (id) {
            socketService.$socket($scope.AppSocket, 'getPlayerLevelByPlatformId', {
                platformId: id
            }, function (data) {
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
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {
                platform: vm.selectedPlatform._id
            }, function (data) {
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
            vm.preparePaymentMonitorPage();
        };

        vm.preparePaymentMonitorPage = function () {
            $('#autoRefreshProposalFlag')[0].checked = true;
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

            vm.paymentMonitorQuery.index = isNewSearch ? 0 : (vm.paymentMonitorQuery.index || 0);

            let sendObj = {
                startTime: vm.paymentMonitorQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.paymentMonitorQuery.endTime.data('datetimepicker').getLocalDate(),
                platformId: vm.paymentMonitorQuery.platformId,
                mainTopupType: vm.paymentMonitorQuery.mainTopupType,
                topupType: vm.paymentMonitorQuery.topupType,
                merchantGroup: angular.fromJson(angular.toJson(vm.paymentMonitorQuery.merchantGroup)),
                playerName: vm.paymentMonitorQuery.playerName,
                index: vm.paymentMonitorQuery.index,
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
                        item.merchantNo$ = item.data.merchantNo ?
                            item.data.merchantNo :
                            item.data.weChatAccount ?
                            item.data.weChatAccount :
                            item.data.alipayAccount ?
                            item.data.alipayAccount :
                            item.data.bankCardNo ?
                            item.data.bankCardNo :
                            item.data.accountNo ?
                            item.data.accountNo :
                            null;
                        item.merchantCount$ = item.$merchantCurrentCount + "/" + item.$merchantAllCount + " (" + item.$merchantGapTime + ")";
                        item.playerCount$ = item.$playerCurrentCount + "/" + item.$playerAllCount + " (" + item.$playerGapTime + ")";
                        item.status$ = $translate(item.status);
                        item.merchantName = vm.merchantNumbers[item.data.merchantNo];

                        if (item.data.msg && item.data.msg.indexOf(" 单号:") !== -1) {
                            let msgSplit = item.data.msg.split(" 单号:");
                            item.merchantName = msgSplit[0];
                            item.merchantNo$ = msgSplit[1];
                        }

                        if (item.type.name === 'PlayerTopUp') {
                            //show detail topup type info for online topup.
                            let typeID = item.data.topUpType || item.data.topupType;
                            item.topupTypeStr = typeID ?
                                $translate(vm.topUpTypeList[typeID]) :
                                $translate("Unknown")
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

        vm.drawPaymentRecordTable = function (data, size, summary, newSearch) {
            console.log('data', data);
            let tableOptions = {
                data: data,
                "order": vm.paymentMonitorQuery.aaSorting || [
                    [11, 'desc']
                ],
                aoColumnDefs: [{
                        'sortCol': 'proposalId',
                        bSortable: true,
                        'aTargets': [0]
                    },
                    {
                        'sortCol': 'createTime',
                        bSortable: true,
                        'aTargets': [11]
                    },
                    {
                        targets: '_all',
                        defaultContent: ' ',
                        bSortable: false
                    }
                ],
                columns: [{
                        title: $translate('proposalId'),
                        data: 'proposalId',
                        render: function (data, type, row) {
                            let data$ = data.slice(-3);
                            let $link = $('<a>').text(data$);
                            return $link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('TYPE'),
                        data: "type",
                        sClass: 'merchantCount',
                        render: function (data, type, row) {
                            var text = $translate(row.type ? row.type.name : "");
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('topupType'),
                        data: "data.topupType",
                        sClass: 'merchantCount',
                        render: function (data, type, row) {
                            let text = ($translate($scope.merchantTopupTypeJson[data])) ? $translate($scope.merchantTopupTypeJson[data]) : "";
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        title: $translate('Merchant'),
                        data: "merchantName",
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('Merchant No'),
                        data: "merchantNo$",
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('merchantCount'),
                        data: "merchantCount$",
                        sClass: 'merchantCount'
                    },
                    {
                        title: $translate('STATUS'),
                        data: "status$"
                    },
                    {
                        title: $translate('PLAYER_NAME'),
                        data: "data.playerName",
                        sClass: 'playerCount'
                    },
                    {
                        title: $translate('realName'),
                        data: "data.playerObjId.realName",
                        sClass: "sumText playerCount"
                    },
                    {
                        title: $translate('playerCount'),
                        data: "playerCount$",
                        sClass: 'playerCount'
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

            vm.paymentMonitorQuery.pageObj.init({
                maxCount: size
            }, newSearch);

            $('#paymentMonitorTable').off('order.dt');
            $('#paymentMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'paymentMonitorQuery', vm.getPaymentMonitorRecord);
            });
            $('#paymentMonitorTable').resize();

            $('#paymentMonitorTable tbody').on('click', 'tr', vm.tableRowClicked);
        };

        vm.tableRowClicked = function (event) {
            console.log('11111111111');
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
                socketService.$socket($scope.AppSocket, 'getFullProposalProcess', {
                    _id: vm.selectedProposal.process._id
                }, function processSuccess(data) {
                    console.log('full proposal data', data);
                    vm.thisProposalSteps = data.data.steps;
                    vm.chartData = {};
                    vm.chartData.nextNodeID = 10;
                    // let para = [$translate("START_PROPOSAL"), $translate("END_PROPOSAL"), $translate("FAIL_PROPOSAL")];
                    // vm.chartViewModel.setDefaultLabel(para);
                    // vm.chartViewModel.setEditable(false);
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
                socketService.$socket($scope.AppSocket, "getProvince", {
                    provinceId: vm.selectedProposalDetailForDisplay['provinceId']
                }, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['provinceId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountProvince']) {
                socketService.$socket($scope.AppSocket, "getProvince", {
                    provinceId: vm.selectedProposalDetailForDisplay['bankAccountProvince']
                }, function (data) {
                    var text = data.data.province ? data.data.province.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountProvince'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['cityId']) {
                socketService.$socket($scope.AppSocket, "getCity", {
                    provinceId: vm.selectedProposalDetailForDisplay['cityId']
                }, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['cityId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountCity']) {
                socketService.$socket($scope.AppSocket, "getCity", {
                    provinceId: vm.selectedProposalDetailForDisplay['bankAccountCity']
                }, function (data) {
                    var text = data.data.city ? data.data.city.name : val;
                    vm.selectedProposalDetailForDisplay['bankAccountCity'] = text;
                    $scope.safeApply();
                });
            }

            if (vm.selectedProposalDetailForDisplay['districtId']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {
                    provinceId: vm.selectedProposalDetailForDisplay['districtId']
                }, function (data) {
                    var text = data.data.district ? data.data.district.name : val;
                    vm.selectedProposalDetailForDisplay['districtId'] = text;
                    $scope.safeApply();
                });
            }
            if (vm.selectedProposalDetailForDisplay['bankAccountDistrict']) {
                socketService.$socket($scope.AppSocket, "getDistrict", {
                    provinceId: vm.selectedProposalDetailForDisplay['bankAccountDistrict']
                }, function (data) {
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
            columnDefs: [{
                targets: '_all',
                defaultContent: ' '
            }],
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
                result = new Date(val).toLocaleDateString("en-US", {
                    timeZone: "Asia/Singapore"
                });
            } else if (typeof (val) == 'object') {
                result = JSON.stringify(val);
            }
            return $sce.trustAsHtml(result);
        };


        // vm.showProposalDetailField


        function getMerchantList() {
            return new Promise(function (resolve) {
                socketService.$socket($scope.AppSocket, 'getMerchantList', {
                    platformId: vm.selectedPlatform.platformId
                }, function (data) {
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
                    merchantGroupList[item.merchantTypeId] = merchantGroupList[item.merchantTypeId] || {
                        list: []
                    };
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
                default:
                    startDate = "";
            }
            if (startDate) {
                $("#start-datetimepicker").data('datetimepicker').setLocalDate(startDate);
                $("#end-datetimepicker").data('datetimepicker').setLocalDate(utilService.getTodayEndTime());
                vm.loadProposalQueryData(true);
            }
        }
        vm.loadProposalQueryData = function (newSearch, callback) {
            var selectedStatus = [];
            // vm.proposalTypeUpdated();
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
            // var startTime = $('#start-datetimepicker').data('datetimepicker');
            // var endTime = $('#end-datetimepicker').data('datetimepicker');
            // var newEndTime = endTime.getLocalDate();

            var lastMonth = utilService.setNDaysAgo(new Date(), 1);
            var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            var startTime = lastMonthDateStartTime;
            var newEndTime = utilService.getTodayEndTime();

            var proposalTypeSelected = $('.all-proposal-type input:checkbox:checked').map(function () {
                return this.name;
            }).get();
            var selectedStatus = ["PrePending", "Pending", "Processing", "Success", "Approved", "Fail", "Rejected", "Cancel", "Expired", "Undetermined", "AutoAudit", "Recover"];

            let sendData = {
                adminId: authService.adminId,
                platformId: vm.allPlatformId,
                type: proposalTypeSelected,
                startDate: startTime, //.getLocalDate(),
                endDate: newEndTime,
                entryType: vm.queryProposalEntryType,
                size: vm.queryProposal.limit || 10,
                index: newSearch ? 0 : (vm.queryProposal.index || 0),
                sortCol: vm.queryProposal.sortCol
            };

            if (vm.curPlatformId) {
                sendData.platformId = [vm.curPlatformId];
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
            var queryString = vm.rightPanelTitle == "APPROVAL_PROPOSAL" ? 'getQueryApprovalProposalsForAdminId' : 'getQueryProposalsForAdminId';
            socketService.$socket($scope.AppSocket, queryString, sendData, function (data) {
                console.log('proposal allData', data);
                vm.proposals = data.data.data;
                $('.proposalMessage > a > .fa').removeClass('fa-spin');
                $('.proposalMessage').next().show();
                // vm.proposalTable.destroy();
                vm.queryProposal.totalCount = data.data.size;
                vm.drawProposalTable(vm.proposals, data.data.size, data.data.summary, newSearch);
                vm.loadProposalNewUserQueryData();
                $scope.safeApply();
            });
        };
        vm.loadProposalNewUserQueryData = function (newSearch, callback) {
            var selectedStatus = [];
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

            var lastMonth = utilService.setNDaysAgo(new Date(), 1);
            var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
            var startTime = lastMonthDateStartTime;
            var newEndTime = utilService.getTodayEndTime();

            var proposalTypeSelected = ["PlayerRegistrationIntention"];
            selectedStatus = ["PrePending", "Pending", "Processing", "Success", "Approved", "Fail", "Rejected", "Cancel", "Expired", "Undetermined", "AutoAudit", "Recover"];

            let sendData = {
                adminId: authService.adminId,
                platformId: vm.allPlatformId,
                type: proposalTypeSelected,
                startDate: startTime, //.getLocalDate(),
                endDate: newEndTime,
                entryType: vm.queryProposalEntryType,
                size: vm.queryProposal.limit || 10,
                index: newSearch ? 0 : (vm.queryProposal.index || 0),
                sortCol: vm.queryProposal.sortCol
            };

            if (vm.curPlatformId) {
                sendData.platformId = [vm.curPlatformId];
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
            var queryString = 'getQueryProposalsForAdminId';
            socketService.$socket($scope.AppSocket, queryString, sendData, function (data) {
                console.log('proposal allData', data);
                vm.proposalNewUsers = data.data.data;
                $('.proposalMessage > a > .fa').removeClass('fa-spin');
                $('.proposalMessage').next().show();
                // vm.proposalTable.destroy();
                vm.queryProposal.totalCount = data.data.size;
                vm.drawProposalNewUserTable(vm.proposalNewUsers, data.data.size, data.data.summary, newSearch);
                $scope.safeApply();
            });
        };
        vm.proposalStatusUpdated = function () {
            vm.proposalStatusSelected = $('select#selectProposalStatus').multipleSelect("getSelects");
            vm.proposalStatusSelectedTrans = vm.proposalStatusSelected.map(a => {
                return $translate(a);
            });
            if (vm.proposalTable) {
                vm.proposalTable.draw();
            }
        }
        vm.initQueryPara = function () {
            utilService.actionAfterLoaded($('#end-datetimepicker'), function () {
                try {

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
                } catch (err) {
                    throw err;
                }

                $('#start-datetimepicker').datetimepicker({
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss',
                });
                var lastMonth = utilService.setNDaysAgo(new Date(), 1);
                var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
                vm.queryProposalstartTime = $("#start-datetimepicker").data('datetimepicker').setLocalDate(lastMonthDateStartTime);

                $('#end-datetimepicker').datetimepicker({
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss',
                });
                vm.queryProposalendTime = $('#end-datetimepicker').data('datetimepicker').setLocalDate(utilService.getTodayEndTime());
                if (vm.curPlatformId) {
                    vm.loadProposalQueryData(true);
                }
            })
        }

        vm.proposalTypeUpdated = function () {
            vm.proposalTypeSelected = $('select#selectProposalType').multipleSelect("getSelects")
            debugger
        };
        // declare constants
        vm.proposalEntryTypeList = {
            0: "ENTRY_TYPE_CLIENT",
            //proposal entry type is admin
            1: "ENTRY_TYPE_ADMIN",
            //proposal is created by system
            2: "ENTRY_TYPE_SYSTEM"
        };
        vm.proposalUserTypeList = {
            0: "PLAYERS",
            1: "PARTNERS",
            2: "SYSTEM_USERS",
            3: "TEST_PLAYERS"
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
            $scope.safeApply();
        };
        //draw player table based on data
        vm.drawProposalNewUserTable = function (data, size, summary, newSearch) {
            console.log("drawProposalNewUserTable", data);
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
                    v.expirationTime$ = v.createTime == v.expirationTime ? 0 : new Date(v.expirationTime) - Date.now();
                    v.lockUser$ = $translate(v.isLocked);
                    v.creditAmount$ = (v.data.amount != null) ?
                        parseFloat(v.data.amount).toFixed(2) :
                        (v.data.rewardAmount != null ?
                            parseFloat(v.data.rewardAmount).toFixed(2) :
                            v.data.commissionAmount != null ?
                            parseFloat(v.data.commissionAmount).toFixed(2) :
                            v.data.negativeProfitAmount != null ?
                            parseFloat(v.data.negativeProfitAmount).toFixed(2) :
                            $translate("N/A"));
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
                    v.merchantNo$ = v.data.merchantNo != null ?
                        v.data.merchantNo :
                        v.data.weChatAccount != null ?
                        v.data.weChatAccount :
                        v.data.alipayAccount != null ?
                        v.data.alipayAccount :
                        null;
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
                aoColumnDefs: [{
                        'sortCol': 'proposalId',
                        bSortable: true,
                        'aTargets': [1]
                    },
                    {
                        'sortCol': 'relatedAmount',
                        bSortable: true,
                        'aTargets': [7]
                    },
                    {
                        'sortCol': 'createTime',
                        bSortable: true,
                        'aTargets': [13]
                    },
                    {
                        targets: '_all',
                        defaultContent: ' ',
                        bSortable: false
                    }
                ],
                columns: [{
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
                        },
                        bSortable: true
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
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
                            } else if (data === 5) {
                                textClass = "text-danger";
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
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
                            } else if (data && data.data && data.data.partnerName) {
                                return data.data.partnerName;
                            } else {
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
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
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
                    },
                    {
                        "title": $translate('EXPIRY_DATE'),
                        "data": 'expirationTime$',
                        type: 'signed-num',
                        render: function (data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                return data;
                            } else {
                                if (data > 0) {
                                    // Not expired
                                    let expireTime = Math.floor((data / 1000) / 60);
                                    return "<div>" + $translate("Left") + " " + expireTime + " " + $translate("mins") + "</div>";
                                } else if (data < 0) {
                                    // Expired
                                    let expireTime = Math.ceil((data / 1000) / 60);
                                    return "<div>" + $translate("Expired") + " " + -expireTime + " " + $translate("mins") + "</div>";
                                } else {
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
                            (vm.proposalTypeSelected && vm.proposalTypeSelected.indexOf(typeName) != -1) &&
                            (selectedStatus && selectedStatus.indexOf(statusName) != -1)) {
                            return true;
                        } else return false;
                    } else return true;
                }
            );
            vm.queryProposal.pageObj.init({
                maxCount: size
            }, newSearch);
            $('#proposalNewUserDataTable').empty();
            //no idea why is 7, and 7 is not working, so I change it to 8
            //lizhu: the number here indicates the data should be listed in N-th column
            vm.proposalTable = utilService.createDatatableWithFooter('#proposalNewUserDataTable', tableOptions, {
                11: summary.amount
            });
            // utilService.setDataTablePageInput('proposalNewUserDataTable', vm.proposalTable, $translate);

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
                var s = $("#proposalNewUserDataTable tbody td.approvalProposalSelected input").each(function () {
                    $(this).prop("checked", flag);
                });
                vm.updateMultiselectProposal();
            }

            vm.timeAllProposal = utilService.$getTimeFromStdTimeFormat();
            $("#proposalNewUserDataTableDiv .newProposalAlert").text('');
            setTimeout(function () {
                $('#proposalNewUserDataTable').resize();
            }, 100)

            function tableRowClicked(event) {
                console.log('2222222222');
                if (event.target.tagName == "INPUT" && event.target.type == 'checkbox') {
                    var flagAllChecked = $("#proposalNewUserDataTable tbody td.approvalProposalSelected input[type='checkbox']:not(:checked)");
                    $('.approvalProposalSelected.checkAllProposal').prop('checked', flagAllChecked.length == 0);
                    vm.updateMultiselectProposal();
                }
                if (event.target.tagName == 'A') {
                    var data = vm.proposalTable.row(this).data();
                    vm.proposalRowClicked(data);
                }
            }

            $('#proposalNewUserDataTable tbody').off('click', "**");
            $('#proposalNewUserDataTable tbody').on('click', 'tr', tableRowClicked);
            $('#proposalNewUserDataTable').off('order.dt');
            $('#proposalNewUserDataTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'queryProposal', vm.loadProposalQueryData);
            });
            $scope.safeApply();
        };
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
                    v.expirationTime$ = v.createTime == v.expirationTime ? 0 : new Date(v.expirationTime) - Date.now();
                    v.lockUser$ = $translate(v.isLocked);
                    v.creditAmount$ = (v.data.amount != null) ?
                        parseFloat(v.data.amount).toFixed(2) :
                        (v.data.rewardAmount != null ?
                            parseFloat(v.data.rewardAmount).toFixed(2) :
                            v.data.commissionAmount != null ?
                            parseFloat(v.data.commissionAmount).toFixed(2) :
                            v.data.negativeProfitAmount != null ?
                            parseFloat(v.data.negativeProfitAmount).toFixed(2) :
                            $translate("N/A"));
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
                    v.merchantNo$ = v.data.merchantNo != null ?
                        v.data.merchantNo :
                        v.data.weChatAccount != null ?
                        v.data.weChatAccount :
                        v.data.alipayAccount != null ?
                        v.data.alipayAccount :
                        null;
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
                aoColumnDefs: [{
                        'sortCol': 'proposalId',
                        bSortable: true,
                        'aTargets': [1]
                    },
                    {
                        'sortCol': 'relatedAmount',
                        bSortable: true,
                        'aTargets': [7]
                    },
                    {
                        'sortCol': 'createTime',
                        bSortable: true,
                        'aTargets': [13]
                    },
                    {
                        targets: '_all',
                        defaultContent: ' ',
                        bSortable: false
                    }
                ],
                columns: [{
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
                        },
                        bSortable: true
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
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
                            } else if (data === 5) {
                                textClass = "text-danger";
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
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
                            } else if (data && data.data && data.data.partnerName) {
                                return data.data.partnerName;
                            } else {
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
                                fontStyle = {
                                    'font-weight': 'bold'
                                };
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
                    },
                    {
                        "title": $translate('EXPIRY_DATE'),
                        "data": 'expirationTime$',
                        type: 'signed-num',
                        render: function (data, type, row) {
                            if (type === 'sort' || type === 'type') {
                                return data;
                            } else {
                                if (data > 0) {
                                    // Not expired
                                    let expireTime = Math.floor((data / 1000) / 60);
                                    return "<div>" + $translate("Left") + " " + expireTime + " " + $translate("mins") + "</div>";
                                } else if (data < 0) {
                                    // Expired
                                    let expireTime = Math.ceil((data / 1000) / 60);
                                    return "<div>" + $translate("Expired") + " " + -expireTime + " " + $translate("mins") + "</div>";
                                } else {
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
                            (vm.proposalTypeSelected && vm.proposalTypeSelected.indexOf(typeName) != -1) &&
                            (selectedStatus && selectedStatus.indexOf(statusName) != -1)) {
                            return true;
                        } else return false;
                    } else return true;
                }
            );
            vm.queryProposal.pageObj.init({
                maxCount: size
            }, newSearch);
            $('#proposalDataTable').empty();
            //no idea why is 7, and 7 is not working, so I change it to 8
            //lizhu: the number here indicates the data should be listed in N-th column
            vm.proposalTable = utilService.createDatatableWithFooter('#proposalDataTable', tableOptions, {
                11: summary.amount
            });
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
                console.log('2222222222');
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

        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });
        $scope.$on("setPlatform", function (e, d) {
            vm.setPlatform();
            vm.hideLeftPanel = false;
            vm.allBankTypeList = {};

            setTimeout(function () {
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
            });

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
                    //vm.chartViewModel = new flowchart.ChartViewModel();

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

                    utilService.actionAfterLoaded("#proposalNewUserDataTablePage", function () {
                        vm.queryProposal.pageObj = utilService.createPageForPagingTable("#proposalNewUserDataTablePage", {}, $translate, function (curP, pageSize) {
                            vm.commonPageChangeHandler(curP, pageSize, "queryProposal", vm.loadProposalNewUserQueryData)
                        });
                    });


                    Q.fcall(function () {
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
                            });

                            socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                                vm.allGameProviderById = {};
                                data.data.map(item => {
                                    vm.allGameProviderById[item._id] = item;
                                });
                                console.log("vm.allGameProviderById", vm.allGameProviderById);
                            }, function (data) {});

                        },
                        function (error) {}
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

                                Q.fcall(function () {
                                        vm.loadProposalQueryData();
                                    },
                                    function (error) {}).
                                then(
                                    function (data) {
                                        // vm.loadProposalNewUserQueryData();
                                    },
                                    function (error) {})

                                vm.getPaymentMonitorRecord();
                                countDown = 11;
                            }
                            countDown--;
                            $(mark).text(countDown);
                        } else {
                            countDown = -1;
                        }
                        if ($state.current.name != "monitor.proposalAndPayment") {
                            clearInterval(vm.refreshInterval);
                        }
                    }, 1000);
                }
            );
        });
        vm.currentStateName = $state.current.name;
    };

    monitorProposalAndPaymentController.$inject = injectParams;

    myApp.register.controller('monitorProposalAndPaymentCtrl', monitorProposalAndPaymentController);
});