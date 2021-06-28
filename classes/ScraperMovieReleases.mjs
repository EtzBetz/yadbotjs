import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import files from './Files.mjs'
import Json from './Json.mjs';

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
            entry.date = luxon.DateTime.fromFormat(movie.release_date, 'yyyy-MM-dd').setZone('UTC+0').toISO()
            entry.poster = movie.poster_path
            entry.genres = movieDetails.genres
            entry.producers = movieDetails.production_companies
            entry.duration = movieDetails.runtime
            entry.budget = movieDetails.budget
            entry.imdbId = movieDetails.imdb_id

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

            if (entry.duration >= 60) elements.push(entry)
        }
        this.log(`Parsed ${elements.length} entries...`)
        return elements
    }

    generateFileNameFromJson(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.title}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let embed = new Discord.MessageEmbed(
            {
                'title': content.title,
                'description': this.generateDescriptionString(content.tagline, content.description, content.imdbId, content.id),
                'url': content.url,
                'timestamp': content.date,
                'thumbnail': {
                    'url': `https://image.tmdb.org/t/p/w500${content.poster}`,
                },
                'fields': [],
            },
        )

        if (content.genres?.length > 0) {
            embed.fields.push(
                {
                    'name': 'Genres',
                    'value': this.generateGenreString(content.genres),
                    'inline': false,
                }
            )
        }

        if (content.producers.length > 0) {
            embed.fields.push(
                {
                    'name': 'Produzenten',
                    'value': this.generateProducerString(content.producers),
                    'inline': false,
                },
            )
        }

        if (content.duration !== undefined && content.duration > 0) {
            embed.fields.push(
                {
                    'name': 'Dauer',
                    'value': this.generateDurationString(content.duration),
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

        if (content.budget !== undefined && content.budget > 0) {
            embed.fields.push(
                {
                    'name': 'Budget',
                    'value': this.generateBudgetString(content.budget),
                    'inline': false,
                },
            )
        }

        return embed
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
