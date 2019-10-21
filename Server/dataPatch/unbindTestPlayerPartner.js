const dbconfig = require("../modules/dbproperties");


var i = 0;

dbconfig.collection_platform.find({}, {_id: 1, name: 1}).cursor().eachAsync(
    platform => {
        if (!platform) {
            return Promise.reject("Cannot find platform")
        }
        dbconfig.collection_players.find({platform: platform._id, partner: {$ne: null}, isTestPlayer: true}, {platform: 1, name: 1}).cursor().eachAsync(
            player => {
                if (player && player._id) {
                    console.log('unbind test player index', i, player.name);
                    i++;

                    dbconfig.collection_players.update({_id: player._id}, {partner: null}).catch(err => {
                        console.error(err)
                    });

                }

            }
        );
    })