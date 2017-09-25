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
               return newOfficer.save().then().catch(err => errorSavingLog(err, adminActionRecordData));
           }
       );
   }

    ////

    addUrl: (platformId, officerId, domain, way) => {
        let officerProm = dbconfig.collection_csOfficer.findOne({_id: officerId}).lean();
        let domainProm = dbconfig.collection_csOfficer.findOne({platform: platformId, "url.domain": {$in: [domain]}}).lean();

        return Promise.all([officerProm, domainProm]).then(
            data => {
                officer = data[0];
                domainExisted = data[1];
                if (!officer) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "No such customer service officer."
                    });
                }

                if (domainExisted) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "Url already existed."
                    });
                }

                let newUrl = {domain: domain, way: way};

                return dbconfig.collection_csOfficer.findOneAndUpdate({_id: officerId}, {$push: {url: newUrl}});
            }
        )
    },

    getAllUrl: (platformId) => {
        return dbconfig.collection_csOfficer.aggregate([
            {$match: {platform: platformId}},
            {$unwind: $url},
            {$sort: {createTime: -1}}
        ]);
    },

    getAllOfficer: (platformId) => {
        return dbconfig.collection_csOfficer.find({platform: platformId}, {url: 0}).lean();
    },

    updateUrl: (urlId, domain, officerId, way) => {
        return dbconfig.collection_csOfficer.aggregate([
            {$unwind: $url},
            {$match: {"url._id": ObjectId(urlId)}}
        ]).then(
            data => {
                if (!data || data[0]) {
                    return Promise.reject({
                        name: "DataError",
                        errorMessage: "No such url."
                    });
                }

                let urlData = data[0];

                return officerId.toString() !== urlData._id ? updateUrlWithOfficerChange(urlId, domain, officerId, way, urlData.createTime) : updateUrlWithoutOfficerChange(urlId, domain, officerId, way);
            }
        );
    },

    deleteUrl: (urlId) => {
        return dbconfig.collection_csOfficer.findOneAndUpdate(
            {},
            {$pull: {url: {_id: urlId}}}
        ).lean();
    },

    deleteOfficer: (officerId) => {
        return dbconfig.collection_csOfficer.remove({_id: officerId});
    }

};

function updateUrlWithOfficerChange(urlId, domain, officerId, way, createTime) {
    return dbconfig.collection_csOfficer.update(
        {},
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