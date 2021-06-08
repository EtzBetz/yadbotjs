import * as rax from 'retry-axios'
import axios from 'axios'
import * as Discord from 'discord.js'
import yadBot from './YadBot'
import {debugLog, errorLog, log, red, reset} from '../index'
import jsdom from 'jsdom'
import luxon from 'luxon'
import files from './Files.mjs'
import EmbedColors from '../constants/EmbedColors.mjs';

export class WebsiteScraper {

    constructor() {
        this.timer = null
        this.setup()
    }

    getUserAgent() {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'
    }

    getExpectedResponseType() {
        return 'text/html'
    }

    async getScrapingUrl(scrapeInfo) {
        return files.readJson(
            this.getScraperConfigPath(),
            'scraping_url',
            true,
            'ENTER SCRAPING URL HERE',
        )
    }

    getScrapingInterval() {
        return files.readJson(
            this.getScraperConfigPath(),
            'interval_milliseconds',
            false,
            600000,
        )
    }

    getSubUserIds() {
        return files.readJson(
            this.getScraperConfigPath(),
            'sub_user_ids',
            false,
            [
                files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE'),
            ],
        )
    }

    getSubGuildChannelIds() {
        return files.readJson(
            this.getScraperConfigPath(),
            'sub_guild_channel_ids',
            false,
            [],
        )
    }

    log(...message) {
        log(`${red}[${this.constructor.name.substring(7)}]${reset}\t${message}`)
    }

    debugLog(...message) {
        debugLog(`${red}[${this.constructor.name.substring(7)}]${reset}\t${message}`)
    }

    errorLog(...message) {
        errorLog(`${red}[${this.constructor.name.substring(7)}]${reset}\t${message}`)
    }

    setup() {
        console.log(`${this.constructor.name}:\tSetting Up...`)

        let scraperState = files.readJson(this.getScraperConfigPath(), 'enabled', false, true)
        if (scraperState === true) {
            setTimeout(() => {
                this.createTimerInterval()
            }, 5000)
        }
    }

    createTimerInterval() {
        this.timeIntervalBody()
        this.timer = setInterval(() => {
            try {
                this.timeIntervalBody()
            } catch (e) {
                console.log(e)
                yadBot.sendMessageToOwner(e)
            }
        }, this.getScrapingInterval())
    }

    destroyTimerInterval() {
        this.log(`Destroying Interval...`)
        clearInterval(this.timer)
    }

    async timeIntervalBody() {
        this.log(`Fetching and parsing website...`)
        let scrapeInfo = {}
        scrapeInfo.url = await this.getScrapingUrl(scrapeInfo)
        scrapeInfo.response = await this.requestWebsite(scrapeInfo.url)
        scrapeInfo.content = []
        try {
            let jsonContents = await this.parseWebsiteContentToJSON(scrapeInfo)
            for (let jsonContent of jsonContents) {
                scrapeInfo.content.push({
                    json: jsonContent
                })
            }
        } catch (e) {
            yadBot.sendMessageToOwner(`Error 1 while parsing response to JSON in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``)
        }
        this.filterNewContent(scrapeInfo)
        let newContentCount = 0
        for (let entry of scrapeInfo.content) {
            if (entry.newData === true) newContentCount++
        }
        this.log(`${newContentCount} entries are new.`)
        if (yadBot.getBot().user === null) {
            this.log('Bot is not yet online, not sending messages..')
            // todo: the loop is never ending, fix somehow.
            while (yadBot.getBot().user === null) {
            }
            this.log('Bot is now online! Sending messages..')
        }
        scrapeInfo.content = scrapeInfo.content.sort(this.getSortingFunction())
        if (newContentCount >= 1) this.log(`Generating ${newContentCount} embed(s)...`)
        scrapeInfo.content.forEach(content => {
            try {
                if (content.newData === true) {
                    content.rendered = (this.filterEmbedLength(this.getEmbed(content.json)))
                }
            } catch (e) {
                yadBot.sendMessageToOwner(`Error 2 while generating embeds and filtering length in "${this.constructor.name}"!\n\`\`\`text\n${e.stack}\`\`\``)
            }
        })
        if (newContentCount >= 1) {
            await this.sendEmbedMessages(scrapeInfo)
        }

    }

    async requestWebsite(url) {
        return await axios({
            method: 'get',
            url: url,
            headers: {'User-Agent': this.getUserAgent()},
            responseType: this.getExpectedResponseType(),
            raxConfig: {
                retry: 5,
                noResponseRetries: 5,
                retryDelay: 100,
            }
        })
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document
        let elements = []
        let entities = page.querySelectorAll('title')
        this.log(`${entities.length} entries found...`)

        entities.forEach((entity, index) => {
            elements.push({
                title: entity.textContent.trim(),
            })
        })

        return elements
    }

    filterNewContent(scrapeInfo) {
        for (let contentIndex in scrapeInfo.content) {
            if (!scrapeInfo.content.hasOwnProperty(contentIndex)) continue
            const fileName = this.generateFileNameFromJson(scrapeInfo.content[contentIndex].json)
            const filePath = `${this.getScraperEmbedPath()}/${fileName}`

            let readData = files.readJson(filePath, 'data', false, [])
            if (readData.length === 0) {
                console.log(fileName, 'does not exist, so it is new content.')
            }

            let latestData = readData[readData.length - 1]
            if (latestData === undefined) latestData = {}

            if (JSON.stringify(latestData) !== JSON.stringify(scrapeInfo.content[contentIndex].json)) {
                scrapeInfo.content[contentIndex].newData = true
                readData.push(scrapeInfo.content[contentIndex].json)
                files.writeJson(filePath, 'data', readData)
                console.log(`JSON data is saved in ${this.generateFileNameFromJson(scrapeInfo.content[contentIndex].json)}.`)
            } else {
                scrapeInfo.content[contentIndex].newData = false
            }
        }
    }

    getGlobalScraperFolderPath() {
        return './scraperFiles'
    }

    getScraperFolderPath() {
        return `${this.getGlobalScraperFolderPath()}/${this.constructor.name}`
    }

    getScraperConfigPath() {
        return `${this.getScraperFolderPath()}/config/config.json`
    }

    getScraperEmbedPath() {
        return `${this.getScraperFolderPath()}/embeds`
    }

    generateFileNameFromJson(json) {
        let fileName = `test`
        return this.generateSlugFromString(fileName) + '.json'
    }

    async sendEmbedMessages(intervalInformation) {
        let sendState = files.readJson(this.getScraperConfigPath(), 'send_embeds', false, true)
        let globalSendState = files.readJson(yadBot.getYadConfigPath(), 'global_send_embeds', false, true)
        let newContentCount = 0
        for (let entry of intervalInformation.content) {
            if (entry.newData === true) newContentCount++
        }
        if (newContentCount === 0 || !sendState || !globalSendState) return
        this.log(`Sending ${newContentCount} embed(s)...`)
        for (let channelId of this.getSubGuildChannelIds()) {
            let channel = await yadBot.getBot().channels.fetch(channelId)
                .catch((e) => console.dir(e))
            if (yadBot.getBot().user === null) return
            this.log(`Sending embed(s) to ${channel.guild.name}:${channel.name}`)
            for (let contentEntry of intervalInformation.content) {
                if (contentEntry.newData !== true) return
                let sentMessage = await channel.send(contentEntry.rendered)
                    .catch(e => {
                        yadBot.sendMessageToOwner(`error with guild ${channel?.guild?.id} channel ${channel?.id}`)
                        this.sendMissingAccessToGuildAdmins(channel.guild.id)
                        console.dir(e)
                    })
                const fileName = this.generateFileNameFromJson(contentEntry.json)
                const filePath = `${this.getScraperEmbedPath()}/${fileName}`
                let sentChannels = files.readJson(
                    filePath,
                    'sent_channels',
                    false,
                    {
                        guild_message_ids: [],
                        user_message_ids: [],
                    }
                )
                sentChannels.guild_message_ids.push(sentMessage.id)
                files.writeJson(filePath, 'sent_channels', sentChannels)
            }
        }
        for (let userId of this.getSubUserIds()) {
            let user = await yadBot.getBot().users.fetch(userId)
                .catch((e) => console.dir(e))
            if (yadBot.getBot().user === null) return
            this.log(`Sending embed(s) to ${user.username}`)
            for (let contentEntry of intervalInformation.content) {
                if (contentEntry.newData !== true) return
                let sentMessage = await user?.send(contentEntry.rendered)
                    .catch(e => console.dir(e))
                const fileName = this.generateFileNameFromJson(contentEntry.json)
                const filePath = `${this.getScraperEmbedPath()}/${fileName}`
                let sentChannels = files.readJson(
                    filePath,
                    'sent_channels',
                    false,
                    {
                        guild_message_ids: [],
                        user_message_ids: [],
                    }
                )
                sentChannels.user_message_ids.push(sentMessage.id)
                files.writeJson(filePath, 'sent_channels', sentChannels)
            }
        }
    }

    getEmbed(content) {
        return new Discord.MessageEmbed({
            title: 'Preview Embed',
            description: `Website title: "${content.title}"`,
            color: EmbedColors.GREEN,
            url: this.getScrapingUrl(),
        })
    }

    getSortingFunction() {
        return function (jsonA, jsonB) {
            return 0
        }
    }

    sortJsonByIsoDateAndTitleProperty(contentA, contentB) {
        const jsonADate = parseInt(luxon.DateTime.fromISO(contentA.json.date).toFormat('yyyyMMddHHmmss'), 10)
        const jsonBDate = parseInt(luxon.DateTime.fromISO(contentB.json.date).toFormat('yyyyMMddHHmmss'), 10)

        if (jsonADate < jsonBDate) {
            // console.log(`contentB is newer: ${jsonBDate} > ${jsonADate}`)
            return -1
        } else if (jsonADate > jsonBDate) {
            // console.log(`contentA is newer: ${jsonADate} > ${jsonBDate}`)
            return 1
        } else if (contentB.json.title > contentA.json.title) {
            // console.log(`contentB is newer: ${contentB.json.title} > ${contentA.json.title}`)
            return -1
        } else if (contentA.json.title > contentB.json.title) {
            // console.log(`contentA is newer: ${contentA.json.title} > ${contentB.json.title}`)
            return 1
        }
        // console.log(`sorting: ${jsonADate} === ${jsonBDate} && ${contentA.json.title} === ${contentB.json.title}`)
        return 0
    }

    getUpdateEmbed() {
        this.log(`Generating Update-embed...`)
        return new Discord.MessageEmbed({
            title: `Update`,
            description: `Yad has been updated, some embeds will eventually be resent!`
        })
    }

    sendMissingAccessToGuildAdmins(guildId) {
        const noticeEmbed = new Discord.MessageEmbed({
            title: `Notice`,
            description: `New data is available from ${this.constructor.name}, but I can't send it to your specified channel. Eventually I have been kicked or I do not have permissions to send in that channel?`,
            color: EmbedColors.ORANGE,
        })

        yadBot.getBot().guilds.fetch(guildId)
            .then((guild) => {
                guild.owner?.send(noticeEmbed)
            })
            .catch(e => {
                this.errorLog("Could not message the guild's scraper channel and not the owner of that guild!")
                yadBot.sendMessageToOwner(`Could not message the guild's scraper channel and not the owner of that guild!`)
                console.dir(e)
            })
    }

    sendUnreliableEmbedToSubscribers() {
        const updateEmbed = new Discord.MessageEmbed({
            title: `Notice`,
            description: `New data is available from this scraper, but due to changes on the received data, Yad can not process it without error.\nYou can visit the page yourself [here](${this.getScrapingUrl()}) to inform yourself about changes.\nThis issue will be worked on as soon as possible and the owner knows about it.`,
            color: EmbedColors.ORANGE,
        })

        this.getSubGuildChannelIds().forEach(channelId => {
            yadBot.getBot().channels.fetch(channelId)
                .then(channel => {
                    if (yadBot.getBot().user === null) return
                    this.log(`Sending embed(s) to ${channel.guild.name}:${channel.name}`)
                    channel.send(updateEmbed)
                        .catch(e => console.dir(e))
                })
                .catch((e) => {
                    this.log(`Guild Channel '${channelId}' could not be found.`)
                    console.dir(e)
                })
        })
        this.getSubUserIds().forEach(userId => {
            yadBot.getBot().users.fetch(userId)
                .then(user => {
                    if (yadBot.getBot().user === null) return
                    this.log(`Sending embed(s) to ${user.username}`)
                    user?.send(updateEmbed)
                        .catch(e => console.dir(e))
                })
                .catch((e) => {
                    this.log(`User '${userId}' could not be found.`)
                    console.dir(e)
                })
        })
    }

    filterEmbedLength(embed) {
        const TITLE_LIMIT = 256
        const DESCRIPTION_LIMIT = 2048
        const FIELDS_COUNT_LIMIT = 25
        const FIELDS_NAME_LIMIT = 256
        const FIELDS_VALUE_LIMIT = 1024
        const FOOTER_TEXT_LIMIT = 2048
        const AUTHOR_NAME_LIMIT = 256
        const TOTAL_CHARACTERS_LIMIT = 6000

        // TODO: eventually use filterActive to display or send hint about filtering
        let filterActive = false

        if (embed?.title?.length > TITLE_LIMIT) {
            filterActive = true
            this.log(`Title limit has been exceeded in current embed "${embed.title.substring(0, 50)}"!`)
            embed.title = this.cutStringAddDots(embed.title, TITLE_LIMIT)
        }
        if (embed?.description?.length > DESCRIPTION_LIMIT) {
            filterActive = true
            this.log(`Description limit has been exceeded in current embed "${embed.description.substring(0, 50)}"!`)
            embed.description = this.cutStringAddDots(embed.description, DESCRIPTION_LIMIT)
        }
        if (embed?.fields?.length > FIELDS_COUNT_LIMIT) {
            filterActive = true
            this.log(`Fields count limit has been exceeded in current embed "${embed.title.substring(0, 50)}": ${embed.fields.length}!`)
            let numOfCutFields = embed.fields.length - FIELDS_COUNT_LIMIT
            embed.fields.splice(-1, numOfCutFields)

            embed.footer.text += `\nSYSTEM MESSAGE: ${numOfCutFields} fields have been cut to be able to send this message.`
        }
        embed?.fields?.forEach((field, index) => {
            if (field.name?.length > FIELDS_NAME_LIMIT) {
                filterActive = true
                this.log(`Field name limit has been exceeded in current embed "${index}(${field.name.substring(0, 50)})"!`)
                field.name = this.cutStringAddDots(field.name, FIELDS_NAME_LIMIT)
            }
            if (field.value?.length > FIELDS_VALUE_LIMIT) {
                filterActive = true
                this.log(`Field value limit has been exceeded in current embed "${index}(${field.value.substring(0, 50)})"!`)
                field.value = this.cutStringAddDots(field.value, FIELDS_VALUE_LIMIT)
            }
        })
        if (embed?.footer?.text?.length > FOOTER_TEXT_LIMIT) {
            filterActive = true
            this.log(`Footer text limit has been exceeded in current embed "${embed.footer.text.substring(0, 50)}"!`)
            embed.footer.text = this.cutStringAddDots(embed.footer.text, FOOTER_TEXT_LIMIT)
        }
        if (embed?.author?.name?.length > AUTHOR_NAME_LIMIT) {
            filterActive = true
            this.log(`Author name limit has been exceeded in current embed "${embed.author.name.substring(0, 50)}"!`)
            embed.author.name = this.cutStringAddDots(embed.author.name, AUTHOR_NAME_LIMIT)
        }


        if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
            filterActive = true
            this.log(`Total characters limit has been exceeded in current embed "${embed.title?.substring(0, 50)}:${embed.description?.substring(0, 50)}"!`)
            if (embed.footer.text.length >= 1) {
                this.log(`Cutting footer!`)
                let newFooterLength =
                    (embed.footer.text.length) - (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT)
                embed.footer.text = this.cutStringAddDots(embed.footer.text, newFooterLength)
            }

            if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                if (embed.author.name.length >= 1) {
                    this.log(`Cutting author!`)
                    let newAuthorLength =
                        (embed.author.name.length) - (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT)
                    embed.author.name = this.cutStringAddDots(embed.author.name, newAuthorLength)
                }

                if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.title.length >= 1) {
                        this.log(`Cutting title!`)
                        let newTitleLength =
                            (embed.title.length) - (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT)
                        embed.title = this.cutStringAddDots(embed.title, newTitleLength)
                    }
                }

                if (this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.description.length >= 1) {
                        this.log(`Cutting description!`)
                        let newDescriptionLength =
                            (embed.description.length) - (this.getTotalCharactersLengthFromEmbed(embed) - TOTAL_CHARACTERS_LIMIT)
                        embed.description = this.cutStringAddDots(embed.description, newDescriptionLength)
                    }

                    while (
                        this.getTotalCharactersLengthFromEmbed(embed) > TOTAL_CHARACTERS_LIMIT ||
                        embed.fields.length === 1
                        ) {
                        this.log(`Cutting last field!`)
                        embed.fields.pop()
                    }
                }
            }
        }

        return embed
    }

    getTotalCharactersLengthFromEmbed(embed) {
        let totalCharactersLength = 0
        if (embed.title?.length !== undefined) totalCharactersLength += embed.title?.length
        if (embed.description?.length !== undefined) totalCharactersLength += embed.description?.length
        if (embed.footer?.text?.length !== undefined) totalCharactersLength += embed.footer?.text?.length
        if (embed.author?.name?.length !== undefined) totalCharactersLength += embed.author?.name?.length

        let totalFieldsCharactersLength = 0
        embed.fields.forEach((field, index) => {
            totalFieldsCharactersLength += (field.name?.length + field.value?.length)
        })

        return totalCharactersLength + totalFieldsCharactersLength
    }

    cutStringAddDots(string, maxLength, extraStringEnd = null) {
        let stringEnd = ' (...)'
        if (extraStringEnd !== null) stringEnd = extraStringEnd

        if (typeof string === 'string') {
            return string.substring(0, (maxLength) - stringEnd.length) + stringEnd
        } else {
            this.log('string to cut is not a string:', typeof string)
            return string
        }
    }

    subscribe(interaction) {
        switch (interaction.channel.type) {
            case 'unknown':
                return {error: true, data: 'Message channel type was unknown.'}
            case 'dm':
                let subUsers = files.readJson(this.getScraperConfigPath(), 'sub_user_ids', false, [])

                let indexResult = subUsers.indexOf(interaction.user.id)
                if (indexResult === -1) {
                    subUsers.push(interaction.user.id)
                } else {
                    subUsers.splice(indexResult, 1)
                }
                files.writeJson(this.getScraperConfigPath(), 'sub_user_ids', subUsers)
                if (indexResult === -1) {
                    return {
                        error: false,
                        data: `You have been added to the subscribers list of scraper **${this.constructor.name}**.`,
                    }
                } else {
                    return {
                        error: false,
                        data: `You have been removed from the subscribers list of scraper **${this.constructor.name}**.`,
                    }
                }
            case 'text':
            case 'news':
                if (interaction.member.permissions.has(Discord.Permissions.FLAGS.ADMINISTRATOR)) {
                    let subChannels = files.readJson(this.getScraperConfigPath(), 'sub_guild_channel_ids', false, [])
                    let indexResultGuild = subChannels.indexOf(interaction.channel.id)
                    if (indexResultGuild === -1) {
                        subChannels.push(interaction.channel.id)
                    } else {
                        subChannels.splice(indexResultGuild, 1)
                    }
                    files.writeJson(this.getScraperConfigPath(), 'sub_guild_channel_ids', subChannels)
                    if (indexResultGuild === -1) {
                        return {
                            error: false,
                            data: `This channel has been **added** to the subscribers list of scraper **${this.constructor.name}**.`,
                        }
                    } else {
                        return {
                            error: false,
                            data: `This channel has been **removed** from the subscribers list of scraper **${this.constructor.name}**.`,
                        }
                    }
                } else {
                    return {
                        error: true,
                        data: `You need admin permissions on this server to be able to manage subscriptions.`,
                    }
                }
        }
    }

    generateSlugFromString(originalString) {
        const regexDisallowedChars = /([^a-zA-Z0-9])+/gm

        // todo: will only recognize text greater than 3 letters! find other regex!
        const regexSequenceFilter = /[^a-zA-Z0-9]*([a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9])[^a-zA-Z0-9]*/gm
        const regexAE = /[ä]/g
        const regexOE = /[ö]/g
        const regexUE = /[ü]/g
        const regexMultipleHyphens = /--+/g

        let replaced = originalString.toLowerCase()
        replaced = replaced.replace(regexAE, 'ae')
        replaced = replaced.replace(regexOE, 'oe')
        replaced = replaced.replace(regexUE, 'ue')
        replaced = replaced.replace(regexDisallowedChars, '-')
        replaced = replaced.replace(regexMultipleHyphens, '-')

        let slugStringResult = regexSequenceFilter.exec(replaced)

        return slugStringResult[1]
    }

}
