'use strict';

angular.module('myApp.components', [])
    .component('platformListSidebar', {
        bindings: {},
        templateUrl: 'category/platform2/platform-list.jade',
        controller: platformListSidebarController
    });

function platformListSidebarController($scope, $cookies, socketService, authService) {
    var vm = this;
    // Called when component is ready, see below
    vm.$onInit = function () {
        loadPlatformData();
    };

    function loadPlatformData(option) {
        if ($('#platformRefresh').hasClass('fa-spin')) {
            return
        }
        $('#platformRefresh').addClass('fa-spin');
        socketService.$socket(socketService.getAppSocket(), 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
            console.log('all platform data', data.data);
            vm.allPlatformData = data.data;
            if (data.data) {
                vm.buildPlatformList(data.data);
            }
            $('#platformRefresh').removeClass('fa-spin');

            $('#platformRefresh').addClass('fa-check');
            $('#platformRefresh').removeClass('fa-refresh');
            setTimeout(function () {
                $('#platformRefresh').removeClass('fa-check');
                $('#platformRefresh').addClass('fa-refresh').fadeIn(100);
            }, 1000);

            //select platform from cookies data
            var storedPlatform = $cookies.get("platform");
            if (storedPlatform) {
                vm.searchAndSelectPlatform(storedPlatform, option);
            }

        }, function (err) {
            $('#platformRefresh').removeClass('fa-spin');
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
            // vm.selectPlatformNode(data);
            $scope.$emit('myCustomEvent', 'Data to send');
        });
        $scope.$on('appSocketConnected', function (event, data) {
            debugger
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
        };
        return obj;
    };

    //search and select platform node
    vm.searchAndSelectPlatform = function (text, option) {
        var findNodes = $('#platformTree').treeview('search', [text, {
            ignoreCase: false,
            exactMatch: true
        }]);
        if (findNodes && findNodes.length > 0) {
            //vm.selectPlatformNode(findNodes[0], option);
            $('#platformTree').treeview('selectNode', [findNodes[0], {silent: true}]);
        }
    };
    vm.clickSomething = function () {
        alert("yoyo");
    };
}