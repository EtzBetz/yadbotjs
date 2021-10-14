import luxon from 'luxon'
import * as Discord from 'discord.js'
import {WebsiteScraper} from './WebsiteScraper'
import yadBot from './YadBot.js'
import files from './Files.js';

class ScraperMensaFHMuenster extends WebsiteScraper {

    async shouldExecute() {
        let weekday = luxon.DateTime.local().minus({hours: 6}).weekday
        return !(weekday === 7);
    }

    parseWebsiteContentToJSON(scrapeInfo) {
        let menu = {}

        menu.date = luxon.DateTime.local().minus({hours: 6}).toFormat('yyyy-MM-dd')
        menu.meals = []
        menu.side_dishes = []
        menu.additives = []
        menu.infos = []

        let data = scrapeInfo.response.data.days.find((entry) => {
            return entry['iso-date'] === menu.date
        })

        data.categories.forEach(category => {
            if (category.name.toLowerCase().includes("info")) { // infos
                menu.infos.push({'text': category.meals[0].name.trim().replace(/­/g, '')})
            } else if (
                category.name.toLowerCase().includes("menü") ||
                category.name.toLowerCase().includes("tagesaktion") ||
                category.name.toLowerCase().includes("eintopf") // meals
            ) {
                let meal = this.parseCategory(category, scrapeInfo.response.data.filters)
                if (meal.length > 1) yadBot.sendMessageToOwner("meal in meals parsing is more than one!")
                meal = meal[0]
                let dishNumArr = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn']
                for (const dishNum in dishNumArr) {
                    if (category.name.toLowerCase().includes(dishNumArr[dishNum])) {
                        meal.side_dishes_num = parseInt(dishNum, 10) + 1
                        break
                    }
                }
                if (meal.side_dishes_num === undefined) meal.side_dishes_num = 0
                meal.price = (category.meals[0].pricing['for'][0] / 100).toLocaleString('de-DE')
                meal.price = meal.price.padEnd(4, '0')
                menu.meals.push(meal)
                for (const additive of meal.additives) {
                    if (!menu.additives.includes(additive)) {
                        menu.additives.push(additive)
                    }
                }
            } else if (
                (
                    category.name.toLowerCase().includes("beilage") &&
                    !category.name.toLowerCase().includes("beilagen")
                ) ||
                category.name.toLowerCase().includes("tagesdessert") // side_dishes
            ) {
                let sideDishes = this.parseCategory(category, scrapeInfo.response.data.filters)
                menu.side_dishes.push(...sideDishes)
                for (const sideDish of sideDishes) {
                    for (const additive of sideDish.additives) {
                        if (!menu.additives.includes(additive)) {
                            menu.additives.push(additive)
                        }
                    }
                }
            } else {
                yadBot.sendMessageToOwner(`category in mensafh scraper is not detected as info, meals or side dish: '${category.name.toLowerCase()}'`)
            }
        })
        return [menu]
    }

    parseCategory(category, filters) {
        // todo: double isBlabla parameters are overwritten for some reason
        let parsedCategory = []
        for (const meal of category.meals) {
            let parsedMeal = {}
            parsedMeal.title = meal.name.trim().replace(/­/g, '')
            parsedMeal.additives = []

            for (const filterCategory in filters) {
                for (const filterIndex in filters[filterCategory].attributes) {
                    let filter = 1 << parseInt(filterIndex, 10)
                    // noinspection JSBitwiseOperatorUsage
                    if (filter & meal.filters[filterCategory]) {
                        let filter = filters[filterCategory].attributes[filterIndex].key.toLowerCase().trim()
                        switch (filter) {
                            case "vegan":
                                parsedMeal.isVegan = true
                                break
                            case "vegetarisch":
                                parsedMeal.isVegetarian = true
                                break
                            case "schwein":
                                parsedMeal.isPork = true
                                break
                            case "gefluegel":
                                parsedMeal.isChicken = true
                                break
                            case "rind":
                                parsedMeal.isBeef = true
                                break
                            case "fisch":
                                parsedMeal.isFish = true
                                break
                            case "alkohol":
                                parsedMeal.isAlcoholic = true
                                break
                            default:
                                const knownAdditives = [
                                    'antioxidationsmittel', 'farbstoff', 'geschmacksverstaerker', 'konservierungsstoffe', 'ei', 'gluten', 'milch', 'weizen',
                                    'geschwefelt', 'soja', 'phosphat', 'senf', 'dinkel', 'hafer', 'haselnuss', 'mandeln', 'schalenfruechte', 'sellerie', 'weizen'
                                ]
                                if (!knownAdditives.includes(filter)) yadBot.sendMessageToOwner(`New filter in Mensa Scraper: ${filter}`)
                                if (!parsedMeal.additives.includes(filter)) parsedMeal.additives.push(filter)
                                break
                        }
                    }
                }
            }
            parsedCategory.push(parsedMeal)
        }
        return parsedCategory
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
                        label: `Beilagen`,
                        customId: `mensafh::side_dishes::${content.json.date}`,
                        style: Discord.Constants.MessageButtonStyles.PRIMARY,
                    }),
                    new Discord.MessageButton({
                        label: `Zusatzstoffe (bald)`,
                        customId: `mensafh::additives::${content.json.date}`,
                        disabled: true,
                        style: Discord.Constants.MessageButtonStyles.SECONDARY,
                    }),
                    new Discord.MessageButton({
                        label: "Spenden",
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
