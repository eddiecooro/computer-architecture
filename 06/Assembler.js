#!/usr/bin/env node

const meow = require('meow');
const Parser = require('./Parser');
const Code = require('./Code');
const SymbolTable = require('./SymbolTable');
const fs = require('fs');

const cli = meow(`
  Usage
    $ Assembler <file>.asm
  
  Examples
    $ Assembler ./Add.asm
`);

const file = cli.input[0];

const parser = new Parser(file);
const code = new Code();
const table = new SymbolTable();
const binaryParts = [];
let baseMemoryAddress = 0x0010;
let currentPosition = 0;

// Extracting Symbols
while (parser.hasMoreCommands()) {
  parser.advance();
  const commandType = parser.commandType();
  if (commandType === Parser.COMMAND_TYPES.A_COMMAND) {
    const symbol = parser.symbol();
    let address = Number.parseInt(symbol);
    if (Number.isNaN(address) && !table.contains(symbol)) {
      table.addEntry(symbol, baseMemoryAddress++);
    }
    currentPosition++;
  } else if (commandType === Parser.COMMAND_TYPES.L_COMMAND) {
    const symbol = parser.symbol();
    table.addEntry(symbol, currentPosition);
  } else if (commandType === Parser.COMMAND_TYPES.C_COMMAND) {
    currentPosition++;
  }
}

// Compiling
parser.reset();
while (parser.hasMoreCommands()) {
  parser.advance();
  const commandType = parser.commandType();
  if (commandType === Parser.COMMAND_TYPES.A_COMMAND) {
    const symbol = parser.symbol();
    let address = Number.parseInt(symbol);
    if (Number.isNaN(address)) {
      address = table.getAddress(symbol);
    }
    binaryParts.push('0' + code.toBinary(address, 15));
  } else if (commandType === Parser.COMMAND_TYPES.C_COMMAND) {
    const dest = parser.dest();
    const comp = parser.comp();
    const jump = parser.jump();
    binaryParts.push(
      '111' + code.comp(comp) + code.dest(dest) + code.jump(jump)
    );
  }
}

fs.writeFileSync(file.replace(/asm$/, 'hack'), binaryParts.join('\n'), 'utf8');
