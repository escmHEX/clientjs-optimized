'use strict';

const karmaBaseConfigFactory = require('./base.conf');

module.exports = config => config.set({
  ...karmaBaseConfigFactory(config),
  browsers: ['ChromeHeadless'],
  autoWatch: false,
});
