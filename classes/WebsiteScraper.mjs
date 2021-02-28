import axios from 'axios'
import * as Discord from 'discord.js'
import yadBot from './YadBot'
import { getLoggingTimestamp, log, debugLog, errorLog, red, reset } from '../index'
import jsdom from 'jsdom'
import luxon from 'luxon'
import files from './Files.mjs'
import scraper from '../commands/scraper.mjs'

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

    getScrapingUrl() {
        return 'https://google.com'
    }

    getScrapingInterval() {
        return 1000 * 60 * 5
    }

    getSubUserIds() {
        return files.readJson(
            this.getScraperConfigPath(),
            'sub_user_ids',
            false,
            [
                files.readJson(yadBot.getYadConfigPath(), 'owner', true, 'ENTER OWNER ID HERE')
            ]
        )
    }

    getSubGuildChannelIds() {
        return files.readJson(
            this.getScraperConfigPath(),
            'sub_guild_channel_ids',
            false,
            []
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

        let scraperState = files.readJson(this.getScraperConfigPath(), "enabled", false,true)
        if (scraperState === true) {
            setTimeout(() => {
                this.createTimerInterval()
            }, 5000)
        }
    }

    createTimerInterval() {
        this.timeIntervalBody()
        this.timer = setInterval(() => {
            this.timeIntervalBody()
        }, this.getScrapingInterval())
    }

    destroyTimerInterval() {
        this.log(`Destroying Interval...`)
        clearInterval(this.timer)
    }

    timeIntervalBody() {
        this.log(`Fetching and parsing website...`)
        this.requestWebsite(this.getScrapingUrl())
            .then((response) => {
                const content = this.parseWebsiteContentToJSON(response)
                this.filterNewContent(content, (filteredContent) => {
                    this.log(`${filteredContent.length} entries are new.`)
                    if (yadBot.getBot().user === null) {
                        this.log('Bot is not yet online, not sending messages..')
                        while (yadBot.getBot().user === null) {
                        }
                        this.log('Bot is now online! Sending messages..')
                    }
                    filteredContent = filteredContent.sort(this.getSortingFunction())
                    let embeds = []
                    filteredContent.forEach(content => {
                        embeds.push(this.filterEmbedLength(this.getEmbed(content)))
                    })
                    if (embeds.length >= 1) {
                        this.sendEmbedMessages(embeds)
                    }
                })
            })
            .catch((error) => console.dir(error))
    }

    requestWebsite(url) {
        return axios({
            method: 'get',
            url: url,
            headers: { 'User-Agent': this.getUserAgent() },
            responseType: this.getExpectedResponseType(),
        })
    }

    parseWebsiteContentToJSON(response) {
        const page = new jsdom.JSDOM(response.data).window.document
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

    filterNewContent(newJson, callback) {
        let filteredJsonArray = []
        let j = 0
        for (let i = 0; i < newJson.length; i++) {
            const fileName = this.generateFileNameFromJson(newJson[i])
            const filePath = `${this.getScraperEmbedPath()}/${fileName}`

            let readData = files.readCompleteJson(filePath)

            if (Object.keys(readData).length === 0 && readData.constructor === Object) {
                console.log(fileName, 'does not exist, so it is new content.')
            }

            if (JSON.stringify(readData) === JSON.stringify(newJson[i])) {
                j++

                if (j === (newJson.length)) {
                    callback(filteredJsonArray)
                }
            }
            else {
                filteredJsonArray.push(newJson[i])
                // write JSON string to file
                files.writeJson(filePath, newJson[i])

                console.log(`JSON data is saved in ${this.generateFileNameFromJson(newJson[i])}.`)
                j++

                if (j === (newJson.length)) {
                    callback(filteredJsonArray)
                }
            }
        }
    }

    getGlobalScraperFolderPath() {
        return "./scraperFiles"
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

    sendEmbedMessages(embeds) {
        let sendState = files.readJson(this.getScraperConfigPath(), "send_embeds", false, true)
        let globalSendState = files.readJson(yadBot.getYadConfigPath(), "global_send_embeds", false, true)
        if (embeds.length >= 1 && sendState && globalSendState) {
            this.log(`Sending embed(s)...`)
            this.getSubGuildChannelIds().forEach(channelId => {
                yadBot.getBot().channels.fetch(channelId)
                    .then(channel => {
                        if (yadBot.getBot().user === null) return
                        this.log(`Sending embed(s) to ${channel.guild.name}:${channel.name}`)
                        embeds.forEach(embed => {
                            channel.send(embed)
                                .catch(e => console.dir(e))
                        })
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
                        embeds.forEach(embed => {
                            user?.send(embed)
                                .catch(e => console.dir(e))
                        })
                    })
                    .catch((e) => {
                        this.log(`User '${userId}' could not be found.`)
                        console.dir(e)
                    })
            })
        }

    }

    getEmbed(content) {
        this.log(`Generating embed...`)
        return new Discord.MessageEmbed({
            title: 'Preview Embed',
            description: `Website title: "${content.title}"`,
            color: 0xeb6734,
            url: this.getScrapingUrl(),
        })
    }

    getSortingFunction() {
        return function(jsonA, jsonB) {
            return 0
        }
    }

    sortJsonByIsoDateAndTitleProperty(jsonA, jsonB) {
        const jsonADate = parseInt(luxon.DateTime.fromISO(jsonA.date).toFormat('yyyyMMddHHmmss'), 10)
        const jsonBDate = parseInt(luxon.DateTime.fromISO(jsonB.date).toFormat('yyyyMMddHHmmss'), 10)

        if (jsonADate < jsonBDate) {
            // console.log(`jsonB is newer: ${jsonBDate} > ${jsonADate}`)
            return -1
        }
        else if (jsonADate > jsonBDate) {
            // console.log(`jsonA is newer: ${jsonADate} > ${jsonBDate}`)
            return 1
        }
        else if (jsonB.title > jsonA.title) {
            // console.log(`jsonB is newer: ${jsonB.title} > ${jsonA.title}`)
            return -1
        }
        else if (jsonA.title > jsonB.title) {
            // console.log(`jsonA is newer: ${jsonA.title} > ${jsonB.title}`)
            return 1
        }
        // console.log(`sorting: ${jsonADate} === ${jsonBDate} && ${jsonA.title} === ${jsonB.title}`)
        return 0
    }

    getUpdateEmbed() {
        this.log(`Generating Update-embed...`)
        return new Discord.MessageEmbed({
            title: `Update`,
            description: `Yad has been updated, some embeds will eventually be resent!`,
            color: 0xff6f00,
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
        }
        else {
            this.log('string to cut is not a string:', typeof string)
            return string
        }
    }

    generateSlugFromString(originalString) {
        const regexDisallowedChars = /([^a-zA-Z0-9])+/gm
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
