var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndUrlConfigurationSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    websiteTitle: {type: String},
    // name
    websiteName: {type: String},
    // app (Android) download url
    androidAppUrl: {type: String},
    // app (IOS) download url
    iosAppUrl: {type: String},
    // meta(KeyWords)
    metaKeyword: {type: String},
    // meta(Description)
    metaDescription: {type: String},
    // 横屏样式文件
    horizontalScreenStyleFileUrl: {type: String},
    // favicon
    faviconUrl: {type: String},
    // website logo
    websiteLogo: {type: String},
    // Current Skin(PC)
    pcSkin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
    // Current Skin(H5)
    h5Skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
    // Current Skin(APP)
    appSkin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true}
});

module.exports = frontEndUrlConfigurationSchema;