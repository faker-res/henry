var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPartnerUrlConfigurationSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // subPlatformId - 子平台ID: 401(易游棋牌); 402（v68; 403（易游）
    subPlatformId: {type: Number, index: true},
    // title
    websiteTitle: {type: String},
    // name
    websiteName: {type: String},
    // meta(KeyWords)
    metaKeyword: {type: String},
    // meta(Description)
    metaDescription: {type: String},
    // 主站APP下载地址
    appDownloadAddress: {type: String},
    // 百度统计代码
    baiduStatsCode: {type: String},
    pc: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },
    app: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },
    h5: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndPartnerSkinSetting', index: true},
    },
    // favicon
    faviconUrl: {type: String},
});

module.exports = frontEndPartnerUrlConfigurationSchema;