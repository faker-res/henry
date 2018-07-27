let dbConfig = require('./../modules/dbproperties');

let dbPlayerOnlineTime = {
    loginTimeLog: function (playerObjId, platformObjId, token) {
        return dbConfig.collection_playerOnlineTime.findOneAndUpdate({
            player: playerObjId
        }, {
            platform: platformObjId,
            lastLoginTime: new Date(),
            lastLoginToken: token,
            lastAuthenticateTime: null
        }, {
            upsert: true
        });
    },

    authenticateTimeLog: function (playerObjId, token) {
        let currentTime = new Date();
        let onlineSeconds = 0;

        return dbConfig.collection_playerOnlineTime.findOneAndUpdate({
            player: playerObjId,
            lastLoginToken: token
        }, {
            lastAuthenticateTime: currentTime
        }, {
            new: false
        }).lean().then(
            timeLog => {
                if (timeLog) {
                    if (timeLog.lastAuthenticateTime) {
                        let onlineMs = currentTime.getTime() - timeLog.lastAuthenticateTime.getTime();

                        // Handling for concurrent/multiple authenticate calls
                        // If interval between authenticate is less than 1 second, don't count in online time
                        if (onlineMs >= 1000) { onlineSeconds = onlineMs / 1000 }
                    } else if (timeLog.lastLoginTime) {
                        onlineSeconds = (currentTime.getTime() - timeLog.lastLoginTime.getTime()) / 1000;
                    }

                    return dbConfig.collection_playerOnlineTime.findByIdAndUpdate(timeLog._id, {
                        $inc: {totalOnlineSeconds: onlineSeconds}
                    })
                }
            }
        )
    }
};

module.exports = dbPlayerOnlineTime;