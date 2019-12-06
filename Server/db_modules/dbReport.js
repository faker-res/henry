const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const dbutility = require('../modules/dbutility');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const constPlayerTopUpType = require('../const/constPlayerTopUpType');
const constCreditChangeType = require('../const/constCreditChangeType');
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

                    return dbconfig.collection_referralLog.aggregate([
                        {
                            $match: referralQuery
                        },
                        {
                            $group: {
                                _id: '$playerObjId',
                                createTime: {$last: '$createTime'},
                                referralPeriod: {$last: '$referralPeriod'},
                                platform: {$last: '$platform'},
                                isValid: {$last: '$isValid'},
                                validEndTime: {$last: '$validEndTime'},
                                referral: {$last: '$referral'},
                            }
                        },
                        {
                            $project: {
                                playerObjId: '$_id',
                                createTime: '$createTime',
                                referralPeriod: '$referralPeriod',
                                platform: '$platform',
                                isValid: '$isValid',
                                validEndTime: '$validEndTime',
                                referral: '$referral'
                            }
                        }
                    ]).read("secondaryPreferred").then(
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

    getPlatformOverviewReport: async (query) => {
        let platformListQuery;
        let loginDeviceQuery;
        let result = [];

        if (query && query.platformList && query.platformList.length > 0)
            platformListQuery = {$in: query.platformList.map(item => { return ObjectId(item)} )};

        if (query && query.loginDevice && query.loginDevice.length > 0)
            loginDeviceQuery = {$in: query.loginDevice};

        let platformQuery = platformListQuery ? {_id: platformListQuery} : {};
        let platformData = await dbconfig.collection_platform.find(platformQuery).lean();

        if (platformData && platformData.length > 0)
            platformData.sort(dbutility.sortPlatform);

        let configQuery = platformListQuery ? {platform: platformListQuery} : {};
        let partnerLevelConfigData = await dbconfig.collection_partnerLevelConfig.find(configQuery).lean();

        // player login count
        let loginCountQuery = {
            loginTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
            isRealPlayer: true
        };
        if (platformListQuery)
            loginCountQuery.platform = platformListQuery;

        if (loginDeviceQuery)
            loginCountQuery.loginDevice = loginDeviceQuery;


        let playerLoginCountData = await dbconfig.collection_playerLoginRecord.aggregate(
            [{
                $match: loginCountQuery
            }, {
                $group: {
                    _id: {platform: '$platform', player: '$player'}
                }
            }, {
                    $group: {
                        _id: '$_id.platform',
                        count: {$sum: 1}
                    }
                }]
        ).read("secondaryPreferred");


        // player consumption count
        let consumptionCountQuery = {
            createTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
            isDuplicate : {$ne: true}
        };
        if (platformListQuery)
            consumptionCountQuery.platformId = platformListQuery;
        if (loginDeviceQuery)
            consumptionCountQuery.loginDevice = loginDeviceQuery;

        let playerConsumptionCountData = await dbconfig.collection_playerConsumptionRecord.aggregate(
            [{
                $match: consumptionCountQuery
            }, {
                $group: {
                    _id: {platform: '$platformId', player: '$playerId'}
                }
            }, {
                $group: {
                    _id: '$_id.platform',
                    count: {$sum: 1}
                }
            }]
        ).read("secondaryPreferred");


        // player topup count
        let topUpCountQuery = {
            createTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
            mainType : 'TopUp',
            status : constProposalStatus.SUCCESS
        };

        if (platformListQuery)
            topUpCountQuery['data.platformId'] = platformListQuery;
        if (loginDeviceQuery)
            topUpCountQuery.device = loginDeviceQuery;

        let playerTopUpCountData = await dbconfig.collection_proposal.aggregate(
            {
                $match: topUpCountQuery
            }, {
                $group: {
                    _id: '$data.platformId',
                    userIds: {$addToSet: '$data.playerObjId'},
                    amount: {$sum: '$data.amount'},
                    topUpCount: {$sum: 1},
                }
            }
        ).read("secondaryPreferred").then(
            data => {
                if (data && data.length > 0) {
                    return data.map(item => {
                        item.playerCount = 0;
                        if (item && item.userIds.length > 0) {
                            item.playerCount = item.userIds.length;
                        }

                        return item;
                    })
                }

                return data;
            }
        );


        // player bonus count
        let bonusCountQuery = {
            createTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
            mainType : 'PlayerBonus',
            status : constProposalStatus.SUCCESS
        };
        if (platformListQuery)
            bonusCountQuery['data.platformId'] = platformListQuery;

        if (loginDeviceQuery)
            bonusCountQuery.device = loginDeviceQuery;

        let playerBonusCountData = await dbconfig.collection_proposal.aggregate(
            {
                $match: bonusCountQuery
            }, {
                $group: {
                    _id: '$data.platformId',
                    userIds: {$addToSet: '$data.playerObjId'},
                    amount: {$sum: '$data.amount'}
                }
            }
        ).read("secondaryPreferred").then(
            data => {
                if (data && data.length > 0) {
                    return data.map(item => {
                        item.playerCount = 0;
                        if (item && item.userIds.length > 0) {
                            item.playerCount = item.userIds.length;
                        }

                        return item;
                    })
                }

                return data;
            }
        );


        // topup percentage
        let countTopUpPercentage = [];
        if (playerTopUpCountData && playerTopUpCountData.length > 0 && playerLoginCountData && playerLoginCountData.length > 0) {
            playerTopUpCountData.forEach(topUpCount => {
                if (topUpCount && topUpCount._id) {
                    let indexNo = playerLoginCountData.findIndex(x => x && x._id && (String(x._id) === String(topUpCount._id)));

                    if (indexNo > -1) {
                        let loginCount = playerLoginCountData[indexNo];
                        let countTopUpRatio = (topUpCount.playerCount / loginCount.count) * 100;
                        countTopUpPercentage.push({_id: topUpCount._id, topUpRatio: countTopUpRatio});
                    }
                }
            });
        }


        // registration analysis
        // new player count
        let newPlayerCountQuery = {
            isRealPlayer: true,
            registrationTime: {$gte: new Date(query.startTime), $lt: new Date(query.endTime)}
        };

        if (platformListQuery)
            newPlayerCountQuery.platform = platformListQuery;

        let newPlayerCountData = await dbconfig.collection_players.aggregate(
            [{
                $match: newPlayerCountQuery
            }, {
                $group: {
                    _id: '$platform',
                    count: {$sum: 1}
                }
            }]).read("secondaryPreferred");


        // new player - is player topup count
        let newPlayerTopUpCountQuery = Object.assign({}, newPlayerCountQuery);
        newPlayerTopUpCountQuery.topUpTimes = {$gt: 0};

        let newPlayerTopUpCountData = await dbconfig.collection_players.aggregate(
            [{
                $match: newPlayerTopUpCountQuery
            }, {
                $group: {
                    _id: '$platform',
                    count: {$sum: 1}
                }
            }]).read("secondaryPreferred");


        // new player - is player multiple times topup count
        let nTimesTopUpCountQuery = Object.assign({}, newPlayerCountQuery);
        nTimesTopUpCountQuery.topUpTimes = {$gt: 1};

        let nTimesTopUpCountData = await dbconfig.collection_players.aggregate(
            [{
                $match: nTimesTopUpCountQuery
            }, {
                $group: {
                    _id: '$platform',
                    count: {$sum: 1}
                }
            }]).read("secondaryPreferred");


        // new player - valid player
        let newPlayerValidPlayerCountData = [];
        if (partnerLevelConfigData && partnerLevelConfigData.length > 0) {
            let playerRegValidPlayerProm = [];
            partnerLevelConfigData.forEach(config => {
                if (config && config.hasOwnProperty("validPlayerTopUpAmount") &&
                    config.hasOwnProperty("validPlayerConsumptionTimes") &&
                    config.hasOwnProperty("validPlayerTopUpTimes") &&
                    config.hasOwnProperty("validPlayerConsumptionAmount")
                ) {

                    let queryObj = {
                        platform: config.platform,
                        registrationTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
                        isRealPlayer: true,
                    };

                    queryObj.topUpSum = {$gte: config.validPlayerTopUpAmount};
                    queryObj.consumptionTimes = {$gte: config.validPlayerConsumptionTimes};
                    queryObj.consumptionSum = {$gte: config.validPlayerConsumptionAmount};
                    queryObj.topUpTimes = {$gte: config.validPlayerTopUpTimes}

                    playerRegValidPlayerProm.push(dbconfig.collection_players.find(queryObj).count().then(
                        data => {
                            return {_id: config.platform, count: data || 0};
                        }
                    ));
                }
            });

            newPlayerValidPlayerCountData = await Promise.all(playerRegValidPlayerProm);
        }


        let manualTopUpData = await getTopUpData(constProposalType.PLAYER_MANUAL_TOP_UP, query, platformListQuery, loginDeviceQuery);
        let onlineTopUpData = await getTopUpData(constProposalType.PLAYER_TOP_UP, query, platformListQuery, loginDeviceQuery);
        let alipayTopUpData = await getTopUpData(constProposalType.PLAYER_ALIPAY_TOP_UP, query, platformListQuery, loginDeviceQuery);
        let wechatTopUpData = await getTopUpData(constProposalType.PLAYER_WECHAT_TOP_UP, query, platformListQuery, loginDeviceQuery);


        //UpdatePlayerCredit
        let playerCreditPropTypeQuery = {
            name: constProposalType.UPDATE_PLAYER_CREDIT
        };
        if (platformListQuery) {
            playerCreditPropTypeQuery.platformId = platformListQuery;
        }
        let playerCreditPropTypeData = await dbconfig.collection_proposalType.find(playerCreditPropTypeQuery)
        let playerCreditQuery = {
            createTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
            mainType : 'Others',
            status : constProposalStatus.APPROVED,
            type: {$in: playerCreditPropTypeData.map(item => item && item._id)}
        }

        if (platformListQuery)
            playerCreditQuery['data.platformId'] = platformListQuery;

        if (loginDeviceQuery)
            playerCreditQuery.device = loginDeviceQuery;

        // UpdatePlayerCredit - get total by type
        let updatePlayerCreditTypeData = await dbconfig.collection_proposal.aggregate(
            {
                $match: playerCreditQuery
            }, {
                $group: {
                    _id: {platform: '$data.platformId', creditChangeType: '$data.creditChangeType'},
                    amount: {$sum: '$data.updateAmount'},
                }
            }
        ).read("secondaryPreferred");


        if (platformData && platformData.length > 0) {
            platformData.forEach(platform => {
                if (platform && platform._id) {
                    let details = {
                        platformObjId: platform._id,
                        platformName: platform.name
                    };

                    let loginIndex = playerLoginCountData.findIndex(login => login && login._id && (String(login._id) === String(platform._id)));
                    if (loginIndex > -1) {
                        details.loginPlayerCount = playerLoginCountData[loginIndex].count;
                    }

                    let consumptionIndex = playerConsumptionCountData.findIndex(consumption => consumption && consumption._id && (String(consumption._id) === String(platform._id)));
                    if (consumptionIndex > -1) {
                        details.consumptionPlayerCount = playerConsumptionCountData[consumptionIndex].count;
                    }

                    let topupIndex = playerTopUpCountData.findIndex(topUp => topUp && topUp._id && (String(topUp._id) === String(platform._id)));
                    if (topupIndex > -1) {
                        details.topUpPlayerCount = playerTopUpCountData[topupIndex].playerCount;
                        details.topUpCount = playerTopUpCountData[topupIndex].topUpCount;
                        details.topUpAmount = playerTopUpCountData[topupIndex].amount;
                    }

                    let bonusIndex = playerBonusCountData.findIndex(bonus => bonus && bonus._id && (String(bonus._id) === String(platform._id)));
                    if (bonusIndex > -1) {
                        details.bonusPlayerCount = playerBonusCountData[bonusIndex].playerCount;
                        details.bonusAmount = playerBonusCountData[bonusIndex].amount;
                    }

                    let topUpRatioIndex = countTopUpPercentage.findIndex(ratio => ratio && ratio._id && (String(ratio._id) === String(platform._id)));
                    if (topUpRatioIndex > -1) {
                        details.topUpRatio = dbutility.noRoundTwoDecimalPlaces(countTopUpPercentage[topUpRatioIndex].topUpRatio);
                    }

                    // player registration
                    let newPlayerIndex = newPlayerCountData.findIndex(newPlayer => newPlayer && newPlayer._id && (String(newPlayer._id) === String(platform._id)));
                    if (newPlayerIndex > -1) {
                        details.newPlayerCount = newPlayerCountData[newPlayerIndex].count;
                    }

                    let newPlayerTopUpIndex = newPlayerTopUpCountData.findIndex(newPlayerTopUp => newPlayerTopUp && newPlayerTopUp._id && (String(newPlayerTopUp._id) === String(platform._id)));
                    if (newPlayerTopUpIndex > -1) {
                        details.newPlayerTopUpCount = newPlayerTopUpCountData[newPlayerTopUpIndex].count;
                    }

                    let newPlayerNTimesTopUpIndex = nTimesTopUpCountData.findIndex(multipleTimesTopUp => multipleTimesTopUp && multipleTimesTopUp._id && (String(multipleTimesTopUp._id) === String(platform._id)));
                    if (newPlayerNTimesTopUpIndex > -1) {
                        details.newPlayerNTimesTopUpCount = nTimesTopUpCountData[newPlayerNTimesTopUpIndex].count;
                    }

                    let validPlayerIndex = newPlayerValidPlayerCountData.findIndex(validPlayer => validPlayer && validPlayer._id && (String(validPlayer._id) === String(platform._id)));
                    if (validPlayerIndex > -1) {
                        details.newPlayerValidPlayer = newPlayerValidPlayerCountData[validPlayerIndex].count;
                    }

                    let manualTopUpIndex = manualTopUpData.findIndex(manual => manual && manual._id && (String(manual._id) === String(platform._id)));
                    if (manualTopUpIndex > -1) {
                        details.manualTopUpPlayerCount = manualTopUpData[manualTopUpIndex].playerCount;
                        details.manualTopUpCount = manualTopUpData[manualTopUpIndex].topUpCount;
                        details.manualTopUpAmount = manualTopUpData[manualTopUpIndex].amount;
                    }

                    let onlineTopUpIndex = onlineTopUpData.findIndex(online => online && online._id && (String(online._id) === String(platform._id)));
                    if (onlineTopUpIndex > -1) {
                        details.onlineTopUpPlayerCount = onlineTopUpData[onlineTopUpIndex].playerCount;
                        details.onlineTopUpCount = onlineTopUpData[onlineTopUpIndex].topUpCount;
                        details.onlineTopUpAmount = onlineTopUpData[onlineTopUpIndex].amount;
                    }

                    let alipayTopUpIndex = alipayTopUpData.findIndex(alipay => alipay && alipay._id && (String(alipay._id) === String(platform._id)));
                    if (alipayTopUpIndex > -1) {
                        details.alipayTopUpPlayerCount = alipayTopUpData[alipayTopUpIndex].playerCount;
                        details.alipayTopUpCount = alipayTopUpData[alipayTopUpIndex].topUpCount;
                        details.alipayTopUpAmount = alipayTopUpData[alipayTopUpIndex].amount;
                    }

                    let wechatTopUpIndex = wechatTopUpData.findIndex(wechat => wechat && wechat._id && (String(wechat._id) === String(platform._id)));
                    if (wechatTopUpIndex > -1) {
                        details.wechatTopUpPlayerCount = wechatTopUpData[wechatTopUpIndex].playerCount;
                        details.wechatTopUpCount = wechatTopUpData[wechatTopUpIndex].topUpCount;
                        details.wechatTopUpAmount = wechatTopUpData[wechatTopUpIndex].amount;
                    }

                    let abnormalDeductionCreditIndex = updatePlayerCreditTypeData.findIndex(credit => credit && credit._id && credit._id.platform
                        && (String(credit._id.platform) === String(platform._id)) && (credit._id.creditChangeType === constCreditChangeType.ABNORMAL_DEDUCTION));
                    if (abnormalDeductionCreditIndex > -1) {
                        details.abnormalCreditDeduction = updatePlayerCreditTypeData[abnormalDeductionCreditIndex].amount;
                    }

                    let limitDeductionCreditIndex = updatePlayerCreditTypeData.findIndex(credit => credit && credit._id && credit._id.platform
                        && (String(credit._id.platform) === String(platform._id)) && (credit._id.creditChangeType === constCreditChangeType.LIMIT_DEDUCTION));
                    if (limitDeductionCreditIndex > -1) {
                        details.limitCreditDeduction = updatePlayerCreditTypeData[limitDeductionCreditIndex].amount;
                    }

                    let otherDeductionCreditIndex = updatePlayerCreditTypeData.findIndex(credit => credit && credit._id && credit._id.platform
                        && (String(credit._id.platform) === String(platform._id)) && (credit._id.creditChangeType === constCreditChangeType.OTHER_DEDUCTION));
                    if (otherDeductionCreditIndex > -1) {
                        details.otherCreditDeduction = updatePlayerCreditTypeData[otherDeductionCreditIndex].amount;
                    }

                    let additionCreditIndex = updatePlayerCreditTypeData.findIndex(credit => credit && credit._id && credit._id.platform
                        && (String(credit._id.platform) === String(platform._id)) && (credit._id.creditChangeType === constCreditChangeType.ADDITION));
                    if (additionCreditIndex > -1) {
                        details.additionCredit = updatePlayerCreditTypeData[additionCreditIndex].amount;
                    }

                    let abnormalCreditDeduction = details && details.abnormalCreditDeduction < 0 ? (details.abnormalCreditDeduction * -1) : 0;
                    let limitCreditDeduction = details && details.limitCreditDeduction < 0 ? (details.limitCreditDeduction * -1) : 0;
                    let otherCreditDeduction = details && details.otherCreditDeduction < 0 ? (details.otherCreditDeduction * -1) : 0;
                    let totalDeduction = (abnormalCreditDeduction + limitCreditDeduction + otherCreditDeduction);
                    details.deductionCredit = totalDeduction > 0 ? (totalDeduction * -1) : 0;

                    let totalTopUp = (details && details.topUpAmount) || 0;
                    let totalBonus = (details && details.bonusAmount) || 0;
                    details.totalIncome = dbutility.noRoundTwoDecimalPlaces(totalTopUp - totalBonus);

                    result.push(details);
                }
            });
        };

        let sumTotal = {
            loginPlayerCount : result.reduce( (a,b) => a + (b.loginPlayerCount ? b.loginPlayerCount : 0), 0),
            consumptionPlayerCount : result.reduce( (a,b) => a + (b.consumptionPlayerCount ? b.consumptionPlayerCount : 0), 0),
            topUpPlayerCount : result.reduce( (a,b) => a + (b.topUpPlayerCount ? b.topUpPlayerCount : 0), 0),
            topUpCount : result.reduce( (a,b) => a + (b.topUpCount ? b.topUpCount : 0), 0),
            topUpAmount : result.reduce( (a,b) => a + (b.topUpAmount ? b.topUpAmount : 0), 0),
            bonusPlayerCount : result.reduce( (a,b) => a + (b.bonusPlayerCount ? b.bonusPlayerCount : 0), 0),
            bonusAmount : result.reduce( (a,b) => a + (b.bonusAmount ? b.bonusAmount : 0), 0),
            newPlayerCount : result.reduce( (a,b) => a + (b.newPlayerCount ? b.newPlayerCount : 0), 0),
            newPlayerTopUpCount : result.reduce( (a,b) => a + (b.newPlayerTopUpCount ? b.newPlayerTopUpCount : 0), 0),
            newPlayerNTimesTopUpCount : result.reduce( (a,b) => a + (b.newPlayerNTimesTopUpCount ? b.newPlayerNTimesTopUpCount : 0), 0),
            newPlayerValidPlayer : result.reduce( (a,b) => a + (b.newPlayerValidPlayer ? b.newPlayerValidPlayer : 0), 0),
            manualTopUpPlayerCount : result.reduce( (a,b) => a + (b.manualTopUpPlayerCount ? b.manualTopUpPlayerCount : 0), 0),
            manualTopUpCount : result.reduce( (a,b) => a + (b.manualTopUpCount ? b.manualTopUpCount : 0), 0),
            manualTopUpAmount : result.reduce( (a,b) => a + (b.manualTopUpAmount ? b.manualTopUpAmount : 0), 0),
            onlineTopUpPlayerCount : result.reduce( (a,b) => a + (b.onlineTopUpPlayerCount ? b.onlineTopUpPlayerCount : 0), 0),
            onlineTopUpCount : result.reduce( (a,b) => a + (b.onlineTopUpCount ? b.onlineTopUpCount : 0), 0),
            onlineTopUpAmount : result.reduce( (a,b) => a + (b.onlineTopUpAmount ? b.onlineTopUpAmount : 0), 0),
            alipayTopUpPlayerCount : result.reduce( (a,b) => a + (b.alipayTopUpPlayerCount ? b.alipayTopUpPlayerCount : 0), 0),
            alipayTopUpCount : result.reduce( (a,b) => a + (b.alipayTopUpCount ? b.alipayTopUpCount : 0), 0),
            alipayTopUpAmount : result.reduce( (a,b) => a + (b.alipayTopUpAmount ? b.alipayTopUpAmount : 0), 0),
            wechatTopUpPlayerCount : result.reduce( (a,b) => a + ( b.wechatTopUpPlayerCount ? b.wechatTopUpPlayerCount : 0), 0),
            wechatTopUpCount : result.reduce( (a,b) => a + (b.wechatTopUpCount ? b.wechatTopUpCount : 0), 0),
            wechatTopUpAmount : result.reduce( (a,b) => a + (b.wechatTopUpAmount ? b.wechatTopUpAmount : 0), 0),
            abnormalCreditDeduction : result.reduce( (a,b) => a + (b.abnormalCreditDeduction ? b.abnormalCreditDeduction : 0), 0),
            limitCreditDeduction : result.reduce( (a,b) => a + (b.limitCreditDeduction ? b.limitCreditDeduction : 0), 0),
            otherCreditDeduction : result.reduce( (a,b) => a + (b.otherCreditDeduction ? b.otherCreditDeduction : 0), 0),
            additionCredit : result.reduce( (a,b) => a + (b.additionCredit ? b.additionCredit : 0), 0),
            totalIncome : result.reduce( (a,b) => a + (b.totalIncome ? b.totalIncome : 0), 0)
        };

        let sumTotalDeductionCredit = result.reduce( (a,b) => a + (b && b.deductionCredit < 0 ? (b.deductionCredit * -1) : 0), 0);
        sumTotal.deductionCredit = sumTotalDeductionCredit > 0 ? (sumTotalDeductionCredit * -1) : 0;
        sumTotal.topUpRatio = dbutility.noRoundTwoDecimalPlaces(((sumTotal.topUpPlayerCount || 0) / (sumTotal.loginPlayerCount || 0)) * 100) || 0;

        return {data: result, summary: sumTotal};


        function getTopUpData(type, query, platformListQuery, loginDeviceQuery) {
            let propTypeName;

            switch (type) {
                case constProposalType.PLAYER_MANUAL_TOP_UP:
                    propTypeName = constProposalType.PLAYER_MANUAL_TOP_UP;
                    break;
                case constProposalType.PLAYER_TOP_UP:
                    propTypeName = constProposalType.PLAYER_TOP_UP;
                    break;
                case constProposalType.PLAYER_ALIPAY_TOP_UP:
                    propTypeName = constProposalType.PLAYER_ALIPAY_TOP_UP;
                    break;
                case constProposalType.PLAYER_WECHAT_TOP_UP:
                    propTypeName = constProposalType.PLAYER_WECHAT_TOP_UP;
                    break;
            }

            let propTypeQuery = {
                name: propTypeName
            };

            if (platformListQuery) {
                propTypeQuery.platformId = platformListQuery;
            }

            return dbconfig.collection_proposalType.find(propTypeQuery).then(
                propTypeData => {
                    if (propTypeData && propTypeData.length > 0) {
                        let topUpQuery = {
                            createTime : {$gte: new Date(query.startTime), $lt: new Date(query.endTime)},
                            mainType : 'TopUp',
                            status : constProposalStatus.SUCCESS,
                            type: {$in: propTypeData.map(item => item && item._id)}
                        };

                        if (platformListQuery)
                            topUpQuery['data.platformId'] = platformListQuery;

                        if (loginDeviceQuery)
                            topUpQuery.device = loginDeviceQuery;

                        let groupObj = {
                            _id: '$data.platformId',
                            userIds: {$addToSet: '$data.playerObjId'},
                            amount: {$sum: '$data.amount'},
                            topUpCount: {$sum: 1},
                        };

                        return dbconfig.collection_proposal.aggregate(
                            {
                                $match: topUpQuery
                            }, {
                                $group: groupObj
                            }
                        ).read("secondaryPreferred").then(
                            data => {
                                if (data && data.length > 0) {
                                    return data.map(item => {
                                        item.playerCount = 0;
                                        if (item && item.userIds.length > 0) {
                                            item.playerCount = item.userIds.length;
                                        }

                                        return item;
                                    })
                                }

                                return data;
                            }
                        );
                    } else {
                        return [];
                    }
                }
            );
        }
    }
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