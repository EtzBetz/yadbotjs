import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import files from './Files.mjs'
import yadBot from './YadBot.js';

class ScraperFreeSteamGames extends WebsiteScraper {

    getScrapingUrl() {
        const apiKey = files.readJson(this.getScraperConfigPath(), 'steam_dev_api_key', true, 'ENTER STEAM DEV API KEY HERE')

        return `https://api.steampowered.com/IStoreService/GetAppList/v1/?key=${apiKey}&if_modified_since=${this.getLastScrapingUnixTime()}`
    }

    getLastScrapingUnixTime() {
        return files.readJson(this.getScraperConfigPath(), 'last_scraping_unix_time', false, Math.floor(luxon.DateTime.local().minus({minutes: 30}).toSeconds()))
    }

    refreshLastScrapingUnixTime() {
        files.writeJson(this.getScraperConfigPath(), 'last_scraping_unix_time', Math.floor(luxon.DateTime.local().minus({minutes: 30}).toSeconds()))
    }

    async requestWebsite(url) {
        this.refreshLastScrapingUnixTime()
        return await super.requestWebsite(url)
    }

    async parseWebsiteContentToJSON(response) {
        const elements = []
        this.log(`${response.data.response?.apps?.length || 0} entries found...`)
        // console.log(response.data.response)
        if (JSON.stringify(response.data.response) !== '{}') {
            for (const game of response.data?.response?.apps) {
                let entry = {}
                if (game.price_change_number !== 0) {
                    // this.debugLog(`priceChangeNumber is != 0 for '${game.name}'`)
                    // call super method here because method in this class also refreshes last scraping timestamp
                    let detailResponse = await super.requestWebsite(`https://store.steampowered.com/api/appdetails/?appids=${game.appid}&cc=us&l=english`)
                    if (detailResponse.data[game.appid.toString()].success === true) {
                        const detailData = detailResponse.data[game.appid.toString()].data
                        if (
                            detailData.price_overview?.final === 0
                                ||
                            (
                                detailData.price_overview?.discount_percent !== undefined &&
                                detailData.price_overview?.discount_percent === 100
                            )
                            // ||
                            // detailData.is_free === true
                        ) {
                            // this.debugLog('game is discounted/free in some way')
                            if (detailData.price_overview?.final === 0 || detailData.price_overview?.discount_percent === 100) {
                                entry.discountType = 'gift'
                            } else if (detailData.is_free === true) {
                                entry.discountType = 'free'
                            } else if (detailData.price_overview?.discount_percent >= 90) {
                                entry.discountType = 'discounted'
                                entry.discountAmount = detailData.price_overview?.discount_percent
                            }

                            entry.id = game.appid
                            entry.title = detailData.name
                            entry.imageUrl = detailData.header_image.substring(0, detailData.header_image.indexOf("?") !== -1 ? detailData.header_image.indexOf("?") : detailData.header_image.length)
                            entry.developers = detailData.developers
                            entry.publishers = detailData.publishers

                            if (detailData.release_date?.coming_soon) {
                                entry.dateRaw = detailData.release_date?.date
                            } else {
                                entry.date = this.parseReleaseDate(detailData.release_date?.date)
                            }

                            const originalPrice = detailData.price_overview?.initial?.toString().padStart(3, '0')
                            if (originalPrice !== undefined) {
                                const decimalPosition = originalPrice.length - 2
                                const priceEuro = originalPrice.substring(0, decimalPosition)
                                const priceDecimal = originalPrice.substring(originalPrice.length - 2)
                                entry.originalPrice = `${priceEuro},${priceDecimal}€`
                            }

                            const finalPrice = detailData.price_overview?.final?.toString().padStart(3, '0')
                            if (finalPrice !== undefined) {
                                const decimalPosition = finalPrice.length - 2
                                const priceEuro = finalPrice.substring(0, decimalPosition)
                                const priceDecimal = finalPrice.substring(finalPrice.length - 2)
                                entry.finalPrice = `${priceEuro},${priceDecimal}€`
                            }
                            // console.log(entry)
                            elements.push(entry)
                        }
                    } else {
                        // in all tested cases the games were not available with the default store link as well.
                        // yadBot.sendMessageToOwner(`Detailed request was unsuccessful for ID ${game.appid}\nLink: https://store.steampowered.com/app/${game.appid}`)
                    }
                }
            }
        }
        this.log(`${elements.length} entries found...`)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString
        if (json.date !== undefined) {
            dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        } else {
            dateString = json.dateRaw
        }
        let fileName = `${dateString}-${this.generateSlugFromString(json.title)}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionText = ''

        switch (content.discountType) {
            case 'discounted':
                descriptionText = `Discounted by ${content.discountAmount}%.`
                break
            case 'free':
                descriptionText = `Free to play in Steam Store.`
                break
            case 'gift':
                descriptionText = `Currently **free** in Steam Store.`
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
                'fields': [],
            },
        )

        if (content.finalPrice !== undefined && content.discountType !== "gift") {
            embed.fields.push(
                {
                    'name': 'Discounted Price',
                    'value': `**${content.finalPrice}**`,
                    'inline': true,
                },
            )
        }

        if (content.originalPrice !== undefined) {
            embed.fields.push(
                {
                    'name': 'Original Price',
                    'value': `~~${content.originalPrice}~~`,
                    'inline': true,
                },
            )
        }

        if (content.date !== undefined) {
            embed.fields.push(
                {
                    'name': 'Release Date',
                    'value': luxon.DateTime.fromISO(content.date).toFormat('d. LLLL yyyy', {locale: "de"}),
                    'inline': true,
                },
            )
        }

        if (content.dateRaw !== undefined) {
            embed.fields.push(
                {
                    'name': 'Release Date',
                    'value': content.dateRaw,
                    'inline': true,
                },
            )
        }

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

    parseReleaseDate(dateString) {
        let steamDateRegex = /(\d+). ([a-zA-ZöÖäÄüÜ]{3,}).? (\d{4})/
        let monthAliases = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"]

        let dateRegexResult = steamDateRegex.exec(dateString)

        if (dateRegexResult === null) {
            yadBot.sendMessageToOwner(`Date '${dateString}' failed in parseReleaseDate() [1]`)
            return
        }
        let day = dateRegexResult[1]
        let month = dateRegexResult[2]
        let year = dateRegexResult[3]

        let monthNumber = monthAliases.findIndex((monthAlias) => {
            return monthAlias === month
        })
        if (monthNumber === -1) {
            yadBot.sendMessageToOwner(`Date '${dateString}' with month '${month}' failed in parseReleaseDate() [2]`)
            return
        }
        // console.log(luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO())
        const isoDate = luxon.DateTime.fromFormat(`${day}.${monthNumber+1}.${year}`, 'd.M.yyyy')

        if (isoDate === null || !isoDate.isValid) {
            yadBot.sendMessageToOwner(`Date '${dateString}' with '${day}.${monthNumber+1}.${year}' is invalid in parseReleaseDate() [3]`)
            return
        }

        return isoDate.setZone('UTC+0').toISO()
    }
}

export default new ScraperFreeSteamGames()
