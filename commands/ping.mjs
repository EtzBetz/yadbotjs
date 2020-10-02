export default {
    name: 'ping',
    description: "I will respond with \"pong!\".",
    execute(message, args) {
        message.channel.send("pong!")
    }
}
