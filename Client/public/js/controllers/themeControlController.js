'use strict';

define(['js/app'], function (myApp) {
    let themeControlController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants, commonService) {
        var $translate = $filter('translate');
        var vm = this;

        // For debugging:
        window.VM = vm;

        vm.updatePageTile = function () {
            window.document.title = $translate("themeControl") + "->" + $translate(vm.themeControlPageName);
        };
        vm.toggleShowPlatformList = function (flag) {
            $scope.$evalAsync(() => {
                if (flag) {
                    vm.leftPanelClass = 'widthto25';
                    vm.rightPanelClass = 'widthto75';
                    vm.showPlatformList = true;
                } else {
                    vm.leftPanelClass = 'widthto5 subAll0';
                    vm.rightPanelClass = 'widthto95';
                    vm.showPlatformList = false;
                }
                $cookies.put("themeControlShowLeft", vm.showPlatformList);
            })
        };

        $scope.$on('switchPlatform', () => {
            $scope.$evalAsync(vm.loadPlatformData());
        });

        vm.loadPlatformData = function (option) {
            vm.showPlatformSpin = true;

            socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                console.log('all platform data', data.data);
                vm.showPlatformSpin = false;
                // vm.buildPlatformList(data.data);
                vm.allPlatformData = data.data;

                //select platform from cookies data
                let storedPlatform = $cookies.get("platform");
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
                selectPlatformNode(data);
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
        async function selectPlatformNode (platformObj, option) {
            vm.selectedPlatform = {
                text: platformObj.name,
                id: platformObj._id,
                selectable: true,
                data: platformObj,
                image: {
                    url: platformObj.icon,
                    width: 30,
                    height: 30,
                }
            };

            vm.curPlatformText = vm.selectedPlatform.text;
            $cookies.put("platform", vm.selectedPlatform.text);
            if (option && !option.loadAll) {
                $scope.safeApply();
                return;
            }
            vm.getPlatformProviderGroup();

            // Zero dependencies variable
            [vm.allThemeSetting, [vm.queryDepartments, vm.queryRoles, vm.queryAdmins]] = await Promise.all([
                commonService.getAllThemeSetting($scope, vm.selectedPlatform.id).catch(err => Promise.resolve([])),
                commonService.getAllDepartmentInfo($scope, vm.selectedPlatform.id, vm.selectedPlatform.data.name).catch(err => Promise.resolve([[], [], []])),
            ]);

            vm.initThemeSetting();
        };

        //search and select platform node
        vm.searchAndSelectPlatform = function (text, option) {
            let findNodes = vm.allPlatformData.filter(e => e.name === text);
            if (findNodes && findNodes.length > 0) {
                selectPlatformNode(findNodes[0], option);
            } else {
                selectPlatformNode(vm.allPlatformData[0], option);
            }
        };

        var eventName = "$viewContentLoaded";
        if (!$scope.AppSocket) {
            eventName = "socketConnected";
            $scope.$emit('childControllerLoaded', 'themeControlControllerLoaded');
        }
        $scope.$on(eventName, function (e, d) {
            vm.loadPlatformData();
            vm.getAllPlayerFeedbackResults();
            vm.getPlayerFeedbackTopic();
        });


        vm.setThemeFooter = function (action) {
            vm.themeAction = action;
        };

        vm.editThemeSetting = function (mode, data, type){

            if (data && mode && type) {

                let sendData;

                if (mode == 'save') {

                    if (data && data.content.length > 0) {
                        data.content.forEach(
                            inData => {
                                if (inData.$$hashKey) {
                                    delete inData.$$hashKey;
                                }
                            }
                        )
                    }

                    console.log("checking", data)

                    sendData = {
                        platform: vm.selectedPlatform.id,
                        themeStyle: data.themeStyle,
                        content: data.content,
                        type: type
                    };

                    return $scope.$socketPromise("saveThemeSetting", sendData).then(data => {
                        if (data && data.data) {
                            $scope.$evalAsync(() => {
                                console.log("saveThemeSetting", data)
                            });
                        }

                    }, err => {
                        console.log("error", err)
                    });


                }
                else if (mode == 'update') {

                    if (data && data.length > 0) {
                        data.forEach(
                            inData => {
                                if (inData.$$hashKey) {
                                    delete inData.$$hashKey;
                                }
                                if (inData.__v) {
                                    delete inData.__v;
                                }
                                if (inData.content && inData.content.length > 0) {
                                    inData.content.forEach(
                                        inContent => {
                                            if (inContent.$$hashKey) {
                                                delete inContent.$$hashKey;
                                            }
                                        }
                                    )
                                }

                            }
                        )
                    }

                    sendData = data;

                    return $scope.$socketPromise("updateThemeSetting", sendData).then(data => {
                        if (data && data.data) {
                            $scope.$evalAsync(() => {
                                console.log("updateThemeSetting", data)
                                vm.reloadThemeSetting();
                            });
                        }

                    }, err => {
                        console.log("error", err)
                    });


                }
                else if (mode == 'delete') {

                    sendData = {
                        _id: data
                    };

                    GeneralModal.confirm({
                        title: $translate('DELETE_PLAYER_THEME_SETTING'),
                        text: $translate('Confirm to delete this player theme setting?')
                    }).then(function () {

                        return $scope.$socketPromise("deleteThemeSetting", sendData).then(data => {
                            if (data && data.data) {
                                $scope.$evalAsync(() => {
                                    vm.setThemeFooter(null);
                                    vm.themeSettingEdit = false;
                                    vm.reloadThemeSetting();

                                });
                            }

                        }, err => {
                            console.log("error", err)
                        });

                    });

                }
            }

        };

        vm.reloadThemeSetting = function(){
            return $scope.$socketPromise("getAllThemeSetting", {platform: vm.selectedPlatform.id}).then(
                data => {
                    if (data && data.data) {
                        vm.allThemeSetting = data.data;
                    }
                    vm.initThemeSetting();
                }
            )
        },

        vm.initThemeSetting = function(){
            if (vm.allThemeSetting){
                vm.themeSettingEdit = false;
                vm.playerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'player');
                vm.partnerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'partner');


            }

            vm.newPlayerThemeSetting = {
                themeStyle: null,
                content: []
            }
            $scope.$evalAsync();
        };

        vm.updateCollectionInEdit = function (type, collection, data) {
            if (type == 'add') {

                collection.push(data);

            } else if (type == 'remove') {

                collection.splice(data, 1);
            }
        };

    };

    let injectParams = [
        '$sce',
        '$compile',
        '$scope',
        '$filter',
        '$location',
        '$log',
        'authService',
        'socketService',
        'utilService',
        'CONFIG',
        "$cookies",
        "$timeout",
        '$http',
        'uiGridExporterService',
        'uiGridExporterConstants',
        'commonService'
    ];

    themeControlController.$inject = injectParams;
    myApp.register.controller('themeControlCtrl', themeControlController);
});