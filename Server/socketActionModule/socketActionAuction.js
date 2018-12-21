/**
 * Created by mark on 21/12/18.
 */
var encrypt = require('./../modules/encrypt');
var dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
var dbAuction = require('./../db_modules/dbAuction');
var dbPlatform = require('./../db_modules/dbPlatform');
let dbPlayerRewardPoints = require('../db_modules/dbPlayerRewardPoints');
let dbApiLog = require('./../db_modules/dbApiLog');
var socketUtil = require('./../modules/socketutility');
var utility = require('./../modules/encrypt');
var constPlayerStatus = require('./../const/constPlayerStatus');
var constPlayerPermission = require('./../const/constPlayerPermissions');
var constPlayerRegistrationInterface = require('./../const/constPlayerRegistrationInterface');
var constSystemParam = require('../const/constSystemParam');
var constDepositMethod = require('../const/constDepositMethod');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var dbUtil = require('./../modules/dbutility');
var smsAPI = require('../externalAPI/smsAPI');


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
            console.log('hi')
            var actionName = arguments.callee.name;
            var isValidData = true;
            socketUtil.emitter(self.socket, dbAuction.listAuctionItems, [data, true, getAdminName(), getAdminId()], actionName, isValidData);
        }
    };
    socketActionAuction.actions = this.actions;
}

module.exports = socketActionAuction;
