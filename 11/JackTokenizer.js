const fs = require('fs');

const keywordRegex = /^(class|constructor|function|method|field|static|var|int|char|boolean|void|true|false|null|this|let|do|if|else|while|return)/;
const symbolRegex = /^(\{|\}|\(|\)|\[|\]|\.|\,|\;|\+|\-|\*|\/|\&|\||\<|\>|\=|\~)$/;
const stringRegex = /^\"(?<str>.*)\"$/;
const integerRegex = /^\d+/;
const identifierRegex = /^[a-zA-Z_][a-zA-Z_\d]*/;

class JackTokenizer {
  constructor(input) {
    this.file = fs.readFileSync(input, 'utf8');
    this.index = 0;
    this._currentlyProcessing = '';
    this.currentToken = null;
    this.currentTokenDescriptor = null;
  }

  _advanceOneCharacter() {
    this._currentlyProcessing += this.file.slice(this.index, this.index + 1);
    this.index++;
  }

  _peekNextCharacter() {
    return this.file.slice(this.index, this.index + 1);
  }

  _findFirstOccurance(dest) {
    const searchIndex = this.file.substr(this.index).search(dest);
    const result = searchIndex === -1 ? searchIndex : searchIndex + this.index;
    return result;
  }

  _resetState() {
    this._currentlyProcessing = '';
  }

  foundToken(token, tokenDesc) {
    this.currentToken = token;
    this.currentTokenDescriptor = { ...tokenDesc, loc: this.index };
    this._currentlyProcessing = '';
  }

  peekNext() {
    const currentToken = this.currentToken;
    const currentTokenDescriptor = this.currentTokenDescriptor;
    const _currentlyProcessing = this._currentlyProcessing;
    const index = this.index;

    this.advance();
    const nextToken = this.currentToken;
    const nextTokenDescriptor = this.currentTokenDescriptor;

    this.currentTokenDescriptor = currentTokenDescriptor;
    this.currentToken = currentToken;
    this._currentlyProcessing = _currentlyProcessing;
    this.index = index;

    return {
      nextToken,
      nextTokenDescriptor
    };
  }

  advance() {
    let i = 0;
    tWhile: while (i++ < 100 && this.hasMoreTokens()) {
      this._advanceOneCharacter();
      let c = this._currentlyProcessing;

      if (c === '/') {
        const next = this._peekNextCharacter();
        if (next === '/') {
          this.index = this._findFirstOccurance(/\n/) + 1;
          this._resetState();
          continue tWhile;
        }
        if (next === '*') {
          this.index = this._findFirstOccurance(/\*\//) + 2;
          this._resetState();
          continue tWhile;
        }
      }

      const symbolMatch = c.match(symbolRegex);
      if (symbolMatch) {
        this.foundToken(JackTokenizer.TOKENTYPES.SYMBOL, {
          symbol: symbolMatch[0]
        });
        break tWhile;
      }

      const strMatch = c.match(stringRegex);
      if (strMatch) {
        this.foundToken(JackTokenizer.TOKENTYPES.STRING_CONST, {
          stringVal: strMatch.groups.str
        });
        break tWhile;
      }

      const endWithSpaceMatch = c.match(/(?<beforeSpace>.*)\s$/);
      if (endWithSpaceMatch) {
        const beforeSpace = endWithSpaceMatch.groups.beforeSpace;
        if (!beforeSpace) {
          this.index = this._findFirstOccurance(/\S/g);
          this._resetState();
          continue tWhile;
        }

        const integerMatch = beforeSpace.match(integerRegex);
        if (integerMatch) {
          this.foundToken(JackTokenizer.TOKENTYPES.INT_CONST, {
            intVal: integerMatch[0]
          });
          const extraParsedLength = c.length - integerMatch[0].length;
          this.index = this.index - extraParsedLength;
          break tWhile;
        }

        const keywordMatch = beforeSpace.match(keywordRegex);
        if (keywordMatch) {
          const length = keywordMatch[0].length;
          const rest = beforeSpace.slice(length);
          if (!(rest && rest.match(identifierRegex))) {
            this.foundToken(JackTokenizer.TOKENTYPES.KEYWORD, {
              keyword: keywordMatch[0]
            });
            const extraParsedLength = c.length - keywordMatch[0].length;
            this.index = this.index - extraParsedLength;
            break tWhile;
          }
        }

        const idMatch = beforeSpace.match(identifierRegex);
        if (idMatch) {
          this.foundToken(JackTokenizer.TOKENTYPES.IDENTIFIER, {
            identifier: idMatch[0]
          });
          const extraParsedLength = c.length - idMatch[0].length;
          this.index = this.index - extraParsedLength;
          break tWhile;
        }
      }
    }
  }

  token() {
    return this.currentToken;
  }

  keyword() {
    return getEnumByKeyword(this.currentTokenDescriptor.keyword);
  }

  symbol() {
    return this.currentTokenDescriptor.symbol;
  }

  identifier() {
    return this.currentTokenDescriptor.identifier;
  }

  intVal() {
    return this.currentTokenDescriptor.intVal;
  }

  stringVal() {
    return this.currentTokenDescriptor.stringVal;
  }

  hasMoreTokens() {
    return this.file.substr(this.index).search(/\S/g) !== -1;
  }
}

JackTokenizer.TOKENTYPES = {
  KEYWORD: 'KEYWORD',
  SYMBOL: 'SYMBOL',
  IDENTIFIER: 'IDENTIFIER',
  INT_CONST: 'INT_CONST',
  STRING_CONST: 'STRING_CONST'
};

JackTokenizer.KEYWORDS = {
  CLASS: 'CLASS',
  METHOD: 'METHOD',
  FUNCTION: 'FUNCTION',
  CONSTRUCTOR: 'CONSTRUCTOR',
  INT: 'INT',
  BOOLEAN: 'BOOLEAN',
  CHAR: 'CHAR',
  VOID: 'VOID',
  VAR: 'VAR',
  STATIC: 'STATIC',
  FIELD: 'FIELD',
  LET: 'LET',
  DO: 'DO',
  IF: 'IF',
  ELSE: 'ELSE',
  WHILE: 'WHILE',
  RETURN: 'RETURN',
  TRUE: 'TRUE',
  FALSE: 'FALSE',
  NULL: 'NULL',
  THIS: 'THIS'
};

function getEnumByKeyword(keyword = '') {
  return JackTokenizer.KEYWORDS[keyword.toUpperCase()];
}

module.exports = JackTokenizer;
