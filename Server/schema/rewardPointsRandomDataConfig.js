var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// to insert fake player and data to reward points ranking
var rewardPointsRandomDataConfig = new Schema({
    // platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // random data config
    condition: {type: JSON, default: {}}
});

module.exports = rewardPointsRandomDataConfig;
