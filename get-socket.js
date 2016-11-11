var library = require("nrtv-library")(require)




module.exports = library.export(
  "nrtv-socket",
  ["browser-bridge", "ws", "nrtv-server", "http"],
  function(bridge, ws, nrtvServer, http) {


    function SocketServer(server) {
      if (!server) {
        server = nrtvServer
      }

      var socketServer = server.__nrtvSocketServer

      if (socketServer) {
        throw new Error("The server already has a socket server associated with it. Do you want to do SocketServer.onServer(yourServer) instead? You can call that as many times as you want.")
      }

      this.adopters = []
      this._takeOver(server)
    }

    SocketServer.prototype.use =
      function(handler) {
        this.adopters.push(handler)
      }

    SocketServer.prototype._takeOver =
      function(server) {
        server.__nrtvSocketServer = this

        var app = server.express()

        var httpServer = http.createServer(app);

        var wsServer = new ws.Server({server: httpServer})

        this.adopters.push(function(conn) {
          throw new Error("unadopted conn!")
        })

        server.relenquishControl(
          function start(port) {
            httpServer.listen(port)
            return httpServer
          })

        wsServer.on("connection", this._handleNewConnection.bind(this))
      }

    SocketServer.prototype._handleNewConnection =
      function(connection) {
        var adopters = this.adopters

        var location = console.log("URLLLLLLLLL", connection.upgradeReq.url)

        var i = adopters.length - 1

        tryAnother()

        function tryAnother() {
          var adopter = adopters[i--]

          if (adopter) {
            adopter(connection, tryAnother)
          }
        }
      }

    function handleConnections(server, handler) {
      var socketServer = server.__nrtvSocketServer

      if (!socketServer) {
        socketServer = server.__nrtvSocketServer = new SocketServer(server)
      }

      socketServer.use(handler)
    }

    function defineOnBridge(bridge) {
      var binding = bridge.__getSocketBinding
      if (binding) {
        return binding
      }

      binding = bridge.__getSocketBinding = bridge.defineFunction([bridge.collective({})],getSocketInBrowser)

      return binding
    }

    function getSocketInBrowser(collective, callback, queryString) {

      var match = document.cookie.match(/nrtvMinionId=([a-z0-9]*)/)

      var minionId = match && match[1]
      var isOutside = !!document.isOutsideNrtvMinionIframe

      if (minionId && !isOutside) {
        var addendum = "__nrtvMinionId="+minionId
        if (queryString) {
          queryString += "&"+addendum
        } else {
          queryString = "?"+addendum
        }
      }

      var url = "ws://"+window.location.host+"/echo/websocket"+(queryString)

      if (!collective[url]) {
        collective[url] = {callbacks: []}
      }
      collective = collective[url]

      if (collective.open) {
        return callback(collective.socket)
      }

      collective.callbacks.push(callback)

      if (collective.socket) {
        return
      }

      var socket = collective.socket = new WebSocket(url)

      socket.onopen = function () {
        collective.open = true
        collective.callbacks.forEach(
          function(callback) {
            callback(socket)
          }
        )
      }

    }

    return {
      defineOn: defineOnBridge,
      handleConnections: handleConnections
    }

  }
)