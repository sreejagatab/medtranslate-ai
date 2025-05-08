#!/usr/bin/env node

/**
 * Test Data Generator CLI for MedTranslate AI
 * 
 * This CLI tool generates test data for the MedTranslate AI system.
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const ora = require('ora');
const chalk = require('chalk');
const { 
  generateTestDataset, 
  saveTestDataset,
  config 
} = require('./test-data-generator');

// Configure CLI
program
  .name('generate-test-data')
  .description('Generate test data for MedTranslate AI')
  .version('1.0.0');

// Generate command
program
  .command('generate')
  .description('Generate a test dataset')
  .option('-s, --size <size>', 'Dataset size (small, medium, large)', 'small')
  .option('-n, --name <name>', 'Dataset name', 'default')
  .option('-o, --output <path>', 'Output directory', config.outputDir)
  .action(async (options) => {
    const spinner = ora('Generating test dataset...').start();
    
    try {
      // Validate size
      if (!['small', 'medium', 'large'].includes(options.size)) {
        spinner.fail(chalk.red(`Invalid size: ${options.size}`));
        process.exit(1);
      }
      
      // Update output directory
      if (options.output !== config.outputDir) {
        config.outputDir = options.output;
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(config.outputDir)) {
          fs.mkdirSync(config.outputDir, { recursive: true });
        }
      }
      
      // Generate dataset
      spinner.text = `Generating ${options.size} dataset...`;
      const dataset = generateTestDataset(options.size);
      
      // Save dataset
      spinner.text = `Saving dataset to ${options.output}/${options.name}...`;
      const filePaths = saveTestDataset(dataset, options.name);
      
      // Print summary
      spinner.succeed(chalk.green('Test dataset generated successfully'));
      console.log(chalk.bold('\nDataset Summary:'));
      
      for (const [dataType, data] of Object.entries(dataset)) {
        console.log(`${chalk.cyan(dataType)}: ${chalk.yellow(Array.isArray(data) ? data.length : 0)} items`);
      }
      
      console.log(chalk.bold('\nFiles:'));
      
      for (const [dataType, filePath] of Object.entries(filePaths)) {
        console.log(`${chalk.cyan(dataType)}: ${chalk.yellow(filePath)}`);
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error generating test dataset: ${error.message}`));
      console.error(error);
      process.exit(1);
    }
  });

// List command
program
  .command('list')
  .description('List available test datasets')
  .option('-o, --output <path>', 'Output directory', config.outputDir)
  .action(async (options) => {
    const spinner = ora('Listing test datasets...').start();
    
    try {
      // Update output directory
      if (options.output !== config.outputDir) {
        config.outputDir = options.output;
      }
      
      // Check if output directory exists
      if (!fs.existsSync(config.outputDir)) {
        spinner.info(chalk.yellow(`Output directory does not exist: ${config.outputDir}`));
        process.exit(0);
      }
      
      // Get datasets
      const datasets = fs.readdirSync(config.outputDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      if (datasets.length === 0) {
        spinner.info(chalk.yellow('No datasets found'));
        process.exit(0);
      }
      
      // Print datasets
      spinner.succeed(chalk.green(`Found ${datasets.length} datasets`));
      console.log(chalk.bold('\nDatasets:'));
      
      for (const dataset of datasets) {
        const metadataPath = path.join(config.outputDir, dataset, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          console.log(`${chalk.cyan(dataset)} (${chalk.yellow(metadata.createdAt)})`);
          
          if (metadata.counts) {
            for (const [dataType, count] of Object.entries(metadata.counts)) {
              console.log(`  ${chalk.gray(dataType)}: ${count} items`);
            }
          }
        } else {
          console.log(`${chalk.cyan(dataset)} (${chalk.yellow('No metadata')})`);
        }
      }
    } catch (error) {
      spinner.fail(chalk.red(`Error listing test datasets: ${error.message}`));
      console.error(error);
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete')
  .description('Delete a test dataset')
  .argument('<name>', 'Dataset name')
  .option('-o, --output <path>', 'Output directory', config.outputDir)
  .action(async (name, options) => {
    const spinner = ora(`Deleting dataset: ${name}...`).start();
    
    try {
      // Update output directory
      if (options.output !== config.outputDir) {
        config.outputDir = options.output;
      }
      
      // Check if dataset exists
      const datasetDir = path.join(config.outputDir, name);
      
      if (!fs.existsSync(datasetDir)) {
        spinner.fail(chalk.red(`Dataset does not exist: ${name}`));
        process.exit(1);
      }
      
      // Delete dataset
      fs.rmSync(datasetDir, { recursive: true, force: true });
      
      spinner.succeed(chalk.green(`Dataset deleted: ${name}`));
    } catch (error) {
      spinner.fail(chalk.red(`Error deleting dataset: ${error.message}`));
      console.error(error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
