const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const constPlayerTopUpType = require('../const/constPlayerTopUpType');
const dbProposalUtility = require("../db_common/dbProposalUtility");
let dbProposal = require('./../db_modules/dbProposal');
const ObjectId = mongoose.Types.ObjectId;

const dbPropUtil = require('./../db_common/dbProposalUtility');

let dbReport = {
    getPlayerAlipayAccReport: function (platformList, startTime, endTime, playerName, alipayAcc, alipayName, alipayNickname, alipayRemark) {
        let platformListQuery;

        let query = {
            //'data.platformId': platformObjId,
            createTime: {$gte: startTime, $lt: endTime},
            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
        };

        if(platformList && platformList.length > 0) {
            platformListQuery = {$in: platformList.map(item => { return ObjectId(item)})};
            query['data.platformId'] = platformListQuery;
        }

        let retFields = {
            proposalId: 1, 'data.playerName': 1, 'data.amount': 1, createTime: 1, 'data.remark': 1,
            'data.alipayerAccount': 1, 'data.alipayer': 1, 'data.alipayerNickName': 1, 'data.alipayRemark': 1, 'data.platformId': 1
        };

        if (playerName) { query['data.playerName'] = playerName }
        if (alipayAcc) {
            let subAcc = alipayAcc.substring(0, 3);

            if (alipayAcc.indexOf('@') > -1) {
                let domainAcc = alipayAcc.split('@')[1];
                query['data.alipayerAccount'] = subAcc + '***@' + domainAcc;
            } else {
                let domainAcc = alipayAcc.substring(alipayAcc.length - 2);
                query['data.alipayerAccount'] = subAcc + '******' + domainAcc;
            }
        }
        if (alipayName) {
            // Ignore first char
            let subName = alipayName.substring(1);
            query['data.alipayer'] = '*' + subName;
        }
        if (alipayNickname) { query['data.alipayerNickName'] = alipayNickname }
        if (alipayRemark) { query['$or'] = [{'data.alipayRemark': alipayRemark}, {'data.remark': alipayRemark}] }

        return dbPropUtil.getProposalDataOfTypeByPlatforms(platformListQuery, constProposalType.PLAYER_ALIPAY_TOP_UP, query, retFields);
    },

    getPaymentMonitorReport: (data, index, limit, sortCol) => {
        let query = {};
        sortCol = sortCol || {createTime: -1};
        let paymentMonitorCount = 0;
        let filteredProposal = [];
        let curPlatformObjId;

        if (data && data.currentPlatformId) {
            curPlatformObjId = ObjectId(data.currentPlatformId);
        }

        query["proposalCreateTime"] = {};
        query["proposalCreateTime"]["$gte"] = data.startTime ? new Date(data.startTime) : null;
        query["proposalCreateTime"]["$lt"] = data.endTime ? new Date(data.endTime) : null;

        if (data.playerName) {
            query['playerName'] = data.playerName;
        }
        if (data.proposalNo) {
            query['proposalId'] = data.proposalNo;
        }

        if (data.userAgent && data.userAgent.length > 0) {
            query['userAgent'] = {$in: convertStringNumber(data.userAgent)};
        }

        if (data.topupType && data.topupType.length > 0) {
            query['topupType'] = {$in: convertStringNumber(data.topupType)}
        }

        if (data.merchantNo && data.merchantNo.length > 0 && (!data.merchantGroup || data.merchantGroup.length == 0)) {
            query['$and'] = [];
            query['$and'].push({$or: [
                    {'merchantNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'bankCardNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'accountNo': {$in: convertStringNumber(data.merchantNo)}},
                    {'alipayAccount': {$in: convertStringNumber(data.merchantNo)}},
                    {'wechatAccount': {$in: convertStringNumber(data.merchantNo)}},
                    {'weChatAccount': {$in: convertStringNumber(data.merchantNo)}}
                ]}
            );
        }

        if ((!data.merchantNo || data.merchantNo.length == 0) && data.merchantGroup && data.merchantGroup.length > 0) {
            let mGroupList = [];
            data.merchantGroup.forEach(item => {
                item.forEach(sItem => {
                    mGroupList.push(sItem)
                })
            });
            query['merchantNo'] = {$in: convertStringNumber(mGroupList)};
        }

        if (data.merchantNo && data.merchantNo.length > 0 && data.merchantGroup && data.merchantGroup.length > 0) {
            if (data.merchantGroup.length > 0) {
                let mGroupC = [];
                let mGroupD = [];
                data.merchantNo.forEach(item => {
                    mGroupC.push(item);
                });
                data.merchantGroup.forEach(item => {
                    item.forEach(sItem => {
                        mGroupD.push(sItem)
                    });
                });
                if (data.merchantNo.length > 0) {
                    query['merchantNo'] = {$in: convertStringNumber(mGroupC)};
                } else if (data.merchantGroup.length > 0 && data.merchantNo.length == 0) {
                    query['merchantNo'] = {$in: convertStringNumber(mGroupD)}
                }
            }
        }

        if (data.depositMethod && data.depositMethod.length > 0) {
            query['depositMethod'] = {'$in': convertStringNumber(data.depositMethod)};
        }

        if (data.bankTypeId && data.bankTypeId.length > 0) {
            query['bankTypeId'] = {$in: convertStringNumber(data.bankTypeId)};
        }

        if (data.lockedAdmin && data.lockedAdmin.length > 0) {
            query['lockedAdminId'] = {$in: data.lockedAdmin};
        }

        let mainTopUpType;
        switch (String(data.mainTopupType)) {
            case constPlayerTopUpType.ONLINE.toString():
                mainTopUpType = constProposalType.PLAYER_TOP_UP;
                break;
            case constPlayerTopUpType.ALIPAY.toString():
                mainTopUpType = constProposalType.PLAYER_ALIPAY_TOP_UP;
                break;
            case constPlayerTopUpType.MANUAL.toString():
                mainTopUpType = constProposalType.PLAYER_MANUAL_TOP_UP;
                break;
            case constPlayerTopUpType.WECHAT.toString():
                mainTopUpType = constProposalType.PLAYER_WECHAT_TOP_UP;
                break;
            case constPlayerTopUpType.QUICKPAY.toString():
                mainTopUpType = constProposalType.PLAYER_QUICKPAY_TOP_UP;
                break;
            case constPlayerTopUpType.COMMON.toString():
                mainTopUpType = constProposalType.PLAYER_COMMON_TOP_UP;
                break;
            default:
                mainTopUpType = {
                    $in: [
                        constProposalType.PLAYER_TOP_UP,
                        constProposalType.PLAYER_ALIPAY_TOP_UP,
                        constProposalType.PLAYER_MANUAL_TOP_UP,
                        constProposalType.PLAYER_WECHAT_TOP_UP,
                        constProposalType.PLAYER_QUICKPAY_TOP_UP,
                        constProposalType.PLAYER_COMMON_TOP_UP,
                    ]
                };
        }

        let proposalTypeQuery = {
            name: mainTopUpType
        };

        if(data.platformList && data.platformList.length > 0){
            proposalTypeQuery.platformId = {$in: data.platformList};
        }

        return dbconfig.collection_proposalType.find(proposalTypeQuery).lean().then(
            proposalTypes => {
                if(proposalTypes){
                    let typeIds = proposalTypes.map(type => {
                        return type._id;
                    });

                    query.type = {$in: typeIds};

                    let paymentMonitorCountProm = dbconfig.collection_paymentMonitorFollowUp.find(query).count();
                    let paymentMonitorProm = dbconfig.collection_paymentMonitorFollowUp.find(query)
                        .populate({path: "type", model: dbconfig.collection_proposalType})
                        .populate({path: "playerObjId", model: dbconfig.collection_players})
                        .sort(sortCol).skip(index).limit(limit).lean();

                    return Promise.all([paymentMonitorCountProm, paymentMonitorProm]).then(
                        data => {
                            let paymentMonitorRecord = data && data[1] ? data[1] : [];
                            paymentMonitorCount = data[0];

                            return paymentMonitorResult(paymentMonitorRecord, curPlatformObjId, paymentMonitorCount, filteredProposal);

                        });
                }
            }
        );
    },

    getReferralRewardReport: (platform, query, index, limit, sortCol) => {
        limit = limit ? limit : 30;
        index = index ? index : 0;
        query = query ? query : {};
        let startDate = new Date(query.start);
        let endDate = new Date(query.end);
        let referrerRecord;
        let referralRewardDetails = [];
        let consumptionReturnTypeId = "";

        return dbconfig.collection_players.findOne({name: query.referralName}).lean().then(
            referrerData => {
                if (referrerData && referrerData._id) {
                    referrerRecord = referrerData;

                    let referralQuery = {
                        platform: referrerData.platform,
                        referral: referrerData._id
                    };

                    if (startDate) {
                        referralQuery['$or'] = [{validEndTime: {$gte: startDate}}, {$and: [{validEndTime: {$eq: null}}, {validEndTime: {$exists: true}}]}];
                    }

                    return dbconfig.collection_referralLog.find(referralQuery).lean().then(
                        referees => {
                            if (referees && referees.length > 0) {
                                let playerObjIds = referees.map(item => item && item.playerObjId);

                                let playerProm = dbconfig.collection_players.find({_id: {$in: playerObjIds}}).lean();

                                let referralRewardQuery = {
                                    'data.playerObjId': referrerRecord._id,
                                    'data.platformObjId': referrerRecord.platform,
                                    createTime: {$gte: startDate, $lt: endDate},
                                    status: constProposalStatus.APPROVED
                                }
                                let referralRewardProm = dbProposalUtility.getProposalDataOfType(referrerRecord.platform, constProposalType.REFERRAL_REWARD_GROUP, referralRewardQuery);


                                let consumptionPromMatchObj = {
                                    playerId: {$in: playerObjIds},
                                    createTime: {
                                        $gte: new Date(startDate),
                                        $lt: new Date(endDate)
                                    },
                                    isDuplicate: {$ne: true}
                                };
                                let consumptionProm = dbconfig.collection_playerConsumptionRecord.aggregate([
                                    {
                                        $match: consumptionPromMatchObj
                                    },
                                    {
                                        $group: {
                                            _id: {
                                                playerObjId: "$playerId",
                                                gameId: "$gameId",
                                            },
                                            gameId: {"$first": "$gameId"},
                                            providerId: {"$first": "$providerId"},
                                            count: {$sum: {$cond: ["$count", "$count", 1]}},
                                            amount: {$sum: "$amount"},
                                            validAmount: {$sum: "$validAmount"},
                                            bonusAmount: {$sum: "$bonusAmount"}
                                        }
                                    }
                                ]).allowDiskUse(true).read("secondaryPreferred").then(
                                    data => {
                                        return dbconfig.collection_gameProvider.populate(data, {path: 'providerId', select: '_id name'});
                                    }
                                );

                                let topupAndBonusProm = dbconfig.collection_proposal.aggregate([
                                    {
                                        "$match": {
                                            "data.playerObjId": {$in: playerObjIds},
                                            "createTime": {
                                                "$gte": new Date(startDate),
                                                "$lte": new Date(endDate)
                                            },
                                            "mainType": {$in: ["TopUp", "PlayerBonus"]},
                                            "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
                                        }
                                    },
                                    {
                                        $group: {
                                            _id: {
                                                playerObjId: "$data.playerObjId",
                                                mainType: "$mainType",
                                                typeId: "$type",
                                                merchantName: "$data.merchantName",
                                                merchantNo: "$data.merchantNo"
                                            },
                                            count: {"$sum": 1},
                                            amount: {"$sum": "$data.amount"}
                                        }
                                    }
                                ]).allowDiskUse(true).read("secondaryPreferred");

                                let rewardProm = dbconfig.collection_proposal.aggregate([
                                    {
                                        "$match": {
                                            "data.playerObjId": {$in: playerObjIds},
                                            "createTime": {
                                                "$gte": new Date(startDate),
                                                "$lte": new Date(endDate)
                                            },
                                            "mainType": "Reward",
                                            "status": {"$in": [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                                        }
                                    },
                                    {
                                        "$group": {
                                            "_id": {
                                                playerObjId: "$data.playerObjId",
                                                type: "$type"
                                            },
                                            "amount": {"$sum": "$data.rewardAmount"}
                                        }
                                    }
                                ]).allowDiskUse(true).read("secondaryPreferred");

                                let consumptionReturnProposalTypeProm = dbconfig.collection_proposalType.findOne({platformdId: referrerRecord.platform, name: constProposalType.PLAYER_CONSUMPTION_RETURN}).lean().then(
                                    proposalType => {
                                        if (proposalType && proposalType._id) {
                                            consumptionReturnTypeId = proposalType._id.toString();
                                        }
                                    }
                                );

                                return Promise.all([playerProm, referralRewardProm, consumptionProm, topupAndBonusProm, rewardProm, consumptionReturnProposalTypeProm]).then(
                                    data => {
                                        let players = data && data[0] ? data[0] : [];
                                        let referralRewardProposals = data && data[1] ? data[1] : [];
                                        let gameDetail = data && data[2] ? data[2] : [];
                                        let topUpAndBonusDetail = data && data[3] ? data[3] : [];
                                        let rewardDetail = data && data[4] ? data[4] : [];

                                        if (referralRewardProposals && referralRewardProposals.length > 0) {
                                            referralRewardProposals.forEach(proposal => {
                                                if (proposal && proposal.data && proposal.data.referralRewardDetails && proposal.data.referralRewardDetails.length > 0) {
                                                    proposal.data.referralRewardDetails.forEach(reward => {
                                                        if (reward) {
                                                            let indexNo = referralRewardDetails.findIndex(x => x && x.playerObjId && reward.playerObjId
                                                                && (x.playerObjId.toString() === reward.playerObjId.toString()));
                                                            let amount = reward.actualRewardAmount || reward.rewardAmount || 0

                                                            if (indexNo != -1) {
                                                                referralRewardDetails[indexNo].rewardAmount += amount;
                                                            } else {
                                                                referralRewardDetails.push({
                                                                    playerObjId: reward.playerObjId,
                                                                    validAmount: reward.validAmount,
                                                                    rewardAmount: amount
                                                                })
                                                            }
                                                        }
                                                    })
                                                }
                                            })
                                        }

                                        if (players && players.length) {
                                            let retArr = [];

                                            players.map(playerDetail => {
                                                let result = {_id: playerDetail._id};

                                                let referee = referees.filter(x => String(x.playerObjId) === String(playerDetail._id));

                                                if (referee && referee[0]) {
                                                    result.bindTime = referee[0] && referee[0].createTime;
                                                    result.bindStatus = referee[0] && referee[0].isValid;
                                                }

                                                if (playerDetail.playerLevel) {
                                                    result.playerLevel = playerDetail.playerLevel._id;
                                                    result.playerLevelName = playerDetail.playerLevel.name;
                                                }
                                                result.name = playerDetail.name;
                                                result.valueScore = playerDetail.valueScore;
                                                result.registrationTime = playerDetail.registrationTime;
                                                result.lastAccessTime = playerDetail.lastAccessTime;
                                                result.realName = playerDetail.realName;

                                                result.gameDetail = gameDetail.filter(e => String(e._id.playerObjId) === String(playerDetail._id) && e.providerId);
                                                result.consumptionTimes = 0;
                                                result.consumptionAmount = 0;
                                                result.validConsumptionAmount = 0;
                                                result.consumptionBonusAmount = 0;

                                                let providerDetail = {};
                                                let providerNameArr = [];
                                                let providerNames = "";

                                                for (let i = 0, len = result.gameDetail.length; i < len; i++) {
                                                    let gameRecord = result.gameDetail[i];
                                                    let providerId = gameRecord.providerId._id.toString();

                                                    if (providerNameArr.findIndex(p => p === providerId) === -1) {
                                                        providerNameArr.push(providerId);

                                                        if (len > i + 1) {
                                                            providerNames += gameRecord.providerId.name + '\n';
                                                        } else {
                                                            providerNames += gameRecord.providerId.name;
                                                        }
                                                    }

                                                    result.gameDetail[i].bonusRatio = (result.gameDetail[i].bonusAmount / result.gameDetail[i].validAmount);

                                                    if (!providerDetail.hasOwnProperty(providerId)) {
                                                        providerDetail[providerId] = {
                                                            count: 0,
                                                            amount: 0,
                                                            validAmount: 0,
                                                            bonusAmount: 0
                                                        };
                                                    }

                                                    providerDetail[providerId].count += gameRecord.count;
                                                    providerDetail[providerId].amount += gameRecord.amount;
                                                    providerDetail[providerId].validAmount += gameRecord.validAmount;
                                                    providerDetail[providerId].bonusAmount += gameRecord.bonusAmount;
                                                    providerDetail[providerId].bonusRatio = (providerDetail[providerId].bonusAmount / providerDetail[providerId].validAmount);
                                                    result.consumptionTimes += gameRecord.count;
                                                    result.consumptionAmount += gameRecord.amount;
                                                    result.validConsumptionAmount += gameRecord.validAmount;
                                                    result.consumptionBonusAmount += gameRecord.bonusAmount;
                                                }

                                                result.consumptionBonusRatio = (result.consumptionBonusAmount / result.consumptionBonusRatio);
                                                result.providerDetail = providerDetail;
                                                result.providerNames = providerNames;

                                                // topup and bonus related
                                                result.topUpAmount = 0;
                                                result.topUpTimes = 0;

                                                let selftopUpAndBonusDetail = topUpAndBonusDetail.filter(e => String(e._id.playerObjId) === String(playerDetail._id));
                                                let bonusDetail = {};

                                                if (selftopUpAndBonusDetail && selftopUpAndBonusDetail.length) {
                                                    selftopUpAndBonusDetail.forEach(e => {
                                                        if (e._id.mainType === 'TopUp') {
                                                            result.topUpAmount += e.amount;
                                                            result.topUpTimes += e.count;
                                                        } else if (e._id.mainType === 'PlayerBonus') {
                                                            bonusDetail.amount = e.amount ? e.amount : 0;
                                                            bonusDetail.count = e.count ? e.count : 0;
                                                        }
                                                    })
                                                }
                                                result.bonusAmount = bonusDetail && bonusDetail.amount ? bonusDetail.amount : 0;
                                                result.bonusTimes = bonusDetail && bonusDetail.count ? bonusDetail.count : 0;

                                                if ((query.topUpTimesValue || Number(query.topUpTimesValue) === 0) && query.topUpTimesOperator && query.topUpTimesValue !== null) {
                                                    let isRelevant = false;

                                                    switch (query.topUpTimesOperator) {
                                                        case '>=':
                                                            isRelevant = result.topUpTimes >= query.topUpTimesValue;
                                                            break;
                                                        case '=':
                                                            isRelevant = result.topUpTimes === Number(query.topUpTimesValue);
                                                            break;
                                                        case '<=':
                                                            isRelevant = result.topUpTimes >= query.topUpTimesValue;
                                                            break;
                                                        case 'range':
                                                            if (query.topUpTimesValueTwo) {
                                                                isRelevant = result.topUpTimes >= query.topUpTimesValue && result.topUpTimes <= query.topUpTimesValueTwo;
                                                            }
                                                            break;
                                                    }

                                                    if (!isRelevant) {
                                                        return "";
                                                    }
                                                }

                                                // reward related
                                                result.rewardAmount = 0;
                                                result.consumptionReturnAmount = 0;

                                                let selfRewardDetail = rewardDetail.filter(e => String(e._id.playerObjId) === String(playerDetail._id));

                                                if (selfRewardDetail && selfRewardDetail.length) {
                                                    selfRewardDetail.forEach(e => {
                                                        if (e._id.type.toString() === consumptionReturnTypeId) {
                                                            result.consumptionReturnAmount = Number(e.amount) || 0;
                                                        } else {
                                                            result.rewardAmount += Number(e.amount) || 0;
                                                        }
                                                    })
                                                }


                                                // referral reward related
                                                let selfReferralRewardDetail = referralRewardDetails.filter(e => String(e.playerObjId) === String(playerDetail._id))[0];

                                                if (selfReferralRewardDetail) {
                                                    result.referralRewardAmount = Number(selfReferralRewardDetail.rewardAmount) || 0;
                                                }

                                                retArr.push(result);
                                            })

                                            if (sortCol && Object.keys(sortCol)) {
                                                let sortVal = -1;
                                                let sortKey = "registrationTime";
                                                Object.keys(sortCol).forEach(item => {
                                                    if (item) {
                                                        sortKey = item;
                                                        sortVal = sortCol[item];
                                                    }
                                                })

                                                retArr = retArr.sort((a, b) => {
                                                    return (a[sortKey] - b[sortKey]) * sortVal;
                                                })
                                            }

                                            return {
                                                data: retArr.slice(index, index + limit),
                                                size: retArr.length
                                            };

                                            return retArr;

                                        }
                                    }
                                );
                            } else {
                                return {
                                    data: [],
                                    size: 0
                                };
                            }
                        }
                    )
                } else {
                    return Promise.reject({name: "DataError", message: "Referrer is not found"});
                }
            }
        )
    },
};

function convertStringNumber(Arr) {
    let Arrs = JSON.parse(JSON.stringify(Arr));
    let result = []
    Arrs.forEach(item => {
        result.push(String(item));
    })
    Arrs.forEach(item => {
        result.push(Number(item));
    })
    return result;
}

function paymentMonitorResult(paymentMonitorRecord, curPlatformObjId, paymentMonitorCount, filteredProposal) {
    if(paymentMonitorRecord && paymentMonitorRecord.length > 0 && curPlatformObjId){
        return dbconfig.collection_platform.findOne({_id: curPlatformObjId}).then(
            platformDetail => {

                if(platformDetail){
                    paymentMonitorRecord.forEach(
                        followUpData => {
                            filteredProposal.push(dbProposal.getTotalSuccessNoAfterFollowUp(followUpData));
                        }
                    )
                }

                return Promise.all(filteredProposal).then(
                    data => {
                        let temp = data ? data : [];
                        let result = {data: temp, size: paymentMonitorCount};
                        return result;
                    }
                );
            }
        );
    } else {
        let result = {data: paymentMonitorRecord, size: paymentMonitorCount};
        return result;
    }
}

module.exports = dbReport;