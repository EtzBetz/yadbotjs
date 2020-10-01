export default {
    name: 'pongi',
    description: "says pingi!",
    execute(message, args) {
        console.log("debug2")
        message.channel.send("pingi!")
    }
}
