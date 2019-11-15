'use strict';

define(['js/app'], function (myApp) {
    let playerDetailController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, commonService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {
        // region - controller init definition
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let $noRoundTwoDecimalToFix = $filter('noRoundTwoDecimalToFix');
        let vm = this;

        // For debugging:
        window.vm = vm;
        window.$scope = $scope;
        // endregion - controller init definition

        // NOTE :: Any function that does not need to load on page start will need to place after init process region for page load performance

        // region - init definition
        vm.playerData = {};
        vm.selectedPlayersCount = 1; // this page only select 1 player
        vm.playerManualTopUp = {submitted: false};
        vm.credibilityRemarks = [];
        vm.queryPara = {};
        vm.selectedTopupTab = "";
        vm.toggleSubmitFeedbackButton = true;
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
        }; // both behave a littlebit different?
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
        vm.allPlayerCreditTransferStatus = {
            SUCCESS: 1,
            FAIL: 2,
            REQUEST: 3,
            SEND: 4,
            TIMEOUT: 5
        };
        vm.proposalTemplate = {
            1: '#modalProposal',
            2: '#newPlayerModal',
            3: '#auctionItemModal'
        };
        vm.depositMethodList = $scope.depositMethodList;
        vm.playerPermissionTypes = {
            applyBonus: {
                imgType: 'img',
                src: "images/icon/withdrawBlue.png",
                width: "26px",
                height: '26px'
            },
            allTopUp: {
                imgType: 'img',
                src: "images/icon/allTopUpBlue.png",
                width: "26px",
                height: '20px'
            },
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
            forbidPlayerFromLogin: {imgType: 'i', iconClass: "fa fa-sign-in", testPlayer: true},
            forbidPlayerFromEnteringGame: {
                imgType: 'i',
                iconClass: "fa fa-gamepad",
                testPlayer: true
            },
            phoneCallFeedback: {
                imgType: 'i',
                iconClass: "fa fa-volume-control-phone",
                testPlayer: true
            },
            SMSFeedBack: {imgType: 'i', iconClass: "fa fa-comment", testPlayer: true},
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
        vm.addFeedback = {
            playerId: vm.curFeedbackPlayer ? vm.curFeedbackPlayer._id : null,
            platform: vm.curFeedbackPlayer ? vm.curFeedbackPlayer.platform : null
        };
        vm.batchEditData = {
            "_id": "xxxxxxxxx",
            "permission": {
                "alipayTransaction": true,
                "topupManual": true,
                "allTopUp": true,
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
        vm.forbidCredibilityAddList = [];
        vm.forbidCredibilityRemoveList = [];
        vm.forbidRewardEventAddList = [];
        vm.forbidRewardEventRemoveList = [];
        vm.forbidPromoCode = undefined;
        vm.forbidLevelUpReward = undefined;
        vm.forbidLevelMaintainReward = undefined;
        vm.forbidGameAddList = [];
        vm.forbidGameRemoveList = [];
        vm.forbidTopUpAddList = [];
        vm.forbidTopUpRemoveList = [];
        vm.forbidRewardPointsAddList = [];
        vm.forbidRewardPointsRemoveList = [];
        vm.playerCredibilityRemarksUpdated = false;
        // endregion - init definition

        // region - get player data
        vm.getPlayerDetail = function () {
            if (!$scope.targetPlayerObjId) {
                // todo :: show player not found
            }
            return $scope.$socketPromise("getOnePlayerSimpleDetail", {platformObjId: $scope.selectedPlatform.id, playerObjId: $scope.targetPlayerObjId}).then(
                data => {
                    console.log('getOnePlayerSimpleDetail', data);
                    vm.playerData = data.data;
                    document.title = vm.playerData && vm.playerData.name || "获取玩家失败";
                    vm.selectedSinglePlayer = vm.playerData;
                    vm.resetEditPlayer();
                    vm.drawPlayerTable([vm.playerData]);
                    return Promise.all(
                        [
                            // don't add here, add at delayed init function. Only add here if you want it to be run before the table appear
                            $scope.$socketPromise("getOnePlayerSummaryRecord", {platformObjId: $scope.selectedPlatform.id, playerObjId: $scope.targetPlayerObjId}),
                            vm.getAllPlayerLevels(),
                            vm.getAllProviders(),
                        ]
                    );
                }
            ).then(
                ([data]) => {
                    console.log('getOnePlayerSummaryRecord', data);
                    vm.playerData.consumptionDetail = data.data && data.data[0] || {};
                    vm.drawSinglePlayerFeedback();
                }
            );
        };

        vm.isOneSelectedPlayer = function () {
            return vm.selectedSinglePlayer;
        };

        vm.resetEditPlayer = () => {
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
                playerLevel: vm.selectedSinglePlayer.playerLevel ? vm.selectedSinglePlayer.playerLevel._id : null,
                referral: vm.selectedSinglePlayer.referral,
                smsSetting: vm.selectedSinglePlayer.smsSetting,
                gender: vm.selectedSinglePlayer.gender,
                DOB: vm.selectedSinglePlayer.DOB,
                accAdmin: vm.selectedSinglePlayer.accAdmin
            };
        };

        // endregion - get player data

        // region - draw initial interface
        vm.drawPlayerTable = function (data) {
            vm.players = data;
            vm.selectedPlayers = {};

            var tableOptions = {
                data: data,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                order: [[2, 'desc']],
                columns: [
                    {
                        title: $translate('PLAYERNAME'), data: "name", advSearch: true, "sClass": "",
                        render: function (data, type, row) {
                            let perm = (row && row.permission) ? row.permission : {};
                            var link = $('<a>', {
                                'class': (perm.forbidPlayerFromLogin === true ? "text-danger" : "text-primary"),
                                'ng-click': 'vm.showPlayerInfoModal("' + data + '")' // player info modal
                            }).text(data);
                            return link.prop('outerHTML');

                        }
                    },
                    {
                        title: $translate('REAL_NAME'),
                        data: 'realName',
                        sClass: "wordWrap realNameCell",
                    },
                    {
                        title: $translate("PLAYER_VALUE"), data: "valueScore", orderable: false, "sClass": "alignRight",
                        render: function (data, type, row) {
                            let value = (Math.floor(data * 10) / 10).toFixed(1);
                            return value;
                        }
                    },
                    {
                        title: $translate("CREDIBILITY_REMARK"),
                        data: "credibilityRemarks",
                        orderable: false,
                        sClass: "remarkCol",
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
                        title: $translate('LEVEL'), "data": 'playerLevel',
                        render: function (data, type, row) {
                            data = data || '';
                            if ($scope.checkViewPermission('Player', 'Player', 'Edit')) {
                                return $('<a style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                    'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#" ' +
                                    'ng-click="vm.openEditPlayerDialog(\'basicInfo\');"></a>')
                                    .attr('data-row', JSON.stringify(row))
                                    .text($translate(data.name))
                                    .prop('outerHTML');
                            } else {
                                return $('<span style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                    'data-placement="bottom" data-trigger="focus" type="button" data-html="true" href="#" ></span>')
                                    .attr('data-row', JSON.stringify(row))
                                    .text($translate(data.name))
                                    .prop('outerHTML');
                            }
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('CREDIT'),
                        data: 'validCredit',
                        sType: 'Credit',
                        orderable: true,
                        bSortable: true,
                        render: function (data, type, row) {
                            if (type == 'sort') return row.validCredit;
                            data = data || 0;
                            var link = $('<div>', {
                                'data-order': row.validCredit,
                            })
                            link.append($('<i class="fa fa-usd"></i>'));
                            if (row.rewardGroupInfo && row.rewardGroupInfo.length > 0) {
                                link.append(
                                    $('<a>', {
                                        'class': 'rewardTaskPopover',
                                        'ng-click': 'vm.rewardTaskPlayerName = "' + row.name + '";', // @todo: escaping issue
                                        'data-row': JSON.stringify(row),
                                        'href': '',
                                        'data-toggle': 'popover',
                                        'data-trigger': 'focus',
                                        'data-placement': 'bottom',
                                        'data-container': 'body'
                                    }).text($noRoundTwoDecimalPlaces(row.validCredit))
                                )
                            } else {
                                link.append(
                                    $('<text>', {
                                        'data-row': JSON.stringify(row)
                                    }).text($noRoundTwoDecimalPlaces(row.validCredit))
                                )
                            }
                            link.append($('<span>').html('&nbsp;&nbsp;&nbsp;'));
                            //if (data != 0) {
                            if (row.rewardInfo && row.rewardInfo.length > 0) {
                                link.append($('<i class="fa fa-lock"></i>'))
                                    .append(
                                        $('<a>', {
                                            'class': 'rewardTaskPopover',
                                            'ng-click': 'vm.rewardTaskPlayerName = "' + row.name + '";', // @todo: escaping issue
                                            'data-row': JSON.stringify(row),
                                            'href': '',
                                            'data-toggle': 'popover',
                                            'data-trigger': 'focus',
                                            'data-placement': 'bottom',
                                            'data-container': 'body'
                                        }).text($noRoundTwoDecimalPlaces(row.lockedCredit))
                                    )
                                    .append($('<span>').html('&nbsp;&nbsp;&nbsp;'));
                            }

                            // TODO:: Temporary measure to show reward group credit
                            if (row.rewardGroupInfo && row.rewardGroupInfo.length > 0) {
                                link.append($('<i class="fa fa-lock"></i>'))
                                    .append(
                                        $('<a>', {
                                            'class': 'rewardTaskPopover',
                                            'ng-click': 'vm.rewardTaskPlayerName = "' + row.name + '";', // @todo: escaping issue
                                            'data-row': JSON.stringify(row),
                                            'href': '',
                                            'data-toggle': 'popover',
                                            'data-trigger': 'focus',
                                            'data-placement': 'bottom',
                                            'data-container': 'body'
                                        }).text($noRoundTwoDecimalPlaces(row.lockedCredit))
                                    )
                                    .append($('<span>').html('&nbsp;&nbsp;&nbsp;'));
                            }

                            //}
                            link.append(
                                $('<a>', {
                                    'class': 'fa fa-gamepad',
                                    'ng-click': 'vm.showPlayerCreditinProvider(' + JSON.stringify(row) + ')', // @todo: escaping issue
                                    'data-row': JSON.stringify(row),
                                    'href': '',
                                    'data-toggle': 'popover',
                                    'data-trigger': 'manual',
                                    'data-placement': 'bottom',
                                    'data-container': 'body'
                                })
                            );
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('POINT'),
                        "orderable": false,
                        visible: vm.selectedPlatform.data.usePointSystem,
                        data: 'point$',
                        render: function (data, type, row) {
                            data = data || '0';
                            return $('<a data-target="#modalPlayerRewardPointsLog" style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                'data-placement="bottom" data-trigger="focus" type="button" ng-click="vm.initPlayerRewardPointLog()" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text((data))
                                .prop('outerHTML');
                        },
                        "sClass": "alignRight",
                    },
                    {
                        title: $translate('REGISTRATION_TIME'),
                        data: 'registrationTime',
                        advSearch: true,
                        filterConfig: {
                            type: "datetimepicker",
                            id: "regDateTimePicker",
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
                        title: $translate('LAST_ACCESS_TIME'),
                        data: 'lastAccessTime',
                        advSearch: true,
                        type: "datetimepicker",
                        filterConfig: {
                            type: "datetimepicker",
                            id: "lastAccessDateTimePicker",
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
                        title: $translate('LOGIN_TIMES'), data: "loginTimes",
                        render: function (data, type, row) {
                            data = data || '0';
                            return $('<a data-target="#modalPlayerApiLog" style="z-index: auto" data-toggle="modal" data-container="body" ' +
                                'data-placement="bottom" data-trigger="focus" type="button" ng-click="vm.initPlayerApiLog()" data-html="true" href="#"></a>')
                                .attr('data-row', JSON.stringify(row))
                                .text((data))
                                .prop('outerHTML');
                        },
                        "sClass": "alignRight"

                    },
                    {
                        title: "<div>" + $translate('TOP_UP') + "</div><div>" + $translate('TIMES') + "</div>",
                        "data": 'topUpTimes',
                        "sClass": "alignRight",
                    },
                    {
                        title: $translate('Function'), //data: 'phoneNumber',
                        orderable: false,
                        render: function (data, type, row) {
                            data = data || '';
                            var playerObjId = row._id ? row._id : "";
                            var link = $('<div>', {});
                            link.append($('<a>', {
                                'class': 'fa fa-envelope margin-right-5',
                                'ng-click': 'vm.initMessageModal(); vm.sendMessageToPlayerBtn(' + '"msg", ' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("SEND_MESSAGE_TO_PLAYER"),
                                'data-placement': 'left',   // because top and bottom got hidden behind the table edges
                            }));
                            link.append($('<a>', {
                                'class': 'fa fa-comment margin-right-5' + (row.permission.SMSFeedBack === false ? " text-danger" : ""),
                                'ng-click': 'vm.initSMSModal();' + "vm.onClickPlayerCheck('" +
                                playerObjId + "', " + "vm.telorMessageToPlayerBtn" +
                                ", " + "[" + '"msg"' + ", " + JSON.stringify(row) + "]);",
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("Send SMS to Player"),
                                'data-placement': 'left',
                            }));
                            link.append($('<a>', {
                                'class': 'fa fa-volume-control-phone margin-right-5' + (row.permission.phoneCallFeedback === false ? " text-danger" : ""),
                                'ng-click': 'vm.telorMessageToPlayerBtn(' + '"tel", "' + playerObjId + '",' + JSON.stringify(row) + ');',
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'tooltip',
                                'title': $translate("PHONE"),
                                'data-placement': 'left',
                            }));
                            if ($scope.checkViewPermission('Player', 'Feedback', 'AddFeedback')) {
                                link.append($('<a>', {
                                    'class': 'fa fa-commenting margin-right-5',
                                    'ng-click': 'vm.initFeedbackModal(' + JSON.stringify(row) + ');',
                                    'data-row': JSON.stringify(row),
                                    'data-toggle': 'modal',
                                    'data-target': '#modalAddPlayerFeedback',
                                    'title': $translate("ADD_FEEDBACK"),
                                    'data-placement': 'right',
                                }));
                            }
                            if (row.isRealPlayer) {
                                if ($scope.checkViewPermission('Player', 'TopUp', 'ApplyManualTopup')) {
                                    link.append($('<a>', {
                                        'class': 'fa fa-plus-circle',
                                        'ng-click': 'vm.showTopupTab(null);vm.onClickPlayerCheck("' + playerObjId + '", vm.initPlayerManualTopUp);',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerTopUp',
                                        'title': $translate("TOP_UP"),
                                        'data-placement': 'left',
                                        'style': 'color: #68C60C'
                                    }));
                                }
                                link.append($('<br>'));
                                if ($scope.checkViewPermission('Player', 'Bonus', 'applyBonus')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5 margin-right-5',
                                        'src': (row.permission.applyBonus === false ? "images/icon/withdrawRed.png" : "images/icon/withdrawBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.initPlayerBonus();',
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
                                        'src': "images/icon/rewardBlue.png",
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.initPlayerAddRewardTask();',
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
                                        'src': "images/icon/reapplyBlue.png",
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.showReapplyLostOrderTab(null);vm.prepareShowPlayerCredit();vm.prepareShowRepairPayment(\'#modalReapplyLostOrder\');',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'title': $translate("ALL_REAPPLY_ORDER"),
                                        'data-placement': 'right',
                                    }));
                                }
                                if ($scope.checkViewPermission('Player', 'Credit', 'CreditAdjustment')) {
                                    link.append($('<img>', {
                                        'class': 'margin-right-5',
                                        'src': "images/icon/creditAdjustBlue.png",
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.onClickPlayerCheck("' + playerObjId + '", vm.prepareShowPlayerCreditAdjustment, \'adjust\')',
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
                                        'src': (row.permission.rewardPointsTask === false ? "images/icon/rewardPointsRed.png" : "images/icon/rewardPointsBlue.png"),
                                        'height': "14px",
                                        'width': "14px",
                                        'ng-click': 'vm.showRewardPointsAdjustmentTab(null);vm.onClickPlayerCheck("' + playerObjId + '", vm.prepareShowPlayerRewardPointsAdjustment);',
                                        'data-row': JSON.stringify(row),
                                        'data-toggle': 'modal',
                                        'data-target': '#modalPlayerRewardPointsAdjustment',
                                        'title': $translate("REWARD_POINTS_ADJUSTMENT"),
                                        'data-placement': 'right',
                                    }));
                                }
                            }
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
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
                                + "; vm.permissionPlayer.permission.forbidPlayerFromEnteringGame = !vm.permissionPlayer.permission.forbidPlayerFromEnteringGame;",
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'popover',
                                'data-trigger': 'focus',
                                'data-placement': 'left',
                                'data-container': 'body',
                            });

                            let perm = (row && row.permission) ? row.permission : {};

                            if (row.isRealPlayer) {
                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.applyBonus === true ? "withdrawBlue.png" : "withdrawRed.png"),
                                    height: "14px",
                                    width: "14px",
                                }));
                                link.append($('<img>', {
                                    'class': 'margin-right-5 ',
                                    'src': "images/icon/" + (perm.allTopUp === false ? "allTopUpRed.png" : "allTopUpBlue.png"),
                                    height: "13px",
                                    width: "15px",
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
                            }
                            link.append($('<i>', {
                                'class': 'fa margin-right-5 ' + (perm.forbidPlayerFromLogin === true ? "fa-sign-out text-danger" : "fa-sign-in  text-primary"),
                            }));

                            link.append($('<i>', {
                                'class': 'fa fa-gamepad margin-right-5 ' + (perm.forbidPlayerFromEnteringGame === true ? "text-danger" : "text-primary"),
                            }));

                            if (row.isRealPlayer) {
                                link.append($('<br>'));
                            }

                            link.append($('<i>', {
                                'class': 'fa fa-volume-control-phone margin-right-5 ' + (perm.phoneCallFeedback === false ? "text-danger" : "text-primary"),
                            }));

                            link.append($('<i>', {
                                'class': 'fa fa-comment margin-right-5 ' + (perm.SMSFeedBack === false ? "text-danger" : "text-primary"),
                            }));
                            if (row.isRealPlayer) {
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
                            }

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

                            if (row.isRealPlayer) {
                                let forbidFixedRewardsCount = 0;
                                if (row.forbidPromoCode) {
                                    forbidFixedRewardsCount++;
                                }
                                if (row.forbidLevelUpReward) {
                                    forbidFixedRewardsCount++;
                                }
                                if (row.forbidLevelMaintainReward) {
                                    forbidFixedRewardsCount++;
                                }

                                link.append($('<a>', {
                                    'class': 'forbidRewardEventPopover fa fa-gift margin-right-5' + (row.forbidRewardEvents && (row.forbidRewardEvents.length + forbidFixedRewardsCount) > 0 ? " text-danger" : ""),
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
                                    'html': (row.forbidRewardEvents && (row.forbidRewardEvents.length + forbidFixedRewardsCount) > 0 ? '<sup>' + (row.forbidRewardEvents.length + forbidFixedRewardsCount) + '</sup>' : ''),
                                }));
                            }

                            link.append($('<a>', {
                                'class': 'prohibitGamePopover fa fa-gamepad margin-right-5 ' + (row.forbidProviders && row.forbidProviders.length > 0 ? " text-danger" : ""),
                                'data-row': JSON.stringify(row),
                                'data-toggle': 'popover',
                                'data-placement': 'left',
                                'data-trigger': 'focus',
                                'type': 'button',
                                'data-html': true,
                                'href': '#',
                                'style': "z-index: auto; min-width:23px",
                                'data-container': "body",
                                'html': (row.forbidProviders && row.forbidProviders.length > 0 ? '<sup>' + row.forbidProviders.length + '</sup>' : ''),
                            }));

                            if (row.isRealPlayer) {
                                link.append($('<a>', {
                                    'class': 'forbidTopUpPopover margin-right-5' + (row.forbidTopUpType && row.forbidTopUpType.length > 0 ? " text-danger" : ""),
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
                                    'html': '<img width="15px" height="12px" src="images/icon/' + (row.forbidTopUpType && row.forbidTopUpType.length > 0 ? "onlineTopUpRed.png" : "onlineTopUpBlue.png") + '"></img>'
                                    + (row.forbidTopUpType && row.forbidTopUpType.length > 0 ? '<sup>' + row.forbidTopUpType.length + '</sup>' : ''),
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
                            }
                            return link.prop('outerHTML');
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('partner'),
                        orderable: false,
                        data: "partner.partnerName",
                        "sClass": "alignRight"
                    },
                    {title: $translate('REFERRAL'), orderable: false, data: "referralName$", "sClass": "alignRight"},
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
                //dom: 'Zrtlip',
                // dom: "Z<'row'<'col-sm-12'tr>>" + "<'row'<'col-sm-4'l><'col-sm-4'i><'col-sm-4'p>>",
                dom: "Z<'row'<'col-sm-12'tr>>",
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                },
                fnDrawCallback: function (oSettings) {
                    var container = oSettings.nTable;

                    $(container).find('[title]').tooltip();

                    utilService.setupPopover({
                        context: container,
                        elem: '.rewardTaskPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);

                            if (vm.selectedPlatform.data.useProviderGroup) {
                                vm.getRewardTaskGroupDetail(row._id, function (data) {
                                    vm.rewardTaskGroupPopoverData = vm.curRewardTask.map(group => {
                                        if (group.providerGroup.name == "LOCAL_CREDIT") {
                                            group.validCredit = row.validCredit;
                                        }
                                        return group;
                                    });
                                    $scope.$evalAsync();
                                    showPopover(that, '#rewardTaskGroupPopover', data);

                                });
                            } else {
                                vm.getRewardTaskDetail(row._id, function (data) {
                                    showPopover(that, '#rewardTaskPopover', data);
                                });
                            }
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.playerFeedbackPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);
                            vm.getPlayer5Feedback(row._id, function (data) {
                                showPopover(that, '#playerFeedbackPopover', data);
                            });
                        }
                    });

                    $(".remarkCol > a").on("click", vm.initPlayerCredibility);

                    utilService.setupPopover({
                        context: container,
                        elem: '.telPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.telphonePlayer = data;
                            $scope.$evalAsync();
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

                    function showMessagePlayerModalFor(player) {
                        var $modalScope = $scope.$new(true);
                        $('#messagePlayerModal').modal('show');
                    }
                //
                    vm.sendMessageToPlayer = function () {
                        // Currently we are passing the adminId from the client side, but we should really pick it up on the server side.
                        let sendData = {
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

                    vm.sendMessageToPartner = function () {
                        // Currently we are passing the adminId from the client side, but we should really pick it up on the server side.
                        let sendData = {
                            //adminId: authService.adminId,
                            adminName: authService.adminName,
                            platformId: vm.selectedPlatform.id,
                            partnerId: vm.telphonePartner._id,
                            title: vm.messageForPartner.title,
                            content: vm.messageForPartner.content
                        };
                        $scope.$socketPromise('sendPlayerMailFromAdminToPartner', sendData).then(function () {
                            // We could show a confirmation message, but currently showConfirmMessage() is doing that for us.
                        }).done();
                    };


                    utilService.setupPopover({
                        context: container,
                        elem: '.prohibitGamePopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.prohibitGamePopover = data;
                            vm.forbidGameDisable = true;
                            vm.forbidGameRemark = '';
                            $scope.safeApply(); // safe apply is neccessary here
                            return $compile($('#prohibitGamePopover').html())($scope);
                        },
                        callback: function () {
                            let thisPopover = utilService.$getPopoverID(this);
                            let rowData = JSON.parse(this.dataset.row);
                            $scope.safeApply(); // safe apply is neccessary here

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
                                $scope.safeApply(); // safe apply is neccessary here
                            });

                            $("button.forbidGameConfirm").on('click', function () {
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
                                let sendData = {
                                    _id: rowData._id,
                                    forbidProviders: forbidProviders,
                                    adminName: authService.adminName
                                };
                                vm.updatePlayerForbidProviders(sendData);
                                $(".prohibitGamePopover").popover('hide');
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.forbidRewardPointsEventPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.forbidRewardPointsEventPopover = data;
                            vm.forbidRewardPointsEventDisable = true;
                            vm.forbidRewardPointsEventRemark = '';
                            $scope.safeApply();
                            return $compile($('#forbidRewardPointsEventPopover').html())($scope);
                        },
                        callback: function () {
                            let thisPopover = utilService.$getPopoverID(this);
                            let rowData = JSON.parse(this.dataset.row);
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

                            $("button.forbidRewardPointsEventConfirm").on('click', function () {
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
                                let sendData = {
                                    _id: rowData._id,
                                    forbidRewardPointsEvent: forbidRewardPointsEvent,
                                    adminName: authService.adminName
                                };
                                vm.updatePlayerForbidRewardPointsEvent(sendData);
                                $(".forbidRewardPointsEventPopover").popover('hide');
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.forbidTopUpPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.forbidTopUpPopover = data;
                            vm.forbidTopUpDisable = true;
                            vm.forbidTopUpRemark = '';
                            $scope.safeApply();
                            return $compile($('#forbidTopUpPopover').html())($scope);
                        },
                        callback: function () {
                            let thisPopover = utilService.$getPopoverID(this);
                            let rowData = JSON.parse(this.dataset.row);
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

                            $("button.forbidTopUpConfirm").on('click', function () {
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
                                let sendData = {
                                    query: {_id: rowData._id},
                                    updateData: {forbidTopUpType: forbidTopUpTypes},
                                    adminName: authService.adminName
                                };
                                vm.confirmUpdatePlayerTopupTypes(sendData);
                                $(".forbidTopUpPopover").popover('hide');
                            });
                        }
                    });


                    utilService.setupPopover({
                        context: container,
                        elem: '.forbidRewardEventPopover',
                        content: function () {
                            var data = JSON.parse(this.dataset.row);
                            vm.forbidRewardEventPopover = data;
                            vm.forbidPromoCode = vm.forbidRewardEventPopover.forbidPromoCode || false;
                            vm.forbidLevelUpReward = vm.forbidRewardEventPopover.forbidLevelUpReward || false;
                            vm.forbidLevelMaintainReward = vm.forbidRewardEventPopover.forbidLevelMaintainReward || false;
                            vm.forbidRewardEvents = [];
                            vm.forbidRewardDisable = true;
                            $scope.safeApply();
                            return $compile($('#forbidRewardEventPopover').html())($scope);
                        },
                        callback: function () {
                            let thisPopover = utilService.$getPopoverID(this);
                            let rowData = JSON.parse(this.dataset.row);
                            $scope.safeApply();
                            $("input.playerRewardEventForbid").on('click', function () {
                                let forbidRewardEventList = $(thisPopover).find('.playerRewardEventForbid');
                                let forbidRewardEvents = [];
                                $.each(forbidRewardEventList, function (i, v) {
                                    if ($(v).prop('checked')) {
                                        forbidRewardEvents.push($(v).attr('data-provider'));
                                    }
                                });

                                if (vm.forbidPromoCode != rowData.forbidPromoCode || vm.forbidLevelUpReward != rowData.forbidLevelUpReward || vm.forbidLevelMaintainReward != rowData.forbidLevelMaintainReward) {
                                    vm.forbidRewardDisable = false;
                                } else {
                                    vm.forbidRewardDisable = vm.isForbidChanged(forbidRewardEvents, vm.forbidRewardEventPopover.forbidRewardEvents);
                                }
                                $scope.safeApply();
                            });

                            $("button.forbidRewardEventCancel").on('click', function () {
                                $(".forbidRewardEventPopover").popover('hide');
                            });

                            $("button.showForbidreward").on('click', function () {
                                $(".forbidRewardEventPopover").popover('hide');
                            });

                            $("button.forbidRewardEventConfirm").on('click', function () {
                                if ($(this).hasClass('disabled')) {
                                    return;
                                }
                                let forbidRewardEventList = $(thisPopover).find('.playerRewardEventForbid');
                                let forbidRewardEvents = [];
                                $.each(forbidRewardEventList, function (i, v) {
                                    if ($(v).prop('checked') && $(v).attr('data-provider')) {
                                        forbidRewardEvents.push($(v).attr('data-provider'));
                                    }
                                });
                                let sendData = {
                                    _id: rowData._id,
                                    forbidRewardEvents: forbidRewardEvents,
                                    forbidPromoCode: vm.forbidPromoCode,
                                    forbidLevelUpReward: vm.forbidLevelUpReward,
                                    forbidLevelMaintainReward: vm.forbidLevelMaintainReward,
                                    adminName: authService.adminName
                                };
                                vm.updatePlayerForbidRewardEvents(sendData);
                                $(".forbidRewardEventPopover").popover('hide');
                            });
                        }
                    });

                    utilService.setupPopover({
                        context: container,
                        elem: '.playerPermissionPopover',
                        onClickAsync: function (showPopover) {
                            var that = this;
                            var row = JSON.parse(this.dataset.row);


                            $("#playerPermissionTable td").removeClass('hide');

                            vm.popOverPlayerPermission = row;

                            // Invert second render
                            row.permission.banReward = !row.permission.banReward;
                            row.permission.disableWechatPay = !row.permission.disableWechatPay;
                            row.permission.forbidPlayerConsumptionReturn = !row.permission.forbidPlayerConsumptionReturn;
                            row.permission.forbidPlayerConsumptionIncentive = !row.permission.forbidPlayerConsumptionIncentive;
                            row.permission.forbidPlayerFromLogin = !row.permission.forbidPlayerFromLogin;
                            row.permission.forbidPlayerFromEnteringGame = !row.permission.forbidPlayerFromEnteringGame;

                            $.each(vm.playerPermissionTypes, function (key, v) {
                                if (row.permission && row.permission[key] === false) {
                                    $("#playerPermissionTable .permitOn." + key).addClass('hide');
                                } else {
                                    $("#playerPermissionTable .permitOff." + key).addClass('hide');
                                }
                            });
                            $scope.$evalAsync();
                            showPopover(that, '#playerPermissionPopover', row);
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

                                socketService.$socket($scope.AppSocket, 'updatePlayerPermission', {
                                    query: {
                                        platform: vm.permissionPlayer.platform,
                                        _id: vm.permissionPlayer._id
                                    },
                                    admin: authService.adminId,
                                    permission: changeObj,
                                    remark: $remark.val()
                                }, function (data) {
                                    vm.getPlayerDetail();
                                }, null, true);
                                $(thisPopover).popover('hide');
                            })

                        }
                    });
                }
            }
            vm.playerFeedbackTable = $('#playerFeedbackDataTable').DataTable(tableOptions);

            utilService.setDataTablePageInput('playerFeedbackDataTable', vm.playerFeedbackTable, $translate);
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

        vm.drawSinglePlayerFeedback = function () {
            let playerList = [], extendedResult = [];
            vm.curFeedbackPlayer = vm.playerData;

            if (vm.curFeedbackPlayer && !$.isEmptyObject(vm.curFeedbackPlayer)) {
                playerList.push(vm.curFeedbackPlayer);
                //process data for extended table
                if (vm.curFeedbackPlayer.consumptionDetail && !$.isEmptyObject(vm.curFeedbackPlayer.consumptionDetail)) {
                    vm.playerFeedbackResultExtended = vm.curFeedbackPlayer.consumptionDetail;
                    vm.playerFeedbackResultExtended.manualTopUpAmount$ = parseFloat(vm.playerFeedbackResultExtended.manualTopUpAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.onlineTopUpAmount$ = parseFloat(vm.playerFeedbackResultExtended.onlineTopUpAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.weChatTopUpAmount$ = parseFloat(vm.playerFeedbackResultExtended.weChatTopUpAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.aliPayTopUpAmount$ = parseFloat(vm.playerFeedbackResultExtended.aliPayTopUpAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.topUpAmount$ = parseFloat(vm.curFeedbackPlayer.topUpSum).toFixed(2);
                    vm.playerFeedbackResultExtended.bonusAmount$ = parseFloat(vm.playerFeedbackResultExtended.bonusAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.rewardAmount$ = parseFloat(vm.playerFeedbackResultExtended.rewardAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.consumptionReturnAmount$ = parseFloat(vm.playerFeedbackResultExtended.consumptionReturnAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.consumptionAmount$ = parseFloat(vm.playerFeedbackResultExtended.consumptionAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.validConsumptionAmount$ = parseFloat(vm.playerFeedbackResultExtended.validConsumptionAmount).toFixed(2);
                    vm.playerFeedbackResultExtended.consumptionBonusAmount$ = parseFloat(vm.curFeedbackPlayer.bonusAmountSum).toFixed(2);

                    vm.playerFeedbackResultExtended.playerLevel$ = "";
                    if (vm.playerFeedbackResultExtended.playerLevel && vm.playerLvlData[vm.playerFeedbackResultExtended.playerLevel]) {
                        vm.playerFeedbackResultExtended.playerLevel$ = vm.playerLvlData[vm.playerFeedbackResultExtended.playerLevel].name;
                    }

                    vm.playerFeedbackResultExtended.credibility$ = "";
                    if (vm.playerFeedbackResultExtended.credibilityRemarks) {
                        for (let i = 0; i < vm.playerFeedbackResultExtended.credibilityRemarks.length; i++) {
                            for (let j = 0; j < vm.credibilityRemarks.length; j++) {
                                if (vm.playerFeedbackResultExtended.credibilityRemarks[i] && vm.playerFeedbackResultExtended.credibilityRemarks[i].toString() === vm.credibilityRemarks[j]._id.toString()) {
                                    vm.playerFeedbackResultExtended.credibility$ += vm.credibilityRemarks[j].name + "<br>";
                                }
                            }
                        }
                    }

                    vm.playerFeedbackResultExtended.providerArr = [];
                    for (var key in vm.playerFeedbackResultExtended.providerDetail) {
                        if (vm.playerFeedbackResultExtended.providerDetail.hasOwnProperty(key)) {
                            vm.playerFeedbackResultExtended.providerDetail[key].providerId = key;
                            vm.playerFeedbackResultExtended.providerArr.push(vm.playerFeedbackResultExtended.providerDetail[key]);
                        }
                    }

                    vm.playerFeedbackResultExtended.provider$ = "";
                    if (vm.playerFeedbackResultExtended.providerDetail) {
                        for (let i = 0; i < vm.playerFeedbackResultExtended.providerArr.length; i++) {
                            vm.playerFeedbackResultExtended.providerArr[i].amount = parseFloat(vm.playerFeedbackResultExtended.providerArr[i].amount).toFixed(2);
                            vm.playerFeedbackResultExtended.providerArr[i].bonusAmount = parseFloat(vm.playerFeedbackResultExtended.providerArr[i].bonusAmount).toFixed(2);
                            vm.playerFeedbackResultExtended.providerArr[i].validAmount = parseFloat(vm.playerFeedbackResultExtended.providerArr[i].validAmount).toFixed(2);
                            vm.playerFeedbackResultExtended.providerArr[i].profit = parseFloat(vm.playerFeedbackResultExtended.providerArr[i].bonusAmount / vm.playerFeedbackResultExtended.providerArr[i].validAmount * -100).toFixed(2) + "%";
                            for (let j = 0; j < vm.allProviders.length; j++) {
                                if (vm.playerFeedbackResultExtended.providerArr[i].providerId.toString() == vm.allProviders[j]._id.toString()) {
                                    vm.playerFeedbackResultExtended.providerArr[i].name = vm.allProviders[j].name;
                                    vm.playerFeedbackResultExtended.provider$ += vm.allProviders[j].name + "<br>";
                                }
                            }
                        }
                    }

                    vm.playerFeedbackResultExtended.profit$ = 0;
                    if (vm.playerFeedbackResultExtended.consumptionBonusAmount != 0 && vm.playerFeedbackResultExtended.validConsumptionAmount != 0) {
                        vm.playerFeedbackResultExtended.profit$ = parseFloat((vm.playerFeedbackResultExtended.consumptionBonusAmount / vm.playerFeedbackResultExtended.validConsumptionAmount) * -100).toFixed(2) + "%";
                    }

                    vm.playerFeedbackResultExtended.topUpTimes = vm.curFeedbackPlayer.topUpTimes || 0;
                    vm.playerFeedbackResultExtended.bonusTimes = vm.curFeedbackPlayer.withdrawTimes || 0;
                    vm.playerFeedbackResultExtended.consumptionTimes = vm.curFeedbackPlayer.consumptionTimes || 0;
                    extendedResult.push(vm.playerFeedbackResultExtended);
                } //end processing for extended table
            };


            vm.drawExtendedFeedbackTable(extendedResult);

            $('#platformFeedbackSpin').hide();
            if (!vm.curFeedbackPlayer) {
                $scope.$evalAsync();
                return;
            }

            vm.addFeedback = {
                playerId: vm.curFeedbackPlayer ? vm.curFeedbackPlayer._id : null,
                platform: vm.curFeedbackPlayer ? vm.curFeedbackPlayer.platform : null
            };

            if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.defaultFeedback) {
                if (vm.selectedPlatform.data.defaultFeedback.defaultFeedbackResult && vm.addFeedback) {
                    vm.addFeedback.result = vm.selectedPlatform.data.defaultFeedback.defaultFeedbackResult;
                }

                if (vm.selectedPlatform.data.defaultFeedback.defaultFeedbackTopic && vm.addFeedback) {
                    vm.addFeedback.topic = vm.selectedPlatform.data.defaultFeedback.defaultFeedbackTopic;
                }
            }

            if (vm.curFeedbackPlayer._id) {
                vm.getPlayerNFeedback(vm.curFeedbackPlayer._id, null, function (data) {
                    vm.curPlayerFeedbackDetail = data;

                    vm.curPlayerFeedbackDetail.forEach(item => {
                        item.result$ = item.resultName ? item.resultName : $translate(item.result);
                    });

                    $scope.$evalAsync();
                });
                vm.getPlayerCredibilityComment(vm.curFeedbackPlayer._id);
                $scope.$evalAsync();
            } else {
                vm.curPlayerFeedbackDetail = {};
                $scope.$evalAsync();
            }
        };

        vm.isFeedbackAddValid = function () {
            let isValid = false;
            if (vm.addFeedback && vm.addFeedback.result && vm.addFeedback.topic) {
                if (vm.addFeedback.content) {
                    isValid = true;
                } else if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.defaultFeedback
                    && vm.addFeedback.result == vm.selectedPlatform.data.defaultFeedback.defaultFeedbackResult
                    && vm.addFeedback.topic == vm.selectedPlatform.data.defaultFeedback.defaultFeedbackTopic) {
                    isValid = true;
                }
            }

            return isValid;
        };

        vm.getPlayerNFeedback = function (playerId, limit, callback) {
            socketService.$socket($scope.AppSocket, 'getPlayerLastNFeedbackRecord', {
                playerId: playerId,
                limit: limit
            }, function (data) {
                $scope.$evalAsync();
                if (callback) {
                    callback(data.data);
                }
            });
        };

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
                    $scope.$evalAsync();
                },
                function (err) {
                    console.log(err);
                });
        };


        // endregion - draw initial interface

        // region - DataTable Util
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
                $scope.$evalAsync();
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
            $scope.$evalAsync();
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
        // endregion - DataTable Util

        // region - necessary data
        vm.getCredibilityRemarks = () => {
            return new Promise((resolve, reject) => {
                socketService.$socket($scope.AppSocket, 'getCredibilityRemarks', {platformObjId: vm.selectedPlatform.data._id}, function (data) {
                    console.log('credibilityRemarks', data);
                    vm.credibilityRemarks = data.data;
                    resolve();
                }, function (err) {
                    reject(err);
                });
            });
        };

        vm.getPlatformProviderGroup = () => {
            return $scope.$socketPromise('getPlatformProviderGroup', {platformObjId: vm.selectedPlatform.data._id}).then(
                data => {
                    if (data) {
                        $scope.$evalAsync(() => {
                            vm.gameProviderGroup = data.data;
                            vm.gameProviderGroupNames = {};
                            for (let i = 0; i < vm.gameProviderGroup.length; i++) {
                                let providerGroup = vm.gameProviderGroup[i];
                                vm.gameProviderGroupNames[providerGroup._id] = providerGroup.name;
                            }
                        });
                    }
                }
            );
        };

        vm.getAllPlayerLevels = function () {
            vm.playerIDArr = [];
            vm.autoCheckPlayerLevelUp = null;
            vm.manualPlayerLevelUp = null;
            vm.playerLevelDisplayList = [];
            return $scope.$socketPromise('getPlayerLevelByPlatformId', {platformId: vm.selectedPlatform.id})
                .then(function (data) {
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
                });
        };

        vm.getAllProviders = () => {
            return commonService.getPlatformProvider($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(
                data => {
                    vm.allProviders = data;
                    return vm.allProviders;
                }
            );
        };
        // endregion - necessary data

        // region - init processes
        vm.generalPageInit = () => {
            vm.selectedPlatform = $scope.selectedPlatform;
            vm.getCredibilityRemarks();
            vm.getPlayerDetail();

            // anything that don't appear on page load, but still necessary to init after page load, put inside delayed general init function
            setTimeout(function () {
                $scope.$emit("startDelayInit");
            }, 1000);
        };

        $scope.$on("$viewContentLoaded", function (e, d) {
            vm.hideLeftPanel = false;
            if (!$scope.AppSocket) {
                $scope.$emit('childControllerLoaded', 'monitorControllerLoaded');
            }
            if (d == "@monitor") {
                if ($scope.AppSocket && $scope.AppSocket.connected) {
                    $scope.$broadcast('socketReady', 'monitorControllerSocketReady');
                }
            }
        });

        $scope.$on("socketConnected", function (e, d) {
            if (!$scope.AppSocket) {
                $scope.$emit('childControllerLoaded', 'monitorControllerLoaded');
            }
            $scope.$broadcast('socketReady', 'monitorControllerSocketReady');
        });


        if ($scope.selectedPlatform) {
            vm.generalPageInit();
        }

        $scope.$on("switchPlatform", function() {
            vm.generalPageInit();
        });
        // endregion - init processes

        // region - player info modal
        vm.showPlayerInfoModal = function (playerName) {
            vm.showSimilarPlayersTable = false;
            vm.similarPlayersForPlayer = null;
            var nowDate = new Date();
            var playerConsumptionQuery = {
                startDate: new Date().setDate(nowDate.getDate() - 20),
                endDate: nowDate,
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform
            }

            vm.showReferralName = '';
            socketService.$socket($scope.AppSocket, 'getSimilarPlayers', {
                playerId: vm.selectedSinglePlayer._id
            }, function (data) {
                if (data && data.data.playerId == vm.selectedSinglePlayer.playerId) {
                    let preDistinctCheckData = data.data.similarData;
                    let distinctData = [];
                    for (let i = 0; i < preDistinctCheckData.length; i++) {
                        let duplicate = false;
                        for (let j = 0; j < distinctData.length; j++) {
                            if (distinctData[j].field === preDistinctCheckData[i].field && JSON.stringify(distinctData[j].playerObjId) === JSON.stringify(preDistinctCheckData[i].playerObjId)) {
                                duplicate = true;
                                break;
                            }
                        }
                        if (duplicate === false) {
                            distinctData.push(preDistinctCheckData[i]);
                        }
                    }
                    vm.similarPlayersForPlayer = distinctData;
                    console.log("similarPlayers", vm.similarPlayersForPlayer);
                }
                $scope.$evalAsync();
                vm.updateDataTableinModal('#modalPlayerInfo', '#similarPlayersTable');
            });
            if (vm.selectedSinglePlayer.partner) {
                if (vm.selectedSinglePlayer.partner.partnerName) {
                    vm.selectedSinglePlayer.partnerName = vm.selectedSinglePlayer.partner.partnerName;
                } else {
                    socketService.$socket($scope.AppSocket, 'getPartner', {_id: vm.selectedSinglePlayer.partner}, function (data) {
                        vm.selectedSinglePlayer.partnerName = data.data.partnerName;
                        $scope.$evalAsync();
                    })
                }
            }
            if (vm.selectedSinglePlayer.referral) {
                socketService.$socket($scope.AppSocket, 'getPlayerInfo', {_id: vm.selectedSinglePlayer.referral}, function (data) {
                    vm.showReferralName = data.data.name;
                    $scope.$evalAsync();
                });
            }

            socketService.$socket($scope.AppSocket, 'checkIPArea', {_id: vm.selectedSinglePlayer._id}, function (data) {
                $scope.$evalAsync(() => {
                    if(data && data.data){
                        vm.selectedSinglePlayer.city = data.data.city || "";
                        vm.selectedSinglePlayer.province = data.data.province || "";
                    }
                });
            });

            vm.processDataTableinModal('#modalPlayerInfo', '#similarPlayersTable');
            vm.showProvinceStr = '';
            vm.showCityStr = '';
            vm.showDistrictStr = '';
            $scope.getProvinceStr(vm.selectedSinglePlayer.bankAccountProvince).then(data => {
                if (data.data.province) {
                    vm.showProvinceStr = data.data.province.name;
                    $scope.getCityStr(vm.selectedSinglePlayer.bankAccountCity).then(data => {
                        if (data.data.city) {
                            vm.showCityStr = data.data.city.name;
                            $scope.getDistrictStr(vm.selectedSinglePlayer.bankAccountDistrict).then(data => {
                                vm.showDistrictStr = data.data.data ? data.data.data.name : vm.selectedSinglePlayer.bankAccountDistrict;
                                $scope.$evalAsync();
                            }, err => {
                                vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountDistrict || $translate("Unknown");
                                $scope.$evalAsync();
                            });
                        }
                        else {
                            vm.showCityStr = vm.selectedSinglePlayer.bankAccountCity;
                        }
                        vm.showCityStr = data.data.city ? data.data.city.name : vm.selectedSinglePlayer.bankAccountCity;
                        $scope.$evalAsync();
                    }, err => {
                        vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountCity || $translate("Unknown");
                        $scope.$evalAsync();
                    });
                }
                else {
                    vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountProvince;
                }
                $scope.$evalAsync();
            }, err => {
                vm.showProvinceStr = vm.selectedSinglePlayer.bankAccountProvince || $translate("Unknown");
                $scope.$evalAsync();
            });
            $scope.$evalAsync();
        };

        vm.canEditPlayer = function () {
            return vm.playerData;
        };

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
        };

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
            $scope.$evalAsync();
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
        // endregion - player info modal

        // region - player edit modal
        vm.openEditPlayerDialog = function (selectedTab) {
            vm.editSelectedTab = "";
            vm.editSelectedTab = selectedTab ? selectedTab.toString() : "basicInfo";
            vm.prepareEditCritical('player');
            vm.prepareEditPlayerPayment();
            dialogDetails();

            function dialogDetails() {
                let selectedPlayer = vm.isOneSelectedPlayer();   // ~ 20 fields!
                let editPlayer = vm.editPlayer;                  // ~ 6 fields
                vm.editPlayer.DOB = vm.editPlayer.DOB? new Date(vm.editPlayer.DOB): null;
                let allPartner = vm.partnerIdObj;
                let allPlayerLevel = vm.allPlayerLvl;

                let option = {
                    $scope: $scope,
                    $compile: $compile,
                    childScope: {
                        // vm: vm,
                        playerTopUpGroupQuery: {
                            index: 0,
                            limit: 10
                        },
                        isChangeLogTableInitiated: false,
                        playerTopUpGroupLog: vm.playerTopUpGroupLog,
                        editPlayerPermission: $scope.checkViewPermission('Player', 'Player', 'Edit'),
                        editContactPermission: $scope.checkViewPermission('Player', 'Player', 'EditContact'),
                        editWithdrawPermission: $scope.checkViewPermission('Player', 'Player', 'PaymentInformation'),
                        selectedTab: vm.editSelectedTab,
                        modifyCritical: vm.modifyCritical,
                        verifyPlayerPhoneNumber: vm.verifyPlayerPhoneNumber,
                        correctVerifyPhoneNumber: vm.correctVerifyPhoneNumber,
                        platformPageName: vm.platformPageName,
                        prepareEditCritical: vm.prepareEditCritical,
                        submitCriticalUpdate: vm.submitCriticalUpdate,
                        isEditingPlayerPayment: vm.isEditingPlayerPayment,
                        playerPayment: vm.playerPayment,
                        allBankTypeList: vm.allBankTypeList,
                        filteredBankTypeList: vm.filteredBankTypeList,
                        filterBankName: vm.filterBankName,
                        filterBankname: vm.filterBankname,
                        isEditingPlayerPaymentShowVerify: vm.isEditingPlayerPaymentShowVerify,
                        correctVerifyBankAccount: vm.correctVerifyBankAccount,
                        currentProvince: vm.currentProvince,
                        provinceList: vm.provinceList,
                        changeProvince: vm.changeProvince,
                        currentCity: vm.currentCity,
                        cityList: vm.cityList,
                        changeCity: vm.changeCity,
                        currentDistrict: vm.currentDistrict,
                        districtList: vm.districtList,
                        verifyBankAccount: "",
                        verifyPlayerBankAccount: vm.verifyPlayerBankAccount,
                        updatePlayerPayment: vm.updatePlayerPayment,
                        today: new Date().toISOString(),
                        allPlayerLevel: allPlayerLevel,
                        allPartner: allPartner,
                        playerId: selectedPlayer._id,
                        playerBeforeEditing: $.extend({}, editPlayer),
                        playerBeingEdited: $.extend({}, editPlayer),
                        topUpGroupRemark: "",
                        platformBankCardGroupList: vm.platformBankCardGroupList,
                        platformMerchantGroupList: vm.platformMerchantGroupList,
                        platformAlipayGroupList: vm.platformAlipayGroupList,
                        platformWechatPayGroupList: vm.platformWechatPayGroupList,
                        platformQuickPayGroupList: vm.platformQuickPayGroupList,
                        isIdInList: commonService.isIdInList,
                        updateEditedPlayer: function () {

                            // this ng-model has to be in date object
                            if (this.playerBeingEdited.DOB) {
                                this.playerBeingEdited.DOB = new Date(this.playerBeingEdited.DOB);
                            }
                            sendPlayerUpdate(this.playerId, this.playerBeforeEditing, this.playerBeingEdited, this.topUpGroupRemark, selectedPlayer.permission);
                        },
                        checkPlayerNameValidity: function (a, b, c) {
                            vm.checkPlayerNameValidity(a, b, c);
                        },
                        duplicateNameFound: function () {
                            return vm.duplicateNameFound;
                        },
                        initTopUpGroupChangeLog: function () {
                            let cvm = this;
                            utilService.actionAfterLoaded(".topupGroupRecordTablePage", function () {
                                cvm.playerTopUpGroupQuery.pageObj = utilService.createPageForPagingTable(".topupGroupRecordTablePage", {}, $translate, function (curP, pageSize) {
                                    var isChange = false;
                                    if (pageSize != cvm.playerTopUpGroupQuery.limit) {
                                        isChange = true;
                                        cvm.playerTopUpGroupQuery.limit = pageSize;
                                    }
                                    if ((curP - 1) * pageSize != cvm.playerTopUpGroupQuery.index) {
                                        isChange = true;
                                        cvm.playerTopUpGroupQuery.index = (curP - 1) * pageSize;
                                    }
                                    if (isChange) return cvm.getPlayerTopUpGroupChangeLog(cvm.playerTopUpGroupQuery.index, cvm.playerTopUpGroupQuery.limit);
                                });
                            });
                        },
                        getPlayerTopUpGroupChangeLog: function (index, limit) {
                            let cvm = this;
                            let playerId = cvm.playerId;
                            let query = {
                                playerId,
                                index,
                                limit
                            };

                            if (!cvm.isChangeLogTableInitiated) {
                                cvm.isChangeLogTableInitiated = true;
                                cvm.initTopUpGroupChangeLog();
                            }

                            $scope.$socketPromise('getPlayerTopUpGroupLog', query).then(function (data) {
                                    // socketService.$socket($scope.AppSocket, 'getPlayerTopUpGroupLog', query, function (data) {
                                    // it is a change log for topup group
                                    // let singleLog = data.data[i]
                                    // vm.playerTopUpGroupLog.length = 0;
                                    cvm.drawChangeLogTable(data.data.data.map(log => {
                                        console.log(log);
                                        log.createTime = $scope.timeReformat(new Date(log.createTime));
                                        log.topUpGroupNames$ = Object.keys(log.topUpGroupNames)[0];
                                        log.topUpGroupChanges = log.topUpGroupNames[Object.keys(log.topUpGroupNames)[0]];


                                        return log;
                                    }), data.data.size, index, limit)
                                },
                                function (err) {
                                    console.log(err);
                                });
                        },
                        drawChangeLogTable: function (tableData, size, index, limit) {
                            let cvm = this;
                            let tableOptions = {
                                data: tableData,
                                order: [[2, 'desc']],
                                columns: [
                                    {title: $translate('OPERATOR_NAME'), data: "admin.adminName"},
                                    {
                                        title: $translate('Topup Group'),
                                        data: "topUpGroupNames$",
                                        sClass: "realNameCell wordWrap",
                                        render: function (data, type, row) {
                                            return $translate(data);
                                        }
                                    },
                                    {title: $translate('TIME'), data: "createTime"},
                                    {title: $translate("OPERATOR_ACTION"), data: "topUpGroupChanges"},
                                    {title: $translate("remark"), data: "remark"},
                                ],
                                "paging": false,
                                "dom": 'Zrtlp',
                                "autoWidth": true,
                                "scrollX": true,
                                "scrollCollapse": true,
                                "destroy": true,
                                "language": {
                                    "emptyTable": $translate("No data available in table"),
                                },
                            };

                            if ($('.dataTables_scrollHeadInner > .topupGroupRecordTable').length > 0) {
                                $(".topupGroupRecordTable").parent().parent().parent().remove();
                                $(".topupGroupRecordTablePage").before('<table class="topupGroupRecordTable common-table display" style="width:100%"></table>')
                            }

                            $(".topupGroupRecordTablePage").show();

                            utilService.createDatatableWithFooter('.topupGroupRecordTable', tableOptions, {});
                            cvm.playerTopUpGroupQuery.pageObj.init({maxCount: size}, false);
                            $scope.$evalAsync();
                        },
                        checkAdminNameValidity: function (adminName, form) {
                            vm.checkAdminNameValidity(adminName, form);
                            return vm.isAdminNameValidity;
                        }
                    }
                };

                option.childScope.prepareEditPlayerPayment = function () {
                    vm.prepareEditPlayerPayment();
                    this.isEditingPlayerPayment = vm.isEditingPlayerPayment;
                    this.playerPayment = vm.playerPayment;
                    this.allBankTypeList = vm.allBankTypeList;
                    this.filteredBankTypeList = vm.filteredBankTypeList;
                    this.filterBankName = vm.filterBankName;
                    this.isEditingPlayerPaymentShowVerify = vm.isEditingPlayerPaymentShowVerify;
                    this.correctVerifyBankAccount = vm.correctVerifyBankAccount;
                    this.verifyBankAccount = "";
                    this.topUpGroupRemark = "";
                };

                let debounceGetReferralPlayer = $scope.debounce(function refreshReferral() {
                    return vm.getReferralPlayer(option.childScope.playerBeingEdited, "change");
                }, 500);

                let debounceGetPartnerInPlayer = $scope.debounce(function () {
                    return vm.getPartnerinPlayer(option.childScope.playerBeingEdited, "change");
                }, 500, false);

                option.childScope.playerBeforeEditing.smsSetting = $.extend({}, editPlayer.smsSetting);
                option.childScope.playerBeingEdited.smsSetting = $.extend({}, editPlayer.smsSetting);
                option.childScope.changeReferral = function () {
                    debounceGetReferralPlayer();
                };
                option.childScope.changePartner = function () {
                    debounceGetPartnerInPlayer();
                };

                vm.partnerChange = false;
                $('.referralValidTrue').hide();
                $('.referralValidFalse').hide();
                $('.partnerValidTrue').hide();
                $('.partnerValidFalse').hide();
                $('#dialogEditPlayer').floatingDialog(option);
                $('#dialogEditPlayer').focus();
                vm.getReferralPlayer(option.childScope.playerBeingEdited, "new");
                vm.getPartnerinPlayer(option.childScope.playerBeingEdited, "new");
                $scope.$evalAsync();
            };

            $(".topupGroupRecordTablePage").hide();

            if ($('.dataTables_scrollHeadInner > .topupGroupRecordTable').length > 0) {
                $(".topupGroupRecordTable").parent().parent().parent().remove();
                $(".topupGroupRecordTablePage").before('<table class="topupGroupRecordTable common-table display" style="width:100%"></table>')
            }
        };

        vm.prepareEditPlayerPayment = function () {
            return new Promise(function (resolve) {
                console.log('playerID', vm.isOneSelectedPlayer()._id);
                if (!vm.currentCity) {
                    vm.currentCity = {};
                }
                if (!vm.currentProvince) {
                    vm.currentProvince = {};
                }
                if (!vm.currentDistrict) {
                    vm.currentDistrict = {};
                }
                vm.correctVerifyBankAccount = undefined;
                vm.isEditingPlayerPayment = false;
                vm.isEditingPlayerPaymentShowVerify = false;
                vm.playerPayment = utilService.assignObjKeys(vm.isOneSelectedPlayer(), vm.playerPaymentKeys);
                vm.playerPayment.bankAccountName = (vm.playerPayment.bankAccountName) ? vm.playerPayment.bankAccountName : vm.isOneSelectedPlayer().realName;
                vm.playerPayment.newBankAccount = vm.playerPayment.encodedBankAccount;
                vm.playerPayment.showNewAccountNo = false;
                vm.filteredBankTypeList = $.extend({}, vm.allBankTypeList);
                vm.filterBankName = '';
                vm.currentProvince.province = vm.playerPayment.bankAccountProvince;
                vm.currentCity.city = vm.playerPayment.bankAccountCity;
                vm.currentDistrict.district = vm.playerPayment.bankAccountDistrict;
                socketService.$socket($scope.AppSocket, 'getProvinceList', {}, function (data) {
                    if (data) {
                        vm.provinceList.length = 0;

                        for (let i = 0, len = data.data.data.length; i < len; i++) {
                            let province = data.data.data[i];
                            province.id = province.id.toString();
                            vm.provinceList.push(province);
                        }

                        vm.changeProvince(false);
                        vm.changeCity(false);
                        $scope.$evalAsync();
                        resolve(vm.provinceList);
                    }
                }, null, true);
            });

        };

        vm.changeProvince = function (reset) {
            socketService.$socket($scope.AppSocket, 'getCityList', {provinceId: vm.currentProvince.province}, function (data) {
                if (data) {
                    if (data.data.data) {
                        vm.cityList.length = 0;
                        for (let i = 0, len = data.data.data.length; i < len; i++) {
                            let city = data.data.data[i];
                            city.id = city.id.toString();
                            vm.cityList.push(city);
                        }
                    }
                    if (reset) {
                        vm.currentCity.city = vm.cityList[0].id;
                        vm.changeCity(reset);
                        $scope.$evalAsync();
                    }
                }
            }, null, true);
        };

        vm.changeCity = function (reset) {
            socketService.$socket($scope.AppSocket, 'getDistrictList', {
                provinceId: vm.currentProvince.province,
                cityId: vm.currentCity.city
            }, function (data) {
                if (data) {
                    if (data.data.data) {
                        vm.districtList.length = 0;
                        for (let i = 0, len = data.data.data.length; i < len; i++) {
                            let district = data.data.data[i];
                            district.id = district.id.toString();
                            vm.districtList.push(district);
                        }
                    }
                    if (reset && vm.districtList && vm.districtList[0]) {
                        vm.currentDistrict.district = ""
                    }
                    $scope.$evalAsync();
                }
            }, null, true);
        };

        vm.filterBankname = function (which) {
            let key = '';
            if (event && event.target) { // todo :: check the use of this 'event'
                key = event.target.value || '';
            }
            vm.filteredBankTypeList = {};
            vm[which].bankName = '';
            $.each(vm.allBankTypeList, function (i, v) {
                if (v.indexOf(key) > -1) {
                    vm.filteredBankTypeList[i] = v;
                    vm[which].bankName = i;
                }
            });
            $scope.$evalAsync();
        };

        vm.verifyPlayerBankAccount = function (testBankAccount) {
            socketService.$socket($scope.AppSocket, 'verifyPlayerBankAccount', {
                playerObjId: vm.selectedSinglePlayer._id,
                bankAccount: testBankAccount
            }, function (data) {
                console.log("verifyPlayerBankAccount:", data);
                vm.correctVerifyBankAccount = data.data;

                if (vm.correctVerifyBankAccount) {
                    socketService.showConfirmMessage($translate("Validation succeed."), 10000);
                } else {
                    socketService.showErrorMessage($translate("Validation failed.") + " - " + $translate("Bank card number did not match."));
                }

                $scope.$evalAsync();
            });
        };

        vm.updatePlayerPayment = function () {
            var sendData = $.extend({}, vm.playerPayment);
            sendData._id = vm.isOneSelectedPlayer()._id;
            sendData.playerName = vm.isOneSelectedPlayer().name;
            sendData.playerId = vm.isOneSelectedPlayer().playerId;
            sendData.bankAccountProvince = vm.currentProvince.province;
            sendData.bankAccountCity = vm.currentCity.city;
            sendData.bankAccountDistrict = vm.currentDistrict.district;
            console.log('send', sendData);
            if (sendData.newBankAccount != sendData.encodedBankAccount) {
                sendData.bankAccount = sendData.newBankAccount;
            }
            delete sendData.newBankAccount;
            delete sendData.encodedBankAccount;

            socketService.$socket($scope.AppSocket, 'createUpdatePlayerBankInfoProposal', {
                creator: {type: "admin", name: authService.adminName, id: authService.adminId},
                data: sendData,
                platformId: vm.selectedPlatform.id
            }, function (data) {
                if (data.data && data.data.stepInfo) {
                    socketService.showProposalStepInfo(data.data.stepInfo, $translate);
                }
                vm.getPlayerDetail();
                console.log('player payment', data);
            }, null, true);
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
            $scope.$evalAsync();


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
                $scope.$evalAsync();
            }, function (err) {
                console.log('err', err);
            }, true);
        };

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
                });
            });
        });

        vm.getZoneList = function (provinceId, cityId, fromInit) {
            vm.freezeZoneSelection = true;
            if (!fromInit) {
                $scope.$evalAsync();
            }

            let sendQuery = {
                provinceId: provinceId, cityId: cityId
            };
            socketService.$socket($scope.AppSocket, 'getZoneList', sendQuery, function (data) {
                console.log(data.data);
                if (!provinceId && !cityId) {
                    vm.provinceList = data.data.data || [];
                    vm.playerManualTopUp.provinceId = vm.provinceList[0].id;
                    vm.getZoneList(vm.playerManualTopUp.provinceId);
                } else if (provinceId && !cityId) {
                    vm.cityList = data.data.data || [];
                    vm.getZoneList(vm.playerManualTopUp.provinceId, vm.cityList[0].id);
                } else if (provinceId && cityId) {
                    vm.districtList = data.data.data || [];
                    vm.playerManualTopUp.districtId = '';
                }
                vm.freezeZoneSelection = false;
                if (!fromInit) {
                    $scope.$evalAsync();
                }
            });
        };
        // endregion - player edit modal

        // region - contact edit
        vm.prepareEditCritical = function () {
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

            $scope.$evalAsync();
        };
        // endregion - contact edit

        // region - other player related functions
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

        vm.submitResetPlayerPassword = function () {
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
                console.log('resetPlayerPassword', data);
                vm.playerNewPassword = data.data;
                $scope.$evalAsync();
            });
        };

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
        };

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
            $scope.$evalAsync();
        };

        vm.getPaymentInfoHistory = function () {
            vm.paymetHistoryCount = 0;
            let objId;
            let type;
            let modalType;

            objId = vm.isOneSelectedPlayer()._id;
            type = "PLAYERS";

            socketService.$socket($scope.AppSocket, 'getPaymentHistory', {
                objectId: objId,
                type: type
            }, function (data) {
                console.log('payment history', data);
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
                vm.drawPaymentHistory(drawData, );

            }, null, true);
            modalType = '#modalPlayerPaymentHistory';

            $(modalType).modal();
        };

        vm.drawPaymentHistory = function (tblData) {
            let tableType;
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

            tableType = '#playerPaymentHistoryTbl';

            var aTable = $(tableType).DataTable(tableOptions);
            aTable.columns.adjust().draw();
            $(tableType).resize();
            $scope.$evalAsync();
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
                $scope.$evalAsync();
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

        vm.showSimilarPlayerTab = function (tabName) {
            vm.selectedSimilarPlayerTab = tabName == null ? "similar-phone" : tabName;

            if (vm.selectedSimilarPlayerTab === 'similar-phone') {
                vm.showPagedSimilarPhoneForPlayer();
            }
            if (vm.selectedSimilarPlayerTab === 'similar-ip') {
                vm.showPagedSimilarIpForPlayer();
            }
        };

        /**** Similar Phone tab ****/
        vm.showPagedSimilarPhoneForPlayer = function () {
            vm.similarPhoneForPlayer = {};
            vm.similarPhoneForPlayer.index = 0;
            vm.similarPhoneForPlayer.limit = vm.similarPhoneForPlayer && vm.similarPhoneForPlayer.limit ? vm.similarPhoneForPlayer.limit : 50;
            utilService.actionAfterLoaded(('#similarPhoneForPlayer'), function () {
                vm.similarPhoneForPlayer.pageObj = utilService.createPageForPagingTable("#similarPhoneForPlayerTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "similarPhoneForPlayer", vm.getPagedSimilarPhoneForPlayer)
                });
                vm.getPagedSimilarPhoneForPlayer(true);
            });
        };

        vm.getPagedSimilarPhoneForPlayer = function (newSearch) {
            vm.similarPhoneForPlayer.loading = true;
            let sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform,
                phoneNumber: vm.selectedSinglePlayer.phoneNumber,
                index: newSearch ? 0 : vm.similarPhoneForPlayer.index,
                limit: newSearch ? vm.similarPhoneForPlayer.limit : (vm.similarPhoneForPlayer.limit || 50),
                sortCol: {registrationTime: -1},
                isRealPlayer: true,
            };
            socketService.$socket($scope.AppSocket, "getPagedSimilarPhoneForPlayers", sendQuery, function (data) {
                vm.similarPhoneForPlayers = data.data.data;
                vm.similarPhoneForPlayer.totalCount = data.data.total || 0;
                vm.similarPhoneForPlayer.loading = false;
                vm.drawPagedSimilarPhoneForPlayerTable(vm.similarPhoneForPlayers, vm.similarPhoneForPlayer.totalCount, newSearch);
            })
        };

        vm.drawPagedSimilarPhoneForPlayerTable = function (data, size, newSearch) {
            let tableData = data ? data.map(item => {
                let remarks = '';
                let breakLine = "<br>";

                if (item.credibilityRemarks && item.credibilityRemarks.length > 0) {
                    item.credibilityRemarks = vm.credibilityRemarks.filter(remark => {
                        return item.credibilityRemarks.includes(remark._id);
                    });
                    item.credibilityRemarks.forEach(function (value, index) {
                        remarks += value.name + breakLine;
                    });
                    item.credibilityRemarksName = remarks;
                } else {
                    item.credibilityRemarksName = "--";
                }
                item.playerLevelName = item.playerLevel ? item.playerLevel.name : "";
                item.lastAccessTime = item.lastAccessTime ? vm.dateReformat(item.lastAccessTime) : "";
                item.registrationTime = item.registrationTime ? vm.dateReformat(item.registrationTime) : "";
                return item;
            }) : [];

            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                order: vm.similarPhoneForPlayer.aaSorting || [[5, 'desc']],
                columnDefs: [
                    {'sortCol': 'lastAccessTime', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('PLAYER_NAME'), data: 'name'},
                    {'title': $translate('realName'), data: 'realName'},
                    {'title': $translate('PLAYER_VALUE'), data: 'valueScore'},
                    {'title': $translate('CREDIBILITY_REMARK'), data: 'credibilityRemarksName'},
                    {'title': $translate('LEVEL'), data: 'playerLevelName'},
                    {'title': $translate('registrationTime'), data: 'registrationTime'},
                    {'title': $translate('lastAccessTime'), data: 'lastAccessTime'},
                    {'title': $translate('LOGIN_TIMES'), data: 'loginTimes'},
                    {'title': $translate('topUpTimes'), data: 'topUpTimes'},
                ],
                paging: false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            let a = utilService.createDatatableWithFooter('#similarPhoneForPlayerTable', option, {});
            vm.similarPhoneForPlayer.pageObj.init({maxCount: size}, newSearch);

            $('#similarPhoneForPlayerTable').off('order.dt');
            $('#similarPhoneForPlayerTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'similarPhoneForPlayer', vm.getPagedSimilarPhoneForPlayer);
            });
            $("#similarPhoneForPlayerTable").resize();
            $scope.$evalAsync();
        };

        /**** Similar IP tab ****/
        vm.showPagedSimilarIpForPlayer = function () {
            vm.similarIpForPlayer = {};
            vm.similarIpForPlayer.index = 0;
            vm.similarIpForPlayer.limit = vm.similarIpForPlayer && vm.similarIpForPlayer.limit ? vm.similarIpForPlayer.limit : 50;
            utilService.actionAfterLoaded(('#similarIpForPlayer'), function () {
                vm.similarIpForPlayer.pageObj = utilService.createPageForPagingTable("#similarIpForPlayerTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "similarIpForPlayer", vm.getPagedSimilarIpForPlayer)
                });
                vm.getPagedSimilarIpForPlayer(true);
            });
        };

        vm.getPagedSimilarIpForPlayer = function (newSearch) {
            vm.similarIpForPlayer.loading = true;
            let sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                platformId: vm.selectedSinglePlayer.platform,
                registrationIp: vm.selectedSinglePlayer.loginIps[0] || "",
                index: newSearch ? 0 : vm.similarIpForPlayer.index,
                limit: newSearch ? vm.similarIpForPlayer.limit : (vm.similarIpForPlayer.limit || 50),
                sortCol: {registrationTime: -1},
                isRealPlayer: true,
            };
            socketService.$socket($scope.AppSocket, "getPagedSimilarIpForPlayers", sendQuery, function (data) {
                vm.similarIpForPlayers = data.data.data;
                vm.similarIpForPlayer.totalCount = data.data.total || 0;
                vm.similarIpForPlayer.loading = false;
                vm.drawPagedSimilarIpForPlayerTable(vm.similarIpForPlayers, vm.similarIpForPlayer.totalCount, newSearch);
            })
        };

        vm.drawPagedSimilarIpForPlayerTable = function (data, size, newSearch) {
            let tableData = data ? data.map(item => {
                let remarks = '';
                let breakLine = "<br>";

                if (item.credibilityRemarks && item.credibilityRemarks.length > 0) {
                    item.credibilityRemarks = vm.credibilityRemarks.filter(remark => {
                        return item.credibilityRemarks.includes(remark._id);
                    })
                    item.credibilityRemarks.forEach(function (value, index) {
                        remarks += value.name + breakLine;
                    });
                    item.credibilityRemarksName = remarks;
                } else {
                    item.credibilityRemarksName = "--";
                }
                item.playerLevelName = item.playerLevel ? item.playerLevel.name : "";
                item.lastAccessTime = vm.dateReformat(item.lastAccessTime);
                item.registrationTime = vm.dateReformat(item.registrationTime);
                return item;
            }) : [];

            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                order: vm.similarIpForPlayer.aaSorting || [[5, 'desc']],
                columnDefs: [
                    {'sortCol': 'lastAccessTime', bSortable: true, 'aTargets': [5]},
                    {'sortCol': 'registrationTime', bSortable: true, 'aTargets': [6]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('PLAYER_NAME'), data: 'name'},
                    {'title': $translate('realName'), data: 'realName'},
                    {'title': $translate('PLAYER_VALUE'), data: 'valueScore'},
                    {'title': $translate('CREDIBILITY_REMARK'), data: 'credibilityRemarksName'},
                    {'title': $translate('LEVEL'), data: 'playerLevelName'},
                    {'title': $translate('registrationTime'), data: 'registrationTime'},
                    {'title': $translate('lastAccessTime'), data: 'lastAccessTime'},
                    {'title': $translate('LOGIN_TIMES'), data: 'loginTimes'},
                    {'title': $translate('topUpTimes'), data: 'topUpTimes'},
                ],
                paging: false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            let a = utilService.createDatatableWithFooter('#similarIpForPlayerTable', option, {});
            vm.similarIpForPlayer.pageObj.init({maxCount: size}, newSearch);

            $('#similarIpForPlayerTable').off('order.dt');
            $('#similarIpForPlayerTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'similarIpForPlayer', vm.getPagedSimilarIpForPlayer);
            });
            $("#similarIpForPlayerTable").resize();
            $scope.$evalAsync();
        };

        vm.sortPlayerLevels = function () {
            vm.allPlayerLvl.sort((a, b) => a.value - b.value);
        };

        vm.getPlayerLevelUpPeriodName = function (value) {
            let name = '';
            if (vm.allPlayerLevelUpPeriod) {
                for (let i = 0; i < Object.keys(vm.allPlayerLevelUpPeriod).length; i++) {
                    if (vm.allPlayerLevelUpPeriod[Object.keys(vm.allPlayerLevelUpPeriod)[i]] == value) {
                        name = Object.keys(vm.allPlayerLevelUpPeriod)[i];
                        break;
                    }
                }
            }
            return name;
        };

        vm.initiateLevelDownPeriodAllField = function () {
            for (let i = 0; i < vm.allPlayerLvl.length; i++) {
                for (let j = 0; j < vm.allPlayerLvl[i].levelDownConfig.length; j++) {
                    vm.allPlayerLvl[i].levelDownConfig[j].consumptionPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                    vm.allPlayerLvl[i].levelDownConfig[j].topupPeriod = vm.playerLevelPeriod.levelDownPeriodName;
                }
            }
        };

        vm.getPlatformGameData = function () {
            //init gametab start===============================
            vm.SelectedProvider = null;
            vm.showGameCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            //console.log("getGames", gameIds);
            socketService.$socket($scope.AppSocket, 'getPlatform', {_id: vm.selectedPlatform.id}, function (data) {
                console.log('getPlatform', data.data);
                if (data && data.data && data.data.frontendConfigurationDomainName && vm.selectedPlatform && vm.selectedPlatform.data){
                    vm.selectedPlatform.data.frontendConfigurationDomainName = data.data.frontendConfigurationDomainName;
                }
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
                });
                //payment list init
                vm.platformPaymentChList = data.data.paymentChannels;
                vm.paymentListCheck = {};
                $.each(vm.platformPaymentChList, function (i, v) {
                    vm.paymentListCheck[v._id] = true;
                });
            })
        };

        function getProposalTypeByPlatformId (id) {
            socketService.$socket($scope.AppSocket, 'getProposalTypeByPlatformId', {platformId: id}, function (data) {
                $scope.$evalAsync(() => vm.allProposalType = utilService.processProposalType(data.data));
            });
        };
        // endregion - other player related functions

        // region - player remarks
        vm.initPlayerCredibility = () => {
            vm.credibilityRemarkComment = "";
            vm.credibilityRemarkUpdateMessage = "";
            vm.somePlayerRemarksRemoved = false;
            vm.playerCredibilityRemarksUpdated = false;
            vm.prepareCredibilityConfig().then(
                () => {
                    $scope.$evalAsync(()=>{
                        if (vm.selectedSinglePlayer) {
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
                        }
                    })
                }
            );
        };

        vm.prepareCredibilityConfig = () => {
            console.log('prepareCredibilityConfig reach')
            vm.removedRemarkId = [];
            vm.setFixedCredibilityRemarks();

            return vm.getCredibilityRemarks().then(
                () => {
                    $scope.$evalAsync(()=>{
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
                })
        };

        vm.setFixedCredibilityRemarks = () => {
            let fixedRemarks = [
                {
                    name: '电话重复',
                    score: 0
                },
                {
                    name: '注册IP重复',
                    score: 0
                },
                {
                    name: '机房IP',
                    score: 0
                },
                {
                    name: '黑名单IP',
                    score: 0
                },
            ];

            let sendData = {
                platformObjId: vm.selectedPlatform.data._id,
                fixedRemarks: fixedRemarks
            };

            socketService.$socket($scope.AppSocket, 'setFixedCredibilityRemarks', sendData, function (data) {
                console.log('setFixedCredibilityRemarks', data);
            });
        };

        vm.updateRemarkInEdit = (type, action, data) => {
            let remarks;
            switch (type) {
                case "positive":
                    remarks = vm.positiveRemarks;
                    break;
                case "negative":
                    remarks = vm.negativeRemarks;
                    break;
                default:
                    remarks = vm.neutralRemarks;
            }

            switch (action) {
                case "add":
                    remarks.push(data);
                    break;
                case "update":
                    remarks.map(remark => {
                        if (remark._id === data) {
                            remark["changed"] = true;
                        }
                    });
                    break;
                case "remove":
                    for (let i = 0; i < remarks.length; i++) {
                        if (remarks[i]._id === data) {
                            remarks.splice(i, 1);
                        }
                    }
                    vm.removedRemarkId.push(data);
                    break;
            }
            $scope.$evalAsync();
        };

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
                    $scope.$evalAsync();
                },
                function (err) {
                    console.log(err);
                });
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
                vm.getPlayerDetail();
                $scope.$evalAsync();
            }, function (error) {
                vm.playerCredibilityRemarksUpdated = true;
                vm.credibilityRemarkUpdateMessage = error.error.message;
                $scope.$evalAsync();
            });
        };
        // endregion - player remarks

        // region - player credits related
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
        };

        vm.showPlayerAccountingDetailTab = function (tabName) {
            vm.selectedPlayerAccountingDetailTab = tabName == null ? "current-credit" : tabName;
        };

        vm.transferAllCreditToPlayer = function () {
            vm.transferAllCredit.isProcessing = true;

            let transferProviderId = [];

            for (let provider in vm.playerCredit) {
                if (parseFloat(vm.playerCredit[provider].gameCredit) >= 1) {
                    transferProviderId.push(vm.playerCredit[provider].providerId);
                }
            }

            if (transferProviderId.length > 0) {
                $scope.$socketPromise('checkTransferInSequence', {
                    platformObjId: vm.isOneSelectedPlayer().platform,
                    playerObjId: vm.isOneSelectedPlayer()._id,
                    providerIdArr: transferProviderId
                }).then(
                    res => {
                        if (res && res.data && res.data.length > 0) {
                            res.data.sort((a, b) => new Date(a.operationTime).getTime() - new Date(b.operationTime).getTime());

                            let p = Promise.resolve();

                            for (let i = 0; i < res.data.length; i++) {
                                let sendData = {
                                    platform: vm.selectedPlatform.data.platformId,
                                    playerId: vm.selectedSinglePlayer.playerId,
                                    providerId: res.data[i].providerId,
                                    amount: parseInt(vm.playerCredit[res.data[i].providerId].gameCredit),
                                    adminName: authService.adminName
                                };

                                $scope.$evalAsync(() => vm.transferAllCredit[res.data[i].providerId] = {finished: false});
                                console.log('will send', sendData, 'transferPlayerCreditFromProvider');

                                p = p.then(function () {
                                    return $scope.$socketPromise('transferPlayerCreditFromProvider', sendData).then(transferRes => {
                                        console.log('success', transferRes);
                                        $scope.$evalAsync(() => {
                                            vm.transferAllCredit[res.data[i].providerId].text = "Success";
                                            vm.transferAllCredit[res.data[i].providerId].finished = true;
                                        })
                                    })
                                });
                            }

                            return p;
                        }
                    }
                )
            }
            console.log('vm.creditModal', vm.creditModal);
            vm.creditModal.on("hide.bs.modal", function (a) {
                vm.creditModal.off("hide.bs.modal");
                vm.getPlayerDetail();
            });
        };

        vm.prepareShowProposal = function () {
            vm.playerProposal = {totalCount: 0};
            vm.proposalFilterstatus = 'all';
            vm.playerProposal.index = 0;
            vm.playerProposal.limit = vm.playerProposal && vm.playerProposal.limit ? vm.playerProposal.limit : 50;
            utilService.actionAfterLoaded(('#playerProposalData .endTime'), function () {
                vm.playerProposal.startTime = utilService.createDatePicker('#playerProposalData .startTime');
                vm.playerProposal.endTime = utilService.createDatePicker('#playerProposalData .endTime');
                vm.playerProposal.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerProposal.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerProposal.pageObj = utilService.createPageForPagingTable("#playerProposalTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerProposal", vm.getPlayerProposalByFilter)
                });
                //set time out to solve $rootScope:inprog error
                setTimeout(function () {
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

                    $('select#selectRewardType').multipleSelect({
                        allSelected: $translate("All Selected"),
                        selectAllText: $translate("Select All"),
                        displayValues: true,
                        countSelected: $translate('# of % selected'),
                    });
                    var $multi = ($('select#selectRewardType').next().find('.ms-choice'))[0];
                    $('select#selectRewardType').next().on('click', 'li input[type=checkbox]', function () {
                        var upText = $($multi).text().split(',').map(item => {
                            return $translate(item);
                        }).join(',');
                        $($multi).find('span').text(upText)
                    });
                    $("select#selectRewardType").multipleSelect("checkAll");

                    $('select#selectPromoType').multipleSelect({
                        allSelected: $translate("All Selected"),
                        selectAllText: $translate("Select All"),
                        displayValues: true,
                        countSelected: $translate('# of % selected'),
                    });
                    var $multi = ($('select#selectPromoType').next().find('.ms-choice'))[0];
                    $('select#selectPromoType').next().on('click', 'li input[type=checkbox]', function () {
                        var upText = $($multi).text().split(',').map(item => {
                            return $translate(item);
                        }).join(',');
                        $($multi).find('span').text(upText)
                    });
                    $("select#selectPromoType").multipleSelect("checkAll");

                    vm.getPlayerProposalByFilter(true);
                });
            });
        };

        vm.getPlayerProposalByFilter = function (newSearch) {
            var newproposalQuery = {};
            var proposalNames = $('select#selectProposalType').multipleSelect("getSelects");
            newproposalQuery.proposalTypeName = [];
            if (vm.allProposalType.length != proposalNames.length) {
                vm.allProposalType.filter(item => {
                    if (proposalNames.indexOf(item.name) > -1) {
                        newproposalQuery.proposalTypeName.push(item.name);
                    }
                });
            }

            var rewardTypes = $('select#selectRewardType').multipleSelect("getSelects");
            newproposalQuery.eventName = [];
            if (vm.rewardList.length != rewardTypes.length) {
                vm.rewardList.filter(item => {
                    if (rewardTypes.indexOf(item.name) > -1) {
                        newproposalQuery.eventName.push(item.name);
                    }
                });
            }

            var promoType = $('select#selectPromoType').multipleSelect("getSelects");
            newproposalQuery.promoTypeName = [];
            if (vm.promoTypeList.length != promoType.length) {
                vm.promoTypeList.filter(item => {
                    if (promoType.indexOf(item.name) > -1) {
                        newproposalQuery.promoTypeName.push(item.name);
                    }
                });
            }

            newproposalQuery.status = [];
            if (vm.proposalFilterstatus == "all") {
                newproposalQuery.status = vm.allProposalStatus;
            } else {
                if (vm.proposalFilterstatus == vm.proposalStatusList.SUCCESS) {
                    newproposalQuery.status.push("Approved");
                } else if (vm.proposalFilterstatus == vm.proposalStatusList.FAIL) {
                    newproposalQuery.status.push("Rejected");
                }
                newproposalQuery.status.push(vm.proposalFilterstatus)
            }

            vm.playerProposal.loading = true;
            let sendData = {
                startDate: vm.playerProposal.startTime.data('datetimepicker').getLocalDate(),
                endDate: vm.playerProposal.endTime.data('datetimepicker').getLocalDate(),
                adminId: authService.adminId,
                platformId: vm.selectedSinglePlayer.platform,
                type: newproposalQuery.proposalTypeName,
                size: vm.playerProposal.limit || 50,
                index: newSearch ? 0 : (vm.playerProposal.index || 0),
                sortCol: vm.playerProposal.sortCol,
                status: newproposalQuery.status,
                playerId: vm.selectedSinglePlayer._id,
                eventName: newproposalQuery.eventName,
                promoTypeName: newproposalQuery.promoTypeName
            };

            socketService.$socket($scope.AppSocket, 'getQueryProposalsForAdminId', sendData, function (data) {
                console.log('playerproposal', data);
                vm.playerProposal.loading = false;

                var drawData = data.data.data.map(item => {
                    item.involveAmount$ = 0;
                    if (item.data.updateAmount) {
                        item.involveAmount$ = item.data.updateAmount;
                    } else if (item.data.amount) {
                        item.involveAmount$ = item.data.amount;
                    } else if (item.data.rewardAmount) {
                        item.involveAmount$ = item.data.rewardAmount;
                    } else if (item.data.commissionAmount) {
                        item.involveAmount$ = item.data.commissionAmount;
                    } else if (item.data.negativeProfitAmount) {
                        item.involveAmount$ = item.data.negativeProfitAmount;
                    }
                    item.involveAmount$ = $noRoundTwoDecimalPlaces(item.involveAmount$);
                    item.typeName = $translate(item.type.name || "Unknown");
                    item.mainType$ = $translate(item.mainType || "Unknown");
                    item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                    item.status$ = $translate(item.status ? item.type.name == "PlayerBonus" || item.type.name == "PartnerBonus" ? item.status == "Approved" ? "approved" : item.status : item.status : item.process.status);
                    return item;
                })
                vm.playerProposal.totalCount = data.data.size;
                vm.drawPlayerProposal(drawData, newSearch, data.data.summary);
            }, null, true);
        };

        vm.drawPlayerProposal = function (tblData, newSearch, summary) {
            var option = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.playerProposal.aaSorting,
                aoColumnDefs: [
                    {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [8]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],

                columns: [
                    {
                        title: $translate('PROPOSAL_NO'),
                        data: "proposalId",
                        render: function (data, type, row) {
                            var link = $('<a>', {

                                'ng-click': 'vm.showProposalModal("' + data + '",1)'

                            }).text(data);
                            return link.prop('outerHTML');
                        },
                        sClass: "proposalLinks"
                    },
                    {
                        title: $translate('CREATOR'),
                        data: null,
                        render: function (data, type, row) {
                            if (data.hasOwnProperty('creator')) {
                                return data.creator.name;
                            } else {

                                //here's to check creator is not null
                                var creator;
                                if(data && data.creator){

                                    if(data.creator.type === "admin"){
                                        creator = data.creator.name;

                                    }else if(data.creator.type === "player"){
                                        creator = $translate('System');
                                        creator += "(" + data.creator.name + ")";
                                    }

                                }else{
                                    //found out not all proposal has creator, this original checking for non-creator proposal
                                    creator = $translate('System');
                                    if (data && data.data && data.data.playerName) {
                                        creator += "(" + data.data.playerName + ")";
                                    }
                                }
                                return creator;

                                //This is the original, revert it if the new checking doesn't work
                                // var creator = $translate('System');
                                // if (data && data.data && data.data.playerName) {
                                //     creator += "(" + data.data.playerName + ")";
                                // }
                                // return creator;
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
                    },
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
                        title: "<div>" + $translate('REMARKS'), data: "data.remark",
                        orderable: false,
                    }

                ],
                // destroy: true,
                paging: false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $(nRow).off('click');
                    $(nRow).find('a').on('click', function () {
                        vm.showProposalModal(aData.proposalId, 1);
                    });
                }
                // autoWidth: true
            });

            // $('#playerProposalTable').DataTable(option);
            var a = utilService.createDatatableWithFooter('#playerProposalTable', option, {7: summary.amount});

            vm.playerProposal.pageObj.init({maxCount: vm.playerProposal.totalCount}, newSearch);
            $("#playerProposalTable").off('order.dt');
            $("#playerProposalTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerProposal', vm.getPlayerProposalByFilter);
            });
            // setTimeout(function () {
            $('#playerProposalTable').resize();
            // }, 300);
            $scope.$evalAsync();
        };

        vm.getPlayerCreditInProvider = function (userName, providerId, targetObj) {
            var sendStr = 'getPlayerCreditInProvider';
            socketService.$socket($scope.AppSocket, sendStr, {
                providerId: providerId,
                userName: userName,
                platformId: vm.selectedPlatform.data.platformId
            });
            $scope.AppSocket.removeAllListeners('_' + sendStr);
            $scope.AppSocket.on('_' + sendStr, function (data) {
                if (data.success) {
                    $scope.$evalAsync(() => {
                        var provId = data.data.providerId;
                        targetObj[provId] = data.data || 0;
                    })
                }
            });
        };

        vm.showProposalModal = function (proposalId, templateNo) {
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: vm.selectedPlatform.id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;
                vm.proposalDetailStyle = {};

                vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm);

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
                        // vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE")
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

                let tmpt = vm.proposalTemplate[templateNo];
                $(tmpt).modal('show');
                if (templateNo == 1) {
                    $(tmpt).css('z-Index', 1051).modal();
                }

                $(tmpt).on('shown.bs.modal', function (e) {
                    $scope.$evalAsync();
                })


            })
        };

        vm.prepareShowPlayerExpense = function () {
            console.log('just in case, is here reached?')
            vm.playerExpenseLog = {totalCount: 0};
            vm.playerExpenseLog.index = 0;
            vm.playerExpenseLog.limit = vm.playerExpenseLog && vm.playerExpenseLog.limit ? vm.playerExpenseLog.limit : 50;
            vm.initQueryTimeFilter('playerExpense', function () {
                $('#modalPlayerExpenses').modal();
                vm.playerExpenseLog.pageObj = utilService.createPageForPagingTable("#playerExpenseTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerExpenseLog", vm.getPlayerExpenseByFilter)
                });
                vm.getPlayerExpenseByFilter(true);
            });

            // Consumption summary
            $scope.$socketPromise('getPlayerConsumptionSummary', {playerId: vm.selectedSinglePlayer._id}).then(
                data => console.log('Consumption summary', data.data)
            )
        };

        vm.getPlayerExpenseByFilter = function (newSearch) {
            let sendData = {
                startTime: vm.queryPara.playerExpense.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.queryPara.playerExpense.endTime.data('datetimepicker').getLocalDate(),
                playerId: vm.isOneSelectedPlayer()._id,
                index: newSearch ? 0 : (vm.playerExpenseLog.index || 0),
                limit: newSearch ? vm.playerExpenseLog.limit : (vm.playerExpenseLog.limit || 50),
                sortCol: vm.playerExpenseLog.sortCol || null
            };

            if (vm.queryPara.playerExpense.providerId) {
                sendData.providerId = vm.queryPara.playerExpense.providerId
            }
            if (vm.queryPara.playerExpense.gameName) {
                sendData.gameName = vm.queryPara.playerExpense.gameName;
            }
            if (vm.queryPara.playerExpense.roundNoOrPlayNo) {
                sendData.roundNoOrPlayNo = vm.queryPara.playerExpense.roundNoOrPlayNo;
            }
            if (vm.queryPara.playerExpense.cpGameType) {
                sendData.cpGameType = vm.queryPara.playerExpense.cpGameType;
            }
            vm.playerExpenseLog.loading = true;
            console.log("Query", sendData);
            vm.prepareShowPlayerExpenseRecords(sendData, newSearch);
            $("#playerExpenseTable").off('order.dt');
            $("#playerExpenseTable").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerExpenseLog', vm.getPlayerExpenseByFilter);
            });
        };

        vm.prepareShowPlayerExpenseRecords = function (queryData, newSearch) {
            vm.playerAllExpenseRecords = [];
            socketService.$socket($scope.AppSocket, 'getPlayerConsumptionRecords', queryData, function (data) {
                vm.playerAllExpenseRecords = data.data.data;
                vm.playerExpenseLog.totalCount = data.data.size;
                var summary = data.data.summary || {};
                vm.playerExpenseLog.loading = false;
                console.log('consumption record', data);
                var validAmount = 0;
                var amount = 0;
                var bonusAmount = 0;
                var tableData = vm.playerAllExpenseRecords.map(
                    record => {
                        validAmount += Number(record.validAmount);
                        amount += Number(record.amount);
                        bonusAmount += Number(record.bonusAmount);
                        record.createTime$ = vm.dateReformat(record.createTime);
                        record.insertTime$ = vm.dateReformat(record.insertTime);
                        record.updateTime$ = vm.dateReformat(record.updateTime);
                        record.validAmount$ = parseFloat(record.validAmount).toFixed(2);
                        record.amount$ = parseFloat(record.amount).toFixed(2);
                        record.bonusAmount$ = parseFloat(record.bonusAmount).toFixed(2);
                        record.commissionAmount$ = parseFloat(record.commissionAmount).toFixed(2);
                        record.bDirty$ = record.bDirty ? $translate('UNABLE') : $translate('ABLE');
                        record.roundResult$ = record.result || "";
                        record.roundId$ = record.roundNo || "";
                        record.matchId$ = record.playNo || "";
                        record.gameType$ = record.cpGameType || record.gameId.name || "";
                        record.betType$ = record.betType || "";
                        record.remark$ = record.playDetail || "";
                        return record
                    }
                );
                vm.totalConsumptionAmount = parseFloat(amount).toFixed(2);
                vm.totalConsumptionValidAmount = parseFloat(validAmount).toFixed(2);
                vm.totalConsumptionBonusAmount = parseFloat(bonusAmount).toFixed(2);
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tableData,
                    "aaSorting": vm.playerExpenseLog.aaSorting || [[7, 'desc']],
                    aoColumnDefs: [
                        {'sortCol': 'orderNo', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [7]},
                        {'sortCol': 'providerId', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'gameId', bSortable: true, 'aTargets': [5]},
                        {'sortCol': 'validAmount', bSortable: true, 'aTargets': [8]},
                        {'sortCol': 'amount', bSortable: true, 'aTargets': [10]},
                        {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [9]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],

                    columns: [
                        {title: $translate('orderId'), data: "orderNo"},
                        {title: $translate('PROVIDER'), data: "providerId.name"},
                        {title: $translate('ROUND_RESULT'), data: "roundResult$"},
                        {title: $translate('ROUND_ID'), data: "roundId$"},
                        {title: $translate('MATCH_ID'), data: "matchId$"},
                        {title: $translate('GAME_TYPE'), data: "gameType$"},
                        {title: $translate('BET_TYPE'), data: "betType$", sClass: 'sumText'},
                        {
                            title: $translate('BET_TIME'),
                            data: "createTime$",
                            render: function (data, type, row) {
                                let insertTime$ = row && row.insertTime$ || "";
                                let updateTime$ = row && row.updateTime$ || "";
                                return "<span title='" + $translate("INSERT_TIME") + ": " + insertTime$ + "&#013;" +  $translate("UPDATE_TIME") + ": " + updateTime$ + "'>" + data + "</span>";
                            }
                        },
                        {title: $translate('VALID_AMOUNT'), data: "validAmount$", sClass: 'alignRight sumFloat'},
                        {
                            title: $translate('bonusAmount1'),
                            data: "bonusAmount$", sClass: 'alignRight sumFloat'
                        },
                        {
                            title: $translate('Total Amount'),
                            data: "amount$",
                            bSortable: true,
                            sClass: 'alignRight sumFloat'
                        },
                        {title: $translate('REMARK'), data: "remark$"},
                        {title: $translate('COUNT'), data: "count"},
                    ],
                    destroy: true,
                    paging: false,
                    autoWidth: true
                });
                utilService.createDatatableWithFooter('#playerExpenseTable', option, {
                    8: summary.validAmountSum,
                    9: summary.bonusAmountSum,
                    10: summary.amountSum,
                });
                vm.playerExpenseLog.pageObj.init({maxCount: vm.playerExpenseLog.totalCount}, newSearch);
                setTimeout(function () {
                    $('#playerExpenseTable').resize();
                }, 300);
            });
        };

        vm.showPagedPlayerCreditChangeLog = function () {
            $('#modalPlayerCreditChangeLog').modal().show();
            vm.playerCreditChangeLog = {};
            vm.playerCreditChangeLog.type = 'none';
            vm.playerCreditChangeLog.index = 0;
            vm.playerCreditChangeLog.limit = vm.playerCreditChangeLog && vm.playerCreditChangeLog.limit ? vm.playerCreditChangeLog.limit : 50;
            utilService.actionAfterLoaded(('#playerCreditChangeLog .endTime'), function () {
                vm.playerCreditChangeLog.startTime = utilService.createDatePicker('#playerCreditChangeLog .startTime');
                vm.playerCreditChangeLog.endTime = utilService.createDatePicker('#playerCreditChangeLog .endTime');
                vm.playerCreditChangeLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerCreditChangeLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerCreditChangeLog.pageObj = utilService.createPageForPagingTable("#playerCreditChangeLogTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerCreditChangeLog", vm.getPagedPlayerCreditChangeLog)
                });
                vm.getPagedPlayerCreditChangeLog(true);
            });
        };

        vm.getPagedPlayerCreditChangeLog = function (newSearch) {
            vm.playerCreditChangeLog.loading = true;
            let sendQuery = {
                playerId: vm.isOneSelectedPlayer()._id,
                startTime: vm.playerCreditChangeLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerCreditChangeLog.endTime.data('datetimepicker').getLocalDate(),
                type: vm.playerCreditChangeLog.type,
                index: newSearch ? 0 : vm.playerCreditChangeLog.index,
                limit: newSearch ? vm.playerCreditChangeLog.limit : (vm.playerCreditChangeLog.limit || 50),
                sortCol: vm.playerCreditChangeLog.sortCol,
            };
            socketService.$socket($scope.AppSocket, "getPagedPlayerCreditChangeLogs", sendQuery, function (data) {
                vm.playerCreditChangeLogs = vm.processCreditChangeLogData(data.data.data);
                vm.playerCreditChangeLog.totalCount = data.data.total || 0;
                vm.playerCreditChangeLog.totalChanged = data.data.totalChanged || 0;
                vm.playerCreditChangeLog.loading = false;
                vm.drawPagedCreditChangeQueryTable(vm.playerCreditChangeLogs, vm.playerCreditChangeLog.totalCount, vm.playerCreditChangeLog.totalChanged, newSearch);
            })
        };

        vm.drawPagedCreditChangeQueryTable = function (data, size, totalChangedAmount, newSearch) {
            let tableData = data.map(item => {
                item.createTime$ = vm.dateReformat(item.operationTime);
                item.operationType$ = $translate(item.operationType);
                item.beforeAmount = item.curAmount - item.amount;
                if (item.beforeAmount < 0) {
                    item.beforeAmount = 0
                }
                item.beforeAmount = $noRoundTwoDecimalPlaces(item.beforeAmount);
                item.beforeUnlockedAmount = item.lockedAmount - item.changedLockedAmount;
                item.beforeUnlockedAmount = $noRoundTwoDecimalPlaces(item.beforeUnlockedAmount);
                let remark = (item.data && item.data.remark) ? $translate('remark') + ':' + item.data.remark + ', ' : '';
                item.details$ = remark + item.detail.join(', ');
                item.proposalId$ = item.data ? item.data.proposalId : '';
                item.totalAmountBefore$ = $noRoundTwoDecimalPlaces((Number(item.beforeAmount) + Number(item.beforeUnlockedAmount))) + "(" + item.beforeAmount + "/" + item.beforeUnlockedAmount + ")";
                item.totalAmountAfter$ = $noRoundTwoDecimalPlaces((Number(item.curAmount) + Number(item.lockedAmount))) + "(" + item.curAmount + "/" + item.lockedAmount + ")";
                item.totalChangedAmount$ = $noRoundTwoDecimalPlaces((Number(item.amount) + Number(item.changedLockedAmount))) + "(" + item.amount + "/" + item.changedLockedAmount + ")";
                return item;
            });

            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                order: vm.playerCreditChangeLog.aaSorting || [[0, 'desc']],
                columnDefs: [
                    {'sortCol': 'operationTime', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'operationType', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('CREATE_TIME'), data: 'createTime$'},
                    {'title': $translate('Type'), data: 'operationType$', sClass: "wordWrap width10Per"},
                    {
                        'title': $translate('LOCAL_TOTAL_AMOUNT_BEFORE'),
                        data: 'totalAmountBefore$',
                        sClass: "sumText wordWrap"
                    },
                    {
                        'title': $translate('AMOUNT_CHANGE'),
                        data: 'totalChangedAmount$',
                        sClass: "sumFloat textRight",
                        render: function (data, type, row) {
                            var link = $('<span>', {
                                'class': ((Number(row.amount) + Number(row.changedLockedAmount)) < 0 ? "text-danger" : "")
                            }).text(data);
                            return link.prop('outerHTML');

                        }
                    },
                    {'title': $translate('LOCAL_TOTAL_AMOUNT_AFTER'), data: 'totalAmountAfter$', sClass: "wordWrap"},
                    {
                        'title': $translate('View Details'),
                        data: 'details$',
                        sClass: "wordWrap width30Per",
                        render: function (data, type, row) {
                            if (row.proposalId$) {
                                let proposalText = $translate('PROPOSAL_NO') + ": " + row.proposalId$;
                                var link = $('<a>', {
                                    'ng-click': 'vm.showProposalModalNoObjId("' + row.proposalId$ + '",1)'

                                }).text(proposalText);
                                return link.prop('outerHTML');
                            } else {
                                let details = "";
                                for (let i = 0; i < Object.keys(row.data).length; i++) {
                                    if (Object.keys(row.data)[i] == "transferId" || Object.keys(row.data)[i] == "providerName") {
                                        if (details)
                                            details += "/ ";
                                        details += $translate(Object.keys(row.data)[i]) + ": " + row.data[Object.keys(row.data)[i]];
                                    }
                                }
                                return details;
                            }
                        }
                    }
                ],
                paging: false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            var a = utilService.createDatatableWithFooter('#playerCreditChangeLogTable', option, {
                3: totalChangedAmount
            });
            vm.playerCreditChangeLog.pageObj.init({maxCount: size}, newSearch);

            $('#playerCreditChangeLogTable').off('order.dt');
            $('#playerCreditChangeLogTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerCreditChangeLog', vm.getPagedPlayerCreditChangeLog);
            });
            $("#playerCreditChangeLogTable").resize();
            $scope.$evalAsync();
        };

        vm.processCreditChangeLogData = function (data) {
            return data ? data.map(a => {
                if (!a) return;
                var checkForObjIdRegExp = new RegExp(/^[a-f\d]{24}$/i);
                var newStr = [];
                a.amount = a.amount != null ? a.amount.toFixed(2) : new Number(0).toFixed(2);
                a.curAmount = a.curAmount != null ? a.curAmount.toFixed(2) : new Number(0).toFixed(2);
                a.lockedAmount = a.lockedAmount != null ? a.lockedAmount.toFixed(2) : new Number(0).toFixed(2);
                a.changedLockedAmount = a.changedLockedAmount != null ? a.changedLockedAmount.toFixed(2) : new Number(0).toFixed(2);
                var newObj = $.extend({}, a.data);
                delete newObj.creator;
                // switch (a.operationType) {
                //     case "TopUp":
                //         break;
                //     case "ManualTopUp":
                //         newObj = {proposalId: newObj.proposalId};
                //         break;
                // }
                if (a.data && a.data._inputCredit != null && a.data.initAmount != null) {
                    newObj = {rewardType: a.data.rewardType};
                } else if (a.data && a.data.proposalId && a.operationType == 'ManualTopUp') {
                    newObj = {proposalId: newObj.proposalId};
                }
                $.each(newObj, (i, v) => {
                    if (!checkForObjIdRegExp.test(v)) {
                        if (i == 'createTime') {
                        } else if (i == '__v') {
                        } else if (i == 'remark') {
                        } else if (i == 'data') {
                        } else {
                            newStr.push($translate(i) + ':' + $translate(v))
                        }
                    }
                })
                a.detail = newStr
                return a;
            }) : [];
        };

        vm.showPlatformCreditTransferLog = function (isPopup) {
            isPopup === true ? false : true;
            let panelBody, tablePage;
            if (isPopup) {
                $('#modalPlatformCreditTransferLog').modal().show();
                panelBody = 'platformCreditTransferLogPopup';
                tablePage = 'platformCreditTransferLogPopupTablePage';
                vm.queryPlatformCreditTransferPlayerName = "";
            }
            else {
                panelBody = 'platformCreditTransferLog';
                tablePage = 'platformCreditTransferLogTablePage';
            }
            vm.showPlatformRepair = false;
            vm.linkedPlayerTransferId = null;
            vm.creditChange = {
                finalValidAmount: $translate("Unknown"),
                finalLockedAmount: $translate("Unknown"),
                number: 0,
                remark: ''
            };
            vm.queryPlatformCreditTransferStatus = 'default';
            vm.platformCreditTransferLog = {};
            vm.platformCreditTransferLog.isPopup = isPopup === true;
            vm.platformCreditTransferLog.index = 0;
            vm.platformCreditTransferLog.limit = vm.platformCreditTransferLog && vm.platformCreditTransferLog.limit ? vm.platformCreditTransferLog.limit : 50;
            utilService.actionAfterLoaded(('#' + panelBody), function () {
                vm.platformCreditTransferLog.startTime = utilService.createDatePicker('#' + panelBody + ' .startTime');
                vm.platformCreditTransferLog.endTime = utilService.createDatePicker('#' + panelBody + ' .endTime');
                vm.platformCreditTransferLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.platformCreditTransferLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.platformCreditTransferLog.pageObj = utilService.createPageForPagingTable('#' + tablePage, {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, 'platformCreditTransferLog', vm.getPagedPlatformCreditTransferLog)
                });
                vm.getPagedPlatformCreditTransferLog(true, isPopup);
            });
        };

        vm.getPagedPlatformCreditTransferLog = function (newSearch) {
            vm.platformCreditTransferLog.loading = true;
            let defaultPlatformCreditTransferStatus;
            $scope.$evalAsync();
            let sendQuery = {
                PlatformObjId: vm.selectedPlatform.id,
                startTime: vm.platformCreditTransferLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.platformCreditTransferLog.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.platformCreditTransferLog.index,
                limit: newSearch ? vm.platformCreditTransferLog.limit : (vm.platformCreditTransferLog.limit || 50),
                sortCol: vm.platformCreditTransferLog.sortCol
            };

            if (vm.queryPlatformCreditTransferStatus == 'default'){
                defaultPlatformCreditTransferStatus = {$in: [vm.allPlayerCreditTransferStatus.SUCCESS, vm.allPlayerCreditTransferStatus.FAIL, vm.allPlayerCreditTransferStatus.TIMEOUT]};
            }
            vm.queryPlatformCreditTransferStatus ?  vm.queryPlatformCreditTransferStatus == 'default' ? sendQuery.status =  defaultPlatformCreditTransferStatus : sendQuery.status = vm.queryPlatformCreditTransferStatus : '';
            vm.queryPlatformCreditTransferType ? sendQuery.type = vm.queryPlatformCreditTransferType : '';
            vm.queryPlatformCreditTransferProvider ? sendQuery.provider = vm.queryPlatformCreditTransferProvider : '';
            vm.queryPlatformCreditTransferPlayerName ? sendQuery.playerName = vm.queryPlatformCreditTransferPlayerName : '';

            socketService.$socket($scope.AppSocket, "getPagedPlatformCreditTransferLog", sendQuery, function (data) {
                vm.platformCreditTransferLogData = data.data.data;
                vm.platformCreditTransferLog.totalCount = data.data.total || 0;
                vm.platformCreditTransferLog.loading = false;
                vm.drawPagedPlatformCreditTransferQueryTable(vm.platformCreditTransferLogData, vm.platformCreditTransferLog.totalCount, newSearch);
            });

            // function getAllPlayerCreditTransferStatus() {
            //     vm.playerIDArr = [];
            //     return $scope.$socketPromise('getAllPlayerCreditTransferStatus')
            //         .then(data => {
            //             vm.allPlayerCreditTransferStatus = data.data;
            //             $scope.$evalAsync();
            //         });
            // }
            //
            // getAllPlayerCreditTransferStatus();
        };

        vm.drawPagedPlatformCreditTransferQueryTable = function (data, size, newSearch) {
            let tableData = data.map(item => {
                item.createTime$ = vm.dateReformat(item.createTime);
                item.typeText = $translate(item.type);
                item.providerText = vm.getProviderText(item.providerId);
                item.lockedAmount$ = item.lockedAmount.toFixed(2);
                return item;
            });
            let option = $.extend({}, vm.generalDataTableOptions, {
                data: tableData,
                "order": vm.platformCreditTransferLog.aaSorting || [[0, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'createTime', 'aTargets': [0], bSortable: true},
                    {'sortCol': 'transferId', 'aTargets': [1], bSortable: true},
                    {'sortCol': 'playerName', 'aTargets': [2], bSortable: true},
                    {'sortCol': 'amount', 'aTargets': [3], bSortable: true},
                    {'sortCol': 'providerId', 'aTargets': [4], bSortable: true},
                    {'sortCol': 'amount', 'aTargets': [5], bSortable: true},
                    {'sortCol': 'lockedAmount', 'aTargets': [6], bSortable: true},
                    {'sortCol': 'type', 'aTargets': [7], bSortable: true},
                    {'sortCol': 'status', 'aTargets': [8], bSortable: true}
                ],
                columns: [
                    {title: $translate('CREATE_TIME'), data: 'createTime$'},
                    {title: $translate("TRANSFER") + " ID", data: 'transferId'},
                    {title: $translate('playerName'), data: 'playerName'},
                    {
                        title: $translate("CREDIT"),
                        data: 'amount',
                        render: function (data, type, row) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    {title: $translate("provider"), data: 'providerText'},
                    {
                        title: $translate("amount"),
                        data: 'amount',
                        render: function (data, type, row) {
                            return parseFloat(data).toFixed(2);
                        }
                    },
                    {title: $translate("LOCKED_CREDIT"), data: 'lockedAmount$'},
                    {title: $translate("TYPE"), data: 'typeText'},
                    {
                        title: $translate("STATUS"),
                        render: function (data, type, row) {
                            return $translate($scope.constPlayerCreditTransferStatus[row.status]);
                        }
                    }
                ],
                paging: false,
            });


            let tableElem = vm.platformCreditTransferLog.isPopup ? '#platformCreditTransferLogPopupTable' : '#platformCreditTransferLogTable';
            console.log(tableElem);
            let table = utilService.createDatatableWithFooter(tableElem, option, {});
            vm.platformCreditTransferLog.pageObj.init({maxCount: size}, newSearch);

            $(tableElem + ' tbody').off('click', "**");
            $(tableElem + ' tbody').on('click', 'tr', function () {

                vm.selectedThisPlayer = false;
                let errorLogObjReady = false;
                if ($(this).hasClass('selected')) {
                    $(this).removeClass('selected');
                    vm.linkedPlayerTransferId = null;
                    $scope.$evalAsync();
                } else {
                    table.$('tr.selected').removeClass('selected');
                    $(this).addClass('selected');
                    const record = table.row(this).data();

                    let startTime = vm.platformCreditTransferLog.startTime.data('datetimepicker').getLocalDate();
                    let endTime = vm.platformCreditTransferLog.endTime.data('datetimepicker').getLocalDate();

                    var playerTransfer;
                    socketService.$socket($scope.AppSocket, 'getPlayerInfo', {_id: record.playerObjId}, function (reply) {
                        vm.selectedThisPlayer = reply.data;
                        updateShowPlayerCredit();
                    });

                    socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {
                        playerObjId: record.playerObjId,
                        transferId: record.transferId
                    }, function (data) {
                        console.log('getPlayerTransferErrorLogs', data); // todo :: delete log after problem solved
                        data.data.forEach(function (playerTransLog) {
                            if (playerTransLog._id == record._id) {
                                playerTransfer = playerTransLog
                            }
                        })
                        errorLogObjReady = true;
                        updateShowPlayerCredit();
                    });
                }

                function updateShowPlayerCredit() {
                    if (!errorLogObjReady || !vm.selectedThisPlayer) return;
                    if (!playerTransfer) {
                        vm.linkedPlayerTransferId = null;
                        $scope.$evalAsync();
                        return;
                    }

                    vm.linkedPlayerTransfer = playerTransfer;
                    vm.linkedPlayerTransferId = playerTransfer._id;
                    vm.creditChange.finalValidAmount = parseFloat(playerTransfer.amount - playerTransfer.lockedAmount
                        + vm.selectedThisPlayer.validCredit).toFixed(2);
                    vm.creditChange.finalLockedAmount = parseFloat(playerTransfer.lockedAmount).toFixed(2);
                    $scope.$evalAsync();
                }
            })

            $(tableElem).off('order.dt');
            $(tableElem).on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'platformCreditTransferLog', vm.getPagedPlatformCreditTransferLog);
            });
            $(tableElem).resize();
            $scope.$evalAsync();
        };

        vm.prepareRepairTransfer = function () {
            vm.showPlatformRepair = !vm.showPlatformRepair;
            if (vm.showPlatformRepair && !vm.creditChange) {
                vm.creditChange = {
                    finalValidAmount: $translate("Unknown"),
                    finalLockedAmount: $translate("Unknown"),
                    number: 0,
                    remark: ''
                };
            }
        };

        vm.submitRepairTransfer = function () {
            let startTime = vm.platformCreditTransferLog.startTime.data('datetimepicker').getLocalDate();
            let endTime = vm.platformCreditTransferLog.endTime.data('datetimepicker').getLocalDate();

            socketService.$socket($scope.AppSocket, 'getPlayerTransferErrorLogs', {
                    playerObjId: vm.selectedThisPlayer._id,
                    transferObjId: vm.linkedPlayerTransferId
                }
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
                            curAmount: vm.selectedThisPlayer.validCredit,
                            realName: vm.selectedThisPlayer.realName,
                            remark: vm.creditChange.remark,
                            adminName: authService.adminName
                        }
                    };

                    if (vm.linkedPlayerTransferId) {
                        sendData.data.transferId = playerTransfer.transferId;
                        //if reward task is still there fix locked amount otherwise fix valid amount
                        if (vm.isOneSelectedPlayer() && vm.isOneSelectedPlayer().rewardInfo && vm.isOneSelectedPlayer().rewardInfo.length > 0) {
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
                        vm.getPlayerDetail();
                        $scope.$evalAsync();
                    });
                });
        };

        vm.showProposalModal = function (proposalId, templateNo) {
            socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                platformId: vm.selectedPlatform.id,
                proposalId: proposalId
            }, function (data) {
                vm.selectedProposal = data.data;
                vm.proposalDetailStyle = {};

                vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm);

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
                        // vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE")
                        commonService.getProvinceName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"];
                        });
                    }
                    if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                        // vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                        commonService.getCityName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]).catch(err => Promise.resolve('')).then(data => {
                            vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"] = data ? data : vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"];
                        });
                    }
                }


                let tmpt = vm.proposalTemplate[templateNo];
                $(tmpt).modal('show');
                if (templateNo == 1) {
                    $(tmpt).css('z-Index', 1051).modal();
                }

                $(tmpt).on('shown.bs.modal', function (e) {
                    $scope.$evalAsync();
                })


            })
        };

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
                            $scope.$evalAsync();
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
            } else if (fieldName === 'definePlayerLoginMode') {
                result = $translate($scope.playerLoginMode[val]);
            } else if (fieldName === 'rewardInterval') {
                result = $translate($scope.rewardInterval[val]);
            } else if (fieldName === 'gameProviderInEvent') {
                let index = vm.allGameProviders.findIndex(p => p._id.toString() == val.toString());
                if (index != -1){
                    result =  vm.allGameProviders[index].name;
                }
            } else if (fieldName === 'bankName2' || fieldName === 'bankName3') {
                result = vm.allBankTypeList && vm.allBankTypeList[val] ? vm.allBankTypeList[val] : (val + " ! " + $translate("not in bank type list"));
            }
            return $sce.trustAsHtml(result);
        };

        vm.initPlayerCreditLog = function () {
            vm.playerCreditLog = vm.playerCreditLog || {totalCount: 0, limit: 50, index: 0, query: {}};
            // utilService.actionAfterLoaded('#modalPlayerCreditLog.in #playerCreditLogQuery .endTime', function () {
            utilService.actionAfterLoaded('#modalPlayerAccountingDetail #playerCreditLogQuery .endTime', function () {
                vm.playerCreditLog.query.startTime = utilService.createDatePicker('#playerCreditLogQuery .startTime');
                vm.playerCreditLog.query.endTime = utilService.createDatePicker('#playerCreditLogQuery .endTime');
                vm.playerCreditLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerCreditLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerCreditLog.pageObj = utilService.createPageForPagingTable("#playerCreditLogTblPage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerCreditLog", vm.getPlayerCreditLogData)
                });
                vm.getPlayerCreditLogData(true);
            });
        };

        vm.getPlayerCreditLogData = function (newSearch) {
            if (!authService.checkViewPermission('Player', 'Credit', 'playerDailyCreditLog')) {
                return;
            }
            let sendQuery = {
                playerId: vm.selectedSinglePlayer._id,
                from: vm.playerCreditLog.query.startTime.data('datetimepicker').getLocalDate(),
                to: vm.playerCreditLog.query.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.playerCreditLog.index,
                limit: newSearch ? vm.playerCreditLog.limit : (vm.playerCreditLog.limit || 50),
                sortCol: vm.playerCreditLog.sortCol || null
            };
            socketService.$socket($scope.AppSocket, 'getPlayerCreditsDaily', sendQuery, function (data) {
                console.log('getPlayerDailyCredit', data);
                var tblData = data && data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.validCredit = (item.validCredit).toFixed(2);
                    item.lockedCredit = (item.lockedCredit).toFixed(2);
                    item.gameCredit = (item.gameCredit).toFixed(2);
                    item.providerStr$ = '(' + ((item.targetProviders && item.targetProviders.length > 0) ? item.targetProviders.map(pro => {
                        return pro.name + ' ';
                    }) : $translate('all')) + ')';
                    return item;
                }) : [];
                var size = data.data ? data.data.size : 0;
                vm.playerCreditLog.totalCount = size;
                vm.drawPlayerCreditLogTable(newSearch, tblData, size);
            });
        };

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

            $scope.$evalAsync();
        };

        vm.showPagedPlayerRewardTaskLog = function () {
            // $('#modalPlayerCreditChangeLog').modal().show();
            vm.playerRewardTaskLog = {};
            vm.playerRewardTaskLog.type = 'none';
            vm.playerRewardTaskLog.index = 0;
            vm.playerRewardTaskLog.limit = vm.playerRewardTaskLog && vm.playerRewardTaskLog.limit ? vm.playerRewardTaskLog.limit : 50;
            utilService.actionAfterLoaded(('#playerRewardTaskLog .endTime'), function () {
                vm.playerRewardTaskLog.startTime = utilService.createDatePicker('#playerRewardTaskLog .startTime');
                vm.playerRewardTaskLog.endTime = utilService.createDatePicker('#playerRewardTaskLog .endTime');
                vm.playerRewardTaskLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerRewardTaskLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerRewardTaskLog.pageObj = utilService.createPageForPagingTable("#playerRewardTaskLogTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerRewardTaskLog", vm.getPagedPlayerRewardTaskLog)
                });
                vm.getPagedPlayerRewardTaskLog(true);
            });
        };

        vm.getPagedPlayerRewardTaskLog = function (newSearch) {
            vm.playerRewardTaskLog.loading = true;
            let sendQuery = {
                playerId: vm.isOneSelectedPlayer()._id,
                startTime: vm.playerRewardTaskLog.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.playerRewardTaskLog.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.playerRewardTaskLog.index,
                limit: newSearch ? vm.playerRewardTaskLog.limit : (vm.playerRewardTaskLog.limit || 50),
                sortCol: vm.playerRewardTaskLog.sortCol,
            };

            socketService.$socket($scope.AppSocket, 'getPlayerRewardTaskUnlockedRecord', sendQuery, function (data) {

                console.log('getPlayerRewardTaskUnlockedRecord', data.data[1]);
                let result = data.data[1];
                vm.playerRewardTaskLog.totalCount = data.data[0];
                result.forEach((item, index) => {
                    item['unlockTime'] = vm.dateReformat(item.unlockTime);
                    item['targetProviderGroup'] = $translate(item.targetProviderGroup);
                    item.creator.name = $translate(item.creator.name);
                    item.status = $translate(item.status == 'NoCredit' ? 'NoCreditUnlock' : item.status == 'Achieved' ? 'AchievedUnlock': item.status);
                });

                $scope.$evalAsync(vm.drawRewardTaskUnlockedTable(newSearch, result, vm.playerRewardTaskLog.totalCount));
                vm.playerRewardTaskLog.loading = false;
            })
        };

        vm.drawRewardTaskUnlockedTable = function (newSearch, tblData, size) {
            console.log("rewardTaskUnlockedTable", tblData);

            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: tblData,
                "aaSorting": vm.playerRewardTaskLog.sortCol || [[2, 'desc']],
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [

                    {
                        title: $translate('RewardProposalId'),
                        data: "proposalNumber",
                        render: function (data, type, row) {
                            var link = $('<a>', {

                                'ng-click': 'vm.showProposalModal("' + data + '",1)'

                            }).text(data);
                            return link.prop('outerHTML');
                        }
                    },
                    {
                        title: $translate('SubRewardType'), data: "rewardTask.type",
                        render: function (data, type, row) {
                            var text = $translate(data);
                            return text;
                        }

                    },
                    {title: $translate('UNLOCKTIME'), data: "unlockTime"},
                    //相關存款金額
                    {title: $translate('Deposit Amount'), data: "topupAmount"},
                    {
                        title: $translate('Deposit ProposalId'),
                        data: "topupProposalNumber",
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
                        "title": $translate('CONSUMPTION_UNLOCK'), data: "currentConsumption",
                        render: function (data, type, row, meta) {
                            let text = row.currentConsumption + "/" + row.maxConsumption;
                            return "<div>" + text + "</div>";
                        }
                    },
                    // 解鎖進度
                    {
                        //解锁进度（输赢值）
                        "title": $translate('WINLOSE_UNLOCK'), data: "currentAmount",
                        render: function (data, type, row, meta) {
                            // let spendingAmt = vm.calSpendingAmt(meta.row);
                            // let isSubmit = vm.isSubmitProposal(meta.row);
                            let text = row.currentAmount + "/-" + row.targetAmount;

                            return "<div>" + text + "</div>";
                        }
                    },
                    {title: $translate('GAME LOBBY / REWARD TASK GROUP'), data: "targetProviderGroup"},
                    {
                        "title": $translate('IsConsumption'), data: "useConsumption",
                        render: function (data, type, row) {
                            var text = $translate(data);
                            return "<div>" + text + "</div>";
                        }
                    },
                    {
                        "title": $translate('creator'), data: "creator.name",

                    },
                    {
                        "title": $translate('UNLOCK_REASON'), data: "status",

                    },
                ],
                "paging": false,
                fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                    $compile(nRow)($scope);
                }
            });
            tableOptions.language.emptyTable = $translate("No data available in table");

            utilService.createDatatableWithFooter('#playerRewardTaskLogTable', tableOptions, {
            });

            vm.playerRewardTaskLog.pageObj.init({maxCount: size}, newSearch);
            $('#playerRewardTaskLogTable').off('order.dt');
            $('#playerRewardTaskLogTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'playerRewardTaskLog', vm.getPagedPlayerRewardTaskLog);
            });
            $('#playerRewardTaskLogTable').resize();

        };

        vm.initPlayerRewardPointLog = () => {
            vm.playerRewardPointsLog = {};
            utilService.actionAfterLoaded('#modalPlayerRewardPointsLog.in #playerRewardPointsLogTblPage', function () {
                vm.playerRewardPointsLog.pageObj = utilService.createPageForPagingTable("#playerRewardPointsLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerRewardPointsLog", vm.getPlayerRewardPointsLogData);
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

            $scope.$evalAsync();
        };

        vm.initPlayerApiLog = function () {
            vm.playerApiLog = {totalCount: 0, limit: 10, index: 0};
            vm.playerApiLog.apiAction = "";
            utilService.actionAfterLoaded('#modalPlayerApiLog.in #playerApiLogQuery .endTime', function () {
                vm.playerApiLog.startDate = utilService.createDatePicker('#playerApiLogQuery .startTime');
                vm.playerApiLog.endDate = utilService.createDatePicker('#playerApiLogQuery .endTime');
                vm.playerApiLog.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.playerApiLog.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.playerApiLog.pageObj = utilService.createPageForPagingTable("#playerApiLogTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerApiLog", vm.getPlayerApiLogData);
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

            $scope.$evalAsync();
        };
        // endregion - player credits related

        // region - player function related
        vm.initMessageModal = function () {
            $('#sendMessageToPlayerTab').addClass('active');
            $('#messageLogTab').removeClass('active');
            $scope.$evalAsync();
            vm.messageModalTab = "sendMessageToPlayerPanel";
            vm.messageForPlayer = {};
        };

        vm.sendMessageToPlayerBtn = function (type, data) {
            vm.telphonePlayer = data;
            $('#messagePlayerModal').modal('show');
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
            if (!vm.mailLog.isAdmin && vm.mailLog.isSystem) {
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
                $scope.$evalAsync();
            }).catch(console.error);
        };

        vm.initSMSModal = function () {
            $('#smsToPlayerTab').addClass('active');
            $('#smsLogTab').removeClass('active');
            $('#smsSettingTab').removeClass('active');
            vm.smsModalTab = "smsToPlayerPanel";
            vm.playerSmsSetting = {smsGroup: {}};
            vm.getPlatformSmsGroups();
            vm.getAllMessageTypes();
            $scope.$evalAsync();
        };

        vm.changeSMSTemplate = function () {
            vm.smsPlayer.message = vm.smstpl ? vm.smstpl.content : '';
        };

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
                tablePageId = "#groupSmsLogTablePage";
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
                    vm.commonPageChangeHandler(curP, pageSize, "smsLog", vm.searchSMSLog);
                });
                // Be user friendly: Fetch some results immediately!
                vm.searchSMSLog(true);
            });
        };

        vm.sendSMSToPlayer = function () {
            vm.sendSMSResult = {sent: "sending"};

            if (vm.smsPlayer.playerId == '') {
                return $scope.sendSMSToNewPlayer(vm.smsPlayer, function (data) {
                    vm.sendSMSResult = {sent: true, result: data.success};
                    $scope.$evalAsync();
                });
            } else {
                return $scope.sendSMSToPlayer(vm.smsPlayer, function (data) {
                    vm.sendSMSResult = {sent: true, result: data.success};
                    $scope.$evalAsync();
                });
            }
        };

        vm.searchSMSLog = function (newSearch) {
            var platformId = (vm.selectedPlatform.data && vm.selectedPlatform.data.platformId) ? vm.selectedPlatform.data.platformId : null;
            var requestData = {
                // playerId: vm.selectedSinglePlayer.playerId,
                isAdmin: vm.smsLog.query.isAdmin,
                isSystem: vm.smsLog.query.isSystem,
                status: vm.smsLog.query.status,
                startTime: vm.smsLog.query.startTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .startTime input').val() || undefined,
                endTime: vm.smsLog.query.endTime.data('datetimepicker').getLocalDate(),//$('#smsLogQuery .endTime   input').val() || undefined,
                index: newSearch ? 0 : vm.smsLog.index,
                limit: newSearch ? 10 : vm.smsLog.limit,
                platformId: platformId
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
                    if (vm.smsLog.type === "multi") {
                        vm.drawSMSTable(vm.smsLog.searchResults, result.data.size, newSearch);
                    }
                })
            }).catch(console.error);
        };

        vm.drawSMSTable = function (data, size, newSearch) {
            var option = $.extend({}, vm.generalDataTableOptions, {
                data: data,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {'title': $translate('date'), data: 'createTime$'},
                    {'title': $translate('ADMIN'), sClass: "wordWrap realNameCell", data: 'adminName'},
                    {'title': $translate('Recipient'), data: 'recipientName'},
                    {'title': $translate('Channel'), data: 'channel'},
                    {'title': $translate('CONTENT'), data: 'message'},
                    {
                        title: $translate('eventName'),
                        data: "status$",
                        render: function (data, type, row) {
                            let result = '<div>' + data + '</div>';
                            let error = '';
                            if(row.error){
                                error = JSON.stringify(row.error);
                            }
                            if(row.status=='failure'){
                                result = "<text class='sn-hoverable-text' title='" + error + "' sn-tooltip='sn-tooltip'>" + data +"</text>";
                            }
                            return result;
                        }
                    },
                ],
                paging: false,
            });
            let aTable = utilService.createDatatableWithFooter('#groupSmsLogTable', option, {});
            aTable.columns.adjust().draw();
            vm.smsLog.pageObj.init({maxCount: size}, newSearch);
            $('#groupSmsLogTable').resize();
        };

        vm.loadSMSSettings = function () {
            let selectedPlayer = vm.isOneSelectedPlayer();   // ~ 20 fields!
            let editPlayer = vm.editPlayer;                  // ~ 6 fields
            vm.playerBeingEdited = {
                smsSetting: editPlayer.smsSetting,
                receiveSMS: editPlayer.receiveSMS
            };
        };

        vm.updateSMSSettings = function () {
            //oldPlayerData.partner = oldPlayerData.partner ? oldPlayerData.partner._id : null;
            let playerId = vm.isOneSelectedPlayer()._id;

            var updateSMS = {
                receiveSMS: vm.playerBeingEdited.receiveSMS != null ? vm.playerBeingEdited.receiveSMS : undefined,
                smsSetting: vm.playerBeingEdited.smsSetting,
            };

            socketService.$socket($scope.AppSocket, 'updatePlayer', {
                query: {_id: playerId},
                updateData: updateSMS
            }, function (updated) {
                console.log('updated', updated);
                vm.getPlatformPlayersData();
            });

        };

        vm.getPlatformSmsGroups = () => {
            return $scope.$socketPromise('getPlatformSmsGroups', {platformObjId: vm.selectedPlatform.data._id}).then(function (data) {
                vm.smsGroups = data.data;
                console.log('vm.smsGroups', vm.smsGroups);
                vm.getNoInGroupSmsSetting();
                $scope.$evalAsync();
            });
        };

        vm.getAllMessageTypes = function () {
            return $scope.$socketPromise('getAllMessageTypes', '').then(function (data) {
                vm.allMessageTypes = data.data;
            });
        };

        vm.telorMessageToPlayerBtn = function (type, playerObjId, data) {
            console.log(type, data);
            if (type == 'msg' && authService.checkViewPermission('Player', 'Player', 'sendSMS')) {
                vm.smstpl = "";
                vm.smsPlayer = {
                    playerId: playerObjId.playerId,
                    name: playerObjId.name,
                    nickName: playerObjId.nickName,
                    platformId: vm.selectedPlatform.data.platformId,
                    channel: $scope.usableChannelList[0],
                    hasPhone: playerObjId.phoneNumber
                };
                if ($scope.usableChannelList && $scope.usableChannelList.indexOf(4) > -1) {
                    vm.smsPlayer.channel = 4;
                }

                vm.sendSMSResult = {};
                $scope.$evalAsync();
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
                    $scope.$evalAsync();
                    $scope.makePhoneCall(vm.selectedPlatform.data.platformId);
                }, function (err) {
                    $scope.phoneCall.loadingNumber = false;
                    $scope.phoneCall.err = err.error.message;
                    alert($scope.phoneCall.err);
                    $scope.$evalAsync();
                }, true);
            }
        };

        vm.initFeedbackModal = function (rowData) {
            if (rowData && rowData.playerId) {
                vm.currentFeedbackPlayer = rowData;
                $('#addFeedbackTab').addClass('active');
                $('#feedbackHistoryTab').removeClass('active');
                $scope.$evalAsync();
                vm.feedbackModalTab = "addFeedbackPanel";
                vm.playerFeedback = {};
                if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.defaultFeedback) {
                    if (vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackResult && vm.playerFeedback) {
                        vm.playerFeedback.result = vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackResult;
                    }

                    if (vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackTopic && vm.playerFeedback) {
                        vm.playerFeedback.topic = vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackTopic;
                    }
                }
            }

            if (rowData && rowData.partnerId) {
                $('#addPartnerFeedbackTab').addClass('active');
                $('#partnerFeedbackHistoryTab').removeClass('active');
                $scope.$evalAsync();
                vm.feedbackModalTabPartner = "addPartnerFeedbackPanel";
            }
        };

        vm.isFeedbackValid = function () {
            let isValid = false;
            if (vm.playerFeedback && vm.playerFeedback.result && vm.playerFeedback.topic) {
                if (vm.playerFeedback.content) {
                    isValid = true;
                } else if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.defaultFeedback
                    && vm.playerFeedback.result == vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackResult
                    && vm.playerFeedback.topic == vm.selectedPlatform.data.defaultFeedback.defaultPlayerFeedbackTopic) {
                    isValid = true;
                }
            }

            return isValid;
        };

        vm.clearFeedBackResultDataStatus = function (rowData) {
            vm.addPlayerFeedbackResultData.message = null;
            vm.addPlayerFeedbackResultData.success = null;
            vm.addPlayerFeedbackResultData.failure = null;

            vm.deletePlayerFeedbackResultData.message = null;
            vm.deletePlayerFeedbackResultData.success = null;
            vm.deletePlayerFeedbackResultData.failure = null;
        };

        vm.addFeedbackResult = function (rowData) {
            vm.clearFeedBackResultDataStatus(rowData);
            let reqData = {};

            if (rowData && (rowData.playerId || rowData.toLowerCase() === "player")) {
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
                        $scope.$evalAsync();
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
                        $scope.$evalAsync();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()ErrOut", err);
                        vm.addPartnerFeedbackResultData.message = "FAILURE";
                        vm.addPartnerFeedbackResultData.failure = true;
                        $scope.$evalAsync();
                    }
                );
            }
        };

        vm.deleteFeedbackResult = function (rowData) {
            vm.clearFeedBackResultDataStatus(rowData);
            let reqData = {};

            if (rowData && (rowData.playerId || rowData.toLowerCase() === "player")) {
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
                        $scope.$evalAsync();
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
                        $scope.$evalAsync();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackResults()Out", err);
                        vm.deletePartnerFeedbackResultData.message = "FAILURE";
                        vm.deletePartnerFeedbackResultData.failure = true;
                        $scope.$evalAsync();
                    }
                );
            }
        };

        vm.clearFeedBackTopicDataStatus = function (rowData) {
            if (rowData && (rowData.playerId || rowData.toLowerCase() === "player")) {
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

            if (rowData && (rowData.playerId || rowData.toLowerCase() === "player")) {
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
                        $scope.$evalAsync();
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
                        $scope.$evalAsync();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()ErrOut", err);
                        vm.addPartnerFeedbackTopicData.message = "FAILURE";
                        vm.addPartnerFeedbackTopicData.failure = true;
                        $scope.$evalAsync();
                    }
                );
            }
        };

        vm.deleteFeedbackTopic = function (rowData) {
            vm.clearFeedBackTopicDataStatus(rowData);
            let reqData = {};

            if (rowData && (rowData.playerId || rowData.toLowerCase() === "player")) {
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
                        $scope.$evalAsync();
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
                        $scope.$evalAsync();
                    }
                ).catch(
                    function (err) {
                        console.log("vm.addPartnerFeedbackTopics()Out", err);
                        vm.deletePartnerFeedbackTopicData.message = "FAILURE";
                        vm.deletePartnerFeedbackTopicData.failure = true;
                        $scope.$evalAsync();
                    }
                );
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

        vm.updatePlayerFeedback = function () {
            let resultName = vm.allPlayerFeedbackResults.filter(item => {
                return item.key == vm.playerFeedback.result;
            });
            let playerToFeedback = vm.currentFeedbackPlayer || vm.isOneSelectedPlayer();
            resultName = resultName.length > 0 ? resultName[0].value : "";
            let sendData = {
                playerId: playerToFeedback._id,
                platform: playerToFeedback.platform,
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

                vm.getPlayerNFeedback(vm.curFeedbackPlayer._id, null, function (data) {
                    vm.curPlayerFeedbackDetail = data;

                    vm.curPlayerFeedbackDetail.forEach(item => {
                        item.result$ = item.resultName ? item.resultName : $translate(item.result);
                    });

                    $scope.$evalAsync();
                });
            });
        };

        vm.updatePlayerFeedbackData = function (modalId, tableId, opt) {
            opt = opt || {'dom': 't'};
            vm.playerFeedbackRecord.searching = true;
            socketService.$socket($scope.AppSocket, 'getPlayerFeedbackReport', {
                query: {
                    startTime: vm.playerFeedbackRecord.startTime.data('datetimepicker').getLocalDate(),
                    endTime: vm.playerFeedbackRecord.endTime.data('datetimepicker').getLocalDate(),
                    playerId: vm.currentFeedbackPlayer._id || vm.selectedSinglePlayer._id
                }
            }, function (data) {
                console.log('getPlayerFeedback', data);
                vm.playerFeedbackRecord.searching = false;
                vm.playerFeedbackData = data.data;

                vm.playerFeedbackData.data.forEach(item => {
                    item.result$ = item.resultName ? item.resultName : $translate(item.result);
                });

                $scope.$evalAsync();
                vm.updateDataTableinModal(modalId, tableId, opt)
            });
        };

        vm.addPlayerFeedback = function (data) {
            vm.toggleSubmitFeedbackButton = false;
            let resultName = vm.allPlayerFeedbackResults.filter(item => {
                return item.key == data.result;
            });
            resultName = resultName.length > 0 ? resultName[0].value : "";
            let sendData = {
                playerId: data.playerId || vm.playerData.playerId,
                platform: data.platform || vm.playerData.platform,
                createTime: Date.now(),
                adminId: authService.adminId,
                content: data.content,
                result: data.result,
                resultName: resultName,
                topic: data.topic
            };
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'createPlayerFeedback', sendData, function () {
                vm.toggleSubmitFeedbackButton = true;
                vm.addFeedback.content = "";
                vm.addFeedback.result = "";
                vm.getPlayerNFeedback(vm.curFeedbackPlayer._id, null, function (data) {
                    vm.curPlayerFeedbackDetail = data;

                    vm.curPlayerFeedbackDetail.forEach(item => {
                        item.result$ = item.resultName ? item.resultName : $translate(item.result);
                    });

                    $scope.$evalAsync();
                });
            });
        };

        vm.showTopupTab = function (tabName) {
            vm.selectedTopupTab = tabName == null ? "manual" : tabName;
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
                $scope.$evalAsync();
            });
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerManualTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_manual_topup"] .createTime');
                vm.playerManualTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            vm.refreshSPicker();
            $scope.$evalAsync();
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
            $scope.$evalAsync();
            socketService.$socket($scope.AppSocket, 'applyManualTopUpRequest', sendData,
                function (data) {
                    console.log('manualTopup success', data);
                    vm.playerManualTopUp.responseData = data.data;
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
                }, function (error) {
                    vm.playerManualTopUp.responseMsg = $translate(error.error.errorMessage);
                    // socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
                });
        };

        vm.initPlayerAlipayTopUp = function () {
            vm.playerAlipayTopUp = {submitted: false};
            vm.existingAlipayTopup = null;
            commonService.resetDropDown('#alipayOption');

            socketService.$socket($scope.AppSocket, 'getAlipayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    vm.existingAlipayTopup = data.data ? data.data : false;
                    $scope.$evalAsync();
                });
            vm.alipaysAcc = '';

            // utilService.actionAfterLoaded('#modalPlayerAlipayTopUp', function () {
            //     vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerAlipayTopUp .createTime');
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerAlipayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_alipay_topup"] .createTime');
                vm.playerAlipayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            $scope.$evalAsync();
        };

        vm.pickAlipayAcc = function () {
            vm.playerAlipayTopUp.alipayName = '';
            vm.playerAlipayTopUp.alipayAccount = '';
            if (vm.alipaysAcc != '') {
                var alipayAcc = vm.alipaysAcc;
                vm.playerAlipayTopUp.alipayName = alipayAcc['name'];
                vm.playerAlipayTopUp.alipayAccount = alipayAcc['accountNumber'];
            }
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
            $scope.$evalAsync();
            socketService.$socket($scope.AppSocket, 'applyAlipayTopUpRequest', sendData,
                data => {
                    vm.playerAlipayTopUp.responseMsg = $translate('SUCCESS');
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
                },
                error => {
                    vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                    // socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
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
                    $scope.$evalAsync();
                },
                error => {
                    vm.playerAlipayTopUp.responseMsg = error.error.errorMessage;
                    $scope.$evalAsync();
                }
            );
        };

        vm.initPlayerWechatPayTopUp = function () {
            vm.playerWechatPayTopUp = {submitted: false, notUseQR: "true"};
            vm.existingWechatPayTopup = null;
            commonService.resetDropDown('#wechatpayOption');

            socketService.$socket($scope.AppSocket, 'getWechatPayTopUpRequestList', {playerId: vm.selectedSinglePlayer.playerId},
                data => {
                    vm.existingWechatPayTopup = data.data ? data.data : false;
                    $scope.$evalAsync();
                });
            vm.wechatpaysAcc = '';

            // utilService.actionAfterLoaded('#modalPlayerWechatPayTopUp', function () {
            //     vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerWechatPayTopUp .createTime');
            utilService.actionAfterLoaded('#modalPlayerTopUp', function () {
                vm.playerWechatPayTopUp.createTime = utilService.createDatePicker('#modalPlayerTopUp [name="form_wechatPay_topup"] .createTime');
                vm.playerWechatPayTopUp.createTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 0)));
            });
            $scope.$evalAsync();
        };

        vm.pickWechatPayAcc = function () {
            vm.playerWechatPayTopUp.wechatPayName = '';
            vm.playerWechatPayTopUp.wechatPayAccount = '';
            if (vm.wechatpaysAcc != '') {
                var wechatpayAcc = vm.wechatpaysAcc;
                vm.playerWechatPayTopUp.wechatPayName = wechatpayAcc['name'];
                vm.playerWechatPayTopUp.wechatPayAccount = wechatpayAcc['accountNumber'];
            }
            $scope.$evalAsync();
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
            $scope.$evalAsync();
            socketService.$socket($scope.AppSocket, 'applyWechatPayTopUpRequest', sendData,
                data => {
                    vm.playerWechatPayTopUp.responseMsg = $translate('SUCCESS');
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
                },
                error => {
                    vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                    // socketService.showErrorMessage(error.error.errorMessage);
                    vm.getPlayerDetail();
                    $scope.$evalAsync();
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
                    $scope.$evalAsync();
                },
                error => {
                    vm.playerWechatPayTopUp.responseMsg = error.error.errorMessage;
                    $scope.$evalAsync();
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
                $scope.$evalAsync();
            });
        };

        vm.initPlayerBonus = function () {
            vm.playerBonus = {
                resMsg: '',
                showSubmit: true,
                notSent: true,
                bonusId: 1
            };
        };

        vm.applyPlayerBonus = function () {

            // retrieve the related rewardTasks
            if (vm.playerBonus.bForce == true) {
                let sendQuery = {
                    playerObjId: vm.isOneSelectedPlayer()._id,
                    platformId: vm.selectedPlatform.id,
                };
                socketService.$socket($scope.AppSocket, 'getRewardTaskGroupProposalById', sendQuery, function (data) {

                    if (!data && data.data[0] && data.data[1]) {
                        return Q.reject("Record is not found");
                    }

                    vm.rewardTaskGroupProposalList = [];
                    let providerGroupId;
                    vm.isUnlockTaskGroup = true;
                    vm.rtgBonusAmt = {};

                    data.data[1].forEach(inData => {
                        inData.currentAmount$ = inData.currentAmt - inData.initAmt;
                        inData.bonusAmount$ = -inData.initAmt;

                        if (inData.providerGroup) {
                            providerGroupId = inData.providerGroup._id;
                        }
                        vm.rtgBonusAmt[providerGroupId] = inData.currentAmount$;
                    });

                    data.data[1].forEach((inData, indexInData) => {
                        vm.dynRewardTaskGroupId = [];
                        vm.dynRewardTaskGroupId.push(inData);
                        vm.rewardTaskProposalData = data.data[0][indexInData];
                        let result = data.data[0][indexInData];
                        let usedTopUp = [];
                        result.forEach((item, index) => {
                            item.proposalId = item.proposalId || item.data.proposalId;
                            item['createTime$'] = vm.dateReformat(item.data.createTime$);
                            item.useConsumption = item.data.useConsumption;
                            item.topUpProposal = item.data.topUpProposalId ? item.data.topUpProposalId : item.data.topUpProposal;
                            item.topUpAmount = item.data.topUpAmount;
                            item.bonusAmount = item.data.rewardAmount;
                            item.applyAmount = item.data.applyAmount || item.data.amount;
                            item.requiredUnlockAmount = item.data.spendingAmount;
                            item.requiredBonusAmount = item.data.requiredBonusAmount;
                            item['provider$'] = $translate(item.data.provider$);
                            item.rewardType = item.data.rewardType;

                            item.requiredUnlockAmount$ = item.requiredUnlockAmount;
                            if (vm.isUnlockTaskGroup) {
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
                                    item.archivedAmt$ = item.archivedAmt$ ? item.archivedAmt$ : 0;
                                }
                            }
                            item.isArchived =
                                item.archivedAmt$ == item.availableAmt$ || item.curConsumption$ == item.requiredUnlockAmount$;

                            if (item.data.isDynamicRewardAmount || (item.data.promoCodeTypeValue && item.data.promoCodeTypeValue == 3)) {
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
                    vm.getPlayerDetail();
                    // save the rewardTask that is manually unlocked
                    if (vm.playerBonus.bForce && vm.rewardTaskGroupProposalList && vm.rewardTaskGroupProposalList.length > 0) {
                        vm.rewardTaskGroupProposalList.forEach(listData => {
                            listData.forEach(rewardTask => {
                                let sendData = {
                                    platformId: vm.selectedPlatform.id,
                                    playerId: vm.isOneSelectedPlayer()._id,
                                    unlockTime: new Date().toISOString(),
                                    creator: {
                                        type: "admin",
                                        name: authService.adminName,
                                        id: authService.adminId
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
                                    $scope.$evalAsync();
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
                $scope.$evalAsync();
            });
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

        vm.initPlayerAddRewardTask = function () {
            vm.playerAddRewardTask = {
                showSubmit: true,
                providerGroup: ''
            };
            vm.showRewardSettingsTab(null);
        };

        vm.initPlayerApplyReward = function () {
            vm.playerApplyRewardPara = {};
            vm.playerApplyRewardShow = {};
            vm.playerApplyEventResult = null;
            $scope.rewardObj = vm.allRewardEvent[0];
            vm.playerApplyRewardCodeChange(vm.playerApplyRewardPara);
        };

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
            vm.playerApplyRewardShow.showReferral = type == "PlayerReferralReward";

            // PlayerConsumptionReturn
            vm.playerApplyRewardShow.showConsumptionReturn = type == "PlayerConsumptionReturn";
            vm.playerApplyRewardShow.consumptionReturnData = {};
            vm.totalConsumptionReturnData = {
                totalNonXIMA: 0,
                totalConsumption: 0,
                totalReturnAmt: 0
            };
            if (type == "PlayerConsumptionReturn") {
                socketService.$socket($scope.AppSocket, 'getConsumeRebateAmount', {
                    playerId: vm.isOneSelectedPlayer().playerId,
                    eventCode: vm.playerApplyRewardPara.code
                }, function (data) {
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
                        vm.totalConsumptionReturnData.totalNonXIMA += parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].nonXIMAAmt)? parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].nonXIMAAmt): 0;
                        vm.totalConsumptionReturnData.totalConsumption += parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].consumptionAmount)? parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].consumptionAmount): 0;
                        vm.totalConsumptionReturnData.totalReturnAmt += parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].returnAmount)? parseFloat(vm.playerApplyRewardShow.consumptionReturnData[key].returnAmount): 0;
                        // hide consumption type that is not in current selecting platform
                        if (vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')].ratio == 0)
                            delete vm.playerApplyRewardShow.consumptionReturnData[$translate(vm.allGameTypes[key] || 'Unknown')]
                        delete vm.playerApplyRewardShow.consumptionReturnData[key];
                    }
                    vm.totalConsumptionReturnData.totalNonXIMA = vm.totalConsumptionReturnData.totalNonXIMA.toFixed(2);
                    vm.totalConsumptionReturnData.totalConsumption = vm.totalConsumptionReturnData.totalConsumption.toFixed(2);
                    vm.totalConsumptionReturnData.totalReturnAmt = vm.totalConsumptionReturnData.totalReturnAmt.toFixed(2);
                    $scope.$evalAsync();
                }, function (err) {
                    console.log(err);
                    vm.playerApplyRewardShow.showRewardAmount = 'Error';
                    $scope.$evalAsync();
                });
            }

            // PlayerConsecutiveLoginReward
            vm.playerApplyRewardShow.manualSignConsecutiveLogin = type == "PlayerConsecutiveLoginReward";

            $scope.$evalAsync();
        };

        vm.applyPreviousConsecutiveLoginReward = function () {
            let sendQuery = {
                code: vm.playerApplyRewardPara.code,
                playerId: vm.isOneSelectedPlayer().playerId
            };
            socketService.$socket($scope.AppSocket, 'applyPreviousConsecutiveLoginReward', sendQuery, function (data) {
                console.log('sent', data);
                vm.playerApplyEventResult = data;
                vm.getPlayerDetail();
                $scope.$evalAsync();
            }, function (err) {
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.$evalAsync();
            });
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
                $scope.$evalAsync();
            });
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
                if (vm.playerApplyEventResult && vm.playerApplyEventResult.error && vm.playerApplyEventResult.error.status === 466) {
                    sendQuery.data.isClearConcurrent = isForceApply;
                } else {
                    sendQuery.data.isForceApply = isForceApply;
                }
            }
            socketService.$socket($scope.AppSocket, 'applyRewardEvent', sendQuery, function (data) {
                console.log('sent', data);
                vm.applyXM = false;
                vm.playerApplyEventResult = data;
                vm.getPlayerDetail();
                $scope.$evalAsync();
            }, function (err) {
                vm.applyXM = false;
                vm.playerApplyEventResult = err;
                console.log(err);
                $scope.$evalAsync();
            });
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
            $scope.$evalAsync();
        };

        vm.getRewardTaskDetail = (playerId, callback) => {
            return $scope.$socketPromise('getPlayerAllRewardTaskDetailByPlayerObjId', {_id: playerId}).then(data => {
                vm.curRewardTask = data.data;
                $scope.$evalAsync();
                if (callback) {
                    callback(vm.curRewardTask);
                }
                return data;
            });
        };

        vm.initRewardTaskLog = function () {
            vm.rewardTaskLog = vm.rewardTaskLog || {totalCount: 0, limit: 10, index: 0, query: {}};
            vm.isUnlockTaskGroup = false;
            vm.chosenProviderGroupId = null;
            vm.rtgBonusAmt = {};
            // utilService.actionAfterLoaded('#modalRewardTaskLog.in #rewardTaskLogQuery .endTime', function () {
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
                // $scope.$evalAsync(vm.drawRewardTaskTable(newSearch, tblData, size, summary, topUpAmountSum));
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
                            let forbidXIMAAmt = Number(row.forbidXIMAAmt ? row.forbidXIMAAmt : 0);
                            let targetConsumption = Number(row.targetConsumption);
                            var text = $noRoundTwoDecimalToFix(row.curConsumption) + '/' + $noRoundTwoDecimalToFix(targetConsumption + forbidXIMAAmt);
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

                            let text = $noRoundTwoDecimalToFix(row.currentAmount$) + '/' + $noRoundTwoDecimalToFix(row.bonusAmount$);
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
                fnInitComplete: function(settings){
                    $compile(angular.element('#' + settings.sTableId).contents())($scope);
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

        vm.displayProviderGroupCredit = function () {
            socketService.$socket($scope.AppSocket, 'getCreditDetail', {playerObjId: vm.selectedSinglePlayer._id}, function (data) {
                console.log('getCreditDetail', data);
                vm.playerCreditDetails = data.data.lockedCreditList;
                vm.currentFreeAmount = data.data ? data.data.credit : '';
                vm.currentFreeAmount = $noRoundTwoDecimalPlaces(vm.currentFreeAmount);
                vm.playerCreditDetails.map(d => {
                    if (d.validCredit == 'unknown') {
                        d.validCredit = '';
                    }
                })

                let allGameProviderGroup = [];
                for (let i = 0; i < vm.gameProviderGroup.length; i++) {
                    allGameProviderGroup.push({
                        nickName: vm.gameProviderGroup[i].name ? vm.gameProviderGroup[i].name : "",
                        validCredit: 0
                    })
                }
                if (vm.playerCreditDetails.length > 0) {
                    allGameProviderGroup = allGameProviderGroup.filter(a => {
                        let isFound = false;
                        for (let j = 0; j < vm.playerCreditDetails.length; j++) {
                            if (vm.playerCreditDetails[j].nickName == a.nickName) {
                                isFound = true;
                            };
                        };
                        if (!isFound) {
                            return a;
                        }
                    });
                }
                vm.playerCreditDetails = vm.playerCreditDetails.concat(allGameProviderGroup);

                function compare(a, b) {
                    if (a.nickName < b.nickName)
                        return -1;
                    if (a.nickName > b.nickName)
                        return 1;
                    return 0;
                }

                vm.playerCreditDetails.sort(compare);
                $scope.$evalAsync();
            });
        };

        vm.showReapplyLostOrderTab = function (tabName) {
            vm.selectedReapplyLostOrderTab = tabName == null ? "credit" : tabName;
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
                $scope.$evalAsync();

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
                        $scope.$evalAsync();
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
                            $scope.$evalAsync();
                        });
                    }

                })
                $('#playerCreditAdjustTbl').resize();
                $('#playerCreditAdjustTbl').resize();
                table.columns.adjust().draw();
            });
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
                    $scope.$evalAsync();
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
                            $scope.$evalAsync();
                        });
                    });
                });
            });
        };

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

            $scope.$evalAsync();
        };

        vm.prepareShowPlayerRewardPointsAdjustment = function () {
            vm.rewardPointsChange = vm.rewardPointsChange || {};
            vm.rewardPointsChange.finalValidAmount = vm.isOneSelectedPlayer().rewardPointsObjId.points;
            vm.rewardPointsChange.remark = '';
            vm.rewardPointsChange.updateAmount = 0;
            vm.rewardPointsConvert = vm.rewardPointsConvert || {};
            vm.rewardPointsConvert.finalValidAmount = vm.isOneSelectedPlayer().rewardPointsObjId.points;
            vm.rewardPointsConvert.remark = '';
            vm.rewardPointsConvert.updateAmount = 0;
            $scope.$evalAsync();
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

        vm.getPlayerRewardPointsDailyLimit = function () {
            let sendData = {
                platformObjId: vm.isOneSelectedPlayer().platform,
                playerLevel: vm.isOneSelectedPlayer().playerLevel._id
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
                playerLevel: vm.isOneSelectedPlayer().playerLevel._id
            };

            socketService.$socket($scope.AppSocket, 'getPlayerRewardPointsConversionRate', sendData, function (data) {
                $scope.$evalAsync(() => {
                    vm.playerRewardPointsConversionRate = data.data;
                });
            });
        };

        vm.updatePlayerRewardPointsRecord = function () {
            let sendData = {
                playerObjId: vm.isOneSelectedPlayer()._id,
                platformObjId: vm.isOneSelectedPlayer().platform,
                updateAmount: vm.rewardPointsChange.updateAmount,
                remark: vm.rewardPointsChange.remark
            };

            socketService.$socket($scope.AppSocket, 'updatePlayerRewardPointsRecord', sendData, function () {
                vm.getPlayerDetail();
                $scope.$evalAsync();
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
                vm.getPlayerDetail();
                $scope.$evalAsync();
            });
        };

        // endregion - player function related

        // region - popup function related
        vm.updateForbidRewardLog = function (playerId, forbidReward, playerObj) {
            if (playerObj && playerObj.forbidPromoCode) {
                forbidReward.push("优惠代码");
            }

            if (playerObj && playerObj.forbidLevelUpReward) {
                forbidReward.push("系统升级优惠");
            }

            if (playerObj && playerObj.forbidLevelMaintainReward) {
                forbidReward.push("系统保级优惠");
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

        vm.updatePlayerForbidRewardEvents = function (sendData) {
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'updatePlayerForbidRewardEvents', sendData, function (data) {
                let playerObj = data.data;
                if (playerObj) {
                    let sendData = {
                        query: {
                            platformObjId: playerObj.platform,
                            isBlockByMainPermission: false
                        },
                        updateData: {}
                    }
                    if (playerObj.forbidPromoCode) {
                        sendData.query.name = "次权限禁用组（预设）"; //hard code name;
                        sendData.query.isBlockPromoCodeUser = true;
                        sendData.query.isDefaultGroup = true;
                        sendData.checkQuery = {
                            platformObjId: playerObj.platform,
                            playerNames: playerObj.name
                        }
                        sendData.updateData["$addToSet"] = {playerNames: playerObj.name};
                    } else {
                        sendData.query.playerNames =  playerObj.name;
                        sendData.updateData["$pull"] = {playerNames: playerObj.name};
                    }

                    socketService.$socket($scope.AppSocket, 'updatePromoCodeGroupMainPermission', sendData, function () {
                    });
                }
                vm.getPlayerDetail();
                vm.updateForbidRewardLog(data.data._id, vm.findForbidCheckedName(data.data.forbidRewardEvents, vm.allRewardEvent), data.data);
            });
        };

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

        vm.drawForbidRewardLogTbl = function (showData, size, newSearch, summary) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.forbidRewardLog.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'createTime$', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'admin.adminName', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('OPERATOR_NAME'), data: "admin.adminName"},
                    {title: $translate('FORBID_REWARD'), data: "forbidRewardNames"},
                    {title: $translate('REMARK'), data: "remark"},
                ],
                "paging": false,
            });
            utilService.createDatatableWithFooter("#forbidRewardTbl", tableOptions, {});

            // var aTable = $("#forbidRewardTbl").DataTable(tableOptions);
            vm.forbidRewardLog.pageObj.init({maxCount: size}, newSearch);
            $("#forbidRewardTbl").off('order.dt');
            $("#forbidRewardTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'forbidRewardLog', vm.getForbidRewardLog);
            });
            $('#forbidRewardTbl').resize();
            $scope.safeApply();
        }

        vm.confirmUpdatePlayerTopupTypes = function (sendData) {
            sendData = sendData || {
                query: {_id: vm.isOneSelectedPlayer()._id},
                updateData: {forbidTopUpType: vm.showForbidTopupTypes || []}
            };

            console.log('sendData', sendData)
            socketService.$socket($scope.AppSocket, 'updatePlayerForbidPaymentType', sendData, function (data) {
                vm.getPlayerDetail();
                let forbidTopUpNames = [];
                for (let i = 0; i < data.data.forbidTopUpType.length; i++) {
                    forbidTopUpNames[i] = $scope.merchantTopupTypeJson[data.data.forbidTopUpType[i]];
                }
                vm.updateForbidTopUpLog(data.data._id, forbidTopUpNames);
                $scope.safeApply();
            });
        }

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

        vm.getForbidTopUp = function () {
            vm.forbidTopUpLog = {};
            utilService.actionAfterLoaded('#modalForbidTopUpLog.in #forbidTopUpSearch .endTime', function () {
                vm.forbidTopUpLog.startTime = utilService.createDatePicker('#forbidTopUpSearch .startTime');
                vm.forbidTopUpLog.endTime = utilService.createDatePicker('#forbidTopUpSearch .endTime');
                vm.forbidTopUpLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                vm.forbidTopUpLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.forbidTopUpLog.pageObj = utilService.createPageForPagingTable("#forbidTopUpTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "forbidTopUpLog", vm.getForbidTopUpLog)
                });
                vm.getForbidTopUpLog(true);
            });
        }

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

        vm.drawForbidTopUpLogTbl = function (showData, size, newSearch, summary) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.forbidTopUpLog.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'createTime$', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'admin.adminName', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('OPERATOR_NAME'), data: "admin.adminName"},
                    {title: $translate('ForbidTopupTypes'), data: "forbidTopUpNames"},
                    {title: $translate('REMARK'), data: "remark"},
                ],
                "paging": false,
            });
            utilService.createDatatableWithFooter("#forbidTopUpTbl", tableOptions, {});

            // var aTable = $("#forbidRewardTbl").DataTable(tableOptions);
            vm.forbidTopUpLog.pageObj.init({maxCount: size}, newSearch);
            $("#forbidTopUpTbl").off('order.dt');
            $("#forbidTopUpTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'forbidTopUpLog', vm.getForbidTopUpLog);
            });
            $('#forbidTopUpTbl').resize();
            $scope.safeApply();
        }

        vm.updatePlayerForbidRewardPointsEvent = function (sendData) {
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'updatePlayerForbidRewardPointsEvent', sendData, function (data) {
                vm.getPlayerDetail();
                vm.updateForbidRewardPointsEventLog(data.data._id, vm.findForbidCheckedTitle(data.data.forbidRewardPointsEvent, vm.rewardPointsAllEvent));
            });
        };

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

        vm.getForbidRewardPointsEvent = function () {
            vm.forbidRewardPointsEventLog = {};
            utilService.actionAfterLoaded('#modalForbidRewardPointsEventLog.in #forbidRewardPointsEventSearch .endTime', function () {
                vm.forbidRewardPointsEventLog.startTime = utilService.createDatePicker('#forbidRewardPointsEventSearch .startTime');
                vm.forbidRewardPointsEventLog.endTime = utilService.createDatePicker('#forbidRewardPointsEventSearch .endTime');
                vm.forbidRewardPointsEventLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                vm.forbidRewardPointsEventLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.forbidRewardPointsEventLog.pageObj = utilService.createPageForPagingTable("#forbidRewardPointsEventTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "forbidRewardPointsEventLog", vm.getForbidRewardPointsEventLog)
                });
                vm.getForbidRewardPointsEventLog(true);
            });
        }

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

        vm.drawForbidRewardPointsEventLogTbl = function (showData, size, newSearch, summary) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.forbidRewardPointsEventLog.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'createTime$', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'admin.adminName', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('OPERATOR_NAME'), data: "admin.adminName"},
                    {title: $translate('FORBID_REWARDPOINTS'), data: "forbidRewardPointsEventNames"},
                    {title: $translate('REMARK'), data: "remark"},
                ],
                "paging": false,
            });
            utilService.createDatatableWithFooter("#forbidRewardPointsEventTbl", tableOptions, {});

            // var aTable = $("#forbidRewardTbl").DataTable(tableOptions);
            vm.forbidRewardPointsEventLog.pageObj.init({maxCount: size}, newSearch);
            $("#forbidRewardPointsEventTbl").off('order.dt');
            $("#forbidRewardPointsEventTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'forbidRewardPointsEventLog', vm.getForbidRewardPointsEventLog);
            });
            $('#forbidRewardPointsEventTbl').resize();
            $scope.safeApply();
        }

        vm.updatePlayerForbidProviders = function (sendData) {
            console.log('sendData', sendData);
            socketService.$socket($scope.AppSocket, 'updatePlayerForbidProviders', sendData, function (data) {
                vm.getPlayerDetail();
                vm.updateForbidGameLog(data.data._id, vm.findForbidCheckedName(data.data.forbidProviders, vm.allGameProviders));
            });
        };

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

        vm.getForbidGame = function () {
            vm.forbidGameLog = {};
            utilService.actionAfterLoaded('#modalForbidGameLog.in #forbidGameSearch .endTime', function () {
                vm.forbidGameLog.startTime = utilService.createDatePicker('#forbidGameSearch .startTime');
                vm.forbidGameLog.endTime = utilService.createDatePicker('#forbidGameSearch .endTime');
                vm.forbidGameLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                vm.forbidGameLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.forbidGameLog.pageObj = utilService.createPageForPagingTable("#forbidGameTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "forbidGameLog", vm.getForbidGameLog)
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

        vm.drawForbidGameLogTbl = function (showData, size, newSearch, summary) {
            var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                data: showData,
                "aaSorting": vm.forbidGameLog.aaSorting || [],
                aoColumnDefs: [
                    {'sortCol': 'createTime$', bSortable: true, 'aTargets': [0]},
                    {'sortCol': 'admin.adminName', bSortable: true, 'aTargets': [1]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('date'), data: "createTime$"},
                    {title: $translate('OPERATOR_NAME'), data: "admin.adminName"},
                    {title: $translate('BANNED_FROM_THESE_PROVIDERS'), data: "forbidGameNames"},
                    {title: $translate('REMARK'), data: "remark"},
                ],
                "paging": false,
            });
            utilService.createDatatableWithFooter("#forbidGameTbl", tableOptions, {});

            // var aTable = $("#forbidRewardTbl").DataTable(tableOptions);
            vm.forbidGameLog.pageObj.init({maxCount: size}, newSearch);
            $("#forbidGameTbl").off('order.dt');
            $("#forbidGameTbl").on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'forbidGameLog', vm.getForbidGameLog);
            });
            $('#forbidGameTbl').resize();
            $scope.safeApply();
        }

        vm.getRewardTaskGroupDetail = (playerId, callback) => {
            return $scope.$socketPromise('getPlayerAllRewardTaskGroupDetailByPlayerObjId', {_id: playerId}).then(
                res => {
                    res.data.map(r => {
                        if (r.providerGroup == null) {
                            r.providerGroup = {
                                name: "LOCAL_CREDIT"
                            }
                        }
                        return r;
                    })
                    vm.curRewardTask = res.data;
                    console.log('vm.curRewardTask', vm.curRewardTask);
                    $scope.$evalAsync();
                    if (callback) {
                        callback(vm.curRewardTask);
                    }
                }
            )
        };

        vm.getPlayer5Feedback = function (playerId, callback) {
            console.log('play', playerId);
            socketService.$socket($scope.AppSocket, 'getPlayerLastNFeedbackRecord', {
                playerId: playerId,
                limit: 5
            }, function (data) {
                console.log('getPlayerFeedback', data);
                vm.playerFeedbackData = data.data;
                $scope.$evalAsync();
                if (callback) {
                    callback(vm.playerFeedbackData);
                }
            });
        };

        vm.forbidModification = function (id, val, addList, removeList) {
            console.log('forbidModification', ...arguments);
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
        };

        vm.forbidFixedRewardModification = function (id) {
            $('#c-' + id).html($translate("ModifyIt"));
        };

        $("button.forbidRewardEventConfirm").on('click', function () {
            vm.getForbidReward();
        });

        vm.getForbidReward = function () {
            vm.forbidRewardLog = {};
            utilService.actionAfterLoaded('#modalForbidRewardLog.in #forbidRewardSearch .endTime', function () {
                vm.forbidRewardLog.startTime = utilService.createDatePicker('#forbidRewardSearch .startTime');
                vm.forbidRewardLog.endTime = utilService.createDatePicker('#forbidRewardSearch .endTime');
                vm.forbidRewardLog.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                vm.forbidRewardLog.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                vm.forbidRewardLog.pageObj = utilService.createPageForPagingTable("#forbidRewardTblPage", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "forbidRewardLog", vm.getForbidRewardLog);
                });
                vm.getForbidRewardLog(true);
            });
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
        };

        vm.getProviderText = function (providerId) {
            if (!providerId || !vm.allGameProviders) return false;
            var result = '';
            $.each(vm.allGameProviders, function (i, v) {
                if (providerId == v._id || providerId == v.providerId) {
                    result = v.name;
                    return true;
                }
            })
            return result;
        };

        $('body').on('click', '#permissionRecordButton', function () {
            vm.getPlayerPermissionChange("new")
        });

        vm.getPlayerPermissionChange = function (flag) {
            $('.playerPermissionPopover').popover('hide');
            vm.playerPermissionQuery = vm.playerPermissionQuery || {};
            vm.playerPermissionQuery.searching = true;
            vm.playerPermissionHistory = [];
            $scope.$evalAsync();
            if (flag == 'new') {
                utilService.actionAfterLoaded('#modalPlayerPermissionChangeLog .searchDiv .startTime', function () {
                    vm.playerPermissionQuery.startTime = utilService.createDatePicker('#modalPlayerPermissionChangeLog .searchDiv .startTime');
                    vm.playerPermissionQuery.endTime = utilService.createDatePicker('#modalPlayerPermissionChangeLog .searchDiv .endTime');
                    vm.playerPermissionQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 180)));
                    vm.playerPermissionQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                });
            }
            let tempPlayerId = vm.popOverPlayerPermission && vm.popOverPlayerPermission._id ? vm.popOverPlayerPermission._id :
                vm.selectedSinglePlayer && vm.selectedSinglePlayer._id ? vm.selectedSinglePlayer._id : null;
            var sendData = {
                playerId: tempPlayerId,
                platform: vm.selectedPlatform.id,
                createTime: {
                    $gte: new Date(vm.playerPermissionQuery.startTime.data('datetimepicker').getLocalDate()),
                    $lt: new Date(vm.playerPermissionQuery.endTime.data('datetimepicker').getLocalDate())
                }
            }
            socketService.$socket($scope.AppSocket, 'getPlayerPermissionLog', sendData, function (data) {
                data.data.forEach(row => {
                    row.admin = row.isSystem ? {adminName: "System"} : row.admin;
                });
                vm.playerPermissionHistory = data.data || [];
                vm.playerPermissionQuery.searching = false;
                $scope.$evalAsync();
            });
        };
        // endregion - popup function related

        // region - interface util
        vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
            var isChange = false;
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
            if (isChange) return searchFunc.call(this);
        };

        vm.commonSortChangeHandler = function (a, objName, searchFunc) {
            if (!a.aaSorting[0] || !objName || !vm[objName] || !searchFunc) return;
            var sortCol = a.aaSorting[0][0];
            var sortDire = a.aaSorting[0][1];
            var temp = a.aoColumns[sortCol];
            var sortKey = temp ? temp.sortCol : '';

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
        };

        vm.initQueryTimeFilter = function (field, callback) {
            vm.queryPara[field] = {};
            utilService.actionAfterLoaded(('#' + field ), function () {
                vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + ' .startTime');
                vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + ' .endTime');
                vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));

                $scope.$evalAsync();
                if (callback) {
                    callback();
                }
            });

        };

        vm.closeCreditTransferLog = function (modal) { // basically it work as close modal, since I am reusing the jade from platform, I have to keep it
            $(modal).modal('hide');
        };

        vm.onClickPlayerCheck = function (recordId, callback, param) {
            // there is only one player in this page, so a simplify version of function is used
            if (!(param instanceof Array)) {
                param = param ? [param] : [];
            }

            callback.apply(null, param);
        };

        vm.refreshSPicker = () => {
            // without this timeout, 'selectpicker refresh' might done before the DOM able to refresh, which evalAsync doesn't help
            $timeout(function () {
                $('.spicker').selectpicker('refresh');
            }, 0);
        };

        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };
        // endregion - interface util

        // region - delayed page init


        vm.delayedGeneralInit = () => {
            vm.showPlatform = vm.selectedPlatform.data;
            $scope.fixModalScrollIssue();
            vm.getZoneList(undefined, undefined, true);
            vm.initPlayerCredibility();
            vm.getPlatformGameData();
            getProposalTypeByPlatformId(vm.selectedPlatform.id);
            commonService.getRewardList($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {vm.rewardList = v});
            commonService.getPromotionTypeList($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {vm.promoTypeList = v});
            commonService.getAllAlipaysByAlipayGroup($scope, $translate, vm.selectedPlatform.data.platformId).catch(err => Promise.resolve([])).then(v => {vm.allAlipaysAcc = v});
            commonService.getAllWechatpaysByWechatpayGroup($scope, $translate, vm.selectedPlatform.data.platformId).catch(err => Promise.resolve([])).then(v => {vm.allWechatpaysAcc = v});
            commonService.getBankTypeList($scope, vm.selectedPlatform.id).catch(err => Promise.resolve({})).then(v => {
                vm.allBankTypeList = v;
                commonService.getAllBankCard($scope, $translate, vm.selectedPlatform.data.platformId, vm.allBankTypeList).catch(err => Promise.resolve([])).then(val => {
                    vm.bankCards = val;
                });
            });
            commonService.getPlayerFeedbackTopic($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {vm.playerFeedbackTopic = v});
            commonService.getAllPlayerFeedbackResults($scope).catch(err => Promise.resolve([])).then(v => {vm.allPlayerFeedbackResults = v});
            commonService.getSMSTemplate($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {vm.smsTemplate = v});
            commonService.getRewardEventsByPlatform($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {
                vm.allRewardEvent = v;
                vm.showApplyRewardEvent = v.filter(item => {
                    return item.needApply || (item.condition && item.condition.applyType && item.condition.applyType == "1");
                }).length > 0;
            });
            commonService.getAllGameTypes($scope).catch(err => Promise.resolve([[], []])).then(v => {([vm.allGameTypesList, vm.allGameTypes] = v);});
            commonService.getAllGameProviders($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([[], []])).then(v => {([vm.allGameProviders, vm.gameProvidersList] = v);});
            commonService.getRewardPointsEvent($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])).then(v => {vm.rewardPointsAllEvent = v});
            vm.getPlatformProviderGroup();

            $scope.$evalAsync();
        };

        $scope.$on("startDelayInit", vm.delayedGeneralInit);
        // endregion - delayed page init
    };

    playerDetailController.$inject = [
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

    myApp.register.controller('playerDetailCtrl', playerDetailController);
});