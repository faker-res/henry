var dbconfig = require('./../modules/dbproperties');
var mongoose = require('mongoose');
const dbProposal = require('./../db_modules/dbProposal');
const dbPlayerInfo = require('./../db_modules/dbPlayerInfo');
const ObjectId = mongoose.Types.ObjectId;

var dbAuction = {
    /**
     * List All Auction Items
     */
    listAuctionItems: (data) => {
        return dbconfig.collection_auctionSystem.find(data).exec();
    },
    addAuctionItem: (data) => {
        return [];
    },
    loadAuctionItem: (id) => {
        return dbconfig.collection_auctionSystem.findOne({_id: ObjectId(id)}).exec();
    }
    updateAuctionItem: (data) => {
        return [];
    },
    moveTo: (data) => {

        let isActive;
        let proms = [];
        let updateData = {};
        if(data.direction == 'notAvailableItem'){
            updateData.isActive = 0; // let auction item inactive
        }else if(data.direction == 'exclusiveItem'){
            updateData.isActive = 1; // let auction item active
        }else if(data.direction == 'removeExclusiveAuction' || data.direction == 'removeNotAvailableAuction'){
            updateData.status = 0; // remove auction data
        }

        if(data.auctionItems && data.auctionItems.length > 0){
            data.auctionItems.forEach(item=>{
              let matchObj = {
                  'platformObjId':data.platformObjId,
                  '_id':item
              }
              let prom = [];
               //dbconfig.collection_auctionSystem.findOneAndUpdate(matchObj, updateData);
              proms.push(prom);
            })
        };
        return Promise.all([proms]).then(
            data=>{
                return data;
            }
        )
    },
    isQualify: (data) => {
        return [];
        // return dbconfig.collection_auctions.find();
    },
    applyAuction: (data) =>{
        return [];
    }
}
module.exports = dbAuction;
