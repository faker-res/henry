const dbconfig = require("../modules/dbproperties");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

var i = 0;

dbconfig.collection_platform.find({}, {_id: 1}).lean().cursor().eachAsync(
    async (platform) => {
        if (!platform) {
            return Promise.reject("Cannot find platform")
        }

        dbconfig.collection_partner.find({platform: platform._id, ownDomain: {$exists: true,  $not: {$size: 0}}}, {partnerName: 1, ownDomain: 1}).cursor().eachAsync(
            partner => {
                console.log('update partner own domain', i, partner.partnerName);
                i++;
                dbconfig.collection_partnerOwnDomain.update({
                    name: {$in: partner.ownDomain}
                    },
                    {
                        partnerName: partner.partnerName
                    }, {multi: true}).catch(err => {
                    console.error(err)
                });

            })
    })
