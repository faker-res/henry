import guide from './userGuide.js';
import definition from './definition.js';

import loginLogout from './player/loginDoc.js';
import topup from './player/topupDoc.js';
import reward from './player/rewardDoc.js';
import consumption from './player/consumptionDoc.js';
import register from './player/registerDoc.js';

let apiDoc = {
    guide,
    definition,
    player: {
        loginLogout,
        topup,
        reward,
        consumption,
        register,
    },
    partner: {
    },
    platform: {
    }
};

export default apiDoc;
