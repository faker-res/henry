const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const rsaCrypto = require("../modules/rsaCrypto");

dbconfig.collection_platform.findOne({name: "BYL"}).lean().then(
    platformData => {
        if (platformData) {
            console.log('start re-encrypt', platformData.name);
            const cursor = dbconfig.collection_players.find({platform: platformData._id}).cursor();
            var i = 0;
            cursor.eachAsync(
                playerData => {
                    if (playerData && playerData.phoneNumber && playerData.phoneNumber.length > 20) {
                        //encrypt player phone number
                        let decPhoneNumber = rsaCrypto.decrypt(playerData.phoneNumber);
                        console.log('ori hex', playerData.phoneNumber);
                        console.log('decPhoneNumber', decPhoneNumber);
                        let reEncPhoneNumber = rsaCrypto.encrypt(decPhoneNumber);
                        console.log('reEncPhoneNumber', reEncPhoneNumber);
                        dbconfig.collection_players.findOneAndUpdate(
                            {_id: playerData._id, platform: playerData.platform},
                            {phoneNumber: reEncPhoneNumber}
                        ).then();
                        console.log("index", i);
                        i++;
                    }
                }
            );
        }
    }
);

