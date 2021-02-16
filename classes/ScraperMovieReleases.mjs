import luxon from 'luxon'
import * as Discord from 'discord.js'
import { WebsiteScraper } from './WebsiteScraper'
import config from '../config.json'

class ScraperMovieReleases extends WebsiteScraper {

    constructor() {
        super()
        this.url = ''
        this.scrapingInterval = 1000 * 60 * 5
        this.guildChannelIds = config.scraper_movie_releases_guild_channels
        this.userIds = config.scraper_movie_releases_dm_users
        this.scrapingFolder = 'movieReleases'
        this.websiteData = {}
    }

    getScrapingUrl() {
        let todayDate = luxon.DateTime.local().toFormat('yyyy-MM-dd')
        let pastDate = luxon.DateTime.local().minus({ weeks: 1 }).toFormat('yyyy-MM-dd')
        let url = `https://api.themoviedb.org/3/discover/movie`
        url += `?language=de-DE`
        url += `&region=de`
        url += `&release_date.gte=${pastDate}` // ${todayDate}
        url += `&release_date.lte=${todayDate}` // 2020-01-02
        url += `&with_release_type=2|3`
        url += `&sort_by=release_date.asc`
        url += `&api_key=${config.tmdb_api_key}`
        return url
    }

    parseWebsiteContentToJSON(response) {
        const elements = []

        response.data.results.forEach( (movie) => {
            let detailApiUrl = `https://api.themoviedb.org/3/movie/${movie.id}`
            detailApiUrl += `?language=de-DE`
            detailApiUrl += `&region=de`
            detailApiUrl += `&api_key=${config.tmdb_api_key}`
            // let movieDetailsResponse = await super.requestWebsite(detailApiUrl)
            // const movieDetails = movieDetailsResponse.data

            let entry = {}
            entry.id = movie.id
            entry.title = movie.title
            // entry.tagline = movieDetails.tagline
            entry.description = movie.overview
            // entry.url = movieDetails.homepage
            entry.date = luxon.DateTime.fromFormat(movie.release_date, 'yyyy-MM-dd').setZone('Europe/Berlin').toISO()
            entry.poster = movie.poster_path
            // entry.genres = movieDetails.genres
            // entry.producers = movieDetails.production_companies
            // entry.duration = movieDetails.runtime
            // entry.budget = movieDetails.budget

            elements.push(entry)
        })

        this.log(`${elements.length} entries found...`)
        return elements
    }

    getScraperFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd')
        let fileName = `${dateString}-${json.title}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        this.log(`Generating embed...`)

        return new Discord.MessageEmbed(
            {
                'title': content.title,
                'description': this.generateDescriptionString(content.tagline, content.description),
                'url': content.url,
                'timestamp': luxon.DateTime.fromISO(content.date).toFormat('yyyy-MM-dd'),
                'thumbnail': {
                    'url': `https://image.tmdb.org/t/p/w500${content.poster}`,
                },
                'fields': [
                    // {
                    //     'name': 'Genres',
                    //     'value': this.generateGenreString(content.genres),
                    //     'inline': true,
                    // },
                    // {
                    //     'name': 'Produzenten',
                    //     'value': this.generateProducerString(content.genres),
                    //     'inline': true,
                    // },
                    // {
                    //     'name': 'Dauer',
                    //     'value': this.generateDurationString(content.duration),
                    //     'inline': true,
                    // },
                    // {
                    //     'name': 'Budget',
                    //     'value': this.generateBudgetString(content.budget),
                    //     'inline': true,
                    // },
                ],
            },
        )
    }

    generateDescriptionString(tagline, description) {
        if (tagline !== undefined && tagline !== '') {
            return `**${tagline}**\n\n${description}`
        }
        else {
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

        return `${hours} Stunden, ${minutes} Minuten`
    }

    generateBudgetString(budget) {
        return `${budget.toLocaleString('de-DE')} $`
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty
    }
}

export default new ScraperMovieReleases()
