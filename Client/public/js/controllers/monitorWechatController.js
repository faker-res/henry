'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorWechatController = function ($sce, $scope, $filter, $compile, $location, $log, socketService, authService, utilService, CONFIG, $cookies, commonService) {
        let $translate = $filter('translate');
        let $noRoundTwoDecimalPlaces = $filter('noRoundTwoDecimalPlaces');
        let vm = this;

        window.VM = vm;

        // declare constant
        vm.seleDataType = {};
        vm.platformByAdminId= [];

        $scope.$on('setPlatform', function () {
            vm.setPlatform();
        });

        vm.setPlatform = function () {
            // vm.operSelPlatform = false;
            // vm.selectedPlatform = JSON.parse(platObj);
            vm.selectedPlatform = $scope.$parent.vm.selectedPlatform;
            vm.curPlatformId = vm.selectedPlatform._id;
            vm.allProviders = {};
            $cookies.put("platform", vm.selectedPlatform.name);
            console.log('vm.selectedPlatform', vm.selectedPlatform);
            vm.loadPage("PAYMENT_MONITOR"); // 5
            $scope.safeApply();
        };

        vm.getPlatformByAdminId = function() {
            if(authService && authService.adminId){
                socketService.$socket($scope.AppSocket, 'getPlatformByAdminId', {adminId: authService.adminId}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.platformByAdminId = data.data;
                    })
                }, function (error){
                    console.error(error);
                });
            }
        };

        vm.getWCGroupControlSessionDeviceNickName = function () {
            vm.deviceNicknameList = [];
            return $scope.$socketPromise('getWCGroupControlSessionDeviceNickName', {platformObjId: vm.selectedPlatform._id}).then(function (data) {
                vm.deviceNicknameList = data.data;
                console.log('vm.deviceNicknameList ', vm.deviceNicknameList);
                $scope.$evalAsync();
            });
        };

        vm.getWCGroupControlDepartmentList = function () {
            vm.wechatGroupControlDepartmentList = [];
            return $scope.$socketPromise('getWCDepartmentDetailByPlatformObjId', {platformObjId: vm.selectedPlatform._id, adminId: authService.adminId}).then(function (data) {
                $scope.$evalAsync(() => {
                    vm.wechatGroupControlDepartmentList = data.data;
                    console.log('vm.wechatGroupControlDepartmentList ', vm.deviceNicknameList);

                    if (vm.wechatGroupControlDepartmentList && vm.wechatGroupControlDepartmentList.length > 0) {
                        let departmentIds = vm.wechatGroupControlDepartmentList.map(x => x._id);
                        Promise.all([vm.getWCAdminDetailByDepartmentIds(departmentIds)]).then(
                            data => {
                                setTimeout(function () {
                                    vm.setupAdminMutliSelect();
                                });
                                $scope.$evalAsync();
                            }
                        )
                    }
                });
            });
        };

        vm.getWCAdminDetailByDepartmentIds = function (departmentIds) {
            vm.wechatGroupControlAdminList = [];
            if (departmentIds && departmentIds.length > 0) {
                return $scope.$socketPromise('getWCAdminDetailByDepartmentIds', {departmentObjIds: departmentIds}).then(function (data) {
                    vm.wechatGroupControlAdminList = data.data;
                    console.log('vm.wechatGroupControlAdminList ', vm.wechatGroupControlAdminList);
                    $scope.$evalAsync();
                });
            }
        }

        vm.loadPage = function () {
            socketService.clearValue();
            $('#wechatGroupControlMonitor').show();
            $('#autoRefreshWechatFlag')[0].checked = true;
            vm.lastWechatRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.wechatGroupControlMonitorQuery = {};
            Promise.all([vm.getWCGroupControlSessionDeviceNickName(), vm.getWCGroupControlDepartmentList()]).then(
                data => {
                    setTimeout(function () {
                        vm.setupMultiSelect();
                    });

                    vm.wechatGroupControlMonitorQuery.pageObj = utilService.createPageForPagingTable("#wechatGroupMonitorTablePage", {pageSize: 1000}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "wechatGroupControlMonitorQuery", vm.searchWechatMonitorRecord)
                    });
                }
            );
        };

        vm.setupMultiSelect = function () {
            utilService.actionAfterLoaded(('#wechatGroupControlMonitor'), function () {
                $('select#selectWechatGroupControlDepartment').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi = ($('select#selectWechatGroupControlDepartment').next().find('.ms-choice'))[0];

                $('select#selectWechatGroupControlDepartment').next().on('click', 'li input[type=checkbox]', function () {

                    if (vm.wechatGroupControlMonitorQuery && vm.wechatGroupControlMonitorQuery.department) {
                        Promise.all([vm.getWCAdminDetailByDepartmentIds(vm.wechatGroupControlMonitorQuery.department)]).then(
                            data => {
                                setTimeout(function () {
                                    vm.setupAdminMutliSelect();
                                });
                                $scope.$evalAsync();
                            }
                        )
                    }

                    let upText = $($multi).text().split(',').map(item => {
                        let textShow = '';
                        if (!item) {
                            $scope.$evalAsync(() => {
                                vm.wechatGroupControlAdminList = [];
                            });
                        } else {
                            vm.wechatGroupControlDepartmentList.forEach(department => {
                                if (department && department._id && item && (department._id.toString() == item.trim().toString())) {
                                    textShow = department.departmentName;
                                } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                    textShow = item;
                                }
                            });
                        }
                        return textShow;
                    }).join(',');
                    $($multi).find('span').text(upText);
                });
                $("select#selectWechatGroupControlDepartment").multipleSelect("checkAll");

                $('select#selectWechatGroupControlDeviceNickName').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi2 = ($('select#selectWechatGroupControlDeviceNickName').next().find('.ms-choice'))[0];
                $('select#selectWechatGroupControlDeviceNickName').next().on('click', 'li input[type=checkbox]', function () {
                    let upText2 = $($multi2).text().split(',').map(item => {
                        return item;
                    }).join(',');
                    $($multi2).find('span').text(upText2);
                });
                $("select#selectWechatGroupControlDeviceNickName").multipleSelect("checkAll");
                $scope.$evalAsync();
            });
        };

        vm.setupAdminMutliSelect = function () {
            utilService.actionAfterLoaded(('#selectWechatGroupControlDepartment'), function () {
                $('select#selectWechatGroupControlAdminId').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi1 = ($('select#selectWechatGroupControlAdminId').next().find('.ms-choice'))[0];
                $('select#selectWechatGroupControlAdminId').next().on('click', 'li input[type=checkbox]', function () {
                    let upText1 = $($multi1).text().split(',').map(item => {
                        let textShow = '';
                        vm.wechatGroupControlAdminList.forEach(admin => {
                            if (admin && admin._id && item && (admin._id.toString() == item.trim().toString())) {
                                textShow = admin.adminName;
                            } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                textShow = item;
                            }
                        });
                        return textShow;
                    }).join(',');
                    $($multi1).find('span').text(upText1);
                });
                $("select#selectWechatGroupControlAdminId").multipleSelect("checkAll");
                $scope.$evalAsync();
            });
        };

        vm.getSessionDuration = function (latestDate, createDate) {
            let diff = (latestDate.getTime() - createDate.getTime()) / 60000;

            return Math.floor(diff);
        };

        vm.resetWechatGroupControlMonitor = function () {

            setTimeout(function () {
                vm.setupMultiSelect();

                if (vm.wechatGroupControlMonitorQuery && vm.wechatGroupControlMonitorQuery.department) {
                    vm.getWCAdminDetailByDepartmentIds(vm.wechatGroupControlMonitorQuery.department).then(
                        data => {
                            setTimeout(function () {
                                vm.setupAdminMutliSelect();
                            });
                            $scope.$evalAsync();
                        }
                    )
                }
            });
            $scope.$evalAsync();
        };

        vm.searchWechatMonitorRecord = function (isNewSearch) {
            if (isNewSearch) {
                $('#autoRefreshWechatFlag').attr('checked', false);
            }

            $('#wechatGroupMonitorTableSpin').show();

            vm.wechatGroupControlMonitorQuery.index = isNewSearch ? 0 : (vm.wechatGroupControlMonitorQuery.index || 0);
            var sendObj = {
                adminIds: vm.wechatGroupControlMonitorQuery.csOfficer,
                deviceNickNames: vm.wechatGroupControlMonitorQuery.deviceNickName,
                index: vm.wechatGroupControlMonitorQuery.index,
                limit: vm.wechatGroupControlMonitorQuery.limit || 1000
            };

            console.log('sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'getWCGroupControlSessionMonitor', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    $('#wechatGroupMonitorTableSpin').hide();
                    console.log('getWCGroupControlSessionMonitor', data);
                    vm.wechatGroupControlMonitorQuery.totalCount = data.data.size;

                    vm.drawWechatGroupRecordTable(
                        data.data.data.map(item => {
                            let lastDate = new Date();
                            let createDate = new Date(item.createTime);
                            let duration = 0;
                            if (item && item.lastUpdateTime) {
                                lastDate = new Date(item.lastUpdateTime);
                            } else {
                                lastDate = new Date();
                            }
                            duration = vm.getSessionDuration(lastDate, createDate);
                            item.duration = duration;
                            item.duration$ = duration + $translate('minute(s)');
                            item.product = item.platformId + '.' + item.platformName;
                            item.adminName$ = item.adminName ? item.adminName : $translate('No first attempt login');
                            item.status$ = item.status == 1 ? $translate('Green light is on(Online)') : $translate('Red light is on(Offline)');
                            item.connectionAbnormalClickTimes$ = item.connectionAbnormalClickTimes ? item.connectionAbnormalClickTimes + $translate('Time(s)') : '0' + $translate('Time(s)');

                            return item;
                        }), data.data.size, {}, isNewSearch
                    );
                });
            }, function (err) {
                console.error(err);
            }, true);

        };

        vm.drawWechatGroupRecordTable = function (data, size, summary, newSearch) {
            let tableOptions = {
                data: data,
                "order": vm.wechatGroupControlMonitorQuery.aaSorting || [[4, 'desc']],
                aoColumnDefs: [
                    {'sortCol': 'connectionAbnormalClickTimes', bSortable: true, 'aTargets': [4]},
                    {'sortCol': 'duration', bSortable: true, 'aTargets': [5]},
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT'), data: "product"},
                    {title: $translate('Create Device Name'), data: "deviceNickName"},
                    {title: $translate('Last Login Account (Offline) / Current Login Account (Online)'), data: "adminName$"},
                    {title: $translate('Current System Status'), data: "status$"},
                    {
                        title: $translate('This Connection is Abnormally Clicked'),
                        data: "connectionAbnormalClickTimes$",
                        render: function (data, type, row) {
                            if (row.status == 2) {
                                var link = $('<div>', {});
                                link.append($('<a>', {
                                    'data-toggle': 'tooltip',
                                    'title': $translate("* Offline status shows the last connection data"),
                                    'data-placement': 'left',
                                }).text(data));
                                return link.prop('outerHTML');
                            } else {
                                return "<div>" + data + "</div>";
                            }
                        }
                    },
                    {
                        title: $translate('Connection Time'), data: "duration$",
                        render: function (data, type, row) {
                            if (row.status == 2) {
                                var link = $('<div>', {});
                                link.append($('<a>', {
                                    'data-toggle': 'tooltip',
                                    'title': $translate("* Offline status shows the last connection data"),
                                    'data-placement': 'left',
                                }).text(data));
                                return link.prop('outerHTML');
                            } else {
                                return "<div>" + data + "</div>";
                            }
                        }
                    },
                    {
                        title: $translate('Equipment History'),
                        render: function (data, type, row) {
                            var link = $('<div>', {});

                            link.append(
                                $('<a>', {
                                    'ng-click': 'vm.initWCGroupControlSessionHistory(' + JSON.stringify(row) + ')',
                                    'data-row': JSON.stringify(row),
                                    'data-target': '#modalWCGroupControlSessionHistory',
                                    'style': 'z-index: auto',
                                    'href': '#',
                                    'data-toggle': 'modal',
                                    'data-trigger': 'focus',
                                    'data-placement': 'bottom',
                                    'type': 'button',
                                    'data-container': 'body'
                                }).text($translate('7 Day(s) History')));

                            return link.prop('outerHTML');
                        }
                    },

                ],
                destroy: true,
                paging: false,
                autoWidth: true,
                fnRowCallback: vm.statusColor,
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.generalDataTableOptions, tableOptions);
            vm.lastWechatRefresh = utilService.$getTimeFromStdTimeFormat();
            utilService.createDatatableWithFooter('#wechatGroupMonitorTable', tableOptions, {}, true);
            vm.wechatGroupControlMonitorQuery.pageObj.init({maxCount: size}, newSearch);
            $('#wechatGroupMonitorTable').off('order.dt');
            $('#wechatGroupMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'wechatGroupControlMonitorQuery', vm.searchWechatMonitorRecord);
            });
            $('#wechatGroupMonitorTable').resize();
        };

        vm.statusColor = function(nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            $compile(nRow)($scope);
            if (aData.status == 1) {
                $(nRow).find('td:eq(3)').css({'background-color': 'green', 'color':'white'});
            }else{
                $(nRow).find('td:eq(3)').css({'background-color': 'red', 'color':'white'});
            }
        }

        vm.initWCGroupControlSessionHistory = function (data) {
            vm.wechatGroupControlHistoryAdminList = [];
            if (data.platformObjId && data.deviceNickName) {
                socketService.$socket($scope.AppSocket, 'getWechatSessionCsOfficer', {platformObjIds: [data.platformObjId], deviceNickNames: [data.deviceNickName]}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.wechatGroupControlHistoryAdminList = data && data.data || [];
                    })
                })
            }

            utilService.actionAfterLoaded('#modalWCGroupControlSessionHistory.in #wcGroupControlSessionHistoryQuery .endTime', function () {
                vm.wcGroupControlSessionHistory = {};
                vm.wcGroupControlSessionHistory.totalCount = 0;
                vm.wcGroupControlSessionHistory.limit = 1000;
                vm.wcGroupControlSessionHistory.index = 0;
                if (data && Object.keys(data).length > 0) {
                    vm.wcGroupControlSessionHistory.platform = data.platformObjId;
                    vm.wcGroupControlSessionHistory.platformName = data.platformName;
                    vm.wcGroupControlSessionHistory.deviceNickName = data.deviceNickName;
                    vm.wcGroupControlSessionHistory.deviceId = data.deviceId;
                };

                $('select#selectWCGroupControlSessionHistoryAdminId').multipleSelect({
                    allSelected: $translate("All Selected"),
                    selectAllText: $translate("Select All"),
                    displayValues: true,
                    countSelected: $translate('# of % selected'),
                });
                let $multi = ($('select#selectWCGroupControlSessionHistoryAdminId').next().find('.ms-choice'))[0];
                $('select#selectWCGroupControlSessionHistoryAdminId').next().on('click', 'li input[type=checkbox]', function () {
                    let upText = $($multi).text().split(',').map(item => {
                        let textShow = '';
                        vm.wechatGroupControlHistoryAdminList.forEach(admin => {
                            if (admin && admin._id && item && ((admin._id.toString() == item.trim().toString() || admin.adminName.toString() == item.trim().toString()))) {
                                textShow = admin.adminName;
                            } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                textShow = item;
                            }
                        });
                        return textShow;
                    }).join(',');
                    $($multi).find('span').text(upText);
                });
                $("select#selectWCGroupControlSessionHistoryAdminId").multipleSelect("checkAll");

                vm.wcGroupControlSessionHistory.startDate = utilService.createDatePicker('#wcGroupControlSessionHistoryQuery .startTime');
                vm.wcGroupControlSessionHistory.endDate = utilService.createDatePicker('#wcGroupControlSessionHistoryQuery .endTime');
                vm.wcGroupControlSessionHistory.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 7)));
                vm.wcGroupControlSessionHistory.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                utilService.actionAfterLoaded('#modalWCGroupControlSessionHistory.in #wcGroupControlSessionHistoryTablePage', function () {
                    vm.wcGroupControlSessionHistory.pageObj = utilService.createPageForPagingTable("#wcGroupControlSessionHistoryTablePage", {pageSize: 1000}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "wcGroupControlSessionHistory", vm.getWCGroupControlSessionHistory)
                    });
                    vm.getWCGroupControlSessionHistory(true);
                });
            });
        };

        vm.getWCGroupControlSessionHistory = function (newSearch) {
            let sendQuery = {
                platformObjId: vm.wcGroupControlSessionHistory.platform,
                deviceNickName: vm.wcGroupControlSessionHistory.deviceNickName,
                deviceId: vm.wcGroupControlSessionHistory.deviceId,
                adminIds: vm.wcGroupControlSessionHistory.csOfficer,
                startDate: vm.wcGroupControlSessionHistory.startDate.data('datetimepicker').getLocalDate(),
                endDate: vm.wcGroupControlSessionHistory.endDate.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.wcGroupControlSessionHistory.index,
                limit: newSearch ? 1000 : vm.wcGroupControlSessionHistory.limit,
            }

            console.log('sendSessionQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getWCGroupControlSessionHistory', sendQuery, function (data) {
                console.log("getWCGroupControlSessionHistory", data);

                $scope.$evalAsync(() => {
                    vm.wcGroupControlSessionHistory.totalCount = data.data.size;

                    vm.drawWCGroupControlSessionHistoryTable(
                        data.data.data.map(item => {
                            let lastDate = new Date();
                            let createDate = new Date(item.createTime);
                            let duration = 0;
                            if (item && item.lastUpdateTime) {
                                lastDate = new Date(item.lastUpdateTime);
                            } else {
                                lastDate = new Date();
                            }
                            duration = vm.getSessionDuration(lastDate, createDate);
                            item.duration = duration;
                            item.product = item.platformObjId ? item.platformObjId.platformId + '.' + item.platformObjId.name : '';
                            item.adminName$ = item.csOfficer ? item.csOfficer.adminName : $translate('No first attempt login');
                            item.connectionAbnormalClickTimes$ = item.connectionAbnormalClickTimes ? item.connectionAbnormalClickTimes : 0;
                            item.createTime$ = vm.dateReformat(item.createTime);
                            item.lastUpdateTime$ = !item.lastUpdateTime ? $translate('Still Online') : vm.dateReformat(item.lastUpdateTime);

                            return item;
                        }), data.data.size, {}, newSearch
                    );
                });
            });
        };

        vm.drawWCGroupControlSessionHistoryTable = function (data, size, summary, newSearch) {
            let tableOptions = {
                data: data,
                aoColumnDefs: [
                    {targets: '_all', defaultContent: ' ', bSortable: false}
                ],
                columns: [
                    {title: $translate('PRODUCT'), data: "product"},
                    {title: $translate('Create Device Name'), data: "deviceNickName"},
                    {title: $translate('Use Account'), data: "adminName$"},
                    {title: $translate('Start Connection Time'), data: "createTime$"},
                    {title: $translate('Offline Time'), data: "lastUpdateTime$",
                        render: function (data, type, row) {
                            if (!row.lastUpdateTime) {
                                return "<div style='padding:0;color:green;'>" + data + "</div>";
                            } else {
                                return "<div>" + data + "</div>";
                            }
                        }},
                    {title: $translate('This Connection is Abnormally Clicked'), data: "connectionAbnormalClickTimes$"},
                    {title: $translate('Connection Time'), data: "duration"}
                ],
                destroy: true,
                paging: false,
                autoWidth: true,
                createdRow: function (row, data, dataIndex) {
                    $compile(angular.element(row).contents())($scope)
                }
            };
            tableOptions = $.extend(true, {}, vm.generalDataTableOptions, tableOptions);
            utilService.createDatatableWithFooter('#wcGroupControlSessionHistoryTable', tableOptions, {}, true);
            vm.wcGroupControlSessionHistory.pageObj.init({maxCount: size}, newSearch);
            $('#wcGroupControlSessionHistoryTable').off('order.dt');
            $('#wcGroupControlSessionHistoryTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'wcGroupControlSessionHistory', vm.getWCGroupControlSessionHistory);
            });
            $('#wcGroupControlSessionHistoryTable').resize();
            $scope.$evalAsync();
        };

        vm.dateReformat = function (data) {
            if (!data) return '';
            return utilService.getFormatTime(data);
        };

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
        };

        vm.commonSortChangeHandler = function (a, objName, searchFunc) {
            if (!a.aaSorting[0] || !objName || !vm[objName] || !searchFunc) return;
            let sortCol = a.aaSorting[0][0];
            let sortDire = a.aaSorting[0][1];
            let temp = a.aoColumns[sortCol];
            let sortKey = temp ? temp.sortCol : '';
            vm[objName].aaSorting = a.aaSorting;
            if (sortKey) {
                vm[objName].sortCol = vm[objName].sortCol || {};
                let preVal = vm[objName].sortCol[sortKey];
                vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                if (vm[objName].sortCol[sortKey] != preVal) {
                    vm[objName].sortCol = {};
                    vm[objName].sortCol[sortKey] = sortDire == "asc" ? 1 : -1;
                    searchFunc.call(this);
                }
            }
        };

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

        $scope.$on('socketReady', function (e, d) {
            if ($scope.AppSocket) {
                $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');
            }
        });

        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            setTimeout(function () {
                let countDown = -1;
                clearInterval(vm.refreshInterval);
                vm.refreshInterval = setInterval(function () {
                    var item = $('#autoRefreshWechatFlag');
                    var isRefresh = item && item.length > 0 && item[0].checked;
                    var mark = $('#timeLeftRefreshOperation')[0];
                    $(mark).parent().toggleClass('hidden', countDown < 0);
                    if (isRefresh) {
                        if (countDown < 0) {
                            countDown = 11
                        }
                        if (countDown === 0) {
                            vm.searchWechatMonitorRecord();
                            countDown = 11;
                        }
                        countDown--;
                        $(mark).text(countDown);
                    } else {
                        countDown = -1;
                    }
                    if (window.location.pathname != '/monitor/payment' && window.location.pathname != '/monitor/wechatGroup') {
                        clearInterval(vm.refreshInterval);
                    }
                }, 1000);
            });
        });
    };

    monitorWechatController.$inject = injectParams;

    myApp.register.controller('monitorWechatCtrl', monitorWechatController);
});
