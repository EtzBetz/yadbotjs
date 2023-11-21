import jsdom from 'jsdom';
import * as Discord from 'discord.js';
import { WebsiteScraper } from './WebsiteScraper.js';

class ScraperTeamspeakBadges extends WebsiteScraper {
    parseWebsiteContentToJSON(scrapeInfo) {
        const page = new jsdom.JSDOM(scrapeInfo.response.data).window.document;
        let elements = [];
        let entities = page.querySelectorAll('#main-outlet #post_1 > div.post > p');
        this.log(`Parsing ${entities.length} entries...`);

        entities.forEach((element, index) => {
            const entry = this.parseBadgeInfo(element.textContent.trim());
            if (
                entry.title !== undefined ||
                entry.note !== undefined ||
                entry.unlock !== undefined ||
                entry.expiration !== undefined
            ) {
                elements.push(entry);
            }
        });

        return elements;
    }

    parseBadgeInfo(sourceString) {
        // EXAMPLES:
        // index 1 ->
        //      "PolTeamgeist"
        //      "Alpha Tester"
        //      "Challenge Accepted"
        //      "I’m a Floppy"
        // index 2 ->
        //      "WooOOHoohOOHooo"
        //      "Helped to test our software. THANK YOU!"
        //      "Challenges tournaments and more!"
        //      "This user is a floppy disk."
        // index 3 ->
        //      "TEAMSPOOKY"
        //      "Auto Assign"
        //      "One-time code"
        //      "Non-Assignable"
        // index 3 ->
        //      "31.10.2020"
        //      "unlimited"
        //      "unlimited"
        //      "Never"

        const regexTitleAndName = /Name:\s*(.+)\s*\((.+)\)/gim;
        const regexCode = /Badge code:\s*(\S+)\s*/gim;
        const regexDate = /\(.*?: (.+)\S*\)/gim;
        // const regexBadges = /Name:\s*(.+)\s*\((.+)\)\nGUID:\s*\S*\nBadge code:\s*(.+)\s*\(.*?: (\d{1,2}\.\d{1,2}\.\d{2,4})\S*\)/gmi

        const titleNameResult = regexTitleAndName.exec(this.filterFakeWhitespace(sourceString));
        const codeResult = regexCode.exec(this.filterFakeWhitespace(sourceString));
        const dateResult = regexDate.exec(this.filterFakeWhitespace(sourceString));

        const json = {
            title: titleNameResult[1]?.trim(),
            note: titleNameResult[2]?.trim(),
            unlock: codeResult[1]?.trim(),
            expiration: dateResult?.[1]?.trim(),
        };
        if (json.unlock.toLowerCase() === 'one-time') json.unlock = 'One-Time code';
        if (json.unlock.toLowerCase() === 'auto') json.unlock = 'Auto assign';

        return json;
    }

    filterFakeWhitespace(sourceString) {
        const regexFakeWhitespace = /(​+)/gim;

        return sourceString.replace(regexFakeWhitespace, '');
    }

    generateFileName(json) {
        let fileName = `${json.expiration}-${json.title}-${json.unlock}`;
        return this.generateSlugFromString(fileName) + '.json';
    }

    async getEmbed(content) {
        return new Discord.EmbedBuilder({
            title: 'New Teamspeak Badge available!',
            description:
                'A new Badge was listed on the Forums.\nUnlock it [here](https://www.myteamspeak.com/userarea/badges/redeem) or in your Teamspeak application!',
            url: await this.getScrapingUrl(),
            author: {
                name: 'Teamspeak',
                url: 'https://teamspeak.com',
                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_ts.png',
            },
            fields: [
                {
                    name: 'Title',
                    value: content.json.title,
                },
                {
                    name: 'Note',
                    value: content.json.note,
                },
                {
                    name: 'Unlockable until',
                    value: content.json.expiration,
                },
                {
                    name: `${
                        content.json.unlock.toLowerCase() === 'auto assign' ||
                        content.json.unlock.toLowerCase() === 'one-time code' ||
                        content.json.unlock.toLowerCase() === 'non-assignable'
                            ? `Unlock Type`
                            : `Unlock Code`
                    }`,
                    value: `${
                        content.json.unlock.toLowerCase() === 'auto assign' ||
                        content.json.unlock.toLowerCase() === 'one-time code' ||
                        content.json.unlock.toLowerCase() === 'non-assignable'
                            ? `${content.json.unlock}`
                            : `\`${content.json.unlock}\``
                    }`,
                },
            ],
        });
    }
}

export default new ScraperTeamspeakBadges();
