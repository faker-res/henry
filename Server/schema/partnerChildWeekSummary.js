var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerChildWeekSummarySchema = new Schema({
    //partner id
    partnerId: {type: Schema.ObjectId},
    //partner id
    childId: {type: Schema.ObjectId},
    //partner level (of the parent)
    partnerLevel: {type: Number},
    //platform id
    platformId: {type: Schema.ObjectId},
    // The start of the week covered by this summary
    date: {type: Date, required: true},
    // The amount the child contributed to the parent this week
    childAmount: {type: Number},
    childValidAmount: {type: Number}
});

partnerChildWeekSummarySchema.index({ platformId: 1, partnerId: 1, childId: 1, date: 1 });

module.exports = partnerChildWeekSummarySchema;
