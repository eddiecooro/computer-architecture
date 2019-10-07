class Code {
  toBinary(num, length) {
    let binary = num.toString(2);
    while (binary.length < length) {
      binary = '0' + binary;
    }
    return binary;
  }
  dest(destMnemonic) {
    let dest = 0b000;
    if (destMnemonic.includes('M')) dest = dest | Code.DEST.MEMORY;
    if (destMnemonic.includes('A')) dest = dest | Code.DEST.AREGISTER;
    if (destMnemonic.includes('D')) dest = dest | Code.DEST.DREGISTER;
    return this.toBinary(dest, 3);
  }
  comp(compMnemonic) {
    return this.toBinary(Code.COMP[compMnemonic] || 0b0, 7);
  }
  jump(jumpMnemonic) {
    return this.toBinary(Code.JUMP[jumpMnemonic] || 0b0, 3);
  }
}

Code.DEST = {
  MEMORY: 0b001,
  DREGISTER: 0b010,
  AREGISTER: 0b100
};

Code.JUMP = {
  JGT: 0b001,
  JEQ: 0b010,
  JLT: 0b100,
  JGE: 0b011,
  JNE: 0b101,
  JLE: 0b110,
  JMP: 0b111
};

Code.COMP = {
  '0': 0b0101010,
  '1': 0b0111111,
  '-1': 0b0111010,
  D: 0b0001100,
  A: 0b0110000,
  M: 0b1110000,
  '!D': 0b0001101,
  '!A': 0b0110001,
  '!M': 0b1110001,
  '-D': 0b0001111,
  '-A': 0b0110011,
  '-M': 0b1110011,
  'D+1': 0b0011111,
  'A+1': 0b0110111,
  'M+1': 0b1110111,
  'D-1': 0b0001110,
  'A-1': 0b0110010,
  'M-1': 0b1110010,
  'D+A': 0b0000010,
  'D+M': 0b1000010,
  'D-A': 0b0010011,
  'D-M': 0b1010011,
  'A-D': 0b0000111,
  'M-D': 0b1000111,
  'D&A': 0b0000000,
  'D&M': 0b1000000,
  'D|A': 0b0010101,
  'D|M': 0b1010101
};

module.exports = Code;
