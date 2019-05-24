let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let commCalcPlayer = new Schema({
    // partner commission log object id
    commCalc: {type: Schema.ObjectId, ref: 'partnerCommissionLog', required: true, index: true},
    // parent object id
    parentObjId: {type: Schema.ObjectId},
    // parent name
    parentName: {type: String},
    // gross commission
    grossCommission: {type: Number},
    // nett commission
    nettCommission: {type: Number},

});

module.exports = commCalcPlayer;