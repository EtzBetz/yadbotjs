import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js'
import files from './Files.js';
import axios from 'axios';
import jsdom from 'jsdom';
import crypto from 'crypto';

class ScraperMeineFHETI extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document

        let entity = page.querySelector("body > div.content > a ~ div")

        console.log(entity.textContent.trim())

        return [{text: entity.textContent.trim()}]
    }

    generateFileName(json) {
        let fileName = `${crypto.createHash('md5').update(json.text).digest('hex')}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let embed = new Discord.MessageEmbed(
            {
                "description": `Es gibt neue Infos vom Fachbereich ETI.`,
                "author": {
                    "name": 'Fachhochschule Münster - ETI',
                    "url": 'https://www.meinefh.de/fbinfos.php?fb=ETI',
                    "icon_url": 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
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
                        label: "meinefh.de ETI",
                        style: Discord.Constants.MessageButtonStyles.LINK,
                        url: "https://www.meinefh.de/fbinfos.php?fb=ETI"
                    }),
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

export default new ScraperMeineFHETI()
