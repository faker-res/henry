var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndPopularRecommendationSettingSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
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
    // 1: available; 2: deleted
    status: {type: Number, index: true, default: 1},
    // has to log in or not
    requiredToLogIn: {type: Boolean, index: true}
});

module.exports = frontEndPopularRecommendationSettingSchema;