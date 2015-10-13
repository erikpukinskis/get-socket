var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-socket",

  [library.collective({subscriptions: {}}), "nrtv-socket-server", "nrtv-browser-bridge"],
  function(collective, server, bridge) {

    /* Client functions */

    var getClientSocket = bridge.defineFunction(
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

    var publishFromBrowser = bridge.defineFunction(
      [getClientSocket],
      function publish(getSocket, topic, data) {

        getSocket(function(socket) {
          socket.send(JSON.stringify({
            __topic: topic,
            data: data
          }))
        })
      }
    )

    var subscribeInBrowser = bridge.defineFunction(
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

          // for this to work, we need the middlewares on the client side too. Hm.

          function handleMessage(message) {

            if (!collective.subscriptions) { return }

            var message = JSON.parse(message.data)

            collective.subscriptions[message.__topic].forEach(
              function(callback) {
                callback(message.data)
              }
            )
          }

        }
      )



    /* Interface */

    var subscriptions = collective.subscriptions

    function Socket(topic) {
      this.topic = topic
      this.publishQueue = []

      this.subscribe =
        function(callback) {
          if (!subscriptions[topic]) {
            subscriptions[topic] = []
          }

          subscriptions[topic].push(callback)
        }

      this.subscribe.defineInBrowser =
        function subscribe() {
          return subscribeInBrowser.withArgs(topic)
        }

      this.publish =
        function(data) {
          server.publish({
            __topic: topic,
            data: data
          })
        }

      this.publish.defineInBrowser =
        function publish() {
          return publishFromBrowser.withArgs(topic)
        }

    }

    server.use(
      function(message, next) {

        if (!message.__topic) {
          return next()
        }

        var callbacks = subscriptions[message.__topic] || []

        callbacks.forEach(function(callback) {
          callback(message.data)
        })

        next()
      }
    )

    return Socket
  }
)