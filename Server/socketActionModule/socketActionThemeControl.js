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
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.themeStyle && data.content && data.type);
            console.log("checking", isDataValid)
            socketUtil.emitter(self.socket, dbThemeControl.saveThemeSetting, [data], actionName, isDataValid);
        },

        getAllThemeSetting: function getAllThemeSetting() {
            let actionName = arguments.callee.name;
            let isDataValid = true;
            socketUtil.emitter(self.socket, dbThemeControl.getAllThemeSetting, [], actionName, isDataValid);
        },

        updateThemeSetting: function updateThemeSetting(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data.updateData);
            socketUtil.emitter(self.socket, dbThemeControl.updateThemeSetting, [data], actionName, isDataValid);
        },

        deleteThemeSetting: function deleteThemeSetting(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbThemeControl.deleteThemeSetting, [data], actionName, isDataValid);
        },

        checkThemeSettingFromPlatform: function checkThemeSettingFromPlatform(data) {
            let actionName = arguments.callee.name;
            let isDataValid = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbThemeControl.checkThemeSettingFromPlatform, [data], actionName, isDataValid);
        },


    };

    socketActionThemeControl.actions = this.actions;
};

module.exports = socketActionThemeControl;