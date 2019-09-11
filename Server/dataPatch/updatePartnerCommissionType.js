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
        dbconfig.collection_partner.find({platform: platform._id, parent: null}, {platform: 1, partnerName: 1, commissionType: 1}).cursor().eachAsync(
            partner => {
                if (partner && partner._id) {
                    console.log('update partner commission index', i, partner.partnerName);
                    i++;
                    let commissionType;
                    if (partner.commissionType) {
                        let newCommissionType = [constPartnerCommissionType.WEEKLY_BONUS_AMOUNT, constPartnerCommissionType.MONTHLY_BONUS_AMOUNT,
                                                constPartnerCommissionType.DAILY_CONSUMPTION]
                        if (newCommissionType.includes(Number(partner.commissionType))) {
                            commissionType = Number(partner.commissionType);
                        } else {
                            commissionType = constPartnerCommissionType.WEEKLY_BONUS_AMOUNT;
                        }
                    } else {
                        commissionType = constPartnerCommissionType.WEEKLY_BONUS_AMOUNT;
                    }
                    dbconfig.collection_partner.update({_id: partner._id, platform: partner.platform}, {commissionType: commissionType}).catch(err => {
                        console.error(err)
                    });
                    dbPartnerCommissionConfig.updateMainPartnerCommissionData(partner.parent, partner._id, platform._id, commissionType);
                }

            }
        );
    })