let dbFrontEndSetting = require('./../db_modules/dbFrontEndSetting');
let socketUtil = require('./../modules/socketutility');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

function socketActionFrontEndSetting(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        saveSkinSetting: function saveSkinSetting (data){
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.device && data.name);

            socketUtil.emitter(self.socket, dbFrontEndSetting.saveSkinSetting, [data], actionName, isValidData);
        },

        getSkinSetting: function getSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.getSkinSetting, [data.platformObjId], actionName, isValidData);
        },

        removeSkinSetting: function removeSkinSetting (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.skinSettingObjId);

            socketUtil.emitter(self.socket, dbFrontEndSetting.removeSkinSetting, [data.skinSettingObjId], actionName, isValidData);
        },
    };
    socketActionFrontEndSetting.actions = this.actions;
}

module.exports = socketActionFrontEndSetting;
