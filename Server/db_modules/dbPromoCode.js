let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');

let dbPromoCode = {
    isPromoCodeValid: function (playerId, promoCode) {
        return dbconfig.collection_players.findOne({playerId: playerId}, {platform: 1}).lean().then(playerData => {
            if (playerData) {
                let playerObjId = playerData._id;
                let platformObjId = playerData.platform;

                return dbconfig.collection_promoCode.findOne({
                    playerObjId: playerObjId,
                    platformObjId: platformObjId,
                    code: promoCode,
                    expirationTime: {$gt: new Date()},
                    isActive: {$ne: true},
                    status: constPromoCodeStatus.AVAILABLE
                }).lean();
            }
        }).then(promoCodeData => {
            return Boolean(promoCodeData && promoCodeData._id);
        }).catch(err => {
            errorUtils.reportError(err);
            return false;
        });
    },
};

module.exports = dbPromoCode;