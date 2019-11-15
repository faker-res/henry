import guide from './userGuide.js';
import definition from './definition.js';
import login from './loginDoc.js';
import topup from './topupDoc.js';

let apiDoc = {
    guide,
    definition,
    login,
    topup,
    reward: {
        name: "优惠",
    },
    consumtion: {
        name: "投注",
    }
};

export default apiDoc;
