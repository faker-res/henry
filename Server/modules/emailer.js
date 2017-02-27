const Q = require("q");
const nodemailer = require('nodemailer');
// If we want advanced templates, we could consider: https://github.com/niftylettuce/node-email-templates

// See: https://nodemailer.com/2-0-0-beta/setup-smtp/
//const transporter = nodemailer.createTransport('smtps://user%40gmail.com:pass@smtp.gmail.com');
//const transporter = nodemailer.createTransport({
//    transport: 'ses', // loads nodemailer-ses-transport
//    accessKeyId: 'AWSACCESSKEY',
//    secretAccessKey: 'AWS/Secret/key'
//});

const transporter = nodemailer.createTransport({pool: 4, direct: true});

// listen for token updates (if refreshToken is set)
// you probably want to store these to a db
// generator.on('token', function(token){
//     console.log('New token for %s: %s', token.user, token.accessToken);
// });

// login
// sample code for gmail smtp transport
// Ref::http://masashi-k.blogspot.sg/2013/06/sending-mail-with-gmail-using-xoauth2.html
// var xoauth2 = require('xoauth2');
// var transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         xoauth2: xoauth2.createXOAuth2Generator({
//             user: 'vincent.wenshuo@sinonet.sg',
//             clientId: '875240072451-4ougdlegbhjs22rc1e89vb59moemjqrk.apps.googleusercontent.com', //875240072451-4ougdlegbhjs22rc1e89vb59moemjqrk.apps.googleusercontent.com
//             clientSecret: '3DAxUFw-PSIwAhZMIc-nbdcy',
//             refreshToken: '1/rxICZrjUpr0beiU8zUar8nnmtHJD4YNaR5hlM4gn7DE',
//             accessToken: 'ya29.Ci9LA8LAfE6-8lHuBcmfi6TrsaZ5rURQSI3zZNb1gFXvTHUz2nRH8MSxC65Wz8gCpg'
//         })
//     }
// });

// This plugin will generate mailOptions.text if only mailOptions.html is provided.
var htmlToText = require('nodemailer-html-to-text').htmlToText;
transporter.use('compile', htmlToText({}));   // For options see: https://www.npmjs.com/package/html-to-text

/**
 * @param {Object} config
 * @param {String} config.sender - email address
 * @param {String} [config.replyTo] - optional email address
 * @param {String} config.recipient - email address
 * @param {String} config.subject
 * @param {String} config.body
 * @param {boolean} [config.isHTML] - Describes whether the body is HTML (otherwise plain text)
 * @returns {*}
 */
function sendEmail (config) {
    const mailOptions = {
        from: config.sender,
        to: config.recipient,
        replyTo: config.replyTo || config.sender,
        subject: config.subject
    };

    if (config.isHTML) {
        mailOptions.html = config.body;
    } else {
        mailOptions.text = config.body;
    }

    // send mail with defined transport object
    return Q.Promise(function (resolve, reject) {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
                if (info.accepted.length < 1 || info.rejected.length > 0 || info.errors.length > 0) {
                    // We may be interested in one of the arrays: info.rejected or info.errors.
                    errorUtils.reportError(info);
                    reject(info);
                } else {
                    resolve(info);
                }
            }
        });
    });
}

module.exports = {
    sendEmail: sendEmail
};