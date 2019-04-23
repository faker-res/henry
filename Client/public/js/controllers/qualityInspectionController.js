'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$sce', '$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'commonService', 'CONFIG', "$cookies", "$timeout", '$http', 'uiGridExporterService', 'uiGridExporterConstants'];

        var qualityInspectionController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, commonService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {

            var $translate = $filter('translate');
            let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
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

            vm.appealingTotalRecord = 0;
            vm.appealingTotalRecordByCS = 0;
            //vm.unReadEvaluation = {};

            vm.wechatDeviceList;
            vm.fuzzyWechatDeviceList;
            vm.wechatReportDeviceList;
            vm.inspectionWechat = {
                totalCount: 0,
                currentPage: 1,
                index: 0,
                limit: 1000,
                totalPage: 1
            };

            vm.inputDevice = {
                BACKSTAGE: 0,
                WEB_PLAYER: 1,
                WEB_AGENT: 2,
                H5_PLAYER: 3,
                H5_AGENT: 4,
                APP_PLAYER: 5,
                APP_AGENT: 6
            };

            vm.inspectionWechatReport = {};
            vm.showDeviceTable = false;

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

                    // load the default setting for quality inspection evalutation to each platform
                    if (!data[i].overtimeSetting || data[i].overtimeSetting.length ===0){
                        vm.getOvertimeSetting(data[i]);
                    }
                    // create the conversationDefinition object for old platform without the field
                    let id=data[i]._id;
                    let query = {_id: data[i]._id, conversationDefinition: {$exists: true}};
                    socketService.$socket($scope.AppSocket, 'getPlatformSetting', query, function (data) {
                        if (data.data.length === 0) {
                            let sendData = {
                                query: {_id: id},
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
                    vm.getConversationDefinition(data[i]);
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
                    }else{
                        // use number 999999 for signifiant company_id is not exist
                        if (companyIds.indexOf('999999') == -1) {
                            companyIds.push('999999');
                        }
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
              vm.getCSDepartmentMember(csDepartmentMember,companyIds);
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
            vm.getCSDepartmentMember = function(csMembers, companyIds){
              socketService.$socket($scope.AppSocket, 'getCSAdmins', {admins: csMembers}, function (cdata) {
                  console.log('all admin data', cdata.data);
                  let fpmsACCList = [];
                  let live800Accs = [];
                  vm.allUser = cdata.data;
                  cdata.data.forEach(item=>{
                    let liveAccSet = [];
                    if(item.live800Acc){
                        liveAccSet = item.live800Acc.filter(live800=>{
                            let equal = false;
                            companyIds.forEach(c =>
                            {
                                if (c == live800.substring(0, live800.indexOf("-"))) {
                                    equal = true;
                                }
                            });
                            return equal;
                        });
                    }
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
                vm.fpmsACCList.forEach(item => {
                    if (vm.inspection800.fpms.indexOf(item._id) != -1) {

                        item.live800Acc.forEach(live800 => {
                            live800Accs.push(live800);
                        })

                    }
                })
                vm.live800Accs = live800Accs;
                if (vm.live800Accs && vm.live800Accs.length > 0) {
                    if(vm.inspection800) {
                        vm.inspection800.live800Accs = vm.live800Accs;
                    }
                }
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
            vm.checkUncheckSelectAll = function (checkBoxNo) {
                let isChecked = false;

                isChecked = document.getElementsByName("selectAll")[checkBoxNo].checked ? true : false;

                if(isChecked) {
                    document.getElementsByName("selectAll")[Number(!checkBoxNo)].checked = true;

                    $('input[name="rowChecked"]').each(function() {
                        this.checked = true;
                        vm.storeBatchId();
                    });
                } else {
                    document.getElementsByName("selectAll")[Number(!checkBoxNo)].checked = false;
                    $('input[name="rowChecked"]').each(function() {
                        this.checked = false;
                        vm.batchEditList = [];
                    });
                }
            };
            vm.storeBatchId = function(isCheck, conversation){
                vm.batchEditList = [];
                $('body .batchEdit:checked').each( function(){
                    vm.batchEditList.push($(this).val());
                })
            };
            vm.batchSave = function(){
                let batchEdit = [];
                vm.batchSaveInProgress = true;
                vm.conversationForm.forEach(item=>{
                    if(vm.batchEditList.indexOf(String(item.messageId))!= -1 && (item && item.statusName && item.statusName == vm.constQualityInspectionStatusCN[1])){
                        batchEdit.push(item);
                    };
                });

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'rateBatchConversation', {batchData:batchEdit}, function(data){
                        vm.searchLive800();
                    });
                }
                else{
                    socketService.$socket($scope.AppSocket, 'rateBatchConversationByDailyRecord', {batchData:batchEdit}, function(data){
                        vm.searchLive800();
                    });
                }

            };
            vm.nextPG = function(){
                vm.pgn.currentPage += 1;
                vm.pgn.index = (vm.pgn.currentPage -1)*vm.pgn.limit;
                vm.searchLive800();
            };
            vm.gotoPG = function(pg, $event){
                $('body .pagination li').removeClass('active');
                if($event){
                    $($event.currentTarget).addClass('active');
                }
                let pgNo = null;
                if(pg<=0){
                    pgNo = 0
                }else if(pg >= 1){
                    pgNo = pg;
                }
                vm.pgn.index = ((pgNo-1)*vm.pgn.limit);
                vm.pgn.currentPage = pgNo;
                vm.searchLive800();
            };
            vm.getTotalNumberOfAppealingRecord = function(){
                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getTotalNumberOfAppealingRecord', "", success);
                }
                else{
                    socketService.$socket($scope.AppSocket, 'getTotalNumberOfAppealingRecordByDailyRecord', "", success);
                }

                function success(data) {
                    $scope.$evalAsync(() => {
                        if (data && data.hasOwnProperty("data")) {
                            vm.appealingTotalRecord = data.data;
                        }
                    });
                }

            };
            vm.getTotalNumberOfAppealingRecordByCS = function(){
                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getTotalNumberOfAppealingRecordByCS', "", success);
                }
                else{
                    socketService.$socket($scope.AppSocket, 'getTotalNumberOfAppealingRecordByCSInDailyRecord', "", success);
                }

                function success (data) {
                    $scope.$evalAsync(() => {
                        if (data && data.data) {
                            vm.appealingTotalRecordByCS = data.data;
                        }
                    });
                }

            };
            vm.searchLive800 = function(){
                $('.searchingQualityInspection').show();
                let fpmsId = [];
                if(vm.fpmsACCList && vm.fpmsACCList.length > 0){
                  vm.fpmsACCList.map(item=>{
                    fpmsId.push(item.name);
                  })
                }else{
                    fpmsId = [];
                }
                var query = {
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

                // which is using the live stream data
                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'searchLive800', query, success);

                    socketService.$socket($scope.AppSocket, 'countLive800', query, successFunc);
                }
                else{
                    // which is using the scheduler-saving data
                    socketService.$socket($scope.AppSocket, 'searchLive800ByScheduledRecord', query, successRecord);
                }

                function successRecord (data){
                    if (data && data.data && data.data.record && data.data.record.length){

                        data.data.record.forEach(
                            item => {
                                item.statusName = item.status ? $translate(vm.constQualityInspectionStatus[item.status]) : null;
                                item.conversation.forEach(function (cv, i) {
                                    cv.displayTime = utilService.getFormatTime(parseInt(cv.time));
                                    cv.needRate = vm.avoidMultiRateCS(cv, i, item.conversation);
                                    if(cv.roles){
                                        cv.roleName = vm.roleType[cv.roles];
                                    };
                                    // load each platform overtimeSetting
                                    let overtimeSetting = vm.getPlatformOvertimeSetting(item);
                                    let otsLength = overtimeSetting.length - 1;
                                    let colors = '';

                                    // render with different color
                                    overtimeSetting.forEach((ots, i) => {
                                        if (cv.roles == 1 && cv.needRate) {
                                            if (cv.timeoutRate == ots.presetMark) {
                                                colors = ots.color;
                                            }
                                        }
                                    });
                                    cv.colors = colors;
                                    return cv;
                                });
                                item.displayWay = vm.inspection800.displayWay == 'true' ? true : false;
                                item.editable = false;
                                item.createTime = utilService.getFormatTime(item.createTime);
                                item.closeName$ = item.closeReason && item.closeReason == "operatorClosed" ? "客服 " + item.closeName : "访客";

                                return item;
                            }
                        );

                        vm.conversationForm = data.data.record;
                        $("#selectAll").removeAttr('checked');
                        $('.searchingQualityInspection').hide();
                        vm.batchSaveInProgress = false;
                    }
                    else{
                        // no record
                        $('.searchingQualityInspection').hide();
                        vm.conversationForm= [];
                    }

                    // pagination
                    if (data && data.data && data.data.size) {
                        let itemTotal = data.data.size || 0;
                        let totalPage = itemTotal / vm.pgn.limit;
                        vm.pgn.totalPage = Math.ceil(totalPage);
                        vm.pgn.count = itemTotal;
                    } else {
                        vm.pgn.totalPage = 1;
                        vm.pgn.count = 0;
                    }
                    vm.pgnPages = [];
                    for (let a = 0; a < vm.pgn.totalPage; a++) {
                        vm.pgnPages.push(a);
                    }
                    $scope.$evalAsync();

                };

                function success(data) {
                    data.data.forEach(item => {
                        if (query.status == 7) {
                            item.status = 7;
                        }
                        item.statusName = item.conversation && item.conversation.length > 0 ? item.status ? $translate(vm.constQualityInspectionStatus[item.status]) : $translate(vm.constQualityInspectionStatus[1]) : $translate(vm.constQualityInspectionStatus[7]);
                        item.conversation.forEach(function (cv, i) {
                            cv.displayTime = utilService.getFormatTime(parseInt(cv.time));
                            cv.needRate = vm.avoidMultiRateCS(cv, i, item.conversation);
                            // load each platform overtimeSetting
                            let overtimeSetting = vm.getPlatformOvertimeSetting(item);
                            let otsLength = overtimeSetting.length - 1;
                            let colors = '';

                            // render with different color
                            overtimeSetting.forEach((ots, i) => {
                                if (cv.roles == 1 && cv.needRate) {
                                    if (cv.timeoutRate == ots.presetMark) {
                                        colors = ots.color;
                                    }
                                }
                            });
                            cv.colors = colors;
                            return cv;
                        });
                        item.displayWay = vm.inspection800.displayWay == 'true' ? true : false;
                        item.editable = false;
                        item.createTime = utilService.getFormatTime(item.createTime);
                        item.closeName$ = item.closeReason && item.closeReason == "operatorClosed" ? "客服 " + item.closeName : "访客";

                        return item;
                    });
                    vm.conversationForm = data.data;
                    $("#selectAll").removeAttr('checked');
                    $('.searchingQualityInspection').hide();
                    vm.batchSaveInProgress = false;
                    $scope.$evalAsync();
                }

                function successFunc(data) {
                    if (data.data) {
                        let itemTotal = data.data && data.data ? data.data : 0;
                        let totalPage = itemTotal / vm.pgn.limit
                        vm.pgn.totalPage = Math.ceil(totalPage);
                        vm.pgn.count = data.data;
                    } else {
                        vm.pgn.totalPage = 1;
                        vm.pgn.count = 0;
                    }
                    vm.pgnPages = [];
                    for (let a = 0; a < vm.pgn.totalPage; a++) {
                        vm.pgnPages.push(a);
                    }

                    $scope.$evalAsync();
                }

                vm.getTotalNumberOfAppealingRecord();
            };
            vm.getWorkingCSName = function(){
                var query = {
                    'companyId':vm.companyIds,
                    'fpmsAcc':vm.inspection800.fpms || [],
                    'operatorId':vm.inspection800.live800Accs,
                    'startTime': $('#live800StartDatetimePicker').data('datetimepicker').getLocalDate(),
                    'endTime': $('#live800endDatetimePicker').data('datetimepicker').getLocalDate(),
                };
                vm.workingCSName = "";
                socketService.$socket($scope.AppSocket, 'getWorkingCSName', query, function(data){
                    console.log(data);
                    $scope.$evalAsync( () => {
                        if (data && data.data && data.data[0].length > 0) {
                            data.data[0].forEach(csName => {
                                if (csName && csName.operator_name) {
                                    vm.workingCSName += csName.operator_name + ", ";
                                }
                            })

                            if (vm.workingCSName.length > 0) {
                                vm.workingCSName = vm.workingCSName.substring(0, vm.workingCSName.length - 2);
                            }
                        }
                    })
                });
            }
            vm.getPlatformOvertimeSetting = function(item){
                let overtimeSetting = vm.platformList.filter(pf=>{
                    if(pf.data.live800CompanyId && pf.data.live800CompanyId.length > 0){
                        if(pf.data.live800CompanyId.indexOf(String(item.companyId))!=-1){
                            return pf;
                        }
                    };
                });
                if(overtimeSetting.length > 0){
                    overtimeSetting = overtimeSetting[0].data.overtimeSetting;
                }else{
                    overtimeSetting = [];
                }
                return overtimeSetting;
            },
            vm.avoidMultiRateCS = function(cv, index, conversations){
                let needRate = null;
                // only cs need to be rated , cs roles is 1
                if(cv.roles === 1 && index != 0){

                    if(conversations[index-1].roles==1){
                        //if last dialog is from cs , which mean after he reply , then no need to rate it twice,
                        //until next conversation start from customer roles, which is 2
                        needRate = false;
                    }else{
                        needRate = true;
                    }
                }else{
                    needRate = false;
                }
                return needRate;
            },
            vm.confirmRate = function(rate){
                console.log(rate);
                rate.editable = false;

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'rateCSConversation', rate, function (data) {
                        vm.searchLive800();
                    });
                }
                else{
                    socketService.$socket($scope.AppSocket, 'rateCSConversationByDailyRecord', rate, function (data) {
                        vm.searchLive800();
                    });
                }
            };

            vm.showLive800 = function(){
                vm.initLive800Start();
                vm.batchEditList = [];
                if (!vm.inspection800) {
                    vm.inspection800 = {
                        status: '1',
                        qiUser: 'all',
                        displayWay: 'true',
                        searchBySummaryData: false
                    }
                }
                vm.pgn = vm.pgn || {index:0, currentPage:1, totalPage:1, limit:100, count:0};

                setTimeout(function(){
                    $scope.safeApply();
                },0)

            };

            vm.rateIt = function(conversation){
                // if the complain is closed(6) , or this conversation no need to rate(7)
                if(conversation.status!=6 && conversation.status!=7){
                    conversation.editable = true;
                }

            };

            vm.cancelRate = function(conversation){
                conversation.editable = false;
            };

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
                $('#live800endDatetimePicker').data('datetimepicker').setLocalDate(utilService.getTodayStartTime());
            }

            vm.initUnreadEvaluation = function(){
                if(vm.selectedPlatform){
                    vm.evaluationTab = 'unreadEvaluation';

                    utilService.actionAfterLoaded('#unreadEvaluationEndDatetimePicker', function () {
                        $('#unreadEvaluationStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#unreadEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#unreadEvaluationEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#unreadEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            };

            vm.initReadEvaluation = function(){
                if(vm.selectedPlatform) {
                    utilService.actionAfterLoaded('#readEvaluationEndDatetimePicker', function () {
                        $('#readEvaluationStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#readEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#readEvaluationEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#readEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            }

            vm.initAppealEvaluation = function(){
                if(vm.selectedPlatform) {
                    utilService.actionAfterLoaded('#appealEvaluationEndDatetimePicker', function () {
                        $('#conversationStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#conversationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#conversationEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#conversationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());

                        $('#appealEvaluationStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#appealEvaluationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#appealEvaluationEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#appealEvaluationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            }

            vm.initWorkloadProgress = function(){
                if(vm.selectedPlatform) {
                    vm.inspectionReportTab ='workloadReport';
                    utilService.actionAfterLoaded('#reportConversationEndDatetimePicker', function () {
                        $('#reportConversationStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#reportConversationStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#reportConversationEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#reportConversationEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());

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
                    });
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

            vm.initManualSummarizeLive800Record = function(){
                if(vm.selectedPlatform){
                    utilService.actionAfterLoaded('#live800SummarizeEndDatetimePicker', function () {
                        $('#live800SummarizeStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#live800SummarizeStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                        $('#live800SummarizeEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#live800SummarizeEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));
                    });
                }
            };

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
                };

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getUnreadEvaluationRecord', sendData, success);
                }
                else {
                    socketService.$socket($scope.AppSocket, 'getUnreadEvaluationRecordByDailyRecord', sendData, success);
                }

                function success(data) {
                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                if(data.conversation){
                                    data.conversation.forEach(function(cv,i){
                                        if(cv){
                                            if(cv.roles){
                                                cv.roleName = vm.roleType[cv.roles];
                                            }

                                            if(cv.time){
                                                cv.displayTime = utilService.getFormatTime(parseInt(cv.time));
                                            }

                                            cv.needRate = vm.avoidMultiRateCS(cv,i,data.conversation);

                                            // load each platform overtimeSetting
                                            let overtimeSetting = vm.getPlatformOvertimeSetting(data);
                                            let otsLength = overtimeSetting.length -1;
                                            let colors = '';

                                            // render with different color
                                            overtimeSetting.forEach((ots,i) => {
                                                if(cv.roles == 1 && cv.needRate){
                                                    if(cv.timeoutRate == ots.presetMark){
                                                        colors = ots.color;
                                                    }
                                                }
                                            });
                                            cv.colors = colors;
                                            return cv;
                                        }
                                    });
                                }

                                if(data.createTime){
                                    data.createTime = utilService.getFormatTime(data.createTime);
                                }

                                data.closeName$ = data.closeReason && data.closeReason == "operatorClosed" ? "客服 " + data.closeName : "访客";
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
                    $scope.$evalAsync();
                }
            };

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

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getReadEvaluationRecord', sendData, success);
                }
                else {
                    socketService.$socket($scope.AppSocket, 'getReadEvaluationRecordByDailyRecord', sendData, success);
                }

                function success (data) {
                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                if(data.conversation){
                                    data.conversation.forEach(function(cv,i){
                                        cv.roleName = vm.roleType[cv.roles];
                                        cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                                        cv.needRate = vm.avoidMultiRateCS(cv,i,data.conversation);

                                        // load each platform overtimeSetting
                                        let overtimeSetting = vm.getPlatformOvertimeSetting(data);
                                        let otsLength = overtimeSetting.length -1;
                                        let colors = '';

                                        // render with different color
                                        overtimeSetting.forEach((ots,i) => {
                                            if(cv.roles == 1 && cv.needRate){
                                                if(cv.timeoutRate == ots.presetMark){
                                                    colors = ots.color;
                                                }
                                            }
                                        });
                                        cv.colors = colors;
                                        return cv;
                                    });
                                }

                                if(data.createTime){
                                    data.createTime = utilService.getFormatTime(data.createTime);
                                }

                                data.closeName$ = data.closeReason && data.closeReason == "operatorClosed" ? "客服 " + data.closeName : "访客";
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
                        $scope.$evalAsync();
                        pageList = document.querySelector("#readEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }
                    }else{
                        vm.readEvaluationTable = "";
                    }

                    vm.loadingReadEvaluationTable = false;
                    $scope.$evalAsync();
                }
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

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByConversationDate', sendData, success);
                }
                else {
                    socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByConversationDateInDailyRecord', sendData, success);
                }

                function success (data) {
                    if(data && data.data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                if(data.conversation){
                                    data.conversation.forEach(function(cv,i){
                                        cv.roleName = vm.roleType[cv.roles];
                                        cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                                        cv.needRate = vm.avoidMultiRateCS(cv,i,data.conversation);

                                        // load each platform overtimeSetting
                                        let overtimeSetting = vm.getPlatformOvertimeSetting(data);
                                        let otsLength = overtimeSetting.length -1;
                                        let colors = '';

                                        // render with different color
                                        overtimeSetting.forEach((ots,i) => {
                                            if(cv.roles == 1 && cv.needRate){
                                                if(cv.timeoutRate == ots.presetMark){
                                                    colors = ots.color;
                                                }
                                            }
                                        });
                                        cv.colors = colors;
                                        return cv;

                                    });
                                }

                                if(data.createTime){
                                    data.createTime = utilService.getFormatTime(data.createTime);
                                }

                                data.closeName$ = data.closeReason && data.closeReason == "operatorClosed" ? "客服 " + data.closeName : "访客";

                                return data;
                            }
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
                        $scope.$evalAsync();
                        pageList = document.querySelector("#appealEvaluationPagination");
                        if(pageList && page && pageList.children[page - 1] && pageList.children[page - 1].className){
                            pageList.children[page - 1].className += " active";
                        }
                    }else{
                        vm.appealEvaluationTable = "";
                    }

                    vm.loadingAppealEvaluationTable = false;
                    $scope.$evalAsync();
                }
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

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByAppealDate', sendData, success);
                }
                else {
                    socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByAppealDateInDailyRecord', sendData, success);
                }

                function success (data) {
                    if(data && data.data && data.data.data && data.data.data.length > 0){

                        data.data.data.map(data => {
                            if(data){
                                if(data.status){
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                if(data.conversation){
                                    data.conversation.forEach(function(cv,i){
                                        cv.roleName = vm.roleType[cv.roles];
                                        cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                                        cv.needRate = vm.avoidMultiRateCS(cv,i,data.conversation);

                                        // load each platform overtimeSetting
                                        let overtimeSetting = vm.getPlatformOvertimeSetting(data);
                                        let otsLength = overtimeSetting.length -1;
                                        let colors = '';

                                        // render with different color
                                        overtimeSetting.forEach((ots,i) => {
                                            if(cv.roles == 1 && cv.needRate){
                                                if(cv.timeoutRate == ots.presetMark){
                                                    colors = ots.color;
                                                }
                                            }
                                        });
                                        cv.colors = colors;
                                        return cv;

                                    });
                                }

                                if(data.createTime){
                                    data.createTime = utilService.getFormatTime(data.createTime);
                                }

                                data.closeName$ = data.closeReason && data.closeReason == "operatorClosed" ? "客服 " + data.closeName : "访客";

                                return data;
                            }
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
                    $scope.$evalAsync();
                }
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

                    if (!vm.inspection800.searchBySummaryData) {
                        socketService.$socket($scope.AppSocket, 'markEvaluationRecordAsRead', sendData, function (data) {
                            if(data){
                                vm.getUnreadEvaluationRecord();
                            }
                        });
                    }
                    else{
                        socketService.$socket($scope.AppSocket, 'markEvaluationRecordAsReadByDailyRecord', sendData, function (data) {
                            if(data){
                                vm.getUnreadEvaluationRecord();
                            }
                        });
                    }

                }
            }

            vm.appealEvaluation = function() {
                if(vm.unreadEvaluationSelectedRecord && vm.unreadEvaluationSelectedRecord.length > 0) {
                    let sendData = {
                        appealDetailArr: vm.unreadEvaluationSelectedRecord
                    }

                    if (!vm.inspection800.searchBySummaryData) {
                        socketService.$socket($scope.AppSocket, 'appealEvaluation', sendData, function (data) {
                            if(data){
                                vm.getUnreadEvaluationRecord();
                            }
                        });
                    }
                    else{
                        socketService.$socket($scope.AppSocket, 'appealEvaluationByDailyRecord', sendData, function (data) {
                            if(data){
                                vm.getUnreadEvaluationRecord();
                            }
                        });
                    }

                }
            }
            //////////////////////////////////////////////////////////End of Evaluation Tab///////////////////////////////////////////////////////////////////

            //////////////////////////////////////////////////////////Start of Report Tab///////////////////////////////////////////////////////////////////
            vm.getWorkloadReport = function(newSearch) {
                vm.loadingWorkloadReportTable = true;
                let startTime = $('#reportConversationStartDatetimePicker').data('datetimepicker').getLocalDate();
                let endTime = $('#reportConversationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                }

                if(vm.qaAccount && vm.qaAccount != "all"){
                    sendData.qualityAssessor = [vm.qaAccount];
                }else{
                    if (!vm.qaDepartments || vm.qaDepartments.length == 0){
                        vm.loadingWorkloadReportTable = false;
                        return socketService.showErrorMessage($translate('No single QA account is found'));
                    }
                    let qaArr = [];
                    vm.qaDepartments.forEach(q => {
                        if(q && q._id){
                            qaArr.push(q._id);
                        }

                    })
                    sendData.qualityAssessor = qaArr;
                }

                let resultArr = [];

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'getWorkloadReport', sendData, successFunc, errorFunc);
                }
                else {
                    socketService.$socket($scope.AppSocket, 'getWorkloadReportByDailyRecord', sendData, successFunc, errorFunc);
                }

                function successFunc (data) {
                    $scope.$evalAsync(() => {
                        if(data && data.data && data.data.length > 0) {
                            data.data.map(data => {
                                if (data && data.status) {
                                    data.status = vm.constQualityInspectionStatus[data.status];
                                }

                                let index = resultArr.findIndex(r => r.qaAccount == data.qaAccount)

                                if (index != -1) {
                                    if (data.status == "COMPLETED_UNREAD") {
                                        resultArr[index].completedUnread = data.count;
                                    }

                                    if (data.status == "COMPLETED_READ") {
                                        resultArr[index].completedRead = data.count;
                                    }

                                    if (data.status == "COMPLETED") {
                                        resultArr[index].completed = data.count;
                                    }

                                    if (data.status == "APPEALING") {
                                        resultArr[index].appealing = data.count;
                                    }

                                    if (data.status == "APPEAL_COMPLETED") {
                                        resultArr[index].appealCompleted = data.count;
                                    }
                                } else {
                                    let resultObj = {
                                        qaAccount: data.qaAccount,
                                        completedUnread: 0,
                                        completedRead: 0,
                                        completed: 0,
                                        appealing: 0,
                                        appealCompleted: 0
                                    }

                                    if (data.status == "COMPLETED_UNREAD") {
                                        resultObj.completedUnread = data.count;
                                    }

                                    if (data.status == "COMPLETED_READ") {
                                        resultObj.completedRead = data.count;
                                    }

                                    if (data.status == "COMPLETED") {
                                        resultObj.completed = data.count;
                                    }

                                    if (data.status == "APPEALING") {
                                        resultObj.appealing = data.count;
                                    }

                                    if (data.status == "APPEAL_COMPLETED") {
                                        resultObj.appealCompleted = data.count;
                                    }

                                    resultArr.push(resultObj);
                                }

                                return data;
                            });

                            vm.drawQAReportTable(resultArr, [], [],newSearch);
                            vm.QAReportQuery ={};
                            vm.QAReportQuery = {aaSorting: [[0, "desc"]], sortCol: {createTime: -1}};
                        }else{
                            vm.drawQAReportTable("", [], [],newSearch);
                        }

                        vm.loadingWorkloadReportTable = false;
                    })
                };

                function errorFunc (error) {
                    console.log("error", error);
                };
            };

            vm.drawQAReportTable = function(resultArr, total, size, newSearch) {
                let tableData = resultArr;

                var option = $.extend(true, {}, vm.commonTableOption, {
                    data: tableData,
                    // aoColumnDefs: [
                    //     {'sortCol': 'qaAccount', bSortable: true, 'aTargets': [0]},
                    //     {'sortCol': 'completedUnread', bSortable: true, 'aTargets': [1]},
                    //     {'sortCol': 'completedRead', bSortable: true, 'aTargets': [2]},
                    //     {'sortCol': 'completed', bSortable: true, 'aTargets': [3]},
                    //     {'sortCol': 'appealing', bSortable: true, 'aTargets': [4]},
                    //     {'sortCol': 'appealCompleted', bSortable: true, 'aTargets': [5]},
                    //
                    // ],
                    columns: [
                        {
                            title: $translate('QC ACCOUNT'),
                            data: "qaAccount", sClass: "expandQAReport",
                            render: function (data, type, row) {
                                return "<a>" + data + "</a>";
                            }
                        },
                        {title: $translate('COMPLETED_UNREAD'), data: "completedUnread"},
                        {title: $translate('COMPLETED_READ'), data: "completedRead"},
                        {title: $translate('COMPLETED'), data: "completed"},
                        {title: $translate('APPEALING'), data: "appealing"},
                        {title: $translate('APPEAL_COMPLETED'), data: "appealCompleted"}
                    ],
                    "paging": true,
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    }

                });

                if (reportTbl) {
                    reportTbl.clear();
                }
                $("#workloadReportTable").DataTable(option).clear();
                var reportTbl = $("#workloadReportTable").DataTable(option);
                utilService.setDataTablePageInput('workloadReportTable', reportTbl, $translate);

                $('#workloadReportTable tbody').off('click', 'td.expandQAReport');
                $('#workloadReportTable').resize();

                $('#workloadReportTable tbody').on('click', 'td.expandQAReport', function () {
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
                        var id = 'reportTable' + data.qaAccount;
                        row.child(vm.createInnerTable(id)).show();
                        vm[id] = {};

                        let params = {
                            qualityAssessor: data.qaAccount,
                            startTime: $('#reportConversationStartDatetimePicker').data('datetimepicker').getLocalDate(),
                            endTime: $('#reportConversationEndDatetimePicker').data('datetimepicker').getLocalDate(),
                        };

                        if (!vm.inspection800.searchBySummaryData) {
                            socketService.$socket($scope.AppSocket, 'getWorkloadReportByDate', params, success, error);
                        }
                        else{
                            socketService.$socket($scope.AppSocket, 'getWorkloadReportByDateInDailyRecord', params, success, error);

                        }
                        tr.addClass('shown');
                    }

                    function success (data) {
                        if (data && data.data && data.data.length > 0) {
                            vm.displayDetailData = [];

                            data.data.forEach(detail => {

                                let detailData = {};

                                detailData.date = utilService.getFormatTime(new Date(detail.date)).split(" ")[0];
                                if (detail.data.length > 0) {

                                    detail.data.forEach(inDetail => {
                                        if (inDetail) {
                                            let status = vm.constQualityInspectionStatus[inDetail._id.status];
                                            if (status == "COMPLETED_UNREAD") {
                                                detailData.COMPLETED_UNREAD = inDetail.count;
                                            }

                                            if (status == "COMPLETED_READ") {
                                                detailData.COMPLETED_READ = inDetail.count;
                                            }

                                            if (status == "COMPLETED") {
                                                detailData.COMPLETED = inDetail.count;
                                            }

                                            if (status == "APPEALING") {
                                                detailData.APPEALING = inDetail.count;
                                            }

                                            if (status == "APPEAL_COMPLETED") {
                                                detailData.APPEAL_COMPLETED = inDetail.count;
                                            }
                                        }

                                    })

                                }
                                vm.displayDetailData.push(detailData);
                            });
                        }

                        vm.displayDetailData.map(data => {
                            for (let i = 1; i < Object.keys(vm.constQualityInspectionStatus).length + 1; i++) {
                                if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])) {
                                    data[vm.constQualityInspectionStatus[i]] = 0;
                                }
                            }
                            return data;
                        });

                        $scope.safeApply();
                        vm.drawDetailQAReportTable(vm.displayDetailData, id, vm.displayDetailData.length, newSearch, []);
                    };

                    function error (error) {
                        console.log("error", error);
                    };
                });
                $('#workloadReportTable').off('order.dt');
                $('#workloadReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'QAReportQuery', vm.getWorkloadReport);
                });
            }

            vm.drawDetailQAReportTable = function (data, id, size, newSearch, qObj) {
                let holder = data;
                let tableOptions = {
                    data: data,
                    columns: [
                        {title: $translate('date'), data: "date"},
                        {title: $translate('COMPLETED_UNREAD'), data: "COMPLETED_UNREAD"},
                        {title: $translate('COMPLETED_READ'), data: "COMPLETED_READ"},
                        {title: $translate('COMPLETED'), data: "COMPLETED"},
                        {title: $translate('APPEALING'), data: "APPEALING"},
                        {title: $translate('APPEAL_COMPLETED'), data: "APPEAL_COMPLETED"}
                    ],
                    "paging": false,
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    }
                };
                tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
                $('#' + id + 'label').text($translate("total") + ' ' + size + ' ' + $translate("records"));
                var innerTable = $('#' + id).DataTable(tableOptions);
            };

            vm.getEvaluationProgressRecord = function() {
                if(vm.yearMonth){
                    vm.loadingEvaluationProgressTable = true;
                    let yearMonthObj = JSON.parse(vm.yearMonth)
                    let startDate = new Date(yearMonthObj.month + "-" + "01-" + yearMonthObj.year);
                    let endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
                    let sendData = {
                        startDate: startDate,
                        endDate: endDate
                    }

                    if(vm.evaluationProgressPlatform && vm.evaluationProgressPlatform.length > 0){
                        sendData.platformObjId = vm.evaluationProgressPlatform
                    }else{
                        if(vm.platformList && vm.platformList.length > 0){
                            let platformArr = [];
                            vm.platformList.forEach(p => {
                                if(p && p.id){
                                    platformArr.push(p.id);
                                }

                            })
                            sendData.platformObjId = platformArr;
                        }
                    }

                    if (!vm.inspection800.searchBySummaryData) {
                        socketService.$socket($scope.AppSocket, 'getEvaluationProgressRecord', sendData, successFunc);
                    }
                    else {
                        socketService.$socket($scope.AppSocket, 'getEvaluationProgressRecordByDailyRecord', sendData, successFunc);
                    }
                }
                else{
                    socketService.showErrorMessage($translate('Please select Year - Month'));
                    vm.loadingEvaluationProgressTable = false
                    $scope.safeApply();
                }

                function successFunc (data) {
                    if(data && data.data && data.data.length > 0){
                        //let result = data.data.sort(function(a,b) {return (a.platformName > b.platformName) ? 1 : ((b.platformName > a.platformName) ? -1 : 0);} );
                        let counter = 1;
                        let firstRow = [];
                        let secondRow = [];
                        let thirdRow = [];
                        let fouthRow = [];
                        let fifthRow = [];
                        let sixthRow = [];
                        let yearMonthObj = JSON.parse(vm.yearMonth)
                        let startDate = new Date(yearMonthObj.month + "-" + "01-" + yearMonthObj.year);
                        let endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
                        let lastDateOfMonth = new Date(endDate);
                        let resultArr = [];
                        let weekDay = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
                        let rowMaxLength = 7;

                        lastDateOfMonth.setDate(endDate.getDate() - 1);

                        for(let day = 1; day <= lastDateOfMonth.getDate(); day ++){
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

                        data.data.map(result => {
                            if(result && result.length > 0){
                                let calendarDataObj = jQuery.extend(true, {}, resultObj);
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

                                resultArr.push({platformName: result[0].platformName, calendarData: calendarDataObj.calendarData, calendarTitle: calendarDataObj.calendarTitle});
                            }
                        })
                        vm.evaluationProgressTableTitle = yearMonthObj.year + "-" + yearMonthObj.month + " " + $translate('MONTH');
                        vm.evaluationProgressTable = resultArr;
                        vm.loadingEvaluationProgressTable = false
                        $scope.$evalAsync();
                    }

                };
            };

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


            vm.getConversationDefinition = function (platformData) {
                if (!platformData){
                    platformData=vm.selectedPlatform.data;
                }

                vm.conversationDefinition = vm.conversationDefinition || {};
                vm.conversationDefinition.totalSec = platformData.conversationDefinition.totalSec;
                vm.conversationDefinition.askingSentence = platformData.conversationDefinition.askingSentence;
                vm.conversationDefinition.replyingSentence = platformData.conversationDefinition.replyingSentence;
            };

            vm.getOvertimeSetting = function (platformData) {
                if (!platformData){
                    platformData=vm.selectedPlatform.data;

                }
                vm.overtimeSetting = vm.overtimeSetting || {};
                // initiate a basic setting if the setting is empty
                if (!platformData.overtimeSetting || platformData.overtimeSetting.length === 0) {

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
                        query: {_id: platformData._id},
                        updateData: {overtimeSetting: overtimeSetting}
                    };
                    socketService.$socket($scope.AppSocket, 'updatePlatform', sendData, function (data) {
                        vm.loadPlatformData({loadAll: false});
                    });

                    vm.overtimeSetting = overtimeSetting;
                }
                else {
                    vm.overtimeSetting = platformData.overtimeSetting;
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
                vm.allCSDepartmentId = [];
                vm.selectedCS = [];
                vm.selectedCompanyId = [];

                if (seletedProductsId !== 'all') {
                    // select the CS account that bound to the selected platform

                    vm.platformWithCSDepartment.forEach(platform => {
                        if (platform.id === seletedProductsId) {
                            if (platform.data.live800CompanyId && platform.data.live800CompanyId.length > 0){
                                platform.data.live800CompanyId.forEach( companyId => {
                                    vm.selectedCompanyId.push(companyId);
                                })
                            }
                            if (platform.data.csDepartment.length > 0) {
                                platform.data.csDepartment.forEach(department => {
                                    vm.allCSDepartmentId.push(department._id);
                                });
                            }
                        }
                    });

                    let sendQuery ={
                        departments: {$in: vm.allCSDepartmentId}
                    };

                    socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                        $scope.$evalAsync(() => {
                            if (data && data.data && data.data.length > 0){
                                data.data.forEach(acc => {
                                    if ( acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("") ){

                                        acc.live800Acc.forEach(liveAcc => {
                                            //check the operatorId is bound to the selected companyID (i.e., platform)
                                            if( vm.selectedCompanyId.indexOf(liveAcc.split("-")[0]) > -1 ){
                                                vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                                vm.selectedLive800.push(liveAcc);
                                            }

                                        });
                                        if(vm.selectedLive800.length > 0){
                                            vm.selectedCSAccount.push(acc);
                                            vm.selectedCS.push(acc._id);
                                        }
                                    }
                                });
                            }
                        })
                    });

                } else {
                    // select all by default
                    vm.platformWithCSDepartment.forEach(platform => {
                        if (platform.data.live800CompanyId && platform.data.live800CompanyId.length > 0){
                            platform.data.live800CompanyId.forEach( companyId => {
                                vm.selectedCompanyId.push(companyId);
                            })
                        }
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

                        $scope.$evalAsync(() => {
                            if (data && data.data){
                                data.data.forEach(acc => {
                                    if ( acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("") ){

                                        //  vm.selectedCSAccount.push(acc);
                                        acc.live800Acc.forEach(liveAcc => {
                                            //check the operatorId is bound to the selected companyID (i.e., platform)
                                            if( vm.selectedCompanyId.indexOf(liveAcc.split("-")[0]) > -1 ){
                                                vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                                vm.selectedLive800.push(liveAcc);
                                            }

                                            // vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                            // vm.selectedLive800.push(liveAcc);
                                        });
                                        if(vm.selectedLive800.length > 0){
                                            vm.selectedCSAccount.push(acc);
                                            vm.selectedCS.push(acc._id);
                                        }
                                    }
                                });

                            }
                        })
                    });
                }
                console.log("vm.selectedCSAccount", vm.selectedCSAccount);
                console.log("vm.selectedLive800", vm.selectedLive800);
            };


            vm.checkSelectedCSAcc= function (csAcc){

                vm.selectedLive800Acc = [];
                vm.selectedLive800=[];

                if (csAcc.length !== vm.selectedCSAccount.length && csAcc.length>0) {

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

                let thisMonthDateStartTime = utilService.getThisMonthStartTime();
                obj.startTime.data('datetimepicker').setLocalDate(new Date(thisMonthDateStartTime));

                obj.endTime = utilService.createDatePicker(queryId + ' .endTime', {
                    language: 'en',
                    format: 'dd/MM/yyyy hh:mm:ss'
                });
                let thisMonthDatEndTime = utilService.getThisMonthEndTime();
                obj.endTime.data('datetimepicker').setLocalDate(new Date(thisMonthDatEndTime));
            };


            vm.prepareShowQIReport = function () {
                vm.selectedCSAccount=[];
                vm.selectedLive800Acc = [];
                vm.selectedLive800= [];
                vm.allLive800Acc=[];
                vm.allCSDepartmentId=[];
                vm.selectedCS = [];
                vm.platformWithCSDepartment=[]; // to filter out the platform with CS Department for the Product Filter
                vm.selectedCompanyId = [];


                vm.platformList.forEach(platform => {
                    // select the bounded companyId
                    if (platform.data.live800CompanyId && platform.data.live800CompanyId.length > 0){
                        platform.data.live800CompanyId.forEach( companyId => {
                            vm.selectedCompanyId.push(companyId);
                        })
                    }
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

                    $scope.$evalAsync(() => {
                        if (data && data.data){
                            data.data.forEach(acc => {
                                if (acc.live800Acc && acc.live800Acc.length > 0 && !acc.live800Acc.includes("")){

                                    acc.live800Acc.forEach(liveAcc => {
                                        //check the operatorId is bound to the selected companyID (i.e., platform)
                                        if( vm.selectedCompanyId.indexOf(liveAcc.split("-")[0]) > -1 ){
                                            vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                            vm.selectedLive800.push(liveAcc);
                                        }
                                    });
                                    if(vm.selectedLive800.length > 0){
                                        vm.selectedCSAccount.push(acc);
                                        vm.selectedCS.push(acc._id);
                                    }
                                }
                            });

                            console.log("vm.selectedCSAccount",vm.selectedCSAccount);
                            console.log("vm.selectedCS",vm.selectedCS);
                            console.log("vm.selectedLive800Acc",vm.selectedLive800Acc);
                            console.log("vm.selectedLive800",vm.selectedLive800);
                        }
                    })

                });

                vm.QIReportQuery ={};
                vm.QIReportQuery = {aaSorting: [[0, "desc"]], sortCol: {createTime: -1}};
                utilService.actionAfterLoaded("#QIReportTable", function () {
                    vm.commonInitTime(vm.QIReportQuery, '#QIReportQuery');
                    $scope.safeApply()
                });

            };

            vm.searchQIRecord = function (newSearch) {

                let startTime = vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate();
                let endTime = vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate();

                // let searchInterval = new Date(endTime).getTime() - new Date(utilService.getTodayStartTime()).getTime();
                // if (searchInterval > 0) {
                //     socketService.showErrorMessage($translate("Exceed QI Report search max time frame"));
                //     return;
                // }

                vm.platformCompanyID=[];
                vm.platformList.forEach(platform => {
                    if (platform.data.live800CompanyId && platform.data.live800CompanyId.length>0){
                        vm.platformCompanyID.push({productName: platform.data.name, id: platform.data._id,companyId:platform.data.live800CompanyId});
                    }
                });

                vm.mysqlData=[];
                let searchAllByDefault = false;
                if (vm.selectedLive800.length === vm.allLive800Acc.length || vm.selectedLive800.length == 0){
                    searchAllByDefault = true;
                }

                $('#QIReportTableSpin').show();

                var query = {
                    //'companyId':vm.companyID,
                    'operatorId':searchAllByDefault === false ? vm.selectedLive800 : [],
                    'startTime': vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                    'endTime': vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate(),
                };

                if (!vm.inspection800.searchBySummaryData) {
                    socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecord', query, success, error);
                }
                else{
                    socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecordByDailyRecord', query, success, error);
                }

                function success(data) {
                    console.log("searchLive800Record", data);
                    vm.displayData = [];
                    vm.postData = [];
                    vm.rawMysqlData=[];


                    if (data.data[0] && data.data[0].length > 0) {

                        vm.mysqlData = $.extend(true, [], data.data[0]);

                        // handle total number of effective conversation, non-effective conversation and total conversation
                        let preData = [];
                        data.data[0].filter(item => {
                            //preData =  data.data[0].map(item => {
                            let itemObj = {};

                            let platformIndex = vm.platformCompanyID.findIndex(p => p.companyId.includes(item.companyId.toString()));
                            if (platformIndex != -1) {
                                itemObj.productName = vm.platformCompanyID[platformIndex].productName;

                            }
                            let index = vm.selectedLive800Acc.findIndex(p => p.live800Acc.toUpperCase() == item.operatorId.toUpperCase())
                            if (index != -1) {
                                itemObj.adminName = vm.selectedLive800Acc[index].adminName;
                            }

                            if (itemObj.productName && itemObj.adminName){
                                itemObj.count_0 = item.totalNonEffectiveCount;
                                itemObj.count_1 = item.totalEffectiveCount;
                                itemObj.totalCount = item.totalCount;

                                return preData.push(itemObj);
                            }


                        });

                        if (preData && preData.length > 0) {
                            var holder = {};

                            preData.forEach(d => {

                                if (holder.hasOwnProperty(d.adminName)) {
                                    holder[d.adminName] = [holder[d.adminName][0] + d.count_0, holder[d.adminName][1] + d.count_1, holder[d.adminName][2] + d.totalCount];
                                } else {
                                    holder[d.adminName] = [d.count_0, d.count_1, d.totalCount];
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
                                        totalCount: holder[prop][2],
                                    })
                                }
                            }

                        }

                        if (vm.postData.length > 0){
                            if (data.data[1] && data.data[1].length > 0) {
                                // handle the status of the conversation record group by operatorId based on status
                                let preData = [];

                                preData = data.data[1].map(item => {
                                    let itemObj = {};
                                    let index = vm.selectedLive800Acc.findIndex(p => p.live800Acc.toUpperCase() == item.operatorId.toUpperCase())
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
                                        if (vm.postData[index].hasOwnProperty(vm.constQualityInspectionStatus[data.status])) {
                                            vm.postData[index][vm.constQualityInspectionStatus[data.status]] = vm.postData[index][vm.constQualityInspectionStatus[data.status]] + data.count;
                                        } else {
                                            vm.postData[index][vm.constQualityInspectionStatus[data.status]] = data.count;
                                        }
                                    }
                                });
                            }
                            vm.postData.map(data => {
                                for (let i = 1; i < Object.keys(vm.constQualityInspectionStatus).length + 1; i++) {
                                    if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])) {
                                        data[vm.constQualityInspectionStatus[i]] = 0;
                                    }
                                }
                                return data;
                            });

                            if (data.data[2] && data.data[2].length > 0) {
                                // handle the total timeout rate and total inspesction per operatorId
                                let preData = [];

                                preData = data.data[2].map(item => {
                                    let itemObj = {};
                                    let index = vm.selectedLive800Acc.findIndex(p => p.live800Acc.toUpperCase() == item.operatorId.toUpperCase())
                                    if (index != -1) {
                                        itemObj.adminName = vm.selectedLive800Acc[index].adminName;
                                    }
                                    itemObj.totalOvertimeRate = item.totalOvertimeRate;
                                    itemObj.totalInspectionRate = item.totalInspectionRate;

                                    return itemObj;
                                });

                                preData.forEach(data => {
                                    let index = vm.postData.findIndex(p => p.adminName == data.adminName);
                                    if (index != -1) {
                                        if (vm.postData[index].hasOwnProperty("totalOvertimeRate")) {
                                            vm.postData[index]["totalOvertimeRate"] = vm.postData[index]["totalOvertimeRate"] + data.totalOvertimeRate;
                                        } else {
                                            vm.postData[index]["totalOvertimeRate"] = data.totalOvertimeRate;
                                        }

                                        if (vm.postData[index].hasOwnProperty("totalInspectionRate")) {
                                            vm.postData[index]["totalInspectionRate"] = vm.postData[index]["totalInspectionRate"] + data.totalInspectionRate;
                                        } else {
                                            vm.postData[index]["totalInspectionRate"] = data.totalInspectionRate;
                                        }
                                    }
                                });
                            }

                            vm.postData.map(data => {
                                if (!data.totalOvertimeRate){
                                    data.totalOvertimeRate = 0;
                                }
                                if (!data.totalInspectionRate){
                                    data.totalInspectionRate = 0;
                                }

                                data.pendingCount = data.count_1 - data.COMPLETED_UNREAD - data.COMPLETED_READ - data.COMPLETED - data.APPEALING - data.APPEAL_COMPLETED
                                data.avgMark = ((data.totalOvertimeRate || 0 + data.totalInspectionRate || 0) / (data.COMPLETED_UNREAD + data.COMPLETED_READ + data.COMPLETED + data.APPEALING + data.APPEAL_COMPLETED)).toFixed(2);
                                // check NaN
                                if (data.pendingCount == "NaN") {
                                    data.pendingCount = Number(0).toFixed(2);
                                }
                                if (data.avgMark == "NaN" || data.avgMark == "Infinity") {
                                    data.avgMark = Number(0).toFixed(2);
                                }

                                return data;
                            })
                        }

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
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: "totalOvertimeRate",
                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: "totalInspectionRate",
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
                        vm.displayDetailData = [];

                        socketService.$socket($scope.AppSocket, 'getAdminsInfo', {
                                adminName: data.adminName

                            }, function (data) {

                                if (!data || !data.data[0] || data.data[0].length == 0){
                                    return;
                                }

                                selectedLiveAcc = data.data[0].live800Acc.filter( acc => {return vm.selectedCompanyId.indexOf(acc.split("-")[0]) != -1 });
                            
                                let params= {
                                    'operatorId': selectedLiveAcc,
                                    'startTime':vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                                    'endTime': vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate()
                                };

                                if (!vm.inspection800.searchBySummaryData){
                                    socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecord', params, success, error);

                                }
                                else{
                                    socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecordByDailyRecord', params, success, error);

                                }

                                function success(data) {

                                    if (data.data[0] && data.data[0].length > 0) {

                                        vm.displayDetailData = $.extend(true, [], data.data[0]);

                                        if (data.data[1] && data.data[1].length > 0) {
                                            data.data[1].forEach(data => {
                                                let index = vm.displayDetailData.findIndex(p => p.operatorId.toUpperCase() == data.operatorId.toUpperCase());
                                                if (index != -1) {
                                                    if (vm.displayDetailData[index].hasOwnProperty(vm.constQualityInspectionStatus[data.status])) {
                                                        vm.displayDetailData[index][vm.constQualityInspectionStatus[data.status]] +=  data.count;
                                                    } else {
                                                        vm.displayDetailData[index][vm.constQualityInspectionStatus[data.status]] = data.count;
                                                    }
                                                }
                                            });
                                        }
                                        vm.displayDetailData.map(data => {
                                            for (let i = 1; i < Object.keys(vm.constQualityInspectionStatus).length + 1; i++) {
                                                if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])) {
                                                    data[vm.constQualityInspectionStatus[i]] = 0;
                                                }
                                            }
                                            return data;
                                        });

                                        if (data.data[2] && data.data[2].length > 0) {
                                            data.data[2].forEach(data => {
                                                let index = vm.displayDetailData.findIndex(p => p.operatorId.toUpperCase() == data.operatorId.toUpperCase());
                                                if (index != -1) {
                                                    vm.displayDetailData[index].totalInspectionRate = data.totalInspectionRate;
                                                    vm.displayDetailData[index].totalOvertimeRate = data.totalOvertimeRate;
                                                }
                                            });
                                        }

                                            vm.displayDetailData.map(data => {
                                                if (!data.totalOvertimeRate){
                                                    data.totalOvertimeRate = 0;
                                                }
                                                if (!data.totalInspectionRate){
                                                    data.totalInspectionRate = 0;
                                                }
                                                data.pendingCount = data.totalEffectiveCount - data.COMPLETED_UNREAD - data.COMPLETED_READ - data.COMPLETED - data.APPEALING - data.APPEAL_COMPLETED;
                                                data.avgMark = ((data.totalOvertimeRate || 0 + data.totalInspectionRate || 0) / (data.COMPLETED_UNREAD + data.COMPLETED_READ + data.COMPLETED + data.APPEALING + data.APPEAL_COMPLETED)).toFixed(2);

                                                // check NaN
                                                if (data.pendingCount == "NaN") {
                                                    data.pendingCount = Number(0).toFixed(2);
                                                }
                                                if (data.avgMark == "NaN" || data.avgMark == "Infinity") {
                                                    data.avgMark = Number(0).toFixed(2);
                                                }

                                                return data;
                                            });
                                        
                                        $scope.safeApply();
                                        vm.drawDetailQIReportTable(vm.displayDetailData, id, vm.displayDetailData.length, newSearch, []);
                                    }
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

                        {
                            title: "Live800 " + $translate('Account'), data: "operatorId", sClass: "expandInnerPlayerReport",
                            render: function (data, type, row) {
                                return "<a>" + data + "</a>";
                            }

                        },
                        {
                            title: $translate('TOTAL_CONVERSATION_RECORD'),
                            data: "totalCount",

                        },
                        {
                            title: $translate('NOT_EVALUATED_QUANTITY'), data: "totalNonEffectiveCount",

                        },
                        {
                            title: $translate('EFFECTIVE_CONVERSATION_QUANTITY'), data: "totalEffectiveCount",

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
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: "totalOvertimeRate",

                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: "totalInspectionRate",

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
                //start
                $('#' + id).off('click', 'td.expandInnerPlayerReport');
                $('#' + id).resize();

                $('#' + id).on('click', 'td.expandInnerPlayerReport', function () {
                    var tr = $(this).closest('tr');
                    var row = innerTable.row(tr);

                    if (row.child.isShown()) {
                        // This row is already open - close it
                        row.child.hide();
                        tr.removeClass('shown');
                    }
                    else {
                        // Open this row
                        var data = row.data();
                        console.log('content', data);
                        var id = 'detailReportTable' + data.operatorId;
                        row.child(vm.createInnerTable(id)).show();
                        vm[id] = {};

                        let selectedLiveAcc = [];
                        let selectedCompanyId =[];
                        vm.displayDetailData = [];

                        let params= {
                            'operatorId': [data.operatorId],
                            'startTime':vm.QIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                            'endTime': vm.QIReportQuery.endTime.data('datetimepicker').getLocalDate()
                        };

                        if (!vm.inspection800.searchBySummaryData) {
                            socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecordByDate', params, onSuccess);
                        }
                        else {
                            socketService.$socket($scope.AppSocket, 'searchLive800SettlementRecordByDateInDailyRecord', params, onSuccess);
                        }

                        tr.addClass('shown');
                    }

                    function onSuccess (data){
                        if (data.data[0] && data.data[0].length > 0) {

                            vm.displayDetailData = $.extend(true, [], data.data[0]);

                            if (data.data[1] && data.data[1].length > 0) {
                                data.data[1].forEach(data => {
                                    let index = vm.displayDetailData.findIndex(p => p.date == data.date);
                                    if (index != -1) {
                                        if (data.data && data.data.length > 0){
                                            data.data.forEach( inData => {
                                                if (vm.displayDetailData[index].hasOwnProperty(vm.constQualityInspectionStatus[inData._id.status])) {
                                                    vm.displayDetailData[index][vm.constQualityInspectionStatus[inData._id.status]] += inData.count;
                                                } else {
                                                    vm.displayDetailData[index][vm.constQualityInspectionStatus[inData._id.status]] = inData.count;
                                                }
                                            })
                                        }

                                    }
                                });
                            }
                            vm.displayDetailData.map(data => {
                                for (let i = 1; i < Object.keys(vm.constQualityInspectionStatus).length + 1; i++) {
                                    if (!data.hasOwnProperty(vm.constQualityInspectionStatus[i])) {
                                        data[vm.constQualityInspectionStatus[i]] = 0;
                                    }
                                }
                                return data;
                            });

                            if (data.data[2] && data.data[2].length > 0) {
                                data.data[2].forEach(data => {
                                    let index = vm.displayDetailData.findIndex(p => p.date == data.date);
                                    if (index != -1) {
                                        vm.displayDetailData[index].totalInspectionRate = data.totalInspectionRate;
                                        vm.displayDetailData[index].totalOvertimeRate = data.totalOvertimeRate;
                                    }
                                });
                            }

                            vm.displayDetailData.map(data => {

                                data.date = utilService.getFormatTime(new Date(data.date)).split(" ")[0];

                                if (!data.totalOvertimeRate){
                                    data.totalOvertimeRate = 0;
                                }
                                if (!data.totalInspectionRate){
                                    data.totalInspectionRate = 0;
                                }
                                data.pendingCount = data.totalEffectiveCount - data.COMPLETED_UNREAD - data.COMPLETED_READ - data.COMPLETED - data.APPEALING - data.APPEAL_COMPLETED;
                                data.avgMark = ((data.totalOvertimeRate || 0 + data.totalInspectionRate || 0) / (data.COMPLETED_UNREAD + data.COMPLETED_READ + data.COMPLETED + data.APPEALING + data.APPEAL_COMPLETED)).toFixed(2);

                                // check NaN
                                if (data.pendingCount == "NaN") {
                                    data.pendingCount = Number(0).toFixed(2);
                                }
                                if (data.avgMark == "NaN" || data.avgMark == "Infinity") {
                                    data.avgMark = Number(0).toFixed(2);
                                }

                                return data;
                            });

                            $scope.safeApply();
                            vm.drawInDetailQIReportTable(vm.displayDetailData, id, vm.displayDetailData.length, newSearch, []);
                        }

                    }
                });
                $('#' + id).off('order.dt');
                $('#' + id).on('order.dt', function (event, a, b) {
                //$('#QIReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'QIReportQuery', vm.searchQIRecord);
                });
            };

            vm.drawInDetailQIReportTable = function (data, id, size, newSearch, qObj) {
                let holder = data;
                let tableOptions = {
                    data: data,
                    //"ordering": false,
                    // aoColumnDefs: [
                    //     {targets: '_all', defaultContent: ' ', bSortable: false}
                    // ],
                    columns: [

                        {
                            title: $translate('date'), data: "date",
                        },
                        {
                            title: $translate('TOTAL_CONVERSATION_RECORD'),
                            data: "totalCount",

                        },
                        {
                            title: $translate('NOT_EVALUATED_QUANTITY'), data: "totalNonEffectiveCount",

                        },
                        {
                            title: $translate('EFFECTIVE_CONVERSATION_QUANTITY'), data: "totalEffectiveCount",

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
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: "totalOvertimeRate",

                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: "totalInspectionRate",

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
                var innerDetailTable = $('#' + id).DataTable(tableOptions);

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

            vm.summarizeLive800Record = function(){
                vm.loadingSummarizeLive800Record = true;
                var startTime = $('#live800SummarizeStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#live800SummarizeEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                };

                socketService.$socket($scope.AppSocket, 'summarizeLive800Record', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        vm.summarizedDataDetail = "";
                        vm.loadingSummarizeLive800Record = false;
                    })
                }, function (error){
                    vm.loadingSummarizeLive800Record = false;
                    console.log("Error when gather summarized Live 800 Record Data:", error)
                });

                socketService.$socket($scope.AppSocket, 'getLive800Records', sendData, function (data) {
                   console.log("Live800 records has gathered completely")
                }, function (error){
                    console.log("Error when gather Live800 records: ", error)
                });
            }

            vm.resummarizeLive800Record = function(){
                vm.loadingSummarizeLive800Record = true;
                var startTime = $('#live800SummarizeStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#live800SummarizeEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                };

                socketService.$socket($scope.AppSocket, 'resummarizeLive800Record', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        vm.summarizedDataDetail = "";
                        vm.loadingSummarizeLive800Record = false;
                    })
                }, function (error){
                    vm.loadingSummarizeLive800Record = false;
                    console.log("Error when gather summarized Live 800 Record Data:", error)
                });

                socketService.$socket($scope.AppSocket, 'getLive800Records', sendData, function (data) {
                    console.log("Live800 records has gathered completely")
                }, function (error){
                    console.log("Error when gather Live800 records: ", error)
                });
            }

            vm.getSummarizedLive800RecordCount = function(){
                vm.loadingSummarizeLive800Record = true;
                vm.summarizedDataDetail = "";
                var startTime = $('#live800SummarizeStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#live800SummarizeEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                };

                vm.loadingSummarizeLive800Record = true;
                socketService.$socket($scope.AppSocket, 'getSummarizedLive800RecordCount', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data.data){
                            vm.summarizedDataDetail = "Live 800 Record: " +  data.data[0].mysqlLive800Record + ", FPMS Record: " + data.data[0].mongoLive800Record;
                        }

                        vm.loadingSummarizeLive800Record = false;
                    })
                });
            }

            //****** CS Report Tab ******* ENDd //

            //////////////////////////////////////////////////////////Start of Wechat Conversation Record Tab///////////////////////////////////////////////////////////////////
            vm.initWechatConversationRecord = function(){
                vm.getWechatDeviceNickNameList();

                if(vm.selectedPlatform){
                    utilService.actionAfterLoaded('#wechatMessageBeginDatetimePicker', function () {
                        $('#wechatMessageBeginDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#wechatMessageBeginDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#wechatMessageEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#wechatMessageEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            };

            vm.getWechatDeviceNickNameList = function(isFuzzy = false){
                let sendData = {};

                if(vm.inspectionWechat && (vm.inspectionWechat.platform || vm.inspectionWechat.fuzzyPlatform)){
                    sendData.platform = isFuzzy ? vm.inspectionWechat.fuzzyPlatform : vm.inspectionWechat.platform;
                }

                socketService.$socket($scope.AppSocket, 'getWechatDeviceNickNameList', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data.data){
                            if(isFuzzy){
                                vm.fuzzyWechatDeviceList = data.data.sort();
                            }else{
                                vm.wechatDeviceList = data.data.sort();
                            }
                        }
                    })
                });

            };

            vm.getFuzzyWechatDeviceNickNameList = function(){
                let sendData = {};

                if(vm.inspectionWechat && vm.inspectionWechat.platform){
                    sendData.platform = vm.inspectionWechat.platform;
                }

                socketService.$socket($scope.AppSocket, 'getWechatDeviceNickNameList', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data.data){
                            vm.wechatDeviceList = data.data.sort();
                        }
                    })
                });
            }

            vm.searchWechatConversationDevice = function(){
                var startTime = $('#wechatMessageBeginDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#wechatMessageEndDatetimePicker').data('datetimepicker').getLocalDate();
                let csName = vm.inspectionWechat.csName ? vm.inspectionWechat.csName.split(',') : [];
                csName = csName.map(c => c.trim());

                let sendData = {
                    platform: vm.inspectionWechat.platform || "",
                    deviceNickName: vm.inspectionWechat.deviceName || "",
                    csName: csName,
                    startTime: startTime,
                    endTime: endTime,
                    content: vm.inspectionWechat.content,
                    playerWechatRemark: vm.inspectionWechat.playerWechatRemark,
                    index: vm.inspectionWechat.index || 0,
                    limit: vm.inspectionWechat.limit || 1000
                };
                vm.deviceList = [];
                vm.deviceListTotal = 0;
                vm.showDeviceTable = true;
                $('#wechatConversationTableSpin').show();
                let playerWechatRemarkList = [];

                socketService.$socket($scope.AppSocket, 'getWechatConversationDeviceList', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data && data.data){
                            vm.getWechatDeviceNickNameList(true);
                            console.log("Wechat Conversation Device List", data.data);
                            vm.deviceListTotal = data.data.size;

                            data.data.data.forEach(data => {
                                if(data && data._id && data._id.platformName && data._id.deviceNickName && data._id.playerWechatRemark){
                                    let indexByPlatform = vm.deviceList.findIndex(d => d.platformName == data._id.platformName);
                                    playerWechatRemarkList.push(data._id.playerWechatRemark);

                                    if (data && data._id && data._id.playerWechatId) {
                                        let str = data._id.playerWechatId;
                                        data._id.encodedPlayerWechatId = str.substring(0, 3) + "******" + str.slice(-4);
                                    }

                                    if(indexByPlatform > -1){
                                        if(vm.deviceList[indexByPlatform]){
                                            let indexByDevice = vm.deviceList[indexByPlatform].deviceNickName.findIndex(d => d.deviceNickName == data._id.deviceNickName);

                                            if(indexByDevice > -1){
                                                if(vm.deviceList[indexByPlatform].deviceNickName[indexByDevice]){
                                                    vm.deviceList[indexByPlatform].deviceNickName[indexByDevice].playerWechatRemark.push({playerWechatRemark: data._id.playerWechatRemark, playerWechatId: data._id.playerWechatId, encodedPlayerWechatId: data._id.encodedPlayerWechatId || ''});
                                                }else{
                                                    vm.deviceList[indexByPlatform].deviceNickName.push({deviceNickName: data._id.deviceNickName, playerWechatRemark: [{playerWechatRemark: data._id.playerWechatRemark, playerWechatId: data._id.playerWechatId, encodedPlayerWechatId: data._id.encodedPlayerWechatId || ''}]});
                                                }
                                            }else{
                                                vm.deviceList[indexByPlatform].deviceNickName.push({deviceNickName: data._id.deviceNickName, playerWechatRemark: [{playerWechatRemark: data._id.playerWechatRemark, playerWechatId: data._id.playerWechatId, encodedPlayerWechatId: data._id.encodedPlayerWechatId || ''}]});
                                            }
                                        }else{
                                            vm.deviceList.push({platformId: data._id.platformObjId, platformName: data._id.platformName, deviceNickName: [{deviceNickName: data._id.deviceNickName, playerWechatRemark: [{playerWechatRemark: data._id.playerWechatRemark, playerWechatId: data._id.playerWechatId, encodedPlayerWechatId: data._id.encodedPlayerWechatId || ''}]}]});
                                        }

                                    }else{
                                        vm.deviceList.push({platformId: data._id.platformObjId, platformName: data._id.platformName,deviceNickName: [{deviceNickName: data._id.deviceNickName, playerWechatRemark: [{playerWechatRemark: data._id.playerWechatRemark, playerWechatId: data._id.playerWechatId, encodedPlayerWechatId: data._id.encodedPlayerWechatId || ''}]}]});
                                    }
                                }
                            });

                            if(data && data.data && data.data.size){
                                let itemTotal = data && data.data && data.data.size ? data.data.size : 0;
                                let totalPage = itemTotal / vm.inspectionWechat.limit
                                vm.inspectionWechat.totalPage = Math.ceil(totalPage);
                                vm.inspectionWechat.totalCount = data.data.size;
                            }else{
                                vm.inspectionWechat.totalPage  = 1;
                                vm.inspectionWechat.totalCount = 0;
                            }
                            vm.inspectionWechatPages = [];
                            for(let i = 0; i < vm.inspectionWechat.totalPage; i++){
                                vm.inspectionWechatPages.push(i);
                            }

                            $('#wechatConversationTableSpin').hide();
                            vm.oriDeviceList = vm.deviceList;
                            vm.searchWechatConversation(vm.inspectionWechat.platform, vm.inspectionWechat.deviceName, playerWechatRemarkList);
                        }
                    })
                });
            };

            vm.nextInspectionWechatPage = function(){
                vm.inspectionWechat.currentPage += 1;
                vm.inspectionWechat.index = (vm.inspectionWechat.currentPage - 1) * vm.inspectionWechat.limit;
                if (vm.inspectionWechat.currentPage > 0 && vm.inspectionWechat.currentPage <= vm.inspectionWechat.totalPage) {
                    vm.searchWechatConversationDevice();
                }
            };

            vm.gotoInspectionWechatPage = function(pg, $event){
                $('body .pagination li').removeClass('active');
                if($event){
                    $($event.currentTarget).addClass('active');
                }
                let pgNo = null;
                if(pg<=0){
                    pgNo = 0
                }else if(pg >= 1){
                    pgNo = pg;
                }
                vm.inspectionWechat.index = ((pgNo - 1) * vm.inspectionWechat.limit);
                vm.inspectionWechat.currentPage = pgNo;
                if (vm.inspectionWechat.currentPage > 0 && vm.inspectionWechat.currentPage <= vm.inspectionWechat.totalPage) {
                    vm.searchWechatConversationDevice();
                }
            };

            vm.searchWechatConversation = function (platform, deviceNickName, playerWechatRemark) {
                vm.inspectionWechat.conversationPlatform = platform;
                vm.inspectionWechat.conversationDeviceNickName = deviceNickName;
                vm.inspectionWechat.conversationPlayerWechatRemark = playerWechatRemark;

                utilService.actionAfterLoaded(('#wechatMessageBeginDatetimePicker'), function () {
                    vm.inspectionWechat.pageObj = utilService.createPageForPagingTable("#wechatMessageTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "inspectionWechat", vm.filterWechatConversation);
                    });
                    vm.filterWechatConversation(true);
                });
            }

            vm.filterWechatConversation = function(newSearch){
                var startTime = $('#wechatMessageBeginDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#wechatMessageEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    platform: vm.inspectionWechat.conversationPlatform,
                    deviceNickName: vm.inspectionWechat.conversationDeviceNickName,
                    playerWechatRemark: vm.inspectionWechat.conversationPlayerWechatRemark && vm.inspectionWechat.conversationPlayerWechatRemark.length > 0 ?
                        vm.inspectionWechat.conversationPlayerWechatRemark : [],
                    startTime: startTime,
                    endTime: endTime,
                    content: vm.inspectionWechat.content,
                    index: newSearch ? 0 : (vm.inspectionWechat.index || 0),
                    limit: vm.inspectionWechat.limit || 10,
                    sortCol: vm.inspectionWechat.sortCol || null,
                };

                socketService.$socket($scope.AppSocket, 'getWechatConversation', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data && data.data && data.data.data){
                            console.log("Wechat Conversation", data.data.data);

                            data.data.data.forEach(data => {
                                data.csReplyTime = utilService.getFormatTime(data.csReplyTime);
                            });

                            vm.wechatConversationList = data.data.data;
                            vm.drawWechatMessageTable(newSearch, vm.wechatConversationList, data.data.size);
                        }
                    });

                });
            };

            vm.drawWechatMessageTable = function (newSearch, tblData, size) {
                console.log("wechatMessageTable",tblData);
                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {'sortCol': 'platformObjId', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'deviceNickName', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'csOfficer', bSortable: true, 'aTargets': [2]},
                        {'sortCol': 'playerWechatRemark', bSortable: true, 'aTargets': [3]},
                        {'sortCol': 'csReplyTime', bSortable: true, 'aTargets': [4]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    "scrollX": true,
                    "autoWidth": true,
                    "sScrollY": 550,
                    "scrollCollapse": true,
                    columns: [
                        {title: $translate('PRODUCT'), data: "platformObjId.name"},
                        {title: $translate('Create Device Name'), data: "deviceNickName"},
                        {title: $translate('CS Account'), data: "csOfficer.adminName"},
                        {title: $translate('wechatReceivingPlayer'), data: "playerWechatRemark"},
                        {title: $translate('Message Time'), data: "csReplyTime"},
                        {title: $translate('Message Content'), data: "csReplyContent"},
                    ],
                    "paging": false,
                    fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $compile(nRow)($scope);
                    }
                });
                tableOptions.language.emptyTable=$translate("No data available in table");

                utilService.createDatatableWithFooter('#wechatMessageTable', tableOptions, {
                });

                vm.inspectionWechat.pageObj.init({maxCount: size}, newSearch);
                $('#wechatMessageTable').off('order.dt');
                $('#wechatMessageTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'inspectionWechat', vm.filterWechatConversation);
                });
                $('#wechatMessageTable').resize();
                $scope.$evalAsync();
            };

            vm.fuzzySearchDeviceList = function(){
                $scope.$evalAsync(() => {
                    let useDeviceList = false;
                    if(vm.oriDeviceList && vm.oriDeviceList.length > 0){
                        //filter by platform
                        if(vm.inspectionWechat.fuzzyPlatform && vm.inspectionWechat.fuzzyPlatform.length > 0){
                            let deviceArrayByPlatform = [];
                            vm.inspectionWechat.fuzzyPlatform.forEach(
                                platform => {
                                    let result = vm.oriDeviceList.filter(d => d.platformId == platform);
                                    if(result && result.length > 0){
                                        deviceArrayByPlatform.push(result[0]);
                                    }
                                }
                            )
                            useDeviceList = true;
                            vm.deviceList = deviceArrayByPlatform;
                        }

                        //filter by deviceNickName
                        if(vm.inspectionWechat.fuzzyDeviceName){
                            let currentDeviceList = useDeviceList ? vm.deviceList : vm.oriDeviceList;
                            useDeviceList = vm.filterConversationByDeviceNickName(currentDeviceList);
                        }

                        //filter by playerWechatRemark
                        if(vm.inspectionWechat.fuzzyPlayerWechatRemark){
                            let currentDeviceList = useDeviceList ? vm.deviceList : vm.oriDeviceList;
                            useDeviceList = vm.filterConversationByPlayerWechatRemark(currentDeviceList);
                        }

                        vm.deviceList = useDeviceList ? vm.deviceList : vm.oriDeviceList;
                    }
                });

            };

            vm.filterConversationByDeviceNickName = function(currentDeviceList){

                let deviceArray = [];
                currentDeviceList.forEach(deviceList => {
                    deviceList.deviceNickName.forEach(deviceNickName => {
                        let indexOfDeviceName = vm.inspectionWechat.fuzzyDeviceName.findIndex(f => f == deviceNickName.deviceNickName);
                        if(indexOfDeviceName > -1){
                            let indexByPlatform = deviceArray.findIndex(d => d.platformName == deviceList.platformName);

                            if(indexByPlatform > -1){
                                if(deviceArray[indexByPlatform]){
                                    deviceArray[indexByPlatform].deviceNickName.push({deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: deviceNickName.playerWechatRemark});
                                }else{
                                    deviceArray.push({platformId: deviceList.platformId, platformName: deviceList.platformName,deviceNickName: [{deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: deviceNickName.playerWechatRemark}]});
                                }
                            }else{
                                deviceArray.push({platformId: deviceList.platformId, platformName: deviceList.platformName,deviceNickName: [{deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: deviceNickName.playerWechatRemark}]});
                            }
                        }
                    })

                    return deviceArray;
                });


                vm.deviceList = deviceArray;

                return true;
            }

            vm.filterConversationByPlayerWechatRemark = function(currentDeviceList){
                let deviceArray = [];
                currentDeviceList.forEach(deviceList => {
                    deviceList.deviceNickName.forEach(deviceNickName => {
                        let playerWechatRemark;
                        let indexOfPlayerWechatRemark = deviceNickName.playerWechatRemark.findIndex(p => p.playerWechatRemark == vm.inspectionWechat.fuzzyPlayerWechatRemark);
                        playerWechatRemark = indexOfPlayerWechatRemark > -1 ? [deviceNickName.playerWechatRemark[indexOfPlayerWechatRemark]] : [];

                        let indexOfDeviceName = vm.inspectionWechat.fuzzyDeviceName.findIndex(f => f == deviceNickName.deviceNickName);
                        if(indexOfDeviceName > -1){
                            let indexByPlatform = deviceArray.findIndex(d => d.platformName == deviceList.platformName);

                            if(indexByPlatform > -1){
                                if(deviceArray[indexByPlatform]){
                                    let indexByDevice = deviceArray[indexByPlatform].deviceNickName.findIndex(d => d.deviceNickName == deviceNickName.deviceNickName);

                                    if(indexByDevice > -1){
                                        if(deviceArray[indexByPlatform].deviceNickName[indexByDevice]){
                                            let indexOfPlayerWechatRemark = deviceArray[indexByPlatform].deviceNickName[indexByDevice].playerWechatRemark.find(p => p.playerWechatRemark == vm.inspectionWechat.fuzzyPlayerWechatRemark);
                                            if(indexOfPlayerWechatRemark == -1){
                                                deviceArray[indexByPlatform].deviceNickName[indexByDevice].playerWechatRemark.push(deviceNickName.playerWechatRemark);
                                            }
                                        }else{
                                            deviceArray[indexByPlatform].deviceNickName.push({deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: playerWechatRemark});
                                        }
                                    }else{
                                        if(playerWechatRemark && playerWechatRemark.length > 0){
                                            deviceArray[indexByPlatform].deviceNickName.push({deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: playerWechatRemark});
                                        }
                                    }
                                }else{
                                    if(playerWechatRemark && playerWechatRemark.length > 0){
                                        deviceArray.push({platformId: deviceList.platformId, platformName: deviceList.platformName,deviceNickName: [{deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: playerWechatRemark}]});
                                    }
                                }
                            }else{
                                if(playerWechatRemark && playerWechatRemark.length > 0){
                                    deviceArray.push({platformId: deviceList.platformId, platformName: deviceList.platformName,deviceNickName: [{deviceNickName: deviceNickName.deviceNickName, playerWechatRemark: playerWechatRemark}]});
                                    return;
                                }
                            }
                        }
                    });

                    return deviceArray;
                });

                vm.deviceList = deviceArray;
                return true;
            }


            //////////////////////////////////////////////////////////End of Wechat Conversation Record Tab///////////////////////////////////////////////////////////////////


            //////////////////////////////////////////////////////////Start of Wechat Conversation Report Tab///////////////////////////////////////////////////////////////////
            vm.initWechatConversationReport = function(){
                vm.getWechatDeviceNickNameListForReport();

                if(vm.selectedPlatform){
                    utilService.actionAfterLoaded('#wechatMessageReportBeginDatetimePicker', function () {
                        $('#wechatMessageReportBeginDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#wechatMessageReportBeginDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#wechatMessageReportEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#wechatMessageReportEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            };

            vm.getWechatDeviceNickNameListForReport = function(){
                let sendData = {};

                if(vm.inspectionWechatReport && vm.inspectionWechatReport.platform){
                    sendData.platform = vm.inspectionWechatReport.platform
                }

                socketService.$socket($scope.AppSocket, 'getWechatDeviceNickNameList', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data.data){
                            vm.wechatReportDeviceList = data.data.sort();
                        }
                    })
                });

            };

            vm.searchWechatConversationReport = function () {
                utilService.actionAfterLoaded(('#wechatMessageReportBeginDatetimePicker'), function () {
                    vm.inspectionWechatReport.pageObj = utilService.createPageForPagingTable("#wechatMessageReportTablePage", {}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "inspectionWechatReport", vm.filterWechatConversationReport);
                    });
                    vm.filterWechatConversationReport(true);
                });
            };

            vm.filterWechatConversationReport = function(newSearch){
                var startTime = $('#wechatMessageReportBeginDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#wechatMessageReportEndDatetimePicker').data('datetimepicker').getLocalDate();
                let csName = vm.inspectionWechatReport.csName ? vm.inspectionWechatReport.csName.split(',') : [];
                csName = csName.map(c => c.trim());

                let sendData = {
                    platform: vm.inspectionWechatReport.platform || "",
                    deviceNickName: vm.inspectionWechatReport.deviceName || "",
                    csName: csName,
                    startTime: startTime,
                    endTime: endTime,
                    index: newSearch ? 0 : (vm.inspectionWechatReport.index || 0),
                    limit: vm.inspectionWechatReport.limit || 10,
                };

                $('#wechatConversationReportTableSpin').show();
                socketService.$socket($scope.AppSocket, 'getWechatConversationReport', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        if(data && data.data && data.data.data){
                            console.log("Wechat Conversation", data.data.data);
                            data.data.data.forEach(
                                data => {
                                    if(data){
                                        data.totalPlayerWechatId = data.totalPlayerWechatId || 0;
                                    }
                                }
                            );

                            vm.wechatConversationReportList = data.data.data.sort();
                            vm.wechatConversationReportSize = data.data.size || 0;
                            $('#wechatConversationReportTableSpin').hide();
                            vm.drawWechatMessageReportTable(newSearch, vm.wechatConversationReportList, data.data.size);
                        }
                    });

                });
            };

            vm.drawWechatMessageReportTable = function (newSearch, tblData, size) {
                console.log("wechatMessageReportTable",tblData);
                var tableOptions = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    aoColumnDefs: [
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],
                    "scrollX": true,
                    "autoWidth": true,
                    "sScrollY": 550,
                    "scrollCollapse": true,
                    columns: [
                        {title: $translate('PRODUCT'), data: "platformName"},
                        {title: $translate('CS Account'), data: "csOfficerName"},
                        {title: $translate('Total Conversation(Message Sent)'), data: "totalConversation"},
                        {title: $translate('Total Player In Conversation(By Wechat ID)'), data: "totalPlayerWechatId"},
                    ],
                    "paging": false,
                    fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $compile(nRow)($scope);
                    }
                });
                tableOptions.language.emptyTable=$translate("No data available in table");

                utilService.createDatatableWithFooter('#wechatMessageReportTable', tableOptions, {
                });

                vm.inspectionWechatReport.pageObj.init({maxCount: size}, newSearch);
                $('#wechatMessageReportTable').off('order.dt');
                $('#wechatMessageReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'inspectionWechatReport', vm.filterWechatConversationReport);
                });
                $('#wechatMessageReportTable').resize();
            };
            //////////////////////////////////////////////////////////End of Wechat Conversation Report Tab///////////////////////////////////////////////////////////////////


            //////////////////////////////////////////////////////////Start of Audio System Tab///////////////////////////////////////////////////////////////////
            vm.initCSAudioSystem = function(){
                if(vm.selectedPlatform){
                    utilService.actionAfterLoaded('#audioRecordEndDatetimePicker', function () {
                        $('#audioRecordStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#audioRecordStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                        $('#audioRecordEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#audioRecordEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());
                    });
                }
            };

            //////////////////////////////////////////////////////////End of Audio System Tab///////////////////////////////////////////////////////////////////



            //////////////////////////////////////////////////////////Start of Manual Approval Report Tab///////////////////////////////////////////////////////////////////
            vm.initManualProcessReport = function(){
                vm.selectedCS = [];
                vm.csDepartmentMember = [];
                vm.platformList.forEach(
                    platform => {
                        if (platform && platform.data && platform.data.csDepartment){
                            platform.data.csDepartment.forEach(cItem => {
                                vm.csDepartmentMember = vm.csDepartmentMember.concat(cItem.users);
                            })
                        }
                    }
                );

                if (vm.csDepartmentMember && vm.csDepartmentMember.length) {
                    socketService.$socket($scope.AppSocket, 'getCSAdmins', {admins: vm.csDepartmentMember}, function (cdata) {
                        console.log('all admin data', cdata.data);
                        vm.csList = cdata.data;
                    })
                };

                vm.manualProcessRecordData = {totalCount: 0};
                vm.manualProcessRecordData.index = 0;
                vm.manualProcessRecordData.limit = vm.manualProcessRecordData && vm.manualProcessRecordData.limit ? vm.manualProcessRecordData.limit : 50;
                utilService.actionAfterLoaded(('#manualProcessRecordEndDatetimePicker'), function () {

                    $('#manualProcessRecordStartDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#manualProcessRecordStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthStartTime());

                    $('#manualProcessRecordEndDatetimePicker').datetimepicker({
                        language: 'en',
                        format: 'dd/MM/yyyy hh:mm:ss',
                        pick12HourFormat: true
                    });

                    $("#manualProcessRecordEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getThisMonthEndTime());


                    vm.manualProcessRecordData.pageObj = utilService.createPageForPagingTable("#manualProcessReportTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "manualProcessRecordData", vm.getManualProcessRecord)
                    });
                })
            };

            vm.getManualProcessRecord = function (newSearch){
                let searchQuery = {

                    startDate: $("#manualProcessRecordStartDatetimePicker").data('datetimepicker').getLocalDate(),
                    endDate: $("#manualProcessRecordEndDatetimePicker").data('datetimepicker').getLocalDate(),
                    adminObjId: vm.csList.map(cs => {return cs._id}),
                    limit: vm.manualProcessRecordData.limit || 50,
                    index: newSearch ? 0 : (vm.manualProcessRecordData.index || 0),
                    sortCol: vm.manualProcessRecordData.sortCol,
                };

                if (vm.selectedCS && vm.selectedCS.length){
                    searchQuery.adminObjId = vm.selectedCS
                }

                socketService.$socket($scope.AppSocket, 'getManualProcessRecord', searchQuery, function (data) {
                    console.log('manaulProcessRecord', data);
                    $('#manualProcessReportTableSpin').hide();

                    let drawData = data.data.data.map(item => {
                        let index = vm.csList.findIndex(p =>p._id.toString() == item._id.toString())
                        if (index != -1){
                            item.adminName = vm.csList[index].adminName;
                        }

                        return item;
                    });
                    vm.manualProcessRecordData.totalCount = data.data.data.length;
                    vm.manualProcessRecordData.size = data.data.size;
                    vm.drawManualProcessTable(drawData, newSearch);
                });
            }

            vm.drawManualProcessTable = function (tblData, newSearch) {
                console.log(newSearch);
                let option = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    // "aaSorting": vm.manualProcessRecordData.aaSorting,
                    aoColumnDefs: [
                        {'sortCol': 'submitCount', bSortable: true, 'aTargets': [1]},
                        {'sortCol': 'approvalCount', bSortable: true, 'aTargets': [2]},
                        {'sortCol': 'cancelCount', bSortable: true, 'aTargets': [3]},
                        {'sortCol': 'totalCount', bSortable: true, 'aTargets': [4]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],

                    columns: [
                        {
                            title: 'FPMS' + $translate('CS Account'),
                            data: "adminName",
                        },
                        {
                            title: $translate('Manual Submit Count'),
                            data: "submitCount",
                            render: function (data, type, row) {
                                var link = $('<a>', {
                                    'ng-click': 'vm.showManualProposalTable(' + JSON.stringify(row.submitProposalIdArr) + ',"' + row.adminName + '", "Manual Submit Count")'
                                }).text(data);
                                return link.prop('outerHTML');
                            },
                            sClass: "proposalLinks"
                        },
                        {
                            title: $translate('Manual Approval Count'),
                            data: "approvalCount",
                            render: function (data, type, row) {
                                var link = $('<a>', {
                                    'ng-click': 'vm.showManualProposalTable(' + JSON.stringify(row.approvalProposalIdArr) + ',"' + row.adminName + '", "Manual Approval Count")'
                                }).text(data);
                                return link.prop('outerHTML');
                            },
                            sClass: "proposalLinks"
                        },
                        {
                            title: $translate('Manual Cancel Count'),
                            data: "cancelCount",
                            render: function (data, type, row) {
                                var link = $('<a>', {
                                    'ng-click': 'vm.showManualProposalTable(' + JSON.stringify(row.cancelProposalIdArr) + ',"' + row.adminName + '", "Manual Cancel Count")'
                                }).text(data);
                                return link.prop('outerHTML');
                            },
                            sClass: "proposalLinks"
                        },
                        {
                            title: $translate('Manual Process Count'),
                            data: "totalCount",
                        },
                    ],
                    // destroy: true,
                    paging: false,
                    fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $compile(nRow)($scope);
                    }
                });
                option.language.emptyTable = $translate("No data available in table");

                let a = utilService.createDatatableWithFooter('#manualProcessReportTable', option, {});
                vm.manualProcessRecordData.pageObj.init({maxCount: vm.manualProcessRecordData.size}, newSearch);
                $("#manualProcessReportTable").off('order.dt');
                $("#manualProcessReportTable").on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'manualProcessRecordData', vm.getManualProcessRecord);
                });
                // setTimeout(function () {
                $('#manualProcessReportTable').resize();
                // }, 300);
                $scope.$evalAsync();
            }

            vm.showManualProposalTable = function (data, adminName, countType){
                vm.manualProposalData = {};
                vm.manualProposalData.adminName = adminName || null;
                vm.manualProposalData.countType = countType || null;
                vm.manualProposalData.proposalId = data;

                $('#modalManualProposalTable').modal();

                utilService.actionAfterLoaded(('#manualProposalTablePage'), function () {
                    vm.manualProposalData.pageObj = utilService.createPageForPagingTable("#manualProposalTablePage", {pageSize: 50}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "manualProposalData", vm.getManualProposalRecord)
                    });

                    vm.getManualProposalRecord(true);
                });
            };

            vm.closeManualProposalTable = function (modal) {
                $(modal).modal('hide');
            };

            vm.getManualProposalRecord = function (newSearch) {
                vm.manualProposalData.totalCount = 0;
                vm.manualProposalData.index = newSearch ? 0 : (vm.manualProposalData.index || 0),
                    vm.manualProposalData.limit = vm.manualProposalData && vm.manualProposalData.limit ? vm.manualProposalData.limit : 50;

                let searchQuery = {
                    proposalId: vm.manualProposalData.proposalId,
                    limit: vm.manualProposalData.limit || 50,
                    index: newSearch ? 0 : (vm.manualProposalData.index || 0),
                    sortCol: vm.manualProposalData.sortCol,
                };

                socketService.$socket($scope.AppSocket, 'getManualProcessProposalDetail', searchQuery, function (data) {
                    console.log('manual processed proposal data', data);
                    $('#manualProposalTableSpin').hide();

                    var drawData = data.data.data.map(item => {
                        item.involveAmount$ = 0;
                        if (item.data.updateAmount) {
                            item.involveAmount$ = item.data.updateAmount;
                        } else if (item.data.amount) {
                            item.involveAmount$ = item.data.amount;
                        } else if (item.data.rewardAmount) {
                            item.involveAmount$ = item.data.rewardAmount;
                        } else if (item.data.commissionAmount) {
                            item.involveAmount$ = item.data.commissionAmount;
                        } else if (item.data.negativeProfitAmount) {
                            item.involveAmount$ = item.data.negativeProfitAmount;
                        }
                        item.involveAmount$ = $noRoundTwoDecimalPlaces(item.involveAmount$);
                        item.typeName = $translate(item.type.name || "Unknown");
                        item.mainType$ = $translate(item.mainType || "Unknown");
                        item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                        item.status$ = $translate(item.status ? item.type.name == "PlayerBonus" || item.type.name == "PartnerBonus" ? item.status == "Approved" ? "approved" : item.status : item.status : item.process.status);
                        return item;
                    })
                    vm.manualProposalData.totalCount = data.data.data.length;
                    vm.manualProposalData.size = data.data.size;
                    vm.drawManualProposalTable(drawData, newSearch);
                });

            };

            vm.drawManualProposalTable = function (tblData, newSearch) {
                var option = $.extend({}, vm.generalDataTableOptions, {
                    data: tblData,
                    "aaSorting": vm.manualProposalData.aaSorting,
                    aoColumnDefs: [
                        {'sortCol': 'proposalId', bSortable: true, 'aTargets': [0]},
                        {'sortCol': 'createTime', bSortable: true, 'aTargets': [8]},
                        {targets: '_all', defaultContent: ' ', bSortable: false}
                    ],

                    columns: [
                        {
                            title: $translate('PROPOSAL_NO'),
                            data: "proposalId",
                            render: function (data, type, row) {
                                var link = $('<a>', {

                                    'ng-click': 'vm.showProposalModal("' + data + '",1)'

                                }).text(data);
                                return link.prop('outerHTML');
                            },
                            sClass: "proposalLinks"
                        },
                        {
                            title: $translate('CREATOR'),
                            data: null,
                            render: function (data, type, row) {
                                if (data.hasOwnProperty('creator')) {
                                    return data.creator.name;
                                } else {
                                    var creator = $translate('System');
                                    if (data && data.data && data.data.playerName) {
                                        creator += "(" + data.data.playerName + ")";
                                    }
                                    return creator;
                                }
                            }
                        },
                        {
                            title: $translate('INPUT_DEVICE'),
                            data: "inputDevice",
                            render: function (data, type, row) {
                                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data) {
                                        return $translate(Object.keys(vm.inputDevice)[i]);
                                    }
                                }
                            }
                        },
                        {
                            title: $translate('PROPOSAL TYPE'), data: ("mainType$"),
                            orderable: false,
                            // render: function (data) {
                            //     return $translate(data);
                            // }
                        },
                        {
                            title: $translate('PROPOSAL_SUB_TYPE'), data: null,
                            orderable: false,
                            render: function (data, type, row) {
                                if (data && data.data && data.data.PROMO_CODE_TYPE) {
                                    return data.data.PROMO_CODE_TYPE;
                                } else if (data && data.data && data.data.eventName) {
                                    return data.data.eventName;
                                } else {
                                    return data.typeName;
                                }
                            }
                        },
                        {
                            title: "<div>" + $translate('Proposal Status'), data: "status$",
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: "<div>" + $translate('INVOLVED_ACC'),
                            "data": null,
                            render: function (data, type, row) {
                                if (data.hasOwnProperty('creator') && data.creator.type == 'player') {
                                    return data.creator.name;
                                }
                                if (data && data.data && data.data.playerName) {
                                    return data.data.playerName;
                                }
                                else if (data && data.data && data.data.partnerName) {
                                    return data.data.partnerName;
                                }
                                else {
                                    return "";
                                }
                            },
                            orderable: false,
                            sClass: "sumText"
                        },
                        {
                            title: $translate('Amount Involved'), data: "involveAmount$", defaultContent: 0,
                            orderable: false,
                            sClass: "sumFloat alignRight",
                        },
                        {
                            title: "<div>" + $translate('START_TIME'), data: "createTime$",
                            // render: function (data, type, row) {
                            //     return utilService.$getTimeFromStdTimeFormat(data);
                            // },
                            defaultContent: 0
                        },
                        {
                            title: "<div>" + $translate('Player Level'), data: "data.proposalPlayerLevel",
                            orderable: false,
                        },
                        {
                            title: "<div>" + $translate('REMARKS'), data: "data.remark",
                            orderable: false,
                        }

                    ],
                    // destroy: true,
                    paging: false,
                    fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                        $(nRow).off('click');
                        $(nRow).find('a').on('click', function () {
                            vm.showProposalModal(aData.proposalId, 1);
                        });
                    }
                    // autoWidth: true
                });

                // $('#playerProposalTable').DataTable(option);
                var a = utilService.createDatatableWithFooter('#manualProposalTable', option, {});

                vm.manualProposalData.pageObj.init({maxCount: vm.manualProposalData.size}, newSearch);
                $("#manualProposalTable").off('order.dt');
                $("#manualProposalTable").on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'manualProposalData', vm.getManualProposalRecord);
                });
                // setTimeout(function () {
                $('#manualProposalTable').resize();
                // }, 300);
                $scope.safeApply();
            };

            //specific proposal template
            vm.proposalTemplate = {
                1: '#modalProposal',
                2: '#newPlayerModal'
            };

            vm.showProposalModal = function (proposalId, templateNo) {
                socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                    platformId: vm.selectedPlatform.id,
                    proposalId: proposalId
                }, function (data) {
                    vm.selectedProposal = data.data;
                    vm.proposalDetailStyle = {};

                    vm.selectedProposal.data = commonService.setFixedPropDetail($scope, $translate, $noRoundTwoDecimalPlaces, vm);

                    if (vm.selectedProposal && vm.selectedProposal.data) {
                        delete vm.selectedProposal.data.betAmount;
                        delete vm.selectedProposal.data.betTime;
                        delete vm.selectedProposal.data.winAmount;
                        delete vm.selectedProposal.data.winTimes;
                    }

                    if (vm.selectedProposal.data.inputData) {
                        if (vm.selectedProposal.data.inputData.provinceId) {
                            //vm.getProvinceName(vm.selectedProposal.data.inputData.provinceId)
                            commonService.getProvinceName($scope, vm.selectedProposal.data.inputData.provinceId).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data.provinceName = data;
                            });
                        }
                        if (vm.selectedProposal.data.inputData.cityId) {
                            //vm.getCityName(vm.selectedProposal.data.inputData.cityId)
                            commonService.getCityName($scope, vm.selectedProposal.data.inputData.cityId).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data.cityName = data;
                            });
                        }
                    } else {
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]) {
                            //vm.getProvinceName(vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"], "RECEIVE_BANK_ACC_PROVINCE")
                            commonService.getProvinceName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE"]).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data["RECEIVE_BANK_ACC_PROVINCE" ] = data;
                            });
                        }
                        if (vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]) {
                            //vm.getCityName(vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"], "RECEIVE_BANK_ACC_CITY")
                            commonService.getCityName($scope, vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"]).catch(err => Promise.resolve('')).then(data => {
                                vm.selectedProposal.data["RECEIVE_BANK_ACC_CITY"] = data;
                            });
                        }
                    }

                    if ( vm.selectedProposal.mainType && vm.selectedProposal.mainType == "PlayerBonus" && vm.selectedProposal.status && vm.selectedProposal.status == 'Approved' ) {
                        vm.selectedProposal.status = 'approved';
                    }

                    let tmpt = vm.proposalTemplate[templateNo];
                    $(tmpt).modal('show');
                    if (templateNo == 1) {
                        $(tmpt).css('z-Index', 1051).modal();
                    }

                    $(tmpt).on('shown.bs.modal', function (e) {
                        $scope.safeApply();
                    })


                })
            };

            // display proposal detail
            vm.showProposalDetailField = function (obj, fieldName, val) {
                if (!obj) return '';
                var result = val || val === false ? val.toString() : (val === 0) ? "0" : "";
                if (obj.type.name === "UpdatePlayerPhone" && (fieldName === "updateData" || fieldName === "curData")) {
                    var str = val.phoneNumber
                    if (obj && obj.status && obj.status == 'Pending' && fieldName == 'updateData') {
                        var $link = $('<a>', {
                            class: 'a telToPlayerBtn',
                            text: val.phoneNumber,
                            'data-proposal': JSON.stringify(obj),
                        });
                        utilService.actionAfterLoaded(".telToPlayerBtn", function () {
                            $('#ProposalDetail .telToPlayerBtn').off('click');
                            $('#ProposalDetail .telToPlayerBtn').on('click', function () {
                                var $tr = $(this).closest('tr');
                                vm.telToPlayer(obj);
                            })
                        });

                        result = $link.prop('outerHTML');
                    } else {
                        result = val.phoneNumber; //str.substring(0, 3) + "******" + str.slice(-4);
                    }
                } else if (obj.status === "Expired" && fieldName === "validTime") {
                    var $time = $('<div>', {
                        class: 'inlineBlk margin-right-5'
                    }).text(utilService.getFormatTime(val));
                    var $btn = $('<button>', {
                        class: 'btn common-button btn-primary delayTopupExpireDate',
                        text: $translate('Delay'),
                        'data-proposal': JSON.stringify(obj),
                    });
                    utilService.actionAfterLoaded(".delayTopupExpireDate", function () {
                        $('#ProposalDetail .delayTopupExpireDate').off('click');
                        $('#ProposalDetail .delayTopupExpireDate').on('click', function () {
                            var $tr = $(this).closest('tr');
                            vm.delayTopupExpirDate(obj, function (newData) {
                                $tr.find('td:nth-child(2)').first().text(utilService.getFormatTime(newData.newValidTime));
                                vm.needRefreshTable = true;
                                $scope.safeApply();
                            });
                        })
                    });
                    result = $time.prop('outerHTML') + $btn.prop('outerHTML');
                } else if (fieldName.indexOf('providerId') > -1 || fieldName.indexOf('targetProviders') > -1) {
                    result = val ? val.map(item => {
                        return vm.getProviderText(item);
                    }) : '';
                    result = result.join(',');
                } else if (fieldName.indexOf('providerGroup') > -1) {
                    result = vm.getProviderGroupNameById(val);
                } else if ((fieldName.indexOf('time') > -1 || fieldName.indexOf('Time') > -1) && val) {
                    result = utilService.getFormatTime(val);
                } else if ((fieldName.indexOf('amount') > -1 || fieldName.indexOf('Amount') > -1) && val) {
                    result = Number.isFinite(parseFloat(val)) ? $noRoundTwoDecimalPlaces(parseFloat(val)).toString() : val;
                } else if (fieldName == 'bankAccountType') {
                    switch (parseInt(val)) {
                        case 1:
                            result = $translate('Credit Card');
                            break;
                        case 2:
                            result = $translate('Debit Card');
                            break;
                        case 3:
                            result = "储存卡";
                            break;
                        case 4:
                            result = "储蓄卡";
                            break;
                        case 5:
                            result = "商务理财卡";
                            break;
                        case 6:
                            result = "工商银行一卡通";
                            break;
                        default:
                            result = val;
                            break;
                    }
                } else if (fieldName == 'clientType') {
                    result = $translate($scope.merchantTargetDeviceJson[val]);
                } else if (fieldName == 'merchantUseType') {
                    result = $translate($scope.merchantUseTypeJson[val])
                } else if (fieldName == 'topupType') {
                    result = $translate($scope.merchantTopupTypeJson[val])
                } else if (fieldName == 'periodType') {
                    result = $translate(firstTopUpPeriodTypeJson[val])
                } else if (fieldName == 'playerId' && val && val.playerId && val.name) {
                    result = val.playerId;
                    vm.selectedProposalDetailForDisplay.playerName = val.name;
                } else if (fieldName == 'bankTypeId' || fieldName == 'bankCardType' || fieldName == 'bankName') {
                    result = vm.allBankTypeList[val] || (val + " ! " + $translate("not in bank type list"));
                } else if (fieldName == 'depositMethod') {
                    result = $translate(vm.getDepositMethodbyId[val])
                } else if (fieldName === 'playerStatus') {
                    result = $translate($scope.constPlayerStatus[val]);

                } else if (fieldName == 'allowedProviders') {

                    let providerName = '';
                    for (var v in val) {
                        providerName += val[v].name + ', ';
                    }
                    result = providerName;
                } else if (fieldName === 'proposalPlayerLevel') {
                    result = $translate(val);
                } else if (fieldName === 'applyForDate') {
                    result = new Date(val).toLocaleDateString("en-US", {timeZone: "Asia/Singapore"});
                } else if (fieldName === 'DOB') {
                    result = commonService.convertDOBDateFormat(val);
                } else if (fieldName === 'returnDetail') {
                    // Example data structure : {"GameType:9" : {"ratio" : 0.01, "consumeValidAmount" : 6000}}
                    let newReturnDetail = {};
                    Object.keys(val).forEach(
                        key => {
                            if (key && key.indexOf(':') != -1) {
                                let splitGameTypeIdArr = key.split(':');
                                let gameTypeId = splitGameTypeIdArr[1];
                                newReturnDetail[splitGameTypeIdArr[0] + ':' + vm.allGameTypes[gameTypeId]] = val[key];
                            }
                        });
                    result = JSON.stringify(newReturnDetail || val)
                        .replace(new RegExp('GameType', "gm"), $translate('GameType'))
                        .replace(new RegExp('ratio', 'gm'), $translate('RATIO'))
                        .replace(new RegExp('consumeValidAmount', "gm"), $translate('consumeValidAmount'));
                } else if (fieldName === 'nonXIMADetail') {
                    let newNonXIMADetail = {};
                    Object.keys(val).forEach(
                        key => {
                            if (key && key.indexOf(':') != -1) {
                                let splitGameTypeIdArr = key.split(':');
                                let gameTypeId = splitGameTypeIdArr[1];
                                newNonXIMADetail[splitGameTypeIdArr[0] + ':' + vm.allGameTypes[gameTypeId]] = val[key];
                            }
                        });
                    result = JSON.stringify(newNonXIMADetail || val)
                        .replace(new RegExp('GameType', "gm"), $translate('GameType'))
                        .replace(new RegExp('nonXIMAAmt', "gm"), $translate('totalNonXIMAAmt'));
                } else if (typeof(val) == 'object') {
                    result = JSON.stringify(val);
                } else if (fieldName === "upOrDown") {
                    result = $translate(val);
                } else if (fieldName === 'definePlayerLoginMode') {
                    result = $translate($scope.playerLoginMode[val]);
                } else if (fieldName === 'rewardInterval') {
                    result = $translate($scope.rewardInterval[val]);
                } else if (fieldName === 'gameProviderInEvent') {
                    let index = vm.allGameProviders.findIndex(p => p._id.toString() == val.toString());
                    if (index != -1){
                        result =  vm.allGameProviders[index].name;
                    }
                }

                return $sce.trustAsHtml(result);
            };

            vm.initManualSummarizeManualProcessRecord = function(){
                if(vm.selectedPlatform){
                    utilService.actionAfterLoaded('#manualProcessSummarizeEndDatetimePicker', function () {
                        $('#manualProcessSummarizeStartDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#manualProcessSummarizeStartDatetimePicker").data('datetimepicker').setLocalDate(utilService.getYesterdayStartTime());

                        $('#manualProcessSummarizeEndDatetimePicker').datetimepicker({
                            language: 'en',
                            format: 'dd/MM/yyyy hh:mm:ss',
                            pick12HourFormat: true
                        });

                        $("#manualProcessSummarizeEndDatetimePicker").data('datetimepicker').setLocalDate(utilService.getNdaylaterStartTime(1));
                    });
                }
            };

            vm.summarizeManualProcessRecord = function(){
                vm.loadingSummarizeManualProcessRecord = true;
                let startTime = $('#manualProcessSummarizeStartDatetimePicker').data('datetimepicker').getLocalDate();
                let endTime = $('#manualProcessSummarizeEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                };

                socketService.$socket($scope.AppSocket, 'summarizeManualProcessRecord', sendData, function (data) {
                    $scope.$evalAsync(() => {
                        vm.loadingSummarizeManualProcessRecord = false;
                    })
                }, function (error){
                    vm.loadingSummarizeManualProcessRecord = false;
                    console.log("Error when gather summarized manual process record data:", error)
                });
            }

            //////////////////////////////////////////////////////////End of Manual Approval Report Tab///////////////////////////////////////////////////////////////////

        };
    qualityInspectionController.$inject = injectParams;
        myApp.register.controller('qualityInspectionCtrl', qualityInspectionController);
    }
);
