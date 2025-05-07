const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // Load plugins from the plugins file
      return require('./cypress/plugins/index.js')(on, config);
    },
  },

  // Configure viewport size
  viewportWidth: 1280,
  viewportHeight: 800,

  // Configure default command timeout
  defaultCommandTimeout: 10000,

  // Configure video recording
  video: false,

  // Configure screenshots
  screenshotOnRunFailure: true,

  // Configure retries
  retries: {
    runMode: 2,
    openMode: 0,
  },
});
