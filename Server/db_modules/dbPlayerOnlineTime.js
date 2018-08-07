let dbConfig = require('./../modules/dbproperties');

let dbPlayerOnlineTime = {
    loginTimeLog: function (playerObjId, platformObjId, token) {
        return dbConfig.collection_playerOnlineTime.findOneAndUpdate({
            player: playerObjId,
            lastLoginToken: token
        }, {
            platform: platformObjId,
            lastLoginTime: new Date(),
            lastAuthenticateTime: null,
            totalOnlineSeconds: 0
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
    },

    getOnlineTimeLogByPlatform: function (platformObjId, startTime, endTime) {
        return dbConfig.collection_playerOnlineTime.find({
            platform: platformObjId,
            lastLoginTime: {$gte: startTime, $lt: endTime}
        }).populate({path: "player", model: dbConfig.collection_players, select:{_id:1, name:1}}).lean().then(
            timeLogs => {
                if (timeLogs && timeLogs.length) {
                    return timeLogResultGenerator(timeLogs);
                }
            }
        );

        function timeLogResultGenerator (logs) {
            let retData = {
                totalCount: 0,
                count1: 0,
                count2: 0,
                count3: 0,
                count4: 0,
                count5: 0,
                count6: 0,
                count7: 0,
                count8: 0,
                count9: 0,
                // proposal1: [],
                // proposal2: [],
                // proposal3: [],
                // proposal4: [],
                // proposal5: [],
                // proposal6: [],
                // proposal7: [],
                // proposal8: [],
                // proposal9: []
            };

            logs.forEach(log => {
                retData.totalCount++;
                retData.count1 += checkSecondsGroup(log.totalOnlineSeconds, 0, 60) ? 1 : 0;
                retData.count2 += checkSecondsGroup(log.totalOnlineSeconds, 60, 180) ? 1 : 0;
                retData.count3 += checkSecondsGroup(log.totalOnlineSeconds, 180, 300) ? 1 : 0;
                retData.count4 += checkSecondsGroup(log.totalOnlineSeconds, 300, 600) ? 1 : 0;
                retData.count5 += checkSecondsGroup(log.totalOnlineSeconds, 600, 1200) ? 1 : 0;
                retData.count6 += checkSecondsGroup(log.totalOnlineSeconds, 1200, 1800) ? 1 : 0;
                retData.count7 += checkSecondsGroup(log.totalOnlineSeconds, 1800, 2700) ? 1 : 0;
                retData.count8 += checkSecondsGroup(log.totalOnlineSeconds, 2700, 3600) ? 1 : 0;
                retData.count9 += log.totalOnlineSeconds > 3600 ? 1 : 0;
            });

            return retData;
        }

        function checkSecondsGroup (value, min, max) {
            return value >= min && value < max;
        }
    }
};

module.exports = dbPlayerOnlineTime;