const dbconfig = require("../modules/dbproperties");

const platformCursor = dbconfig.collection_platform.find({}).cursor();
var i = 0;
platformCursor.eachAsync(
    platform => {
        var playerQuery = {
            platform: platform._id,
            "permission.banReward": true
        }
        dbconfig.collection_players.distinct('name', playerQuery).lean().then(
            playerName => {
                if (playerName && playerName.length) {
                    return dbconfig.collection_promoCodeUserGroup.findOneAndUpdate({
                        platformObjId: platform._id,
                        name: "Main Permission Disabled (default)", //hard code name
                        isBlockByMainPermission: true,
                        color: "lightgrey"
                    }, {
                        $addToSet: {playerNames: {$each: playerName}}
                    },{upsert: true}).lean();
                } else {
                    return Promise.resolve();
                }
            }
        ).then(
            () => {
                console.log('promo code group setting index', i);
                i++;
                return dbconfig.collection_promoCodeUserGroup.distinct("playerNames", {
                    platformObjId: platform._id,
                    isBlockPromoCodeUser: true
                }).then(
                    groupPlayers => {
                        if (groupPlayers && groupPlayers.length) {
                            return dbconfig.collection_players.update({
                                platform: platform._id,
                                name: {$in: groupPlayers}
                            }, {"forbidPromoCode": true}, {multi: true, new: true}).exec();
                        }
                    }
                )
            }
        ).catch(err=> console.log("updateForbidPermission", err))
    }
);