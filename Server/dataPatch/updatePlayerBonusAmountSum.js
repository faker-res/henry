const dbconfig = require("../modules/dbproperties")

const playerCursor = dbconfig.collection_players.find({}).cursor();
let i = 0;
playerCursor.eachAsync(
    player => {
        return dbconfig.collection_proposal.find({mainType: "PlayerBonus", "data.playerId": player.playerId}).count().then(
            withdrawCount => {
                if (withdrawCount) {
                    console.log('withdrawCount', withdrawCount)

                }
                return dbconfig.collection_players.update({
                    _id: player._id,
                    platform: player.platform
                }, {
                    withdrawTimes: withdrawCount
                });
            }
        ).then(
            data => {
                console.log('index', i);
                i++;
            }
        );
    }
);