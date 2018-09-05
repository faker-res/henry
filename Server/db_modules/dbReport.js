const dbconfig = require('./../modules/dbproperties');
const errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;

let dbReport = {
    getPlayerAlipayAccReport: function (platformObjId, startTime, endTime) {
        return dbconfig.collection_proposal.find({
            'data.platformId': platformObjId,
            createTime: {$gte: startTime, $lt: endTime}
        }).lean();
    },
};

module.exports = dbReport;