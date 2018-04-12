var dbUtil = require('./../modules/dbutility');
var dbconfig = require('./../modules/dbproperties');
var log = require("./../modules/logger");
var Q = require("q");
var dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
var dbPlayerMail = require("./../db_modules/dbPlayerMail");
var errorUtils = require("./../modules/errorUtils");
var dbLogger = require('./../modules/dbLogger');
const jwt = require('jsonwebtoken');
const constSystemParam = require('../const/constSystemParam');
const constServerCode = require('../const/constServerCode');
const constProposalType = require('../const/constProposalType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalEntryType = require('../const/constProposalEntryType');
const dbProposal = require('./../db_modules/dbProposal');

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

    getAllDxMission: function () {
        return dbconfig.collection_dxMission.find();
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
        let importedListProm = [];
        let sentMessageListProm = [];
        let registeredPlayerListProm = [];
        let dataSummaryListProm = [];

        let totalCountProm = dbconfig.collection_dxMission.find(matchObj).count();
        let dxMissionDataProm = dbconfig.collection_dxMission.find(matchObj)
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
                            dataSummaryListProm.push(dbDXMission.getDataSummaryList(missionData._id));
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
                                            missionData => {
                                                if(missionData){
                                                    if(missionData._id && missionData._id == summary.dxMissionId){
                                                        missionData.importedListCount = summary.importedListCount;
                                                        missionData.sentMessageListCount = summary.sentMessageListCount;
                                                        missionData.registeredPlayerCount = summary.registeredPlayerCount;
                                                        missionData.topUpPlayerCount = summary.topUpPlayerCount;
                                                        missionData.multiTopUpPlayerCount = summary.multiTopUpPlayerCount;
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

        // return dbconfig.collection_dxMission.find(matchObj).then(
        //     missionDetails => {
        //         if(missionDetails){
        //             return missionDetails;
        //         }
        //     }
        // );

        // if ((query.consumptionTimesValue || Number(query.consumptionTimesValue) === 0) && query.consumptionTimesOperator) {
        //     let relevant = true;
        //     switch (query.consumptionTimesOperator) {
        //         case '>=':
        //             relevant = result.consumptionTimes >= query.consumptionTimesValue;
        //             break;
        //         case '=':
        //             relevant = result.consumptionTimes == query.consumptionTimesValue;
        //             break;
        //         case '<=':
        //             relevant = result.consumptionTimes <= query.consumptionTimesValue;
        //             break;
        //         case 'range':
        //             if (query.consumptionTimesValueTwo) {
        //                 relevant = result.consumptionTimes >= query.consumptionTimesValue && result.consumptionTimes <= query.consumptionTimesValueTwo;
        //             }
        //             break;
        //     }
        //
        //     if (!relevant) {
        //         return "";
        //     }
        // }
    },

    getDataSummaryList: function (dxMissionId) {
        if(!dxMissionId){
            return;
        }

        let importedListProm = [];
        let sentMessageListProm = [];
        let registeredPlayerListProm = [];
        let topUpPlayerProm = [];
        let playerConsumptionProm = [];
        let totalRegisteredPlayer = 0;
        let noOfPlayerTopUp = 0;
        let noOfPlayerMultiTopUp = 0;
        let validPlayer = 0;
        let totalTopUpAmount = 0;
        let totalTopUpCount = 0;
        let totalValidConsumptionAmount = 0;
        let totalValidConsumptionCount = 0;

        importedListProm = dbconfig.collection_dxPhone.find({dxMission: dxMissionId}).count();
        sentMessageListProm = dbconfig.collection_smsLog.find({"data.dxMission": dxMissionId}).count();
        registeredPlayerListProm = dbconfig.collection_players.find({dxMission: dxMissionId},{_id: 1}).then(
            playerData => {
                if(playerData){
                    totalRegisteredPlayer = playerData.length ? playerData.length : 0;

                    playerData.forEach(playerId => {
                       if(playerId){
                           console.log("FFFFFFFFFFFFFFFFF",playerId);
                           topUpPlayerProm.push(dbconfig.collection_playerTopUpRecord.find({playerId: playerId}).then(
                               topUpRecord => {
                                   if(topUpRecord){
                                       noOfPlayerTopUp += 1;
                                       totalTopUpCount = topUpRecord.length;
                                       totalTopUpAmount = topUpRecord.reduce(function(previousValue, currentValue) {
                                           return previousValue.amount + currentValue.amount;
                                       });

                                       if(topUpRecord.length > 1){
                                           noOfPlayerMultiTopUp += 1;
                                       }

                                       return;
                                   }
                               }
                           ));

                           playerConsumptionProm.push(dbconfig.collection_playerConsumptionRecord.find({playerId: playerId}).then(
                               consumptionRecord => {
                                   if(consumptionRecord){
                                       //totalValidConsumptionCount = consumptionRecord.length;
                                       totalValidConsumptionCount = 2;
                                       totalValidConsumptionAmount = consumptionRecord.reduce(function(previousValue, currentValue) {
                                           return previousValue.validAmount + currentValue.validAmount;
                                       });

                                       return;
                                   }
                               }
                           ));
                       }
                    });

                    return Promise.all([topUpPlayerProm,playerConsumptionProm]).then(
                        returnData => {
                            return returnData;
                        }
                    );
                }
            }
        );

        return Promise.all([importedListProm, sentMessageListProm, registeredPlayerListProm]).then(
            result => {
                if(result){
                    let importedListCount = result[0] ? result[0] : 0;
                    let sentMessageListCount = result[1] ? result[1] : 0;

                    return {
                        dxMissionId: dxMissionId,
                        importedListCount: importedListCount,
                        sentMessageListCount: sentMessageListCount,
                        registeredPlayerCount: totalRegisteredPlayer,
                        topUpPlayerCount: noOfPlayerTopUp,
                        multiTopUpPlayerCount: noOfPlayerMultiTopUp,
                        totalValidConsumptionAmount: totalValidConsumptionAmount,
                        totalValidConsumptionCount : totalValidConsumptionCount
                    }
                }
            }
        )

    },

    getValidPlayer: function (platformId, dxMissionId) {
        return dbconfig.collection_partnerLevelConfig.findOne({platform: platformId}).then(
            partnerLevelConfig => {
                if(partnerLevelConfig){

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
        let dxPhone = {};
        let dxMission = {};
        let platform = {};

        return dbconfig.collection_dxPhone.findOne({
            code: code,
            bUsed: false,
        }).populate({path: "dxMission", model: dbconfig.collection_dxMission})
        .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
            function (phoneDetail) {
                if (!phoneDetail) {
                    return Promise.reject({
                        errorMessage: "Invalid code for creating player"
                    });
                }
                
                dxPhone = phoneDetail;
                platform = dxPhone.platform;

                if (!phoneDetail.dxMission) {
                    phoneDetail.dxMission = {
                        loginUrl: "eu99999.com",
                        playerPrefix: "test",
                    };
                }

                if (!phoneDetail.dxMission.lastXDigit instanceof Number) {
                    phoneDetail.dxMission.lastXDigit = 5;
                }

                dxMission = phoneDetail.dxMission;
                let platformPrefix = platform.prefix || "";

                return generateDXPlayerName(dxMission.lastXDigit, platformPrefix, dxMission.playerPrefix, dxPhone);
            }
        ).then(
            function (playerName) {
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

                sendWelcomeMessage(dxMission, dxPhone, playerData).catch(errorUtils.reportError);

                dbDXMission.applyDxMissionReward(dxMission, playerData).catch(errorUtils.reportError);

                updateDxPhoneBUsed(dxPhone).catch(errorUtils.reportError);

                return {
                    redirect: dxMission.loginUrl + "?playerId=" + playerData.playerId + "&token=" + token
                }
            }
        );
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
                                        eventId: "579196839b4ffcd65244e5e9" //hard code for DxReward
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

    sendSMSToPlayer: function (adminObjId, adminName, data) {
        return dbconfig.collection_dxMission.findOne({_id: ObjectId(data.dxMission)}).then(
            missionData => {
                if(missionData){
                    var sendObj = {
                        tel: data.tel,
                        channel: 2,
                        platformId: ObjectId(data.platformId),
                        message: missionData.invitationTemplate,
                        //delay: data.delay,
                        'data.dxMission': data.dxMission,
                    };
                    var recipientName = data.name || '';

                    console.log("1111111111111111",sendObj)

                    return smsAPI.sending_sendMessage(sendObj).then(
                        retData => {
                            dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'success');
                            return retData;
                        },
                        retErr => {
                            dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'failure', retErr);
                            return Q.reject({message: retErr, data: data});
                        }
                    );
                }
            }
        )

    },

    getDXPhoneNumberInfo: function (platformObjId, count, dxMission) {
        var count = count === 0 ? 0 : (parseInt(count) || constSystemParam.MAX_RECORD_NUM);

        return dbconfig.collection_dxPhone.find({platform: platformObjId, dxMission: dxMission});
    },
};

module.exports = dbDXMission;

function sendWelcomeMessage(dxMission, dxPhone, player) {
    let providerGroupProm = Promise.resolve();

    if (dxMission.providerGroup && String(dxMission.providerGroup.length) === 24) {
        providerGroupProm = dbconfig.collection_gameProviderGroup.findOne({_id: dxMission.providerGroup}).lean();
    }

    return providerGroupProm.then(
        function (providerGroup) {
            let providerGroupName = "自由大厅";
            if (providerGroup) {
                providerGroupName = providerGroup.name;
            }

            let title = replaceMailKeywords(dxMission.welcomeTitle, dxMission, dxPhone, player, providerGroupName);
            let content = replaceMailKeywords(dxMission.welcomeContent, dxMission, dxPhone, player, providerGroupName);

            return dbPlayerMail.createPlayerMail({
                platformId: dxPhone.platform,
                recipientType: 'player',
                recipientId: player._id,
                title: title,
                content: content
            });
        }
    );
}

function replaceMailKeywords(str, dxMission, dxPhone, player, providerGroupName) {
    str = String(str);
    let loginUrl = dxMission.loginUrl + "?=" + dxPhone.code;

    str = str.replace ('{{username}}', player.name);
    str = str.replace ('{{password}}', dxMission.password);
    str = str.replace ('{{loginUrl}}', loginUrl);
    str = str.replace ('{{creditAmount}}', dxMission.creditAmount);
    str = str.replace ('{{providerGroup}}', providerGroupName);
    str = str.replace ('{{requiredConsumption}}', dxMission.requiredConsumption);

    return str;
}

function generateDXCode(dxMission, platformId, tries) {
    tries = (Number(tries) || 0) + 1;
    if (tries > 5) {
        return Promise.reject({
            message: "Generate dian xiao code failure."
        })
    }
    let randomString = Math.random().toString(36).substring(4,11); // generate random String
    let dXCode = "";

    let platformProm = Promise.resolve({platformId: platformId});
    if (!platformId) {
        platformProm = dbconfig.collection_platform.findOne({_id: dxMission.platform}, {platformId: 1}).lean();
    }

    return platformProm.then(
        function (platform) {
            platformId = platform.platformId;
            dxCode = platform.platformId + randomString;
            return dbconfig.collection_dxPhone.findOne({code: dxCode, bUsed: false}).lean();
        }
    ).then(
        function (dxPhoneExist) {
            if (dxPhoneExist) {
                return generateDXCode(dxMission, platformId);
            }
            else {
                return dxCode;
            }
        }
    );
}

function updateDxPhoneBUsed (dxPhone) {
    return dbconfig.collection_dxPhone.update({_id: dxPhone._id}, {bUsed: true});
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
