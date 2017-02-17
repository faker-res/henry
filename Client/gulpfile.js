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