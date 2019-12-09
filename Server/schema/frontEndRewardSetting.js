var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndRewardSettingSchema = new Schema({

    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // title
    title: {type: String},
    // categoryName
    categoryObjId: {type: Schema.Types.ObjectId, ref: 'frontEndRewardCategory', required: true, index: true},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true},
    // whether the setting is showing up
    isVisible: {type: Boolean, default: true},
    // display order based on individual category
    displayOrder: {type: Number, index: true},
    // display order number including of all the category
    orderNumber: {type: Number, index: true},
    // promo code
    promoCode: {type: String},
    // this reward is ended or not
    hasEnded: {type: Boolean, default: false},
    pc: {
        // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干, 7: 自定义文本
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
        // html script
        script: {type: String},
        // rewardBannerPicture
        rewardBannerPicture: {type: String},
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
        // 1： 前往指定页面; 2: 返回; 3: 申请优惠; 4: 联系客服
        topButtonClick: {type: Number},
        // text for top button
        topButtonText: {type: String},
        // route for topButtonClick
        topButtonRoute: {type: String},
        // 1： 前往指定页面; 2: 返回; 3: 申请优惠; 4: 联系客服
        rightButtonClick: {type: Number},
        // text for right button
        rightButtonText: {type: String},
        // route for rightButtonClick
        rightButtonRoute: {type: String},
        // 1： 前往指定页面; 2: 返回; 3: 申请优惠; 4: 联系客服
        bottomButtonClick: {type: Number},
        // text for right button
        bottomButtonText: {type: String},
        // route for bottomButtonClick
        bottomButtonRoute: {type: String},
    },
    h5: {
        // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干, 7: 自定义文本
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
        // html script
        script: {type: String},
        // rewardBannerPicture
        rewardBannerPicture: {type: String},
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
        // 1： 前往指定页面; 2: 返回; 3: 申请优惠; 4: 联系客服
        rewardButtonClick: {type: Number},
        // text for reward button
        rewardButtonText: {type: String},
        // route for rewardButtonClick
        rewardButtonRoute: {type: String},
    },
    app: {
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
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
    },
});

module.exports = frontEndRewardSettingSchema;