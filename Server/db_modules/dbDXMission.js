const dbUtil = require('./../modules/dbutility');
const dbconfig = require('./../modules/dbproperties');
const log = require("./../modules/logger");
const Q = require("q");
const dbPlayerInfo = require("./../db_modules/dbPlayerInfo");
const dbPlayerMail = require("./../db_modules/dbPlayerMail");
const errorUtils = require("./../modules/errorUtils");
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

    updateDxMission: function(data){
        return dbconfig.collection_dxMission.findOneAndUpdate(
            {_id: data._id},
            data
        );
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
        let dxMissionDataProm = dbconfig.collection_dxMission.find(matchObj).then(
            missionData => {
                if(missionData){
                    missionData.forEach(data => {
                        dataSummaryListProm.push(dbDXMission.getDataSummaryList(data._id));
                        // importedListProm.push({dxMissionId: data._id, totalImportedList: dbconfig.collection_dxPhone.find({dxMission: data._id}).count()});
                        // sentMessageListProm.push({dxMissionId: data._id, totalSentMessage: dbconfig.collection_smsLog.find({"data.dxMission": data._id}).count()});
                        // registeredPlayerListProm.push({dxMissionId: data._id, totalSentMessage: dbconfig.collection_players.find({dxMission: data._id}).count()});
                    })

                    console.log("BBBBBBBBBBBBBBBBBBBBBBBB",missionData);
                    return Promise.all([dataSummaryListProm]).then(
                        data => {
                            ///return {missionData: missionData, summaryData: data};
                            return missionData;
                        }
                    );
                }
            }
        );
        let totalCount = 0;
        let dxMissionData = {};

        return Promise.all([totalCountProm, dxMissionDataProm]).then(
            result => {
                if(result){
                    // console.log("AAAAAAAAAAAAAAAAAAAAAAa",result[1].missionData);
                    // console.log("AAAAAAAAAAAAAAAAAAAAAAa222222",result[1].summaryData);
                    totalCount = result[0] ? result[0] : 0;
                    dxMissionData = result[1] ? result[1] : {};

                    return {totalCount: totalCount, dxMissionData: dxMissionData};
                    //return dxMissionData
                }
            }
        )

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
        //let playerTopUpListProm = [];
        let totalRegisteredPlayer = 0;
        let noOfPlayerTopUp = 0;
        let noOfPlayerMultiTopUp = 0;
        let topUpPlayerProm = [];

        importedListProm.push(dbconfig.collection_dxPhone.find({dxMission: dxMissionId}).count());
        sentMessageListProm.push(dbconfig.collection_smsLog.find({"data.dxMission": dxMissionId}).count());
        registeredPlayerListProm.push(dbconfig.collection_players.find({dxMission: dxMissionId},{_id: 1}).then(
            playerData => {
                if(playerData){
                    totalRegisteredPlayer = playerData.length ? playerData.length : 0;

                    playerData.forEach(playerId => {
                       if(playerId){
                           topUpPlayerProm.push(dbconfig.collection_playerTopUpRecord.find({playerId: playerId}).then(
                               topUpRecord => {
                                   if(topUpRecord){
                                       noOfPlayerTopUp += 1;

                                       if(topUpRecord.length > 1){
                                           noOfPlayerMultiTopUp += 1;
                                       }
                                   }
                               }
                           ));
                       }
                    });

                    return Promise.all(topUpPlayerProm);
                    //noOfPlayerTopUpProm.push()
                }
            }
        ));

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
                        multiTopUpPlayerCount: noOfPlayerMultiTopUp
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
        let dxPhoneObj;

        return dbconfig.collection_dxPhone.findOne({
            code: code,
            bUsed: false,
        }).populate({path: "dxMission", model: dbconfig.collection_dxMission}).lean().then(
            function (phoneDetail) {
                dxPhoneObj = phoneDetail;
                if (!phoneDetail) {
                    return Promise.reject({
                        errorMessage: "Invalid code for creating player"
                    });
                }

                if (!phoneDetail.dxMission) {
                    phoneDetail.dxMission = {
                        loginUrl: "eu99999.com",
                        playerPrefix: "test",
                    };
                }

                if (!phoneDetail.dxMission.lastXDigit instanceof Number) {
                    phoneDetail.dxMission.lastXDigit = 5;
                }

                // todo :: handle what happen when player name already exist (e.g. case where another phone number have the same last X digits)
                let playerName = phoneDetail.phoneNumber.toString().slice(-(phoneDetail.dxMission.lastXDigit));

                let playerData = {
                    platform: phoneDetail.platform,
                    name: (phoneDetail.dxMission.playerPrefix || "") + (playerName),
                    password: phoneDetail.dxMission.password || "888888",
                    isTestPlayer: false,
                    isRealPlayer: true,
                    isLogin: true,
                    dxMission: phoneDetail.dxMission._id,
                    phoneNumber: phoneDetail.phoneNumber.toString(),
                };

                if (deviceData) {
                    playerData = Object.assign({}, playerData, deviceData);
                }

                if (domain) {
                    playerData.domain = domain;
                }

                dxPhone = phoneDetail;
                dxMission = phoneDetail.dxMission;
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

                dbDXMission.applyDxMissionReward(dxPhoneObj.dxMission, playerData).catch(errorUtils.reportError);

                updateDxPhoneBUsed(dxPhone).catch(errorUtils.reportError);

                return {
                    redirect: dxMission.loginUrl + "?token=" + token
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
    }

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