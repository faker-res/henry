import cookie from 'react-cookies';

const auth = {
    token: null,
    adminObjId: null,
    adminName: null,
    department: null,
    roleData: null,
    allActions: null,
    language: null
}

const authKey = {
    token: 'sinonet-mobile-token',
    adminObjId: 'sinonet-mobile-adminObjId',
    adminName: 'sinonet-mobile-adminName',
    policy: 'sinonet-mobile-role',
    department: 'sinonet-mobile-departments',
    language: 'sinonet-mobile-language',
    platformObjId: 'sinonet-mobile-platformObjId',
    socketUrl: 'sinonet-mobile-socketUrl',
}

let authService = {
    
    storeAuth: function(token, adminObjId, adminName, department, roleData, language, socketUrl, exp) {
        cookie.save(authKey.token, token, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.adminObjId, adminObjId, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.adminName, adminName, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.department, JSON.stringify(department), {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.language, language, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.platformObjId, "5733e26ef8c8a9355caf49d8", {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.socketUrl, socketUrl, {
            expires: exp,
            path: '/'
        });
        localStorage.setItem(authKey.policy, JSON.stringify(roleData));
        if (!auth.language) {
            auth.language = "zh_CN";
        }
        
        console.log(exp);
        console.table(cookie.loadAll());
    },

    isValid: function () {
        if (!auth.token) {
            auth.token = cookie.load(authKey.token);
        }
        if (!auth.adminObjId) {
            auth.adminObjId = cookie.load(authKey.adminObjId);
        }
        if (!auth.adminName) {
            auth.adminName = cookie.load(authKey.adminName);
        }
        if (!auth.roleData) {
            auth.roleData = localStorage.get(authKey.policy);
            auth.roleData = auth.roleData ? JSON.parse(authKey.roleData) : auth.roleData;
        }
        if (!auth.department) {
            auth.department = cookie.load(authKey.department);
            auth.department = auth.department ? JSON.parse(authKey.department) : auth.department;
        }
        if (!auth.language) {
            auth.language = cookie.load(authKey.language);
        }
        return (auth.token && auth.adminName && auth.department && auth.department.length > 0 && auth.roleData) ? true : false;
        //return (this.token && this.adminName && this.department && this.department.length > 0) ? true : false;
    },

    logout: function () {
        // remove cookies when logout
        cookie.remove(authKey.token);
        cookie.remove(authKey.adminObjId);
        cookie.remove(authKey.adminName);
        cookie.remove(authKey.policy);
        cookie.remove(authKey.department);
        cookie.remove(authKey.platformObjId);
        cookie.remove(authKey.socketUrl);

        localStorage.removeItem(authKey.policy);
    },

    getToken: () => {
        return cookie.load(authKey.token);
    },
    getSocketUrl: () => {
        console.log("socketUrl", cookie.load(authKey.socketUrl))
        return cookie.load(authKey.socketUrl);
    },
    getPlatformObjId: () => {
        return cookie.load(authKey.platformObjId);
    },
    getAdminObjId: () => {
        return cookie.load(authKey.adminObjId);
    },
};

export default authService;
