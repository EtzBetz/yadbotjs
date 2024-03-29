import Discord from 'discord.js';
import yadBot from '../classes/YadBot.js';
import config from '../config.json' assert { type: 'json' };
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
                    name: 'balance',
                    description:
                        'Shows the current balance of the given ID or if one is stored and none is given, the given.',
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'card-number',
                            description: 'A FH Münster Card ID.',
                            type: Discord.ApplicationCommandOptionType.Integer,
                            required: false,
                        },
                    ],
                },
                {
                    name: 'cardnumber',
                    description: "Store your mensa card ID so you don't have to re-enter it every day.",
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    options: [
                        {
                            name: 'card-number',
                            description: 'A FH Münster Card ID.',
                            type: Discord.ApplicationCommandOptionType.Integer,
                            required: true,
                        },
                    ],
                },
            ],
        };
    },
    async execute(interaction) {
        switch (interaction.options.getSubcommand()) {
            case 'balance':
                await interaction.deferReply({ ephemeral: true });
                await interaction.editReply({
                    embeds: [
                        {
                            title: 'Funktion deaktiviert',
                            description: `Da diese Funktion von der Seite der FH aktuell deaktiviert wurde, steht sie bis auf weiteres nicht zur Verfügung. Hoffentlich bald wieder :)`,
                            color: EmbedColors.RED,
                        },
                    ],
                    ephemeral: true,
                });
                return;
                /*let enteredCardId = interaction.options.getInteger('card-number')
                await interaction.deferReply({ephemeral: true})
                if (enteredCardId === null) {
                    enteredCardId = files.readJson(
                        yadBot.getCommandConfigPath(this.getData().name),
                        interaction.user.id,
                        false,
                        false
                    )
                    if (enteredCardId === false) {
                        await interaction.editReply({
                            embeds: [{
                                title: "Keine Kartennummer hinterlegt oder angegeben",
                                description: `Du hast leider keine Kartennummer bei mir hinterlegt und auch keine angegeben.\nKeine Nummer: keine Auskunft. So sind die Regeln.`,
                                color: EmbedColors.RED
                            }],
                            ephemeral: true
                        })
                        return
                    }
                }

                let mensaFhScraper = yadBot.scrapers.find(scraper => scraper.constructor.name === "ScraperMensaFHMuenster")
                const balanceObj = await mensaFhScraper.getBalanceByCardId(interaction, enteredCardId)

                if (balanceObj.success === false) {
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
                    return
                }

                await interaction.editReply({
                    embeds: [{
                        description: `Dein Guthaben beträgt: **${balanceObj.formatted_balance}**`,
                        author: {
                            name: 'Fachhochschule Münster',
                            url: 'https://fh-muenster.de',
                            icon_url: 'https://etzbetz.io/stuff/yad/images/logo_fh_muenster.jpg',
                        },
                    }],
                    components: [
                        new Discord.ActionRowBuilder({
                            components: [
                                new Discord.ButtonBuilder({
                                    label: `Guthaben aufladen`,
                                    url: 'https://topup.klarna.com/stw_munster',
                                    style: Discord.ButtonStyle.Link,
                                }),
                            ]
                        })
                    ],
                    ephemeral: true
                })*/
                break;
            case 'cardnumber':
                await interaction.deferReply({ ephemeral: true });
                let newKey = interaction.options.getInteger('card-number');
                files.writeJson(
                    yadBot.getCommandConfigPath(this.getData().name),
                    interaction.user.id,
                    newKey.toString(),
                );
                await interaction.editReply({
                    embeds: [
                        {
                            title: 'Kartennummer für dich gespeichert',
                            description: `Ich habe die Kartennummer \`${newKey}\` für dich hinterlegt. Bei mir ist sie sicher.\nDu kannst nun dein Guthaben abfragen, ohne die Kartennummer anzugeben.`,
                            color: EmbedColors.GREEN,
                        },
                    ],
                    ephemeral: true,
                });
                break;
        }
    },
};
