let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
  });
  ioInstance.on('connection', (socket) => {
    // Placeholder for future room joins if needed
  });
  return ioInstance;
}

function getIo() {
  return ioInstance;
}

module.exports = { initSocket, getIo };



