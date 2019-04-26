#!/usr/bin/env node
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
      .catch(error => console.log(new Error(error)));
  })
  .parse(process.argv);
