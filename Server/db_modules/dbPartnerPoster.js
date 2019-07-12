"use strict";

let dbPartnerPosterFunc = function () {
};
module.exports = new dbPartnerPosterFunc();

const rp = require("request-promise");
const qr = require("qrcode");
const canvas = require("canvas");
const sharp = require("sharp");
const dbconfig = require("./../modules/dbproperties");

let dbPartnerPoster = {
    async bindQrDataToPoster(posterUrl, data, x=236, y=923) {
        let posterBuffer = await rp.get({
            url: posterUrl,
            encoding: null
        });

        let qrCanvas = await dbPartnerPoster.getQrInCanvas(data, 275);
        let qrBuffer = qrCanvas.toBuffer();
        let qrB64 = qrCanvas.toDataURL();

        let completePosterBuffer = await sharp(posterBuffer)
            .composite([{input: qrBuffer, top: y, left: x}])
            .png()
            .toBuffer();

        return {
            qrcode: qrB64,
            poster: 'data:image/png;base64,' + completePosterBuffer.toString('base64')
        };
    },

    getQrInCanvas(data, size, errorCorrectionLevel = 'M') {
        let responded = false;
        return new Promise((res, rej) => {
            let qrCanvas = canvas.createCanvas(size, size);

            qr.toCanvas(qrCanvas, data, {
                errorCorrectionLevel: errorCorrectionLevel,
                width: size
            }, function (err) {
                responded = true;
                if (err) {
                    console.error('getQrInBuffer err', err);
                    rej(err);
                    return;
                }

                if (!qrCanvas || !qrCanvas.toBuffer) {
                    console.error('qrCanvas dont have buffer', qrCanvas)
                    rej({message: 'qrCanvas dont have buffer'});
                    return;
                }

                res(qrCanvas);
            });
        });
    },

    async getPartnerPoster (platformId, url, device, production = true) {
        let platform = await dbconfig.collection_platform.findOne({platformId}, {_id: 1}).lean();
        if (!platform) {
            return Promise.reject({message: "Platform does not exist"});
        }

        production = Boolean(production);

        let query = {
            platform: platform._id,
            status: 1, // on
            showInRealServer: production
        };

        if ([0, 1].includes(device)) {
            query.targetDevice = device;
        }

        let posterUsed = await dbconfig.collection_partnerPosterAdsConfig.find(query, {posterImage: 1}).sort({orderNo: 1}).limit(1).lean();

        if (!posterUsed || !posterUsed[0] || !posterUsed[0].posterImage) {
            return Promise.reject({message: "No relevant poster found. Please contact CS"}); // todo :: translate
        }

        posterUsed = posterUsed[0];

        return await dbPartnerPoster.bindQrDataToPoster(posterUsed.posterImage.url, url);
    }
};

let proto = dbPartnerPosterFunc.prototype;
proto = Object.assign(proto, dbPartnerPoster);
module.exports = dbPartnerPoster;