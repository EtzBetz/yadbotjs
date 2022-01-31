import Discord from "discord.js"
import yadBot from '../classes/YadBot.js'
import config from '../config.json'
import EmbedColors from '../constants/EmbedColors.js';
import files from '../classes/Files.js';
import axios from 'axios';

export default {
    enabled: true,
    onlyAdmin: false,
    getData() {
        return {
            name: 'fh',
            description: "Commands related to FH Münster and it's Mensa",
            options: [
                {
                    name: "balance",
                    description: "Shows the current balance of the given ID or if one is stored and none is given, the given.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "card-number",
                        description: "A FH Münster Card ID.",
                        type: "INTEGER",
                        required: false
                    }]
                },
                {
                    name: "cardnumber",
                    description: "Store your mensa card ID so you don't have to re-enter it every day.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "card-number",
                        description: "A FH Münster Card ID.",
                        type: "INTEGER",
                        required: true
                    }]
                }
            ]
        }
    },
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case "balance":
                let enteredNumber = interaction.options.getInteger('card-number')
                await interaction.deferReply({ephemeral: true})
                if (enteredNumber === null) {
                    enteredNumber = files.readJson(
                        yadBot.getCommandConfigPath(this.getData().name),
                        interaction.user.id,
                        false,
                        false
                    )
                    if (enteredNumber === false) {
                        await interaction.editReply({
                            embeds: [{
                                title: "Keine Kartennummer hinterlegt oder angegeben",
                                description: `Du hast leider keine Kartennummer bei mir hinterlegt und auch keine angegeben.\nKeine Nummer: keine Auskunft. So sind die Regeln.`,
                                color: EmbedColors.RED
                            }],
                            ephemeral: true
                        })
                        break
                    }
                }
                // todo: check validity of number

                let balanceResponse = await axios({
                    method: 'get',
                    url: `https://api.topup.klarna.com/api/v1/STW_MUNSTER/cards/${enteredNumber}/balance`,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'
                    },
                    responseType: 'text/json'
                })
                    .catch(async (e) => {
                        await interaction.editReply({
                            embeds: [{
                                title: "Ein Fehler ist aufgetreten",
                                description: `Hast du vielleicht eine ungültige Kartennummer eingegeben?\nVersuch es ansonsten in einigen Minuten noch einmal.\n\n**Tipp:** Du kannst mit \`/${this.getData().name} cardnumber <Kartennummer>\`\ndeine Kartennummer hinterlegen, um sie nicht jedes mal eingeben zu müssen.`,
                                color: EmbedColors.RED,
                                author: {
                                    name: 'Fachhochschule Münster',
                                    url: 'https://fh-muenster.de',
                                    icon_url: 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
                                },
                            }],
                            ephemeral: true
                        })
                    })

                if (balanceResponse?.status === 200) {
                    const balance = balanceResponse.data.balance

                    await interaction.editReply({
                        embeds: [{
                            description: `Dein Guthaben beträgt: **${balance.toString().substring(0, balance.toString().length - 2).padStart(1, '0')},${balance.toString().substring(balance.toString().length - 2)}€**`,
                            color: EmbedColors.GREEN,
                            author: {
                                name: 'Fachhochschule Münster',
                                url: 'https://fh-muenster.de',
                                icon_url: 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
                            },
                        }],
                        ephemeral: true
                    })
                }
                break
            case "cardnumber":
                await interaction.deferReply({ephemeral: true})
                let newKey = interaction.options.getInteger('card-number')
                // todo: check validity of number
                files.writeJson(yadBot.getCommandConfigPath(this.getData().name), interaction.user.id, newKey)
                await interaction.editReply({
                    embeds: [{
                        title: "Kartennummer für dich gespeichert",
                        description: `Ich habe die Kartennummer \`${newKey}\` für dich hinterlegt. Bei mir ist sie sicher.\nDu kannst nun dein Guthaben abfragen, ohne die Kartennummer anzugeben.`,
                        color: EmbedColors.GREEN
                    }],
                    ephemeral: true
                })
                break
        }
    }
}
