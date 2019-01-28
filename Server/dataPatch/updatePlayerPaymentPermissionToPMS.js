const dbconfig = require("../modules/dbproperties");
const dbPlayerInfo = require("../db_modules/dbPlayerInfo");

let platformId = process.env.platformId;

dbconfig.collection_platform.findOne({platformId: platformId}, {_id: 1}).lean().then(
    platformData => {
        if (platformData) {
            let playerArr = [];
            let cursor = dbconfig.collection_players.find({platform: platformData._id, isTestPlayer: {$ne: true}}, {_id: 1, name: 1, permission: 1}).cursor();
            let i = 0;
            let done = 0;

            cursor.eachAsync(
                playerData => {
                    playerArr.push(playerData);
                    i++;

                    if (i === 10) {
                        dbPlayerInfo.updatePMSPlayerTopupChannelPermission(platformId, playerArr);
                        done += i;
                        console.log('done', done);
                        i = 0;
                        playerArr = [];
                    }
                }
            ).then(() => {
                dbPlayerInfo.updatePMSPlayerTopupChannelPermission(platformId, playerArr);
                done += i;
                console.log('done 2', done);
                i = 0;
                playerArr = [];
            });
        }
    }
);

