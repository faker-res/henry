/******************************************************************
 *  Fantasy Player Management Tool
 *  Copyright (C) 2015-2017 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/
'use strict';

let dbconfig = require('./../modules/dbproperties');
let constSystemLogLevel = require('./../const/constSystemLogLevel');
let constSystemParam = require('./../const/constSystemParam');
let constShardKeys = require('../const/constShardKeys');

let dbGeoIp = {
    /**
     * Get the information of the admin user by adminName
     * @param {String} ipAddress - IP address in xxx.xxx.xxx.xxx
     */
    lookup: function (ipAddress) {
        let ipParts = ipAddress.split(".");
        let ipInt = 0;

        ipInt += parseInt(ipParts[0], 10) << 24;
        ipInt += parseInt(ipParts[1], 10) << 16;
        ipInt += parseInt(ipParts[2], 10) << 8;
        ipInt += parseInt(ipParts[3], 10);

        return dbconfig.collection_geoIp
            .findOne({ "ip_start_num": { $lt: ipInt }, "ip_end_num": { $gt: ipInt } });
    },

};

module.exports = dbGeoIp;