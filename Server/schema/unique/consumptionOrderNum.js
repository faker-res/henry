/*
 * This schema is to ensure the uniqueness of orderNum in orderNum schema
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var consumptionOrderNumSchema = new Schema({
    orderNo: {type: String, required: true},
    createTime: {type: Date, default: Date.now},
});

//record is unique by name and platform
consumptionOrderNumSchema.index({orderNo: 1}, {unique: true});

module.exports = consumptionOrderNumSchema;