'use strict';

define([], function () {

    var authService = function () {

        this.token = null;
        this.adminId = null;
        this.adminName = null;
        this.department = null;
        this.roleData = null;
        this.allActions = null;
        this.language = null;

        this.cookieTokenKey = 'sinonet-management-token';
        this.cookieAdminIdKey = 'sinonet-management-adminId';
        this.cookieAdminNameKey = 'sinonet-management-adminName';
        this.cookiePolicyKey = 'sinonet-management-role';
        this.cookieDepartmentKey = 'sinonet-management-departments';
        this.cookieLanguageKey = 'sinonet-management-language';
        this.cookiePlatformKey = 'sinonet-management-platform';
        var self = this;

        this.$get = function () {
            return this;
        };

        //get all actions data from server
        // this.getAllActions = function ($socket) {
        //     var self = this;
        //     $socket.emit("getAllActions");
        //     $socket.once("_getAllActions", function (data) {
        //         if (data.success) {
        //             self.allActions = data.data;
        //         }
        //     });
        // }

        //get all actions data from server
        this.getAllActions = function ($socket, callback) {
            $socket.emit("getAllActions");
            $socket.once("_getAllActions", function (data) {
                if (data.success) {
                    self.allActions = data.data;
                    console.log("getAllActions", self.allActions);
                    if (callback) {
                        callback(data.data);
                    }
                }
            });
        };

        this.storeAuth = function ($cookies, localStorageService, token, adminId, adminName, department, roleData, language, exp) {
            $cookies.put(this.cookieTokenKey, token, {
                expires: exp,
                //secure: true
            });
            $cookies.put(this.cookieAdminIdKey, adminId, {
                expires: exp,
                //secure: true
            });
            $cookies.put(this.cookieAdminNameKey, adminName, {
                expires: exp,
                //secure: true
            });
            //$localStorage[this.cookiePolicyKey] = JSON.stringify(roleData);

            localStorageService.set(this.cookiePolicyKey, JSON.stringify(roleData));
            // $cookies.put(this.cookiePolicyKey, JSON.stringify(roleData), {
            //     expires: exp,
            //     //secure: true
            // });
            // Saving the department cookie can fail if the cookie size is > 1024 bytes.
            // This can happen if there are a lot of users listed.
            // So here we reduce the maximum number of users listed to 5.
            //department.forEach(dept => dept.users.length = Math.min(dept.users.length, 10));
            $cookies.put(this.cookieDepartmentKey, JSON.stringify(department), {
                expires: exp,
                //secure: true
            });
            if (!language) {
                language = "zh_CN";
            }
            $cookies.put(this.cookieLanguageKey, language, {
                expires: exp,
                //secure: true
            });

            $cookies.put(this.cookiePlatformKey, "XBet", {
                expires: exp
            });

        };

        this.updateLanguage = function ($cookies, language) {
            $cookies.put(this.cookieLanguageKey, language);
        };

        this.updatePlatform = function ($cookies, platform) {
            var exp = new Date();
            exp.setSeconds(exp.getSeconds() + 60 * 60 * 12);
            $cookies.put(this.cookiePlatformKey, platform, {
                expires: exp
            });
        };

        this.isValid = function ($cookies, localStorageService) {
            if (!this.token) {
                this.token = $cookies.get(this.cookieTokenKey);
            }
            if (!this.adminId) {
                this.adminId = $cookies.get(this.cookieAdminIdKey);
            }
            if (!this.adminName) {
                this.adminName = $cookies.get(this.cookieAdminNameKey);
            }
            if (!this.roleData) {
                this.roleData = localStorageService.get(this.cookiePolicyKey); //$cookies.get(this.cookiePolicyKey);
                this.roleData = this.roleData ? JSON.parse(this.roleData) : this.roleData;
            }
            if (!this.department) {
                this.department = $cookies.get(this.cookieDepartmentKey);
                this.department = this.department ? JSON.parse(this.department) : this.department;
            }
            if (!this.language) {
                this.language = $cookies.get(this.cookieLanguageKey);
            }
            return (this.token && this.adminName && this.department && this.department.length > 0 && this.roleData) ? true : false;
            //return (this.token && this.adminName && this.department && this.department.length > 0) ? true : false;
        };

        this.isAdmin = function () {
            for (var i = 0; i < this.department.length; i++) {
                if (!this.department[i].parent) {
                    return true;
                }
            }
            return false;
        };

        this.departmentId = function () {
            // console.log("this.department", this.department);
            return this.department.length > 0 ? this.department[0]._id : null;
        };

        this.logout = function ($cookies, localStorageService) {
            // remove cookies when logout
            $cookies.remove(this.cookieTokenKey);
            $cookies.remove(this.cookieAdminIdKey);
            $cookies.remove(this.cookieAdminNameKey);
            $cookies.remove(this.cookiePolicyKey);
            $cookies.remove(this.cookieDepartmentKey);
            $cookies.remove(this.cookiePlatformKey);
            $cookies.remove("platform");
            $cookies.remove("SRVNAME");

            localStorageService.remove(this.cookiePolicyKey);
        };

        this.checkViewPermission = function (category, subCategory, viewName) {
            if (this.roleData && this.roleData.length > 0) {
                for (var i = 0; i < this.roleData.length; i++) {
                    var views = this.roleData[i].views;
                    if (!views) {
                        continue;
                    }
                    //if views is all, means has all permissions
                    if (views["all"]) {
                        return true;
                    }

                    var categoryViews = views[category];
                    //if views category is all, means has all permissions for this category
                    //or it is header check
                    if ((categoryViews && categoryViews["all"]) || (categoryViews && !subCategory && !viewName)) {
                        return true;
                    }

                    if (subCategory && categoryViews) {
                        var subCategoryViews = categoryViews[subCategory];
                        //if views sub category is all, means has all permissions for this sub category
                        //or it is sub header check
                        if ((subCategoryViews && subCategoryViews["all"]) || (subCategoryViews && !viewName)) {
                            return true;
                        }
                        //check each views in sub category
                        if (subCategoryViews && viewName && subCategoryViews[viewName]) {
                            return true;
                        }
                    }

                    //for (var key in views) {
                    //    if (key == category && views[key] && views[key][viewName]) {
                    //        return true;
                    //    }
                }
            }
            return false
        };

        this.checkActionPermission = function (actionName) {

            var socketAction = actionName;
            var roles = self.roleData;
            var aclForAction = self.allActions ? self.allActions[socketAction] : null;

            // The following code is cloned from roleChecker.isValid():

            //console.log("[authService.js] action: %s aclForAction:", socketAction, aclForAction);

            if (!aclForAction) {
                // If there are no access rules for the requested action, then we should reject

                // @todo We should return false here, once we have set up ACLs for all the actions

                //console.warn("[authService.js] Nobody can call action '%s' because it has no access rules!  (Except for superuser.)  Please add '%s' to roleChecker.linkedViews.", socketAction, socketAction);
                //return false;

                console.warn("[authService.js] Everybody can call action '%s' because it has no access rules!  Please add '%s' to roleChecker.linkedViews.", socketAction, socketAction);
                return true;
            } else {
                // Check to see if one of the ACL requirements is satisfied by one of the user's roles
                for (var accessRule in aclForAction) {
                    var path = accessRule.split('.');
                    var category = path[0];
                    var section = path[1];
                    var permission = path[2];

                    //check roles actions data
                    for (var i = 0; i < roles.length; i++) {
                        //var actions = roles[i].actions;
                        var actions = roles[i].views;
                        if (!actions) {
                            continue;
                        }
                        //if actions is all, means has all permissions
                        if (actions["all"]) {
                            return true;
                        }

                        if (actions[category] && actions[category][section] && actions[category][section][permission]) {
                            //console.log("[authService.js] Admin '%s' has permission to call action '%s' by rule: %s", '___', socketAction, accessRule);
                            return true;
                        }
                    }
                }

                //console.warn("[authService.js] Rejecting request from admin '%s' to call action '%s'", socket && socket.decoded_token && socket.decoded_token.adminName, socketAction);
                return false;
            }
        };

        this.updateRoleDataFromServer = function ($scope, $cookies, $state) {
            $scope.AppSocket.emit("getFullAdminInfo", {adminName: this.adminName});
            var self = this;
            $scope.AppSocket.once("_getFullAdminInfo", function (data) {
                //update role data if role data is changed
                if (data && data.success && data.data.roles && (JSON.stringify(data.data.roles) !== JSON.stringify(self.roleData))) {
                    var exp = new Date();
                    //set token expiration time to be 5 hours from now(the same time on server)
                    exp.setSeconds(exp.getSeconds() + 60 * 60 * 5);
                    $cookies.put(self.cookiePolicyKey, JSON.stringify(data.data.roles), {
                        expires: exp,
                        //secure: true
                    });
                    self.roleData = data.data.roles;

                    //force page refresh when permission changed
                    $state.reload();
                }
            });
        };
    };

    var authApp = angular.module('authService', []);

    //Must be a provider since it will be injected into module.config()
    authApp.provider('authService', authService);

});
