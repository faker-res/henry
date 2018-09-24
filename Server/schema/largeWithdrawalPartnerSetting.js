let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let largeWithdrawalPartnerSettingSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // email name extension
    emailNameExtension: {type: String},
    // recipient
    recipient: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    // reviewer - people who can approve the withdrawal by email
    reviewer: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    // show real name
    showRealName: {type: Boolean, default: true},
    // show commission mode
    showCommissionType: {type: Boolean, default: true},
    // show bank city
    showBankCity: {type: Boolean, default: true},
    // show register time
    showRegisterTime: {type: Boolean, default: true},
    // show current withdrawal time
    showCurrentWithdrawalTime: {type: Boolean, default: true},
    // show last withdrawal time
    showLastWithdrawalTime: {type: Boolean, default: true},
    // show current credit (total credit = local credit + game credit)
    showCurrentCredit: {type: Boolean, default: true},
    // show total number of downline players
    showTotalDownlinePlayersCount: {type: Boolean, default: true},
    // show total number of  partners
    showTotalDownlinePartnersCount: {type: Boolean, default: true},
    // show partner all related proposals
    showAllPartnerRelatedProposal: {type: Boolean, default: true},
});

module.exports = largeWithdrawalPartnerSettingSchema;
