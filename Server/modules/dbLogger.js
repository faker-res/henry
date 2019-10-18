var dbLoggerFunc = function () {
};
module.exports = new dbLoggerFunc();

var dbconfig = require('./dbproperties');
var constSystemLogLevel = require("../const/constSystemLogLevel");
var constSystemParam = require('../const/constSystemParam');
var constPlayerCreditTransferStatus = require('../const/constPlayerCreditTransferStatus')
var Q = require("q");
var errorUtils = require("./errorUtils.js");
var constProposalEntryType = require('./../const/constProposalEntryType');
var constPartnerCommissionType = require('./../const/constPartnerCommissionType');
var constProposalUserType = require('./../const/constProposalUserType');
var pmsAPI = require('../externalAPI/pmsAPI');
var rsaCrypto = require('../modules/rsaCrypto');
const constSMSPurpose = require('../const/constSMSPurpose');
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');
var localization = require("../modules/localization");
const constRewardPointsTaskCategory = require('../const/constRewardPointsTaskCategory');
const RESTUtils = require('../modules/RESTUtils');

var dbLogger = {

    /**
     * Create the log information of every action operated by Admin user
     * @param {json} adminActionRecordData - The data of the log -  Refer to systemLog schema.
     */
    createSystemLog: function (adminActionRecordData, resultData) {
        let inputDevice = {
            1: "WEB",
            3: "H5"
        };

        let constPartnerCommisionTypeCN = {
            0: "关闭",
            1: "1天-输赢值",
            2: "7天-输赢值",
            3: "半月-输赢值",
            4: "1月-输赢值",
            5: "7天-投注额",
            6: "代理前端自选"
        };

        let constMerchantTopupType = {
            '1': 'NetPay',
            '2': 'WechatQR',
            '3': 'AlipayQR',
            '4': 'WechatApp',
            '5': 'AlipayApp',
            '6': 'FASTPAY',
            '7': 'QQPAYQR',
            '8': 'UnPayQR',
            '9': 'JdPayQR',
            '10': 'WXWAP',
            '11': 'ALIWAP',
            '12': 'QQWAP',
            '13': 'PCard',
            '14': 'JDWAP'
        };

        if(!adminActionRecordData){
            return;
        }

        //only store non-get actions
        if (adminActionRecordData.level === constSystemLogLevel.ACTION && adminActionRecordData.action && adminActionRecordData.action.indexOf("get") >= 0) {
            return;
        }

        return dbconfig.collection_admin.findOne({adminName: adminActionRecordData.adminName}).then(
            adminData => {
                if(adminData && adminData.departments){
                    return dbconfig.collection_department.find({_id: {$in: adminData.departments}}, {platforms: 1});
                }
            }
        ).then(
            departments => {
                if(departments && departments.length > 0){
                    let platformArray = [];

                    departments.forEach(department => {
                        if(department && department.platforms && department.platforms.length > 0){
                            department.platforms.forEach(data => {
                                platformArray.push(data);
                            })
                        }
                    });

                    return platformArray;
                }
            }
        ).then(
            platformArr => {
                if(platformArr && platformArr.length > 0){
                    adminActionRecordData.platforms = platformArr;
                }

                if (adminActionRecordData.action == 'createPlayerFeedback' && resultData && resultData.playerId) {
                    return dbconfig.collection_players.findOne({_id: resultData.playerId}, {name: 1});
                } else if ((adminActionRecordData.action == 'resetPlayerPassword' || adminActionRecordData.action == 'createUpdateTopUpGroupLog')
                    && adminActionRecordData && adminActionRecordData.data[0]) {
                    return dbconfig.collection_players.findOne({_id: adminActionRecordData.data[0]}, {name: 1, platform: 1});
                } else if (adminActionRecordData.action == 'updatePlayerPermission' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0]._id) {
                    return dbconfig.collection_players.findOne({_id: adminActionRecordData.data[0]._id}, {name: 1});
                } else if (adminActionRecordData.action == 'transferPlayerCreditToProvider' && adminActionRecordData && adminActionRecordData.data[0]) {
                    return adminActionRecordData.data[5] ? dbconfig.collection_players.findOne({name: adminActionRecordData.data[0]}, {name: 1, platform: 1})
                        : dbconfig.collection_players.findOne({playerId: adminActionRecordData.data[0]}, {name: 1, platform: 1});
                } else if (adminActionRecordData.action == 'resetPartnerPassword' && adminActionRecordData && adminActionRecordData.data[0]) {
                    return dbconfig.collection_partner.findOne({_id: adminActionRecordData.data[0]}, {partnerName: 1});
                } else if (adminActionRecordData.action == 'updatePartnerPermission' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0]._id) {
                    return dbconfig.collection_partner.findOne({_id: adminActionRecordData.data[0]._id}, {partnerName: 1})
                }else if((adminActionRecordData.action == "attachGamesToPlatform" || adminActionRecordData.action == "detachGamesFromPlatform") && adminActionRecordData.data && adminActionRecordData.data.length > 1
                    && adminActionRecordData.data[1].length > 0 && adminActionRecordData.data[1][0].game){
                    return dbconfig.collection_game.findOne({_id: adminActionRecordData.data[1][0].game})
                        .populate({path: "provider", model: dbconfig.collection_gameProvider});
                }else if(adminActionRecordData.action == "updateGameStatusToPlatform" && adminActionRecordData.data && adminActionRecordData.data.length > 0 &&
                    adminActionRecordData.data[0].game && adminActionRecordData.data[0].game.length > 0 && adminActionRecordData.data[0].game[0]){
                    return dbconfig.collection_game.findOne({_id: adminActionRecordData.data[0].game[0]})
                        .populate({path: "provider", model: dbconfig.collection_gameProvider});
                }else if (adminActionRecordData.action == 'createRewardEvent' && adminActionRecordData.data && adminActionRecordData.data[0] && adminActionRecordData.data[0].type) {
                    return dbconfig.collection_rewardType.findOne({_id: adminActionRecordData.data[0].type}, {name: 1});
                }else if(adminActionRecordData.action == 'createUpdatePartnerCommissionConfigWithGameProviderGroup' && resultData && resultData.provider){
                    return dbconfig.collection_gameProviderGroup.findOne({_id: resultData.provider});
                }else if(adminActionRecordData.action == 'manualDailyProviderSettlement' && adminActionRecordData.data && adminActionRecordData.data.length > 2
                    && adminActionRecordData.data[2]){
                    return dbconfig.collection_platform.findOne({_id: adminActionRecordData.data[2]});
                }else if (adminActionRecordData.action == 'updateBatchPlayerForbidRewardEvents'
                    && adminActionRecordData.data[2] && adminActionRecordData.data[2].addList.length) {
                    return dbconfig.collection_rewardEvent.find({_id: {$in: adminActionRecordData.data[2].addList}}, {name: 1});
                }else if (adminActionRecordData.action == 'updateBatchPlayerForbidProviders'
                    && adminActionRecordData.data[2] && adminActionRecordData.data[2].addList.length) {
                    return dbconfig.collection_gameProvider.find({_id: {$in: adminActionRecordData.data[2].addList}}, {name: 1});
                }else if (adminActionRecordData.action == 'updateBatchPlayerForbidRewardPointsEvent' && adminActionRecordData
                    && adminActionRecordData.data[2] && adminActionRecordData.data[2].addList.length) {
                    return dbconfig.collection_rewardPointsEvent.find({_id: {$in: adminActionRecordData.data[2].addList}}, {rewardTitle: 1});
                } else if (adminActionRecordData.action == 'updateBatchPlayerCredibilityRemark' && adminActionRecordData.data[3]
                    && adminActionRecordData.data[3].addList && adminActionRecordData.data[3].addList.length) {
                    return dbconfig.collection_playerCredibilityRemark.find({_id: {$in: adminActionRecordData.data[3].addList}}, {name: 1});
                }else if((adminActionRecordData.action == 'applyManualTopUpRequest' || adminActionRecordData.action == 'applyAlipayTopUpRequest'
                    || adminActionRecordData.action == 'applyBonusRequest')
                    && adminActionRecordData.data[1]) {
                    return dbconfig.collection_players.findOne({playerId: adminActionRecordData.data[1]}, {name: 1});
                }else if(adminActionRecordData.action == 'applyRewardEvent' && adminActionRecordData.data[1] && adminActionRecordData.data[2]){
                    let returnedData = {};
                    return dbconfig.collection_players.findOne({playerId: adminActionRecordData.data[1]}, {name: 1, platform: 1}).then(
                        playerName => {
                            if(playerName && playerName.name){
                                returnedData.playerName = playerName.name;
                                returnedData.platformObjId = playerName.platform;
                            }

                            return dbconfig.collection_rewardEvent.findOne({code: adminActionRecordData.data[2]}, {name: 1});
                        }
                    ).then(
                        rewardName => {
                            if(rewardName && rewardName.name){
                                returnedData.rewardName = rewardName.name;
                            }

                            return returnedData;
                        }
                    );
                }else if(adminActionRecordData.action == 'applyWechatPayTopUpRequest' && adminActionRecordData.data[2]){
                    return dbconfig.collection_players.findOne({playerId: adminActionRecordData.data[2]}, {name: 1});
                }else if(adminActionRecordData.action == 'createRewardTaskGroupUnlockedRecord' && adminActionRecordData.data[0] && adminActionRecordData.data[0].playerId){
                    return dbconfig.collection_players.findOne({_id: adminActionRecordData.data[0].playerId}, {name: 1});
                }else if(adminActionRecordData.action == 'updatePlayerRewardPointsRecord' && adminActionRecordData.data[0]){
                    return dbconfig.collection_players.findOne({_id: adminActionRecordData.data[0]}, {name: 1});
                }else if((adminActionRecordData.action == 'createUpdatePlayerRealNameProposal' || adminActionRecordData.action == 'createUpdatePlayerInfoLevelProposal') && adminActionRecordData.data[2] && adminActionRecordData.data[2].playerId){
                    return dbconfig.collection_players.findOne({playerId: adminActionRecordData.data[2].playerId}, {name: 1});
                }else if(adminActionRecordData.action == 'createUpdatePartnerRealNameProposal' && adminActionRecordData.data[2] && adminActionRecordData.data[2].partnerId){
                    return dbconfig.collection_partner.findOne({partnerId: adminActionRecordData.data[2].partnerId}, {partnerName: 1});
                }else if((adminActionRecordData.action == 'updateProposalProcessStep' || adminActionRecordData.action == 'approveCsPendingAndChangeStatus')
                    && adminActionRecordData.data[0]){
                    return dbconfig.collection_proposal.findOne({_id: adminActionRecordData.data[0]}, {proposalId: 1})
                }else if(adminActionRecordData.action == 'attachDetachRolesFromUsersById' && adminActionRecordData.data[0]){
                    let adminProm, attachedRoleProm, detachedRoleProm = Promise.resolve();

                    adminProm = dbconfig.collection_admin.findOne({_id: adminActionRecordData.data[0]});

                    if(adminActionRecordData.data[1] && adminActionRecordData.data[1].length > 0){
                        attachedRoleProm = dbconfig.collection_role.find({_id: {$in: adminActionRecordData.data[1]}}, {roleName: 1});
                    }

                    if(adminActionRecordData.data[2] && adminActionRecordData.data[2].length > 0){
                        detachedRoleProm = dbconfig.collection_role.find({_id: {$in: adminActionRecordData.data[2]}}, {roleName: 1});
                    }

                    return Promise.all([adminProm, attachedRoleProm, detachedRoleProm]).then(
                        result => {
                            let adminName;
                            let attachedRoleList = [];
                            let detachedRoleList = [];

                            if(result && result.length > 0){
                                adminName = result[0] && result[0].adminName ? result[0].adminName : "";
                                if(result[1] && result[1].length > 0){
                                    result[1].forEach(role => {
                                        if(role && role.roleName){
                                            attachedRoleList.push(role.roleName);
                                        }
                                    })
                                }

                                if(result[2] && result[2].length > 0){
                                    result[2].forEach(role => {
                                        if(role && role.roleName){
                                            detachedRoleList.push(role.roleName);
                                        }
                                    })
                                }
                            }

                            return {adminName: adminName, attachedRoleList: attachedRoleList, detachedRoleList: detachedRoleList};
                        }
                    )
                } else if (adminActionRecordData.action == 'resetGroupPartnerCommissionRate' && adminActionRecordData.data[2]) {
                    return dbconfig.collection_gameProviderGroup.findOne({_id:adminActionRecordData.data[2]}, {name: 1}).lean()
                }
            }
        ).then(
            data => {

                let logAction = adminActionRecordData.action;

                if(logAction == "createDepartmentWithParent" ){
                    adminActionRecordData.error = adminActionRecordData.data[0].departmentName;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if(logAction == "updateDepartmentParent" && adminActionRecordData.data[3]){
                    adminActionRecordData.error = adminActionRecordData.data[3];
                    adminActionRecordData.platforms = adminActionRecordData.data[4] ? adminActionRecordData.data[4] : adminActionRecordData.platforms;
                }else if(logAction == "updateDepartment" && adminActionRecordData.data[1].departmentName){
                    adminActionRecordData.error = adminActionRecordData.data[1].departmentName;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "deleteDepartmentsById" && adminActionRecordData.data[1]){
                    adminActionRecordData.error = adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "createRoleForDepartment" && adminActionRecordData.data[0].roleName){
                    adminActionRecordData.error = adminActionRecordData.data[0].roleName;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == "deleteRolesById" && adminActionRecordData.data[1]){
                    adminActionRecordData.error = adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "updateRole" && adminActionRecordData.data[0].roleName){
                    adminActionRecordData.error = adminActionRecordData.data[0].roleName;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "attachDetachRolesFromUsersById" && data.adminName){
                    adminActionRecordData.error = "用户名: " + data.adminName + " ; 添加角色: " + data.attachedRoleList + " ; 移除角色: " + data.detachedRoleList;
                    adminActionRecordData.platforms = adminActionRecordData.data[3] ? adminActionRecordData.data[3] : adminActionRecordData.platforms;
                }else if(logAction == "createAdminForDepartment" && adminActionRecordData.data[0].adminName){
                    adminActionRecordData.error = adminActionRecordData.data[0].adminName;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == "updateAdmin" && adminActionRecordData.data[1].adminName){
                    adminActionRecordData.error = adminActionRecordData.data[1].adminName;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "deleteAdminInfosById"){
                    let userNames = [];
                    for(var key in adminActionRecordData.data[1]){
                        userNames.push(adminActionRecordData.data[1][key].adminName);
                    }
                    adminActionRecordData.error = userNames;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == "updateAdminDepartment" && adminActionRecordData.data[3]){
                    adminActionRecordData.error = adminActionRecordData.data[3];
                    adminActionRecordData.platforms = adminActionRecordData.data[4] ? adminActionRecordData.data[4] : adminActionRecordData.platforms;
                }else if(logAction == "resetAdminPassword" && adminActionRecordData.data[2]){
                    adminActionRecordData.error = adminActionRecordData.data[2];
                    adminActionRecordData.platforms = adminActionRecordData.data[3] ? adminActionRecordData.data[3] : adminActionRecordData.platforms;
                }else if(logAction == 'createPlayer' && adminActionRecordData.data[0] && adminActionRecordData.data[0].name){
                    adminActionRecordData.error = "帐号：" + adminActionRecordData.data[0].name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform
                        ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'createDemoPlayer' && resultData && resultData.playerData && resultData.playerData.name){
                    adminActionRecordData.error = "帐号：" + resultData.playerData.name;
                    adminActionRecordData.platforms = resultData && resultData.playerData && resultData.playerData.platform ? resultData.playerData.platform :adminActionRecordData.platforms;
                }else if ((logAction == 'createUpdatePlayerInfoProposal' || logAction == 'createUpdatePlayerPhoneProposal'
                    || logAction == 'createUpdatePlayerEmailProposal' || logAction == 'createUpdatePlayerQQProposal'
                    || logAction == 'createUpdatePlayerWeChatProposal' || logAction == 'createUpdatePlayerBankInfoProposal'
                    || logAction == 'createUpdatePlayerCreditProposal' || logAction == 'createUpdatePartnerInfoProposal'
                    || logAction == 'createUpdatePartnerPhoneProposal' || logAction == 'createUpdatePartnerEmailProposal'
                    || logAction == 'createUpdatePartnerQQProposal' || logAction == 'createUpdatePartnerWeChatProposal'
                    || logAction == 'createUpdatePartnerCommissionTypeProposal' || logAction == 'createUpdatePartnerBankInfoProposal')
                    && resultData && resultData.proposalId) {
                    adminActionRecordData.error = "提案号：" + resultData.proposalId;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'submitRepairPaymentProposal' && resultData && resultData.proposalId){
                    adminActionRecordData.error = "提案号：" + resultData.proposalId;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if(logAction == 'customizePartnerCommission' && resultData && resultData.proposalId){
                    adminActionRecordData.error = "提案号：" + resultData.proposalId;
                    adminActionRecordData.platforms = adminActionRecordData.data[3] && adminActionRecordData.data[3].platform ? adminActionRecordData.data[3].platform : adminActionRecordData.platforms;
                }else if (logAction == 'resetPlayerPassword' && data && data.name) {
                    adminActionRecordData.error = "帐号：" + data.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if(logAction == 'createPlayerFeedback' && data && data.name){
                    adminActionRecordData.error = "帐号：" + data.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'updatePlayerCredibilityRemark' && resultData && resultData.name) {
                    adminActionRecordData.error = "帐号：" + resultData.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'createPartner' && adminActionRecordData.data[0] && adminActionRecordData.data[0].partnerName){
                    adminActionRecordData.error = "帐号：" + adminActionRecordData.data[0].partnerName;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if ((logAction == 'createPlayerFeedbackResult' || logAction == 'createPlayerFeedbackTopic'
                    || logAction == 'createPartnerFeedbackResult' || logAction == 'createPartnerFeedbackTopic')
                    && adminActionRecordData.data[0] && adminActionRecordData.data[0].value){
                    adminActionRecordData.error = "添加" + adminActionRecordData.data[0].value;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'createUpdateTopUpGroupLog' && data && data.name && Object.keys(adminActionRecordData.data[2]).length){
                    let topupGroup = '';
                    Object.keys(adminActionRecordData.data[2]).forEach(el => {
                        topupGroup += localization.localization.translate(el) + "（" + adminActionRecordData.data[2][el] + "）";
                    })
                    adminActionRecordData.error = "帐号：" + data.name + "、" + topupGroup;
                    adminActionRecordData.platforms = data && data.platform && data.platform ? data.platform : adminActionRecordData.platforms;
                }else if(logAction == "createPlatform" && adminActionRecordData.data[0].name){
                    adminActionRecordData.error = "创建" + adminActionRecordData.data[0].name + "产品";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == "deletePlatformById" && adminActionRecordData.data[1]){
                    adminActionRecordData.error = "删除" + adminActionRecordData.data[1] + "产品";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0][0] ? adminActionRecordData.data[0][0] : adminActionRecordData.platforms;
                }else if(logAction == "updatePlatform" && resultData.name) {
                    if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].partnerNameMaxLength != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "代理基础数据";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].minTopUpAmount != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "平台基础数据";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].bonusSetting != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "提款设置";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].monitorMerchantCount != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "充值监控设置";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].maxRingTime != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "批量拨电设置";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && typeof adminActionRecordData.data[1].callRequestUrlConfig != "undefined" && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "请求回电设置";
                    }else if(adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                        && (typeof adminActionRecordData.data[1]["conversationDefinition.totalSec"] != "undefined" ||
                        typeof adminActionRecordData.data[1].overtimeSetting != "undefined") && !adminActionRecordData.data[2]){
                        adminActionRecordData.error = "质检参数设置";
                    }else{
                        adminActionRecordData.error = "更新" + resultData.name + "产品";
                    }

                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0]._id ? adminActionRecordData.data[0]._id : adminActionRecordData.platforms;
                }else if(logAction == "startPlatformPlayerConsumptionReturnSettlement") {
                    adminActionRecordData.error = "玩家洗码";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                } else if(logAction == "bulkApplyPartnerCommission"){
                    adminActionRecordData.error = "代理佣金结算";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                } else if(logAction == "startPlatformPlayerConsumptionIncentiveSettlement"){
                    adminActionRecordData.error = "救援金";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                } else if(logAction == "startPlatformPlayerLevelSettlement"){
                    adminActionRecordData.error = "玩家升降级";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                } else if(logAction == "startPlayerConsecutiveConsumptionSettlement"){
                    adminActionRecordData.error = "智勇冲关";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "createNewPlayerAdvertisementRecord" && resultData.inputDevice){
                    adminActionRecordData.error = "添加玩家广告(" + inputDevice[resultData.inputDevice] + ")";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "savePlayerAdvertisementRecordChanges" && resultData.inputDevice){
                    adminActionRecordData.error = "编辑玩家广告(" + inputDevice[resultData.inputDevice] + ")";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "createNewPartnerAdvertisementRecord" && resultData.inputDevice){
                    adminActionRecordData.error = "添加代理广告(" + inputDevice[resultData.inputDevice] + ")";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "savePartnerAdvertisementRecordChanges" && resultData.inputDevice){
                    adminActionRecordData.error = "编辑代理广告(" + inputDevice[resultData.inputDevice] + ")";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "renameProviderInPlatformById" && adminActionRecordData.data && adminActionRecordData.data.length > 4
                    && adminActionRecordData.data[2] &&  adminActionRecordData.data[4]){
                    adminActionRecordData.error = adminActionRecordData.data[4] + "修改为" + adminActionRecordData.data[2];
                    adminActionRecordData.platforms = resultData && resultData._id ? resultData._id : adminActionRecordData.platforms;
                }else if(logAction == "updateProviderFromPlatformById" && adminActionRecordData.data && adminActionRecordData.data.length > 3
                    && typeof adminActionRecordData.data[2] != "undefined" && adminActionRecordData.data[3]){
                    if(adminActionRecordData.data[2]){
                        adminActionRecordData.error = "启用" + adminActionRecordData.data[3];
                    }else{
                        adminActionRecordData.error = "禁用" + adminActionRecordData.data[3];
                    }
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "attachGamesToPlatform" && data && data.provider && data.provider.name){
                    adminActionRecordData.error = "添加" + data.provider.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == "detachGamesFromPlatform" && data && data.provider && data.provider.name){
                    adminActionRecordData.error = "移除" + data.provider.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'updateGameStatusToPlatform' && data && data.provider && data.provider.name
                    && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1].status){
                    let action = adminActionRecordData.data[1].status == 1 ? "启用" : "维护";
                    adminActionRecordData.error = "设置" + data.provider.name + action;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                } else if ((logAction == 'updatePlayerPermission' || logAction == 'updatePartnerPermission')
                    && data && (data.name || data.partnerName) && Object.keys(adminActionRecordData.data[2]).length){
                    let permissionChange = '';
                    let name = logAction == 'updatePlayerPermission' ? data.name : data.partnerName;
                    Object.keys(adminActionRecordData.data[2]).forEach(el => {
                        let prevPermission = !adminActionRecordData.data[2][el];
                        if(el == 'disableWechatPay' || el == 'forbidPlayerFromLogin' || el == 'forbidPlayerFromEnteringGame' || el == 'banReward'
                            || el == 'forbidPartnerFromLogin' || el == 'disableCommSettlement') {
                            permissionChange += localization.localization.translate(el) + "（" + localization.localization.translate(adminActionRecordData.data[2][el])
                                + " -> " + localization.localization.translate(prevPermission) + "）";
                        } else {
                            permissionChange += localization.localization.translate(el) + "（" + localization.localization.translate(prevPermission)
                                + " -> " + localization.localization.translate(adminActionRecordData.data[2][el]) + "）";
                        }
                    })
                    adminActionRecordData.error = "帐号：" + name + "、" + permissionChange;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ?adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'transferPlayerCreditToProvider' && data && data.name && resultData && resultData.transferId){
                    adminActionRecordData.error = "帐号：" + data.name + "、" + localization.localization.translate("TransferIn") + "ID：" + resultData.transferId;
                    adminActionRecordData.platforms = data.platform ? data.platform : adminActionRecordData.platforms;
                }else if (logAction == 'resetPartnerPassword' && data && data.partnerName) {
                    adminActionRecordData.error = "帐号：" + data.partnerName;
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ?adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlatformGameGroup' && resultData && resultData.name && resultData.code) {
                    adminActionRecordData.error = "添加" + resultData.name + "(代码： " + resultData.code + ")";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'deleteGameGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1
                    && adminActionRecordData.data[1]){
                    adminActionRecordData.error = "删除" + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'renamePlatformGameGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1
                    && adminActionRecordData.data[1] && adminActionRecordData.data[1].name && adminActionRecordData.data[1].originalName){
                    adminActionRecordData.error = "重命名" + adminActionRecordData.data[1].originalName + "为" + adminActionRecordData.data[1].name;
                }else if (logAction == 'updateGameGroupParent' && adminActionRecordData.data && adminActionRecordData.data.length > 4
                    && adminActionRecordData.data[3]){
                    adminActionRecordData.error = "移动" + adminActionRecordData.data[3] + "至" + (adminActionRecordData.data[4] ? adminActionRecordData.data[4] : "Root");
                    adminActionRecordData.platforms = adminActionRecordData.data[5] ? adminActionRecordData.data[5] : adminActionRecordData.platforms;
                }else if (logAction == 'updatePlatformGameGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1
                    && adminActionRecordData.data[1].gameNames){
                    if(adminActionRecordData.data[1].$addToSet){
                        delete adminActionRecordData.data[1].$addToSet;
                        adminActionRecordData.error = "添加" + adminActionRecordData.data[1].gameNames;
                    }else if(delete adminActionRecordData.data[1].$pull){
                        delete adminActionRecordData.data[1].$addToSet;
                        adminActionRecordData.error = "移除" + adminActionRecordData.data[1].gameNames;
                    }
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'createRewardEvent' && data && data.name && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].name){
                    adminActionRecordData.error = "创建" + localization.localization.translate(data.name) + "，" + adminActionRecordData.data[0].name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'deleteRewardEventByIds' && adminActionRecordData && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "删除" + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'updateRewardEvent' && adminActionRecordData && adminActionRecordData.data[1] && adminActionRecordData.data[1].name) {
                    adminActionRecordData.error = "更新" + adminActionRecordData.data[1].name;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] && adminActionRecordData.data[1].platform ? adminActionRecordData.data[1].platform : adminActionRecordData.platforms;
                }else if (logAction == 'updateProposalTypeProcessSteps' && resultData && resultData[0] && resultData[0].name){
                    adminActionRecordData.error = "保存（" + localization.localization.translate(resultData[0].name) + "）审核流程";
                    adminActionRecordData.platforms = resultData && resultData[0] && resultData[0].platformId ? resultData[0].platformId : adminActionRecordData.platforms;
                }else if (logAction == 'createMessageTemplate' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].type) {
                    adminActionRecordData.error = "创建（" + localization.localization.translate(adminActionRecordData.data[0].type) + '）';
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'updateMessageTemplate' && adminActionRecordData && adminActionRecordData.data[1] && adminActionRecordData.data[1].type ) {
                    adminActionRecordData.error = "更新（" + localization.localization.translate(adminActionRecordData.data[1].type) + '）';
                    adminActionRecordData.platforms = adminActionRecordData.data[1] && adminActionRecordData.data[1].platform ? adminActionRecordData.data[1].platform : adminActionRecordData.platforms;
                }else if(logAction == 'updatePlayerLevel') {
                    adminActionRecordData.platforms = adminActionRecordData.data[1] && adminActionRecordData.data[1].platform ? adminActionRecordData.data[1].platform : adminActionRecordData.platforms;
                }else if(logAction == 'updatePartnerLevelConfig'){
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'createUpdatePartnerCommissionConfigWithGameProviderGroup' && data && data.name) {
                    adminActionRecordData.error = data.name + "佣金:" + constPartnerCommisionTypeCN[resultData.commissionType];
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == 'updateAutoApprovalConfig') {
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0]._id ? adminActionRecordData.data[0]._id : adminActionRecordData.platforms;
                }else if(logAction == 'updatePlayerLevelScores' || logAction == 'updateCredibilityRemarksInBulk'
                || logAction == 'setFixedCredibilityRemarks' || logAction == 'updatePlatformSmsGroups') {
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'setFilteredKeywords' || logAction == 'removeFilteredKeywords'){
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'createPlatformAnnouncement' && resultData && resultData.title) {
                    adminActionRecordData.error = "添加" + resultData.title;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'updatePlatformAnnouncement' && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]
                    && adminActionRecordData.data[1].title) {
                    adminActionRecordData.error = "更新" + adminActionRecordData.data[1].title;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] && adminActionRecordData.data[1].platform ? adminActionRecordData.data[1].platform : adminActionRecordData.platforms;
                }else if (logAction == 'deletePlatformAnnouncementByIds' && adminActionRecordData.data && adminActionRecordData.data.length > 1
                    && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "删除" + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addPromoteWay' && resultData && resultData.name) {
                    adminActionRecordData.error = "创建" + resultData.name + "主题";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'deletePromoteWay' && adminActionRecordData.data && adminActionRecordData.data.length > 2 && adminActionRecordData.data[2]) {
                    adminActionRecordData.error = "删除" + adminActionRecordData.data[2] + "主题";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if(logAction == 'addUrl') {
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'updateUrl') {
                    adminActionRecordData.platforms = adminActionRecordData.data[4] ? adminActionRecordData.data[4] : adminActionRecordData.platforms;
                }else if(logAction == 'deleteUrl'){
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlatformBankCardGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "添加银行卡组 - " + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlatformMerchantGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "添加商户组 - " + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlatformAlipayGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "添加支付宝组 - " + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlatformWechatPayGroup' && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    adminActionRecordData.error = "添加微信组 - " + adminActionRecordData.data[1];
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'updatePlatformBankCardGroup') {
                    adminActionRecordData.error = "编辑银行卡组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'renamePlatformMerchantGroup') {
                    adminActionRecordData.error = "编辑商户组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'renamePlatformAlipayGroup') {
                    adminActionRecordData.error = "编辑支付宝组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'renamePlatformWechatPayGroup') {
                    adminActionRecordData.error = "编辑微信组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if (logAction == 'deleteBankCardGroup') {
                    adminActionRecordData.error = "删除银行卡";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'deleteMerchantGroup') {
                    adminActionRecordData.error = "删除商户组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'deleteAlipayGroup') {
                    adminActionRecordData.error = "删除支付宝组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'deleteWechatPayGroup') {
                    adminActionRecordData.error = "删除微信组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'setPlatformDefaultBankCardGroup' && resultData && resultData.length > 0 && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    let defaultBankCard = resultData.find(r => r._id == adminActionRecordData.data[1]).name
                    adminActionRecordData.error = "设置" + defaultBankCard + "为默认银行卡组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'setPlatformDefaultMerchantGroup' && resultData && resultData.length > 0 && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    let defaultBankCard = resultData.find(r => r._id == adminActionRecordData.data[1]).name
                    adminActionRecordData.error = "设置" + defaultBankCard + "为默认商户组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'setPlatformDefaultAlipayGroup' && resultData && resultData.length > 0 && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    let defaultBankCard = resultData.find(r => r._id == adminActionRecordData.data[1]).name
                    adminActionRecordData.error = "设置" + defaultBankCard + "为默认支付宝组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'setPlatformDefaultWechatPayGroup' && resultData && resultData.length > 0 && adminActionRecordData.data && adminActionRecordData.data.length > 1 && adminActionRecordData.data[1]) {
                    let defaultBankCard = resultData.find(r => r._id == adminActionRecordData.data[1]).name
                    adminActionRecordData.error = "设置" + defaultBankCard + "为默认微信组";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlayersToBankCardGroup') {
                    adminActionRecordData.error = "添加玩家至银行卡组";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlayersToMerchantGroup') {
                    adminActionRecordData.error = "添加玩家至商户组";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlayersToAlipayGroup') {
                    adminActionRecordData.error = "添加玩家至支付宝组";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addPlayersToWechatPayGroup') {
                    adminActionRecordData.error = "添加玩家至微信组";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'addAllPlayersToBankCardGroup') {
                    adminActionRecordData.error = "添加所有玩家至银行卡组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'addAllPlayersToMerchantGroup') {
                    adminActionRecordData.error = "添加所有玩家至商户组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'addAllPlayersToAlipayGroup') {
                    adminActionRecordData.error = "添加所有玩家至支付宝组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'addAllPlayersToWechatPayGroup') {
                    adminActionRecordData.error = "添加所有玩家至微信组";
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if (logAction == 'syncMerchantNoScript') {
                    adminActionRecordData.error = "同步商户号";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if (logAction == 'updateGameProvider' && resultData && typeof resultData.dailySettlementHour != "undefined" && typeof resultData.dailySettlementMinute != "undefined") {
                    adminActionRecordData.error = "编辑结算时间为" + resultData.dailySettlementHour + "小时" + resultData.dailySettlementMinute + "分钟";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'manualDailyProviderSettlement' && data && data.name) {
                    adminActionRecordData.error = "指定结算" + data.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[3] ? adminActionRecordData.data[3] : adminActionRecordData.platforms;
                }else if(logAction == 'updateGame'){
                    adminActionRecordData.error = "更新游戏";
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                }else if (logAction == 'pushNotification' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].tittle) {
                    adminActionRecordData.error = "添加" + adminActionRecordData.data[0].tittle;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if(logAction == 'upsertRewardPointsLvlConfig'){
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platformObjId ? adminActionRecordData.data[0].platformObjId : adminActionRecordData.platforms;
                }else if ((logAction == 'updateRewardPointsEvent' || logAction == 'createRewardPointsEvent')
                    && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].category){
                    let action = '';
                    let rewardPointsCategory = '';
                    if (adminActionRecordData.data[0].category == constRewardPointsTaskCategory.LOGIN_REWARD_POINTS) {
                        rewardPointsCategory = 'LOGIN_REWARD_POINTS';
                    } else if (adminActionRecordData.data[0].category == constRewardPointsTaskCategory.GAME_REWARD_POINTS) {
                        rewardPointsCategory = 'GAME_REWARD_POINTS';
                    } else if (adminActionRecordData.data[0].category == constRewardPointsTaskCategory.TOPUP_REWARD_POINTS) {
                        rewardPointsCategory = 'TOPUP_REWARD_POINTS';
                    }

                    if (logAction == 'updateRewardPointsEvent') {
                        action = "编辑";
                    } else if (logAction == 'createRewardPointsEvent') {
                        action = "添加";
                    }

                    adminActionRecordData.error = action + localization.localization.translate(rewardPointsCategory);
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platformObjId ? adminActionRecordData.data[0].platformObjId : adminActionRecordData.platforms;
                } else if (logAction == 'deleteRewardPointsEventById' && adminActionRecordData && adminActionRecordData.data[1]){
                    let rewardPointsCategory = '';
                    if (adminActionRecordData.data[1] == constRewardPointsTaskCategory.LOGIN_REWARD_POINTS) {
                        rewardPointsCategory = 'LOGIN_REWARD_POINTS';
                    } else if (adminActionRecordData.data[1] == constRewardPointsTaskCategory.GAME_REWARD_POINTS) {
                        rewardPointsCategory = 'GAME_REWARD_POINTS';
                    } else if (adminActionRecordData.data[1] == constRewardPointsTaskCategory.TOPUP_REWARD_POINTS) {
                        rewardPointsCategory = 'TOPUP_REWARD_POINTS';
                    }

                    adminActionRecordData.error = "删除" + localization.localization.translate(rewardPointsCategory);
                    adminActionRecordData.platforms = adminActionRecordData.data[2] ? adminActionRecordData.data[2] : adminActionRecordData.platforms;
                } else if (logAction == 'updateBatchPlayerPermission' && adminActionRecordData && adminActionRecordData.data[0]
                    && adminActionRecordData.data[0].playerNames && Object.keys(adminActionRecordData.data[2]).length) {
                    let permissionChange = '';

                    Object.keys(adminActionRecordData.data[2]).forEach(el => {
                        let prevPermission = !adminActionRecordData.data[2][el];
                        if(el == 'disableWechatPay' || el == 'forbidPlayerFromLogin' || el == 'forbidPlayerFromEnteringGame' || el == 'banReward'
                            || el == 'forbidPartnerFromLogin' || el == 'disableCommSettlement') {
                            permissionChange += localization.localization.translate(el) + "（" + localization.localization.translate(adminActionRecordData.data[2][el])
                                + " -> " + localization.localization.translate(prevPermission) + "）";
                        } else {
                            permissionChange += localization.localization.translate(el) + "（" + localization.localization.translate(prevPermission)
                                + " -> " + localization.localization.translate(adminActionRecordData.data[2][el]) + "）";
                        }
                    });

                    adminActionRecordData.error = '批量设置账号' + adminActionRecordData.data[0].playerNames + '，设置内容' + permissionChange;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platformObjId ? adminActionRecordData.data[0].platformObjId : adminActionRecordData.platforms;
                } else if ((logAction == 'updateBatchPlayerForbidRewardEvents' || logAction == 'updateBatchPlayerForbidProviders')
                    && adminActionRecordData && adminActionRecordData.data[1] && adminActionRecordData.data[1].length
                    && data && data.length) {
                    let forbidRecord = '';
                    let forbidArr = [];

                    data.forEach(el => {
                        if (el && el.name){
                            forbidArr.push(el.name);
                        }
                    })

                    if (forbidArr && forbidArr.length) {
                        forbidRecord = forbidArr.join(", ");
                    }

                    adminActionRecordData.error = '批量设置账号' + adminActionRecordData.data[1] + '，设置内容' + forbidRecord;
                } else if (logAction == 'updateBatchPlayerForbidRewardPointsEvent' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].length
                    && data && data.length) {
                    let forbidRecord = '';
                    let forbidArr = [];

                    data.forEach(el => {
                        if (el && el.rewardTitle){
                            forbidArr.push(el.rewardTitle);
                        }
                    })

                    if (forbidArr && forbidArr.length) {
                        forbidRecord = forbidArr.join(", ");
                    }

                    adminActionRecordData.error = '批量设置账号' + adminActionRecordData.data[0] + '，设置内容' + forbidRecord;
                } else if (logAction == 'updateBatchPlayerForbidPaymentType' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].playerNames
                    && adminActionRecordData.data[1] && adminActionRecordData.data[1].addList.length) {
                    let topupTypeArr = [];
                    let topupType = '';
                    adminActionRecordData.data[1].addList.forEach(el => {
                        topupTypeArr.push(constMerchantTopupType[el]);
                    })
                    if (topupTypeArr && topupTypeArr.length) {
                        topupType = topupTypeArr.join(", ");
                    }

                    adminActionRecordData.error = '批量设置账号' + adminActionRecordData.data[0].playerNames + '，设置内容' + topupType;
                } else if (logAction == 'playerCreditClearOut' && adminActionRecordData && adminActionRecordData.data[0]) {
                    adminActionRecordData.error = '批量情况' + adminActionRecordData.data[0] + '会员余额';
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                } else if (logAction == 'createDxMission' && adminActionRecordData && adminActionRecordData.data[0] && adminActionRecordData.data[0].name) {
                    adminActionRecordData.error = '创建' + adminActionRecordData.data[0].name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == 'comparePhoneNum'){
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                } else if (logAction == 'updateBatchPlayerLevel' && adminActionRecordData.data[2] && adminActionRecordData.data[2].length) {
                    let remark = adminActionRecordData.data[4] || '';
                    let playerNames = adminActionRecordData.data[2].join();

                    adminActionRecordData.error = remark + ' ' + playerNames;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                } else if (logAction == 'updateBatchPlayerCredibilityRemark' && adminActionRecordData.data[2] && data && data.length) {
                    let credibilityRemark = '';
                    let credibilityRemarkArr = [];

                    data.forEach(el => {
                        if (el && el.name){
                            credibilityRemarkArr.push(el.name);
                        }
                    })

                    if (credibilityRemarkArr && credibilityRemarkArr.length) {
                        credibilityRemark = credibilityRemarkArr.join(", ");
                    }

                    adminActionRecordData.error = '批量设置账号' + adminActionRecordData.data[2] + '，设置内容' + credibilityRemark;
                }else if(logAction == 'applyManualTopUpRequest' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[9] ? adminActionRecordData.data[9] : adminActionRecordData.platforms;
                }else if((logAction == 'applyAlipayTopUpRequest' || logAction == 'applyWechatPayTopUpRequest') && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[17] && adminActionRecordData.data[17].platform ? adminActionRecordData.data[17].platform : adminActionRecordData.platforms;
                }else if(logAction == 'applyBonusRequest' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[7] ? adminActionRecordData.data[7] : adminActionRecordData.platforms;
                }else if(logAction == 'applyRewardEvent'){
                    adminActionRecordData.error = '优惠: ' + data.rewardName+ ' 会员帐号： ' + data.playerName;
                    adminActionRecordData.platforms = data.platformObjId ? data.platformObjId : adminActionRecordData.platforms;
                }else if(logAction == 'createPlayerRewardTask' && adminActionRecordData.data[0].playerName && adminActionRecordData.data[0].platformId){
                    adminActionRecordData.error = ' 会员帐号： ' + adminActionRecordData.data[0].playerName + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[0].platformId ? adminActionRecordData.data[0].platformId : adminActionRecordData.platforms;
                }else if(logAction == 'createRewardTaskGroupUnlockedRecord' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name + "; 提案号： " + adminActionRecordData.data[0].proposalNumber || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platformId ? adminActionRecordData.data[0].platformId : adminActionRecordData.platforms;
                }else if(logAction == 'updatePlayerRewardPointsRecord' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[1] ? adminActionRecordData.data[1] : adminActionRecordData.platforms;
                }else if(logAction == 'createUpdatePlayerRealNameProposal' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'createUpdatePartnerRealNameProposal' && data && data.partnerName){
                    adminActionRecordData.error = '代理帐号： ' + data.partnerName + "; 提案号： " + resultData.proposalId || "";
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'createUpdatePlayerInfoLevelProposal' && data && data.name){
                    adminActionRecordData.error = '会员帐号： ' + data.name;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'updateProposalProcessStep' && data && data.proposalId){
                    adminActionRecordData.error = '提案号： ' + data.proposalId;
                    adminActionRecordData.platforms = adminActionRecordData.data[5] ? adminActionRecordData.data[5] : adminActionRecordData.platforms;
                }else if(logAction == 'approveCsPendingAndChangeStatus' && data && data.proposalId){
                    adminActionRecordData.error = '提案号： ' + data.proposalId;
                    adminActionRecordData.platforms = adminActionRecordData.data[3] ? adminActionRecordData.data[3] : adminActionRecordData.platforms;
                }else if(logAction == 'generatePartnerCommSettPreview' && adminActionRecordData.data[0] && adminActionRecordData.data[1]) {
                    let commissionMode;
                    for (let key in constPartnerCommissionType) {
                        if (constPartnerCommissionType[key] == adminActionRecordData.data[1]) {
                            commissionMode = localization.localization.translate(key);
                            break;
                        }
                    }
                    adminActionRecordData.error =  commissionMode;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] ? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'cancelPartnerCommissionPreview' && adminActionRecordData.data[0]) {
                    let commissionMode;
                    for (let key in constPartnerCommissionType) {
                        if (adminActionRecordData.data[0].hasOwnProperty("settMode") && constPartnerCommissionType[key] == adminActionRecordData.data[0].settMode) {
                            commissionMode = localization.localization.translate(key);
                            break;
                        }
                    }
                    adminActionRecordData.error =  commissionMode;
                    adminActionRecordData.platforms = adminActionRecordData.data[0] && adminActionRecordData.data[0].platform ? adminActionRecordData.data[0].platform : adminActionRecordData.platforms;
                }else if(logAction == 'resetAllPartnerCustomizedCommissionRate' && adminActionRecordData.data[0] && adminActionRecordData.data[1]) {
                    let commissionMode;
                    for (let key in constPartnerCommissionType) {
                        if (adminActionRecordData.data[1] && constPartnerCommissionType[key] == adminActionRecordData.data[1]) {
                            commissionMode = localization.localization.translate(key);
                            break;
                        }
                    }
                    let errorText = adminActionRecordData.data[2]? "客制化多级代理参数： ": "客制化代理参数： ";
                    errorText += commissionMode;
                    adminActionRecordData.error =  errorText;
                    adminActionRecordData.platforms = adminActionRecordData.data[0]? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'resetGroupPartnerCommissionRate' && adminActionRecordData.data[0] && adminActionRecordData.data[1]) {
                    let commissionMode;
                    for (let key in constPartnerCommissionType) {
                        if (adminActionRecordData.data[1] && constPartnerCommissionType[key] == adminActionRecordData.data[1]) {
                            commissionMode = localization.localization.translate(key);
                            break;
                        }
                    }
                    let errorText = data && data.name? data.name + "： ": "";
                    errorText += commissionMode;
                    adminActionRecordData.error =  errorText;
                    adminActionRecordData.platforms = adminActionRecordData.data[0]? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                }else if(logAction == 'updatePlatformProviderGroup') {
                    adminActionRecordData.platforms = adminActionRecordData.data[0]? adminActionRecordData.data[0] : adminActionRecordData.platforms;
                    if (adminActionRecordData.data[2] && Object.keys(adminActionRecordData.data[2]).length) {
                        let errorText = "";
                        let logData = adminActionRecordData.data[2];
                        for (let key in logData) {
                            errorText += "ID:" + logData[key].providerGroupId + ", ";
                            errorText += logData[key].name;
                            if (logData[key].newAdd) {
                                errorText += ", 新增此组";
                            }
                            if (logData[key].deleted) {
                                errorText += ", 移除此组";
                            }
                            if (logData[key].addedProviders && logData[key].addedProviders.length) {
                                errorText += ", 加入";
                                let providerText = "";
                                logData[key].addedProviders.map(item => {
                                    if (providerText) {
                                        providerText += ",";
                                    }
                                    providerText += item;
                                })
                                errorText += providerText;
                            }
                            if (logData[key].deletedProviders && logData[key].deletedProviders.length) {
                                errorText += ", 移除";
                                let providerText = "";
                                logData[key].deletedProviders.map(item => {
                                    if (providerText) {
                                        providerText += ",";
                                    }
                                    providerText += item;
                                })
                                errorText += providerText;
                            }
                            errorText += "; "
                        }

                        adminActionRecordData.error = errorText;
                    }
                }


                var record = new dbconfig.collection_systemLog(adminActionRecordData);
                return record.save().then().catch(err => errorSavingLog(err, adminActionRecordData));
            }
        )

    },

    /**
     * Create the log  of credit transfer action to the player
     * @param {objectId} playerId
     * @param {number} amount
     * @param {string} type
     * @param {objectId} operatorId
     * @param {Object} data - details
     */
    createCreditChangeLog: function (playerId, platformId, amount, type, curAmount, operatorId, data) {
        // note: use constPlayerCreditChangeType for the 'type' parameter
        if (curAmount < 0) {
            curAmount = 0;
        }
        var logData = {
            playerId: playerId,
            platformId: platformId,
            amount: amount,
            operationType: type,
            curAmount: curAmount ? curAmount : null,
            operatorId: operatorId ? operatorId : null,
            data: data ? data : null
        };

        // remove extra info on credit change log data
        if (logData.data && logData.data.devCheckMsg) {
            delete logData.data.devCheckMsg;
        }


        var record = new dbconfig.collection_creditChangeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    createCreditChangeLogWithLockedCredit: function (playerId, platformId, amount, type, curAmount, lockedAmount, changedLockedAmount, operatorId, data) {
        if (curAmount < 0) {
            curAmount = 0;
        }

        dbconfig.collection_rewardTaskGroup.find({
            platformId: platformId,
            playerId: playerId,
            status: constRewardTaskStatus.STARTED
        }).populate({
            path: "providerGroup",
            model: dbconfig.collection_gameProviderGroup
        }).lean().then(
            rewardTaskData => {
                let lockedCreditPlayer = 0;
                if (rewardTaskData && rewardTaskData.length > 0) {
                    for (let i = 0; i < rewardTaskData.length; i++) {
                        if (rewardTaskData[i].rewardAmt)
                            lockedCreditPlayer += rewardTaskData[i].rewardAmt;
                    }
                }
                lockedAmount = lockedCreditPlayer ? lockedCreditPlayer : 0;

                if (!amount && !curAmount) {
                    dbconfig.collection_players.findOne({_id: playerId}).lean().then(
                        playerData => {
                            if (playerData.validCredit) {
                                curAmount = playerData.validCredit;
                            }
                            var logData = {
                                playerId: playerId,
                                platformId: platformId,
                                amount: amount,
                                operationType: type,
                                curAmount: curAmount ? curAmount : null,
                                operatorId: operatorId ? operatorId : null,
                                lockedAmount: lockedAmount,
                                changedLockedAmount: changedLockedAmount,
                                data: data ? data : null
                            };

                            if (data && data.transferId) {
                                logData.transferId = data.transferId;
                            }

                            var record = new dbconfig.collection_creditChangeLog(logData);
                            record.save().then().catch(err => errorSavingLog(err, logData));
                        });
                } else {
                    var logData = {
                        playerId: playerId,
                        platformId: platformId,
                        amount: amount,
                        operationType: type,
                        curAmount: curAmount ? curAmount : null,
                        operatorId: operatorId ? operatorId : null,
                        lockedAmount: lockedAmount,
                        changedLockedAmount: changedLockedAmount,
                        data: data ? data : null
                    };

                    if (data && data.transferId) {
                        logData.transferId = data.transferId;
                    }

                    var record = new dbconfig.collection_creditChangeLog(logData);
                    record.save().then().catch(err => errorSavingLog(err, logData));
                }
            });

    },


    /**
     * Create the log  of credit transfer action to the partner
     * @param {objectId} partnerId
     * @param {number} amount
     * @param {string} type
     * @param {objectId} operatorId
     * @param {Object} data - details
     */
    createPartnerCreditChangeLog: function (partnerId, platformId, amount, type, curAmount, operatorId, data) {
        if (curAmount < 0) {
            curAmount = 0;
        }
        var logData = {
            partnerId: partnerId,
            platformId: platformId,
            amount: amount,
            operationType: type,
            curAmount: curAmount ? curAmount : null,
            operatorId: operatorId ? operatorId : null,
            data: data ? data : null
        };
        var record = new dbconfig.collection_partnerCreditChangeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    queryCreditChangeLog: function (query, index, limit, sortCol) {
        index = index || 0;
        limit = Math.min(limit, constSystemParam.MAX_RECORD_NUM);
        sortCol = sortCol || {};

        let a = dbconfig.collection_creditChangeLog
            .find(query)
            .populate({path: "playerId", model: dbconfig.collection_players})
            .populate({path: "platformId", model: dbconfig.collection_platform})
            .sort(sortCol).skip(index).limit(limit).lean();
        let b = dbconfig.collection_creditChangeLog.find(query).count();
        let c = dbconfig.collection_creditChangeLog.aggregate(
            {
                $match: query
            },
            {
                $group: {
                    _id: null,
                    totalAmount: {$sum: "$amount"}
                }
            }
        );
        return Q.all([a, b, c]).then(
            data => {
                var amount = 0;
                if (data[2] && data[2][0]) {
                    amount = data[2][0].totalAmount
                }
                return {
                    data: data[0],
                    size: data[1],
                    summary: {amount: parseFloat(amount).toFixed(2)}
                }
            }
        )
    },

    /**
     * Create the log  info of reward transfer action to the player
     * @param {json} rewardLogData - The data of the log. Refer to rewardLog schema.
     */
    createRewardLog: function (rewardLogData) {
        var record = new dbconfig.collection_rewardLog(rewardLogData);
        record.save().then().catch(err => errorSavingLog(err, record));
    },

    /**
     * Get the log information of an admin action by record _id
     * @param {String} query - Query string
     */
    getAdminActionRecord: function (query) {
        return dbconfig.collection_systemLog.findOne(query).exec();
    },

    /**
     * Create api response time log
     * @param {String} service
     * @param {String} functionName
     * @param {Json} reqData
     * @param {Json} resData
     * @param {number} responseTime
     */
    createAPIResponseTimeLog: function (service, functionName, reqData, resData, responseTime) {
        var logData = {
            service: service,
            functionName: functionName,
            requestData: reqData,
            responseData: resData,
            responseTime: responseTime
        };
        var record = new dbconfig.collection_apiResponseTimeLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    /**
     * Create player credit transfer error log
     * @param {ObjectId} playerObjId
     * @param {String} playerId
     * @param {String} playerName
     * @param {ObjectId} platformObjId
     * @param {String} platformId
     * @param {String} type
     * @param {String} transferId
     * @param {objectId} providerId
     * @param {Number} amount
     * @param lockedAmount
     * @param adminName
     * @param apiRes
     * @param status
     */
    createPlayerCreditTransferStatusLog: function (playerObjId, playerId, playerName, platformObjId, platformId, type, transferId, providerId, amount, lockedAmount, adminName, apiRes, status, isEbet) {
        var logData = {
            playerObjId: playerObjId,
            playerId: playerId,
            playerName: playerName,
            adminName: adminName,
            platformObjId: platformObjId,
            platformId: platformId,
            type: type,
            transferId: transferId,
            providerId: providerId,
            amount: amount,
            lockedAmount: lockedAmount,
            apiRes: apiRes,
            status: status,
            isEbet: isEbet === true ? true : false
        };
        var record = new dbconfig.collection_playerCreditTransferLog(logData);
        record.save().then().catch(err => errorSavingLog(err, logData));
    },

    /**
     * Create settlement log
     * @param {String} type
     * @param {String} interval
     * @param {ObjectId} id
     * @param {Date} settlementTime
     * @param {Boolean} result
     * @param {JSON} data
     */
    createSettlementLog: function (type, interval, id, settlementTime, result, data) {
        var logData = {
            type: type,
            interval: interval,
            id: id,
            settlementTime: settlementTime,
            result: result,
            data: data
        };
        var settleData = new dbconfig.collection_settlementLog(logData);
        settleData.save().then().catch(err => errorSavingLog(err, logData));
    },

    createDataMigrationErrorLog: function (service, functionName, data, error) {
        var logData = {
            service: service,
            functionName: functionName,
            data: data,
            error: error
        };
        var errorLog = new dbconfig.collection_dataMigrationErrorLog(logData);
        errorLog.save().then().catch(err => errorSavingLog(err, logData));
    },
    createSMSLog: function (adminObjId, adminName, recipientName, data, sendObj, platform, status, error) {
        var type = data.playerId ? 'player'
            : data.partnerId ? 'partner'
            : 'other';
        // The data object knows which player or partner we queried
        // The sendObj knows the phone number
        // So we combine them
        var logData = Object.assign({}, data, sendObj, {
            admin: adminObjId,
            adminName: adminName,
            recipientName: recipientName,
            type: type,
            platform: platform,
            phoneNumber: sendObj.tel,
            status: status,
            error: error,
        });

        if (data.tsDistributedPhone) {
            logData.tsDistributedPhone = data.tsDistributedPhone;
            delete logData.playerId;
        }
        var smsLog = new dbconfig.collection_smsLog(logData);
        smsLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    // this actually create all the validation sms log instead of just for registration
    createRegisterSMSLog: function (type, platformObjId, platformId, tel, message, channel, purpose, inputDevice, playerName, status, error, ipAddress, isPartner, isUseVoiceCode) {
        let smsPurposes = Object.keys(constSMSPurpose).map(function (key) {
            return constSMSPurpose[key];
        });

        // if (Object.values(constSMSPurpose).indexOf(purpose) === -1) {
        if (smsPurposes.indexOf(purpose) === -1) {
            purpose = constSMSPurpose.UNKNOWN;
        }

        inputDevice = inputDevice || 0;

        let phoneQuery;
        if (tel) {
            tel = tel.toString();
            phoneQuery = {$in: [rsaCrypto.encrypt(tel), rsaCrypto.oldEncrypt(tel), tel]};
        }

        let playerQuery = {phoneNumber: phoneQuery};
        if (playerName) {
            playerQuery = {
                $or:[
                    {name: playerName},
                    {playerId: playerName}
                ]
            };
        }
        if (platformObjId) {
            playerQuery.platform = platformObjId;
        }

        dbconfig.collection_players.findOne(playerQuery, {name: 1, bankAccount: 1}).lean().then(
            playerData => {
                var logData = {
                    type: type,
                    message: message,
                    platform: platformObjId,
                    tel: tel,
                    inputDevice: inputDevice,
                    channel: channel,
                    purpose: purpose,
                    status: status,
                    error: error,
                    ipAddress: ipAddress,
                    isPlayer: true,
                    isPartner: false,
                    useVoiceCode: Boolean(isUseVoiceCode)
                };

                // sms log used for player or partner service
                if (isPartner) {
                    logData.isPlayer = false,
                    logData.isPartner = true
                }

                //do not log recipientName if sms is use for creating demo account,
                //an incorrect recipientName will be attached to the log if executed.
                if (purpose !== constSMSPurpose.DEMO_PLAYER) {
                    logData.recipientName = playerName;
                }

                if (playerData) {
                    if (purpose !== constSMSPurpose.DEMO_PLAYER && playerData.name)
                        logData.recipientName = playerData.name || playerName;

                    if (purpose === constSMSPurpose.UPDATE_BANK_INFO && !playerData.bankAccount)
                        logData.purpose = constSMSPurpose.UPDATE_BANK_INFO_FIRST;
                }

                var smsLog = new dbconfig.collection_smsLog(logData);
                smsLog.save().then().catch(err => errorSavingLog(err, logData));
            }
        );
    },

    logUsedVerificationSMS: (tel, message, playerName) => {
        dbconfig.collection_smsLog.find({tel, message}).sort({createTime: -1}).limit(1).lean().exec().then(
            smsLogArr => {
                if (smsLogArr && smsLogArr[0]) {
                    let smsLog = smsLogArr[0];

                    let updateData = {
                        used: true
                    };
                    if(playerName) {
                        updateData.recipientName = playerName;
                    }
                    dbconfig.collection_smsLog.update({_id: smsLog._id}, updateData).exec();
                }
            }
        ).catch(errorUtils.reportError);
    },

    logInvalidatedVerificationSMS: (tel, message) => {
        dbconfig.collection_smsLog.find({tel, message}).sort({createTime: -1}).limit(1).lean().exec().then(
            smsLogArr => {
                if (smsLogArr && smsLogArr[0]) {
                    let smsLog = smsLogArr[0];

                    dbconfig.collection_smsLog.update({_id: smsLog._id}, {invalidated: true}).exec();
                }
            }
        ).catch(errorUtils.reportError);
    },

    updateSmsLogProposalId: (tel, message, proposalId) => {
        dbconfig.collection_smsLog.find({tel, message}).sort({createTime: -1}).limit(1).lean().exec().then(
            smsLogArr => {
                if (smsLogArr && smsLogArr[0]) {
                    let smsLog = smsLogArr[0];

                    dbconfig.collection_smsLog.update({_id: smsLog._id}, {proposalId}).exec();
                }
            }
        )
    },

    getPaymentHistory: function (query) {
        var finalResult = [];

        function getAddr(each) {
            if (each.bankAccountProvince2 || each.bankAccountProvince3) {
                each.bankAccountProvince = each.bankAccountProvince2 || each.bankAccountProvince3;
            }
            if (each.bankAccountCity2 || each.bankAccountCity3) {
                each.bankAccountCity = each.bankAccountCity2 || each.bankAccountCity3;
            }
            if (each.bankAccountDistrict2 || each.bankAccountDistrict3) {
                each.bankAccountDistrict = each.bankAccountDistrict2 || each.bankAccountDistrict3;
            }
            var collectionName = '';
            var returnData = Object.assign({}, each);
            if (each.creatorType == constProposalUserType.PLAYERS) {
                collectionName = "collection_players";
            } else if (each.creatorType == constProposalUserType.SYSTEM_USERS) {
                collectionName = "collection_admin";
            }
            var a = collectionName ? dbconfig[collectionName].findOne({_id: each.creatorObjId}) : null;
            // var b = each.bankAccountProvince ? pmsAPI.foundation_getProvince({provinceId: each.bankAccountProvince}).then(data => {
            //     return data && data.province ? data.province.name : each.bankAccountProvince;
            // }) : null;
            var b = each.bankAccountProvince ? RESTUtils.getPMS2Services("postProvince", {provinceId: each.bankAccountProvince}).then(data => {
                return data && data.data ? data.data.name : each.bankAccountProvince;
            }) : null;
            // var c = each.bankAccountCity ? pmsAPI.foundation_getCity({cityId: each.bankAccountCity}).then(data => {
            //     return data && data.city ? data.city.name : each.bankAccountCity;
            // }) : null;
            var c = each.bankAccountCity ? RESTUtils.getPMS2Services("postCity", {cityId: each.bankAccountCity}).then(data => {
                return data && data.data ? data.data.name : each.bankAccountCity;
            }) : null;
            // var d = each.bankAccountDistrict ? pmsAPI.foundation_getDistrict({districtId: each.bankAccountDistrict}).then(data => {
            //     return data && data.district ? data.district.name : each.bankAccountDistrict;
            // }) : null;
            var d = each.bankAccountDistrict ? RESTUtils.getPMS2Services("postDistrict", {districtId: each.bankAccountDistrict}).then(data => {
                return data && data.data ? data.data.name : each.bankAccountDistrict;
            }) : null;
            return Q.all([a, b, c, d]).then(newData => {
                if (each.source == constProposalEntryType.ADMIN) {
                    returnData.sourceStr = "admin";
                } else if (each.source == constProposalEntryType.CLIENT) {
                    returnData.sourceStr = "client";
                }
                returnData.creatorInfo = newData[0];
                returnData.provinceData = newData[1];
                returnData.cityData = newData[2];
                returnData.districtData = newData[3];
                return returnData;
            })
        }

        return dbconfig.collection_bankInfoLog.find(query).lean().then(data => {
            data.map(item => {
                var each = getAddr(item);
                finalResult.push(each);
            })
            return Q.all(finalResult);
        });
    },

    createBankInfoLog: function (logData) {
        var bankLog = new dbconfig.collection_bankInfoLog(logData);
        bankLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    createPaymentAPILog: function (logData) {
        var apiLog = new dbconfig.collection_paymentAPILog(logData);
        apiLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    createSyncDataLog: function (service, functionName, data) {
        var logData = {
            service: service,
            functionName: functionName,
            data: data
        };
        var syncLog = new dbconfig.collection_syncDataLog(logData);
        syncLog.save().then().catch(err => errorSavingLog(err, logData));
    },

    createRewardPointsLog: function (logData) {
        let syncLog = new dbconfig.collection_rewardPointsLog(logData);
        syncLog.save().then().catch(err => errorSavingLog(err, logData));
    },

};

function errorSavingLog(error, data) {
    errorUtils.reportError(error);

    // If we don't have long stack traces enabled, this is an alternative which can at least show us which function the
    // error was reported from.
    // Although it only works if we call it from within the function, not pass it.
    //   promise.catch(err => errorSavingLog(err))   // works
    //   promise.catch(errorSavingLog)               // does not work
    //console.error("instigated from " + Error().stack);

    console.error("with data:", errorUtils.stringifyIfPossible(data));
}

var proto = dbLoggerFunc.prototype;
proto = Object.assign(proto, dbLogger);

// This make WebStorm navigation work
module.exports = dbLogger;