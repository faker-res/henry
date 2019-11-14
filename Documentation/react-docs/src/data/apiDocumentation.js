import login from './loginDoc.js';
import topup from './topupDoc.js';

let apiDoc = {
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
