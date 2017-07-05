const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const rsaCrypto = require("../modules/rsaCrypto");

dbconfig.collection_platform.findOne({name: "MsGreen"}).lean().then(
    platformData => {
        if (platformData) {
            const cursor = dbconfig.collection_partner.find({platform: platformData._id}).cursor();
            var i = 0;
            cursor.eachAsync(
                partnerData => {
                    if (partnerData && partnerData.phoneNumber && partnerData.phoneNumber.length > 20) {
                        //encrypt player phone number
                        let enPhoneNumber = rsaCrypto.decrypt(partnerData.phoneNumber);
                        dbconfig.collection_partner.findOneAndUpdate(
                            {_id: partnerData._id, platform: partnerData.platform},
                            {phoneNumber: enPhoneNumber}
                        ).then();
                        console.log("index", i);
                        i++;
                    }
                }
            );
        }
    }
);

