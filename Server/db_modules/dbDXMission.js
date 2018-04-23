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


const constSystemParam = require('../const/constSystemParam');
const constServerCode = require('../const/constServerCode');
const constProposalType = require('../const/constProposalType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalStatus = require('../const/constProposalStatus');
const dbProposal = require('./../db_modules/dbProposal');
const dbUtility = require('./../modules/dbutility');
const bcrypt = require('bcrypt');


const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

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
        let topUpPlayerProm = [];
        let topUpPlayerArr = [];
        let multiTopUpPlayerArr = [];
        let validPlayerArr = [];
        let depositPlayerArr = [];
        let consumptionPlayerArr = [];
        let partnerLevel = {};
        let checkFeedBackProm = [];
        let totalRegisteredPlayer = 0;
        let noOfPlayerTopUp = 0;
        let noOfPlayerMultiTopUp = 0;
        let totalTopUpAmount = 0;
        let totalTopUpCount = 0;
        let totalValidConsumptionCount = 0;
        let totalValidConsumptionAmount = 0;
        let totalPlayerBonusAmount = 0;
        let totalPlayerTopUpAmount = 0;
        let alerted = false;
        importedListProm = dbconfig.collection_dxPhone.find({dxMission: dxMissionId}).count();
        sentMessageListProm = dbconfig.collection_smsLog.distinct("tel", {"data.dxMission": ObjectId(dxMissionId)});
        registeredPlayerListProm = dbconfig.collection_players.find({dxMission: dxMissionId}).then(
            playerData => {
                if(playerData){
                    totalRegisteredPlayer = playerData.length ? playerData.length : 0;
                    playerData.forEach(playerId => {
                       if(playerId){
                           checkFeedBackProm.push(dbconfig.collection_playerFeedback.find({playerId: playerId._id}).then(
                               feedBackData => {
                                   if(!alerted){
                                       if (!feedBackData || feedBackData.length <= 0) {
                                           let registeredTime = new Date(playerId.registrationTime)
                                           let alertPeriod = new Date(dbUtility.getNdaylaterFromSpecificStartTime(alertDay,registeredTime)).getTime();

                                           if (alertPeriod >= new Date().getTime()){
                                               alerted = true;
                                           }
                                       }
                                   }
                               }
                           ));

                           topUpPlayerProm.push(dbconfig.collection_playerTopUpRecord.find({playerId: playerId._id}).then(
                               topUpRecord => {
                                   if(topUpRecord && topUpRecord.length > 0){
                                       noOfPlayerTopUp += 1;
                                       totalTopUpCount = topUpRecord.length;
                                       totalTopUpAmount = topUpRecord.reduce(function(previousValue, currentValue) {
                                           return previousValue.amount + currentValue.amount;
                                       });

                                       //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                       var indexNo = topUpPlayerArr.findIndex(t => t == playerId._id);
                                       if(indexNo == -1){
                                           topUpPlayerArr.push(playerId._id);
                                       }

                                       if(topUpRecord.length > 1){
                                           noOfPlayerMultiTopUp += 1;

                                           //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                           var indexNo = multiTopUpPlayerArr.findIndex(m => m == playerId._id);
                                           if(indexNo == -1){
                                               multiTopUpPlayerArr.push(playerId._id);
                                           }
                                       }

                                       return;
                                   }
                               }
                           ));
                       }
                    });

                    return Promise.all(checkFeedBackProm).then(
                        returnData => {
                            return Promise.all(topUpPlayerProm)
                        }
                    )
                }
            }
        );

        let totalValidPlayerProm = dbconfig.collection_partnerLevelConfig.findOne({platform: platformObjId}).then(
            partnerLevelConfig => {
                partnerLevel = partnerLevelConfig ? partnerLevelConfig : {};
                let resultProm = [];
                return dbconfig.collection_players.find({dxMission: dxMissionId},{_id: 1}).then(
                    playerData => {
                        if(playerData){
                            playerData.forEach(player => {
                                let totalTopUpAmount = 0;
                                let totalConsumptionAmount = 0;
                                let totalTopUpTime = 0;
                                let totalConsumptionTime = 0;
                                let topUpProm = [];
                                let consumptionProm = [];
                                let bonusProm = [];
                                let playerBonusAmount = 0;


                                if(player){
                                    topUpProm = dbconfig.collection_playerTopUpRecord.find({playerId: player._id}).then(
                                        topUpRecord => {
                                            if(topUpRecord && topUpRecord.length > 0){
                                                totalTopUpTime = topUpRecord.length;
                                                if(topUpRecord.length > 1){
                                                    totalTopUpAmount = topUpRecord.reduce(function(previousValue, currentValue) {
                                                        return (previousValue.amount || previousValue) + currentValue.amount;

                                                    });
                                                }else{
                                                    totalTopUpAmount = topUpRecord[0].amount;
                                                }

                                                //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                                var indexNo = depositPlayerArr.findIndex(d => d == player._id);
                                                if(indexNo == -1){
                                                    depositPlayerArr.push(player._id);
                                                }

                                                return;
                                            }
                                        }
                                    );

                                    consumptionProm = dbconfig.collection_playerConsumptionRecord.find({playerId: player._id}).then(
                                        consumptionRecord => {
                                            if(consumptionRecord && consumptionRecord.length > 0){
                                                totalConsumptionTime = consumptionRecord.length;
                                                if(consumptionRecord.length > 1){
                                                    totalConsumptionAmount = consumptionRecord.reduce(function(previousValue, currentValue) {
                                                        return (previousValue.validAmount || previousValue) + currentValue.validAmount;
                                                    });
                                                }else{
                                                    totalConsumptionAmount = consumptionRecord[0].validAmount;
                                                }

                                                //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                                var indexNo = consumptionPlayerArr.findIndex(c => c == player._id);
                                                if(indexNo == -1){
                                                    consumptionPlayerArr.push(player._id);
                                                }

                                                return;
                                            }
                                        }
                                    );

                                    bonusProm = dbconfig.collection_proposalType.findOne({platformId: platformObjId, name: constProposalType.PLAYER_BONUS}).then(
                                        proposalType => {
                                            if(proposalType){
                                                return dbconfig.collection_proposal.find({type: proposalType._id, 'data.playerObjId': player._id, status: constProposalStatus.APPROVED}).then(
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

                                                            //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                                            var indexNo = depositPlayerArr.findIndex(d => d == player._id);
                                                            if(indexNo == -1){
                                                                depositPlayerArr.push(player._id);
                                                            }
                                                        }
                                                    }
                                                )
                                            }
                                        }
                                    );

                                    resultProm.push(Promise.all([topUpProm, consumptionProm, bonusProm]).then(
                                        result => {
                                            if(partnerLevel){

                                                totalValidConsumptionAmount += totalConsumptionAmount;
                                                totalPlayerTopUpAmount += totalTopUpAmount;
                                                totalPlayerBonusAmount += playerBonusAmount;

                                                if(totalTopUpTime < partnerLevel.validPlayerTopUpTimes){
                                                    return;
                                                }
                                                if(totalTopUpAmount < partnerLevel.validPlayerTopUpAmount) {
                                                    return;
                                                }
                                                if(totalConsumptionTime < partnerLevel.validPlayerConsumptionTimes){
                                                    return;
                                                }
                                                if(totalConsumptionAmount < partnerLevel.validPlayerConsumptionAmount){
                                                    return;
                                                }

                                                totalValidConsumptionCount += 1;

                                                //check if playerId is in the array, if not, insert it to the array for second table filtering purpose
                                                var indexNo = validPlayerArr.findIndex(v => v == player._id);
                                                if(indexNo == -1){
                                                    validPlayerArr.push(player._id);
                                                }
                                            }
                                        }
                                    ));
                                }
                            })

                            return Promise.all(resultProm);
                        }
                    }
                );
            }
        )

        return Promise.all([importedListProm, sentMessageListProm, registeredPlayerListProm, totalValidPlayerProm]).then(
            result => {
                if(result){
                    let importedListCount = result[0] ? result[0] : 0;
                    let sentMessageListCount = result[1] ? result[1].length : 0;
                    return {
                        dxMissionId: dxMissionId,
                        importedListCount: importedListCount,
                        sentMessageListCount: sentMessageListCount,
                        registeredPlayerCount: totalRegisteredPlayer,
                        topUpPlayerCount: noOfPlayerTopUp,
                        multiTopUpPlayerCount: noOfPlayerMultiTopUp,
                        totalValidConsumptionAmount: totalValidConsumptionAmount,
                        totalValidConsumptionCount : totalValidConsumptionCount,
                        totalPlayerDepositAmount: totalPlayerTopUpAmount - totalPlayerBonusAmount,
                        validPlayerArr: validPlayerArr,
                        depositPlayerArr: depositPlayerArr,
                        consumptionPlayerArr: consumptionPlayerArr,
                        alerted: alerted,
                        topUpPlayerArr: topUpPlayerArr,
                        multiTopUpPlayerArr: multiTopUpPlayerArr
                    }
                }
            }
        )

    },

    createPlayerFromCode: function (code, deviceData, domain) {
        if (!code) {
            return Promise.reject({
                errorMessage: "Invalid code for creating player"
            });
        }

        return dbconfig.collection_dxPhone.findOne({code: code})
            .populate({path: "dxMission", model: dbconfig.collection_dxMission})
            .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
            function (dxPhone) {
                if (!dxPhone) {
                    return {redirect: "www.kbl8888.com"};
                }

                if (dxPhone.bUsed) {
                    return loginDefaultPasswordPlayer(dxPhone);
                }
                else {
                    return createPlayer(dxPhone, deviceData, domain);
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

    insertPhoneToTask: function (deviceData, platformId, phoneNumber, taskName, autoSMS, isBackStageGenerated, smsChannel) {
        if (!platformId && !phoneNumber && !taskName) {
            return Promise.reject({
                errorMessage: "Invalid data"
            });
        }

        let returnedMsg = null;
        let platformObjId = null;
        const anHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const now = new Date(Date.now()).toISOString();
        const maxIpCount = 5;

        // check the phoneNumber has been registered
        return dbconfig.collection_platform.findOne({platformId: platformId}).lean().then( platformData => {
            if (platformData){

                platformObjId = platformData._id;

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
                let encryptedPhoneNumber = rsaCrypto.encrypt(phoneNumber);
                let phoneNumberQuery = {$in: [encryptedPhoneNumber, phoneNumber]};

                return dbconfig.collection_players.findOne({platform: platformObjId, phoneNumber: phoneNumberQuery}).lean()
            }
        }).then( playerData => {
            if (playerData){

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
                                    return Promise.reject({
                                        message: localization.translate("The phone number is already in the mission list, please invite friends for a lucky draw!")
                                    });
                                }
                                else{
                                    // import the number to the keyed-in dxMission and send out msg if needed
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
                                            return importPhone.save().then ( () => {

                                                // sending msg if required
                                                if (parseInt(autoSMS)){

                                                    let msgDetails = [];

                                                    let smsData = {
                                                        channel: smsChannel,
                                                        platformId: platformObjId,
                                                        dbDXMissionId: dxMission._id,
                                                        phoneNumber: phoneNumber.trim(),
                                                    };

                                                    msgDetails.push(smsData);
                                                    let sendingObj = {
                                                        msgDetail: msgDetails
                                                    };

                                                    dbDXMission.sendSMSToPlayer(null, null, sendingObj);
                                                }

                                                return Promise.resolve({
                                                    message: localization.translate("Successfully got the rewards, please take note on the message sent by the system.")
                                                });
                                            })


                                        }
                                    )
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
        let phoneData = {};
        let prom = [];
        if (data && data.msgDetail && data.msgDetail.length > 0){
            data.msgDetail.forEach( msg => {

                let findQuery = {};
                if (msg && msg.dbDXMissionId && msg.phoneNumber){
                    findQuery = {
                        dxMission: msg.dbDXMissionId,
                        phoneNumber: msg.phoneNumber
                    };
                }
                else if (msg && msg.dxMissionId){
                    findQuery = {
                        _id: msg.dxMissionId
                    };
                }

                prom.push( dbconfig.collection_dxPhone.findOne(findQuery).populate({
                    path: "dxMission", model: dbconfig.collection_dxMission
                }).populate({
                    path: "platform", model: dbconfig.collection_platform
                }).then(
                    dxPhoneRes => {
                        if (dxPhoneRes) {
                            phoneData = dxPhoneRes;

                            return replaceMailKeywords(phoneData.dxMission.invitationTemplate, phoneData.dxMission, phoneData);
                        }
                    }
                ).then(
                    message => {
                        let sendObj = {
                            tel: msg.phoneNumber.trim(),
                            channel: data.channel || 2,
                            platformId: phoneData.platform.platformId,
                            message: message,
                            data: {
                                dxMission: phoneData.dxMission
                            }
                        };

                        let recipientName = msg.name || '';

                        return smsAPI.sending_sendMessage(sendObj).then(
                            retData => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'success');
                                console.log("SMS SENT SUCCESSFULLY");
                                return retData;
                            },
                            retErr => {
                                dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'failure', retErr);
                                console.log("SMS SENT FAILED");
                                return {message: retErr, data: msg, failure: true};
                            }
                        );

                        // dbLogger.createSMSLog(adminObjId, adminName, recipientName, msg, sendObj, msg.platformId, 'success');
                        // if (sendObj.tel == "11112365258"){
                        //     return {failure: true};
                        // }else{
                        //     return {}
                        // }
                    }
                ))
            })

            return Q.all(prom)
        }
        // return dbconfig.collection_dxPhone.findOne({_id: data.dxPhone}).populate({
        //     path: "dxMission", model: dbconfig.collection_dxMission
        // }).populate({
        //     path: "platform", model: dbconfig.collection_platform
        // }).then(
        //     dxPhoneRes => {
        //         if (dxPhoneRes) {
        //             phoneData = dxPhoneRes;
        //
        //             return replaceMailKeywords(phoneData.dxMission.invitationTemplate, phoneData.dxMission, phoneData);
        //         }
        //     }
        // ).then(
        //     message => {
        //         let sendObj = {
        //             tel: data.tel.trim(),
        //             channel: 2,
        //             platformId: phoneData.platform.platformId,
        //             message: message,
        //             data: {
        //                 dxMission: phoneData.dxMission
        //             }
        //         };
        //         let recipientName = data.name || '';
        //
        //         return smsAPI.sending_sendMessage(sendObj).then(
        //             retData => {
        //                 dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'success');
        //                 console.log("SMS SENT SUCCESSFULLY");
        //                 return retData;
        //             },
        //             retErr => {
        //                 dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'failure', retErr);
        //                 console.log("SMS SENT FAILED");
        //                 return Q.reject({message: retErr, data: data});
        //             }
        //         );
        //         // return dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'success');
        //     }
        // );
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

       // let sizeProm = dbconfig.collection_dxPhone.find(findQuery).count();
        let dxPhoneDataProm = dbconfig.collection_dxPhone.find(findQuery).populate({path: "playerObjId", model: dbconfig.collection_players}).sort({createTime: -1}).lean();
            //.sort(QsortCol).skip(Qindex).limit(Qlimit);
        let dxMissionProm =  dbconfig.collection_dxMission.findOne({_id: dxMission}).lean();


        return Promise.all([dxPhoneDataProm, dxMissionProm]).then(
            result => {
                if(result){
                    //let size = result[0] ? result[0] : 0;
                    let dxPhoneData = result[0] ? result[0] : {};
                    let dxMissionData = result[1] ? result[1] : {};
                    let dxPhoneDataWithDetails = [];

                    if (dxPhoneData && dxPhoneData.length > 0){
                        return dbDXMission.retrieveSMSLogInfo(dxPhoneData, ObjectId(dxMission), data.lastSendingStartTime, data.lastSendingEndTime).then( smsLog => {
                            if (smsLog && smsLog.length > 0){
                                let smsLogDetail = {};
                                smsLog.forEach( data => {
                                    if (data){
                                        smsLogDetail[data.phoneNumber] = data;
                                    }

                                });

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

                            }
                            return {dxPhoneData: dxPhoneDataWithDetails, dxMissionData: dxMissionData};
                            // return {size: size, dxPhoneData: dxPhoneDataWithDetails, dxMissionData: dxMissionData};
                        })
                    }

                }
            }
        )
    },

    getDXPlayerInfo: function (platformObjId, dxMission, type, searchCriteria, index, limit, sortCol) {
        limit = limit ? limit : 10;
        index = index ? index : 0;

        let result = [];
        let matchObj = {
            platform: platformObjId,
            dxMission: ObjectId(dxMission),
            playerObjId: {$exists: true}
        };

        if(searchCriteria && searchCriteria != ""){
            let playerObjId = searchCriteria.split(",");
            matchObj.playerObjId = {$in: playerObjId.map(s => ObjectId(s))};
        }

        let dataSummaryListProm = [];

        let totalCountProm = dbconfig.collection_dxPhone.find(matchObj).count();
        let phoneDataProm = dbconfig.collection_dxPhone.find(matchObj).sort({createTime: -1}).skip(index).limit(limit).lean();
        //let phoneDataProm = dbconfig.collection_dxPhone.find(matchObj).sort({createTime: -1}).lean();
        let dxMissionProm = dbconfig.collection_dxMission.findOne({_id: dxMission}).lean();
        let size = 0;
        let dxPhoneData = {};
        let dxMissionData = {};
        let alertDay = null;

        return Promise.all([totalCountProm, phoneDataProm, dxMissionProm]).then(
            result => {
                if(result){
                    size = result[0] ? result[0] : 0;
                    dxPhoneData = result[1] ? result[1] : {};
                    dxMissionData = result[2] ? result[2] : {};

                    return {size: size, dxPhoneData: dxPhoneData, dxMissionData: dxMissionData};
                }
            }
        ).then(
            data => {
                if (data.dxMissionData){
                    alertDay = data.dxMissionData.alertDays;
                }
                data.dxPhoneData.forEach(
                    phoneData => {
                        if(phoneData){
                                dataSummaryListProm.push(dbDXMission.getPlayerInfo(phoneData.playerObjId, phoneData.platform, type, alertDay, phoneData.phoneNumber));
                        }
                    }
                )

                return Promise.all(dataSummaryListProm).then(
                    summaryData => {
                        let resultData = JSON.parse(JSON.stringify(data));
                        let dataToBeDeleted = [];

                        if(summaryData){
                            summaryData.forEach(
                                summary => {
                                    if(summary){
                                        resultData.dxPhoneData.map(
                                            (phoneData,i) => {
                                                if(phoneData){
                                                    if(summaryData && summaryData.find(s => s && s.playerObjId == phoneData.playerObjId)){
                                                        if(phoneData.playerObjId && phoneData.playerObjId == summary.playerObjId){
                                                            phoneData.playerData = summary.playerData;
                                                            phoneData.totalTopUpAmount = summary.totalTopUpAmount;
                                                            phoneData.totalConsumptionTime = summary.totalConsumptionTime;
                                                            phoneData.totalConsumptionAmount = summary.totalConsumptionAmount;
                                                            phoneData.totalDepositAmount = summary.totalDepositAmount;
                                                            phoneData.phoneNumber = summary.phoneNumber;
                                                            phoneData.alerted = summary.alerted;
                                                        }
                                                    }else{
                                                        if(dataToBeDeleted.findIndex(d => d == phoneData.playerObjId) == -1){
                                                            dataToBeDeleted.push(phoneData.playerObjId);
                                                        }
                                                    }
                                                }
                                            }
                                        )
                                    }
                                }
                            )
                        }

                        //remove the data without playerinfo details
                        dataToBeDeleted.forEach(playerObjId => {
                            var indexNo = resultData.dxPhoneData.findIndex(r => r.playerObjId == playerObjId);

                            if(indexNo != -1){
                                resultData.dxPhoneData.splice(indexNo,1)
                            }
                        })

                        return {totalCount: data.size, dxPhoneData: resultData.dxPhoneData, dxMissionData: data.dxMissionData}
                    }
                )
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

                    topUpPlayerProm = dbconfig.collection_playerTopUpRecord.find({playerId: playerData._id}).then(
                        topUpRecord => {
                            if(topUpRecord && topUpRecord.length > 0){
                                if(topUpRecord.length > 1){
                                    totalTopUpAmount = topUpRecord.reduce(function(previousValue, currentValue) {
                                        return (previousValue.amount || previousValue) + currentValue.amount;
                                    });
                                }else{
                                    totalTopUpAmount = topUpRecord[0].amount;
                                }

                                return;
                            }
                        }
                    );

                    playerConsumptionProm = dbconfig.collection_playerConsumptionRecord.find({playerId: playerData._id}).then(
                        consumptionRecord => {
                            if(consumptionRecord && consumptionRecord.length > 0){
                                totalConsumptionTime = consumptionRecord.length;
                                if(consumptionRecord.length > 1){
                                    totalConsumptionAmount = consumptionRecord.reduce(function(previousValue, currentValue) {
                                        return (previousValue.validAmount || previousValue) + currentValue.validAmount;
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
                                return dbconfig.collection_proposal.find({type: proposalType._id, 'data.playerObjId': playerData._id, status: constProposalStatus.APPROVED}).then(
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
        let smsLogProm = [];
        if (dxPhoneData && dxPhoneData.length > 0) {

            dxPhoneData.forEach (data => {

                let newRegexPhoneNumber = new RegExp(data.phoneNumber.trim());
                let findQuery = {
                    tel: {$regex: newRegexPhoneNumber},
                    "data.dxMission": dxMissionObjId,
                };

                if (lastSendingStartTime && lastSendingEndTime){
                    findQuery.createTime = {$gte: new Date(lastSendingStartTime), $lt: new Date(lastSendingEndTime)};
                }

                smsLogProm.push(dbconfig.collection_smsLog.find(findQuery).sort({createTime:-1}).then(
                    smsLogData => {
                        // filter the users according to the lastTime
                        if (lastSendingStartTime && lastSendingEndTime){
                            if (smsLogData && smsLogData.length > 0) {

                                return {
                                    phoneNumber: smsLogData[0].tel.trim(),
                                    lastTime: smsLogData[0].createTime,
                                    count: smsLogData.length
                                }
                            }
                        }
                        else{
                            // to consider users that have not received msg yet
                            if (smsLogData && smsLogData.length > 0) {
                                return {
                                    phoneNumber: smsLogData[0].tel.trim(),
                                    lastTime: smsLogData[0].createTime,
                                    count: smsLogData.length
                                }
                            }
                            else{
                                return {
                                    phoneNumber: data.phoneNumber.trim(),
                                    count: 0
                                }
                            }
                        }

                    }
                ))
            });

            return Q.all(smsLogProm);
        }
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
                    content: content
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
    tries = (Number(tries) || 0) + 1;
    if (tries > 13) {
        return Promise.reject({
            message: "Generate dian xiao code failure."
        })
    }
    let playerName = dxPrefix + String(dxPhone.phoneNumber).slice(-(lastXDigit));
    let fullPlayerName = platformPrefix + playerName;

    return dbconfig.collection_players.findOne({name: fullPlayerName, platform: dxPhone.platform}).lean().then(
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

function createPlayer (dxPhone, deviceData, domain) {
    let platform = dxPhone.platform;

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

    return generateDXPlayerName(dxMission.lastXDigit, platformPrefix, dxMission.playerPrefix, dxPhone).then(
        playerName => {
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
                playerData.domain = domain;
            }

            return dbPlayerInfo.createPlayerInfo(playerData);
        }
    ).then(
        function (playerData) {
            let profile = {name: playerData.name, password: playerData.password};
            let token = jwt.sign(profile, constSystemParam.API_AUTH_SECRET_KEY, {expiresIn: 60 * 60 * 5});

            if (!dxMission.loginUrl) {
                dxMission.loginUrl = "localhost:3000";
            }

            if (isNew) {
                sendWelcomeMessage(dxMission, dxPhone, playerData).catch(errorUtils.reportError);
                dbDXMission.applyDxMissionReward(dxMission, playerData).catch(errorUtils.reportError);
                updateDxPhoneBUsed(dxPhone, playerData._id).catch(errorUtils.reportError);
            }

            return {
                redirect: dxMission.loginUrl + "?playerId=" + playerData.playerId + "&token=" + token
            }
        }
    ).catch(
        err => {
            return {redirect: dxMission.loginUrl};
        }
    );
}

function loginDefaultPasswordPlayer (dxPhone) {
    let playerProm = Promise.resolve();
    let dxMission = dxPhone.dxMission;

    if (dxPhone.playerObjId) {
        playerProm = dbconfig.collection_players.findOne({_id: dxPhone.playerObjId}).lean();
    }

    return playerProm.then(
        player => {
            if (!player) {
                return Promise.reject({message: "Player not found"}); // will go to catch and handle it anyway
            }
            
            return new Promise((resolve, reject) => {
                bcrypt.compare(String(dxMission.password), String(player.password), function (err, isMatch) {
                    if (err || !isMatch) {
                        return reject({message: "Password changed"});
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
