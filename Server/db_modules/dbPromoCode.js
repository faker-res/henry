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
                    // code: promoCode,
                    expirationTime: {$gt: new Date()},
                    // isActive: {$ne: true},
                    status: constPromoCodeStatus.AVAILABLE
                };


                return dbconfig.collection_promoCode.find(promoCodeQuery).lean();
            }
        }).then(promoCodeData => {
            if (!promoCodeData || !promoCodeData.length) {
                return Promise.reject({
                    status: constServerCode.DOCUMENT_NOT_FOUND,
                    name: "DataError",
                    errorMessage: "No available promo code at the moment"
                });
            }

            for (let i = 0; i < promoCodeData.length; i++) {
                let promoCodeObj = promoCodeData[i];
                if (promoCodeObj.code.toString() == promoCode) {
                    if (amount && typeof amount === "number") {
                        if (amount >= promoCodeObj.minTopUpAmount || !promoCodeObj.minTopUpAmount) {
                            return true;
                        } else {
                            return Promise.reject({
                                status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                                name: "DataError",
                                errorMessage: "Top up does not meet Promo Code minimum required amount"
                            });
                        }
                    }
                    return true;
                }
            }

            return Promise.reject({
                status: constServerCode.NO_PROMO_CODE_MATCH,
                name: "DataError",
                errorMessage: "Wrong promo code has entered"
            });
        });
    },

    disablePromoCode: function (playerId, promoCode) {
        return dbconfig.collection_players.findOne({playerId: playerId}).lean().then(
            player => {
                if (!player) {
                    return;
                }

                return dbconfig.collection_promoCode.findOne({playerObjId: player._id, code: promoCode}).lean();
            }
        ).then(
            promoCode => {
                if (!promoCode) {
                    return;
                }

                return dbconfig.collection_promoCode.findOneAndUpdate({_id: promoCode._id}, {status: constPromoCodeStatus.DISABLE}, {new: true}).lean();
            }
        );
    },

    disablePromoCodes: function (playerIds, promoCodes) {
        return dbconfig.collection_players.find({playerId: {$in:playerIds}}).lean().then(
            players => {
                if (players && players.length > 0) {
                    let query = [];
                    players.forEach(player => {
                        for(let x = 0; x < playerIds.length; x++) {
                            if (playerIds[x] == player.playerId) {
                                query.push({
                                    playerObjId: player._id,
                                    code: promoCodes[x]
                                })
                            }
                        }
                    });
                    return dbconfig.collection_promoCode.find({$or: query}).lean();
                }
            }
        ).then(
            promoCodes => {
                if (promoCodes && promoCodes.length > 0) {
                    let promoCodeObjIds = [];
                    promoCodes.forEach(promoCode=>{
                        promoCodeObjIds.push(promoCode._id);
                    });
                    return dbconfig.collection_promoCode.update({_id: {$in: promoCodeObjIds}}, {status: constPromoCodeStatus.DISABLE}, {multi: true}).lean();
                }
            }
        );
    },
};

module.exports = dbPromoCode;