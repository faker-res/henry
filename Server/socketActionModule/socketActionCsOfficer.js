let socketUtil = require('./../modules/socketutility');
let dbCsOfficer = require('./../db_modules/dbCsOfficer');

function socketActionCsOfficer(socketIO, socket) {
    this.socketIO = socketIO;
    this.socket = socket;

    let self = this;
    this.actions = {
        // example format, to-be-deleted
        // testNewSocketAction: function testNewSocketAction(data) {
        //     var actionName = arguments.callee.name;
        //     var isValidData = Boolean(true);
        //     socketUtil.emitter(self.socket, dbCsOfficer.testNewApi, [], actionName, isValidData);
        // },
    };

    socketActionCsOfficer.actions = this.actions;
}

module.exports = socketActionCsOfficer;