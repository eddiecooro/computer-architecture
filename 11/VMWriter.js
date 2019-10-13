const fs = require('fs');

const arithmeticCommands = [
  'add',
  'sub',
  'neg',
  'eq',
  'gt',
  'lt',
  'and',
  'or',
  'not'
];
const segments = [
  'constant',
  'argument',
  'local',
  'static',
  'this',
  'that',
  'pointer',
  'temp'
];

class VMWriter {
  constructor(destPath) {
    this.destPath = destPath;
    this.file = '';
  }

  replace(s, d) {
    this.file.replace(s, d);
  }

  writePush(segment, index) {
    if (!segments.includes(segment)) {
      throw new Error('Unrecognized segment: ' + segment);
    }
    this.file += `push ${segment} ${index}\n`;
  }

  writePop(segment, index) {
    if (!segments.includes(segment)) {
      throw new Error('Unrecognized segment: ' + segment);
    }
    this.file += `pop ${segment} ${index}\n`;
  }

  writeArithmetic(command) {
    if (!arithmeticCommands.includes(command)) {
      throw new Error('Unrecognized arithmetic command: ' + command);
    }
    this.file += `${command}\n`;
  }

  writeLabel(labelName) {
    this.file += `label ${labelName}\n`;
  }

  writeGoto(labelName) {
    this.file += `goto ${labelName}\n`;
  }

  writeIf(labelName) {
    this.file += `if-goto ${labelName}\n`;
  }

  writeCall(name, nArgs) {
    this.file += `call ${name} ${nArgs}\n`;
  }

  writeFunction(name, nLocals) {
    this.file += `function ${name} ${nLocals}\n`;
  }

  writeReturn() {
    this.file += `return\n`;
  }

  end() {
    fs.writeFileSync(this.destPath, this.file, 'utf8');
  }
}

module.exports = VMWriter;
