const gulp = require('gulp')
const browserify = require('browserify')
const del = require('del')
const exec = require('child_process').exec
const KarmaServer = require('karma').Server
const path = require('path')
const buffer = require('vinyl-buffer')
const ngHtml2Js = require('browserify-ng-html2js')
const sourceStream = require('vinyl-source-stream')
const watchify = require('watchify')
const $ = require('gulp-load-plugins')()

const src = {
  apps: ['background', 'options', 'popup', 'site-list'],
  assets: ['vendor/**/*.woff2', 'src/images/**/*'],
  chrome: ['src/chrome/**/*'],
  css: [
    'node_modules/angular/angular-csp.css',
    'vendor/**/*.css',
    'src/**/*.css'
  ],
  html: ['src/**/*.html', '!src/**/*.tmpl.html'],
  js: ['src/**/*.js']
}

const outputdir = 'build'

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

src.apps.forEach(app => {
  const browserifyArgs = { entries: `./src/${app}.js`, debug: true }

  gulp.task(`build-${app}`, () => {
    return getBrowserifyBuild()
  })

  gulp.task(`watch-${app}`, () => {
    return watchify(getBrowserifyBuild())
  })

  function getBrowserifyBuild () {
    return browserify(browserifyArgs)
      .transform(ngHtml2Js({ extension: 'tmpl.html' })) // TODO: run htmlmin here?
      .transform('babelify', { presets: ['es2015'] })
      .bundle()
      .pipe(sourceStream(`${app}.js`))
      .pipe(buffer())
      .pipe($.sourcemaps.init())
      .pipe($.uglify(uglifyOptions))
      .pipe($.sourcemaps.write('./maps'))
      .pipe(gulp.dest(outputdir))
  }
})

gulp.task('html', function () {
  gulp.src(src.html)
    .pipe($.htmlmin(htmlminOptions))
    .pipe(gulp.dest(outputdir))
})

// TODO: missing check-active.js right now (any other non-app standalone scripts? give them their
//       own directory?)
gulp.task('scripts', src.apps.map(app => `build-${app}`))

gulp.task('css', function () {
  gulp.src(src.css)
    .pipe($.concat('styles.css'))
    .pipe(gulp.dest(outputdir))
})

gulp.task('chrome', function () {
  gulp.src(src.chrome)
    .pipe(gulp.dest(outputdir))
})

gulp.task('assets', function () {
  gulp.src(src.assets)
    .pipe(gulp.dest(outputdir))
})

const allTasks = ['scripts', 'html', 'css', 'assets', 'chrome']

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
  gulp.watch(src.js, src.apps.map(app => `watch-${app}`).concat(['reload']))
  // TODO: other JS files
  gulp.watch(src.css, ['css', 'reload'])
  gulp.watch(src.chrome, ['chrome', 'reload'])
  gulp.watch(src.assets, ['assets', 'reload'])
})

gulp.task('package', allTasks, function () {
  const manifest = require(`./${outputdir}/manifest.json`)

  gulp.src([`${outputdir}/**`, `!${outputdir}/maps{,/**}`])
    .pipe($.zip(`hashword-${manifest.version}.zip`))
    .pipe(gulp.dest('dist'))
})

gulp.task('test', function (done) {
  new KarmaServer(
    {
      configFile: path.resolve(__dirname, 'test/karma.conf.js'),
      singleRun: true
    },
    done
  )
  .start()
})

// Regular build
gulp.task('default', allTasks)
