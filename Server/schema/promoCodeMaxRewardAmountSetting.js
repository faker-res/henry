let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeMaxRewardAmountSettingSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // promo code max reward amount
    maxRewardAmount: {type: Number, required: true},
    // department
    department: {type: Schema.ObjectId, index: true},
    // role
    role: {type: Schema.ObjectId, index: true},
    //status: 1- active; 2-deleted
    status: {type: Number, default: 1, index: true}
});

module.exports = promoCodeMaxRewardAmountSettingSchema;
