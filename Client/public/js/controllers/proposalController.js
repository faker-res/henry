'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', '$log', 'socketService', '$translate', 'CONFIG'];

    var proposalController = function ($scope, $filter, $location, $log, socketService, $translate, CONFIG) {
        var $translate = $filter('translate');
        var vm = this;
        //get All proposal list
        vm.loadProposalTypeData = function () {
            socketService.$socket($scope.AppSocket, 'getAllProposalType', {}, function (data) {
                vm.buildProposalTypeList(data.data);
            });
        };
        vm.buildProposalTypeList = function (data, isRedraw) {
            vm.proposalTypeList = [];
            vm.selectedProposalType = {};
            if (data) {
                $.each(data, function (i, v) {
                    var obj = {
                        text: v.name,
                        data: v
                    }
                    vm.proposalTypeList.push(obj);
                });
            }
            $('#proposalTypeTree').treeview(
                {
                    data: vm.proposalTypeList,
                    highlightSearchResults: true
                }
            );
            //if (!isRedraw) {
            $('#searchProposalType').keyup(function () {
                $('#proposalTypeTree').treeview('search', [$(this).val(), {
                    ignoreCase: true,     // case insensitive
                    exactMatch: false,    // like or equals
                    revealResults: true,  // reveal matching nodes
                }]);

            });
            $('#proposalTypeTree').on('searchComplete', function (event, data) {
                var showAll = ($('#searchProposalType').val()) ? false : true;
                $('#proposalTypeTree li:not(.search-result)').each(function (i, o) {
                    if (showAll) {
                        $(o).show();
                    } else {
                        $(o).hide();
                    }
                });
                $('#proposalTypeTree li:has(.search-result)').each(function (i, o) {
                    $(o).show();
                });
            });
//}
            $('#proposalTypeTree').on('nodeSelected', function (event, data) {
                vm.selectedProposalType = data;
                //get process and steps data for selected proposal type
                vm.getProposalTypeProcessSteps();
                console.log("vm.selectedProposalType", vm.selectedProposalType);
                if (data.data.hasOwnProperty('executionType')) {
                    vm.selectedProposalType.exeTypeText = vm.allProposalExecutionType[data.data.executionType];
                } else {
                    vm.selectedProposalType.exeTypeText = 'value not set';
                }
                if (data.data.hasOwnProperty('rejectionType')) {
                    vm.selectedProposalType.rejTypeText = vm.allProposalRejectionType[data.data.rejectionType];
                } else {
                    vm.selectedProposalType.rejTypeText = 'value not set';
                }
                $scope.safeApply();
            });
        };
        vm.createProposalTypeForm = function () {
            vm.newProposal = {};

        }
        vm.createNewProposalType = function () {
            if (!vm.loadProposalTypeData) {
                return;
            }
            console.log(vm.newProposal);
            socketService.$socket($scope.AppSocket, 'createProposalType', vm.newProposal, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }
        vm.deleteProposalType = function () {
            console.log({_id: vm.selectedProposalType.data._id});
            socketService.$socket($scope.AppSocket, 'deleteProposalTypes', {_ids: [vm.selectedProposalType.data._id]}, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }
        vm.updateNewProposalType = function () {
            console.log({_id: vm.selectedProposalType.data._id});
            var sendData = {
                query: {_id: vm.selectedProposalType.data._id},
                updateData: vm.newProposal
            };
            socketService.$socket($scope.AppSocket, 'updateProposalType', sendData, success);
            function success(data) {
                //todo::store data to vm
                vm.loadProposalTypeData();
                $scope.$digest();
                if (typeof(callback) == 'function') {
                    callback(data.data);
                }
            }
        }

        // right panel required functions
        vm.loadAlldepartment = function () {
            socketService.$socket($scope.AppSocket, 'getAllDepartments', '', success);
            function success(data) {
                vm.departments = data.data;
                $scope.$digest();
            }
        }
        vm.initStep = function () {
            vm.tempNewNodeName = '';
            vm.tempNewNodeDepartment = '';
            vm.tempNewNodeRole = '';
        }
        vm.loadDepartmentRole = function (departmentNode) {
            vm.tempNewNodeDepartment = departmentNode;
            socketService.$socket($scope.AppSocket, 'getDepartment', {_id: departmentNode._id}, success);
            function success(data) {
                vm.tempDepartmentID = data.data._id;
                vm.tempDepartmentName = data.data.departmentName;
                vm.tempAllRoles = data.data.roles;
                $scope.safeApply();
            }
        }
        vm.setSelectedRole = function (roleNode) {
            if (!vm.tempNewNodeRole) return;
            vm.tempRoleID = roleNode._id;
            vm.tempRoleName = roleNode.roleName;
            console.log("selected department ", vm.tempDepartmentName);
            console.log("selected role ", vm.tempRoleName);
        }

        vm.clearData = function () {
            vm.loadAlldepartment();
            vm.tempNewNodeDepartment = {};
            $.each(vm.departments, function (i, v) {
                if (v.departmentName == vm.tempNodeDepartmentName) {
                    vm.tempEditDepartName = v.departmentName;
                    $scope.safeApply();
                    return true;
                }
            })
            vm.StepDepartmentUpdated();
        }

        vm.StepDepartmentUpdated = function () {
            $.each(vm.departments, function (i, v) {
                if (v.departmentName == vm.tempEditDepartName) {
                    vm.tempEditDepartID = v._id;
                    $scope.safeApply();
                    return true;
                }
            })

            socketService.$socket($scope.AppSocket, 'getDepartment', {_id: vm.tempEditDepartID}, success);
            function success(data) {
                vm.tempAllRoles = data.data.roles;
                $.each(vm.tempAllRoles, function (i, v) {
                    if (v.roleName == vm.tempNodeRoleName) {
                        vm.tempEditRoleName = v.roleName;
                        $scope.safeApply();
                        return true;
                    }
                })
                $scope.safeApply();
            }
        }
        vm.StepRoleUpdated = function () {
            $.each(vm.tempAllRoles, function (i, v) {
                if (v.roleName == vm.tempEditRoleName) {
                    //vm.tempEditRoleName = v.roleName;
                    vm.tempEditRoleID = v._id;
                    $scope.safeApply();
                    return true;
                }
            })
        }

        vm.updateProposalStepData = function () {
            var updateNode = {
                name: vm.tempNodeName,
                id: vm.curNodeID,
                departmentData: {id: vm.tempEditDepartID, name: vm.tempEditDepartName},
                roleData: {id: vm.tempEditRoleID, name: vm.tempEditRoleName}
            }
            vm.chartViewModel.updateNode(vm.curNodeID, updateNode);
            vm.tempNodeDepartmentName = vm.tempEditDepartName;
            vm.tempNodeRoleName = vm.tempEditRoleName;
            socketService.setProposalNodeData();
            $scope.safeApply();
        }
        $scope.$on('$viewContentLoaded', function () {

            setTimeout(
                function(){
                    vm.loadProposalTypeData();
                    vm.loadAlldepartment();

                    socketService.$socket($scope.AppSocket, 'getAllProposalExecutionType', '', successExe);
                    function successExe(data) {
                        vm.allProposalExecutionType = data.data;
                        $scope.$digest();
                    }

                    socketService.$socket($scope.AppSocket, 'getAllProposalRejectionType', '', successRej);
                    function successRej(data) {
                        vm.allProposalRejectionType = data.data;
                        $scope.$digest();
                    }

                    //
                    // Create the view-model for the chart and attach to the scope.
                    //
                    vm.chartViewModel = new flowchart.ChartViewModel();
                    vm.chartViewModel.setEditable(true);
                    vm.proposalChanged = false;

                    $scope.$watch(function () {
                        return socketService.getProposalNodeData()
                    }, function (newValue, oldValue) {
                        if (vm.editingNode) return;
                        if (newValue !== oldValue) {
                            if (!newValue)return;
                            vm.curNodeID = newValue.id;
                            vm.tempNodeName = newValue.name;
                            vm.tempNodeDepartmentName = newValue.departmentData.name;
                            vm.tempNodeDepartmentID = newValue.departmentData.id;
                            vm.tempNodeRoleName = newValue.roleData.name;
                            vm.tempNodeRoleID = newValue.roleData.id;
                            $scope.safeApply();
                        }
                    });
                }
            );

        });

        ////////////////////////////////////flow chart code///////////////////////////////////////
        //
        // Code for the delete key.
        //
        var deleteKeyCode = 46;

        //
        // Code for control key.
        //
        var ctrlKeyCode = 17;

        //
        // Set to true when the ctrl key is down.
        //
        var ctrlDown = false;

        //
        // Code for A key.
        //
        var aKeyCode = 65;

        //
        // Code for esc key.
        //
        var escKeyCode = 27;

        //
        // Selects the next node id.
        //
        var nextNodeID = 10;

        //
        // Event handler for key-down on the flowchart.
        //
        vm.keyDown = function (evt) {

            if (evt.keyCode === ctrlKeyCode) {

                ctrlDown = true;
                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        //
        // Event handler for key-up on the flowchart.
        //
        vm.keyUp = function (evt) {

            if (evt.keyCode === deleteKeyCode) {
                //
                // Delete key.
                //
                vm.chartViewModel.deleteSelected();
            }

            if (evt.keyCode == aKeyCode && ctrlDown) {
                //
                // Ctrl + A
                //
                vm.chartViewModel.selectAll();
            }

            if (evt.keyCode == escKeyCode) {
                // Escape.
                vm.chartViewModel.deselectAll();
            }

            if (evt.keyCode === ctrlKeyCode) {
                ctrlDown = false;

                evt.stopPropagation();
                evt.preventDefault();
            }
        };

        //
        // Add a new node to the chart.
        //
        vm.addNewNode = function () {
            //todo
            //var nodeName = prompt("Enter a node name:", "New node");
            //if (!nodeName) {
            //    return;
            //}

            //
            // Template for a new node.
            //
            var newNodeDataModel = {
                name: vm.tempNewNodeName,
                id: nextNodeID++,
                x: 150+(nextNodeID%3)*10,
                y: 150+(nextNodeID%3)*10,
                departmentData: {id: vm.tempDepartmentID, name: vm.tempDepartmentName, label:$translate("DEPARTMENT")},
                //departmentName: vm.tempNewNodeDepartment.departmentName,
                //roleName: vm.tempNewNodeRole.roleName,
                roleData: {id: vm.tempRoleID, name: vm.tempRoleName, label:$translate("ROLE")},
                inputConnectors: [
                    {
                        name: "X"
                    }
                ],
                outputConnectors: [
                    {
                        name: "APPROVE",
                        color: "#00ff00"
                    },
                    {
                        name: "REJECT",
                        color: "red"
                    }
                ]
            };

            vm.chartViewModel.addNode(newNodeDataModel);
        };

        //
        // Add an input connector to selected nodes.
        //
        vm.addNewInputConnector = function () {
            var connectorName = prompt("Enter a connector name:", "New connector");
            if (!connectorName) {
                return;
            }

            var selectedNodes = vm.chartViewModel.getSelectedNodes();
            for (var i = 0; i < selectedNodes.length; ++i) {
                var node = selectedNodes[i];
                node.addInputConnector({
                    name: connectorName
                });
            }
        };

        //
        // Add an output connector to selected nodes.
        //
        vm.addNewOutputConnector = function () {
            var connectorName = prompt("Enter a connector name:", "New connector");
            if (!connectorName) {
                return;
            }

            var selectedNodes = vm.chartViewModel.getSelectedNodes();
            for (var i = 0; i < selectedNodes.length; ++i) {
                var node = selectedNodes[i];
                node.addOutputConnector({
                    name: connectorName
                });
            }
        };

        //
        // Delete selected nodes and connections.
        //
        vm.deleteSelected = function () {
            vm.chartViewModel.deleteSelected();
            vm.proposalChanged=true;
        };

        vm.saveProcess = function () {
            console.log(vm.chartViewModel);
            if (vm.chartViewModel && vm.chartViewModel.nodes) {
                var steps = {};
                //build step data based on the node data
                for (var i = 0, leng = vm.chartViewModel.nodes.length; i < leng; i++) {
                    var node = vm.chartViewModel.nodes[i].data;
                    if (node.departmentData && node.roleData) {
                        steps[node.id] = {
                            title: node.name,
                            department: node.departmentData.id,
                            role: node.roleData.id
                        };
                    }
                    else {
                        socketService.showErrorMessage("Incorrect work flow data! Missing department or role!");
                    }
                }
                //build link for next strep based on connection data
                var links = {};
                for (var j = 0, leng = vm.chartViewModel.connections.length; j < leng; j++) {
                    var con = vm.chartViewModel.connections[j];
                    if (con && con.data && con.data.dest && con.data.source
                        && con.data.dest.nodeID > flowchart.ChartViewModel.FAIL_POINT
                        && con.data.source.nodeID > flowchart.ChartViewModel.FAIL_POINT) {
                        links[con.data.source.nodeID] = con.data.dest.nodeID;
                    }
                }
                if (links.length < steps.length - 1) {
                    socketService.showErrorMessage("Incorrect work flow data! Steps and links number doesn't match.");
                }
                console.log("steps", steps);
                console.log("links", links);
                vm.updateProposalTypeProcessSteps(steps, links);
            }
            else {
                socketService.showErrorMessage("Incorrect work flow data! No steps added.");
            }
        };

        vm.resetProcess = function () {
            vm.chartViewModel.resetToDefaultData()
        };

        vm.updateProposalTypeProcessSteps = function (steps, links) {
            if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process) {
                socketService.$socket($scope.AppSocket, 'updateProposalTypeProcessSteps', {
                    processId: vm.selectedProposalType.data.process,
                    steps: steps,
                    links: links
                }, function (data) {
                    console.log("updateProposalTypeProcessSteps", data);
                });
            }
            else {
                socketService.showErrorMessage("Incorrect proposal type data!");
            }
        };

        //get steps info for proposal type process
        vm.getProposalTypeProcessSteps = function () {
            if (vm.selectedProposalType && vm.selectedProposalType.data && vm.selectedProposalType.data.process) {
                socketService.$socket($scope.AppSocket, 'getProposalTypeProcessSteps', {
                    processId: vm.selectedProposalType.data.process
                }, function (data) {
                    console.log("getProposalTypeProcess", data);
                    vm.drawProcessSteps(data.data);
                });
            }
        };

        var startX = 70;
        var startY = 130;
        vm.drawProcessSteps = function (data) {
            startX = 70;
            startY = 60;
            vm.chartViewModel = new flowchart.ChartViewModel();
            if (data && data.process && data.steps && data.steps.length > 0 && data.process.steps.length > 0) {
                var steps = {};
                for (var i = 0; i < data.steps.length; i++) {
                    steps[data.steps[i]._id] = data.steps[i];
                }
                //draw node from the first step in the steps link list
                var nexStep = steps[data.process.steps[0]];
                while (nexStep) {
                    vm.addNodeFromStep(nexStep);
                    nexStep = steps[nexStep.nextStepWhenApprove];
                }
            } else {
                $('#flowChart').height(550);
            }
            vm.chartViewModel.deselectAll();
            $scope.safeApply();
        };

        vm.addNodeFromStep = function (data) {
            var newNodeDataModel = {
                name: data.title,
                id: nextNodeID++,
                x: startX,
                y: startY,
                departmentData: {id: data.department._id, name: data.department.departmentName, label:$translate("DEPARTMENT")},
                roleData: {id: data.role._id, name: data.role.roleName, label:$translate("ROLE")},
                inputConnectors: [
                    {
                        name: "X"
                    }
                ],
                outputConnectors: [
                    {
                        name: "APPROVE",
                        color: "#00ff00"
                    },
                    {
                        name: "REJECT",
                        color: "red"
                    }
                ]
            };
            var newNode = vm.chartViewModel.addNode(newNodeDataModel);
            newNode.select();

            startY += 150;
            if(startY>=550){
                $('#flowChart').height(startY+50);
                //console.log('vm.chartViewModel',vm.chartViewModel);
                vm.chartViewModel.points[1].data.y=startY;
            } else {
                $('#flowChart').height(550);
            }
        };
    };

    proposalController.$inject = injectParams;

    myApp.register.controller('proposalCtrl', proposalController);

});