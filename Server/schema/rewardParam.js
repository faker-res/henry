var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardParamSchema = new Schema({
    //param name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //params data contains
    params:{type: JSON, default: null}
});

module.exports = rewardParamSchema;