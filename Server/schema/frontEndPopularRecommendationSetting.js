var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPopularRecommendationSettingSchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    title: {type: String},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number, index: true},
    // display title
    displayTitle: {type: String},
    // 1： 首页热门推荐； 2： 游戏推荐； 3： 底部
    category: {type: Number, index: true},
    // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干
    onClickAction: {type: Number},
    //  ftp url for uploaded pc image
    imageUrl: {type: String},
    // the ftp url for uploaded new page image
    newPageUrl: {type: String},
    // the ftp url for uploaded activity iframe url
    activityUrl: {type: String},
    // reward event ObjectId
    rewardEventObjId: {type: Schema.Types.ObjectId, ref: 'rewardEvent', index: true},
    // the route to official web page
    route: {type: String},
    // the game code
    gameCode: {type: String},
    // the height
    pageHeight: {type: String},
    // 导航选中图
    selectedNavImage: {type: String},
    // has to log in or not
    requiredToLogIn: {type: Boolean, index: true},
    // stop pop-up in navigation bar
    stopPopUp: {type: Boolean, index: true},
    // pop-up data
    popUpList: [{type: Schema.Types.ObjectId, ref: 'frontEndPopUpSetting'}],
    // pc: {
    //     // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干
    //     onClickAction: {type: Number},
    //     //  ftp url for uploaded pc image
    //     imageUrl: {type: String},
    //     // the ftp url for uploaded new page image
    //     newPageUrl: {type: String},
    //     // the ftp url for uploaded activity iframe url
    //     activityUrl: {type: String},
    //     // reward event ObjectId
    //     rewardEventObjId: {type: Schema.Types.ObjectId, ref: 'rewardEvent', index: true},
    //     // the route to official web page
    //     route: {type: String},
    //     // the game code
    //     gameCode: {type: String},
    //     // the height
    //     pageHeight: {type: String},
    //     // 导航选中图
    //     selectedNavImage: {type: String},
    //     // has to log in or not
    //     requiredToLogIn: {type: Boolean, index: true},
    //     // stop pop-up in navigation bar
    //     stopPopUp: {type: Boolean, index: true},
    //     // pop-up data
    //     popUpList: [{type: Schema.Types.ObjectId, ref: 'frontEndPopUpSetting'}],
    // },
    // h5: {
    //     // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干
    //     onClickAction: {type: Number},
    //     //  ftp url for uploaded pc image
    //     imageUrl: {type: String},
    //     // the ftp url for uploaded new page image
    //     newPageUrl: {type: String},
    //     // the ftp url for uploaded activity iframe url
    //     activityUrl: {type: String},
    //     // reward event ObjectId
    //     rewardEventObjId: {type: Schema.Types.ObjectId, ref: 'rewardEvent', index: true},
    //     // the route to official web page
    //     route: {type: String},
    //     // the game code
    //     gameCode: {type: String},
    //     // the height
    //     pageHeight: {type: String},
    //     // 导航选中图
    //     selectedNavImage: {type: String},
    //     // has to log in or not
    //     requiredToLogIn: {type: Boolean, index: true},
    // },
    // app: {
    //     // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干
    //     onClickAction: {type: Number},
    //     //  ftp url for uploaded pc image
    //     imageUrl: {type: String},
    //     // the ftp url for uploaded new page image
    //     newPageUrl: {type: String},
    //     // the ftp url for uploaded activity iframe url
    //     activityUrl: {type: String},
    //     // reward event ObjectId
    //     rewardEventObjId: {type: Schema.Types.ObjectId, ref: 'rewardEvent', index: true},
    //     // the route to official web page
    //     route: {type: String},
    //     // the game code
    //     gameCode: {type: String},
    //     // the height
    //     pageHeight: {type: String},
    //     // 导航选中图
    //     selectedNavImage: {type: String},
    //     // has to log in or not
    //     requiredToLogIn: {type: Boolean, index: true},
    // },
    // 1: web; 2: iOS APP; 3: Android APP; 4: H5
    visibleOnDevice: [{
        _id: false,
        type: Number
    }],
    // can player see this setting
    isPlayerVisible: {type: Boolean, default: true},
    // can player with registered hp number see this setting
    isPlayerWithRegisteredHpNoVisible: {type: Boolean, default: true},
    // can new player who just open an account see this setting
    isNewPlayerVisible: {type: Boolean, default: false},
    // can first-time-login player see this setting
    isFirstTimeLoginPlayerVisible:  {type: Boolean, default: false},
    // player's level see this setting
    visibleOnPlayerLevel:   [{
        _id: false,
        type: Schema.Types.ObjectId, ref: 'playerLevel'
    }],
    // visible for balance below certain amount
    visibleForBalanceBelow: {type: Number, default: 0},
    // visible for player with top-up times more than certain value
    visibleForTopUpTimeMoreThan: {type: Number, default: 0},
    // visible for player involves in the selected game provider
    visibleForInvolveInGameProvider: [{
        _id: false,
        type: Schema.Types.ObjectId, ref: 'gameProvider'
    }],
    // whether the setting is showing up
    isVisible: {type: Boolean, default: true},
    // 1: available; 2: deleted
    status: {type: Number, index: true, default: 1},
    // display order based on individual category
    displayOrder: {type: Number, index: true},

});

module.exports = frontEndPopularRecommendationSettingSchema;