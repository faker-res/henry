var encrypt = require('./../modules/encrypt');
var dbPlatformGameStatus = require('./../db_modules/dbPlatformGameStatus');

const dbUtility = require('./../modules/dbutility');
const socketUtil = require('./../modules/socketutility');


function socketActionUtility(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {
        getYesterdayConsumptionReturnSGTime: function getYesterdayConsumptionReturnSGTime() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbUtility.getYesterdayConsumptionReturnSGTime, [], actionName, true);
        },

        getYesterdaySGTime: function getYesterdaySGTime() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbUtility.getYesterdaySGTime, [], actionName, true);
        },

        getLastMonthSGTime: function getLastMonthSGTime() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbUtility.getLastMonthSGTime, [], actionName, true);
        },

        getLastMonthConsumptionReturnSGTime: function getLastMonthConsumptionReturnSGTime() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbUtility.getLastMonthConsumptionReturnSGTime, [], actionName, true);
        },

        getLastWeekSGTime: function getLastWeekSGTime() {
            let actionName = arguments.callee.name;
            socketUtil.emitter(self.socket, dbUtility.getLastWeekSGTime, [], actionName, true);
        }
    };
    socketActionUtility.actions = this.actions;
};

module.exports = socketActionUtility;