import guide from './userGuide.js';
import definition from './definition.js';
import login from './loginDoc.js';
import topup from './topupDoc.js';
import consumtion from './consumtionDoc.js';

let apiDoc = {
    guide,
    definition,
    login,
    topup,
    consumtion,
    reward: {
        name: "优惠",
    },
};

export default apiDoc;
