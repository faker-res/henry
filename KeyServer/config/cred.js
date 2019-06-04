let crypto = require('crypto');
let rp = require('request-promise');
let keyAddress = require('./env').getKeyAddress();

let credFunc = {
    getAdminInfo: () => {
        return rp(keyAddress).then(
            data => {
                try {
                    return JSON.parse(data);
                } catch (e) {
                    return {}
                }
            }
        )
    },

    getAdmin: async (adminName) => {
        let savedCred = await credFunc.getAdminInfo();

        if (savedCred && savedCred.name === adminName) {
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