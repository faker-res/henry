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
import level from './player/levelDoc.js';
import rewardPoint from './player/rewardPointDoc.js';
import loginLogoutPartner from './partner/loginDoc.js';
import commission from './partner/comissionDoc.js';
import partnerInformation from './partner/informationDoc.js';
import withdrawPartner from './partner/withdrawDoc.js';
import smsCodePartner from './partner/smsDoc.js';
import registerPartner from './partner/registerDoc.js';



let apiDoc = {
    guide,
    definition,
    player: {
        smsCode,
        information,
        level,
        register,
        reward,
        rewardPoint,
        withdraw,
        topup,
        loginLogout,
        consumption,
    },
    partner: {
        loginLogoutPartner,
        commission,
        partnerInformation,
        withdrawPartner,
        smsCodePartner,
        registerPartner
    },
    platform: {
    }
};

export default apiDoc;
