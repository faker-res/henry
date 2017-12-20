let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');

let dbPromoCode = {
    isPromoCodeValid: function (playerId, promoCode, amount) {
        return dbconfig.collection_players.findOne({playerId: playerId}, {platform: 1}).lean().then(playerData => {
            if (playerData) {
                let playerObjId = playerData._id;
                let platformObjId = playerData.platform;

                let promoCodeQuery = {
                    playerObjId: playerObjId,
                    platformObjId: platformObjId,
                    code: promoCode,
                    expirationTime: {$gt: new Date()},
                    isActive: {$ne: true},
                    status: constPromoCodeStatus.AVAILABLE
                };

                // if (amount && typeof amount === "number") {
                //     promoCodeQuery.minTopUpAmount = {$lte: amount};
                // }

                return dbconfig.collection_promoCode.findOne(promoCodeQuery).lean();
            }
        }).then(promoCodeData => {

            if (amount && typeof amount === "number" && promoCodeData && promoCodeData.minTopUpAmount && amount < promoCodeData.minTopUpAmount) {
                return Promise.reject({
                    status: constServerCode.FAILED_PROMO_CODE_MIN_TOP_UP,
                    errorMessage: "Top up does not meet Promo Code minimum required amount"
                });
            }

            return Boolean(promoCodeData && promoCodeData._id);
        }).catch(err => {
            errorUtils.reportError(err);
            return false;
        });
    },
};

module.exports = dbPromoCode;