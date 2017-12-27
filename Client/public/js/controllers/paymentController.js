'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies"];

    var paymentController = function ($compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies) {
        var $translate = $filter('translate');
        var vm = this;
        window.VM = vm;

        // declare constants
        vm.topUpTypeList = {
            1: 'TOPUPMANUAL',
            2: 'TOPUPONLINE',
            3: 'TOPUPALIPAY',
            4: 'TOPUPWECHAT',
            5: 'TOPUPQUICKPAY'
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
        vm.allPlayersStatusKeys = ['NORMAL', 'FORBID_GAME', 'FORBID', 'BALCKLIST', 'ATTENTION', 'LOGOFF', 'CHEAT_NEW_ACCOUNT_REWARD', 'TOPUP_ATTENTION', 'HEDGING', 'TOPUP_BONUS_SPAM', 'MULTIPLE_ACCOUNT', 'BANNED', 'FORBID_ONLINE_TOPUP'];

        ////////////////Mark::Platform functions//////////////////
        vm.updatePageTile = function () {
            window.document.title = $translate("payment") + "->" + $translate(vm.paymentPageName);
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
            $cookies.put("paymentShowLeft", vm.showPlatformList);
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

        //build platform list based on platform data from server
        vm.buildPlatformList = function (data) {
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
            // vm.selectPlatformNode($('#platformTree').treeview('getNode', 0));
            $('#platformTree').on('nodeSelected', function (event, data) {
                vm.selectPlatformNode(data);
            });
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
            // Rather than call each tab directly, it might be more elegant to emit a 'platform_changed' event here, which each tab could listen for
            switch (vm.paymentPageName) {
                case "alipayGroup":
                    vm.loadAlipayGroupData();
                    break;
                case "wechatPayGroup":
                    vm.loadWechatPayGroupData();
                    break;
            }

            // Initial Loading
            vm.loadBankCardGroupData();
            vm.loadMerchantGroupData();
            vm.loadAlipayGroupData();
            vm.loadWechatPayGroupData();
            vm.getAllPlayerLevels();
            vm.loadQuickPayGroupData();
            vm.getAllBankCard();
            vm.bankCardFilterOptions = {};
            vm.merchantFilterOptions = {};
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
            return obj;
        };

        var _ = {
            clone: function (obj) {
                return $.extend({}, obj);
            }
        };

        /// check the length of password of player/partner before signup

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
        };

        /////////////////////////////////////// bank card start  /////////////////////////////////////////////////
        vm.bankCardFilterOptions = {};

        vm.bankCardGroupTabClicked = function () {

        };

        vm.getAllBankCard = function () {
            return $scope.$socketPromise('getAllBankCard', {platform: vm.selectedPlatform.data.platformId}).then(data => {
                console.log('getAllBankCard', data);
                vm.allBankCards = data.data.data;

                $scope.safeApply();
            });
        };

        vm.getBankCardTypeTextbyId = function (id) {
            if (!vm.allBankTypeList) {
                return id;
            } else {
                return vm.allBankTypeList[id];
            }
        }

        vm.loadBankCardGroup = () => {
            return $scope.$socketPromise('getPlatformBankCardGroupLite', {platform: vm.selectedPlatform.id}).then(data => {
                console.log('bankgroup', data);
                //provider list init
                vm.platformBankCardGroupList = data.data;
                vm.platformBankCardGroupListCheck = {};
                $.each(vm.platformBankCardGroupList, function (i, v) {
                    vm.platformBankCardGroupListCheck[v._id] = true;
                });
                $scope.safeApply();
            })
        };

        vm.loadBankCardGroupData = function () {
            //init gametab start===============================
            vm.showBankCate = "include";
            vm.filterBankType = 'all';
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            vm.SelectedBankCardGroupNode = null;
            console.log("getBanks", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformBankCardGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('bankgroup', data);
                //provider list init
                vm.platformBankCardGroupList = data.data;
                vm.platformBankCardGroupListCheck = {};
                $.each(vm.platformBankCardGroupList, function (i, v) {
                    vm.platformBankCardGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })

            socketService.$socket($scope.AppSocket, 'getBankTypeList', {}, function (data) {
                if (data && data.data && data.data.data) {
                    vm.allBankTypeList = {};
                    console.log('banktype', data.data.data);
                    data.data.data.forEach(item => {
                        if (item && item.bankTypeId) {
                        vm.allBankTypeList[item.id] = item.name + ' (' + item.bankTypeId + ')';
                    }
                })
                }
                $scope.safeApply();
            });
        }

        vm.bankCardGroupClicked = function (i, bankCardGroup) {
            if (vm.platformBankCardGroupList) {
                for (let i = 0; i < vm.platformBankCardGroupList.length; i++) {
                    if (vm.platformBankCardGroupList[i]._id.toString() === bankCardGroup._id.toString()) {
                        bankCardGroup = vm.platformBankCardGroupList[i];
                    }
                }
            }

            if (vm.allBankTypeList && vm.bankCardFilterOptions && !vm.bankCardFilterOptions.bankTypes) {
                vm.bankCardFilterOptions.bankTypes = {};
                for (let key in vm.allBankTypeList) {
                    if (vm.allBankTypeList.hasOwnProperty(key)) {
                        vm.bankCardFilterOptions.bankTypes[key] = true;
                    }
                }
            }

            if (vm.bankCardFilterOptions && !vm.bankCardFilterOptions.status) {
                vm.bankCardFilterOptions.status = {
                    "NORMAL": true,
                    "LOCK": true
                }
            }

            vm.SelectedBankCardGroupNode = bankCardGroup;
            vm.includedBanks = null;
            vm.excludedBanks = null;
            vm.bankCardTableLoading = true;
            console.log('bankCardGroup clicked', bankCardGroup);
            // var query = {
            //     platform: vm.selectedPlatform.data.platformId,
            //     bankCardGroup: bankCardGroup._id
            // }

            let proms = [];

            vm.BankCardNameChanged = function(){
                vm.filterBankAccountNo = vm.filterBankCardName;
            };

            vm.BankAccountNumberChanged = function(){
                vm.filterBankCardName = vm.filterBankAccountNo;
            };

            if (!vm.allBankCards) {
                proms.push(vm.getAllBankCard());
            }

            Promise.all(proms).then(() => {
                vm.checkIncludedBankCards();
                vm.bankCardsFilter();
                vm.bankCardTableLoading = false;
                $scope.safeApply();
            });

            // vm.BankTypeChanged = function(){
            //     socketService.$socket($scope.AppSocket, 'getIncludedBankCardByBankCardGroup', query, function(data2){
            //         console.log("banks card name", data2);
            //         if (data2 && data2.data) {
            //             vm.allBankCardList = [];
            //             $.each(data2.data, function (i, v) {
            //                 if (!vm.allBankTypeList[v.bankTypeId]) {
            //                 } else if (vm.filterBankType && (vm.filterBankType != 'all' && vm.filterBankType != '') && (!vm.filterBankType.find(bt => bt.includes('(' + v.bankTypeId + ')')))){
            //
            //                 }else if(vm.filterBankType && vm.filterBankType.length == 0){
            //                     vm.allBankCardList = [];
            //                 } else {
            //                     vm.allBankCardList.push(v);
            //                 }
            //             });
            //         } else {
            //             vm.allBankCardList = [];
            //         }
            //
            //         vm.filterBankCardName = 'all';
            //         vm.filterBankAccountNo = 'all';
            //
            //         $scope.safeApply();
            //     });
            // }

            // socketService.$socket($scope.AppSocket, 'getIncludedBankCardByBankCardGroup', query, function(data2){
            //     console.log("banks card name", data2);
            //     if (data2 && data2.data) {
            //         vm.allBankCardList = [];
            //         $.each(data2.data, function (i, v) {
            //             if (!vm.allBankTypeList[v.bankTypeId]) {
            //             } else if (vm.filterBankType && (vm.filterBankType != 'all' && vm.filterBankType != '') && (!vm.filterBankType.find(bt => bt.includes('(' + v.bankTypeId + ')')))) {
            //             } else {
            //                 vm.allBankCardList.push(v);
            //             }
            //         });
            //     } else {
            //         vm.allBankCardList = [];
            //     }
            //
            //     $scope.safeApply();
            // });
            //
            // socketService.$socket($scope.AppSocket, 'getIncludedBankCardByBankCardGroup', query, function (data2) {
            //     console.log("attached bank cards", data2);
            //     if (data2 && data2.data) {
            //         vm.includedBanks = [];
            //         $.each(data2.data, function (i, v) {
            //             if (!vm.allBankTypeList[v.bankTypeId]) {
            //             } else if (vm.filterBankType && (vm.filterBankType != 'all' && vm.filterBankType != '') && (!vm.filterBankType.find(bt => bt.includes('(' + v.bankTypeId + ')')))) {
            //
            //             } else if (vm.filterBankCardName && (vm.filterBankCardName != 'all' && vm.filterBankCardName != '') && (!vm.filterBankCardName.find(bcn => bcn.name == v.name))) {
            //
            //             } else if (vm.filterBankAccountNo && (vm.filterBankAccountNo != 'all' && vm.filterBankAccountNo != '') && (!vm.filterBankAccountNo.find(ban => ban.accountNumber == v.accountNumber))) {
            //
            //             } else {
            //                 vm.includedBanks.push(v);
            //             }
            //         });
            //
            //         // vm.includedBanks = data2.data;
            //     } else {
            //         vm.includedBanks = [];
            //     }
            //     $scope.safeApply();
            // })
            //
            // socketService.$socket($scope.AppSocket, 'getExcludedBankCardByBankCardGroup', query, function (data2) {
            //     console.log("not attached bank cards", data2);
            //     if (data2 && data2.data) {
            //         vm.excludedBanks = data2.data.filter(item => {
            //             return vm.allBankTypeList[item.bankTypeId];
            //         });
            //     } else {
            //         vm.excludedBanks = [];
            //     }
            //     $scope.safeApply();
            // })
        };

        vm.checkIncludedBankCards = () => {
            if (!vm.allBankCards || !vm.allBankCards.length) {
                return;
            }

            if (vm.SelectedBankCardGroupNode && vm.SelectedBankCardGroupNode.banks) {
                let includedBanks = vm.SelectedBankCardGroupNode.banks;
                for (let i = 0; i < vm.allBankCards.length; i++) {
                    let bank = vm.allBankCards[i];
                    let cardIncluded = false;

                    for (let j = 0; j < includedBanks.length; j++) {
                        let includedBank = includedBanks[j];
                        if (includedBank == bank.accountNumber) {
                            cardIncluded = true;
                            break;
                        }
                    }
                    bank.included = cardIncluded;
                }
            }
        };

        vm.changeAllBankCardTypeInFilter = (select) => {
            for (let key in vm.bankCardFilterOptions.bankTypes) {
                if (vm.bankCardFilterOptions.bankTypes.hasOwnProperty(key)) {
                    vm.bankCardFilterOptions.bankTypes[key] = Boolean(select);
                }
            }
        };

        vm.totalBankCardShows = () => {
            let total = 0;
            for (let key in vm.allBankCards) {
                if (vm.allBankCards.hasOwnProperty(key) && vm.allBankCards[key].show$) {
                    total++;
                }
            }
            return total;
        };

        vm.bankCardsFilter = () => {
            if (!vm.allBankCards || !vm.allBankCards.length) {
                return;
            }

            for (let i = 0; i < vm.allBankCards.length; i++) {
                let bank = vm.allBankCards[i];
                let show = true;
                if (vm.bankCardFilterOptions.bankAccountName && bank.name.indexOf(vm.bankCardFilterOptions.bankAccountName) < 0) {
                    show = false;
                }
                if (vm.bankCardFilterOptions.bankAccountNumber && bank.accountNumber.indexOf(vm.bankCardFilterOptions.bankAccountNumber) < 0) {
                    show = false;
                }
                if (vm.bankCardFilterOptions.included === "yes" && !bank.included || vm.bankCardFilterOptions.included === "no" && bank.included) {
                    show = false;
                }
                if (vm.bankCardFilterOptions.status && vm.bankCardFilterOptions.status[bank.status] === false) {
                    show = false;
                }
                if (vm.bankCardFilterOptions.bankTypes && vm.bankCardFilterOptions.bankTypes[bank.bankTypeId] === false) {
                    show = false;
                }

                bank.show$ = show;
                $scope.safeApply();
            }
        };

        vm.bankCardFilter = function(i, bankCardGroup){
            vm.SelectedBankCardGroupNode = bankCardGroup;
            vm.includedBanks = null;
            vm.excludedBanks = null;
            console.log('bankCardFilter clicked', bankCardGroup);
            var query = {
                platform: vm.selectedPlatform.data.platformId,
                bankCardGroup: bankCardGroup._id
            }


            socketService.$socket($scope.AppSocket, 'getIncludedBankCardByBankCardGroup', query, function (data2) {
                console.log("attached bank cards", data2);
                if (data2 && data2.data) {
                    vm.includedBanks = [];
                    $.each(data2.data, function (i, v) {
                        if (!vm.allBankTypeList[v.bankTypeId]) {
                        } else if (vm.filterBankType && (vm.filterBankType != 'all' && vm.filterBankType != '') && (!vm.filterBankType.find(bt => bt.includes('(' + v.bankTypeId + ')')))) {

                        } else if (vm.filterBankCardName && (vm.filterBankCardName != 'all' && vm.filterBankCardName != '') && (!vm.filterBankCardName.find(bcn => bcn.name == v.name))) {

                        } else if (vm.filterBankAccountNo && (vm.filterBankAccountNo != 'all' && vm.filterBankAccountNo != '') && (!vm.filterBankAccountNo.find(ban => ban.accountNumber == v.accountNumber))) {

                        } else {
                            vm.includedBanks.push(v);
                        }
                    });

                    // vm.includedBanks = data2.data;
                } else {
                    vm.includedBanks = [];
                }
                $scope.safeApply();
            })

            socketService.$socket($scope.AppSocket, 'getExcludedBankCardByBankCardGroup', query, function (data2) {
                console.log("not attached bank cards", data2);
                if (data2 && data2.data) {
                    vm.excludedBanks = data2.data.filter(item => {
                        return vm.allBankTypeList[item.bankTypeId];
                });
                } else {
                    vm.excludedBanks = [];
                }
                $scope.safeApply();
            })
        };


        vm.addBankCardGroup = function (data) {
            console.log('vm.newBankCardGroup', vm.newBankCardGroup);
            //vm.selectGameGroupParent
            var sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newBankCardGroup.name,
                code: vm.newBankCardGroup.code,
                displayName: vm.newBankCardGroup.displayName
            }
            socketService.$socket($scope.AppSocket, 'addPlatformBankCardGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadBankCardGroupData();
                $scope.safeApply();
            })
        }
        vm.removeBankCardGroup = function (node) {
            console.log('to del node', node);
            socketService.$socket($scope.AppSocket, 'deleteBankCardGroup', {_id: node._id}, function (data) {
                console.log(data.data);
                vm.loadBankCardGroupData();
                $scope.safeApply();
            })
        }
        vm.initRenameBankCardGroup = function () {
            vm.newBankCardGroup = {};
            vm.newBankCardGroup.name = vm.SelectedBankCardGroupNode.name;
            vm.newBankCardGroup.displayName = vm.SelectedBankCardGroupNode.displayName;
            vm.newBankCardGroup.code = vm.SelectedBankCardGroupNode.code;
        }

        vm.renameBankCardGroup = function () {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    name: vm.SelectedBankCardGroupNode.groupId
                },
                update: {
                    name: vm.newBankCardGroup.name,
                    displayName: vm.newBankCardGroup.displayName,
                    code: vm.newBankCardGroup.code
                }
            }
            socketService.$socket($scope.AppSocket, 'updatePlatformBankCardGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadBankCardGroupData();
                $scope.safeApply();
            })
        }

        vm.submitDefaultBankCardGroup = function () {
            console.log('vm.defaultBankCardGroup', vm.defaultBankCardGroup);
            var sendData = {
                platform: vm.selectedPlatform.id,
                default: vm.defaultBankCardGroup
            }
            socketService.$socket($scope.AppSocket, 'setPlatformDefaultBankCardGroup', sendData, function (data) {
                vm.loadBankCardGroupData();
            })
        }

        vm.bankClicked = function (i, v, which) {
            console.log('bank clicked', i, v, which);
            vm.highlightBank = {};
            vm.highlightBank[v.accountNumber] = 'bg-pale'
            vm.curBank = v;
        }

        vm.toggleBankType = function (type) {
            vm.highlightBank = null;
            vm.curBank = null;
            vm.showBankCate = type;
        }

        vm.addBankCardToGroup = () => {
            let bankAccountNumbers = [];
            for (let i = 0; i < vm.allBankCards.length; i++) {
                let account = vm.allBankCards[i];
                if (account.selected && !account.included) {
                    bankAccountNumbers.push(account.accountNumber)
                }
            }

            if (!bankAccountNumbers.length) {
                socketService.showErrorMessage($translate("There is no bank card group to be added"));
                return;
            }

            let sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedBankCardGroupNode._id
                },
                update: {
                    $push: {
                        banks: {$each: bankAccountNumbers}
                    }
                }
            };

            return $scope.$socketPromise('updatePlatformBankCardGroup', sendData).then(data => {
                console.log("_updatePlatformBankCardGroup", data);
                vm.allBankCards.map(card => {
                    card.selected = false;
                });
                $scope.safeApply();
                vm.loadBankCardGroup().then(() => {
                    vm.bankCardGroupClicked(null, vm.SelectedBankCardGroupNode);
                });
            });
        };

        vm.removeBankCardFromGroup = () => {
            let bankAccountNumbers = [];
            for (let i = 0; i < vm.allBankCards.length; i++) {
                let account = vm.allBankCards[i];
                if (account.selected && account.included) {
                    bankAccountNumbers.push(account.accountNumber)
                }
            }

            if (!bankAccountNumbers.length) {
                socketService.showErrorMessage($translate("There is no bank card group to be added"));
                return;
            }

            let sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedBankCardGroupNode._id
                },
                update: {
                    $pull: {
                        banks: {$in: bankAccountNumbers}
                    }
                }
            };

            return $scope.$socketPromise('updatePlatformBankCardGroup', sendData).then(data => {
                console.log("_updatePlatformBankCardGroup", data);
                vm.allBankCards.map(card => {
                    card.selected = false;
                });
                $scope.safeApply();
                vm.loadBankCardGroup().then(() => {
                    vm.bankCardGroupClicked(null, vm.SelectedBankCardGroupNode);
                });
            });
        };

        vm.banktoBankCardGroup = function (type) {
            if (!vm.curBank) return;
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedBankCardGroupNode._id
                }
            }
            if (type === 'attach') {
                sendData.update = {
                    "$push": {
                        banks: vm.curBank.accountNumber
                    }
                }
            } else if (type === 'detach') {
                sendData.update = {
                    "$pull": {
                        banks: vm.curBank.accountNumber
                    }
                }
            }

            console.log(sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformBankCardGroup', sendData, success);
            function success(data) {
                vm.curBank = null;
                console.log(data);
                vm.bankCardGroupClicked(0, vm.SelectedBankCardGroupNode);
                $scope.safeApply();
            }
        }

        // get player levels by platform
        vm.getAllPlayerLevels = function () {
            vm.playerIDArr = [];
            return $scope.$socketPromise('getPlayerLevelByPlatformId', {platformId: vm.selectedPlatform.id})
                .then(function (data) {
                    vm.allPlayerLvl = data.data;
                    vm.allPlayerLvlReordered = false;
                    vm.sortPlayerLevels();
                    console.log("vm.allPlayerLvl", data.data);
                    vm.playerLvlData = {};
                    if (vm.allPlayerLvl) {
                        $.each(vm.allPlayerLvl, function (i, v) {
                            vm.playerIDArr.push(v._id);
                            vm.playerLvlData[v._id] = v;
                        })
                    }
                    $scope.safeApply();
                });
        };

        //getPlayersByPlatform
        vm.preparePlayerToGroupDialog = function (which, id) {
            vm.curPlayerTableId = id;
            vm.playerToGroupFilterObj = {
                which: which,
                filter: {
                    playerLevel: 'all',
                    merchantGroup: 'all',
                    bankCardGroup: 'all',
                    alipayGroup: 'all',
                    wechatPayGroup: 'all',
                    quickPayGroup: 'all'
                }
            };
            utilService.actionAfterLoaded(id + "Page", function () {
                vm.playerToGroupFilterObj.pageObj = utilService.createPageForPagingTable(id + "Page", {}, $translate, function (curP, pageSize) {
                    vm.commonPageChangeHandler(curP, pageSize, "playerToGroupFilterObj", vm.playerToGroupFilter)
                });
                vm.playerToGroupFilter(true, which, id);
            })
        };

        vm.playerToGroupFilter = function (newSearch, which, id) {
            console.log("playerToGroupFilter", newSearch, which, id);
            if (!which) {
                which = vm.playerToGroupFilterObj.which;
            }
            vm.loadingPlayerTable = true;
            var query = {};
            if (vm.playerToGroupFilterObj.filter.name) {
                query["name"] = {$regex: ".*" + vm.playerToGroupFilterObj.filter.name + ".*"}
            }
            if (vm.playerToGroupFilterObj.filter.topUpTimes) {
                query.topUpTimes = {
                    $gte: vm.playerToGroupFilterObj.filter.topUpTimes,
                };
            }
            if (vm.playerToGroupFilterObj.filter.playerLevel && vm.playerToGroupFilterObj.filter.playerLevel != 'all') {
                query.playerLevel = vm.playerToGroupFilterObj.filter.playerLevel;
            }
            if (vm.playerToGroupFilterObj.which = 'merchantGroup' && vm.playerToGroupFilterObj.filter.merchantGroup != "all") {
                query.merchantGroup = vm.playerToGroupFilterObj.filter.merchantGroup;
            }
            if (vm.playerToGroupFilterObj.which = 'bankCardGroup' && vm.playerToGroupFilterObj.filter.bankCardGroup != "all") {
                query.bankCardGroup = vm.playerToGroupFilterObj.filter.bankCardGroup;
            }
            if (vm.playerToGroupFilterObj.which = 'alipayGroup' && vm.playerToGroupFilterObj.filter.alipayGroup != "all") {
                query.alipayGroup = vm.playerToGroupFilterObj.filter.alipayGroup;
            }
            if (vm.playerToGroupFilterObj.which = 'wechatPayGroup' && vm.playerToGroupFilterObj.filter.wechatPayGroup != "all") {
                query.wechatPayGroup = vm.playerToGroupFilterObj.filter.wechatPayGroup;
            }
            if (vm.playerToGroupFilterObj.which = 'quickPayGroup' && vm.playerToGroupFilterObj.filter.quickPayGroup != "all") {
                query.quickPayGroup = vm.playerToGroupFilterObj.filter.quickPayGroup;
            }

            if (vm.playerToGroupFilterObj.which = 'validCredit' && vm.playerToGroupFilterObj.filter.validCredit != "all") {
                query.validCredit = vm.playerToGroupFilterObj.filter.validCredit;
            }

            var apiQuery = {
                platformId: vm.selectedPlatform.id,
                query: query,
                index: newSearch ? 0 : vm.playerToGroupFilterObj.index,
                limit: newSearch ? 10 : (vm.playerToGroupFilterObj.limit || 10),
                sortCol: vm.playerToGroupFilterObj.sortCol || {}
            };
            socketService.$socket($scope.AppSocket, 'getPlayerForAttachGroup', apiQuery, function (data) {
                vm.allPlayer = data.data.data;
                vm.playerToGroupFilterObj.totalCount = data.data.size;
                vm.loadingPlayerTable = false;
                vm.drawPlayerAttachTable(newSearch, vm.allPlayer, vm.playerToGroupFilterObj.totalCount);
            });
        };

        vm.drawPlayerAttachTable = function (newSearch, data, size) {
            console.log("drawPlayerAttachTable", data);
            let tableOptions = $.extend(true, {}, vm.generalDataTableOptions, {
                data: data,
                columnDefs: [
                    {
                        targets: [0],
                        title: '<input type="checkbox" class="toggleCheckAll">',
                        orderable: false,
                        render: function (data, type, row) {
                            '<input type="checkbox">'
                        }
                    },
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {
                        render: function () {
                            var link = $('<input>', {
                                class: "checkRow",
                                type: 'checkbox'
                            });
                            return link.prop('outerHTML');
                        },
                        bSortable: false,
                        sClass: "text-center"

                    },
                    {title: $translate('PLAYER_ID'), data: "playerId"},
                    {
                        title: $translate('PLAYERNAME'), data: "name", "sClass": "alignLeft",
                        render: function (data, type, row) {
                            return "<div>" + data + "</div>";
                        }
                    },
                    // {
                    //     title: $translate('NICK_NAME'), data: "nickName", "sClass": "alignLeft",
                    //     render: function (data, type, row) {
                    //         return data ? ("<div>" + data + "</div>") : "";
                    //     }
                    // },
                    {
                        title: $translate('STATUS'), data: 'status',
                        render: function (data, type, row) {
                            data = $translate(vm.allPlayersStatusKeys[data - 1]) || 'No Value';
                            return data;
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('LEVEL'), "data": 'playerLevel',
                        render: function (data, type, row) {
                            return $translate(data.name) || '';
                        },
                        "sClass": "alignLeft"
                    },
                    {
                        title: $translate('TRUST_LEVEL'), data: 'trustLevel',
                        render: function (data, type, row) {
                            return $translate(data);
                        },
                        "sClass": "alignCenter"
                    },
                    {
                        title: "<div>" + $translate('TOP_UP') + "</div><div>" + $translate('TIMES') + "</div>",
                        "data": 'topUpTimes',
                        "sClass": "alignCenter"
                    },
                    {
                        title: $translate('REGISTRATION_TIME'),
                        data: 'registrationTime',
                        render: function (data, type, row) {
                            return utilService.getFormatTime(data);
                        }
                    },
                    // {
                    //     title: $translate('LAST_ACCESS_TIME'),
                    //     data: 'lastAccessTime',
                    //     render: function (data, type, row) {
                    //         return utilService.getFormatTime(data);
                    //     },
                    // },
                    {
                        title: "<div>" + $translate('Bankcard Group') + "</div>",
                        "data": $translate('bankCardGroup.name') || '',
                        "sClass": "alignCenter"
                    },
                    {
                        title: "<div>" + $translate('Merchant Group') + "</div>",
                        "data": $translate('merchantGroup.name') || '',
                        "sClass": "alignCenter"
                    },
                    {
                        title: "<div>" + $translate('Alipay Group') + "</div>",
                        "data": $translate('alipayGroup.name') || '',
                        "sClass": "alignCenter"
                    },
                    {
                        title: "<div>" + $translate('WechatPay Group') + "</div>",
                        "data": $translate('wechatPayGroup.name') || '',
                        "sClass": "alignCenter"
                    },
                    {
                        title: "<div>" + $translate('QuickPay Group') + "</div>",
                        "data": $translate('quickPayGroup.name') || '',
                        "sClass": "alignCenter"
                    }
                ],
                sScrollY: false,
                "destroy": true,
                "paging": false,
            });
            if (vm.playerToGroupFilterObj.which == 'bankcard') {
                tableOptions.fnRowCallback = preselectPlayerRowforBankcard
            } else if (vm.playerToGroupFilterObj.which == 'merchant') {
                tableOptions.fnRowCallback = preselectPlayerRowforMerchant
            }
            vm.attachPlayerTable = $(vm.curPlayerTableId).DataTable(tableOptions);
            vm.playerToGroupFilterObj.pageObj.init({maxCount: size}, newSearch);

            vm.attachPlayerTable.columns.adjust().draw();
            $(vm.curPlayerTableId).resize();
            $(vm.curPlayerTableId).resize();

            $(vm.curPlayerTableId + ' tbody').off('click', 'tr');
            $(vm.curPlayerTableId + ' tbody').on('click', 'tr', function () {
                $(this).toggleClass('selected');
            });
            vm.selectMultiPlayer = {
                totalCount: 0,
                isTestPlayer: '',
                playerLevel: '',
                trustLevel: '',
                channelMaxChar: 100,
                wordCount: 0,
                numUsedMessage: 0,
                checkAllRow: false,
                numReceived: 0,
                numFailed: 0,
                numRecipient: 0
            };

            $scope.safeApply();
            function updateNumReceipient() {
                vm.selectMultiPlayer.numRecipient = $(vm.curPlayerTableId + ' tbody input:checked[type="checkbox"]').length;
                vm.selectMultiPlayer.numReceived = 0;
                vm.selectMultiPlayer.numFailed = 0;
                $scope.safeApply();
            };

            $('.toggleCheckAll').off('click');
            $('.toggleCheckAll').on('click', function (event, a, b) {
                console.log("checkAll event listened");
                vm.selectMultiPlayer.checkAllRow = !vm.selectMultiPlayer.checkAllRow;
                if (vm.selectMultiPlayer.checkAllRow) {
                    $(vm.curPlayerTableId + ' tbody tr').addClass('selected');
                    $(vm.curPlayerTableId + ' tbody input[type="checkbox"]').prop("checked", vm.selectMultiPlayer.checkAllRow);
                } else {
                    $(vm.curPlayerTableId + ' tbody tr').removeClass('selected');
                    $(vm.curPlayerTableId + ' tbody input[type="checkbox"]').prop("checked", vm.selectMultiPlayer.checkAllRow);
                }
                updateNumReceipient();
            });

            // $('#button').click( function () {
            //     alert( table.rows('.selected').data().length +' row(s) selected' );
            // } );$scope.safeApply();
            function preselectPlayerRowforBankcard(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                // console.log('asd', nRow, aData, iDisplayIndex, iDisplayIndexFull);
                $compile(nRow)($scope);

                if (aData && aData.bankCardGroup && aData.bankCardGroup == vm.SelectedBankCardGroupNode._id) {
                    $(nRow).addClass('selected');
                }
            }

            function preselectPlayerRowforMerchant(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                // console.log('asd', nRow, aData, iDisplayIndex, iDisplayIndexFull);
                $compile(nRow)($scope);

                if (aData && aData.merchantGroup && aData.merchantGroup == vm.SelectedMerchantGroupNode._id) {
                    $(nRow).addClass('selected');
                }
            }
        }

        vm.submitAddPlayersToBankCardGroup = function () {
            var playerArr = [], data = vm.attachPlayerTable.rows('.selected').data();

            data.each(a => {
                playerArr.push(a._id);
            })
            var sendData = {
                bankCardGroupObjId: vm.SelectedBankCardGroupNode._id,
                playerObjIds: playerArr
            }
            socketService.$socket($scope.AppSocket, 'addPlayersToBankCardGroup', sendData, function (data) {
                vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        }

        vm.submitAddAllPlayersToBankCardGroup = function () {
            let sendData = {
                bankCardGroupObjId: vm.SelectedBankCardGroupNode._id,
                platformObjId: vm.selectedPlatform.id
            };
            socketService.$socket($scope.AppSocket, 'addAllPlayersToBankCardGroup', sendData, function (data) {
                if (data.data) {
                    if (data.data.bankCardGroup == vm.SelectedBankCardGroupNode._id && data.data.platform == vm.selectedPlatform.id) {
                        vm.addAllPlayerToBankCardResult = 'found ' + data.data.n + ' modified ' + data.data.nModified;
                    } else {
                        vm.addAllPlayerToBankCardResult = JSON.stringify(data.data.error);
                    }
                    $scope.safeApply();
                }
            });
        }

        vm.getPlatformPlayersData = function () {
            socketService.$socket($scope.AppSocket, 'getPlayersCountByPlatform', {platform: vm.selectedPlatform.id}, function (playerCount) {
                console.log('playerCount', playerCount);
            });
        };

        /////////////////////////////////////// bank card end  /////////////////////////////////////////////////

        /////////////////////////////////////// Merchant Group start  /////////////////////////////////////////////////

        vm.merchantGroupTabClicked = function () {
            socketService.$socket($scope.AppSocket, 'getMerchantTypeList', {}, function (data) {
                if (data && data.data && data.data.merchantTypes && data.data.merchantTypes.length > 0) {
                    vm.allMerchantTypeList = {};
                    data.data.merchantTypes.forEach(item => {
                        vm.allMerchantTypeList[item.merchantTypeId] = item;
                    });
                    console.log('merchanttype', vm.allMerchantTypeList);
                }
                $scope.safeApply();
            })
        };

        vm.loadMerchantGroupData = function () {
            //init gametab start===============================
            vm.showMerchantCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            vm.SelectedMerchantGroupNode = null;
            console.log("getMerchants", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformMerchantGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('merchantgroup', data);
                //provider list init
                vm.platformMerchantGroupList = data.data;
                vm.platformMerchantGroupListCheck = {};
                $.each(vm.platformMerchantGroupList, function (i, v) {
                    vm.platformMerchantGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        vm.merchantGroupClicked = function (i, merchantGroup) {
            vm.SelectedMerchantGroupNode = merchantGroup;
            vm.includedMerchants = null;
            vm.excludedMerchants = null;
            console.log('merchantGroup clicked', merchantGroup);

            if (vm.merchantFilterOptions && !vm.merchantFilterOptions.status) {
                vm.merchantFilterOptions.status = {
                    "DISABLED": true,
                    "ENABLED": true
                }
            }

            if ($scope.merchantTargetDeviceJson && vm.merchantFilterOptions && !vm.merchantFilterOptions.targetDevices) {
                vm.merchantFilterOptions.targetDevices = {};
                for (let key in $scope.merchantTargetDeviceJson) {
                    if ($scope.merchantTargetDeviceJson.hasOwnProperty(key)) {
                        vm.merchantFilterOptions.targetDevices[key] = true;
                    }
                }
            }

            if ($scope.merchantTopupTypeJson && vm.merchantFilterOptions && !vm.merchantFilterOptions.topupType) {
                vm.merchantFilterOptions.topupType = {};
                for (let key in $scope.merchantTopupTypeJson) {
                    if ($scope.merchantTopupTypeJson.hasOwnProperty(key)) {
                        vm.merchantFilterOptions.topupType[key] = true;
                    }
                }
            }

            if (vm.allMerchantTypeList && vm.merchantFilterOptions && !vm.merchantFilterOptions.merchantTypeId) {
                vm.merchantFilterOptions.merchantTypeId = {};
                for (let key in vm.allMerchantTypeList) {
                    if (vm.allMerchantTypeList.hasOwnProperty(key)) {
                        vm.merchantFilterOptions.merchantTypeId[key] = true;
                    }
                }
            }

            var query = {
                platform: vm.selectedPlatform.data.platformId,
                merchantGroup: merchantGroup._id
            }

            socketService.$socket($scope.AppSocket, 'getMerchantByMerchantGroup', query, function(data){
                console.log('MerchantGroupList', data);
                //provider list init
                vm.allMerchantList = data.data;
                $scope.$evalAsync(vm.merchantPayFilter());
            });

        }

        vm.changeMerchantFilter = (objKey, select) => {
            for (let key in vm.merchantFilterOptions[objKey]) {
                if (vm.merchantFilterOptions[objKey].hasOwnProperty(key)) {
                    vm.merchantFilterOptions[objKey][key] = Boolean(select);
                }
            }
        };

        vm.totalMerchantShows = () => {
            let total = 0;
            for (let key in vm.allMerchantList) {
                if (vm.allMerchantList.hasOwnProperty(key) && vm.allMerchantList[key].show$) {
                    total++;
                }
            }
            return total;
        };

        vm.merchantPayFilter = function(){
            console.log('merchantGroup filter');
            for (let i = 0; i < vm.allMerchantList.length; i++) {
                let merchant = vm.allMerchantList[i];
                let show = true;
                if (vm.merchantFilterOptions.backstageMerchantId && merchant.name.indexOf(vm.merchantFilterOptions.backstageMerchantId) < 0) {
                    show = false;
                }
                if (vm.merchantFilterOptions.isIncluded === "yes" && !merchant.isIncluded || vm.merchantFilterOptions.isIncluded === "no" && merchant.isIncluded) {
                    show = false;
                }
                if (vm.merchantFilterOptions.status && vm.merchantFilterOptions.status[merchant.status] === false) {
                    show = false;
                }
                if (vm.merchantFilterOptions.targetDevices && vm.merchantFilterOptions.targetDevices[merchant.targetDevices] === false) {
                    show = false;
                }
                if (vm.merchantFilterOptions.topupType && vm.merchantFilterOptions.topupType[merchant.topupType] === false) {
                    show = false;
                }
                if (vm.merchantFilterOptions.merchantTypeId && vm.merchantFilterOptions.merchantTypeId[merchant.merchantTypeId] === false) {
                    show = false;
                }
                merchant.show$ = show;
            }
        };


        vm.addMerchantGroup = function (data) {
            console.log('vm.newMerchantGroup', vm.newMerchantGroup);
            //vm.selectGameGroupParent
            var sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newMerchantGroup.name,
                code: vm.newMerchantGroup.code,
                displayName: vm.newMerchantGroup.displayName
            }
            socketService.$socket($scope.AppSocket, 'addPlatformMerchantGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadMerchantGroupData();
                $scope.safeApply();
            })
        }
        vm.removeMerchantGroup = function (node) {
            console.log('to del node', node);
            socketService.$socket($scope.AppSocket, 'deleteMerchantGroup', {_id: node._id}, function (data) {
                console.log(data.data);
                vm.loadMerchantGroupData();
                $scope.safeApply();
            })
        }
        vm.initRenameMerchantGroup = function () {
            vm.newMerchantGroup = {};
            vm.newMerchantGroup.name = vm.SelectedMerchantGroupNode.name;
            vm.newMerchantGroup.displayName = vm.SelectedMerchantGroupNode.displayName;
            vm.newMerchantGroup.code = vm.SelectedMerchantGroupNode.code;
        }

        vm.renameMerchantGroup = function () {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    name: vm.SelectedMerchantGroupNode.groupId
                },
                update: {
                    name: vm.newMerchantGroup.name,
                    displayName: vm.newMerchantGroup.displayName,
                    code: vm.newMerchantGroup.code
                }
            }
            socketService.$socket($scope.AppSocket, 'renamePlatformMerchantGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadMerchantGroupData();
                $scope.safeApply();
            })
        }

        vm.submitDefaultMerchantGroup = function () {
            console.log('vm.defaultMerchantGroup', vm.defaultMerchantGroup);
            var sendData = {
                platform: vm.selectedPlatform.id,
                default: vm.defaultMerchantGroup
            }
            socketService.$socket($scope.AppSocket, 'setPlatformDefaultMerchantGroup', sendData, function (data) {
                vm.loadMerchantGroupData();
            })
        }

        vm.merchantClicked = function (i, v, which) {
            console.log('merchant clicked', i, v, which);
            vm.highlightMerchant = {};
            vm.highlightMerchant[v.name] = 'bg-pale'
            vm.curMerchant = v;
        }

        vm.addmerchantToGroup = function (type) {
            let merchantName = [];
            for (let i = 0; i < vm.allMerchantList.length; i++) {
                let merchant = vm.allMerchantList[i];
                if (merchant.selected && !merchant.isIncluded) {
                    merchantName.push(merchant.name)
                }
            }

            if (!merchantName.length) {
                socketService.showErrorMessage($translate("There is no merchant group to be added"));
                return;
            }

            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedMerchantGroupNode._id
                }
            }

            sendData.update = {
                "$push": {
                    merchants: {$each: merchantName}
                }
            }


            console.log(sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformMerchantGroup', sendData, success);
            function success(data) {
                vm.curMerchant = null;
                console.log(data);
                vm.merchantGroupClicked(0, vm.SelectedMerchantGroupNode);
                $scope.safeApply();
            }
        }

        vm.removeMerchantFromGroup = function (type) {
            let merchantName = [];
            for (let i = 0; i < vm.allMerchantList.length; i++) {
                let merchant = vm.allMerchantList[i];
                if (merchant.selected && merchant.isIncluded) {
                    merchantName.push(merchant.name)
                }
            }

            if (!merchantName.length) {
                socketService.showErrorMessage($translate("There is no merchant group to be remove"));
                return;
            }

            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedMerchantGroupNode._id
                }
            }

            sendData.update = {
                "$pull": {
                    merchants: {$in: merchantName}
                }
            }


            console.log(sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformMerchantGroup', sendData, success);
            function success(data) {
                vm.curMerchant = null;
                console.log(data);
                vm.merchantGroupClicked(0, vm.SelectedMerchantGroupNode);
                $scope.safeApply();
            }
        }

        vm.submitAddPlayersToMerchantGroup = function () {
            var playerArr = [], data = vm.attachPlayerTable.rows('.selected').data();

            data.each(a => {
                playerArr.push(a._id);
            })
            var sendData = {
                bankMerchantGroupObjId: vm.SelectedMerchantGroupNode._id,
                playerObjIds: playerArr
            }
            socketService.$socket($scope.AppSocket, 'addPlayersToMerchantGroup', sendData, function (data) {
                // vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        }

        vm.submitAddAllPlayersToMerchantGroup = function () {
            let sendData = {
                bankMerchantGroupObjId: vm.SelectedMerchantGroupNode._id,
                platformObjId: vm.selectedPlatform.id
            };
            socketService.$socket($scope.AppSocket, 'addAllPlayersToMerchantGroup', sendData, function (data) {
                if (data.data) {
                    if (data.data.merchantGroup == vm.SelectedMerchantGroupNode._id && data.data.platform == vm.selectedPlatform.id) {
                        vm.addAllPlayerToMerchantResult = 'found ' + data.data.n + ' modified ' + data.data.nModified;
                    } else {
                        vm.addAllPlayerToMerchantResult = JSON.stringify(data.data.error);
                    }
                    $scope.safeApply();
                }
            });
        }

        /////////////////////////////////////// Merchant Group end  /////////////////////////////////////////////////

        /////////////////////////////////////// Alipay Group start  /////////////////////////////////////////////////

        vm.alipayGroupTabClicked = function () {

        }
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
                console.log('Alipaygroup', data);
                //provider list init
                vm.platformAlipayGroupList = data.data;
                vm.platformAlipayGroupListCheck = {};
                $.each(vm.platformAlipayGroupList, function (i, v) {
                    vm.platformAlipayGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })

            // socketService.$socket($scope.AppSocket, 'getExcludedAlipayByAlipayGroup', {platform: vm.selectedPlatform.data.platformId}, function(data){
            //     console.log('AlipayList', data);
            //     //provider list init
            //     vm.allAlipayList = data.data.data;
            //     $.each(vm.allAlipayList, function (i, v) {
            //         vm.allAlipayList[v._id] = true;
            //     })
            //     $scope.safeApply();
            // });
        }

        vm.AlipayAccChanged = function(){
            vm.filterAlipayName = vm.filterAlipayAccount;
        }

        vm.AlipayNameChanged = function(){
            vm.filterAlipayAccount = vm.filterAlipayName;
        }

        vm.addAlipayGroup = function (data) {
            console.log('vm.newAlipayGroup', vm.newAlipayGroup);
            //vm.selectGameGroupParent
            var sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newAlipayGroup.name,
                code: vm.newAlipayGroup.code,
                displayName: vm.newAlipayGroup.displayName
            }
            socketService.$socket($scope.AppSocket, 'addPlatformAlipayGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadAlipayGroupData();
                $scope.safeApply();
            })
        }
        vm.alipayGroupClicked = function (i, alipayGroup) {
            vm.SelectedAlipayGroupNode = alipayGroup;
            vm.includedAlipays = null;
            vm.excludedAlipays = null;
            vm.allAlipayList = null;
            console.log('alipayGroup clicked', alipayGroup);
            var query = {
                platform: vm.selectedPlatform.data.platformId,
                alipayGroup: alipayGroup._id
            }
            vm.alipayStatusFilterOptions = {"NORMAL": true, "CLOSE": true, "LOCK": true};
            socketService.$socket($scope.AppSocket, 'getAllAlipaysByAlipayGroupWithIsInGroup', query, function(data){

                //provider list init
                vm.allAlipayList = data.data;
                console.log('vm.allAlipayList', vm.allAlipayList);
                $scope.safeApply();
            });

            // socketService.$socket($scope.AppSocket, 'getIncludedAlipayByAlipayGroup', query, function(data){
            //     console.log('AlipayList', data);
            //     //provider list init
            //     vm.allAlipayList = data.data;
            //     $.each(vm.allAlipayList, function (i, v) {
            //         vm.allAlipayList[v._id] = true;
            //     })
            //     $scope.safeApply();
            // });
            //
            // socketService.$socket($scope.AppSocket, 'getIncludedAlipayByAlipayGroup', query, function (data2) {
            //     console.log("attached alipays", data2);
            //     if (data2 && data2.data) {
            //         vm.includedAlipays = [];
            //         $.each(data2.data, function (i, v) {
            //             if (vm.filterAlipayAccount && (vm.filterAlipayAccount != 'all' && vm.filterAlipayAccount != '') && (!vm.filterAlipayAccount.find(aa => aa.accountNumber == v.accountNumber))) {
            //
            //             } else if (vm.filterAlipayName && (vm.filterAlipayName != 'all' && vm.filterAlipayName != '') && (!vm.filterAlipayName.find(an => an.name == v.name))) {
            //
            //             } else {
            //                 vm.includedAlipays.push(v);
            //             }
            //
            //         });
            //
            //     } else {
            //         vm.includedAlipays = [];
            //     }
            //     $scope.safeApply();
            // })
            //
            // socketService.$socket($scope.AppSocket, 'getExcludedAlipayByAlipayGroup', query, function (data2) {
            //     console.log("not attached alipays", data2);
            //     if (data2 && data2.data) {
            //         vm.excludedAlipays = data2.data;
            //     } else {
            //         vm.excludedAlipays = [];
            //     }
            //     $scope.safeApply();
            // })
        }

        // vm.alipayFilter = function(i, alipayGroup){
        //     vm.SelectedAlipayGroupNode = alipayGroup;
        //     vm.includedAlipays = null;
        //     vm.excludedAlipays = null;
        //     console.log('alipayFilter clicked', alipayGroup);
        //     var query = {
        //         platform: vm.selectedPlatform.data.platformId,
        //         alipayGroup: alipayGroup._id
        //     }
        //
        //     socketService.$socket($scope.AppSocket, 'getIncludedAlipayByAlipayGroup', query, function (data2) {
        //         console.log("attached alipays", data2);
        //         if (data2 && data2.data) {
        //             vm.includedAlipays = [];
        //             $.each(data2.data, function (i, v) {
        //                 if (vm.filterAlipayAccount && (vm.filterAlipayAccount != 'all' && vm.filterAlipayAccount != '') && (!vm.filterAlipayAccount.find(aa => aa.accountNumber == v.accountNumber))) {
        //
        //                 } else if (vm.filterAlipayName && (vm.filterAlipayName != 'all' && vm.filterAlipayName != '') && (!vm.filterAlipayName.find(an => an.name == v.name))) {
        //
        //                 } else {
        //                     vm.includedAlipays.push(v);
        //                 }
        //
        //             });
        //
        //         } else {
        //             vm.includedAlipays = [];
        //         }
        //         $scope.safeApply();
        //     })
        //
        //     socketService.$socket($scope.AppSocket, 'getExcludedAlipayByAlipayGroup', query, function (data2) {
        //         console.log("not attached alipays", data2);
        //         if (data2 && data2.data) {
        //             vm.excludedAlipays = data2.data;
        //         } else {
        //             vm.excludedAlipays = [];
        //         }
        //         $scope.safeApply();
        //     })
        // }

        vm.removeAlipayGroup = function (node) {
            console.log('to del node', node);
            socketService.$socket($scope.AppSocket, 'deleteAlipayGroup', {_id: node._id}, function (data) {
                console.log(data.data);
                vm.loadAlipayGroupData();
                $scope.safeApply();
            })
        }
        vm.initRenameAlipayGroup = function () {
            vm.newAlipayGroup = {};
            vm.newAlipayGroup.name = vm.SelectedAlipayGroupNode.name;
            vm.newAlipayGroup.displayName = vm.SelectedAlipayGroupNode.displayName;
            vm.newAlipayGroup.code = vm.SelectedAlipayGroupNode.code;
        }

        vm.renameAlipayGroup = function () {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    name: vm.SelectedAlipayGroupNode.groupId
                },
                update: {
                    name: vm.newAlipayGroup.name,
                    displayName: vm.newAlipayGroup.displayName,
                    code: vm.newAlipayGroup.code
                }
            }
            socketService.$socket($scope.AppSocket, 'renamePlatformAlipayGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadAlipayGroupData();
                $scope.safeApply();
            })
        }

        vm.submitDefaultAlipayGroup = function () {
            console.log('vm.defaultAlipayGroup', vm.defaultAlipayGroup);
            var sendData = {
                platform: vm.selectedPlatform.id,
                default: vm.defaultAlipayGroup
            }
            socketService.$socket($scope.AppSocket, 'setPlatformDefaultAlipayGroup', sendData, function (data) {
                vm.loadAlipayGroupData();
            })
        }

        vm.alipayClicked = function (i, v, which) {
            console.log('Alipay clicked', i, v, which);
            vm.highlightAlipay = {};
            vm.highlightAlipay[v.AlipayNo] = 'bg-pale'
            vm.curAlipay = v;
        }

        vm.alipayListUncheckDifferentGroup = (val, isInGroup) => {
            if(!val) return; // if uncheck checkbox then do nothing
            vm.allAlipayList = vm.allAlipayList.map(alipay => {
                alipay.isCheck = alipay.isInGroup == isInGroup ? alipay.isCheck : false;
                return alipay;
            })
        };

        vm.filterAlipay = (alipay) => {
            let isValid = true;
            isValid = vm.filterAlipayAccount ? alipay.accountNumber.indexOf(vm.filterAlipayAccount) !== -1 : isValid;
            isValid = vm.filterAlipayName ? alipay.name.indexOf(vm.filterAlipayName) !== -1 && isValid : isValid;
            isValid = vm.alipayStatusFilterOptions ? vm.alipayStatusFilterOptions[alipay.state] && isValid : isValid;
            isValid = vm.filterAlipayInGroup != "all" ? alipay.isInGroup.toString() == vm.filterAlipayInGroup && isValid : isValid;

            return isValid;
        };

        vm.alipaytoAlipayGroup = function (type) {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedAlipayGroupNode._id
                }
            }
            let checkedAlipayList = vm.allAlipayList.filter(alipay => alipay.isCheck);
            if (!checkedAlipayList || checkedAlipayList.length <= 0 || !checkedAlipayList[0] ||
                (checkedAlipayList[0].isInGroup && type === 'attach') ||
                (!checkedAlipayList[0].isInGroup && type === 'detach')
            ) {
                // situation that do nothing:
                //      no select any alipay,
                //      selecting inGroup alipay click add, selecting noInGroup alipay click remove
                return;
            }
            let updateAlipayGroupAccNumber =checkedAlipayList.map(alipay => alipay.accountNumber);
            if (type === 'attach') {
                sendData.update = {
                    "$push": {
                        alipays:  { "$each": updateAlipayGroupAccNumber }
                    }
                }
            } else if (type === 'detach') {
                sendData.update = {
                    "$pull": {
                        alipays: { "$in": updateAlipayGroupAccNumber }
                    }
                }
            }

            console.log(sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformAlipayGroup', sendData, success);
            function success(data) {
                vm.curAlipay = null;
                console.log(data);
                vm.allAlipayList = vm.allAlipayList.map(alipay => {
                    if (alipay.isCheck) {
                        alipay.isCheck = false;
                        alipay.isInGroup =!alipay.isInGroup;
                    }
                    return alipay;
                });
                //vm.alipayGroupClicked(0, vm.SelectedAlipayGroupNode);
                $scope.safeApply();
            }
        }
        vm.submitAddPlayersToAlipayGroup = function () {
            var playerArr = [], data = vm.attachPlayerTable.rows('.selected').data();

            data.each(a => {
                playerArr.push(a._id);
            })
            var sendData = {
                bankAlipayGroupObjId: vm.SelectedAlipayGroupNode._id,
                playerObjIds: playerArr
            }
            socketService.$socket($scope.AppSocket, 'addPlayersToAlipayGroup', sendData, function (data) {
                // vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        }
        vm.submitAddAllPlayersToAlipayGroup = function () {
            let sendData = {
                bankAlipayGroupObjId: vm.SelectedAlipayGroupNode._id,
                platformObjId: vm.selectedPlatform.id
            };
            socketService.$socket($scope.AppSocket, 'addAllPlayersToAlipayGroup', sendData, function (data) {
                if (data.data) {
                    if (data.data.alipayGroup == vm.SelectedAlipayGroupNode._id && data.data.platform == vm.selectedPlatform.id) {
                        vm.addAllPlayerToAlipayResult = 'found ' + data.data.n + ' modified ' + data.data.nModified;
                    } else {
                        vm.addAllPlayerToAlipayResult = JSON.stringify(data.data.error);
                    }
                    $scope.safeApply();
                }
            });
        }

        /////////////////////////////////////// Alipay Group end  /////////////////////////////////////////////////

        /////////////////////////////////////// QuickPay Group start  /////////////////////////////////////////////////
        vm.QuickPayGroupTabClicked = function () {

        }

        vm.loadQuickPayGroupData = function () {
            //init gametab start===============================
            vm.showQuickPayCate = "include";
            vm.curGame = null;
            //init gameTab end==================================
            if (!vm.selectedPlatform) {
                return
            }
            console.log("getQuickPays", vm.selectedPlatform.id);
            socketService.$socket($scope.AppSocket, 'getPlatformQuickPayGroup', {platform: vm.selectedPlatform.id}, function (data) {
                console.log('QuickPaygroup', data);
                //provider list init
                vm.platformQuickPayGroupList = data.data;
                vm.platformQuickPayGroupListCheck = {};
                $.each(vm.platformQuickPayGroupList, function (i, v) {
                    vm.platformQuickPayGroupListCheck[v._id] = true;
                })
                $scope.safeApply();
            })
        }

        vm.addQuickPayGroup = function (data) {
            console.log('vm.newQuickPayGroup', vm.newQuickPayGroup);
            //vm.selectGameGroupParent
            var sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newQuickPayGroup.name,
                code: vm.newQuickPayGroup.code,
                displayName: vm.newQuickPayGroup.displayName
            }
            socketService.$socket($scope.AppSocket, 'addPlatformQuickPayGroup', sendData, function (data) {
                console.log("addPlatformQuickPayGroup", data.data);
                vm.loadQuickPayGroupData();
                $scope.safeApply();
            })
        }

        vm.QuickPayGroupClicked = function (i, QuickPayGroup) {
            vm.SelectedQuickPayGroupNode = QuickPayGroup;
            vm.includedQuickPays = null;
            vm.excludedQuickPays = null;
            console.log('QuickPayGroup clicked', QuickPayGroup);
            var query = {
                platform: vm.selectedPlatform.data.platformId,
                quickPayGroup: QuickPayGroup._id
            }
            socketService.$socket($scope.AppSocket, 'getIncludedQuickPaysByQuickPayGroup', query, function (data2) {
                console.log("attached QuickPays", data2);
                if (data2 && data2.data) {
                    vm.includedQuickPays = [];
                    $.each(data2.data, function (i, v) {
                        if (vm.filterQuickPayTitle && v.name.indexOf(vm.filterQuickPayTitle) == -1) {

                        } else if (vm.filterQuickPayAcc && v.accountNumber.indexOf(vm.filterQuickPayAcc) == -1) {

                        } else {
                            vm.includedQuickPays.push(v);
                        }
                    });

                } else {
                    vm.includedQuickPays = [];
                }
                $scope.safeApply();
            })

            socketService.$socket($scope.AppSocket, 'getExcludedQuickPaysByQuickPayGroup', query, function (data2) {
                console.log("not attached QuickPays", data2);
                if (data2 && data2.data) {
                    vm.excludedQuickPays = data2.data;
                } else {
                    vm.excludedQuickPays = [];
                }
                $scope.safeApply();
            })
        }

        vm.removeQuickPayGroup = function (node) {
            console.log('to del node', node);
            socketService.$socket($scope.AppSocket, 'deleteQuickPayGroup', {_id: node._id}, function (data) {
                console.log(data.data);
                vm.loadQuickPayGroupData();
                $scope.safeApply();
            })
        }

        vm.initRenameQuickPayGroup = function () {
            vm.newQuickPayGroup = {};
            vm.newQuickPayGroup.name = vm.SelectedQuickPayGroupNode.name;
            vm.newQuickPayGroup.displayName = vm.SelectedQuickPayGroupNode.displayName;
            vm.newQuickPayGroup.code = vm.SelectedQuickPayGroupNode.code;
        }

        vm.renameQuickPayGroup = function () {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    name: vm.SelectedQuickPayGroupNode.groupId
                },
                update: {
                    name: vm.newQuickPayGroup.name,
                    displayName: vm.newQuickPayGroup.displayName,
                    code: vm.newQuickPayGroup.code
                }
            }
            socketService.$socket($scope.AppSocket, 'renamePlatformQuickPayGroup', sendData, function (data) {
                console.log(data.data);
                vm.loadQuickPayGroupData();
                $scope.safeApply();
            })
        }

        vm.submitDefaultQuickPayGroup = function () {
            console.log('vm.defaultQuickPayGroup', vm.defaultQuickPayGroup);
            var sendData = {
                platform: vm.selectedPlatform.id,
                default: vm.defaultQuickPayGroup
            }
            socketService.$socket($scope.AppSocket, 'setPlatformDefaultQuickPayGroup', sendData, function (data) {
                vm.loadQuickPayGroupData();
            })
        }

        vm.QuickPayClicked = function (i, v, which) {
            console.log('QuickPay clicked', i, v, which);
            vm.highlightQuickPay = {};
            vm.highlightQuickPay[v.QuickPayNo] = 'bg-pale'
            vm.curQuickPay = v;
        }

        vm.QuickPaytoQuickPayGroup = function (type) {
            var sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedQuickPayGroupNode._id
                }
            }
            if (type === 'attach') {
                sendData.update = {
                    "$push": {
                        quickpays: vm.curQuickPay.accountNumber
                    }
                }
            } else if (type === 'detach') {
                sendData.update = {
                    "$pull": {
                        quickpays: vm.curQuickPay.accountNumber
                    }
                }
            }

            console.log(sendData);
            socketService.$socket($scope.AppSocket, 'updatePlatformQuickPayGroup', sendData, success);
            function success(data) {
                vm.curQuickPay = null;
                console.log(data);
                vm.QuickPayGroupClicked(0, vm.SelectedQuickPayGroupNode);
                $scope.safeApply();
            }
        }

        vm.submitAddPlayersToQuickPayGroup = function () {
            var playerArr = [], data = vm.attachPlayerTable.rows('.selected').data();

            data.each(a => {
                playerArr.push(a._id);
            })
            var sendData = {
                bankQuickPayGroupObjId: vm.SelectedQuickPayGroupNode._id,
                playerObjIds: playerArr
            }
            socketService.$socket($scope.AppSocket, 'addPlayersToQuickPayGroup', sendData, function (data) {
                // vm.getPlatformPlayersData();
                $scope.safeApply();
            });
        }

        vm.submitAddAllPlayersToQuickPayGroup = function () {
            let sendData = {
                bankQuickPayGroupObjId: vm.SelectedQuickPayGroupNode._id,
                platformObjId: vm.selectedPlatform.id
            };
            socketService.$socket($scope.AppSocket, 'addAllPlayersToQuickPayGroup', sendData, function (data) {
                if (data.data) {
                    console.log("submitAddAllPlayersToQuickPayGroup", data.data);
                    if (data.data.quickPayGroup == vm.SelectedQuickPayGroupNode._id && data.data.platform == vm.selectedPlatform.id) {
                        vm.addAllPlayerToQuickPayResult = 'found ' + data.data.n + ' modified ' + data.data.nModified;
                    } else {
                        vm.addAllPlayerToQuickPayResult = JSON.stringify(data.data.error);
                    }
                    $scope.safeApply();
                }
            });
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
                    vm.platformWechatPayGroupListCheck[v._id] = true;
                });
                $scope.safeApply();
            })
        };

        vm.WechatPayAccChanged = function(){
            vm.filterWechatPayName = vm.filterWechatPayAcc;
        };

        vm.WechatPayNameChanged = function(){
            vm.filterWechatPayAcc = vm.filterWechatPayName;
        };

        vm.addWechatPayGroup = function (data) {
            let sendData = {
                platform: vm.selectedPlatform.id,
                name: vm.newWechatPayGroup.name,
                code: vm.newWechatPayGroup.code,
                displayName: vm.newWechatPayGroup.displayName
            };

            console.log('Add WechatPay Group sendData', sendData);
            socketService.$socket($scope.AppSocket, 'addPlatformWechatPayGroup', sendData, function (data) {
                    console.log('Add WechatPay Group', data);
                    vm.loadWechatPayGroupData();
                    $scope.safeApply();
                },
                error => {
                    console.log('Add WechatPay Group error', error);
                })
        };

        vm.wechatPayGroupClicked = function (i, wechatPayGroup) {
            vm.SelectedWechatPayGroupNode = wechatPayGroup;
            vm.includedWechatPays = null;
            vm.excludedWechatPays = null;
            vm.allWechatList = null;
            let query = {
                platform: vm.selectedPlatform.data.platformId,
                wechatGroup: wechatPayGroup._id
            };
            vm.wechatStatusFilterOptions = {"NORMAL": true, "DISABLED": true, "LOCK": true};
            socketService.$socket($scope.AppSocket, 'getAllWechatpaysByWechatpayGroupWithIsInGroup', query, function(data){

                //provider list init
                vm.allWechatList = data.data;
                // loop get alipay status for future add extra status, no need change code
                vm.allWechatList.forEach(wechat => {
                    if (!vm.wechatStatusFilterOptions.hasOwnProperty(wechat.state)) {
                        vm.wechatStatusFilterOptions[wechat.state] = true;
                    }
                });
                console.log('vm.allWechatList', vm.allWechatList);
                $scope.safeApply();
            });

            // socketService.$socket($scope.AppSocket, 'getIncludedWechatsByWechatPayGroup', query, function(data){
            //     console.log('WechatList', data);
            //     //provider list init
            //     vm.allWechatList = data.data;
            //     $.each(vm.allWechatList, function (i, v) {
            //         vm.allWechatList[v._id] = true;
            //     })
            //     $scope.safeApply();
            // });
            //
            // $scope.$socketPromise('getIncludedWechatsByWechatPayGroup', query).then(function (data2) {
            //     console.log('attached included wechat',data2);
            //     if (data2 && data2.data) {
            //         vm.includedWechatPays = [];
            //         $.each(data2.data, function (i, v) {
            //             if (vm.filterWechatPayAcc && (vm.filterWechatPayAcc != 'all' && vm.filterWechatPayAcc != '') && (!vm.filterWechatPayAcc.find(wpa => wpa.accountNumber == v.accountNumber))) {
            //
            //             } else if (vm.filterWechatPayName && (vm.filterWechatPayName != 'all' && vm.filterWechatPayName != '') && (!vm.filterWechatPayName.find(wpn => wpn.name == v.name))) {
            //
            //             } else {
            //                 vm.includedWechatPays.push(v);
            //             }
            //         });
            //
            //     } else {
            //         vm.includedWechatPays = [];
            //     }
            //     $scope.safeApply();
            // });
            //
            // socketService.$socket($scope.AppSocket, 'getExcludedWechatsByWechatPayGroup', query, function (data2) {
            //     if (data2 && data2.data) {
            //         vm.excludedWechatPays = data2.data;
            //     } else {
            //         vm.excludedWechatPays = [];
            //     }
            //     $scope.safeApply();
            // })
        };

        vm.filterWechat = (wechat) => {
            let isValid = true;
            isValid = vm.filterWechatAccount ? wechat.accountNumber.indexOf(vm.filterWechatAccount) !== -1 : isValid;
            isValid = vm.filterWechatName ? wechat.name.indexOf(vm.filterWechatName) !== -1 && isValid : isValid;
            isValid = vm.filterWechatNickname ? wechat.nickName.indexOf(vm.filterWechatNickname) !== -1 && isValid : isValid;
            isValid = vm.wechatStatusFilterOptions ? vm.wechatStatusFilterOptions[wechat.state] && isValid : isValid;
            isValid = vm.filterWechatInGroup != "all" ? wechat.isInGroup.toString() == vm.filterWechatInGroup && isValid : isValid;
            return isValid;
        };

        vm.wechatListUncheckDifferentGroup = (val, isInGroup) => {
            if(!val) return; // if uncheck checkbox then do nothing
            vm.allWechatList = vm.allWechatList.map(wechat => {
                wechat.isCheck = wechat.isInGroup == isInGroup ? wechat.isCheck : false;
                return wechat;
            })
        };

        vm.wechatPayFilter = function(i, wechatPayGroup){
            vm.SelectedWechatPayGroupNode = wechatPayGroup;
            vm.includedWechatPays = null;
            vm.excludedWechatPays = null;

            let query = {
                platform: vm.selectedPlatform.data.platformId,
                alipayGroup: wechatPayGroup._id
            };

            $scope.$socketPromise('getIncludedWechatsByWechatPayGroup', query).then(function (data2) {
                console.log('attached included wechat',data2);
                if (data2 && data2.data) {
                    vm.includedWechatPays = [];
                    $.each(data2.data, function (i, v) {
                        if (vm.filterWechatPayAcc && (vm.filterWechatPayAcc != 'all' && vm.filterWechatPayAcc != '') && (!vm.filterWechatPayAcc.find(wpa => wpa.accountNumber == v.accountNumber))) {

                        } else if (vm.filterWechatPayName && (vm.filterWechatPayName != 'all' && vm.filterWechatPayName != '') && (!vm.filterWechatPayName.find(wpn => wpn.nickName == v.nickName))) {

                        } else {
                            vm.includedWechatPays.push(v);
                        }
                    });

                } else {
                    vm.includedWechatPays = [];
                }
                $scope.safeApply();
            });

            socketService.$socket($scope.AppSocket, 'getExcludedWechatsByWechatPayGroup', query, function (data2) {
                if (data2 && data2.data) {
                    vm.excludedWechatPays = data2.data;
                } else {
                    vm.excludedWechatPays = [];
                }
                $scope.safeApply();
            })
        };

        vm.removeWechatPayGroup = function (node) {
            socketService.$socket($scope.AppSocket, 'deleteWechatPayGroup', {_id: node._id}, function (data) {
                vm.loadWechatPayGroupData();
                $scope.safeApply();
            })
        };

        vm.initRenameWechatPayGroup = function () {
            vm.newWechatPayGroup = {};
            vm.newWechatPayGroup.name = vm.SelectedWechatPayGroupNode.name;
            vm.newWechatPayGroup.displayName = vm.SelectedWechatPayGroupNode.displayName;
            vm.newWechatPayGroup.code = vm.SelectedWechatPayGroupNode.code;
        };

        vm.renameWechatPayGroup = function () {
            let sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    name: vm.SelectedWechatPayGroupNode.groupId
                },
                update: {
                    name: vm.newWechatPayGroup.name,
                    displayName: vm.newWechatPayGroup.displayName,
                    code: vm.newWechatPayGroup.code
                }
            };

            socketService.$socket($scope.AppSocket, 'renamePlatformWechatPayGroup', sendData, function (data) {
                vm.loadWechatPayGroupData();
                $scope.safeApply();
            })
        };

        vm.submitDefaultWechatPayGroup = function () {
            let sendData = {
                platform: vm.selectedPlatform.id,
                default: vm.defaultWechatPayGroup
            };

            socketService.$socket($scope.AppSocket, 'setPlatformDefaultWechatPayGroup', sendData, () => {
                vm.loadWechatPayGroupData();
            });
        };

        vm.wechatPayClicked = function (i, v, which) {
            vm.highlightWechatPay = {};
            vm.highlightWechatPay[v.WechatPayNo] = 'bg-pale';
            vm.curWechatPay = v;
        };

        vm.wechatPaytoWechatPayGroup = function (type) {
            let sendData = {
                query: {
                    platform: vm.selectedPlatform.id,
                    _id: vm.SelectedWechatPayGroupNode._id
                }
            };

            let checkedWechatList = vm.allWechatList.filter(wechat => wechat.isCheck);
            if (!checkedWechatList || checkedWechatList.length <= 0 || !checkedWechatList[0] ||
                (checkedWechatList[0].isInGroup && type === 'attach') ||
                (!checkedWechatList[0].isInGroup && type === 'detach')
            ) {
                // situation that do nothing:
                //      no select any wechat,
                //      selecting inGroup wechat click add, selecting noInGroup wechat click remove
                return;
            }
            let updateWechatGroupAccNumber =checkedWechatList.map(wechat => wechat.accountNumber);

            if (type === 'attach') {
                sendData.update = {
                    "$push": {
                        wechats: { "$each": updateWechatGroupAccNumber }
                    }
                }
            } else if (type === 'detach') {
                sendData.update = {
                    "$pull": {
                        wechats: { "$in": updateWechatGroupAccNumber }
                    }
                }
            }

            socketService.$socket($scope.AppSocket, 'updatePlatformWechatPayGroup', sendData, success);
            function success(data) {
                vm.curWechatPay = null;
                vm.allWechatList = vm.allWechatList.map(wechat => {
                    if (wechat.isCheck) {
                        wechat.isCheck = false;
                        wechat.isInGroup =!wechat.isInGroup;
                    }
                    return wechat;
                });
                //vm.wechatPayGroupClicked(0, vm.SelectedWechatPayGroupNode);
                $scope.safeApply();
            }
        };

        vm.submitAddPlayersToWechatPayGroup = function () {
            let playerArr = [], data = vm.attachPlayerTable.rows('.selected').data();

            data.each(a => {
                playerArr.push(a._id);
            });

            let sendData = {
                weChatGroupObjId: vm.SelectedWechatPayGroupNode._id,
                playerObjIds: playerArr
            };

            socketService.$socket($scope.AppSocket, 'addPlayersToWechatPayGroup', sendData, function (data) {
                $scope.safeApply();
            });
        };
        vm.submitAddAllPlayersToWechatPayGroup = function () {
            let sendData = {
                weChatGroupObjId: vm.SelectedWechatPayGroupNode._id,
                platformObjId: vm.selectedPlatform.id
            };
            socketService.$socket($scope.AppSocket, 'addAllPlayersToWechatPayGroup', sendData, function (data) {
                if (data.data) {
                    if (data.data.wechatPayGroup == vm.SelectedWechatPayGroupNode._id && data.data.platform == vm.selectedPlatform.id) {
                        vm.addAllPlayerToWechatResult = 'found ' + data.data.n + ' modified ' + data.data.nModified;
                    } else {
                        vm.addAllPlayerToWechatResult = JSON.stringify(data.data.error);
                    }
                    $scope.safeApply();
                }
            });
        }
        /////////////////////////////////////// Alipay Group end  /////////////////////////////////////////////////

        ///////////////////////////////// common functions
        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
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
        //////////////////////////initial socket actions//////////////////////////////////
        // vm.getPlayerStatusList = function () {
        //     return $scope.$socketPromise('getPlayerStatusList')
        //         .then(function (data) {
        //             vm.allPlayersStatusString = data.data;
        //             var allStatus = data.data;
        //             var keys = [];
        //             for (var key in allStatus) {
        //                 if (allStatus.hasOwnProperty(key)) { //to be safe
        //                     keys.push(key);
        //                 }
        //             }
        //             vm.allPlayersStatusKeys = keys;
        //         });
        //
        // };
        ////////////////Mark::$viewContentLoaded function//////////////////
        //##Mark content loaded function
        // $scope.$on('$viewContentLoaded', function () {
        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {

            setTimeout(
                function () {
                    vm.queryPara = {};

                    vm.showPlatformList = true;
                    vm.allGameStatusString = {};
                    vm.paymentPageName = 'Player';

                    //load all initial data
                    //vm.getAllGameTypes(), vm.getAllRewardTypes(), vm.getAllRewardRule(), vm.getAllGameStatus(),
                    //vm.getPlayerStatusList(), vm.getAllProposalExecutionType(), vm.getAllProposalRejectionType(),
                    //    vm.getPlayerLvlPeriod(), vm.getAllMessageTypes(), vm.getAllDepositMethods()
                    Q.all([]).then(
                        function (data) {
                            // This init data will be a list of undefineds.
                            // The above promises don't actually produce data, they just promise to set their vm variables!
                            //console.info("init data", data);

                            vm.loadPlatformData();
                            // vm.getPlayerStatusList();

                            window.document.title = $translate("payment") + "->" + $translate(vm.paymentPageName);
                            var showLeft = $cookies.get("paymentShowLeft");
                            if (showLeft === 'false') {
                                vm.toggleShowPlatformList(false)
                            }
                        },
                        function (error) {
                            console.warn("init error", error);
                        }
                    ).done();

                    // socketService.$socket($scope.AppSocket, 'getAllTopUpType', {}, function (data) {
                    //     vm.topUpTypeList = {};
                    //     if (data.data) {
                    //         $.each(data.data, function (i, v) {
                    //             vm.topUpTypeList[v] = 'TOPUP' + i;
                    //         })
                    //     }
                    //     console.log("getAllTopUpType", vm.topUpTypeList);
                    //     $scope.safeApply();
                    // }, function (err) {
                    //     console.log("cannot get topup type", err);
                    // });

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
                            "emptyTable": "",
                            "paginate": {
                                "previous": $translate("PREVIOUS_PAGE"),
                                "next": $translate("NEXT_PAGE"),
                            },
                            "lengthMenu": $translate("lengthMenuText"),
                            sZeroRecords: ""
                        }
                    }
                }
            );

            //TODO::TEST CODE
        });
    };

    paymentController.$inject = injectParams;

    myApp.register.controller('paymentCtrl', paymentController);

});
