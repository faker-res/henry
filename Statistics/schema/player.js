
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var SALT_WORK_FACTOR = 10;
var Schema = mongoose.Schema;

var playerSchema = new Schema({

    playerId: {type: String, unique: true, required: true, index: {unique: true}},
    email: {type: String},
    password: {type: String, required: true},
    firstName: String,
    lastName: String,
    displayName: String,
    bonus: {type: Number, default: 0},
    balance: {type: Number, default: 0},
    //date of birth
    dob: {type: Date},
    //platform info, ios, android, web(ie, chrome etc)
    platform: {type: String, default: "ios"},
    //Registration data
    registrationTime: {type: Date, default: Date.now},
    //last access time
    lastAccessTime: {type: Date, default: Date.now}

});

/*
 The User model should fully encapsulate the password encryption and verification logic
 The User model should ensure that the password is always encrypted before saving
 The User model should be resistant to program logic errors, like double-encrypting the password on user updates
 bcrypt interactions should be performed asynchronously to avoid blocking the event loop (bcrypt also exposes a synchronous API)
 */
playerSchema.pre('save', function (next) {

    var player = this;
    if (!player.isModified('password')) {
        return next();
    }
    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) {
            return next(err);
        }
        bcrypt.hash(player.password, salt, function (err, hash) {
            if (err) {
                return next(err);
            }
            // override the cleartext password with the hashed one
            player.password = hash;
            next();
        });
    });
});

playerSchema.methods.comparePassword = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function (err, isMatch) {
        if (err) {
            return cb(err);
        }
        cb(null, isMatch);
    });
};

module.exports = playerSchema;