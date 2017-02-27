var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardTypeSchema = new Schema({
    //reward type name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //reward type des
    des: {type: String},
    //condition of the reward
    condition: {type:Schema.Types.ObjectId, ref:'rewardCondition'},
    //param of the reward
    params: { type:Schema.Types.ObjectId, required:true, ref:'rewardParam'}
});


module.exports = rewardTypeSchema;