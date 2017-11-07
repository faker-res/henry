let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let rewardMainTypeSchema = new Schema({
    // Reward main type name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //condition of the reward
    condition: {
        generalCond: {type: JSON},
        topUpCond: {type: JSON},
        periodCond: {type: JSON},
        latestTopUpCond: {type: JSON},
        consumptionCond: {type: JSON},
        dynamicCond: {type: JSON}
    },
    //param of the reward
    params: {}
});


module.exports = rewardMainTypeSchema;