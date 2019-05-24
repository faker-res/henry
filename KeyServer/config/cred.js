let crypto = require('crypto');
let savedCred = require('./key.json');

let credFunc = {
    getAdmin: (adminName) => {
        if (savedCred.name === adminName) {
            return savedCred;
        }

        return false;
    },

    getHash: (msg) => {
        return crypto.createHash('md5').update(msg).digest("hex");
    },

    getCipherIV: (key, msg) => {
        let iv = crypto.randomBytes(16);
        let mykey = crypto.createCipheriv('aes-256-ctr', key, iv);
        let mystr = mykey.update(msg, 'utf8', 'hex');
        mystr += mykey.final('hex');
        return `${iv.toString('hex')}:${mystr}`;
    }
};

module.exports = credFunc;