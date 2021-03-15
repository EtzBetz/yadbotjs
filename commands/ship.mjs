import Discord from "discord.js"
import yadBot from '../classes/YadBot.mjs'
import config from '../config.json'

export default {
    name: 'ship',
    enabled: true,
    args: "<add/remove/list> (@add/@remove<ship-name>) (<user>)",
    description: "Can be used to manage your owned ships inside the Star Citizen Universe.",
    onlyServer: "677333180784836618",
    execute(message, args) {
        let userToHandle = message.author

        if (args[0] === "add" || args[0] === "remove") {
            let mentionArgumentIndex = 2
            if (
                message.mentions.users.size === 1 &&
                yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]) ===
                message.mentions.users.get(yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]))?.id
            ){
                userToHandle = message.mentions.users.get(yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]))
            }

            let shipName = undefined
            this.shipNames.find((name, index) => {
                if (name.toLowerCase().includes(args[1].toLowerCase())) {
                    shipName = name
                }
            })

            if (shipName === undefined) {
                yadBot.sendCommandErrorEmbed(message, `Ship "${args[1]}" not found!`)
                return
            }

            let shipFound = false
            yadBot.getBot().guilds.fetch(this.onlyServer)
                .then(guild => {
                    guild.roles.cache.forEach((serverRole) => {
                        if (serverRole.name.toLowerCase().includes(shipName.toLowerCase())) {
                            shipFound = true
                            guild.members.fetch(userToHandle)
                                .then(guildMember => {
                                    if (args[0] === "add") {
                                        guildMember.roles.add(serverRole, 'Given by Yad command as SC Ship')
                                        message.channel.send(new Discord.MessageEmbed({
                                            title: "Role added",
                                            color: 0x4CAF50,
                                            description: `The ship-role "${serverRole.name}" was given to ${guildMember.toString()}.`
                                        }))
                                    }
                                    else if (args[0] === "remove") {
                                        guildMember.roles.remove(serverRole, 'Removed by Yad command as SC Ship')
                                        message.channel.send(new Discord.MessageEmbed({
                                            title: "Role removed",
                                            color: 0x4CAF50,
                                            description: `The ship-role "${serverRole.name}" has been removed from ${guildMember.toString()}'s ship-list.`
                                        }))
                                    }
                                })
                        }
                    })
                    if (!shipFound) {
                        yadBot.sendCommandErrorEmbed(message, `Role for ship "${shipName}" not found! Message Admins.`)
                    }
                })
                .catch((e) => {
                    // this.log(`Guild '${this.onlyServer}' could not be found.`)
                    console.dir(e)
                })

        } else if (args[0] === "list") {
            if (args[1] === "all") {
                let shipList = []
                let vehicleList = []

                yadBot.getBot().guilds.fetch(this.onlyServer)
                    .then(guild => {
                        guild.members.cache.each((member) => {
                            member.roles.cache.forEach((memberRole) => {
                                const roleColor = memberRole.color.toString(16)
                                if (roleColor === "2e90ff") {
                                    let shipIndex = shipList.findIndex((ship) => {
                                        return ship.name === memberRole.name
                                    })

                                    if (shipIndex === -1) {
                                        shipList.push({
                                            name: memberRole.name,
                                            count: 1,
                                            users: [member]
                                        })
                                    } else {
                                        shipList[shipIndex].count++
                                        shipList[shipIndex].users.push(member)
                                    }
                                }
                                if (roleColor === "4ca264") {
                                    let vehicleIndex = vehicleList.findIndex((vehicle) => {
                                        return vehicle.name === memberRole.name
                                    })

                                    if (vehicleIndex === -1) {
                                        vehicleList.push({
                                            name: memberRole.name,
                                            count: 1,
                                            users: [member]
                                        })
                                    } else {
                                        vehicleList[vehicleIndex].count++
                                        vehicleList[vehicleIndex].users.push(member)
                                    }
                                }
                            })
                        })

                        let shipString = ""
                        let vehicleString = ""

                        shipList.forEach((ship) => {
                            if (shipString !== "") shipString += "\n"
                            shipString += ` - ${ship.count}x ${ship.name} `
                            ship.users.forEach((user) => {
                                shipString += `(${user.toString()})`
                            })
                        })

                        vehicleList.forEach((vehicle) => {
                            if (vehicleString !== "") vehicleString += "\n"
                            vehicleString += ` - ${vehicle.count}x ${vehicle.name} `
                            vehicle.users.forEach((user) => {
                                vehicleString += `(${user.toString()})`
                            })
                        })

                        message.channel.send(new Discord.MessageEmbed({
                            "author": {
                                "name": `All Ships and Vehicles`,
                                "icon_url": guild.iconURL({dynamic: true} )
                            },
                            description: `**Ships:**\n${shipString}\n\n**Vehicles:**\n${vehicleString}`
                        }))
                    })


            } else {
                let mentionArgumentIndex = 1
                if (
                    message.mentions.users.size === 1 &&
                    yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]) ===
                    message.mentions.users.get(yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]))?.id
                ) {
                    userToHandle = message.mentions.users.get(yadBot.getUserSnowflakeFromMentionString(args[mentionArgumentIndex]))
                }

                let shipList = ""
                let vehicleList = ""
                yadBot.getBot().guilds.fetch(this.onlyServer)
                    .then(guild => {
                        guild.members.fetch(userToHandle)
                            .then(guildMember => {
                                guildMember.roles.cache.forEach((memberRole) => {
                                    const roleColor = memberRole.color.toString(16)
                                    if (roleColor === "2e90ff") {
                                        if (shipList !== "") shipList += "\n"
                                        shipList += ` - ${memberRole.name}`
                                    }
                                    if (roleColor === "4ca264") {
                                        if (vehicleList !== "") vehicleList += "\n"
                                        vehicleList += ` - ${memberRole.name}`
                                    }
                                })

                                message.channel.send(new Discord.MessageEmbed({
                                    "author": {
                                        "name": `${userToHandle.username}'s Ships and Vehicles`,
                                        "icon_url": userToHandle.avatarURL({dynamic: true} )
                                    },
                                    fields: [
                                        {
                                            "name": "Ships",
                                            "value": shipList !== "" ? shipList : "Owns no ship yet."
                                        },
                                        {
                                            "name": "Vehicles",
                                            "value": vehicleList !== "" ? vehicleList : "Owns no vehicle yet."
                                        },
                                    ]
                                }))

                            })
                    })
            }
        }
    },
    shipNames: [
        "ARGO MPUV Cargo",
        "ARGO MPUV Passenger",
        "ARGO Mole",
        "ARGO SRV",
        "Aegis Avenger Stalker",
        "Aegis Avenger Titan",
        "Aegis Avenger Titan Renegade",
        "Aegis Avenger Trainer",
        "Aegis Avenger Warlock",
        "Aegis Eclipse",
        "Aegis Gladius",
        "Aegis Gladius Pirate",
        "Aegis Gladius Valiant",
        "Aegis Hammerhead",
        "Aegis Hammerhead 2949 Best in Show",
        "Aegis Idris-K",
        "Aegis Idris-M",
        "Aegis Idris-P",
        "Aegis Javelin",
        "Aegis Nautilus",
        "Aegis Nautilus Solstice Edition",
        "Aegis Reclaimer",
        "Aegis Reclaimer 2949 best in show",
        "Aegis Redeemer",
        "Aegis Retaliator Base",
        "Aegis Retaliator Bomber",
        "Aegis Sabre",
        "Aegis Sabre Comet",
        "Aegis Sabre Raven",
        "Aegis Vanguard Harbinger",
        "Aegis Vanguard Hoplite",
        "Aegis Vanguard Sentinel",
        "Aegis Vanguard Warden",
        "Aegis Vulcan",
        "Anvil Arrow",
        "Anvil Ballista",
        "Anvil Ballista Dunestalker",
        "Anvil Ballista Snowblind",
        "Anvil C8 Pisces",
        "Anvil C8X Pisces Expedition",
        "Anvil Carrack",
        "Anvil Carrack Expedition",
        "Anvil Crucible",
        "Anvil DireHawk",
        "Anvil F7A Hornet",
        "Anvil F7A Hornet MK II",
        "Anvil F7A-R Hornet Tracker",
        "Anvil F7C Hornet",
        "Anvil F7C Hornet Wildfire",
        "Anvil F7C-M Super Hornet",
        "Anvil F7C-M Super Hornet Heartseeker",
        "Anvil F7C-R Hornet Tracker",
        "Anvil F7C-S Hornet Ghost",
        "Anvil F8A Lightning",
        "Anvil F8C Lightning",
        "Anvil F8C Lightning Civilian",
        "Anvil F8C Lightning Executive Edition",
        "Anvil Hawk",
        "Anvil Hurricane",
        "Anvil Shadow Hawk",
        "Anvil T8A Gladiator",
        "Anvil T8C Gladiator",
        "Anvil Terrapin",
        "Anvil Valkyrie",
        "Anvil Valkyrie Liberator",
        "Aopoa Khartu-al",
        "Aopoa Nox",
        "Aopoa Nox Kue",
        "Aopoa Qhire Khartu",
        "Aopoa San'tok.yāi",
        "Banu Defender",
        "Banu Merchantman",
        "Consolidated Mustang Alpha",
        "Consolidated Mustang Alpha Vindicator",
        "Consolidated Mustang Beta",
        "Consolidated Mustang Delta",
        "Consolidated Mustang Gamma",
        "Consolidated Mustang Omega",
        "Consolidated Mustang Omega : AMD Edition",
        "Consolidated Pioneer",
        "Consolidated CNOU Nomad",
        "Crusader A2 Hercules",
        "Crusader Ares Inferno",
        "Crusader Ares Ion",
        "Crusader C2 Hercules",
        "Crusader Genesis Starhunter",
        "Crusader Genesis Starliner",
        "Crusader Genesis Starseeker",
        "Crusader Jupiter",
        "Crusader M2 Hercules",
        "Crusader Mercury Star Runner",
        "Drake Buccaneer",
        "Drake Caterpillar",
        "Drake Caterpillar 2949 best in show",
        "Drake Caterpillar Pirate Edition",
        "Drake Corsair",
        "Drake Cutlass 2949 best in show",
        "Drake Cutlass Black",
        "Drake Cutlass Blue",
        "Drake Cutlass Red",
        "Drake Dragonfly",
        "Drake Dragonfly Black",
        "Drake Dragonfly Star Kitten",
        "Drake Dragonfly Yellowjacket",
        "Drake Herald",
        "Drake Kraken",
        "Drake Kraken Privateer",
        "Drake Vulture",
        "Esperia Blade (replica)",
        "Esperia Glaive (replica)",
        "Esperia Prowler",
        "Esperia Scythe (replica)",
        "Greycat Cydnus",
        "Greycat Greycat PTV",
        "Kruger P-52 Merlin",
        "Kruger P-72 Archimedes",
        "Kruger P-72 Archimedes Emerald",
        "Musashi Endeavor",
        "Musashi Freelancer",
        "Musashi Freelancer DUR",
        "Musashi Freelancer MAX",
        "Musashi Freelancer MIS",
        "Musashi Hull A",
        "Musashi Hull B",
        "Musashi Hull C",
        "Musashi Hull D",
        "Musashi Hull E",
        "Musashi Prospector",
        "Musashi Razor",
        "Musashi Razor EX",
        "Musashi Razor LX",
        "Musashi Reliant Kore",
        "Musashi Reliant Mako",
        "Musashi Reliant Sen",
        "Musashi Reliant Tana",
        "Musashi Starfarer",
        "Musashi Starfarer Gemini",
        "Origin 100i",
        "Origin 125a",
        "Origin 135c",
        "Origin 300i",
        "Origin 315p",
        "Origin 315p Explorer",
        "Origin 325a",
        "Origin 350r",
        "Origin 600i Executive edition",
        "Origin 600i Exploration",
        "Origin 600i Touring",
        "Origin 85X",
        "Origin 890 Jump",
        "Origin G12",
        "Origin G12a",
        "Origin G12r",
        "Origin M50",
        "Origin Rover",
        "Origin X1",
        "Origin X1 Force",
        "Origin X1 Velocity",
        "RSI Apollo Medivac",
        "RSI Apollo Triage",
        "RSI Aurora CL",
        "RSI Aurora ES",
        "RSI Aurora LN",
        "RSI Aurora LX",
        "RSI Aurora MR",
        "RSI Constellation Andromeda",
        "RSI Constellation Aquila",
        "RSI Constellation Phoenix",
        "RSI Constellation Phoenix Emerald",
        "RSI Constellation Taurus",
        "RSI Lynx",
        "RSI Mantis",
        "RSI Orion",
        "RSI Polaris",
        "RSI Ursa",
        "RSI Ursa Fortuna",
        "RSI Perseus",
        "Tumbril Cyclone",
        "Tumbril Cyclone-AA",
        "Tumbril Cyclone-RC",
        "Tumbril Cyclone-RN",
        "Tumbril Cyclone-TR",
        "Tumbril Nova",
        "Tumbril Ranger CV",
        "Tumbril Ranger RC",
        "Tumbril Ranger TR",
        "Vanduul Scythe"
    ]
}
