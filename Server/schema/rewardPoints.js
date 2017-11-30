var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardPoints = new Schema({
    // platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // player, note that if it does not exist, it is not a real player, but an inserted record
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    // amount of point that this record holding
    points: {type: Number, default: 0},
    // player name, could be player that does not exist
    playerName: {type: String},
    // player level
    playerLevel: {type: Schema.ObjectId, ref: 'playerLevel', index: true},

    createTime: {type: Date, default: Date.now},

    lastUpdate: {type: Date, default: Date.now},
    // event details base on category
    progress: {type: Array, default: []}
});

module.exports = rewardPoints;
