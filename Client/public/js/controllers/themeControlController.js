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

            vm.initPlayerThemeSetting();
            vm.editForm ='partner';
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
            // vm.getAllPlayerFeedbackResults();
            // vm.getPlayerFeedbackTopic();
        });


        vm.setThemeFooter = function (action) {
            vm.themeAction = action;
        };

        vm.simpleUpdateCollectionInEdit = function (type, collection, data) {

                if (type == 'add') {
                    if (type && collection && data) {
                        collection.push(data);
                    }

                } else if (type == 'remove') {
                    if (type && collection && typeof data =='number') {
                        collection.splice(data, 1);
                    }
                }

        };

        vm.editThemeSetting = function (mode, data, type){

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

                    sendData = {
                        // platform: vm.selectedPlatform.id,
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

                    sendData = {
                        updateData: data
                    };

                    if (vm.deletedThemeSettingList && vm.deletedThemeSettingList.length > 0){
                        sendData.deletedThemeStyleIds = vm.deletedThemeSettingList;
                    }

                    return $scope.$socketPromise("updateThemeSetting", sendData).then(data => {
                        if (data && data.data) {
                            $scope.$evalAsync(() => {
                                console.log("updateThemeSetting", data);
                                vm.reloadThemeSetting();
                            });
                        }

                    }, err => {
                        console.log("error", err)
                    });

                }
        };

        vm.reloadThemeSetting = function(type){
            return $scope.$socketPromise("getAllThemeSetting").then(
                data => {
                    if (data && data.data) {
                        vm.allThemeSetting = data.data;
                    }
                    if (type == 'player') {
                        vm.initPlayerThemeSetting();
                    }
                    else if (type == 'partner'){
                        vm.initPartnerThemeSetting();
                    }
                }
            )
        };

        vm.initPlayerThemeSetting = function(){
            if (vm.allThemeSetting){

                vm.themeSettingEdit = false;
                vm.playerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'player');
                vm.partnerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'partner');

                vm.themeDataLength = vm.playerThemeData.length;
                vm.deletedThemeSettingList = [];
                vm.themeIdList = [];
                vm.themeStyleList = [];
                if (vm.playerThemeData.length > 0) {
                    vm.playerThemeData.forEach(
                        themeData => {
                            if (themeData && themeData.content && themeData.content.length > 0) {
                                themeData.content.forEach(
                                    inTheme => {
                                        if (inTheme.themeId) {
                                            vm.themeIdList.push(inTheme.themeId);
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }

            if (vm.playerThemeData.length > 0) {
                vm.playerThemeData.forEach(
                    themeData => {
                        if (themeData && themeData.themeStyle) {

                            vm.themeStyleList.push(themeData.themeStyle);

                        }
                    }
                )
            }

            vm.newPlayerThemeSetting = {
                themeStyle: null,
                content: []
            }
            vm.repetitiveBoolean = false;
            vm.instRepetitiveBoolean = false;
            $scope.$evalAsync();
        };

        vm.initPartnerThemeSetting = function(){
            if (vm.allThemeSetting){

                vm.themeSettingEdit = false;
                vm.playerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'player');
                vm.partnerThemeData = vm.allThemeSetting.filter(inData => inData.type == 'partner');

                vm.themeDataLength = vm.partnerThemeData.length;
                vm.deletedThemeSettingList = [];
                vm.themeIdList = [];
                vm.themeStyleList = [];
                if (vm.partnerThemeData.length > 0) {
                    vm.partnerThemeData.forEach(
                        themeData => {
                            if (themeData && themeData.content && themeData.content.length > 0) {
                                themeData.content.forEach(
                                    inTheme => {
                                        if (inTheme.themeId) {
                                            vm.themeIdList.push(inTheme.themeId);
                                        }
                                    }
                                )
                            }
                        }
                    )
                }
            }

            if (vm.partnerThemeData.length > 0) {
                vm.partnerThemeData.forEach(
                    themeData => {
                        if (themeData && themeData.themeStyle) {

                            vm.themeStyleList.push(themeData.themeStyle);

                        }
                    }
                )
            }

            vm.newPartnerThemeSetting = {
                themeStyle: null,
                content: []
            }
            vm.repetitiveBoolean = false;
            vm.instRepetitiveBoolean = false;
            $scope.$evalAsync();
        };


        vm.updateCollectionInEdit = function (mode, type, collection, data, selThemeSetting, allThemeSetting) {
            vm.onHoldDeletedTheme = null;
            if (type == 'add') {

                collection.push(data);

            } else if (type == 'remove') {

                if (allThemeSetting) {
                    if (selThemeSetting && typeof data == 'number') {

                        let query = {
                            _id: selThemeSetting._id,
                            type: mode

                        };

                        vm.deletedThemeList = {
                            theme: allThemeSetting,
                            index: data,
                            type: 'theme',

                        };

                        vm.onHoldDeletedTheme = selThemeSetting._id;

                        vm.checkRemovingTheme(query, allThemeSetting, data);
                    }
                }
                else {

                    if (selThemeSetting && collection && typeof data == 'number' && collection[data]) {
                        let query = {
                            _id: selThemeSetting._id,
                            themeId: collection[data].themeId,
                            type: mode
                        };

                        vm.deletedThemeList = {
                            theme: selThemeSetting,
                            index: data,
                            type: 'content',

                        };

                        vm.checkRemovingTheme(query, collection, data);

                    }
                }
            }
        };

        vm.checkRemovingTheme = function (query, collection, data) {

            return $scope.$socketPromise("checkThemeSettingFromPlatform", query).then(
                platform => {

                    if (platform && platform.data && platform.data.length > 0) {

                        vm.listedThemeSettingDetail = [];

                        platform.data.forEach(
                            inData => {
                                vm.listedThemeSettingDetail.push(
                                    inData.platformId + '. ' + inData.name + ' (' + $translate('Type') + ': ' + inData.playerThemeSetting.themeStyleId.themeStyle + ', ' + $translate('Theme') + 'ID: ' + inData.playerThemeSetting.themeId + ')'
                                )
                            }
                        );

                        $('#modalThemeSetting').modal().show();
                        $scope.$evalAsync();

                    }
                    else {
                        if (vm.onHoldDeletedTheme){
                            vm.deletedThemeSettingList.push(vm.onHoldDeletedTheme);
                        }
                        collection.splice(data, 1);
                        $scope.$evalAsync();
                    }

                }
            )
        };

        vm.confirmDeleteThemeSetting = function() {

            if(vm.deletedThemeList && vm.deletedThemeList.type == 'content'){
                vm.deletedThemeList.theme.content.splice(vm.deletedThemeList.index,1);
                $scope.$evalAsync();
            }
            else if (vm.deletedThemeList && vm.deletedThemeList.type == 'theme'){
                vm.deletedThemeList.theme.splice(vm.deletedThemeList.index,1);
                if (vm.onHoldDeletedTheme){
                    vm.deletedThemeSettingList.push(vm.onHoldDeletedTheme);
                }
                $scope.$evalAsync();
            }
        };

        vm.checkInstantDuplicatedThemeIdFromList = function (codeName, mode) {
            if (codeName && mode){

                if (mode == 'player') {

                    let themeIdList = [];

                    if (vm.playerThemeData && vm.playerThemeData.length > 0){
                        vm.playerThemeData.forEach(
                            theme => {
                                if (theme && theme.content && theme.content.length > 0){
                                    theme.content.forEach(
                                        inTheme => {
                                            themeIdList.push(inTheme.themeId);
                                        }
                                    )
                                }
                            }
                        )
                    }

                    if (themeIdList) {
                        let index = themeIdList.indexOf(codeName);
                        if (index != -1) {
                            vm.instRepetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme ID is repetitive"));
                        }
                        else {
                            vm.instRepetitiveBoolean = false;
                        }
                    }
                }
                else if ( mode == 'partner') {
                    let themeIdList = [];

                    if (vm.partnerThemeData && vm.partnerThemeData.length > 0){
                        vm.partnerThemeData.forEach(
                            theme => {
                                if (theme && theme.content && theme.content.length > 0){
                                    theme.content.forEach(
                                        inTheme => {
                                            themeIdList.push(inTheme.themeId);
                                        }
                                    )
                                }
                            }
                        )
                    }

                    if (themeIdList) {
                        let index = themeIdList.indexOf(codeName);
                        if (index != -1) {
                            vm.instRepetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme ID is repetitive"));
                        }
                        else {
                            vm.instRepetitiveBoolean = false;
                        }
                    }
                }

            }
        };

        vm.checkDuplicatedThemeSetting = function (codeName, type){
            if (codeName && type){

                if (type == 'id' ) {

                    if (vm.themeIdList) {
                        let index = vm.themeIdList.indexOf(codeName);
                        if (index != -1) {
                            vm.repetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme ID is repetitive"));
                        }
                        else {
                            vm.repetitiveBoolean = false;
                        }
                    }
                }
                else if (type == 'style') {


                    if (vm.themeStyleList) {
                        let index = vm.themeStyleList.indexOf(codeName);
                        if (index != -1) {
                            vm.repetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme style is repetitive"));
                        }
                        else {
                            vm.repetitiveBoolean = false;
                        }
                    }
                }

            }
        };

        vm.checkInstantDuplicatedThemeId = function (codeName, mode){
            if (codeName && mode){

                if (mode == 'player') {

                    let themeIdList = [];

                    if (vm.newPlayerThemeSetting && vm.newPlayerThemeSetting.content && vm.newPlayerThemeSetting.content.length > 0) {
                        vm.newPlayerThemeSetting.content.forEach(
                            inTheme => {
                                if (inTheme.themeId) {
                                    themeIdList.push(inTheme.themeId);
                                }
                            }
                        )
                    }

                    if (themeIdList) {
                        let index = themeIdList.indexOf(codeName);
                        if (index != -1) {
                            vm.instRepetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme ID is repetitive"));
                        }
                        else {
                            vm.instRepetitiveBoolean = false;
                        }
                    }
                }
                else if ( mode == 'partner') {

                    let themeIdList = [];

                    if (vm.newPartnerThemeSetting && vm.newPartnerThemeSetting.content && vm.newPartnerThemeSetting.content.length > 0) {
                        vm.newPartnerThemeSetting.content.forEach(
                            inTheme => {
                                if (inTheme.themeId) {
                                    themeIdList.push(inTheme.themeId);
                                }
                            }
                        )
                    }

                    if (themeIdList) {
                        let index = themeIdList.indexOf(codeName);
                        if (index != -1) {
                            vm.instRepetitiveBoolean = true;
                            return socketService.showErrorMessage($translate("Theme ID is repetitive"));
                        }
                        else {
                            vm.instRepetitiveBoolean = false;
                        }
                    }
                }

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