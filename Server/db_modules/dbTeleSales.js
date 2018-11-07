let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;

let dbTeleSales = {
    getAllTSPhoneList: function (platformObjId) {
        return dbconfig.collection_tsPhoneList.find({platform: platformObjId}).lean();
    },

    getOneTsNewList: function (query) {
        return dbconfig.collection_tsPhoneList.findOne(query).lean();
    },
};

module.exports = dbTeleSales;