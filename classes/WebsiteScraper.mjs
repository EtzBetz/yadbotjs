import axios from 'axios'
import cheerio from 'cheerio'
import * as Discord from 'discord.js'
import yadBot from './YadBot'
import fs from 'fs';
import config from '../config.json'
import luxon from 'luxon'

export class WebsiteScraper {

    constructor() {
        this.timer = null
        this.url = "https://google.com"
        this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36"
        this.expectedResponse = 'text/html'
        this.scrapingInterval = 1000 * 60 * 5
        this.guildChannelIds = [
            config.test_channel
        ]
        this.userIds = [
            config.owner
        ]
        this.scrapingFolder = "googleExample"
        this.websiteData = {}
        this.createTimerInterval()
    }

    log(message) {
        let currentTime = luxon.DateTime.local().toFormat('dd.MM. hh:mm:ss')
        console.log(`\x1b[1m\x1b[32m[${currentTime}]\x1b[0m \x1b[31m[${this.constructor.name}]\x1b[0m\t${message}`, )
    }

    createTimerInterval() {
        this.log(`Creating Interval...`)
        setTimeout(() => {
            this.timeIntervalBody()
            this.timer = setInterval(() => {
                this.timeIntervalBody()
            }, this.scrapingInterval)
        }, 5000)
    }

    destroyTimerInterval() {
        this.log(`Destroying Interval...`)
        clearInterval(this.timer)
    }

    timeIntervalBody() {
        this.log(`Fetching website...`)
        const request = this.requestWebsite()
            .then((response) => {
                const content = this.parseWebsiteContentToJSON(response)
                this.setUpScraperModuleFolder((err) => {
                    this.filterNewContent(content, (filteredContent) => {
                        this.log(`${filteredContent.length} entries are new.`)
                        if (yadBot.getBot().user === null) {
                            this.log("Bot is not yet online, not sending messages.")
                            return
                        }
                        let embeds = []
                        filteredContent.forEach(content => {
                            embeds.push(this.filterEmbedLength(this.getEmbed(content)))
                            embeds = embeds.sort(this.sortEmbeds)
                        })
                        if (embeds.length >= 1) {
                            this.sendEmbedMessages(embeds)
                        }
                    })
                })
            })
            .catch((error) => console.dir(error))
    }

    requestWebsite() {
        this.log(`Requesting website...`)
        return axios({
            method: 'get',
            url: this.url,
            headers: {'User-Agent': this.userAgent},
            responseType: this.expectedResponse
        });
    }

    parseWebsiteContentToJSON(response) {
        this.log("Parsing website...")
        const $ = cheerio.load(response.data)
        let title = $('title');
        return [
            {
                title: title.text()
            }
        ]
    }

    filterNewContent(newJson, callback) {

        let filteredJsonArray = []
        let j = 0;
        for (let i = 0; i < newJson.length; i++) {
            const filePath = `${this.getScraperFilesDirectory()}/${this.getScraperFileName(newJson[i])}`

            fs.readFile(
                filePath,
                { flag: 'r' },
                (err, readData) => {
                    if (err) {
                        this.log(this.getScraperFileName(newJson[i]), "does not exist, so it is new content.")
                    }
                    let jsonString = JSON.stringify(newJson[i]);

                    if (readData?.toString() === jsonString) {
                        j++

                        // this.log("debug3:", j)
                        // this.log("debug4:", filteredJsonArray.length)
                        if (j === (newJson.length)) {
                            callback(filteredJsonArray)
                        }
                    }
                    else {
                        filteredJsonArray.push(newJson[i])
                        // this.log("debug2:", filteredJsonArray.length)
                        // write JSON string to file
                        fs.writeFile(
                            filePath,
                            jsonString,
                            { flag: 'w' },
                            (err) => {
                                if (err) {
                                    console.dir(err);
                                }
                                this.log(`JSON data is saved in ${this.getScraperFileName(newJson[i])}.`);
                                j++

                                // this.log("debug5:", j)
                                // this.log("debug6:", filteredJsonArray.length)
                                if (j === (newJson.length)) {
                                    callback(filteredJsonArray)
                                }
                            }
                        );
                    }
                }
            )
        }
    }

    setUpScraperModuleFolder(callback) {
        fs.mkdir(this.getScraperFilesDirectory(), { recursive: true }, (err) => {
            if (err) {
                console.dir(err);
            }
            callback(err)
        })
    }

    getScraperFilesDirectory() {
        return `./scraperFiles/${this.scrapingFolder}`
    }

    getScraperFileName(json) {
        let fileName = `test`
        return this.filterStringForFileName(fileName + ".json")
    }

    filterStringForFileName(fileName) {
        const regex = /[/\\?%*:|"<> ]/g
        return fileName.replace(regex, '_').toLowerCase();
    }

    sendEmbedMessages(embeds) {
        if (embeds.length >= 1) {
            this.log(`Sending embed(s)...`)
            this.guildChannelIds.forEach(channelId => {
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
            this.userIds.forEach(userId => {
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
            title: "Preview Embed",
            description: `Website title: "${content.title}"`,
            color: 0xeb6734,
            url: this.url
        });
    }

    sortEmbeds(embedA, embedB) {
        return 0
    }

    getUpdateEmbed() {
        this.log(`Generating Update-embed...`)
        return new Discord.MessageEmbed({
            title: `Update`,
            description: `Yad has been updated, some embeds will eventually be resent!`,
            color: 0xff6f00
        });
    }

    filterEmbedLength(embed) {
        const TITLE_LIMIT = 256;
        const DESCRIPTION_LIMIT = 2048;
        const FIELDS_COUNT_LIMIT = 25;
        const FIELDS_NAME_LIMIT = 256;
        const FIELDS_VALUE_LIMIT = 1024;
        const FOOTER_TEXT_LIMIT = 2048;
        const AUTHOR_NAME_LIMIT = 256;
        const TOTAL_CHARACTERS_LIMIT = 6000;

        if (embed?.title?.length > TITLE_LIMIT) {
            this.log(`Title limit has been exceeded in current embed "${embed.title.substring(0,50)}"!`)
            embed.title = this.cutStringAddDots(embed.title, TITLE_LIMIT)
        }
        if (embed?.description?.length > DESCRIPTION_LIMIT) {
            this.log(`Description limit has been exceeded in current embed "${embed.description.substring(0,50)}"!`)
            embed.description = this.cutStringAddDots(embed.description, DESCRIPTION_LIMIT)
        }
        if (embed?.fields?.length > FIELDS_COUNT_LIMIT) {
            this.log(`Fields count limit has been exceeded in current embed "${embed.title.substring(0,50)}": ${embed.fields.length}!`)
            let numOfCutFields = embed.fields.length - FIELDS_COUNT_LIMIT
            embed.fields.splice(-1, numOfCutFields)

            embed.footer.text += `\nSYSTEM MESSAGE: ${numOfCutFields} fields have been cut to be able to send this message.`
        }
        embed?.fields?.forEach((field, index) => {
            if (field.name?.length > FIELDS_NAME_LIMIT) {
                this.log(`Field name limit has been exceeded in current embed "${index}(${field.name.substring(0,50)})"!`)
                field.name = this.cutStringAddDots(field.name, FIELDS_NAME_LIMIT)
            }
            if (field.value?.length > FIELDS_VALUE_LIMIT) {
                this.log(`Field value limit has been exceeded in current embed "${index}(${field.value.substring(0,50)})"!`)
                field.value = this.cutStringAddDots(field.value, FIELDS_VALUE_LIMIT)
            }
        })
        if (embed?.footer?.text?.length > FOOTER_TEXT_LIMIT) {
            this.log(`Footer text limit has been exceeded in current embed "${embed.footer.text.substring(0,50)}"!`)
            embed.footer.text = this.cutStringAddDots(embed.footer.text, FOOTER_TEXT_LIMIT)
        }
        if (embed?.author?.name?.length > AUTHOR_NAME_LIMIT) {
            this.log(`Author name limit has been exceeded in current embed "${embed.author.name.substring(0,50)}"!`)
            embed.author.name = this.cutStringAddDots(embed.author.name, AUTHOR_NAME_LIMIT)
        }


        if (this.getTotalCharactersLength(embed) > TOTAL_CHARACTERS_LIMIT) {
            this.log(`Total characters limit has been exceeded in current embed "${embed.title?.substring(0,50)}:${embed.description?.substring(0,50)}"!`)
            if (embed.footer.text.length >= 1) {
                this.log(`Cutting footer!`)
                let newFooterLength =
                    (embed.footer.text.length) - (this.getTotalCharactersLength(embed) - TOTAL_CHARACTERS_LIMIT)
                embed.footer.text = this.cutStringAddDots(embed.footer.text, newFooterLength)
            }

            if (this.getTotalCharactersLength(embed) > TOTAL_CHARACTERS_LIMIT) {
                if (embed.author.name.length >= 1) {
                    this.log(`Cutting author!`)
                    let newAuthorLength =
                        (embed.author.name.length) - (this.getTotalCharactersLength(embed) - TOTAL_CHARACTERS_LIMIT)
                    embed.author.name = this.cutStringAddDots(embed.author.name, newAuthorLength)
                }

                if (this.getTotalCharactersLength(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.title.length >= 1) {
                        this.log(`Cutting title!`)
                        let newTitleLength =
                            (embed.title.length) - (this.getTotalCharactersLength(embed) - TOTAL_CHARACTERS_LIMIT)
                        embed.title = this.cutStringAddDots(embed.title, newTitleLength)
                    }
                }

                if (this.getTotalCharactersLength(embed) > TOTAL_CHARACTERS_LIMIT) {
                    if (embed.description.length >= 1) {
                        this.log(`Cutting description!`)
                        let newDescriptionLength =
                            (embed.description.length) - (this.getTotalCharactersLength(embed) - TOTAL_CHARACTERS_LIMIT)
                        embed.description = this.cutStringAddDots(embed.description, newDescriptionLength)
                    }

                    while (
                        this.getTotalCharactersLength(embed) > TOTAL_CHARACTERS_LIMIT ||
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

    getTotalCharactersLength(embed) {
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
        let stringEnd = "..."
        if (extraStringEnd !== null) stringEnd = extraStringEnd

        if (typeof string === "string") {
            return string.substring(0, (maxLength) - stringEnd.length ) + stringEnd
        } else {
            this.log("string to cut is not a string:", typeof string)
            return string
        }
    }
}
