var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndRewardCategorySchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // categoryName
    categoryName: {type: String, index: true},
    // displayFormat 1： 列表； 2： 平铺3项1列；
    displayFormat: {type: Number},
    // set default category to be displayed at front end
    defaultShow: {type: Boolean, default: false},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true}
});

module.exports = frontEndRewardCategorySchema;