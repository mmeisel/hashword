/*jshint node:true */

'use strict';

var gulp = require('gulp');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var htmlmin = require('gulp-htmlmin');
var eventStream = require('event-stream');
var templatecache = require('gulp-angular-templatecache');
var uglify = require('gulp-uglify');

var src = {
    assets: ['src/content/fonts/**/*', 'src/content/images/**/*'],
    chrome: ['src/chrome/**/*'],
    css: ['src/content/**/*.css', 'lib/**/*.css'],
    js: ['src/**/*.js', '!src/app/components/**/*'],
    libJs: ['lib/**/*.js'],
    html: ['src/app/**/*.html', '!src/app/components/**/*'],
    componentTemplates: ['src/app/components/**/*.html'],
    componentJs: ['src/app/components/**/*.js']
};

var outputdir = 'build';

var dist = {
    root: outputdir,
    app: outputdir + '/app',
    css: outputdir + '/styles'
};

var htmlminOptions = {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeTagWhitespace: true
};

// Merge all components
gulp.task('components', function () {
    var js = gulp.src(src.componentJs);
    
    var templates = gulp.src(src.componentTemplates)
        .pipe(htmlmin(htmlminOptions))
        .pipe(templatecache({ module: 'components' }));
    
    eventStream.merge(js, templates)
        .pipe(concat('components.js'))
        .pipe(uglify())
        .pipe(gulp.dest(dist.app));
});

gulp.task('html', function () {
    gulp.src(src.html)
        .pipe(htmlmin(htmlminOptions))
        .pipe(gulp.dest(dist.app));
});

gulp.task('libScripts', function () {
    gulp.src(src.libJs)
        .pipe(concat('lib.js'))
        .pipe(gulp.dest(dist.root));
});

gulp.task('scripts', ['components', 'libScripts'], function () {
    gulp.src(src.js)
        .pipe(uglify())
        .pipe(gulp.dest(dist.root));
});

gulp.task('css', function () {
    gulp.src(src.css)
        .pipe(concat('all.css'))
        .pipe(cssnano())
        .pipe(gulp.dest(dist.css));
});

gulp.task('chrome', function () {
    gulp.src(src.chrome)
        .pipe(gulp.dest(dist.root));
});

gulp.task('assets', function () {
    gulp.src(src.assets, { base: 'src/content' })
        .pipe(gulp.dest(dist.root));
});

var allTasks = ['scripts', 'html', 'css', 'assets', 'chrome'];

gulp.task('watch', allTasks, function() {
    gulp.watch(src.componentJs, ['components']);
    gulp.watch(src.componentTemplates, ['components']);
    gulp.watch(src.html, ['html']);
    gulp.watch(src.libJs, ['libScripts']);
    gulp.watch(src.js, ['scripts']);
    gulp.watch(src.css, ['css']);
    gulp.watch(src.chrome, ['chrome']);
    gulp.watch(src.assets, ['assets']);
});

// Regular build
gulp.task('default', allTasks);
