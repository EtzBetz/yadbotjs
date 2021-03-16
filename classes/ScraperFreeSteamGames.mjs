import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import files from './Files.mjs'

class ScraperFreeSteamGames extends WebsiteScraper {

    getScrapingUrl() {
        const apiKey = files.readJson(this.getScraperConfigPath(), 'steam_dev_api_key', true, 'ENTER STEAM DEV API KEY HERE')

        return `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${apiKey}&if_modified_since=${this.getLastScrapingUnixTime()}`
    }

    getLastScrapingUnixTime() {
        return files.readJson(this.getScraperConfigPath(), 'last_scraping_unix_time', false, Math.floor(luxon.DateTime.local().toSeconds()))
    }

    refreshLastScrapingUnixTime() {
        files.writeJson(this.getScraperConfigPath(), 'last_scraping_unix_time', Math.floor(luxon.DateTime.local().toSeconds()))
    }

    requestWebsite(url) {
        this.refreshLastScrapingUnixTime()
        return super.requestWebsite(url)
    }

    async parseWebsiteContentToJSON(response) {
        const elements = []
        this.log(`${response.data.response?.apps?.length || 0} entries found...`)
        // console.log(response.data.response)
        if (JSON.stringify(response.data.response) !== "{}") {
            for (const game of response.data?.response?.apps) {
                let entry = {}
                if (game.price_change_number !== 0) {
                    console.log(`priceChangeNumber is != 0 for '${game.name}'`)

                    // call super method here because method in this class also refreshes last scraping timestamp
                    let detailResponse = await super.requestWebsite(`https://store.steampowered.com/api/appdetails/?appids=${game.appid}&cc=de&l=german`)
                    /*console.log(detailResponse.data)*/
                    if (detailResponse.data[game.appid.toString()].success === true) {
                        const detailData = detailResponse.data[game.appid.toString()].data
                        if (
                            detailData.price_overview?.final === 0 ||
                            detailData.is_free === true ||
                            detailData.price_overview.discount_percent !== 0
                        ) {
                            console.log("game is discounted/free in some way")

                            if (detailData.price_overview?.final === 0) {
                                entry.discountType = 'gift'
                            } else if (detailData.is_free === true) {
                                entry.discountType = 'free'
                            } else if (detailData.price_overview.discount_percent !== 0) {
                                entry.discountType = 'discounted'
                                entry.discountAmount = detailData.price_overview.discount_percent
                            }

                            entry.id = game.appid
                            entry.title = detailData.name
                            entry.imageUrl = detailData.header_image
                            entry.developers = detailData.developers
                            entry.publishers = detailData.publishers
                            entry.date = game.last_modified

                            const originalPrice = detailData.price_overview.initial.toString().padStart(3, '0')
                            const decimalPosition = originalPrice.length - 2
                            const priceEuro = originalPrice.substring(0, decimalPosition)
                            const priceDecimal = originalPrice.substring(originalPrice.length - 2)
                            entry.originalPrice = `${priceEuro},${priceDecimal}€`
                            console.log(entry)
                            elements.push(entry)
                        }
                    } else {
                        console.log('detailed request was unsuccessful')
                    }
                }
            }
        }
        console.log(elements.length)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromSeconds(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${this.generateSlugFromString(json.title)}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionText = ""

        switch (content.discountType) {
        case 'discounted':
            descriptionText = `Um ${content.discountAmount}% reduziert.`
            break
        case 'free':
            descriptionText = `Free to play im Steam Store.`
            break
        case 'gift':
            descriptionText = `Aktuell kostenlos im Steam Store.`
            break
        }

        let embed = new Discord.MessageEmbed(
            {
                'title': content.title,
                'description': descriptionText,
                'url': `https://store.steampowered.com/app/${content.id}/`,
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
