/**
 * Accessibility Tests for Sync Analytics Dashboard
 * 
 * These tests check the Sync Analytics Dashboard for accessibility issues
 * using the axe-core accessibility testing engine.
 */

describe('Sync Analytics Dashboard Accessibility', () => {
  beforeEach(() => {
    // Login as admin
    cy.loginAsAdmin();
    
    // Mock API responses
    cy.mockSyncAnalyticsApis();
    
    // Visit the sync analytics page
    cy.visit('/sync-analytics');
    
    // Wait for API requests to complete
    cy.wait(['@getSyncStatus', '@getQualityMetrics', '@getAnomalies']);
    
    // Wait for charts to render
    cy.wait(1000);
    
    // Inject axe-core
    cy.injectAxe();
  });

  it('should have no accessibility violations on the entire page', () => {
    // Check the entire page for accessibility violations
    cy.checkA11y(null, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      }
    }, (violations) => {
      cy.logA11yViolations(violations);
    });
  });

  it('should have no accessibility violations in the device status cards', () => {
    // Check the device status cards for accessibility violations
    cy.contains('h2', 'Sync Analytics Dashboard')
      .should('be.visible')
      .parent()
      .find('.row')
      .first()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });

  it('should have no accessibility violations in the sync queue chart', () => {
    // Check the sync queue chart for accessibility violations
    cy.contains('Sync Queue by Priority')
      .should('be.visible')
      .parent()
      .parent()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });

  it('should have no accessibility violations in the quality metrics chart', () => {
    // Check the quality metrics chart for accessibility violations
    cy.contains('Translation Quality Metrics')
      .should('be.visible')
      .parent()
      .parent()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });

  it('should have no accessibility violations in the anomaly detection table', () => {
    // Check the anomaly detection table for accessibility violations
    cy.contains('Anomaly Detection')
      .should('be.visible')
      .parent()
      .parent()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });

  it('should have no accessibility violations in the error state', () => {
    // Override the intercepts to return errors
    cy.intercept('GET', '/api/sync-analytics/status', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }).as('getSyncStatusError');

    cy.intercept('GET', '/api/sync-analytics/quality', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }).as('getQualityMetricsError');

    cy.intercept('GET', '/api/sync-analytics/anomalies', {
      statusCode: 500,
      body: {
        success: false,
        error: 'Internal server error'
      }
    }).as('getAnomaliesError');

    // Reload the page to trigger the new intercepts
    cy.reload();

    // Wait for API requests to complete
    cy.wait(['@getSyncStatusError', '@getQualityMetricsError', '@getAnomaliesError']);

    // Inject axe-core again after reload
    cy.injectAxe();

    // Check the error state for accessibility violations
    cy.contains('Error loading sync analytics data')
      .should('be.visible')
      .parent()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });

  it('should have no accessibility violations in the loading state', () => {
    // Override the intercepts to delay responses
    cy.intercept('GET', '/api/sync-analytics/status', {
      statusCode: 200,
      fixture: 'sync-status.json',
      delay: 2000
    }).as('getSyncStatusDelayed');

    cy.intercept('GET', '/api/sync-analytics/quality', {
      statusCode: 200,
      fixture: 'quality-metrics.json',
      delay: 2000
    }).as('getQualityMetricsDelayed');

    cy.intercept('GET', '/api/sync-analytics/anomalies', {
      statusCode: 200,
      fixture: 'anomalies.json',
      delay: 2000
    }).as('getAnomaliesDelayed');

    // Reload the page to trigger the new intercepts
    cy.reload();

    // Inject axe-core again after reload
    cy.injectAxe();

    // Check the loading state for accessibility violations
    cy.contains('Loading sync analytics data...')
      .should('be.visible')
      .parent()
      .then(($el) => {
        cy.checkA11y($el, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
          }
        }, (violations) => {
          cy.logA11yViolations(violations);
        });
      });
  });
});
