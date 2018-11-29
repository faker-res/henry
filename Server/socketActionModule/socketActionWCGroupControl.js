const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbWCGroupControl = require('./../db_modules/dbWCGroupControl');

const socketUtil = require('./../modules/socketutility');

function socketActionWCGroupControl(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    let adminInfo;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    if (getAdminId() && getAdminName()) {
        adminInfo = {
            name: getAdminName(),
            type: 'admin',
            id: getAdminId()
        }
    }

    this.actions = {
        updateWechatGroupControlSetting: function updateWechatGroupControlSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.wechatGroupControlSetting && adminInfo && adminInfo.id);
            socketUtil.emitter(self.socket, dbWCGroupControl.updateWechatGroupControlSetting, [data.platformObjId, data.wechatGroupControlSetting, data.deleteWechatGroupControlSetting, adminInfo], actionName, isValidData);
        },

        getWechatGroupControlSetting: function getWechatGroupControlSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWechatGroupControlSetting, [data.platformObjId], actionName, isValidData);
        },

        getWCGroupControlSessionDeviceNickName: function getWCGroupControlSessionDeviceNickName(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionDeviceNickName, [data.platformObjId], actionName, isValidData);
        },

        getWCGroupControlSessionMonitor: function getWCGroupControlSessionMonitor(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionMonitor, [data.deviceNickNames, data.adminIds, index, limit], actionName, isValidData);
        },

        getWCGroupControlSessionHistory: function getWCGroupControlSessionHistory(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.deviceNickName && data.deviceId && data.adminIds && data.startDate && data.endDate);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionHistory, [data.platformObjId, data.deviceNickName, data.deviceId, data.adminIds, data.startDate, data.endDate, index, limit], actionName, isValidData);
        }
    };
    socketActionWCGroupControl.actions = this.actions;
}

module.exports = socketActionWCGroupControl;
