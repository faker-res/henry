mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerCredibilityRemarkSchema = new Schema({
    // platform Id
    platform: {type: Schema.ObjectId, required: true},
    // payment time
    name: String,
    // score used for player value calculation
    score: {type: Number, default: 0}
});

playerCredibilityRemarkSchema.index({ platform: 1});

module.exports = playerCredibilityRemarkSchema;