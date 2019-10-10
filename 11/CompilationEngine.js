const JackTokenizer = require('./JackTokenizer');
const XMLWritter = require('./XMLWritter');

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
  constructor(sourceFilePath, destWritter) {
    this.tokenizer = new JackTokenizer(sourceFilePath);
    this.xmlWritter_old = new XMLWritter(destWritter);
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

  _writeCurrentToken() {
    console.log('Writing');
    const tokenType = this.tokenizer.token();
    switch (tokenType) {
      case JackTokenizer.TOKENTYPES.IDENTIFIER:
        this.xmlWritter_old.writeTag('identifier', this.tokenizer.identifier());
        break;
      case JackTokenizer.TOKENTYPES.KEYWORD:
        this.xmlWritter_old.writeTag(
          'keyword',
          this.tokenizer.keyword().toLowerCase()
        );
        break;
      case JackTokenizer.TOKENTYPES.SYMBOL:
        this.xmlWritter_old.writeTag('symbol', this.tokenizer.symbol());
        break;
      case JackTokenizer.TOKENTYPES.INT_CONST:
        this.xmlWritter_old.writeTag(
          'integerConstant',
          this.tokenizer.intVal()
        );
        break;
      case JackTokenizer.TOKENTYPES.STRING_CONST:
        this.xmlWritter_old.writeTag(
          'stringConstant',
          this.tokenizer.stringVal()
        );
        break;
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

  _compileIdentifier() {
    this._expectIdentifier();
    this._writeCurrentToken();
    this.tokenizer.advance();
  }

  _compileIntegerConstant() {
    this._expectIntegerConstant();
    this._writeCurrentToken();
    this.tokenizer.advance();
  }

  _compileStringConstant() {
    this._expectStringConstant();
    this._writeCurrentToken();
    this.tokenizer.advance();
  }

  _compileSymbol(symbol) {
    this._expectSymbol(symbol);
    this._writeCurrentToken();
    this.tokenizer.advance();
  }

  _compileKeyword(keyword) {
    this._expectKeyword(keyword);
    this._writeCurrentToken();
    this.tokenizer.advance();
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
    this.xmlWritter_old.openTag('class');

    this._compileKeyword(JackTokenizer.KEYWORDS.CLASS);

    this._compileIdentifier();

    this._compileSymbol('{');
    this._compileClassBody();
    this._compileSymbol('}');

    this.xmlWritter_old.closeTag('class');
  }

  compileType() {
    try {
      this._compileKeyword([
        JackTokenizer.KEYWORDS.INT,
        JackTokenizer.KEYWORDS.CHAR,
        JackTokenizer.KEYWORDS.BOOLEAN
      ]);
    } catch (e) {
      this._compileIdentifier();
    }
  }

  _compileVarName() {
    this._compileIdentifier();
  }

  _compileVarNames() {
    this._compileVarName();

    if (this.tokenizer.symbol() !== ';') {
      this._compileSymbol(',');
      this._compileVarNames();
    }
  }

  compileVarDec() {
    this.xmlWritter_old.openTag('varDec');
    this._compileKeyword(JackTokenizer.KEYWORDS.VAR);
    this.compileRestVarDec();
    this.xmlWritter_old.closeTag('varDec');
  }

  compileRestVarDec() {
    this.compileType();

    this._compileVarNames();

    this._compileSymbol(';');
  }

  compileClassVarDec() {
    this.xmlWritter_old.openTag('classVarDec');

    this._compileKeyword(classVarDecStarters);

    this.compileRestVarDec();

    this.xmlWritter_old.closeTag('classVarDec');
  }

  _compileTermIdentifier() {
    const { nextTokenDescriptor } = this.tokenizer.peekNext();
    if (nextTokenDescriptor.symbol === '[') {
      this._compileIdentifier();
      this._compileSymbol('[');
      this.compileExpression();
      this._compileSymbol(']');
    } else if (
      nextTokenDescriptor.symbol === '(' ||
      nextTokenDescriptor.symbol === '.'
    ) {
      this.compileSubroutineCall();
    } else {
      this._compileIdentifier();
    }
  }

  compileTerm() {
    this.xmlWritter_old.openTag('term');
    if (this.tokenizer.token() === JackTokenizer.TOKENTYPES.INT_CONST) {
      this._compileIntegerConstant();
    } else if (
      this.tokenizer.token() === JackTokenizer.TOKENTYPES.STRING_CONST
    ) {
      this._compileStringConstant();
    } else if (this._includes(keywordConstants, this.tokenizer.keyword())) {
      this._compileKeyword(keywordConstants);
    } else if (this._includes(unaryOperations, this.tokenizer.symbol())) {
      this._compileSymbol(unaryOperations);
      this.compileTerm();
    } else if (this.tokenizer.symbol() === '(') {
      this._compileSymbol('(');
      this.compileExpression();
      this._compileSymbol(')');
    } else if (this.tokenizer.token() === JackTokenizer.TOKENTYPES.IDENTIFIER) {
      this._compileTermIdentifier();
    }
    this.xmlWritter_old.closeTag('term');
  }

  compileOperation() {
    this._compileSymbol();
  }

  compileExpression() {
    this.xmlWritter_old.openTag('expression');
    this.compileTerm();
    while (this._includes(operations, this.tokenizer.symbol())) {
      this.compileOperation();
      this.compileTerm();
    }
    this.xmlWritter_old.closeTag('expression');
  }

  compileExpressionList() {
    this.compileExpression();
    while (this.tokenizer.symbol() === ',') {
      this._compileSymbol(',');
      this.compileExpression();
    }
  }

  compileSubroutineCall() {
    this._compileIdentifier();

    if (this.tokenizer.symbol() === '.') {
      this._compileSymbol('.');
      this._compileIdentifier();
    }

    this._compileSymbol('(');
    this.xmlWritter_old.openTag('expressionList');
    if (this.tokenizer.symbol() !== ')') {
      this.compileExpressionList();
    }
    this.xmlWritter_old.closeTag('expressionList');
    this._compileSymbol(')');
  }

  _compileBody() {
    this._compileSymbol('{');
    this.compileStatements();
    this._compileSymbol('}');
  }

  compileReturnStatement() {
    this.xmlWritter_old.openTag('returnStatement');

    this._compileKeyword(JackTokenizer.KEYWORDS.RETURN);
    if (this.tokenizer.symbol() !== ';') {
      this.compileExpression();
    }
    this._compileSymbol(';');

    this.xmlWritter_old.closeTag('returnStatement');
  }

  compileDoStatement() {
    this.xmlWritter_old.openTag('doStatement');

    this._compileKeyword(JackTokenizer.KEYWORDS.DO);
    this.compileSubroutineCall();
    this._compileSymbol(';');

    this.xmlWritter_old.closeTag('doStatement');
  }

  compileWhileStatement() {
    this.xmlWritter_old.openTag('whileStatement');

    this._compileKeyword(JackTokenizer.KEYWORDS.WHILE);

    this._compileSymbol('(');
    if (this.tokenizer.symbol() !== ')') {
      this.compileExpression();
    }
    this._compileSymbol(')');

    this._compileBody();

    this.xmlWritter_old.closeTag('whileStatement');
  }

  compileIfStatement() {
    this.xmlWritter_old.openTag('ifStatement');
    this._compileKeyword(JackTokenizer.KEYWORDS.IF);

    this._compileSymbol('(');
    if (this.tokenizer.symbol() !== ')') {
      this.compileExpression();
    }
    this._compileSymbol(')');

    this._compileBody();

    if (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.ELSE) {
      this._compileKeyword(JackTokenizer.KEYWORDS.ELSE);
      this._compileBody();
    }
    this.xmlWritter_old.closeTag('ifStatement');
  }

  compileLetStatement() {
    this.xmlWritter_old.openTag('letStatement');
    this._compileKeyword(JackTokenizer.KEYWORDS.LET);
    this._compileIdentifier();

    if (this.tokenizer.symbol() === '[') {
      this._compileSymbol('[');
      this.compileExpression();
      this._compileSymbol(']');
    }

    this._compileSymbol('=');

    this.compileExpression();

    this._compileSymbol(';');

    this.xmlWritter_old.closeTag('letStatement');
  }

  compileStatements() {
    this.xmlWritter_old.openTag('statements');
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
    this.xmlWritter_old.closeTag('statements');
  }

  _compileParameter() {
    this.compileType();
    this._compileIdentifier();
  }

  compileParameterList() {
    this.xmlWritter_old.openTag('parameterList');
    if (this.tokenizer.symbol() !== ')') {
      this._compileParameter();

      while (this.tokenizer.symbol() !== ')') {
        this._compileSymbol(',');
        this._compileParameter();
      }
    }
    this.xmlWritter_old.closeTag('parameterList');
  }

  compileSubroutineBody() {
    this.xmlWritter_old.openTag('subroutineBody');
    this._compileSymbol('{');

    this._expectKeyword([...statementStarters, JackTokenizer.KEYWORDS.VAR]);

    while (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.VAR) {
      this.compileVarDec();
    }

    this.compileStatements();

    this._compileSymbol('}');
    this.xmlWritter_old.closeTag('subroutineBody');
  }

  compileSubroutine() {
    this.xmlWritter_old.openTag('subroutineDec');
    this._compileKeyword(subroutineStarters);

    if (this.tokenizer.keyword() === JackTokenizer.KEYWORDS.VOID) {
      this._compileKeyword(JackTokenizer.KEYWORDS.VOID);
    } else {
      this.compileType();
    }

    this._compileIdentifier();

    this._compileSymbol('(');
    this.compileParameterList();
    this._compileSymbol(')');

    this.compileSubroutineBody();

    this.xmlWritter_old.closeTag('subroutineDec');
  }
}

module.exports = CompilationEngine;
