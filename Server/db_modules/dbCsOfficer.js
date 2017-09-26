const dbconfig = require('./../modules/dbproperties');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let dbCsOfficer = {

   createOfficer: function(platformId, name){
       return dbconfig.collection_csOfficer.findOne({platform: platformId, name: name}).lean().then(
           function (data) {
               if (data) {
                   return Promise.reject({
                       name: "DataError",
                       message: "Name already existed"
                   });
               }

               let newOfficer = dbconfig.collection_csOfficer({platform: platformId, name: name});
               return newOfficer.save();
           }
       );
   },

    addPromoteWay: function(name, platformId){
        return dbconfig.collection_csPromoteWay.findOne({name: name, platform: platformId}).lean().then(
            function (data) {
                if (data) {
                    return Promise.reject({
                        name: "DataError",
                        message: "Name already existed"
                    });
                }

                let newPromoteWay = dbconfig.collection_csPromoteWay({name: name, platform: platformId});
                return newPromoteWay.save();
            }
        );
    },

    getAllPromoteWay: (platformId) => {
        return dbconfig.collection_csPromoteWay.find({platform: platformId}, {url: 0}).sort({name: 1}).lean();
    },

    deletePromoteWay: (promoteWayId, platformId) => {
        return dbconfig.collection_csPromoteWay.remove({_id: promoteWayId, platform: platformId});
    },

    addUrl: (platformId, officerId, domain, way) => {
        let officerProm = dbconfig.collection_csOfficer.findOne({_id: officerId}).lean();
        let domainProm = dbconfig.collection_csOfficer.findOne({platform: platformId, "url.domain": {$in: [domain]}}).lean();

        return Promise.all([officerProm, domainProm]).then(
            data => {
                let officer = data[0];
                let domainExisted = data[1];
                if (!officer) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "No such customer service officer."
                    });
                }

                console.log('WALAO', domainExisted)
                if (domainExisted) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "Url already existed."
                    });
                }

                let newUrl = {_id: ObjectId(), domain: domain, way: way, createTime: new Date()};

                return dbconfig.collection_csOfficer.findOneAndUpdate({_id: officerId}, {$push: {url: newUrl}});
            }
        )
    },

    getAllUrl: (platformId) => {
        return dbconfig.collection_csOfficer.aggregate([
            {$match: {platform: ObjectId(platformId)}},
            {$unwind: "$url"},
            {$sort: {"url.createTime": -1}}
        ]);
    },

    getAllOfficer: (platformId) => {
        return dbconfig.collection_csOfficer.find({platform: platformId}).sort({name: 1}).lean();
    },

    updateUrl: (urlId, domain, officerId, way) => {
        return dbconfig.collection_csOfficer.aggregate([
            {$unwind: "$url"},
            {$match: {"url._id": ObjectId(urlId)}}
        ]).then(
            data => {
                if (!data || data.length === 0) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "No such url."
                    });
                }

                let urlData = data[0];

                return officerId.toString() !== urlData._id.toString()
                    ? updateUrlWithOfficerChange(urlId, domain, officerId, way, urlData.createTime)
                    : updateUrlWithoutOfficerChange(urlId, domain, officerId, way);
            }
        );
    },

    deleteUrl: (urlId) => {
        return dbconfig.collection_csOfficer.findOneAndUpdate(
            {"url._id": urlId},
            {$pull: {url: {_id: urlId}}}
        ).lean();
    },

    deleteOfficer: (officerId) => {
        return dbconfig.collection_csOfficer.remove({_id: officerId});
    }

};

function updateUrlWithOfficerChange(urlId, domain, officerId, way, createTime) {
    return dbconfig.collection_csOfficer.update(
        {"url._id": urlId},
        {$pull: {url: {_id: urlId}}}
    ).then(
        () =>{
            return dbconfig.collection_csOfficer.findOneAndUpdate(
                {_id: officerId},
                {$push: {url: {_id: ObjectId(urlId), domain: domain, way:way, createTime: createTime}}}
            ).lean();
        }
    );
}

function updateUrlWithoutOfficerChange(urlId, domain, officerId, way) {
    let query = {
        _id: officerId,
        "url._id": urlId
    };
    return dbconfig.collection_csOfficer.findOneAndUpdate(query, {$set: {"url.$.domain": domain, "url.$.way": way}}).lean();
}

module.exports = dbCsOfficer;