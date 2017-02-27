/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var TopUpIntentionService = require("./../../services/client/ClientServices").TopUpIntentionService;
var dbPlayerTopUpIntentRecord = require('./../../db_modules/dbPlayerTopUpIntentRecord');
var constServerCode = require('./../../const/constServerCode');
var constMessageClientTypes = require('./../../const/constMessageClientTypes');

var TopUpIntentionServiceImplement = function(){
    TopUpIntentionService.call(this);
    var self = this;

    //add api handler
    this.add.expectsData = 'playerId: String, topUpAmount: Number|String, topupChannel: ?, platformId: String';
    this.add.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(data && data.playerId && data.topUpAmount && data.hasOwnProperty("topupChannel") && (data.playerId == conn.playerId) && data.hasOwnProperty("platformId")); // TODO add the mandatory fields later
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPlayerTopUpIntentRecord.createPlayerTopUpIntentRecordWithID, [data], isValidData, true, false, true)
            .then(
                function(res){
                    wsFunc.response(conn, {status: constServerCode.SUCCESS, data: res}, data);
                    self.sendMessage(constMessageClientTypes.MANAGEMENT, "management", "notifyTopUpIntentionUpdate", res);
                }
            )
            .catch(WebSocketUtil.errorHandler).done();
    };

    //update api handler
    this.update.expectsData = '_id: ObjectId';
    this.update.onRequest = function(wsFunc, conn, data){
        var isValidData = Boolean(data && data._id);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerTopUpIntentRecord.updatePlayerTopUpIntentRecord, [{_id: data._id}, data], isValidData, false, false, true);
    };

};

var proto = TopUpIntentionServiceImplement.prototype = Object.create(TopUpIntentionService.prototype);
proto.constructor = TopUpIntentionServiceImplement;

module.exports = TopUpIntentionServiceImplement;