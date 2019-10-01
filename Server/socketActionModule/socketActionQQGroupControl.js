const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbQQGroupControl = require('./../db_modules/dbQQGroupControl');

const socketUtil = require('./../modules/socketutility');

function socketActionQQGroupControl(socketIO, socket) {

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
        };
    }

    this.actions = {
        updateQQGroupControlSetting: function updateQQGroupControlSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId && data.qqGroupControlSetting && adminInfo && adminInfo.id);
            socketUtil.emitter(self.socket, dbQQGroupControl.updateQQGroupControlSetting, [data.platformObjId, data.qqGroupControlSetting, data.deleteQQGroupControlSetting, adminInfo], actionName, isValidData);
        },

        getQQGroupControlSetting: function getQQGroupControlSetting(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbQQGroupControl.getQQGroupControlSetting, [data.platformObjId], actionName, isValidData);
        },

        isNewQQDeviceDataExist: function isNewQQDeviceDataExist(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.deviceId && data.deviceNickName);
            socketUtil.emitter(self.socket, dbQQGroupControl.isNewQQDeviceDataExist, [data.deviceId, data.deviceNickName], actionName, isValidData);
        },

        // getWechatSessionDeviceNickName: function getWechatSessionDeviceNickName(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjIds && data.platformObjIds.length);
        //     socketUtil.emitter(self.socket, dbWCGroupControl.getWechatSessionDeviceNickName, [data.platformObjIds], actionName, isValidData);
        // },
        //
        // getWechatSessionCsOfficer: function getWechatSessionCsOfficer(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjIds && data.platformObjIds.length && data.deviceNickNames && data.deviceNickNames.length);
        //     socketUtil.emitter(self.socket, dbWCGroupControl.getWechatSessionCsOfficer, [data.platformObjIds, data.deviceNickNames], actionName, isValidData);
        // },
        //
        // getWechatControlSession: function getWechatControlSession(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.admin && data.startTime && data.endTime);
        //     socketUtil.emitter(self.socket, dbWCGroupControl.getWechatControlSession, [data, data.index, data.limit, data.sortCol], actionName, isValidData);
        // },
        // getWCGroupControlSessionMonitor: function getWCGroupControlSessionMonitor(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data);
        //     let index = data.index || 0;
        //     let limit = data.limit || 1000;
        //     let sortCol = data.sortCol || {connectionAbnormalClickTimes: -1};
        //     socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionMonitor, [data.platformIds ,data.deviceNickNames, data.adminIds, index, limit, sortCol], actionName, isValidData);
        // },
        //
        // getWCGroupControlSessionHistory: function getWCGroupControlSessionHistory(data) {
        //     let actionName = arguments.callee.name;
        //     let isValidData = Boolean(data && data.platformObjId && data.deviceNickName && data.deviceId && data.startDate && data.endDate);
        //     let index = data.index || 0;
        //     let limit = data.limit || 1000;
        //     let sortCol = data.sortCol || {createTime: -1};
        //     socketUtil.emitter(self.socket, dbWCGroupControl.getWCGroupControlSessionHistory, [data.platformObjId, data.deviceNickName, data.deviceId, data.adminIds, data.startDate, data.endDate, index, limit, sortCol], actionName, isValidData);
        // }
    };
    socketActionQQGroupControl.actions = this.actions;
}

module.exports = socketActionQQGroupControl;
