import guide from './userGuide.js';
import definition from './definition.js';

import loginLogout from './player/loginDoc.js';
import topup from './player/topupDoc.js';
import reward from './player/rewardDoc.js';
import consumption from './player/consumptionDoc.js';
import register from './player/registerDoc.js';
import smsCode from './player/smsCodeDoc.js';
import information from './player/informationDoc.js';
import withdraw from './player/withdrawDoc.js';

let apiDoc = {
    guide,
    definition,
    player: {
        loginLogout,
        topup,
        reward,
        consumption,
        register,
        smsCode,
        information,
        withdraw,
    },
    partner: {
    },
    platform: {
    }
};

export default apiDoc;
