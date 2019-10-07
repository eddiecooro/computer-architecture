const fs = require('fs');

const commentLineRegex = /^(\s*)\/\//;
const inlineCommentRegex = /^(?<cmd>.+?)(?<comment>\s*\/\/.*)/;
const arithmeticCommandRegex = /^(?<arg1>add|sub|neg|eq|gt|lt|and|or|not)/;
const pushCommandRegex = /^(?<command>push) (?<arg1>.+) (?<arg2>\d+)/;
const popCommandRegex = /^(?<command>pop) (?<arg1>.+) (?<arg2>\d+)/;
const labelCommandRegex = /^(?<command>label) (?<arg1>.+)/;
const gotoCommandRegex = /^(?<command>goto) (?<arg1>.+)/;
const ifCommandRegex = /^(?<command>if-goto) (?<arg1>.+)/;
const functionCommandRegex = /^(?<command>function) (?<arg1>.+) (?<arg2>.+)/;
const callCommandRegex = /^(?<command>call) (?<arg1>.+) (?<arg2>.+)/;
const returnCommandRegex = /^(?<command>return)/;

class Parser {
  constructor(filePath) {
    this.file = fs.readFileSync(filePath, 'utf8');
    this.index = 0;
  }

  hasMoreCommands() {
    return this.index < this.file.length;
  }

  advance() {
    let nextCommand;
    if (!this.hasMoreCommands()) {
      throw new Error(
        'Advance function should not get called after the commands has finished'
      );
    }
    while (!nextCommand || this._isComment(nextCommand)) {
      const nextNewLineIndex = this.file.indexOf('\r\n', this.index);
      nextCommand = this.file.slice(this.index, nextNewLineIndex);
      this.index = nextNewLineIndex + 2;
    }

    this.currentCommand = this._decomment(nextCommand.trim());
    this.currentCommandType = this._determineCommandType(this.currentCommand);
  }

  commandType() {
    return this.currentCommandType;
  }

  arg1() {
    return this._getMatch().groups.arg1;
  }

  arg2() {
    return this._getMatch().groups.arg2;
  }

  _getMatch() {
    switch (this.currentCommandType) {
      case Parser.COMMANDS.C_ARITHMETIC:
        return this.currentCommand.match(arithmeticCommandRegex);
      case Parser.COMMANDS.C_POP:
        return this.currentCommand.match(popCommandRegex);
      case Parser.COMMANDS.C_PUSH:
        return this.currentCommand.match(pushCommandRegex);
      case Parser.COMMANDS.C_LABEL:
        return this.currentCommand.match(labelCommandRegex);
      case Parser.COMMANDS.C_GOTO:
        return this.currentCommand.match(gotoCommandRegex);
      case Parser.COMMANDS.C_IF:
        return this.currentCommand.match(ifCommandRegex);
      case Parser.COMMANDS.C_FUNCTION:
        return this.currentCommand.match(functionCommandRegex);
      case Parser.COMMANDS.C_CALL:
        return this.currentCommand.match(callCommandRegex);
      case Parser.COMMANDS.C_RETURN:
        return this.currentCommand.match(returnCommandRegex);
      default:
        throw new Error(`Could not understand Command: ${this.currentCommand}`);
    }
  }

  _isComment(cmd) {
    return !!cmd.match(commentLineRegex);
  }

  _decomment(cmd) {
    const match = cmd.match(inlineCommentRegex);
    return match ? match.groups.cmd : cmd;
  }

  _determineCommandType(cmd) {
    if (cmd.match(arithmeticCommandRegex)) return Parser.COMMANDS.C_ARITHMETIC;
    if (cmd.match(pushCommandRegex)) return Parser.COMMANDS.C_PUSH;
    if (cmd.match(popCommandRegex)) return Parser.COMMANDS.C_POP;
    if (cmd.match(labelCommandRegex)) return Parser.COMMANDS.C_LABEL;
    if (cmd.match(gotoCommandRegex)) return Parser.COMMANDS.C_GOTO;
    if (cmd.match(ifCommandRegex)) return Parser.COMMANDS.C_IF;
    if (cmd.match(functionCommandRegex)) return Parser.COMMANDS.C_FUNCTION;
    if (cmd.match(callCommandRegex)) return Parser.COMMANDS.C_CALL;
    if (cmd.match(returnCommandRegex)) return Parser.COMMANDS.C_RETURN;
    throw new Error(`Unrecognized Command Type: ${cmd}`);
  }
}

Parser.COMMANDS = {
  C_ARITHMETIC: 'C_ARITHMETIC',
  C_PUSH: 'C_PUSH',
  C_POP: 'C_POP',
  C_LABEL: 'C_LABEL',
  C_GOTO: 'C_GOTO',
  C_IF: 'C_IF',
  C_FUNCTION: 'C_FUNCTION',
  C_RETURN: 'C_RETURN',
  C_CALL: 'C_CALL'
};

module.exports = Parser;
