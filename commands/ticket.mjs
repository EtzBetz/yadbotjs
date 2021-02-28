import Discord from 'discord.js'
import files from '../classes/Files.mjs'
import yadBot from '../classes/YadBot.mjs'

export default {
    name: 'ticket',
    enabled: true,
    description: 'I will respond with the ticket drawn.',
    args: '(<info>/<undo>)',
    onlyOwner: true,
    execute(message, args) {
        let ticketChances = files.readJson(
            yadBot.getCommandConfigPath(this.name),
            'ticket_chances',
            true,
        )
        let ticketNames = files.readJson(
            yadBot.getCommandConfigPath(this.name),
            'ticket_names',
            true,
        )
        let ticketNumber = files.readJson(
            yadBot.getCommandConfigPath(this.name),
            'tickets_drawn',
            false,
            0,
        )
        let ticketHistory = files.readJson(
            yadBot.getCommandConfigPath(this.name),
            'ticket_history',
            false,
            [],
        )
        let totalChances = 0
        ticketChances.forEach(chance => totalChances += chance)

        if (args[0] === 'info') {
            let embedText = `Es sind noch **${totalChances}** Tickets über:`

            for (let i = 0; i < ticketChances.length; i++) {
                embedText += `\n> \`${ticketChances[i].toString().padStart(totalChances.toString().length, '0')}\` Tickets verbleiben für **${ticketNames[i]}**`
            }

            embedText += `\n\nEs wurden **${ticketNumber}** Tickets genutzt.`


            message.channel.send(new Discord.MessageEmbed({
                title: `Ticketautomat`,
                description: embedText,
            }))

        }
        else if (args[0] === 'undo') {
            message.channel.send(new Discord.MessageEmbed({
                title: `Ticketautomat`,
                description: `Das letzte Ticket #${ticketNumber} (${ticketNames[ticketHistory[ticketHistory.length - 1]]}) wird wieder zurückgelegt.\nEs sind also wieder ${totalChances + 1} Tickets über.`,
            }))

            ticketChances[ticketHistory.pop()]++

            files.writeJson(yadBot.getCommandConfigPath(this.name), 'ticket_chances', ticketChances)
            files.writeJson(yadBot.getCommandConfigPath(this.name), 'tickets_drawn', --ticketNumber)
            files.writeJson(yadBot.getCommandConfigPath(this.name), 'ticket_history', ticketHistory)
        }
        else {

            let randomNumber = Math.floor(Math.random() * totalChances) + 1
            let curNumber = 0
            for (let i = 0; i < ticketChances.length; i++) {
                curNumber += ticketChances[i]
                if (randomNumber <= curNumber) {
                    curNumber = i
                    break
                }
            }

            ticketChances[curNumber]--
            ticketHistory.push(curNumber)
            files.writeJson(yadBot.getCommandConfigPath(this.name), 'ticket_chances', ticketChances)
            files.writeJson(yadBot.getCommandConfigPath(this.name), 'tickets_drawn', ++ticketNumber)
            files.writeJson(yadBot.getCommandConfigPath(this.name), 'ticket_history', ticketHistory)

            message.channel.send(new Discord.MessageEmbed({
                title: `Ticket #${ticketNumber}`,
                description: `Du hast das Ticket '${ticketNames[curNumber]}' gezogen!`,
            }))
        }
    },
}