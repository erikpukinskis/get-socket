var library = require("nrtv-library")(require)




module.exports = library.export(
  "nrtv-socket",
  ["browser-bridge", "ws", "nrtv-server", "http"],
  function(bridge, ws, nrtvServer, http) {


    function Socket(connection) {
      this.connection = connection
      this.url = connection.upgradeReq.url
    }

    Socket.prototype.listen = function(callback) {
      this.connection.on("message", callback)
    }

    Socket.prototype.send = function(message) {
      throw new Error("impl")
    }

    Socket.prototype.onClose = function(callback) {
      throw new Error("impl")
    }


    function SocketServer(server) {

      if (!server) {
        server = nrtvServer
      }

      var socketServer = server.__nrtvSocketServer

      if (socketServer) {
        throw new Error("The server already has a socket server associated with it.")
      }

      this.adopters = []

      takeOver(server, this.adopters)
    }

    SocketServer.prototype.use =
      function(handler) {
        this.adopters.push(handler)
      }

    function takeOver(server, adopters) {
      server.__nrtvSocketServer = this

      var app = server.express()

      var httpServer = http.createServer(app);

      var wsServer = new ws.Server({server: httpServer})

      adopters.push(function(socket) {
        throw new Error("unadopted connection!")
      })

      server.relenquishControl(
        function start(port) {
          httpServer.listen(port)
          return httpServer
        }
      )


      function adopt(connection) {
        var socket = new Socket(connection)

        tryAnAdopter(adopters, adopters.length - 1, socket)
      }

      wsServer.on("connection", adopt)
    }

    function tryAnAdopter(adopters, index, socket) {

      var adopter = adopters[index]

      if (!adopter) { return }

      var tryAgain = tryAnAdopter.bind(null, adopters, index - 1, socket)

      adopter(socket, tryAgain)
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