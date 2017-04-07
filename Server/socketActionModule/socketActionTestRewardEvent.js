var socketUtil = require('./../modules/socketutility');
var testFirstTopUpRewardEvent = require('./../testEvent/testFirstTopUpRewardEvent');
var testGameProviderRewardEvent = require('./../testEvent/testGameProviderRewardEvent');
var testFullAttendanceEvent = require('./../testEvent/testFullAttendanceEvent');

function socketActionRewardEvent(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        testGameProviderReward: function testGameProviderReward(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            var testEvent = new testGameProviderRewardEvent(data);
            socketUtil.emitter(self.socket, testEvent.runTestData.bind(testEvent), [data], actionName, isValidData);

        },

        testFirstTopUpReward: function testFirstTopUpReward(data) {
            var isValidData = Boolean(data);
            var actionName = arguments.callee.name;
            var testEvent = new testFirstTopUpRewardEvent(data);
            socketUtil.emitter(self.socket, testEvent.runTestData.bind(testEvent), [data], actionName, isValidData);
        },

        testFullAttendanceReward: function testFullAttendanceReward(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data);
            var testEvent = new testFullAttendanceEvent(data);
            socketUtil.emitter(self.socket, testEvent.runTestData.bind(testEvent), [data], actionName, isValidData);
        },

        getTestFullAttendanceReward: function getTestFullAttendanceReward() {
            var actionName = arguments.callee.name;
            var testEvent = new testFullAttendanceEvent({});
            self.socket.emit("_" + actionName, {success: true, data: testEvent});

        }
    };

};

module.exports = socketActionRewardEvent;
