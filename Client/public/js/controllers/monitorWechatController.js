'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', '$timeout', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorWechatController = function ($sce, $scope, $filter, $compile, $location, $log, $timeout, socketService, authService, utilService, CONFIG, $cookies, commonService) {
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

        function getAdminPlatformName () {
            socketService.$socket($scope.AppSocket, 'getAdminPlatformName', {admin: authService.adminId}, function (data) {
                $scope.$evalAsync(() => {
                    vm.adminPlatformName = data && data.data || [];
                    vm.presetPlatform = [];
                    if (vm.adminPlatformName && vm.adminPlatformName.length > 0) {
                        vm.adminPlatformName.forEach(platform => {
                            if (platform && platform._id) {
                                vm.presetPlatform.push(platform._id);
                            }
                        })
                    }
                    vm.wechatSessionNickName = []; // reset multiselect
                    vm.wechatSessionCsOfficer =  []; // reset multiselect
                    vm.refreshSPicker();
                })
            })
        };

        vm.getWechatSessionDeviceNickName = function (platformObjIds) {
            if (platformObjIds && platformObjIds.length) {
                socketService.$socket($scope.AppSocket, 'getWechatSessionDeviceNickName', {platformObjIds: platformObjIds}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.wechatSessionNickName = data && data.data || [];
                    })
                })
            } else {
                vm.wechatSessionNickName = [];
            }
        };

        vm.getWechatSessionCsOfficer = function (platformObjIds, deviceNickNames) {
            if (platformObjIds && platformObjIds.length && deviceNickNames && deviceNickNames.length) {
                socketService.$socket($scope.AppSocket, 'getWechatSessionCsOfficer', {platformObjIds: platformObjIds, deviceNickNames: deviceNickNames}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.wechatSessionCsOfficer = data && data.data || [];
                    })
                })
            } else {
                vm.wechatSessionCsOfficer = [];
            }
        };

        vm.refreshSPicker = () => {
            // without this timeout, 'selectpicker refresh' might done before the DOM able to refresh, which evalAsync doesn't help
            $timeout(function () {
                $('.spicker').selectpicker('refresh');
            }, 0);
        };

        vm.loadPage = function () {
            socketService.clearValue();
            $('#wechatGroupControlMonitor').show();
            $('#autoRefreshWechatFlag')[0].checked = true;
            vm.lastWechatRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.wechatGroupControlMonitorQuery = {};
            getAdminPlatformName();
            vm.wechatGroupControlMonitorQuery.pageObj = utilService.createPageForPagingTable("#wechatGroupMonitorTablePage", {pageSize: 1000}, $translate, function (curP, pageSize) {
                vm.commonPageChangeHandler(curP, pageSize, "wechatGroupControlMonitorQuery", vm.searchWechatMonitorRecord)
            });
        };

        vm.getSessionDuration = function (latestDate, createDate) {
            let diff = (latestDate.getTime() - createDate.getTime()) / 60000;

            return Math.floor(diff);
        };

        vm.resetWechatGroupControlMonitor = function () {
            vm.wechatGroupControlMonitorQuery.product = [];
            vm.wechatGroupControlMonitorQuery.deviceNickName = [];
            vm.wechatGroupControlMonitorQuery.csOfficer = [];
            getAdminPlatformName();
            $scope.$evalAsync();
        };

        vm.searchWechatMonitorRecord = function (isNewSearch) {
            if (isNewSearch) {
                $('#autoRefreshWechatFlag').attr('checked', false);
            }

            $('#wechatGroupMonitorTableSpin').show();

            vm.wechatGroupControlMonitorQuery.index = isNewSearch ? 0 : (vm.wechatGroupControlMonitorQuery.index || 0);
            var sendObj = {
                platformIds: vm.wechatGroupControlMonitorQuery.product || vm.presetPlatform,
                adminIds: vm.wechatGroupControlMonitorQuery.csOfficer,
                deviceNickNames: vm.wechatGroupControlMonitorQuery.deviceNickName,
                index: vm.wechatGroupControlMonitorQuery.index,
                limit: vm.wechatGroupControlMonitorQuery.limit || 1000,
                sortCol: vm.wechatGroupControlMonitorQuery.sortCol
            };

            console.log('sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'getWCGroupControlSessionMonitor', sendObj, function (data) {
                $scope.$evalAsync(() => {
                    $('#wechatGroupMonitorTableSpin').hide();
                    console.log('getWCGroupControlSessionMonitor', data);
                    vm.wechatGroupControlMonitorQuery.totalCount = data.data.size;

                    vm.drawWechatGroupRecordTable(
                        data.data.data ? data.data.data.map(item => {
                            item.duration = Math.floor(item.duration);
                            item.duration$ = Math.floor(item.duration) + $translate('minute(s)');
                            item.product = item.platformId + '.' + item.platformName;
                            item.adminName$ = item.adminName ? item.adminName : $translate('No first attempt login');
                            item.status$ = item.status == 1 ? $translate('Green light is on(Online)') : $translate('Red light is on(Offline)');
                            item.connectionAbnormalClickTimes$ = item.connectionAbnormalClickTimes ? item.connectionAbnormalClickTimes + $translate('Time(s)') : '0' + $translate('Time(s)');

                            return item;
                        }) : [], data.data.size, {}, isNewSearch
                    );

                });
            }, function (err) {
                console.error(err);
            }, true);

        };

        vm.drawWechatGroupRecordTable = function (data, size, summary, newSearch) {
            let tableOptions = {
                data: data,
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
                fnRowCallback: vm.statusColor
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
            $scope.$evalAsync();
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
                sortCol: vm.wcGroupControlSessionHistory.sortCol
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
                    {'sortCol': 'createTime', bSortable: true, 'aTargets': [3]},
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
