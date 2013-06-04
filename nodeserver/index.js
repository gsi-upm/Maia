module.exports = process.env.MAIA_COV
  ? require('./lib-cov/maia')
  : require('./lib/maia');
