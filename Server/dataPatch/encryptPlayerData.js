const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const rsaCrypto = require("../modules/rsaCrypto");

dbconfig.collection_platform.findOne({name: "EU8"}).lean().then(
    platformData => {
        if (platformData) {
            const cursor = dbconfig.collection_players.find({platform: platformData._id}).cursor();
            var i = 0;
            cursor.eachAsync(
                playerData => {
                    if (playerData && playerData.phoneNumber && playerData.phoneNumber.length < 20) {
                        //encrypt player phone number
                        playerData.phoneNumber = rsaCrypto.encrypt(playerData.phoneNumber);
                        playerData.save().then();
                        console.log("index", i);
                        i++;
                    }
                }
            );
        }
    }
);

