/**
 * Visual Regression Tests for Sync Analytics Dashboard
 * 
 * These tests capture screenshots of the Sync Analytics Dashboard and compare them
 * with baseline images to detect visual regressions.
 */

describe('Sync Analytics Dashboard Visual Regression', () => {
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
  });

  it('should match the full dashboard snapshot', () => {
    // Take a snapshot of the entire dashboard
    cy.matchImageSnapshot('sync-analytics-dashboard-full');
  });

  it('should match the device status cards snapshot', () => {
    // Take a snapshot of the device status cards
    cy.contains('h2', 'Sync Analytics Dashboard')
      .should('be.visible')
      .parent()
      .find('.row')
      .first()
      .matchImageSnapshot('sync-analytics-device-cards');
  });

  it('should match the sync queue chart snapshot', () => {
    // Take a snapshot of the sync queue chart
    cy.contains('Sync Queue by Priority')
      .should('be.visible')
      .parent()
      .parent()
      .matchImageSnapshot('sync-analytics-queue-chart');
  });

  it('should match the quality metrics chart snapshot', () => {
    // Take a snapshot of the quality metrics chart
    cy.contains('Translation Quality Metrics')
      .should('be.visible')
      .parent()
      .parent()
      .matchImageSnapshot('sync-analytics-quality-chart');
  });

  it('should match the anomaly detection table snapshot', () => {
    // Take a snapshot of the anomaly detection table
    cy.contains('Anomaly Detection')
      .should('be.visible')
      .parent()
      .parent()
      .matchImageSnapshot('sync-analytics-anomaly-table');
  });

  it('should match the error state snapshot', () => {
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

    // Take a snapshot of the error state
    cy.contains('Error loading sync analytics data')
      .should('be.visible')
      .parent()
      .matchImageSnapshot('sync-analytics-error-state');
  });

  it('should match the loading state snapshot', () => {
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

    // Take a snapshot of the loading state
    cy.contains('Loading sync analytics data...')
      .should('be.visible')
      .parent()
      .matchImageSnapshot('sync-analytics-loading-state');
  });
});
