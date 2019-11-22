import guide from './userGuide.js';
import definition from './definition.js';

import smsCode from './player/smsCodeDoc.js';
import information from './player/informationDoc.js';
import level from './player/levelDoc.js';
import register from './player/registerDoc.js';
import reward from './player/rewardDoc.js';
import rewardPoint from './player/rewardPointDoc.js';
import withdraw from './player/withdrawDoc.js';
import topup from './player/topupDoc.js';
import loginLogout from './player/loginDoc.js';
import consumption from './player/consumptionDoc.js';

import smsCodePartner from './partner/smsDoc.js';
import registerPartner from './partner/registerDoc.js';
import loginLogoutPartner from './partner/loginDoc.js';
import partnerInformation from './partner/informationDoc.js';
import commission from './partner/comissionDoc.js';
import withdrawPartner from './partner/withdrawDoc.js';

import InformationPlatform from './platform/informationDoc.js';



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
        smsCodePartner,
        registerPartner,
        loginLogoutPartner,
        partnerInformation,
        commission,
        withdrawPartner,
    },
    platform: {
        InformationPlatform,
    }
};

export default apiDoc;
