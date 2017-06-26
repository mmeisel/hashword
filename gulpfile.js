/*jshint node:true */

const gulp = require('gulp');
const del = require('del');
const exec = require('child_process').exec;
const streamqueue = require('streamqueue');
const $ = require('gulp-load-plugins')();

const src = {
    assets: ['lib/{fonts,images}/**/*', 'src/{fonts,images}/**/*'],
    chrome: ['src/chrome/**/*'],
    css: ['lib/**/*.css', 'src/**/*.css'],
    js: ['src/**/*.js', '!src/common/**/*'],
    html: ['src/**/*.html', '!src/common/**/*'],
    commonTemplates: ['src/common/**/*.html'],
    commonJs: ['src/common/**/*.js'],
    libJs: ['lib/**/*.js']
};

const outputdir = 'build';

const htmlminOptions = {
    removeComments: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeTagWhitespace: true
};

const uglifyOptions = {
    // The resulting value of injected scripts is important, negating IIFEs breaks this.
    compress: { negate_iife: false }
};

gulp.task('lib', function () {
    gulp.src(src.libJs)
        .pipe($.concat('lib.js'))
        .pipe(gulp.dest(outputdir));
});

// Merge common
gulp.task('common', function () {
    const commonJs = gulp.src(src.commonJs);

    const templates = gulp.src(src.commonTemplates)
        .pipe($.htmlmin(htmlminOptions))
        .pipe($.angularTemplatecache({ module: 'templates', standalone: true }));
    
    streamqueue({ objectMode: true }, commonJs, templates)
        .pipe($.sourcemaps.init())
        .pipe($.concat('common.js'))
        .pipe($.babel())
        .pipe($.uglify(uglifyOptions))
        .pipe($.sourcemaps.write('maps'))
        .pipe(gulp.dest(outputdir));
});

gulp.task('html', function () {
    gulp.src(src.html)
        .pipe($.htmlmin(htmlminOptions))
        .pipe(gulp.dest(outputdir));
});

gulp.task('scripts', ['lib', 'common'], function () {
    gulp.src(src.js)
        .pipe($.sourcemaps.init())
        .pipe($.babel())
        .pipe($.uglify(uglifyOptions))
        .pipe($.sourcemaps.write('maps'))
        .pipe(gulp.dest(outputdir));
});

gulp.task('css', function () {
    gulp.src(src.css)
        .pipe($.concat('styles.css'))
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

const allTasks = ['scripts', 'html', 'css', 'assets', 'chrome'];

gulp.task('clean', function () {
    del([outputdir, 'dist']);
});

gulp.task('reload', function (cb) {
    const reloadCmd = 'node_modules/chrome-extensions-reloader/bin/chrome-extensions-reloader --single-run';
    exec(reloadCmd, (err, stdout, stderr) => {
        if (stdout.length > 0) {
            console.log(stdout);
        }
        if (stderr.length > 0) {
            console.error(stderr);
        }
        cb(err);
    });
});

gulp.task('watch', allTasks, function () {
    gulp.watch(src.commonJs, ['common', 'reload']);
    gulp.watch(src.commonTemplates, ['common', 'reload']);
    gulp.watch(src.libJs, ['lib', 'reload']);
    gulp.watch(src.html, ['html', 'reload']);
    gulp.watch(src.js, ['scripts', 'reload']);
    gulp.watch(src.css, ['css', 'reload']);
    gulp.watch(src.chrome, ['chrome', 'reload']);
    gulp.watch(src.assets, ['assets', 'reload']);
});

gulp.task('package', allTasks, function () {
    const manifest = require(`./${outputdir}/manifest.json`);

    gulp.src([`${outputdir}/**`, `!${outputdir}/maps{,/**}`])
        .pipe($.zip(`hashword-${manifest.version}.zip`))
        .pipe(gulp.dest('dist'));
});

// Regular build
gulp.task('default', allTasks);
