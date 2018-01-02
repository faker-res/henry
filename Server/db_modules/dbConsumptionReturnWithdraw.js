const constShardKeys = require('./../const/constShardKeys');
const dbutility = require('./../modules/dbutility');
const dbconfig = require('./../modules/dbproperties');

let dbXimaWithdraw = {
    clearXimaWithdraw: (playerObjId) => {
        return dbutility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, {ximaWithdraw: 0}, constShardKeys.collection_players, true);
    },
    addXimaWithdraw: (playerObjId, amount) => {
        return dbutility.findOneAndUpdateForShard(dbconfig.collection_players, {_id: playerObjId}, {$inc: {ximaWithdraw: amount}}, constShardKeys.collection_players, true);
    },
    reduceXimaWithdraw: (playerObjId, amount) => {
        return dbconfig.collection_players.findOne({_id: playerObjId}).lean().then(
            playerData => {
                if (!playerData) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Invalid player data"
                    });
                }

                if (!playerData.ximaWithdraw){
                    // no need to reduce anymore
                    return Promise.resolve();
                }

                let query = {platform: playerData.platform, _id: playerObjId};

                let updateData = {$inc: {ximaWithdraw: -amount}};

                if (amount >= playerData.ximaWithdraw) {
                    updateData = {ximaWithdraw: 0};
                }

                return dbconfig.collection_players.findOneAndUpdate(query, updateData, {new: true}).lean();
            }
        );
    },
};

module.exports = dbXimaWithdraw;