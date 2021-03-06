'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$scope', '$filter', '$location', '$log', 'socketService', 'authService', 'utilService', 'commonService', 'CONFIG', '$cookies'];

        var mainPageController = function ($scope, $filter, $location, $log, socketService, authService, utilService, commonService, CONFIG, $cookies) {
            var $translate = $filter('translate');
            var vm = this;

            // This next line should be commented.  Uncomment temporarily for debugging only.
            window.vm = vm;

            vm.userTableRowSelected = {};
            vm.selectedUsers = {};
            vm.policytoggle = {};

            vm.allAdminActions = [];
            vm.roleNameToBeAttached = [];
            vm.roleNameToBeDetached = [];

            vm.viewSequence = ['Player','Partner','Platform','Report','Operation','Analysis','Monitor','Payment','Provider','Dashboard','Admin','QualityInspection','TeleMarketing','ThemeControl'];

            //vm.dataTableCols = [
            //    {field: 'index', title: '#', show: true},
            //    {
            //        field: 'adminName', title: $translate('USER_NAME'),
            //    },
            //    {field: 'email', title: $translate('EMAIL')},
            //    {
            //        field: 'departments', title: $translate('DEPARTMENT'),
            //    },
            //    {
            //        field: 'roles', title: $translate('ROLE'),
            //    }
            //];
            // =============start department functions
            vm.getAllDepartmentData = function (callback) {

                if (!authService.checkViewPermission('Admin', 'Department', 'Read')) {
                    return;
                }

                // get multiple departments for current user
                let departmentIds = authService.departmentIds();
                if (departmentIds && departmentIds.length > 1) {
                    let departmentIdArr = [];
                    for (let i = 0, len = departmentIds.length; i < len; i++) {
                        if (departmentIds[i] && departmentIds[i]._id) {
                            departmentIdArr.push(departmentIds[i]._id);
                        }
                    }

                    if (departmentIdArr && departmentIdArr.length > 0) {
                        socketService.$socket($scope.AppSocket, 'getDepartmentTreeByIds', {departmentIds: departmentIdArr}, function success(data) {
                            vm.departments = data.data;
                            console.log("getDepartmentTreeByIds:: vm.departments", vm.departments);
                            vm.drawDepartmentTree();
                            //vm.getAllUserData();
                            $scope.$digest();
                            if (typeof(callback) == 'function') {
                                callback(data.data);
                            }
                        });
                    }

                } else {
                    //if admin user, get all departments data
                    //else only get current department data
                    socketService.$socket($scope.AppSocket, 'getDepartmentTreeById', {departmentId: authService.departmentId()}, function success(data) {
                        vm.departments = data.data;
                        console.log("vm.departments", vm.departments);
                        vm.drawDepartmentTree();
                        //vm.getAllUserData();
                        $scope.$digest();
                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });
                }
            };

            vm.searchDepartment = function () {
                var parentFindNode = $('#departmentTree').treeview('search', [vm.searchDepartmentText, {
                    exactMatch: false,    // like or equals
                    revealResults: true
                }]);
                $('#departmentTree').treeview('expandAll', {silent: true});
            };

            vm.createDepartment = function () {
                if(commonService.isSpecialChar(vm.newDepartment.departmentName)){
                    socketService.showErrorMessage($translate("Department failed to create, please avoid the using of special character"));
                    return;
                }

                vm.createNewDepartment(vm.newDepartment.departmentName, vm.SelectedDepartmentNode.id, success);
                function success(data) {
                    console.log("new data", data);
                    vm.getAllDepartmentData();
                    //addNewDepartmentNode(vm.SelectedDepartmentNode.id, data);
                }
            };

            vm.isSpecialCharacter = function (){
                vm.specialCharacter = commonService.isSpecialChar(vm.newDepartment.departmentName);
                $scope.$evalAsync();
            };

            vm.createNewDepartment = function (departmentName, parentId, callback) {
                console.log("createNewDepartment", departmentName, parentId, vm.newDepartment.icon);
                if (parentId == "root") {
                    socketService.$socket($scope.AppSocket, 'createDepartment', {
                        departmentName: departmentName,
                        icon: vm.newDepartment.icon
                    }, function (data) {
                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });
                }
                else {
                    var newDepartment = {
                        departmentName: departmentName,
                        parent: parentId,
                        icon: vm.newDepartment.icon,
                        platform: vm.selectedPlatform.id
                    };
                    socketService.$socket($scope.AppSocket, 'createDepartmentWithParent', newDepartment, function (data) {
                        if (typeof(callback) == 'function') {
                            callback(data.data);
                        }
                    });
                    console.log("create", newDepartment);

                }
            };
            //used by breadcrumb
            vm.setTreeNode = function (v) {
                $('#departmentTree').treeview('selectNode', [v.nodeId, {silent: false}]);
                vm.getFullDepartmentPath();
            }
            vm.deleteDepartment = function () {
                var parentNode = vm.departmentNodes[vm.SelectedDepartmentNode.parent];
                var parentFindNode = $('#departmentTree').treeview('search', [parentNode.text, {
                    ignoreCase: false,
                    exactMatch: true
                }])[0];
                let sendData = {
                    _ids: [vm.SelectedDepartmentNode.id],
                    departmentName: vm.SelectedDepartmentNode.departData.departmentName,
                    platform: vm.selectedPlatform.id
                };
                socketService.$socket($scope.AppSocket, 'deleteDepartmentsById', sendData, success);
                function success(data) {
                    vm.SelectedDepartmentText = parentFindNode.text;
                    vm.getAllDepartmentData();
                    $scope.safeApply();
                }
            };
            vm.getIconList = function () {
                vm.iconList = socketService.$getIconList();
            }

            vm.drawDepartmentTree = function () {
                getDepartmentTree();
                vm.refreshDepartmentTree();
                $('#departmentTree').treeview('expandAll', {levels: 3, silent: true});
            };

            function removeElementsFromArray(eles, arr) {
                if (!arr) {
                    return;
                }
                for (var i = 0; i < eles.length; i++) {
                    var index = arr.indexOf(eles[i]);
                    if (index > -1) {
                        arr.splice(index, 1);
                    }
                }
            }

            //function addNewDepartmentNode(parentId, newDepartData) {
            //    console.log("addNewDepartmentNode", parentId);
            //    var newNode = createDepartmentNode(newDepartData);
            //    vm.departmentNodes[newNode.id] = newNode;
            //    if (vm.departmentNodes[parentId].hasOwnProperty("nodes")) {
            //        vm.departmentNodes[parentId].nodes.push(newNode);
            //    } else {
            //        vm.departmentNodes[parentId].nodes = [newNode];
            //    }
            //    vm.refreshDepartmentTree();
            //    var findNode = $('#departmentTree').treeview('search', [newDepartData.departmentName, {
            //        ignoreCase: false,
            //        exactMatch: true,
            //    }]);
            //    $('#departmentTree').treeview('selectNode', [findNode, {silent: true}]);
            //    vm.SelectedDepartmentNode = findNode[0];
            //}

            function createDepartmentNode(v) {
                var obj = {
                    text: v.departmentName,
                    id: v._id,
                    nodeId: v._id,
                    parent: v.parent ? v.parent : null,
                    children: v.children,
                    icon: v.icon,
                    selectable: true,
                    departData: v,
                    tags: [],
                }
                if (v.children.length > 0) {
                    obj.nodes = [];
                }
                return obj;
            }

            function getDepartmentTree() {
                vm.departmentTree = null;
                vm.departmentNodes = {};
                vm.userCountArray = [];
                var finalNodeTree = [
                    //{
                    //    text: $translate("ALL_COMPANY"),
                    //    //function () {
                    //    //    var a=;
                    //    //    return a;
                    //    //},
                    //    id: "root",
                    //    nodeId: "root",
                    //    icon: "fa fa-list-ul",
                    //    //selectedIcon: "fa fa-check-square",
                    //    selectable: true,
                    //    departData: {},
                    //    stat: {expanded: true},
                    //    children: [],
                    //    nodes: []
                    //}
                ];

                var rawNodeList = {};
                let departments = authService.departmentIds();
                let filteredDepartments = departments.filter(department => {
                    if(department && department._id){
                        let indexNo = vm.departments.findIndex(d => d._id.toString() == department._id.toString());

                        if(indexNo == -1){
                            return department;
                        }
                    }
                })

                $.each(vm.departments, function (i, v) {
                    var newNode = createDepartmentNode(v);
                    //store all sub tree nodes to map list
                    if (v.parent) {
                        //if there is only one department add it to the tree

                        if (filteredDepartments && filteredDepartments.length > 0) {
                            for (let i = 0, len = filteredDepartments.length; i < len; i++) {
                                if (filteredDepartments[i] && filteredDepartments[i]._id == v._id) {
                                    finalNodeTree.push(newNode);
                                } else {
                                    rawNodeList[v._id] = newNode;
                                }
                            }
                        } else if (filteredDepartments && filteredDepartments.length == 1 && v._id == authService.departmentId()) {
                            finalNodeTree.push(newNode);
                        }
                        else {
                            rawNodeList[v._id] = newNode;
                            let indexOfParent = vm.departments.findIndex(d => d._id == v.parent)
                            if(indexOfParent == -1){
                                finalNodeTree.push(newNode);
                            }
                        }
                    }
                    //if root node, add it to the first level
                    else {
                        finalNodeTree.push(newNode);
                    }
                    vm.departmentNodes[v._id] = newNode;
                });

                //vm.SelectedDepartmentNode = finalNodeTree[0];
                //vm.departmentNodes["root"] = finalNodeTree[0];
                let count = 0;
                if (filteredDepartments && filteredDepartments.length > 0 && finalNodeTree && finalNodeTree.length > 0) {
                    for (let i = 0, len = finalNodeTree.length; i < len; i++) {
                        if (finalNodeTree[i] && finalNodeTree[i].children && finalNodeTree[i].children.length > 0) {
                            vm.departmentNodes["root"] = finalNodeTree[i];
                        }
                        buildSubTreeForNode(finalNodeTree[i]);
                    }
                }else if(finalNodeTree && finalNodeTree.length > 0){
                    for (let i = 0, len = finalNodeTree.length; i < len; i++) {
                        if (finalNodeTree[i]) {
                            vm.departmentNodes["root"] = finalNodeTree[i];
                            buildSubTreeForNode(finalNodeTree[i]);
                        }
                    }
                }else {
                    vm.departmentNodes["root"] = finalNodeTree[0];
                    buildSubTreeForNode(finalNodeTree[0]);
                }

                // let count = 0;
                // buildSubTreeForNode(finalNodeTree[0]);

                //construct trees for all root node
                //for (var i = 0; i < finalNodeTree[0].nodes.length; i++) {
                //    buildSubTreeForNode(finalNodeTree[0].nodes[i]);
                //}

                //build tree for passed in node
                function buildSubTreeForNode(rootNode) {
                    console.log("rootNode", rootNode);
                    if (rootNode && count < 100) {
                        var counter = (rootNode.departData && rootNode.departData.users) ? rootNode.departData.users.length : 0;
                        vm.userCountArray[rootNode.id] = counter;
                        if (rootNode.children) {
                            for (var j = 0; j < rootNode.children.length; j++) {
                                rootNode.nodes.push(rawNodeList[rootNode.children[j]]);
                                buildSubTreeForNode(rawNodeList[rootNode.children[j]]);
                                counter += vm.userCountArray[rootNode.children[j]];
                            }
                        }
                        vm.userCountArray[rootNode.id] = counter;
                        rootNode.tags.push('<i class="fa fa-user"></i>' + counter);
                    }
                    count++;
                }

                vm.departmentTree = finalNodeTree;
                console.log("vm.departmentTree", vm.departmentTree);
            }

            vm.refreshDepartmentTree = function () {
                $('#departmentTree').treeview(
                    {
                        data: vm.departmentTree,
                        //highlightSearchResults: false,
                        showTags: true,
                        expandIcon: 'fa fa-plus-square-o',
                        collapseIcon: 'fa fa-minus-square-o',
                        toggleSelected: false,
                        selectedBackColor: '#3676AD',
                    }
                );
                $('#departmentTree').on('nodeSelected', function (event, data) {
                    vm.userTableRowSelected = {};
                    vm.selectedUsers = {};
                    vm.roleUserList = [];
                    vm.SelectedDepartmentNode = data;
                    vm.departmentID = data.departData._id;
                    vm.SelectedDepartmentText = data.text;
                    console.log("SelectedDepartmentNode", data);
                    vm.showPlatformPage = (data.id != authService.departmentId());
                    vm.pageActionStatus = "null";
                    vm.clearAllBlink();
                    vm.getDepartmentFullData(vm.activatePlatformTab);
                    vm.getFullDepartmentPath();
                    vm.activatePlatformTab();
                    vm.setDepartViewList();
                    vm.getCtiUrlSubDomainList();
                    $scope.safeApply();
                });
                //$('#departmentTree').on('searchComplete', function (event, data) {
                //    var showAll = vm.searchDepartmentText ? false : true;
                //    $('#departmentTree li:not(.search-result)').each(function (i, o) {
                //        if (showAll) {
                //            $(o).show();
                //        } else {
                //            $(o).hide();
                //        }
                //    });
                //    $('#departmentTree li:has(.search-result)').each(function (i, o) {
                //        $(o).show();
                //    });
                //});
                //var parentFindNode = $('#departmentTree').treeview('search', [vm.SelectedDepartmentText, {exactMatch: true}]);
                ////console.log('parent', parentFindNode);
                //if (parentFindNode.length > 0) {
                //    $('#departmentTree').treeview('selectNode', [parentFindNode[0], {silent: true}]);
                //}
            };

            vm.setDepartViewList = function (){
                let departMaxViewListArray;

                if(vm.SelectedDepartmentNode.parent){
                    departMaxViewListArray = vm.SelectedDepartmentNode.departData && vm.SelectedDepartmentNode.departData.views ? vm.SelectedDepartmentNode.departData.views : {};
                }else{
                    departMaxViewListArray = vm.allView;
                }

                vm.departMaxViewList = {};
                vm.viewSequence.forEach(
                    viewSequence => {
                        vm.departMaxViewList[viewSequence] = departMaxViewListArray[viewSequence];
                    }
                );
            };

            vm.getFullDepartmentPath = function () {
                vm.fullDepartmentPath = [];
                getParent(vm.SelectedDepartmentNode);
                function getParent(node) {
                    var parent = $('#departmentTree').treeview('getParent', node);
                    // console.log("path parent", parent);
                    if (parent && parent.id) {
                        vm.fullDepartmentPath.unshift(parent);
                        if (parent.id != "root") {
                            getParent(parent);
                        }
                    }
                    return;
                }
            };

            vm.getNewFullDepartmentPath = function () {
                vm.newfullDepartmentPath = [];
                getParent(vm.newDepartmentNode);
                function getParent(node) {
                    var parent = $('#departmentTree').treeview('getParent', node);
                    if (parent && parent.id) {
                        vm.newfullDepartmentPath.unshift(parent);
                        if (parent.id != "root") {
                            getParent(parent);
                        }
                    }
                    return;
                }
            };

            vm.getDepartmentFullData = function () {
                // if (!vm.SelectedDepartmentNode || vm.SelectedDepartmentNode.id == "root") {
                //     vm.getAllUserData();
                // }
                // else {
                    vm.getDepartmentUsersData();
                    //todo::refactor code here
                    socketService.$socket($scope.AppSocket, 'getDepartment', {_id: vm.SelectedDepartmentNode.id}, function (data) {
                        if (data.data._id == vm.SelectedDepartmentNode.id) {
                            //vm.roleIdtoText = {};
                            vm.allRole = data.data.roles;
                            vm.allrelatedPlatform = data.data.platforms;
                            $scope.safeApply();
                        }
                    });
                // }
            };

            //can the selected department be deleted
            vm.canDepartmentBeDeleted = function () {
                return (vm.SelectedDepartmentNode && vm.SelectedDepartmentNode.children && vm.SelectedDepartmentNode.children.length <= 0
                && vm.SelectedDepartmentNode.departData.users && vm.SelectedDepartmentNode.departData.users.length <= 0);
            };

            /////////////////////////////////////////moving department ///////////////////
            vm.moveDepartmentDialog = function (type) {
                $('#departmentTreeForMoving').treeview(
                    {
                        data: vm.departmentTree,
                        levels: 3,
                        highlightSearchResults: false
                    }
                );
                vm.newDepartmentNode = $('#departmentTreeForMoving').treeview('getNode', 1);
                //remove vm.SelectedDepartmentNode.id
                if (type == "department") {
                    vm.curDepartmentParent = vm.SelectedDepartmentNode.parent;
                    let searchText = vm.SelectedDepartmentNode.text.replace(/\(|\)/g, '\\$&');
                    var parentFindNode = $('#departmentTreeForMoving').treeview('search', [searchText, {
                        exactMatch: true,
                        revealResults: false
                    }]);
                    console.log("disable", parentFindNode);
                    //$('#departmentTreeForMoving').treeview('disableNode', [0, {silent: true}]);
                    $.each(parentFindNode, function (i, v) {
                        console.log(v);
                        $('#departmentTreeForMoving').treeview('disableNode', [v, {silent: true}]);

                    });
                } else if (type == "user") {
                    //vm.SelectedDepartmentNode=
                    //vm.curDepartmentParent = null;
                    let searchText = vm.curCommonDepartmentText.replace(/\(|\)/g, '\\$&');
                    var parentFindNode = $('#departmentTreeForMoving').treeview('search', [searchText, {
                        exactMatch: true,
                        revealResults: false
                    }]);
                    console.log("found user node", parentFindNode);
                    vm.SelectedDepartmentNode = parentFindNode[0]
                    vm.getFullDepartmentPath();
                    $('#departmentTree').treeview('selectNode', [parentFindNode[0], {silent: true}]);
                    $('#departmentTreeForMoving').treeview('selectNode', [parentFindNode[0], {silent: true}]);
                    //var parentFindNode = $('#departmentTreeForMoving').treeview('search', [vm.SelectedDepartmentNode.text, {exactMatch: true}]);
                    console.log("disable", parentFindNode);
                    $.each(parentFindNode, function (i, v) {
                        console.log(v);
                        v.selectable = false;
                        //$('#departmentTreeForMoving').treeview('disableNode', [v, {silent: true}]);
                    });
                }

                $('#departmentTreeForMoving').on('nodeSelected', function (event, data) {
                    if (data.id === "root") {
                        alert("moving to root department is not allowed!");
                        return;
                    }
                    //console.log("event", event);
                    vm.newDepartmentNode = data;
                    vm.getNewFullDepartmentPath();
                    //console.log("newDepartmentNode", data);
                    $scope.$digest();
                });
            }

            vm.showDepartmentUpdateTreeView = function() {
                vm.oriDepartmentList = [];
                vm.checkedDepartmentList = [];

                //load department tree view
                $('#departmentTreeForUpdate').treeview(
                    {
                        data: vm.departmentTree,
                        levels: 3,
                        highlightSearchResults: false,
                        showCheckbox: true
                    }
                );

                //if no user is selected, or more than 1 users are selected, return false
                if (!vm.selectedUsersCount || vm.selectedUsersCount == 0 || vm.selectedUsersCount > 1) return false;

                //get selected user's departments and check the checkbox in tree view
                let userDetails  = vm.selectedUsers[Object.keys(vm.selectedUsers)[0]];
                if(userDetails && userDetails.departments && userDetails.departments.length > 0){
                    userDetails.departments.forEach(department => {
                        if(department && department.departmentName && department._id){
                            let searchText = department.departmentName.replace(/\(|\)/g, '\\$&');
                            vm.oriDepartmentList.push(department._id);
                            vm.checkedDepartmentList.push(department._id);

                            var parentFindNode = $('#departmentTreeForUpdate').treeview('search', [searchText, {
                                exactMatch: true,
                                revealResults: false
                            }]);

                            $('#departmentTreeForUpdate').treeview('checkNode', [parentFindNode[0], {silent: true}]);
                        }
                    })
                }

                // get deparmentObjId when checked
                $('#departmentTreeForUpdate').on('nodeChecked', function (event, data) {
                    if(data && data.id){
                        let indexNo = vm.checkedDepartmentList.findIndex(d => d == data.id);
                        if(indexNo == -1){
                            vm.checkedDepartmentList.push(data.id);
                        }
                    }

                });

                // remove deparmentObjId when unchecked
                $('#departmentTreeForUpdate').on('nodeUnchecked', function (event, data) {
                    if(data && data.id){
                        let indexNo = vm.checkedDepartmentList.findIndex(d => d == data.id);
                        if(indexNo != -1){
                            vm.checkedDepartmentList.splice(indexNo, 1);
                        }
                    }
                });
            };

            vm.submitUserDepartmentUpdate = function() {
                //if no user is selected, or more than 1 users are selected, return false
                if (!vm.selectedUsersCount || vm.selectedUsersCount == 0 || vm.selectedUsersCount > 1) return false;

                let userDetails  = vm.selectedUsers[Object.keys(vm.selectedUsers)[0]];
                let data = {};
                let departmentToBeDeleted = [];
                departmentToBeDeleted = vm.oriDepartmentList.slice();
                if(userDetails){
                    data.adminId = userDetails._id || null;
                    data.adminName = userDetails.adminName || null;
                }

                vm.oriDepartmentList.forEach(department => {
                    if(department){
                        let indexNo = vm.checkedDepartmentList.findIndex(d => d == department);
                        if(indexNo != -1){
                            let removeIndex = departmentToBeDeleted.findIndex(d => d == department);
                            if(indexNo != -1){
                                departmentToBeDeleted.splice(removeIndex, 1);
                            }
                        }
                    }
                });

                data.toBeDeletedDepartmentList = departmentToBeDeleted;
                data.newDepartmentList = vm.checkedDepartmentList;
                data.platform = vm.selectedPlatform.id;

                console.log(data);

                socketService.$socket($scope.AppSocket, 'updateAdminDepartment', data, success, fail);
                function success(data) {
                    vm.selectedUsers = {};
                    vm.userTableRowSelected = {};
                    console.log(data);
                    vm.getAllDepartmentData();
                    vm.getDepartmentUsersData();
                }

                function fail(data) {
                    console.log(data);
                }
            };

            vm.clearAllCheckedDepartment = function() {
                $('#departmentTreeForUpdate').treeview('uncheckAll', { silent: false });
            };

            vm.submitMoveDepartment = function (sendData) {
                var data = sendData || {
                        departmentId: vm.SelectedDepartmentNode.id,
                        curParentId: vm.SelectedDepartmentNode.departData.parent,
                        newParentId: vm.newDepartmentNode.id,
                        departmentName: vm.SelectedDepartmentNode.departData.departmentName
                    };
                //console.log(data);
                //if (data.curParentId == data.newParentId) {
                //}

                data.platform = vm.selectedPlatform.id;
                socketService.$socket($scope.AppSocket, 'updateDepartmentParent', data, success, fail);
                function success(data) {
                    //console.log(data);
                    vm.getAllDepartmentData();
                    $scope.$apply();
                }

                function fail(data) {
                    console.log(data);
                }
            }
            vm.renameDepartment = function (text, icon) {
                var queryDepartment = {
                    query: {
                        _id: vm.SelectedDepartmentNode.id
                    },
                    updateData: {
                        departmentName: text,
                        icon: icon,
                    },
                    platform: vm.selectedPlatform.id
                };
                socketService.$socket($scope.AppSocket, 'updateDepartment', queryDepartment, success, fail);
                function success(data) {
                    console.log(data);
                    vm.getAllDepartmentData();
                    $scope.safeApply();
                }

                function fail(data) {
                    console.log(data);
                }
            }

            // ============end department functions

            //=============start user functions
            vm.getAllUserData = function () {

                if (!authService.checkViewPermission('Admin', 'User', 'Read')) {
                    return;
                }
                socketService.$socket($scope.AppSocket, 'getAllAdminInfo', '', success);
                function success(data) {
                    if (!vm.SelectedDepartmentNode || vm.SelectedDepartmentNode.id == "root") {
                        vm.users = data.data;
                        vm.drawUserTable(data.data);
                        vm.selectedUsers = {};
                        $scope.safeApply();
                    }
                }
            };

            vm.getSelectedDepartmentAllUserIds = function () {
                return vm.getAllChildrenDepartmentIds(vm.SelectedDepartmentNode);
            };

            vm.numberOfTruthyProps = function (obj) {
                if (!obj) {
                    return 0;
                }
                var i = 0;
                Object.keys(obj).forEach(function (key) {
                    if (obj[key]) {
                        i++;
                    }
                });
                return i;
            };

            vm.iniEditAdminRole = function () {
                vm.departmentRolelist = [];
                vm.cloneDepartmentRolelist = [];
                vm.attachedRoles = [];
                vm.detachedRoles = [];
                $scope.assertEqual(vm.selectedUsersCount, 1);
                $scope.assertEqual(Object.keys(vm.selectedUsers).length, 1);

                $.each(vm.selectedUsers, function (i, v) {
                    vm.curUser = v;
                });
                $scope.assert(vm.curUser);

                // Get available roles for this user
                let sendData = {
                    _id: vm.curUser._id,
                };

                socketService.$socket($scope.AppSocket, 'getDepartmentRolesForAdmin', sendData, success);
                function success(data) {
                    $scope.$evalAsync(() => {
                        console.log("getDepartmentRolesForAdmin", data.data);
                        if (data && data.data && data.data.length > 0) {
                            data.data.map((result, index) => {
                                result.orderNo = index + 1;
                            });
                            vm.departmentRolelist = data.data;
                            vm.cloneDepartmentRolelist = JSON.parse(JSON.stringify((data.data)));
                        }
                    });
                }
            };

            vm.removeAllRolesSelection = function () {
                if (vm.departmentRolelist && vm.departmentRolelist.length > 0) {
                    for (let i = 0, ilen = vm.departmentRolelist.length; i < ilen; i++) {
                        let department = vm.departmentRolelist[i];

                        if (department && department.roles && department.roles.length > 0) {
                            for (let j = 0, jlen = department.roles.length; j < jlen; j++) {
                                let role = department.roles[j];

                                if (role && role.isAttach) {
                                    role.isAttach = false;
                                }
                            }
                        }
                    }

                    $('input[name="selectRoleCheckBox"]').each(function() {
                        this.checked = false;
                    });

                    vm.attachedRoles = [];
                    vm.detachedRoles = [];

                    if (vm.cloneDepartmentRolelist && vm.cloneDepartmentRolelist.length > 0) {
                        for (let x = 0, xlen = vm.cloneDepartmentRolelist.length; x < xlen; x++) {
                            let department = vm.cloneDepartmentRolelist[x];
                            if (department && department.roles && department.roles.length > 0) {
                                for (let y = 0, ylen = department.roles.length; y < ylen; y++) {
                                    let role = department.roles[y];
                                    if (role && role.isAttach) {
                                        vm.detachedRoles.push(role._id);
                                    }
                                }
                            }
                        }
                    }
                }
            };

            vm.attachDetachAdminRole = function (id, isAttach) {
                if (!isAttach) {
                    vm.detachedRoles.push(id);

                    let indexNo = vm.attachedRoles.findIndex(r => r == id)
                    if(indexNo != -1){
                        vm.attachedRoles.splice(indexNo, 1);
                    }

                    vm.checkCurrentAdminRoleToOriginalAdminRole(vm.detachedRoles, false);
                } else {
                    vm.attachedRoles.push(id);

                    let indexNo = vm.detachedRoles.findIndex(r => r == id)
                    if(indexNo != -1){
                        vm.detachedRoles.splice(indexNo, 1);
                    }
                    vm.checkCurrentAdminRoleToOriginalAdminRole(vm.attachedRoles, true);
                }
            };

            vm.checkCurrentAdminRoleToOriginalAdminRole = function (arr, flag) {
                if (vm.cloneDepartmentRolelist && vm.cloneDepartmentRolelist.length > 0) {
                    for (let i = 0, ilen = vm.cloneDepartmentRolelist.length; i < ilen; i++) {
                        let department = vm.cloneDepartmentRolelist[i];

                        if (department && department.roles && department.roles.length > 0) {
                            for (let j = 0, jlen = department.roles.length; j < jlen; j++) {
                                let role = department.roles[j];
                                let isAttachFlag = !flag ? !role.isAttach: role.isAttach;

                                if (role && isAttachFlag) {
                                    let indexNo = arr.findIndex(r => r == role._id)
                                    if(indexNo != -1){
                                        arr.splice(indexNo, 1);
                                    }
                                }
                            }
                        }
                    }
                }
            };

            vm.attachAdminToRole = function () {
                $scope.assertEqual(vm.selectedUsersCount, 1);
                $scope.assertEqual(Object.keys(vm.selectedUsers).length, 1);

                $.each(vm.selectedUsers, function (i, v) {
                    vm.curUser = v;
                });
                $scope.assert(vm.curUser);

                vm.roleToBeAttached = {};

                // Get available roles for this user
                var sendData = {
                    _id: vm.curUser._id,
                };
                socketService.$socket($scope.AppSocket, 'getUnAttachedDepartmentRolesForAdmin', sendData, success);
                function success(data) {
                    vm.avaliableRoles = data.data;
                    console.log("roles?", data.data);
                    //vm.getDepartmentFullData();
                    //vm.getDepartmentUsersData();
                    $scope.safeApply();
                }
            };
            vm.submitAttachRoles = function () {
                // If Angular updates the DOM while the modal is fading, this will confuse Bootstrap, and it will leave the dark overlay blocking the page.
                // (This was happening even if the only update was showConfirmMessage().)
                // So we wait until the modal has faded (and the overlay has been removed) before making any requests.
                $('#modalAttachRolesToUser').one('hidden.bs.modal', function () {
                    //[data.AdminObjIds, data.RoleObjIds]
                    console.log("users", vm.selectedUsers);
                    console.log("roles", vm.roleToBeAttached);
                    var userIds = [];
                    var roleIds = [];
                    $.each(vm.roleToBeAttached, function (i, v) {
                        if (v) {
                            roleIds.push(i);
                        }
                    });

                    var data = {
                        AdminObjIds: [vm.curUser._id],
                        RoleObjIds: roleIds,
                        RoleDetails: {
                            curUser: vm.curUser.adminName,
                            roleName: vm.roleNameToBeAttached}
                    };
                    console.log(data);
                    socketService.$socket($scope.AppSocket, 'attachRolesToUsersById', data, success);
                    function success(data) {
                        vm.getDepartmentFullData();
                        vm.getDepartmentUsersData();
                        vm.roleNameToBeAttached = [];
                        $scope.$apply();
                    }
                });
            };
            vm.attachRoleName = function(roleId, roleName){
                if(vm.roleToBeAttached){
                    if(vm.roleToBeAttached[roleId]){
                        vm.roleNameToBeAttached.push(roleName);
                    }else{
                        let indexNo = vm.roleNameToBeAttached.findIndex(r => r == roleName)
                        if(indexNo != -1){
                            vm.roleNameToBeAttached.splice(indexNo, 1);
                        }
                    }
                }
            };
            vm.beforeDetachingRole = function () {
                $scope.assertEqual(vm.selectedUsersCount, 1);
                $scope.assertEqual(Object.keys(vm.selectedUsers).length, 1);

                $.each(vm.selectedUsers, function (i, v) {
                    vm.curUser = v;
                });
                $scope.assert(vm.curUser);

                // Ensure vm.curUser holds his list of roles (and it is up-to-date).
                // (No need for getAttachedDepartmentRolesforAdmin)
                var query = {_id: vm.curUser._id};
                socketService.$socket($scope.AppSocket, 'getFullAdminInfo', query, success, fail);
                function success(data) {
                    console.log("all role", data);
                    vm.curUser = data.data;
                    $scope.$apply();
                }

                function fail(data) {
                    console.log("all role", data);
                    vm.curUser = null;
                    $scope.$apply();
                }
            }

            vm.submitDepartmentRoles = function () {
                $('#modalEditAdminRole').one('hidden.bs.modal', function () {
                    let data = {
                        AdminObjIds: [vm.curUser._id],
                        AttachRoleObjIds: vm.attachedRoles,
                        DetachRoleObjIds: vm.detachedRoles,
                        platform: vm.selectedPlatform.id
                    };
                    console.log("send data", data);
                    socketService.$socket($scope.AppSocket, 'attachDetachRolesFromUsersById', data, success);
                    function success(data) {
                        $scope.$evalAsync(() => {
                            vm.getDepartmentFullData();
                            vm.getDepartmentUsersData();
                        });
                    }
                });
            };

            vm.submitDetachRoles = function () {
                $('#modalDetachRolesFromUser').one('hidden.bs.modal', function () {
                    var userIds = [];
                    var roleIds = [];
                    $.each(vm.roleToBeDetached, function (i, v) {
                        if (v) {
                            roleIds.push(i);
                        }
                    });

                    var data = {
                        AdminObjIds: [vm.curUser._id],
                        RoleObjIds: roleIds,
                        RoleDetails: {
                            curUser: vm.curUser.adminName,
                            roleName: vm.roleNameToBeDetached
                        },
                        platform: vm.selectedPlatform.id
                    };
                    console.log("detach", data);
                    socketService.$socket($scope.AppSocket, 'detachRolesFromUsersById', data, success);
                    function success(data) {
                        vm.getDepartmentFullData();
                        vm.getDepartmentUsersData();
                        vm.roleNameToBeDetached = [];
                        $scope.$apply();
                    }
                });
            }
            vm.detachRoleName = function(roleId, roleName){
                if(vm.roleToBeDetached){
                    if(vm.roleToBeDetached[roleId]){
                        vm.roleNameToBeDetached.push(roleName);
                    }else{
                        let indexNo = vm.roleNameToBeDetached.findIndex(r => r == roleName)
                        if(indexNo != -1){
                            vm.roleNameToBeDetached.splice(indexNo, 1);
                        }
                    }
                }
            };
            vm.getAllChildrenDepartmentIds = function (departmentNode, count) {
                count = count || 0;
                var userIds = [];
                if (!departmentNode) {
                    return userIds;
                }
                //console.log(departmentNode.text, vm.departmentNodes[departmentNode.id].departData.users);
                userIds = userIds.concat(vm.departmentNodes[departmentNode.id].departData.users);
                if (departmentNode.children && count <= 10) {
                    count++;
                    for (var i = 0; i < departmentNode.children.length; i++) {
                        var nodeId = departmentNode.children[i];
                        userIds = userIds.concat(vm.getAllChildrenDepartmentIds(vm.departmentNodes[nodeId], count));
                    }
                }
                return userIds;
            };

            vm.getDepartmentUsersData = function () {
                var userIds = vm.getSelectedDepartmentAllUserIds();
                //console.log("userIds", userIds);
                var queryData = {
                    _ids: userIds
                };
                if (!authService.checkViewPermission('Admin', 'User', 'Read')) {
                    return;
                }
                socketService.$socket($scope.AppSocket, 'getFullAdminInfos', queryData, success, fail);
                function success(data) {
                    vm.users = data.data;
                    console.log("looking for", vm.users);
                    vm.drawUserTable(vm.users);
                    // I don't think we should set vm.curUser until the user actually selects one
                    //vm.curUser = vm.users[0];
                    $scope.safeApply();
                }

                function fail(data) {
                    console.log(data);
                }
            };

            vm.initNewUser = function () {
                vm.newAdmin = {};
                // Auto-generating a password could be helpful if:
                // - we make the password visible to the current admin, so they can pass it to the new user,
                // - or we send the password to the new user in an email or SMS after the account has been created.
                //var pass = $scope.generateRandomPassword();
                //vm.newAdmin.password = pass;
                //vm.pswdverify = pass;
            };

            vm.createUser = function () {
                vm.newAdmin.departments = [vm.SelectedDepartmentNode.id];
                vm.reArrangeArr(vm.newAdmin.live800CompanyId, 'live800CompanyId', vm.newAdmin);
                vm.reArrangeArr(vm.newAdmin.live800Acc, 'live800Acc', vm.newAdmin);
                console.log(vm.newAdmin);
                if(vm.newAdmin.live800Acc && vm.newAdmin.live800Acc.toString() != ''){
                    socketService.$socket($scope.AppSocket, 'checkLive800AccValidity', {live800Acc: vm.newAdmin.live800Acc, adminName: vm.newAdmin.adminName}, function(data) {
                        if (data && !data.data) {
                            vm.live800AccResult = {
                                Status: false,
                                Message: 'Live800 Account already exist!'
                            };
                            vm.getAllDepartmentData();
                            $scope.safeApply();
                        } else {
                            vm.createUserForDepartment();
                        }
                    });
                } else {
                    vm.createUserForDepartment();
                }
            };

            vm.createUserForDepartment = function () {
                if(vm.newAdmin){
                    vm.newAdmin.platform = vm.selectedPlatform.id;
                }
                socketService.$socket($scope.AppSocket, 'createAdminForDepartment', vm.newAdmin, function(data){
                    vm.departmentNodes[vm.SelectedDepartmentNode.id].departData.users.push(data.data._id);
                    //vm.getDepartmentFullData();
                    //vm.getAllDepartmentData();
                    vm.departmentID = vm.SelectedDepartmentNode.departData._id;
                    vm.SelectedDepartmentText = vm.SelectedDepartmentNode.text;
                    console.log("SelectedDepartmentNode", vm.SelectedDepartmentNode);
                    vm.pageActionStatus = "null";
                    vm.live800AccResult = {
                        Status: true
                    };
                    $('#modalCreateUser').modal('hide');
                    $(".modal-backdrop").hide();
                    vm.clearAllBlink();
                    vm.getDepartmentFullData(vm.activatePlatformTab);
                    vm.getFullDepartmentPath();
                    vm.activatePlatformTab();
                    vm.getAllDepartmentData();
                    $scope.safeApply();
                });
            }

            vm.passwordLengthCheck = function (password) {
                if (password) {
                    return password.length < 6;
                }
                else return false;
            };

            vm.reArrangeTXT = function(arr){
                let result = '';
                let delimiter = ',';
                if(arr && arr.length > 0){
                    result = arr.join(delimiter);
                }
                return result;
            };

            vm.reArrangeArr = function(oriTXT, targetField, targetArr) {
                if (typeof(oriTXT) == 'string') {
                    let convertArr = oriTXT.split(',');
                    targetArr[targetField] = convertArr;
                }
            };

            vm.editUserDialog = function () {
                vm.pageTag = 'updateAdmin';
                vm.newAdmin = {
                    adminName: vm.curUser.adminName,
                    email: vm.curUser.email,
                    firstName: vm.curUser.firstName,
                    lastName: vm.curUser.lastName,
                    did: vm.curUser.did,
                    tsDid: vm.curUser.tsDid,
                    callerId: vm.curUser.callerId,
                    live800CompanyId:vm.curUser.live800CompanyId,
                    callerQueue: vm.curUser.callerQueue,
                    ctiUrl: vm.curUser.ctiUrl,
                    ctiTsUrl: vm.curUser.ctiTsUrl,
                    live800Acc: vm.curUser.live800Acc
                };
                vm.updateAdminLive800 = {
                    live800CompanyIdTXT: vm.reArrangeTXT(vm.curUser.live800CompanyId),
                    live800AccTXT: vm.reArrangeTXT(vm.curUser.live800Acc),
                };
            };

            vm.submitEditUser = function () {
                vm.reArrangeArr(vm.updateAdminLive800.live800CompanyIdTXT ,  'live800CompanyId', vm.newAdmin);
                vm.reArrangeArr(vm.updateAdminLive800.live800AccTXT , 'live800Acc', vm.newAdmin);
                if((vm.curUser.live800Acc.toString() != vm.newAdmin.live800Acc.toString()) && vm.newAdmin.live800Acc.toString() != '') {
                    socketService.$socket($scope.AppSocket, 'checkLive800AccValidity', {live800Acc: vm.newAdmin.live800Acc, adminName: vm.newAdmin.adminName}, function(data){
                        if (data && !data.data) {
                            vm.live800AccResult = {
                                Status: false,
                                Message: 'Live800 Account already exist!'
                            };
                            $scope.safeApply();
                        }
                        else {
                            vm.updateEditUser();
                        }
                    });
                }else {
                    vm.updateEditUser();
                }
            };

            vm.updateEditUser = function(){
                socketService.$socket($scope.AppSocket, 'updateAdmin', {
                    query: {_id: vm.curUser._id},
                    updateData: vm.newAdmin,
                    platform: vm.selectedPlatform.id
                }, function(data){
                    //vm.getAllDepartmentData();
                    $('#modalEditUser').modal('hide');
                    $(".modal-backdrop").hide();
                    vm.live800AccResult = {
                        Status: true
                    };
                    vm.getDepartmentUsersData();
                    console.log("edit ok");
                    $scope.safeApply();
                });
            };

            vm.cancelCreateOrEditUser = function(){
                vm.live800AccResult = {
                    Status: true
                };
            }

            vm.deleteUsers = function () {
                var userIds = [];
                console.log(vm.userTableRowSelected);
                for (var k in vm.userTableRowSelected) {
                    if (vm.userTableRowSelected[k]) {
                        userIds.push(k);
                    }
                }
                console.log("deleteUsers", userIds);
                let sendData = {
                    _ids: userIds,
                    selectedUsers: vm.selectedUsers,
                    platform: vm.selectedPlatform.id
                };
                socketService.$socket($scope.AppSocket, 'deleteAdminInfosById', sendData, success);
                function success(data) {
                    console.log(data);
                    vm.selectedUsers = {};
                    vm.userTableRowSelected = {};
                    removeElementsFromArray(userIds, vm.departmentNodes[vm.SelectedDepartmentNode.id].departData.users);
                    //refresh department user data
                    //vm.getDepartmentFullData();
                    vm.getAllDepartmentData();
                    vm.getDepartmentUsersData();
                    $scope.safeApply();
                }
            };

            //get detailed information of user, include departments data and role data
            vm.getFullUserData = function (userId, callback) {
                socketService.$socket($scope.AppSocket, 'getFullAdminInfo', {_id: userId}, success);
                function success(data) {
                    //todo::store data to vm
                    $scope.$digest();
                    if (typeof(callback) == 'function') {
                        callback(data.data);
                    }
                }
            };

            vm.drawUserTable = function (data) {
                vm.selectedUsersCount = 0;
                vm.selectedUsers = {};
                vm.curUser = null;
                vm.userTableRowSelected = {};
                $('#userDataTable *').removeClass('adminSelected');
                vm.userTable = $('#userDataTable').DataTable(
                    {
                        data: data,
                        columns: [
                            {
                                title: '#',
                                "data": "select",
                                className: "selectTable1Row",
                                render: function (data, type, row) {
                                    return '<input type="checkbox" class="editor-active readonly" disabled="disabled">';
                                },
                            },
                            {
                                title: $translate('USER_NAME'),
                                "data": "adminName",
                                render: function (data, type, row) {
                                    return '<a style="z-index: auto", data-placement="bottom" data-toggle="popover" data-container="body" ' +
                                        'data-placement="left" data-trigger="focus" type="button" data-html="true" href="#">' +
                                        data + '</a>';
                                }
                            },
                            {title: $translate('EMAIL'), "data": "email"},
                            {
                                title: $translate('DEPARTMENT'),
                                "data": "departments",
                                "render": function (data, type) {
                                    if (data && data.length > 0) {
                                        let departmentName =  "";
                                        for(let i = 0; i < data.length; i ++){
                                            departmentName += data[i].departmentName + ",";
                                        }

                                        departmentName = departmentName.slice(0, -1);
                                        return departmentName;
                                        //return data[0].departmentName;
                                    }
                                    else {
                                        return "";
                                    }
                                }
                            },
                            {
                                title: $translate('ROLE'),
                                "data": "roles",
                                "render": function (data, type) {
                                    //return data.length;
                                    if (data && data.length > 1) {
                                        return data[0].roleName + "...(" + data.length + ")";
                                    } else if (data && data.length == 1) {
                                        return data[0].roleName;
                                    } else {
                                        return "";
                                    }
                                }
                            },
                        ],
                        "scrollX": false,
                        "scrollY": "310px",
                        "scrollCollapse": true,
                        "paging": false,
                        "destroy": true,
                        "dom": '<"top">rt<"bottom"il><"clear">',
                        "language": {
                            "info": "Total _MAX_ users",
                            "emptyTable": $translate("No data available in table"),
                        },
                        fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                            $(nRow).off('click');
                            $(nRow).on('click', function () {
                                var checked = false;
                                //todo::check css class here, two selected
                                $(this).toggleClass('selected');
                                $(this).toggleClass('adminSelected');
                                $(this).find('input').each(function () {
                                    this.checked = !this.checked;
                                    checked = this.checked;
                                });
                                vm.userTableRowClicked(aData, checked);
                            });
                        },
                        fnDrawCallback: function (oSettings) {
                            utilService.setupPopover({
                                context: oSettings.nTable,
                                elem: "[data-toggle=popover]",
                                content: function () {
                                    for (var i = 0; i < vm.users.length; i++) {
                                        if (vm.users[i].adminName === this.text) {
                                            vm.curUser = vm.users[i];
                                            break;
                                        }
                                    }
                                    $scope.safeApply();
                                    return $('#userInfoPopover').html();
                                }
                            });
                        }
                    }
                );
                $('#userDataTable').resize();
                $('#userDataTable').resize();
            };

            vm.cancelSaveNewRole = function () {
                vm.pageActionStatus = 'null';
                vm.clearAllBlink();
                if (vm.roleSelected) {
                    vm.roleInRoleListClicked(vm.roleSelected);
                }
            };

            vm.userTableRowClicked = function (userData, checked) {
                vm.userTableRowSelected[userData._id] = checked;

                vm.selectedUsersCount = vm.userTable.rows('.adminSelected').data().length;
                console.log("currently num admin", vm.selectedUsersCount);
                if (checked) {
                    //vm.selectedUsers[userData._id] = userData.adminName;
                    socketService.$socket($scope.AppSocket, 'getFullAdminInfo', {_id: userData._id}, success);

                } else {
                    if (vm.curUser && vm.curUser._id === userData._id) {
                        vm.curUser = null;
                    }
                    delete vm.selectedUsers[userData._id];
                }

                console.log("userTableRowClicked", userData);
                $scope.safeApply();
                function success(data) {
                    if (data.data) {
                        vm.curUser = data.data;
                        vm.selectedUsers[userData._id] = data.data;

                        $scope.$digest();
                        console.log("all users", vm.selectedUsers, vm.selectedUsersCount);
                    }
                }
            };

            vm.canCreateUser = function () {
                return vm.SelectedDepartmentNode;
            };

            vm.cancelUpdateRole = function () {
                vm.pageActionStatus = "null";
                vm.processRoleData();
            };

            vm.allRoleSelection = function (flag) {
                vm.showRoleFlag = $.extend(true, {}, vm.departMaxViewList);
                $.each(vm.showRoleFlag, function (cate, cateData) {
                    $.each(cateData, function (sectionName, sectionData) {
                        $.each(sectionData, function (viewName, viewData) {
                            vm.showRoleFlag[cate][sectionName][viewName] = flag;
                        });
                        vm.policytoggle[cate][sectionName].all = flag;
                    });
                });
            };

            //if there are selected users, for button status such as delete, move etc
            vm.isUserSelected = function () {
                for (var k in vm.userTableRowSelected) {
                    if (vm.userTableRowSelected[k]) {
                        return true;
                    }
                }
                return false;
            };

            vm.submitMoveUser = function () {
                var adminIDList = [];
                var adminNameList = [];
                $.each(vm.selectedUsers, function (i, v) {
                    adminIDList.push(i);
                    adminNameList.push(v.adminName);
                });
                var data = {
                    adminId: adminIDList,
                    curDepartmentId: vm.SelectedDepartmentNode.id,
                    newDepartmentId: vm.newDepartmentNode.id,
                    adminName: adminNameList
                };
                console.log(data);
                if (data.curDepartmentId == data.newDepartmentId) {
                    return;
                }
                socketService.$socket($scope.AppSocket, 'updateAdminDepartment', data, success, fail);
                function success(data) {
                    vm.selectedUsers = {};
                    vm.userTableRowSelected = {};
                    console.log(data);
                    vm.getAllDepartmentData();
                    vm.getDepartmentUsersData();
                    //$scope.safeApply();
                }

                function fail(data) {
                    console.log(data);
                }
            }

            vm.getAdminLog = function () {
                vm.processDataTableinModal('#modalThisAdminLog', '#thisAdminLogDataTable', {
                    "columns": [
                        {"width": "120px"},
                        {"width": "15%"},
                        {"width": "calc( 85% - 120px)"}
                    ]
                });
                utilService.actionAfterLoaded('#modalThisAdminLog .startTime', function () {
                    let start = utilService.createDatePicker('#modalThisAdminLog .startTime');
                    let end = utilService.createDatePicker('#modalThisAdminLog .endTime');
                    start.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
                    end.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                });
                vm.gettingAdminLog = true;
                socketService.$socket($scope.AppSocket, 'getAdminActionLog', {adminName: vm.curUser.adminName}, function (reply) {
                    console.log("getAdminActionLog reply:", reply);
                    vm.gettingAdminLog = false;
                    $scope.thisAdminLogData = reply.data;
                    vm.updateDataTableinModal('#modalThisAdminLog', '#thisAdminLogDataTable', {
                        "columns": [
                            {"width": "120px"},
                            {"width": "15%"},
                            {"width": "calc( 85% - 120px)"}
                        ]
                    });
                });
            }
            vm.updateAdminLog = function ($event) {
                var $queryDiv = $($event.currentTarget).parent().parent();
                var sendData = {adminName: vm.curUser.adminName};
                sendData.startDate = $queryDiv.find('.startTime').data('datetimepicker').getLocalDate();
                sendData.endDate = $queryDiv.find('.endTime').data('datetimepicker').getLocalDate();
                sendData.limit = parseInt($queryDiv.find('.limit').val());
                sendData.action = vm.filterAction;
                // console.log(startDate, endDate, limit);
                vm.gettingAdminLog = true;
                socketService.$socket($scope.AppSocket, 'getAdminActionLog', sendData, function (reply) {
                    $scope.thisAdminLogData = reply.data;
                    vm.gettingAdminLog = false;
                    vm.updateDataTableinModal('#modalThisAdminLog', '#thisAdminLogDataTable', {
                        "columns": [
                            {"width": "120px"},
                            {"width": "15%"},
                            {"width": "calc( 85% - 120px)"}
                        ]
                    });
                });

            }

            vm.processDataTableinModal = function (modalID, tableID, opt) {
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
            vm.generalDataTableOptions = {
                "paging": true,
                dom: 'tpl',
                "aaSorting": [],
                destroy: true,
                "scrollX": true,
                sScrollY: 350,
                scrollCollapse: true,
                order: [[0, "desc"]],
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
            //vm.userTableSelectedRow = function (rowUserId, status) {
            //    console.log("userTableSelectedRow", rowUserId, status);
            //};

            //=============end User functions

            //=============start role functions
            vm.activateRoleTab = function (callback) {

            };

            vm.roleInRoleListClicked = function (data) {
                vm.roleSelected = data;
                vm.showRole = data.views;
                vm.processRoleData();
                console.log("role clicked", vm.roleSelected);
                socketService.$socket($scope.AppSocket, 'getRole', {_id: vm.roleSelected._id}, success);
                function success(data) {
                    vm.roleUserList = data.data.users;
                    $scope.$digest();
                }

                $scope.safeApply();

                //socket.emit('getRole', {roleName: newRoleName});
            };

            vm.createRole = function () {
                vm.newRole = {};
                //vm.viewFlag = {};
                //vm.actionFlag = {};
                vm.showRole = {};

                vm.showRoleFlag = $.extend(true, {}, vm.departMaxViewList);
                $.each(vm.showRoleFlag, function (cate, cateData) {
                    $.each(cateData, function (sectionName, sectionData) {
                        $.each(sectionData, function (viewName, viewData) {
                            vm.showRoleFlag[cate][sectionName][viewName] = false;
                        });
                    });
                });
                vm.policytoggle = $.extend(true, {}, vm.departMaxViewList);
                vm.getIconList();
                vm.newRole.icon = vm.defaultRoleIcon;
                vm.startBlink('#roleName');
                vm.startBlink('#roleIcon');
                //$(modal).modal('hide');
                //console.log("viewflag", vm.viewFlag);
            }
            vm.clearAllBlink = function () {
                if (!vm.blinkObj) return;
                $.each(vm.blinkObj, function (i, v) {
                    clearInterval(v);
                })
            }
            vm.startBlink = function (id) {
                vm.blinkObj[id] = setInterval(blinkRoleIcon, 1000);
                function blinkRoleIcon() {
                    $(id).fadeOut(500).fadeIn(500);
                }
            }
            vm.stopBlink = function (id) {
                if (!id || !vm.blinkObj.hasOwnProperty(id)) {
                    return;
                }
                clearInterval(vm.blinkObj[id]);
            }
            vm.saveNewRole = function () {
                vm.processRoleForUpdate(vm.showRoleFlag);
                console.log('saveNewRole', vm.showRoleFlag);

                var sendData = {
                    roleName: vm.newRole.roleName,
                    icon: vm.newRole.icon,
                    views: vm.showRoleFlag,
                    departments: [vm.SelectedDepartmentNode.id],
                    platform: vm.selectedPlatform.id
                };

                vm.clearAllBlink();
                vm.pageActionStatus = 'null';

                console.log('sendData', sendData);
                socketService.$socket($scope.AppSocket, 'createRoleForDepartment', sendData, success);
                function success(data) {
                    //todo::store data to vm
                    vm.getDepartmentFullData();
                    console.log("ok", data);
                    if (data.data) {
                        vm.roleInRoleListClicked(data.data);
                    }
                    $scope.$digest();
                }
            }
            vm.showEditRole = function () {
                console.log("role selected", vm.roleSelected);
                vm.pageActionStatus = "editingRole";
                vm.processRoleData();
            }
            vm.deleteRole = function () {
                let sendData = {
                    _ids: [vm.roleSelected._id],
                    roleName: vm.roleSelected.roleName,
                    platform: vm.selectedPlatform.id
                };

                socketService.$socket($scope.AppSocket, 'deleteRolesById', sendData, success);
                function success(data) {
                    //todo::store data to vm
                    vm.getDepartmentFullData();
                    vm.getDepartmentUsersData();
                    $scope.safeApply();
                }
            }

            //remove false and empty object from object
            vm.compactObject = function (obj) {
                for (var k in obj) {
                    if (obj.hasOwnProperty(k) && (k === "show" || !obj[k] || (typeof obj[k] === 'object' && Object.keys(obj[k]).length <= 0) )) {
                        delete obj[k];
                    }
                }
            };

            //process role data for update, remove all false and empty object
            vm.processRoleForUpdate = function (roles) {
                if (roles) {
                    for (var category in roles) {
                        for (var subCategory in roles[category]) {
                            vm.compactObject(roles[category][subCategory]);
                        }
                    }
                    for (var category in roles) {
                        vm.compactObject(roles[category]);
                    }
                    vm.compactObject(roles);
                }
            };

            vm.submitUpdateRole = function () {
                //var datacontent = processRoleBeforeSubmit("update");
                vm.processRoleForUpdate(vm.showRoleFlag);
                console.log('submitUpdateRole', vm.showRoleFlag);
                var para = {
                    query: {
                        roleName: vm.roleSelected.roleName
                    },
                    updateData: {
                        roleName: vm.newRole.roleName,
                        icon: vm.newRole.icon,
                        views: vm.showRoleFlag
                    },
                    platform: vm.selectedPlatform.id
                };

                socketService.$socket($scope.AppSocket, 'updateRole', para, success);
                function success(data) {
                    vm.showRole = vm.showRoleFlag;
                    vm.processRoleData();
                    //vm.roleInRoleListClicked(vm.roleSelected);

                    vm.getDepartmentFullData();
                    vm.getDepartmentUsersData();
                    $scope.safeApply();
                }
            }

            vm.processRoleData = function () {
                console.log("vm.departMaxViewList", vm.departMaxViewList);
                console.log('vm.showRole', vm.showRole);
                // vm.showRoleFlag = {};
                vm.showRoleFlag = $.extend(true, {}, vm.departMaxViewList);
                $.each(vm.showRoleFlag, function (cate, cateData) {
                    $.each(cateData, function (sectionName, sectionData) {
                        $.each(sectionData, function (viewName, viewData) {
                            vm.showRoleFlag[cate][sectionName][viewName] = false;
                        });
                    });
                });
                vm.policytoggle = $.extend(true, {}, vm.departMaxViewList);
                if (!vm.showRole) return;

                // vm.policytoggle = $.extend(true, {}, vm.allView);

                //if role data is all, set all views to true
                if (vm.showRole.all) {
                    vm.showRole = $.extend(true, {}, vm.departMaxViewList);

                    $.each(vm.showRole, function (cate, cateData) {
                        if (cateData) {
                            $.each(cateData, function (sectionName, sectionData) {
                                vm.policytoggle[cate][sectionName].all = true;
                            });
                        }
                    });
                }

                vm.showRoleFlag = {};
                $.each(vm.departMaxViewList, function (cate, cateData) {
                    if (cateData) {
                        $.each(cateData, function (sectionName, sectionData) {
                            if (sectionData) {
                                var isAll = true;
                                $.each(sectionData, function (groupName, groupData) {
                                    if (groupData) {
                                        if (!vm.showRoleFlag.hasOwnProperty(cate)) {
                                            vm.showRoleFlag[cate] = {show: true}
                                        }
                                        if (!vm.showRole.hasOwnProperty(cate)) {
                                            vm.showRoleFlag[cate] = (vm.pageActionStatus == 'creatingNewRole' || vm.pageActionStatus == 'editingRole') ? {show: true} : {show: false};
                                        }
                                        if (!vm.showRoleFlag[cate].hasOwnProperty(sectionName)) {
                                            vm.showRoleFlag[cate][sectionName] = {show: true}
                                        }
                                        if (!(vm.showRole[cate] && vm.showRole[cate].hasOwnProperty(sectionName))) {
                                            vm.showRoleFlag[cate][sectionName] = (vm.pageActionStatus == 'creatingNewRole' || vm.pageActionStatus == 'editingRole') ? {show: true} : {show: false};
                                        }
                                        vm.showRoleFlag[cate][sectionName][groupName] = (vm.showRole[cate] && vm.showRole[cate][sectionName]) ? vm.showRole[cate][sectionName][groupName] : false;
                                        vm.policytoggle[cate][sectionName][groupName] = vm.showRoleFlag[cate][sectionName][groupName];
                                        if (!vm.showRoleFlag[cate][sectionName][groupName]) {
                                            isAll = false;
                                        }
                                    }
                                })
                                vm.policytoggle[cate][sectionName].all = isAll;
                            }
                        })
                    }
                });

                console.log("vm.showRoleFlag", vm.showRoleFlag, vm.pageActionStatus);
                console.log("vm.policytoggle", vm.policytoggle);
                $scope.safeApply();
            }
            vm.checkWhetherShow = function (cate, section, leaf) {
                //console.log('checkWhetherShow', cate, section, leaf);
                if (leaf == 'all')return false;
                if (vm.pageActionStatus == 'creatingNewRole' || vm.pageActionStatus == 'editingRole') {
                    return true;
                }
                if (!vm.showRoleFlag) {
                    return false
                }

                if (cate && !section && !leaf) {
                    return vm.showRoleFlag[cate] && vm.showRoleFlag[cate].show;
                }

                if (cate && section && !leaf) {
                    return vm.showRoleFlag[cate] && vm.showRoleFlag[cate][section] && vm.showRoleFlag[cate][section].show;
                }

                if (cate && section && leaf) {
                    return vm.showRoleFlag[cate][section][leaf];
                }

                return false;
            }
            vm.expandPolicySection = function (i) {
                vm.roleCategory = {};
                vm.roleCategory[i] = 'bg-pale';
                vm.policyCategory.title = i;
                $scope.safeApply();

            }
            // toggleAllSubCheckbox para ( bool, allViewObj, title, level)

            vm.toggleGroupPermissionCheckbox = function (value, cate, section) {
                console.log('toggleGroupPermissionCheckbox', value, cate, section);
                $.each(vm.departMaxViewList[cate][section], function (i, v) {
                    if (vm.showRoleFlag[cate]) {
                        // If the section is missing, create it
                        vm.showRoleFlag[cate][section] = vm.showRoleFlag[cate][section] || {};
                        vm.showRoleFlag[cate][section][i] = value;
                    }
                })
                $scope.safeApply();
            }

            vm.policyToggleCheck = function (bool, cate, section, leaf) {
                if (!bool && vm.policytoggle[cate][section]) {
                    vm.policytoggle[cate][section].all = false;
                }
            }

//=============end role function

            //Give sub department permission
            vm.showManageSubDepartmentPermissionModal = function () {
                vm.subRoleCategory = {};
                vm.subPolicyCategory = {};
                vm.subPolicytoggle = {};
                vm.subShowRole = null;
                vm.subShowRoleFlag = null;
                vm.currentDepartmentViews = {};
                vm.viewList = {};
                vm.showView = false;
                vm.notAllowToEditPermission = false;
                let departmentIds = authService.departmentIds();

                if (vm.SelectedDepartmentNode && vm.SelectedDepartmentNode.id) {
                    let sendData = {
                        departmentObjId: vm.SelectedDepartmentNode.id,
                        departmentIds: departmentIds
                    };

                    socketService.$socket($scope.AppSocket, 'getDepartmentById', sendData, function (data) {
                        console.log('getDepartmentById', data);
                        $scope.$evalAsync(() => {
                            if (data && data.data && data.data.hasOwnProperty('isParentExist') && data.data.hasOwnProperty('views')
                                && !data.data.isParentExist && (!data.data.views || Object.keys(data.data.views).length == 0)) {
                                vm.showView = true;
                                vm.viewList = vm.allView;

                                vm.processSubDepartmentRole(vm.viewList, vm.viewList, vm.viewList, false)

                            } else if (data && data.data && data.data.hasOwnProperty('isParentExist') && data.data.hasOwnProperty('views')
                                && !data.data.isParentExist && data.data.views && Object.keys(data.data.views).length > 0) {
                                vm.showView = true;
                                vm.viewList = vm.allView;

                                vm.processSubDepartmentRole(vm.viewList, data.data.views, vm.viewList, true);

                            } else if (data && data.data && data.data.hasOwnProperty('isParentExist') && data.data.hasOwnProperty('views')
                                && data.data.isParentExist && data.data.views && Object.keys(data.data.views).length > 0
                                && (!data.data.curViews || Object.keys(data.data.curViews).length == 0)) {

                                if(data.data.isParentsInDepartmentIdList){
                                    vm.showView = true;
                                    vm.viewList = data.data.views;

                                    vm.processSubDepartmentRole(vm.viewList, data.data.views, vm.viewList, false)
                                }else{
                                    vm.showView = false;
                                }


                            } else if (data && data.data && data.data.hasOwnProperty('isParentExist') && data.data.hasOwnProperty('views')
                                && data.data.isParentExist && data.data.views && data.data.curViews
                                && Object.keys(data.data.views).length > 0 && Object.keys(data.data.curViews).length > 0) {

                                vm.showView = true;

                                if(data.data.isParentsInDepartmentIdList){
                                    vm.viewList = data.data.views;

                                    vm.processSubDepartmentRole(vm.viewList, data.data.curViews, vm.viewList, true)
                                }else{
                                    vm.notAllowToEditPermission = true;
                                    vm.viewList = data.data.curViews;
                                    vm.processSubDepartmentRole(data.data.curViews,data.data.curViews, data.data.curViews, true)
                                }

                            } else {
                                vm.viewList = {};
                            }
                        });
                    });
                }
            };

            vm.processSubDepartmentRole = function (policyObj, showRolesObj, rolesObj, flag) {

                vm.subPolicytoggle = $.extend(true, {}, policyObj);
                vm.subShowRoleFlag = $.extend(true, {}, showRolesObj);
                let newViewListObj = {};
                //loop the viewSequence to order the viewList follow the specific sequence
                vm.viewSequence.forEach(
                    viewSequence => {
                        if(viewSequence){
                            let cate = viewSequence;
                            let cateData = rolesObj[viewSequence];
                            if (cateData) {
                                // loop the permission group to get the sub permission 
                                $.each(cateData, function (sectionName, sectionData) {
                                    if (sectionData) {
                                        let isAll = true;
                                        //loop the sub permission and check if it is ticked
                                        $.each(sectionData, function (viewName, viewData) {
                                            if (vm.subShowRoleFlag[cate] && vm.subShowRoleFlag[cate][sectionName] && vm.subShowRoleFlag[cate][sectionName][viewName]) {
                                                vm.subShowRoleFlag[cate][sectionName][viewName] = flag;
                                            }
                                            if (!vm.subShowRoleFlag[cate] || !vm.subShowRoleFlag[cate][sectionName] || !vm.subShowRoleFlag[cate][sectionName][viewName] ) {
                                                isAll = false;
                                            }
                                        });
                                        vm.subPolicytoggle[cate][sectionName].all = isAll;
                                    }
                                });
                            }

                            if(vm.viewList[viewSequence]){
                                newViewListObj[viewSequence] = vm.viewList[viewSequence];
                            }
                        }
                    }
                );

                vm.viewList = newViewListObj;
            };

            vm.expandSubPolicySection = function (i) {
                vm.subRoleCategory = {};
                vm.subRoleCategory[i] = 'bg-pale';
                vm.subPolicyCategory.title = i;
                $scope.$evalAsync();
            };

            vm.toggleSubGroupPermissionCheckbox = function (value, cate, section) {
                $.each(vm.viewList[cate][section], function (i, v) {
                    if (vm.subShowRoleFlag[cate]) {
                        // If the section is missing, create it
                        vm.subShowRoleFlag[cate][section] = vm.subShowRoleFlag[cate][section] || {};
                        vm.subShowRoleFlag[cate][section][i] = value;
                    } else {
                        // If the cate and section is missing, create it
                        vm.subShowRoleFlag[cate] = vm.subShowRoleFlag[cate] || {};
                        vm.subShowRoleFlag[cate][section] = vm.subShowRoleFlag[cate][section] || {};
                        vm.subShowRoleFlag[cate][section][i] = value;
                    }
                });
                $scope.$evalAsync();
            };

            vm.submitUpdateSubDepartmentPermission = function () {
                vm.processRoleForUpdate(vm.subShowRoleFlag);
                console.log('vm.subShowRoleFlag', vm.subShowRoleFlag);
                var para = {
                    query: {
                        _id: vm.SelectedDepartmentNode.id
                    },
                    updateData: {
                        views: vm.subShowRoleFlag
                    }
                };

                socketService.$socket($scope.AppSocket, 'updateDepartment', para, success);
                function success(data) {
                    $scope.$evalAsync(() => {
                        vm.subShowRole = vm.subShowRoleFlag;
                        vm.getDepartmentFullData();
                        vm.getDepartmentUsersData();
                        vm.getAllDepartmentData();
                    });
                }
            };

            vm.subPolicyToggleCheck = function (bool, cate, section, leaf) {
                if (!bool && vm.subPolicytoggle[cate][section]) {
                    vm.subPolicytoggle[cate][section].all = false;
                }
            };

            vm.allSubRoleSelection = function (flag) {
                vm.subShowRoleFlag = $.extend(true, {}, vm.viewList);
                $.each(vm.subShowRoleFlag, function (cate, cateData) {
                    $.each(cateData, function (sectionName, sectionData) {
                        $.each(sectionData, function (viewName, viewData) {
                            vm.subShowRoleFlag[cate][sectionName][viewName] = flag;
                        });
                        vm.subPolicytoggle[cate][sectionName].all = flag;
                    });
                });
            };
            //End of give sub department permission

//##Mark view and button related functions
// platform functions
            vm.activatePlatformTab = function () {
                if (!vm.showPlatformPage) {
                    return
                }
                vm.ownPlatforms = null;
                vm.otherPlatforms = null;
                vm.getAllPlatforms(function (data) {
                    vm.ownPlatforms = {};
                    vm.otherPlatforms = {};
                    if (!data) {
                        return;
                    }
                    $.each(data, function (i, v) {
                        vm.otherPlatforms[v._id] = v.name;
                    })
                    if (vm.allrelatedPlatform) {
                        $.each(vm.allrelatedPlatform, function (i, v) {
                            vm.ownPlatforms[v] = vm.otherPlatforms[v];
                            delete vm.otherPlatforms[v];
                        })
                    }
                    console.log("own", vm.ownPlatforms);
                    console.log("other", vm.otherPlatforms);
                    $scope.safeApply();
                });
            }

            vm.getAllPlatforms = function (callback) {
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    vm.allPlatform = data.data;
                    console.log("vm.allPlatform", vm.allPlatform);
                    if (typeof(callback) == 'function') {
                        callback(vm.allPlatform);
                    }
                });
            };
            vm.ownPlatformClicked = function (id, text) {
                console.log('id', id);
                console.log('id', vm.departmentID);
                $('#mainPlatform a.list-group-item[data-platform="' + id + '"]').fadeOut(vm.fadeTime).addClass('fly-right');
                //$('#mainPlatform a.list-group-item:contains(' + text + ')').fadeOut(vm.fadeTime)
                setTimeout(doit, vm.fadeTime);

                function doit() {
                    socketService.$socket($scope.AppSocket, 'removePlatformsFromDepartmentById', {
                        departmentId: vm.departmentID,
                        platformIds: [id],
                    }, function (data) {
                        console.log("platform removed");
                        vm.getDepartmentFullData();
                        vm.activatePlatformTab();
                    });
                }
            }
            vm.otherPlatformClicked = function (id, text) {
                console.log('id', id);
                console.log('id', vm.departmentID);
                $('#mainPlatform a.list-group-item[data-platform="' + id + '"]').fadeOut(vm.fadeTime).addClass('fly-left');

                setTimeout(doit, vm.fadeTime);

                function doit() {
                    socketService.$socket($scope.AppSocket, 'addPlatformsToDepartmentById', {
                        departmentId: vm.departmentID,
                        platformIds: [id],
                    }, function (data) {
                        vm.getDepartmentFullData();
                        vm.activatePlatformTab();
                    });
                }
            }
            // end platform functions

//##Mark scope functions

            //function initRoleAction() {
            //    //vm.policy = {
            //    //    actions: {},
            //    //    views: {},
            //    //    groups: [],
            //    //    users: []
            //    //};
            //    //vm.curPolicy = {};
            //    //vm.actionFlag = {};
            //}

            /*Socket functions*/

            //##Mark vm local common functions
            vm.displayArrayElementsName = function (arr, fieldName) {
                if (arr && fieldName) {
                    var nameList = "";
                    for (var i = 0; i < arr.length; i++) {
                        nameList += i > 0 ? (", " + arr[i][fieldName]) : arr[i][fieldName];
                    }
                    return nameList;
                }
            };
            //vm.displayLongArrayElementsName = function (arr, fieldName) {
            //    if (arr && fieldName) {
            //        var nameList = "";
            //        if (arr instanceof Array) {
            //            if (arr[0] && arr[0].hasOwnProperty(fieldName)) {
            //                nameList = arr[0][fieldName]
            //            } else return "";
            //            if (arr.length > 1) {
            //                nameList += "..."
            //            }
            //        } else return "";
            //    }
            //    return nameList;
            //};
            //vm.clear = function (id) {
            //    angular.element(document.querySelector(id)).html('');
            //    $scope.safeApply();
            //}

            vm.getAllAdminActions = function () {
                socketService.$socket($scope.AppSocket, 'getAllAdminActions', {}, function success(data) {
                    vm.allAdminActions = data.data;
                    console.log("vm.allAdminActions", vm.allAdminActions);
                });
            };

            vm.submitResetAdminPassword = function () {
                let sendData = {
                    adminId: vm.curUser._id,
                    adminName: vm.curUser.adminName,
                    platform: vm.selectedPlatform.id
                };
                socketService.$socket($scope.AppSocket, 'resetAdminPassword', sendData, function (data) {
                    vm.newAdminPassword = data.data;
                    $scope.safeApply();
                });
            }
            //##Mark local functions

            // $scope.$on('$viewContentLoaded', function () {
            var eventName = "$viewContentLoaded";
            if (!$scope.AppSocket) {
                eventName = "socketConnected";
                $scope.$emit('childControllerLoaded', 'dashboardControllerLoaded');
            }
            $scope.$on(eventName, function (e, d) {
                vm.loadPlatformData();
                setTimeout(
                    function () {
                        $scope.$parent.location = $location.path();
                        vm.SelectedDepartmentText = '';
                        vm.errorMessage = [];
                        vm.getAllAdminActions();
                        vm.getAllDepartmentData(function () {
                            vm.getDepartmentUsersData();
                        });
                        //initRoleAction();
                        vm.policyCategory = {};
                        vm.showRole = null;
                        vm.showRoleFlag = null;
                        vm.blinkObj = {};
                        vm.defaultRoleIcon = "fa fa-male";
                        vm.pageActionStatus = null;
                        setTimeout(function () {
                            //vm.drawUserTable([]);
                            $('#userSearch').keyup(function () {
                                vm.userTable.search($(this).val()).draw();
                            });
                            $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
                                $.fn.dataTable.tables({visible: true, api: true}).columns.adjust();
                            });
                        }, 200);
                        vm.fadeTime = 1000;

                        //if it is super admin, get all views permission
                        //else only get current role views permission
                        if (authService.isAdmin() && authService.roleData[0] && authService.checkViewPermission('Admin', 'Department', 'Read')) {
                            socketService.$socket($scope.AppSocket, 'getAllViews', '', function (data) {
                                vm.allView = data.data;
                                console.log('allview', vm.allView);
                                //buildViews(vm.allView);
                                $scope.safeApply();
                            });
                        }
                        else {
                            vm.allView = authService.roleData[0] ? authService.roleData[0].views : {};
                            //console.log('allview', vm.allView);
                            //buildViews(vm.allView);
                        }
                    }
                );

            });

            $(function(){
                setTimeout(() => {
                    $scope.$evalAsync(() => {
                        //if it is super admin, get all views permission
                        //else only get current role views permission
                        if (authService.isAdmin() && authService.roleData[0] && authService.checkViewPermission('Admin', 'Department', 'Read')) {
                            socketService.$socket($scope.AppSocket, 'getAllViews', '', function (data) {
                                vm.allView = data.data;
                                console.log('allview', vm.allView);
                                vm.getAllDepartmentData();
                            });
                        }
                        else {
                            vm.allView = authService.roleData[0] ? authService.roleData[0].views : {};
                            vm.getAllDepartmentData();
                        }
                    });
                },1000)
            });

            $scope.$on('switchPlatform', () => {
                $scope.$evalAsync(vm.loadPlatformData());
            });

            vm.loadPlatformData = function (option) {
                vm.showPlatformSpin = true;
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    console.log('all platform data', data.data);
                    vm.allPlatformData = data.data;
                    vm.showPlatformSpin = false;
                    //vm.buildPlatformList(data.data);

                    //select platform from cookies data
                    var storedPlatform = $cookies.get("platform");
                    if (storedPlatform) {
                        vm.searchAndSelectPlatform(storedPlatform, option);
                    }

                }, function (err) {
                    vm.showPlatformSpin = false;
                });
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
            };

            vm.getCtiUrlSubDomainList = () => {
                vm.ctiUrlSubDomains = [];
                $scope.$socketPromise("getCtiUrlSubDomainList", {}).then(data => {
                    if (data && data.data) {
                        vm.ctiUrlSubDomains = data.data;
                        $scope.$evalAsync();
                    }
                });
            };

        };
        mainPageController.$inject = injectParams;
        myApp.register.controller('mainPageCtrl', mainPageController);
    }
);
