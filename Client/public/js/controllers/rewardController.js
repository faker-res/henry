'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$scope', '$filter', '$location', '$log', 'socketService', 'CONFIG'];

        var rewardController = function ($scope, $filter, $location, $log, socketService, CONFIG) {
            var $translate = $filter('translate');
            var vm = this;
            //get All reward list
            vm.loadRewardData = function () {
                socketService.$socket($scope.AppSocket, 'getAllRewardRule', {}, function (data) {
                    vm.buildRewardList(data.data);
                });
            };
            vm.getAllRewardType = function () {
                socketService.$socket($scope.AppSocket, 'getAllRewardTypes', {}, function (data) {
                    console.log(data);
                    vm.allRewardType = data.data;
                    vm.rewardTypeData = {};
                    vm.rewardTypeParams = {};
                    vm.rewardTypeCondition = {};
                    $.each(vm.allRewardType, function (i, v) {
                        //console.log(i,v);
                        vm.rewardTypeData[v._id] = v;
                        if (v.hasOwnProperty('params')) {
                            vm.rewardTypeParams[v._id] = v.params.params;
                        } else {
                            vm.rewardTypeParams[v._id] = {};
                        }
                        if (v.hasOwnProperty('condition')) {
                            vm.rewardTypeCondition[v._id] = v.condition.condition;
                        } else {
                            vm.rewardTypeCondition[v._id] = {};
                        }
                    })
                    //console.log(vm.rewardTypeData, vm.rewardTypeParams, vm.rewardTypeCondition);
                });
            }
            vm.getAllProposalType = function () {
                //getAllProposalType
                socketService.$socket($scope.AppSocket, 'getAllProposalType', {}, function (data) {
                    //console.log(data);
                    vm.allProposalType = data.data;
                    $scope.safeApply();
                });
            }

            vm.buildRewardList = function (data, isRedraw) {
                vm.rewardList = [];
                vm.selectedReward = {};
                if (data) {
                    $.each(data, function (i, v) {
                        var obj = {
                            text: v.name,
                            data: v
                        }
                        vm.rewardList.push(obj);
                    });
                }
                $('#rewardTree').treeview(
                    {
                        data: vm.rewardList,
                        highlightSearchResults: true
                    }
                );
                //if (!isRedraw) {
                $('#searchReward').keyup(function () {
                    $('#rewardTree').treeview('search', [$(this).val(), {
                        ignoreCase: true,     // case insensitive
                        exactMatch: false,    // like or equals
                        revealResults: true,  // reveal matching nodes
                    }]);

                });
                $('#rewardTree').on('searchComplete', function (event, data) {
                    var showAll = ($('#searchReward').val()) ? false : true;
                    $('#rewardTree li:not(.search-result)').each(function (i, o) {
                        if (showAll) {
                            $(o).show();
                        } else {
                            $(o).hide();
                        }
                    });
                    $('#rewardTree li:has(.search-result)').each(function (i, o) {
                        $(o).show();
                    });
                });
                $('#rewardTree').on('nodeSelected', function (event, data) {
                    vm.rewardNodeClicked(data);
                });
            };
            vm.rewardNodeClicked = function (data) {
                if (!data) return;
                vm.curReward = data;
                socketService.$socket($scope.AppSocket, 'getRewardRuleById', {_id: data.data._id}, success);
                function success(data) {
                    vm.showReward = data.data;
                    console.log("vm.showReward", vm.showReward);
                    vm.platformRewardPageName = 'showReward';
                    vm.allParams = vm.rewardTypeParams[vm.showReward.rewardType._id];
                    vm.allConditionParams = vm.rewardTypeCondition[vm.showReward.rewardType._id];
                    vm.curRewardType = vm.rewardTypeData[vm.showReward.rewardType._id];
                    delete vm.showReward.rewardType;
                    vm.showReward.rewardType = vm.curRewardType._id;
                    $scope.safeApply();
                }
            }
            // vm.rewardTypeChanged = function () {
            //     console.log("now type id is", vm.showReward.rewardType);
            //     vm.allParams = vm.rewardTypeParams[vm.showReward.rewardType];
            //
            //     vm.allConditionParams = vm.rewardTypeCondition[vm.showReward.rewardType];
            //     vm.curRewardType = vm.rewardTypeData[vm.showReward.rewardType];
            //
            //     $.each(vm.allParams, function (i, v) {
            //         if (!vm.showReward.hasOwnProperty('param')) {
            //             vm.showReward.param = {};
            //         }
            //         switch (v.type) {
            //             case 'Number':
            //                 if (!vm.showReward.param[i]) {
            //                     vm.showReward.param[i] = 0;
            //                 }
            //                 break;
            //             case 'JSON':
            //                 if (!vm.showReward.param[i]) {
            //                     vm.showReward.param[i] = {};
            //                 }
            //                 break;
            //             case 'String':
            //                 if (!vm.showReward.param[i]) {
            //                     vm.showReward.param[i] = '';
            //                 }
            //                 break;
            //         }
            //     })
            //     for( var i = 0; i < vm.allProposalType.length; i++ ){
            //         if( vm.curRewardType.name === vm.allProposalType[i].name ){
            //             vm.showReward.executeProposal = vm.allProposalType[i]._id;
            //         }
            //     }
            //     $scope.safeApply();
            // }
            vm.createRewardForm = function () {
                if (vm.showReward) {
                    delete vm.showReward.param;
                }
                vm.showReward = {};
                vm.allParams = {};
                vm.curRewardType = {};
                //clean(vm.showReward);
                console.log("createRewardForm");
            }
            vm.submitReward = function () {
                if (vm.creationFlag == 'update') {
                    vm.updateReward();
                } else if (vm.creationFlag == 'create') {
                    vm.createNewReward();
                }
            }
            vm.createNewReward = function () {
                console.log("sending", vm.showReward);
                var typeName = vm.rewardTypeData[vm.showReward.rewardType].name;
                socketService.$socket($scope.AppSocket, 'createRewardRuleWithType', {
                    typeName: typeName,
                    ruleData: vm.showReward
                }, success);
                function success(data) {
                    //todo::store data to vm
                    vm.loadRewardData();
                    $scope.$digest();
                    if (typeof(callback) == 'function') {
                        callback(data.data);
                    }
                }
            }
            vm.deleteReward = function () {
                socketService.$socket($scope.AppSocket, 'deleteRewardRuleByIds', {_ids: [vm.showReward._id]}, success);
                function success(data) {
                    //todo::store data to vm
                    vm.loadRewardData();
                    $scope.$digest();
                    if (typeof(callback) == 'function') {
                        callback(data.data);
                    }
                }
            }
            vm.updateReward = function () {
                var sendData = {
                    query: {_id: vm.showReward._id},
                    updateData: vm.showReward
                };
                console.log("send update", sendData);
                socketService.$socket($scope.AppSocket, 'updateRewardRule', sendData, success);
                function success(data) {
                    //todo::store data to vm
                    vm.loadRewardData();
                    $scope.$digest();
                    if (typeof(callback) == 'function') {
                        callback(data.data);
                    }
                }
            }

            vm.getDBOptions = function (str, i) {
                if (!vm.DBString) {
                    vm.DBString = {};
                }
                socketService.$socket($scope.AppSocket, str, '', success);
                function success(data) {
                    vm.DBString[i] = data.data;
                    $scope.$digest();
                }
            }
            //=================may not being used naymore================   start
            vm.initContentProviderEditing = function () {
                vm.tempString = "";
                //vm.updateContentProviderSelected();
                vm.tempContentProviderSelected = {};
                if (!vm.rewardType.hasOwnProperty('contentProviderSelected')) return true;
                $.each(vm.allContentProvider, function (i, v) {
                    if (vm.rewardType.contentProviderSelected[i]) {
                        vm.tempContentProviderSelected[i] = true;
                        vm.tempString += '"' + $translate(v) + '", ';
                    } else {
                        vm.tempContentProviderSelected[i] = false;
                    }
                })
            }
            vm.updateContentProviderSelected = function () {
                vm.tempString = "";
                $.each(vm.allContentProvider, function (i, v) {
                    if (vm.tempContentProviderSelected[i]) {
                        vm.tempString += '"' + $translate(v) + '", ';
                    }
                })
                $scope.safeApply();
            }
            //mark local functions
            //=================may not being used naymore================   end


            function clean(obj) {
                if (typeof(obj) === 'object') {
                    $.each(obj, function (i, v) {
                        if (v) {
                            clean(v);
                            obj[i] = null;
                        }
                    })
                    obj = null;
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
                        vm.loadRewardData();
                        vm.isEditing = false;
                        vm.getAllRewardType();
                        vm.getAllProposalType();

                        vm.allContentProvider = {}
                        vm.edtingContentProvider = false;
                        $scope.$watch(function () {
                            return vm.isEditing;
                        }, function (newV, oldV) {
                            if (newV !== oldV) {
                                if (newV) {
                                    //$('#rewardDetail :input').addClass('highlightBorder');
                                    $('#rewardTree').fadeOut(2000);
                                } else {
                                    //$('#rewardDetail :input').removeClass('highlightBorder');
                                    $('#rewardTree').fadeIn(1000);
                                }
                            }
                        })
                        for (var i = 0; i < 10; i++) {
                            vm.allContentProvider[i] = "content provider" + i;
                        }
                        vm.allContentProviderType = ["casual", "card", "sport", "casual1", "card1", "sport1", "casual2", "card2", "sport2"];
                        vm.allPlayerType = ["Diamond VIP", "VIP", "Normal", "New"];
                    }
                );
            });
        };

        rewardController.$inject = injectParams;

        myApp.register.controller('rewardCtrl', rewardController);

    }
)
;