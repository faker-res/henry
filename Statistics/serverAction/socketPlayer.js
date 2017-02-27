var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbAccessLog = require('./../db_modules/dbAccessLog');
var dbPaymentLog = require('./../db_modules/dbPaymentLog');
var dbActiveAccessLog = require('./../db_modules/dbActiveAccessLog');

var socketUtil = require('./../modules/socketutility');

module.exports.listen = function (io, socket) {

    /**
     * Get data for daily registered players for past 30 days
     * @param {json} data - It contains
     */
    socket.on("getPast30DaysNewPlayerCount", function (data) {
        socketUtil.emitter(socket, dbPlayerInfo.getPast30DaysNewPlayerCount, data, "getPast30DaysNewPlayerCount");
    });

    /**
     * Get DAU count for past 30 days
     */
    socket.on("getPastDaysDAU", function (data) {
        var isValidData = Boolean(data && data.numOfDays);
        socketUtil.emitter(socket, dbAccessLog.getDAUForPastDays, [data.numOfDays], "getPastDaysDAU", isValidData);
    });
    socket.on("getDailyNewPlayerCount", function (data) {
        socketUtil.emitter(socket, dbPlayerInfo.getDailyNewPlayerCount, [data], "getDailyNewPlayerCount");
    });

    /**
     * Get data for new registered players for past x days
     * @param {json} data - It contains query parameters(num, frequency)
     */
    socket.on("getNewPlayerCount", function (data) {
        var isValidData = Boolean(data && data.num && data.frequency);
        socketUtil.emitter(socket, dbPlayerInfo.getNewPlayerCount, [data], "getNewPlayerCount", isValidData);
    });
    /**
     * Get data for active players for past x days
     * @param {json} data - It contains query parameters(num, frequency)
     */
    socket.on("getActivePlayerCount", function (data) {
        var isValidData = Boolean(data && data.num && data.frequency);
        socketUtil.emitter(socket, dbAccessLog.getActivePlayerCount, [data], "getActivePlayerCount", isValidData);
    });

    /**
     * Get retention data for active players for past x days
     * @param {json} data - It contains query parameters(num, frequency)
     */
    socket.on("getRetentionData", function (query) {
        var isValidData = Boolean(query && query.dataType && query.frequency && query.range);
        socketUtil.emitter(socket, dbAccessLog.getRetentionData, [query], "getRetentionData", isValidData);
    });
    /**
     * Get ARPU data for active players for past x days
     * @param {json} data - It contains query parameters(num, frequency)
     */
    socket.on("getARPU", function (query) {
        var isValidData = Boolean(query && query.dataType && query.frequency && query.metric && query.range);
        socketUtil.emitter(socket, dbPaymentLog.getARPU, [query], "getARPU", isValidData);
    });

    /**
     * Get active user in certain time frame
     * @param {json} data - It contains query parameters(num, frequency)
     */
    socket.on("getActiveAccessUser", function (query) {
        var isValidData = Boolean(query && query.dataType && query.frequency && query.metric && query.range);
        socketUtil.emitter(socket, dbActiveAccessLog.getActiveAccessUser, [query], "getActiveAccessUser", isValidData);
    });

};