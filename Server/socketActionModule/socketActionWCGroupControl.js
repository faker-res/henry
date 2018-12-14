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


        getWechatSessionDeviceNickName: function getWechatSessionDeviceNickName(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjIds && data.platformObjIds.length);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWechatSessionDeviceNickName, [data.platformObjIds], actionName, isValidData);
        },

        getWechatSessionCsOfficer: function getWechatSessionCsOfficer(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjIds && data.platformObjIds.length && data.deviceNickNames && data.deviceNickNames.length);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWechatSessionCsOfficer, [data.platformObjIds, data.deviceNickNames], actionName, isValidData);
        },

        getWechatControlSession: function getWechatControlSession(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.admin && data.startTime && data.endTime);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWechatControlSession, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

        isNewWechatDeviceDataExist: function isNewWechatDeviceDataExist(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.deviceId && data.deviceNickName);
            socketUtil.emitter(self.socket, dbWCGroupControl.isNewWechatDeviceDataExist, [data.deviceId, data.deviceNickName], actionName, isValidData);
        },

        getWCGroupControlSessionMonitor: function getWCGroupControlSessionMonitor(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            let sortCol = data.sortCol || {connectionAbnormalClickTimes: -1};
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionMonitor, [data.platformIds ,data.deviceNickNames, data.adminIds, index, limit, sortCol], actionName, isValidData);
        },

        getWCGroupControlSessionHistory: function getWCGroupControlSessionHistory(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.deviceNickName && data.deviceId && data.startDate && data.endDate);
            let index = data.index || 0;
            let limit = data.limit || 1000;
            let sortCol = data.sortCol || {createTime: -1};
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionHistory, [data.platformObjId, data.deviceNickName, data.deviceId, data.adminIds, data.startDate, data.endDate, index, limit, sortCol], actionName, isValidData);
        }
    };
    socketActionWCGroupControl.actions = this.actions;
}

module.exports = socketActionWCGroupControl;
