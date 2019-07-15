"use strict";

let dbPartnerPosterFunc = function () {
};
module.exports = new dbPartnerPosterFunc();

const rp = require("request-promise");
const qr = require("qrcode");
const canvas = require("canvas");
const sharp = require("sharp");
const math = require("mathjs");
const dbconfig = require("./../modules/dbproperties");

let dbPartnerPoster = {
    getTextCanvas (text, width = 634, height = 100, font = '25px "Microsoft YaHei"', style = "white") {
        let textCanvas = canvas.createCanvas(width, height);
        let ctx = textCanvas.getContext("2d");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = font;
        ctx.fillStyle = style;
        let midWidth = math.chain(width).divide(2).abs().done();
        let midHeight = math.chain(height).divide(2).abs().done();
        ctx.fillText(text, midWidth, midHeight);

        return textCanvas;
    },

    getQrInCanvas(data, size, errorCorrectionLevel = 'M') {
        let responded = false;
        return new Promise((res, rej) => {
            let qrCanvas = canvas.createCanvas(size, size);

            qr.toCanvas(qrCanvas, data, {
                errorCorrectionLevel: errorCorrectionLevel,
                margin: 1,
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

        let posterBuffer = await rp.get({
            url: posterUsed.posterImage.url,
            encoding: null
        });

        let textCanvas = dbPartnerPoster.getTextCanvas(`专属链接：${url}`);
        let textBuffer = textCanvas.toBuffer();

        let qrCanvas = await dbPartnerPoster.getQrInCanvas(url, 240);
        let qrBuffer = qrCanvas.toBuffer();
        let qrB64 = qrCanvas.toDataURL();

        let completePosterBuffer = await sharp(posterBuffer)
            .composite([
                {input: qrBuffer, top: 941, left: 254},
                {input: textBuffer, top: 1209, left: 58}
            ])
            .png()
            .toBuffer();

        return {
            qrcode: qrB64,
            poster: 'data:image/png;base64,' + completePosterBuffer.toString('base64')
        };
    }
};

let proto = dbPartnerPosterFunc.prototype;
proto = Object.assign(proto, dbPartnerPoster);
module.exports = dbPartnerPoster;