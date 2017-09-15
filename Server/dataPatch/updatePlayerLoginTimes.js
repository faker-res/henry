const dbconfig = require("../modules/dbproperties");

const playerCursor = dbconfig.collection_players.find({}).cursor();
let i = 0;
playerCursor.eachAsync(
    player => {
        dbconfig.collection_playerLoginRecord.find({player: player._id}).count().then(
            loginCount => {
                dbconfig.collection_players.update({_id: player._id, platform: player.platform}, {loginTimes: loginCount}).then(
                    () => {
                        console.log('index', i);
                        i++;
                    }
                );
            }
        );
    }
);