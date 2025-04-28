#!/bin/bash
# MedTranslate AI Test Runner Script

set -e

# Default test type
TEST_TYPE=${1:-all}

echo "Running MedTranslate AI tests: $TEST_TYPE"

# Check if Jest is installed
if ! command -v jest &> /dev/null; then
    echo "Jest is not installed. Installing..."
    npm install -g jest
fi

# Run tests based on type
case $TEST_TYPE in
    unit)
        echo "Running unit tests..."
        jest tests/unit
        ;;
    integration)
        echo "Running integration tests..."
        jest tests/integration
        ;;
    all)
        echo "Running all tests..."
        jest
        ;;
    *)
        echo "Unknown test type: $TEST_TYPE"
        echo "Available options: unit, integration, all"
        exit 1
        ;;
esac

echo "Tests completed!"
