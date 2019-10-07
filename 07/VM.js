#!/usr/bin/env node

const meow = require('meow');
const fs = require('fs');
const path = require('path');
const Parser = require('./Parser');
const CodeWriter = require('./CodeWriter');

const cli = meow(`
  Usage
    $ Assembler <file>.asm
  
  Examples
    $ Assembler ./Add.asm
`);

const pathArg = cli.input[0];

const isDir = fs.lstatSync(pathArg).isDirectory();
let codeWriter;

function getLastPartInPath(path) {
  let index = path.length;
  let lastPart;
  while (!lastPart || lastPart === '/') {
    index = path.lastIndexOf('/', index - 1);
    lastPart = path.slice(index).replace(/\//g, '');
  }
  return lastPart;
}

const filename = getLastPartInPath(pathArg);
const dest = isDir
  ? path.join(pathArg, filename + '.asm')
  : pathArg.replace(/\.vm$/, '.asm');
const codeWriter = new CodeWriter(dest);
codeWriter.writeInit();

if (isDir) {
  fs.readdirSync(pathArg)
    .filter(file => file.endsWith('.vm'))
    .forEach(filename => compile(path.join(pathArg, filename), filename));
} else {
  compile(pathArg, filename);
}

function compile(path, filename) {
  console.log('COMPILING:', path);

  codeWriter.setFileName(filename.replace(/\.vm/, ''));
  const parser = new Parser(path);

  while (parser.hasMoreCommands()) {
    parser.advance();
    const commandType = parser.commandType();
    switch (commandType) {
      case Parser.COMMANDS.C_PUSH:
      case Parser.COMMANDS.C_POP:
        codeWriter.writePushPop(commandType, parser.arg1(), parser.arg2());
        break;
      case Parser.COMMANDS.C_ARITHMETIC:
        codeWriter.writeArithmetic(parser.arg1());
        break;
      case Parser.COMMANDS.C_GOTO:
        codeWriter.writeGoto(parser.arg1());
        break;
      case Parser.COMMANDS.C_LABEL:
        codeWriter.writeLabel(parser.arg1());
        break;
      case Parser.COMMANDS.C_IF:
        codeWriter.writeIf(parser.arg1());
        break;
      case Parser.COMMANDS.C_FUNCTION:
        codeWriter.writeFunction(parser.arg1(), parser.arg2());
        break;
      case Parser.COMMANDS.C_RETURN:
        codeWriter.writeReturn();
        break;
      case Parser.COMMANDS.C_CALL:
        codeWriter.writeCall(parser.arg1(), parser.arg2());
        break;
    }
    console.log(parser.currentCommand);
    console.log(parser.commandType());
    console.log(parser.arg1());
    console.log(parser.arg2());
    console.log('****');
  }
}
