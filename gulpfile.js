/*jshint node:true */

var gulp = require('gulp');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var htmlmin = require('gulp-htmlmin');
var streamqueue = require('streamqueue');
var templatecache = require('gulp-angular-templatecache');
var zip = require('gulp-zip');

var src = {
    assets: ['lib/{fonts,images}/**/*', 'src/{fonts,images}/**/*'],
    chrome: ['src/chrome/**/*'],
    css: ['lib/**/*.css', 'src/**/*.css'],
    js: ['src/**/*.js', '!src/common/**/*'],
    html: ['src/**/*.html', '!src/common/**/*'],
    commonTemplates: ['src/common/**/*.html'],
    commonJs: ['src/common/**/*.js'],
    libJs: ['lib/**/*.js']
};

var outputdir = 'build';

var htmlminOptions = {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeTagWhitespace: true
};

// Merge common
gulp.task('common', function () {
    var commonJs = gulp.src(src.commonJs)
        .pipe(babel());

    var templates = gulp.src(src.commonTemplates)
        .pipe(htmlmin(htmlminOptions))
        .pipe(templatecache({ module: 'templates', standalone: true }));
    
    var libJs = gulp.src(src.libJs);

    streamqueue({ objectMode: true }, libJs, commonJs, templates)
        .pipe(concat('common.js'))
        .pipe(gulp.dest(outputdir));
});

gulp.task('html', function () {
    gulp.src(src.html)
        .pipe(htmlmin(htmlminOptions))
        .pipe(gulp.dest(outputdir));
});

gulp.task('scripts', ['common'], function () {
    gulp.src(src.js)
        .pipe(babel())
        .pipe(gulp.dest(outputdir));
});

gulp.task('css', function () {
    gulp.src(src.css)
        .pipe(concat('styles.css'))
        .pipe(gulp.dest(outputdir));
});

gulp.task('chrome', function () {
    gulp.src(src.chrome)
        .pipe(gulp.dest(outputdir));
});

gulp.task('assets', function () {
    gulp.src(src.assets)
        .pipe(gulp.dest(outputdir));
});

var allTasks = ['scripts', 'html', 'css', 'assets', 'chrome'];

gulp.task('watch', allTasks, function () {
    gulp.watch(src.commonJs, ['common']);
    gulp.watch(src.commonTemplates, ['common']);
    gulp.watch(src.libJs, ['common']);
    gulp.watch(src.html, ['html']);
    gulp.watch(src.js, ['scripts']);
    gulp.watch(src.css, ['css']);
    gulp.watch(src.chrome, ['chrome']);
    gulp.watch(src.assets, ['assets']);
});

gulp.task('zip', allTasks, function () {
    gulp.src(outputdir + '/**')
        .pipe(zip('hashword.zip'))
        .pipe(gulp.dest('dist'));
});

// Regular build
gulp.task('default', allTasks);
