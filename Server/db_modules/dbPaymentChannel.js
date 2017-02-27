/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var dbconfig = require('./../modules/dbproperties');

var dbPaymentChannel = {

    /**
     * Create a new PaymentChannel
     * @param {json} data - The data of the PaymentChannel. Refer to PaymentChannel schema.
     */
    createPaymentChannel: function (paymentChannelData) {
        var PaymentChannel = new dbconfig.collection_paymentChannel(paymentChannelData);
        return PaymentChannel.save();
    },

    /**
     * Update a PaymentChannel information
     * @param {String}  query - The query string
     * @param {string} updateData - The update data string
     */
    updatePaymentChannel: function (query, updateData) {
        return dbconfig.collection_paymentChannel.findOneAndUpdate(query, updateData);
    },
    /**
     * Get PaymentChannel information
     * @param {String}  query - The query string
     */
    getPaymentChannel: function (query) {
        return dbconfig.collection_paymentChannel.findOne(query);
    },

    /**
     * Delete PaymentChannel information
     * @param {String}  - ObjectId of the PaymentChannel
     */
    deletePaymentChannel: function (paymentChannelObjId) {
        return dbconfig.collection_paymentChannel.remove({channelId: paymentChannelObjId});
    },

    /**
     * Get the information of all the player levels
     */
    getAllPaymentChannels: function () {
        return dbconfig.collection_paymentChannel.find({});
    }
};

module.exports = dbPaymentChannel;