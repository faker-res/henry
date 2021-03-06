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

    addUrl: (platformId, adminId, domain, way, creatorId) => {
        let urlExistProm = dbconfig.collection_csOfficerUrl.find({platform: platformId, domain: { $regex: domain, $options: 'i' }}).count();
        // domain: {$regex: "/" + domain + "/i"}}).count();
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
                    way: way,
                    lastEditor: ObjectId(creatorId),
                    lastUpdate: new Date()
                };

                let newUrl = dbconfig.collection_csOfficerUrl(newUrlData);
                return newUrl.save();
            }
        );
    },

    getAllUrl: () => {
        return dbconfig.collection_csOfficerUrl.find().populate({path: "admin", model: dbconfig.collection_admin}).populate({path: "platform", model: dbconfig.collection_platform}).populate({path: "lastEditor", model: dbconfig.collection_admin}).lean();
    },

    searchUrl: (platforms, domain, admin, way) => {
        let query = {};
        if( platforms && platforms.length > 0 ) {
            query.platform = { $in: platforms };
        }
        domain ? query.domain = new RegExp('.*' + domain + '.*') : "";
        way ? query.way = way : "";

        return dbconfig.collection_csOfficerUrl.find(query).populate({path: "admin", model: dbconfig.collection_admin}).populate({path: "platform", model: dbconfig.collection_platform}).populate({path: "lastEditor", model: dbconfig.collection_admin}).lean()
        .then(data => {
            let result = [];
            if (!admin) {
                result = data;
            } else {
                data.forEach( item => {
                    if (item.admin && item.admin.adminName == admin) {
                        result.push(item);
                    }
                })
            }
            return result;
        });
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
                        domain: {$regex: filteredDomain, $options: "xi"},
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

    updateUrl: (urlId, domain, admin, way, platform, ignoreChecking, lastEditor) => {
        let lastUpdate;
        if (ignoreChecking){
            lastUpdate = new Date();
            return dbconfig.collection_csOfficerUrl.findOneAndUpdate({_id: urlId}, {domain, admin, way, lastEditor, lastUpdate, platform}).lean();
        }
        else{
            return dbconfig.collection_csOfficerUrl.find({ domain: domain }).lean()
            .then(
                csOfficer => {

                    if ( csOfficer.length > 1) {
                        return Promise.reject({
                            name: "DataError",
                            message: "Duplicate Assign Domain Name"
                        })
                    } else if (csOfficer.length == 1) {
                        let selectedCSOfficer = csOfficer.filter(item => {
                            return item._id.equals(urlId);
                        });
                        selectedCSOfficer = (selectedCSOfficer && selectedCSOfficer[0]) ? selectedCSOfficer[0] : null;
                        if (!selectedCSOfficer) {
                            return Promise.reject({
                                name: "DataError",
                                message: "Duplicate Assign Domain Name"
                            })
                        }
                    }
                    return dbCsOfficer.domainValidityChecking(urlId, platform)
            })
            .then(
                count => {
                    if (count && count > 0){
                        return Promise.reject({
                            name: "DataError",
                            message: "This domain is not allowed to delete nor edit as there is new registration within 90 days."
                        })
                    }
                    else{
                        lastUpdate = new Date();
                        return dbconfig.collection_csOfficerUrl.findOneAndUpdate({_id: urlId}, {domain, admin, way, lastEditor, lastUpdate, platform}).lean();
                    }
                })
        }

    },

    deleteUrl: (urlId, platformId, ignoreChecking) => {

        if (ignoreChecking){
            return dbconfig.collection_csOfficerUrl.remove({_id: urlId});
        }
        else{
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
        }
    },


};

module.exports = dbCsOfficer;
