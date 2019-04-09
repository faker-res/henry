

let localStorageService = {
    logout: function () {
        localStorage.clear();
    },
    get: (key) => {
        let item = localStorage.getItem(key);
        if(isJson(item)){
            return JSON.parse(item);
        } else {
            return item;
        }
    },
    set: (key, value) => {
        console.log(value);
        console.log(isJson(value));
        if(isJson(value)) {
            return localStorage.setItem(key, JSON.stringify(value));
        } else {
            return localStorage.setItem(key, value);
        }
    },
};

export default localStorageService;

function isJson(str) {
    str = JSON.stringify(str);
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}
// let get = (key) => {
//     return localStorage.getItem(key);
// }
// let set = (key, value) => {
//     return localStorage.setItem(key, value);
// }
// let getJson = (key) => {
//     return JSON.parse(localStorage.getItem(key));
// }
// let setJson = (key, value) => {
//     return localStorage.setItem(key, JSON.stringify(value));
// }