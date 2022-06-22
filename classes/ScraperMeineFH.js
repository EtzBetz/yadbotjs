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

        let entities = page.querySelectorAll("html > body > div > div")
        this.log(`Parsing ${entities.length} entries...`)

        entities.forEach((entity, index) => {
            let entry = {}
            let date = entity.querySelector("p:first-of-type").textContent
            entry.title = entity.querySelector("h1:first-of-type").textContent.trim()
            entry.text = entity.textContent.trim()

            let titleIndex = entry.text.indexOf(entry.title)
            entry.text = entry.text.substring(titleIndex + entry.title.length)
            console.log(entry.text)

            let commaIndex1 = date.indexOf(',');
            let commaIndex2 = date.indexOf(' Uhr');
            entry.datetime = luxon.DateTime.fromFormat(date.substring(commaIndex1 + 2, commaIndex2), "dd.LL.yyyy, H:mm")

            // console.log(entry.datetime.toISO())
            // console.log(entry.title)
            // console.log(entry.text)

            if (entry.datetime !== null &&
                entry.text !== null &&
                entry.text !== "" &&
                entry.title !== null &&
                entry.title !== ""
            ) news.push(entry)
        })

        return news
    }

    generateFileName(json) {
        let fileName = `${json.datetime}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let embed = new Discord.MessageEmbed(
            {
                "title": content.json.title.trim(),
                "description": `${content.json.datetime}\n\n${content.json.text.trim()}`,
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

    async getBalanceByCardId(interaction, cardId) {
        let balanceResponse = await axios({
            method: 'get',
            url: `https://api.topup.klarna.com/api/v1/STW_MUNSTER/cards/${cardId}/balance`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'
            },
            responseType: 'text/json'
        })
            .catch(async (e) => {
                return {
                    success: false,
                    status_code: -1
                }
            })

        if (balanceResponse?.status === 200) {
            const balance = balanceResponse.data.balance
            return {
                success: true,
                status_code: 1,
                raw_balance: balanceResponse.data.balance,
                formatted_balance: `${balance.toString().substring(0, balance.toString().length - 2).padStart(1, '0')},${balance.toString().substring(balance.toString().length - 2)}€`,
                card_id: balanceResponse.data.cardId,
                university_id: balanceResponse.data.universityId,
            }
        } else
            return {
                success: false,
                status_code: -2
            }
    }

}

export default new ScraperMeineFH()
