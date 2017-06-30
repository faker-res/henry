'use strict';

var gulp = require('gulp'),
    rimraf = require("gulp-rimraf");

gulp.task("cleanFolder_services", function (cb) {
    return gulp.src("./services/*", {
            read: false
        })
        .pipe(rimraf({
            force: true
        }));
});

gulp.task("cleanFolder_testAPI", function (cb) {
    return gulp.src("./testAPI/*", {
            read: false
        })
        .pipe(rimraf({
            force: true
        }));
});

gulp.task("clean", ["cleanFolder_services", "cleanFolder_testAPI"]);

gulp.task("copyFolder_services", function () {
    return gulp.src(["../Server/services/*", ])
        .pipe(gulp.dest("./services"));
});

gulp.task("copyFolder_testAPI", function () {
    return gulp.src(["../Server/testAPI/*", ])
        .pipe(gulp.dest("./testAPIl"));
});

gulp.task('default', ["clean", "copyFolder_services","copyFolder_testAPI"], function () {
});
