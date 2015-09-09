var library = require("nrtv-library")(require)

library.test(
  "sending a message from the browser",

  ["./socket", "nrtv-element", "nrtv-server", "nrtv-browser-bridge", "nrtv-browse"],
  function(expect, done, Socket, element, Server, BrowserBridge, browse) {

    var orders = new Socket("burger order")
    var burgers = new Socket("burger")

    orders.subscribe(
      function(message) {
        console.log("heyah!")

        expect(message.holdThe).to.have.members(["mayo"])

        burgers.publish({
          tastiness: "hardly"
        })

        runChecks()
      }
    )

    var orderBurger = orders.definePublishOnClient().withArgs({holdThe: ["mayo"]})

    var button = element("button", {
      onclick: orderBurger.evalable()
    }, "Burger me bro!")

    burgers.defineSubscribeOnClient(
      function(burger) {
        document.write("That was a "+burger.tastiness+" tasty burger!")
      }
    )

    Server.get("/", BrowserBridge.sendPage(button))

    Server.start(4110)

    return done()
    var browser = browse("http://localhost:4110", function() {

      console.log("browser was", browser)

      browser.pressButton("button")
    })

    console.log("way back it is", browser)

    function runChecks() {
      console.log("browser is", browser)
      // browser.assert.text("body", "a hardly tasty burger")
      Server.stop()
      done()
    }

  }
)
