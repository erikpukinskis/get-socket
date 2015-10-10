var library = require("nrtv-library")(require)

module.exports = library.export(
  "socket-server",
  [library.collective({}), "sockjs", "nrtv-server", "http"],
  function(collective, sockjs, nrtvServer, http) {

    function SocketServer() {
      this.socket = sockjs.createServer()

      var middlewares = this.middlewares = []

      var app = nrtvServer.express()

      var httpServer = http.createServer(app);

      this.socket.installHandlers(httpServer, {prefix: "/echo"})

      nrtvServer.relenquishControl(
        function start(port) {
          httpServer.listen(port)
          console.log("listening on "+port+" (for websockets too)")
          return httpServer
        })

      var socketServer = this

      this.socket.on("connection", function(conn) {

        socketServer.conn = conn

        conn.on("data", handleData)

        function handleData(message) {

          message = JSON.parse(message)
          var i = 0
          handleOneMore(message)

          function handleOneMore(message) {
            var middleware = middlewares[i++]
            if (middleware) {
              middleware(message, handleOneMore)
            }
          }
        }

      })
    }

  SocketServer.prototype.publish =
    function(object) {
      if (!this.conn) {
        throw new Error("Tried to publish to socket but it isn't connected yet.")
      }

      this.conn.write(JSON.stringify(object))
    }

    SocketServer.prototype.use =
      function(middleware) {
        if (typeof middleware != "function") {
          throw new Error("Tried to provide a middleware with socketServer.use, but "+JSON.stringify(middleware)+" is not a function.")
        }
        this.middlewares.push(middleware)
      }

    library.collectivize(
      SocketServer,
      collective,
      function() {
        return new SocketServer()
      },
      ["use", "publish"]
    )

    return SocketServer
  }  
)