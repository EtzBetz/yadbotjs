import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import files from './Files.mjs'
import yadBot from './YadBot.mjs';

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
        if (JSON.stringify(response.data.response) !== '{}') {
            for (const game of response.data?.response?.apps) {
                let entry = {}
                if (game.price_change_number !== 0) {
                    this.debugLog(`priceChangeNumber is != 0 for '${game.name}'`)

                    // call super method here because method in this class also refreshes last scraping timestamp
                    let detailResponse = await super.requestWebsite(`https://store.steampowered.com/api/appdetails/?appids=${game.appid}&cc=de&l=german`)
                    if (detailResponse.data[game.appid.toString()].success === true) {
                        const detailData = detailResponse.data[game.appid.toString()].data
                        if (
                            detailData.price_overview?.final === 0 ||
                            detailData.is_free === true ||
                            detailData.price_overview.discount_percent !== 0
                        ) {
                            this.debugLog('game is discounted/free in some way')

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
                            entry.imageUrl = detailData.header_image.substring(0, detailData.header_image.indexOf("?") !== -1 ? detailData.header_image.indexOf("?") : detailData.header_image.length)
                            entry.developers = detailData.developers
                            entry.publishers = detailData.publishers
                            entry.date = this.getReleaseDate(detailData.release_date?.date)

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
                        yadBot.sendMessageToOwner(`Detailed request was unsuccessful for ID ${game.appid}`)
                    }
                }
            }
        }
        this.log(`${elements.length} entries found...`)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${this.generateSlugFromString(json.title)}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        let descriptionText = ''

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
                'fields': [],
            },
        )

        if (content.finalPrice !== undefined) {
            embed.fields.push(
                {
                    'name': 'Rabattpreis',
                    'value': `**${content.finalPrice}**`,
                    'inline': true,
                },
            )
        }

        if (content.originalPrice !== undefined) {
            embed.fields.push(
                {
                    'name': 'Originalpreis',
                    'value': `~~${content.originalPrice}~~`,
                    'inline': true,
                },
            )
        }

        if (content.date !== undefined) {
            embed.fields.push(
                {
                    'name': 'Erscheinungsdatum',
                    'value': luxon.DateTime.fromISO(content.date).toFormat('d. LLLL yyyy', { locale: "de" }),
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

    getReleaseDate(dateString) {
        let steamDateRegexType1 = /(\d+). ([a-zA-ZöÖäÄüÜ]{3,}).? (\d{4})/
        let steamDateRegexType2 = /(\d{2})\/(\d{2})\/(\d{4})/
        let monthAliases = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sep", "Okt", "Nov", "Dez"]

        let dateRegexResult = steamDateRegexType1.exec(dateString)
        let day, month, year
        if (dateRegexResult !== null) {
            day = dateRegexResult[1]
            month = dateRegexResult[2]
            year = dateRegexResult[3]

            let monthNumber = monthAliases.findIndex((monthAlias) => {
                return monthAlias === month
            })
            if (monthNumber === -1) {
                yadBot.sendMessageToOwner(`Date '${dateString}' with month '${month}' failed in getReleaseDate() [2]`)
            }
            day = day.padStart(2, '0')
            month = (monthNumber+1).toString().padStart(2, '0')
        } else {
            dateRegexResult = steamDateRegexType2.exec(dateString)
            day = dateRegexResult[1]
            month = dateRegexResult[2]
            year = dateRegexResult[3]

            if (dateRegexResult === null) {
                yadBot.sendMessageToOwner(`Date '${dateString}' failed in getReleaseDate() [1]`)
                return
            }
        }
        // console.log(luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO())
        return luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO()
    }
}

export default new ScraperFreeSteamGames()
