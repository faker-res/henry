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


            vm.searchLive800 = function(){
                socketService.$socket($scope.AppSocket, 'searchLive800', {}, success);

                function success(data) {
                    console.log(data);
                    $scope.safeApply();
                }
            }
            vm.showLive800 = function(){


                vm.qaForm = [
                    {
                        messageId: 331,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                            {
                                'roles': 'Guest',
                                'create_time': '2018-1-15 16:33:51',
                            },
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                        ]
                    },
                    {
                        messageId: 332,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                            {
                                'roles': 'Guest',
                                'create_time': '2018-1-15 16:33:51',
                            },
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                        ]
                    },
                    {
                        messageId: 333,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [{
                            'time': '2018-1-15 16:33:51',
                            'roles': '客服',
                            'create_time': '2018-1-15 16:33:51',
                            'timeout_rate': -2,
                            'inspection_rate': 0,
                            'review': '答非所问'
                        }]
                    },
                    {
                        messageId: 334,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [{
                            'date': '2018-1-15 16:33:51', 'rate': 5, conversation: [{
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            }]
                        }
                        ]
                    }]


                vm.conversationForm = [
                    {
                        messageId: 331,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                            {
                                'roles': 'Guest',
                                'create_time': '2018-1-15 16:33:51',
                            },
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                        ]
                    },
                    {
                        messageId: 332,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                            {
                                'roles': 'Guest',
                                'create_time': '2018-1-15 16:33:51',
                            },
                            {
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            },
                        ]
                    },
                    {
                        messageId: 333,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [{
                            'time': '2018-1-15 16:33:51',
                            'roles': '客服',
                            'create_time': '2018-1-15 16:33:51',
                            'timeout_rate': -2,
                            'inspection_rate': 0,
                            'review': '答非所问'
                        }]
                    },
                    {
                        messageId: 334,
                        status: '已完成（已读）',
                        qualityAssessor: 'QC-ALLEN',
                        fpmsAcc: 'ishtar',
                        process_time: '2018-1-15 19:33:51',
                        created_time: '2018-1-15 16:33:51',
                        appeal_reason: '当时因为客服精神病发作，所以语无伦次，盼重清量刑',
                        conversation: [{
                            'date': '2018-1-15 16:33:51', 'rate': 5, conversation: [{
                                'time': '2018-1-15 16:33:51',
                                'roles': '客服',
                                'create_time': '2018-1-15 16:33:51',
                                'timeout_rate': -2,
                                'inspection_rate': 0,
                                'review': '答非所问'
                            }]
                        }
                        ]
                    }]

                // console.log('showlive800')
                // socketService.$socket($scope.AppSocket, 'showLive800', {}, success);
                //
                // function success(data) {
                //     console.log(data);
                //     $scope.safeApply();
                // }
            }

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
        };
    qualityInspectionController.$inject = injectParams;
        myApp.register.controller('qualityInspectionCtrl', qualityInspectionController);
    }
);
