let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let partnerPosterAdsConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // subPlatformId - 子平台ID: 401(易游棋牌); 402（v68; 403（易游）
    subPlatformId: {type: Number, index: true},
    // order number to decide the display sequence
    orderNo: {type: Number, min: 0, default: 0, required: true},
    // target input device
    targetDevice: {type: String, default: "0", index: true}, // constPartnerPosterAdsTargetDevice.js
    //title(s) to display in the advertisement
    title: [{
        _id: false,
        name: {type: String}
    }],
    // poster image
    posterImage: {
        url: {type: String},
        hyperLink: {type: String},
    },
    //if this ads show in production server
    showInRealServer: {type: Boolean, default: true, index: true},
    // status to define on or off (0 = off, 1 = on)
    status: {type: Number, default: 1, required: true},
});

partnerPosterAdsConfigSchema.index({platform: 1, orderNo: 1, targetDevice: 1, subPlatformId: 1}, {unique: true});
partnerPosterAdsConfigSchema.index({platform: 1, status: 1, orderNo: 1, targetDevice: 1, showInRealServer: 1, subPlatformId: 1});

module.exports = partnerPosterAdsConfigSchema;


