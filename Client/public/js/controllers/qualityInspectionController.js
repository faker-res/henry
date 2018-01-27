'use strict';

define(['js/app'], function (myApp) {

        var injectParams = ['$sce', '$compile', '$scope', '$filter', '$location', '$log', 'authService', 'socketService', 'utilService', 'CONFIG', "$cookies", "$timeout", '$http', 'uiGridExporterService', 'uiGridExporterConstants'];

        var qualityInspectionController = function ($sce, $compile, $scope, $filter, $location, $log, authService, socketService, utilService, CONFIG, $cookies, $timeout, $http, uiGridExporterService, uiGridExporterConstants) {

            var $translate = $filter('translate');
            var vm = this;

            // For debugging:
            window.VM = vm;

            vm.evaluationAppealStatus = {
                APPEALING: 1,
                APPEAL_COMPLETED: 1
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

                    // if(vm.qualityInspectionPageName =='MY EVALUATION'){
                    //     vm.initUnreadEvaluation();
                    //     vm.initReadEvaluation();
                    //     vm.initAppealEvaluation();
                    // }
                    // else if(vm.qualityInspectionPageName =='INSPECTION REPORT'){
                    //     vm.initWorkloadProgress();
                    // }


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
                vm.evaluationTab = 'unreadEvaluation';
                vm.inspectionReportTab ='workloadReport';
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


            vm.searchLive800 = function(){
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
                        'fpmsAcc':vm.inspection800.fpms,
                        'operatorId':vm.inspection800.live800Accs,
                        'startTime': $('#live800StartDatetimePicker').data('datetimepicker').getLocalDate(),//'2018-01-16 00:00:00',
                        'endTime': $('#live800endDatetimePicker').data('datetimepicker').getLocalDate(),//'2018-01-16 00:05:00',
                        'status':vm.inspection800.status ? vm.inspection800.status : null
                };
                if(vm.inspection800.qiUser && vm.inspection800.qiUser.length > 0){
                    query['qualityAssessor'] = vm.inspection800.qiUser;
                }
                socketService.$socket($scope.AppSocket, 'searchLive800', query, success);
                function success(data) {
                    vm.conversationForm = data.data;
                    data.data.forEach(item=>{
                        item.statusName = item.status ? $translate(vm.constQualityInspectionStatus[item.status]): $translate(vm.constQualityInspectionStatus[1]);
                        item.conversation.forEach(function(cv){
                            cv.displayTime = utilService.getFormatTime(parseInt(cv.time));

                        });
                        item.editable = false;
                    });
                    $scope.safeApply();
                }
            };
            vm.confirmRate = function(rate){
                console.log(rate);
                rate.editable = false;
                socketService.$socket($scope.AppSocket, 'rateCSConversation', rate, function(data){
                    console.log(data);
                });
            }
            vm.showLive800 = function(){
                vm.initLive800Start();
                vm.fpmsACCList = [];
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
                //vm.evaluationTab = 'unreadEvaluation';

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

            vm.initReadEvaluation = function(){
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

            vm.initAppealEvaluation = function(){
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

            vm.initWorkloadProgress = function(){
                //vm.inspectionReportTab = 'workloadReport';

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
            }

            vm.initEvaluationProgress = function() {
                // var startTime = $('#unreadEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                // var endTime = $('#unreadEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();
                //
                // let sendData = {
                //     startTime: startTime,
                //     endTime: endTime
                // }

                vm.evaluationProgressYearMonth = []
                socketService.$socket($scope.AppSocket, 'getEvaluationRecordYearMonth', {platformObjId: vm.selectedPlatform.id}, function (data) {

                    if(data && data.data && data.data.length > 0){

                        data.data.forEach(data => {
                            if(data && data._id && data._id.month && data._id.year){
                                let month = data._id.month.toString();
                                if(month.length < 2){
                                    month = "0" + month;
                                }
                                vm.evaluationProgressYearMonth.push({month: month, year: data._id.year});
                                //vm.evaluationProgressYearMonth.push({date: data._id.year + " - " + month});
                            }

                        })

                         $scope.safeApply();
                    }else{
                        // vm.unreadEvaluationTable = "";
                        // $scope.safeApply();
                    }
                });
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

            vm.endLoadMultipleSelect = function () {
                $timeout(function () {
                    $('.spicker').selectpicker('refresh');
                }, 0);
            };

            //////////////////////////////////////////////////////////Start of Evaluation Tab///////////////////////////////////////////////////////////////////
            vm.getUnreadEvaluationRecord = function() {
                var startTime = $('#unreadEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#unreadEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                }

                socketService.$socket($scope.AppSocket, 'getUnreadEvaluationRecord', sendData, function (data) {

                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            return data;
                        })
                        vm.unreadEvaluationTable = data.data;
                        $scope.safeApply();
                    }else{
                        vm.unreadEvaluationTable = "";
                        $scope.safeApply();
                    }
                });
            }

            vm.getReadEvaluationRecord = function() {
                var startTime = $('#readEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#readEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime
                }

                socketService.$socket($scope.AppSocket, 'getReadEvaluationRecord', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            return data;
                        })
                        vm.readEvaluationTable = data.data;
                        $scope.safeApply();

                    }else{
                        vm.readEvaluationTable = "";
                        $scope.safeApply();
                    }
                });
            }

            vm.getAppealEvaluationRecordByConversationDate = function(){
                var startTime = $('#conversationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#conversationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    status: vm.appealStatus
                }

                socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByConversationDate', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            return data;
                        })
                        vm.appealEvaluationTable = data.data;
                        $scope.safeApply();

                    }else{
                        vm.appealEvaluationTable = "";
                        $scope.safeApply();
                    }
                });
            }

            vm.getAppealEvaluationRecordByAppealDate = function(){
                var startTime = $('#appealEvaluationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#appealEvaluationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                    status: vm.appealStatus
                }

                socketService.$socket($scope.AppSocket, 'getAppealEvaluationRecordByAppealDate', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            return data;
                        })
                        vm.appealEvaluationTable = data.data;
                        $scope.safeApply();

                    }else{
                        vm.appealEvaluationTable = "";
                        $scope.safeApply();
                    }
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
                        status: vm.constQualityInspectionStatus.COMPLETED_UNREAD
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
                var startTime = $('#reportConversationStartDatetimePicker').data('datetimepicker').getLocalDate();
                var endTime = $('#reportConversationEndDatetimePicker').data('datetimepicker').getLocalDate();

                let sendData = {
                    startTime: startTime,
                    endTime: endTime,
                }

                if(vm.qcAccount){
                    sendData.qualityAssessor = vm.qcAccount;
                }

                let resultArr = [];

                socketService.$socket($scope.AppSocket, 'getWorkloadReport', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){

                        data.data.map(data => {
                            if(data && data.status){
                                data.status = vm.constQualityInspectionStatus[data.status];
                            }

                            let index = resultArr.findIndex(r => r.qcAccount == data.qcAccount)

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
                                    qcAccount: data.qcAccount,
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
                                {'sortCol': 'qcAccount', bSortable: true, 'aTargets': [0]},
                                {'sortCol': 'completedUnread', bSortable: true, 'aTargets': [1]},
                                {'sortCol': 'completedRead', bSortable: true, 'aTargets': [2]},
                                {'sortCol': 'completed', bSortable: true, 'aTargets': [3]},
                                {'sortCol': 'appealing', bSortable: true, 'aTargets': [4]},
                                {'sortCol': 'appealCompleted', bSortable: true, 'aTargets': [5]},

                            ],
                            columns: [
                                {title: $translate('QC ACCOUNT'), data: "qcAccount"},
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


                        $scope.safeApply();


                    }else{
                        vm.appealEvaluationTable = "";
                        $scope.safeApply();
                    }
                });
            }

            vm.getEvaluationProgressRecord = function() {
                let yearMonthObj = JSON.parse(vm.yearMonth)
                let startDate = new Date(yearMonthObj.month + "-" + "01-" + yearMonthObj.year);
                let endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                let sendData = {
                    //platformObjId: vm.selectedPlatform.id,
                    startDate: startDate,
                    endDate: endDate
                }
                let resultArr = [];

                let weekDay = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];



                let rowMaxLength = 7;
                socketService.$socket($scope.AppSocket, 'getEvaluationProgressRecord', sendData, function (data) {
                    if(data && data.data && data.data.length > 0){
                        //let result = data.data.sort(function(a,b) {return (a.platformName > b.platformName) ? 1 : ((b.platformName > a.platformName) ? -1 : 0);} );

                        data.data.map(result => {
                            if(result && result.length > 0){
                                let counter = 1;
                                let firstRow = [];
                                let secondRow = [];
                                let thirdRow = [];
                                let fouthRow = [];
                                let fifthRow = [];
                                result.forEach(resultByPlatform => {
                                    if(resultByPlatform){
                                        resultByPlatform.date = new Date(resultByPlatform.date);

                                        if(resultByPlatform.date.getDate() == 1){
                                            for(let i = 0; i < resultByPlatform.date.getDay(); i++){
                                                firstRow.push({day: 0, isCompleted: false});
                                            }
                                            firstRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});

                                            if(firstRow.length == 7){
                                                counter += 1;
                                            }
                                        }else if(counter == 1){
                                            firstRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});
                                            if(firstRow.length == 7){
                                                counter += 1;
                                            }

                                        }else if(counter == 2){
                                            secondRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});
                                            if(secondRow.length == 7){
                                                counter += 1;
                                            }
                                        }else if(counter == 3){
                                            thirdRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});
                                            if(thirdRow.length == 7){
                                                counter += 1;
                                            }
                                        }else if(counter == 4){
                                            fouthRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});
                                            if(fouthRow.length == 7){
                                                counter += 1;
                                            }
                                        }else if(counter == 5){
                                            fifthRow.push({day: resultByPlatform.date.getDate(), isCompleted: resultByPlatform.isCompleted});
                                            if(fifthRow.length == 7){
                                                counter += 1;
                                            }
                                        }
                                    }

                                })
                                let calendarData = [];
                                calendarData.push(firstRow);
                                calendarData.push(secondRow);
                                calendarData.push(thirdRow);
                                calendarData.push(fouthRow);
                                calendarData.push(fifthRow);
                                resultArr.push({platformName: result[0].platformName, calendarData: calendarData});


                                console.log("AAAAAAAAAAAAAAAAAAAAA",firstRow)
                                console.log("BBBBBBBBBBBBBBBBBBBBBBBBBBB",secondRow)
                                console.log("CCCCCCCCCCCCCCCCCCCCCCCCCCc",thirdRow)
                                console.log("DDDDDDDDDDDDDDDDDDDDDDDd",fouthRow)
                                console.log("EEEEEEEEEEEEEEEEEE",fifthRow)

                                console.log("ZZZZZZZZZZZZZZZZZZZZZZZZZZZZz",resultArr)
                                vm.evaluationProgressTableTitle = yearMonthObj.year + "-" + yearMonthObj.month + " " + $translate('MONTH');
                                vm.evaluationProgressTable = resultArr;
                            }

                        })

                        $scope.safeApply();
                        //vm.getUnreadEvaluationRecord();
                    }



                });
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



            vm.checkSelectedPlatformID = function(seletedProductsId){
               vm.selectedCSAccount = [];
               vm.selectedLive800Acc = [];
                vm.selectedLive800 = [];
                if (seletedProductsId !== 'all') {
                    console.log("-----------------", seletedProductsId);
                    // select the CS account that bound to the selected platform
                    socketService.$socket($scope.AppSocket, 'getDepartmentsbyPlatformObjId', [seletedProductsId], function (data){

                        let sendQuery ={
                            departments: {$in: data.data}
                        };
                        socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                            if (data && data.data && data.data.length > 0){
                                data.data.forEach(acc => {
                                    if (acc.live800Acc && acc.live800Acc.length > 0){
                                        vm.selectedCSAccount.push(acc);
                                        acc.live800Acc.forEach(liveAcc => {
                                            vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                            vm.selectedLive800.push(liveAcc);
                                        });


                                    }
                                });
                            }else{
                                // for null
                                vm.selectedCSAccount.push("");
                                vm.selectedLive800Acc.push("");
                            }
                            $scope.safeApply();
                        });
                    });

                } else {
                    // select all by default
                    socketService.$socket($scope.AppSocket, 'getDepartmentsbyPlatformObjId', [], function (data){
                        let sendQuery ={
                            departments: {$in: data.data}
                        };
                        socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                            if (data && data.data){
                                data.data.forEach(acc => {
                                    if (acc.live800Acc && acc.live800Acc.length > 0){
                                        vm.selectedCSAccount.push(acc);
                                        acc.live800Acc.forEach(liveAcc => {
                                            vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                            vm.selectedLive800.push(liveAcc);
                                        });
                                    }
                                });

                            }
                            $scope.safeApply();
                        });
                    });

                }
                console.log("vm.selectedCSAccount", vm.selectedCSAccount)
                console.log("vm.selectedLive800", vm.selectedLive800)
            };


            vm.checkSelectedCSAcc= function (csAcc){

                vm.selectedLive800Acc = [];
                vm.selectedLive800=[];
               // vm.selectedAdminName = [];
                if (csAcc.length !== vm.selectedCSAccount.length && csAcc.length>0) {

                    console.log("-----------------", csAcc);
                    //select the Live800 account that bound to the selected CS account
                    csAcc.forEach(filterAcc => {
                        vm.selectedCSAccount.forEach(acc => {
                            if (acc._id.indexOf(filterAcc) > -1) {
                                //vm.selectedAdminName.push(acc.adminName);
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
                        //vm.selectedAdminName.push(acc.adminName);
                        acc.live800Acc.forEach(liveAcc => {
                            vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                            vm.selectedLive800.push(liveAcc);
                        });
                    });

                }
                $scope.safeApply();
                //console.log("vm.selectedAdminName",vm.selectedAdminName)
                console.log("vm.selectedLive800Acc",vm.selectedLive800Acc)
                console.log("vm.selectedLive800",vm.selectedLive800)

            };

            vm.commonInitTime = function (obj, queryId) {
                if (!obj) return;
                obj.startTime = utilService.createDatePicker(queryId + ' .startTime');
                var lastMonth = utilService.setNDaysAgo(new Date(), 1);
                var lastMonthDateStartTime = utilService.setThisDayStartTime(new Date(lastMonth));
                obj.startTime.data('datetimepicker').setLocalDate(new Date(lastMonthDateStartTime));

                obj.endTime = utilService.createDatePicker(queryId + ' .endTime', {
                    language: 'en',
                    format: 'yyyy/MM/dd hh:mm:ss'
                });
                obj.endTime.data('datetimepicker').setLocalDate(new Date(utilService.getTodayEndTime()));
            };


            vm.prepareShowQIReport = function () {
                vm.selectedCSAccount=[];
                vm.selectedLive800Acc = [];
               // vm.selectedAdminName = [];
                vm.selectedLive800= [];
                vm.allLive800Acc=[];
                vm.allCSAccount=[];
                socketService.$socket($scope.AppSocket, 'getDepartmentsbyPlatformObjId', [], function (data){
                    let sendQuery ={
                        departments: {$in: data.data}
                    };
                    socketService.$socket($scope.AppSocket, 'getAdminsInfo', sendQuery, function (data){

                        if (data && data.data){
                            data.data.forEach(acc => {
                                if (acc.live800Acc && acc.live800Acc.length > 0){
                                    vm.selectedCSAccount.push(acc);
                                    vm.allCSAccount.push(acc);
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
                                //vm.selectedAdminName.push(acc.adminName);
                                acc.live800Acc.forEach(liveAcc => {
                                    vm.selectedLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                    vm.allLive800Acc.push({_id: acc._id, adminName:acc.adminName, live800Acc:liveAcc});
                                    vm.selectedLive800.push(liveAcc);
                                });
                            });

                           // console.log("vm.selectedAdminName",vm.selectedAdminName);
                            console.log("vm.selectedLive800Acc",vm.selectedLive800Acc);
                            console.log("vm.selectedLive800",vm.selectedLive800);

                        }
                        $scope.safeApply();
                    });

                });

                vm.QIReportQuery = {aaSorting: [[8, "desc"]], sortCol: {createTime: -1}};
                //vm.QIReportQuery.status = 'all';
                //vm.QIReportQuery.promoType = '';
                vm.QIReportQuery.totalCount = 0;
                //vm.QIReportQuery.proposalTypeId = '';
                utilService.actionAfterLoaded("#QIReportTablePage", function () {
                    vm.commonInitTime(vm.QIReportQuery, '#QIReportQuery');
                    // //set time out to solve $rootScope:inprog error
                    // setTimeout(function () {
                    //     $('select#selectProduct').multipleSelect({
                    //         allSelected: $translate("All Selected"),
                    //         selectAllText: $translate("Select All"),
                    //         displayValues: true,
                    //         countSelected: $translate('# of % selected'),
                    //     });
                    //     var $multiProduct = ($('select#selectProduct').next().find('.ms-choice'))[0];
                    //     $('select#selectProduct').next().on('click', 'li input[type=checkbox]', function () {
                    //         var upText = $($multiProduct).text().split(',').map(item => {
                    //             return $translate(item);
                    //         }).join(',');
                    //         $($multiProduct).find('span').text(upText)
                    //     });
                    //     $("select#selectProduct").multipleSelect("checkAll");
                    //
                    //     $('select#selectCSAccount').multipleSelect({
                    //         allSelected: $translate("All Selected"),
                    //         selectAllText: $translate("Select All"),
                    //         displayValues: true,
                    //         countSelected: $translate('# of % selected'),
                    //     });
                    //     var $multiCSAccount = ($('select#selectCSAccount').next().find('.ms-choice'))[0];
                    //     $('select#selectCSAccount').next().on('click', 'li input[type=checkbox]', function () {
                    //         var upText = $($multiCSAccount).text().split(',').map(item => {
                    //             return $translate(item);
                    //         }).join(',');
                    //         $($multiCSAccount).find('span').text(upText)
                    //     });
                    //     $("select#selectCSAccount").multipleSelect("checkAll");
                    //
                    //     $('select#selectLive800Account').multipleSelect({
                    //         allSelected: $translate("All Selected"),
                    //         selectAllText: $translate("Select All"),
                    //         displayValues: true,
                    //         countSelected: $translate('# of % selected'),
                    //     });
                    //     var $multiLiveAcc = ($('select#selectLive800Account').next().find('.ms-choice'))[0];
                    //     $('select#selectLive800Account').next().on('click', 'li input[type=checkbox]', function () {
                    //         var upText = $($multiLiveAcc).text().split(',').map(item => {
                    //             return $translate(item);
                    //         }).join(',');
                    //         $($multiLiveAcc).find('span').text(upText)
                    //     });
                    //     $("select#selectLive800Account").multipleSelect("checkAll");

                        vm.QIReportQuery.pageObj = utilService.createPageForPagingTable("#QIReportTablePage", {}, $translate, vm.QIReportTablePageChange);
                        $scope.safeApply()
                    });

            };


            vm.QIReportTablePageChange = function (curP, pageSize) {
                vm.commonPageChangeHandler(curP, pageSize, "QIReportQuery", vm.searchQIRecord)
            };

            vm.searchQIRecord = function (newSearch) {
                vm.curPlatformId = vm.selectedPlatform._id;

                let newQIReportQuery = $.extend(true, {}, vm.QIReportQuery);
                // add in consideration in query of selected all
                // vm.selectedPlatformID = vm.selectedPlatformID === 'all'? []: vm.selectedPlatformID; //objId
                // vm.selectedCS = vm.selectedCS.length === vm.allCSAccount.length ? []:vm.selectedCS; //objId
                // vm.selectedLive800 = vm.selectedLive800.length === vm.allLive800Acc.length ? []:vm.selectedLive800; // account number
                vm.abv = ["5733e26ef8c8a9355caf49d8"];
                newQIReportQuery.productId = $.extend(true, [], vm.abv);
                newQIReportQuery.CSAccount = $.extend(true, [], vm.selectedCS);
                newQIReportQuery.Live800Account = $.extend(true, [], vm.selectedLive800);
                //
                // let product = $('select#selectProduct').multipleSelect("getSelects");
                // let CSAccount = $('select#selectCSAccount').multipleSelect("getSelects");
                // let Live800Account = $('select#selectLive800Account').multipleSelect("getSelects");
                //
                // if (vm.platformList.length != product.length) {
                //     vm.platformList.filter(item => {
                //         if (product.indexOf(item.data._id) > -1) {
                //             newQIReportQuery.productId.push(item.data._id);
                //             console.log("+++++++++++++++++",newQIReportQuery.productId)
                //         }
                //     });
                // }

                // if (vm.rewardList.length != rewardTypes.length) {
                //     vm.rewardList.filter(item => {
                //         if (rewardTypes.indexOf(item.name) > -1) {
                //             newproposalQuery.rewardTypeName.push(item.name);
                //         }
                //     });
                // }
                //
                // if (vm.promoTypeList.length != promoType.length) {
                //     vm.promoTypeList.filter(item => {
                //         if (promoType.indexOf(item.name) > -1) {
                //             newproposalQuery.promoTypeName.push(item.name);
                //         }
                //     });
                // }

                $('#QIReportTableSpin').show();
                newQIReportQuery.limit = newQIReportQuery.limit || 10;


                var sendData = {
                    startTime: newQIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                    endTime: newQIReportQuery.endTime.data('datetimepicker').getLocalDate(),

                    productId: newQIReportQuery.productId,
                    CSAccount: newQIReportQuery.CSAccount,
                    Live800Account: newQIReportQuery.Live800Account,


                    index: newSearch ? 0 : (newQIReportQuery.index || 0),
                    limit: newQIReportQuery.limit,
                    sortCol: newQIReportQuery.sortCol
                };
                console.log("newQIReportQuery", newQIReportQuery);


                /************/ //START temp workplace to display table /***********/
                //
                // var datatoDraw = data.data.data.map(item => {
                //     item.involveAmount$ = 0;
                //     if (item.data.updateAmount) {
                //         item.involveAmount$ = item.data.updateAmount;
                //     } else if (item.data.amount) {
                //         item.involveAmount$ = item.data.amount;
                //     } else if (item.data.rewardAmount) {
                //         item.involveAmount$ = item.data.rewardAmount;
                //     } else if (item.data.commissionAmount) {
                //         item.involveAmount$ = item.data.commissionAmount;
                //     } else if (item.data.negativeProfitAmount) {
                //         item.involveAmount$ = item.data.negativeProfitAmount;
                //     }
                //     item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                //     item.typeName = $translate(item.type.name || "Unknown");
                //     item.mainType$ = $translate(item.mainType || "Unknown");
                //     if (item.mainType === "PlayerBonus")
                //         item.mainType$ = $translate("Bonus");
                //     item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                //     if (item.data && item.data.remark) {
                //         item.remark$ = item.data.remark;
                //     }
                //     item.status$ = $translate(vm.getStatusStrfromRow(item));
                //
                //     return item;
                // })
                var datatoDraw =[];
                // design the datatoDraw to fit into the table drawing for testing


                for (let i=0; i<newQIReportQuery.CSAccount.length; i++){
                    vm.allCSAccount.forEach(csAcc => {
                        if (csAcc._id.indexOf(newQIReportQuery.CSAccount[i] >-1)){
                            vm.bounded_live800_acc=csAcc.live800Acc;
                        }
                    })

                    let platformIndex = vm.platformList.findIndex(p => p.id == newQIReportQuery.productId)
                    let platformText = "";
                    if(platformIndex != -1){
                        platformText = vm.platformList[platformIndex].text;
                    }


                    datatoDraw.push({productId: platformText, CSAccount: newQIReportQuery.CSAccount[i],  Live800Account: vm.bounded_live800_acc, aaSorting: [[8, "desc"]], sortCol: {createTime: -1}, pageObg: newQIReportQuery.pageObj, limit: newQIReportQuery.limit, totalCount: newQIReportQuery.totalCount });
                }



               // datatoDraw.push(newQIReportQuery);
                $('#QIReportTableSpin').hide();
               // vm.QIReportQuery.totalCount = data.data.size;
                $scope.safeApply();
                vm.drawQIReportNew(datatoDraw, [], [], newSearch);
                //vm.drawQIReportNew(datatoDraw, vm.QIReportQuery.totalCount, data.data.summary, newSearch);

                //
                /************/ //END temp workplace to display table /***********/


                // var sendData = {
                //     startTime: newQIReportQuery.startTime.data('datetimepicker').getLocalDate(),
                //     endTime: newQIReportQuery.endTime.data('datetimepicker').getLocalDate(),
                //
                //     productId: newQIReportQuery.productId,
                //     CSAccount: newQIReportQuery.CSAccount,
                //     Live800Account: newQIReportQuery.Live800Account,
                //
                //
                //     index: newSearch ? 0 : (newQIReportQuery.index || 0),
                //     limit: newQIReportQuery.limit,
                //     sortCol: newQIReportQuery.sortCol
                // };
                // console.log("newQIReportQuery", newQIReportQuery);
                //
                // socketService.$socket($scope.AppSocket, 'getProposalStaticsReport', sendData, function (data) {
                //     // $('#operationTableSpin').hide();
                //     $('#proposalTable').show();
                //     console.log('proposal data', data);
                //     var datatoDraw = data.data.data.map(item => {
                //         item.involveAmount$ = 0;
                //         if (item.data.updateAmount) {
                //             item.involveAmount$ = item.data.updateAmount;
                //         } else if (item.data.amount) {
                //             item.involveAmount$ = item.data.amount;
                //         } else if (item.data.rewardAmount) {
                //             item.involveAmount$ = item.data.rewardAmount;
                //         } else if (item.data.commissionAmount) {
                //             item.involveAmount$ = item.data.commissionAmount;
                //         } else if (item.data.negativeProfitAmount) {
                //             item.involveAmount$ = item.data.negativeProfitAmount;
                //         }
                //         item.involveAmount$ = parseFloat(item.involveAmount$).toFixed(2);
                //         item.typeName = $translate(item.type.name || "Unknown");
                //         item.mainType$ = $translate(item.mainType || "Unknown");
                //         if (item.mainType === "PlayerBonus")
                //             item.mainType$ = $translate("Bonus");
                //         item.createTime$ = utilService.$getTimeFromStdTimeFormat(item.createTime);
                //         if (item.data && item.data.remark) {
                //             item.remark$ = item.data.remark;
                //         }
                //         item.status$ = $translate(vm.getStatusStrfromRow(item));
                //
                //         return item;
                //     })
                //     $('#proposalTableSpin').hide();
                //     vm.proposalQuery.totalCount = data.data.size;
                //     $scope.safeApply();
                //     vm.drawProposalReportNew(datatoDraw, vm.proposalQuery.totalCount, data.data.summary, newSearch);
                // }, function (err) {
                //     $('#proposalTableSpin').hide();
                //
                // }, true);
            }

            vm.drawQIReportNew = function (data, size, summary, newSearch) {
                console.log('data', data, size);
                var tableOptions = {
                    data: data,
                    "order": vm.QIReportQuery.aaSorting,
                    aoColumnDefs: [
                        {'sortCol': 'productId', 'aTargets': [0]},
                        {'sortCol': 'createTime', 'aTargets': [8]}
                    ],
                    columns: [
                        {
                            title: $translate('PRODUCT'), data: "productId",

                        },
                        {
                            title: 'FPMS ' + $translate('CS Account'),
                            data: "CSAccount",
                            render: function (data, type, row) {
                                for (let i=0; i< vm.allCSAccount.length; i++){
                                    if (vm.allCSAccount[i]._id === data) {
                                        return '<a ng-click="vm.showReportModalNew(\'' + vm.allCSAccount[i].adminName + '\')">' + vm.allCSAccount[i].adminName + '</a>';
                                    }
                                }
                            }
                        },
                        {
                            title: $translate('TOTAL_CONVERSATION_RECORD'),
                            data: null,
                            // render: function (data, type, row) {
                            //     for (let i = 0; i < Object.keys(vm.inputDevice).length; i++) {
                            //         if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == data) {
                            //             return $translate(Object.keys(vm.inputDevice)[i]);
                            //         }
                            //     }
                            // }
                        },
                        {
                            title: $translate('NOT_EVALUATED_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data) {
                            //     return $translate(data);
                            // }
                        },
                        {
                            title: $translate('EFFECTIVE_CONVERSATION_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     if (data && data.data && data.data.PROMO_CODE_TYPE) {
                            //         return data.data.PROMO_CODE_TYPE;
                            //     } else if (data && data.data && data.data.eventName) {
                            //         return data.data.eventName;
                            //     } else {
                            //         return data.typeName;
                            //     }
                            // }
                        },
                        {
                            title: $translate('PROCESSING_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('COMPLETED_UNREAD_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('COMPLETED_READ_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('COMPLETED_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('APPEALING_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('APPEAL_COMPLETED_QUANTITY'), data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('TOTAL_OVERTIME_MARK') + '(+/-)', data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('TOTAL_EVALUATION_MARK') + '(+/-)', data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        },
                        {
                            title: $translate('AVG_DEDUCTION_MARK') , data: null,
                            orderable: false,
                            // render: function (data, type, row) {
                            //     return $translate(vm.getStatusStrfromRow(row))
                            // }
                        }
                    ],
                    // "autoWidth": true,
                    // "scrollX": true,
                    // "scrollY": 400,
                    // "scrollCollapse": true,
                    // "destroy": true,
                    "bSortClasses": false,
                    "paging": false,
                    // "dom": '<"top">rt<"bottom"il><"clear">',
                    "language": {
                        "info": "Total _MAX_ records",
                        "emptyTable": $translate("No data available in table"),
                    },
                    fnRowCallback: vm.proposalTableRow
                }
                tableOptions = $.extend(true, {}, vm.commonTableOption, tableOptions);
                $.each(tableOptions.columns, function (i, v) {
                    v.defaultContent = v.defaultContent || "";
                });

                var reportTbl = utilService.createDatatableWithFooter('#QIReportTable', tableOptions, {7: summary.amount});

                vm.QIReportQuery.pageObj.init({maxCount: size}, newSearch);

                $('#QIReportTable').off('order.dt');
                $('#QIReportTable').on('order.dt', function (event, a, b) {
                    vm.commonSortChangeHandler(a, 'QIReportQuery', vm.searchQIRecord);
                });

            };

            vm.showReportModalNew = function (CSAccount) {
                // vm.proposalDialog = 'proposal';
                // socketService.$socket($scope.AppSocket, 'getPlatformProposal', {
                //     platformId: vm.selectedPlatform._id,
                //     proposalId: proposalId
                // }, function (data) {
                //     vm.selectedProposal = data.data;
                //     $('#modalReport').modal('show');
                //     $('#modalReport').on('shown.bs.modal', function (e) {
                //         $scope.safeApply();
                //     })
                //
                // })
                //vm.selectedProposal = data.data;
                $('#modalReport').modal('show');
                $('#modalReport').on('shown.bs.modal', function (e) {
                    $scope.safeApply();
                })

            }
        };
    qualityInspectionController.$inject = injectParams;
        myApp.register.controller('qualityInspectionCtrl', qualityInspectionController);
    }
);
