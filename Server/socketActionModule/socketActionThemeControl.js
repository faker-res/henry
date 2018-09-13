var socketUtil = require('./../modules/socketutility');
const dbThemeControl = require('./../db_modules/dbThemeControl');

function socketActionThemeControl(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }
    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    var self = this;
    this.actions = {

        saveThemeSetting: function saveThemeSetting(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.platform && data.themeStyle && data.content && data.type);
            console.log("checking", isDataValid)
            socketUtil.emitter(self.socket, dbThemeControl.saveThemeSetting, [data], actionName, isDataValid);
        },

        getAllThemeSetting: function getAllThemeSetting(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbThemeControl.getAllThemeSetting, [data], actionName, isDataValid);
        },

        updateThemeSetting: function updateThemeSetting(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data);
            socketUtil.emitter(self.socket, dbThemeControl.updateThemeSetting, [data], actionName, isDataValid);
        },

        deleteThemeSetting: function deleteThemeSetting(data) {
            var actionName = arguments.callee.name;
            var isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbThemeControl.deleteThemeSetting, [data], actionName, isDataValid);
        },


    };

    socketActionThemeControl.actions = this.actions;
};

module.exports = socketActionThemeControl;