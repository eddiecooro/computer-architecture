const fs = require('fs');

const commentRegex = /^(\s*)\/\//;
const aCommandRegex = /^\s*@(?<symbol>\w[\d\w\_\.\$\:]*)/;
const lCommandRegex = /^\s*\((?<symbol>[\d\w\_\.\$\:]+)\)\s*$/;
const cCommandRegex = /^(?<dest>\w*?)=?(?<comp>[\s\w\+\-\d\&\|\!]*);?(?<jump>\w*?)$/;

class Parser {
  constructor(file) {
    this.file = fs.readFileSync(file, 'utf8');
    this.index = 0;
  }

  reset() {
    this.index = 0;
    this.currentCommandType = this.currentCommand = undefined;
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
    while (
      (!nextCommand || this._isComment(nextCommand)) &&
      this.hasMoreCommands()
    ) {
      let nextNewLineIndex = this.file.indexOf('\r\n', this.index);
      let newLineCharLength = 2;
      if (nextNewLineIndex === -1) {
        nextNewLineIndex = this.file.indexOf('\n', this.index);
        newLineCharLength = 1;
      }
      nextCommand = this.file.slice(this.index, nextNewLineIndex);
      this.index = nextNewLineIndex + newLineCharLength;
    }

    this.currentCommand = this._decomment(nextCommand.trim());
    this.currentCommandType = this._determineCommandType(this.currentCommand);
  }

  _isComment(cmd) {
    return !!cmd.match(commentRegex);
  }

  _decomment(cmd) {
    const match = cmd.match(/(?<cmd>.+?)(?<comment>\s*\/\/.*)/);
    return match ? match.groups.cmd : cmd;
  }

  _isACommand(cmd) {
    return !!cmd.match(aCommandRegex);
  }

  _isLCommand(cmd) {
    return !!cmd.match(lCommandRegex);
  }

  _isCCommand(cmd) {
    return !!cmd.match(cCommandRegex);
  }

  _determineCommandType(cmd) {
    if (this._isACommand(cmd)) return Parser.COMMAND_TYPES.A_COMMAND;
    if (this._isLCommand(cmd)) return Parser.COMMAND_TYPES.L_COMMAND;
    if (this._isCCommand(cmd)) return Parser.COMMAND_TYPES.C_COMMAND;
  }

  commandType() {
    return this.currentCommandType;
  }

  symbol() {
    switch (this.currentCommandType) {
      case Parser.COMMAND_TYPES.A_COMMAND:
        return this.currentCommand.match(aCommandRegex).groups.symbol;
      case Parser.COMMAND_TYPES.L_COMMAND:
        return this.currentCommand.match(lCommandRegex).groups.symbol;
      default:
        throw new Error(
          'Command type should be ACommand or CCommand when calling symbol'
        );
    }
  }

  dest() {
    switch (this.currentCommandType) {
      case Parser.COMMAND_TYPES.C_COMMAND:
        const dest = this.currentCommand.match(cCommandRegex).groups.dest;
        return dest;
      default:
        throw new Error('Command type should be CCommand when calling dest');
    }
  }

  comp() {
    switch (this.currentCommandType) {
      case Parser.COMMAND_TYPES.C_COMMAND:
        const comp = this.currentCommand.match(cCommandRegex).groups.comp;
        return comp;
      default:
        throw new Error('Command type should be CCommand when calling comp');
    }
  }

  jump() {
    switch (this.currentCommandType) {
      case Parser.COMMAND_TYPES.C_COMMAND:
        const jump = this.currentCommand.match(cCommandRegex).groups.jump;
        return jump;
      default:
        throw new Error('Command type should be CCommand when calling jump');
    }
  }
}

Parser.COMMAND_TYPES = {
  A_COMMAND: 'A_COMMAND',
  C_COMMAND: 'C_COMMAND',
  L_COMMAND: 'L_COMMAND'
};
module.exports = Parser;
