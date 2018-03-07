const gulp = require('gulp')
const browserify = require('browserify')
const del = require('del')
const exec = require('child_process').exec
const glob = require('glob')
const KarmaServer = require('karma').Server
const path = require('path')
const buffer = require('vinyl-buffer')
const ngHtml2Js = require('browserify-ng-html2js')
const sourceStream = require('vinyl-source-stream')
const watchify = require('watchify')
const $ = require('gulp-load-plugins')()

const src = {
  pages: glob.sync('src/pages/*').map(page => path.basename(page)),
  images: ['images/**/*'],
  chrome: ['src/chrome/**/*'],
  css: [
    'node_modules/angular/angular-csp.css',
    'vendor/**/*.css',
    'src/**/*.css'
  ],
  fonts: ['vendor/fonts/**/*'],
  html: ['src/**/*.html', '!src/**/*.tmpl.html'],
  injectables: ['src/inject/**/*.js'],
  js: ['src/**/*.js']
}

const outputdir = 'build'

const babelOptions = { presets: ['es2015'] }

const htmlminOptions = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeTagWhitespace: true
}

const uglifyOptions = {
  // The resulting value of injected scripts is important, negating IIFEs breaks this.
  compress: { negate_iife: false }
}

function getBrowserifyBuild (page) {
  return browserify({ entries: `./src/pages/${page}/${page}.js`, debug: true })
    .transform(ngHtml2Js({ extension: 'tmpl.html' })) // TODO: run htmlmin here?
    // The babelOptions need to be copied as babelify mutates the object for some reason
    .transform('babelify', Object.assign({}, babelOptions))
    .bundle()
    .pipe(sourceStream(`${page}.js`))
    .pipe(buffer())
    .pipe($.sourcemaps.init())
    .pipe($.uglify(uglifyOptions))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(`${outputdir}/pages/${page}`))
}

src.pages.forEach(page => {
  gulp.task(`page-${page}`, () => getBrowserifyBuild(page))

  gulp.task(`watch-${page}`, () => {
    watchify(getBrowserifyBuild(page))
  })
})

gulp.task('pages', src.pages.map(page => `page-${page}`))

gulp.task('watch-pages', src.pages.map(page => `watch-${page}`))

gulp.task('injectables', () => {
  gulp.src(src.injectables, { base: 'src' })
    .pipe($.sourcemaps.init())
    .pipe($.babel(babelOptions))
    .pipe($.uglify(uglifyOptions))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(outputdir))
})

gulp.task('html', function () {
  gulp.src(src.html)
    .pipe($.htmlmin(htmlminOptions))
    .pipe(gulp.dest(outputdir))
})

gulp.task('scripts', ['pages', 'injectables'])

gulp.task('css', function () {
  gulp.src(src.css)
    .pipe($.concat('styles.css'))
    .pipe(gulp.dest(outputdir))
})

gulp.task('chrome', function () {
  gulp.src(src.chrome)
    .pipe(gulp.dest(outputdir))
})

gulp.task('images', () => {
  gulp.src(src.images)
    .pipe(gulp.dest(`${outputdir}/images`))
})

gulp.task('fonts', () => {
  gulp.src(src.fonts)
    .pipe(gulp.dest(`${outputdir}/fonts`))
})

const allTasks = ['scripts', 'html', 'css', 'images', 'fonts', 'chrome']

gulp.task('clean', function () {
  del([outputdir, 'dist'])
})

gulp.task('reload', function (cb) {
  const reloadCmd = 'node_modules/chrome-extensions-reloader/bin/chrome-extensions-reloader --single-run'
  exec(reloadCmd, (err, stdout, stderr) => {
    if (stdout.length > 0) {
      console.log(stdout)
    }
    if (stderr.length > 0) {
      console.error(stderr)
    }
    cb(err)
  })
})

gulp.task('watch', allTasks, function () {
  gulp.watch(src.html, ['html', 'reload'])
  gulp.watch(src.js, src.pages.map(app => `watch-${app}`).concat(['reload']))
  // TODO: other JS files
  gulp.watch(src.css, ['css', 'reload'])
  gulp.watch(src.chrome, ['chrome', 'reload'])
  gulp.watch(src.fonts, ['fonts', 'reload'])
  gulp.watch(src.images, ['images', 'reload'])
})

gulp.task('package', allTasks, function () {
  const manifest = require(`./${outputdir}/manifest.json`)

  gulp.src([`${outputdir}/**`, `!${outputdir}/maps{,/**}`])
    .pipe($.zip(`hashword-${manifest.version}.zip`))
    .pipe(gulp.dest('dist'))
})

gulp.task('test', done => {
  new KarmaServer(
    {
      configFile: path.resolve(__dirname, 'src/test/karma.conf.js'),
      singleRun: true
    },
    done
  )
  .start()
})

// Regular build
gulp.task('default', allTasks)
