var dbPlayerTopUpRecordFunc = function () {
};
module.exports = new dbPlayerTopUpRecordFunc();

const pmsAPI = require("../externalAPI/pmsAPI.js");
const externalRESTAPI = require("../externalAPI/externalRESTAPI");
const SettlementBalancer = require('../settlementModule/settlementBalancer');

const Q = require('q');
const dbconfig = require('./../modules/dbproperties');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const dbProposal = require('./../db_modules/dbProposal');

const constAccountType = require('./../const/constAccountType');
const constProposalStatus = require('./../const/constProposalStatus');
const constSystemParam = require('./../const/constSystemParam');
const constProposalType = require('./../const/constProposalType');
const constPlayerTopUpType = require('./../const/constPlayerTopUpType');
const constProposalMainType = require('../const/constProposalMainType');
const constTopUpMethod = require('../const/constTopUpMethod');

const counterManager = require("../modules/counterManager.js");
const constManualTopupOperationType = require("../const/constManualTopupOperationType");
const constServerCode = require("../const/constServerCode");
const dbUtility = require("../modules/dbutility");
const constProposalEntryType = require("../const/constProposalEntryType");
const constProposalUserType = require('../const/constProposalUserType');
const dbPropUtil = require("../db_common/dbProposalUtility");
const constShardKeys = require('../const/constShardKeys');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment-timezone');
const serverInstance = require("../modules/serverInstance");
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");
const dbPromoCode = require("../db_modules/dbPromoCode");
const constRewardType = require("./../const/constRewardType");
const dbRewardTask = require('./../db_modules/dbRewardTask');
const dbPlayerReward = require('../db_modules/dbPlayerReward');
const dbReportUtil = require("./../db_common/dbReportUtility");
const dbRewardUtil = require("./../db_common/dbRewardUtility");
const constRewardTaskStatus = require('../const/constRewardTaskStatus');
const rewardUtility = require("../modules/rewardUtility");
const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
const errorUtils = require("../modules/errorUtils.js");
const localization = require("../modules/localization");
const proposalExecutor = require('./../modules/proposalExecutor');

const RESTUtils = require('./../modules/RESTUtils');
const rsaCrypto = require('./../modules/rsaCrypto');
const extConfig = require('./../config/externalPayment/paymentSystems');

const dbPlayerUtil = require("../db_common/dbPlayerUtility");
const promiseUtils = require("../modules/promiseUtils");

var dbUtil = require("../modules/dbutility");

var dbPlayerTopUpRecord = {
    /**
     * Get top up record in a certain period of time
     * @param {Json} data
     */
    createPlayerTopUpRecord: function (data) {
        var newRecord = new dbconfig.collection_playerTopUpRecord(data);
        return newRecord.save();
    },

    /**
     * Get top up record in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getRecordForTimeFrame: function (startTime, endTime) {
        return dbconfig.collection_playerTopUpRecord.find(
            {
                createTime: {
                    $gte: startTime,
                    $lt: endTime
                }
            }
        ).exec();
    },

    /**
     * Get total top up amount of a platform in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    getPlayersTotalTopUpForTimeFrame: function (startTime, endTime, platformId, playerIds) {
        return dbconfig.collection_playerTopUpRecord.aggregate(
            [
                {
                    $match: {
                        platformId: platformId,
                        createTime: {
                            $gte: startTime,
                            $lt: endTime
                        },
                        playerId: {$in: playerIds}
                    }
                },
                {
                    $group: {
                        _id: {playerId: "$playerId", platformId: "$platformId"},
                        amount: {$sum: "$amount"},
                        times: {$sum: 1}
                    }
                }
            ]
        ).allowDiskUse(true).exec();
    },

    getPlayerReportDataForTimeFrame: function (startTime, endTime, platformId, playerIds = []) {
        let consumptionReturnTypeId;
        let onlineTopUpTypeId;
        let playerReportSummary;
        let merchantList;
        let consumptionDetailArr = [];

        return dbconfig.collection_platform.findOne({_id: platformId}).lean().then(
            platformData => {
                if (platformData && platformData.platformId) {
                    return RESTUtils.getPMS2Services("postMerchantList", {platformId: platformData.platformId}, platformData.topUpSystemType).then(
                        data => {
                            console.log('getConsumptionDetailOfPlayers - 2');
                            return data.merchants || [];
                        }
                    )
                }
            }
        ).then(
            merchantData => {
                merchantList = merchantData;

                return dbconfig.collection_proposalType.find({platformId: platformId, name: {$in: [constProposalType.PLAYER_CONSUMPTION_RETURN, constProposalType.PLAYER_TOP_UP]}}, {_id: 1, name: 1}).lean();
            }
        ).then(
            proposalTypeData => {
                if(proposalTypeData && proposalTypeData.length > 0){
                    proposalTypeData.forEach(
                        proposalType => {
                            if(proposalType && proposalType.name == constProposalType.PLAYER_CONSUMPTION_RETURN){
                                consumptionReturnTypeId = proposalType._id;
                            }else if(proposalType && proposalType.name == constProposalType.PLAYER_TOP_UP){
                                onlineTopUpTypeId = proposalType._id;
                            }
                        }
                    )
                }

                let stringPlayerId = [];

                playerIds.forEach( id => {
                    stringPlayerId.push(String(id));
                });

                //concat both string type playerObjId and Object type playerObjId for searching in reward proposal
                playerIds = playerIds.concat(stringPlayerId);
                console.log("LH check player report 1------", startTime);
                console.log("LH check player report 2------", endTime);

                async function catchQueryRetry (model, playerIds, getAggregateInput, err) {
                    await promiseUtils.delay(30000); // delay 30 sec to try to wait out the busy moment just in case too many db request are sent in a short time
                    let playerIdsGroupA = playerIds.slice(0, playerIds.length/2);
                    let playerIdsGroupB = playerIds.slice(playerIds.length/2, playerIds.length);

                    let topUpDetailsA = await model.aggregate(getAggregateInput(playerIdsGroupA)).read("secondaryPreferred").allowDiskUse(true);
                    let topUpDetailsB = await model.aggregate(getAggregateInput(playerIdsGroupB)).read("secondaryPreferred").allowDiskUse(true);
                    if (!topUpDetailsA || !topUpDetailsB) {
                        return Promise.reject(err);
                    }

                    return topUpDetailsA.concat(topUpDetailsB);
                }

                let topUpProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                $match: {
                                    platformId: platformId,
                                    createTime: {
                                        $gte: startTime,
                                        $lt: endTime
                                    },
                                    playerId: {$in: playerIds}
                                }
                            },
                            {
                                $group: {
                                    _id: {playerId: "$playerId", platformId: "$platformId", topUpType: "$topUpType", loginDevice: "$loginDevice"},
                                    amount: {$sum: "$amount"},
                                    oriAmount: {$sum: "$oriAmount"},
                                    times: {$sum: 1},
                                }
                            }
                        ];
                    }

                    return dbconfig.collection_playerTopUpRecord.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            // mongoose query promise does not support .catch() (?)
                            // source: https://stackoverflow.com/a/30672821
                            return catchQueryRetry(dbconfig.collection_playerTopUpRecord, playerIds, getAggregateInput, err);
                        }
                    );
                };

                let consumptionProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                $match: {
                                    platformId: platformId,
                                    createTime: {
                                        $gte: new Date(startTime),
                                        $lt: new Date(endTime)
                                    },
                                    playerId: {$in: playerIds},
                                    isDuplicate: {$ne: true}
                                }
                            },
                            {
                                $group: {
                                    _id: {
                                        playerId: "$playerId",
                                        gameId: "$gameId",
                                        platformId: "$platformId",
                                        loginDevice: "$loginDevice"
                                    },
                                    gameId: {"$first": "$gameId"},
                                    providerId: {"$first": "$providerId"},
                                    count: {$sum: {$cond: ["$count", "$count", 1]}},
                                    amount: {$sum: "$amount"},
                                    validAmount: {$sum: "$validAmount"},
                                    bonusAmount: {$sum: "$bonusAmount"}
                                }
                            }
                        ]
                    }

                    return dbconfig.collection_playerConsumptionRecord.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            return catchQueryRetry(dbconfig.collection_playerConsumptionRecord, playerIds, getAggregateInput, err);
                        }
                    )
                }

                let bonusProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                "$match": {
                                    "data.playerObjId": {$in: playerIds},
                                    "createTime": {
                                        "$gte": new Date(startTime),
                                        "$lt": new Date(endTime)
                                    },
                                    "mainType": "PlayerBonus",
                                    "status": constProposalStatus.SUCCESS
                                }
                            },
                            {
                                "$group": {
                                    "_id": {playerId: "$data.playerObjId", platformId: "$data.platformId", loginDevice: "$device"},
                                    "count": {"$sum": 1},
                                    "amount": {"$sum": "$data.amount"}
                                }
                            }
                        ]
                    };

                    return dbconfig.collection_proposal.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            return catchQueryRetry(dbconfig.collection_proposal, playerIds, getAggregateInput, err);
                        }
                    );
                };

                let consumptionReturnProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                "$match": {
                                    "data.playerObjId": {$in: playerIds},
                                    "createTime": {
                                        "$gte": new Date(startTime),
                                        "$lt": new Date(endTime)
                                    },
                                    "type": ObjectId(consumptionReturnTypeId),
                                    "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                }
                            },
                            {
                                "$group": {
                                    "_id": {playerId : "$data.playerObjId", platformId: "$data.platformId", loginDevice: "$device"},
                                    "amount": {"$sum": "$data.rewardAmount"}
                                }
                            }
                        ]
                    }

                    return dbconfig.collection_proposal.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            return catchQueryRetry(dbconfig.collection_proposal, playerIds, getAggregateInput, err);
                        }
                    );
                }

                let rewardProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                "$match": {
                                    "data.playerObjId": {$in: playerIds},
                                    "createTime": {
                                        "$gte": new Date(startTime),
                                        "$lt": new Date(endTime)
                                    },
                                    "mainType": "Reward",
                                    "type": {"$ne": ObjectId(consumptionReturnTypeId)},
                                    "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                }
                            },
                            {
                                "$group": {
                                    "_id": {playerId : "$data.playerObjId", platformId: "$data.platformId", loginDevice: "$device"},

                                    "amount": {"$sum": "$data.rewardAmount"}
                                }
                            }
                        ];
                    }

                    return dbconfig.collection_proposal.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            return catchQueryRetry(dbconfig.collection_proposal, playerIds, getAggregateInput, err);
                        }
                    );
                }

                let onlineTopUpByMerchantProm = () => {
                    let getAggregateInput = (playerIds) => {
                        return [
                            {
                                "$match": {
                                    "type": ObjectId(onlineTopUpTypeId),
                                    "data.playerObjId": {$in: playerIds},
                                    "createTime": {
                                        "$gte": new Date(startTime),
                                        "$lt": new Date(endTime)
                                    },
                                    "mainType": "TopUp",
                                    "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                }
                            },
                            {
                                "$group": {
                                    "_id": {
                                        "playerId": "$data.playerObjId",
                                        "platformId": "$data.platformId",
                                        "merchantName": "$data.merchantName",
                                        "merchantNo": "$data.merchantNo",
                                        "loginDevice": "$device"
                                    },
                                    "amount": {"$sum": "$data.amount"}
                                }
                            },
                            {
                                "$project": {
                                    _id: 0,
                                    playerId: "$_id.playerId",
                                    platformId: "$_id.platformId",
                                    merchantName: "$_id.merchantName",
                                    merchantNo: "$_id.merchantNo",
                                    loginDevice: "$_id.loginDevice",
                                    amount: 1
                                }
                            }
                        ];
                    }

                    return dbconfig.collection_proposal.aggregate(getAggregateInput(playerIds)).read("secondaryPreferred").allowDiskUse(true).then(
                        data => data,
                        err => {
                            return catchQueryRetry(dbconfig.collection_proposal, playerIds, getAggregateInput, err);
                        }
                    );
                }

                return Promise.all([topUpProm(), consumptionProm(), bonusProm(), consumptionReturnProm(), rewardProm(), onlineTopUpByMerchantProm()]).then(
                    result => {
                        console.log("LH check player report 3------");
                        let topUpDetails = result[0];
                        let consumptionDetails = result[1];
                        let bonusDetails = result[2];
                        let consumptionReturnDetails = result[3];
                        let rewardDetails = result[4];
                        let onlineTopUpByMerchantDetails = result[5];
                        let playerReportDaySummary = [];

                        if(topUpDetails && topUpDetails.length > 0){
                            console.log("LH check player report 4------", topUpDetails.length);
                            topUpDetails.forEach(
                                topUp => {
                                    if(topUp && topUp._id && topUp._id.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && topUp._id && topUp._id.playerId && p.playerId.toString() == topUp._id.playerId.toString() && p.loginDevice == topUp._id.loginDevice);

                                        if(indexNo == -1){
                                            let topUpObj = {
                                                playerId: topUp._id.playerId,
                                                platformId: topUp._id.platformId,
                                                topUpTimes: topUp.times,
                                                loginDevice: topUp._id.loginDevice || null
                                            }

                                            if(topUp._id.topUpType == constPlayerTopUpType.MANUAL){
                                                topUpObj.manualTopUpAmount = topUp.amount;
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.ONLINE){
                                                topUpObj.onlineTopUpAmount = topUp.oriAmount || topUp.amount;
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.ALIPAY){
                                                topUpObj.alipayTopUpAmount = topUp.amount;
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.WECHAT){
                                                topUpObj.wechatpayTopUpAmount = topUp.amount;
                                            }

                                            playerReportDaySummary.push(topUpObj);
                                        }else{
                                            playerReportDaySummary[indexNo].topUpTimes += topUp.times;

                                            if(topUp._id.topUpType == constPlayerTopUpType.MANUAL){
                                                playerReportDaySummary[indexNo].manualTopUpAmount = topUp.amount + (playerReportDaySummary[indexNo].manualTopUpAmount || 0);
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.ONLINE){
                                                playerReportDaySummary[indexNo].onlineTopUpAmount = (topUp.oriAmount || topUp.amount) + (playerReportDaySummary[indexNo].onlineTopUpAmount || 0);
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.ALIPAY){
                                                playerReportDaySummary[indexNo].alipayTopUpAmount = topUp.amount + (playerReportDaySummary[indexNo].alipayTopUpAmount || 0);
                                            }else if(topUp._id.topUpType == constPlayerTopUpType.WECHAT){
                                                playerReportDaySummary[indexNo].wechatpayTopUpAmount = topUp.amount + (playerReportDaySummary[indexNo].wechatpayTopUpAmount || 0);
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        if(consumptionDetails && consumptionDetails.length > 0){
                            console.log("LH check player report 5------", consumptionDetails.length);
                            consumptionDetails.forEach(
                                consumption => {
                                    console.log("debug #C8AD00 grouped consumption", consumption)
                                    if(consumption && consumption._id && consumption._id.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && consumption._id && consumption._id.playerId && p.playerId.toString() == consumption._id.playerId.toString() && p.loginDevice == consumption._id.loginDevice);
                                        let providerDetail = {};
                                        let providerId = consumption.providerId.toString();
                                        consumption.bonusRatio = (consumption.bonusAmount / consumption.validAmount);

                                        if (!providerDetail.hasOwnProperty(providerId)) {
                                            providerDetail[providerId] = {
                                                count: 0,
                                                amount: 0,
                                                validAmount: 0,
                                                bonusAmount: 0
                                            };
                                        }

                                        providerDetail[providerId].count += consumption.count;
                                        providerDetail[providerId].amount += consumption.amount;
                                        providerDetail[providerId].validAmount += consumption.validAmount;
                                        providerDetail[providerId].bonusAmount += consumption.bonusAmount;
                                        providerDetail[providerId].bonusRatio = (providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount);

                                        if(indexNo == -1){
                                            playerReportDaySummary.push({
                                                playerId: consumption._id.playerId,
                                                platformId: consumption._id.platformId,
                                                consumptionTimes: consumption.count,
                                                consumptionAmount: consumption.amount,
                                                consumptionValidAmount: consumption.validAmount,
                                                consumptionBonusAmount: consumption.bonusAmount,
                                                providerDetail: providerDetail,
                                                gameDetail: [consumption],
                                                loginDevice: consumption._id.loginDevice || null,
                                            });
                                        }else{
                                            if(typeof playerReportDaySummary[indexNo].consumptionTimes != "undefined"){
                                                playerReportDaySummary[indexNo].consumptionTimes += consumption.count;
                                            }else{
                                                playerReportDaySummary[indexNo].consumptionTimes = consumption.count;
                                            }

                                            if(typeof playerReportDaySummary[indexNo].consumptionAmount != "undefined"){
                                                playerReportDaySummary[indexNo].consumptionAmount += consumption.amount;
                                            }else{
                                                playerReportDaySummary[indexNo].consumptionAmount = consumption.amount;
                                            }

                                            if(typeof playerReportDaySummary[indexNo].consumptionValidAmount != "undefined"){
                                                playerReportDaySummary[indexNo].consumptionValidAmount += consumption.validAmount;
                                            }else{
                                                playerReportDaySummary[indexNo].consumptionValidAmount = consumption.validAmount;
                                            }

                                            if(typeof playerReportDaySummary[indexNo].consumptionBonusAmount != "undefined"){
                                                playerReportDaySummary[indexNo].consumptionBonusAmount += consumption.bonusAmount;
                                            }else{
                                                playerReportDaySummary[indexNo].consumptionBonusAmount = consumption.bonusAmount;
                                            }

                                            if(typeof playerReportDaySummary[indexNo].providerDetail != "undefined"){
                                                let providerId = providerDetail && Object.keys(providerDetail) && Object.keys(providerDetail).length ? Object.keys(providerDetail)[0] : null;
                                                if(providerId && playerReportDaySummary[indexNo].providerDetail[providerId]){
                                                    playerReportDaySummary[indexNo].providerDetail[providerId].count += providerDetail[providerId].count;
                                                    playerReportDaySummary[indexNo].providerDetail[providerId].amount += providerDetail[providerId].amount;
                                                    playerReportDaySummary[indexNo].providerDetail[providerId].validAmount += providerDetail[providerId].validAmount;
                                                    playerReportDaySummary[indexNo].providerDetail[providerId].bonusAmount += providerDetail[providerId].bonusAmount;
                                                    playerReportDaySummary[indexNo].providerDetail[providerId].bonusRatio = providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount;
                                                }else{
                                                    playerReportDaySummary[indexNo].providerDetail = Object.assign(playerReportDaySummary[indexNo].providerDetail, providerDetail);
                                                }
                                            }else{
                                                playerReportDaySummary[indexNo].providerDetail = providerDetail;
                                            }

                                            // Push game detail
                                            if (playerReportDaySummary[indexNo].gameDetail && playerReportDaySummary[indexNo].gameDetail.length) {
                                                let idx = playerReportDaySummary[indexNo].gameDetail.findIndex(obj => obj.gameId === consumption.gameId && obj.providerId === consumption.providerId);

                                                if (idx !== -1){
                                                    playerReportDaySummary[indexNo].gameDetail[idx].bonusAmount += consumption.bonusAmount;
                                                    playerReportDaySummary[indexNo].gameDetail[idx].validAmount += consumption.validAmount;
                                                    playerReportDaySummary[indexNo].gameDetail[idx].amount += consumption.amount;
                                                    playerReportDaySummary[indexNo].gameDetail[idx].count += consumption.count;
                                                    playerReportDaySummary[indexNo].gameDetail[idx].bonusRatio = (playerReportDaySummary[indexNo].gameDetail[idx].bonusAmount / playerReportDaySummary[indexNo].gameDetail[idx].validAmount);
                                                } else {
                                                    playerReportDaySummary[indexNo].gameDetail.push(consumption);
                                                }
                                            } else {
                                                playerReportDaySummary[indexNo].gameDetail = [consumption];
                                            }

                                        }
                                    }
                                    // to get the consumption array without categorized by login device for calculating platform fee for involved game provider
                                    if(consumption && consumption._id && consumption._id.playerId){
                                        let indexNo = consumptionDetailArr.findIndex(p => p.playerId && consumption._id && consumption._id.playerId && p.playerId.toString() == consumption._id.playerId.toString());
                                        let providerDetail = {};
                                        let providerId = consumption.providerId.toString();
                                        consumption.bonusRatio = (consumption.bonusAmount / consumption.validAmount);

                                        if (!providerDetail.hasOwnProperty(providerId)) {
                                            providerDetail[providerId] = {
                                                count: 0,
                                                amount: 0,
                                                validAmount: 0,
                                                bonusAmount: 0
                                            };
                                        }

                                        providerDetail[providerId].count += consumption.count;
                                        providerDetail[providerId].amount += consumption.amount;
                                        providerDetail[providerId].validAmount += consumption.validAmount;
                                        providerDetail[providerId].bonusAmount += consumption.bonusAmount;
                                        providerDetail[providerId].bonusRatio = (providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount);

                                        if(indexNo == -1){
                                            consumptionDetailArr.push({
                                                playerId: consumption._id.playerId,
                                                platformId: consumption._id.platformId,
                                                consumptionTimes: consumption.count,
                                                consumptionAmount: consumption.amount,
                                                consumptionValidAmount: consumption.validAmount,
                                                consumptionBonusAmount: consumption.bonusAmount,
                                                providerDetail: providerDetail,
                                                gameDetail: [consumption],
                                            });
                                        }else{
                                            if(typeof consumptionDetailArr[indexNo].consumptionTimes != "undefined"){
                                                consumptionDetailArr[indexNo].consumptionTimes += consumption.count;
                                            }else{
                                                consumptionDetailArr[indexNo].consumptionTimes = consumption.count;
                                            }

                                            if(typeof consumptionDetailArr[indexNo].consumptionAmount != "undefined"){
                                                consumptionDetailArr[indexNo].consumptionAmount += consumption.amount;
                                            }else{
                                                consumptionDetailArr[indexNo].consumptionAmount = consumption.amount;
                                            }

                                            if(typeof consumptionDetailArr[indexNo].consumptionValidAmount != "undefined"){
                                                consumptionDetailArr[indexNo].consumptionValidAmount += consumption.validAmount;
                                            }else{
                                                consumptionDetailArr[indexNo].consumptionValidAmount = consumption.validAmount;
                                            }

                                            if(typeof consumptionDetailArr[indexNo].consumptionBonusAmount != "undefined"){
                                                consumptionDetailArr[indexNo].consumptionBonusAmount += consumption.bonusAmount;
                                            }else{
                                                consumptionDetailArr[indexNo].consumptionBonusAmount = consumption.bonusAmount;
                                            }

                                            if(typeof consumptionDetailArr[indexNo].providerDetail != "undefined"){
                                                let providerId = providerDetail && Object.keys(providerDetail) && Object.keys(providerDetail).length ? Object.keys(providerDetail)[0] : null;
                                                if(providerId && consumptionDetailArr[indexNo].providerDetail[providerId]){
                                                    consumptionDetailArr[indexNo].providerDetail[providerId].count += providerDetail[providerId].count;
                                                    consumptionDetailArr[indexNo].providerDetail[providerId].amount += providerDetail[providerId].amount;
                                                    consumptionDetailArr[indexNo].providerDetail[providerId].validAmount += providerDetail[providerId].validAmount;
                                                    consumptionDetailArr[indexNo].providerDetail[providerId].bonusAmount += providerDetail[providerId].bonusAmount;
                                                    consumptionDetailArr[indexNo].providerDetail[providerId].bonusRatio = providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount;
                                                }else{
                                                    consumptionDetailArr[indexNo].providerDetail = Object.assign(consumptionDetailArr[indexNo].providerDetail, providerDetail);
                                                }
                                            }else{
                                                consumptionDetailArr[indexNo].providerDetail = providerDetail;
                                            }

                                            // Push game detail
                                            if (consumptionDetailArr[indexNo].gameDetail && consumptionDetailArr[indexNo].gameDetail.length) {
                                                let idx = consumptionDetailArr[indexNo].gameDetail.findIndex(obj => obj.gameId === consumption.gameId && obj.providerId === consumption.providerId);

                                                if (idx !== -1){
                                                    consumptionDetailArr[indexNo].gameDetail[idx].bonusAmount += consumption.bonusAmount;
                                                    consumptionDetailArr[indexNo].gameDetail[idx].validAmount += consumption.validAmount;
                                                    consumptionDetailArr[indexNo].gameDetail[idx].amount += consumption.amount;
                                                    consumptionDetailArr[indexNo].gameDetail[idx].count += consumption.count;
                                                    consumptionDetailArr[indexNo].gameDetail[idx].bonusRatio = (consumptionDetailArr[indexNo].gameDetail[idx].bonusAmount / consumptionDetailArr[indexNo].gameDetail[idx].validAmount);
                                                } else {
                                                    consumptionDetailArr[indexNo].gameDetail.push(consumption);
                                                }
                                            } else {
                                                consumptionDetailArr[indexNo].gameDetail = [consumption];
                                            }

                                        }
                                    }
                                }
                            )
                        }

                        if(bonusDetails && bonusDetails.length > 0){
                            console.log("LH check player report 6------", bonusDetails.length);
                            bonusDetails.forEach(
                                bonus => {
                                    if(bonus && bonus._id && bonus._id.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && bonus._id && bonus._id.playerId && p.playerId.toString() == bonus._id.playerId.toString() && p.loginDevice == bonus._id.loginDevice);

                                        if(indexNo == -1){
                                            playerReportDaySummary.push({
                                                playerId: bonus._id.playerId,
                                                platformId: bonus._id.platformId,
                                                bonusTimes: bonus.count,
                                                bonusAmount: bonus.amount,
                                                loginDevice: bonus._id.loginDevice || null
                                            });
                                        }else{
                                            playerReportDaySummary[indexNo].bonusTimes = bonus.count;
                                            playerReportDaySummary[indexNo].bonusAmount = bonus.amount;
                                        }
                                    }
                                }
                            )
                        }

                        if(consumptionReturnDetails && consumptionReturnDetails.length > 0){
                            console.log("LH check player report 7------", consumptionReturnDetails.length);
                            consumptionReturnDetails.forEach(
                                consumptionReturn => {
                                    if(consumptionReturn && consumptionReturn._id && consumptionReturn._id.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && consumptionReturn._id && consumptionReturn._id.playerId && p.playerId.toString() == consumptionReturn._id.playerId.toString() && p.loginDevice == consumptionReturn._id.loginDevice);

                                        if(indexNo == -1){
                                            playerReportDaySummary.push({
                                                playerId: consumptionReturn._id.playerId,
                                                platformId: consumptionReturn._id.platformId,
                                                consumptionReturnAmount: consumptionReturn.amount,
                                                loginDevice: consumptionReturn._id.loginDevice || null
                                            });
                                        }else{
                                            playerReportDaySummary[indexNo].consumptionReturnAmount = consumptionReturn.amount;
                                        }
                                    }
                                }
                            )
                        }

                        if(rewardDetails && rewardDetails.length > 0){
                            console.log("LH check player report 8------", rewardDetails.length);
                            rewardDetails.forEach(
                                reward => {
                                    if(reward && reward._id && reward._id.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && reward._id && reward._id.playerId && p.playerId.toString() == reward._id.playerId.toString() && p.loginDevice == reward._id.loginDevice);

                                        if(indexNo == -1) {
                                            playerReportDaySummary.push({
                                                playerId: reward._id.playerId,
                                                platformId: reward._id.platformId,
                                                rewardAmount: parseFloat(reward.amount),
                                                loginDevice: reward._id.loginDevice
                                            })
                                        }else if(typeof playerReportDaySummary[indexNo].rewardAmount != "undefined"){
                                            playerReportDaySummary[indexNo].rewardAmount += parseFloat(reward.amount);
                                        }else{
                                            playerReportDaySummary[indexNo].rewardAmount = parseFloat(reward.amount);
                                        }
                                    }
                                }
                            )
                        }

                        if(onlineTopUpByMerchantDetails && onlineTopUpByMerchantDetails.length > 0){
                            console.log("LH check player report 9------", onlineTopUpByMerchantDetails.length);
                            onlineTopUpByMerchantDetails.forEach(
                                onlineTopUpByMerchant => {
                                    if(onlineTopUpByMerchant && onlineTopUpByMerchant.playerId){
                                        let indexNo = playerReportDaySummary.findIndex(p => p.playerId && onlineTopUpByMerchant.playerId && p.playerId.toString() == onlineTopUpByMerchant.playerId.toString() && p.loginDevice == onlineTopUpByMerchant.loginDevice);

                                        if (onlineTopUpByMerchant && merchantList && merchantList.length > 0) {
                                            let onlineTopUpDetail = onlineTopUpByMerchant;

                                            if (onlineTopUpDetail && onlineTopUpDetail.hasOwnProperty('merchantNo') && onlineTopUpDetail.merchantNo
                                                && onlineTopUpDetail.hasOwnProperty('merchantName') && onlineTopUpDetail.merchantName) {
                                                let index = merchantList.findIndex(x => x && x.hasOwnProperty('merchantNo') && x.hasOwnProperty('name') && x.merchantNo && x.name && (x.merchantNo == onlineTopUpDetail.merchantNo) && (x.name == onlineTopUpDetail.merchantName));

                                                let onlineTopUpAmount = onlineTopUpDetail && onlineTopUpDetail.amount ? onlineTopUpDetail.amount : 0;
                                                let rate = 0;
                                                let onlineTopUpFee = 0;

                                                if (index != -1) {
                                                    rate = merchantList[index] && merchantList[index].rate ? merchantList[index].rate : 0;
                                                    onlineTopUpFee = onlineTopUpAmount * rate;

                                                    onlineTopUpDetail.onlineTopUpFee = onlineTopUpFee;
                                                    onlineTopUpDetail.onlineTopUpServiceChargeRate = rate;
                                                } else {
                                                    onlineTopUpFee = onlineTopUpAmount * rate;

                                                    onlineTopUpDetail.onlineTopUpFee = onlineTopUpFee;
                                                    onlineTopUpDetail.onlineTopUpServiceChargeRate = rate;
                                                }
                                            }
                                        }

                                        if(indexNo == -1){
                                            playerReportDaySummary.push({
                                                playerId: onlineTopUpByMerchant.playerId,
                                                platformId: onlineTopUpByMerchant.platformId,
                                                totalOnlineTopUpFee: parseFloat(onlineTopUpByMerchant.onlineTopUpFee) || 0,
                                                onlineTopUpFeeDetail: [onlineTopUpByMerchant],
                                                loginDevice: onlineTopUpByMerchant.loginDevice || null
                                            })
                                        }else{
                                            if(typeof playerReportDaySummary[indexNo].totalOnlineTopUpFee != "undefined"){
                                                playerReportDaySummary[indexNo].totalOnlineTopUpFee += parseFloat(onlineTopUpByMerchant.onlineTopUpFee) || 0;
                                            }else{
                                                playerReportDaySummary[indexNo].totalOnlineTopUpFee = parseFloat(onlineTopUpByMerchant.onlineTopUpFee) || 0;
                                            }

                                            if(typeof playerReportDaySummary[indexNo].onlineTopUpFeeDetail != "undefined"){
                                                playerReportDaySummary[indexNo].onlineTopUpFeeDetail = playerReportDaySummary[indexNo].onlineTopUpFeeDetail.concat(onlineTopUpByMerchant);
                                            }else{
                                                playerReportDaySummary[indexNo].onlineTopUpFeeDetail = [onlineTopUpByMerchant];
                                            }
                                        }
                                    }
                                }
                            )
                        }

                        console.log("LH check player report 10------", playerReportDaySummary.length);
                        return playerReportDaySummary;
                    },
                    error => {
                        console.log("player report data summary error 1- ", error);
                        return Promise.reject({
                            name: "DataError",
                            errorMessage: "player report data summary error 1",
                            error: error
                        });
                    }
                ).then(
                    playerReportDaySummary => {
                        console.log("LH check player report 11------");
                        playerReportSummary = playerReportDaySummary;
                        console.log("debug #C8AD01 recalculate result", JSON.stringify(playerReportSummary, null, 2))
                        let platformFeeProm = [];
                        if(consumptionDetailArr  && consumptionDetailArr.length > 0){
                            consumptionDetailArr .forEach(
                                summary => {
                                    if(summary){
                                        platformFeeProm.push(dbPlayerTopUpRecord.countPlatformFeeByPlayer(platformId, summary.playerId, summary.providerDetail));
                                    }
                                }
                            );
                        }

                        console.log("LH check player report 12------", platformFeeProm.length);
                        return Promise.all(platformFeeProm);
                    },
                    error => {
                        console.log("player report data summary error 2- ", error);
                        return Promise.reject({
                            name: "DataError",
                            errorMessage: "player report data summary error 2",
                            error: error
                        });
                    }
                ).then(
                    playerPlatformFeeDetail => {
                        console.log("LH check player report 13------");
                        if(playerPlatformFeeDetail && playerPlatformFeeDetail.length > 0){
                            console.log("LH check player report 14------", playerPlatformFeeDetail.length);
                            playerPlatformFeeDetail.forEach(
                                platformFee => {
                                    if(platformFee){
                                        // just append the platformFee onto one of the record with the same playerId, without considering loginDevice
                                        let indexNo = playerReportSummary.findIndex(p => p.playerId.toString() == platformFee.playerId.toString());

                                        if(indexNo > -1){
                                            playerReportSummary[indexNo].platformFeeEstimate = platformFee.platformFeeEstimate;
                                            playerReportSummary[indexNo].totalPlatformFeeEstimate = platformFee.totalPlatformFeeEstimate;
                                        }
                                    }
                                }
                            )
                        }

                        return playerReportSummary;
                    },
                    error => {
                        console.log("player report data summary error 3- ", error);
                        return Promise.reject({
                            name: "DataError",
                            errorMessage: "player report data summary error 3",
                            error: error
                        });
                    }
                ).catch(
                    error => {
                        console.log("player report data summary error - ", error);
                        return Promise.reject({
                            name: "DataError",
                            errorMessage: "player report data summary error",
                            error: error
                        });
                    }
                )
            }
        );
    },

    countPlatformFeeByPlayer: function(platformId, playerId, providerDetail){
        if(!providerDetail){
            return {
                playerId: playerId,
                platformFeeEstimate: {},
                totalPlatformFeeEstimate: 0
            };
        }
        let platformFeeEstimate = {};
        let totalPlatformFeeEstimate = 0;

        return dbconfig.collection_platformFeeEstimate.findOne({platform: platformId}).populate({
            path: 'platformFee.gameProvider',
            model: dbconfig.collection_gameProvider
        }).then(
            feeData => {
                if (providerDetail && Object.keys(providerDetail).length && feeData && feeData.platformFee && feeData.platformFee.length) {
                    feeData.platformFee.forEach(provider => {
                        if (provider.gameProvider && provider.gameProvider._id && providerDetail.hasOwnProperty(String(provider.gameProvider._id))) {
                            let gameProviderName = String(provider.gameProvider.name);
                            platformFeeEstimate[gameProviderName] = (providerDetail[String(provider.gameProvider._id)].bonusAmount * -1) * provider.feeRate;
                            if (platformFeeEstimate[gameProviderName] < 0) {
                                platformFeeEstimate[gameProviderName] = 0;
                            }
                            totalPlatformFeeEstimate += platformFeeEstimate[gameProviderName];
                        }
                    })
                }
                return {
                    playerId: playerId,
                    platformFeeEstimate: platformFeeEstimate,
                    totalPlatformFeeEstimate: totalPlatformFeeEstimate
                };
            }
        );
    },

    assignTopUpRecordUsedEvent: function (platformObjId, playerObjId, eventObjId, spendingAmount, startTime, endTime, byPassedEvent, usedProposal, rewardType, isNoLimit) {
        // if spendingAmount (i.e., the requiredTopUpAmount) is 0, ignore it as no top up record has to be used up
        if (spendingAmount) {
            let topUpQuery = {
                platformId: platformObjId,
                playerId: playerObjId,
            };

            if (startTime) {
                topUpQuery.createTime = {$gte: startTime};
                if (endTime) {
                    topUpQuery.createTime.$lte = endTime;
                }
            }

            let updateValue = {
                bDirty: true,
                $push: {usedEvent: eventObjId}
            };

            if (rewardType) {
                updateValue.usedType = rewardType;
            }

            if (usedProposal) {
                updateValue.usedProposal = usedProposal;
            }

            let recordIds = [];

            let rewardEventQuery = {platform: platformObjId};

            if (byPassedEvent && byPassedEvent.length > 0) {
                byPassedEvent.forEach(byPassedEventId => {
                    byPassedEvent.push(ObjectId(byPassedEventId));
                });
                rewardEventQuery._id = {$nin: byPassedEvent};
            }

            return dbconfig.collection_rewardEvent.distinct("_id", rewardEventQuery).then(
                rewardEventIds => {
                    topUpQuery.usedEvent = {$nin: rewardEventIds};
                    return dbconfig.collection_playerTopUpRecord.find(topUpQuery).lean()
                }
            ).then(
                toUpRecords => {
                    let curAmount = 0;

                    for (var i = 0; i < toUpRecords.length; i++) {
                        let record = toUpRecords[i];
                        recordIds.push(record._id);
                        curAmount += record.amount;

                        if (!isNoLimit && curAmount >= spendingAmount) {
                            break;
                        }
                    }

                    dbconfig.collection_playerTopUpRecord.update(
                        {_id: {$in: recordIds}},
                        updateValue,
                        {multi: true}
                    ).exec();

                    return recordIds;
                }
            );
        }
    },

    /**
     *  Add usedEvent to consumption record
     */
    unassignTopUpRecordUsedEvent: function (recordIds, eventObjId) {
        dbconfig.collection_playerTopUpRecord.update(
            {_id: {$in: recordIds}},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
    },

    unassignTopUpRecordUsedEventByProposal: function (proposalId, eventObjId) {
        dbconfig.collection_playerTopUpRecord.update(
            {usedProposal: proposalId},
            {bDirty: false, $pull: {usedEvent: eventObjId}},
            {multi: true}
        ).exec();
    },

    /**
     * Get total top up amount in a certain period of time
     * @param {Date} startTime,endTime - The date info
     */
    topupReport: async (query, index, limit, sortObj, isExport) => {
        let topupRecords = [];
        let queryObj = {};

        if (query.proposalId) {
            queryObj = {
                proposalId: query.proposalId
            };
            if (query.platformList && query.platformList.length > 0) {
                queryObj['data.platformId'] = {$in: query.platformList.map(item=>{return ObjectId(item)})};
            }
        } else {
            queryObj = await getProposalQ(query);
        }

        let totalCountProm = dbconfig.collection_proposal.find(queryObj).count();
        let totalPlayerProm = dbconfig.collection_proposal.distinct('data.playerName', queryObj); //some playerObjId in proposal save in ObjectId/ String
        let totalAmountProm = dbconfig.collection_proposal.aggregate({$match: queryObj}, {
            $group: {
                _id: null,
                totalAmount: {$sum: "$data.amount"}
            }
        }).read("secondaryPreferred").allowDiskUse(true);

        let topupRecordProm = dbconfig.collection_proposal.find(queryObj).sort(sortObj).skip(index).limit(limit)
            .populate({path: 'type', model: dbconfig.collection_proposalType, select: 'name'})
            .populate({path: "data.playerObjId", model: dbconfig.collection_players, select: 'realName'})
            .populate({path: 'data.platformId', model: dbconfig.collection_platform, select: 'name'}).lean();

        return Promise.all([totalCountProm, totalAmountProm, topupRecordProm, totalPlayerProm]).then(
            data => {
                let totalCount = data[0];
                let totalAmountResult = data[1][0];
                topupRecords = data[2];
                let totalPlayerResult = data[3] && data[3].length || 0;

                topupRecords = topupRecords.map(item => {
                    if(item && item.type && item.type.name && item.type.name === "ManualPlayerTopUp" && item.data && item.data.bankCardNo){
                        item.data.bankCardNo = dbUtil.encodeBankAcc(item.data.bankCardNo);
                    }
                    return item;
                });

                if (isExport) {
                    return dbReportUtil.generateExcelFile("TopupReport", topupRecords);
                } else {
                    return {data: topupRecords, size: totalCount, total: totalAmountResult ? totalAmountResult.totalAmount : 0, totalPlayer: totalPlayerResult};
                }
            }
        );

        async function getProposalQ (query) {
            let queryObj = {
                createTime: {
                    $gte: query.startTime ? new Date(query.startTime) : new Date(0),
                    $lt: query.endTime ? new Date(query.endTime) : new Date()
                }
            };

            if (query.mainTopupType) {
                let proposalTypeQuery = getProposalTypeStr(Number(query.mainTopupType));

                if (query.platformList && query.platformList.length > 0) {
                    proposalTypeQuery.platformId = {$in: query.platformList};
                }

                let proposalType = await dbconfig.collection_proposalType.find(proposalTypeQuery, {_id: 1}).lean();

                queryObj.type = {$in: proposalType.map(type => type._id)};
            } else {
                queryObj.mainType = "TopUp";
            }

            if (query.status && query.status.length > 0) {
                queryObj.status = {$in: convertStringNumber(query.status)};
            }

            if (query.depositMethod && query.depositMethod.length > 0) {
                queryObj['data.depositMethod'] = {'$in': convertStringNumber(query.depositMethod)};
            }

            if (query.platformList && query.platformList.length > 0) {
                queryObj['data.platformId'] = {$in: query.platformList.map(item=>{return ObjectId(item)})};
            }

            if (query.playerName) {
                queryObj['data.playerName'] = query.playerName;
            }

            if (query.topupType && query.topupType.length > 0) {
                queryObj['data.topupType'] = {$in: convertStringNumber(query.topupType)}
            }

            if (query.bankTypeId && query.bankTypeId.length > 0) {
                queryObj['data.bankTypeId'] = {$in: convertStringNumber(query.bankTypeId)};
            }

            if (query.userAgent && query.userAgent.length > 0) {
                queryObj['inputDevice'] = {$in: convertStringNumber(query.userAgent)};
            }

            if(query.line){
                queryObj['data.line'] = {$in: query.line};
            }

            if (query.merchantNo && query.merchantNo.length > 0 && (!query.merchantGroup || query.merchantGroup.length == 0)) {
                queryObj['$or'] = [
                    //{'data.merchantNo': {$in: convertStringNumber(query.merchantNo)}},
                    {'data.bankCardNo': {$in: convertStringNumber(query.merchantNo)}},
                    {'data.accountNo': {$in: convertStringNumber(query.merchantNo)}},
                    {'data.alipayAccount': {$in: convertStringNumber(query.merchantNo)}},
                    {'data.wechatAccount': {$in: convertStringNumber(query.merchantNo)}},
                    {'data.weChatAccount': {$in: convertStringNumber(query.merchantNo)}}
                ]
            }

            if (query.merchantName && query.merchantName.length > 0) {
                queryObj["$or"].push({'data.merchantName': {$in: query.merchantName}})
            }

            if ((!query.merchantNo || query.merchantNo.length == 0) && query.merchantGroup && query.merchantGroup.length > 0) {
                let mGroupList = [];

                query.merchantGroup.forEach(item => {
                    if (item.list.length > 0) {
                        item.list.forEach(sItem => {
                            mGroupList.push(sItem)
                        })
                    }
                });

                queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupList)};
            }

            if (query.merchantNo && query.merchantNo.length > 0 && query.merchantGroup && query.merchantGroup.length > 0) {
                let mGroupC = [];
                let mGroupD = [];

                query.merchantNo.forEach(item => {
                    mGroupC.push(item);
                });

                query.merchantGroup.forEach(item => {
                    item.list.forEach(sItem => {
                        mGroupD.push(sItem)
                    });
                });

                if (query.merchantNo.length > 0) {
                    queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupC)};
                } else if (query.merchantGroup.length > 0 && query.merchantNo.length === 0) {
                    queryObj['data.merchantNo'] = {$in: convertStringNumber(mGroupD)}
                }
            }

            if (query.loginDevice && query.loginDevice.length){
                queryObj['device'] = {$in: query.loginDevice};
            }
            return queryObj;
        }

        function getProposalTypeStr (mainTopupType) {
            let str = "";

            if (mainTopupType === constPlayerTopUpType.ONLINE) {
                str = constProposalType.PLAYER_TOP_UP;
            } else if (mainTopupType === constPlayerTopUpType.ALIPAY) {
                str = constProposalType.PLAYER_ALIPAY_TOP_UP
            } else if (mainTopupType === constPlayerTopUpType.MANUAL) {
                str = constProposalType.PLAYER_MANUAL_TOP_UP;
            } else if (mainTopupType === constPlayerTopUpType.WECHAT) {
                str = constProposalType.PLAYER_WECHAT_TOP_UP
            } else if (mainTopupType === constPlayerTopUpType.QUICKPAY) {
                str = constProposalType.PLAYER_QUICKPAY_TOP_UP
            } else if (mainTopupType === constPlayerTopUpType.COMMON) {
                str = constProposalType.PLAYER_COMMON_TOP_UP
            } else if (mainTopupType === constPlayerTopUpType.FUKUAIPAY) {
                str = constProposalType.PLAYER_FKP_TOP_UP
            }

            return {
                name: str
            };
        }
    },

    topupRecordInsertRepeatCount: function (proposals, platformId, query) {
        return new Promise(function (resolve) {
            let typeIds = null;
            let getProposalTypesIdProm = typeIds ? Promise.resolve(typeIds) : getTopUpProposalTypeIds(platformId);
            let insertedProposals = [];

            if (!proposals || proposals.length === 0) {
                resolve([]);
            }

            let promises = [];

            for (let i = 0; i < proposals.length; i++) {
                let prom = new Promise(function (res) {
                    let proposal = JSON.parse(JSON.stringify(proposals[i]));
                    if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
                        insertedProposals[i] = handleSuccessProposal(proposal);
                        res();
                    } else {
                        getProposalTypesIdProm.then(
                            typeIdData => {
                                typeIds = typeIdData;
                                return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
                            }
                        ).then(
                            () => {
                                insertedProposals[i] = proposal;
                                res();
                            }
                        )
                    }
                });

                promises.push(prom);
            }

            Promise.all(promises).then(
                () => {
                    resolve(insertedProposals);
                }
            );

            function handleFailureMerchant(proposal) {
                let merchantNo = proposal.data.merchantNo;
                let relevantTypeIds = merchantNo ? typeIds : [proposal.type];
                let alipayAccount = proposal.data.alipayAccount ? proposal.data.alipayAccount : "";
                let bankCardNoRegExp;

                if (proposal.data.bankCardNo) {
                    console.log("proposal.data.bankCardNo----------------------", proposal.data.bankCardNo);
                    let bankCardNoPrefix = proposal.data.bankCardNo.substring(0, 6);
                    let bankCardNoRegExpA;
                    let bankCardNoRegExpB = new RegExp(".*" + proposal.data.bankCardNo.slice(-4));
                    if (bankCardNoPrefix.indexOf('*') == -1) {

                        console.log("bankCardNoRegExpA----------------------", bankCardNoRegExpA);
                        console.log("bankCardNoRegExpB----------------------", bankCardNoRegExpB);

                        bankCardNoRegExpA = new RegExp(bankCardNoPrefix + ".*");
                        bankCardNoRegExp = [
                            {"data.bankCardNo": bankCardNoRegExpA},
                            {"data.bankCardNo": bankCardNoRegExpB}
                        ];
                    } else {
                        bankCardNoRegExp = [
                            {"data.bankCardNo": bankCardNoRegExpB}
                        ];
                    }

                    // let bankCardNoRegExpA = new RegExp(proposal.data.bankCardNo.substring(0, 6) + ".*");
                    // let bankCardNoRegExpB = new RegExp(".*" + proposal.data.bankCardNo.slice(-4));
                    // bankCardNoRegExp = [
                    //     {"data.bankCardNo": bankCardNoRegExpA},
                    //     {"data.bankCardNo": bankCardNoRegExpB}
                    // ];
                }

                let prevSuccessQuery = {
                    type: {$in: relevantTypeIds},
                    createTime: {$gte: new Date(query.startTime), $lte: new Date(proposal.createTime)},
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                };

                let nextSuccessQuery = {
                    type: {$in: relevantTypeIds},
                    createTime: {$gte: new Date(proposal.createTime), $lt: new Date(query.endTime)},
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                };

                if (merchantNo) {
                    prevSuccessQuery["data.merchantNo"] = merchantNo;
                    nextSuccessQuery["data.merchantNo"] = merchantNo;
                }

                if (alipayAccount) {
                    prevSuccessQuery["data.alipayAccount"] = alipayAccount;
                    nextSuccessQuery["data.alipayAccount"] = alipayAccount;
                }

                if (proposal.data.bankCardNo) {
                    prevSuccessQuery["$and"] = bankCardNoRegExp;
                    nextSuccessQuery["$and"] = bankCardNoRegExp;
                }

                let prevSuccessProm = dbconfig.collection_proposal.find(prevSuccessQuery).sort({createTime: -1}).limit(1).lean();
                let nextSuccessProm = dbconfig.collection_proposal.find(nextSuccessQuery).sort({createTime: 1}).limit(1).lean();

                // for debug usage
                // let pS, nS, fISQ;

                return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                    successData => {
                        let prevSuccess = successData[0];
                        let nextSuccess = successData[1];

                        let allCountQuery = {
                            type: {$in: relevantTypeIds}
                        };

                        let currentCountQuery = {
                            type: {$in: relevantTypeIds},
                            createTime: {
                                $lte: new Date(proposal.createTime)
                            }
                        };

                        let firstInStreakQuery = {
                            type: {$in: relevantTypeIds}
                        };

                        if (merchantNo) {
                            allCountQuery["data.merchantNo"] = merchantNo;
                            currentCountQuery["data.merchantNo"] = merchantNo;
                            firstInStreakQuery["data.merchantNo"] = merchantNo;
                        }

                        if (alipayAccount) {
                            allCountQuery["data.alipayAccount"] = alipayAccount;
                            currentCountQuery["data.alipayAccount"] = alipayAccount;
                            firstInStreakQuery["data.alipayAccount"] = alipayAccount;
                        }

                        if (proposal.data.bankCardNo) {
                            allCountQuery["$and"] = bankCardNoRegExp;
                            currentCountQuery["$and"] = bankCardNoRegExp;
                            firstInStreakQuery["$and"] = bankCardNoRegExp;
                        }

                        if (prevSuccess[0]) {
                            let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                            allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                            currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                            firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                        }

                        if (nextSuccess[0]) {
                            allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                            allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                        }

                        // for debug usage
                        // pS = prevSuccess[0];
                        // nS = nextSuccess[0];
                        // fISQ = firstInStreakQuery;

                        let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                        let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                        let firstInStreakProm = dbconfig.collection_proposal.find(firstInStreakQuery).sort({createTime: 1}).limit(1).lean();

                        return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                    }
                ).then(
                    countData => {
                        let allCount = countData[0];
                        let currentCount = countData[1];
                        let firstFailure = countData[2][0];

                        // for debug usage
                        // if (!firstFailure) {
                        //     console.log('t54lwtMaus')
                        //     console.log('proposal |||', proposal)
                        //     console.log('firstFailure |||', firstFailure)
                        //     console.log('prevSuccess |||', pS)
                        //     console.log('nextSuccess |||', nS)
                        //     console.log('firstInStreakQuery |||', fISQ)
                        //     console.log('prevSuccessQuery |||', prevSuccessQuery)
                        //     console.log('nextSuccessQuery |||', nextSuccessQuery)
                        // }

                        proposal.$merchantAllCount = allCount;
                        proposal.$merchantCurrentCount = currentCount;

                        if (!firstFailure || firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                            proposal.$merchantGapTime = 0;
                        } else {
                            proposal.$merchantGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                        }
                        return proposal;
                    }
                );
            }

            function handleFailurePlayer(proposal) {
                let playerName = proposal.data.playerName;

                let prevSuccessProm = dbconfig.collection_proposal.find({
                    type: {$in: typeIds},
                    createTime: {$gte: new Date(query.startTime), $lte: proposal.createTime},
                    "data.playerName": playerName,
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                }).sort({createTime: -1}).limit(1).lean();
                let nextSuccessProm = dbconfig.collection_proposal.find({
                    type: {$in: typeIds},
                    createTime: {$gte: proposal.createTime, $lt: new Date(query.endTime)},
                    "data.playerName": playerName,
                    status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                }).sort({createTime: 1}).limit(1).lean();

                return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                    successData => {
                        let prevSuccess = successData[0];
                        let nextSuccess = successData[1];

                        let allCountQuery = {
                            type: {$in: typeIds},
                            "data.playerName": playerName
                        };

                        let currentCountQuery = {
                            type: {$in: typeIds},
                            createTime: {
                                $lte: new Date(proposal.createTime)
                            },
                            "data.playerName": playerName
                        };

                        let firstInStreakQuery = {
                            type: {$in: typeIds},
                            "data.playerName": playerName
                        };

                        if (prevSuccess[0]) {
                            let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                            allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                            currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                            firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                        }

                        if (nextSuccess[0]) {
                            allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                            allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                        }

                        let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                        let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                        let firstInStreakProm = dbconfig.collection_proposal.findOne(firstInStreakQuery);

                        return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                    }
                ).then(
                    countData => {
                        let allCount = countData[0];
                        let currentCount = countData[1];
                        let firstFailure = countData[2];

                        proposal.$playerAllCount = allCount;
                        proposal.$playerCurrentCount = currentCount;

                        if (firstFailure && firstFailure.proposalId && proposal && proposal.proposalId && (firstFailure.proposalId.toString() === proposal.proposalId.toString())) {
                            proposal.$playerGapTime = 0;
                        } else if (firstFailure && firstFailure.createTime && proposal && proposal.createTime) {
                            proposal.$playerGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                        } else {
                            proposal.$playerGapTime = 0;
                        }

                        return proposal;
                    }
                );
            }

            function handleSuccessProposal(proposal) {
                proposal['$merchantAllCount'] = '-';
                proposal['$merchantCurrentCount'] = '-';
                proposal['$merchantGapTime'] = '-';
                proposal['$playerAllCount'] = '-';
                proposal['$playerCurrentCount'] = '-';
                proposal['$playerGapTime'] = '-';
                return proposal;
            }

        });
    },

    /**
     * Top up success
     * @param query
     * @param queryData
     * @param checkSteps
     * @param skipVerify
     */
    playerTopUpSuccess: function (query, queryData, checkSteps, skipVerify) {
        var deferred = Q.defer();
        var topupIntentionObj = {};
        var proposalObj = {};
        var player = {};
        var isValidForTransaction = false;

        dbconfig.collection_proposal.findOne(query)
            .then(
                function (data) {
                    if (data && data.data.playerId && data.data.topUpAmount) {
                        topupIntentionObj = data.data;
                        proposalObj = data;
                        isValidForTransaction = topupIntentionObj.validForTransactionReward;

                        // Check top up intention
                        // Check proposal status
                        // Check top up proposal has processing steps
                        if (!skipVerify && ((topupIntentionObj.topUpAmount != queryData.amount) || (topupIntentionObj.playerId != queryData.playerId))) {
                            deferred.reject({
                                name: "DataError",
                                message: "Proposal property does not match with record."
                            });
                        } else if (data.status == constProposalStatus.SUCCESS || data.status == constProposalStatus.FAIL) {
                            deferred.reject({name: "DataError", message: "Proposal has been processed."});
                        } else if (!checkSteps && !data.noSteps) {
                            return dbProposal.updateProposal({
                                _id: proposalObj._id,
                                createTime: proposalObj.createTime
                            }, {status: constProposalStatus.PENDING}).then(
                                function (data) {
                                    deferred.resolve(data);
                                },
                                function (error) {
                                    deferred.reject({
                                        name: "DBError",
                                        message: "Error updating proposal status",
                                        error: error
                                    });
                                }
                            );
                        }
                        else {
                            return dbconfig.collection_players.findOne({playerId: topupIntentionObj.playerId});
                        }
                    } else {
                        deferred.reject({name: "DataError", message: "Can't find proposal information"});
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find proposal " + query});
                }
            )
            .then(
                function (playerData) {
                    if (playerData) {
                        player = playerData;
                        var sendQuery = {
                            _id: playerData._id
                        };
                        return dbPlayerInfo.playerTopUp(sendQuery, topupIntentionObj.topUpAmount, proposalObj.data.channelName)
                    } else {
                        deferred.reject({name: "DataError", message: "Can't find player"});
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find player"});
                }
            )
            .then(
                function (data) {
                    if (data) {
                        return dbProposal.updateProposal({
                            _id: proposalObj._id,
                            createTime: proposalObj.createTime
                        }, {status: constProposalStatus.SUCCESS});
                    }
                },
                function (err) {
                    deferred.reject({
                        name: "DataError",
                        message: "error in updating player topup record.",
                        error: err
                    });
                }
            ).then(
            function (data) {
                if (data) {
                    //todo:: check top up payment channel type here
                    if (isValidForTransaction) {
                        return dbPlayerInfo.applyForPlatformTransactionReward(player.platform, player._id, topupIntentionObj.topUpAmount, player.playerLevel);
                    }
                    else {
                        deferred.resolve(data);
                    }
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create player top up record"});
                }
            },
            function (error) {
                deferred.reject({name: "DataError", error: error, message: "error in creating topup record"});
            }
        ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (error) {
                deferred.reject({
                    name: "DataError",
                    message: "Error in checking transaction reward event",
                    error: error
                });
            }
        );
        return deferred.promise;
    },

    /**
     * Top up Fail
     * @param {Json} query
     * @param {Json} update
     */
    playerTopUpFail: function (query, bCancel, remarks) {
        var deferred = Q.defer();
        var topupIntentionObj = {};
        var proposalObj = {};
        dbconfig.collection_proposal.findOne(query)
            .then(
                function (data) {
                    topupIntentionObj = data.data;
                    proposalObj = data;
                    if (data.status == constProposalStatus.SUCCESS || data.status == constProposalStatus.FAIL) {
                        deferred.reject({name: "DataError", message: "Proposal has been processed."});
                        return false;
                    }
                    return true;
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Can't find proposal " + query});
                }
            )
            .then(
                function (data) {
                    if (data) {
                        let updateData = {
                            status: bCancel ? constProposalStatus.CANCEL : constProposalStatus.FAIL,
                        };
                        if(remarks) {
                            updateData['data.remark'] = proposalObj.data && proposalObj.data.remark ? proposalObj.data.remark + "; " + remarks : remarks;
                        }
                        return dbProposal.updateProposal(
                            {_id: proposalObj._id, createTime: proposalObj.createTime},
                            updateData
                        );
                    }
                    else {
                        deferred.resolve(data);
                    }
                },
                function (err) {
                    deferred.reject({name: "DataError", error: err, message: "Error in finding topup proposal"});
                }
            ).then(
            function (data) {
                deferred.resolve(data);
            },
            function (err) {
                deferred.reject({name: "DataError", error: err, message: "Error in updating topup proposal"});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the topup records of the player
     * @param playerID, the start index and max no of record to be returned
     */

    getPlayerTopUpRecord: function (playerId, index, count) {

        var deferred = Q.defer();
        var playerObjId = null;
        dbconfig.collection_players.findOne({playerId: playerId}).exec().then(
            function (data) {

                playerObjId = data._id;

                var prom1 = dbconfig.collection_playerTopUpRecord.find({playerId: playerObjId}).skip(index).limit(count);
                var prom2 = dbconfig.collection_playerTopUpRecord.find({playerId: playerObjId}).count();

                Q.all([prom1, prom2]).then(
                    function (data) {
                        if (data && data[0]) {

                            deferred.resolve(data);
                        }
                        else {
                            deferred.reject({name: "DataError", message: "Error in getting player topup"});
                        }
                    }).catch(deferred.reject);

            }, function (error) {

                deferred.reject({name: "DBError", message: "Error in getting player topup", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Get the topup records of the player
     * @param {String} playerId
     * @param {String} topUpType
     * @param {Number|Date} startTime
     * @param {Number|Date} endTime
     * @param {Number} index
     * @param {Number} count
     * @param {Boolean} [sort]
     * @param {Boolean} [bDirty] - Only returns records which are dirty or not dirty as specified, or all records if undefined/null
     * @param {Boolean} [bSinceLastConsumption] - Only returns records after the player's last consumption
     * @returns {Promise.<{stats, records}>}
     */
    getPlayerTopUpList: function (playerId, topUpType, startTime, endTime, index, count, sort, bDirty, bSinceLastConsumption, bSinceLastPlayerWidthDraw) {
        "use strict";
        var seq = sort ? -1 : 1;
        return dbconfig.collection_players.findOne({playerId: playerId}).exec().then(
            function (player) {
                if (!player) {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }

                const getLastConsumptionIfNeeded = () => {
                    if (bSinceLastConsumption) {
                        return dbconfig.collection_playerConsumptionRecord.find({
                            playerId: player._id,
                            platformId: player.platform
                        }).sort({createTime: -1}).limit(1).lean();
                    } else {
                        return Q.resolve([]);
                    }
                };

                const getLastPlayerWithdraw = () => {
                    return dbconfig.collection_proposalType.findOne({
                        name: constProposalType.PLAYER_BONUS,
                        platformId: player.platform
                    }).lean().then(
                        typeData => {
                            if (typeData) {
                                return dbconfig.collection_proposal.find({
                                    type: typeData._id,
                                    status: {
                                        $in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.AUTOAUDIT,
                                            constProposalStatus.PROCESSING, constProposalStatus.SUCCESS, constProposalStatus.UNDETERMINED]
                                    },
                                    "data.playerId": playerId
                                }).sort({createTime: -1}).limit(1).lean();
                            }
                            else {
                                return [];
                            }
                        }
                    );
                };

                return Q.all([getLastConsumptionIfNeeded(), getLastPlayerWithdraw()]).then(function (data) {
                    const latestConsumptionRecord = data[0][0];
                    const lastPlayerWidthDraw = data[1][0];

                    let queryStartTime = 0;
                    if (bSinceLastConsumption && (latestConsumptionRecord && latestConsumptionRecord.createTime || lastPlayerWidthDraw && lastPlayerWidthDraw.createTime)) {
                        queryStartTime = latestConsumptionRecord && latestConsumptionRecord.createTime ? latestConsumptionRecord.createTime.getTime() : 0;
                    }
                    if (bSinceLastPlayerWidthDraw && lastPlayerWidthDraw && lastPlayerWidthDraw.createTime && lastPlayerWidthDraw && lastPlayerWidthDraw.createTime.getTime() > queryStartTime) {
                        queryStartTime = lastPlayerWidthDraw.createTime.getTime()
                    }
                    if (startTime && new Date(startTime).getTime() > queryStartTime) {
                        queryStartTime = startTime;
                    }
                    const queryEndTime = endTime;

                    var queryObj = {
                        playerId: player._id
                    };
                    if (topUpType) {
                        queryObj.topUpType = parseInt(topUpType);
                    }
                    if (queryStartTime || queryEndTime) {
                        queryObj.createTime = {};
                    }
                    if (queryStartTime) {
                        queryObj.createTime["$gte"] = new Date(queryStartTime);
                    }
                    if (queryEndTime) {
                        queryObj.createTime["$lt"] = new Date(queryEndTime);
                    }
                    if (bDirty != null) {
                        queryObj.usedEvent = {$ne: []};
                        if (bDirty == false) {
                            queryObj.usedEvent = [];
                        }
                    }
                    var countProm = dbconfig.collection_playerTopUpRecord.find(queryObj).count();
                    var recordProm = dbconfig.collection_playerTopUpRecord.find(queryObj)
                        .populate({
                            path: "playerId",
                            model: dbconfig.collection_players
                        })
                        .populate({
                            path: "platformId",
                            model: dbconfig.collection_platform
                        })
                        .skip(index).limit(count).sort({createTime: seq}).lean();
                    return Q.all([recordProm, countProm]);
                });
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (data) {
                var totalAmount = 0;
                if (data && data[0] && data[0].length > 0) {
                    for (var i = 0; i < data[0].length; i++) {
                        var record = data[0][i];
                        record.playerId = record.playerId.playerId;
                        record.platformId = record.platformId.platformId;
                        totalAmount += record.amount;
                    }
                }

                var stats = {
                    totalCount: data[1],
                    totalAmount: totalAmount,
                    startIndex: index,
                    requestCount: count
                };
                return {
                    stats: stats,
                    records: data[0]
                };
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player topup records", error: error});
            }
        );
    },

    checkTopupRecordIsDirtyForReward: function(eventData, rewardData) {
        let isUsed = false;

        if (rewardData && rewardData.selectedTopup && rewardData.selectedTopup.usedEvent && rewardData.selectedTopup.usedEvent.length > 0) {
            if (eventData.condition.ignoreTopUpDirtyCheckForReward && eventData.condition.ignoreTopUpDirtyCheckForReward.length > 0) {
                rewardData.selectedTopup.usedEvent.map(eventId => {
                    let isOneMatch = false;
                    eventData.condition.ignoreTopUpDirtyCheckForReward.map(eventIgnoreId => {
                        if (String(eventId) == String(eventIgnoreId)) {
                            isOneMatch = true;
                        }
                    });
                    // If one of the reward matched in ignore list, dirty check for this reward is ignored
                    isUsed = isOneMatch ? isUsed : true;
                })
            } else {
                isUsed = true;
            }
        }

        return isUsed;
    },

    /**
     * add online topup process
     * @param playerID
     * @param topupRequest
     * @param {Number} topupRequest.amount
     * @param {Number} topupRequest.topupType
     */

    addOnlineTopupRequest: function (userAgent, playerId, topupRequest, merchantUseType, clientType, topUpReturnCode, bPMSGroup = false, lastLoginIp) {
        var userAgentStr = userAgent;
        var player = null;
        var proposal = null;
        var merchantResponse = null;
        var merchantResult = null;
        let merchantGroupList = [];
        let rewardEvent;
        let newProposal;
        let serviceCharge = 0;
        let topUpSystemConfig;

        if (topupRequest.bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbconfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbconfig.collection_platformMerchantGroup}
        ).populate(
            {path: "playerLevel", model: dbconfig.collection_playerLevel}
            ).lean().then(
            playerData => {
                player = playerData;
                topUpSystemConfig = extConfig && player.platform.topUpSystemType && extConfig[player.platform.topUpSystemType];

                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    bPMSGroup = false;
                } else if (player && player.platform && player.platform.merchantGroupIsPMS) {
                    bPMSGroup = true
                } else {
                    bPMSGroup = false;
                }
                if (player && player._id) {
                    if (!topUpReturnCode) {
                        return Promise.resolve();
                    }

                    return dbRewardUtil.checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, topupRequest, constPlayerTopUpType.ONLINE);

                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Cannot find player"
                    });
                }
            }
        ).then(
            eventData => {
                rewardEvent = eventData;
                if (player && player.platform) {
                    let limitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, topupRequest.amount, topupRequest.limitedOfferObjId);
                    let merchantGroupProm = () => RESTUtils.getPMS2Services("postMerchantList", {platformId: player.platform.platformId}, player.platform.topUpSystemType);

                    let merchantTypeProm = Promise.resolve(false);
                    // if (bPMSGroup === true || bPMSGroup === "true") {
                    //     let pmsQuery = {
                    //         platformId: player.platform.platformId,
                    //         queryId: serverInstance.getQueryId(),
                    //         username: player.name,
                    //         ip: lastLoginIp,
                    //         clientType: clientType
                    //     };
                    //     merchantTypeProm = pmsAPI.foundation_requestOnLinepayByUsername(pmsQuery);
                    // }

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        let query = {
                            username: player.name,
                            platformId: player.platform.platformId,
                            clientType: clientType
                        };

                        merchantTypeProm = RESTUtils.getPMS2Services("postOnlineTopupType", query, player.platform.topUpSystemType);
                    }

                    let proms = [limitedOfferProm, merchantGroupProm(), merchantTypeProm];
                    if (topupRequest.bonusCode) {
                        let bonusCodeCheckProm;
                        let isOpenPromoCode = topupRequest.bonusCode.toString().trim().length == 3 ? true : false;
                        if (isOpenPromoCode){
                            bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount, lastLoginIp);
                        }
                        else {
                            bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, topupRequest.bonusCode, topupRequest.amount);
                        }
                        proms.push(bonusCodeCheckProm)
                    }

                    return Promise.all(proms);
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot find player for online top up proposal",
                        error: Error()
                    });
                }
            }
        ).then(
            res => {
                let minTopUpAmount = player.platform.minTopUpAmount || 0;
                let limitedOfferTopUp = res[0];
                merchantGroupList = res[1];
                let merchantType = res[2];
                let bonusCodeValidity = res[3];

                // check bonus code validity if exist
                if (topupRequest.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
                }

                if (topupRequest.amount < minTopUpAmount) {
                    return Promise.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }

                console.log("LH Check online topup permission 1 ------- ", player.name);
                console.log("LH Check online topup permission 2 ------- ", player.permission && typeof player.permission.topupOnline != "undefined"  ? player.permission.topupOnline : "not exists");
                if (!player.permission || !player.permission.topupOnline || player.permission.topupOnline === "false") {
                    console.log("LH Check online topup permission 3 ------- ", player.name);
                    return Promise.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        errorMessage: "Player does not have online topup permission"
                    });
                }
                //check player foridb topup type list
                if (player.forbidTopUpType && player.forbidTopUpType.indexOf(topupRequest.topupType) >= 0) {
                    return Promise.reject({name: "DataError", message: "Top up type is forbidden for this player"});
                }
                //check player merchant group
                // if (!player.merchantGroup || !player.merchantGroup.merchants) {
                //     return Promise.reject({name: "DataError", message: "Player does not have valid merchant data"});
                // }

                // Check segregated merchant min max amount
                // if (bPMSGroup && merchantType && merchantType.topupTypes.some(el => el.type == topupRequest.topupType)) {
                //     let quotaScopes = merchantType.topupTypes.find(el => el.type == topupRequest.topupType).quotaScopes;
                //     let isPassed = false;
                //     let amtArr = [];
                //
                //     if (quotaScopes) {
                //         quotaScopes.forEach(scope => {
                //             if (topupRequest.amount >= scope.minDepositAmount && topupRequest.amount <= scope.maxDepositAmount) {
                //                 isPassed = true;
                //             }
                //
                //             amtArr.push(scope.minDepositAmount);
                //             amtArr.push(scope.maxDepositAmount);
                //         });
                //
                //         if (!isPassed) {
                //             let errorMsg = "暂时不支持您输入的金额，请填入";
                //
                //             for (let i = 0; i <= amtArr.length && Number.isFinite(amtArr[i]); i++) {
                //                 errorMsg += String(amtArr[i]);
                //                 errorMsg += "~";
                //                 i++;
                //                 errorMsg += String(amtArr[i]);
                //                 errorMsg += "元; ";
                //             }
                //
                //             return Promise.reject({name: "DataError", message: errorMsg})
                //         }
                //     }
                // }

                if (merchantType.merchants && topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    let isPassed = false;
                    let amtArr = [];

                    merchantType.merchants.forEach(merchant => {
                        if (merchant.name == topupRequest.merchantName && merchant.type == topupRequest.topupType && topupRequest.amount >= merchant.minDepositAmount && topupRequest.amount <= merchant.maxDepositAmount) {
                            isPassed = true;
                        }

                        if (merchant.name == topupRequest.merchantName && merchant.type == topupRequest.topupType) {
                            amtArr.push(merchant.minDepositAmount);
                            amtArr.push(merchant.maxDepositAmount);
                        }
                    });

                    if (!isPassed) {
                        let errorMsg = "暂时不支持您输入的金额，请填入";

                        for (let i = 0; i <= amtArr.length && Number.isFinite(amtArr[i]); i++) {
                            errorMsg += String(amtArr[i]);
                            errorMsg += "~";
                            i++;
                            errorMsg += String(amtArr[i]);
                            errorMsg += "元; ";
                        }

                        return Promise.reject({name: "DataError", message: errorMsg})
                    }
                }

                if (userAgent) {
                    userAgent = dbUtility.retrieveAgent(userAgent);
                }

                let proposalData = Object.assign({}, topupRequest);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                if( player.playerLevel ){
                    proposalData.playerLevel = player.playerLevel._id;
                }
                proposalData.loginDevice = player.loginDevice || null;
                proposalData.playerRealName = player.realName;
                proposalData.merchantGroupName = player.merchantGroup && player.merchantGroup.name || "";
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.bPMSGroup = Boolean(bPMSGroup);
                proposalData.creator = {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };
                // if (rewardEvent && rewardEvent._id) {
                //     proposalData.topUpReturnCode = rewardEvent.code;
                // }

                if (player && player.hasOwnProperty('loginDevice')){
                    proposalData.loginDevice = player.loginDevice
                }

                console.log("checking proposalData.userAgent for ANALYSIS_REPORT_ISSUE",  proposalData.userAgent)
                if (player.platform.topUpSystemType && topUpSystemConfig) {
                    proposalData.topUpSystemType = player.platform.topUpSystemType;
                    proposalData.topUpSystemName = topUpSystemConfig.name;
                } else if (!player.platform.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
                    Object.keys(extConfig).forEach(key => {
                        if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                            proposalData.topUpSystemType = Number(key);
                            proposalData.topUpSystemName = extConfig[key].name;
                        }
                    });
                }

                if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                    if (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN_GROUP || rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN){
                        proposalData.topUpReturnCode = rewardEvent.code;
                    }
                    else if (rewardEvent.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                        proposalData.retentionRewardCode = rewardEvent.code;
                        // delete the unrelated rewardEvent.code
                        if (proposalData.topUpReturnCode){
                            delete proposalData.topUpReturnCode;
                        }
                    }
                }

                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                    if (topupRequest.limitedOfferObjId)
                        proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                }

                if(lastLoginIp){
                    proposalData.lastLoginIp = lastLoginIp;
                }

                if(typeof proposalData.amount != "undefined"){
                    proposalData.amount = parseFloat(proposalData.amount);
                }

                newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType.CLIENT,
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false);
                return dbPropUtil.isLastTopUpProposalWithin30Mins(constProposalType.PLAYER_TOP_UP, player.platform._id, player);
            }
        ).then(
            lastTopUpProposal => {
                if(lastTopUpProposal && lastTopUpProposal.length > 0 && lastTopUpProposal[0].data){
                    if(lastTopUpProposal[0].data.lockedAdminId){
                        newProposal.data.lockedAdminId = lastTopUpProposal[0].data.lockedAdminId;
                    }

                    if(lastTopUpProposal[0].data.lockedAdminName){
                        newProposal.data.lockedAdminName = lastTopUpProposal[0].data.lockedAdminName;
                    }

                    if(lastTopUpProposal[0].data.followUpContent){
                        newProposal.data.followUpContent = lastTopUpProposal[0].data.followUpContent;
                    }

                    if(lastTopUpProposal[0].data.followUpCompletedTime){
                        newProposal.data.followUpCompletedTime = lastTopUpProposal[0].data.followUpCompletedTime;
                    }
                }

                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_TOP_UP, newProposal);

            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    let ip = player.lastLoginIp && player.lastLoginIp != 'undefined' ? player.lastLoginIp : "127.0.0.1";
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: player.realName ? player.realName.replace(/\s/g, '') : "",
                        ip: ip,
                        topupType: topupRequest.topupType,
                        merchantName: topupRequest.merchantName,
                        amount: topupRequest.amount,
                        //merchantUseType: merchantUseType,
                        clientType: clientType,
                        fpmsTime: proposalData.createTime.getTime()
                    };
                    // console.log("requestData:", requestData);
                    let groupMerchantList = dbPlayerTopUpRecord.isMerchantValid(player.merchantGroup.merchantNames, merchantGroupList, topupRequest.topupType, clientType);
                    // if (groupMerchantList.length > 0 || bPMSGroup) {
                    //     if(!bPMSGroup){
                    //         requestData.groupMerchantList = groupMerchantList;
                    //     }
                    //     else{
                    //         requestData.groupMerchantList = [];
                    //     }
                    //     return pmsAPI.payment_requestOnlineMerchant(requestData);
                    // }
                    if (topupRequest && topupRequest.merchantName) {
                        return RESTUtils.getPMS2Services("postCreateOnlineTopup", requestData, player.platform.topUpSystemType);
                    } else {
                        let errorMsg = "No Any MerchantNo Are Available, Please Change TopUp Method";
                        updateProposalRemark(proposalData, localization.localization.translate(errorMsg)).catch(errorUtils.reportError);
                        return Q.reject({
                            name: "DataError",
                            message: errorMsg,
                            error: Error()
                        });
                    }
                }
                else {
                    return Q.reject({
                        name: "DataError",
                        message: "Cannot create online top up proposal",
                        error: Error()
                    });
                }
            }
            //err => Q.reject({name: "DBError", message: 'Error in creating online top up proposal', error: err})
        ).then(
            merchantResponseData => {
                if (merchantResponseData) {

                    merchantResult = merchantResponseData;
                    merchantResponse = merchantResponseData;

                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (merchantResponseData.result && merchantResponseData.result.merchantNo) {
                        queryObj['data.merchantNo'] = {'$in': [String(merchantResponseData.result.merchantNo), Number(merchantResponseData.result.merchantNo)]}
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        queryObj["data.topUpSystemName"] = topUpSystemConfig.name;
                    } else {
                        if (!queryObj.$and) {
                            queryObj.$and = [];
                        }

                        queryObj.$and.push({$or: [{"data.topUpSystemName": {$ne: 'PMS2'}}, {"data.topUpSystemName": {$exists: false}}]});
                    }
                    // calculate this card/acc total usage at today
                    return dbconfig.collection_proposal.aggregate(
                        {$match: queryObj},
                        {
                            $group: {
                                _id: null,
                                totalAmount: {$sum: "$data.amount"},
                            }
                        })

                    // console.log("merchantResponseData", merchantResponseData);

                    //add request data to proposal and update proposal status to pending
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "APIError",
                        message: "Cannot create online top up request",
                        error: Error()
                    });
                }
            },
            err => {
                updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                return Promise.reject(err);
            }
        ).then(
            res => {
                var updateData = {
                    status: constProposalStatus.PENDING
                };
                let merchantName = merchantResponse.result ? merchantResponse.result.merchantName : "";
                let getRateProm = Promise.resolve(false);
                let sysCustomMerchantRateProm = Promise.resolve();

                updateData.data = Object.assign({}, proposal.data);
                // updateData.data.requestId = merchantResponse.result ? merchantResponse.result.requestId : "";
                updateData.data.merchantNo = merchantResponse.result ? merchantResponse.result.merchantNo : "";
                updateData.data.merchantName = merchantResponse.result ? merchantResponse.result.merchantName : "";
                if (res[0]) {
                    updateData.data.cardQuota = res[0].totalAmount;
                }
                if (merchantResponse.result && merchantResponse.result.revisedAmount) {
                    updateData.data.inputAmount = topupRequest.amount;
                    updateData.data.amount = merchantResponse.result.revisedAmount;
                }

                if(updateData.data.merchantNo && player.platform._id && merchantName != ""){
                    getRateProm = getMerchantRate(updateData.data.merchantNo , player.platform.platformId, merchantName);
                    sysCustomMerchantRateProm = dbconfig.collection_platform.findOne({_id: player.platform._id}, {pmsServiceCharge: 1, fpmsServiceCharge: 1}).lean();
                }

                return Promise.all([getRateProm, sysCustomMerchantRateProm]).then(
                    ([merchantRate, sysCustomMerchantRate]) => {
                        serviceCharge = merchantRate && merchantRate.customizeRate ? merchantRate.customizeRate : 0;
                        updateData.data.rate = merchantRate && merchantRate.customizeRate ? merchantRate.customizeRate : 0;
                        updateData.data.actualAmountReceived = merchantRate && merchantRate.customizeRate ?
                            (Number(topupRequest.amount) - Number(topupRequest.amount) * Number(merchantRate.customizeRate)).toFixed(2)
                            : topupRequest.amount;

                        // use system custom rate when there is pms's rate greater than system setting and no customizeRate
                        if (merchantRate && !merchantRate.customizeRate && merchantRate.rate
                            && sysCustomMerchantRate && sysCustomMerchantRate.pmsServiceCharge && sysCustomMerchantRate.fpmsServiceCharge
                            && (merchantRate.rate > sysCustomMerchantRate.pmsServiceCharge)) {
                            updateData.data.rate = sysCustomMerchantRate.fpmsServiceCharge;
                            updateData.data.actualAmountReceived = (Number(topupRequest.amount) - Number(topupRequest.amount) * Number(sysCustomMerchantRate.fpmsServiceCharge)).toFixed(2);
                        }

                        return updateData;
                    }
                )
            }
        ).then(
            updateData => {
                let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                // updateOnlineTopUpProposalDailyLimit(proposalQuery, merchantResponse.result.merchantNo).catch(errorUtils.reportError);
                updateOnlineTopUpProposalDailyLimit(proposalQuery, merchantResponse.result.merchantName, player.platform.topUpSystemType).catch(errorUtils.reportError);

                let checkProposalStatus = Promise.resolve();
                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                    // to check if proposal status already update to Success, sometimes PMS 2 update proposal status too fast
                    checkProposalStatus = dbconfig.collection_proposal.findOneAndUpdate(
                        {
                            _id: proposal._id,
                            createTime: proposal.createTime,
                            status: constProposalStatus.PREPENDING
                        },
                        {status: constProposalStatus.PENDING}).lean();
                } else {
                    updateData.status = constProposalStatus.PENDING;
                }

                return checkProposalStatus.then(
                    () => {
                        return dbconfig.collection_proposal.findOneAndUpdate(
                            proposalQuery,
                            updateData,
                            {new: true}
                        ).lean();
                    }
                );
            }
        ).then(
            proposalData => {
                return {
                    proposalId: proposalData.proposalId,
                    topupType: topupRequest.topupType,
                    amount: topupRequest.amount,
                    createTime: proposalData.createTime,
                    status: proposalData.status,
                    topupDetail: merchantResponse.result,
                    serviceCharge: serviceCharge
                    //requestId: merchantResponse.result.requestId,
                    //result: merchantResponse.result,
                };
            }
        );
        //     .catch(
        //     err => Q.reject({name: "DBError", message: 'Error performing online top up proposal', error: err})
        // );
    },
    isMerchantValid: function (playerMerchantNames, merchantGroup, topupType, clientType) {
        let availableMerchant = [];
        playerMerchantNames.forEach(name => {
            merchantGroup.merchants.forEach(item => {
                if (item.name == name && item.topupType == topupType && item.targetDevices == clientType) {
                    console.log(item);
                    availableMerchant.push(item.merchantNo);
                }
            })
        })
        return availableMerchant;
    },

    /**
     * add manual topup records of the player
     * @param playerID
     * @param inputData
     */
    addManualTopupRequest: function (userAgent, playerId, inputData, entryType, adminId, adminName, fromFPMS, bPMSGroup, topUpReturnCode, lastLoginIp, isPlayerAssign) {
        var player = null;
        var proposal = null;
        var request = null;
        let userAgentStr = userAgent;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment
        let newProposal;
        let proposalType;
        let topUpSystemConfig;

        if(isPlayerAssign){
            proposalType = constProposalType.PLAYER_ASSIGN_TOP_UP;
        }else{
            proposalType = constProposalType.PLAYER_MANUAL_TOP_UP;
        }

        if (inputData.bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbPlayerInfo.getManualTopupRequestList(playerId, isPlayerAssign).then(
            retData => {
                if (retData) {
                    return Q.reject({
                        status: constServerCode.PLAYER_PENDING_PROPOSAL,
                        name: "DataError",
                        errorMessage: "Player has pending manual topup request already."
                    });
                } else {
                    return dbconfig.collection_players.findOne({playerId: playerId})
                        .populate({path: "platform", model: dbconfig.collection_platform})
                        .populate({path: "bankCardGroup", model: dbconfig.collection_platformBankCardGroup})
                        .populate({path: "playerLevel", model: dbconfig.collection_playerLevel}).lean();
                }
            }
        ).then(
            playerData => {
                player = playerData;
                topUpSystemConfig = extConfig && player.platform.topUpSystemType && extConfig[player.platform.topUpSystemType];

                if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                    bPMSGroup = false;
                } else if (player && player.platform && player.platform.bankCardGroupIsPMS) {
                    bPMSGroup = true
                } else {
                    bPMSGroup = false;
                }
                if (player && player._id) {
                    if ((player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) ||
                        (player.platform && player.platform.isFPMSPaymentSystem)) {
                        isFPMS = true;
                    }

                    if (!topUpReturnCode) {
                        return Promise.resolve();
                    }

                    return dbRewardUtil.checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, inputData, constPlayerTopUpType.MANUAL);

                } else {
                    return Q.reject({
                        status: constServerCode.INVALID_DATA,
                        name: "DataError",
                        errorMessage: "Cannot find player"
                    });
                }
            }
        ).then(
            eventData => {
                rewardEvent = eventData;
                if (player){
                    return dbPlayerUtil.setPlayerState(player._id, "ManualTopUp");
                }
                else{
                    return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
                }
            }
        ).then(
            playerState => {
               if (playerState) {
                   if (player && player.platform && ((player.bankCardGroup && player.bankCardGroup.banks && player.bankCardGroup.banks.length > 0) || bPMSGroup || fromFPMS )) {
                       let limitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, inputData.amount, inputData.limitedOfferObjId);
                       let proms = [limitedOfferProm];

                       if (inputData.bonusCode) {
                           let bonusCodeCheckProm;
                           let isOpenPromoCode = inputData.bonusCode.toString().trim().length == 3 ? true : false;
                           if (isOpenPromoCode){
                               bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, inputData.bonusCode, inputData.amount, lastLoginIp);
                           }
                           else {
                               bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, inputData.bonusCode, inputData.amount);
                           }
                           proms.push(bonusCodeCheckProm)
                       }

                       return Promise.all(proms);
                   } else {
                       return Q.reject({
                           status: constServerCode.INVALID_DATA,
                           name: "DataError",
                           errorMessage: "Invalid player bankcard group data"
                       });
                   }
               }
               else{
                   return Promise.reject({name: "DataError", errorMessage: "Concurrent issue detected"});
               }
            }
        ).then(
            res => {
                let minTopUpAmount = player.platform.minTopUpAmount || 0;
                let limitedOfferTopUp = res[0];
                let bonusCodeValidity = res[1];

                if (inputData.bonusCode && !bonusCodeValidity) {
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "DataError",
                        errorMessage: "Wrong promo code has entered"
                    });
                }

                if (inputData.amount < minTopUpAmount && entryType != "ADMIN") {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Top up amount is not enough"
                    });
                }
                if (!player.permission || !player.permission.topupManual) {
                    return Q.reject({
                        status: constServerCode.PLAYER_NO_PERMISSION,
                        name: "DataError",
                        errorMessage: "Player does not have manual topup permission"
                    });
                }
                if (userAgent) {
                    userAgent = dbUtility.retrieveAgent(userAgent);
                }
                let proposalData = Object.assign({}, inputData);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.loginDevice = player.loginDevice || null;
                proposalData.platformId = player.platform._id;
                proposalData.playerLevel = player.playerLevel._id;
                proposalData.playerRealName = player.realName;
                proposalData.bankCardType = inputData.bankTypeId;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.depositMethod = inputData.depositMethod;
                proposalData.realName = inputData.realName;
                proposalData.remark = inputData.remark || "";
                proposalData.lastBankcardNo = inputData.lastBankcardNo || "";
                proposalData.bankCardGroupName = player.bankCardGroup && player.bankCardGroup.name || "";
                proposalData.depositTime = inputData.createTime || "";
                proposalData.inputData = inputData;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.bPMSGroup = Boolean(bPMSGroup);
                proposalData.bonusCode = inputData.bonusCode;
                // proposalData.topUpReturnCode = topUpReturnCode;
                proposalData.supportMode = inputData.supportMode;
                proposalData.creator = entryType == "ADMIN" ? {
                    type: 'admin',
                    name: adminName,
                    id: adminId
                } : {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };

                if (player.platform.topUpSystemType && topUpSystemConfig) {
                    proposalData.topUpSystemType = player.platform.topUpSystemType;
                    proposalData.topUpSystemName = topUpSystemConfig.name;
                } else if (!player.platform.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
                    Object.keys(extConfig).forEach(key => {
                        if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                            proposalData.topUpSystemType = Number(key);
                            proposalData.topUpSystemName = extConfig[key].name;
                        }
                    });
                }

                if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                    if (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN_GROUP || rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN){
                        proposalData.topUpReturnCode = rewardEvent.code;
                    }
                    else if (rewardEvent.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP ){
                        proposalData.retentionRewardCode = rewardEvent.code
                        // delete the unrelated rewardEvent.code
                        if (proposalData.topUpReturnCode){
                            delete proposalData.topUpReturnCode;
                        }
                    }
                }
                //
                // if (rewardEvent && rewardEvent._id) {
                //     proposalData.topUpReturnCode = rewardEvent.code;
                // }
                // Check Limited Offer Intention
                if (limitedOfferTopUp) {
                    proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                    proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                    if (inputData.limitedOfferObjId) {
                        proposalData.remark += '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                        proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                    }

                }

                if (lastLoginIp){
                    proposalData.lastLoginIp = lastLoginIp;
                }

                newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType[entryType],
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                let adminInfo = {};
                if(entryType == "ADMIN"){
                    adminInfo = {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    }
                }
                newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);//newProposal.isPartner
                return dbPropUtil.isLastTopUpProposalWithin30Mins(proposalType, player.platform._id, player);
            }
        ).then(
            lastTopUpProposal => {
                if(lastTopUpProposal && lastTopUpProposal.length > 0 && lastTopUpProposal[0].data){
                    if(lastTopUpProposal[0].data.lockedAdminId){
                        newProposal.data.lockedAdminId = lastTopUpProposal[0].data.lockedAdminId;
                    }

                    if(lastTopUpProposal[0].data.lockedAdminName){
                        newProposal.data.lockedAdminName = lastTopUpProposal[0].data.lockedAdminName;
                    }

                    if(lastTopUpProposal[0].data.followUpContent){
                        newProposal.data.followUpContent = lastTopUpProposal[0].data.followUpContent;
                    }

                    if(lastTopUpProposal[0].data.followUpCompletedTime){
                        newProposal.data.followUpCompletedTime = lastTopUpProposal[0].data.followUpCompletedTime;
                    }
                }

                console.log('rt - prop error check', newProposal);
                return dbProposal.createProposalWithTypeName(player.platform._id, proposalType, newProposal);
            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    var depositMethod = "";
                    switch (inputData.depositMethod) {
                        case 1:
                        case "1":
                            depositMethod = "网银转账";
                            break;
                        case 2:
                        case "2":
                            depositMethod = "ATM";
                            break;
                        case 3:
                        case "3":
                            depositMethod = "柜台存款";
                            break;
                        case 4:
                        case "4":
                            depositMethod = "支付宝转账";
                            break;
                        case 5:
                        case "5":
                            depositMethod = "微信转账";
                            break;
                        case 6:
                        case "6":
                            //云闪付
                            depositMethod = "云闪付转账";
                            break;
                        case 7:
                        case "7":
                            depositMethod = "CloudFlashPayTransfer";
                        default:
                            break;
                    }
                    var requestData = {
                        proposalId: proposalData.proposalId,
                        platformId: player.platform.platformId,
                        userName: player.name,
                        realName: inputData.realName || player.realName || "",
                        amount: inputData.amount,
                        ip: player.lastLoginIp || "127.0.0.1",
                        depositMethod: depositMethod,
                        bankTypeId: inputData.bankTypeId,
                        bankCardNo: inputData.lastBankcardNo || "",
                        provinceId: inputData.provinceId || "",
                        cityId: inputData.cityId,
                        districtId: inputData.districtId || "",
                        //groupBankcardList: (player.bankCardGroup && !bPMSGroup) ? player.bankCardGroup.banks : [],
                        operateType: entryType == "ADMIN" ? 1 : 0,
                        remark: inputData.remark || '',
                        createTime: proposalData.createTime.getTime()
                    };
                    requestData.realName = requestData.realName.replace(/\s/g, '');
                    if (!bPMSGroup || isFPMS) {
                        requestData.groupBankcardList = player.bankCardGroup ? player.bankCardGroup.banks : [];
                    }
                    if( inputData.supportMode ){
                        requestData.supportMode = inputData.supportMode;
                    }
                    if( inputData.orderNo ){
                        requestData.orderNo = inputData.orderNo;
                    }
                    if (fromFPMS) {
                        let cTime = inputData.createTime ? new Date(inputData.createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        requestData.depositTime = cTimeString || "";
                        requestData.groupBankcardList = inputData.groupBankcardList;
                    }
                    // console.log("requestData", requestData);
                    if (isFPMS) {
                        return dbPlayerTopUpRecord.manualTopUpValidate(requestData, fromFPMS);
                    } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
                        delete requestData.groupBankcardList;
                        delete requestData.bankTypeId;

                        return RESTUtils.getPMS2Services("postCreateTopup", requestData, player.platform.topUpSystemType).then(
                            manualTopUpCardData => {
                                if (manualTopUpCardData && manualTopUpCardData.result && manualTopUpCardData.result.bankTypeId) {
                                    return RESTUtils.getPMS2Services("postBankType", {bankTypeId: manualTopUpCardData.result.bankTypeId}, player.platform.topUpSystemType).then(
                                        bankData => {
                                            if (bankData && bankData.data && bankData.data.name) {
                                                manualTopUpCardData.result.bankName = bankData.data.name;
                                            } else {
                                                manualTopUpCardData.result.bankName = "";
                                            }
                                            return manualTopUpCardData;
                                        }
                                    )
                                } else {
                                    return Q.reject({
                                        status: constServerCode.INVALID_DATA,
                                        name: "DataError",
                                        errorMessage: "Bank card not found"
                                    });
                                }
                            }
                        );
                    }
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "DataError",
                        errorMessage: "Cannot create manual top up proposal"
                    });
                }
            }
        ).then(
            topupResult => {

                if (topupResult && topupResult.result) {
                    request = topupResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (topupResult.result.bankCardNo) {
                        queryObj['data.bankCardNo'] = {'$in': [String(topupResult.result.bankCardNo), Number(topupResult.result.bankCardNo)]};
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    let quotaUsedProm;
                    if (isFPMS && topupResult.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  topupResult.result.quotaUsed}]);
                    } else {
                        if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                            queryObj["data.topUpSystemName"] = topUpSystemConfig.name;
                        } else {
                            if (!queryObj.$and) {
                                queryObj.$and = [];
                            }

                            queryObj.$and.push({$or: [{"data.topUpSystemName": {$ne: 'PMS2'}}, {"data.topUpSystemName": {$exists: false}}]});
                        }

                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                }
                else {
                    return Q.reject({
                        status: constServerCode.PLAYER_TOP_UP_FAIL,
                        name: "APIError",
                        errorMessage: "Cannot create manual top up request"
                    });
                }
            },
            err => {
                updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                return Promise.reject(err);
            }
        ).then(
            resultData => {
                if (resultData) {
                    //add request data to proposal and update proposal status to pending

                    var updateData = {
                        // status: constProposalStatus.PENDING
                    };
                    updateData.data = Object.assign({}, proposal.data);
                    updateData.data.requestId = request.result.requestId;
                    updateData.data.validTime = new Date(request.result.validTime);
                    updateData.data.proposalId = proposal.proposalId;
                    updateData.data.bankCardNo = request.result.bankCardNo;
                    updateData.data.cardOwner = request.result.cardOwner;
                    updateData.data.bankTypeId = request.result.bankTypeId;
                    updateData.data.bankName = request.result.bankName;
                    updateData.data.resultData = request.result;
                    updateData.data.cardQuota = 0;
                    if (request.result && request.result.changeAmount) {
                        updateData.data.inputAmount = inputData.amount;
                        updateData.data.amount = request.result.changeAmount;
                    }

                    if (resultData[0]) {
                        updateData.data.cardQuota = resultData[0].totalAmount || 0;
                    }

                    if (isFPMS && proposal.noSteps) {
                        updateData.status = constProposalStatus.APPROVED;
                    }

                    let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                    updateManualTopUpProposalBankLimit(proposalQuery, request.result.bankCardNo, isFPMS, player.platform.platformId, topUpSystemConfig, player.platform.topUpSystemType).catch(errorUtils.reportError);

                    let checkProposalStatus = Promise.resolve();
                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                        // to check if proposal status already update to Success, sometimes PMS 2 update proposal status too fast
                        checkProposalStatus = dbconfig.collection_proposal.findOneAndUpdate(
                            {
                                _id: proposal._id,
                                createTime: proposal.createTime,
                                status: constProposalStatus.PREPENDING
                            },
                            {status: constProposalStatus.PENDING}).lean();
                    } else {
                        updateData.status = constProposalStatus.PENDING;
                    }

                    return checkProposalStatus.then(
                        () => {
                            return dbconfig.collection_proposal.findOneAndUpdate(
                                proposalQuery,
                                updateData,
                                {new: true}
                            ).lean();
                        }
                    )
                }
            }
        ).then(
            data => {
                if (isFPMS) {
                    if (data.noSteps) {
                        dbconfig.collection_proposalType.findOne({
                            platformId: player.platform._id,
                            name: proposalType
                        }).then(
                            proposalTypeData => {
                                if (!proposalTypeData) {
                                    return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                }
                                proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                            }
                        ).catch(errorUtils.reportError);
                    }
                    //update bank daily quota
                    dbconfig.collection_platformBankCardList.findOneAndUpdate(
                        {
                            accountNumber: request.result.bankCardNo,
                            platformId: player.platform.platformId
                        },
                        {
                            $inc: {quotaUsed: inputData.amount}
                        }
                    ).catch(errorUtils.reportError);
                }

                return {
                    proposalId: data.proposalId,
                    requestId: request.result.requestId,
                    status: data.status,
                    result: request.result,
                    inputData: inputData,
                    restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
                };
            }
        );
    },

    wechatpayTopUpValidate: (requestData, wechatpayAccount) => {
        let queryData = {
            platformId: requestData.platformId,
            state: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupWechatList},
            $or: [{singleLimit: {$gte: requestData.amount}}, {singleLimit: {$exists: false}}, {singleLimit: 0}]
        }

        if (wechatpayAccount) {
            queryData.state = {$in: ["NORMAL", "LOCK"]};
        }

        return dbconfig.collection_platformWechatPayList.find(queryData).lean().then(
            wechatpayListData => {
                if (!(wechatpayListData && wechatpayListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available wechatpay'});
                }
                let selectedWechatpay;

                let filteredWechatpay = wechatpayListData.filter(item => {
                    if (!item.quota || !item.quotaUsed) {
                        return true;
                    }
                    return item.quotaUsed < item.quota
                });

                if (filteredWechatpay.length) {
                    wechatpayListData = wechatpayListData.sort(function (a, b) {
                        return a.quotaUsed - b.quotaUsed;
                    });
                    selectedWechatpay = wechatpayListData[0];
                }


                if (!selectedWechatpay) {
                    return Promise.reject({name: "DBError", message: 'Currently no available wechatpay'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        name: selectedWechatpay.name,
                        nickname: selectedWechatpay.nickName,
                        weChatAccount: selectedWechatpay.accountNumber,
                        weChatQRCode: "",
                        quotaUsed: selectedWechatpay.quotaUsed
                    }
                }
            }
        )
    },

    alipayTopUpValidate: (requestData, alipayAccount) => {

        let queryData = {
            platformId: requestData.platformId,
            state: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupAlipayList},
            $or: [{singleLimit: {$gte: requestData.amount}}, {singleLimit: {$exists: false}}, {singleLimit: 0}]
        }

        if (alipayAccount) {
            queryData.state = {$in: ["NORMAL", "LOCK"]};
        }

        return dbconfig.collection_platformAlipayList.find(queryData).lean().then(
            alipayListData => {
                if (!(alipayListData && alipayListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available alipay'});
                }
                let selectedAlipay;

                let filteredAlipay = alipayListData.filter(item => {
                    if (!item.quota || !item.quotaUsed) {
                        return true;
                    }
                    return item.quotaUsed < item.quota
                });

                if (filteredAlipay.length) {
                    alipayListData = alipayListData.sort(function (a, b) {
                        return a.quotaUsed - b.quotaUsed;
                    });
                    selectedAlipay = alipayListData[0];
                }


                if (!selectedAlipay) {
                    return Promise.reject({name: "DBError", message: 'Currently no available alipay'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        alipayName: selectedAlipay.name,
                        alipayAccount: selectedAlipay.accountNumber,
                        alipayQRCode: "",
                        qrcodeAddress: "",
                        quotaUsed: selectedAlipay.quotaUsed
                    }
                }
            }
        )
    },

    manualTopUpValidate: (requestData, fromFPMS) => {
        let queryData = {
            platformId: requestData.platformId,
            status: "NORMAL",
            isFPMS: true,
            accountNumber: {$in: requestData.groupBankcardList}
        }
        if (fromFPMS) {
            queryData.status = {$in: ["NORMAL", "LOCK"]};
        }
        if (requestData.bankCardNo) {
            queryData.accountNumber = {$regex: requestData.bankCardNo + "$"};
        }

        return dbconfig.collection_platformBankCardList.find(queryData).lean().then(
            bankCardListData => {
                if (!(bankCardListData && bankCardListData.length)) {
                    return Promise.reject({name: "DBError", message: 'Currently no available bank card'});
                }
                let selectedBankCard;
                let isInGroup = false;

                if (!fromFPMS && requestData.bankCardNo) {
                    for (let i = 0; i < bankCardListData.length; i++) {
                        if (requestData.groupBankcardList.indexOf(bankCardListData[i].accountNumber) > -1) {
                            isInGroup = true;
                            break;
                        }
                    }
                } else {
                    isInGroup = true;
                }

                if (isInGroup) {
                    let filteredBank = bankCardListData.filter(item => {
                        if (!item.quota || !item.quotaUsed) {
                            return true;
                        }
                        return item.quotaUsed < item.quota
                    });
                    if (filteredBank.length) {
                        bankCardListData = bankCardListData.sort(function (a, b) {
                            return a.quotaUsed - b.quotaUsed;
                        });
                        selectedBankCard = bankCardListData[0];
                    }
                }

                if (!selectedBankCard) {
                    return Promise.reject({name: "DBError", message: 'Currently no available bank card'});
                }

                let validTime = new Date();
                validTime = validTime.setMinutes(validTime.getMinutes() + 30);

                return {
                    result: {
                        validTime: validTime,
                        requestId: "",
                        cardOwner: selectedBankCard.name,
                        bankCardNo: selectedBankCard.accountNumber,
                        bankTypeId: selectedBankCard.bankTypeId,
                        quotaUsed: selectedBankCard.quotaUsed
                    }
                }
            }
        )
    },

    getCashRechargeStatus: playerId => {
        let playerObj;

        return dbconfig.collection_players.findOne({
            playerId: playerId
        }).populate({
            path: "platform",
            model: dbconfig.collection_platform
        }).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;

                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerObj.platform._id,
                        name: constProposalType.PLAYER_MANUAL_TOP_UP
                    }).lean();
                }
            }
        ).then(
            propTypeData => {
                if (propTypeData) {
                    return dbconfig.collection_proposal.findOne({
                        "data.platformId": playerObj.platform._id,
                        "data.playerObjId": playerObj._id,
                        "data.validTime": {$gt: new Date()},
                        type: propTypeData._id
                    }).sort({settleTime: -1}).lean();
                }
            }
        ).then(
            res => {
                if (res) {
                    let retData = {
                        proposalId: res.proposalId,
                        requestId: res.data.requestId,
                        status: res.status,
                        result: res.data.resultData,
                        inputData: res.data.inputData,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(res.data.validTime).getTime()) / 1000))
                    };

                    if (res.status == constProposalStatus.APPROVED || res.status == constProposalStatus.SUCCESS) {
                        if (!res.data.isViewedByFrontEnd) {
                            return dbconfig.collection_proposal.findOneAndUpdate({
                                _id: res._id,
                                createTime: res.createTime
                            }, {
                                "data.isViewedByFrontEnd": true
                            }).then(
                                res => retData
                            );
                        }
                    } else if (res.status == constProposalStatus.PENDING) {
                        return retData;
                    }
                }
            }
        )
    },

    cancelManualTopupRequest: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.topUpSystemType
                        && proposalData.data.topUpSystemName) {
                        proposal = proposalData;

                        let data = {
                            proposalId: proposalId
                        };

                        return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType);
                    }
                    else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
            }
        ).then(
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelAlipayTopup: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.topUpSystemType
                        && proposalData.data.topUpSystemName) {
                        proposal = proposalData;

                        let data = {
                            proposalId: proposalId
                        };

                        return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType);
                    } else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
            }
        ).then(
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    cancelWechatTopup: function (playerId, proposalId, adminName) {
        var proposal = null;
        let cancelTime = new Date();
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.topUpSystemType
                        && proposalData.data.topUpSystemName) {
                        proposal = proposalData;

                        let data = {
                            proposalId: proposalId
                        };

                        return RESTUtils.getPMS2Services("postCancelTopup", data, proposalData.data.topUpSystemType);
                    } else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            request => {
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
            },
            error => {
                if (adminName && error.status == 408) {
                    return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true);
                }
                else {
                    return Q.reject(error);
                }
            }
        ).then(
            data => {
                if (proposal) {
                    let cancelBy = adminName ? "客服:" + adminName : "玩家：" + proposal.data.playerName;
                    return dbconfig.collection_proposal.findOneAndUpdate(
                        {_id: proposal._id, createTime: proposal.createTime},
                        {"data.cancelBy": cancelBy, "settleTime": cancelTime}
                    );
                }
            }
        ).then(
            data => ({proposalId: proposalId})
        );
    },

    delayManualTopupRequest: function (playerId, proposalId, delayTime) {
        var proposal = null;
        return dbconfig.collection_proposal.findOne({proposalId: proposalId}).then(
            proposalData => {
                if (proposalData) {
                    if (proposalData.data && proposalData.data.playerId == playerId && proposalData.data.topUpSystemType
                        && proposalData.data.topUpSystemName) {
                        proposal = proposalData;

                        let data = {
                            proposalId: proposalId,
                            delayTime: delayTime
                        };

                        return RESTUtils.getPMS2Services("postDelayTopup", data, proposalData.data.topUpSystemType);
                    } else {
                        return Q.reject({name: "DBError", message: 'Invalid proposal'});
                    }
                }
                else {
                    return Q.reject({name: "DBError", message: 'Cannot find proposal'});
                }
            }
        ).then(
            data => {
                if (data) {
                    return dbconfig.collection_proposal.findOne({_id: proposal._id}).then(
                        proposalData => {
                            if (proposalData && proposalData._id) {
                                let newDelayTime = new Date(proposalData.data.validTime.getTime() + 60 * delayTime * 1000);
                                let updateData = {
                                    "data.validTime": newDelayTime
                                }

                                if (proposalData && proposalData.status === constProposalStatus.EXPIRED) {
                                    updateData.status = constProposalStatus.PENDING;
                                }

                                return dbconfig.collection_proposal.update(
                                    {
                                        _id: proposalData._id
                                    }, updateData).exec().then(
                                        data => {
                                            if (data) {
                                                return {proposalId: proposalId, delayTime: delayTime, newValidTime: newDelayTime};
                                            }
                                        }
                                    );
                            }
                        }
                    );
                }
            }
        );
    },

    getTopUpTotalAmountForAllPlatform: function (startTime, endTime, platform) {
        let matchObj = {
            createTime: {$gte: startTime, $lt: endTime},
        };

        if (platform !== 'all') {
            matchObj.platformId = platform
        }

        return dbconfig.collection_playerTopUpRecord.aggregate(
            {
                $match: matchObj
            },
            {
                $group: {
                    _id: "$platformId",
                    totalAmount: {$sum: "$amount"}
                }
            }
        ).read("secondaryPreferred").allowDiskUse(true).exec().then(
            function (data) {
                return dbconfig.collection_platform.populate(data, {path: '_id'})
            }
        );
    },

    /**
     * Get the topup history of the player
     * @param playerID
     * @param topUpType
     * @param startTime
     * @param endTime
     * @param index
     * @param count
     * @param sort
     */
    getPlayerTopUpHistory: function (playerId, topUpType, startTime, endTime, index, count, sort, status) {
        var seq = sort ? -1 : 1;
        var playerData = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            function (data) {
                if (data) {
                    playerData = data;
                    //get online top up and manual top up proposal type
                    var queryObj = {
                        platformId: data.platform
                    };
                    if (topUpType) {
                        switch (parseInt(topUpType)) {
                            case constPlayerTopUpType.ONLINE:
                                queryObj.name = constProposalType.PLAYER_TOP_UP;
                                break;
                            case constPlayerTopUpType.MANUAL:
                                queryObj.name = constProposalType.PLAYER_MANUAL_TOP_UP;
                                break;
                            case constPlayerTopUpType.ALIPAY:
                                queryObj.name = constProposalType.PLAYER_ALIPAY_TOP_UP;
                                break;
                            case constPlayerTopUpType.WECHAT:
                                queryObj.name = constProposalType.PLAYER_WECHAT_TOP_UP;
                                break;
                            default:
                                queryObj.name = constProposalType.PLAYER_TOP_UP;
                                break;
                        }
                    }
                    else {
                        queryObj.name = {
                            $in: [constProposalType.PLAYER_MANUAL_TOP_UP, constProposalType.PLAYER_TOP_UP,
                                constProposalType.PLAYER_ALIPAY_TOP_UP, constProposalType.PLAYER_WECHAT_TOP_UP]
                        };
                    }
                    return dbconfig.collection_proposalType.find(queryObj).lean();
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player data", error: error});
            }
        ).then(
            function (proposalTypes) {
                if (proposalTypes && proposalTypes.length > 0) {
                    var queryObj = {
                        "data.playerObjId": playerData._id,
                        type: {$in: proposalTypes.map(type => type._id)}
                        //status: status || constProposalStatus.SUCCESS
                    };
                    if (status) {
                        queryObj.status = status;
                    }
                    else {
                        queryObj.status = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    }
                    if (startTime || endTime) {
                        queryObj.createTime = {};
                    }
                    if (startTime) {
                        queryObj.createTime["$gte"] = new Date(startTime);
                    }
                    if (endTime) {
                        queryObj.createTime["$lt"] = new Date(endTime);
                    }
                    var countProm = dbconfig.collection_proposal.find(queryObj).count();
                    var recordProm = dbconfig.collection_proposal.find(queryObj)
                        .populate({path: "type", model: dbconfig.collection_proposalType})
                        .skip(index).limit(count).sort({createTime: seq}).lean();
                    return Q.all([recordProm, countProm]);
                }
                else {
                    return Q.reject({name: "DataError", message: "Can't find top up proposal types"});
                }
            },
            function (error) {
                return Q.reject({name: "DBError", message: "Error in getting proposal type", error: error});
            }
        ).then(
            function (data) {
                var totalAmount = 0;
                if (data && data[0] && data[0].length > 0) {
                    for (var i = 0; i < data[0].length; i++) {
                        var record = data[0][i];
                        switch (record.type.name) {
                            case constProposalType.PLAYER_MANUAL_TOP_UP:
                                record.type = 1;
                                break;
                            case constProposalType.PLAYER_TOP_UP:
                                record.type = 2;
                                break;
                            case constProposalType.PLAYER_ALIPAY_TOP_UP:
                                record.type = 3;
                                break;
                            case constProposalType.PLAYER_WECHAT_TOP_UP:
                                record.type = 4;
                                break;
                        }
                        //record.type = record.type.name == constProposalType.PLAYER_MANUAL_TOP_UP ? 1 : 2;
                        totalAmount += data[0][i].data ? Number(data[0][i].data.amount) : 0;
                    }
                }

                var stats = {
                    totalCount: data[1],
                    totalAmount: totalAmount,
                    startIndex: index,
                    requestCount: count
                };
                return {
                    stats: stats,
                    records: data[0]
                };
            }, function (error) {
                return Q.reject({name: "DBError", message: "Error in getting player topup history", error: error});
            }
        );
    },

    /**
     * Get the topup records that
     * @param playerId
     * @param period
     * @param index
     * @param count
     * @param sort
     */
    getValidFirstTopUpRecordList: function (playerId, period, index, count, sort) {
        var seq = sort ? -1 : 1;
        var player = null;
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            data => {
                if (data) {
                    player = data;
                    //skip the check here
                    // if (period == 1) {
                    //     return dbPlayerInfo.isValidForFirstTopUpReward(player._id, player.platform);
                    // } else if (period == 2 || period == 3) {
                    //     return dbPlayerInfo.isValidForFirstTopUpRewardPeriod(player, {periodType: (period - 1)});
                    // } else {
                    //     return Q.reject({name: "DataError", message: "Unhandled reward period data."})
                    // }
                    return true;
                }
                else {
                    return Q.reject({name: "DataError", message: "Can not find player"})
                }
            }
        ).then(
            isValid => {
                if (isValid) {
                    var startTime = 0;
                    if (period == 2) {
                        startTime = dbUtility.getCurrentWeekSGTime().startTime;
                    }
                    else if (period == 3) {
                        startTime = dbUtility.getCurrentMonthSGTIme().startTime;
                    }
                    return dbPlayerTopUpRecord.getPlayerTopUpList(playerId, null, startTime, null, index, count, sort, false, true);
                }
                else {
                    var stats = {
                        totalCount: 0,
                        totalAmount: 0,
                        startIndex: index,
                        requestCount: count
                    };
                    return {
                        stats: stats,
                        records: []
                    };
                }
            }
        )
    },

    /**
     * add alipay topup records of the player
     * @param playerId
     * @param amount
     * @param alipayName
     * @param alipayAccount
     * @param entryType
     * @param adminId
     * @param adminName
     */

    requestAlipayTopup: function (userAgent, playerId, amount, alipayName, alipayAccount, bonusCode, entryType, adminId, adminName,
                                  remark, createTime, realName, limitedOfferObjId, topUpReturnCode, bPMSGroup = false, lastLoginIp, fromFPMS, inputData) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment
        let newProposal;
        let topUpSystemConfig;

        if (bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).lean().then(
                playerData => {
                    player = playerData;
                    topUpSystemConfig = extConfig && player.platform.topUpSystemType && extConfig[player.platform.topUpSystemType];

                    if (fromFPMS) {
                        bPMSGroup = false
                    } else {
                        if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                            bPMSGroup = false;
                        } else if (player && player.platform && player.platform.aliPayGroupIsPMS) {
                            bPMSGroup = true
                        } else {
                            bPMSGroup = false;
                        }
                    }
                    if (player && player._id) {
                        if ((player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) ||
                            (player.platform && player.platform.isFPMSPaymentSystem)) {
                            isFPMS = true;
                        }

                        if (!topUpReturnCode) {
                            return Promise.resolve();
                        }

                        return dbRewardUtil.checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, {amount:amount}, constPlayerTopUpType.ALIPAY);

                    } else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            errorMessage: "Cannot find player"
                        });
                    }
                }
            ).then(
                eventData => {
                    rewardEvent = eventData;
                    if(player){
                        return dbPlayerUtil.setPlayerState(player._id, "AlipayTopUp")
                    }else{
                        return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                playerState => {
                    if(playerState){
                        if (
                            player
                            && player.platform
                            && (
                                player.platform.aliPayGroupIsPMS
                                || (
                                    player.alipayGroup
                                    && player.alipayGroup.alipays
                                    && player.alipayGroup.alipays.length > 0
                                ) ||
                                (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS'))
                            )
                        ) {
                            let limitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, amount, limitedOfferObjId);
                            let proms = [limitedOfferProm];

                            if (bonusCode) {
                                let bonusCodeCheckProm;
                                let isOpenPromoCode = bonusCode.toString().trim().length == 3 ? true : false;
                                if (isOpenPromoCode){
                                    bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, bonusCode, amount, lastLoginIp);
                                }
                                else {
                                    bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, bonusCode, amount);
                                }
                                proms.push(bonusCodeCheckProm)
                            }

                            return Promise.all(proms);
                        }
                        else {
                            return Promise.reject({name: "DataError", errorMessage: "Invalid player alipay group data"});
                        }
                    }else{
                        return Q.reject({name: "DataError", errorMessage: "Concurrent issue detected"});
                    }
                }
            )
            .then(
                res => {
                    let minTopUpAmount = player.platform.minTopUpAmount || 0;
                    let limitedOfferTopUp = res[0];
                    let bonusCodeValidity = res[1];

                    if (entryType === "ADMIN") {
                        minTopUpAmount = 1;
                    }
                    if (amount < minTopUpAmount && !adminId) {
                        return Q.reject({
                            status: constServerCode.PLAYER_TOP_UP_FAIL,
                            name: "DataError",
                            errorMessage: "Top up amount is not enough"
                        });
                    }
                    if (!player.permission || !player.permission.alipayTransaction) {
                        return Q.reject({
                            status: constServerCode.PLAYER_NO_PERMISSION,
                            name: "DataError",
                            errorMessage: "Player does not have this topup permission"
                        });
                    }
                    if (userAgent) {
                        userAgent = dbUtility.retrieveAgent(userAgent);
                    }

                    let proposalData = {};
                    proposalData.playerId = playerId;
                    proposalData.playerObjId = player._id;
                    proposalData.loginDevice = player.loginDevice || null;
                    proposalData.platformId = player.platform._id;
                    proposalData.playerLevel = player.playerLevel._id;
                    proposalData.playerRealName = player.realName;
                    proposalData.aliPayGroupName = player.alipayGroup && player.alipayGroup.name || "";
                    proposalData.platform = player.platform.platformId;
                    proposalData.playerName = player.name;
                    proposalData.realName = realName || player.realName;
                    proposalData.amount = Number(amount);
                    proposalData.alipayName = entryType == "ADMIN" ? remark : (alipayName || remark);
                    proposalData.alipayAccount = alipayAccount;
                    proposalData.remark = remark;
                    proposalData.userAgent = userAgent ? userAgent : '';
                    proposalData.bPMSGroup = Boolean(bPMSGroup);
                    if (createTime) {
                        proposalData.depositeTime = new Date(createTime);
                    }
                    if (bonusCode) {
                        if (bonusCodeValidity) {
                            proposalData.bonusCode = bonusCode;
                        }
                        else {
                            return Promise.reject({
                                status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                                name: "DataError",
                                errorMessage: "Wrong promo code has entered"
                            });
                        }
                    }
                    proposalData.creator = entryType === "ADMIN" ? {
                        type: 'admin',
                        name: adminName,
                        id: adminId
                    } : {
                        type: 'player',
                        name: player.name,
                        id: playerId
                    };
                    // if (rewardEvent && rewardEvent._id) {
                    //     proposalData.topUpReturnCode = rewardEvent.code;
                    // }

                    if (player.platform.topUpSystemType && topUpSystemConfig) {
                        proposalData.topUpSystemType = player.platform.topUpSystemType;
                        proposalData.topUpSystemName = topUpSystemConfig.name;
                    } else if (!player.platform.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
                        Object.keys(extConfig).forEach(key => {
                            if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                                proposalData.topUpSystemType = Number(key);
                                proposalData.topUpSystemName = extConfig[key].name;
                            }
                        });
                    }

                    if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                        if (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN_GROUP || rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN){
                            proposalData.topUpReturnCode = rewardEvent.code;
                        }
                        else if (rewardEvent.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                            proposalData.retentionRewardCode = rewardEvent.code;
                            // delete the unrelated rewardEvent.code
                            if (proposalData.topUpReturnCode){
                                delete proposalData.topUpReturnCode;
                            }
                        }
                    }

                    // Check Limited Offer Intention
                    if (limitedOfferTopUp) {
                        proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                        proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                        proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName;
                        if (limitedOfferObjId)
                            proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                    }

                    if(lastLoginIp){
                        proposalData.lastLoginIp = lastLoginIp;
                    }

                    newProposal = {
                        creator: proposalData.creator,
                        data: proposalData,
                        entryType: constProposalEntryType[entryType],
                        //createTime: createTime ? new Date(createTime) : new Date(),
                        userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                    };
                    let adminInfo = {};
                    if(entryType == "ADMIN"){
                        adminInfo = {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        }
                    }
                    newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);
                    return dbPropUtil.isLastTopUpProposalWithin30Mins(constProposalType.PLAYER_ALIPAY_TOP_UP, player.platform._id, player);
                }
            ).then(
                lastTopUpProposal => {
                    if(lastTopUpProposal && lastTopUpProposal.length > 0 && lastTopUpProposal[0].data){
                        if(lastTopUpProposal[0].data.lockedAdminId){
                            newProposal.data.lockedAdminId = lastTopUpProposal[0].data.lockedAdminId;
                        }

                        if(lastTopUpProposal[0].data.lockedAdminName){
                            newProposal.data.lockedAdminName = lastTopUpProposal[0].data.lockedAdminName;
                        }

                        if(lastTopUpProposal[0].data.followUpContent){
                            newProposal.data.followUpContent = lastTopUpProposal[0].data.followUpContent;
                        }

                        if(lastTopUpProposal[0].data.followUpCompletedTime){
                            newProposal.data.followUpCompletedTime = lastTopUpProposal[0].data.followUpCompletedTime;
                        }
                    }
                    return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_ALIPAY_TOP_UP, newProposal);
                })
            .then(
                proposalData => {
                    if (proposalData) {
                        proposal = proposalData;
                        let cTime = createTime ? new Date(createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        let requestData = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            userName: player.name,
                            ip: player.lastLoginIp || "127.0.0.1",
                            realName: realName || player.realName || "",
                            aliPayAccount: 1,
                            amount: amount,
                            groupAlipayList: player.alipayGroup ? player.alipayGroup.alipays : [],
                            remark: entryType == "ADMIN" ? remark : (alipayName || remark),
                            createTime: proposalData.createTime.getTime(),
                            operateType: entryType == "ADMIN" ? 1 : 0
                        };
                        requestData.realName = requestData.realName.replace(/\s/g, '');
                        if(!bPMSGroup || isFPMS){
                            if (alipayAccount) {
                                requestData.groupAlipayList = [alipayAccount];
                            }
                        }
                        else{
                            requestData.groupAlipayList = [];
                        }
                        if( inputData && inputData.orderNo ){
                            requestData.orderNo = inputData.orderNo;
                        }
                        // console.log("requestData", requestData);
                        if (isFPMS) {
                            return dbPlayerTopUpRecord.alipayTopUpValidate(requestData, alipayAccount);
                        } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
                            delete requestData.groupAlipayList;
                            delete requestData.aliPayAccount;

                            requestData.bankCardNo = inputData.alipayAccount;
                            requestData.depositMethod = constTopUpMethod.ALIPAY;
                            requestData.depositTime = cTimeString;

                            return RESTUtils.getPMS2Services("postCreateTopup", requestData, player.platform.topUpSystemType);
                        }
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create alipay top up proposal"});
                    }
                }
            ).then(
                pmsResult => {
                    pmsData = pmsResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (alipayAccount) {
                        if (pmsResult && pmsResult.result && pmsResult.result.alipayAccount) {
                            queryObj['data.alipayAccount'] = pmsResult.result.alipayAccount;
                        } else if (pmsResult && pmsResult.result && pmsResult.result.bankCardNo) {
                            queryObj['data.alipayAccount'] = pmsResult.result.bankCardNo;
                        }
                    } else if (alipayName) {
                        if (pmsResult && pmsResult.result && pmsResult.result.alipayName) {
                            queryObj['data.alipayName'] = pmsResult.result.alipayName;
                        } else if (pmsResult && pmsResult.result && pmsData.result.cardOwner) {
                            queryObj['data.alipayName'] = pmsResult.result.cardOwner;
                        }
                    } else {
                    }
                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    let quotaUsedProm;
                    if (isFPMS && pmsData.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  pmsData.result.quotaUsed}]);
                    } else {
                        if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                            queryObj["data.topUpSystemName"] = topUpSystemConfig.name;
                        } else {
                            if (!queryObj.$and) {
                                queryObj.$and = [];
                            }

                            queryObj.$and.push({$or: [{"data.topUpSystemName": {$ne: 'PMS2'}}, {"data.topUpSystemName": {$exists: false}}]});
                        }

                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                },
                err => {
                    updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                    return Promise.reject(err);
                }
            ).then(
                res => {
                    //console.log("request response", requestData);
                    if (pmsData && pmsData.result) {
                        request = pmsData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            //status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.userAlipayName = updateData.data.alipayName;
                        updateData.data.requestId = pmsData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;

                        if (pmsData.result.alipayAccount) {
                            updateData.data.alipayAccount = pmsData.result.alipayAccount;
                        } else if (pmsData.result.bankCardNo) {
                            updateData.data.alipayAccount = pmsData.result.bankCardNo;
                        }

                        if (pmsData.result.alipayName) {
                            updateData.data.alipayName = pmsData.result.alipayName;
                        } else if (pmsData.result.cardOwner) {
                            updateData.data.alipayName = pmsData.result.cardOwner;
                        }

                        pmsData.result.alipayQRCode = pmsData.result.alipayQRCode || "";

                        if (pmsData.result.alipayQRCode) {
                            updateData.data.alipayQRCode = pmsData.result.alipayQRCode;
                        }

                        if (pmsData.result.qrcodeAddress) {
                            updateData.data.qrcodeAddress = pmsData.result.qrcodeAddress;
                        } else if (pmsData.result.codeAddress) {
                            updateData.data.qrcodeAddress = pmsData.result.codeAddress;
                        }

                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount;
                        }
                        if (isFPMS && proposal.noSteps) {
                            updateData.status = constProposalStatus.APPROVED;
                        }

                        if (pmsData.result.line && pmsData.result.line) {
                            let lineNo = pmsData.result.line;
                            updateData.data.line = lineNo;
                            let remarkMsg = {
                                '2':[", 线路二：不匹配昵称、支付宝帐号", "线路二：不匹配昵称、支付宝帐号"],
                                '3':[", 网赚", "网赚"]
                            }
                            if (updateData && updateData.data && updateData.data.remark) {
                                updateData.data.remark += (remarkMsg[lineNo] && remarkMsg[lineNo][0]) ? remarkMsg[lineNo][0] : '';
                            } else {
                                updateData.data.remark = (remarkMsg[lineNo] && remarkMsg[lineNo][1] && lineNo!= "1") ? remarkMsg[lineNo][1] : '';
                            }
                        }
                        let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                        let alipayAcc;

                        if (pmsData.result.alipayAccount) {
                            alipayAcc = request.result.alipayAccount;
                        } else if (pmsData.result.bankCardNo) {
                            alipayAcc = request.result.bankCardNo;
                        }

                        updateAliPayTopUpProposalDailyLimit(proposalQuery, alipayAcc, isFPMS, player.platform.platformId, topUpSystemConfig, player.platform.topUpSystemType).catch(errorUtils.reportError);

                        let checkProposalStatus = Promise.resolve();
                        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                            // to check if proposal status already update to Success, sometimes PMS 2 update proposal status too fast
                            checkProposalStatus = dbconfig.collection_proposal.findOneAndUpdate(
                                {
                                    _id: proposal._id,
                                    createTime: proposal.createTime,
                                    status: constProposalStatus.PREPENDING
                                },
                                {status: constProposalStatus.PENDING}).lean();
                        } else {
                            updateData.status = constProposalStatus.PENDING;
                        }

                        return checkProposalStatus.then(
                            () => {
                                return dbconfig.collection_proposal.findOneAndUpdate(
                                    proposalQuery,
                                    updateData,
                                    {new: true}
                                );
                            }
                        )
                    }
                    else {
                        return Q.reject({name: "APIError", errorMessage: "Cannot create manual top up request"});
                    }
                }
            ).then(
                data => {
                    if (isFPMS) {
                        if (data.noSteps) {
                            dbconfig.collection_proposalType.findOne({
                                platformId: player.platform._id,
                                name: constProposalType.PLAYER_ALIPAY_TOP_UP
                            }).then(
                                proposalTypeData => {
                                    if (!proposalTypeData) {
                                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                    }
                                    proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                                }
                            ).catch(errorUtils.reportError);
                        }
                        //update alipay daily quota
                        dbconfig.collection_platformAlipayList.findOneAndUpdate(
                            {
                                accountNumber: request.result.alipayAccount,
                                platformId: player.platform.platformId
                            },
                            {
                                $inc: {quotaUsed: amount}
                            }
                        ).catch(errorUtils.reportError);
                    }
                    return {
                        proposalId: data.proposalId,
                        requestId: request.result.requestId,
                        status: data.status,
                        result: request.result,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
                    };
                }
            );
    },

    getValidTopUpRecordList: function (rewardInfo, playerId, playerObjId) {
        var rewardType = (rewardInfo && rewardInfo.type) ? rewardInfo.type.name : null;
        var period = (rewardInfo && rewardInfo.param) ? parseInt(rewardInfo.param.periodType) : 0;
        if (rewardType == "FirstTopUp") {
            return dbPlayerTopUpRecord.getValidFirstTopUpRecordList(playerId, period + 1, 0, constSystemParam.REPORT_MAX_RECORD_NUM, -1).then(data => {
                return data.records;
            })
        } else {
            return dbPlayerInfo.getPlayerTopUpRecords({playerId: playerObjId}, true)
        }
    },

    getPlayerWechatPayStatus: (playerId, bPMSGroup, userIp) => {
        let topUpSystemConfig;
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}).lean().then(
                playerData => {
                    if (playerData && playerData.permission && playerData.permission.disableWechatPay) {
                        return [];
                    }

                    topUpSystemConfig = extConfig && playerData.platform && playerData.platform.topUpSystemType && extConfig[playerData.platform.topUpSystemType];

                    if ((playerData && playerData.platform && playerData.wechatPayGroup && playerData.wechatPayGroup.wechats && playerData.wechatPayGroup.wechats.length > 0) || bPMSGroup
                        || (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'PMS')) {

                        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'PMS') {
                            bPMSGroup = false;
                        } else if (playerData.platform.wechatPayGroupIsPMS) {
                            bPMSGroup = true
                        } else {
                            bPMSGroup = false;
                        }
                        let prom;
                        let pmsQuery = {
                            platformId: playerData.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }

                        let platformData = playerData.platform;
                        if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                            prom = dbconfig.collection_platformWechatPayList.find({accountNumber: {$in: playerData.wechatPayGroup.wechats}, isFPMS: true}).lean().then(
                                wechatpayListData => {
                                    return {data: wechatpayListData}
                                }
                            )
                        } else {

                            // if (String(bPMSGroup) == "true") {
                            //     pmsQuery.ip = userIp;
                            //     pmsQuery.username = playerData.name;
                            //     prom = pmsAPI.foundation_requestWechatpayByUsername(pmsQuery);
                            // }
                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                let reqData = {
                                    platformId: playerData.platform.platformId,
                                    username: playerData.name,
                                    depositType: constAccountType.WECHAT
                                };

                                prom = RESTUtils.getPMS2Services("postDepositTypeByUsername", reqData, playerData.platform.topUpSystemType);
                            }
                            else {
                                let reqData = {
                                    platformId: playerData.platform.platformId,
                                    accountType: constAccountType.WECHAT
                                };

                                prom = RESTUtils.getPMS2Services("postBankCardList", reqData, playerData.platform.topUpSystemType);
                            }
                        }

                        return prom.then(
                            wechats => {
                                let bValid = false;
                                let maxDeposit = 0;
                                // if (String(bPMSGroup) == "true") {
                                //     if (wechats.data) {
                                //         if (!playerData.permission.disableWechatPay && wechats.data.valid) {
                                //             bValid = true;
                                //         }
                                //         if (wechats.data.hasOwnProperty("maxDepositAmount")) {
                                //             maxDeposit = wechats.data.maxDepositAmount;
                                //         }
                                //     }
                                // }
                                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                    if (wechats) {
                                        if (!playerData.permission.disableWechatPay && wechats.valid) {
                                            bValid = true;
                                        }
                                        if (wechats.hasOwnProperty("maxDepositAmount")) {
                                            maxDeposit = wechats.maxDepositAmount;
                                        }
                                    }
                                }
                                else {
                                    if (wechats.data && wechats.data.length > 0) {
                                        wechats.data.forEach(
                                            wechat => {
                                                playerData.wechatPayGroup.wechats.forEach(
                                                    pWechat => {
                                                        if (pWechat == wechat.accountNumber && wechat.state == "NORMAL") {
                                                            if (!playerData.permission.disableWechatPay) {
                                                                bValid = true;
                                                            }
                                                            maxDeposit = wechat.singleLimit > maxDeposit ? wechat.singleLimit : maxDeposit;
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                    }
                                }
                                if (bValid || maxDeposit > 0)
                                    bValid = {valid: bValid, maxDepositAmount: maxDeposit};
                                return bValid;
                            }
                        );
                    }
                    else {
                        return false;
                    }
                }
            )
    },

    getPlayerAliPayStatus: (playerId, bPMSGroup, userIp) => {
        let topUpSystemConfig;
        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "alipayGroup", model: dbconfig.collection_platformAlipayGroup}).then(
                playerData => {
                    if (playerData && playerData.permission && !playerData.permission.alipayTransaction) {
                        return [];
                    }

                    topUpSystemConfig = extConfig && playerData.platform && playerData.platform.topUpSystemType && extConfig[playerData.platform.topUpSystemType];

                    if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'PMS') {
                        bPMSGroup = false;
                    } else if (playerData && playerData.platform && playerData.platform.aliPayGroupIsPMS) {
                        bPMSGroup = true
                    } else {
                        bPMSGroup = false;
                    }

                    if ((playerData && playerData.platform && playerData.alipayGroup && playerData.alipayGroup.alipays && playerData.alipayGroup.alipays.length > 0) || bPMSGroup
                        || (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'PMS')) {
                        let aliPayProm;
                        let pmsQuery = {
                            platformId: playerData.platform.platformId,
                            queryId: serverInstance.getQueryId()
                        }

                        let platformData = playerData.platform;
                        if ((platformData.financialSettlement && platformData.financialSettlement.financialSettlementToggle) || platformData.isFPMSPaymentSystem) {
                            aliPayProm = dbconfig.collection_platformAlipayList.find({accountNumber: {$in: playerData.alipayGroup.alipays}, isFPMS: true}).lean().then(
                                alipayListData => {
                                    return {data: alipayListData}
                                }
                            )
                        } else {
                            // if (String(bPMSGroup) == "true") {
                            //     pmsQuery.ip = userIp;
                            //     pmsQuery.username = playerData.name;
                            //     aliPayProm = pmsAPI.foundation_requestAlipayByUsername(pmsQuery);
                            // }
                            if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                let reqData = {
                                    platformId: playerData.platform.platformId,
                                    username: playerData.name,
                                    depositType: constAccountType.ALIPAY
                                };

                                aliPayProm = RESTUtils.getPMS2Services("postDepositTypeByUsername", reqData, playerData.platform.topUpSystemType);
                            } else {
                                let reqData = {
                                    platformId: playerData.platform.platformId,
                                    accountType: constAccountType.ALIPAY
                                };

                                aliPayProm = RESTUtils.getPMS2Services("postBankCardList", reqData, playerData.platform.topUpSystemType);
                            }
                        }

                        let proposalQuery = {
                            'data.playerObjId': {$in: [ObjectId(playerData._id), String(playerData._id)]},
                            'data.platformId': {$in: [ObjectId(playerData.platform._id), String(playerData.platform._id)]}
                        };

                        let  proposalProm = dbconfig.collection_proposalType.findOne({
                            platformId: playerData.platform._id,
                            name: constProposalType.PLAYER_ALIPAY_TOP_UP
                        }).lean().then(
                            proposalType => {
                                proposalQuery.type = proposalType._id;
                                return dbconfig.collection_proposal.findOne(proposalQuery).sort({createTime: -1}).lean();
                            }
                        );
                        let promArr = [aliPayProm, proposalProm];
                        return Promise.all(promArr).then(
                            res => {
                                let alipays = res[0];
                                let aliProposal = res[1];
                                let bValid = false;
                                let maxDeposit = 0;
                                let minDeposit;

                                // if (String(bPMSGroup) == "true") {
                                //     if (alipays.data) {
                                //         if (playerData.permission.alipayTransaction && alipays.data.valid) {
                                //             bValid = true;
                                //         }
                                //         if (alipays.data.hasOwnProperty("maxDepositAmount")) {
                                //             maxDeposit = alipays.data.maxDepositAmount;
                                //         }
                                //         if (alipays.data.hasOwnProperty("minDepositAmount")) {
                                //             minDeposit = alipays.data.minDepositAmount;
                                //         }
                                //     }
                                // }
                                if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                                    if (alipays) {
                                        if (playerData.permission.alipayTransaction && alipays.valid) {
                                            bValid = true;
                                        }
                                        if (alipays.hasOwnProperty("maxDepositAmount")) {
                                            maxDeposit = alipays.maxDepositAmount;
                                        }
                                        if (alipays.hasOwnProperty("minDepositAmount")) {
                                            minDeposit = alipays.minDepositAmount;
                                        }
                                    }
                                }
                                else {
                                    if (alipays.data && alipays.data.length > 0) {
                                        alipays.data.forEach(
                                            alipay => {
                                                playerData.alipayGroup.alipays.forEach(
                                                    pAlipay => {
                                                        if (pAlipay == alipay.accountNumber && alipay.state == "NORMAL") {
                                                            if (playerData.permission.alipayTransaction) {
                                                                bValid = true;
                                                            }
                                                            maxDeposit = alipay.singleLimit > maxDeposit ? alipay.singleLimit : maxDeposit;
                                                            if (minDeposit == undefined) {
                                                                minDeposit = alipay.minDepositAmount;
                                                            }
                                                            minDeposit = alipay.minDepositAmount < minDeposit ? alipay.minDepositAmount : minDeposit;
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                    }
                                }
                                if (bValid || maxDeposit > 0) {
                                    bValid = {
                                        valid: bValid,
                                        maxDepositAmount: maxDeposit,
                                        minDepositAmount: minDeposit,
                                        lastNicknameOrAccount: aliProposal && aliProposal.data && aliProposal.data.userAlipayName? aliProposal.data.userAlipayName: ""
                                    };
                                }
                                return bValid;
                            }
                        );
                    }
                    else {
                        return false;
                    }
                }
            )
    },

    /**
     * add wechat topup records of the player
     * @param useQR
     * @param userAgent
     * @param playerId
     * @param amount
     * @param wechatName
     * @param wechatAccount
     * @param bonusCode
     * @param entryType
     * @param adminId
     * @param adminName
     * @param remark
     * @param createTime
     * @param limitedOfferObjId
     */

    requestWechatTopup: function (useQR, userAgent, playerId, amount, wechatName, wechatAccount, bonusCode, entryType, adminId, adminName,
                                  remark, createTime, limitedOfferObjId, topUpReturnCode, bPMSGroup = false, lastLoginIp, fromFPMS, inputData) {
        let userAgentStr = userAgent;
        let player = null;
        let proposal = null;
        let request = null;
        let pmsData = null;
        let rewardEvent;
        let isFPMS = false; // true - use FPMS to manage payment
        let newProposal;
        let topUpSystemConfig;

        if (bonusCode && topUpReturnCode) {
            return Q.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbconfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbconfig.collection_platform})
            .populate({path: "playerLevel", model: dbconfig.collection_playerLevel})
            .populate({path: "wechatPayGroup", model: dbconfig.collection_platformWechatPayGroup}
            ).lean().then(
                playerData => {
                    player = playerData;
                    topUpSystemConfig = extConfig && player.platform.topUpSystemType && extConfig[player.platform.topUpSystemType];

                    if (fromFPMS) {
                        bPMSGroup = false
                    } else {
                        if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                            bPMSGroup = false;
                        } else if (player && player.platform && player.platform.wechatPayGroupIsPMS) {
                            bPMSGroup = true
                        } else {
                            bPMSGroup = false;
                        }
                    }
                    if (player && player._id) {
                        if ((player.platform && player.platform.financialSettlement && player.platform.financialSettlement.financialSettlementToggle) ||
                            (player.platform && player.platform.isFPMSPaymentSystem)) {
                            isFPMS = true;
                        }

                        if (!topUpReturnCode) {
                            return Promise.resolve();
                        }

                        return dbRewardUtil.checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, {amount:amount}, constPlayerTopUpType.WECHAT);

                    } else {
                        return Q.reject({
                            status: constServerCode.INVALID_DATA,
                            name: "DataError",
                            errorMessage: "Cannot find player"
                        });
                    }
                }
            ).then(
                eventData => {
                    rewardEvent = eventData;
                    if (player) {
                        return dbPlayerUtil.setPlayerState(player._id, "WechatTopUp");
                    } else {
                        return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                playerState => {
                    if (playerState) {
                        let checkLimitedOfferProm = dbRewardUtil.checkLimitedOfferIntention(player.platform._id, player._id, amount, limitedOfferObjId);
                        let proms = [checkLimitedOfferProm];

                        if (bonusCode) {
                            let bonusCodeCheckProm;
                            let isOpenPromoCode = bonusCode.toString().trim().length == 3 ? true : false;
                            if (isOpenPromoCode){
                                bonusCodeCheckProm = dbPromoCode.isOpenPromoCodeValid(playerId, bonusCode, amount, lastLoginIp);
                            }
                            else {
                                bonusCodeCheckProm = dbPromoCode.isPromoCodeValid(playerId, bonusCode, amount);
                            }
                            proms.push(bonusCodeCheckProm)
                        }

                        return Promise.all(proms);
                    } else {
                        return Promise.reject({name: "DataError", errorMessage: "Concurrent issue detected"});
                    }
                }
            ).then(
                data => {
                    let limitedOfferTopUp = data[0];
                    let bonusCodeValidity = data[1];

                    if (player && player.platform && ((player.wechatPayGroup && player.wechatPayGroup.wechats && player.wechatPayGroup.wechats.length > 0) ||
                        (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')))) {
                        let minTopUpAmount = player.platform.minTopUpAmount || 0;
                        if (amount < minTopUpAmount && entryType != "ADMIN") {
                            return Q.reject({
                                status: constServerCode.PLAYER_TOP_UP_FAIL,
                                name: "DataError",
                                errorMessage: "Top up amount is not enough"
                            });
                        }

                        // Check player permission
                        if (!player.permission || player.permission.disableWechatPay) {
                            return Q.reject({
                                status: constServerCode.PLAYER_NO_PERMISSION,
                                name: "DataError",
                                errorMessage: "Player does not have this topup permission"
                            });
                        }
                        if (userAgent) {
                            userAgent = dbUtility.retrieveAgent(userAgent);
                        }
                        let proposalData = {};
                        proposalData.playerId = playerId;
                        proposalData.playerObjId = player._id;
                        proposalData.loginDevice = player.loginDevice || null;
                        proposalData.platformId = player.platform._id;
                        proposalData.playerLevel = player.playerLevel._id;
                        proposalData.playerRealName = player.realName;
                        proposalData.wechatPayGroupName = player.wechatPayGroup && player.wechatPayGroup.name || "";
                        proposalData.platform = player.platform.platformId;
                        proposalData.playerName = player.name;
                        proposalData.amount = Number(amount);
                        proposalData.wechatName = wechatName;
                        proposalData.wechatAccount = wechatAccount;
                        proposalData.remark = remark;
                        proposalData.userAgent = userAgent ? userAgent : "";
                        proposalData.bPMSGroup = Boolean(bPMSGroup);
                        if (createTime) {
                            proposalData.depositeTime = new Date(createTime);
                        }
                        if (bonusCode) {
                            if (bonusCodeValidity) {
                                proposalData.bonusCode = bonusCode;
                            }
                            else {
                                return Promise.reject({
                                    status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                                    name: "DataError",
                                    errorMessage: "Wrong promo code has entered"
                                });
                            }
                        }
                        proposalData.creator = entryType === "ADMIN" ? {
                            type: 'admin',
                            name: adminName,
                            id: adminId
                        } : {
                            type: 'player',
                            name: player.name,
                            id: playerId
                        };

                        if (player.platform.topUpSystemType && topUpSystemConfig) {
                            proposalData.topUpSystemType = player.platform.topUpSystemType;
                            proposalData.topUpSystemName = topUpSystemConfig.name;
                        } else if (!player.platform.topUpSystemType && extConfig && Object.keys(extConfig) && Object.keys(extConfig).length > 0) {
                            Object.keys(extConfig).forEach(key => {
                                if (key && extConfig[key] && extConfig[key].name && extConfig[key].name === 'PMS') {
                                    proposalData.topUpSystemType = Number(key);
                                    proposalData.topUpSystemName = extConfig[key].name;
                                }
                            });
                        }

                        if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                            if (rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN_GROUP || rewardEvent.type.name == constRewardType.PLAYER_TOP_UP_RETURN){
                                proposalData.topUpReturnCode = rewardEvent.code;
                            }
                            else if (rewardEvent.type.name == constRewardType.PLAYER_RETENTION_REWARD_GROUP){
                                proposalData.retentionRewardCode = rewardEvent.code;
                                // delete the unrelated rewardEvent.code
                                if (proposalData.topUpReturnCode){
                                    delete proposalData.topUpReturnCode;
                                }
                            }
                        }
                        // Check Limited Offer Intention
                        if (limitedOfferTopUp) {
                            proposalData.limitedOfferObjId = limitedOfferTopUp._id;
                            proposalData.expirationTime = limitedOfferTopUp.data.expirationTime;
                            proposalData.limitedOfferName = limitedOfferTopUp.data.limitedOfferName
                            if (limitedOfferObjId)
                                proposalData.remark = '优惠名称: ' + limitedOfferTopUp.data.limitedOfferName + ' (' + limitedOfferTopUp.proposalId + ')';
                        }

                        if(lastLoginIp){
                            proposalData.lastLoginIp = lastLoginIp;
                        }

                        newProposal = {
                            creator: proposalData.creator,
                            data: proposalData,
                            entryType: constProposalEntryType[entryType],
                            //createTime: createTime ? new Date(createTime) : new Date(),
                            userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                        };
                        let adminInfo = {};
                        if(entryType == "ADMIN"){
                            adminInfo = {
                                type: 'admin',
                                name: adminName,
                                id: adminId
                            }
                        }
                        newProposal.inputDevice = dbUtility.getInputDevice(userAgentStr, false, adminInfo);
                        return dbPropUtil.isLastTopUpProposalWithin30Mins(constProposalType.PLAYER_WECHAT_TOP_UP, player.platform._id, player);
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Invalid player data"});
                    }
                }
            ).then(
                lastTopUpProposal => {
                    if(lastTopUpProposal && lastTopUpProposal.length > 0 && lastTopUpProposal[0].data){
                        if(lastTopUpProposal[0].data.lockedAdminId){
                            newProposal.data.lockedAdminId = lastTopUpProposal[0].data.lockedAdminId;
                        }

                        if(lastTopUpProposal[0].data.lockedAdminName){
                            newProposal.data.lockedAdminName = lastTopUpProposal[0].data.lockedAdminName;
                        }

                        if(lastTopUpProposal[0].data.followUpContent){
                            newProposal.data.followUpContent = lastTopUpProposal[0].data.followUpContent;
                        }

                        if(lastTopUpProposal[0].data.followUpCompletedTime){
                            newProposal.data.followUpCompletedTime = lastTopUpProposal[0].data.followUpCompletedTime;
                        }
                    }

                    return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_WECHAT_TOP_UP, newProposal);

                }
            ).then(
                proposalData => {
                    if (proposalData) {
                        proposal = proposalData;
                        let cTime = createTime ? new Date(createTime) : new Date();
                        let cTimeString = moment(cTime).format("YYYY-MM-DD HH:mm:ss");
                        let requestData = {
                            proposalId: proposalData.proposalId,
                            platformId: player.platform.platformId,
                            userName: player.name,
                            realName: player.realName || "",
                            ip: player.lastLoginIp || "127.0.0.1",
                            aliPayAccount: 1,
                            amount: amount,
                            groupWechatList: player.wechatPayGroup ? player.wechatPayGroup.wechats : [],
                            // remark: remark || player.name,
                            createTime: proposalData.createTime.getTime(),
                            operateType: entryType == "ADMIN" ? 1 : 0
                        };
                        requestData.realName = requestData.realName.replace(/\s/g, '');
                        if (remark) {
                            requestData.remark = remark;
                        }
                        if(!bPMSGroup || isFPMS){
                            if (wechatAccount) {
                                requestData.groupWechatList = [wechatAccount];
                            }
                        }
                        else{
                            requestData.groupWechatList = [];
                        }
                        if( inputData && inputData.orderNo ){
                            requestData.orderNo = inputData.orderNo;
                        }
                        //console.log("requestData", requestData);
                        if (isFPMS) {
                            return dbPlayerTopUpRecord.wechatpayTopUpValidate(requestData, wechatAccount);
                        } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
                            delete requestData.groupWechatList;
                            delete requestData.aliPayAccount;

                            requestData.bankCardNo = inputData.wechatPayAccount;
                            requestData.depositMethod = constTopUpMethod.WECHAT;
                            requestData.depositTime = cTimeString;

                            return RESTUtils.getPMS2Services("postCreateTopup", requestData, player.platform.topUpSystemType);
                        }
                    }
                    else {
                        return Q.reject({name: "DataError", errorMessage: "Cannot create wechat top up proposal"});
                    }
                }
            ).then(
                pmsResult => {

                    pmsData = pmsResult;
                    var queryObj = {};
                    let start = new Date();
                    start.setHours(0, 0, 0, 0);
                    let end = new Date();
                    end.setHours(23, 59, 59, 999);
                    if (pmsData && pmsData.result && pmsData.result.weChatAccount) {
                        queryObj['$or'] = [
                            {'data.wechatAccount': pmsData.result.weChatAccount},
                            {'data.weChatAccount': pmsData.result.weChatAccount}
                        ]
                        if (pmsData.result.weChatAccount) {
                            queryObj['$or'] = [
                                {'data.wechatAccount': pmsData.result.weChatAccount},
                                {'data.weChatAccount': pmsData.result.weChatAccount}
                            ]
                        } else if (pmsResult.result.bankCardNo) {
                            queryObj['$or'] = [
                                {'data.wechatAccount': pmsData.result.bankCardNo},
                                {'data.weChatAccount': pmsData.result.bankCardNo}
                            ]
                        }
                    }
                    if (pmsData && pmsData.result && pmsData.result.weChatName) {
                        queryObj['$or'] = [
                            {'data.wechatName': pmsData.result.weChatName},
                            {'data.weChatName': pmsData.result.weChatName}
                        ]
                    }

                    queryObj['data.platformId'] = ObjectId(player.platform._id);
                    queryObj['mainType'] = 'TopUp';
                    queryObj["createTime"] = {};
                    queryObj["createTime"]["$gte"] = start;
                    queryObj["createTime"]["$lt"] = end;
                    queryObj["status"] = {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]};
                    let quotaUsedProm;
                    if (isFPMS && pmsData.result.hasOwnProperty("quotaUsed")) {
                        quotaUsedProm = Promise.resolve([{totalAmount:  pmsData.result.quotaUsed}]);
                    } else {
                        if (topUpSystemConfig && topUpSystemConfig.name && (topUpSystemConfig.name !== 'FPMS' || topUpSystemConfig.name !== 'PMS')) {
                            queryObj["data.topUpSystemName"] = topUpSystemConfig.name;
                        } else {
                            if (!queryObj.$and) {
                                queryObj.$and = [];
                            }

                            queryObj.$and.push({$or: [{"data.topUpSystemName": {$ne: 'PMS2'}}, {"data.topUpSystemName": {$exists: false}}]});
                        }

                        quotaUsedProm = dbconfig.collection_proposal.aggregate(
                            {$match: queryObj},
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: {$sum: "$data.amount"},
                                }
                            })
                    }
                    return quotaUsedProm;
                },
                err => {
                    updateProposalRemark(proposal, err.errorMessage).catch(errorUtils.reportError);
                    return Promise.reject(err);
                }
            ).then(
                res => {
                    //console.log("request response", requestData);
                    if (pmsData && pmsData.result) {
                        request = pmsData;
                        //add request data to proposal and update proposal status to pending
                        var updateData = {
                            //status: constProposalStatus.PENDING
                        };
                        updateData.data = Object.assign({}, proposal.data);
                        updateData.data.requestId = pmsData.result.requestId;
                        updateData.data.proposalId = proposal.proposalId;
                        if (pmsData.result.weChatAccount) {
                            updateData.data.weChatAccount = pmsData.result.weChatAccount;
                        } else if (pmsData.result.bankCardNo) {
                            updateData.data.weChatAccount = pmsData.result.bankCardNo;
                        }
                        if (pmsData.result.weChatQRCode) {
                            updateData.data.weChatQRCode = pmsData.result.weChatQRCode;
                        } else if (pmsData.result.codeAddress) {
                            updateData.data.weChatQRCode = pmsData.result.codeAddress;
                        }
                        if (pmsData.result.name) {
                            updateData.data.name = pmsData.result.name;
                        } else if (pmsData.result.cardOwner) {
                            updateData.data.name = pmsData.result.cardOwner;
                        }
                        updateData.data.nickname = pmsData.result.nickname;
                        if (pmsData.result.validTime) {
                            updateData.data.validTime = new Date(pmsData.result.validTime);
                        }
                        if (res[0]) {
                            updateData.data.cardQuota = res[0].totalAmount || 0;
                        }
                        if (isFPMS && proposal.noSteps) {
                            updateData.status = constProposalStatus.APPROVED;
                        }

                        let proposalQuery = {_id: proposal._id, createTime: proposal.createTime};

                        let wechatAcc;

                        if (pmsData.result.weChatAccount) {
                            wechatAcc = request.result.weChatAccount;
                        } else if (pmsData.result.bankCardNo) {
                            wechatAcc = request.result.bankCardNo;
                        }

                        updateWeChatPayTopUpProposalDailyLimit(proposalQuery, wechatAcc, isFPMS, player.platform.platformId, topUpSystemConfig, player.platform.topUpSystemType).catch(errorUtils.reportError);

                        let checkProposalStatus = Promise.resolve();
                        if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name === 'PMS2') {
                            // to check if proposal status already update to Success, sometimes PMS 2 update proposal status too fast
                            checkProposalStatus = dbconfig.collection_proposal.findOneAndUpdate(
                                {
                                    _id: proposal._id,
                                    createTime: proposal.createTime,
                                    status: constProposalStatus.PREPENDING
                                },
                                {status: constProposalStatus.PENDING}).lean();
                        } else {
                            updateData.status = constProposalStatus.PENDING;
                        }

                        return checkProposalStatus.then(
                            () => {
                                return dbconfig.collection_proposal.findOneAndUpdate(
                                    proposalQuery,
                                    updateData,
                                    {new: true}
                                );
                            }
                        )
                    }
                    else {
                        return Q.reject({name: "APIError", errorMessage: "Cannot create manual top up request"});
                    }
                }
            ).then(
                data => {
                    if (isFPMS) {
                        if (data.noSteps) {
                            dbconfig.collection_proposalType.findOne({
                                platformId: player.platform._id,
                                name: constProposalType.PLAYER_WECHAT_TOP_UP
                            }).then(
                                proposalTypeData => {
                                    if (!proposalTypeData) {
                                        return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
                                    }
                                    proposalExecutor.approveOrRejectProposal(proposalTypeData.executionType, proposalTypeData.rejectionType, true, data)
                                }
                            ).catch(errorUtils.reportError);
                        }
                        //update wechatpay daily quota
                        dbconfig.collection_platformWechatPayList.findOneAndUpdate(
                            {
                                accountNumber: request.result.weChatAccount,
                                platformId: player.platform.platformId
                            },
                            {
                                $inc: {quotaUsed: amount}
                            }
                        ).catch(errorUtils.reportError);
                    }
                    return {
                        proposalId: data.proposalId,
                        requestId: request.result.requestId,
                        status: data.status,
                        result: request.result,
                        restTime: Math.abs(parseInt((new Date().getTime() - new Date(request.result.validTime).getTime()) / 1000))
                    };
                }
            );
    },

    isPlayerFirstTopUp: function (playerId) {
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            playerData => {
                if (playerData) {
                    return dbconfig.collection_playerTopUpRecord.findOne({playerId: playerData._id}).lean().then(
                        record => {
                            return record ? false : true;
                        }
                    );
                }
                else {
                    return false;
                }
            }
        );
    },

    addTestTopUp: function (platformId, name, type, requestData, amount, createTime) {
        let proposalType = null;
        let playerObj = {};
        let currentTime = new Date();
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then(
            platformData => {
                if (platformData) {
                    return dbconfig.collection_players.findOne({platform: platformData._id, name: name}).lean();
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    playerObj = playerData;
                    switch (type) {
                        case 1: //online
                            proposalType = constProposalType.PLAYER_TOP_UP;
                            return dbPlayerTopUpRecord.addOnlineTopupRequest(null, playerData.playerId, requestData, 1, requestData.clientType);
                            break;
                        case 2: //bankcard
                            proposalType = constProposalType.PLAYER_MANUAL_TOP_UP;
                            return dbPlayerTopUpRecord.addManualTopupRequest(null, playerData.playerId, requestData, "CLIENT");
                            break;
                        case 3: //alipay
                            proposalType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                            return dbPlayerTopUpRecord.requestAlipayTopup(null, playerData.playerId, amount, "test", "test", requestData.bonusCode, "CLIENT");
                            break;
                        case 4: //wechat
                            proposalType = constProposalType.PLAYER_WECHAT_TOP_UP;
                            return dbPlayerTopUpRecord.requestWechatTopup(!Boolean(requestData.useQR), null, playerData.playerId, amount, "test", "test", requestData.bonusCode, "CLIENT");
                            break;
                    }
                }
            }
        ).then(
            topUpResult => {
                if (topUpResult && topUpResult.proposalId) {
                    return dbconfig.collection_proposal.findOne({proposalId: topUpResult.proposalId}).lean().then(
                        pData => {
                            if (pData) {
                                return dbProposal.updateTopupProposal(pData.proposalId, constProposalStatus.SUCCESS, pData.data.requestId, 1).catch(
                                    error => {
                                        console.error(error);
                                    }
                                );
                            }
                        }
                    ).then(
                        data => topUpResult
                    );
                }
            }
        ).then(
            topUpResult => {
                if (topUpResult) {
                    if (createTime) {
                        console.log('createTime ricco1', createTime);
                        let proposalProm = dbconfig.collection_proposal.findOne({
                            proposalId: topUpResult.proposalId
                        }).lean().then(
                            proposalData => {
                                if (proposalData) {
                                    return dbconfig.collection_proposal.remove({_id: proposalData._id}).then(
                                        res => {
                                            delete proposalData._id;
                                            delete proposalData.proposalId;
                                            proposalData.createTime = dbUtility.getSGTimeOf(createTime);
                                            proposalData.settleTime = dbUtility.getSGTimeOf(createTime);
                                            let newProposal = new dbconfig.collection_proposal(proposalData);
                                            return newProposal.save();
                                        }
                                    );
                                }
                            }
                        );
                        let recordProm = dbconfig.collection_playerTopUpRecord.find({
                            playerId: playerObj._id,
                            platformId: playerObj.platform,
                            amount: amount,
                            createTime: {$gte: currentTime}
                        }).sort({createTime: -1}).limit(1).lean().then(
                            recordData => {
                                if (recordData && recordData[0]) {
                                    return dbconfig.collection_playerTopUpRecord.remove({_id: recordData[0]._id}).then(
                                        res => {
                                            delete recordData[0]._id;
                                            recordData[0].createTime = dbUtility.getSGTimeOf(createTime);
                                            recordData[0].settlementTime = dbUtility.getSGTimeOf(createTime);
                                            let newRecord = new dbconfig.collection_playerTopUpRecord(recordData[0]);
                                            return newRecord.save();
                                        }
                                    );
                                }
                            }
                        );
                        return Q.all([proposalProm, recordProm]);
                    }
                    else {
                        return topUpResult;
                    }
                }
            }
        );
    },

    forcePairingWithReferenceNumber: function(platformId, proposalObjId, proposalId, referenceNumber) {

        return dbProposal.getProposal({_id: proposalObjId}).then(proposal => {
            if (proposal && proposal.data && new Date(proposal.data.validTime) < new Date) {
                return Promise.reject({message: "提案已过期"});
            }

            if (proposal && proposal.data && proposal.data.topUpSystemName && proposal.data.topUpSystemName !== 'FPMS') {

                let requestData = {
                    platformId: platformId,
                    proposalId: proposalId,
                    depositId: referenceNumber
                };

                return RESTUtils.getPMS2Services("postTopupForceMatch", requestData, proposal.data.topUpSystemType);
            }
        }).then(data => {
            console.log("forcePairingWithReferenceNumber data", data);
            if (data) {
                // execute TopUp
                let remarks = "强制匹配：成功。";
                return dbProposal.getProposal({_id: proposalObjId}).then(proposal => {
                    if (proposal && proposal.data) {
                        console.log("mandatoryMatch proposal", proposal.data.remark);
                        let proposalRemark = proposal.data.remark && proposal.data.remark != 'undefined' ? proposal.data.remark + "; " + remarks : remarks;
                        return updateProposalRemark(proposal, proposalRemark).then(() => {
                            return Promise.resolve(true)
                        });
                    }
                });
            }
        }, err => {
            if (err && err.status == 401) {
                // cancel top up
                let remarks = err.errorMessage || "强制匹配：失败并取消。";
                return dbPlayerTopUpRecord.playerTopUpFail({proposalId: proposalId}, true, remarks).then(() => {
                    return Promise.reject({message: remarks});
                })
            } else {
                return Promise.reject(err);
            }
        });
    },
};
//
// get account count / merchant count
//

// lets do the most basic version, refactor later
function insertRepeatCount(proposals, platformId) {

    return new Promise(function (resolve) {
        let typeIds = null;
        let getProposalTypesIdProm = typeIds ? Promise.resolve(typeIds) : getTopUpProposalTypeIds(platformId);
        let insertedProposals = [];

        if (!proposals || proposals.length === 0) {
            resolve([]);
        }

        let promises = [];

        for (let i = 0; i < proposals.length; i++) {
            let prom = new Promise(function (res) {
                let proposal = JSON.parse(JSON.stringify(proposals[i]));
                if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
                    insertedProposals[i] = handleSuccessProposal(proposal);
                    res();
                } else {
                    getProposalTypesIdProm.then(
                        typeIdData => {
                            typeIds = typeIdData;
                            return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
                        }
                    ).then(
                        () => {
                            insertedProposals[i] = proposal;
                            res();
                        }
                    )
                }
            });

            promises.push(prom);
        }

        Promise.all(promises).then(
            () => {
                resolve(insertedProposals);
            }
        );

        // NOTE: async loop will probably be necessary if t
        // asyncLoop(proposals.length, function (i, loop) {
        //     let proposal = JSON.parse(JSON.stringify(proposals[i]));
        //     if (proposal.status === constProposalStatus.SUCCESS || proposal.status === constProposalStatus.APPROVED) {
        //         insertedProposals[i] = handleSuccessProposal(proposal);
        //         loop();
        //     } else {
        //         getProposalTypesIdProm.then(
        //             typeIdData => {
        //                 typeIds = typeIdData;
        //                 return Promise.all([handleFailureMerchant(proposal), handleFailurePlayer(proposal)]);
        //             }
        //         ).then(
        //             () => {
        //                 insertedProposals[i] = proposal;
        //                 loop();
        //             }
        //         )
        //     }
        //
        //
        // }, function returnResult() {
        //     resolve(insertedProposals);
        // });

        function handleFailureMerchant(proposal) {
            let merchantNo = proposal.data.merchantNo;
            let relevantTypeIds = merchantNo ? typeIds : [proposal.type];
            let alipayAccount = proposal.data.alipayAccount ? proposal.data.alipayAccount : "";
            let bankCardNoRegExp;

            if (proposal.data.bankCardNo) {
                let bankCardNoRegExpA = new RegExp(proposal.data.bankCardNo.substring(0, 6) + ".*");
                let bankCardNoRegExpB = new RegExp(".*" + proposal.data.bankCardNo.slice(-4));
                bankCardNoRegExp = [
                    {"data.bankCardNo": bankCardNoRegExpA},
                    {"data.bankCardNo": bankCardNoRegExpB}
                ];
            }

            let prevSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$lte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            let nextSuccessQuery = {
                type: {$in: relevantTypeIds},
                createTime: {$gte: new Date(proposal.createTime)},
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            };

            if (merchantNo) {
                prevSuccessQuery["data.merchantNo"] = merchantNo;
                nextSuccessQuery["data.merchantNo"] = merchantNo;
            }

            if (alipayAccount) {
                prevSuccessQuery["data.alipayAccount"] = alipayAccount;
                nextSuccessQuery["data.alipayAccount"] = alipayAccount;
            }

            if (proposal.data.bankCardNo) {
                prevSuccessQuery["$and"] = bankCardNoRegExp;
                nextSuccessQuery["$and"] = bankCardNoRegExp;
            }

            let prevSuccessProm = dbconfig.collection_proposal.find(prevSuccessQuery).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find(nextSuccessQuery).sort({createTime: 1}).limit(1);

            // for debug usage
            // let pS, nS, fISQ;

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    let currentCountQuery = {
                        type: {$in: relevantTypeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        }
                    };

                    let firstInStreakQuery = {
                        type: {$in: relevantTypeIds}
                    };

                    if (merchantNo) {
                        allCountQuery["data.merchantNo"] = merchantNo;
                        currentCountQuery["data.merchantNo"] = merchantNo;
                        firstInStreakQuery["data.merchantNo"] = merchantNo;
                    }

                    if (alipayAccount) {
                        allCountQuery["data.alipayAccount"] = alipayAccount;
                        currentCountQuery["data.alipayAccount"] = alipayAccount;
                        firstInStreakQuery["data.alipayAccount"] = alipayAccount;
                    }

                    if (proposal.data.bankCardNo) {
                        allCountQuery["$and"] = bankCardNoRegExp;
                        currentCountQuery["$and"] = bankCardNoRegExp;
                        firstInStreakQuery["$and"] = bankCardNoRegExp;
                    }

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    // for debug usage
                    // pS = prevSuccess[0];
                    // nS = nextSuccess[0];
                    // fISQ = firstInStreakQuery;

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.find(firstInStreakQuery).sort({createTime: 1}).limit(1);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2][0];

                    // for debug usage
                    // if (!firstFailure) {
                    //     console.log('t54lwtMaus')
                    //     console.log('proposal |||', proposal)
                    //     console.log('firstFailure |||', firstFailure)
                    //     console.log('prevSuccess |||', pS)
                    //     console.log('nextSuccess |||', nS)
                    //     console.log('firstInStreakQuery |||', fISQ)
                    //     console.log('prevSuccessQuery |||', prevSuccessQuery)
                    //     console.log('nextSuccessQuery |||', nextSuccessQuery)
                    // }

                    proposal.$merchantAllCount = allCount;
                    proposal.$merchantCurrentCount = currentCount;

                    if (!firstFailure || firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                        proposal.$merchantGapTime = 0;
                    } else {
                        proposal.$merchantGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleFailurePlayer(proposal) {
            let playerName = proposal.data.playerName;

            let prevSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$lte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: -1}).limit(1);
            let nextSuccessProm = dbconfig.collection_proposal.find({
                type: {$in: typeIds},
                createTime: {$gte: proposal.createTime},
                "data.playerName": playerName,
                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
            }).sort({createTime: 1}).limit(1);

            return Promise.all([prevSuccessProm, nextSuccessProm]).then(
                successData => {
                    let prevSuccess = successData[0];
                    let nextSuccess = successData[1];

                    let allCountQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    let currentCountQuery = {
                        type: {$in: typeIds},
                        createTime: {
                            $lte: new Date(proposal.createTime)
                        },
                        "data.playerName": playerName
                    };

                    let firstInStreakQuery = {
                        type: {$in: typeIds},
                        "data.playerName": playerName
                    };

                    if (prevSuccess[0]) {
                        let prevSuccessCreateTime = new Date(prevSuccess[0].createTime);
                        allCountQuery.createTime = {$gt: prevSuccessCreateTime};
                        currentCountQuery.createTime.$gt = prevSuccessCreateTime;
                        firstInStreakQuery.createTime = {$gt: prevSuccessCreateTime};
                    }

                    if (nextSuccess[0]) {
                        allCountQuery.createTime = allCountQuery.createTime ? allCountQuery.createTime : {};
                        allCountQuery.createTime.$lt = nextSuccess[0].createTime;
                    }

                    let allCountProm = dbconfig.collection_proposal.find(allCountQuery).count();
                    let currentCountProm = dbconfig.collection_proposal.find(currentCountQuery).count();
                    let firstInStreakProm = dbconfig.collection_proposal.findOne(firstInStreakQuery);

                    return Promise.all([allCountProm, currentCountProm, firstInStreakProm]);
                }
            ).then(
                countData => {
                    let allCount = countData[0];
                    let currentCount = countData[1];
                    let firstFailure = countData[2];

                    proposal.$playerAllCount = allCount;
                    proposal.$playerCurrentCount = currentCount;

                    if (firstFailure.proposalId.toString() === proposal.proposalId.toString()) {
                        proposal.$playerGapTime = 0;
                    } else {
                        proposal.$playerGapTime = getMinutesBetweenDates(firstFailure.createTime, new Date(proposal.createTime));
                    }
                    return proposal;
                }
            );
        }

        function handleSuccessProposal(proposal) {
            proposal['$merchantAllCount'] = '-';
            proposal['$merchantCurrentCount'] = '-';
            proposal['$merchantGapTime'] = '-';
            proposal['$playerAllCount'] = '-';
            proposal['$playerCurrentCount'] = '-';
            proposal['$playerGapTime'] = '-';
            return proposal;
        }

    });
}

function getTopUpProposalTypeIds(platformId) {
    let mainTopUpTypes = {
        $in: [
            constProposalType.PLAYER_TOP_UP,
            constProposalType.PLAYER_ALIPAY_TOP_UP,
            constProposalType.PLAYER_MANUAL_TOP_UP,
            constProposalType.PLAYER_WECHAT_TOP_UP,
            constProposalType.PLAYER_QUICKPAY_TOP_UP
        ]
    };

    return dbconfig.collection_proposalType.find({platformId: platformId, name: mainTopUpTypes}).lean().then(
        proposalTypes => {
            return proposalTypes.map(type => {
                return type._id;
            });
        }
    );
}

function asyncLoop(count, func, callback) {
    let i = -1;

    let loop = function () {
        i++;
        if (i >= count) {
            if (callback) {
                callback();
            }
            return;
        }
        func(i, loop);
    };
    loop();
}

function getMinutesBetweenDates(startDate, endDate) {
    var diff = endDate.getTime() - startDate.getTime();
    return Math.floor(diff / 60000);
}

function convertStringNumber(Arr) {
    let Arrs = JSON.parse(JSON.stringify(Arr));
    let result = []
    Arrs.forEach(item => {
        result.push(String(item));
    })
    Arrs.forEach(item => {
        let currentNum = Number(item);
        if (isNaN(currentNum) == false) {
            result.push(currentNum);
        }
    })
    return result;
}

// end of count user /merchant
let proto = dbPlayerTopUpRecordFunc.prototype;
proto = Object.assign(proto, dbPlayerTopUpRecord);

// This make WebStorm navigation work
module.exports = dbPlayerTopUpRecord;

function updateManualTopUpProposalBankLimit (proposalQuery, bankCardNo, isFPMS, platformId, topUpSystemConfig, paymentSystemId) {
    let prom;
    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformBankCardList.findOne({accountNumber: bankCardNo, platformId: platformId}).lean().then(
            bankCardList => {
                return {data: bankCardList}
            }
        );
    } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
        let options = {
            accountNumber: bankCardNo
        };

        prom = RESTUtils.getPMS2Services("postBankCard", options, paymentSystemId);
    }

    return prom.then(
        bankCard => {
            if (bankCard && bankCard.data && bankCard.data.quota) {
                return dbconfig.collection_proposal.update(proposalQuery, {"data.dailyCardQuotaCap": bankCard.data.quota});
            }
        }
    );
}

function updateAliPayTopUpProposalDailyLimit (proposalQuery, accNo, isFPMS, platformId, topUpSystemConfig, paymentSystemId) {
    let prom;
    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformAlipayList.findOne({accountNumber: accNo, platformId: platformId}).lean().then(
            alipayList => {
                return {data: alipayList}
            }
        );
    } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
        let options = {
            accountNumber: accNo
        };

        prom = RESTUtils.getPMS2Services("postBankCard", options, paymentSystemId);
    }

    return prom.then(
        aliPay => {
            if (aliPay && aliPay.data && (aliPay.data.quota || aliPay.data.singleLimit)) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.dailyCardQuotaCap": aliPay.data.quota?  aliPay.data.quota: 0,
                    "data.singleLimit": aliPay.data.singleLimit?  aliPay.data.singleLimit: 0
                });
            }
        }
    );
}

function updateWeChatPayTopUpProposalDailyLimit (proposalQuery, accNo, isFPMS, platformId, topUpSystemConfig, paymentSystemId) {
    let prom;

    if (isFPMS && platformId) {
        prom = dbconfig.collection_platformWechatPayList.findOne({accountNumber: accNo, platformId: platformId}).lean().then(
            wechatList => {
                return {data: wechatList}
            }
        );
    } else if (topUpSystemConfig && topUpSystemConfig.name && topUpSystemConfig.name !== 'FPMS') {
        let options = {
            accountNumber: accNo
        };

        prom = RESTUtils.getPMS2Services("postBankCard", options, paymentSystemId);
    }

    return prom.then(
        wechatPay => {
            if (wechatPay && wechatPay.data && (wechatPay.data.quota || wechatPay.data.singleLimit )) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.dailyCardQuotaCap": wechatPay.data.quota?  wechatPay.data.quota: 0,
                    "data.singleLimit": wechatPay.data.singleLimit?  wechatPay.data.singleLimit: 0
                });
            }
        }
    );
}

function updateOnlineTopUpProposalDailyLimit (proposalQuery, merchantNo, paymentSystemId) {
    // let merchantObj;
    // return pmsAPI.merchant_getMerchant({merchantNo: merchantNo}).then(
    //     merchantData => {
    //         merchantObj = merchantData;
    //         if (merchantData && merchantData.merchant && merchantData.merchant.merchantTypeId) {
    //             return pmsAPI.merchant_getMerchantType({merchantTypeId: merchantData.merchant.merchantTypeId})
    //         }
    //     }
    // ).then(
    //     merchantType => {
    //         if (merchantObj && merchantObj.merchant && (merchantObj.merchant.permerchantLimits || merchantObj.merchant.transactionForPlayerOneDay)) {
    //             return dbconfig.collection_proposal.update(proposalQuery, {
    //                 "data.permerchantLimits": merchantObj.merchant.permerchantLimits ? merchantObj.merchant.permerchantLimits : 0,
    //                 "data.transactionForPlayerOneDay": merchantObj.merchant.transactionForPlayerOneDay ? merchantObj.merchant.transactionForPlayerOneDay : 0,
    //                 "data.merchantUseName": merchantType && merchantType.merchantType && merchantType.merchantType.name ? merchantType.merchantType.name : ""
    //             });
    //         }
    //     }
    // )

    return RESTUtils.getPMS2Services("postMerchantInfo", {merchantName: merchantNo}, paymentSystemId).then(
        merchantData => {
            if (merchantData) {
                return dbconfig.collection_proposal.update(proposalQuery, {
                    "data.permerchantLimits": merchantData.permerchantLimits ? merchantData.permerchantLimits : 0,
                    "data.transactionForPlayerOneDay": merchantData.transactionForPlayerOneDay ? merchantData.transactionForPlayerOneDay : 0,
                    "data.merchantUseName": merchantData.merchantTypeName ? merchantData.merchantTypeName : ""
                });
            }
        }
    )
}

function updateProposalRemark (proposalData, remark) {
    if(proposalData && proposalData._id && remark){
        return dbconfig.collection_proposal.findByIdAndUpdate(proposalData._id, {'data.remark': remark})
    }
    else{
        return Promise.resolve(true);
    }

}

function getMerchantRate(merchantNo, platformId, merchantName){
    let query = {
        merchantNo: merchantNo,
        name: merchantName,
        platformId: platformId,
        isPMS2: {$exists: true}
    };

    return dbconfig.collection_platformMerchantList.findOne(query, {rate: 1, customizeRate: 1});
}
