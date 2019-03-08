

let localStorageService = {
    logout: function () {
        localStorage.clear();
    },
    get: (key) => {
        return localStorage.getItem(key);
    },
    set: (key, value) => {
        return localStorage.setItem(key, value);
    },
    getJson: (key) => {
        return localStorage.getItem(JSON.parse(key));
    },
    setJson: (key, value) => {
        return localStorage.setItem(key, JSON.stringify(value));
    },
};

export default localStorageService;


// function isJson(str) {
//     try {
//         JSON.parse(str);
//     } catch (e) {
//         return false;
//     }
//     return true;
// }