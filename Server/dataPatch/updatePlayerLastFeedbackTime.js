const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");


dbconfig.collection_platform.findOne({platformId: 4}).lean().then(
    platformData => {
        if(platformData){
            const cursor = dbconfig.collection_players.find({platform: platformData._id}).cursor();
            var i = 0;
            cursor.eachAsync(
                playerData => {
                    dbconfig.collection_playerFeedback.find({playerId: playerData._id}).sort({createTime: -1}).limit(1).then(
                        feedback => {
                            if (feedback && feedback[0]) {
                                return dbconfig.collection_players.findOneAndUpdate({_id: playerData._id, platform: playerData.platform}, {lastFeedbackTime: feedback[0].createTime});
                            }
                        }
                    ).then();
                    i++;
                    console.log(i);
                }
            );
        }
    }
);


