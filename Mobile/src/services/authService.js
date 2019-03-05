import $ from 'jquery';
import cookie from 'react-cookies';

const auth = {
    token: null,
    adminId: null,
    adminName: null,
    department: null,
    roleData: null,
    allActions: null,
    language: null
}

const authKey = {
    token: 'sinonet-management-token',
    adminId: 'sinonet-management-adminId',
    adminName: 'sinonet-management-adminName',
    policy: 'sinonet-management-role',
    department: 'sinonet-management-departments',
    language: 'sinonet-management-language',
    platform: 'sinonet-management-platform',
    socketUrl: 'sinonet-management-socketUrl',
}

let authService = {
    
    storeAuth: function(token, adminId, adminName, department, roleData, language, socketUrl, exp) {
        cookie.save(authKey.token, token, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.adminId, adminId, {
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
        cookie.save(authKey.platform, "5733e26ef8c8a9355caf49d8", {
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
        if (!auth.adminId) {
            auth.adminId = cookie.load(authKey.adminId);
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
        $.removeCookie(authKey.token);
        $.removeCookie(authKey.adminId);
        $.removeCookie(authKey.adminName);
        $.removeCookie(authKey.policy);
        $.removeCookie(authKey.department);
        $.removeCookie(authKey.platform);
        $.removeCookie("platform");
        $.removeCookie("SRVNAME");

        localStorage.remove(authKey.policy);
    },

    getToken: () => {
        return cookie.load(authKey.token);
    },
    getSocketUrl: () => {
        return cookie.load(authKey.socketUrl);
    },
    getPlatform: () => {
        return cookie.load(authKey.platform);
    },
};

export default authService;
