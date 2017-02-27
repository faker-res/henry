const should = require('should');

const roleChecker = require('../modules/roleChecker');

const mockedSocket = {
    decoded_token: {
        adminName: "Test Admin"
    }
};

const testAccessPermissions = {
    Platform: {
        Platform: {
            Read: true
        }
    }
};

const mockedRoleChecker = {

    // Fake this function so that functions which call it will work, even without a real socket
    getAdminUserRoles: function (socket) {
        const roles = [
            {
                roleName: 'step1Role',
                icon: null,
                views: testAccessPermissions,
                users: [],
                departments: []
            }
        ];
        return Promise.resolve(roles);
    }

};
Object.setPrototypeOf(mockedRoleChecker, roleChecker);

describe("Test role checker", function () {

    it('should allow access to getAllPlatforms', function () {
        return mockedRoleChecker.isValid(mockedSocket, 'getAllPlatforms').then(
            (response) => {
                response.should.equal(true);
            }
        )
    });

    it('should deny access to updatePlatform', function () {
        return mockedRoleChecker.isValid(mockedSocket, 'updatePlatform').then(
            (response) => {
                response.should.equal(false);
            }
        )
    });

});