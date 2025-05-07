/**
 * Cypress plugins file
 *
 * This file configures Cypress plugins, including the image snapshot plugin
 * for visual regression testing.
 */

const { addMatchImageSnapshotPlugin } = require('cypress-image-snapshot/plugin');

/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  // Add image snapshot plugin
  addMatchImageSnapshotPlugin(on, config);

  // Add task for logging
  on('task', {
    log(message) {
      console.log(message);
      return null;
    },
  });

  // Configure image snapshot options
  on('before:browser:launch', (browser = {}, launchOptions) => {
    // Set browser window size for consistent screenshots
    if (browser.name === 'chrome' || browser.name === 'chromium') {
      launchOptions.args.push('--window-size=1280,800');
      return launchOptions;
    }

    if (browser.name === 'firefox') {
      launchOptions.args.push('--width=1280');
      launchOptions.args.push('--height=800');
      return launchOptions;
    }
  });

  return config;
};
