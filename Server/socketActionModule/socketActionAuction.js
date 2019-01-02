/**
 * Created by mark on 21/12/18.
 */
var encrypt = require('./../modules/encrypt');
var dbAuction = require('./../db_modules/dbAuction');
var dbPlatform = require('./../db_modules/dbPlatform');
var constDepositMethod = require('../const/constDepositMethod');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
let socketUtil = require('./../modules/socketutility');

function socketActionAuction(socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;

    function getAdminId() {
        return self.socket.decoded_token && self.socket.decoded_token._id;
    }

    function getAdminName() {
        return self.socket.decoded_token && self.socket.decoded_token.adminName;
    }

    this.actions = {

        /**
         * list all auctions items
         * @param {json} data - Auctions data. It has to contain correct data format
         */
        listAuctionItems: function listAuctionItems(data) {
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbAuction.listAuctionItems, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        loadAuctionItem: function loadAuctionItem(data) {
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbAuction.loadAuctionItem, [data._id, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        moveToNotAvailableItem: function moveToNotAvailableItem(data) {
            var actionName = arguments.callee.name;
            var isValidData = true;
            data.direction = 'notAvailableItem';
            socketUtil.emitter(self.socket, dbAuction.moveTo, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        moveToExclusiveItem: function moveToExclusiveItem(data){
            var actionName = arguments.callee.name;
            var isValidData = true;
            data.direction = 'exclusiveItem';
            socketUtil.emitter(self.socket, dbAuction.moveTo, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        removeExclusiveAuction: function removeExclusiveAuction(data){
            var actionName = arguments.callee.name;
            var isValidData = true;
            data.direction = 'removeExclusiveAuction';
            socketUtil.emitter(self.socket, dbAuction.moveTo, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        removeNotAvailableAuction: function removeNotAvailableAuction(data){
            var actionName = arguments.callee.name;
            var isValidData = true;
            data.direction = 'removeNotAvailableAuction';
            socketUtil.emitter(self.socket, dbAuction.moveTo, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },
        isQualify: function isQualify(data){
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbAuction.isQualify, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        },

        createAuctionProduct: function createAuctionProduct(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data.platformObjId);
            socketUtil.emitter(self.socket, dbAuction.createAuctionProduct, [data], actionName, isValidData);
        },
        updateAuctionProduct: function updateAuctionProduct(data) {
            let actionName = arguments.callee.name;
            let isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbAuction.updateAuctionProduct, [data._id, data.updateData], actionName, isValidData);
        },
        listAuctionMonitor: function listAuctionMonitor(data) {
            let actionName = arguments.callee.name;
            let isValidData = true;
            socketUtil.emitter(self.socket, dbAuction.listAuctionMonitor, [data._id, data.updateData], actionName, isValidData);
        },
    };
    socketActionAuction.actions = this.actions;
}

module.exports = socketActionAuction;
