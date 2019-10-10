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
  constructor(destWriter) {
    this.writer = destWriter;
  }

  writePush(segment, index) {
    this.writer.write(`push ${segment} ${index}`);
  }

  writePop(segment, index) {
    if (!segment.includes(segment)) {
      throw new Error('Unrecognized segment: ' + segment);
    }
    this.writer.write(`pop ${segment} ${index}`);
  }

  writeArithmetic(command) {
    if (!arithmeticCommands.includes(command)) {
      throw new Error('Unrecognized arithmetic command: ' + command);
    }
    this.writer.write(command);
  }

  writeLabel(labelName) {
    this.writer.write(`label ${labelName}`);
  }

  writeGoto(labelName) {
    this.writer.write(`goto ${labelName}`);
  }

  writeIf(labelName) {
    this.writer.write(`if-goto ${labelName}`);
  }

  writeCall(name, nArgs) {
    this.writer.write(`call ${name} ${nArgs}`);
  }

  writeFunction(name, nLocals) {
    this.writer.write(`function ${name} ${nLocals}`);
  }

  writeReturn() {
    this.writer.write(`return`);
  }

  close() {
    this.writer.close();
  }
}

module.exports = VMWriter;
