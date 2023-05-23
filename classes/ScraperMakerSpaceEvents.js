import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import jsdom from 'jsdom'
import axios from 'axios';
import files from './Files.js';
import luxon from 'luxon'

class ScraperMakerSpaceEvents extends WebsiteScraper {

    getContentType() {
        return 'application/x-www-form-urlencoded'
    }

    async requestWebsite(url) {
        let responses = []
        let dateTime = luxon.DateTime.local()
        for (let i = 0; i < 6; i++) {
            let data = `limitMonth=${parseInt(dateTime.toFormat('M'), 10) - 1}&limitYear=${dateTime.toFormat('y')}&lastMonth=${parseInt(dateTime.toFormat('M'), 10) + 3}&lastYear=${dateTime.toFormat('y')}`
            responses.push(await this.customRequestWebsite(url, data))
            dateTime = dateTime.plus({months: 1})
        }
        return responses
    }

    async customRequestWebsite(url, data) {
        return await axios({
            method: files.readJson(this.getScraperConfigPath(), 'http_method', false, 'get'),
            url: url,
            headers: {
                'User-Agent': this.getUserAgent(),
                'Content-Type': this.getContentType()
            },
            data: data,
            responseType: this.getExpectedResponseType(),
            raxConfig: {
                retry: 5,
                noResponseRetries: 5,
                retryDelay: 100,
            }
        })
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        let elements = []
        if (scrapeInfo.response !== undefined) {
            for (const response of scrapeInfo.response) {
                const page = new jsdom.JSDOM(response.data).window.document
                let entities = page.querySelectorAll(".veranstaltungsblock table tr")
                this.log(`Parsing ${entities.length} entries...`)

                entities.forEach((entity, index) => {

                    let entryDate = entity.children[0].textContent.trim()
                    let entryTitle = entity.children[1].querySelector('strong').textContent.trim()
                    let entryLink = entity.children[1].querySelector('a').href.trim()
                    let entryFillState = entity.children[2]?.querySelector('div > div.pBar > div.level')?.getAttribute('data-width')?.trim()

                    let entry = {
                        title: entryTitle,
                        date: entryDate,
                        link: entryLink,
                        fillstate: entryFillState,
                    }

                    elements.push(entry)
                })
            }
        }
        return elements
    }

    generateFileName(json) {
        let fileName = `${json.date}_${json.title}`
        return this.generateSlugFromString(fileName) + ".json"
    }

    async getEmbed(content) {
        let link = content.json.link
        if (link.substring(0, 1) === "/") {
            link = "https://www.fh-muenster.de" + link
        }
        return new Discord.EmbedBuilder(
            {
                "title": content.json.title,
                "url": link,
                "description": `Datum: **${content.json.date}**\nAnmeldungen: **${content.json.fillstate === undefined ? 'Gesperrt' : `${content.json.fillstate}%`}**`,
                "author": {
                    "name": "MakerSpace Steinfurt",
                    "url": await this.getScrapingUrl(),
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                }
            }
        )
    }
}


export default new ScraperMakerSpaceEvents()
