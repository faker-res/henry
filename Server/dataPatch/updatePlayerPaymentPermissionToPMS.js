const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const rsaCrypto = require("../modules/rsaCrypto");
const dbPlayerInfo = require("../db_modules/dbPlayerInfo");

let platformId = "6";

dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
    platformData => {
        if (platformData) {
            let cursor = dbconfig.collection_players.find({platform: platformData._id}).cursor();
            let i = 0;
            cursor.eachAsync(
                playerData => {
                    i++;
                    return dbPlayerInfo.updatePMSPlayerTopupChannelPermission(platformData.platformId, playerData._id).then(
                        () => console.log('done', i)
                    );
                }
            );
        }
    }
);

