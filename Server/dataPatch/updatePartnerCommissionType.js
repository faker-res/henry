const dbconfig = require("../modules/dbproperties");
const constPartnerCommissionType = require("../const/constPartnerCommissionType");
const dbPartnerCommissionConfig = require("../db_modules/dbPartnerCommissionConfig");


let nodeVal = process.argv;
let platformId = nodeVal[2];
console.log("platformId ", platformId)

var i = 0;

dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
    platform => {
        if (!platform) {
            return Promise.reject("Cannot find platform")
        }
        console.log("platformObjId ", platform._id)
        dbconfig.collection_partner.find({platform: platform._id, parent: null}).cursor().eachAsync(
            partner => {
                if (partner && partner._id) {
                    console.log('update partner commission index', i, partner.partnerName, partner.commissionType);
                    i++;
                    dbconfig.collection_partner.findOneAndUpdate({_id: partner._id, platform: partner.platform}, {$set: {commissionType: constPartnerCommissionType.WEEKLY_BONUS_AMOUNT}}).lean().then(
                        data => {
                            console.log("data", partner.partnerName, data.commissionType);
                        }
                    ).catch(err => {
                        console.error(err)
                    });
                    dbPartnerCommissionConfig.updateMainPartnerCommissionData(partner.parent, partner._id, platform._id, constPartnerCommissionType.WEEKLY_BONUS_AMOUNT);
                }

            }
        );
    })