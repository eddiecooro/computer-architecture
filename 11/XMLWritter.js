const fs = require('fs');
class XMLWritter {
  constructor(destPath) {
    this.writer = fs.createWriteStream(destPath, { encoding: 'utf8' });
    this.openTags = [];
  }

  _sanitize(str = '') {
    str = str.replace('&', '&amp;');
    str = str.replace('<', '&lt;');
    str = str.replace('>', '&gt;');
    str = str.replace('"', '&quot;');
    return str;
  }

  writeTag(tagName, tagContents) {
    tagName = this._sanitize(tagName);
    tagContents = this._sanitize(tagContents);
    this.writer.write(`<${tagName}> ${tagContents} </${tagName}>\n`);
  }

  openTag(tagName) {
    this.openTags.push(tagName);
    tagName = this._sanitize(tagName);
    this.writer.write(`<${tagName}>\n`);
  }

  closeTag(tagName) {
    let found = false;
    this.openTags = this.openTags.reduceRight((tags, tag) =>
      !found && tag === tagName ? tags : [tag, ...tags]
    );
    tagName = this._sanitize(tagName);
    this.writer.write(`</${tagName}>\n`);
  }

  closeAllOpenTags() {
    this.openTags.forEach(tag => this.closeTag(tag));
  }
}

module.exports = XMLWritter;
