let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let promoCodeUserGroupSchema = new Schema({
    // platform id
    platformObjId: {type: Schema.ObjectId, required: true},
    // promo code type name
    name: {type: String, required: true},
    // promo code type
    color: {type: String, required: true},
    // sms content
    playerNames: [{type: String}]
});

module.exports = promoCodeUserGroupSchema;