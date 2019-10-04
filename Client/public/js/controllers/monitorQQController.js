'use strict';

define(['js/app'], function (myApp) {
    let injectParams = ['$sce', '$scope', '$filter', '$compile', '$location', '$log', '$timeout', 'socketService', 'authService', 'utilService', 'CONFIG', "$cookies", 'commonService'];
    let monitorQQController = function ($sce, $scope, $filter, $compile, $location, $log, $timeout, socketService, authService, utilService, CONFIG, $cookies, commonService) {
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
                    vm.qqSessionNickName = []; // reset multiselect
                    vm.qqSessionCsOfficer =  []; // reset multiselect
                    vm.refreshSPicker();
                })
            })
        };

        vm.getQQSessionDeviceNickName = function (platformObjIds) {
            if (platformObjIds && platformObjIds.length) {
                socketService.$socket($scope.AppSocket, 'getQQSessionDeviceNickName', {platformObjIds: platformObjIds}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.qqSessionNickName = data && data.data || [];
                    })
                })
            } else {
                vm.qqSessionNickName = [];
            }
        };

        vm.getQQSessionCsOfficer = function (platformObjIds, deviceNickNames) {
            if (platformObjIds && platformObjIds.length && deviceNickNames && deviceNickNames.length) {
                socketService.$socket($scope.AppSocket, 'getQQSessionCsOfficer', {platformObjIds: platformObjIds, deviceNickNames: deviceNickNames}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.qqSessionCsOfficer = data && data.data || [];
                    })
                })
            } else {
                vm.qqSessionCsOfficer = [];
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
            $('#qqGroupControlMonitor').show();
            $('#autoRefreshQQFlag')[0].checked = true;
            vm.lastQQRefresh = utilService.$getTimeFromStdTimeFormat();
            vm.qqGroupControlMonitorQuery = {};
            getAdminPlatformName();
            vm.qqGroupControlMonitorQuery.pageObj = utilService.createPageForPagingTable("#qqGroupMonitorTablePage", {pageSize: 1000}, $translate, function (curP, pageSize) {
                vm.commonPageChangeHandler(curP, pageSize, "qqGroupControlMonitorQuery", vm.searchQQMonitorRecord);
                $scope.$evalAsync();
            });
        };

        vm.getSessionDuration = function (latestDate, createDate) {
            let diff = (latestDate.getTime() - createDate.getTime()) / 60000;

            return Math.floor(diff);
        };

        vm.resetQQGroupControlMonitor = function () {
            vm.qqGroupControlMonitorQuery.product = [];
            vm.qqGroupControlMonitorQuery.deviceNickName = [];
            vm.qqGroupControlMonitorQuery.csOfficer = [];
            getAdminPlatformName();
            $scope.$evalAsync();
        };

        vm.searchQQMonitorRecord = function (isNewSearch) {
            if (isNewSearch) {
                $('#autoRefreshQQFlag').attr('checked', false);
            }

            $('#qqGroupMonitorTableSpin').show();

            vm.qqGroupControlMonitorQuery.index = isNewSearch ? 0 : ((vm.qqGroupControlMonitorQuery && vm.qqGroupControlMonitorQuery.index) || 0);
            var sendObj = {
                platformIds: vm.qqGroupControlMonitorQuery.product || vm.presetPlatform,
                adminIds: vm.qqGroupControlMonitorQuery.csOfficer,
                deviceNickNames: vm.qqGroupControlMonitorQuery.deviceNickName,
                index: vm.qqGroupControlMonitorQuery.index,
                limit: vm.qqGroupControlMonitorQuery.limit || 1000,
                sortCol: vm.qqGroupControlMonitorQuery.sortCol
            };

            console.log('sendObj', sendObj);

            socketService.$socket($scope.AppSocket, 'getQQGroupControlSessionMonitor', sendObj, function (data) {
                $('#qqGroupMonitorTableSpin').hide();
                console.log('getQQGroupControlSessionMonitor', data);
                vm.qqGroupControlMonitorQuery.totalCount = data.data.size;

                vm.drawQQGroupRecordTable(
                    data.data.data ? data.data.data.map(item => {
                        item.duration = Math.floor(item.duration);
                        item.product = item.platformId + '.' + item.platformName;
                        item.adminName$ = item.adminName ? item.adminName : $translate('No first attempt login');
                        item.status$ = item.status == 1 ? $translate('Green light is on(Online)') : $translate('Red light is on(Offline)');
                        item.qqVersion = item.qqVersion ? item.qqVersion : ''

                        return item;
                    }) : [], data.data.size, {}, isNewSearch
                );

                $scope.$evalAsync();
            }, function (err) {
                console.error(err);
            }, true);

        };

        vm.drawQQGroupRecordTable = function (data, size, summary, newSearch) {
            let tableOptions = {
                data: data,
                "order": vm.qqGroupControlMonitorQuery.aaSorting,
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
                        data: "connectionAbnormalClickTimes",
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
                    {title: $translate('QQ Version'), data: "qqVersion"},
                    {
                        title: $translate('Connection Time'), data: "duration",
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
                                    'ng-click': 'vm.initQQGroupControlSessionHistory(' + JSON.stringify(row) + ')',
                                    'data-row': JSON.stringify(row),
                                    'data-target': '#modalQQGroupControlSessionHistory',
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
            vm.lastQQRefresh = utilService.$getTimeFromStdTimeFormat();
            utilService.createDatatableWithFooter('#qqGroupMonitorTable', tableOptions, {}, true);
            vm.qqGroupControlMonitorQuery.pageObj.init({maxCount: size}, newSearch);
            $('#qqGroupMonitorTable').off('order.dt');
            $('#qqGroupMonitorTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'qqGroupControlMonitorQuery', vm.searchQQMonitorRecord);
            });
            $('#qqGroupMonitorTable').resize();
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

        vm.initQQGroupControlSessionHistory = function (data) {
            vm.qqGroupControlHistoryAdminList = [];
            if (data.platformObjId && data.deviceNickName) {
                socketService.$socket($scope.AppSocket, 'getQQSessionCsOfficer', {platformObjIds: [data.platformObjId], deviceNickNames: [data.deviceNickName]}, function (data) {
                    $scope.$evalAsync(() => {
                        vm.qqGroupControlHistoryAdminList = data && data.data || [];
                    })
                })
            }

            utilService.actionAfterLoaded('#modalQQGroupControlSessionHistory.in #qqGroupControlSessionHistoryQuery .endTime', function () {
                vm.qqGroupControlSessionHistory = {};
                vm.qqGroupControlSessionHistory.totalCount = 0;
                vm.qqGroupControlSessionHistory.limit = 1000;
                vm.qqGroupControlSessionHistory.index = 0;
                if (data && Object.keys(data).length > 0) {
                    vm.qqGroupControlSessionHistory.platform = data.platformObjId;
                    vm.qqGroupControlSessionHistory.platformName = data.platformName;
                    vm.qqGroupControlSessionHistory.deviceNickName = data.deviceNickName;
                    vm.qqGroupControlSessionHistory.deviceId = data.deviceId;
                };

                vm.qqGroupControlSessionHistory.startDate = utilService.createDatePicker('#qqGroupControlSessionHistoryQuery .startTime');
                vm.qqGroupControlSessionHistory.endDate = utilService.createDatePicker('#qqGroupControlSessionHistoryQuery .endTime');
                vm.qqGroupControlSessionHistory.startDate.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 7)));
                vm.qqGroupControlSessionHistory.endDate.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
                utilService.actionAfterLoaded('#modalQQGroupControlSessionHistory.in #qqGroupControlSessionHistoryTablePage', function () {
                    vm.qqGroupControlSessionHistory.pageObj = utilService.createPageForPagingTable("#qqGroupControlSessionHistoryTablePage", {pageSize: 1000}, $translate, function (curP, pageSize) {
                        vm.commonPageChangeHandler(curP, pageSize, "qqGroupControlSessionHistory", vm.getQQGroupControlSessionHistory)
                    });
                    vm.getQQGroupControlSessionHistory(true);
                });
            });
        };

        vm.getQQGroupControlSessionHistory = function (newSearch) {
            let sendQuery = {
                platformObjId: vm.qqGroupControlSessionHistory.platform,
                deviceNickName: vm.qqGroupControlSessionHistory.deviceNickName,
                deviceId: vm.qqGroupControlSessionHistory.deviceId,
                adminIds: vm.qqGroupControlSessionHistory.csOfficer,
                startDate: vm.qqGroupControlSessionHistory.startDate.data('datetimepicker').getLocalDate(),
                endDate: vm.qqGroupControlSessionHistory.endDate.data('datetimepicker').getLocalDate(),
                index: newSearch ? 0 : vm.qqGroupControlSessionHistory.index,
                limit: newSearch ? 1000 : vm.qqGroupControlSessionHistory.limit,
                sortCol: vm.qqGroupControlSessionHistory.sortCol
            }

            console.log('sendSessionQuery', sendQuery);

            socketService.$socket($scope.AppSocket, 'getQQGroupControlSessionHistory', sendQuery, function (data) {
                console.log("getQQGroupControlSessionHistory", data);

                $scope.$evalAsync(() => {
                    vm.qqGroupControlSessionHistory.totalCount = data.data.size;

                    vm.drawQQGroupControlSessionHistoryTable(
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

        vm.drawQQGroupControlSessionHistoryTable = function (data, size, summary, newSearch) {
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
            utilService.createDatatableWithFooter('#qqGroupControlSessionHistoryTable', tableOptions, {}, true);
            vm.qqGroupControlSessionHistory.pageObj.init({maxCount: size}, newSearch);
            $('#qqGroupControlSessionHistoryTable').off('order.dt');
            $('#qqGroupControlSessionHistoryTable').on('order.dt', function (event, a, b) {
                vm.commonSortChangeHandler(a, 'qqGroupControlSessionHistory', vm.getQQGroupControlSessionHistory);
            });
            $('#qqGroupControlSessionHistoryTable').resize();
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

        $scope.$emit('childchildControllerLoaded', 'monitorProposalAndPaymentControllerLoaded');



        $scope.$on("setPlatform", function (e, d) {
            vm.hideLeftPanel = false;
            setTimeout(function () {
                let countDown = -1;
                clearInterval(vm.refreshInterval);
                vm.refreshInterval = setInterval(function () {
                    var item = $('#autoRefreshQQFlag');
                    var isRefresh = item && item.length > 0 && item[0].checked;
                    var mark = $('#timeLeftRefreshOperation')[0];
                    $(mark).parent().toggleClass('hidden', countDown < 0);
                    if (isRefresh) {
                        if (countDown < 0) {
                            countDown = 11
                        }
                        if (countDown === 0) {
                            vm.searchQQMonitorRecord();
                            countDown = 11;
                        }
                        countDown--;
                        $(mark).text(countDown);
                    } else {
                        countDown = -1;
                    }

                    if (window.location.pathname != '/monitor/payment' && window.location.pathname != '/monitor/wechatGroup' && window.location.pathname != '/monitor/qqGroup') {
                        clearInterval(vm.refreshInterval);
                    }
                }, 1000);
            });
        });
    };

    monitorQQController.$inject = injectParams;

    myApp.register.controller('monitorQQCtrl', monitorQQController);
});
