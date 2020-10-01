export default {
    name: 'ping',
    description: "says pong!",
    execute(message, args) {
        console.log("debug1")
        message.channel.send("pong!")
    }
}
