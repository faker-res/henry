/**
 * Created by hninpwinttin on 14/1/16.
 */

var dbDXMission = require('./../db_modules/dbDXMission');
var socketUtil = require('./../modules/socketutility');


function socketActionDXMission(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    this.actions = {

        /**
         * get telemarketing overview
         * @param {json} data - Player data. It has to contain correct data format
         */
        getTeleMarketingOverview: function getTeleMarketingOverview(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.query);
            socketUtil.emitter(self.socket, dbDXMission.getTeleMarketingOverview, [data.platform, data.query, data.index, data.limit, data.sortCol], actionName, isValidData);
        },

    };

    socketActionDXMission.actions = this.actions;
}

module.exports = socketActionDXMission;
