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
    baiduStats_PC: {type: String},
    baiduStats_H5_IOS: {type: String},
    baiduStats_H5_ANDROID: {type: String},
    pc: {
        skin: {type: Schema.Types.ObjectId, ref: 'frontEndSkinSetting', index: true},
        // htmlTextColor
        htmlTextColor: {type: String},
        // text color 1
        textColor1: {type: String},
        // text color 2
        textColor2: {type: String},
        // 弹窗表单背景色
        popUpListBgColor: {type: String},
        // 弹窗表单label色
        popUpListLabelColor: {type: String},
        // 弹窗表单输入色
        popUpListKeyInColor: {type: String},
        // 弹窗表单框色
        popUpListFrameColor: {type: String},
        // 表单hover框色
        formHoverColor: {type: String},
        // 表单背景色
        formBgColor: {type: String},
        // 表单label字色
        formLabelTextColor: {type: String},
        // 表单输入字色
        formInputTextColor: {type: String},
        // 表单下边框色
        formBorderBottomColor: {type: String},
        // 表单hover下框色
        formHoverBottomFrameColor: {type: String},
        // 下拉框背景色
        dropDownFrameBgColor: {type: String},

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

});

module.exports = frontEndUrlConfigurationSchema;