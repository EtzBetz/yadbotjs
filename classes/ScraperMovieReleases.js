import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import files from './Files.js'
import Json from './Json.js';

class ScraperMovieReleases extends WebsiteScraper {

    getScrapingUrl() {
        const apiKey = files.readJson(this.getScraperConfigPath(), 'tmdb_api_key', true, 'ENTER API KEY HERE')
        const todayDate = luxon.DateTime.local().toFormat('yyyy-MM-dd')
        const pastDate = luxon.DateTime.local().minus({weeks: 4}).toFormat('yyyy-MM-dd')
        let url = `https://api.themoviedb.org/3/discover/movie`
        url += `?language=de-DE`
        url += `&region=de`
        url += `&release_date.gte=${pastDate}`
        url += `&release_date.lte=${todayDate}`
        url += `&with_release_type=3|4|5`
        url += `&sort_by=release_date.desc`
        url += `&api_key=${apiKey}`
        return url
    }

    getReleaseDateScrapingUrl(scrapeInfo, entry) {
        const apiKey = files.readJson(this.getScraperConfigPath(), 'tmdb_api_key', true, 'ENTER API KEY HERE')
        let url = `https://api.themoviedb.org/3/movie/${entry.id}/release_dates`
        url += `?api_key=${apiKey}`
        return url
    }

    async parseWebsiteContentToJSON(scrapeInfo) {
        const elements = []
        const apiKey = files.readJson(this.getScraperConfigPath(), 'tmdb_api_key', true, 'ENTER API KEY HERE')

        for (const movie of scrapeInfo.response.data.results) {
            let detailApiUrl = `https://api.themoviedb.org/3/movie/${movie.id}`
            detailApiUrl += `?language=de-DE`
            detailApiUrl += `&region=de`
            detailApiUrl += `&api_key=${apiKey}`
            let movieDetailsResponse = await super.requestWebsite(detailApiUrl)
            const movieDetails = movieDetailsResponse.data
            // console.log(movieDetails)

            let entry = {}
            entry.id = movie.id
            entry.title = movie.title
            entry.tagline = movieDetails.tagline
            entry.description = movie.overview
            entry.url = movieDetails.homepage
            // entry.date = luxon.DateTime.fromFormat(movie.release_date, 'yyyy-MM-dd').setZone('UTC+0').toISO()
            entry.poster = movie.poster_path
            entry.genres = movieDetails.genres
            entry.producers = movieDetails.production_companies
            entry.duration = movieDetails.runtime
            entry.budget = movieDetails.budget
            entry.imdbId = movieDetails.imdb_id

            let releaseData = await super.requestWebsite(this.getReleaseDateScrapingUrl(scrapeInfo, entry))

            // todo: sort array by iso3166 because otherwise the array can be shuffled up and be "new"
            entry.releases = []
            for (const countryReleases of releaseData.data.results) {
                if (countryReleases.iso_3166_1 !== "US" && countryReleases.iso_3166_1 !== "DE") continue
                let countryReleasesNew = {}
                countryReleasesNew.iso_3166 = countryReleases.iso_3166_1
                countryReleasesNew.release_dates = []
                for (const release of countryReleases.release_dates) {
                    let releaseNew = {}
                    releaseNew.type = release.type
                    releaseNew.date = release.release_date
                    releaseNew.note = release.note
                    countryReleasesNew.release_dates.push(releaseNew)
                }
                entry.releases.push(countryReleasesNew)
            }

            // let xRelReleaseQueryUrl = "https://api.xrel.to/v2/search/ext_info.xml"
            // xRelReleaseQueryUrl += "?type=movie"
            // xRelReleaseQueryUrl += `&q=${encodeURIComponent(entry.title)}`
            //
            // let xRelReleaseQuery
            // try {
            //     xRelReleaseQuery = await this.requestWebsite(xRelReleaseQueryUrl)
            //     let queryResult = Json.parseXmlToJson(xRelReleaseQuery.data).ext_info_search
            //     if (queryResult.total[0] === 1) {
            //         entry.xrelId = queryResult.results[0].ext_info.id
            //         entry.xrelTitle = queryResult.results[0].ext_info.title
            //         entry.xrelLink = queryResult.results[0].ext_info.link_href
            //         console.log(JSON.stringify(queryResult.results[0].ext_info))
            //     } else if (queryResult.total[0] > 1) {
            //         // TODO: try to find exact match or closest match
            //         console.log(JSON.stringify(queryResult.results))
            //     } else {
            //         console.log(`0 results for "${entry.title}"`)
            //     }
            // }
            // catch (e) {
            //     console.log(e)
            // }
            // todo: xrel stuff
            // let xRelReleaseQueryUrl = "https://api.xrel.to/v2/search/ext_info.xml"
            // xRelReleaseQueryUrl += "?type=movie"
            // xRelReleaseQueryUrl += `&q=${encodeURIComponent(entry.title)}`
            //
            // if (entry.duration >= 60) {
            //     let xRelReleaseQuery
            //     try {
            //         xRelReleaseQuery = await this.requestWebsite(xRelReleaseQueryUrl)
            //         let queryResult = Json.parseXmlToJson(xRelReleaseQuery.data).ext_info_search
            //         if (queryResult.total[0] === 1) {
            //             entry.xRelId = queryResult.results[0].ext_info.id[0]
            //             entry.xRelTitle = queryResult.results[0].ext_info.title[0]
            //             entry.xRelLink = queryResult.results[0].ext_info.link_href[0]
            //             console.log(JSON.stringify(queryResult.results[0].ext_info))
            //         } else if (queryResult.total[0] > 1) {
            //             // TODO: try to find exact match or closest match
            //             let result = queryResult.results[0].ext_info.find((movieResult) => {
            //                 return movieResult.title[0] === entry.title
            //             })
            //             if (result !== undefined) {
            //                 entry.xRelId = result.id[0]
            //                 entry.xRelTitle = result.title[0]
            //                 entry.xRelLink = result.link_href[0]
            //             }
            //             // console.log(JSON.stringify(queryResult.results))
            //         } else {
            //             console.log(`0 results for "${entry.title}"`)
            //         }
            //         console.log("------")
            //         console.log(entry.xRelId)
            //         console.log(entry.xRelTitle)
            //         console.log(entry.xRelLink)
            //     } catch (e) {
            //         console.log(e)
            //     }
            // }

            if (entry.duration >= 60) elements.push(entry)
        }
        this.log(`Parsed ${elements.length} entries...`)
        return elements
    }

    generateFileName(json) {
        let fileName = `${json.id}-${json.title}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let embed = new Discord.EmbedBuilder(
            {
                'title': content.json.title,
                'description': this.generateDescriptionString(content.json.tagline, content.json.description, content.json.imdbId, content.json.id),
                'url': content.json.url,
                'thumbnail': {
                    'url': `https://image.tmdb.org/t/p/w500${content.json.poster}`,
                },
                'fields': [],
            },
        )

        if (content.json.genres?.length > 0) {
            embed.fields.push(
                {
                    'name': 'Genres',
                    'value': this.generateGenreString(content.json.genres),
                    'inline': false,
                }
            )
        }

        if (content.json.producers.length > 0) {
            embed.fields.push(
                {
                    'name': 'Produzenten',
                    'value': this.generateProducerString(content.json.producers),
                    'inline': false,
                },
            )
        }

        if (content.json.duration !== undefined && content.json.duration > 0) {
            embed.fields.push(
                {
                    'name': 'Dauer',
                    'value': this.generateDurationString(content.json.duration),
                    'inline': false,
                },
            )
        } else {
            embed.fields.push(
                {
                    'name': 'Dauer',
                    'value': "???",
                    'inline': false,
                },
            )
        }

        if (content.json.budget !== undefined && content.json.budget > 0) {
            embed.fields.push(
                {
                    'name': 'Budget',
                    'value': this.generateBudgetString(content.json.budget),
                    'inline': false,
                },
            )
        }

        // 1  Premiere
        // 2  Theatrical (limited)
        // 3  Theatrical
        // 4  Digital
        // 5  Physical
        // 6  TV
        if (content.json.releases?.length > 0) {
            let usString = ""
            let deString = ""
            for (const countryRelease of content.json.releases) {
                let releases = countryRelease.release_dates
                releases.sort((releaseA, releaseB) => {
                    let dateA = parseInt(luxon.DateTime.fromISO(releaseA.date).toFormat('yyyyMMdd'), 10)
                    let dateB = parseInt(luxon.DateTime.fromISO(releaseB.date).toFormat('yyyyMMdd'), 10)
                    return dateA - dateB
                })
                for (const release of releases) {
                    let finalString = ""
                    finalString += luxon.DateTime.fromISO(release.date).toFormat('dd.MM.yyyy')
                    switch (release.type) {
                        case 1:
                            finalString += " - Premiere"
                            break
                        case 2:
                            finalString += " - Kino (begrenzt)"
                            break
                        case 3:
                            finalString += " - Kino"
                            break
                        case 4:
                            finalString += " - Digital"
                            break
                        case 5:
                            finalString += " - Physisch"
                            break
                        case 6:
                            finalString += " - TV"
                            break
                    }
                    if (release.note !== "") {
                        finalString += ` (${release.note})`
                    }
                    switch (countryRelease.iso_3166) {
                        case "US":
                            usString += `${finalString}\n`
                            break
                        case "DE":
                            deString += `${finalString}\n`
                            break
                    }
                }
            }
            if (usString !== "") {
                embed.fields.push(
                    {
                        'name': 'US-Release(s)',
                        'value': usString,
                    }
                )
            }
            if (deString !== "") {
                embed.fields.push(
                    {
                        'name': 'DE-Release(s)',
                        'value': deString,
                    }
                )
            }
        }

        return embed
    }

    getComponents(content) {
        if (content.json.xRelId !== undefined) {
            let actionRow = new Discord.ActionRowBuilder({
                components: [
                    new Discord.ButtonBuilder({
                        label: `Subscribe to xREL Releases for '${content.json.xRelTitle}'`,
                        customId: `xrel::subscribe::${this.generateFileName(content.json)}::${content.json.xRelId}`,
                        style: 'PRIMARY',
                    }),
                    new Discord.ButtonBuilder({
                        label: `Unsubscribe`,
                        customId: `xrel::unsubscribe::${this.generateFileName(content.json)}::${content.json.xRelId}`,
                        style: 'DANGER',
                    }),
                    new Discord.ButtonBuilder({
                        label: `xREL Release Page`,
                        url: content.json.xRelLink,
                        style: 'LINK',
                    }),
                ]
            })
            return [actionRow]
        } else {
            return []
        }


        // new Discord.ActionRowBuilder({
        //     components: [
        //         new Discord.ButtonBuilder({
        //             label: "Google",
        //             style: 'LINK',
        //             url: "https://google.de/"
        //         }),
        //     ]
        // })
    }

    generateDescriptionString(tagline, description, imdbId, tmdbId) {
        if (tagline !== undefined && tagline !== '') {
            return `**${tagline}**\n\n${description}\n\n[IMDb Link](https://www.imdb.com/title/${imdbId}/)\n[TMDB Link](https://www.themoviedb.org/movie/${tmdbId})`
        } else {
            return description
        }
    }

    generateGenreString(genresArr) {
        let string = ''
        genresArr.forEach((genre, index) => {
            if (index !== 0) {
                string += ', '
            }
            string += genre.name
        })
        return string
    }

    generateProducerString(producerArr) {
        let string = ''
        producerArr.forEach((producer, index) => {
            if (index !== 0) {
                string += ', '
            }
            string += producer.name
        })
        return string
    }

    generateDurationString(duration) {
        let minutes = duration % 60
        let hours = (duration - minutes) / 60

        let hourString = ""
        let minuteString = ""

        switch (hours) {
            case 0:
                hourString = ""
                break
            case 1:
                hourString = `${hours} Stunde`
                break
            default:
                hourString = `${hours} Stunden`
        }

        switch (minutes) {
            case 0:
                minuteString = ""
                break
            case 1:
                minuteString = `${minutes} Minute`
                break
            default:
                minuteString = `${minutes} Minuten`
        }

        if (hours > 0 && minutes > 0) return `${hourString}, ${minuteString}`
        else return `${hourString}${minuteString}`
    }

    generateBudgetString(budget) {
        return `${budget.toLocaleString('de-DE')} $`
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperMovieReleases()
