'use strict';

const baEnum      = require('./enum');

const BACNET_PROTOCOL_VERSION = 1;
const BacnetAddressTypes = {
  NONE: 0,
  IP: 1
};

const decodeTarget = (buffer, offset) => {
  let len = 0;
  const target = {type: BacnetAddressTypes.NONE, net: (buffer[offset + len++] << 8) | (buffer[offset + len++] << 0)};
  const adrLen = buffer[offset + len++];
  if (adrLen > 0) {
    target.adr = [];
    for (let i = 0; i < adrLen; i++) {
      target.adr.push(buffer[offset + len++]);
    }
  }
  return {
    target: target,
    len: len
  };
};

const encodeTarget = (buffer, target) => {
  buffer.buffer[buffer.offset++] = (target.net & 0xFF00) >> 8;
  buffer.buffer[buffer.offset++] = (target.net & 0x00FF) >> 0;
  if (target.net === 0xFFFF || !target.adr) {
    buffer.buffer[buffer.offset++] = 0;
  } else {
    buffer.buffer[buffer.offset++] = target.adr.length;
    if (target.adr.length > 0) {
      for (let i = 0; i < target.adr.length; i++) {
        buffer.buffer[buffer.offset++] = target.adr[i];
      }
    }
  }
};

module.exports.decodeFunction = (buffer, offset) => {
  if (buffer[offset + 0] !== BACNET_PROTOCOL_VERSION) return;
  return buffer[offset + 1];
};

module.exports.decode = (buffer, offset) => {
  let adrLen;
  const orgOffset = offset;
  offset++;
  const funct = buffer[offset++];
  let destination;
  const data = {}
  if (funct & baEnum.NpduControlBits.DESTINATION_SPECIFIED) {
    const tmpDestination = decodeTarget(buffer, offset);
    offset += tmpDestination.len;
    destination = tmpDestination.target;
  }
  let source;
  if (funct & baEnum.NpduControlBits.SOURCE_SPECIFIED) {
    const tmpSource = decodeTarget(buffer, offset);
    offset += tmpSource.len;
    source = tmpSource.target;
  }
  let hopCount = 0;
  if (funct & baEnum.NpduControlBits.DESTINATION_SPECIFIED) {
    hopCount = buffer[offset++];
  }
  let networkMsgType = baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK;
  let vendorId = 0;
  if (funct & baEnum.NpduControlBits.NETWORK_LAYER_MESSAGE) {
    networkMsgType = buffer[offset++];
    if (networkMsgType >= 0x80) {
      vendorId = (buffer[offset++] << 8) | (buffer[offset++] << 0);
    } else {
      switch (networkMsgType) {
        case baEnum.NetworkLayerMessageType.WHO_IS_ROUTER_TO_NETWORK: {
          if (buffer.length - offset >= 2) {
            data.network = (buffer[offset++] << 8) | (buffer[offset++] << 0);
          }
          break;
        }
        case baEnum.NetworkLayerMessageType.ROUTER_BUSY_TO_NETWORK:
        case baEnum.NetworkLayerMessageType.ROUTER_AVAILABLE_TO_NETWORK:
        case baEnum.NetworkLayerMessageType.I_AM_ROUTER_TO_NETWORK: {
          data.networks = []
          while (buffer.length - offset >= 2) {
            data.networks.push((buffer[offset++] << 8) | (buffer[offset++] << 0));
          }
          break;
        }
        case baEnum.NetworkLayerMessageType.I_COULD_BE_ROUTER_TO_NETWORK: {
          if (buffer.length - offset >= 3) {
            data.network = (buffer[offset++] << 8) | (buffer[offset++] << 0);
            data.priority = buffer[offset++];
          }
          break;
        }
        case baEnum.NetworkLayerMessageType.REJECT_MESSAGE_TO_NETWORK: {
          if (buffer.length - offset >= 3) {
            data.reason = buffer[offset++];
            data.network = (buffer[offset++] << 8) | (buffer[offset++] << 0);
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  }
  if (buffer[orgOffset + 0] !== BACNET_PROTOCOL_VERSION) return;
  return {
    len: offset - orgOffset,
    funct: funct,
    destination: destination,
    source: source,
    hopCount: hopCount,
    networkMsgType: networkMsgType,
    vendorId: vendorId,
    data: data
  };
};

module.exports.encode = (buffer, funct, destination, source, hopCount, networkMsgType, vendorId) => {
  const hasDestination = destination && destination.net > 0;
  const hasSource = source && source.net > 0 && source.net !== 0xFFFF;

  buffer.buffer[buffer.offset++] = BACNET_PROTOCOL_VERSION;
  buffer.buffer[buffer.offset++] = funct | (hasDestination ? baEnum.NpduControlBits.DESTINATION_SPECIFIED : 0) | (hasSource ? baEnum.NpduControlBits.SOURCE_SPECIFIED : 0);

  if (hasDestination) {
    encodeTarget(buffer, destination);
  }

  if (hasSource) {
    encodeTarget(buffer, source);
  }

  if (hasDestination) {
    buffer.buffer[buffer.offset++] = hopCount;
  }

  if ((funct & baEnum.NpduControlBits.NETWORK_LAYER_MESSAGE) > 0) {
    buffer.buffer[buffer.offset++] = networkMsgType;
    if (networkMsgType >= 0x80) {
      buffer.buffer[buffer.offset++] = (vendorId & 0xFF00) >> 8;
      buffer.buffer[buffer.offset++] = (vendorId & 0x00FF) >> 0;
    }
  }
};
