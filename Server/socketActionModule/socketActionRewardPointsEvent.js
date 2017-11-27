var socketUtil = require('./../modules/socketutility');
var dbRewardPointsEvent = require("./../db_modules/dbRewardPointsEvent");
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;

function socketActionRewardPointsEvent(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {

        createRewardPointsEvent: function createRewardPointsEvent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.rewardPointsEvent);
            console.log(data);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.createRewardPointsEvent, [data.rewardPointsEvent], actionName, isValidData);
        },

        updateRewardPointsEvent: function updateRewardPointsEvent(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.rewardPointsEvent);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.updateRewardPointsEvent, [data.rewardPointsEvent], actionName, isValidData);
        },

        getRewardPointsEvent: function getRewardPointsEvent (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.getRewardPointsEvent, [ObjectId(data.platformObjId)], actionName, isValidData);
        },

        getRewardPointsEventById: function getRewardPointsEventById (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.getRewardPointsEventById, [ObjectId(data._id)], actionName, isValidData);
        },

        getRewardPointsEventByCategory: function getRewardPointsEventByCategory (data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.category);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.getRewardPointsEventByCategory, [data.category], actionName, isValidData);
        },

        deleteRewardPointsEventById: function deleteRewardPointsEventById(data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbRewardPointsEvent.removeRewardPointsEventById, [data._id], actionName, isValidData);
        },

    };

    socketActionRewardPointsEvent.actions = this.actions;
};

module.exports = socketActionRewardPointsEvent;
