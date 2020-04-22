const gulp = require('gulp')
const browserify = require('browserify')
const del = require('del')
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
  sourceMap: true
}

const htmlminOptions = {
  removeComments: true,
  collapseWhitespace: true,
  conservativeCollapse: true,
  removeTagWhitespace: true
}

const sourcemapsOptions = { loadMaps: true }

const uglifyOptions = {
  // The resulting value of injected scripts is important, these options prevent breaking this.
  compress: { expression: true, negate_iife: false }
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
    })
    instance.on('log', message => console.log('[watchify]', `'${page}.js'`, message))

    return browserifyBundle(page, instance)
  })
})

gulp.task('pages', gulp.parallel(src.pages.map(page => `page-${page}`)))

gulp.task('watch-pages', gulp.parallel(src.pages.map(page => `watch-${page}`)))

gulp.task('injectables', () =>
  gulp.src(src.injectables, { base: 'src' })
    .pipe($.sourcemaps.init(sourcemapsOptions))
    .pipe($.babel(babelOptions))
    .pipe($.uglifyEs.default(uglifyOptions))
    .on('error', error => console.error(error))
    .pipe($.sourcemaps.write('./maps'))
    .pipe(gulp.dest(outputdir))
)

gulp.task('html', () =>
  gulp.src(src.html)
    .pipe($.htmlmin(htmlminOptions))
    .pipe(gulp.dest(outputdir))
)

gulp.task('css', () =>
  gulp.src(src.css)
    .pipe($.concat('styles.css'))
    .pipe(gulp.dest(outputdir))
)

gulp.task('chrome', () =>
  gulp.src(src.chrome)
    .pipe(gulp.dest(outputdir))
)

gulp.task('images', () =>
  gulp.src(src.images)
    .pipe(gulp.dest(`${outputdir}/images`))
)

gulp.task('fonts', () =>
  gulp.src(src.fonts)
    .pipe(gulp.dest(`${outputdir}/fonts`))
)

const allTasks = ['pages', 'injectables', 'html', 'css', 'images', 'fonts', 'chrome']

gulp.task('clean', () =>
  del([outputdir, 'dist'])
)

gulp.task('watch', gulp.parallel(allTasks.filter(el => el !== 'pages').concat(['watch-pages'])), () => {
  gulp.watch(src.html, ['html'])
  gulp.watch(src.injectables, ['injectables'])
  gulp.watch(src.css, ['css'])
  gulp.watch(src.chrome, ['chrome'])
  gulp.watch(src.fonts, ['fonts'])
  gulp.watch(src.images, ['images'])
})

gulp.task('package', gulp.parallel(allTasks), () => {
  const manifest = require(`./${outputdir}/manifest.json`)

  // Check the manifest version against the latest version tag. If they don't match,
  // assume this is a prerelease version and add the number of commits since the last tag
  // to the version number. If they match, this has to be the same commit that's been tagged.
  $.git.exec({ args: 'describe --match=[0-9]*.[0-9]*.[0-9]*' }, (err, stdout) => {
    if (err) {
      throw err
    }

    const describeParts = stdout.trim().split('-')
    const baseVersion = describeParts[0]
    const prereleaseVersion = describeParts[1]

    if (prereleaseVersion != null) {
      if (baseVersion === manifest.version) {
        throw new Error(`You must build version ${manifest.version} from the tagged commit!`)
      } else {
        manifest.version = `${manifest.version}.${prereleaseVersion}`
      }
    }

    // Remove the key from the manifest if it's present (Google will complain if we leave it)
    delete manifest.key

    return gulp.src([`${outputdir}/**`, `!${outputdir}/**/maps{,/**}`, `!${outputdir}/manifest.json`])
      .pipe($.file('manifest.json', JSON.stringify(manifest)))
      .pipe($.zip(`hashword-${manifest.version}.zip`))
      .pipe(gulp.dest('dist'))
  })
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
gulp.task('default', gulp.parallel(allTasks))
