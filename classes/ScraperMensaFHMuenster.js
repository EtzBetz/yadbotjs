import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js'
import files from './Files.js';

class ScraperMensaFHMuenster extends WebsiteScraper {

    parseWebsiteContentToJSON(scrapeInfo) {
        let menu = {}
        let data = scrapeInfo.response.data

        menu.title = ""
        menu.date = luxon.DateTime.local().minus({hours: 6}).toFormat('yyyy-MM-dd')
        menu.meals = []
        menu.side_dishes = []
        menu.additives = []
        menu.infos = []

        data.forEach(entry => {
            if (entry.category.toLowerCase().includes("info")) { // infos
                menu.infos.push({'text': entry.name.trim()})
            } else if (
                entry.category.toLowerCase().includes("menü") ||
                entry.category.toLowerCase().includes("tagesaktion") // meals
            ) {
                let meal = this.parseMeal(entry)
                let dishNumArr = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn']
                for (const dishNum in dishNumArr) {
                    if (entry.category.toLowerCase().includes(dishNumArr[dishNum])) {
                        meal.side_dishes_num = parseInt(dishNum, 10) + 1
                        break
                    }
                }
                if (meal.side_dishes_num === undefined) meal.side_dishes_num = 0
                meal.price = entry.prices.students.toLocaleString('de-DE')
                if (!meal.price.includes(",")) meal.price += ',00'
                meal.price = meal.price.padEnd(4, '0')
                menu.meals.push(meal)
                for (const additive of meal.additives) {
                    if (!menu.additives.includes(additive)) {
                        menu.additives.push(additive)
                    }
                }
            } else if (
                (
                    entry.category.toLowerCase().includes("beilage") &&
                    !entry.category.toLowerCase().includes("beilagen")
                ) ||
                entry.category.toLowerCase().includes("tagesdessert") // side_dishes
            ) {
                let sideDish = this.parseMeal(entry)
                menu.side_dishes.push(sideDish)
                for (const additive of sideDish.additives) {
                    if (!menu.additives.includes(additive)) {
                        menu.additives.push(additive)
                    }
                }
            }
        })
        return [menu]
    }

    getScrapingUrl() {
        const url = files.readJson(this.getScraperConfigPath(), 'scraping_url', true, 'ENTER SCRAPING URL HERE')
        const todayDate = luxon.DateTime.local().minus({hours: 6}).toFormat('yyyy-MM-dd')
        return url.replace(/:date:/, todayDate)
    }

    parseMeal(entry) {
        // todo: double isBlabla parameters are overwritten for some reason

        let meal = {}
        meal.title = entry.name.trim()
        meal.additives = []
        for (const note of entry.notes) {
            let cleanedNote = note.toLowerCase().trim()
            if (cleanedNote === "vegetarisch") meal.isVegetarian = true
            else if (cleanedNote === "vegan") meal.isVegan = true
            else if (cleanedNote === "mit geflügel") meal.isChicken = true
            else if (cleanedNote === "mit rind") meal.isBeef = true
            else if (cleanedNote === "mit schwein") meal.isPork = true
            else if (cleanedNote === "mit fisch") meal.isFish = true
            else if (cleanedNote === "mit alkohol") meal.isAlcoholic = true
            else if (cleanedNote === "vgt") yadBot.sendMessageToOwner(`\`\`\`JSON\n${JSON.stringify(entry)}\`\`\``)
            else {
                let fixedAdditive = note.trim()
                if (fixedAdditive.substring(fixedAdditive.length - 1) === "*") fixedAdditive = fixedAdditive.substring(0, fixedAdditive.length - 1)
                if (!meal.additives.includes(fixedAdditive)) {
                    meal.additives.push(fixedAdditive)
                }
            }
        }
        return meal
    }

    parseMealStringEmoji(meal) {
        let string = ""

        if (meal.isVegetarian === true) string += "🥗"
        if (meal.isVegan === true) string += "🌱"
        if (meal.isChicken === true) string += "🐔"
        if (meal.isBeef === true) string += "🐮"
        if (meal.isPork === true) string += "🐷"
        if (meal.isFish === true) string += "🐟"
        if (meal.isAlcoholic === true) string += "🥃"
        if (meal.isSpicy === true) string += "🌶️"
        if (
            meal.isVegetarian === true ||
            meal.isVegan === true ||
            meal.isChicken === true ||
            meal.isBeef === true ||
            meal.isPork === true ||
            meal.isFish === true ||
            meal.isAlcoholic === true ||
            meal.isSpicy === true
        ) {
            string += " "
        }
        return string
    }

    generateFileName(json) {
        let fileName = `${json.date}`
        return this.generateSlugFromString(fileName) + '.json'
    }

    getEmbed(content) {
        let mealsString = ""
        let infosString = ""

        for (const meal of content.json.meals) {
            if (mealsString !== "") mealsString += "\n\n"
            mealsString += this.parseMealStringEmoji(meal)
            mealsString += `**${meal.title}**\n`
            mealsString += `Preis: ${meal.price}€\n`
            mealsString += `Beilagen: ${meal.side_dishes_num === 0 ? '-' : meal.side_dishes_num}`
        }

        for (const info of content.json.infos) {
            if (infosString !== "") infosString += "\n\n"
            infosString += `**INFORMATION**\n${info.text}`
        }

        let embed = new Discord.MessageEmbed(
            {
                "description": `${mealsString}\n\n\n${infosString}`,
                "author": {
                    "name": `Mensaplan FH Münster (${luxon.DateTime.fromFormat(content.json.date, 'yyyy-MM-dd').toFormat('dd.MM.yy')})`,
                    "icon_url": "https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg"
                },
                "fields": [],
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
                        label: `Beilagenauswahl`,
                        customId: `mensafh::side_dishes::${content.json.date}`,
                        style: Discord.Constants.MessageButtonStyles.PRIMARY,
                    }),
                    new Discord.MessageButton({
                        label: `Zusatzstoffe`,
                        customId: `mensafh::additives::${content.json.date}`,
                        style: Discord.Constants.MessageButtonStyles.SECONDARY,
                    }),
                    new Discord.MessageButton({
                        label: "❤️ Spenden",
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


}

export default new ScraperMensaFHMuenster()
