'use strict';

const baEnum      = require('./enum');

module.exports.encode = (buffer, func, msgLength) => {
  buffer[0] = baEnum.BVLL_TYPE_BACNET_IP;
  buffer[1] = func;
  buffer[2] = (msgLength & 0xFF00) >> 8;
  buffer[3] = (msgLength & 0x00FF) >> 0;
  return baEnum.BVLC_HEADER_LENGTH;
};

module.exports.decode = (buffer, offset) => {
  let len;
  let forwardedFor = null;
  const func = buffer[1];
  const msgLength = (buffer[2] << 8) | (buffer[3] << 0);
  if (buffer[0] !== baEnum.BVLL_TYPE_BACNET_IP || buffer.length !== msgLength) return;
  switch (func) {
    case baEnum.BvlcResultPurpose.BVLC_RESULT:
    case baEnum.BvlcResultPurpose.ORIGINAL_UNICAST_NPDU:
    case baEnum.BvlcResultPurpose.ORIGINAL_BROADCAST_NPDU:
    case baEnum.BvlcResultPurpose.DISTRIBUTE_BROADCAST_TO_NETWORK:
      len =  4;
      break;
    case baEnum.BvlcResultPurpose.FORWARDED_NPDU:
      len = 10;
      forwardedFor = {
        ip: `${buffer[4]}.${buffer[5]}.${buffer[6]}.${buffer[7]}`,
        port: (buffer[8] << 8) + buffer[9]
      }
      break;
    case baEnum.BvlcResultPurpose.REGISTER_FOREIGN_DEVICE:
    case baEnum.BvlcResultPurpose.READ_FOREIGN_DEVICE_TABLE:
    case baEnum.BvlcResultPurpose.DELETE_FOREIGN_DEVICE_TABLE_ENTRY:
    case baEnum.BvlcResultPurpose.READ_BROADCAST_DISTRIBUTION_TABLE:
    case baEnum.BvlcResultPurpose.WRITE_BROADCAST_DISTRIBUTION_TABLE:
    case baEnum.BvlcResultPurpose.READ_BROADCAST_DISTRIBUTION_TABLE_ACK:
    case baEnum.BvlcResultPurpose.READ_FOREIGN_DEVICE_TABLE_ACK:
    case baEnum.BvlcResultPurpose.SECURE_BVLL:
      return;
    default:
      return;
  }
  return {
    len: len,
    func: func,
    msgLength: msgLength,
    forwardedFor: forwardedFor
  };
};
