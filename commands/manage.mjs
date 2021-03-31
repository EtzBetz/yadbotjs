import yadBot from './../classes/YadBot'
import config from '../config.json'
import Discord from 'discord.js'
import files from '../classes/Files.mjs'

export default {
    name: 'manage',
    enabled: true,
    args: '<status/toggle/errorinfo/send> (@toggle<scraper-name>) (@toggle<on/off>) (@notify<scraper-name>) (@send<scraper-name>) (@send<file-name>) (@send<channel-id>)',
    description: 'Shows the **status** of all scrapers, **toggle**s their state individually, **notify**s subscribers about an unreliably working scraper or re-**send**s an old message again.',
    onlyAdmin: true,
    execute(message, args) {

        switch (args[0]?.toLowerCase()) {
        case undefined:
            yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command.\n Use \`${config.prefix}help\` to get more information`)
            break
        case 'status':
            let statusDescription = ``

            yadBot.scrapers.forEach((scraper) => {
                statusDescription += '\n\n'
                if (scraper.timer._destroyed) {
                    statusDescription += '🟥'
                } else {
                    statusDescription += '🟩'
                }
                statusDescription += `  ${scraper.constructor.name}`
            })

            message.channel.send(
                new Discord.MessageEmbed({
                    'title': 'Scraper Statuses',
                    'description': `Here is a list of all scrapers and their statuses:${statusDescription}`,
                }),
            )
            break
        case 'toggle':
            const scraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(args[1].toLowerCase()))

            const turnOnScrapers = args[2] !== undefined && args[2] === 'on' || args[2] === 'true' || args[2] === '1'
            const turnOffScrapers = args[2] !== undefined && args[2] === 'off' || args[2] === 'false' || args[2] === '0'

            if (!turnOnScrapers && !turnOffScrapers || scraper === undefined) {
                yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                return
            }

            let alreadyInDesiredState = false
            let scraperWasActive = !scraper.timer._destroyed
            if (turnOffScrapers) {
                if (scraperWasActive) {
                    scraper.destroyTimerInterval()
                } else {
                    alreadyInDesiredState = true
                }
            } else if (turnOnScrapers) {
                if (!scraperWasActive) {
                    scraper.createTimerInterval()
                } else {
                    alreadyInDesiredState = true
                }
            }

            if (alreadyInDesiredState) {
                message.channel.send(
                    new Discord.MessageEmbed({
                        title: scraperWasActive ? 'Already online' : 'Already offline',
                        description: `${scraper.constructor.name} is already ${scraperWasActive ? 'active' : 'inactive'}.`,
                        color: 0xF44336,
                    }),
                )
            } else {
                message.channel.send(
                    new Discord.MessageEmbed({
                        title: scraperWasActive ? `Turned off` : `Turned on`,
                        description: `${scraper.constructor.name} has been toggled ${scraperWasActive ? `inactive` : `active`}.`,
                        color: scraperWasActive ? 0xff6f00 : 0x4CAF50,
                    }),
                )
            }
            break
        case 'notify':
            const targetScraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(args[1].toLowerCase()))

            if (targetScraper === undefined) {
                yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                return
            }
            targetScraper.sendUnreliableEmbedToSubscribers()
            break
        case 'send':
            const sendingScraper = yadBot.scrapers.find(scraper => scraper.constructor.name.toLowerCase().includes(args[1].toLowerCase()))

            if (sendingScraper === undefined) {
                yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
                return
            }

            // todo: create method to check file existence, otherwise admins can spam-create empty files
            const jsonData = files.readCompleteJson(`${sendingScraper.getScraperEmbedPath()}/${args[2]}`)
            if (JSON.stringify(jsonData) === JSON.stringify({})) {
                yadBot.sendCommandErrorEmbed(message, `The given file could not be found`)
                return
            }

            const embed = sendingScraper.filterEmbedLength(sendingScraper.getEmbed(jsonData.data[jsonData.data.length-1]))

            // todo: add argument 'all', send to all subscribers then
            yadBot.getBot().channels.fetch(args[3])
                .then(channel => {
                    if (yadBot.getBot().user === null) return
                    sendingScraper.log(`Sending embed(s) to ${channel.guild?.name}:${channel.name}`)
                    channel.send(embed)
                        .catch(e => {
                            sendingScraper.errorLog(`error with guild ${channel?.guild?.id} channel ${channel?.id}`)
                            yadBot.sendMessageToOwner(`error with guild ${channel?.guild?.id} channel ${channel?.id}`)
                            sendingScraper.sendMissingAccessToGuildAdmins(channel.guild.id)
                            console.dir(e)
                        })
                })
                .catch((e) => {
                    console.log(e)
                    yadBot.sendCommandErrorEmbed(message, `The given channel id does not exist or can not be accessed by Yad.`)
                })

            break
        default:
            yadBot.sendCommandErrorEmbed(message, `You need to provide additional arguments for this command or incorrect arguments were given.\n Use \`${config.prefix}help\` to get more information`)
        }
    },
}
