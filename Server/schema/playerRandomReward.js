var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var playerRandomRewardSchema = new Schema({
    //playerRandom Status
    status: {type: String, index: true},
    //player id
    playerId: {type: Schema.Types.ObjectId, ref: 'playerInfo', required: true, index: true},
    //related proposal id
    proposalId: {type: String, index: true},
    //related platform id
    platformId: {type: Schema.ObjectId, ref: 'platform', index: true},
    //creation time
    createTime: {type: Date, default: Date.now, index: true},
    //reward event
    rewardEvent: {type: Schema.ObjectId, ref: 'rewardEvent'},
    //reward prize
    randomReward: {type: String, index: true},
    //creator {type(system, player or admin), name, id(shortID for player, longId for admin)
    creator: {type: JSON, default: {}},
    // last admin edit time.
    lastEditTime:  {type: Date, default: Date.now, index: true}
});

module.exports = playerRandomRewardSchema;
