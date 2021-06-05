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
            name: 'gw',
            description: "Commands related to Guild Wars 2",
            options: [
                {
                    name: "raidprogress",
                    description: "Shows your raid boss kill progress for the current week.",
                    type: 'SUB_COMMAND'
                },
                {
                    name: "apikey",
                    description: "Add your personal GW2-API-Key to the bot, so that it can show you details from your account",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "api-key",
                        description: "Your Account's API-Key from \"account.arena.net/applications\".",
                        type: "STRING",
                        required: true
                    }]
                }
            ]
        }
    },
    async execute(interaction) {
        switch (interaction.options[0].name.toLowerCase()) {
            case "apikey":
                let key = interaction.options[0].options[0].value
                files.writeJson(yadBot.getCommandConfigPath(this.getData().name), interaction.user.id, key)
                interaction.reply({
                    embeds: [{
                        title: "API-Key saved",
                        description: `Congratulations!\nYour API-Key has been saved and you can now use the other \`/${this.getData().name}\` commands, if you set the permissions of your given key correctly.\nIn case you want to revoke your submitted key, just visit your [ArenaNet Account Page](https://account.arena.net/applications) and delete the key from your key-list. I will not be able to get any information through that key after you deleted it.`,
                        color: EmbedColors.GREEN
                    }],
                    ephemeral: true
                })
                break
            case "raidprogress":
                interaction.defer()
                let apikey = files.readJson(yadBot.getCommandConfigPath(this.getData().name), interaction.user.id, false, false)
                if (apikey === false) {
                    interaction.editReply({
                        embeds: [{
                            title: "No API-Key saved",
                            description: `You have not yet given me an API-Key.\nTo help you out and display information about your account here, I need to get an API-Key with your help.\nVisit your [ArenaNet Account Page](https://account.arena.net/applications), create a new API-Key with a descriptive name (e.g.\"Discord Yad Bot API-Key\") and give it at least \`progression\` permissions (required for **this** command).`,
                            color: EmbedColors.RED
                        }],
                        ephemeral: false
                    })
                    return
                }

                let progressResponse = await axios({
                    method: 'get',
                    url: 'https://api.guildwars2.com/v2/account/raids',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36',
                        'Authorization': `Bearer ${apikey}`
                    },
                    responseType: 'text/json',
                    raxConfig: {
                        retry: 5,
                        noResponseRetries: 5,
                        retryDelay: 100,
                    }
                })

                let progressEmbed = {
                    title: "Your raid progress for this week",
                    fields: []
                }

                let contentResponse = await axios({
                    method: 'get',
                    url: 'https://api.guildwars2.com/v2/raids',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'
                    },
                    responseType: 'text/json',
                    raxConfig: {
                        retry: 5,
                        noResponseRetries: 5,
                        retryDelay: 100,
                    }
                })

                for (const raid of contentResponse.data) {
                    let raidResponse = await axios({
                        method: 'get',
                        url: `https://api.guildwars2.com/v2/raids/${raid}`,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.69 Safari/537.36'
                        },
                        responseType: 'text/json',
                        raxConfig: {
                            retry: 5,
                            noResponseRetries: 5,
                            retryDelay: 100,
                        }
                    })

                    for (const wing of raidResponse.data.wings) {
                        let data = {
                            name: this.translateSlug(wing.id),
                            value: "",
                            inline: true
                        }

                        wing.events.forEach((event) => {
                            data.value += `> `
                            if (progressResponse.data.includes(event.id)) {
                                data.value += `||`
                            }
                            data.value += `${this.translateSlug(event.id)}`
                            if (progressResponse.data.includes(event.id)) {
                                data.value += `||`
                            }
                            data.value += `\n`
                        })
                        progressEmbed.fields.push(data)
                    }
                }

                interaction.editReply({
                    embeds: [progressEmbed],
                    ephemeral: false
                })
                break
        }


        // todo: get users api key

        // todo: ask for key if not available

        // todo: request to gw2 api for progress

        // todo: list rendering

        // todo: eventually save last request date in api key file as well, if new week since then, display note about reset?
    },
    translateSlug(slug) {
        switch (slug) {
            case "spirit_vale":
                return "Spirit Vale"
            case "vale_guardian":
                return "Vale Guardian"
            case "spirit_woods":
                return "Spirit Woods"
            case "gorseval":
                return "Gorseval"
            case "sabetha":
                return "Sabetha"
            case "salvation_pass":
                return "Salvation Pass"
            case "slothasor":
                return "Slothasor"
            case "bandit_trio":
                return "Bandit Trio"
            case "matthias":
                return "Matthias"
            case "stronghold_of_the_faithful":
                return "Stronghold of the Faithful"
            case "escort":
                return "Escort"
            case "keep_construct":
                return "Keep Construct"
            case "twisted_castle":
                return "Twisted Castle"
            case "xera":
                return "Xera"
            case "bastion_of_the_penitent":
                return "Bastion of the Penitent"
            case "cairn":
                return "Cairn"
            case "mursaat_overseer":
                return "Mursaat Overseer"
            case "samarog":
                return "Samarog"
            case "deimos":
                return "Deimos"
            case "hall_of_chains":
                return "Hall of Chains"
            case "soulless_horror":
                return "Soulless Horror"
            case "river_of_souls":
                return "River of Souls"
            case "statues_of_grenth":
                return "Statues of Grenth"
            case "voice_in_the_void":
                return "Voice in the Void"
            case "mythwright_gambit":
                return "Mythwright Gambit"
            case "conjured_amalgamate":
                return "Conjured Amalgamate"
            case "twin_largos":
                return "Twin Largos"
            case "qadim":
                return "Qadim"
            case "the_key_of_ahdashim":
                return "The Key of Ahdashim"
            case "gate":
                return "Gate"
            case "adina":
                return "Adina"
            case "sabir":
                return "Sabir"
            case "qadim_the_peerless":
                return "Qadim the Peerless"
            default:
                return slug
        }
    }
}
