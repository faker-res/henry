var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;

var dbAuction = {
    /**
     * List All Auction Items
     */
    listAuctionItems: (query) => {
        return dbconfig.collection_auctionSystem.find(query).exec();
    },
    addAuctionItem: (data) => {
        return [];
    },
    loadAuctionItem: (id) => {
        return dbconfig.collection_auctionSystem.findOne({_id: ObjectId(id)}).exec();
    },
    updateAuctionItem: (data) => {
        return [];
    },
    moveTo: (data) => {

        let isActive;
        let proms = [];
        let updateData = {};
        if(data.direction == 'notAvailableItem'){
            updateData.publish = false; // let auction item inactive
        }else if(data.direction == 'exclusiveItem'){
            updateData.publish = true; // let auction item active
        }else if(data.direction == 'removeExclusiveAuction' || data.direction == 'removeNotAvailableAuction'){
            updateData.status = 0; // remove auction data
        }

        if(data.auctionItems && data.auctionItems.length > 0){
            let matchObj = {
                'platformObjId':ObjectId(data.platformId),
                '_id':{ $in: data.auctionItems }
            }
            return dbconfig.collection_auctionSystem.update(matchObj, updateData, {multi:true, new: true});
        };
    },
    isQualify: (data) => {
        return [];
        // return dbconfig.collection_auctions.find();
    },
    applyAuction: (data) =>{
        return [];
    },

    createAuctionProduct: function (auctionProduct) {
        return dbconfig.collection_auctionSystem(auctionProduct).save().then(
            data => {
                if (data) {
                    return JSON.parse(JSON.stringify(data));
                }
            },
            error => {
                return Promise.reject({name: "DBError", message: "Error creating auction product.", error: error});
            }
        );
    },
};

module.exports = dbAuction;
