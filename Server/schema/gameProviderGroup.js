let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let gameProviderGroupSchema = new Schema({
    // Platform object ID
    platform: {type: Schema.ObjectId, required: true, index: true},
    // Self defined provider group id
    providerGroupId: {type: Number},
    // Game group name
    name: {type: String, index: true},
    // Game providers
    providers: [{type: Schema.ObjectId}],
    // for Ebet wallet use (refer constEbetWallet.js)
    ebetWallet: {type: Number},
});

module.exports = gameProviderGroupSchema;
