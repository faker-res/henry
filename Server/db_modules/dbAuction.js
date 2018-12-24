var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const ObjectId = mongoose.Types.ObjectId;

var dbAuction = {
    /**
     * List All Auction Items
     */
    listAuctionItems: (data) => {
        return [];
    },
    addAuctionItem: (data) => {
        return [];
    },
    editAuctionItem: (data) => {
        return [];
    },
    updateAuctionItem: (data) => {
        return [];
    },
}
module.exports = dbAuction;
