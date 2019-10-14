class SymbolTable {
  constructor() {
    this.symbols = {};
  }

  safeGet(name) {
    let symbol = this.symbols[name];
    if (!symbol) {
      throw new Error('Symbol with name: ' + name + ' is not defined.');
    }
    return symbol;
  }

  startSubroutine() {
    this.symbols = Object.entries(this.symbols).reduce(
      (newSymbols, [k, s]) =>
        s.kind === SymbolTable.KINDS.FIELD ||
        s.kind === SymbolTable.KINDS.STATIC
          ? { ...newSymbols, [k]: s }
          : newSymbols,
      {}
    );
  }

  define(name, type, kind) {
    const id = this.count(kind);
    this.symbols[name] = {
      id,
      name,
      type,
      kind
    };
  }

  count(kind) {
    return Object.values(this.symbols).filter(s => s.kind === kind).length;
  }

  has(name) {
    return !!this.symbols[name];
  }

  kindOf(name) {
    return this.safeGet(name).kind;
  }

  typeOf(name) {
    return this.safeGet(name).type;
  }

  indexOf(name) {
    return this.safeGet(name).id;
  }
}

SymbolTable.KINDS = {
  STATIC: 'STATIC',
  FIELD: 'FIELD',
  ARG: 'ARG',
  VAR: 'VAR'
};

module.exports = SymbolTable;
