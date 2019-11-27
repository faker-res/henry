var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
var dbPlayerMail = require("./../db_modules/dbPlayerMail");
var errorUtils = require("./../modules/errorUtils");
var dbLogger = require('./../modules/dbLogger');
var smsAPI = require('../externalAPI/smsAPI');
const jwt = require('jsonwebtoken');
const rsaCrypto = require("../modules/rsaCrypto");
const localization = require("./../modules/localization").localization;
const queryPhoneLocation = require('cellocate');


const constSystemParam = require('../const/constSystemParam');
const constServerCode = require('../const/constServerCode');
const constProposalType = require('../const/constProposalType');
const constTsPhoneListStatus = require('../const/constTsPhoneListStatus');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalStatus = require('../const/constProposalStatus');
const constRegistrationIntentRecordStatus = require("../const/constRegistrationIntentRecordStatus.js");
const dbProposal = require('./../db_modules/dbProposal');
const dbUtility = require('./../modules/dbutility');
const bcrypt = require('bcrypt');
const dbPlayerRegistrationIntentRecord = require('./../db_modules/dbPlayerRegistrationIntentRecord');


const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbApiLog = require("../db_modules/dbApiLog");

let dbDXMission = {

    /**
     * get a mission
     * @param {json} data - The data of the role. Refer to role schema.
     */
    getDxMission: function (id){
        return dbconfig.collection_dxMission.find({'_id':id});
    },

    getAllDxMission: function (platform) {
        return dbconfig.collection_dxMission.find({platform: platform});
    },

    deleteDxMissionDxPhone: function (dxMissionObjId) {
        return dbconfig.collection_dxMission.remove({_id: dxMissionObjId}).then(
            () => {
                return dbconfig.collection_dxPhone.remove(
                    {
                        dxMission: dxMissionObjId,
                        bUsed: false
                    }
                )
            }
        )
    },

    createDxMission: function(data){
        data.platform = ObjectId(data.platform);
        let dxMission = new dbconfig.collection_dxMission(data);
        return dxMission.save();
    },
    updateDxMission: function(id, updateData){
        return dbconfig.collection_dxMission.findOneAndUpdate(
            {_id: id}, updateData);
    },

    getTeleMarketingOverview: function(platform, query, index, limit, sortCol){
        limit = limit ? limit : 20;
        index = index ? index : 0;
        query = query ? query : {};


        let startDate = new Date(query.start);
        let endDate = new Date(query.end);
        let result = [];
        let matchObj = {
            platform: platform,
            createTime: {$gte: startDate, $lt: endDate},
        };

        if(query.name){
            matchObj.name = query.name;
        }
        let registeredPlayerListProm = [];
        let dataSummaryListProm = [];

        let totalCountProm = dbconfig.collection_dxMission.find(matchObj).count();
        let dxMissionDataProm = dbconfig.collection_dxMission.find(matchObj).skip(index).limit(limit).sort({createTime: -1}).lean();
        let totalCount = 0;
        let dxMissionData = {};

        return Promise.all([totalCountProm, dxMissionDataProm]).then(
            result => {
                if(result){
                    totalCount = result[0] ? result[0] : 0;
                    dxMissionData = result[1] ? result[1] : {};

                    return {totalCount: totalCount, dxMissionData: dxMissionData};
                }
            }
        ).then(
            data => {
                data.dxMissionData.forEach(
                    missionData => {
                        if(missionData){
                            dataSummaryListProm.push(dbDXMission.getDataSummaryList(missionData._id, missionData.platform, missionData.alertDays));
                        }
                    }
                )

                return Promise.all(dataSummaryListProm).then(
                    summaryData => {
                        let resultData = JSON.parse(JSON.stringify(data));
                        if(summaryData){
                            summaryData.forEach(
                                summary => {
                                    if(summary){

                                        resultData.dxMissionData.forEach(
                                            (missionData,i) => {
                                                if(missionData){
                                                    if(missionData._id && missionData._id == summary.dxMissionId){
                                                        let isRecordDeleted = false;
                                                        //filter by totalImportedList
                                                        if(!isRecordDeleted){
                                                            if(query.hasOwnProperty("totalImportedListValue") && query.totalImportedListValue != ""){
                                                                if(query.totalImportedListOperator){

                                                                    switch(query.totalImportedListOperator){
                                                                        case ">=":
                                                                            if(summary.importedListCount < query.totalImportedListValue){
                                                                                resultData.dxMissionData.splice(i,1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if(summary.importedListCount > query.totalImportedListValue){
                                                                                resultData.dxMissionData.splice(i,1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if(summary.importedListCount != query.totalImportedListValue){
                                                                                resultData.dxMissionData.splice(i,1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if(summary.importedListCount < query.totalImportedListValue){
                                                                                resultData.dxMissionData.splice(i,1);
                                                                                isRecordDeleted = true;
                                                                            }else if(query.hasOwnProperty("totalImportedListValueTwo") && query.totalImportedListValueTwo != "" && summary.importedListCount > query.totalImportedListValueTwo){
                                                                                resultData.dxMissionData.splice(i,1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }


                                                        //filter by totalPlayerRegistration
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalPlayerRegistrationValue") && query.totalPlayerRegistrationValue != "") {
                                                                if (query.totalPlayerRegistrationOperator) {

                                                                    switch (query.totalPlayerRegistrationOperator) {
                                                                        case ">=":
                                                                            if (summary.registeredPlayerCount < query.totalPlayerRegistrationValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.registeredPlayerCount > query.totalPlayerRegistrationValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.registeredPlayerCount != query.totalPlayerRegistrationValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.registeredPlayerCount < query.totalPlayerRegistrationValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalPlayerRegistrationValueTwo") && query.totalPlayerRegistrationValueTwo != "" && summary.registeredPlayerCount > query.totalPlayerRegistrationValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        //filter by totalPlayerDepositValue
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalPlayerDepositValue") && query.totalPlayerDepositValue != "") {
                                                                if (query.totalPlayerDepositOperator) {

                                                                    switch (query.totalPlayerDepositOperator) {
                                                                        case ">=":
                                                                            if (summary.topUpPlayerCount < query.totalPlayerDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.topUpPlayerCount > query.totalPlayerDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.topUpPlayerCount != query.totalPlayerDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.topUpPlayerCount < query.totalPlayerDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalPlayerDepositValueTwo") && query.totalPlayerDepositValueTwo != "" && summary.topUpPlayerCount > query.totalPlayerDepositValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        //filter by totalPlayerMultiDeposit
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalPlayerMultiDepositValue") && query.totalPlayerMultiDepositValue != "") {
                                                                if (query.totalPlayerMultiDepositOperator) {

                                                                    switch (query.totalPlayerMultiDepositOperator) {
                                                                        case ">=":
                                                                            if (summary.multiTopUpPlayerCount < query.totalPlayerMultiDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.multiTopUpPlayerCount > query.totalPlayerMultiDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.multiTopUpPlayerCount != query.totalPlayerMultiDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.multiTopUpPlayerCount < query.totalPlayerMultiDepositValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalPlayerMultiDepositValueTwo") && query.totalPlayerMultiDepositValueTwo != "" && summary.multiTopUpPlayerCount > query.totalPlayerMultiDepositValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        //filter by totalValidPlayer
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalValidPlayerValue") && query.totalValidPlayerValue != "") {
                                                                if (query.totalValidPlayerOperator) {

                                                                    switch (query.totalValidPlayerOperator) {
                                                                        case ">=":
                                                                            if (summary.totalValidConsumptionCount < query.totalValidPlayerValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.totalValidConsumptionCount > query.totalValidPlayerValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.totalValidConsumptionCount != query.totalValidPlayerValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.totalValidConsumptionCount < query.totalValidPlayerValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalValidPlayerValueTwo") && query.totalValidPlayerValueTwo != "" && summary.totalValidConsumptionCount > query.totalValidPlayerValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        //filter by totalDepositAmount
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalDepositAmountValue") && query.totalDepositAmountValue != "") {
                                                                if (query.totalDepositAmountOperator) {

                                                                    switch (query.totalDepositAmountOperator) {
                                                                        case ">=":
                                                                            if (summary.totalPlayerDepositAmount < query.totalDepositAmountValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.totalPlayerDepositAmount > query.totalDepositAmountValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.totalPlayerDepositAmount != query.totalDepositAmountValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.totalPlayerDepositAmount < query.totalDepositAmountValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalDepositAmountValueTwo") && query.totalDepositAmountValueTwo != "" && summary.totalPlayerDepositAmount > query.totalDepositAmountValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        //filter by totalPlayerDepositAmount
                                                        if(!isRecordDeleted) {
                                                            if (query.hasOwnProperty("totalValidConsumptionValue") && query.totalValidConsumptionValue != "") {
                                                                if (query.totalValidConsumptionOperator) {

                                                                    switch (query.totalValidConsumptionOperator) {
                                                                        case ">=":
                                                                            if (summary.totalValidConsumptionAmount < query.totalValidConsumptionValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "<=":
                                                                            if (summary.totalValidConsumptionAmount > query.totalValidConsumptionValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "=":
                                                                            if (summary.totalValidConsumptionAmount != query.totalValidConsumptionValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                        case "range":
                                                                            if (summary.totalValidConsumptionAmount < query.totalValidConsumptionValue) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            } else if (query.hasOwnProperty("totalValidConsumptionValueTwo") && query.totalValidConsumptionValueTwo != "" && summary.totalValidConsumptionAmount > query.totalValidConsumptionValueTwo) {
                                                                                resultData.dxMissionData.splice(i, 1);
                                                                                isRecordDeleted = true;
                                                                            }
                                                                            break;
                                                                    }

                                                                }
                                                            }
                                                        }

                                                        missionData.importedListCount = summary.importedListCount;
                                                        missionData.sentMessageListCount = summary.sentMessageListCount;
                                                        missionData.registeredPlayerCount = summary.registeredPlayerCount;
                                                        missionData.topUpPlayerCount = summary.topUpPlayerCount;
                                                        missionData.multiTopUpPlayerCount = summary.multiTopUpPlayerCount;
                                                        missionData.totalValidConsumptionCount = summary.totalValidConsumptionCount;
                                                        missionData.totalValidConsumptionAmount = summary.totalValidConsumptionAmount;
                                                        missionData.totalPlayerDepositAmount = summary.totalPlayerDepositAmount;
                                                        missionData.validPlayerArr = summary.validPlayerArr;
                                                        missionData.depositPlayerArr = summary.depositPlayerArr;
                                                        missionData.consumptionPlayerArr = summary.consumptionPlayerArr;
                                                        missionData.alerted = summary.alerted;
                                                        missionData.topUpPlayerArr = summary.topUpPlayerArr;
                                                        missionData.multiTopUpPlayerArr = summary.multiTopUpPlayerArr;
                                                    }

                                                    return;
                                                }
                                            }
                                        )
                                    }
                                }
                            )
                        }

                        return {totalCount: data.totalCount, dxMissionData: resultData.dxMissionData}
                    }
                )
            }
        );

    },

    getDataSummaryList: function (dxMissionId, platformObjId, alertDay) {
        if(!dxMissionId){
            return;
        }

        let importedListProm = [];
        let sentMessageListProm = [];
        let registeredPlayerListProm = [];
        let topUpPlayerArr = [];
        let multiTopUpPlayerArr = [];
        let validPlayerArr = [];
        let depositPlayerArr = [];
        let consumptionPlayerArr = [];
        let partnerLevel = {};
        let checkFeedBackProm = [];
        let totalValidConsumptionCount = 0;
        let totalValidConsumptionAmount = 0;
        let totalPlayerBonusAmount = 0;
        let totalPlayerTopUpAmount = 0;
        let playerIdList = [];
        let playerDetails = [];
        importedListProm = dbconfig.collection_dxPhone.find({dxMission: dxMissionId}).lean().count();
        sentMessageListProm = dbconfig.collection_smsLog.distinct("tel", {"data.dxMission": ObjectId(dxMissionId)}).lean();
        registeredPlayerListProm = dbconfig.collection_partnerLevelConfig.findOne({platform: platformObjId}).then(
            partnerLevelConfig => {
                partnerLevel = partnerLevelConfig ? partnerLevelConfig : {};

                return;
            }
        ).then(() => {
                return dbconfig.collection_players.find({dxMission: dxMissionId}).lean().then(
                    playerData => {
                        if(playerData && playerData.length > 0){
                            playerDetails = playerData;
                            playerData.forEach(data => {
                                if(data){
                                    playerIdList.push(data._id);

                                    if(data.topUpTimes > 0){
                                        topUpPlayerArr.push(data._id);

                                        //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                        var indexNo = depositPlayerArr.findIndex(v => v == data._id);
                                        if(indexNo == -1){
                                            depositPlayerArr.push(data._id);
                                        }
                                    }

                                    if(data.topUpTimes > 1){
                                        multiTopUpPlayerArr.push(data._id);
                                    }

                                    if(typeof data.topUpSum != "undefined"){
                                        totalPlayerTopUpAmount += data.topUpSum;
                                    }

                                    if(typeof data.withdrawSum != "undefined" && data.withdrawSum > 0){
                                        totalPlayerBonusAmount += data.withdrawSum;

                                        //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                        var indexNo = depositPlayerArr.findIndex(v => v == data._id);
                                        if(indexNo == -1){
                                            depositPlayerArr.push(data._id);
                                        }
                                    }

                                    if(typeof data.consumptionSum != "undefined" && data.consumptionSum > 0){
                                        totalValidConsumptionAmount += data.consumptionSum;
                                        consumptionPlayerArr.push(data._id);
                                    }

                                    if(partnerLevel && data.topUpTimes >= partnerLevel.validPlayerTopUpTimes
                                        && data.topUpSum >= partnerLevel.validPlayerTopUpAmount
                                        && data.consumptionTimes >= partnerLevel.validPlayerConsumptionTimes
                                        && data.consumptionSum >= partnerLevel.validPlayerConsumptionAmount
                                        && data.valueScore >= partnerLevel.validPlayerValue)
                                    {
                                        totalValidConsumptionCount += 1;
                                        validPlayerArr.push(data._id);
                                    }

                                    checkFeedBackProm.push(dbconfig.collection_playerFeedback.find({playerId: data._id}).lean().then(
                                        feedBackData => {
                                            if (!feedBackData || feedBackData.length <= 0) {
                                                let registeredTime = new Date(data.registrationTime);
                                                let alertPeriod = new Date(dbUtility.getNdaylaterFromSpecificStartTime(alertDay,registeredTime)).getTime();

                                                if(alertPeriod >= new Date().getTime()){
                                                    return true;
                                                }
                                            }

                                            return false;
                                        }
                                    ));
                                }
                            });

                            return Promise.all(checkFeedBackProm);
                        }
                    }
                )
        });

        return Promise.all([importedListProm, sentMessageListProm, registeredPlayerListProm]).then(
            result => {
                if(result){
                    let importedListCount = result[0] ? result[0] : 0;
                    let sentMessageListCount = result[1] ? result[1].length : 0;
                    let alertList = result[2] ? result[2] : 0;
                    return {
                        dxMissionId: dxMissionId,
                        importedListCount: importedListCount,
                        sentMessageListCount: sentMessageListCount,
                        registeredPlayerCount: playerIdList ? playerIdList.length : 0,
                        topUpPlayerCount: playerDetails ? playerDetails.filter(p => p.topUpTimes > 0).length : 0,
                        multiTopUpPlayerCount: playerDetails ? playerDetails.filter(p => p.topUpTimes > 1).length : 0,
                        totalValidConsumptionAmount: totalValidConsumptionAmount,
                        totalValidConsumptionCount : totalValidConsumptionCount,
                        validPlayerArr: validPlayerArr,
                        totalPlayerDepositAmount: totalPlayerTopUpAmount - totalPlayerBonusAmount,
                        consumptionPlayerArr: consumptionPlayerArr,
                        depositPlayerArr: depositPlayerArr,
                        alerted: alertList && alertList.filter(a => a == true).length > 0 ? true : false,
                        topUpPlayerArr: topUpPlayerArr,
                        multiTopUpPlayerArr: multiTopUpPlayerArr
                    }
                }
            }
        )

    },

    createPlayerFromCode: function (code, deviceData, domain, loginDetails, conn, wsFunc) {
        if (!code) {
            return Promise.reject({
                errorMessage: "Invalid code for creating player"
            });
        }

        return dbconfig.collection_dxPhone.find({code: code})
            .populate({path: "dxMission", model: dbconfig.collection_dxMission})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
            function (dxPhones) {
                let dxPhone;

                if (dxPhones && dxPhones.length > 0 ) {
                    // find the only one result -  code & domain are equally
                    dxPhone = dxPhones.filter( phone => {
                        if (phone.dxMission && phone.dxMission.domain) {
                            let phoneDomain = phone.dxMission.domain.replace("https://www.", "").replace("http://www.", "").replace("https://", "").replace("http://", "").replace("www.", "");
                            console.log('The phone domain', phoneDomain);
                            return phoneDomain === domain
                        }
                        return false;
                    });
                }
                dxPhone = ( dxPhone && dxPhone[0] ) ? dxPhone[0] : null;

                if (!dxPhone) {
                    return Promise.reject({
                        code: constServerCode.DATA_INVALID,
                        message: "DX code invalid"
                    });
                }

                if (dxPhone.bUsed) {
                    return loginDefaultPasswordPlayer(dxPhone, deviceData.registrationDevice);
                }
                else {
                    console.log('The domain', domain);
                    return createPlayer(dxPhone, deviceData, domain, loginDetails, conn, wsFunc);
                }
            }
        )
    },

    applyDxMissionReward: function (dxMission, playerData) {
        if (dxMission && dxMission.creditAmount && dxMission.requiredConsumption) {
                if (playerData.platform) {
                    return dbconfig.collection_proposalType.findOne({
                        platformId: playerData.platform,
                        name: constProposalType.DX_REWARD
                    }).lean().then(
                        proposalTypeData => {
                            if (proposalTypeData && proposalTypeData._id) {
                                let proposalData = {
                                    type: proposalTypeData._id,
                                    creator: {
                                            type: 'player',
                                            name: playerData.name,
                                            id: playerData._id
                                        },
                                    data: {
                                        playerObjId: playerData._id,
                                        playerId: playerData.playerId,
                                        playerName: playerData.name,
                                        realName: playerData.realName,
                                        platformObjId: playerData.platform,
                                        rewardAmount: dxMission.creditAmount,
                                        spendingAmount: dxMission.requiredConsumption,
                                        useLockedCredit: false,
                                        eventName: "电销触击优惠",
                                        eventCode: "DXCJYH",
                                        eventId: "579196839b4ffcd65244e5e9", //hard code for DxReward
                                        forbidWithdrawIfBalanceAfterUnlock: dxMission.forbidWithdrawIfBalanceAfterUnlock
                                    },
                                    entryType: constProposalEntryType.SYSTEM,
                                    userType: constProposalUserType.PLAYERS
                                };
                                if (dxMission.providerGroup) {
                                    proposalData.data.providerGroup = dxMission.providerGroup;
                                }
                                return dbProposal.createProposalWithTypeId(proposalTypeData._id, proposalData);
                            } else {
                                return Promise.reject({
                                    name: "DataError",
                                    errorMessage: "Cannot find proposal type"
                                });
                            }
                        }
                    )

                } else {
                    return Promise.reject({name: "DataError", message: "Cannot find platform"});
                }
        } else {
            return Promise.reject({
                status: constServerCode.INVALID_DATA,
                name: "DataError",
                message: "Invalid DX mission data"
            })
        }
    },

    insertPhoneToTask: function (deviceData, platformId, phoneNumber, taskName, autoSMS, isBackStageGenerated) {
        if (!platformId && !phoneNumber && !taskName) {
            return Promise.reject({
                errorMessage: "Invalid data"
            });
        }

        let returnedMsg = null;
        let platformObjId = null;
        let whiteListingPhoneNumbers = null;
        const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const now = new Date(Date.now()).toISOString();
        const maxIpCount = 5;
        let allowedWhitePhoneNumber = false;

        // check the phoneNumber has been registered
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then( platformData => {
            if (platformData){

                platformObjId = platformData._id;
                whiteListingPhoneNumbers = platformData.whiteListingPhoneNumbers;

                if (deviceData && deviceData.lastLoginIp && !isBackStageGenerated) {
                    let ipQuery = {
                        ip: deviceData.lastLoginIp,
                        createTime: {
                            $lte: now,
                            $gte: anHourAgo
                        },
                        platform: platformObjId
                    };

                    return dbconfig.collection_dxPhone.count(ipQuery).then(
                        data => {
                            if (data >= maxIpCount) {

                                return Promise.reject({
                                   // name: "DataError",
                                    message: localization.translate("Application limit exceeded 5 times in 1 hour (same IP Address). Please try again later")
                                });
                            }
                            else{

                                return platformObjId;
                            }
                        }
                    );
                    // return platformObjId;

                }

            }
            else{
                    return Promise.reject({name: "DBError", message: "No platform exists with id: " + platformId});
            }
        }).then( platformObjId => {
            if(platformObjId){
                // check whether is in in the whitePhoneNumberList
                if (whiteListingPhoneNumbers && whiteListingPhoneNumbers.length > 0){
                    if (whiteListingPhoneNumbers.indexOf(phoneNumber) != -1){
                        allowedWhitePhoneNumber = true;
                       return;
                    }
                }
                let encryptedPhoneNumber = rsaCrypto.encrypt(phoneNumber);
                let encryptedOldPhoneNumber = rsaCrypto.oldEncrypt(phoneNumber);
                let phoneNumberQuery = {$in: [encryptedPhoneNumber, phoneNumber, encryptedOldPhoneNumber]};

                return dbconfig.collection_players.findOne({platform: platformObjId, phoneNumber: phoneNumberQuery}).lean()
            }
        }).then( playerData => {
            if (playerData && !allowedWhitePhoneNumber){
                return Promise.reject({
                    message: localization.translate("This phone number has been registered, only new player can get lucky draw!")
                });
            }
            else{
                // this number is still available, so check whether it is already in the dxMission list

                let taskNameObjId = null;
                if (ObjectId.isValid(taskName)){
                   taskNameObjId = ObjectId(taskName);
                }

                return dbconfig.collection_dxMission.findOne({ $or: [{name: taskName}, {_id: taskNameObjId}] }).lean().then( dxMission => {
                    if (dxMission){

                        return dbconfig.collection_dxPhone.findOne({phoneNumber: phoneNumber, dxMission: dxMission._id})
                            .then( dxPhone => {
                                if(dxPhone){
                                    // the number is not in the whitePhoneNumber list and its sendingTimes is more than 3 times -> not to send again
                                    if (!allowedWhitePhoneNumber && dxPhone.sendingTimes >= 3){
                                        return Promise.reject({
                                            message: localization.translate("The phone number is already in the mission list, please invite friends for a lucky draw!")
                                        });
                                    }else{
                                        // either is in whitePhoneNumber list or the sendingTimes < 3 -> resend the msg with the same link
                                        return { platformId: platformObjId, dbDXMissionId: dxPhone.dxMission, phoneNumber: dxPhone.phoneNumber.trim()}

                                    }
                                }
                                else{
                                    //import the number to the keyed-in dxMission and send out msg if needed
                                        return dbPlayerInfo.generateDXCode(dxMission).then(
                                            randomCode => {
                                                let importData = {
                                                    platform: platformObjId,
                                                    phoneNumber: phoneNumber,
                                                    dxMission: dxMission._id,
                                                    code: randomCode,
                                                    url: dxMission.domain + "/" + randomCode,
                                                    ip: deviceData.lastLoginIp,
                                                };

                                                let importPhone = new dbconfig.collection_dxPhone(importData);
                                                return importPhone.save().then( () => {
                                                    //sending msg if required
                                                    if (parseInt(autoSMS)) {

                                                        let smsData = {
                                                            // channel: smsChannel,
                                                            platformId: platformObjId,
                                                            dbDXMissionId: dxMission._id,
                                                            phoneNumber: phoneNumber.trim(),
                                                        };
                                                        return smsData;
                                                    }
                                                    else{
                                                        return Promise.resolve({
                                                            message: localization.translate("Successfully imported into the task, please take note that no message is sent by the system.")
                                                        });
                                                    }
                                                })
                                            });
                                }
                            }).then( inData => {
                                if (inData){
                                    if (parseInt(autoSMS)) {
                                        return smsAPI.channel_getChannelList({}).then(channelList => {
                                            if (channelList && channelList.channels && channelList.channels.length > 0) {

                                                if (channelList.channels.indexOf(3) != -1) {
                                                    inData.channel = 3;
                                                }
                                                else if (channelList.channels.indexOf(2) != -1) {
                                                    inData.channel = 2;
                                                }
                                                else {

                                                    return Promise.reject({
                                                        name: "DBError",
                                                        message: "Channel 1 and Channel 2 do not exist"
                                                    });
                                                }
                                                return inData;

                                            }
                                            else {
                                                return Promise.reject({name: "DBError", message: "No channel exists"});
                                            }
                                        }).then(smsDetail => {
                                            if (smsDetail) {
                                                let msgDetails = [];
                                                msgDetails.push(smsDetail);
                                                let sendingObj = {
                                                    msgDetail: msgDetails
                                                };
                                                return dbDXMission.sendSMSToPlayer(null, null, sendingObj).then(returnedMsg => {
                                                    if (returnedMsg && returnedMsg[0]) {

                                                        if (returnedMsg[0].failure) {
                                                            return Promise.reject({
                                                                name: "DBError",
                                                                message: returnedMsg[0].message || "SMS is failed to send"
                                                            });
                                                        }
                                                        else {
                                                            let searchQuery = {
                                                                phoneNumber: smsDetail.phoneNumber,
                                                                platform: smsDetail.platformId,
                                                                dxMission: smsDetail.dbDXMissionId
                                                            };

                                                            return dbconfig.collection_dxPhone.findOneAndUpdate(searchQuery, {$inc: {sendingTimes: 1}}).then(() => {
                                                                return Promise.resolve({
                                                                    message: localization.translate("Player already obtained") + dxMission.creditAmount + localization.translate("dollar cash prize, ") + localization.translate("please take note on the message sent by the system.")
                                                                });
                                                            })

                                                        }
                                                    }

                                                });
                                            }
                                        })
                                    }
                                    else{
                                        return Promise.resolve({
                                            message: localization.translate("Successfully imported into the task, please take note that no message is sent by the system.")
                                        });
                                    }
                                }
                            })

                    }
                    else{
                        return Promise.reject({name: "DBError", message: "Could not find the dxMission"});
                    }
                })

            }
        })

    },

    sendSMSToPlayer: function (adminObjId, adminName, data) {
        let proms = [];
        if (data && data.msgDetail && data.msgDetail.length > 0){
            data.msgDetail.forEach( msg => {
                let phoneData = {};
                let findQuery = {};
                if (msg && msg.dbDXMissionId && msg.phoneNumber && msg.platformId){
                    findQuery = {
                        dxMission: msg.dbDXMissionId,
                        phoneNumber: msg.phoneNumber,
                        platform: msg.platformId
                    };
                }
                else if (msg && msg.dxMissionId){
                    findQuery = {
                        _id: msg.dxMissionId
                    };
                }
                else {
                    return;
                }

                let prom = dbconfig.collection_dxPhone.findOne(findQuery).populate({
                    path: "dxMission", model: dbconfig.collection_dxMission
                }).populate({
                    path: "platform", model: dbconfig.collection_platform
                }).then(
                    dxPhoneRes => {
                        if (dxPhoneRes) {
                            phoneData = dxPhoneRes;

                            return dbconfig.collection_players.findOne({
                                phoneNumber: {$in: [rsaCrypto.encrypt(phoneData.phoneNumber), rsaCrypto.oldEncrypt(phoneData.phoneNumber)]},
                                platform: phoneData.platform,
                                isRealPlayer: true
                            }, {_id: 1}).lean();
                        }
                        return Promise.reject({message: `dxPhone does not exist msg.dxMissionId`});
                    }
                ).then(
                    playerExist => {
                        if (playerExist) {
                            return Promise.reject({message: `dxPhone ${phoneData.phoneNumber} already a player, so sms not sent`})
                        }

                        return replaceMailKeywords(phoneData.dxMission.invitationTemplate, phoneData.dxMission, phoneData);
                    }
                ).then(
                    message => {
                        let sendObj = {
                            tel: msg.phoneNumber.trim(),
                            channel: data.channel || msg.channel,
                            platformId: phoneData.platform.platformId,
                            message: message,
                            data: {
                                dxMission: phoneData.dxMission
                            }
                        };

                        let encodePhoneNum = dbUtility.encodePhoneNum(sendObj.tel) || '';
                        let recipientName = msg.name || encodePhoneNum || '';
                        return smsAPI.sending_sendMessage(sendObj).then(
                            retData => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'success');
                                console.log("SMS SENT SUCCESSFULLY");
                                return retData;
                            },
                            retErr => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'failure', retErr);
                                console.log("SMS SENT FAILED", {error: retErr, sendObj: sendObj});
                                return {message: retErr, data: msg, failure: true};
                            }
                        );

                        // dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'success');
                        // // if (sendObj.tel == "11112365258"){
                        // //     return {failure: true};
                        // // }else{
                        //     return {name:"lol"};
                        // // // }
                    }
                ).catch(
                    err => {
                        console.error(err)
                        return {message: err, data: msg, failure: true}
                    }
                );
                proms.push(prom);
            });

            return Q.all(proms);
        }

    },

    getDXPhoneNumberInfo: function (platformObjId, dxMission, index, limit, sortCol, data) {
        // let Qindex = index || 0;
        // let Qlimit = Math.min(constSystemParam.REPORT_MAX_RECORD_NUM, limit);
        // let QsortCol = sortCol || {'createTime': -1};


        let findQuery = {
            platform: platformObjId,
            dxMission: dxMission,
            createTime: {$gte: new Date(data.importedTelStartTime), $lt: new Date(data.importedTelEndTime)},
        }

        if (data.customerType == 'created') {
            findQuery.playerObjId = {$exists: true};
        }
        else if (data.customerType == 'notCreated'){
            findQuery.playerObjId = {$exists: false};
        }

        if(data.phoneNumber){
            findQuery.phoneNumber = data.phoneNumber;
        }

        let beforeDXCheckTime = new Date();
        console.log('JY check before dx query', beforeDXCheckTime);

       // let sizeProm = dbconfig.collection_dxPhone.find(findQuery).count();
        let dxPhoneDataProm = dbconfig.collection_dxPhone.find(findQuery, {playerObjId: 1, platform: 1, dxMission: 1, createTime: 1, url: 1, remark: 1, phoneNumber: 1})
            .populate({
                path: "playerObjId",
                model: dbconfig.collection_players,
                select: 'name topUpTimes loginTimes'
            }).sort({createTime: -1}).lean();
            //.sort(QsortCol).skip(Qindex).limit(Qlimit);
        let dxMissionProm =  dbconfig.collection_dxMission.findOne({_id: dxMission}).lean();


        return Promise.all([dxPhoneDataProm, dxMissionProm]).then(
            result => {

                let afterDXCheckTime = new Date();
                console.log('JY check after dx query', afterDXCheckTime);
                console.log('Jy check dx difference', new Date(afterDXCheckTime).getTime() - new Date(beforeDXCheckTime).getTime());

                if(result){
                    //let size = result[0] ? result[0] : 0;
                    let dxPhoneData = result[0] ? result[0] : {};
                    let dxMissionData = result[1] ? result[1] : {};
                    let dxPhoneDataWithDetails = [];

                    if (dxPhoneData && dxPhoneData.length > 0){
                        return dbDXMission.retrieveSMSLogInfo(dxPhoneData, ObjectId(dxMission), data.lastSendingStartTime, data.lastSendingEndTime).then( smsLog => {
                            console.log('JY check after sms return', new Date());
                            if (smsLog && smsLog.length > 0){
                                let smsLogDetail = {};

                                console.log('JY check before sms forEach', new Date());
                                smsLog.forEach( data => {
                                    if (data){
                                        smsLogDetail[data.phoneNumber] = data;
                                    }

                                });
                                console.log('JY check after sms forEach', new Date());

                                let beforeDXForEachTime = new Date();
                                console.log('JY check before dx forEach',beforeDXForEachTime);

                                dxPhoneData.forEach( (phoneData,i) => {
                                    if (smsLogDetail && smsLogDetail[phoneData.phoneNumber.trim()]){
                                        phoneData.phoneNumber = phoneData.phoneNumber.trim();
                                        let details = {};
                                        details.lastTime = smsLogDetail[phoneData.phoneNumber].lastTime ? smsLogDetail[phoneData.phoneNumber].lastTime : null;
                                        details.count = smsLogDetail[phoneData.phoneNumber].count;
                                        let phoneDataWithDetails = Object.assign({},JSON.parse(JSON.stringify(phoneData)),details);
                                        phoneDataWithDetails.phoneNumber$ = dbUtil.encodePhoneNum(phoneDataWithDetails.phoneNumber);

                                        if (Number.isInteger(data.msgTimes)){
                                            switch (data.operator) {
                                                case '>=':
                                                    if (details.count >= data.msgTimes) {
                                                        dxPhoneDataWithDetails.push(phoneDataWithDetails);
                                                    }
                                                    break;
                                                case '=':
                                                    if (details.count == data.msgTimes ) {
                                                        dxPhoneDataWithDetails.push(phoneDataWithDetails);
                                                    }
                                                    break;
                                                case '<=':
                                                    if (details.count <= data.msgTimes ) {
                                                        dxPhoneDataWithDetails.push(phoneDataWithDetails);
                                                    }
                                                    break;
                                                case 'range':
                                                    if (details.count <= data.msgTimes2 && details.count >= data.msgTimes ) {
                                                        dxPhoneDataWithDetails.push(phoneDataWithDetails);
                                                    }
                                                    break;
                                            }
                                        }
                                        else{
                                            dxPhoneDataWithDetails.push(phoneDataWithDetails);
                                        }

                                    }
                                })

                                let afterDXForEachTime = new Date();
                                console.log('JY check after dx forEach',afterDXForEachTime);
                                console.log('Jy check dx forEach difference', new Date(afterDXForEachTime).getTime() - new Date(beforeDXForEachTime).getTime());

                            }
                            return {dxPhoneData: dxPhoneDataWithDetails, dxMissionData: dxMissionData};
                            // return {size: size, dxPhoneData: dxPhoneDataWithDetails, dxMissionData: dxMissionData};
                        })
                    }

                }
            }
        )
    },

    getDXPlayerInfo: function(platformObjId, dxMission, type, searchCriteria, index, limit, sortCol){
        limit = limit ? limit : 10;
        index = index ? index : 0;

        let matchObj = {
            platform: platformObjId,
            dxMission: ObjectId(dxMission)
        };

        if(searchCriteria && searchCriteria != ""){
            let playerObjId = searchCriteria.split(",");
            matchObj._id = {$in: playerObjId.map(p => ObjectId(p))};
        }
        let checkFeedBackProm = [];
        let dxMissionObj = {};
        let totalCountProm = dbconfig.collection_players.find(matchObj).count();
        let playerDetailsProm = dbconfig.collection_dxMission.findOne({_id: dxMission}).lean().then(
            dxMissionData => {
                dxMissionObj = dxMissionData;
                let alertDay = null;
                if(dxMissionData && dxMissionData.alertDays){
                    alertDay = dxMissionData.alertDays;
                }

                return dbconfig.collection_players.find(matchObj).lean()
                    .populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints}).then(
                    playerData => {
                        if(playerData && playerData.length > 0){
                            playerData.map(data => {
                                if(data){

                                    let topupSum = data.topUpSum ?　data.topUpSum : 0;
                                    let withdrawSum = data.withdrawSum ? data.withdrawSum : 0;
                                    data.totalDepositAmount = topupSum - withdrawSum;
                                    checkFeedBackProm.push(dbconfig.collection_playerFeedback.find({playerId: data._id}).lean().then(
                                        feedBackData => {
                                            if (!feedBackData || feedBackData.length <= 0) {
                                                let registeredTime = new Date(data.registrationTime);
                                                let alertPeriod = new Date(dbUtility.getNdaylaterFromSpecificStartTime(alertDay,registeredTime)).getTime();

                                                if(alertPeriod >= new Date().getTime()){
                                                    return {playerObjId: data._id, alert: true};
                                                }
                                            }

                                            return {playerObjId: data._id, alert: false};
                                        }
                                    ));
                                }
                            })

                            return Promise.all(checkFeedBackProm).then(
                                alertList => {
                                    if(alertList && alertList.length > 0){
                                        alertList.forEach(alert => {
                                            if(alert && alert.playerObjId){
                                                let indexNo = playerData.findIndex(p => p._id == alert.playerObjId);
                                                if(indexNo != -1){
                                                    playerData[indexNo].alerted = alert.alert;
                                                }
                                            }
                                        })
                                    }

                                    return playerData;
                                }
                            );
                        }
                    }
                );
            }
        );

        function sortByRegistrationTime(a, b){
            if(a.registrationTime < b.registrationTime){
                return 1;
            }else if(a.registrationTime > b.registrationTime){
                return -1;
            }

            return 0;
        }

        return Promise.all([totalCountProm, playerDetailsProm]).then(
            result => {
                if(result){
                    let size = result[0] ? result[0] : 0;
                    let dxPhoneData = result[1] ? result[1] : [];
                    let phoneDataWithAlert = dxPhoneData.filter(d => d.alerted == true);
                    let phoneDataWithoutAlert = dxPhoneData.filter(d => d.alerted == false);

                    //sort by alerted = true first, then registrationTime
                    phoneDataWithAlert.sort(sortByRegistrationTime);
                    phoneDataWithoutAlert.sort(sortByRegistrationTime);

                    let finalDXPhoneData = phoneDataWithAlert.concat(phoneDataWithoutAlert);

                    return {totalCount: size, dxPhoneData: finalDXPhoneData.slice(index, Number(limit) + Number(index)), dxMissionData: dxMissionObj};
                }
            }
        );
    },

    getPlayerInfo: function (playerObjId, platform, type, alertDay, phoneNumber) {

        if(!playerObjId){
            return;
        }

        let playerData
        let playerName = "";
        //let registrationTime = new Date();
        let playerPermission;
        let totalTopUpCount = 0;
        let totalLoginTimes = 0;
        let totalConsumptionTime = 0;
        let totalConsumptionAmount = 0;
        let playerBonusAmount = 0;
        let totalTopUpAmount = 0;
        let bonusProm = [];
        let topUpPlayerProm = [];
        let playerConsumptionProm = [];
        let alerted = false;
        let checkFeedBackProm = [];

        let query = {
            _id: playerObjId
        }

        if(type == "TotalPlayerTopUp"){
            query.topUpTimes = {$gte: 1}
        }else if(type == "TotalPlayerMultiTopUp"){
            query.topUpTimes = {$gt: 1}
        }

        return dbconfig.collection_players.findOne(query)
            .populate({path: "rewardPointsObjId", model: dbconfig.collection_rewardPoints}).lean().then(
            playerData => {
                if(playerData){
                    playerData = playerData;

                    checkFeedBackProm = dbconfig.collection_playerFeedback.find({playerId: playerData._id}).then(
                        feedBackData => {
                            if(!feedBackData || feedBackData.length <= 0){
                                if (alertDay && playerData.registrationTime){
                                    let alertPeriod = new Date(dbUtility.getNdaylaterFromSpecificStartTime(alertDay,new Date(playerData.registrationTime))).getTime();
                                    if (alertPeriod >= new Date().getTime()){
                                        alerted = true;
                                    }
                                }
                            }
                        }
                    )

                    topUpPlayerProm = dbconfig.collection_playerTopUpRecord.find({playerId: playerData._id}).lean().then(
                        topUpRecord => {
                            if(topUpRecord && topUpRecord.length > 0){
                                if(topUpRecord.length > 1){
                                    totalTopUpAmount = topUpRecord.reduce(function(previousValue, currentValue) {
                                        let previousAmount = typeof previousValue.amount != "undefined" ? previousValue.amount
                                            : previousValue;

                                        return previousAmount + currentValue.amount;
                                    });
                                }else{
                                    totalTopUpAmount = topUpRecord[0].amount;
                                }

                                return;
                            }
                        }
                    );

                    playerConsumptionProm = dbconfig.collection_playerConsumptionRecord.find({playerId: playerData._id}).lean().then(
                        consumptionRecord => {
                            if(consumptionRecord && consumptionRecord.length > 0){
                                totalConsumptionTime = consumptionRecord.length;
                                if(consumptionRecord.length > 1){
                                    totalConsumptionAmount = consumptionRecord.reduce(function(previousValue, currentValue) {
                                        let previousValidAmount = typeof previousValue.validAmount != "undefined" ? previousValue.validAmount
                                            : previousValue;
                                        return previousValidAmount + currentValue.validAmount;
                                    });
                                }else{
                                    totalConsumptionAmount = consumptionRecord[0].validAmount;
                                }

                                return;
                            }
                        }
                    );

                    bonusProm = dbconfig.collection_proposalType.findOne({platformId: platform, name: constProposalType.PLAYER_BONUS}).then(
                        proposalType => {
                            if(proposalType){
                                return dbconfig.collection_proposal.find({type: proposalType._id, 'data.playerObjId': playerData._id, status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}}).lean().then(
                                    proposalData => {
                                        if(proposalData && proposalData.length > 0){
                                            if(proposalData.length > 1){
                                                playerBonusAmount = proposalData.reduce(function(previousValue, currentValue) {
                                                    if(previousValue.data){
                                                        return previousValue.data.amount + currentValue.data.amount;
                                                    }else{
                                                        return previousValue + currentValue.data.amount;
                                                    }

                                                });
                                            }else{
                                                playerBonusAmount = proposalData[0].data.amount;
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    );

                    return Promise.all([topUpPlayerProm, playerConsumptionProm, bonusProm, checkFeedBackProm]).then(
                        returnData => {
                            return {
                                playerObjId: playerObjId,
                                phoneNumber: phoneNumber,
                                playerData: playerData,
                                totalTopUpAmount: totalTopUpAmount,
                                totalConsumptionTime: totalConsumptionTime,
                                totalConsumptionAmount: totalConsumptionAmount,
                                totalDepositAmount: totalTopUpAmount - playerBonusAmount,
                                alerted: alerted
                            }
                        }
                    );
                }
            }
        );
    },

    retrieveSMSLogInfo: function (dxPhoneData, dxMissionObjId, lastSendingStartTime, lastSendingEndTime) {
        let smsLogReturnedObj = [];
        if (dxPhoneData && dxPhoneData.length > 0) {

            let findQuery = {
                "data.dxMission": dxMissionObjId,
                status: "success"
            };

            if (lastSendingStartTime && lastSendingEndTime){
                findQuery.createTime = {$gte: new Date(lastSendingStartTime), $lt: new Date(lastSendingEndTime)};
            }

            let beforeSMSLogCheckTime = new Date();
            console.log('JY check before sms query', beforeSMSLogCheckTime);

            return dbconfig.collection_smsLog.aggregate(
                {
                    $match: findQuery
                },
                {
                    $group: {
                        _id:{phoneNumber: "$tel"},
                        lastTime: {$last: "$createTime"},
                        count: {$sum: 1},
                    }
                }
            ).read("secondaryPreferred").then(
                smsLog => {
                    let afterSMSLogCheckTime = new Date();
                    console.log('JY check after sms query', afterSMSLogCheckTime);
                    console.log('Jy check sms query difference', new Date(afterSMSLogCheckTime).getTime() - new Date(beforeSMSLogCheckTime).getTime());

                    dxPhoneData.forEach(data => {
                        let returnedData = {};
                        let indexNo = smsLog.findIndex(s => s._id.phoneNumber == data.phoneNumber.trim());

                        if (indexNo > -1) {
                            returnedData = {
                                phoneNumber: smsLog[indexNo]._id.phoneNumber,
                                lastTime: smsLog[indexNo].lastTime,
                                count: smsLog[indexNo].count
                            }
                        }else{
                            returnedData = {
                                phoneNumber: data.phoneNumber.trim(),
                                count: 0
                            }
                        }

                        smsLogReturnedObj.push(returnedData);
                    });

                    console.log('JY check before sms return', new Date());

                    return smsLogReturnedObj;
                }
            )
        }
    },

    updatePhoneNumberRemark: function(platform, dxMission, remarkObj) {
        let promArr = []
        if(remarkObj){
            for (var objId in remarkObj) {
                if (remarkObj.hasOwnProperty(objId)) {
                    var remark = remarkObj[objId];
                    let prom = dbconfig.collection_dxPhone.findOneAndUpdate({platform: platform, dxMission: dxMission, _id: ObjectId(objId)},{remark: remark}).then(
                        () => {
                            return;
                        },error => {
                            return Promise.reject({
                                name: "DataError",
                                errorMessage: "Update remark failed."
                            });
                        }
                    );
                    promArr.push(prom);
                }
            }
        }
        return Promise.all(promArr);
    },

    getTsPhoneList: function(platform, startTime, endTime, status, name, index, limit, sortCol){
        if(!platform){
            return;
        }

        let filterStatus = [constTsPhoneListStatus.PERFECTLY_COMPLETED, constTsPhoneListStatus.FORCE_COMPLETED, constTsPhoneListStatus.DECOMPOSED]
        let sendQuery = {
            platform: platform,
            status: {$nin: filterStatus},
            createTime: {
                $gte: startTime,
                $lt: endTime
            },
        };

        if (status && status.length) {
            status = status.filter(
                stat => {
                    return !filterStatus.includes(Number(stat));
                }
            );
            sendQuery.status = {$in: status};
        }

        if (name) {
            sendQuery.name = {$in: name};
        }

        let phoneListResult = dbconfig.collection_tsPhoneList.find(sendQuery).skip(index).limit(limit).sort(sortCol).lean();
        let totalPhoneListResult = dbconfig.collection_tsPhoneList.find(sendQuery).count();
        return Promise.all([phoneListResult, totalPhoneListResult]).then(
            result => {
                if(result && result.length > 0){
                    // count total valid player
                    if (result[0] && result[0].length) {
                        dbconfig.collection_partnerLevelConfig.findOne({platform: platform}).lean().then(
                            partnerLevelConfigData => {
                                if (!partnerLevelConfigData) {
                                    return Promise.reject({name: "DataError", message: "Cannot find active player"});
                                }
                                let promArr = [];
                                result[0].forEach(phoneList => {
                                    let updateProm = dbconfig.collection_players.find({
                                        tsPhoneList: phoneList._id,
                                        platform: platform,
                                        topUpTimes: {$gte: partnerLevelConfigData.validPlayerTopUpTimes},
                                        topUpSum: {$gte: partnerLevelConfigData.validPlayerTopUpAmount},
                                        consumptionTimes: {$gte: partnerLevelConfigData.validPlayerConsumptionTimes},
                                        consumptionSum: {$gte: partnerLevelConfigData.validPlayerConsumptionAmount},
                                    }).count().then(
                                        playerCount => {
                                            return dbconfig.collection_tsPhoneList.update({_id: phoneList._id}, {totalValidPlayer: playerCount});
                                        }
                                    );
                                    promArr.push(updateProm);
                                });
                                return Promise.all(promArr);
                            }
                        ).catch(errorUtils.reportError);
                    }

                    return {data: result[0], size: result[1]};
                }
            }
        )
    }
};

module.exports = dbDXMission;

function sendWelcomeMessage(dxMission, dxPhone, player) {
    let titleProm = replaceMailKeywords(dxMission.welcomeTitle, dxMission, dxPhone, player);
    let contentProm = replaceMailKeywords(dxMission.welcomeContent, dxMission, dxPhone, player);

    return Promise.all([titleProm, contentProm]).then(
        data => {
            if (data) {
                let title = data[0] ? data[0] : "";
                let content = data[1] ? data[1] : "";

                return dbPlayerMail.createPlayerMail({
                    platformId: dxPhone.platform,
                    recipientType: 'player',
                    recipientId: player._id,
                    title: title,
                    content: content,
                    senderType: 'System',
                    senderName: 'System',
                });
            }
        }
    )
}

function replaceMailKeywords(str, dxMission, dxPhone, player) {
    let playerNameProm;
    let providerGroupProm = Promise.resolve();

    if (player && player.name) {
        playerNameProm = Promise.resolve(player.name);
    } else {
        playerNameProm = generateDXPlayerName(dxMission.lastXDigit, dxMission.platform.prefix, dxMission.playerPrefix, dxPhone)
    }

    if (dxMission.providerGroup && String(dxMission.providerGroup).length === 24) {
        providerGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: dxMission.providerGroup}).lean();
    }

    return Promise.all([playerNameProm, providerGroupProm]).then(
        data => {
            if (data) {
                let playerName = data[0];
                let providerGroupName = data[1] ? data[1].name : "自由大厅";

                str = String(str);
                let registrationUrl = dxMission.domain + "/" + dxPhone.code;
                let loginUrl = dxMission.loginUrl;

                str = str.replace ('{{username}}', playerName);
                str = str.replace ('{{password}}', dxMission.password);
                str = str.replace ('{{registrationUrl}}', registrationUrl);
                str = str.replace ('{{loginUrl}}', loginUrl);
                str = str.replace ('{{creditAmount}}', dxMission.creditAmount);
                str = str.replace ('{{providerGroup}}', providerGroupName);
                str = str.replace ('{{requiredConsumption}}', dxMission.requiredConsumption);

                return str;
            }
        }
    )
}

function updateDxPhoneBUsed (dxPhone, usedPlayerObjId) {
    return dbconfig.collection_dxPhone.findOneAndUpdate({_id: dxPhone._id}, {playerObjId: usedPlayerObjId, bUsed: true});
}

function generateDXPlayerName (lastXDigit, platformPrefix, dxPrefix, dxPhone, tries) {
    let platformObjId = dxPhone.platform;

    if (dxPhone && dxPhone.platform && dxPhone.platform._id) {
        platformObjId = dxPhone.platform._id;
    }

    tries = (Number(tries) || 0) + 1;
    if (tries > 13) {
        return Promise.reject({
            message: "Generate dian xiao code failure."
        })
    }
    let playerName = dxPrefix + String(dxPhone.phoneNumber).slice(-(lastXDigit));
    let fullPlayerName = platformPrefix + playerName;

    return dbconfig.collection_players.findOne({name: {$in: [fullPlayerName, playerName]}, platform: platformObjId}).lean().then(
        playerExist => {
            if (playerExist) {
                return generateDXPlayerName(lastXDigit + 1, platformPrefix, dxPrefix, dxPhone, tries);
            }
            else {
                return playerName;
            }
        }
    );
}

function createPlayer (dxPhone, deviceData, domain, loginDetails, conn, wsFunc) {
    let platform = dxPhone.platform;
    let playerPassword = dxPhone.dxMission.password || "888888";
    let isNew = false;
    let newData = {};
    let filteredDomain = null;
    let phoneLocation = null;

    if (!dxPhone.dxMission) {
        dxPhone.dxMission = {
            loginUrl: "www.kbl8888.com",
            playerPrefix: "test",
        };
    }

    if (!dxPhone.dxMission.lastXDigit instanceof Number) {
        dxPhone.dxMission.lastXDigit = 5;
    }

    let dxMission = dxPhone.dxMission;
    let platformPrefix = platform.prefix || "";

    return dbconfig.collection_players.findOne({
        phoneNumber: {$in: [
            rsaCrypto.encrypt(dxPhone.phoneNumber),
            rsaCrypto.oldEncrypt(dxPhone.phoneNumber)]
        },
        platform: platform._id,
        isRealPlayer: true
    }, {_id: 1, name: 1, phoneNumber: 1}).lean().then(
        playerExist=> {
            if (playerExist) {
                console.log('debug dx not auto login', playerExist);
                return Promise.reject({isPlayerExist: true, message: "Your phone number is registered, please verify and login."});
            }

            return generateDXPlayerName(dxMission.lastXDigit, platformPrefix, dxMission.playerPrefix, dxPhone)
        }
    ).then(
        async playerName => {
            console.log('DX created player: ', playerName);
            isNew = true;

            let playerData = {
                platform: platform._id,
                name: playerName,
                password: dxPhone.dxMission.password || "888888",
                isTestPlayer: false,
                isRealPlayer: true,
                isLogin: true,
                dxMission: dxPhone.dxMission._id,
                phoneNumber: dxPhone.phoneNumber.toString(),
            };

            if (deviceData) {
                playerData = Object.assign({}, playerData, deviceData);
            }

            if (domain) {
                filteredDomain = dbUtility.filterDomainName(domain);

                // while (filteredDomain.indexOf("/") !== -1) {
                //     filteredDomain = filteredDomain.replace("/", "");
                // }

                // if (filteredDomain.indexOf("?") !== -1) {
                //     filteredDomain = filteredDomain.split("?")[0];
                // }
                //
                // if (filteredDomain.indexOf("#") !== -1) {
                //     filteredDomain = filteredDomain.split("#")[0];
                // }

                playerData.domain = filteredDomain;
                console.log("checking register DX new account", [playerData.name, playerData.domain, playerData.partner])
                if(!playerData.partner){
                    await dbconfig.collection_partner.find({
                        ownDomain: playerData.domain
                    }).lean().then(data=>{
                        // Design is one to one. So just get index 0. If many to many in the future, go loop.
                        if (!data || !data[0] || !data[0]._id) {
                            return;
                        }
                        playerData.partner = data[0]._id;
                        console.log('checking new partner',data[0]._id);

                    });
                    // console.log('checking new partner', [temppartner, temppartner._id]);
                }
            }

            if (dxPhone.phoneNumber) {
                phoneLocation = queryPhoneLocation(dxPhone.phoneNumber);
                if (phoneLocation) {
                    playerData.phoneProvince = phoneLocation.province;
                    playerData.phoneCity = phoneLocation.city;
                    playerData.phoneType = phoneLocation.sp;
                }
            }
            if (loginDetails && loginDetails.inputDevice) {
                playerData.registrationInterface = loginDetails.inputDevice;
            }
            return dbPlayerInfo.createPlayerInfo(playerData,null, null, null, null, true);
        }
    ).then(
        async function (playerData) {
            console.log('DX created player: ', playerData.name);
            let profile = {name: playerData.name, password: playerData.password};
            let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

            //  set the loginDevice as registrationDevice if direct login after registered
            if (playerData && playerData.registrationDevice){
                playerData.loginDevice = playerData.registrationDevice;
            }

            let newPlayerData = JSON.parse(JSON.stringify(playerData));
            let playerNameWithPrefix = newPlayerData.name || "";

            if (loginDetails) {
                newPlayerData.password = playerPassword ? playerPassword : (newPlayerData.password || "");
                newPlayerData.inputDevice = loginDetails.inputDevice ? loginDetails.inputDevice : (newPlayerData.inputDevice || "");
                newPlayerData.platformId = platform.platformId ? platform.platformId : (newPlayerData.platformId || "");
                newPlayerData.name = newPlayerData.name || "";
                newPlayerData.ua = loginDetails.ua ? loginDetails.ua : (newPlayerData.userAgent || "");
                newPlayerData.mobileDetect = loginDetails.md ? loginDetails.md : (newPlayerData.mobileDetect || "");
                //after created new player, need to create login record and apply login reward

                // got to update the player loginDevice before applying applyDxMissionReward
                await dbPlayerInfo.playerLogin(newPlayerData, newPlayerData.ua, newPlayerData.inputDevice, newPlayerData.mobileDetect).catch(errorUtils.reportError);
                dbApiLog.createApiLog(conn, wsFunc, null, {}, newPlayerData).catch(errorUtils.reportError);
            }

            if (!dxMission.loginUrl) {
                dxMission.loginUrl = "localhost:3000";
            }

            if (isNew) {
                sendWelcomeMessage(dxMission, dxPhone, playerData).catch(errorUtils.reportError);
                dbDXMission.applyDxMissionReward(dxMission, playerData).catch(errorUtils.reportError);
                console.log('Updating DxPhone to used.');
                updateDxPhoneBUsed(dxPhone, playerData._id).catch(errorUtils.reportError);
            }

            if (deviceData) {
                newData.ipArea = {
                    province: deviceData.province,
                    city: deviceData.city,
                    country: deviceData.country
                };
                newData.loginIps = deviceData.loginIps;
                newData.lastLoginIp = deviceData.lastLoginIp;
            }

            if (newPlayerData) {
                newData.userAgent = newPlayerData.userAgent;
                newData.purpose = 'registration';
                newData.remarks = '';
                newData.gender = newPlayerData.gender ? 1 : 0;
                newData.email = newPlayerData.email ? dbUtil.encodeEmail(newPlayerData.email) : "";
                newData.phoneNumber = dbUtil.encodePhoneNum(dxPhone.phoneNumber);
                newData.platform = newPlayerData.platform;
                newData.name = playerNameWithPrefix;
                newData.promoteWay = newPlayerData.promoteWay;
                newData.registrationTime = newPlayerData.registrationTime;
            }

            if (phoneLocation) {
                newData.phoneProvince = phoneLocation.province;
                newData.phoneCity = phoneLocation.city;
                newData.phoneType = phoneLocation.type;
            }

            if (playerData && playerData._id){
                newData.playerObjId = playerData._id;
            }

            let playerLevelProm = dbconfig.collection_playerLevel.findOne({_id: newPlayerData.playerLevel}, {name: 1}).lean();
            let promoteWayProm = dbconfig.collection_csOfficerUrl.findOne({
                domain: filteredDomain,
                platform: newPlayerData.platform
            }).lean().then(data => {
                if (data) {
                    let adminId = data.admin ? data.admin : "";

                    return dbconfig.collection_admin.findOne({_id: adminId}).lean();
                }
            });

            return Promise.all([playerLevelProm, promoteWayProm]).then(
                data => {
                    if (data) {
                        newData.playerLevelName = data[0] && data[0].name ? data[0].name : "";
                        newData.csOfficer = data[1] && data[1].adminName ? data[1].adminName : "";

                        let proposalData = {
                            creator: newData.adminInfo || {
                                type: 'player',
                                name: newData.name,
                                id: newPlayerData.playerId ? newPlayerData.playerId : ""
                            }
                        };

                        let newProposal = {
                            creator: proposalData.creator,
                            data: newData,
                            entryType: newPlayerData.adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                            userType: newPlayerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                            inputDevice: newPlayerData.inputDevice ? newPlayerData.inputDevice : 0,
                            status: constProposalStatus.SUCCESS
                        };

                        dbPlayerRegistrationIntentRecord.createPlayerRegistrationIntentionProposal(newPlayerData.platform, newProposal, constProposalStatus.SUCCESS);

                        let newIntentData = {
                            data: newData,
                            status: constRegistrationIntentRecordStatus.SUCCESS,
                            name: newData.name
                        };

                        let newRecord = new dbconfig.collection_playerRegistrationIntentRecord(newIntentData);
                        newRecord.save().catch(errorUtils.reportError);

                        return {
                            redirect: dxMission.loginUrl + "?playerId=" + playerData.playerId + "&token=" + token
                        }
                    }
                }
            )
        }
    ).catch(
        err => {
            if (err.isPlayerExist) {
                return Promise.reject(err);
            }
            errorUtils.reportError(err);
            return {redirect: dxMission.loginUrl};
        }
    );
}

async function loginDefaultPasswordPlayer (dxPhone, loginDevice) {
    let playerProm = Promise.resolve();
    let dxMission = dxPhone.dxMission;

    if (dxPhone.playerObjId) {
        playerProm = dbconfig.collection_players.findOne({_id: dxPhone.playerObjId}).lean();
        if (loginDevice) {
            await dbconfig.collection_players.update({_id: dxPhone.playerObjId}, {loginDevice: loginDevice}).catch(errorUtils.reportError);
        }
    }

    return playerProm.then(
        player => {
            if (!player) {
                return Promise.reject({message: "Player not found"}); // will go to catch and handle it anyway
            }

            return new Promise((resolve, reject) => {
                bcrypt.compare(String(dxMission.password), String(player.password), function (err, isMatch) {
                    if (err || !isMatch) {
                        return reject({code: constServerCode.INVALID_USER_PASSWORD, message: "Password changed"});
                    }

                    let profile = {name: player.name, password: player.password};
                    let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

                    resolve({
                        redirect: dxMission.loginUrl + "?playerId=" + player.playerId + "&token=" + token
                    });
                });
            });
        }
    ).catch(
        err => {
            return {redirect: dxMission.loginUrl};
        }
    );
}
