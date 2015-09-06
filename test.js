var library = require("nrtv-library")(require)

library.test(
  "sending a message from the browser",

  ["./socket", "nrtv-element", "nrtv-server", "nrtv-browser-bridge", "nrtv-browse"],
  function(expect, done, socket, element, Server, BrowserBridge, browse) {

    var orders = socket("burger order")
    var burgers = socket("burger")

    orders.subscribe(
      function(message) {
        expect(message.holdThe).to.equal("mayo")

        burgers.publish({
          tastiness: "hardly"
        })

        runChecks()
      }
    )

    var orderBurger = orders.publish.defineOnClient().withArgs({holdThe: ["mayo"]})

    var button = element("button", {
      onclick: orderBurger.evalable()
    }, "Burger me bro!")

    burgers.subscribe.defineOnClient(
      function(burger) {
        document.write("That was a "+burger.tastiness+" tasty burger!")
      }
    )

    Server.get("/", BrowserBridge.sendPage(button))

    Server.start(4110)

    return done()
    var browser = browse("http://localhost:4110", function() {

      browser.pressButton("button")
    })

    function runChecks() {
      browser.assert.text("body", "a hardly tasty burger")
      Server.stop()
      done()
    }

  }
)
