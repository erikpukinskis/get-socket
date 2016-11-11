var library = require("nrtv-library")(require)




module.exports = library.export(
  "get-socket",
  ["browser-bridge", "ws", "http"],
  function(bridge, ws, http) {


    function Socket(connection) {
      this.connection = connection
      this.url = connection.upgradeReq.url
      this.connection.on("message", handleMessage.bind(this))
    }

    function handleMessage(message) {
      if (!this.listener) {
        throw new Error("no listener!")
      }
      this.listener(message)
    }

    Socket.prototype.listen = function(callback) {
      this.listener = callback
    }

    Socket.prototype.send = function(message) {
      setTimeout(this.connection.send.bind(this.connection, message))
    }

    Socket.prototype.onClose = function(callback) {
      this.connection.on("close", callback)
    }


    function SocketServer(server) {

      var socketServer = server.__socketServer

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
      server.__socketServer = this

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
      var socketServer = server.__socketServer

      if (!socketServer) {
        socketServer = server.__socketServer = new SocketServer(server)
      }

      socketServer.use(handler)
    }

    function defineOnBridge(bridge) {
      var binding = bridge.__getSocketBinding
      if (binding) {
        return binding
      }

      binding = bridge.__getSocketBinding = bridge.defineFunction([bridge.collective({})], getSocketInBrowser)

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