var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var AuctionService = require("./../../services/client/ClientServices").AuctionService;
var dbAuction = require('./../../db_modules/dbAuction');
var constSystemParam = require('../../const/constSystemParam');
const dbUtility = require('./../../modules/dbutility');

var AuctionServiceImplement = function(){
    AuctionService.call(this);

    this.listAuctionItems.expectsData = 'playerId: String';
    this.listAuctionItems.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbAuction.listAuctionItems, [data], isValidData
        );
    };

    this.applyAuction.expectsData = 'playerId: String';
    this.applyAuction.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerId);
        WebSocketUtil.performAction(
            conn, wsFunc, data, dbAuction.applyAuction, [data], isValidData
        );
    };

    this.getAuctions.expectsData = 'playerId: String';
    this.getAuctions.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbAuction.getAuctions, [conn.playerObjId, conn.platformId], isValidData);
    };

    this.bidAuctionItem.expectsData = 'platformId: String, productName: String, bidAmount: String, rewardType: String';
    this.bidAuctionItem.onRequest = function(wsFunc, conn, data){
        let isValidData = Boolean(data && data.productName && data.rewardType);
        let inputDevice = dbUtility.getInputDevice(conn.upgradeReq.headers['user-agent']);
        WebSocketUtil.performAction(conn, wsFunc, data, dbAuction.bidAuctionItem, [data, data.platformId, data.productName, data.rewardType, conn.playerObjId, inputDevice], isValidData);
    };

    // isQualify
};

var proto = AuctionServiceImplement.prototype = Object.create(AuctionService.prototype);
proto.constructor = AuctionServiceImplement;

module.exports = AuctionServiceImplement;
