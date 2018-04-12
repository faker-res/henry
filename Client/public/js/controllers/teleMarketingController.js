'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$sce', '$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies", "$timeout", '$http', 'uiGridExporterService', 'uiGridExporterConstants'];

        var teleMarketingController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {

            var $translate = $filter('translate');
            var vm = this;

            // For debugging:
            window.VM = vm;

            vm.teleMarketingOverview = {};
            vm.createTeleMarketingDefault = {
                description: '',
                creditAmount: 0,
                invitationTemplate: "尊贵的客户，你的帐号{{username}}，密码{{password}}，请点击{{loginUrl}}登入，送您{{creditAmount}}元，可在{{providerGroup}}游戏，流水{{requiredConsumption}}",
                welcomeContent: "尊贵的客户，你的帐号{{username}}，密码{{password}}，请点击{{loginUrl}}登入，送您{{creditAmount}}元，可在{{providerGroup}}游戏，流水{{requiredConsumption}}"
            };
            vm.createTeleMarketing = Object.assign({}, vm.createTeleMarketingDefault);
            vm.createTaskResult = '';

            vm.updatePageTile = function () {
                window.document.title = $translate("teleMarketing") + "->" + $translate(vm.teleMarketingPageName);
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

            $scope.$on('switchPlatform', () => {
                $scope.$evalAsync(vm.loadPlatformData());
            });

            vm.loadPlatformData = function (option) {
                vm.showPlatformSpin = true;
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    console.log('all platform data', data.data);
                    vm.showPlatformSpin = false;
                    vm.buildPlatformList(data.data);

                    //select platform from cookies data
                    var storedPlatform = $cookies.get("platform");
                    if (storedPlatform) {
                        vm.searchAndSelectPlatform(storedPlatform, option);
                    }

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
                    vm.selectPlatformNode(data);
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

            //set selected platform node
            vm.selectPlatformNode = function (node, option) {
                vm.selectedPlatform = node;
                vm.curPlatformText = node.text;
                console.log("vm.selectedPlatform", vm.selectedPlatform);
                $cookies.put("platform", node.text);
                if (option && !option.loadAll) {
                    $scope.safeApply();
                    return;
                }
                vm.getPlatformProviderGroup();

                vm.teleMarketingTaskTab ='TELEMARKETING_TASK_OVERVIEW';
                vm.initTeleMarketingOverview();
            };

            //search and select platform node
            vm.searchAndSelectPlatform = function (text, option) {
                var findNodes = $('#platformTree').treeview('search', [text, {
                    ignoreCase: false,
                    exactMatch: true
                }]);
                if (findNodes && findNodes.length > 0) {
                    vm.selectPlatformNode(findNodes[0], option);
                    $('#platformTree').treeview('selectNode', [findNodes[0], {silent: true}]);
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
                    limit: vm.teleMarketingOverview.limit || 5000,
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
                            //item['targetProviderGroup'] = $translate(item.targetProviderGroup);
                        });

                        $scope.$evalAsync(vm.drawTeleMarketingOverviewTable(newSearch, result, vm.teleMarketingOverview.totalCount));
                        vm.loadingTeleMarketingOverviewTable = false;
                    }
                });
            };

            vm.drawTeleMarketingOverviewTable = function (newSearch, tblData, size) {
                console.log("teleMarketingOverviewTable",tblData);

                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    "aaSorting": vm.teleMarketingOverview.sortCol || [[2, 'desc']],
                    aoColumnDefs: [
                        // {'sortCol': 'createTime$', bSortable: true, 'aTargets': [3]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    columns: [

                        {title: $translate('ORDER'), data: "size"},
                        {
                            title: $translate('TASK_NAME'),
                            data: "name",
                            render: function (data, type, row) {
                                var link = $('<a>', {

                                    'ng-click': 'vm.showTeleMarketingTaskModal("' + data + '")'

                                }).text(data);
                                return link.prop('outerHTML');
                            }
                        },
                        {title: $translate('TASK_REMARK'), data: "description"},
                        {title: $translate('TASK_CREATE_TIME'), data: "createTime"},
                        {title: $translate('TOTAL_IMPORTED_LIST'), data: "creditAmount"},
                        {title: $translate('TOTAL_SENT_MESSAGE'), data: "creditAmount"},
                        {title: $translate('TOTAL_PLAYER_CLICKED'), data: "creditAmount"},
                        {title: $translate('TOTAL_PLAYER_DEPOSIT'), data: "creditAmount"},
                        {title: $translate('TOTAL_PLAYER_MULTI_DEPOSIT'), data: "creditAmount"},
                        {title: $translate('TOTAL_VALID_PLAYER'), data: "creditAmount"},
                        {title: $translate('TOTAL_DEPOSIT_AMOUNT'), data: "creditAmount"},
                        {title: $translate('TOTAL_VALID_CONSUMPTION'), data: "creditAmount"},
                        // {
                        //     title: $translate('RewardProposalId'),
                        //     data: "proposalNumber",
                        //     render: function (data, type, row) {
                        //         var link = $('<a>', {
                        //
                        //             'ng-click': 'vm.showProposalModal("' + data + '",1)'
                        //
                        //         }).text(data);
                        //         return link.prop('outerHTML');
                        //     }
                        // },
                        // {title: $translate('SubRewardType'), data: "rewardTask.type",
                        //     render: function(data,type,row){
                        //         var text = $translate(data);
                        //         return text;
                        //     }
                        //
                        // },
                        // {title: $translate('UNLOCKTIME'), data: "unlockTime"},
                        // //相關存款金額
                        // {title: $translate('Deposit Amount'), data: "topupAmount"},
                        // {title: $translate('Deposit ProposalId'),
                        //     data: "topupProposalNumber",
                        //     render: function (data, type, row) {
                        //         var link = $('<a>', {
                        //             'ng-click': 'vm.showProposalModal("' + data + '",1)'
                        //         }).text(data);
                        //         return link.prop('outerHTML');
                        //     }
                        // },
                        // //相關存款提案號
                        // {title: $translate('REWARD_AMOUNT'), data: "bonusAmount"},
                        // {
                        //     //解锁进度（投注额）
                        //     "title": $translate('CONSUMPTION_UNLOCK'),data:"currentConsumption",
                        //     render: function (data, type, row, meta) {
                        //         let text = row.currentConsumption +"/"+row.maxConsumption;
                        //         return "<div>" + text + "</div>";
                        //     }
                        // },
                        // // 解鎖進度
                        // {
                        //     //解锁进度（输赢值）
                        //     "title": $translate('WINLOSE_UNLOCK'),data:"currentAmount",
                        //     render: function (data, type, row ,meta) {
                        //         // let spendingAmt = vm.calSpendingAmt(meta.row);
                        //         // let isSubmit = vm.isSubmitProposal(meta.row);
                        //         let text = -row.currentAmount + "/-" + row.targetAmount;
                        //
                        //         return "<div>" + text + "</div>";
                        //     }
                        // },
                        // {title: $translate('GAME LOBBY / REWARD TASK GROUP'), data: "targetProviderGroup"},
                        // {
                        //     "title": $translate('IsConsumption'),data: "useConsumption",
                        //     render: function (data, type, row) {
                        //         var text = $translate(data);
                        //         return "<div>" + text + "</div>";
                        //     }
                        // },
                        // {
                        //     "title": $translate('creator'),data: "creator.name",
                        //
                        // },
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
                    //4: topUpAmountSum,
                    // 6: summary ? summary.bonusAmountSum: 0,
                    // 7: summary ? summary.requiredBonusAmountSum: 0,
                    // 8: summary ? summary.currentAmountSum :0
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


            vm.dateReformat = function (data) {
                if (!data) return '';
                return utilService.getFormatTime(data);
            };

            vm.showTeleMarketingTaskModal = function (taksId) {
                socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                    platformId: vm.selectedPlatform.id,
                    proposalId: proposalId
                }, function (data) {
                    vm.selectedProposal = data.data;

                    //let tmpt = vm.proposalTemplate[templateNo];
                    $("#modalDXMission").modal('show');
                    if (templateNo == 1) {
                        $("#modalDXMission").css('z-Index', 1051).modal();
                    }

                    $("#modalDXMission").on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })

                })
            };


            //create teleMarketing task
            vm.createTeleMarketingTask = function () {
                let sendData = {
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
        };
    teleMarketingController.$inject = injectParams;
        myApp.register.controller('teleMarketingCtrl', teleMarketingController);
    }
);
