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
const constSystemParam = require('../const/constSystemParam');
const constServerCode = require('../const/constServerCode');
const constProposalType = require('../const/constProposalType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalStatus = require('../const/constProposalStatus');
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
                            dataSummaryListProm.push(dbDXMission.getDataSummaryList(missionData._id, missionData.platform));
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
                                                        missionData.totalValidConsumptionCount = summary.totalValidConsumptionCount;
                                                        missionData.totalValidConsumptionAmount = summary.totalValidConsumptionAmount;
                                                        missionData.totalPlayerDepositAmount = summary.totalPlayerDepositAmount;
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

    getDataSummaryList: function (dxMissionId, platformObjId) {
        if(!dxMissionId){
            return;
        }

        let importedListProm = [];
        let sentMessageListProm = [];
        let registeredPlayerListProm = [];
        let topUpPlayerProm = [];
        let playerConsumptionProm = [];
        let partnerLevel = {};
        let totalRegisteredPlayer = 0;
        let noOfPlayerTopUp = 0;
        let noOfPlayerMultiTopUp = 0;
        let validPlayer = 0;
        let totalTopUpAmount = 0;
        let totalTopUpCount = 0;
        let totalValidConsumptionCount = 0;
        let totalValidConsumptionAmount = 0;
        let totalPlayerBonusAmount = 0;
        let totalPlayerTopUpAmount = 0;


        importedListProm = dbconfig.collection_dxPhone.find({dxMission: dxMissionId}).count();
        sentMessageListProm = dbconfig.collection_smsLog.find({"data.dxMission": dxMissionId}).count();
        registeredPlayerListProm = dbconfig.collection_players.find({dxMission: dxMissionId},{_id: 1}).then(
            playerData => {
                if(playerData){
                    totalRegisteredPlayer = playerData.length ? playerData.length : 0;

                    playerData.forEach(playerId => {
                       if(playerId){
                           topUpPlayerProm.push(dbconfig.collection_playerTopUpRecord.find({playerId: playerId}).then(
                               topUpRecord => {
                                   if(topUpRecord && topUpRecord.length > 0){
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
                       }
                    });

                    return Promise.all(topUpPlayerProm).then(
                        returnData => {
                            return returnData;
                        }
                    );
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
                    let sentMessageListCount = result[1] ? result[1] : 0;

                    return {
                        dxMissionId: dxMissionId,
                        importedListCount: importedListCount,
                        sentMessageListCount: sentMessageListCount,
                        registeredPlayerCount: totalRegisteredPlayer,
                        topUpPlayerCount: noOfPlayerTopUp,
                        multiTopUpPlayerCount: noOfPlayerMultiTopUp,
                        totalValidConsumptionAmount: totalValidConsumptionAmount,
                        totalValidConsumptionCount : totalValidConsumptionCount,
                        totalPlayerDepositAmount: totalPlayerTopUpAmount - totalPlayerBonusAmount
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
        let dxPhone = {};
        let dxMission = {};
        let platform = {};

        return dbconfig.collection_dxPhone.findOne({
            code: code
        }).populate({path: "dxMission", model: dbconfig.collection_dxMission})
        .populate({path: "platform", model: dbconfig.collection_platform}).lean().then(
            function (phoneDetail) {
                let playerProm = Promise.resolve();
                let isNew = false;

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

                if (phoneDetail.playerObjId) {
                    playerProm = dbconfig.collection_players.findOne({_id: phoneDetail.playerObjId}).lean();
                } else {
                    playerProm = generateDXPlayerName(dxMission.lastXDigit, platformPrefix, dxMission.playerPrefix, dxPhone).then(
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
                    )
                }

                return playerProm.then(
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
                    },
                    function(error){
                        //if already created player, redirect to login url
                        return {
                            redirect: dxMission.loginUrl
                        }
                    }
                );




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
        let phoneData = {};

        return dbconfig.collection_dxPhone.findOne({_id: data.dxPhone}).populate({
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
                    tel: data.tel,
                    channel: 2,
                    platformId: phoneData.platform.platformId,
                    message: message,
                    data: {
                        dxMission: phoneData.dxMission
                    }
                };
                let recipientName = data.name || '';

                return smsAPI.sending_sendMessage(sendObj).then(
                    retData => {
                        dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'success');
                        console.log("SMS SENT SUCCESSFULLY");
                        return retData;
                    },
                    retErr => {
                        dbLogger.createSMSLog(adminObjId, adminName, recipientName, data, sendObj, data.platformId, 'failure', retErr);
                        console.log("SMS SENT FAILED");
                        return Q.reject({message: retErr, data: data});
                    }
                );
            }
        )

    },

    getDXPhoneNumberInfo: function (platformObjId, count, dxMission) {
        var count = count === 0 ? 0 : (parseInt(count) || constSystemParam.MAX_RECORD_NUM);
        let sizeProm = dbconfig.collection_dxPhone.find({platform: platformObjId, dxMission: dxMission}).count();
        let dxPhoneDataProm = dbconfig.collection_dxPhone.find({platform: platformObjId, dxMission: dxMission}).populate({path: "playerObjId", model: dbconfig.collection_players});
        //let dxMissionProm =  dbconfig.collection_dxMission.findOne({_id: dxMission});


        return Promise.all([sizeProm, dxPhoneDataProm]).then(
            result => {
                if(result){
                    let size = result[0] ? result[0] : 0;
                    let dxPhoneData = result[1] ? result[1] : {};
                    //let dxMissionData = result[2] ? result[2] : {};


                    // return dbDXMission.retrieveSMSLogInfo(dxPhoneData).then( smsLog => {
                    //
                    // })

                    return {size: size, dxPhoneData: dxPhoneData};
                }
            }
        )
    },

    retrieveSMSLogInfo: function (dxPhoneData) {

        let smsLogProm = [];
        if (dxPhoneData && dxPhoneData.length > 0){
            let phoneNumberCollection = [];
            dxPhoneData.forEach ( data => {
                phoneNumberCollection.push(data.phoneNumber);
            });

            if (phoneNumberCollection && phoneNumberCollection.length > 0){



              // smsLogProm.push(dbconfig.collection_smsLog.find() );
            }

            return Q.all(smsLogProm);
        }
    },
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
    return dbconfig.collection_dxPhone.update({
        _id: dxPhone._id
    }, {playerObjId: usedPlayerObjId, bUsed: true});
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
