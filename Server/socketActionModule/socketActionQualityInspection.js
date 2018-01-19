var socketUtil = require('./../modules/socketutility');
const dbQualityInspection = require('./../db_modules/dbQualityInspection');

function socketActionQualityInspection(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        showLive800: function showLive800(data) {
            var actionName = arguments.callee.name;
            data = true;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbQualityInspection.connectMysql, [], actionName, isDataValid);
        },

        getUnreadEvaluationRecord: function getUnreadEvaluationRecord(data){
            var actionName = arguments.callee.name;
            //data = true;
            var isDataValid = Boolean(data.createTime);
            socketUtil.emitter(self.socket, dbQualityInspection.getUnreadEvaluationRecord, [data.createTime], actionName, isDataValid);
        },

    };

    socketActionQualityInspection.actions = this.actions;
};

module.exports = socketActionQualityInspection;