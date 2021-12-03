'use strict';

const expect      = require('chai').expect;
const utils       = require('./utils');
const baBvlc      = require('../../lib/bvlc');

describe('bacstack - BVLC layer', () => {
  it('should successfuly encode and decode a package', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      forwardedFor: null,
      len: 4,
      func: 10,
      msgLength: 1482
    });
  });

  it('should successfuly encode and decode a forwarded package', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 4, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.deep.equal({
      forwardedFor: { ip: '0.0.0.0', port: 0 },
      len: 10,
      func: 4,
      msgLength: 1482
    });
  });

  it('should fail if invalid BVLC type', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1482);
    buffer.buffer[0] = 8;
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid length', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 10, 1481);
    buffer.buffer[0] = 8;
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if invalid function', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 100, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });

  it('should fail if unsuported function', () => {
    const buffer = utils.getBuffer();
    baBvlc.encode(buffer.buffer, 5, 1482);
    const result = baBvlc.decode(buffer.buffer, 0);
    expect(result).to.equal(undefined);
  });
});
