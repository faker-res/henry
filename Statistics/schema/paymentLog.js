var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var paymentLogSchema = new Schema({

    //player id
    playerId: {type: String, required: true},
    // payment ID
    paymentID: {type: String, required: true},
    // payment time
    paymentTime: {type: Date, default: Date.now},
    //platform info
    platform: {type: String, required: true},
    //numerical value of hte amount top-upped
    paymentAmount: {type: Number, required: true, default: 0},
    //numerical value of hte amount top-upped
    paymentCurrency: {type: String, required: true, default: 0},
    //paid through Visa. mastercard, paypal etc..
    paymentType: {type: String, required: true, default: 0}

});

module.exports = paymentLogSchema;