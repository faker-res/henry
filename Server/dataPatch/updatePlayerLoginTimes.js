const dbconfig = require("../modules/dbproperties");

let playerProm = dbconfig.collection_players.find({}).lean();

playerProm.then(
    players => {
        for (let p = 0, len = players.length; p < len; p++) {
            let player = players[p];
            dbconfig.collection_playerLoginRecord.find({player: player._id}).count().then(
                loginCount => {
                    dbconfig.collection_players.update({_id: player._id, platform: player.platform}, {loginTimes: loginCount}).exec();
                }
            );
        }
    }
);