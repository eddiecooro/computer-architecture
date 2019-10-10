#!/usr/bin/env node

const meow = require('meow');
const fs = require('fs');
const path = require('path');
const CompilationEngine = require('./CompilationEngine');

const cli = meow(`
  Usage
    $ JackAnalyzer <file>.jack|<directory>
  
  Examples
    $ JackAnalyzer ./Add.asm
    $ JackAnalyzer ./OS/
`);

const pathArg = cli.input[0];

const isDir = fs.lstatSync(pathArg).isDirectory();

if (isDir) {
  fs.readdirSync(pathArg)
    .filter(file => file.endsWith('.jack'))
    .forEach(filename => compile(path.join(pathArg, filename)));
} else {
  compile(pathArg);
}

function compile(path) {
  const compilation = new CompilationEngine(
    path,
    path.replace(/\.jack/, '.vm')
  );
  compilation.compile();
  // const xmlWritter = new XMLWritter(destinationFile);
  // let i = 0;
  // xmlWritter.openTag('tokens');
  // while (i < 1000 && tokenizer.hasMoreTokens()) {
  //   i++;
  //   tokenizer.advance();
  //   const token = tokenizer.token();
  //   switch (token) {
  //     case JackTokenizer.TOKENTYPES.IDENTIFIER:
  //       xmlWritter.writeTag('identifier', tokenizer.identifier());
  //       break;
  //     case JackTokenizer.TOKENTYPES.KEYWORD:
  //       xmlWritter.writeTag('keyword', tokenizer.keyword().toLowerCase());
  //       break;
  //     case JackTokenizer.TOKENTYPES.SYMBOL:
  //       xmlWritter.writeTag('symbol', tokenizer.symbol());
  //       break;
  //     case JackTokenizer.TOKENTYPES.INT_CONST:
  //       xmlWritter.writeTag('integerConstant', tokenizer.intVal());
  //       break;
  //     case JackTokenizer.TOKENTYPES.STRING_CONST:
  //       xmlWritter.writeTag('stringConstant', tokenizer.stringVal());
  //       break;
  //   }
  // }
  // xmlWritter.closeTag('tokens');
}
