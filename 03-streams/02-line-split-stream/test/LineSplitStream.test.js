const LineSplitStream = require('../LineSplitStream');
const expect = require('chai').expect;
const sinon = require('sinon');
const os = require('os');

describe('streams/line-split-stream', () => {
  describe('LineSplitStream', () => {
    it('стрим разбивает данные по строкам', (done) => {
      const lines = new LineSplitStream({encoding: 'utf-8'});

      const onData = sinon.spy();

      lines.on('data', onData);
      lines.on('end', () => {
        expect(onData.calledTwice, 'событие data должно быть вызвано 2 раза').to.be.true;
        expect(onData.firstCall.args[0]).to.equal('a');
        expect(onData.secondCall.args[0]).to.equal('b');

        done();
      });

      lines.write(`a${os.EOL}b`);
      lines.end();
    });

    it('стрим корректно передает данные даже если чанк не завершается переводом строки', (done) => {
      const lines = new LineSplitStream({encoding: 'utf-8'});

      const onData = sinon.spy();

      lines.on('data', onData);
      lines.on('end', () => {
        expect(onData.calledThrice, 'событие data должно быть вызвано 3 раза').to.be.true;
        expect(onData.firstCall.args[0]).to.equal('ab');
        expect(onData.secondCall.args[0]).to.equal('cd');
        expect(onData.thirdCall.args[0]).to.equal('ef');

        done();
      });

      lines.write('a');
      lines.write(`b${os.EOL}c`);
      lines.write(`d${os.EOL}e`);
      lines.write('f');

      lines.end();
    });

    it('событие onData срабатывает для всех строк, которые есть в чанке', (done) => {
      const lines = new LineSplitStream({encoding: 'utf-8'});

      const onData = sinon.spy();

      lines.on('data', onData);
      lines.on('end', () => {
        expect(onData.callCount, 'событие data должно быть вызвано 6 раз').to.be.equal(6);
        expect(onData.firstCall.args[0]).to.equal('a');
        expect(onData.secondCall.args[0]).to.equal('b');
        expect(onData.thirdCall.args[0]).to.equal('c');
        expect(onData.getCall(3).args[0]).to.equal('d');
        expect(onData.getCall(4).args[0]).to.equal('e');
        expect(onData.getCall(5).args[0]).to.equal('f');

        done();
      });

      lines.write(['a', 'b', 'c', 'd', 'e', 'f'].join(os.EOL));
      lines.end();
    });

    it('стрим не должен накапливать данные', function (done) {
      this.timeout(0);
      const lines = new LineSplitStream({encoding: 'utf-8'});

      const timeout = setTimeout(function () {
        done(new Error('стрим должен предавать данные дальше как только есть вся строка, а не накапливать данные'))
      }, 500)

      const onData = sinon.spy(() => {
        lines.end();
      });

      lines.on('data', onData);
      lines.on('end', () => {
        expect(onData.firstCall.args[0]).to.equal('a');
        clearTimeout(timeout)
        done();
      });

      lines.write(`a${os.EOL}`)
    })
  });
});
