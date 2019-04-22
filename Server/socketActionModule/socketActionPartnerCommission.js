var socketUtil = require('./../modules/socketutility');
const dbPartnerCommission = require('./../db_modules/dbPartnerCommission')

function socketActionPartnerCommission(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    let adminInfo = {};

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
        getPlatformPartnerCommConfig: function getPlatformPartnerCommConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPartnerCommission.getPlatformPartnerCommConfig, [data.platformObjId], actionName, isValidData);
        },

        updatePlatformPartnerCommConfig: function updatePlatformPartnerCommConfig (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbPartnerCommission.updatePlatformPartnerCommConfig, [data.platformObjId, data.commissionType, data.providerObjId, data.commissionSetting], actionName, isValidData);
        },

    };

    socketActionPartnerCommission.actions = this.actions;
}

module.exports = socketActionPartnerCommission;
