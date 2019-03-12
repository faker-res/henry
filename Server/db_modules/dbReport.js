const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const constPlayerTopUpType = require('../const/constPlayerTopUpType');
let dbProposal = require('./../db_modules/dbProposal');
const ObjectId = mongoose.Types.ObjectId;

const dbPropUtil = require('./../db_common/dbProposalUtility');

let dbReport = {
    getPlayerAlipayAccReport: function (platformObjId, startTime, endTime, playerName, alipayAcc, alipayName, alipayNickname, alipayRemark) {
        let query = {
            'data.platformId': platformObjId,
            createTime: {$gte: startTime, $lt: endTime},
            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]}
        };
        let retFields = {
            proposalId: 1, 'data.playerName': 1, 'data.amount': 1, createTime: 1, 'data.remark': 1,
            'data.alipayerAccount': 1, 'data.alipayer': 1, 'data.alipayerNickName': 1, 'data.alipayRemark': 1
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

        return dbPropUtil.getProposalDataOfType(platformObjId, constProposalType.PLAYER_ALIPAY_TOP_UP, query, retFields);
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