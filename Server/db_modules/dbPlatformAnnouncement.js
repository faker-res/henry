var constMessageType = require("../const/constMessageType");
var dbconfig = require('./../modules/dbproperties');
var Q = require("q");
var dbPlatform = require("./dbPlatform");

var dbPlatformAnnouncement = {

    /**
     * Create a new platform announcement
     * @param {json} data - The data of the platform announcement.  Refer to platformAnnouncement schema.
     */
    createPlatformAnnouncement: function (data) {
        var platformAnnouncement = new dbconfig.collection_platformAnnouncement(data);
        return platformAnnouncement.save();
    },

    /**
     * Get one platform announcement by query
     * @param {String} query
     */
    getPlatformAnnouncement: function (query) {
        return dbconfig.collection_platformAnnouncement.findOne(query).exec();
    },

    /**
     * Get multiple platform announcements by query
     * @param {String} query
     */
    getPlatformAnnouncements: function (query) {
        return dbconfig.collection_platformAnnouncement.find(query);
    },

    /**
     * Get all platform announcements for the platform specified by platformId
     * @param {json} query - query containing platformId, may optionally contain other search criteria to be applied to the announcements
     */
    getPlatformAnnouncementsByPlatformId: function (query) {
        var platformQuery = {platformId: query.platformId};
        return dbPlatform.getPlatform(platformQuery).then(
            (platform) => {
                var announcementQuery = Object.assign({}, query);
                delete announcementQuery.platformId;
                announcementQuery.platform = platform._id;
                return dbPlatformAnnouncement.getPlatformAnnouncements(announcementQuery);
            }
        ).then(
            ann => ann.sort((a, b) => a.order - b.order)
        );
    },

    /**
     * Update platform announcement
     * @param {String} query string
     * @param {JSON} updateData
     */
    updatePlatformAnnouncement: function (query, updateData) {
        return dbconfig.collection_platformAnnouncement.findOneAndUpdate(query, updateData);
    },

    /**
     * Remove platform announcements by id
     * @param {Array} ids
     */
    removePlatformAnnouncementsById: function (ids) {
        return dbconfig.collection_platformAnnouncement.remove({_id: {$in: ids}});
    }

};

module.exports = dbPlatformAnnouncement;