/******************************************************************
 *        NinjaPandaManagement-new
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

'use strict';

define(['js/app'], function (myApp) {

    var injectParams = ['$scope', '$filter', '$location', 'AppService', 'socketService', 'authService'];

    var TestRewardController = function ($scope, $filter, $location, AppService, socketService, authService) {

        var $translate = $filter('translate');
        var vm = this;

        //////////////////////////Initial data socket functions//////////////////////////////

        vm.getAllRewardTypes = function () {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getAllRewardTypes', '', function (data) {
                vm.allRewardTypes = {}; //data.data;
                for (var i = 0; i < data.data.length; i++) {
                    vm.allRewardTypes[data.data[i].name] = data.data[i];
                }
                console.log("vm.allRewardTypes", vm.allRewardTypes);
                deferred.resolve(true);
            }, function (data) {
                deferred.reject(data);
            });

            return deferred.promise;
        };

        vm.getAllPlatforms = function () {
            var deferred = Q.defer();

            socketService.$socket($scope.AppSocket, 'getAllPlatforms', {}, function (data) {
                vm.platforms = data.data;
                deferred.resolve(true);
            }, function (error) {
                deferred.reject(error);
            });

            return deferred.promise;
        };

        $scope.$on('$viewContentLoaded', function () {
            Q.all(
                [vm.getAllRewardTypes(), vm.getAllPlatforms()]
            ).then(
                function (data) {
                    //todo::refactor the process here
                    vm.buildTestList(vm.testListData);

                    //load default test data
                    vm.wctuLoadDefaultData();
                },
                function (error) {
                }
            );

            //init local variables
            vm.gpRewardEvent = true;
            $scope.safeApply();
        });

        ///////////////////////////////test list functions/////////////////////////////
        vm.testListData = [
            {
                _id: 0,
                name: "GameProviderRewardEventTest"
            },
            //{
            //    _id: 1,
            //    name: "WeeklyConsecutiveTopUpTest"
            //},
            {
                _id: 2,
                name: "OperationTest"
            }
        ];

        //build platform list based on platform data from server
        vm.buildTestList = function (data) {
            vm.testList = [];
            for (var i = 0; i < data.length; i++) {
                vm.testList.push(vm.createTestNode(data[i]));
            }
            $('#testTree').treeview(
                {
                    data: vm.testList,
                    highlightSearchResults: false
                }
            );
            console.log("vm.testList", vm.testList);
            vm.selectTestNode($('#testTree').treeview('getNode', 0));
            $('#testTree').on('nodeSelected', function (event, data) {
                vm.selectTestNode(data);
            });
            //select cur test name
            if (vm.curTestText) {
                vm.searchAndSelectTest(vm.curTestText);
            }
        };

        //create platform node for platform list
        vm.createTestNode = function (v) {
            var obj = {
                text: v.name,
                id: v._id,
                selectable: true,
                data: v
            };
            return obj;
        };

        vm.searchTest = function () {
            //select cur test name
            if (vm.testSearchText) {
                vm.searchAndSelectTest(vm.testSearchText);
            }
        };

        vm.searchAndSelectTest = function (text) {
            var findNodes = $('#testTree').treeview('search', [text, {
                ignoreCase: true,
                exactMatch: false,
                revealResults: true,
            }]);
            if (findNodes && findNodes.length > 0) {
                vm.selectTestNode(findNodes[0]);
                $('#testTree').treeview('selectNode', [findNodes[0], {silent: true}]);
            }
        };

        //set selected test node
        vm.selectTestNode = function (node) {
            vm.selectedTestNode = node;
            vm.curTestText = node.text;

            $scope.safeApply();
        };

        ////////////////////////////weekly consecutive top up///////////////////////////////
        vm.wctuLoadDefaultData = function () {
            socketService.$socket($scope.AppSocket, 'getTestWeeklyConsecutiveTopUpReward', {}, function (data) {
                vm.wctuTestData = data.data;
                $scope.safeApply();
            });
        };

        vm.wctuRunTest = function () {
            var testData = {};
            socketService.$socket($scope.AppSocket, 'testWeeklyConsecutiveTopUpReward', testData, function (data) {
                vm.wctuShowTestResult = true;
                vm.wctuTestResult = data.data;
                $scope.safeApply();
            });
        };

        /////////////////////////// Operation Test //////////////////////////
        // get all platforms and its players
        vm.tutSelectPlatform = function () {
            console.log("vm.tutCurPlatformId", vm.tutCurPlatformId);
            socketService.$socket($scope.AppSocket, 'getPlayersByPlatform', {platform: vm.tutCurPlatformId}, function (data) {
                vm.tutPlayers = data.data;
                $scope.safeApply();
            });
        };

        // get player detail
        vm.tutSelectPlayer = function () {
            console.log("vm.tutCurPlayerId", vm.tutCurPlayerId);
            for (var i = 0; i < vm.tutPlayers.length; i++) {
                if (vm.tutPlayers[i]._id === vm.tutCurPlayerId) {
                    vm.tutSelectPlayer = vm.tutPlayers[i];
                }
            }
        };

        vm.playerRegistrationTest = function () {
            console.log("vm.newRegRecord", vm.newRegRecord);
            socketService.$socket($scope.AppSocket, 'createPlayerRegistrationIntentRecord', vm.newRegRecord, function (data) {

            });
        };

        //create test player top up intent record
        vm.createPlayerTopUpIntentRecord = function () {
            var recordData = {
                playerId: vm.tutSelectPlayer.playerId,
                playerName: vm.tutSelectPlayer.name,
                platformId: vm.tutCurPlatformId,
                mobile: vm.tutSelectPlayer.phoneNumber,
                status: 1
            };
            console.log("vm.tutSelectPlayer", recordData);
            socketService.$socket($scope.AppSocket, 'createPlayerTopUpIntentRecord', recordData, function (data) {
                vm.tutRecord = data.data;
                console.log("vm.tutRecord", vm.tutRecord);
            }, function(error){
                console.log(error);
            });
        };

        ///////////////////////////////game provider test functions/////////////////////////////
        vm.gameProviderRewardTest = function () {
            var data = {
                ruleName: "GameProviderReward",
                rewardAmount: 200
            };
            socketService.$socket($scope.AppSocket, 'testGameProviderReward', data, function (data) {

            });
        };

        //get all test platforms
        vm.gpSelectPlatform = function () {
            console.log("vm.gpCurPlatformId", vm.gpCurPlatformId);
            socketService.$socket($scope.AppSocket, 'getRewardEventsForPlatform', {platform: vm.gpCurPlatformId}, function (data) {
                vm.gpRewardEvents = data.data;
                console.log("vm.gpRewardEvents", vm.gpRewardEvents);
                vm.gpRewardEvent = null;
                //check if there is game provider reward event for this platform
                for (var i = 0; i < vm.gpRewardEvents.length; i++) {
                    if (vm.gpRewardEvents[i].type == vm.allRewardTypes["GameProviderReward"]._id) {
                        vm.gpRewardEvent = vm.gpRewardEvents[i];
                    }
                }
                if (vm.gpRewardEvent) {
                    socketService.$socket($scope.AppSocket, 'getPlayersByPlatform', {platform: vm.gpCurPlatformId}, function (data) {
                        vm.gpPlayers = data.data;
                        $scope.safeApply();
                    });
                }
                $scope.safeApply();
            });
        };

        //select player to apply for reward event
        vm.gpSelectPlayer = function () {
            console.log("vm.gpCurPlayerId", vm.gpCurPlayerId);
        };

        //test player apply for game provider reward event
        vm.gpPlayerApplyReward = function () {
            socketService.$socket(
                $scope.AppSocket, 'applyForGameProviderReward',
                {platform: vm.gpCurPlatformId, playerId: vm.gpCurPlayerId},
                function (data) {
                    if (data.data.proposalId) {
                        vm.gpRewardProposal = data.data;
                    }
                    else {
                        vm.gpRewardTask = data.data;
                    }
                    console.log("vm.gpRewardProposal", vm.gpRewardProposal);
                    console.log("vm.gpRewardTask", vm.gpRewardTask);
                    $scope.safeApply();
                });
        };

        //approve or reject reward proposal
        vm.gpUpdateProposal = function (bApprove) {
            socketService.$socket($scope.AppSocket, 'updateProposalProcessStep', {
                proposalId: vm.gpRewardProposal._id,
                adminId: authService.adminId,
                memo: bApprove ? "Approved" : "Rejected",
                bApprove: bApprove
            }, function (data) {
                vm.gpRewardTask = data.data;
                console.log("vm.gpRewardTask", vm.gpRewardTask);

                $scope.safeApply();
            });
        };

        //reset the test
        vm.gpReset = function () {
            vm.gpCurPlatformId = null;
            vm.gpRewardEvents = null;
            vm.gpPlayers = null;
            vm.gpRewardProposal = null;
            vm.gpRewardTask = null;
        };
    };

    TestRewardController.$inject = injectParams;

    myApp.register.controller('testRewardCtrl', TestRewardController);

});
