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
            $('#autoRefreshWechatFlag')[0].checked = true;
            vm.lastWechatRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.wechatGroupControlMonitorQuery = {};
            Promise.all([vm.getWCGroupControlSessionDeviceNickName(), vm.getWCGroupControlDepartmentList()]).then(
                data => {
                    setTimeout(function () {
                        vm.setupMultiSelect();
                    });

                    vm.wechatGroupControlMonitorQuery.pageObj = utilService.createPageForPagingTable("#wechatGroupMonitorTablePage", {}, $translate, function (curP, pageSize) {
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
                        vm.wechatGroupControlDepartmentList.forEach(department => {
                            if (department && department._id && item && (department._id.toString() == item.trim().toString())) {
                                textShow = department.departmentName;
                            } else if (item.trim().includes('/') || item.trim().includes('全选')) {
                                textShow = item;
                            }
                        });
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

        vm.getSessionDuration = function (latestDate, createDate)
        {
            let diff = (latestDate.getTime() - createDate.getTime()) / 60000;

            return diff;
        };

        vm.convertSessionDurationToHourAndMinute = function (time) {
            let hours = (time / 60);
            let rhours = Math.floor(hours);
            let minutes = (hours - rhours) * 60;
            let rminutes = Math.round(minutes);
            let duration = '';

            if (rhours) {
                duration += rhours + $translate('hour(s)');
            }

            if (rminutes) {
                duration += rminutes + $translate('minute(s)');
            }
            return duration;
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
                limit: vm.wechatGroupControlMonitorQuery.limit || 10
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
                            item.duration$ = vm.convertSessionDurationToHourAndMinute(duration);
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
                    {title: $translate('Current System Status'), data: "status$",
                        render: function (data, type, row) {
                        var text = data;
                        if (row.status == 1){
                            return "<div style='padding:0;background-color:green; color:white'>" + text + "</div>";
                        } else {
                            return "<div style='padding:0;background-color:red; color:white'>" + text + "</div>";
                        }
                    }},
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
                            var text = $translate("7 Day(s) History");
                            return "<a>" + text + "</a>";
                        }
                    },

                ],
                destroy: true,
                paging: false,
                autoWidth: true,
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
