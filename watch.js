require('./server')

const cp = require('child_process')
const watch = require('chokidar').watch

exec('npm', ['run', 'build-css'])
exec('npm', ['run', 'uglify-css'])
exec('npm', ['run', 'build-js'])
exec('npm', ['run', 'build-worker-js'])

watch('js/**/*.js')
  .on('change', () => exec('npm', ['run', 'build-js']))

watch('js/worker/**/*.js')
  .on('change', () => exec('npm', ['run', 'build-worker-js']))

watch('css/**/*.styl')
  .on('change', () => {
    exec('npm', ['run', 'build-css'])
    exec('npm', ['run', 'uglify-css'])
  })

watch('public/js/main-dev.js')
  .on('change', () => exec('npm', ['run', 'uglify-js']))

watch('public/js/worker-dev.js')
  .on('change', () => exec('npm', ['run', 'uglify-worker-js']))

function exec (cmd, args) {
  const child = cp.spawn(cmd, args)
  child.stdout.pipe(process.stdout)
  child.stderr.pipe(process.stderr)
}
