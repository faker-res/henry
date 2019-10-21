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
}

let authService = {
    
    storeAuth: function(token, adminObjId, adminName, department, roleData, language, exp) {
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
        cookie.save(authKey.policy, JSON.stringify(roleData), {
            expires: exp,
            path: '/'
        });
        if (!auth.language) {
            auth.language = "zh_CN";
        }
        // localStorage.setItem(authKey.policy, JSON.stringify(roleData));
        
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
            // auth.roleData = localStorage.get(authKey.policy);
            auth.roleData = cookie.load(authKey.policy);
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
        cookie.remove(authKey.language);
    },

    getToken: () => {
        return cookie.load(authKey.token);
    },
    getAdminObjId: () => {
        return cookie.load(authKey.adminObjId);
    },

    hasLogin: () => {
        console.log("hasLogin?");
        let token = authService.getToken();
        let adminObjId = authService.getAdminObjId();
        if(token && adminObjId){
            console.log("yes logged in");
            return true;
        } else {
            console.log("not logged in");
            return false;
        }
    },
};

export default authService;
