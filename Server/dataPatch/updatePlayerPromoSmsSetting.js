const dbconfig = require("../modules/dbproperties");

const playerCursor = dbconfig.collection_players.find({}).cursor();
let i = 0;
playerCursor.eachAsync(
    player => {
        dbconfig.collection_players.update({_id: player._id, platform: player.platform}, {"smsSetting.PromoCodeSend": true}).then(
            () => {
                console.log('smsSetting index', i);
                i++;
            }
        );
    }
);