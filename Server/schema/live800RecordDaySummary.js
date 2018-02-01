var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var live800RecordDaySummarySchema = new Schema({
    createTime: {type: Date, default: Date.now, index: true},
    totalRecord: {type: Number, default: 0},
    nonEffectiveRecord: {type: Number, default: 0},
    effectiveRecord: {type: Number, default: 0},
    companyId: {type: String, required: true,index: true},
    live800Acc: {type: String, required: true, index: true},
});

module.exports = live800RecordDaySummarySchema;
