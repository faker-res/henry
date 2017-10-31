'use strict';

const dbconfig = require('./../modules/dbproperties');
const constRewardTaskStatus = require('./../const/constRewardTaskStatus');

let dbRewardTaskGroup = {
    getPlayerRewardTaskGroup: (platformId, providerId, playerId) => {
        return dbconfig.collection_gameProviderGroup.findOne({
            platform: platformId,
            providers: providerId
        }).lean().then(
            gameProviderGroup => {
                if (gameProviderGroup) {
                    // Search for reward task group of this player on this provider
                    return dbconfig.collection_rewardTaskGroup.findOne({
                        platformId: platformId,
                        playerId: playerId,
                        providerGroup: gameProviderGroup._id,
                        status: {$in: [constRewardTaskStatus.STARTED]}
                    }).lean();
                }
            }
        )
    }
};

module.exports = dbRewardTaskGroup;