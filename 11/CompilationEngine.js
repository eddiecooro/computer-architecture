const uuid = require('uuidv4').default;
const JackTokenizer = require('./JackTokenizer');
const VMWriter = require('./VMWriter');
const SymbolTable = require('./SymbolTable');

const generateLabel = () => 'r' + uuid().replace(/\-/g, '_');
const thisArg = '__FIRST_ARGUMENT_IS_RESERVED_FOR_THIS_KEYWORD__';

const subroutineStarters = [
  JackTokenizer.KEYWORDS.FUNCTION,
  JackTokenizer.KEYWORDS.CONSTRUCTOR,
  JackTokenizer.KEYWORDS.METHOD
];
const classVarDecStarters = [
  JackTokenizer.KEYWORDS.STATIC,
  JackTokenizer.KEYWORDS.FIELD
];
const statementStarters = [
  JackTokenizer.KEYWORDS.LET,
  JackTokenizer.KEYWORDS.DO,
  JackTokenizer.KEYWORDS.IF,
  JackTokenizer.KEYWORDS.WHILE,
  JackTokenizer.KEYWORDS.RETURN
];
const operations = ['+', '-', '*', '/', '&', '|', '<', '>', '='];
const unaryOperations = ['~', '-'];
const keywordConstants = [
  JackTokenizer.KEYWORDS.TRUE,
  JackTokenizer.KEYWORDS.FALSE,
  JackTokenizer.KEYWORDS.NULL,
  JackTokenizer.KEYWORDS.THIS
];

class CompilationEngine {
  constructor(sourceFilePath, destPath) {
    this.tokenizer = new JackTokenizer(sourceFilePath);
    this.vmWriter = new VMWriter(destPath);
    this.symbolTable = new SymbolTable();
  }

  _includes(expected, found) {
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    return expected.includes(found);
  }

  _getCurrentTokenForError() {
    const tokenType = this.tokenizer.token();
    let tokenValue;
    switch (tokenType) {
      case JackTokenizer.TOKENTYPES.KEYWORD:
        tokenValue = this.tokenizer.keyword();
        break;
      case JackTokenizer.TOKENTYPES.SYMBOL:
        tokenValue = this.tokenizer.symbol();
        break;
      case JackTokenizer.TOKENTYPES.IDENTIFIER:
        tokenValue = this.tokenizer.identifier();
        break;
      case JackTokenizer.TOKENTYPES.INT_CONST:
        tokenValue = this.tokenizer.intVal();
        break;
      case JackTokenizer.TOKENTYPES.STRING_CONST:
        tokenValue = this.tokenizer.stringVal();
        break;
    }
    return `Token: ${tokenType}, Value: ${tokenValue}`;
  }

  _assert(expected, found, type = '') {
    if (!this._includes(expected, found)) {
      const currentTokenType = this._getCurrentTokenForError();
      throw new Error(
        `Expected ${type}: ${expected}\nBut found, ${currentTokenType}\nWhen compiling: ${this.tokenizer.index}`
      );
    }
  }

  _getCurrentToken() {
    const tokenType = this.tokenizer.token();
    switch (tokenType) {
      case JackTokenizer.TOKENTYPES.IDENTIFIER:
        return this.tokenizer.identifier();
      case JackTokenizer.TOKENTYPES.KEYWORD:
        return this.tokenizer.keyword();
      case JackTokenizer.TOKENTYPES.SYMBOL:
        return this.tokenizer.symbol();
      case JackTokenizer.TOKENTYPES.INT_CONST:
        return this.tokenizer.intVal();
      case JackTokenizer.TOKENTYPES.STRING_CONST:
        return this.tokenizer.stringVal();
    }
  }

  _expectToken(token) {
    const currentToken = this.tokenizer.token();
    this._assert(token, currentToken, 'Token');
  }

  _expectSymbol(symbol) {
    if (symbol) {
      const currentSymbol = this.tokenizer.symbol();
      this._assert(symbol, currentSymbol, 'Symbol');
    } else {
      this._expectToken(JackTokenizer.TOKENTYPES.SYMBOL);
    }
  }

  _expectKeyword(keyword) {
    if (keyword) {
      const currentKeyword = this.tokenizer.keyword();
      this._assert(keyword, currentKeyword, 'Keyword');
    } else {
      this._expectToken(JackTokenizer.TOKENTYPES.KEYWORD);
    }
  }

  _expectIdentifier() {
    this._expectToken(JackTokenizer.TOKENTYPES.IDENTIFIER);
  }

  _expectStringConstant() {
    this._expectToken(JackTokenizer.TOKENTYPES.STRING_CONST);
  }

  _expectIntegerConstant() {
    this._expectToken(JackTokenizer.TOKENTYPES.INT_CONST);
  }

  _extractIdentifier() {
    this._expectIdentifier();
    const token = this._getCurrentToken();
    this.tokenizer.advance();
    return { token, type: JackTokenizer.TOKENTYPES.IDENTIFIER };
  }

  _extractIntegerConstant() {
    this._expectIntegerConstant();
    const token = this._getCurrentToken();
    this.tokenizer.advance();
    return { token, type: JackTokenizer.TOKENTYPES.INT_CONST };
  }

  _extractStringConstant() {
    this._expectStringConstant();
    const token = this._getCurrentToken();
    this.tokenizer.advance();
    return { token, type: JackTokenizer.TOKENTYPES.STRING_CONST };
  }

  _extractSymbol(symbol) {
    this._expectSymbol(symbol);
    const token = this._getCurrentToken();
    this.tokenizer.advance();
    return { token, type: JackTokenizer.TOKENTYPES.SYMBOL };
  }

  _extractKeyword(keyword) {
    this._expectKeyword(keyword);
    const token = this._getCurrentToken();
    this.tokenizer.advance();
    return { token, type: JackTokenizer.TOKENTYPES.KEYWORD };
  }

  compile() {
    // Single advance to move the tokenizer to the first token
    this.tokenizer.advance();

    this.compileClass();
  }

  _compileClassBody() {
    while (this.tokenizer.symbol() !== '}') {
      this._expectKeyword([...classVarDecStarters, ...subroutineStarters]);

      if (this._includes(classVarDecStarters, this.tokenizer.keyword())) {
        this.compileClassVarDec();
      } else if (this._includes(subroutineStarters, this.tokenizer.keyword())) {
        this.compileSubroutine();
      }
    }
  }

  compileClass() {
    this._extractKeyword(JackTokenizer.KEYWORDS.CLASS);

    const { token: className } = this._extractIdentifier();
    this.currentClassName = className;

    this._extractSymbol('{');
    this._compileClassBody();
    this._extractSymbol('}');

    this.vmWriter.end();
  }

  _extractType() {
    try {
      return this._extractKeyword([
        JackTokenizer.KEYWORDS.INT,
        JackTokenizer.KEYWORDS.CHAR,
        JackTokenizer.KEYWORDS.BOOLEAN
      ]);
    } catch (e) {
      return this._extractIdentifier();
    }
  }

  _extractVarName() {
    return this._extractIdentifier();
  }

  _extractVarNames() {
    let varNames = [this._extractVarName()];

    if (this.tokenizer.symbol() !== ';') {
      this._extractSymbol(',');
      varNames = [...varNames, ...this._extractVarNames()];
    }
    return varNames;
  }

  compileVarDec() {
    this._extractKeyword(JackTokenizer.KEYWORDS.VAR);
    const kind = SymbolTable.KINDS.VAR;

    const { token: type } = this._extractType();
    const names = this._extractVarNames().map(d => d.token);
    this._extractSymbol(';');

    names.forEach(name => this.symbolTable.define(name, type, kind));
  }

  compileClassVarDec() {
    const { token: kindToken } = this._extractKeyword(classVarDecStarters);
    const kind =
      kindToken === JackTokenizer.KEYWORDS.FIELD
        ? SymbolTable.KINDS.FIELD
        : kindToken === JackTokenizer.KEYWORDS.STATIC
        ? SymbolTable.KINDS.STATIC
        : null;

    const { token: type } = this._extractType();

    const varNames = this._extractVarNames().map(v => v.token);

    this._extractSymbol(';');

    varNames.forEach(varName => {
      this.symbolTable.define(varName, type, kind);
    });
  }

  _getSegmentBySymbolKind(kind) {
    switch (kind) {
      case SymbolTable.KINDS.ARG:
        return 'argument';
      case SymbolTable.KINDS.STATIC:
        return 'static';
      case SymbolTable.KINDS.VAR:
        return 'local';
      case SymbolTable.KINDS.FIELD:
        return 'this';
      default:
        throw new Error('Unknown symbol kind: ', +kind);
    }
  }

  _compileTermIdentifier() {
    const { nextTokenDescriptor } = this.tokenizer.peekNext();
    if (nextTokenDescriptor.symbol === '[') {
      const { token: identifier } = this._extractIdentifier();
      const kind = this.symbolTable.kindOf(identifier);
      const index = this.symbolTable.indexOf(identifier);
      const segment = this._getSegmentBySymbolKind(kind);

      this._extractSymbol('[');
      // After compiling the expression, index is in the stack
      this.compileExpression();
      this._extractSymbol(']');

      this.vmWriter.writePush(segment, index);
      this.vmWriter.writeArithmetic('add');
      this.vmWriter.writePop('pointer', 1);
      this.vmWriter.writePush('that', 0);
    } else if (
      nextTokenDescriptor.symbol === '(' ||
      nextTokenDescriptor.symbol === '.'
    ) {
      this.compileSubroutineCall();
    } else {
      const { token: identifier } = this._extractIdentifier();
      const kind = this.symbolTable.kindOf(identifier);
      const index = this.symbolTable.indexOf(identifier);
      const segment = this._getSegmentBySymbolKind(kind);
      this.vmWriter.writePush(segment, index);
    }
  }

  compileTerm() {
    if (this.tokenizer.token() === JackTokenizer.TOKENTYPES.INT_CONST) {
      const d = this._extractIntegerConstant();
      const constant = Number.parseInt(d.token);
      this.vmWriter.writePush('constant', Math.abs(constant));
      if (constant < 0) {
        this.vmWriter.writeArithmetic('neg');
      }
    } else if (
      this.tokenizer.token() === JackTokenizer.TOKENTYPES.STRING_CONST
    ) {
      // TODO
      const { token: str = '' } = this._extractStringConstant();
      this.vmWriter.writePush('constant', str.length);
      this.vmWriter.writeCall('String.new', 1);
      for (let ch of str) {
        this.vmWriter.writePush('constant', ch.charCodeAt(0));
        this.vmWriter.writeCall('String.appendChar', 2);
      }
    } else if (this._includes(keywordConstants, this.tokenizer.keyword())) {
      const { token: constant } = this._extractKeyword(keywordConstants);
      switch (constant) {
        case JackTokenizer.KEYWORDS.TRUE:
          // True is -1
          this.vmWriter.writePush('constant', 1);
          this.vmWriter.writeArithmetic('neg');
          break;
        case JackTokenizer.KEYWORDS.FALSE:
        case JackTokenizer.KEYWORDS.NULL:
          // False and Null are 0
          this.vmWriter.writePush('constant', 0);
          break;
        case JackTokenizer.KEYWORDS.THIS:
          this.vmWriter.writePush('pointer', 0);
          break;
      }
    } else if (this._includes(unaryOperations, this.tokenizer.symbol())) {
      const { token: operator } = this._extractSymbol(unaryOperations);
      this.compileTerm();
      switch (operator) {
        case '-':
          this.vmWriter.writeArithmetic('neg');
          break;
        case '~':
          this.vmWriter.writeArithmetic('not');
          break;
      }
    } else if (this.tokenizer.symbol() === '(') {
      this._extractSymbol('(');
      this.compileExpression();
      this._extractSymbol(')');
    } else if (this.tokenizer.token() === JackTokenizer.TOKENTYPES.IDENTIFIER) {
      this._compileTermIdentifier();
    }
  }

  _extractOperation() {
    return this._extractSymbol();
  }

  compileExpression() {
    this.compileTerm();
    while (this._includes(operations, this.tokenizer.symbol())) {
      const { token: operation } = this._extractOperation();
      this.compileTerm();

      switch (operation) {
        case '+':
          this.vmWriter.writeArithmetic('add');
          break;
        case '-':
          this.vmWriter.writeArithmetic('sub');
          break;
        case '*':
          this.vmWriter.writeCall('Math.multiply', 2);
          break;
        case '/':
          this.vmWriter.writeCall('Math.divide', 2);
          break;
        case '&':
          this.vmWriter.writeArithmetic('and');
          break;
        case '|':
          this.vmWriter.writeArithmetic('or');
          break;
        case '>':
          this.vmWriter.writeArithmetic('gt');
          break;
        case '<':
          this.vmWriter.writeArithmetic('lt');
          break;
        case '=':
          this.vmWriter.writeArithmetic('eq');
          break;
      }
    }
  }

  compileExpressionList() {
    let num = 1;
    this.compileExpression();
    while (this.tokenizer.symbol() === ',') {
      num++;
      this._extractSymbol(',');
      this.compileExpression();
    }
    return num;
  }

  compileSubroutineCall() {
    let objName;
    let className;
    let { token: subroutineName } = this._extractIdentifier();
    let argsNum = 0;

    if (this.tokenizer.symbol() === '.') {
      this._extractSymbol('.');
      const d = this._extractIdentifier();
      objName = subroutineName;
      subroutineName = d.token;
      if (this.symbolTable.has(objName)) {
        className = this.symbolTable.typeOf(objName);
        argsNum = 1;
        // Setting the variable behind the dot as the first argument
        const kind = this.symbolTable.kindOf(objName);
        const index = this.symbolTable.indexOf(objName);
        const segment = this._getSegmentBySymbolKind(kind);
        this.vmWriter.writePush(segment, index);
      } else {
        className = objName;
      }
    } else {
      className = this.currentClassName;
      argsNum = 1;
      this.vmWriter.writePush('pointer', 0);
    }

    this._extractSymbol('(');
    if (this.tokenizer.symbol() !== ')') {
      argsNum += this.compileExpressionList();
    }
    this._extractSymbol(')');

    this.vmWriter.writeCall(`${className}.${subroutineName}`, argsNum);
  }

  _compileBody() {
    this._extractSymbol('{');
    this.compileStatements();
    this._extractSymbol('}');
  }

  compileReturnStatement() {
    this._extractKeyword(JackTokenizer.KEYWORDS.RETURN);
    if (this.tokenizer.symbol() !== ';') {
      this.compileExpression();
    }
    this.vmWriter.writeGoto(this.endOfCurrentSubroutine);
    this._extractSymbol(';');
  }

  compileDoStatement() {
    this._extractKeyword(JackTokenizer.KEYWORDS.DO);
    this.compileSubroutineCall();
    this._extractSymbol(';');
    this.vmWriter.writePop('temp', 0);
  }

  compileWhileStatement() {
    const startLabel = generateLabel();
    const endLabel = generateLabel();
    this._extractKeyword(JackTokenizer.KEYWORDS.WHILE);

    this.vmWriter.writeLabel(startLabel);

    this._extractSymbol('(');
    this.compileExpression();
    this._extractSymbol(')');

    this.vmWriter.writeArithmetic('not');
    this.vmWriter.writeIf(endLabel);

    this._compileBody();
    this.vmWriter.writeGoto(startLabel);
    this.vmWriter.writeLabel(endLabel);
  }

  compileIfStatement() {
    this._extractKeyword(JackTokenizer.KEYWORDS.IF);

    const ifLabel = generateLabel();
    const endLabel = generateLabel();

    this._extractSymbol('(');
    this.compileExpression();
    this._extractSymbol(')');

    this.vmWriter.writeArithmetic('not');
    this.vmWriter.writeIf(ifLabel);
    this._compileBody();
    this.vmWriter.writeGoto(endLabel);
    this.vmWriter.writeLabel(ifLabel);

    if (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.ELSE) {
      this._extractKeyword(JackTokenizer.KEYWORDS.ELSE);
      this._compileBody();
    }
    this.vmWriter.writeLabel(endLabel);
  }

  compileLetStatement() {
    this._extractKeyword(JackTokenizer.KEYWORDS.LET);
    const { token: identifier } = this._extractIdentifier();

    const kind = this.symbolTable.kindOf(identifier);
    let segment = this._getSegmentBySymbolKind(kind);
    let index = this.symbolTable.indexOf(identifier);
    let isArray = false;

    if (this.tokenizer.symbol() === '[') {
      isArray = true;

      this._extractSymbol('[');
      this.compileExpression();
      this._extractSymbol(']');

      this.vmWriter.writePush(segment, index);
      this.vmWriter.writeArithmetic('add');
      this.vmWriter.writePop('temp', 2);
      segment = 'that';
      index = 0;
    }

    this._extractSymbol('=');

    this.compileExpression();

    this._extractSymbol(';');

    // The result of the expression is now in the stack
    if (isArray) {
      this.vmWriter.writePush('temp', 2);
      this.vmWriter.writePop('pointer', 1);
    }
    this.vmWriter.writePop(segment, index);
  }

  compileStatements() {
    while (this.tokenizer.symbol() !== '}') {
      this._expectKeyword(statementStarters);
      switch (this.tokenizer.keyword()) {
        case JackTokenizer.KEYWORDS.LET:
          this.compileLetStatement();
          break;
        case JackTokenizer.KEYWORDS.DO:
          this.compileDoStatement();
          break;
        case JackTokenizer.KEYWORDS.WHILE:
          this.compileWhileStatement();
          break;
        case JackTokenizer.KEYWORDS.IF:
          this.compileIfStatement();
          break;
        case JackTokenizer.KEYWORDS.RETURN:
          this.compileReturnStatement();
          break;
      }
    }
  }

  _compileParameter() {
    const { token: type } = this._extractType();
    const { token: name } = this._extractIdentifier();
    this.symbolTable.define(name, type, SymbolTable.KINDS.ARG);
  }

  compileParameterList() {
    if (this.tokenizer.symbol() !== ')') {
      this._compileParameter();

      while (this.tokenizer.symbol() !== ')') {
        this._extractSymbol(',');
        this._compileParameter();
      }
    }
  }

  compileSubroutineVars() {
    while (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.VAR) {
      this.compileVarDec();
    }
  }

  compileSubroutineBody() {
    this._expectKeyword(statementStarters);
    this.compileStatements();
  }

  compileSubroutine() {
    this.symbolTable.startSubroutine();
    this.endOfCurrentSubroutine = generateLabel();

    const { token: subroutineType } = this._extractKeyword(subroutineStarters);

    let returnType;
    if (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.VOID) {
      const d = this._extractKeyword(JackTokenizer.KEYWORDS.VOID);
      returnType = d.token;
    } else {
      const d = this._extractType();
      returnType = d.token;
    }

    const { token: subroutineName } = this._extractIdentifier();

    if (subroutineType === JackTokenizer.KEYWORDS.METHOD) {
      this.symbolTable.define(
        thisArg,
        this.currentClassName,
        SymbolTable.KINDS.ARG
      );
    }

    this._extractSymbol('(');
    this.compileParameterList();
    this._extractSymbol(')');

    this._extractSymbol('{');
    this.compileSubroutineVars();

    const localArgsCount = this.symbolTable.count(SymbolTable.KINDS.VAR);
    this.vmWriter.writeFunction(
      `${this.currentClassName}.${subroutineName}`,
      localArgsCount
    );

    if (subroutineType === JackTokenizer.KEYWORDS.METHOD) {
      // Set the `this` symbol to the value of the first argument
      this.vmWriter.writePush('argument', 0);
      this.vmWriter.writePop('pointer', 0);
    } else if (subroutineType === JackTokenizer.KEYWORDS.CONSTRUCTOR) {
      // Allocate a new space for `this`
      const fieldsCount = this.symbolTable.count(SymbolTable.KINDS.FIELD);
      this.vmWriter.writePush('constant', fieldsCount);
      this.vmWriter.writeCall('Memory.alloc', 1);
      this.vmWriter.writePop('pointer', 0);
    } else if (subroutineType === 'function') {
      // Nothing is needed
    }

    this.compileSubroutineBody();
    this._extractSymbol('}');

    this.vmWriter.writeLabel(this.endOfCurrentSubroutine);
    if (returnType === JackTokenizer.KEYWORDS.VOID) {
      this.vmWriter.writePush('constant', 0);
    }
    this.vmWriter.writeReturn();
  }
}

module.exports = CompilationEngine;
