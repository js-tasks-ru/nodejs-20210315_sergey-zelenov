const stream = require('stream');
const os = require('os');

class LineSplitStream extends stream.Transform {
  constructor(options) {
    super(options);
    this._prevLinePart = '';
  }
  
  _transform(chunk, encoding, callback) {
    const lines = chunk.toString().split(os.EOL);
    const linesCount = lines.length;
    let linesQueue = [];
    
    if (!linesCount) {
      this._prevLinePart += chunk.toString();
    } else if (lines[linesCount - 1]) {
      if (this._prevLinePart) {
        lines[0] = `${this._prevLinePart}${lines[0]}`;
      }
      
      linesQueue = linesQueue.concat(lines.slice(0, linesCount - 1));
      for (const line of linesQueue) {
        this.push(line);
      }
      
      this._prevLinePart = lines[linesCount - 1];
    }
    
    callback();
  }
  
  _flush(callback) {
    if (this._prevLinePart) {
      this.push(this._prevLinePart);
    }
    callback();
  }
}

module.exports = LineSplitStream;
