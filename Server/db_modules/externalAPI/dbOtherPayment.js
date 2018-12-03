const dbConfig = require('./../../modules/dbproperties');
const dbLogger = require('./../../modules/dbLogger');
const dbUtil = require('./../../modules/dbutility');
const errorUtils = require('./../../modules/errorUtils');
const proposalExecutor = require('./../../modules/proposalExecutor');
const rsaCrypto = require('./../../modules/rsaCrypto');

const constGameStatus = require('./../../const/constGameStatus');
const constPlayerTopUpType = require('./../../const/constPlayerTopUpType');
const constProposalEntryType = require('./../../const/constProposalEntryType');
const constProposalStatus = require('./../../const/constProposalStatus');
const constProposalType = require('./../../const/constProposalType');
const constProposalUserType = require('./../../const/constProposalUserType');
const constRewardType = require('./../../const/constRewardType');
const constServerCode = require('./../../const/constServerCode');

const dbPropUtil = require('./../../db_common/dbProposalUtility');
const dbRewardUtil = require('./../../db_common/dbRewardUtility');

const dbAutoProposal = require('./../../db_modules/dbAutoProposal');
const dbConsumptionReturnWithdraw = require('./../../db_modules/dbConsumptionReturnWithdraw');
const dbPlayerInfo = require('./../../db_modules/dbPlayerInfo');
const dbPromoCode = require('./../../db_modules/dbPromoCode');
const dbProposal = require('./../../db_modules/dbProposal');
const dbRewardTaskGroup = require('./../../db_modules/dbRewardTaskGroup');

const dbOtherPayment = {
    // region FKP (快付财务系统)
    addFKPTopupRequest: function (userAgent, playerId, topupRequest, topUpReturnCode, lastLoginIp, bankCode) {
        let userAgentStr = userAgent;
        let player, proposal, rewardEvent, newProposal;

        if (topupRequest.bonusCode && topUpReturnCode) {
            return Promise.reject({
                status: constServerCode.PLAYER_APPLY_REWARD_FAIL,
                name: "DataError",
                message: "Cannot apply 2 reward in 1 top up"
            });
        }

        return dbConfig.collection_players.findOne({playerId: playerId}).populate(
            {path: "platform", model: dbConfig.collection_platform}
        ).populate(
            {path: "merchantGroup", model: dbConfig.collection_platformMerchantGroup}
        ).populate(
            {path: "playerLevel", model: dbConfig.collection_playerLevel}
        ).then(
            playerData => {
                player = playerData;

                if (player && player._id) {
                    if (!topUpReturnCode) {
                        return Promise.resolve();
                    }

                    return dbRewardUtil.checkApplyTopUpReturn(player, topUpReturnCode, userAgentStr, topupRequest, constPlayerTopUpType.ONLINE);

                } else {
                    return Promise.reject({
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
                    let proms = [limitedOfferProm];
                    if (topupRequest.bonusCode) {
                        let bonusCodeCheckProm;
                        let isOpenPromoCode = topupRequest.bonusCode.toString().trim().length === 3;
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
                    return Promise.reject({
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
                let bonusCodeValidity = res[1];

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

                if (userAgent) {
                    userAgent = dbUtil.retrieveAgent(userAgent);
                }

                let proposalData = Object.assign({}, topupRequest);
                proposalData.playerId = playerId;
                proposalData.playerObjId = player._id;
                proposalData.platformId = player.platform._id;
                if( player.playerLevel ){
                    proposalData.playerLevel = player.playerLevel._id;
                }
                proposalData.playerRealName = player.realName;
                proposalData.platform = player.platform.platformId;
                proposalData.playerName = player.name;
                proposalData.userAgent = userAgent ? userAgent : "";
                proposalData.creator = {
                    type: 'player',
                    name: player.name,
                    id: playerId
                };
                proposalData.bankCode = bankCode;

                if (rewardEvent && rewardEvent.type && rewardEvent.type.name && rewardEvent.code){
                    if (rewardEvent.type.name === constRewardType.PLAYER_TOP_UP_RETURN_GROUP || rewardEvent.type.name === constRewardType.PLAYER_TOP_UP_RETURN){
                        proposalData.topUpReturnCode = rewardEvent.code;
                    }
                    else if (rewardEvent.type.name === constRewardType.PLAYER_RETENTION_REWARD_GROUP){
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

                newProposal = {
                    creator: proposalData.creator,
                    data: proposalData,
                    entryType: constProposalEntryType.CLIENT,
                    userType: player.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                };
                newProposal.inputDevice = dbUtil.getInputDevice(userAgentStr, false);
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

                return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_FKP_TOP_UP, newProposal);

            }
        ).then(
            proposalData => {
                if (proposalData) {
                    proposal = proposalData;
                    let ip = player.lastLoginIp && player.lastLoginIp != 'undefined' ? player.lastLoginIp : "127.0.0.1";
                    let postData = {
                        charset: 'UTF-8',
                        merchantCode: 'M310018',
                        orderNo: proposal.proposalId,
                        // FKP amount is in cent unit
                        amount: topupRequest.amount * 100,
                        channel: 'BANK',
                        bankCode: bankCode,
                        remark: 'test remark',
                        notifyUrl: "http://devtest.wsweb.me:3000/fkpNotify",
                        returnUrl: "",
                        extraReturnParam: ""
                    };

                    let toEncrypt = processFKPData(postData);
                    postData.sign = rsaCrypto.signFKP(toEncrypt);
                    postData.signType = "RSA";

                    return {
                        postUrl: 'https://api.fukuaipay.com/gateway/bank',
                        postData: postData
                    }
                }
                else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Cannot create online top up proposal",
                        error: Error()
                    });
                }
            }
        );

        function processFKPData (data) {
            let toEncrypt = '';

            Object.keys(data).forEach(key => {
                toEncrypt += key;
                toEncrypt += '=';
                toEncrypt += data[key] ? data[key].toString() : '';
                toEncrypt += '&'
            });

            // remove the last & character
            toEncrypt = toEncrypt.slice(0, -1);

            return toEncrypt;
        }
    },

    updateFKPTopupProposal: function (proposalId, requestId, orderStatus) {
        let proposalObj;
        let type = constPlayerTopUpType.FUKUAIPAY;
        let bSuccess = orderStatus === constProposalStatus.SUCCESS;
        let lastSettleTime = new Date();

        return dbConfig.collection_proposal.findOne({proposalId: proposalId}).populate({
            path: "type", model: dbConfig.collection_proposalType
        }).then(
            proposalData => {
                if (proposalData && proposalData.data) {
                    proposalObj = proposalData;

                    if (proposalData.status === constProposalStatus.PENDING) {
                        if (orderStatus === constProposalStatus.SUCCESS || orderStatus === constProposalStatus.FAIL) {
                            return dbConfig.collection_proposal.findOneAndUpdate(
                                {_id: proposalObj._id, createTime: proposalObj.createTime},
                                {
                                    status: orderStatus,
                                    "data.lastSettleTime": lastSettleTime
                                }
                            )
                        }
                        else {
                            return Promise.reject({
                                name: 'DataError',
                                message: 'Invalid order status!'
                            })
                        }
                    }
                    else {
                        return Promise.reject({
                            name: 'DataError',
                            message: 'Invalid order!'
                        })
                    }
                } else {
                    return Promise.reject({
                        name: 'DataError',
                        message: 'Order not exists!'
                    })
                }
            }
        ).then(
            preUpdProp => {
                // Check concurrent update
                if (preUpdProp && preUpdProp.status !== constProposalStatus.SUCCESS && preUpdProp.status !== constProposalStatus.FAIL) {
                    return proposalExecutor.approveOrRejectProposal(proposalObj.type.executionType, proposalObj.type.rejectionType, bSuccess, proposalObj);
                }
            }
        );
    },

    applyFKPBonus: function (userAgent, playerId, bonusId, amount, honoreeDetail, bForce, adminInfo) {
        let ximaWithdrawUsed = 0;
        if (amount < 100 && !adminInfo) {
            return Promise.reject({name: "DataError", errorMessage: "Amount is not enough"});
        }
        let player = null;
        let bUpdateCredit = false;
        let platform;
        let isUsingXima = false;
        let lastBonusRemark = "";

        bonusId = parseInt(bonusId);
        amount = parseInt(amount);

        return dbConfig.collection_players.findOne({playerId: playerId})
            .populate({path: "platform", model: dbConfig.collection_platform})
            .populate({path: "lastPlayedProvider", model: dbConfig.collection_gameProvider})
        .lean().then(
            playerData => {
                //check if player has pending proposal to update bank info
                if (playerData) {
                    let propQ = {
                        "data._id": String(playerData._id)
                    };

                    platform = playerData.platform;

                    return dbPropUtil.getProposalDataOfType(playerData.platform._id, constProposalType.UPDATE_PLAYER_BANK_INFO, propQ).then(
                        proposals => {
                            if (proposals && proposals.length > 0) {
                                let bExist = false;
                                proposals.forEach(
                                    proposal => {
                                        if (proposal.status === constProposalStatus.PENDING ||
                                            (proposal.process && proposal.process.status === constProposalStatus.PENDING)) {
                                            bExist = true;
                                        }
                                    }
                                );
                                if (!bExist || bForce) {
                                    return playerData;
                                }
                                else {
                                    return Promise.reject({
                                        name: "DataError",
                                        errorMessage: "Player is updating bank info"
                                    });
                                }
                            }
                            else {
                                return playerData;
                            }
                        }
                    );
                }
                else {
                    return Promise.reject({name: "DataError", errorMessage: "Cannot find player"});
                }
            }
        ).then(
            playerData => {
                if (playerData) {
                    player = playerData;

                    if (player.ximaWithdraw) {
                        ximaWithdrawUsed = Math.min(amount, player.ximaWithdraw);

                        if (amount <= player.ximaWithdraw) {
                            isUsingXima = true;
                        }
                    }

                    let permissionProm = Promise.resolve(true);
                    let disablePermissionProm = Promise.resolve(true);
                    if (!player.permission.applyBonus) {
                        permissionProm = dbConfig.collection_playerPermissionLog.find(
                            {
                                player: player._id,
                                platform: platform._id,
                                "newData.applyBonus": false,
                            },
                            {remark: 1}
                        ).sort({createTime: -1}).limit(1).lean().then(
                            log => {
                                if (log && log.length > 0) {
                                    lastBonusRemark = log[0].remark;
                                }
                            }
                        );

                        disablePermissionProm = dbConfig.collection_playerPermissionLog.findOne({
                            player: player._id,
                            platform: platform._id,
                            isSystem: false
                        }).sort({createTime: -1}).lean().then(
                            manualPermissionSetting => {
                                if (manualPermissionSetting && manualPermissionSetting.newData && manualPermissionSetting.newData.hasOwnProperty('applyBonus')
                                    && manualPermissionSetting.newData.applyBonus.toString() === 'false') {
                                    return dbConfig.collection_proposal.find({
                                        'data.platformId': platform._id,
                                        'data.playerObjId': player._id,
                                        mainType: constProposalType.PLAYER_BONUS,
                                        status: {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                        'data.remark': '禁用提款: '+ lastBonusRemark
                                    }).sort({createTime: -1}).limit(1).then(proposalData => {
                                        if (proposalData && proposalData.length > 0) {
                                            lastBonusRemark = manualPermissionSetting.remark;
                                        }
                                    });
                                }
                            }
                        )
                    }
                    return Promise.all([permissionProm, disablePermissionProm]).then(
                        res => {
                            let unlockAllGroups = Promise.resolve(true);
                            if (bForce) {
                                unlockAllGroups = dbRewardTaskGroup.unlockPlayerRewardTask(playerData._id, adminInfo).catch(errorUtils.reportError);
                            }
                            return unlockAllGroups.then(
                                () => {
                                    return dbRewardUtil.findStartedRewardTaskGroup(playerData.platform, playerData._id);
                                }
                            );
                        }
                    );
                } else {
                    return Promise.reject({name: "DataError", errorMessage: "Cannot find player"});
                }
            }
        ).then(
            RTG => {
                if (RTG) {
                    let consumptionOffset = Number.isFinite(Number(platform.autoApproveConsumptionOffset)) ? Number(platform.autoApproveConsumptionOffset) : 0;
                    let curConsumption = Number.isFinite(Number(RTG.curConsumption)) ? Number(RTG.curConsumption) : 0;
                    let currentConsumption = curConsumption + consumptionOffset;

                    let targetConsumption = Number.isFinite(Number(RTG.targetConsumption)) ? Number(RTG.targetConsumption) : 0;
                    let forbidXIMAAmt = Number.isFinite(Number(RTG.forbidXIMAAmt)) ? Number(RTG.forbidXIMAAmt) : 0;
                    let totalTargetConsumption = targetConsumption + forbidXIMAAmt;

                    if (currentConsumption >= totalTargetConsumption) {
                        console.log('unlock rtg due to consumption clear in other location B', RTG._id);
                        return dbRewardTaskGroup.unlockRewardTaskGroupByObjId(RTG).then(
                            () => {
                                return dbRewardUtil.findStartedRewardTaskGroup(player.platform, player._id);
                            }
                        );
                    }
                }
                return RTG;
            }
        ).then(
            RTGs => {
                if (!RTGs || isUsingXima) {
                    if (!player.bankName || !player.bankAccountName || !player.bankAccount) {
                        return Promise.reject({
                            status: constServerCode.PLAYER_INVALID_PAYMENT_INFO,
                            name: "DataError",
                            errorMessage: "Player does not have valid payment information"
                        });
                    }
                    let todayTime = dbUtil.getTodaySGTime();
                    let creditProm = Promise.resolve();

                    if (player.lastPlayedProvider && dbUtil.getPlatformSpecificProviderStatus(player.lastPlayedProvider, platform.platformId) == constGameStatus.ENABLE) {
                        creditProm = dbPlayerInfo.transferPlayerCreditFromProvider(player.playerId, player.platform._id, player.lastPlayedProvider.providerId, -1, null, true).catch(errorUtils.reportError);
                    }

                    return creditProm.then(
                        () => {
                            return dbConfig.collection_players.findOne({playerId: playerId})
                                .populate({path: "platform", model: dbConfig.collection_platform})
                                .populate({path: 'playerLevel', model: dbConfig.collection_playerLevel})
                                .lean();
                        }
                    ).then(
                        playerData => {
                            //check if player has enough credit
                            player = playerData;
                            if ((parseFloat(playerData.validCredit).toFixed(2)) < parseFloat(amount)) {
                                return Promise.reject({
                                    status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                    name: "DataError",
                                    errorMessage: "Player does not have enough credit."
                                });
                            }
                            return dbConfig.collection_proposal.find(
                                {
                                    mainType: "PlayerBonus",
                                    createTime: {
                                        $gte: todayTime.startTime,
                                        $lt: todayTime.endTime
                                    },
                                    "data.playerId": playerId,
                                    status: {
                                        $in: [constProposalStatus.PENDING, constProposalStatus.APPROVED, constProposalStatus.SUCCESS]
                                    }
                                }
                            ).lean();
                        }
                    ).then(
                        todayBonusApply => {
                            let changeCredit = -amount;
                            let finalAmount = amount;
                            let creditCharge = 0;
                            let creditChargeWithoutDecimal = 0;
                            let amountAfterUpdate = player.validCredit - amount;
                            let playerLevelVal = player.playerLevel.value;
                            if (player.platform.bonusSetting) {
                                let bonusSetting = {};

                                for (let x in player.platform.bonusSetting) {
                                    if (player.platform.bonusSetting[x].value == playerLevelVal) {
                                        bonusSetting = player.platform.bonusSetting[x];
                                    }
                                }
                                if (todayBonusApply.length >= bonusSetting.bonusCharges && bonusSetting.bonusPercentageCharges > 0) {
                                    creditCharge = (finalAmount * bonusSetting.bonusPercentageCharges) * 0.01;
                                    if(platform.withdrawalFeeNoDecimal){
                                        creditChargeWithoutDecimal = parseInt(creditCharge);
                                        finalAmount = finalAmount - creditChargeWithoutDecimal;
                                    }else{
                                        finalAmount = finalAmount - creditCharge;
                                    }
                                }
                            }

                            return dbConfig.collection_players.findOneAndUpdate(
                                {
                                    _id: player._id,
                                    platform: player.platform._id
                                },
                                {$inc: {validCredit: changeCredit}},
                                {new: true}
                            ).then(
                                //check if player's credit is correct after update
                                updateRes => dbConfig.collection_players.findOne({_id: player._id})
                            ).then(
                                newPlayerData => {
                                    if (newPlayerData) {
                                        bUpdateCredit = true;
                                        //to fix float problem...
                                        if (newPlayerData.validCredit < -0.02) {
                                            //credit will be reset below
                                            return Promise.reject({
                                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                                name: "DataError",
                                                errorMessage: "Player does not have enough credit.",
                                                data: '(detected after withdrawl)'
                                            });
                                        }
                                        //check if player's credit is correct after update
                                        if (parseInt(amountAfterUpdate) != parseInt(newPlayerData.validCredit)) {
                                            console.log("PlayerBonus: Update player credit failed", amountAfterUpdate, newPlayerData.validCredit);
                                            return Promise.reject({
                                                status: constServerCode.PLAYER_NOT_ENOUGH_CREDIT,
                                                name: "DataError",
                                                errorMessage: "Update player credit failed",
                                                data: '(detected after withdrawl)'
                                            });
                                        }
                                        //fix player negative credit
                                        if (newPlayerData.validCredit < 0 && newPlayerData.validCredit > -0.02) {
                                            newPlayerData.validCredit = 0;
                                            dbConfig.collection_players.findOneAndUpdate(
                                                {_id: newPlayerData._id, platform: newPlayerData.platform},
                                                {validCredit: 0}
                                            ).then();
                                        }
                                        player.validCredit = newPlayerData.validCredit;
                                        //create proposal
                                        let proposalData = {
                                            creator: adminInfo || {
                                                type: 'player',
                                                name: player.name,
                                                id: playerId
                                            },
                                            playerId: playerId,
                                            playerObjId: player._id,
                                            playerName: player.name,
                                            bonusId: bonusId,
                                            platformId: player.platform._id,
                                            platform: player.platform.platformId,
                                            bankTypeId: player.bankName,
                                            amount: finalAmount,
                                            curAmount: player.validCredit,
                                            lastSettleTime: new Date(),
                                            honoreeDetail: honoreeDetail,
                                            creditCharge: platform.withdrawalFeeNoDecimal ? creditChargeWithoutDecimal : creditCharge,
                                            oriCreditCharge: creditCharge,
                                            ximaWithdrawUsed: ximaWithdrawUsed,
                                            isAutoApproval: player.platform.enableAutoApplyBonus,
                                            bankAccountWhenSubmit: player && player.bankAccount ? dbUtil.encodeBankAcc(player.bankAccount) : "",
                                            bankNameWhenSubmit: player && player.bankName ? player.bankName : ""
                                        };
                                        if (!player.permission.applyBonus) {
                                            proposalData.remark = "禁用提款: " + lastBonusRemark;
                                            if(player.platform.playerForbidApplyBonusNeedCsApproval) {
                                                proposalData.needCsApproved = true;
                                            }
                                        }
                                        let newProposal = {
                                            creator: proposalData.creator,
                                            data: proposalData,
                                            entryType: adminInfo ? constProposalEntryType.ADMIN : constProposalEntryType.CLIENT,
                                            userType: newPlayerData.isTestPlayer ? constProposalUserType.TEST_PLAYERS : constProposalUserType.PLAYERS,
                                        };
                                        newProposal.inputDevice = dbUtil.getInputDevice(userAgent, false, adminInfo);

                                        return dbProposal.createProposalWithTypeName(player.platform._id, constProposalType.PLAYER_BONUS, newProposal);
                                    }
                                }
                            );
                        }
                    );
                } else {
                    return Promise.reject({
                        status: constServerCode.NOT_ENOUGH_CONSUMPTION,
                        name: "DataError",
                        errorMessage: "There are available reward task group to complete"
                    });
                }
            }
        ).then(
            proposal => {
                if (proposal) {
                    if (proposal.data && proposal.data.amount && proposal.data.amount >= platform.autoApproveWhenSingleBonusApplyLessThan) {
                        dbPlayerInfo.createLargeWithdrawalLog(proposal, platform._id).catch(err => {
                            return errorUtils.reportError(err);
                        });
                    }

                    if (bUpdateCredit) {
                        dbLogger.createCreditChangeLogWithLockedCredit(player._id, player.platform._id, -amount, constProposalType.PLAYER_BONUS, player.validCredit, 0, 0, null, proposal);
                    }
                    dbConsumptionReturnWithdraw.reduceXimaWithdraw(player._id, ximaWithdrawUsed).catch(errorUtils.reportError);
                    return proposal;
                } else {
                    return Promise.reject({name: "DataError", errorMessage: "Cannot create bonus proposal"});
                }
            }
        ).then(
            data => {
                let proposal = Object.assign({}, data);
                proposal.type = proposal.type._id;

                if (proposal.status === constProposalStatus.AUTOAUDIT) {
                    let proposals = [];
                    proposals.push(proposal);
                    dbAutoProposal.processAutoProposals(proposals, platform);
                }
                return data;
            },
            error => {
                if (bUpdateCredit) {
                    return resetCredit(player._id, player.platform._id, amount, error);
                }
                else {
                    return Q.reject(error);
                }
            }
        );

        function resetCredit(playerObjId, platformObjId, credit, error) {
            //reset player credit if credit is incorrect
            return dbConfig.collection_players.findOneAndUpdate(
                {
                    _id: playerObjId,
                    platform: platformObjId
                },
                {$inc: {validCredit: credit}},
                {new: true}
            ).then(
                resetPlayer => {
                    if (error) {
                        return Promise.reject(error);
                    }
                    else {
                        return Promise.reject({name: "DataError", errorMessage: "player valid credit abnormal."});
                    }
                }
            );
        };
    },

    // endregion
};
module.exports = dbOtherPayment;