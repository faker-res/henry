'use strict';

var gulp = require('gulp');
var gulpNgConfig = require('gulp-ng-config');

var configureSetup  = {
  createModule: true,
  constants: {
    "CONFIG" : {
      NODE_ENV: process.env.NODE_ENV,
    }
  }
};

gulp.task('config', function() {
  gulp.src('config.json')
      .pipe(gulpNgConfig('myApp', configureSetup))
      .pipe(gulp.dest('public/js'));
});

var rimraf = require("rimraf"),
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

gulp.task("clean:js", function (cb) {
    rimraf(paths.concatJsDest, cb);
});

gulp.task("clean:css", function (cb) {
    rimraf(paths.concatCssDest, cb);
});

gulp.task("clean", ["clean:js", "clean:css"]);

gulp.task("minJs1", function () {
    return gulp.src(["./bower_components/jquery/dist/jquery.min.js","./bower_components/**/*.min.js","./bower_components/**/dist/*.min.js","./bower_components/Flot/jquery.flot.js","./bower_components/Flot/jquery.*.js","./bower_components/Flot/jquery.*.*.js","./bower_components/**/js/*.min.js"], { base: "." })
        .pipe(concat(paths.concatJsDest))
        // .pipe(uglify())
        .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); })
        .pipe(gulp.dest("."));
});

gulp.task("minJs2", function () {
    return gulp.src(["./public/sb-admin-2/**/*.min.js","./public/sb-admin-2/**/**/*.min.js","./public/sb-admin-2/**/**/**/*.min.js"], { base: "." })
        .pipe(concat("site2.min.js"))
        // .pipe(uglify())
        .on('error', function (err) { gutil.log(gutil.colors.red('[Error]'), err.toString()); })
        .pipe(gulp.dest("."));
});

gulp.task("minCss3", function () {
    return gulp.src(["./bower_components/**/*.min.css","./bower_components/**/dist/*.min.css","./bower_components/**/css/*.min.css","!./bower_components/bootstrap/**"])
        .pipe(concat(paths.concatCssDest))
        // .pipe(cssmin())
        .pipe(gulp.dest("."));
});

gulp.task("minCss2", function () {
    return gulp.src(["./public/sb-admin-2/**/*.min.css","./public/sb-admin-2/**/**/*.min.css","./public/sb-admin-2/**/**/**/*.min.css","./public/sb-admin-2/css/sb-admin-2.css","./public/sb-admin-2/css/plugins/*.css","!./public/sb-admin-2/css/plugins/dataTables.bootstrap.css"])
        .pipe(concat("site2.min.css"))
        // .pipe(cssmin())
        .pipe(gulp.dest("."));
});

gulp.task("minCss1", function () {
    return gulp.src(["./public/css/*.css"])
    .pipe(concat("site3.min.css"))
    // .pipe(cssmin())
    .pipe(gulp.dest("."));
});

gulp.task("cleanCss", function (cb) {
    rimraf("public/css/site.min.js", cb);
});

gulp.task('default',["minJs1","minJs2", "minCss1","minCss2","minCss3"], function () {
    gulp.src([paths.concatJsDest])
        .pipe(gulp.dest('public/js/lib/'));

        gulp.src(["site2.min.js"])
            .pipe(gulp.dest('public/js/lib/'));

        gulp.src([paths.concatCssDest])
            .pipe(gulp.dest('public/css/'));

        gulp.src(["site2.min.css"])
            .pipe(gulp.dest('public/css/'));

        gulp.src(["site3.min.css"])
            .pipe(gulp.dest('public/css/'));
});


gulp.task("min", ["minJs1", "minCss3"]);
