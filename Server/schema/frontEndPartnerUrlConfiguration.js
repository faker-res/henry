var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPartnerUrlConfigurationSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    websiteTitle: {type: String},
    // name
    websiteName: {type: String},
    // meta(KeyWords)
    metaKeyword: {type: String},
    // meta(Description)
    metaDescription: {type: String},
    pc: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },
    app: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },
    h5: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },

});

module.exports = frontEndPartnerUrlConfigurationSchema;