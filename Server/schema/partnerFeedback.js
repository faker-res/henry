let mongoose = require('mongoose');
let Schema = mongoose.Schema;

/**
 * After partner register, customer service will call partner to get some feedback about the games and record down the feedback.
 */
let partnerFeedbackSchema = new Schema({
    //partnerId
    partnerId: {type: Schema.ObjectId, ref: 'partnerInfo', required: true, index: true},
    //platform id
    platform: {type: Schema.ObjectId, required: true, index: true},
    //create Time
    createTime: {type: Date, default: Date.now, index: true},
    //adminId( customer service admin user id )
    adminId: {type: Schema.ObjectId, ref: 'adminInfo', index: true},
    //content of the feedback
    content: String,
    //result ( Normal, Missed call, PartnerBusy)
    result: String,
    resultName: String,
    topic: String
});

module.exports = partnerFeedbackSchema;