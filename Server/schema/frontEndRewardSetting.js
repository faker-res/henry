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
    // promo code
    promoCode: {type: String},
    pc: {
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
        // displayFormat 1： 列表； 2： 平铺3项1列；
        displayFormat: {type: Number},
        // display order number including of all the pc, h5, app category
        orderNumber: {type: Number, index: true},
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
    },
    h5: {
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
        // display order number including of all the pc, h5, app category
        orderNumber: {type: Number, index: true},
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
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
        // display order number including of all the pc, h5, app category
        orderNumber: {type: Number, index: true},
        // is required to log in or not
        requiredToLogIn: {type: Boolean},
        // showing application button or not
        showApplyButton: {type: Boolean},
    },
});

module.exports = frontEndRewardSettingSchema;