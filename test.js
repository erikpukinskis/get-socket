var runTest = require("run-test")(require)

runTest(
  "server receives data",
  ["./", "ws", "web-site", "querystring"],
  function(expect, done, getSocket, WebSocket, Server, querystring) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket, next) {
        var params = querystring.parse(socket.url.split("?")[1])

        var wantIt = params.__nrtvSingleUseSocketIdentifier == "102dk102ke2"

        if (wantIt) {
          socket.listen(expectSingle)
        } else {
          next()
        }
      }
    )

    server.start(8000)

    var ws = new WebSocket('ws://localhost:8000/echo/websocket?__nrtvSingleUseSocketIdentifier=102dk102ke2')

    ws.on("open", function() {
      ws.send("barf")
    })

    function expectSingle(data) {
      expect(data).to.equal("barf")
      done()
      server.stop()
    }

  }
)




runTest(
  "server sends data",
  ["./", "ws", "web-site"],
  function(expect, done, getSocket, WebSocket, Server) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.send("i love you")
      }
    )

    server.start(8001)

    var ws = new WebSocket('ws://localhost:8001/echo/websocket')

    ws.on("message", function(data) {
      expect(data).to.equal("i love you")
      server.stop()
      done()
    })

  }
)




runTest(
  "detecting socket close",
  ["./", "ws", "web-site", "sinon"],
  function(expect, done, getSocket, WebSocket, Server, sinon) {

    var server = new Server()

    var record = sinon.spy()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.listen(record)
        socket.onClose(close)
      }
    )

    server.start(8002)

    var ws = new WebSocket('ws://localhost:8002/echo/websocket')

    ws.on("open", function() {
      ws.send("hi")
      ws.close()
    })

    function close() {
      record.should.have.been.called
      server.stop()
      done()
    }

  }
)



runTest(
  "sending in the browser",

  ["./", "web-element", "web-site", "browser-bridge", "browser-task",],
  function(expect, done, getSocket, element, Server, BrowserBridge, browserTask) {

    done.failAfter(1000000000)
    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.listen(haveExpectations)
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

    server.addRoute("get", "/", bridge.requestHandler())

    server.start(8003)

    var cleanUp
    var gotMessage = false

    browserTask(
      "http://localhost:8003",
      function(browser) {
        cleanUp = function() {
          browser.done()
          server.stop()
          done()
        }

        if (gotMessage) {
          cleanUp()
        }
      }
    )

    function haveExpectations(message) {
      expect(message).to.equal("you'll never be yourself again")
      if (cleanUp) {
        cleanUp()
      } else {
        gotMessage = true
      }
    }
  }
)
