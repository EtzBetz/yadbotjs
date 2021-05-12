import Discord from "discord.js"
import axios from 'axios'
import luxon from 'luxon'

export default {
    enabled: true,
    getData() {
        return {
            name: 'coronatime',
            description: 'Given on numbers I will calculate an approximate length of corona time in Germany.'
        }
    },
    async execute(interaction) {
        let citizens = 83000000  // static
        let children = 13700000  // static
        let fullyVaccinated = 0
        let firstVaccinated = 0
        let dailyAverageVaccinations = 0

        let dashboardData = await axios({
            method: 'get',
            url: "https://impfdashboard.de/static/data/germany_vaccinations_timeseries_v2.tsv",
            headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'},
            responseType: 'text/html',
            raxConfig: {
                retry: 5,
                noResponseRetries: 5,
                retryDelay: 100,
            }
        })

        let dates = []
        dates.push(luxon.DateTime.local())

        for (let i = 0; i < 8; i++) {
            dates.push(dates[0].minus({days: i + 1}))
        }
        // console.log(dates)

        let jsonData = this.tsvJSON(dashboardData.data)

        let data = []
        for (let i = 0; i < 9; i++) {
            let curData = jsonData.find((value, index) => {
                return value.date === dates[i].toFormat('yyyy-MM-dd')
            })
            if (curData !== undefined && data.length < 7) {
                data.push(curData)
            }
        }
        // console.log(data)


        fullyVaccinated = parseInt(data[0].personen_voll_kumulativ)
        firstVaccinated = parseInt(data[0].personen_erst_kumulativ)
        let dailyAverageVaccinationsCalc = 0
        for (let i = 0; i < data.length; i++) {
            dailyAverageVaccinationsCalc += parseInt(data[i].dosen_differenz_zum_vortag, 10)
        }
        dailyAverageVaccinationsCalc /= data.length
        // console.log(data.length)
        dailyAverageVaccinations = Math.floor(dailyAverageVaccinationsCalc)

        const currentWeekResult = Math.ceil(((((citizens - children) - fullyVaccinated) * 2) - (firstVaccinated - fullyVaccinated)) / (dailyAverageVaccinations * data.length))

        const expectedDate = luxon.DateTime.local().plus({weeks: currentWeekResult})
        const dateString1 = expectedDate.toFormat("MMMM d")
        const dateString2 = expectedDate.toFormat("d")
        const dateString3 = dateString2.substring(dateString2.length - 1)
        const dateString4 =
            dateString3 === "1" && dateString2.substring(dateString2.length - 2) !== "11" ? "st" :
                dateString3 === "2" && dateString2.substring(dateString2.length - 2) !== "12" ? "nd" :
                    dateString3 === "3" ? "rd" :
                        "th"
        const dateString5 = expectedDate.toFormat("yyyy")

        const currentWeekResultPartial = Math.ceil((((((citizens - children) * 0.7) - fullyVaccinated) * 2) - (firstVaccinated - fullyVaccinated)) / (dailyAverageVaccinations * data.length))

        const expectedDatePartial = luxon.DateTime.local().plus({weeks: currentWeekResultPartial})
        const datePartialString1 = expectedDatePartial.toFormat("MMMM d")
        const datePartialString2 = expectedDatePartial.toFormat("d")
        const datePartialString3 = datePartialString2.substring(datePartialString2.length - 1)
        const datePartialString4 =
            datePartialString3 === "1" && datePartialString2.substring(datePartialString2.length - 2) !== "11" ? "st" :
                datePartialString3 === "2" && datePartialString2.substring(datePartialString2.length - 2) !== "12" ? "nd" :
                    datePartialString3 === "3" ? "rd" :
                        "th"
        const datePartialString5 = expectedDatePartial.toFormat("yyyy")

        interaction.reply({
            embeds: [{
                title: "Future Corona Time",
                description: `Based on current weekly data, it will take **~${currentWeekResult} weeks** to vaccinate all remaining unvaccinated german adults.\nBased on this calculation, that will currently result in **${dateString1}${dateString4} ${dateString5}**.\n\nThe target goal of vaccinating 70% of all german adults could take **~${currentWeekResultPartial} weeks**.\nThis would result in the calculated date **${datePartialString1}${datePartialString4} ${datePartialString5}.**\n\n**Data:**\nCitizens in Germany: ${citizens.toLocaleString("de-DE")}\nChildren in Germany: ${children.toLocaleString("de-DE")}\nFully vaccinated citizens: ${fullyVaccinated.toLocaleString("de-DE")}\nOne-time vaccinated citizens: ${firstVaccinated.toLocaleString("de-DE")}\nCurrent daily vaccinations: ${dailyAverageVaccinations.toLocaleString("de-DE")}\n\n**Please take this data with a grain of salt!** It is only calculated to have a very rough understanding of how long it **could** take until we have our pre-covid lives back again. To get a better understanding of the current situation, **visit official sources** like [Impfdashboard.de](https://impfdashboard.de/), [Pandemieende.de](https://pandemieende.de/) or others.`
            }]
        })
    },
    tsvJSON(tsv) {
        const lines = tsv.split('\n');
        const headers = lines.shift().split('\t');
        return lines.map(line => {
            const data = line.split('\t');
            return headers.reduce((obj, nextKey, index) => {
                obj[nextKey] = data[index];
                return obj;
            }, {});
        });
    }
}
