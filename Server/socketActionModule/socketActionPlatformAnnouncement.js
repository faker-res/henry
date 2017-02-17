var socketUtil = require('./../modules/socketutility');
var dbPlatformAnnouncement = require('./../db_modules/dbPlatformAnnouncement');

function socketActionPlatformAnnouncement (socketIO, socket) {

    this.socketIO = socketIO;
    this.socket = socket;

    var self = this;
    this.actions = {
        /**
         * Create platform announcement
         *  @param {json} data - reward rule data
         */
        createPlatformAnnouncement: function createPlatformAnnouncement (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform && data.title && data.content && data.reach);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.createPlatformAnnouncement, [data], actionName, isValidData);
        },

        /**
         * Get one platform announcement
         * @param {json} data - data has to contain _id
         */
        getPlatformAnnouncementById: function getPlatformAnnouncementById (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._id);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.getPlatformAnnouncement, [data], actionName, isValidData);
        },

        /**
         * Get all platform announcements for platform
         * @param {json} data - data has to contain platform, may optionally contain other search criteria
         */
        getPlatformAnnouncements: function getPlatformAnnouncements (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platform);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.getPlatformAnnouncements, [data], actionName, isValidData);
        },

        /**
         * Get all platform announcements for the platform specified by platformId
         * @param {json} data - data has to contain platformId, may optionally contain other search criteria
         */
        getPlatformAnnouncementsByPlatformId: function getPlatformAnnouncementsByPlatformId (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.platformId);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.getPlatformAnnouncementsByPlatformId, [data], actionName, isValidData);
        },

        /**
         * Update one platform announcement
         *  @param {json} data - data has to contain query and updateData
         */
        updatePlatformAnnouncement: function updatePlatformAnnouncement (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data.query && data.updateData);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.updatePlatformAnnouncement, [data.query, data.updateData], actionName, isValidData);
        },

        /**
         * delete platform announcements by id
         * @param {json} data - data has to contain _ids
         */
        deletePlatformAnnouncementByIds: function deletePlatformAnnouncementByIds (data) {
            var actionName = arguments.callee.name;
            var isValidData = Boolean(data && data._ids);
            socketUtil.emitter(self.socket, dbPlatformAnnouncement.removePlatformAnnouncementsById, [data._ids], actionName, isValidData);
        }
    };
    socketActionPlatformAnnouncement.actions = this.actions;
}

module.exports = socketActionPlatformAnnouncement;