var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerPageAdvertisementInfoSchema = new Schema({
    //platform Id
    platformId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // order number to decide the display sequence
    orderNo: {type: Number, min: 0, default: 0, required: true},
    //advertisement code
    advertisementCode: {type: String, required: true},
    //title(s) to display in the advertisement
    title: [],
    //background banner image
    backgroundBannerImage: {
        url: {type: String},
        hyperLink: {type: String},
    },
    //button link(s)
    imageButton: [],
    // input device that using this advertisement
    inputDevice: Number,
    status: {type: Number, default: 0, required: true},
});

module.exports = playerPageAdvertisementInfoSchema;