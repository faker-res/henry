'use strict';

var gulp = require('gulp');
var gulpNgConfig = require('gulp-ng-config');

var configureSetup = {
    createModule: true,
    constants: {
        "CONFIG": {
            NODE_ENV: process.env.NODE_ENV,
        }
    }
};

gulp.task('config', function () {
    gulp.src('config.json')
        .pipe(gulpNgConfig('myApp', configureSetup))
        .pipe(gulp.dest('public/js'));
});

var rimraf = require("gulp-rimraf"),
    concat = require("gulp-concat"),
    cssmin = require("gulp-cssmin"),
    uglify = require("gulp-uglify"),
    gutil = require('gulp-util'),
    pump = require('pump');

var webroot = "./";

var paths = {
    js: webroot + "bower_components/**/*.js",
    minJs: webroot + "bower_components/**/*.min.js",
    css: webroot + "css/**/*.css",
    minCss: webroot + "css/**/*.min.css",
    concatJsDest: webroot + "site.min.js",
    concatCssDest: webroot + "site.min.css"
};

gulp.task("cleanCss", function (cb) {
    return gulp.src("./public/css/site*.min.css", {
            read: false
        })
        .pipe(rimraf({
            force: true
        }));
});

gulp.task("clean", ["cleanCss"]);

// gulp.task("testMinJs1", function () {
//     return gulp.src(["./bower_components/jquery/dist/jquery.min.js",
//             "./bower_components/**/*.min.js",
//             "./bower_components/**/dist/*.min.js",
//             "./bower_components/Flot/jquery.flot.js",
//             "./bower_components/Flot/jquery.*.js",
//             "./bower_components/Flot/jquery.*.*.js",
//             "./bower_components/**/js/*.min.js",
//             "./bower_components/multiple-select/multiple-select.js",
//             "!./bower_components/multiple-select/docs/**",
//             "!./bower_components/multiple-select/demos/**",
//             "!./bower_components/bootstrap/dist/js/*"
//         ])
//         //.pipe(concat("site.min.js"))
//         // .pipe(uglify())
//         .on('error', function (err) {
//             gutil.log(gutil.colors.red('[Error]'), err.toString());
//         })
//         .pipe(gulp.dest("testMinJs1"));
// });

// gulp.task("testMinJs2", function () {
//     return gulp.src(["./public/sb-admin-2/**/*.min.js",
//             "./public/sb-admin-2/**/**/*.min.js",
//             "./public/sb-admin-2/**/**/**/*.min.js",
//             "!./public/sb-admin-2/**/sb-admin-2.js",
//             "!./public/sb-admin-2/**/bootstrap-datetimepicker.min.js",
//             "!./public/sb-admin-2/**/plugins/flot/*",
//             "!./public/sb-admin-2/**/plugins/morris/*",
//         ], {
//             base: "."
//         })
//         //.pipe(concat("site2.min.js"))
//         // .pipe(uglify())
//         .on('error', function (err) {
//             gutil.log(gutil.colors.red('[Error]'), err.toString());
//         })
//         .pipe(gulp.dest("testMinJs2"));
// });

gulp.task("minJs1", function () {
    return gulp.src(["./bower_components/jquery/dist/jquery.min.js",
            "./bower_components/**/*.min.js",
            "./bower_components/**/dist/*.min.js",
            "./bower_components/Flot/jquery.flot.js",
            "./bower_components/Flot/jquery.*.js",
            "./bower_components/Flot/jquery.*.*.js",
            "./bower_components/**/js/*.min.js",
            "./bower_components/multiple-select/multiple-select.js",
            "!./bower_components/multiple-select/docs/**",
            "!./bower_components/multiple-select/demos/**",
            "!./bower_components/bootstrap/dist/js/*"
        ], {
            base: "."
        })
        .pipe(concat("site.min.js"))
        .pipe(uglify())
        .on('error', function (err) {
            gutil.log(gutil.colors.red('[Error]'), err.toString());
        })
        .pipe(gulp.dest("./"));
});

gulp.task("minJs2", function () {
    return gulp.src(["./public/sb-admin-2/**/*.min.js",
            "./public/sb-admin-2/**/**/*.min.js",
            "./public/sb-admin-2/**/**/**/*.min.js",
            "./public/sb-admin-2/**/sb-admin-2.js",
            "!./public/sb-admin-2/**/bootstrap-datetimepicker.min.js",
            "!./public/sb-admin-2/**/plugins/flot/*",
            "!./public/sb-admin-2/**/plugins/morris/*",
        ], {
            base: "."
        })
        .pipe(concat("site2.min.js"))
        .pipe(uglify())
        .on('error', function (err) {
            gutil.log(gutil.colors.red('[Error]'), err.toString());
        })
        .pipe(gulp.dest("."));
});

gulp.task("minCss1", function () {
    return gulp.src(["./bower_components/**/*.min.css", "./bower_components/**/dist/*.min.css", "./bower_components/**/css/*.min.css", "./bower_components/multiple-select/*.css", "!./bower_components/bootstrap/**"])
        .pipe(concat("site.min.css"))
        // .pipe(cssmin())
        .pipe(gulp.dest("."));
});

gulp.task("minCss2", function () {
    return gulp.src(["./public/sb-admin-2/**/*.min.css",
            "./public/sb-admin-2/**/**/*.min.css",
            "./public/sb-admin-2/**/**/**/*.min.css",
            "./public/sb-admin-2/css/sb-admin-2.css",
            "./public/sb-admin-2/css/plugins/*.css",
            "!./public/sb-admin-2/css/plugins/dataTables.bootstrap.css"
        ])
        .pipe(concat("site2.min.css"))
        // .pipe(cssmin())
        .pipe(gulp.dest("."));
});

gulp.task("minCss3", function () {
    return gulp.src(["./public/css/*.css",
            "./public/css/analysis.css",
            "./public/css/bootstrap-slider.css",
            "./public/css/ng-table.css"
        ])
        .pipe(concat("site3.min.css"))
        // .pipe(cssmin())
        .pipe(gulp.dest("."));
});

gulp.task('default', ["minJs1", "minJs2", "minCss1", "minCss2", "minCss3"], function () {
    gulp.src(["site.min.js"])
        .pipe(gulp.dest('public/js/lib/'));

    gulp.src(["site2.min.js"])
        .pipe(gulp.dest('public/js/lib/'));

    gulp.src(["site.min.css"])
        .pipe(gulp.dest('public/css/'));

    gulp.src(["site2.min.css"])
        .pipe(gulp.dest('public/css/'));

    gulp.src(["site3.min.css"])
        .pipe(gulp.dest('public/css/'));

    gulp.src(["./public/sb-admin-2/fonts/*"])
        .pipe(gulp.dest('./public/fonts/'));

    gulp.src(["./public/sb-admin-2/font-awesome-4.6.3/fonts/*"])
        .pipe(gulp.dest('./public/fonts/'));

    gulp.src(["./bower_components/multiple-select/multiple-select.png"])
        .pipe(gulp.dest('public/css/'));
});