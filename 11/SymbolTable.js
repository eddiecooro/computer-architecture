class SymbolTable {
  constructor() {
    this.symbols = {};
  }

  startSubroutine() {
    this.symbols = Object.entries(this.symbols).reduce((newSymbols, [k, s]) =>
      s.kind === SymbolTable.KINDS.FIELD || s.kind === SymbolTable.KINDS.STATIC
        ? { ...newSymbols, [k]: s }
        : newSymbols
    );
  }

  define(name, type, kind) {
    const id = this.varCount(kind);
    this.symbols[name] = {
      id,
      name,
      type,
      kind
    };
  }

  varCount(kind) {
    return Object.values(this.symbols).filter(s => s.kind === kind).length;
  }

  kindOf(name) {
    return this.symbols[name].kind;
  }

  typeOf(name) {
    return this.symbols[name].type;
  }

  indexOf(name) {
    return this.symbols[name].id;
  }
}

SymbolTable.KINDS = {
  STATIC: 'STATIC',
  FIELD: 'FIELD',
  ARG: 'ARG',
  VAR: 'VAR'
};

module.exports = SymbolTable;
