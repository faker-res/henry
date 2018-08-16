const dbconfig = require('./../modules/dbproperties');
let mongoose = require('mongoose');
var dbUtil = require('./../modules/dbutility');
let ObjectId = mongoose.Types.ObjectId;
var moment = require('moment-timezone');

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

        let urlExistProm = dbconfig.collection_csOfficerUrl.find({platform: platformId, domain: {$regex: "/^" + domain + "$/i"}}).count();

        return urlExistProm.then(
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
                    domain: domain,
                    way: way
                };

                let newUrl = dbconfig.collection_csOfficerUrl(newUrlData);
                return newUrl.save();
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

    domainValidityChecking: (urlId, platformId) => {

        if (urlId && platformId) {
            return dbconfig.collection_csOfficerUrl.findOne({_id: urlId}).then(urlData => {
                if (urlData && urlData.domain) {

                    let filteredDomain = dbUtil.getDomainName(urlData.domain);
                    while (filteredDomain.indexOf("/") != -1) {
                        filteredDomain = filteredDomain.replace("/", "");
                    }

                    if (filteredDomain.indexOf("?") != -1) {
                        filteredDomain = filteredDomain.split("?")[0];
                    }

                    if (filteredDomain.indexOf("#") != -1) {
                        filteredDomain = filteredDomain.split("#")[0];
                    }

                    let endTime = dbUtil.getTodaySGTime().endTime;
                    let startTime = moment(endTime).subtract(90, 'days').toDate();

                    return dbconfig.collection_players.find({
                        domain: filteredDomain,
                        platform: ObjectId(platformId),
                        registrationTime: {$gte: startTime, $lt: endTime}
                    }).lean().count();
                }
                else {
                    return Promise.reject({
                        name: "DataError",
                        message: "Can't get the domain."
                    });
                }
            })
        }
        else{
            return Promise.reject({
                name: "DataError",
                message: "Can't get the urlId or the platformId."
            });
        }
    },

    updateUrl: (urlId, domain, admin, way, platformId) => {
        // check if the url is valid to edit/delete
        return dbCsOfficer.domainValidityChecking(urlId, platformId).then( count => {
            if (count && count > 0){
                return Promise.reject({
                    name: "DataError",
                    message: "This domain is not allowed to delete nor edit as there is new registration within 90 days."
                })
            }
            else{
                return dbconfig.collection_csOfficerUrl.findOneAndUpdate({_id: urlId}, {domain, admin, way}).lean();
            }
        })
    },

    deleteUrl: (urlId, platformId) => {

        return dbCsOfficer.domainValidityChecking(urlId, platformId).then( count => {
            if (count && count > 0){
                return Promise.reject({
                    name: "DataError",
                    message: "This domain is not allowed to delete nor edit as there is new registration within 90 days."
                })
            }
            else{
                return dbconfig.collection_csOfficerUrl.remove({_id: urlId});
            }
        })
    },


};

module.exports = dbCsOfficer;
