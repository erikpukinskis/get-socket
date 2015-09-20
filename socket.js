var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-socket",

  [library.collective({}), "./socket-server", "nrtv-browser-bridge"],
  function(collective, SocketServer, bridge) {

    function getServer() {
      if (!collective.socketServer) {
        collective.socketServer = new SocketServer()
      }

      return collective.socketServer
    }



    /* Client functions */

    var getClientSocket = bridge.defineOnClient(
      [bridge.collective({
        callbacks: []
      })],
      function getSocket(collective, callback) {

        if (collective.open) {
          return callback(collective.socket)
        }

        collective.callbacks.push(callback)

        if (collective.socket) {
          return
        }

        var socket = collective.socket = new WebSocket("ws://"+window.location.host+"/echo/websocket")

        socket.onopen = function () {
          collective.open = true
          collective.callbacks.forEach(
            function(callback) {
              callback(socket)
            }
          )
        }

      }
    )

    var publishFromBrowser = bridge.defineOnClient(
      [getClientSocket],
      function publish(getSocket, topic, data) {

        getSocket(function(socket) {
          socket.send(JSON.stringify({
            topic:topic,
            data: data
          }))
        })
      }
    )

    var subscribeInBrowser = bridge.defineOnClient(
        [
          bridge.collective({
            subscriptions: {}
          }),
          getClientSocket
        ],

        function subscribe(collective, getSocket, topic, callback) {

          if (!collective.subscriptions[topic]) {
            collective.subscriptions[topic] = []
          }

          collective.subscriptions[topic].push(callback)

          if (!collective.listening) {
            getSocket(
              function(socket) {
                socket.onmessage = handleMessage
                collective.listening = true
              }
            )
          }

          function handleMessage(message) {

            if (!collective.subscriptions) { return }

            var message = JSON.parse(message.data)

            collective.subscriptions[message.topic].forEach(
              function(callback) {
                callback(message.data)
              }
            )
          }

        }
      )



    /* Interface */

    function Socket(topic) {
      this.topic = topic
      this.publishQueue = []
    }

    Socket.prototype.publish =
      function(data) {
        getServer().publish(this.topic, data)
      }

    Socket.prototype.subscribe =
      function(callback) {
        getServer().subscribe(this.topic, callback)
      }

    Socket.prototype.definePublishOnClient =
      function() {
        return publishFromBrowser.withArgs(this.topic)
      }
  
    Socket.prototype.defineSubscribeOnClient =
      function(callback) {
        return subscribeInBrowser.withArgs(this.topic)
      }

    return Socket
  }
)