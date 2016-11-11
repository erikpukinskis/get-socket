var test = require("nrtv-test")(require)


test.using(
  "server receives data",
  ["./", "ws", "nrtv-server", "querystring"],
  function(expect, done, getSocket, WebSocket, Server, querystring) {

    var server = new Server()

    var socketServer =
      getSocket.handleConnections(
        server,
        function(connection, next) {
          var params = querystring.parse(connection.upgradeReq.url.split("?")[1])

          var wantIt = params.__nrtvSingleUseSocketIdentifier == "102dk102ke2"

          if (wantIt) {
            connection.on("message", expectSingle)
          } else {
            next()
          }
        }
      )

    server.start(8000)

    function sendMessage(message) {
      var ws = new WebSocket('ws://localhost:8000/echo/websocket?__nrtvSingleUseSocketIdentifier=102dk102ke2')

      ws.on("open", function() {
        ws.send(message)
      })
    }

    sendMessage("barf")

    function expectSingle(data) {
      expect(data).to.equal("barf")
      done()
      server.stop()
    }

  }
)





test.using(
  "sending in the browser",

  ["./", "web-element", "nrtv-server", "browser-bridge", "nrtv-browse",],
  function(expect, done, getSocket, element, Server, BrowserBridge, browse) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(connection) {
        connection.on("message", haveExpectations)
      }
    )

    var bridge = new BrowserBridge()

    var send = bridge.defineFunction(
      [getSocket.defineOn(bridge)],
      function pontificate(getSocket) {
        getSocket(function(socket) {
          socket.send("you'll never be yourself again")
        })
      }
    )

    bridge.asap(send)

    server.addRoute("get", "/", bridge.sendPage())

    server.start(1104)

    var cleanUp
    var gotMessage = false

    browse("http://localhost:1104", function(browser) {

        cleanUp = function() {
          browser.done()
          server.stop()
          done()
        }
        if (gotMessage) { cleanUp() }
      }
    )

    function haveExpectations(message) {
      expect(message).to.equal("you'll never be yourself again")
      if (cleanUp) { cleanUp }
      else { gotMessage = true }
    }
  }
)
