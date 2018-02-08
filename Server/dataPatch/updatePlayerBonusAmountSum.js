const dbconfig = require("../modules/dbproperties");
const constProposalStatus = require("../const/constProposalStatus");

const playerCursor = dbconfig.collection_players.find({}).cursor();
let i = 0;
playerCursor.eachAsync(
    player => {
        return dbconfig.collection_proposal.find({mainType: "PlayerBonus", "data.playerId": player.playerId, "status": {$in: [constProposalStatus.SUCCESS, constProposalStatus.APPROVED]}}).count().then(
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