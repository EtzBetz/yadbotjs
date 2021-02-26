import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperFreeSteamGames extends WebsiteScraper {

    constructor() {
        super()
    }

    getScrapingUrl() {
        return `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${config.steam_dev_api_key}&if_modified_since=${this.getLastScrapingUnixTime()}`
    }

    getScrapingInterval() {
        return 1000 * 60 * 11
    }

    getLastScrapingUnixTime() {
        const scraperConfig = this.getConfig()

        let lastScrapingUnixTime = scraperConfig.last_scraping_unix_time
        if (lastScrapingUnixTime === undefined) lastScrapingUnixTime = Math.floor(luxon.DateTime.local().toSeconds())

        return lastScrapingUnixTime
    }

    refreshLastScrapingUnixTime() {
        this.setConfigParameter('last_scraping_unix_time', Math.floor(luxon.DateTime.local().toSeconds()))
    }

    requestWebsite(url) {
        this.refreshLastScrapingUnixTime()
        return super.requestWebsite(url)
    }

    async parseWebsiteContentToJSON(response) {
        const elements = []
        this.log(`${response.data.response?.apps?.length || 0} entries found...`)
        for (const game of response.data.response?.apps) {
            let entry = {}
            entry.raw = game
            if (entry.raw.price_change_number !== 0) {

                // call super method here because method in this class also refreshes last scraping timestamp
                let detailResponse = await super.requestWebsite(`https://store.steampowered.com/api/appdetails/?appids=${game.appid}&cc=DD&l=english`)
                /*console.log(detailResponse.data)*/
                        if (detailResponse.data[game.appid.toString()].success === true) {
                            console.log("debugSTEAM1")
                            const detailData = detailResponse.data[game.appid.toString()].data
                            if (
                                detailData.price_overview.final === 0 ||
                                detailData.is_free === true ||
                                detailData.price_overview.discount_percent !== 0
                            ) {
                                console.log("debugSTEAM2")

                                entry.title = detailData.name
                                entry.imageUrl = detailData.header_image
                                entry.developers = detailData.developers
                                entry.publishers = detailData.publishers

                                const originalPrice = detailData.price_overview.initial.toString().padStart(3, '0')
                                const decimalPosition = originalPrice.length - 2
                                const priceEuro = originalPrice.substring(0, decimalPosition)
                                const priceDecimal = originalPrice.substring(originalPrice.length - 2)
                                entry.originalPrice = `${priceEuro},${priceDecimal}€`

                                elements.push(entry)
                            }
                        }
                        else {
                            console.log('detailed request was unsuccessful')
                        }
            }
        }
        console.log("debugSTEAM3")
        console.log(elements.length)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromSeconds(json.raw.last_modified).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${this.generateSlugFromString(json.title)}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let embed = new Discord.MessageEmbed(
            {
                'title': content.title,
                'description': `Kostenlos im Steam Store.`,
                'url': `https://store.steampowered.com/app/${content.raw.appid}/`,
                'author': {
                    'name': 'Steam',
                    'url': 'https://store.steampowered.com/',
                    'icon_url': 'https://etzbetz.io/stuff/yad/images/logo_steam.png',
                },
                'fields': [
                    {
                        'name': 'Originalpreis',
                        'value': `~~${content.originalPrice}~~`,
                        'inline': true,
                    },
                ],
            },
        )

        if (content.imageUrl !== undefined) {
            embed.image = {
                url: content.imageUrl,
            }
        }
        return embed
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperFreeSteamGames()
