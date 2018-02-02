var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var qualityInspectionSchema = new Schema({
    messageId: {type: String, required: true,index: true},
    status:{type: Number, default: 1}, //1 = pending, 2=completed(unread), 3=completed(read), 4=completed, 5=appealing, 6=appeal completed, 7=not evaluated(invalid)
    qualityAssessor:{type: Schema.ObjectId, ref: 'adminInfo'},
    fpmsAcc:{type: Schema.ObjectId, ref: 'adminInfo'},
    processTime:{type: Date, default: Date.now, index: true},
    createTime:{type: Date, default: null, index: true},
    appealReason: {type: String},
    companyId: {type: String, required: true,index: true},
    totalInspectionRate :{type: Number, default: 0},
    live800Acc: {
        id: {type: String, required: true, index: true},
        name: {type: String, required: true, index: true}
        },
    conversation: [{
        time: {type: String, required: true},
        roles: {type: Number, default: 1}, //1 = customer services, 2=user
        createTime: {type: Date, default: Date.now, index: true},
        timeoutRate: {type: Number, default: 0},
        inspectionRate: {type: Number, default: 0},
        review: {type: String}
    }]

});

module.exports = qualityInspectionSchema;
