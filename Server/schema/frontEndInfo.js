var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var fronEndInfoSchema = new Schema({
    //platform Id
    platformId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // order number to decide the display sequence
    orderNo: {type: Number, min: 1, default: 1, required: true},
    //advertisement code
    adCode: {type: String, required: true},
    //title(s) to display in the advertisement
    title: [],
    //background banner image
    backgroundBannerURL: {
        url: {type: String},
        hyperLink: {type: String},
    },
    //button link(s)
    button: [],
    // input device that using this advertisement
    inputDevice: Number,
    status: {type: Number, default: 0, required: true},
});

module.exports = fronEndInfoSchema;