const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const rsaCrypto = require("../modules/rsaCrypto");
const dbPlayerInfo = require("../db_modules/dbPlayerInfo");

let platformId = "4";

dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
    platformData => {
        if (platformData) {
            let cursor = dbconfig.collection_players.find({platform: platformData._id}).cursor();
            cursor.eachAsync(
                playerData => {
                    return dbPlayerInfo.updatePMSPlayerTopupChannelPermission(platformId, playerData._id).then(
                        () => console.log('done')
                    );
                }
            );
        }
    }
);

