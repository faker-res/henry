/**
 * Created by anyone on 4/4/17.
 */
'use strict';

var platformGameCreditLogController = function ($scope, utilService) {
    var vm = $scope;
    vm.initGameCreditLog = function () {
        vm.gameCreditLog = vm.smsLog || {index: 0, limit: 10};
        // vm.gameCreditLog.type = type;
        vm.gameCreditLog.query = {};
        vm.gameCreditLog.searchResults = [{}];
        vm.gameCreditLog.query.status = "all";
        utilService.actionAfterLoaded('.modal.in #gameCreditLogQuery .endTime', function () {
            vm.gameCreditLog.query.startTime = utilService.createDatePicker('#gameCreditLogQuery .startTime');
            vm.gameCreditLog.query.endTime = utilService.createDatePicker('#gameCreditLogQuery .endTime');
            vm.gameCreditLog.query.startTime.data('datetimepicker').setDate(utilService.setLocalDayStartTime(utilService.setNDaysAgo(new Date(), 1)));
            vm.gameCreditLog.query.endTime.data('datetimepicker').setDate(utilService.setLocalDayEndTime(new Date()));
            vm.gameCreditLog.pageObj = utilService.createPageForPagingTable("#gameCreditLogTablePage", {}, $translate, function (curP, pageSize) {
                vm.commonPageChangeHandler(curP, pageSize, "gameCreditLog", vm.getGameCreditLog)
            });
            // Be user friendly: Fetch some results immediately!
            vm.getGameCreditLog();
        });
    }
    vm.getGameCreditLog = function () {
        var requestData = {
            "playerName": "uaeson2test",
            "providerId": "41",
            "startDate": "2017-04-03 00:00:00",
            "endDate": "2017-04-04 00:00:00",
            "page": "1",
            "platformId": 1,
        };
        $scope.$socketPromise('getGameCreditLog', requestData).then(result => {
            debugger
        }).catch(console.error);
    }
}