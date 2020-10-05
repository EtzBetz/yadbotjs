import Discord from "discord.js"

export default {
    name: 'raids',
    enabled: false,
    description: "Displays a list of all raid bosses in GW2 with your progress.",
    onlyOwner: true,
    execute(message, args) {
        // todo: get users api key

        // todo: ask for key if not available

        // todo: request to gw2 api for progress

        // todo: list rendering

        // todo: eventually save last request date in api key file as well, if new week since then, display note about reset?

        message.channel.send(new Discord.MessageEmbed({
            title: "Raid Progress"
        }))
    }
}
