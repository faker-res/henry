var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPartnerSkinSettingSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // subPlatformId - 子平台ID: 401(易游棋牌); 402（v68; 403（易游）
    subPlatformId: {type: Number, index: true},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number},
    // skin's name
    name: {type: String},
    // skin's url
    url: {type: String}
});

module.exports = frontEndPartnerSkinSettingSchema;