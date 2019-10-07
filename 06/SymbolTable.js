class SymbolTable {
  constructor() {
    this.table = {};
    for (let i = 0; i <= 15; i++) {
      this.addEntry('R' + i, i);
    }
    this.addEntry('SP', 0x0);
    this.addEntry('LCL', 0x1);
    this.addEntry('ARG', 0x2);
    this.addEntry('THIS', 0x3);
    this.addEntry('THAT', 0x4);
    this.addEntry('SCREEN', 0x4000);
    this.addEntry('KBD', 0x6000);
  }
  addEntry(symbol, address) {
    this.table[symbol] = address;
  }
  contains(symbol) {
    return this.table[symbol] !== undefined;
  }
  getAddress(symbol) {
    return this.table[symbol];
  }
}

module.exports = SymbolTable;
