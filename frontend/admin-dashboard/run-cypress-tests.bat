@echo off
REM Run Cypress tests in headless mode
echo Running Cypress tests in headless mode...
npx cypress run --spec "cypress/e2e/sync-analytics.cy.js"

REM If you want to run Cypress in interactive mode, uncomment the line below
REM npx cypress open
