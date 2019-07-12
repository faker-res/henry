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

        let qrBuffer = await dbPartnerPoster.getQrInBuffer(data, 275);

        let completePosterBuffer = await sharp(posterBuffer)
            .composite([{input: qrBuffer, top: y, left: x}])
            .png()
            .toBuffer();

        return 'data:image/png;base64,' + completePosterBuffer.toString('base64');
    },

    getQrInBuffer(data, size, errorCorrectionLevel = 'M') {
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

                let buf = qrCanvas.toBuffer();
                res(buf);
            });
        });
    },
};

let proto = dbPartnerPosterFunc.prototype;
proto = Object.assign(proto, dbPartnerPoster);
module.exports = dbPartnerPoster;