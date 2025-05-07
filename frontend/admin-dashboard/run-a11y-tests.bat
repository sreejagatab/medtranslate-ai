@echo off
REM Run accessibility tests and generate report
echo Running accessibility tests...
call npm run test:a11y -- --reporter json --reporter-options "output=cypress/results/accessibility-results.json"

echo Generating accessibility report...
node generate-a11y-report.js

echo Accessibility tests completed!
