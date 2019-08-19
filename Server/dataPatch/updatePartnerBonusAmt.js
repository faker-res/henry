const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var i = 0;

dbconfig.collection_platform.find({}, {_id: 1}).lean().cursor().eachAsync(
    async (platform) => {
        if (!platform) {
            return Promise.reject("Cannot find platform")
        }

        let partnerProposalType = await dbconfig.collection_proposalType.findOne({
            platformId: platform._id,
            name: constProposalType.PARTNER_BONUS
        }, {_id: 1}).lean();

        if (!partnerProposalType) {
            return Promise.reject({name: "DataError", message: "Cannot find proposal type"});
        }

        dbconfig.collection_partner.find({platform: platform._id}).cursor().eachAsync(
            partner => {

                dbconfig.collection_proposal.aggregate([
                    {
                        $match: {
                            type: partnerProposalType._id,
                            status: {$in: [constProposalStatus.APPROVED, constProposalStatus.SUCCESS]},
                            'data.partnerObjId': {$in: [ObjectId(partner._id), String(partner._id)]},
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            amount: {$sum: "$data.amount"}
                        }
                    }
                ]).read("secondaryPreferred").then(result => {
                    if (result && result[0] && result[0] && result[0].amount) {
                        return result[0].amount;
                    } else {
                        return 0;
                    }
                }).then(
                    bonusAmt => {
                        bonusAmt = bonusAmt || 0;
                        console.log('update partner totalWithdrawalAmt', i, partner.partnerName);
                        i++;
                        dbconfig.collection_partner.update({
                            _id: partner._id,
                            platform: partner.platform
                        }, {totalWithdrawalAmt: bonusAmt}).catch(err => {
                            console.error(err)
                        });
                    }
                ).catch(err => {
                    console.error(err)
                });

            })
    })
