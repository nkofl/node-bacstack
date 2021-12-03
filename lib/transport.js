'use strict';

const os                = require('os')
const createSocket      = require('dgram').createSocket;
const EventEmitter      = require('events').EventEmitter;

class Transport extends EventEmitter {
  constructor(settings) {
    super();
    this._broadcastInterfaces = [];
    this._broadcastInterfaceTime = null;
    this._settings = settings;
    this._server = createSocket({type: 'udp4', reuseAddr: settings.reuseAddr});
    this._server.on('message', (msg, rinfo) => this.emit('message', msg, rinfo.address));
    this._server.on('error', (err) => {
        if(err.message.includes('bind') || err.message.includes('EADDRINUSE')){
            console.log('Error, failed to bind bacnet port',err);
            throw(err);
        }
        this.emit('message', err);
    });
  }

  getBroadcastAddress() {
    return this._settings.broadcastAddress;
  }

  refreshBroadcastInterfaces () {
    const now = Date.now()
    try {
      // refresh interface list at most once every 5 minutes
      if (!this._broadcastInterfaceTime || now - this._broadcastInterfaceTime > 300) {
        this._broadcastInterfaces = Object.values(os.networkInterfaces()).reduce((acc, iface) => {
          for (let address of iface) {
            if (address.family === 'IPv4' && address.address && address.netmask && !address.internal) {
              const ip = address.address.split('.').map(octet => Number(octet))
              const netmask = address.netmask.split('.').map(octet => Number(octet))
              if (ip.length === 4 && netmask.length === 4) {
                const broadcast = []
                for(let i = 0; i < 4; ++i) {
                  broadcast.push(ip[i] | (~Number(netmask[i]) & 0xff))
                }
                acc.push(broadcast.join('.'))
              }
            }
          }
          return acc
        }, [])
        this._broadcastInterfaceTime = now
      }
    } catch(err) {
      this._broadcastInterfaces = []
      this._broadcastInterfaceTime = now
    }
  }

  getMaxPayload() {
    return 1482;
  }

  send(buffer, offset, receiver) {
    //global broadcast needs to send out all interfaces
    if (receiver === this._settings.broadcastAddress && this._settings.broadcastAddress === '255.255.255.255') {
      this.refreshBroadcastInterfaces()
      for (const iface of this._broadcastInterfaces) {
        this._server.send(buffer, 0, offset, this._settings.port, iface);
      }
    } else {
      this._server.send(buffer, 0, offset, this._settings.port, receiver);
    }
  }

  open() {
    this._server.bind(this._settings.listenPort, this._settings.interface, () => {
      this._server.setBroadcast(true);
    });
  }

  close() {
    this._server.close();
  }
}
module.exports = Transport;
