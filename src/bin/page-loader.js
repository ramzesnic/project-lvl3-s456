#!/usr/bin/env node
// @flow
import commander from 'commander';
import pageLoader from '..';

commander
  .version('0.0.1')
  .description('Page loader')
  .arguments('<urlPage>')
  .option('-v, --version', 'output the version number')
  .option('-o, --output [path]', 'output path', process.cwd())
  .action((urlPage) => {
    pageLoader(urlPage, commander.output)
      .then(() => console.log('OK'))
      .catch((error) => {
        console.error(error.message);
        process.exit(error.code);
      });
  })
  .parse(process.argv);
