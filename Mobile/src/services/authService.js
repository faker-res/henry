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
    cookieTokenKey: 'sinonet-management-token',
    cookieAdminIdKey: 'sinonet-management-adminId',
    cookieAdminNameKey: 'sinonet-management-adminName',
    cookiePolicyKey: 'sinonet-management-role',
    cookieDepartmentKey: 'sinonet-management-departments',
    cookieLanguageKey: 'sinonet-management-language',
    cookiePlatformKey: 'sinonet-management-platform'
}

let authService = {
    
    storeAuth: function(token, adminId, adminName, department, roleData, language, exp) {
        cookie.save(authKey.cookieTokenKey, token, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.cookieAdminIdKey, adminId, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.cookieAdminNameKey, adminName, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.cookieDepartmentKey, JSON.stringify(department), {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.cookieLanguageKey, language, {
            expires: exp,
            path: '/'
        });
        cookie.save(authKey.cookiePlatformKey, "XBet", {
            expires: exp,
            path: '/'
        });
        localStorage.setItem(authKey.cookiePolicyKey, JSON.stringify(roleData));
        if (!auth.language) {
            auth.language = "zh_CN";
        }
        
        console.log(exp);
        console.table(cookie.loadAll());
    },

    logout: function () {
        // remove cookies when logout
        $.removeCookie(authKey.cookieTokenKey);
        $.removeCookie(authKey.cookieAdminIdKey);
        $.removeCookie(authKey.cookieAdminNameKey);
        $.removeCookie(authKey.cookiePolicyKey);
        $.removeCookie(authKey.cookieDepartmentKey);
        $.removeCookie(authKey.cookiePlatformKey);
        $.removeCookie("platform");
        $.removeCookie("SRVNAME");

        localStorage.remove(authKey.cookiePolicyKey);
    },
};

export default authService;
