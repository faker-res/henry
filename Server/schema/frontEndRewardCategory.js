var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndRewardCategorySchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // categoryName
    categoryName: {type: String},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true}
});

module.exports = frontEndRewardCategorySchema;