var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var qualityInspectionSchema = new Schema({
    messageId: {type: Schema.Types.ObjectId, required: true, index: true},
    status:{type: Number, default: 1}, //1 = pending, 2=completed(unread), 3=completed(read), 4=completed, 5=appealing, 6=appeal completed, 7=not evaluated(invalid)
    qualityAssessor:{type: String, required: true},
    fpmsAcc:{type: String, required: true},
    process_time:{type: Date, default: Date.now, index: true},
    appeal_reason: {type: String},
    conversation:[
        {
            time:{type: String, required: true},
            roles:{type: Number, default: 1}, //1 = customer services, 2=user
            create_time:{type: Date, default: Date.now, index: true},
            timeout_rate:{type: Number, default: 0},
            inspection_rate:{type: Number, default: 0},
            review:{type: String}
        }
    ]
});

module.exports = qualityInspectionSchema;
