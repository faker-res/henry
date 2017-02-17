var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardConditionSchema = new Schema({
    //condition name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //condition data contains condition params and type
    condition:{type: JSON, default: null}
});

module.exports = rewardConditionSchema;
