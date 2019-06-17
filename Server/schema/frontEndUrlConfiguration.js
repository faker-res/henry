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
    // favicon
    faviconUrl: {type: String},
    pc: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
        // htmlTextColor
        htmlTextColor: {type: String},
        // text color 1
        textColor1: {type: String},
        // text color 2
        textColor2: {type: String},
        // 主导航字色
        mainNavTextColor: {type: String},
        // 主导航选中字色
        mainNavActiveTextColor: {type: String},
        // 主导航选中下方横线色
        mainNavActiveBorderColor: {type: String},
        // 副导航字色
        navTextColor: {type: String},
        // 副导航选中字色
        navActiveTextColor: {type: String},
        // 表单背景色
        formBgColor: {type: String},
        // 表单label字色
        formLabelTextColor: {type: String},
        // 表单输入字色
        formInputTextColor: {type: String},
        // 表单下边框色
        formBorderBottomColor: {type: String},
    },
    app: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
        // htmlTextColor
        htmlTextColor: {type: String},
        // text color 1
        textColor1: {type: String},
        // text color 2
        textColor2: {type: String},
        // 主导航字色
        mainNavTextColor: {type: String},
        // 主导航选中字色
        mainNavActiveTextColor: {type: String},
        // 主导航选中下方横线色
        mainNavActiveBorderColor: {type: String},
        // 副导航字色
        navTextColor: {type: String},
        // 副导航选中字色
        navActiveTextColor: {type: String},
        // 表单背景色
        formBgColor: {type: String},
        // 表单label字色
        formLabelTextColor: {type: String},
        // 表单输入字色
        formInputTextColor: {type: String},
        // 表单下边框色
        formBorderBottomColor: {type: String},
    },
    h5: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
        // htmlTextColor
        htmlTextColor: {type: String},
        // text color 1
        textColor1: {type: String},
        // text color 2
        textColor2: {type: String},
        // 主导航字色
        mainNavTextColor: {type: String},
        // 主导航选中字色
        mainNavActiveTextColor: {type: String},
        // 主导航选中下方横线色
        mainNavActiveBorderColor: {type: String},
        // 副导航字色
        navTextColor: {type: String},
        // 副导航选中字色
        navActiveTextColor: {type: String},
        // 表单背景色
        formBgColor: {type: String},
        // 表单label字色
        formLabelTextColor: {type: String},
        // 表单输入字色
        formInputTextColor: {type: String},
        // 表单下边框色
        formBorderBottomColor: {type: String},
    },
    // // Current Skin(PC)
    // pcSkin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
    // // Current Skin(H5)
    // h5Skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
    // // Current Skin(APP)
    // appSkin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},

});

module.exports = frontEndUrlConfigurationSchema;