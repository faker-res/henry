var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformAutoFeedbackSchema = new Schema({
    //platform object id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    name: {type: String, required: true, index: true},
    remarks: {type: String},
    missionStartTime: {type: Date, required: true, index: true},
    missionEndTime: {type: Date, required: true, index: true},
    defaultStatus: {type: String},  //任务初始状态
    channel: {type: String, index: true},
    enabled: {type: Boolean, required: true},
    playerType: {type: String},
    playerLevel: {type: String},
    credibilityRemarks: [{type: String}],
    filterCredibilityRemarks: [{type: String}],
    lastAccessOperator: {type: String},
    lastAccessFormal: {type: Number},
    lastAccessLatter: {type: Number},
    filterFeedback: {type: Number},
    filterFeedbackTopic: [{type: String}],
    depositCountOperator: {type: String},
    depositCountFormal: {type: Number},
    depositCountLatter: {type: Number},
    playerValueOperator: {type: String},
    playerValueFormal: {type: Number},
    playerValueLatter: {type: Number},
    consumptionTimesOperator: {type: String},
    consumptionTimesFormal: {type: Number},
    consumptionTimesLatter: {type: Number},
    bonusAmountOperator: {type: String},
    bonusAmountFormal: {type: Number},
    bonusAmountLatter: {type: Number},
    withdrawTimesOperator: {type: String},
    withdrawTimesFormal: {type: Number},
    withdrawTimesLatter: {type: Number},
    topUpSumOperator: {type: String},
    topUpSumFormal: {type: Number},
    topUpSumLatter: {type: Number},
    gameProviderId: [{type: String}],
    isNewSystem: {type: String},
    registerStartTime: {type: Date, required: true},
    registerEndTime: {type: Date, required: true},
    departments: [{type: String}],
    roles: [{type: String}],
    admins: [{type: String}],
    callPermission: {type: String},
    schedule: [{
        dayAfterLastMission: {type: Number},
        triggerHour: {type: Number},
        triggerMinute: {type: Number},
        template: {type: Schema.ObjectId, ref: 'promoCodeTemplate'},
        feedbackResult: {type: String},
        feedbackTopic: {type: String},
        content: {type: String},
    }],
    createTime: {type: Date, default: Date.now}
});

platformAutoFeedbackSchema.index({platformObjId: 1, name: 1}, {unique: true});

module.exports = platformAutoFeedbackSchema;