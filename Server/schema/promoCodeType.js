let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeTypeSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, required: true},
    // promo code type name
    name: {type: String, required: true},
    // promo code type
    type: {type: Number, required: true},
    // sms title
    smsTitle: {type: String},
    // sms content
    smsContent: {type: String},
    // is deleted or not the the
    deleteFlag: {type: Boolean, default: false}
});

module.exports = promoCodeTypeSchema;