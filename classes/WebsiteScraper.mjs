import axios from 'axios'
import cheerio from 'cheerio'
import * as Discord from 'discord.js'
import yadBot from './YadBot'
import fs from 'fs';
import config from '../config.json'

export class WebsiteScraper {

    constructor() {
        this.timer = null
        this.url = "https://google.com"
        this.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36"
        this.expectedResponse = 'text/html'
        this.scrapingInterval = 1000 * 60 * 5
        this.guilds = [
            config.test_channel
        ]
        this.users = [
            config.admin
        ]
        this.scrapingFolder = "googleExample"
        this.websiteData = {}
        this.createTimerInterval()
    }

    createTimerInterval() {
        console.log("Creating Interval...")
        setTimeout(() => {
            this.timeIntervalBody()
            this.timer = setInterval(() => {
                this.timeIntervalBody()
            }, this.scrapingInterval)
        }, 5000)
    }

    timeIntervalBody() {
        console.log("Fetching website...")
        const request = this.requestWebsite()
            .then((response) => {
                const content = this.parseWebsiteContentToJSON(response)
                this.setUpScraperModuleFolder((err) => {
                    this.filterNewContent(content, (filteredContent) => {
                        console.log(filteredContent.length, "entries are new.")
                        if (yadBot.getClient().user === null) {
                            console.log("Bot is not yet online, not sending messages.")
                            return
                        }
                        this.sendEmbedMessages(filteredContent)
                    })
                })
            })
            .catch((error) => console.dir(error))
    }

    requestWebsite() {
        console.log("Requesting website...")
        return axios({
            method: 'get',
            url: this.url,
            headers: {'User-Agent': this.userAgent},
            responseType: this.expectedResponse
        });
    }

    parseWebsiteContentToJSON(response) {
        console.log("Parsing website...")
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
                        console.log(this.getScraperFileName(newJson[i]), "does not exist, so it is new content.")
                    }
                    let jsonString = JSON.stringify(newJson[i]);

                    if (readData?.toString() === jsonString) {
                        j++

                        // console.log("debug3:", j)
                        // console.log("debug4:", filteredJsonArray.length)
                        if (j === (newJson.length)) {
                            callback(filteredJsonArray)
                        }
                    }
                    else {
                        filteredJsonArray.push(newJson[i])
                        // console.log("debug2:", filteredJsonArray.length)
                        // write JSON string to file
                        fs.writeFile(
                            filePath,
                            jsonString,
                            { flag: 'w' },
                            (err) => {
                                if (err) {
                                    console.dir(err);
                                }
                                console.log(`JSON data is saved in ${this.getScraperFileName(newJson[i])}.`);
                                j++

                                // console.log("debug5:", j)
                                // console.log("debug6:", filteredJsonArray.length)
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
        return fileName + ".json"
    }

    sendEmbedMessages(websiteContent) {
        let embeds = []
        websiteContent.forEach(content => {
            embeds.push(this.getEmbed(content))
        })
        console.log("Sending embeds...")
        this.guilds.forEach(guild => {
            yadBot.getClient().channels.fetch(guild)
                .then(channel => {
                    if (yadBot.getClient().user === null) return
                    embeds.forEach(embed => {
                        channel.send(embed)
                            .catch(e => console.dir(e))
                    })
                })
                .catch((e) => {
                    console.log(new Date(), `Guild Channel '${guild}' could not be found.`)
                    console.dir(e)
                })
        })
        this.users.forEach(user => {
            yadBot.getClient().users.fetch(user)
                .then(discordUser => {
                    if (yadBot.getClient().user === null) return
                    embeds.forEach(embed => {
                        discordUser?.send(embed)
                            .catch(e => console.dir(e))
                    })
                })
                .catch((e) => {
                    console.log(new Date(), `User '${user}' could not be found.`)
                    console.dir(e)
                })
        })
    }

    getEmbed(content) {
        console.log("Generating embed...")
        return new Discord.MessageEmbed({
            title: "Preview Embed",
            description: `Website title: "${content.title}"`,
            hexColor: "#eb6734",
            url: this.url
        });
    }

}
