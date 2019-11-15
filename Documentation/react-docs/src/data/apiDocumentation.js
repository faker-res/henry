import guide from './userGuide.js';
import definition from './definition.js';
import login from './loginDoc.js';
import topup from './topupDoc.js';
import consumption from './consumptionDoc.js';

let apiDoc = {
    guide,
    definition,
    login,
    topup,
    consumption,
    reward: {
        name: "优惠",
    },
};

export default apiDoc;
