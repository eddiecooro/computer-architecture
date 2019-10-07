const fs = require('fs');
const uuid = require('uuidv4').default;
const Parser = require('./Parser');

const tempBase = 5;
const pointerBase = 3;
class CodeWriter {
  constructor(filename) {
    this._init(filename);
    this.counts = {
      eq: 0,
      lt: 0,
      gt: 0
    };
    this.currentFunctionName = 'GLOBAL';
    this.currentVMFileName = null;
  }

  setFileName(filename) {
    this.currentVMFileName = filename;
  }

  _init(filename) {
    this.fileWriter = fs.createWriteStream(filename, {
      encoding: 'utf8'
    });
  }

  _writePushDToStack() {
    this.fileWriter.write(`@SP\nM=M+1\nA=M-1\nM=D\n`);
  }

  _writePopToDFromStack() {
    this.fileWriter.write(`@SP\nM=M-1\nA=M\nD=M\nM=0\n`);
  }

  _getIndexAddrIntoD(basename, index) {
    this.fileWriter.write(`@${basename}\nD=M\n@${index}\nD=D+A\n`);
  }

  _writePush(segment, index) {
    switch (segment) {
      case 'constant':
        this.fileWriter.write(`@${index}\nD=A\n`);
        break;
      case 'static':
        this.fileWriter.write(`@${this.currentVMFileName}.${index}\nD=M\n`);
        break;
      case 'temp':
        if (index > 7) throw new Error('Invalid index for temp segment');
        this.fileWriter.write(`@R${tempBase + Number.parseInt(index)}\nD=M\n`);
        break;
      case 'local':
        this._getIndexAddrIntoD('LCL', index);
        this.fileWriter.write(`A=D\nD=M\n`);
        break;
      case 'argument':
        this._getIndexAddrIntoD('ARG', index);
        this.fileWriter.write(`A=D\nD=M\n`);
        break;
      case 'this':
        this._getIndexAddrIntoD('THIS', index);
        this.fileWriter.write(`A=D\nD=M\n`);
        break;
      case 'that':
        this._getIndexAddrIntoD('THAT', index);
        this.fileWriter.write(`A=D\nD=M\n`);
        break;
      case 'pointer':
        if (index > 1) throw new Error('Invalid index for pointer segment');
        this.fileWriter.write(
          `@R${pointerBase + Number.parseInt(index)}\nD=M\n`
        );
        break;
      default:
        throw new Error(`Unknown segment name for push: ${segment}`);
    }
    this._writePushDToStack();
  }

  _writePop(segment, index) {
    switch (segment) {
      case 'static':
        this._writePopToDFromStack();
        this.fileWriter.write(`@${this.currentVMFileName}.${index}\nM=D\n`);
        break;
      case 'temp':
        this._writePopToDFromStack();
        if (index > 7) throw new Error('Invalid index for temp segment');
        this.fileWriter.write(`@R${tempBase + Number.parseInt(index)}\nM=D\n`);
        break;
      case 'local':
        this._getIndexAddrIntoD('LCL', index);
        this.fileWriter.write(`@R13\nM=D\n`);
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nA=M\nM=D\n`);
        break;
      case 'argument':
        this._getIndexAddrIntoD('ARG', index);
        this.fileWriter.write(`@R13\nM=D\n`);
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nA=M\nM=D\n`);
        break;
      case 'this':
        this._getIndexAddrIntoD('THIS', index);
        this.fileWriter.write(`@R13\nM=D\n`);
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nA=M\nM=D\n`);
        break;
      case 'that':
        this._getIndexAddrIntoD('THAT', index);
        this.fileWriter.write(`@R13\nM=D\n`);
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nA=M\nM=D\n`);
        break;
      case 'pointer':
        this._writePopToDFromStack();
        if (index > 1) throw new Error('Invalid index for pointer segment');
        this.fileWriter.write(
          `@R${pointerBase + Number.parseInt(index)}\nM=D\n`
        );
        break;
      default:
        throw new Error(`Unknown segment name for pop: ${segment}`);
    }
  }

  writeInit() {
    this.fileWriter.write(`@256\nD=A\n@SP\nM=D\n`);
    this.writeCall('Sys.init', 0);
  }

  writeArithmetic(command) {
    // Load operands
    switch (command) {
      case 'add':
      case 'sub':
      case 'eq':
      case 'lt':
      case 'gt':
      case 'and':
      case 'or':
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nM=D\n`);
        this._writePopToDFromStack();
        this.fileWriter.write(`@R14\nM=D\n`);
        break;
      case 'not':
      case 'neg':
        this._writePopToDFromStack();
        this.fileWriter.write(`@R13\nM=D\n`);
        break;
    }

    // Do math and save the result into D
    switch (command) {
      case 'not':
        this.fileWriter.write(`@R13\nD=M\nD=!D\n`);
        break;
      case 'neg':
        this.fileWriter.write(`@R13\nD=M\nD=-D\n`);
        break;
      case 'add':
        this.fileWriter.write(`@R13\nD=M\n@R14\nA=M\nD=A+D\n`);
        break;
      case 'sub':
        this.fileWriter.write(`@R13\nD=M\n@R14\nA=M\nD=A-D\n`);
        break;
      case 'and':
        this.fileWriter.write(`@R13\nD=M\n@R14\nA=M\nD=D&A\n`);
        break;
      case 'or':
        this.fileWriter.write(`@R13\nD=M\n@R14\nA=M\nD=A|D\n`);
        break;
      case 'eq':
        const eqLab = `ISEQ${this.counts.eq}`;
        const neqLab = `ISNOTEQ${this.counts.eq}`;
        const eeqLab = `ENDEQ${this.counts.eq}`;
        this.fileWriter.write(
          `@R13\nD=M\n@R14\nA=M\nD=A-D\n@${eqLab}\nD;JEQ\n@${neqLab}\n0;JMP\n(${eqLab})\nD=-1\n@${eeqLab}\n0;JMP\n(${neqLab})\nD=0\n(${eeqLab})\n`
        );
        this.counts.eq++;
        break;
      case 'lt':
        const ltLab = `ISLT${this.counts.lt}`;
        const nltLab = `ISNOTLT${this.counts.lt}`;
        const eltLab = `ENDLT${this.counts.lt}`;
        this.fileWriter.write(
          `@R13\nD=M\n@R14\nA=M\nD=A-D\n@${ltLab}\nD;JLT\n@${nltLab}\n0;JMP\n(${ltLab})\nD=-1\n@${eltLab}\n0;JMP\n(${nltLab})\nD=0\n(${eltLab})\n`
        );
        this.counts.lt++;
        break;
      case 'gt':
        const gtLab = `ISGT${this.counts.gt}`;
        const ngtLab = `ISNOTGT${this.counts.gt}`;
        const egtLab = `ENDGT${this.counts.gt}`;
        this.fileWriter.write(
          `@R13\nD=M\n@R14\nA=M\nD=A-D\n@${gtLab}\nD;JGT\n@${ngtLab}\n0;JMP\n(${gtLab})\nD=-1\n@${egtLab}\n0;JMP\n(${ngtLab})\nD=0\n(${egtLab})\n`
        );
        this.counts.gt++;
        break;
    }

    // Push the result into the stack
    switch (command) {
      case 'not':
      case 'neg':
      case 'add':
      case 'sub':
      case 'and':
      case 'or':
      case 'eq':
      case 'lt':
      case 'gt':
        this._writePushDToStack();
    }
  }

  writePushPop(command, segment, index) {
    if (command === Parser.COMMANDS.C_PUSH)
      return this._writePush(segment, index);
    if (command === Parser.COMMANDS.C_POP)
      return this._writePop(segment, index);
  }

  writeLabel(label) {
    this.fileWriter.write(`(${this.currentFunctionName}$${label})\n`);
  }

  writeGoto(label) {
    this.fileWriter.write(`@${this.currentFunctionName}$${label}\n0;JMP\n`);
  }

  writeIf(label) {
    this._writePopToDFromStack();
    this.fileWriter.write(`@${this.currentFunctionName}$${label}\nD;JNE\n`);
  }

  writeCall(functionName, numArgs) {
    const returnAddress = 'r' + uuid().replace(/\-/g, '_');
    // Save following parts of the calling function into the stack frame:
    // returnAddress, LCL, ARG, THIS, THAT
    this.fileWriter.write(`@${returnAddress}\nD=A\n`);
    this._writePushDToStack();
    this.fileWriter.write(`@LCL\nD=M\n`);
    this._writePushDToStack();
    this.fileWriter.write(`@ARG\nD=M\n`);
    this._writePushDToStack();
    this.fileWriter.write(`@THIS\nD=M\n`);
    this._writePushDToStack();
    this.fileWriter.write(`@THAT\nD=M\n`);
    this._writePushDToStack();

    // Setting ARG to the new place of args for the called function
    this.fileWriter.write(
      `@SP\nD=M\n@5\nD=D-A\n@${numArgs}\nD=D-A\n@ARG\nM=D\n`
    );

    // Setting the new position of the SP as the LCL. The SP
    // will change after Initializing the local variables in the
    // writeFunction method.
    this.fileWriter.write(`@SP\nD=M\n@LCL\nM=D\n`);

    // Going to the function decleration location
    this.fileWriter.write(`@${functionName}\n0;JMP\n`);

    // Writing the return address which the program returns after
    // finishing the execution of the function
    this.fileWriter.write(`(${returnAddress})\n`);
  }

  writeReturn() {
    // Saving the address of the end of the current frame meta datas
    this.fileWriter.write(`@LCL\nD=M\n@R13\nM=D\n`);

    // Saving the return address of the current frame
    // (D is persistent from the previous command)
    this.fileWriter.write(`@5\nA=D-A\nD=M\n@R14\nM=D\n`);

    // Putting the last value in the stack into the stack frame of the
    // caller function as the return value
    this._writePopToDFromStack();
    this.fileWriter.write(`@ARG\nA=M\nM=D\n`);

    // Resetting different values to their previous value before calling this function
    // Resetting the SP
    this.fileWriter.write(`@ARG\nD=M+1\n@SP\nM=D\n`);
    // Resetting THAT
    this.fileWriter.write(`@R13\nD=M\n@1\nA=D-A\nD=M\n@THAT\nM=D\n`);
    // Resetting THIS
    this.fileWriter.write(`@R13\nD=M\n@2\nA=D-A\nD=M\n@THIS\nM=D\n`);
    // Resetting ARG
    this.fileWriter.write(`@R13\nD=M\n@3\nA=D-A\nD=M\n@ARG\nM=D\n`);
    // Resetting LCL
    this.fileWriter.write(`@R13\nD=M\n@4\nA=D-A\nD=M\n@LCL\nM=D\n`);

    // Going back to the return address
    this.fileWriter.write(`@R14\nA=M\n0;JMP\n`);
  }

  writeFunction(functionName, numLocals) {
    this.currentFunctionName = functionName;
    this.fileWriter.write(`(${functionName})\nD=0\n`);
    for (let i = 0; i < Number.parseInt(numLocals); i++) {
      this._writePushDToStack();
    }
  }
}

module.exports = CodeWriter;
