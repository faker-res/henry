var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPartnerCarouselConfigurationSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // subPlatformId - 子平台ID: 401(易游棋牌); 402（v68; 403（易游）
    subPlatformId: {type: Number, index: true},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number, index: true},
    // carousel name
    name: {type: String},
    // ftp url for uploaded pc image
    imageUrl: {type: String},
    // 1： 打开新页面; 2: 活动详情; 3: 跳转站指定优惠页面; 4: 跳转至官网某页面; 5: 启动游戏; 6: 啥都不干
    onClickAction: {type: Number},
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
    // whether the setting is showing up
    isVisible: {type: Boolean, default: true},
    // 1: available; 2: deleted
    status: {type: Number, index: true, default: 1},
    // display order based on individual category
    displayOrder: {type: Number, index: true},

});

module.exports = frontEndPartnerCarouselConfigurationSchema;