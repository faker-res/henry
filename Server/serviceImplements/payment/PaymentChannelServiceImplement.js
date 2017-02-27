/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var WebSocketUtil = require("./../../server_common/WebSocketUtil");
var PaymentChannelService = require("./../../services/payment/PaymentServices").PaymentChannelService;
var dbPaymentChannel = require('./../../db_modules/dbPaymentChannel');
var constServerCode = require('./../../const/constServerCode');

var PaymentChannelServiceImplement = function () {
    PaymentChannelService.call(this);

    //add api handler
    this.add.expectsData = 'name: String';
    this.add.onRequest = function (wsFunc, conn, data) {
        // TODO add the mandatory fields later
        var isValidData = Boolean(data && data.name);
        WebSocketUtil.performAction(conn, wsFunc, data, dbPaymentChannel.createPaymentChannel, [data], isValidData);
    };

    //update api handler
    this.update.expectsData = 'channelId: String';
    this.update.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.channelId);
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPaymentChannel.updatePaymentChannel,
            [{channelId: data.channelId}, data], isValidData, true, true).then(
            function (dbdata) {
                if (dbdata) {
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        id: dbdata.channelId
                    });
                } else {
                    wsFunc.response(conn, {
                        status: constServerCode.SUCCESS,
                        message: "Cannot find specified payment channel."
                    });
                }
            },
            function (error) {
                if( error != "INVALID_DATA" ) {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    //delete api handler
    this.delete.expectsData = 'channelId: String';
    this.delete.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.channelId);
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPaymentChannel.deletePaymentChannel,
            [data.channelId], isValidData, true
        ).then(
            function (rdata) {
                if (rdata && rdata.result) {
                    if (rdata.result.n == 1) {
                        wsFunc.response(conn, {
                            status: constServerCode.SUCCESS,
                            paymentID: data.channelId
                        });
                    } else {
                        wsFunc.response(conn, {
                            status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY,
                            paymentID: data.channelId
                        });
                    }
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    //update status api handler
    this.changeStatus.expectsData = 'channelId: String, status: ?';
    this.changeStatus.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data && data.channelId && data.status);
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPaymentChannel.updatePaymentChannel,
            [{channelId: data.channelId}, {status: data.status}], isValidData, true, true).then(
            function (dbdata) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS,
                    id: dbdata.channelId
                });
            },
            function (error) {
                if( error != "INVALID_DATA" ) {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

    this.all.expectsData = '';
    this.all.onRequest = function (wsFunc, conn, data) {
        var isValidData = Boolean(data);
        WebSocketUtil.responsePromise(
            conn, wsFunc, data, dbPaymentChannel.getAllPaymentChannels,
            [{}], true, true, true).then(
            function (dbData) {
                wsFunc.response(conn, {
                    status: constServerCode.SUCCESS, data: dbData
                });
            },
            function (error) {
                if( error != "INVALID_DATA" ) {
                    wsFunc.response(conn, {
                        status: constServerCode.INVALID_PAYMENT_SERVICE_GATEWAY
                    });
                }
            }
        ).catch(WebSocketUtil.errorHandler).done();
    };

};

var proto = PaymentChannelServiceImplement.prototype = Object.create(PaymentChannelService.prototype);
proto.constructor = PaymentChannelServiceImplement;

module.exports = PaymentChannelServiceImplement;