/**
 * End-to-End Tests for Sync Analytics Dashboard
 *
 * These tests verify that the Sync Analytics Dashboard works correctly
 * from a user's perspective.
 */

describe('Sync Analytics Dashboard', () => {
  beforeEach(() => {
    // Login as admin
    cy.loginAsAdmin();

    // Mock API responses
    cy.mockSyncAnalyticsApis();

    // Visit the sync analytics page
    cy.visit('/sync-analytics');
  });

  it('displays the sync analytics dashboard', () => {
    // Wait for API requests to complete
    cy.wait(['@getSyncStatus', '@getQualityMetrics', '@getAnomalies']);

    // Check that the page title is displayed
    cy.contains('h2', 'Sync Analytics Dashboard').should('be.visible');

    // Check that device status cards are displayed
    cy.contains('Hospital Wing A').should('be.visible');
    cy.contains('Hospital Wing B').should('be.visible');
    cy.contains('Hospital Wing C').should('be.visible');

    // Check that online/offline status is displayed correctly
    cy.contains('Hospital Wing A').parent().parent().contains('Online').should('be.visible');
    cy.contains('Hospital Wing C').parent().parent().contains('Offline').should('be.visible');

    // Check that queue size is displayed
    cy.contains('Queue Size:').should('be.visible');

    // Check that last sync time is displayed
    cy.contains('Last Sync:').should('be.visible');

    // Check that charts are displayed
    cy.contains('Sync Queue by Priority').should('be.visible');
    cy.contains('Translation Quality Metrics').should('be.visible');

    // Check that anomaly detection table is displayed
    cy.contains('Anomaly Detection').should('be.visible');
    cy.contains('Device').should('be.visible');
    cy.contains('Anomaly Type').should('be.visible');
    cy.contains('confidence_drop').should('be.visible');
  });

  it('triggers a manual sync when button is clicked', () => {
    // Wait for API requests to complete
    cy.wait(['@getSyncStatus', '@getQualityMetrics', '@getAnomalies']);

    // Click the manual sync button for Hospital Wing A
    cy.contains('Hospital Wing A').parent().parent().contains('Trigger Manual Sync').click();

    // Wait for the manual sync request to complete
    cy.wait('@triggerManualSync');

    // Check that the alert is displayed
    cy.on('window:alert', (text) => {
      expect(text).to.equal('Manual sync triggered successfully');
    });
  });

  it('displays error state when API requests fail', () => {
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

    // Check that the error message is displayed
    cy.contains('Error loading sync analytics data').should('be.visible');
    cy.contains('Internal server error').should('be.visible');
  });

  it('displays loading state while API requests are in progress', () => {
    // Override the intercepts to delay responses
    cy.intercept('GET', '/api/sync-analytics/status', {
      statusCode: 200,
      fixture: 'sync-status.json',
      delay: 1000
    }).as('getSyncStatusDelayed');

    cy.intercept('GET', '/api/sync-analytics/quality', {
      statusCode: 200,
      fixture: 'quality-metrics.json',
      delay: 1000
    }).as('getQualityMetricsDelayed');

    cy.intercept('GET', '/api/sync-analytics/anomalies', {
      statusCode: 200,
      fixture: 'anomalies.json',
      delay: 1000
    }).as('getAnomaliesDelayed');

    // Reload the page to trigger the new intercepts
    cy.reload();

    // Check that the loading message is displayed
    cy.contains('Loading sync analytics data...').should('be.visible');

    // Wait for API requests to complete
    cy.wait(['@getSyncStatusDelayed', '@getQualityMetricsDelayed', '@getAnomaliesDelayed']);

    // Check that the loading message is no longer displayed
    cy.contains('Loading sync analytics data...').should('not.exist');

    // Check that the dashboard is displayed
    cy.contains('Sync Analytics Dashboard').should('be.visible');
  });
});
