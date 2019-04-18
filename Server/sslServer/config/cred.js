let savedCred = require('./key.json');

let credFunc = {
    getAdmin: (adminName) => {
        if (savedCred.name === adminName) {
            return savedCred;
        }

        return false;
    }
};

module.exports = credFunc;