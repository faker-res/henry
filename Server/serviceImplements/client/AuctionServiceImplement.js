var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var AuctionService = require("./../../services/client/ClientServices").AuctionService;
var dbAuction = require('./../../db_modules/dbAuction');
var constSystemParam = require('../../const/constSystemParam');

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

    this.isQualify.expectsData = 'playerId: String';
    this.isQualify.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(conn.playerObjId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbAuction.isQualify, [conn.playerObjId], isValidData);
    };

    // isQualify
};

var proto = AuctionServiceImplement.prototype = Object.create(AuctionService.prototype);
proto.constructor = AuctionServiceImplement;

module.exports = AuctionServiceImplement;
