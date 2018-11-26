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

        getWCDeviceByPlatformId: function getWCDeviceByPlatformId(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbWCGroupControl.getWCDeviceByPlatformId, [data.platformObjId], actionName, isValidData);
        }
    };
    socketActionWCGroupControl.actions = this.actions;
}

module.exports = socketActionWCGroupControl;
