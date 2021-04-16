import Discord from "discord.js"
import axios from 'axios'
import luxon from 'luxon'

export default {
    name: 'coronatime',
    enabled: true,
    description: "Given on numbers I will calculate an approximate length of corona time in Germany (in weeks).",
    async execute(message, args) {
        let citizens = 83000000  // fix
        let children = 13700000  // fix
        let fullyVaccinated = 5186135
        let firstVaccinated = 14058329
        let dailyAverageVaccinations = 509297

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

        for (let i = 0; i < 7; i++) {
            dates.push(dates[0].minus({days: i+1}))
        }
        // console.log(dates)

        let jsonData = this.tsvJSON(dashboardData.data)

        let data = []
        for (let i = 0; i < 8; i++) {
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

        let currentWeekResult = Math.ceil(((((citizens - children) - fullyVaccinated) * 2) - (firstVaccinated - fullyVaccinated)) / (dailyAverageVaccinations * data.length))

        message.channel.send(new Discord.MessageEmbed({
            title: "Future Corona Time",
            description: `Based on current weekly data, it will take **~${currentWeekResult} weeks** to vaccinate all remaining unvaccinated adult germans.\n\n**Data:**\nCitizens in Germany: ${citizens.toLocaleString("de-DE")}\nChildren in Germany: ${children.toLocaleString("de-DE")}\nFully vaccinated citizens: ${fullyVaccinated.toLocaleString("de-DE")}\nOne-time vaccinated citizens: ${firstVaccinated.toLocaleString("de-DE")}\nCurrent daily vaccinations: ${dailyAverageVaccinations.toLocaleString("de-DE")}`
        }))
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
