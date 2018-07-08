const gulp = require('gulp')
const browserify = require('browserify')
const del = require('del')
const exec = require('child_process').exec
const glob = require('glob')
const KarmaServer = require('karma').Server
const path = require('path')
const buffer = require('vinyl-buffer')
const html2js = require('html2js-browserify')
const sourceStream = require('vinyl-source-stream')
const watchify = require('watchify')
const $ = require('gulp-load-plugins')()

const src = {
  pages: glob.sync('src/pages/*').map(page => path.basename(page)),
  images: ['images/**/*'],
  chrome: ['src/chrome/**/*'],
  css: ['vendor/**/*.css', 'src/**/*.css'],
  fonts: ['vendor/fonts/**/*'],
  html: ['src/**/*.html', '!src/**/*.tmpl.html'],
  injectables: ['src/inject/**/*.js']
}

const outputdir = 'build'

const babelOptions = {
  sourceMaps: true
}

const htmlminOptions = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeTagWhitespace: true
}

const sourcemapsOptions = { loadMaps: true }

const uglifyOptions = {
  // The resulting value of injected scripts is important, negating IIFEs breaks this.
  compress: { negate_iife: false }
}

function getBrowserify (page, watch) {
  return browserify({
    debug: true,
    entries: `./src/pages/${page}/${page}.js`,
    cache: {},
    packageCache: {},
    plugin: watch ? [watchify] : []
  })
  .transform(html2js, Object.assign({ minify: true }, htmlminOptions))
  // The babelOptions need to be copied as babelify mutates the object for some reason
  .transform('babelify', Object.assign({}, babelOptions))
}

function browserifyBundle (page, instance) {
  return instance.bundle()
    .on('error', error => console.error(error.message))
    .pipe(sourceStream(`${page}.js`))
    .pipe(buffer())
    .pipe($.sourcemaps.init(sourcemapsOptions))
    .pipe($.uglifyEs.default(uglifyOptions))
    .on('error', error => console.error(error))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(`${outputdir}/pages/${page}`))
}

src.pages.forEach(page => {
  gulp.task(`page-${page}`, () => browserifyBundle(page, getBrowserify(page, false)))

  gulp.task(`watch-${page}`, () => {
    const instance = getBrowserify(page, true)

    instance.on('update', () => {
      return browserifyBundle(page, instance)
        .on('end', () => gulp.start('reload'))
    })
    instance.on('log', message => console.log('[watchify]', `'${page}.js'`, message))

    return browserifyBundle(page, instance)
  })
})

gulp.task('pages', src.pages.map(page => `page-${page}`))

gulp.task('watch-pages', src.pages.map(page => `watch-${page}`))

gulp.task('injectables', () => {
  gulp.src(src.injectables, { base: 'src' })
    .pipe($.sourcemaps.init(sourcemapsOptions))
    .pipe($.babel(babelOptions))
    .pipe($.uglifyEs.default(uglifyOptions))
    .on('error', error => console.error(error))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(outputdir))
})

gulp.task('html', function () {
  gulp.src(src.html)
    .pipe($.htmlmin(htmlminOptions))
    .pipe(gulp.dest(outputdir))
})

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

const allTasks = ['pages', 'injectables', 'html', 'css', 'images', 'fonts', 'chrome']

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

gulp.task('watch', allTasks.filter(el => el !== 'pages').concat(['watch-pages']), () => {
  gulp.watch(src.html, ['html', 'reload'])
  gulp.watch(src.injectables, ['injectables'])
  gulp.watch(src.css, ['css'])
  gulp.watch(src.chrome, ['chrome', 'reload'])
  gulp.watch(src.fonts, ['fonts'])
  gulp.watch(src.images, ['images', 'reload'])
})

gulp.task('package', allTasks, function () {
  const manifest = require(`./${outputdir}/manifest.json`)

  // Regenerate the manifest file without the key in it (Google will complain if we leave it)
  delete manifest.key

  gulp.src([`${outputdir}/**`, `!${outputdir}/maps{,/**}`, `!${outputdir}/manifest.json`])
    .pipe($.file('manifest.json', JSON.stringify(manifest)))
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
