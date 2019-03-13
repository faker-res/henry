var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var advertisementPageXBETSchema = new Schema({
    //platform Id
    platformId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // order number to decide the display sequence
    orderNo: {type: Number, min: 0, default: 0, required: true},
    // type of advertisement
    type: {type: Number, required: true, index: true},
    // advertisement type - for type 1(首页广告) only
    advertisementType: {type: String, required: true, index: true},
    // title(s) to display in the advertisement
    title: {type: String},
    // address of the image
    url: {type: String},
    // go to url when image clicked
    hyperLink: {type: String},
    // match Id - for type 1(首页广告) only
    matchId: {type: String},
    // status - on/off 0 = off
    status: {type: Number, default: 0, required: true},
    //if this ads show in production server
    showInFrontEnd: {type: Boolean, default: false},
    // config css for front end
    css: {type: String},
    // config hover effect for front end
    hoverCss: {type: String},

});

advertisementPageXBETSchema.index({platformId: 1, type: 1, orderNo: 1}, {unique: true});

module.exports = advertisementPageXBETSchema;