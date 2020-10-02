export default {
    name: 'pong',
    description: "I will respond with \"ping!\".",
    execute(message, args) {
        message.channel.send("ping!")
    }
}
