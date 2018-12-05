let dbconfig = require('./../modules/dbproperties');
let errorUtils = require('../modules/errorUtils');
const constPromoCodeStatus = require('../const/constPromoCodeStatus');
const constServerCode = require('../const/constServerCode');
const constProposalType = require("./../const/constProposalType");
const constProposalStatus = require("./../const/constProposalStatus");
const ObjectId = mongoose.Types.ObjectId;

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
            }else{
                return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
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

    isOpenPromoCodeValid: function (playerId, promoCode, amount, lastLoginIp) {
        let promoCodeObj;
        let platformObjId;
        return dbconfig.collection_players.findOne({playerId: playerId}, {platform: 1}).lean().then(playerData => {
            if (playerData) {

                platformObjId = playerData.platform;

                let openPromoCodeQuery = {
                    platformObjId: platformObjId,
                    code: promoCode,
                    expirationTime: {$gt: new Date()},
                    // isActive: {$ne: true},
                    status: constPromoCodeStatus.AVAILABLE
                };

                return dbconfig.collection_openPromoCodeTemplate.find(openPromoCodeQuery).lean();
            }else{
                return Promise.reject({name: "DataError", errorMessage: "Invalid player data"});
            }
        }).then(promoCodeData => {
            if (!promoCodeData || !promoCodeData.length) {
                return Promise.reject({
                    status: constServerCode.DOCUMENT_NOT_FOUND,
                    name: "DataError",
                    errorMessage: "No available promo code at the moment"
                });
            }

            promoCodeObj = promoCodeData[0];

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

            return Promise.reject({
                status: constServerCode.NO_PROMO_CODE_MATCH,
                name: "DataError",
                errorMessage: "Wrong promo code has entered"
            });
        }).then( returnedData => {
            if (returnedData && platformObjId && promoCodeObj){

                return dbconfig.collection_proposalType.findOne({
                    platformId: platformObjId,
                    name: constProposalType.PLAYER_PROMO_CODE_REWARD
                }).lean().then (proposalType => {
                    if(proposalType) {

                        let proposalProm = dbconfig.collection_proposal.find({
                            type: ObjectId(proposalType._id),
                            'data.promoCode': parseInt(promoCode),
                            createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                        }).lean().count();

                        let playerProposalProm = dbconfig.collection_proposal.find({
                            type: ObjectId(proposalType._id),
                            'data.promoCode': parseInt(promoCode),
                            'data.playerId': playerId,
                            createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                            status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                        }).lean().count();

                        let ipProposalProm;
                        if (lastLoginIp){
                            ipProposalProm = dbconfig.collection_proposal.find({
                                type: ObjectId(proposalType._id),
                                'data.promoCode': parseInt(promoCode),
                                'data.lastLoginIp': lastLoginIp,
                                createTime: { $gte: promoCodeObj.createTime, $lt: promoCodeObj.expirationTime},
                                status: {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}
                            }).read("secondaryPreferred").lean().count();
                        }
                        else{
                            ipProposalProm = Promise.resolve(0);
                        }

                        return Promise.all([proposalProm, playerProposalProm, ipProposalProm]);

                    }
                    else{
                        return Promise.reject({name: "DataError", errorMessage: "Proposal Type is not found"});
                    }
                });
            }else{
                return Promise.reject({
                    status: constServerCode.NO_PROMO_CODE_MATCH,
                    name: "DataError",
                    errorMessage: "Wrong promo code has entered"
                });
            }
        }).then(proposalData => {
            if (proposalData && proposalData.length == 3) {

                let totalAppliedNumber = proposalData[0];
                let playerAppliedNumber = proposalData[1];
                let ipAppliedNumber = proposalData[2];
                
                let totalLimit = promoCodeObj.totalApplyLimit || 0;
                let playerLimit = promoCodeObj.applyLimitPerPlayer || 0;
                let ipLimit = promoCodeObj.ipLimit || 0;

                if (totalAppliedNumber >= totalLimit){
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "Exceed the total application limit"
                    })
                }

                if (playerAppliedNumber >= playerLimit){
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "Exceed the total application limit of the player"
                    })
                }

                if (ipAppliedNumber >= ipLimit){
                    return Promise.reject({
                        status: constServerCode.FAILED_PROMO_CODE_CONDITION,
                        name: "ConditionError",
                        message: "Exceed the total application limit from the same IP"
                    })
                }

                return true;

            }
            else{
                return Promise.reject({name: "DataError", errorMessage: "Proposal data is not found"});
            }
        })
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
