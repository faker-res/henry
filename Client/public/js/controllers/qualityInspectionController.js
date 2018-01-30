'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$sce', '$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies", "$timeout", '$http', 'uiGridExporterService', 'uiGridExporterConstants'];

        var qualityInspectionController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {

            var $translate = $filter('translate');
            var vm = this;

            // For debugging:
            window.VM = vm;

            vm.evaluationAppealStatus = {
                APPEALING: 5,
                APPEAL_COMPLETED: 6
            };

            vm.constQualityInspectionStatus = {
                1: "PENDINGTOPROCESS",
                2: "COMPLETED_UNREAD",
                3: "COMPLETED_READ",
                4: "COMPLETED",
                5: "APPEALING",
                6: "APPEAL_COMPLETED",
                7: "NOT_EVALUATED"
            };
            vm.constQualityInspectionStatusCN = {
                '1': "待处理",
                '2': "已完成（未读）",
                '3': "已完成（已读）",
                '4': "已完成（免读）",
                '5': "申诉中",
                '6': "申诉结案",
                '7': "不评估（无效）",
                'all': "ALL"
            }
            vm.unreadEvaluationSelectedRecord = [];

            vm.roleType = {
                1: '客服',
                2: '访客',
                3: 'System'
            }
            vm.conversationStatus = {
                1: 'pending',
                2: 'completed(unread)',
                3: 'completed(read)',
                4: 'completed',
                5: 'appealing',
                6: 'appeal completed',
                7: 'not evaluated(invalid)'
            }
            vm.rateMsgId = null;

            vm.isChecked;

            vm.unreadEvaluationRecord = {
                totalCount: 0,
                currentPage: 1,
                index: 0,
                limit: 10,
                pageSize: 1,
                pageArr: []
            }

            vm.readEvaluationRecord = {
                totalCount: 0,
                currentPage: 1,
                index: 0,
                limit: 10,
                pageSize: 1,
                pageArr: []
            }

            vm.appealEvaluationRecord = {
                totalCount: 0,
                currentPage: 1,
                index: 0,
                limit: 10,
                pageSize: 1,
                pageArr: []
            }

            //vm.unReadEvaluation = {};


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
            vm.filterPlatform = function(){
              // vm.companyIds
              let platforms = vm.platformList.filter(item=>{
                 if(vm.inspection800.platform.indexOf(item.data._id)!=-1){
                   return item;
                 }
              });
              let csDepartmentMember = [];
              let qiDepartmentMember = [];
              let companyIds = [];
                platforms.map(item => {

                    //store live800companyId;
                    if (item.data.live800CompanyId.length > 0) {
                        item.data.live800CompanyId.forEach(cId => {
                            if (companyIds.indexOf(cId) == -1) {
                                companyIds.push(cId);
                            }
                        })
                    }

                    if (item.data.livecompanyIds && item.data.livecompanyIds.indexOf(item.data.live800CompanyId) == -1)
                        companyIds = companyIds.concat(item.data.live800CompanyId);
                    //store CS department
                    item.data.csDepartment.forEach(cItem => {
                        csDepartmentMember = csDepartmentMember.concat(cItem.users);
                    })

                    //store QI department
                    item.data.qiDepartment.forEach(qItem=>{
                        qiDepartmentMember = qiDepartmentMember.concat(qItem.users);
                    })

                })
              vm.getCSDepartmentMember(csDepartmentMember);
              vm.getQIDepartmentMember(qiDepartmentMember);
              vm.companyIds = companyIds;
            }
            vm.getQIDepartmentMember = function(qiMembers){
                socketService.$socket($scope.AppSocket, 'getQIAdmins', {admins: qiMembers}, function (qdata) {
                    console.log('all admin data', qdata.data);
                    vm.qiDepartments = [];

                    if(qdata.data.length > 0){
                        qdata.data.forEach(item=>{
                            console.log(item);
                            let qiUser = {};
                            qiUser._id = item._id;
                            qiUser.name = item.adminName;
                            vm.qiDepartments.push(qiUser);
                        })
                    }
                    $scope.safeApply();
                }, function (err) {
                });
            }
            vm.getCSDepartmentMember = function(csMembers){
              socketService.$socket($scope.AppSocket, 'getCSAdmins', {admins: csMembers}, function (cdata) {
                  console.log('all admin data', cdata.data);
                  let fpmsACCList = [];
                  let live800Accs = [];
                  cdata.data.forEach(item=>{
                    let liveAccSet = item.live800Acc.filter(live800=>{ return live800 != '' });
                    let acc = {
                      _id:item._id,
                      name:item.adminName,
                      live800Acc:liveAccSet
                    }
                    fpmsACCList.push(acc);
                  })
                  vm.fpmsACCList = fpmsACCList;
                  $scope.safeApply();
              }, function (err) {
              });
            }
            vm.loadLive800Acc = function(){
                let live800Accs = [];
                vm.fpmsACCList.forEach(item=>{
                    live800Accs = live800Accs.concat(item.live800Acc);
                })
                vm.live800Accs = live800Accs;
            }
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
                // Initial setting for setting in qualityInspection
                vm.getOvertimeSetting();
                // create the conversationDefinition object for old platform
                let query = {_id: vm.selectedPlatform.id, conversationDefinition: {$exists: true}};
                socketService.$socket($scope.AppSocket, 'getPlatformSetting', query, function (data) {
                    if (data.data.length === 0) {
                        let sendData = {
                            query: {_id: vm.selectedPlatform.id},
                            updateData: {
                                'conversationDefinition.totalSec': 40,
                                'conversationDefinition.askingSentence': 2,
                                'conversationDefinition.replyingSentence': 2
                            }
                        };
                        socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                            vm.loadPlatformData({loadAll: false});
                            $scope.safeApply();
                        });

                    }

                });
                vm.getConversationDefinition();


                // socketService.$socket($scope.AppSocket, 'getDepartmentsbyPlatformObjId', [], function (data){
                //     let sendQuery ={
                //         departments: {$in: data.data}
                //     };
                //     socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){
                //         vm.selectedCSAccount = [];
                //         if (data && data.data){
                //             data.data.forEach(acc => {
                //                 if (acc.live800Acc && acc.live800Acc.length > 0){
                //                     vm.selectedCSAccount.push(acc);
                //                 }
                //             });
                //         }
                //         console.log("vm.selectedCSAccount", vm.selectedCSAccount);
                //         //$scope.safeApply();
                //         // // have to re-initiate the #selectCSAccount to show data
                //         // setTimeout(function () {
                //         //     $('select#selectCSAccount').multipleSelect();
                //         // });
                //
                //     });
                // });

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

            vm.toggleShowPlatformDropDownList = function () {
                vm.showPlatformDropDownList = !vm.showPlatformDropDownList;

                $scope.safeApply();
            };

            vm.showPlatformDetailTab = function (tabName) {
                vm.selectedPlatformDetailTab = tabName == null ? "backstage-settings" : tabName;
                if (tabName && tabName == "player-display-data") {
                    vm.initPlayerDisplayDataModal();
                } else if (tabName && tabName == "partner-display-data") {
                    vm.initPartnerDisplayDataModal();
                } else if (tabName && tabName == "system-settlement") {
                    vm.prepareSettlementHistory();
                }
            };
            vm.storeBatchId = function(isCheck, conversation){
                vm.batchEditList = [];
                $('body .batchEdit:checked').each( function(){
                    vm.batchEditList.push($(this).val());
                })
            };
            vm.batchSave = function(){
                console.log(vm.batchEditList);
                socketService.$socket($scope.AppSocket, 'rateBatchConversation', {batchData:vm.batchEditList}, function(data){
                    // console.log(data);
                    vm.searchLive800();
                });

            };
            vm.nextPG = function(){
                vm.pgn.index = (vm.pgn.currentPage+1)*vm.pgn.limit;
                vm.pgn.currentPage += 1;
                vm.searchLive800();
            };
            vm.gotoPG = function(pg, $event){
                $('body .pagination li').removeClass('active');
                if($event){
                    $($event.currentTarget).addClass('active');
                }
                let pgNo = null;
                if(pg==0){
                    pgNo = 0
                }else if(pg > 1){
                    pgNo = pg;
                }
                vm.pgn.index = (pgNo*vm.pgn.limit);
                vm.pgn.currentPage = pgNo;
                vm.searchLive800();
            },
            vm.searchLive800 = function(){
                $('#searchingQualityInspection').show();
                let fpmsId = [];
                if(vm.fpmsACCList.length > 0){
                  vm.fpmsACCList.map(item=>{
                    fpmsId.push(item.name);
                  })
                }else{
                    fpmsId = [];
                }
                var query = {
                        // 'companyId':270,
                        // 'operatorId':764,
                        'companyId':vm.companyIds,
                        'fpmsAcc':vm.inspection800.fpms || [],
                        'operatorId':vm.inspection800.live800Accs,
                        'startTime': $('#live800StartDatetimePicker').data('datetimepicker').getLocalDate(),//'2018-01-16 00:00:00',
                        'endTime': $('#live800endDatetimePicker').data('datetimepicker').getLocalDate(),//'2018-01-16 00:05:00',
                        'status':vm.inspection800.status ? vm.inspection800.status : null,
                        'limit':vm.pgn.limit,
                        'index':vm.pgn.index
                };
                if(vm.inspection800.qiUser && vm.inspection800.qiUser.length > 0){
                    query['qualityAssessor'] = vm.inspection800.qiUser;
                }
                socketService.$socket($scope.AppSocket, 'searchLive800', query, success);
                function success(data) {
                    let overtimeSetting = vm.selectedPlatform.data.overtimeSetting;

                    data.data.forEach(item=>{
                        item.statusName = item.status ? $translate(vm.constQualityInspectionStatus[item.status]): $translate(vm.constQualityInspectionStatus[1]);
                        item.conversation.forEach(function(cv){
                            cv.displayTime = utilService.getFormatTime(parseInt(cv.time));
                            let otsLength = overtimeSetting.length -1;
                            let colors = '';
                            overtimeSetting.forEach((ots,i)=>{
                                if(cv.roles==1){
                                    if(i==0){
                                        if(cv.timeoutRate >= overtimeSetting[0].presetMark){
                                            colors = overtimeSetting[0].color;
                                        }
                                    }else if(i==otsLength){
                                        if(cv.timeoutRate <= overtimeSetting[otsLength].presetMark){
                                            colors = overtimeSetting[i].color;
                                        }
                                    }else{
                                        if(cv.timeoutRate < overtimeSetting[i-1].presetMark && cv.timeoutRate > overtimeSetting[i+1].presetMark){
                                            colors = overtimeSetting[i].color;
                                        }
                                    }
                                }
                            });
                            cv.colors = colors;
                            return cv;
                        });
                        item.editable = false;


                        return item;
                    });
                    vm.conversationForm = data.data;
                    $('#searchingQualityInspection').hide();
                    $scope.safeApply();
                }

                socketService.$socket($scope.AppSocket, 'countLive800', query, successFunc);
                function successFunc(data) {
                    if(data.data){
                        vm.pgn.totalPage = data.data / vm.pgn.limit;
                        vm.pgn.count = data.data;
                    }
                    vm.pgnPages = [];
                    for(let a = 0; a < vm.pgn.totalPage;a++){
                        vm.pgnPages.push(a);
                    }

                    $scope.safeApply();
                }
            };
            vm.confirmRate = function(rate){
                console.log(rate);
                rate.editable = false;
                socketService.$socket($scope.AppSocket, 'rateCSConversation', rate, function(data){
                    console.log(data);
                    vm.searchLive800();
                });
            }
            vm.showLive800 = function(){
                vm.initLive800Start();
                vm.fpmsACCList = [];
                vm.batchEditList = [];
                vm.inspection800 = {};
                vm.inspection800.fpms = [];
                vm.inspection800.status = '1';
                vm.inspection800.qiUser = 'all';
                vm.pgn = {index:0, currentPage:1, totalPage:1, limit:5, count:1};

                setTimeout(function(){
                    $scope.safeApply();
                },0)

            }

            var eventName = "$viewContentLoaded";
            if (!$scope.AppSocket) {
                eventName = "socketConnected";
                $scope.$emit('childControllerLoaded', 'qualityInspectionControllerLoaded');
            }

            vm.initLive800Start = function(){
                $('#live800StartDatetimePicker').datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss',
                    pick12HourFormat: true
                });
                $('#live800StartDatetimePicker').data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                $('#live800endDatetimePicker').datetimepicker({
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss',
                    pick12HourFormat: true
                });
                $('#live800endDatetimePicker').data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());
            }

            vm.initUnreadEvaluation = function(){
                if(vm.selectedPlatform){
                    vm.evaluationTab = 'unreadEvaluation';
                    $('#unreadEvaluationStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#unreadEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                    $('#unreadEvaluationEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#unreadEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));
                }
            };

            vm.initReadEvaluation = function(){
                if(vm.selectedPlatform) {
                    $('#readEvaluationStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#readEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                    $('#readEvaluationEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#readEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));
                }
            }

            vm.initAppealEvaluation = function(){
                if(vm.selectedPlatform) {
                    $('#conversationStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#conversationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                    $('#conversationEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#conversationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));

                    $('#appealEvaluationStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#appealEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                    $('#appealEvaluationEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#appealEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));
                }
            }

            vm.initWorkloadProgress = function(){
                if(vm.selectedPlatform) {
                    vm.inspectionReportTab ='workloadReport';
                    $('#reportConversationStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#reportConversationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                    $('#reportConversationEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#reportConversationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));

                    let qaDepartmentMember = [];
                    if (vm.selectedPlatform && vm.selectedPlatform.data && vm.selectedPlatform.data.qiDepartment && vm.selectedPlatform.data.qiDepartment.length > 0) {
                        vm.selectedPlatform.data.qiDepartment.forEach(qItem => {
                            qaDepartmentMember = qaDepartmentMember.concat(qItem.users);
                        })
                    }

                    if (qaDepartmentMember && qaDepartmentMember.length > 0) {
                        socketService.$socket($scope.AppSocket, 'getQIAdmins', {admins: qaDepartmentMember}, function (qdata) {
                            console.log('all admin data', qdata.data);
                            vm.qaDepartments = [];

                            if (qdata.data.length > 0) {
                                qdata.data.forEach(item => {
                                    console.log(item);
                                    let qaAccount = {};
                                    qaAccount._id = item._id;
                                    qaAccount.name = item.adminName;
                                    vm.qaDepartments.push(qaAccount);
                                })
                            }
                            $scope.safeApply();
                        }, function (err) {
                        });
                    }
                }
            }

            vm.initEvaluationProgress = function() {
                if(vm.selectedPlatform) {
                    vm.evaluationProgressYearMonth = []
                    socketService.$socket($scope.AppSocket, 'getEvaluationRecordYearMonth', {platformObjId: vm.selectedPlatform.id}, function (data) {

                        if (data && data.data && data.data.length > 0) {

                            data.data.forEach(data => {
                                if (data && data._id && data._id.month && data._id.year) {
                                    let month = data._id.month.toString();
                                    if (month.length < 2) {
                                        month = "0" + month;
                                    }
                                    vm.evaluationProgressYearMonth.push({month: month, year: data._id.year});
                                    //vm.evaluationProgressYearMonth.push({date: data._id.year + " - " + month});
                                }

                            })

                            $scope.safeApply();
                        }
                    });
                }
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

            vm.commonPageChangeHandler = function (curP, pageSize, objKey, searchFunc) {
                var isChange = false;
                if (!curP) {
                    curP = 1;
                }
                if (pageSize != vm[objKey].limit) {
                    isChange = true;
                    vm[objKey].limit = pageSize;
                }
                if ((curP - 1) * pageSize != vm[objKey].index) {
                    isChange = true;
                    vm[objKey].index = (curP - 1) * pageSize;
                }
                if (isChange) return searchFunc.call(this);
            };

            vm.endLoadMultipleSelect = function () {
                $timeout(function () {
                    $('.spicker').selectpicker('refresh');
                }, 0);
            };

            //////////////////////////////////////////////////////////Start of Evaluation Tab///////////////////////////////////////////////////////////////////
            vm.getUnreadEvaluationRecord = function(page) {
                vm.loadingUnreadEvaluationTable = true;
                var startTime = $('#unreadEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#unreadEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                if(page){
                    vm.unreadEvaluationRecord.index = (page - 1) * vm.unreadEvaluationRecord.limit;
                }

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    index: vm.unreadEvaluationRecord.index ? vm.unreadEvaluationRecord.index : 0,
                    limit: vm.unreadEvaluationRecord.limit ? vm.unreadEvaluationRecord.limit : 10,
                }

                socketService.$socket($scope.AppSocket, 'getUnreadEvaluationRecord', sendData, function (data) {

                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                if(data.conversation){
                                    data.conversation.forEach(function(cv){
                                        if(cv){
                                            if(cv.roles){
                                                cv.roleName = vm.roleType[cv.roles];
                                            }

                                            if(cv.time){
                                                cv.displayTime = utilService.getFormatTime(parseInt(cv.time));
                                            }
                                        }
                                    });
                                }

                            }

                            return data;
                        });

                        vm.unreadEvaluationTable = data.data.data;
                        vm.unreadEvaluationRecord.totalCount = data.data.size;
                        let pageSize = data.data.size / vm.unreadEvaluationRecord.limit;

                        if(pageSize > Math.trunc(pageSize)){
                            vm.unreadEvaluationRecord.pageSize = Math.trunc(pageSize) + 1;
                        }else {
                            vm.unreadEvaluationRecord.pageSize = Math.trunc(pageSize);
                        }

                        vm.unreadEvaluationRecord.pageArr = [];
                        let pageList = document.querySelector("#unreadEvaluationPagination");
                        for(let a = 1; a <= vm.unreadEvaluationRecord.pageSize ;a++){
                            vm.unreadEvaluationRecord.pageArr.push(a);
                            if(pageList && pageList.children[a - 1] && pageList.children[a - 1].className) {
                                pageList.children[a - 1].className = pageList.children[a - 1].className.replace(/active/g, "");
                            }
                        }
                        $scope.safeApply();
                        pageList = document.querySelector("#unreadEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }

                    }else{
                        vm.unreadEvaluationTable = "";
                    }

                    vm.loadingUnreadEvaluationTable = false;
                    $scope.safeApply();
                });
            }

            vm.getReadEvaluationRecord = function(page) {
                vm.loadingReadEvaluationTable = true;
                var startTime = $('#readEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#readEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                if(page){
                    vm.readEvaluationRecord.index = (page - 1) * vm.readEvaluationRecord.limit;
                }

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    index: vm.unreadEvaluationRecord.index ? vm.unreadEvaluationRecord.index : 0,
                    limit: vm.unreadEvaluationRecord.limit ? vm.unreadEvaluationRecord.limit : 1,
                }

                socketService.$socket($scope.AppSocket, 'getReadEvaluationRecord', sendData, function (data) {
                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                data.conversation.forEach(function(cv){
                                    cv.roleName = vm.roleType[cv.roles];
                                    cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                                });

                            }

                            return data;
                        })
                        vm.readEvaluationTable = data.data.data;


                        vm.readEvaluationRecord.totalCount = data.data.size;
                        let pageSize = data.data.size / vm.readEvaluationRecord.limit;

                        if(pageSize > Math.trunc(pageSize)){
                            vm.readEvaluationRecord.pageSize = Math.trunc(pageSize) + 1;
                        }else {
                            vm.readEvaluationRecord.pageSize = Math.trunc(pageSize);
                        }

                        vm.readEvaluationRecord.pageArr = [];
                        let pageList = document.querySelector("#readEvaluationPagination");
                        for(let a = 1; a <= vm.readEvaluationRecord.pageSize ;a++){
                            vm.readEvaluationRecord.pageArr.push(a);
                            if(pageList && pageList.children[a - 1] && pageList.children[a - 1].className) {
                                pageList.children[a - 1].className = pageList.children[a - 1].className.replace(/active/g, "");
                            }
                        }
                        $scope.safeApply();
                        pageList = document.querySelector("#readEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }
                    }else{
                        vm.readEvaluationTable = "";
                    }

                    vm.loadingReadEvaluationTable = false;
                    $scope.safeApply();
                });
            }

            vm.getAppealEvaluationRecordByConversationDate = function(page){
                vm.loadingAppealEvaluationTable = true;
                var startTime = $('#conversationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#conversationEndDatetimePicker').data('datetimepicker').getLocalDate();

                if(page){
                    vm.appealEvaluationRecord.index = (page - 1) * vm.appealEvaluationRecord.limit;
                }

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    status: vm.appealStatus,
                    index: vm.appealEvaluationRecord.index ? vm.appealEvaluationRecord.index : 0,
                    limit: vm.appealEvaluationRecord.limit ? vm.appealEvaluationRecord.limit : 10,
                }

                socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByConversationDate', sendData, function (data) {
                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            data.conversation.forEach(function(cv){
                                cv.roleName = vm.roleType[cv.roles];
                                cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                            });

                            return data;
                        })
                        vm.appealEvaluationTable = data.data.data;

                        vm.appealEvaluationRecord.totalCount = data.data.size;
                        let pageSize = data.data.size / vm.appealEvaluationRecord.limit;

                        if(pageSize > Math.trunc(pageSize)){
                            vm.appealEvaluationRecord.pageSize = Math.trunc(pageSize) + 1;
                        }else {
                            vm.appealEvaluationRecord.pageSize = Math.trunc(pageSize);
                        }

                        vm.appealEvaluationRecord.pageArr = [];
                        let pageList = document.querySelector("#appealEvaluationPagination");
                        for(let a = 1; a <= vm.appealEvaluationRecord.pageSize ;a++){
                            vm.appealEvaluationRecord.pageArr.push(a);
                            if(pageList && pageList.children[a - 1] && pageList.children[a - 1].className) {
                                pageList.children[a - 1].className = pageList.children[a - 1].className.replace(/active/g, "");
                            }
                        }
                        $scope.safeApply();
                        pageList = document.querySelector("#appealEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }
                    }else{
                        vm.appealEvaluationTable = "";
                    }

                    vm.loadingAppealEvaluationTable = false;
                    $scope.safeApply();
                });
            }

            vm.getAppealEvaluationRecordByAppealDate = function(page){
                vm.loadingAppealEvaluationTable = true;
                var startTime = $('#appealEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#appealEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                if(page){
                    vm.appealEvaluationRecord.index = (page - 1) * vm.appealEvaluationRecord.limit;
                }

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    status: vm.appealStatus,
                    index: vm.appealEvaluationRecord.index ? vm.appealEvaluationRecord.index : 0,
                    limit: vm.appealEvaluationRecord.limit ? vm.appealEvaluationRecord.limit : 10,
                }

                socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByAppealDate', sendData, function (data) {
                    if(data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            data.conversation.forEach(function(cv){
                                cv.roleName = vm.roleType[cv.roles];
                                cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                            });

                            return data;
                        })
                        vm.appealEvaluationTable = data.data.data;

                        vm.appealEvaluationRecord.totalCount = data.data.size;
                        let pageSize = data.data.size / vm.appealEvaluationRecord.limit;

                        if(pageSize > Math.trunc(pageSize)){
                            vm.appealEvaluationRecord.pageSize = Math.trunc(pageSize) + 1;
                        }else {
                            vm.appealEvaluationRecord.pageSize = Math.trunc(pageSize);
                        }

                        vm.appealEvaluationRecord.pageArr = [];
                        let pageList = document.querySelector("#appealEvaluationPagination");
                        for(let a = 1; a <= vm.appealEvaluationRecord.pageSize ;a++){
                            vm.appealEvaluationRecord.pageArr.push(a);
                            if(pageList && pageList.children[a - 1] && pageList.children[a - 1].className) {
                                pageList.children[a - 1].className = pageList.children[a - 1].className.replace(/active/g, "");
                            }
                        }
                        $scope.safeApply();
                        pageList = document.querySelector("#appealEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }

                    }else{
                        vm.appealEvaluationTable = "";
                    }

                    vm.loadingAppealEvaluationTable = false;
                    $scope.safeApply();
                });
            }

            vm.gatherCheckedRecord = function(isChecked, messageId, appealReason){
                if(isChecked){
                    let arrObj = {
                        messageId: messageId,
                        appealReason: appealReason ? appealReason : ""
                    }
                    vm.unreadEvaluationSelectedRecord.push(arrObj);
                }else{
                    //let selectedRecordIndex = vm.unreadEvaluationSelectedRecord.indexOf(messageId);
                    let selectedRecordIndex = vm.unreadEvaluationSelectedRecord.findIndex(u => u.messageId == messageId);
                    if(selectedRecordIndex >= 0){
                        vm.unreadEvaluationSelectedRecord.splice(selectedRecordIndex,1);
                    }
                }
            }

            vm.ammendCheckedRecord = function(messageId,appealReason) {
                let index = vm.unreadEvaluationSelectedRecord.findIndex(u => u.messageId == messageId)

                if(index != -1){
                    vm.unreadEvaluationSelectedRecord[index].appealReason = appealReason;
                }
            }

            vm.markEvaluationRecordAsRead = function(){
                if(vm.unreadEvaluationSelectedRecord && vm.unreadEvaluationSelectedRecord.length > 0){
                    let sendData = {
                        messageId: vm.unreadEvaluationSelectedRecord,
                        status: vm.constQualityInspectionStatus[2]
                    }

                    socketService.$socket($scope.AppSocket, 'markEvaluationRecordAsRead', sendData, function (data) {
                        if(data){
                            vm.getUnreadEvaluationRecord();
                        }
                    });

                }
            }

            vm.appealEvaluation = function() {
                if(vm.unreadEvaluationSelectedRecord && vm.unreadEvaluationSelectedRecord.length > 0) {
                    let sendData = {
                        appealDetailArr: vm.unreadEvaluationSelectedRecord
                    }

                    socketService.$socket($scope.AppSocket, 'appealEvaluation', sendData, function (data) {
                        if(data){
                            vm.getUnreadEvaluationRecord();
                        }
                    });
                }
            }
            //////////////////////////////////////////////////////////End of Evaluation Tab///////////////////////////////////////////////////////////////////

            //////////////////////////////////////////////////////////Start of Report Tab///////////////////////////////////////////////////////////////////
            vm.getWorkloadReport = function(newSearch) {
                vm.loadingWorkloadReportTable = true;
                var startTime = $('#reportConversationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#reportConversationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                }

                if(vm.qaAccount && vm.qaAccount != "all"){
                    sendData.qualityAssessor = [vm.qaAccount];
                }else{
                    let qaArr = [];
                    vm.qaDepartments.forEach(q => {
                        if(q && q._id){
                            qaArr.push(q._id);
                        }

                    })
                    sendData.qualityAssessor = qaArr;
                }

                let resultArr = [];

                socketService.$socket($scope.AppSocket, 'getWorkloadReport', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            let index = resultArr.findIndex(r => r.qaAccount == data.qaAccount)

                            if(index != -1){
                                if(data.status == "COMPLETED_UNREAD"){
                                    resultArr[index].completedUnread = data.count;
                                }

                                if(data.status == "COMPLETED_READ"){
                                    resultArr[index].completedRead = data.count;
                                }

                                if(data.status == "COMPLETED"){
                                    resultArr[index].completed = data.count;
                                }

                                if(data.status == "APPEALING"){
                                    resultArr[index].appealing = data.count;
                                }

                                if(data.status == "APPEAL_COMPLETED"){
                                    resultArr[index].appealCompleted = data.count;
                                }
                            }else{
                                let resultObj = {
                                    qaAccount: data.qaAccount,
                                    completedUnread: 0,
                                    completedRead: 0,
                                    completed: 0,
                                    appealing: 0,
                                    appealCompleted: 0
                                }

                                if(data.status == "COMPLETED_UNREAD"){
                                    resultObj.completedUnread = data.count;
                                }

                                if(data.status == "COMPLETED_READ"){
                                    resultObj.completedRead = data.count;
                                }

                                if(data.status == "COMPLETED"){
                                    resultObj.completed = data.count;
                                }

                                if(data.status == "APPEALING"){
                                    resultObj.appealing = data.count;
                                }

                                if(data.status == "APPEAL_COMPLETED"){
                                    resultObj.appealCompleted = data.count;
                                }

                                resultArr.push(resultObj);
                            }

                            return data;
                        })

                        let tableData = resultArr;

                        var option = $.extend({}, vm.generalDataTableOptions, {
                            data: tableData,
                            aoColumnDefs: [
                                {'sortCol': 'qaAccount', bSortable: true, 'aTargets': [0]},
                                {'sortCol': 'completedUnread', bSortable: true, 'aTargets': [1]},
                                {'sortCol': 'completedRead', bSortable: true, 'aTargets': [2]},
                                {'sortCol': 'completed', bSortable: true, 'aTargets': [3]},
                                {'sortCol': 'appealing', bSortable: true, 'aTargets': [4]},
                                {'sortCol': 'appealCompleted', bSortable: true, 'aTargets': [5]},

                            ],
                            columns: [
                                {title: $translate('QA ACCOUNT'), data: "qaAccount"},
                                {title: $translate('COMPLETED_UNREAD'), data: "completedUnread"},
                                {title: $translate('COMPLETED_READ'), data: "completedRead"},
                                {title: $translate('COMPLETED'), data: "completed"},
                                {title: $translate('APPEALING'), data: "appealing"},
                                {title: $translate('APPEAL_COMPLETED'), data: "appealCompleted"}
                            ],
                            bSortClasses: false,
                            destroy: true,
                            paging: false,
                            autoWidth: true,
                            initComplete: function (data, type, row) {
                                $scope.safeApply();
                            },
                            createdRow: function (row, data, dataIndex) {
                                $compile(angular.element(row).contents())($scope);

                            },
                            //fnRowCallback: vm.playerListTableRow
                        });

                        var a = utilService.createDatatableWithFooter('#workloadReportTable', option, {});

                        //vm.workloadReportRecords.pageObj.init({maxCount: vm.workloadReportRecords.totalCount}, newSearch);
                        $('#workloadReportTable').off('order.dt');
                        $('#workloadReportTable').on('order.dt', function (event, a, b) {
                            vm.commonSortChangeHandler(a, 'workloadReportRecords', vm.getWorkloadReport);
                        });
                        setTimeout(function () {
                            $('#workloadReportTable').resize();
                        }, 300);
                    }else{
                        vm.appealEvaluationTable = "";
                    }

                    vm.loadingWorkloadReportTable = false;
                    $scope.safeApply();
                });
            }

            vm.getEvaluationProgressRecord = function() {
                if(vm.yearMonth){
                    vm.loadingEvaluationProgressTable = true;
                    let yearMonthObj = JSON.parse(vm.yearMonth)
                    let startDate = new Date(yearMonthObj.month + "-" + "01-" + yearMonthObj.year);
                    let endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                    let sendData = {
                        platformObjId: vm.evaluationProgressPlatform,
                        startDate: startDate,
                        endDate: endDate
                    }
                    let resultArr = [];
                    let resultArr2 = [];

                    let weekDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

                    let rowMaxLength = 7;
                    socketService.$socket($scope.AppSocket, 'getEvaluationProgressRecord', sendData, function (data) {
                        if(data && data.data && data.data.length > 0){
                            //let result = data.data.sort(function(a,b) {return (a.platformName > b.platformName) ? 1 : ((b.platformName > a.platformName) ? -1 : 0);} );
                            let counter = 1;
                            let firstRow = [];
                            let secondRow = [];
                            let thirdRow = [];
                            let fouthRow = [];
                            let fifthRow = [];
                            let sixthRow = [];
                            for(let day = 1; day <= endDate.getDate(); day ++){
                                if(day == 1){
                                    for(let i = 0; i < startDate.getDay(); i++){
                                        firstRow.push({day: "-", isCompleted: false});
                                    }
                                    firstRow.push({day: day});

                                    if(firstRow.length == 7){
                                        counter += 1;
                                    }
                                }else if(counter == 1){
                                    firstRow.push({day: day});
                                    if(firstRow.length == 7){
                                        counter += 1;
                                    }

                                }else if(counter == 2){
                                    secondRow.push({day: day});
                                    if(secondRow.length == 7){
                                        counter += 1;
                                    }
                                }else if(counter == 3){
                                    thirdRow.push({day: day});
                                    if(thirdRow.length == 7){
                                        counter += 1;
                                    }
                                }else if(counter == 4){
                                    fouthRow.push({day: day});
                                    if(fouthRow.length == 7){
                                        counter += 1;
                                    }
                                }else if(counter == 5){
                                    fifthRow.push({day: day});
                                    if(fifthRow.length == 7){
                                        counter += 1;
                                    }
                                }else if(counter == 6){
                                    sixthRow.push({day: day});
                                    if(sixthRow.length == 7){
                                        counter += 1;
                                    }
                                }
                            }

                            let calendarData = [];

                            calendarData.push(firstRow);
                            calendarData.push(secondRow);
                            calendarData.push(thirdRow);
                            calendarData.push(fouthRow);
                            calendarData.push(fifthRow);
                            if(sixthRow.length > 0){
                                calendarData.push(sixthRow);
                            }
                            let resultObj = {calendarData: calendarData, calendarTitle: weekDay};

                            resultArr.push({calendarData: calendarData, calendarTitle: weekDay});

                            data.data.map(result => {
                                if(result && result.length > 0){
                                    let calendarDataObj = resultObj;
                                    result.forEach(resultByPlatform => {
                                        if(resultByPlatform){
                                            resultByPlatform.date = new Date(resultByPlatform.date);
                                                calendarDataObj.calendarData.map(calendarData => {
                                                    let arrIndex = calendarData.findIndex(c => c.day == resultByPlatform.date.getDate())
                                                    if(arrIndex != -1){
                                                        calendarData[arrIndex].isCompleted = resultByPlatform.isCompleted;
                                                    }
                                                })
                                        }

                                    })

                                    let calendarData2 = [];

                                    calendarData2.push(firstRow);
                                    calendarData2.push(secondRow);
                                    calendarData2.push(thirdRow);
                                    calendarData2.push(fouthRow);
                                    calendarData2.push(fifthRow);
                                    if(sixthRow.length > 0){
                                        calendarData2.push(sixthRow);
                                    }

                                    resultArr2.push({platformName: result[0].platformName, calendarData: calendarData2, calendarTitle: weekDay});

                                }

                            })

                            vm.evaluationProgressTableTitle = yearMonthObj.year + "-" + yearMonthObj.month + " " + $translate('MONTH');
                            vm.evaluationProgressTable = resultArr2;
                            vm.loadingEvaluationProgressTable = false
                            $scope.safeApply();
                        }

                    });
                }
                else{
                    socketService.showErrorMessage($translate('Please select Year - Month'));
                    vm.loadingEvaluationProgressTable = false
                    $scope.safeApply();
                }
            }

            $scope.$on(eventName, function (e, d) {
                vm.loadPlatformData();
                setTimeout(
                    function () {
                        vm.generalDataTableOptions = {
                            "paging": true,
                            columnDefs: [{targets: '_all', defaultContent: ' '}],
                            dom: 'tpl',
                            "aaSorting": [],
                            destroy: true,
                            "scrollX": true,
                            // sScrollY: 350,
                            scrollCollapse: true,
                            // order: [[0, "desc"]],
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
                            },
                            "drawCallback": function (settings) {
                                setTimeout(function () {
                                    $(window).trigger('resize');
                                }, 100)
                            }
                        }
                        //TODO::TEST CODE

                    }
                );
            });

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
                vm.overtimeSetting = vm.overtimeSetting || {};
                // initiate a basic setting if the setting is empty
                if (!vm.selectedPlatform.data.overtimeSetting || vm.selectedPlatform.data.overtimeSetting.length === 0) {

                        let overtimeSetting = [{
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
                else {
                    vm.overtimeSetting = vm.selectedPlatform.data.overtimeSetting;
                }

                vm.overtimeSetting.sort(function (a, b) {
                    return a.conversationInterval - b.conversationInterval;
                });

            };

            vm.settingDeleteIndex = function (param) {
                // param[0] is the _id; param[1] is the $index
                // just remove from the vm.overtimeSetting if it is not saving into the DB yet by using the $index
                if (param) {
                    if (param[0]) {
                        vm.overtimeSetting.forEach((item, index) => {
                            if (item._id === param[0]) {
                                vm.overtimeSetting.splice(index, 1);
                            }
                        });
                    } else {
                        vm.overtimeSetting.splice(param[1], 1);
                    }
                }
                else {
                    socketService.showErrorMessage($translate("Can't get the to-be-deleted item"));
                }
            };

            vm.endLoadMultipleSelect = function () {
                $timeout(function () {
                    $('.spicker').selectpicker('refresh');
                }, 0);
            };


            //****** CS Report Tab ******* START //

            vm.checkSelectedPlatformID = function(seletedProductsId){
                vm.selectedCSAccount = [];
                vm.selectedLive800Acc = [];
                vm.selectedLive800 = [];
                vm.CSDepartmentId=[];

                if (seletedProductsId !== 'all') {
                    console.log("-----------------", seletedProductsId);
                    // select the CS account that bound to the selected platform

                    vm.platformList.forEach(platform => {
                        if (platform.id === seletedProductsId) {
                            if (platform.data.csDepartment.length > 0) {
                                platform.data.csDepartment.forEach(department => {
                                    vm.CSDepartmentId.push(department._id);
                                });
                            }
                        }
                    });

                    let sendQuery ={
                        departments: {$in: vm.CSDepartmentId}
                    };


                    socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                        if (data && data.data && data.data.length > 0){
                            data.data.forEach(acc => {
                                if (acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("")){
                                    vm.selectedCSAccount.push(acc);
                                    acc.live800Acc.forEach(liveAcc => {
                                        vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                        vm.selectedLive800.push(liveAcc);
                                    });
                                }
                            });
                            if (vm.selectedCSAccount && vm.selectedCSAccount.length > 0){
                                vm.selectedCS=[];
                                vm.selectedCSAccount.forEach(acc => {
                                    vm.selectedCS.push(acc._id);
                                });
                            }
                        }else{
                            // for null
                            vm.selectedCSAccount.push("");
                            vm.selectedLive800Acc.push("");
                            vm.selectedCS.push("");

                        }
                        $scope.safeApply();
                    });

                } else {
                    // select all by default
                    vm.platformList.forEach(platform => {
                        if (platform.data.csDepartment.length >0) {
                            platform.data.csDepartment.forEach(department =>{
                                vm.allCSDepartmentId.push(department._id);
                            });
                        }
                    });

                    let sendQuery ={
                        departments: {$in: vm.allCSDepartmentId}
                    };

                    socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                        if (data && data.data){
                            data.data.forEach(acc => {
                                if (acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("")){
                                    vm.selectedCSAccount.push(acc);
                                    acc.live800Acc.forEach(liveAcc => {
                                        vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                        vm.selectedLive800.push(liveAcc);
                                    });
                                }
                            });

                        }
                        if (vm.selectedCSAccount && vm.selectedCSAccount.length > 0){
                            vm.selectedCS=[];
                            vm.selectedCSAccount.forEach(acc => {
                                vm.selectedCS.push(acc._id);
                            });
                        }
                        $scope.safeApply();
                    });
                }
                console.log("vm.selectedCSAccount", vm.selectedCSAccount);
                console.log("vm.selectedLive800", vm.selectedLive800);
            };


            vm.checkSelectedCSAcc= function (csAcc){

                vm.selectedLive800Acc = [];
                vm.selectedLive800=[];

                if (csAcc.length !== vm.selectedCSAccount.length && csAcc.length>0) {

                    console.log("-----------------", csAcc);
                    //select the Live800 account that bound to the selected CS account
                    csAcc.forEach(filterAcc => {
                        vm.selectedCSAccount.forEach(acc => {
                            if (acc._id.indexOf(filterAcc) > -1) {

                                acc.live800Acc.forEach(liveAcc => {
                                    vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                    vm.selectedLive800.push(liveAcc);
                                });
                            }
                        });
                    });
                } else {
                    // select all by default
                    console.log("-----------------", csAcc);
                    //select the Live800 account that bound to the selected CS account
                    vm.selectedCSAccount.forEach(acc => {
                        acc.live800Acc.forEach(liveAcc => {
                            vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                            vm.selectedLive800.push(liveAcc);
                        });
                    });
                }
                $scope.safeApply();
                console.log("vm.selectedLive800Acc",vm.selectedLive800Acc);
                console.log("vm.selectedLive800",vm.selectedLive800);

            };

            vm.commonInitTime = function (obj, queryId) {
                if (!obj) return;
                obj.startTime = utilService.createDatePicker(queryId + ' .startTime',{
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss'
                });
                obj.startTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayStartTime()));

                obj.endTime = utilService.createDatePicker(queryId + ' .endTime', {
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss'
                });
                obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
            };


            vm.prepareShowQIReport = function () {
                vm.selectedCSAccount=[];
                vm.selectedLive800Acc = [];
                vm.selectedLive800= [];
                vm.allLive800Acc=[];
                vm.allCSDepartmentId=[];
                vm.platformWithCSDepartment=[]; // to filter out the platfrom with CS Department for the Product Filter


                vm.platformList.forEach(platform => {
                    if (platform.data.csDepartment.length >0) {
                       platform.data.csDepartment.forEach(department =>{
                           vm.allCSDepartmentId.push(department._id);
                       });
                        vm.platformWithCSDepartment.push(platform);
                    }
                });

                let sendQuery ={
                    departments: {$in: vm.allCSDepartmentId}
                };
                socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                    if (data && data.data){
                        data.data.forEach(acc => {
                            if (acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("")){
                                vm.selectedCSAccount.push(acc);
                            }
                        });

                        console.log("vm.selectedCSAccount",vm.selectedCSAccount);

                        if (vm.selectedCSAccount && vm.selectedCSAccount.length > 0){
                            vm.selectedCS=[];
                            vm.selectedCSAccount.forEach(acc => {
                                vm.selectedCS.push(acc._id);
                            });
                        }

                        console.log("vm.selectedCS",vm.selectedCS);

                        //select the Live800 account that bound to the selected CS account
                        vm.selectedCSAccount.forEach(acc => {
                            if (acc.live800Acc.length>0) {
                                acc.live800Acc.forEach(liveAcc => {
                                    if (liveAcc != "") {
                                        vm.selectedLive800Acc.push({
                                            _id: acc._id,
                                            adminName: acc.adminName,
                                            live800Acc: liveAcc
                                        });
                                        vm.allLive800Acc.push({
                                            _id: acc._id,
                                            adminName: acc.adminName,
                                            live800Acc: liveAcc
                                        });
                                        vm.selectedLive800.push(liveAcc);
                                    }
                                });
                            }
                        });
                        console.log("vm.selectedLive800Acc",vm.selectedLive800Acc);
                        console.log("vm.selectedLive800",vm.selectedLive800);
                    }
                    $scope.safeApply();
                });

                vm.QIReportQuery ={};
                vm.QIReportQuery = {aaSorting: [[0, "desc"]], sortCol: {createTime: -1}};
                utilService.actionAfterLoaded("#QIReportTable", function () {
                    vm.commonInitTime(vm.QIReportQuery, '#QIReportQuery');
                    // vm.QIReportQuery.pageObj = utilService.createPageForPagingTable("#QIReportTablePage", {}, $translate, vm.QIReportTablePageChange);
                    $scope.safeApply()
                });

            };


            // vm.QIReportTablePageChange = function (curP, pageSize) {
            //     vm.commonPageChangeHandler(curP, pageSize, "QIReportQuery", vm.searchQIRecord)
            // };

            vm.searchQIRecord = function (newSearch) {

                let startTime = vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate();
                let endTime = vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate();

                let searchInterval = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime());
                if (searchInterval > $scope.QIREPORT_SEARCH_MAX_TIME_FRAME) {
                    socketService.showErrorMessage($translate("Exceed QI Report search max time frame"));
                    return;
                }

                vm.platformCompanyID=[];
                vm.platformList.forEach(platform => {
                    if (platform.data.live800CompanyId && platform.data.live800CompanyId.length>0){
                        vm.platformCompanyID.push({productName: platform.data.name, id: platform.data._id,companyId:platform.data.live800CompanyId});
                    }
                });

                vm.mysqlData=[];
                vm.companyID=[];

                if (vm.selectedPlatformID != 'all'){
                    let index=vm.platformCompanyID.findIndex(p => p.id == vm.selectedPlatformID);
                    if(index != -1) {
                        vm.companyID=vm.platformCompanyID[index].companyId;
                    }
                }else {
                    vm.platformCompanyID.forEach(platform => {
                        platform.companyId.forEach(id => {
                            vm.companyID.push(id);
                        })
                    })
                }
                $('#QIReportTableSpin').show();

                // select all the bounded live800Acc if there is no selection on Live800Acc filter
                if (vm.selectedLive800 && vm.selectedLive800.length ==0){
                    vm.selectedLive800 =[];
                    if (vm.allLive800Acc && vm.allLive800Acc.length>0) {
                        vm.allLive800Acc.forEach(each => {
                            vm.selectedLive800.push(each.live800Acc);
                        })
                    }
                }
                var query = {
                    'companyId':vm.companyID,
                    'operatorId':vm.selectedLive800,
                    'startTime': vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                    'endTime': vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate(),
                };

                socketService.$socket($scope.AppSocket, 'searchLive800Record', query, success, error);
                function success(data) {
                    console.log("searchLive800Record", data);
                    vm.displayData = [];
                    let preData = [];
                    vm.postData = [];
                    vm.rawMysqlData=[];
                    // handle the data obtained from mysql
                    if (data.data[0]){
                        data.data[0].forEach(conv => {
                            let counter_cs=0;
                            let counter_cus=0;
                            let startTime=0;
                            let start =true;
                            let duration=0;
                            let timeoutRate=0; // for overtimeSetting
                            let mark=0;
                            for (let i=0; i< conv.conversation.length;i++){
                               // roles: 1- cs; 2-player; 3-system
                                if (start){
                                    if (conv.conversation[i].roles ==1 || conv.conversation[i].roles ==2){
                                        startTime=conv.conversation[i].time;
                                        start =false;
                                    }
                                }
                                if (conv.conversation[i].roles ==1){
                                    counter_cs+=1;
                                }
                                if(conv.conversation[i].roles == 2){
                                    counter_cus+=1;
                                }
                                if (conv.conversation[i].inspectionRate !=0){
                                    mark=mark+ conv.conversation[i].inspectionRate;
                                }
                                if (conv.conversation[i].timeoutRate !=0){
                                    timeoutRate=timeoutRate+ conv.conversation[i].timeoutRate;
                                }
                            }
                            if (startTime){
                                duration = conv.conversation[conv.conversation.length-1].time - startTime;
                            }

                            if (counter_cus>=vm.conversationDefinition.askingSentence && counter_cs >=vm.conversationDefinition.replyingSentence && duration >= vm.conversationDefinition.totalSec){
                                vm.rawMysqlData.push({companyId: conv.companyId, fpmsAcc: conv.fpmsAcc, operatorId: conv.live800Acc.id, effective: 1, inspectionMark: mark, timeoutRate: timeoutRate})
                            }else{
                                vm.rawMysqlData.push({companyId: conv.companyId, fpmsAcc: conv.fpmsAcc, operatorId: conv.live800Acc.id, effective: 0, inspectionMark: 0, timeoutRate:0}) //not effective should not be rated
                            }
                        });

                        vm.variety=[];
                        vm.rawMysqlData.forEach(data=>{
                            let count1=0;
                            let count0=0;
                            let mark =0;
                            let timeoutRate=0;
                            let index= vm.variety.findIndex(p => p.companyId == data.companyId && p.operatorId == data.operatorId);
                            if (index == -1) {
                                for (let i = 0; i < vm.rawMysqlData.length; i++) {

                                    if (data.companyId == vm.rawMysqlData[i].companyId && data.operatorId == vm.rawMysqlData[i].operatorId) {
                                        if (vm.rawMysqlData[i].effective == 1){
                                            count1 += 1;
                                            mark = mark + vm.rawMysqlData[i].inspectionMark;
                                            timeoutRate = timeoutRate + vm.rawMysqlData[i].timeoutRate;
                                        }else{
                                            count0 +=1;
                                        }
                                    }
                                }
                                vm.variety.push({
                                    companyId: data.companyId,
                                    fpmsAcc: data.fpmsAcc,
                                    operatorId: data.operatorId,
                                    count_1: count1, // effective count
                                    count_0: count0, // not effective count
                                    totalInspectionMark: mark,
                                    totalTimeoutRate: timeoutRate
                                });

                            }
                        });

                        vm.mysqlData = $.extend(true, [], vm.variety); // used for inner table: data has been arranged based on operatorID

                        preData = vm.variety.map(item => {
                            let itemObj = {};

                            let platformIndex = vm.platformCompanyID.findIndex(p => p.companyId.includes(item.companyId.toString()));
                            if (platformIndex != -1) {
                                itemObj.productName = vm.platformCompanyID[platformIndex].productName;

                            }
                            let index = vm.selectedLive800Acc.findIndex(p => p.live800Acc==item.operatorId)
                            if (index != -1) {
                                itemObj.adminName = vm.selectedLive800Acc[index].adminName;
                            }
                            itemObj.count_0 = item.count_0;
                            itemObj.count_1 = item.count_1;
                            itemObj.totalInspectionMark = item.totalInspectionMark;
                            itemObj.totalTimeoutRate = item.totalTimeoutRate;

                            return itemObj;

                        });

                        var holder = {};

                        preData.forEach(d => {

                            if (holder.hasOwnProperty(d.adminName)) {
                                holder[d.adminName] = [holder[d.adminName][0]+ d.count_0 ,holder[d.adminName][1]+ d.count_0,holder[d.adminName][2]+ d.totalInspectionMark,holder[d.adminName][3]+ d.totalTimeoutRate];
                            } else {
                                holder[d.adminName]= [d.count_0, d.count_1,d.totalInspectionMark, d.totalTimeoutRate];
                            }
                        });

                        for (var prop in holder) {
                            let index = preData.findIndex(p => p.adminName == prop);
                            if (index != -1) {
                                vm.postData.push({
                                    productName: preData[index].productName,
                                    adminName: prop,
                                    count_0: holder[prop][0],
                                    count_1: holder[prop][1],
                                    totalCount: holder[prop][0]+holder[prop][1],
                                    totalInspectionMark: holder[prop][2],
                                    totalTimeoutRate: holder[prop][3]
                                })
                            }
                        }
                    }

                    if (data.data[1] && data.data[1].length > 0) {
                        let preData =[];

                        preData = data.data[1].map(item => {
                            let itemObj = {};
                            let index = vm.selectedLive800Acc.findIndex(p => p.live800Acc==item.operatorId)
                            if (index != -1) {
                                itemObj.adminName = vm.selectedLive800Acc[index].adminName;
                            }
                            itemObj.status = item.status;
                            itemObj.count = item.count;

                            return itemObj;
                        });

                        preData.forEach(data => {
                            let index = vm.postData.findIndex(p => p.adminName == data.adminName);
                            if (index != -1) {
                                if (vm.postData[index].hasOwnProperty(vm.constQualityInspectionStatus[data.status])){
                                    vm.postData[index][vm.constQualityInspectionStatus[data.status]] = vm.postData[index][vm.constQualityInspectionStatus[data.status]] + data.count;
                                }else{
                                    vm.postData[index][vm.constQualityInspectionStatus[data.status]] = data.count;
                                }
                            }
                        });

                        vm.postData.forEach(data=>{
                            for (let i=1; i<Object.keys(vm.constQualityInspectionStatus).length +1; i++){
                                if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])){
                                    data[vm.constQualityInspectionStatus[i]] = 0;
                                }
                            }
                        });

                        vm.postData.forEach(data=>{
                            data.pendingCount = data.count_1-data.COMPLETED_UNREAD-data.COMPLETED_READ-data.COMPLETED-data.APPEALING-data.APPEAL_COMPLETED
                            data.avgMark= ((data.totalTimeoutRate+ data.totalInspectionMark)/(data.COMPLETED_UNREAD+ data.COMPLETED_READ+data.COMPLETED+data.APPEALING+data.APPEAL_COMPLETED)).toFixed(2);
                        })
                    }

                    $('#QIReportTableSpin').hide();
                    $scope.safeApply();
                    vm.drawQIReportNew(vm.postData, [], [], newSearch);

                }
                function error(data) {
                    $('#QIReportTableSpin').hide();
                    console.log("error", error)
                }
            };

            vm.drawQIReportNew = function (data, total, size, newSearch) {
                var tableOptions = {
                    data: data,
                    "order": vm.QIReportQuery.aaSorting || [[0, 'desc']],
                    columns: [
                        {
                            title: $translate('PRODUCT'), data: "productName",

                        },
                        {
                            title: 'FPMS ' + $translate('CS Account'),
                            data: "adminName", sClass: "expandPlayerReport",
                            render: function (data, type, row) {
                                for (let i=0; i< vm.selectedLive800Acc.length; i++){
                                    if (vm.selectedLive800Acc[i].adminName === data) {
                                        return "<a>" + vm.selectedLive800Acc[i].adminName + "</a>";
                                    }
                                }
                            }
                        },
                        {
                            title: $translate('TOTAL_CONVERSATION_RECORD'), data: "totalCount",
                        },
                        {
                            title: $translate('NOT_EVALUATED_QUANTITY'), data: "count_0",
                        },
                        {
                            title: $translate('EFFECTIVE_CONVERSATION_QUANTITY'), data: "count_1",
                        },
                        {
                            title: $translate('PROCESSING_QUANTITY'), data: "pendingCount",
                        },
                        {
                            title: $translate('COMPLETED_UNREAD_QUANTITY'), data: "COMPLETED_UNREAD",
                        },
                        {
                            title: $translate('COMPLETED_READ_QUANTITY'), data: "COMPLETED_READ",
                        },
                        {
                            title: $translate('COMPLETED_QUANTITY'), data: "COMPLETED",
                        },
                        {
                            title: $translate('APPEALING_QUANTITY'), data: "APPEALING",
                        },
                        {
                            title: $translate('APPEAL_COMPLETED_QUANTITY'), data: "APPEAL_COMPLETED",
                        },
                        {
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: "totalTimeoutRate",
                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: "totalInspectionMark",
                        },
                        {
                            title: $translate('AVG_DEDUCTION_MARK') , data: "avgMark",
                        }
                    ],
                    "paging": true,
                    // "dom": '<"top">rt<"bottom"il><"clear">',
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    }
                };
                tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);

                if (reportTbl) {
                    reportTbl.clear();
                }
                var reportTbl = $("#QIReportTable").DataTable(tableOptions);
                utilService.setDataTablePageInput('QIReportTable', reportTbl, $translate);

                $('#QIReportTable tbody').off('click', 'td.expandPlayerReport');
                $('#QIReportTable').resize();

                $('#QIReportTable tbody').on('click', 'td.expandPlayerReport', function () {
                    var tr = $(this).closest('tr');
                    var row = reportTbl.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        var data = row.data();
                        console.log('content', data);
                        var id = 'reportTable' + data.adminName;
                        row.child(vm.createInnerTable(id)).show();
                        vm[id] = {};

                        let selectedLiveAcc = [];
                        let selectedCompanyId =[];
                        vm.displayDetailData = [];

                        socketService.$socket($scope.AppSocket, 'getAdminsInfo', {
                                adminName: data.adminName

                            }, function (data) {
                                selectedLiveAcc = data.data[0].live800Acc;

                                vm.mysqlData.forEach( item => {
                                    if (item.fpmsAcc == data.data[0].adminName){
                                        selectedCompanyId.push(item.companyId.toString());
                                    }
                                });

                                for (let i = 0; i < selectedLiveAcc.length; i++) {
                                    vm.mysqlData.forEach(item => {
                                        if (item.operatorId == selectedLiveAcc[i]) {
                                            vm.displayDetailData.push(item);
                                        }
                                    })
                                }

                                let params= {
                                    'companyId': selectedCompanyId,
                                    'operatorId': selectedLiveAcc,
                                    'startTime':vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                                    'endTime': vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate()
                                };

                                socketService.$socket($scope.AppSocket, 'getProgressReportByOperator', params, success, error);

                                function success(data) {
                                    console.log("getProgressReportByOperator", data.data);
                                    vm.allData = $.extend(true, [], data.data);
                                    if (data.data && data.data.length > 0) {
                                        data.data.forEach(data => {
                                            let index = vm.displayDetailData.findIndex(p => p.operatorId == data.operatorId);
                                            if (index != -1) {
                                                vm.displayDetailData[index][vm.constQualityInspectionStatus[data.status]] = data.count;
                                            }
                                        });

                                        vm.displayDetailData.forEach(data => {
                                            for (let i = 1; i < Object.keys(vm.constQualityInspectionStatus).length + 1; i++) {
                                                if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])) {
                                                    data[vm.constQualityInspectionStatus[i]] = 0;
                                                }
                                            }
                                        });
                                    }
                                    vm.displayDetailData.forEach(data => {
                                        data.totalCount = data.count_0 + data.count_1;
                                        if (vm.allData && vm.allData.length == 0){
                                            data.pendingCount = data.count_1;
                                        }else {
                                            data.pendingCount = data.count_1 - data.COMPLETED_UNREAD - data.COMPLETED_READ - data.COMPLETED - data.APPEALING - data.APPEAL_COMPLETED;
                                            data.avgMark = ((data.totalTimeoutRate + data.totalInspectionMark) / (data.COMPLETED_UNREAD + data.COMPLETED_READ + data.COMPLETED + data.APPEALING + data.APPEAL_COMPLETED)).toFixed(2);
                                        }
                                    });
                                    $scope.safeApply();
                                    vm.drawDetailQIReportTable(vm.displayDetailData, id, vm.displayDetailData.length, newSearch, []);

                                }

                                function error(error) {
                                    console.log("error", error);
                                }

                            }, function (error) {
                                console.log("error", error);
                            }
                        );
                        tr.addClass('shown');
                    }
                });
                $('#QIReportTable').off('order.dt');
                $('#QIReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'QIReportQuery', vm.searchQIRecord);
                });
            };

            vm.drawDetailQIReportTable = function (data, id, size, newSearch, qObj) {
                let holder = data;
                let tableOptions = {
                    data: data,
                    //"ordering": false,
                    // aoColumnDefs: [
                    //     {targets: '_all', defaultContent: ' ', bSortable: false}
                    // ],
                    columns: [

                        {title: "Live800 " + $translate('Account'), data: "operatorId"},
                        {
                            title: $translate('TOTAL_CONVERSATION_RECORD'),
                            data: "totalCount",

                        },
                        {
                            title: $translate('NOT_EVALUATED_QUANTITY'), data: "count_0",

                        },
                        {
                            title: $translate('EFFECTIVE_CONVERSATION_QUANTITY'), data: "count_1",

                        },
                        {
                            title: $translate('PROCESSING_QUANTITY'), data: "pendingCount",

                        },
                        {
                            title: $translate('COMPLETED_UNREAD_QUANTITY'), data: "COMPLETED_UNREAD",

                        },
                        {
                            title: $translate('COMPLETED_READ_QUANTITY'), data: "COMPLETED_READ",

                        },
                        {
                            title: $translate('COMPLETED_QUANTITY'), data: "COMPLETED",

                        },
                        {
                            title: $translate('APPEALING_QUANTITY'), data: "APPEALING",

                        },
                        {
                            title: $translate('APPEAL_COMPLETED_QUANTITY'), data: "APPEAL_COMPLETED",

                        },
                        {
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: "totalTimeoutRate",

                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: "totalInspectionMark",

                        },
                        {
                            title: $translate('AVG_DEDUCTION_MARK') , data: "avgMark",

                        }
                    ],
                    "paging": false,
                    // "dom": '<"top">rt<"bottom"il><"clear">',
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    }
                };
                tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
                $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));

                var innerTable = $('#' + id).DataTable(tableOptions);
            };

            vm.commonTableOption = {
                dom: 'Zrtlp',
                "autoWidth": true,
                "scrollX": true,
                columnDefs: [{targets: '_all', defaultContent: ' '}],
                "scrollCollapse": true,
                "destroy": true,
                "paging": false,
                "language": {
                    "emptyTable": $translate("No data available in table"),
                }

            };

            vm.reportTableRow = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                $compile(nRow)($scope);
            };

            vm.createInnerTable = function (id) {
                var content = $('<div>', {
                    style: "display:inline-block"
                });
                var div1 = $('<div>', {
                    class: 'divTableIndentWrap',
                    style: 'width:' + vm.tableIndentWidth + 'px;'
                });
                var label = $('<label>', {
                    class: "margin-left-5",
                    id: id + 'label',
                    style: 'width:100%;display: block'
                });

                div1.append($('<div>', {
                    class: 'tableWrapRight',
                    style: 'margin-left:' + vm.tableIndentWidth / 3 + 'px;width:' + vm.tableIndentWidth / 3 + 'px;'
                }))
                var div2 = $('<div>', {
                    style: 'display: inline-block;width:calc(100% - ' + vm.tableIndentWidth + 'px',
                });
                div2.append(label);
                div2.append($('<table>', {
                    id: id,
                    "data-curPage": 1,
                    "data-limit": 10,
                    class: 'display',
                    style: 'width:100%'
                }));
                div2.append($('<div>', {
                    id: id + 'Page',
                    style: 'width:100%'
                }));
                content.append(div1, div2);
                return content.html();
            }

            vm.commonPageChangeHandler = function (curP, pageSize, objKey, serchFunc) {
                var isChange = false;
                if (!curP) {
                    curP = 1;
                }
                if (vm[objKey] && pageSize != vm[objKey].limit) {
                    isChange = true;
                    vm[objKey].limit = pageSize;
                }
                if ( vm[objKey] && (curP - 1) * pageSize != vm[objKey].index) {
                    isChange = true;
                    vm[objKey].index = (curP - 1) * pageSize;
                }
                if (isChange) return serchFunc.call(this);
            }

            //****** CS Report Tab ******* ENDd //


        };
    qualityInspectionController.$inject = injectParams;
        myApp.register.controller('qualityInspectionCtrl', qualityInspectionController);
    }
);
