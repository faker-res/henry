const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;

const dbPropUtil = require('./../db_common/dbProposalUtility');

let dbReport = {
    getPlayerAlipayAccReport: function (platformObjId, startTime, endTime, playerName, alipayAcc, alipayName, alipayNickname) {
        let query = {
            'data.platformId': platformObjId,
            createTime: {$gte: startTime, $lt: endTime}
        };

        if (playerName) { query['data.playerName'] = playerName }
        if (alipayAcc) {
            let subAcc = alipayAcc.substring(0, 3);
            let domainAcc = alipayAcc.split('@')[1];
            query['data.alipayerAccount'] = subAcc + '***@' + domainAcc;
        }
        if (alipayName) {
            // Ignore first char
            let subName = alipayName.substring(1);
            query['data.alipayer'] = '*' + subName;
        }
        if (alipayNickname) { query['data.alipayerNickName'] = alipayNickname }

        return dbPropUtil.getProposalDataOfType(platformObjId, constProposalType.PLAYER_ALIPAY_TOP_UP, query);
    },
};

module.exports = dbReport;