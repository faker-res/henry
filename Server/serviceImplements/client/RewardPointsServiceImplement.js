WebSocketUtil = require("./../../server_common/WebSocketUtil");
var RewardPointsService = require("./../../services/client/ClientServices").RewardPointsService;
var dbRewardEvent = require('./../../db_modules/dbRewardEvent');
var dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
var constSystemParam = require('./../../const/constSystemParam');
var dbRewardTask = require('./../../db_modules/dbRewardTask');
var dbPlayerConsumptionWeekSummary = require('./../../db_modules/dbPlayerConsumptionWeekSummary');
var Q = require('q');
var constPlayerSMSSetting = require('../../const/constPlayerSMSSetting');
var SMSSender = require('../../modules/SMSSender');
var constServerCode = require('./../../const/constServerCode');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbPlayerReward = require('./../../db_modules/dbPlayerReward');

let RewardPointsServiceImplement = function () {
    RewardPointsService.call(this);
    var self = this;

    //todo
    this.getLoginRewardPoints.expectsData = '';
    this.getLoginRewardPoints.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.platformId);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPlayerInfo.getRewardEventForPlatform, [data.platformId], isValidData, false, false, true);
    };




};


var proto = RewardPointsServiceImplement.prototype = Object.create(RewardPointsService.prototype);
proto.constructor = RewardPointsServiceImplement;

module.exports = RewardPointsServiceImplement;
