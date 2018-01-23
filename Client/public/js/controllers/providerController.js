'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', '$timeout', 'authService', 'utilService', 'socketService', 'CONFIG'];

    var providerController = function ($scope, $filter, $location, $log, $timeout, authService, utilService, socketService, CONFIG) {
        var Upload = {};
        var $translate = $filter('translate');
        var vm = this;

        // declare constants
        vm.allProviderStatusString = {
            NORMAL: 1,
            MAINTENANCE: 2,
            HALT: 3
        };
        vm.allProviderStatusKeys = ['NORMAL', 'MAINTENANCE', 'HALT'];
        vm.allGameStatusString = {
            ENABLE: 1, // "Enable",
            MAINTENANCE: 2, //"Maintenance" //
            DISABLE: 3, //"Disable", //2
            DELETED: 4
        };
        vm.allGameStatusKeys = ['ENABLE', 'MAINTENANCE', 'DISABLE', 'DELETED'];

        //vm.getAllGameType = function () {
        //    socketService.$socket($scope.AppSocket, 'getAllGameTypes', {}, function (data) {
        //        vm.gameAllTypes = data.data;
        //        console.log(vm.gameAllTypes);
        //        $scope.safeApply();
        //    }, function (data) {
        //        console.log("create not", data);
        //    });
        //}

        vm.getAllGameType = function () {
            return $scope.$socketPromise('getGameTypeList', {})
                .then(function (data) {
                    var gameTypes = data.data;
                    vm.allGameTypesList = gameTypes;
                    console.log("vm.allGameTypesList:", vm.allGameTypesList);

                    var allGameTypes = {};
                    gameTypes.forEach(function (gameType) {
                        var GAMETYPE = gameType.gameTypeId;
                        allGameTypes[GAMETYPE] = gameType.name;
                    });
                    vm.allGameTypes = allGameTypes;
                    console.log("vm.allGameTypes", vm.allGameTypes);

                    $scope.safeApply();
                });
        };
        vm.addNewGameType = function (gameType) {
            socketService.$socket($scope.AppSocket, 'addGameType', gameType, function (data) {
                vm.getAllGameType();
            })
        }
        vm.updateGameType = function (oriGameType, update) {
            socketService.$socket($scope.AppSocket, 'updateGameType', {
                query: {name: oriGameType.name},
                update: update
            }, function (data) {
                vm.getAllGameType();
            })
        }
        vm.deleteGameType = function (gameType) {
            GeneralModal.confirm({
                title: $translate('DELETE_GAMETYPE'),
                text: $translate('The gametype') + " '" + gameType.name + "' (" + gameType.code + ") " + $translate('will be deleted')
            }).then(function () {
                socketService.$socket($scope.AppSocket, 'deleteGameTypeByName', {name: gameType.name}, function (data) {
                    vm.getAllGameType();
                });
            });
        }
        vm.getAllProvider = function (callback) {
            if ($('#providerRefresh').hasClass('fa-spin')) {
                return
            }
            $('#providerRefresh').addClass('fa-spin');
            socketService.$socket($scope.AppSocket, 'getAllGameProviders', '', function (data) {
                vm.allGameProvider = data.data;
                vm.buildProviderList(vm.allGameProvider, callback);
                $('#providerRefresh').removeClass('fa-spin');

                $('#providerRefresh').addClass('fa-check');
                $('#providerRefresh').removeClass('fa-refresh');
                setTimeout(function () {
                    $('#providerRefresh').removeClass('fa-check');
                    $('#providerRefresh').addClass('fa-refresh').fadeIn(100);
                }, 1000);
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
                $('#providerRefresh').removeClass('fa-spin');
            });
        };
        vm.buildProviderList = function (data, callback) {
            vm.providerList = [];
            for (var i = 0; i < data.length; i++) {
                vm.providerList.push(vm.createProviderNode(data[i]));
            }
            $('#providerTree').treeview(
                {
                    data: vm.providerList,
                    highlightSearchResults: false
                }
            );
            $('#providerTree').on('nodeSelected', function (event, data) {
                vm.gameProviderClicked(data);
            });
            if (callback) {
                callback();
            }
        };

        var providerStatusColorObj = {
            1: 'colorLimegreen',
            2: 'colorYellow',
            3: 'colorRed'
        }
        vm.createProviderNode = function (v) {
            var colorClass = (v && v.status) ? providerStatusColorObj[v.status] : '';
            var obj = {
                text: v.name,
                id: v._id,
                selectable: true,
                data: v,
                icon: 'fa fa-circle ' + colorClass,
            };
            return obj;
        };

        vm.gameProviderClicked = function (i) {
            vm.SelectedProvider = i.data;
            vm.showProvider = vm.SelectedProvider;
            console.log('game provider selected ', i);
            vm.getProviderGames(i.data._id);
            vm.selectedPenalClass = '';
            vm.showGame = {};
            switch (i.data.status) {
                case 1:
                    vm.selectedPenalClass = 'panel-success';
                    break;
                case 2:
                    vm.selectedPenalClass = 'panel-warning';
                    break;
                case 3:
                default:
                    vm.selectedPenalClass = 'panel-danger'
            }

            $scope.safeApply();
        }
        vm.createNewProvider = function () {
            if (!vm.showProvider || !vm.showProvider.name) {
                return;
            }
            console.log(vm.showProvider);
            socketService.$socket($scope.AppSocket, 'createGameProvider', vm.showProvider, function (data) {
                console.log("create OK", data);
                vm.getAllProvider();
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        }
        vm.updateProvider = function () {
            var obj = {
                query: {_id: vm.showProvider._id},
                updateData: {
                    name: vm.showProvider.name,
                    nickName: vm.showProvider.nickName,
                    prefix: vm.showProvider.prefix,
                    code: vm.showProvider.code,
                    status: Number(vm.showProvider.status),
                    dailySettlementHour: vm.showProvider.dailySettlementHour,
                    dailySettlementMinute: vm.showProvider.dailySettlementMinute,
                }
            }
            console.log("updateProvider", obj);
            socketService.$socket($scope.AppSocket, 'updateGameProvider', obj, function (data) {
                console.log("update OK", data);
                vm.getAllProvider(function () {
                    var selectedTree = $('#providerTree').treeview('search', [vm.showProvider.name, {
                        ignoreCase: false,     // case insensitive
                        exactMatch: true,    // like or equals
                        revealResults: false,  // reveal matching nodes
                    }]);
                    if (selectedTree.length == 1) {
                        $('#providerTree').treeview('selectNode', [selectedTree, {silent: true}]);
                        vm.gameProviderClicked(selectedTree[0]);
                    }
                    console.log('selectedTree', selectedTree);
                });
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        }
        vm.deleteProvider = function () {
            socketService.$socket($scope.AppSocket, 'deleteGameProvider', {_id: vm.showProvider._id}, function (data) {
                console.log("delete OK", data);
                vm.getAllProvider();
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        }

        //game functions
        vm.getGameStatusClass = function (str) {
            if (!str) return;
            if (str == vm.allGameStatusString.ENABLE) {
                return 'colorGreen';
            } else if (str == vm.allGameStatusString.DISABLE) {
                return 'colorRed';
            } else if (str == vm.allGameStatusString.MAINTENANCE) {
                return 'colorYellow';
            } else {
                return 'colorRed';
            }
        }

        vm.getProviderGames = function (id) {
            if (!id)return;
            console.log(id);
            $('#loadingProviderGames').removeClass('hidden');
            socketService.$socket($scope.AppSocket, 'getGamesByProviderId', {_id: id}, function (data) {
                vm.allGames = data.data;
                vm.filterAllGames = $.extend([], vm.allGames);
                console.log('vm.allGames', vm.allGames);
                $('#loadingProviderGames').addClass('hidden');
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });
        }
        // vm.prepareShowProviderExpense = function () {
        //     socketService.$socket($scope.AppSocket, 'getGameProviderConsumptionRecord', {providerObjId: vm.SelectedProvider._id}, function (data) {
        //         console.log('expenserecords', data);
        //         vm.providerAllExpenseRecords = data.data;
        //         $scope.safeApply();
        //     });
        // };


        vm.gameClicked = function (i, v) {
            vm.selectedGameBlock = {};
            vm.selectedGameBlock[i] = true;
            vm.showGame = v;
            console.log(i, v);
        }
        vm.changeGameStatus = function (which, value) {
            vm.curStatusGame = which;
            vm.curStatusGame.targetStatus = value;

            if (which.status != value) {
                $('#modalConfirmChangeGameStatus').modal();
            }

        }
        vm.confirmGameStatusChange = function (which, value) {
            var send = {
                query: {_id: vm.curStatusGame._id},
                updateData: {status: vm.curStatusGame.targetStatus}
            };
            socketService.$socket($scope.AppSocket, 'updateGame', send, function (data) {
                vm.getProviderGames(vm.SelectedProvider._id);
                $scope.safeApply();
            }, function (data) {
                console.log("create not", data);
            });

            $scope.safeApply();
        }

        vm.triggerUploadFile = function (which) {
            if (which == 'big') {
                angular.element('#uploadBigIcon').trigger('click');
            } else if (which == 'small') {
                angular.element('#uploadSmallIcon').trigger('click');
            }
        }

        vm.prepareUploadFile = function () {
            $('input[name=bigIcon]').off();
            $('input[name=bigIcon]').on('change', function (a) {
                console.log(a, $(this));
                $scope.safeApply();
            });
        }

        vm.initGameDetail = function () {
            vm.bigPicFile = null;
            vm.smallPicFile = null;
        }
        // vm.submitCreateGame = function () {
        //     vm.showGame.provider = vm.SelectedProvider._id;
        //     console.log("big", vm.bigPicFile);
        //     if (vm.bigPicFile) {
        //         console.log("here");
        //         vm.showGame.bigIcon = vm.tempBigIcon
        //     }
        //     if (vm.smallPicFile) {
        //         vm.showGame.smallIcon = vm.tempSmallIcon
        //     }
        //     console.log('submit', vm.showGame);
        //     socketService.$socket($scope.AppSocket, 'createGameAndAddToProvider', vm.showGame, function (data) {
        //         vm.getProviderGames(vm.SelectedProvider._id);
        //         console.log("added");
        //         $scope.safeApply();
        //     }, function (data) {
        //         console.log("create not", data);
        //     });
        // }
        // vm.submitDeleteGame = function () {
        //     if (!vm.showGame) return;
        //     socketService.$socket($scope.AppSocket, 'deleteGameById', {_id: vm.showGame._id}, function (data) {
        //         vm.getProviderGames(vm.SelectedProvider._id);
        //         $scope.safeApply();
        //     }, function (data) {
        //         console.log("create not", data);
        //     });
        // }
        // vm.submitUpdateGame = function () {
        //     if (!vm.showGame) return;
        //     if (vm.bigPicFile) {
        //         vm.showGame.bigIcon = vm.tempBigIcon
        //     }
        //     if (vm.smallPicFile) {
        //         vm.showGame.smallIcon = vm.tempSmallIcon
        //     }
        //     var send = {
        //         query: {_id: vm.showGame._id},
        //         updateData: vm.showGame
        //     };
        //     delete send.updateData._id;
        //     socketService.$socket($scope.AppSocket, 'updateGame', send, function (data) {
        //         vm.getProviderGames(vm.SelectedProvider._id);
        //         $scope.safeApply();
        //     }, function (data) {
        //         console.log("create not", data);
        //     });
        // }
        vm.initShowGameExpense = function () {
            $('#modalGameExpenses').modal().show();
            utilService.actionAfterLoaded('#modalGameExpenses.in .searchDiv .endTime', function () {
                vm.gameExpenseQuery = {};
                vm.gameExpenseQuery.startTime = utilService.createDatePicker('#modalGameExpenses .searchDiv .startTime');
                vm.gameExpenseQuery.endTime = utilService.createDatePicker('#modalGameExpenses .searchDiv .endTime');
                vm.gameExpenseQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.gameExpenseQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                utilService.actionAfterLoaded('#modalGameExpenses.in #gameExpenseDatatablePage', function () {
                    vm.gameExpenseQuery.pageObj = utilService.createPageForPagingTable("#gameExpenseDatatablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "gameExpenseQuery", vm.getGameExpense)
                    });
                    vm.getGameExpense(true);
                });
            });
        }
        vm.getGameExpense = function (newSearch) {
            var sendObj = {
                gameId: vm.showGame._id,
                startTime: vm.gameExpenseQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.gameExpenseQuery.endTime.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.gameExpenseQuery.index,
                limit: newSearch ? 10 : vm.gameExpenseQuery.limit,
                sortCol: newSearch ? null : vm.gameExpenseQuery.sortCol,
            }
            vm.gameExpenseQuery.loading = true;

            socketService.$socket($scope.AppSocket, 'getPagedGameConsumptionRecord', sendObj, function (data) {
                console.log('expenserecords', data);
                vm.gameExpenseQuery.loading = false;
                var tableData = data.data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.validAmount$ = item.validAmount.toFixed(2);
                    item.amount$ = item.amount.toFixed(2);
                    item.bonusAmount$ = item.bonusAmount.toFixed(2);
                    item.commissionAmount$ = item.commissionAmount.toFixed(2);
                    return item;
                }) : [];
                vm.gameExpenseQuery.totalCount = data.data.count || 0;
                var summary = data.data.summary || {};
                var tableOptions = {
                    data: tableData,
                    "order": vm.gameExpenseQuery.aaSorting || [[0, 'desc']],
                }
                tableOptions = $.extend(true, {}, vm.generalDataTableOptions, vm.commonProviderGameTableOPtions, tableOptions);
                vm.gameExpenseQuery.pageObj.init({maxCount: vm.gameExpenseQuery.totalCount}, newSearch);
                utilService.createDatatableWithFooter('#gameExpenseDatatable', tableOptions, {
                    3: summary.validAmountAll,
                    4: summary.amountAll,
                    6: summary.bonusAmountAll,
                    7: summary.commissionAmountAll
                });
                $('#gameExpenseDatatable').off('order.dt');
                $('#gameExpenseDatatable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'gameExpenseQuery', vm.getGameExpense);
                });
                $('#gameExpenseDatatable').resize();
                $scope.safeApply();
            });
        }

        vm.providerFilterClicked = function () {
            vm.filterAllGames = vm.allGames.filter(a => {
                var show = true;
                if (vm.filterGameType && (vm.filterGameType != 'all') && (vm.filterGameType != a.type)) {
                    show = false;
                }
                if (vm.filterGameName && a.name.indexOf(vm.filterGameName) == -1) {
                    show = false;
                }
                if (vm.filterGameCode && a.code.indexOf(vm.filterGameCode) == -1) {
                    show = false;
                }
                if (vm.filterPlayGameType && (vm.filterPlayGameType != 'all') && (vm.filterPlayGameType != a.playGametype)) {
                    show = false;
                }
                return show;
            })
        }
        vm.commonProviderGameTableOPtions = {
            columnDefs: [
                {'sortCol': 'createTime', bSortable: true, 'aTargets': [0]},
                {'sortCol': 'playerId', bSortable: true, 'aTargets': [2]},
                {'sortCol': 'validAmount', bSortable: true, 'aTargets': [4]},
                {'sortCol': 'amount', bSortable: true, 'aTargets': [5]},
                {'sortCol': 'bonusAmount', bSortable: true, 'aTargets': [7]},
                {'sortCol': 'commissionAmount', bSortable: true, 'aTargets': [8]},
                {targets: '_all', bSortable: false, defaultContent: ' '}
            ],
            columns: [
                {title: $translate('CREATION_TIME'), data: "createTime$"},
                {title: $translate('PLATFORM'), data: "platformId.name"},
                {title: $translate('PLAYERID'), data: "playerId.name", sClass: 'sumText'},
                {title: $translate('GAME_TITLE'), data: "gameId.name"},
                {title: $translate('VALID_AMOUNT'), data: "validAmount$", sClass: 'sumFloat textRight'},
                {title: $translate('Total Amount'), data: "amount$", sClass: 'sumFloat textRight'},
                {title: $translate('orderId'), data: "orderId"},
                {title: $translate('bonusAmount'), data: "bonusAmount$", sClass: 'sumFloat textRight'},
                {
                    title: $translate('commissionAmount'), data: "commissionAmount$",
                    sClass: 'sumFloat textRight'
                },
            ],
            "paging": false,
            "language": {
                "info": "Total _MAX_ records",
                "emptyTable": $translate("No data available in table"),
            }
        }
        vm.prepareShowProviderExpense = function () {
            $('#modalProviderExpenses').modal().show();
            vm.expenseQuery = {};
            utilService.actionAfterLoaded('#modalProviderExpenses.in #providerExpenseQuery', function () {
                vm.expenseQuery.startTime = utilService.createDatePicker('#providerExpenseQuery .startTime');
                vm.expenseQuery.endTime = utilService.createDatePicker('#providerExpenseQuery .endTime');
                vm.expenseQuery.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.expenseQuery.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                utilService.actionAfterLoaded('#modalProviderExpenses.in #providerExpenseTablePage', function () {
                    vm.expenseQuery.pageObj = utilService.createPageForPagingTable("#providerExpenseTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "expenseQuery", vm.getProviderExpense)
                    });
                    vm.getProviderExpense(true);
                });
            });

        }
        vm.getProviderExpense = function (newSearch) {
            var queryData = {
                startTime: vm.expenseQuery.startTime.data('datetimepicker').getLocalDate(),
                endTime: vm.expenseQuery.endTime.data('datetimepicker').getLocalDate(),
                platformId: vm.selectedPlatformID,
                providerObjId: vm.SelectedProvider._id,
                index: newSearch ? 0 : vm.expenseQuery.index,
                limit: newSearch ? 10 : vm.expenseQuery.limit,
                sortCol: newSearch ? null : vm.expenseQuery.sortCol,
            }
            vm.providerExpenseTableLoading = true;
            $scope.safeApply();
            socketService.$socket($scope.AppSocket, 'getPagedGameProviderConsumptionRecord', queryData, function (data) {
                vm.providerExpenseTableLoading = false;
                var tableData = data.data.data ? data.data.data.map(item => {
                    item.createTime$ = vm.dateReformat(item.createTime);
                    item.validAmount$ = item.validAmount.toFixed(2);
                    item.amount$ = item.amount.toFixed(2);
                    item.bonusAmount$ = item.bonusAmount.toFixed(2);
                    item.commissionAmount$ = item.commissionAmount.toFixed(2);
                    return item;
                }) : [];
                vm.expenseQuery.totalCount = data.data.count || 0;
                var summary = data.data.summary || {};
                var tableOptions = {
                    data: tableData,
                    "order": vm.expenseQuery.aaSorting || [[0, 'desc']],
                }
                tableOptions = $.extend(true, {}, vm.generalDataTableOptions, vm.commonProviderGameTableOPtions, tableOptions);
                vm.expenseQuery.pageObj.init({maxCount: vm.expenseQuery.totalCount}, newSearch);
                utilService.createDatatableWithFooter('#providerExpenseTable', tableOptions, {
                    4: summary.validAmountAll,
                    5: summary.amountAll,
                    7: summary.bonusAmountAll,
                    8: summary.commissionAmountAll
                });
                $('#providerExpenseTable').off('order.dt');
                $('#providerExpenseTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'expenseQuery', vm.getProviderExpense);
                });
                $('#providerExpenseTable').resize();
                $scope.safeApply();
            });
        }

        // vm.prepareShowProviderExpenseByQuery = function (flag) {
        //     // vm.newExpenseQuery = vm.expenseQuery || {};
        //     //vm.newExpenseQuery = $.extend(true, {}, vm.queryExpense);
        //     // vm.providerAllExpenseRecords = {};
        //     var queryData = {
        //         startTime: vm.expenseQuery.startTime,
        //         endTime: vm.expenseQuery.endTime,
        //         platformId: vm.selectedPlatformID,
        //         providerObjId: vm.SelectedProvider._id
        //     }
        //     vm.providerExpenseTableLoading = true;
        //     $scope.safeApply();
        //     socketService.$socket($scope.AppSocket, 'getGameProviderConsumptionRecord', queryData, function (data) {
        //         vm.providerExpenseTableLoading = false;
        //         vm.providerAllExpenseRecords = data.data || [];
        //         if (flag == 'update') {
        //             vm.updateDataTableinModal('#modalProviderExpenses', '#providerExpenseTable');
        //         } else if (flag == 'new') {
        //             vm.processDataTableinModal('#modalProviderExpenses', '#providerExpenseTable');
        //         }
        //     });
        // };
        /////////////////upload functions/////////////////////
        //uploading image example
        var uploadPath = $location.protocol() + "://" + $location.host() + ":" + $location.port();
        vm.uploadPic = function (file, which) {
            file.upload = Upload.upload(
                {
                    url: uploadPath + '/uploadImage',
                    file: file,
                    method: "POST"
                }
            );

            file.upload.then(function (response) {
                $timeout(function () {
                    file.result = response.data;
                    console.log("response", response);
                    vm.uploadFileName = "images/uploads/" + response.data.filename;
                    if (which == "big") {
                        vm.tempBigIcon = vm.uploadFileName;
                        $("#uploadBigPicResult").fadeOut(3000, function () {
                        });
                    } else if (which == "small") {
                        vm.tempSmallIcon = vm.uploadFileName;
                        $("#uploadSmallPicResult").fadeOut(3000, function () {
                        });
                    }
                });
            }, function (response) {
                if (response.status > 0) {
                    $scope.uploadImgErrorMsg = response.status + ': ' + response.data;
                }
            }, function (evt) {
                // Math.min is to fix IE which reports 200% sometimes
                file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            });
        }

        vm.startProviderDailySettlement = function (callback) {
            if (!vm.SelectedProvider) return;
            socketService.$socket($scope.AppSocket, 'startProviderDailySettlement', {providerId: vm.SelectedProvider._id}, function (data) {
                console.log("Settlement done:", data);
                if (callback) {
                    callback(data);
                }
                vm.getAllProvider(function () {
                    var selectedTree = $('#providerTree').treeview('search', [vm.SelectedProvider.name, {
                        ignoreCase: false,     // case insensitive
                        exactMatch: true,    // like or equals
                        revealResults: false,  // reveal matching nodes
                    }]);
                    if (selectedTree.length == 1) {
                        $('#providerTree').treeview('selectNode', [selectedTree, {silent: true}]);
                        vm.gameProviderClicked(selectedTree[0]);
                    }
                    console.log('selectedTree', selectedTree);
                });
            }, function (error) {
                console.log("Settlement failed", error);
                if (callback) {
                    callback(error);
                }
            });
        };

        vm.showSettlementActionModal = function () {
            vm.settlementAction = {};
            vm.settlementAction.date = new Date();
            vm.settlementAction.result = '';
            $scope.safeApply();
            $('#modalSettlementAction').modal().show();
        }

        vm.doSettlement = function () {
            vm.settlementAction.result = '';
            $scope.safeApply();
            if (!vm.SelectedProvider) return;
            let sendData = {
                providerId: vm.SelectedProvider._id,
                settlementDay: vm.settlementAction.date
            };

            sendData.selectedPlatformID = (vm.selectedPlatformID === "_allPlatform") ? vm.allPlatformId : vm.selectedPlatformID;

            // if(vm.selectedPlatformID !== "_allPlatform") {
            //     sendData.selectedPlatformID = vm.selectedPlatformID;
            // }
            // else{
            //     sendData.selectedPlatformID = vm.allPlatformId;
            // }

            console.log(sendData);

            socketService.$socket($scope.AppSocket, 'manualDailyProviderSettlement', sendData, function (data) {
                console.log("Settlement done:", data);
                vm.getAllProvider(function () {
                    var selectedTree = $('#providerTree').treeview('search', [vm.SelectedProvider.name, {
                        ignoreCase: false,     // case insensitive
                        exactMatch: true,    // like or equals
                        revealResults: false,  // reveal matching nodes
                    }]);
                    if (selectedTree.length == 1) {
                        $('#providerTree').treeview('selectNode', [selectedTree, {silent: true}]);
                        vm.gameProviderClicked(selectedTree[0]);
                    }
                    console.log('selectedTree', selectedTree);
                });
                vm.settlementAction.result = "SUCCESS";
                $scope.safeApply();
            }, function (error) {
                console.log("Settlement failed", error);
                vm.settlementAction.result = "FAIL";
                $scope.safeApply();
            });
        }

        //settlement history
        vm.prepareSettlementHistory = function () {
            vm.initQueryTimeFilter('modalProviderSettlementHistory');
            $scope.safeApply();
            vm.processDataTableinModal('#modalProviderSettlementHistory', '#providerSettlementHistoryTbl');
            vm.getSettlementHistory();
        }
        vm.getSettlementHistory = function () {
            socketService.$socket($scope.AppSocket, 'getSettlementHistory', {
                query: {
                    type: "provider",
                    id: vm.SelectedProvider._id,
                    createTime: {
                        $gte: vm.queryPara.modalProviderSettlementHistory.startTime.data('datetimepicker').getLocalDate(),
                        $lt: vm.queryPara.modalProviderSettlementHistory.endTime.data('datetimepicker').getLocalDate(),
                    }
                }
            }, success, failfunc);
            function success(data) {
                console.log('settlement history', data);
                vm.providerSettlementHis = data.data;
                $scope.safeApply();
                vm.updateDataTableinModal('#modalProviderSettlementHistory', '#providerSettlementHistoryTbl');
            };
            function failfunc(error) {
                console.log(error);
            };
        }
        //settlement history

        vm.initQueryTimeFilter = function (field, callback) {
            vm.queryPara[field] = {};
            utilService.actionAfterLoaded(('#' + field ), function () {
                vm.queryPara[field].startTime = utilService.createDatePicker('#' + field + ' .startTime');
                vm.queryPara[field].endTime = utilService.createDatePicker('#' + field + ' .endTime');
                vm.queryPara[field].startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                vm.queryPara[field].endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
            });
            $scope.safeApply();
            if (callback) {
                callback();
            }
        }
        vm.initQueryPara = function () {
            var obj = {};
            obj.startTime = utilService.setNDaysAgo(new Date(), 1);
            obj.endTime = new Date();
            return obj;
        }
        /////////////////////provier monit////////////////////////
        vm.showProviderMonit = function () {
            const interval = 60000
            $('#modalProviderConsumptionMonit').modal().show();
            vm.providerConsumptionMonit = {};
            utilService.actionAfterLoaded('#providerMonitGraph', function () {
                const width = $('#providerMonitGraph').width();
                $('#providerMonitGraph').height(width / 2);
            })
            vm.getProviderMonit(true);
            function drawGraph() {
                if ($('#modalProviderConsumptionMonit.in').length > 0) {
                    vm.getProviderMonit();
                    return setTimeout(drawGraph, interval);
                }
            };
            setTimeout(drawGraph, interval);
        }

        vm.getProviderMonit = function (newSearch) {
            socketService.$socket($scope.AppSocket, 'getConsumptionIntervalByProvider', {
                providerIds: vm.allGameProvider.filter(item => {
                    return item.status == 1
                }).map(item => {
                    return item._id;
                }),
            }, function (data) {
                console.log('providers data', data);
                var graphData = data.data.map(item => {
                    let provObj = vm.allGameProvider.filter(prov => {
                        return prov._id == item.providerId
                    })
                    var dataObj = {
                        label: provObj && provObj[0] ? provObj[0].name : item.providerId,
                        data: item.data.map(dot => {
                            return [new Date(dot.time0), dot.count, new Date(dot.time1)]
                        })
                    }
                    return dataObj;
                })
                vm.drawProviderMonitor('#providerMonitGraph', graphData, newSearch);
            });
        }
        vm.drawProviderMonitor = function (dom, data, newSearch) {
            if (newSearch) {
                var newOptions = {};
                newOptions.yaxes = [{
                    position: 'left',
                    axisLabel: $translate('CREDIT'),
                }];
                newOptions.xaxes = [{
                    position: 'bottom',
                    axisLabel: $translate('TIME')
                }];
                newOptions.xaxis = {
                    tickLength: 0,
                    mode: "time",
                    minTickSize: [1, "minute"],
                    timezone: "browser"
                }
                vm.providerConsumptionMonit.graphObj = socketService.$plotLine(dom, data, newOptions);
                vm.bindHover(dom, function (obj) {
                    var x = obj.datapoint[0],
                        y = obj.datapoint[1].toFixed(0);
                    var t0 = obj.series.data[obj.dataIndex][0];
                    var t1 = obj.series.data[obj.dataIndex][2];
                    var showText = $translate('provider') + ' : ' + obj.series.label + '<br>'
                        + $translate('from') + ' : ' + utilService.getFormatTime(t0) + '<br>'
                        + $translate('to') + ' : ' + utilService.getFormatTime(t1) + '<br>'
                        + $translate('CREDIT') + ' : ' + y;
                    $("#tooltip").show();
                    $("#tooltip").html(showText)
                        .css({top: obj.pageY + 5, left: obj.pageX + 5})
                        .fadeIn(200);
                })
            } else {
                vm.providerConsumptionMonit.graphObj.setData(data);
                vm.providerConsumptionMonit.graphObj.setupGrid();
                vm.providerConsumptionMonit.graphObj.draw();
            }
        }
        /////////////////////provier monit////////////////////////

        ///////////////////////common function//////////////////////////////
        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };

        vm.processDataTableinModal = function (modalID, tableID) {
            //modalID=#modalPlayerExpenses
            //tableID=#playerExpenseTable
            //when creating datatable in a modal, need manually show the modal instead of using data-target
            function clearExistDatatable(callback) {
                $(modalID + ' ' + tableID + '_wrapper').each(function (i, v) {
                    $(v).remove();
                })
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
                        thisTable = temp.DataTable(vm.generalDataTableOptions);
                        $table.hide();
                        if (thisTable) {
                            thisTable.columns.adjust().draw();
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

        vm.updateDataTableinModal = function (modalID, tableID, opt) {
            var thisTable = '';
            var tblOptions = $.extend(true, tblOptions, opt, vm.generalDataTableOptions);
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
            }
        }
        vm.bindHover = function (placeholder, callback) {
            $(placeholder).bind("plothover", function (event, pos, obj) {
                var previousPoint;
                if (!obj) {
                    $("#tooltip").hide();
                    previousPoint = null;
                    return;
                } else {
                    if (previousPoint != obj.dataIndex) {
                        previousPoint = obj.dataIndex;
                        if (callback) {
                            callback(obj);
                        }
                    }
                }
            });
        }
        vm.generalDataTableOptions = {
            "paging": true,
            dom: 'tpl',
            "aaSorting": [],
            destroy: true,
            "scrollX": true,
            sScrollY: 350,
            scrollCollapse: true,
            lengthMenu: [
                [10, 25, 50, -1],
                ['10', '25', '50', $translate('Show All')]
            ],
            "language": {
                "info": "",
                "paginate": {
                    "previous": $translate("PREVIOUS_PAGE"),
                    "next": $translate("NEXT_PAGE"),
                },
                "emptyTable": "",
                "lengthMenu": $translate("lengthMenuText"),
                sZeroRecords: ""
            }
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
        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {
            setTimeout(
                function () {
                    vm.getAllProvider();
                    vm.queryPara = {};
                    vm.gameStatus = {};
                    vm.gameStatusIcon = {};
                    vm.hourListArray = utilService.$createArray(24);
                    vm.minuteListArray = utilService.$createArray(60);
                    vm.expenseQuery = vm.initQueryPara();
                    vm.getAllGameType();
                    vm.filterGameType = 'all';
                    vm.filterPlayGameType = 'all';

                    vm.selectedPenalClass = 'panel-default';
                    // socketService.$socket($scope.AppSocket, 'getAllGameStatus', '', function (data) {
                    //     console.log("all game status", data.data);
                    //     vm.allGameStatusString = data.data;
                    //
                    //     var allStatus = data.data;
                    //     var keys = [];
                    //     for (var key in allStatus) {
                    //         if (allStatus.hasOwnProperty(key)) { //to be safe
                    //             keys.push(key);
                    //         }
                    //     }
                    //     vm.allGameStatusKeys = keys;
                    //     $scope.safeApply();
                    // })
                    // socketService.$socket($scope.AppSocket, 'getAllProviderStatus', '', function (data) {
                    //     console.log("all provider status", data.data);
                    //     vm.allProviderStatusString = data.data;
                    //
                    //     var allStatus = data.data;
                    //     var keys = [];
                    //     for (var key in allStatus) {
                    //         if (allStatus.hasOwnProperty(key)) { //to be safe
                    //             keys.push(key);
                    //         }
                    //     }
                    //     vm.allProviderStatusKeys = keys;
                    //     console.log('vm.allProviderStatusKeys', vm.allProviderStatusKeys);
                    //     $scope.safeApply();
                    // })

                    socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                        if (data.data) {
                            vm.platformList = data.data;
                            vm.allPlatformId = vm.platformList.reduce((temp, platform) => {
                                temp.push(platform._id);
                                return temp;
                            }, []);
                            if (vm.platformList.length == 0) {
                                return;
                            } else {
                                vm.selectedPlatformID = vm.platformList[0]._id;
                            }
                            $scope.safeApply();
                        }

                    }, function (err) {
                        // $('#platformRefresh').removeClass('fa-spin');
                    });
                }
            );

        });
    };
    providerController.$inject = injectParams;
    myApp.register.controller('providerCtrl', providerController);
});
