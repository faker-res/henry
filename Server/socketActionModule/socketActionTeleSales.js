const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const dbPlayerReward = require('./../db_modules/dbPlayerReward');
const dbPromoCode = require('./../db_modules/dbPromoCode');
const dbTeleSales = require('./../db_modules/dbTeleSales');

const socketUtil = require('./../modules/socketutility');

function socketActionTeleSales(socketIO, socket) {

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
        getAllTSPhoneList: function getAllTSPhoneList(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbTeleSales.getAllTSPhoneList, [data.platformObjId], actionName, isValidData);
        },

        getOneTsNewList: function getOneTsNewList (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && ((data.platform && data.name) || data._id));
            socketUtil.emitter(self.socket, dbTeleSales.getOneTsNewList, [data], actionName, isValidData);
        },

        distributePhoneNumber: function distributePhoneNumber (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platform && data.tsListObjId);
            socketUtil.emitter(self.socket, dbTeleSales.distributePhoneNumber, [data], actionName, isValidData);
        },

        getTsPhoneImportRecord: function getTsPhoneImportRecord (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && ((data.platform && data.tsPhoneList) || data._id));
            socketUtil.emitter(self.socket, dbTeleSales.getTsPhoneImportRecord, [data], actionName, isValidData);
        },

        updateTsPhoneList: function updateTsPhoneList (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbTeleSales.updateTsPhoneList, [data.query, data.updateData], actionName, isValidData);
        },

    };
    socketActionTeleSales.actions = this.actions;
}

module.exports = socketActionTeleSales;
