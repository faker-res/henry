const dbconfig = require('./../modules/dbproperties');
let mongoose = require('mongoose');
let ObjectId = mongoose.Types.ObjectId;

let dbCsOfficer = {

    addPromoteWay: function (name, platformId) {
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

    addUrl: (platformId, adminId, domain, way) => {
        let urlExistProm = dbconfig.collection_csOfficerUrl.find({platform: platformId, domain: domain}).count();

        urlExistProm.then(
            urlIsExist => {
                if (urlIsExist) {
                    return Promise.reject({
                        name: "DataError",
                        message: "URL already existed"
                    });
                }

                let newUrlData = {
                    platform: platformId,
                    admin: adminId,
                    domain,
                    way
                };

                let newUrl = dbconfig.collection_csOfficerUrl(newUrlData);
                return newUrl.save().then(data => data, error => Promise.reject(error));
            }
        );
    },

    getAllUrl: (platformId) => {
        return dbconfig.collection_csOfficerUrl.find({platform: platformId}).lean();
    },

    searchUrl: (platform, domain, admin, way) => {
        let query = {platform: ObjectId(platform)};
        domain ? query.domain = new RegExp('.*' + domain + '.*') : "";
        admin ? query.admin = admin : "";
        way ? query.way = way : "";
        return dbconfig.collection_csOfficerUrl.find(query).lean();
    },

    updateUrl: (urlId, domain, admin, way) => {
        return dbconfig.collection_csOfficerUrl.findOneAndUpdate({_id: urlId}, {domain, admin, way}).lean();
    },

    deleteUrl: (urlId) => {
        return dbconfig.collection_csOfficerUrl.remove({_id: urlId});
    },

};

module.exports = dbCsOfficer;