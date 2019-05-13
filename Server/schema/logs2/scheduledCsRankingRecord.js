var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var scheduledCsRankingRecordSchema = new Schema({
   // admin objectId
    adminObjId:{type: Schema.ObjectId, ref: 'adminInfo', index: true},
    // admin name
    adminName: {type: String},
    // processTime:{type: Date, default: Date.now, index: true},
    createTime:{type: Date, default: null, index: true},
    // live800's total conversation number
    live800TotalConversationNumber: {type: Number, default: 0},
    // live800's total effective conversation number
    live800TotalEffectiveConversationNumber: {type: Number, default: 0},
    // live800's overTime rate + inspection rate
    live800TotalInspectionMark: {type: Number, default: 0},
    // tel400's total accepted call-in number
    totalAcceptedCallInNumber: {type: Number, default: 0},
    // tel400's total accepted call-in duration
    totalAcceptedCallInTime: {type: Number, default: 0},
    // total manual process number
    totalManualProcessNumber: {type: Number, default: 0},

});

module.exports = scheduledCsRankingRecordSchema;
