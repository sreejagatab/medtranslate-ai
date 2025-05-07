// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

/**
 * Custom command to login as an admin user
 */
Cypress.Commands.add('loginAsAdmin', () => {
  cy.window().then((win) => {
    win.localStorage.setItem('auth_token', 'mock-token');
    win.localStorage.setItem('user', JSON.stringify({
      id: 'admin-user',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    }));
  });
});

/**
 * Custom command to mock API responses
 */
Cypress.Commands.add('mockSyncAnalyticsApis', () => {
  cy.intercept('GET', '/api/sync-analytics/status', {
    statusCode: 200,
    fixture: 'sync-status.json'
  }).as('getSyncStatus');

  cy.intercept('GET', '/api/sync-analytics/quality', {
    statusCode: 200,
    fixture: 'quality-metrics.json'
  }).as('getQualityMetrics');

  cy.intercept('GET', '/api/sync-analytics/anomalies', {
    statusCode: 200,
    fixture: 'anomalies.json'
  }).as('getAnomalies');

  cy.intercept('POST', '/api/sync-analytics/manual-sync/*', {
    statusCode: 200,
    fixture: 'manual-sync-result.json'
  }).as('triggerManualSync');
});

/**
 * Custom command to check accessibility
 */
Cypress.Commands.add('checkA11y', (context, options, violationCallback) => {
  if (context) {
    cy.get(context).should('exist');
    cy.checkA11y(context, options, violationCallback);
  } else {
    cy.injectAxe();
    cy.configureAxe({
      // Configure axe to run in the context of the document
      context: document,
      // Configure axe to exclude specific elements
      exclude: [
        // Add any elements to exclude here
      ],
    });
    cy.checkA11y(null, options, violationCallback);
  }
});

/**
 * Custom command to log accessibility violations
 */
Cypress.Commands.add('logA11yViolations', (violations) => {
  // Log violations to the console
  cy.task('log', `${violations.length} accessibility violation(s) detected`);

  // Log each violation
  violations.forEach((violation) => {
    const nodes = Cypress.$(violation.nodes.map((node) => node.target).join(','));

    Cypress.log({
      name: 'A11Y',
      consoleProps: () => violation,
      $el: nodes,
      message: `[${violation.impact}] ${violation.help} - ${violation.helpUrl}`,
    });

    // Highlight elements with violations
    nodes.each((i, node) => {
      Cypress.$(node).css('border', '3px solid #f00');
    });
  });
});
