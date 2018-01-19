'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$sce', '$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies", "$timeout", '$http', 'uiGridExporterService', 'uiGridExporterConstants'];

        var qualityInspectionController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {

            var $translate = $filter('translate');
            var vm = this;

            // For debugging:
            window.VM = vm;

            ////////////////Mark::Platform functions//////////////////
            vm.updatePageTile = function () {
                window.document.title = $translate("qualityInspection") + "->" + $translate(vm.qualityInspectionPageName);
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

                // Initial Loading
                vm.evaluationTab = 'unreadEvaluation';
                // Initial setting for setting in qualityInspection
                vm.getOvertimeSetting();
                // create the conversationDefinition object for old platform
                let query ={_id: vm.selectedPlatform.id, conversationDefinition: { $exists: true }};
                socketService.$socket($scope.AppSocket, 'getPlatformSetting', query, function (data) {
                  if (data.data.length === 0){
                      let sendData = {
                                  query: {_id: vm.selectedPlatform.id},
                                  updateData: { 'conversationDefinition.totalSec': 40,
                                                'conversationDefinition.askingSentence': 2,
                                                'conversationDefinition.replyingSentence': 2}
                              };
                              socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                                  vm.loadPlatformData({loadAll: false});
                                  $scope.safeApply();
                              });
                      $scope.safeApply();
                  }

                });

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
                };vm.rightPanelTitle == 'ALL_PROPOSAL'
                return obj;
            };

            vm.toggleShowPlatformDropDownList = function () {
                vm.showPlatformDropDownList = !vm.showPlatformDropDownList;

                $scope.safeApply();
            };

            vm.showPlatformDetailTab = function (tabName) {
                vm.selectedPlatformDetailTab = tabName == null ? "backstage-settings" : tabName;
                if(tabName && tabName == "player-display-data"){
                    vm.initPlayerDisplayDataModal();
                }else if(tabName && tabName == "partner-display-data"){
                    vm.initPartnerDisplayDataModal();
                }else if(tabName && tabName == "system-settlement"){
                    vm.prepareSettlementHistory();
                }
            };

            var eventName = "$viewContentLoaded";
            if (!$scope.AppSocket) {
                eventName = "socketConnected";
                $scope.$emit('childControllerLoaded', 'qualityInspectionControllerLoaded');
            }

            var _ = {
                clone: function (obj) {
                    return $.extend({}, obj);
                }
            };

            vm.configTabClicked = function (choice) {
                vm.selectedConfigTab = choice;
                vm.configTableEdit = false;
                vm.overtimeSettingAdd = false;
                vm.confirmDelete = false;

                switch (choice) {
                    case 'definition':
                        vm.getConversationDefinition();
                        break;
                    case 'setting':
                        vm.newOvertimeSetting = {};
                        vm.getOvertimeSetting();
                        break;
                }
            };

            vm.configSubmitUpdate = function (choice) {
                switch (choice) {
                    case 'definition':
                        updateConversationDefinition(vm.conversationDefinition);
                        break;
                    case 'setting':
                        updateOvertimeSetting(vm.overtimeSetting);
                        break;
                }
            };


            function updateConversationDefinition(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {
                        'conversationDefinition.totalSec': srcData.totalSec,
                        'conversationDefinition.askingSentence': srcData.askingSentence,
                        'conversationDefinition.replyingSentence': srcData.replyingSentence
                    }
                };
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    vm.loadPlatformData({loadAll: false});
                    $scope.safeApply();
                });
            }
            function updateOvertimeSetting(srcData) {
                let sendData = {
                    query: {_id: vm.selectedPlatform.id},
                    updateData: {overtimeSetting: srcData}
                };
                socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                    vm.loadPlatformData({loadAll: false});
                    $scope.safeApply();
                });
            }


            vm.getConversationDefinition = function () {
                vm.conversationDefinition = vm.conversationDefinition || {};

                vm.conversationDefinition.totalSec = vm.selectedPlatform.data.conversationDefinition.totalSec;
                vm.conversationDefinition.askingSentence = vm.selectedPlatform.data.conversationDefinition.askingSentence;
                vm.conversationDefinition.replyingSentence = vm.selectedPlatform.data.conversationDefinition.replyingSentence;

            };

            vm.getOvertimeSetting = function () {
                vm.overtimeSetting  = vm.overtimeSetting || {};
                // initiate a basic setting if the setting is empty
                if (!vm.selectedPlatform.data.overtimeSetting || vm.selectedPlatform.data.overtimeSetting.length === 0){

                    let overtimeSetting=[{
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
                        query: {_id: vm.selectedPlatform.id},
                        updateData: {overtimeSetting: overtimeSetting}
                    };
                    socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                        vm.loadPlatformData({loadAll: false});
                    });

                    vm.overtimeSetting = overtimeSetting;
                }
                else{
                   vm.overtimeSetting = vm.selectedPlatform.data.overtimeSetting;
                }

                vm.overtimeSetting.sort(function(a,b){
                    return a.conversationInterval-b.conversationInterval;
                });

            };

            vm.settingDeleteIndex = function (param){
                // param[0] is the _id; param[1] is the $index
                // just remove from the vm.overtimeSetting if it is not saving into the DB yet by using the $index
                if (param) {
                    if (param[0]) {
                        vm.overtimeSetting.forEach((item, index) => {
                            if (item._id === param[0]) {
                                vm.overtimeSetting.splice(index, 1);
                            }
                        });
                    }else{
                        vm.overtimeSetting.splice(param[1], 1);
                    }
                }
                else {
                    socketService.showErrorMessage($translate("Can't get the to-be-deleted item"));
                }
            }



        };
        qualityInspectionController.$inject = injectParams;
        myApp.register.controller('qualityInspectionCtrl', qualityInspectionController);
    }
);
