import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js'
import files from './Files.js';
import axios from 'axios';
import jsdom from 'jsdom';

class ScraperMeineFH extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document
        let news = []

        let entities = page.querySelectorAll("article")
        this.log(`Parsing ${entities.length} entries...`)

        entities.forEach((entity, index) => {
            let entry = {}
            let date = entity.querySelector(".collapse-heading").textContent.trim()
            entry.title = entity.querySelector(".collapse-body > h2").textContent.trim()
            entry.text = entity.textContent.trim()

            let titleIndex = entry.text.indexOf(entry.title)
            entry.text = entry.text.substring(titleIndex + entry.title.length)

            let commaIndex1 = date.indexOf(',');
            let commaIndex2 = date.indexOf(' Uhr');
            entry.date = luxon.DateTime.fromFormat(date.substring(commaIndex1 + 2, commaIndex2), "dd.LL.yy, HH:mm")

            // console.log(entry.date.toISO())
            // console.log(entry.title)
            // console.log(entry.text)

            if (entry.date !== null &&
                entry.text !== null &&
                entry.text !== "" &&
                entry.title !== null &&
                entry.title !== ""
            ) news.push(entry)
        })

        return news
    }

    generateFileName(json) {
        let fileName = `${json.date}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let embed = new Discord.MessageEmbed(
            {
                "title": content.json.title.trim(),
                "description": `${luxon.DateTime.fromISO(content.json.date).toFormat("dd.LL.yy, HH:mm")}\n\n${content.json.text.trim()}`,
                "author": {
                    "name": 'Fachhochschule Münster',
                    "url": 'https://meinefh.de',
                    "icon_url": 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
                },
                "footer": {
                    "text": "Alle Angaben ohne Gewähr."
                }
            }
        )

        return embed
    }

    getComponents(content) {
        return [
            new Discord.MessageActionRow({
                components: [
                    new Discord.MessageButton({
                        label: "Spenden",
                        style: Discord.Constants.MessageButtonStyles.LINK,
                        url: "https://paypal.me/raphaelbetz"
                    }),
                ]
            })
        ]

    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }

}

export default new ScraperMeineFH()
