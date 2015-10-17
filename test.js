var test = require("nrtv-test")(require)

test.using(
  "provides a websocket interface in the browser",

  ["./socket", "nrtv-socket-server", "nrtv-element", "nrtv-server", "nrtv-browser-bridge", "nrtv-browse",],
  function(expect, done, socket, socketServer, element, server, bridge, browse) {


    socketServer.adoptConnections(
      function(connection) {
        connection.on("data", haveExpectations)
      }
    )

    var send = bridge.defineFunction(
      [socket.defineGetInBrowser()],
      function pontificate(getSocket) {
        getSocket(function(socket) {
          socket.send("you'll never be yourself again")
        })
      }
    )

    bridge.asap(send)

    server.get("/", bridge.sendPage())

    server.start(1104)

    browse("http://localhost:1104")

    function haveExpectations(message) {
      expect(message).to.equal("you'll never be yourself again")
      done()
      server.stop()
    }
  }
)
