const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
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
};

module.exports = dbReport;