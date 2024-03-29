import jsdom from 'jsdom';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';
import luxon from 'luxon';

class ScraperGuildWars2News extends WebsiteScraper {
    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document;
        let elements = [];
        let entities = page.querySelectorAll('ul.blogroll > li.blog-post');
        this.log(`Parsing ${entities.length} entries...`);

        entities.forEach((element, index) => {
            const title = element.querySelector('h3.blog-title > a[title]')?.textContent.trim();
            const url = element.querySelector('h3.blog-title > a[title]')?.href?.trim();
            const description = element.querySelector('div.text > p:not(.more)')?.textContent.trim();
            const isoDate = this.parseGermanDateToISO(
                element.querySelector('div.meta > p.blog-attribution')?.textContent.trim(),
            );
            const author = this.parseAuthorGerman(
                element.querySelector('div.meta > p.blog-attribution')?.textContent.trim(),
            );
            let entry = {
                title: title,
                url: url,
                description: description,
                author: author,
                date: isoDate,
            };
            elements.push(entry);
        });

        return elements;
    }

    parseAuthorGerman(sourceString) {
        // index 1 ->
        //      "Das Guild Wars 2 Team"
        //      "Evon Schlitzklinge"
        const regexAuthor = /von (.+) am \d{2}. [a-zA-ZöäüÖÄÜ]+ \d{4}/;

        return regexAuthor.exec(sourceString)[1];
    }

    parseGermanDateToISO(dateString) {
        // index 1 = dd     -> "06"
        // index 2 = MMMM   -> "Oktober"
        // index 3 = yyyy   -> "2020"
        const regexCustomDate = /(\d{2}). ([a-zA-ZöäüÖÄÜ]+) (\d{4})/;
        // used to get the month number
        // then returns (0-11)+1
        const months = [
            'Januar',
            'Februar',
            'März',
            'April',
            'Mai',
            'Juni',
            'Juli',
            'August',
            'September',
            'Oktober',
            'November',
            'Dezember',
        ];

        let dateElements = regexCustomDate.exec(dateString);
        let day = parseInt(dateElements[1], 10);
        let month =
            months.findIndex((value) => {
                return value === dateElements[2];
            }) + 1;
        let year = parseInt(dateElements[3], 10);

        return luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO();
    }

    parseEnglishDateToISO(dateString) {
        // index 1 = dd     -> "06"
        // index 2 = MMMM   -> "October"
        // index 3 = yyyy   -> "2020"
        const regexCustomDate = /([a-zA-Z]+) (\d{2}), (\d{4})/;
        // used to get the month number
        const months = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
        ];

        let dateElements = regexCustomDate.exec(dateString);
        let month =
            months.findIndex((value) => {
                return value === dateElements[1];
            }) + 1;
        let day = parseInt(dateElements[2], 10);
        let year = parseInt(dateElements[3], 10);

        return luxon.DateTime.fromFormat(`${day}.${month}.${year}`, 'd.M.yyyy').setZone('Europe/Berlin').toISO();
    }

    generateFileName(json) {
        let dateString = luxon.DateTime.fromISO(json.date).toFormat('yyyy-MM-dd');
        let fileName = `${dateString}-${json.title.substring(0, 50)}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    getEmbed(content) {
        return new Discord.EmbedBuilder({
            title: content.json.title,
            description: content.json.description,
            url: content.json.url,
            // "color": 0xff2222,
            author: {
                name: `Guild Wars 2`,
                url: 'https://www.guildwars2.com/de/',
                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_gw2.png',
            },
            footer: {
                text: `${content.json.author}  •  ${luxon.DateTime.fromISO(content.json.date).toFormat('dd.MM.yyyy')}`,
            },
        });
    }

    getSortingFunction() {
        return this.sortJsonByIsoDateAndTitleProperty;
    }
}

export default new ScraperGuildWars2News();
