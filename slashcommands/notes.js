import yadBot from '../classes/YadBot.js'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"
import config from '../config.json' assert {type: "json"}
import files from '../classes/Files.js';
import EmbedColors from '../constants/EmbedColors.js';

export default {
    enabled: true,
    onlyAdmin: false,
    getData() {
        return {
            name: 'notes',
            description: "Lists, adds and removes entries to a note-list",
            options: [
                {
                    name: "list",
                    description: "Show your notes list.",
                    type: Discord.ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "add",
                    description: "Add a note to your notes list.",
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    options: [{
                        name: "note",
                        description: "Note to add",
                        type: Discord.ApplicationCommandOptionType.String,
                        required: true
                    }]
                },
                {
                    name: "remove",
                    description: "Remove a note from your notes list.",
                    type: Discord.ApplicationCommandOptionType.Subcommand,
                    options: [{
                        name: "note-number",
                        description: "Index-number of the note to remove",
                        type: Discord.ApplicationCommandOptionType.Integer,
                        required: true
                    }]
                }
            ]
        }
    },
    execute(interaction) {
        files.readJson(
            yadBot.getCommandConfigPath("notes"),
            interaction.user.id,
            false,
            []
        )

        let notesString = ""
        let notes = undefined

        switch (interaction.options.getSubcommand()) {
            case 'list':
                notes = files.readJson(
                    yadBot.getCommandConfigPath("notes"),
                    interaction.user.id,
                    false,
                    []
                )

                notes.forEach((noteEntry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${noteEntry}\n`
                })
                if (notesString === "") notesString = "Your notes list is empty."

                this.embedNotes(interaction, interaction, notesString, 0)
                break
            case 'add':
                notes = files.readJson(yadBot.getCommandConfigPath("notes"), interaction.user.id, false, [])
                notes.push(interaction.options.getString('note'))
                files.writeJson(yadBot.getCommandConfigPath("notes"), interaction.user.id, notes)

                notes.forEach((entry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${index + 1 === notes.length ? "**" : ""}${entry}${index + 1 === notes.length ? "**" : ""}\n`
                })
                this.embedNotes(interaction, interaction, notesString, 1)

                break
            case 'remove':
                notes = files.readJson(yadBot.getCommandConfigPath("notes"), interaction.user.id, false, [])

                let indexToRemove = interaction.options.getInteger('note-number')
                if (notes.length < indexToRemove) {
                    this.embedErrorInvalidRemoveIndex(interaction, interaction)
                    return
                }

                let oldNotes = JSON.stringify(notes) // stringify to copy by value
                notes.splice(interaction.options.getInteger('note-number') - 1, 1)
                files.writeJson(yadBot.getCommandConfigPath("notes"), interaction.user.id, notes)

                notesString = ""
                JSON.parse(oldNotes).forEach((entry, index) => {
                    notesString += ` \`${(index + 1)}:\` ${index + 1 === interaction.options.getInteger('note-number') ? "**~~" : ""}${entry}${index + 1 === interaction.options.getInteger('note-number') ? "~~**" : ""}\n`
                })
                if (notesString === "") notesString = "Your notes list is empty."

                this.embedNotes(interaction, interaction, notesString, 2)
                break
        }
    },
    embedNotes(interaction, args, notesString, embedType) {
        let finalEmbedColor
        if (embedType === 0) {
            finalEmbedColor = null
        }    // no color
        else if (embedType === 1) {
            finalEmbedColor = EmbedColors.GREEN
        }    // added note (green)
        else if (embedType === 2) {
            finalEmbedColor = EmbedColors.RED
        }    // removed note (red)
        else {
            finalEmbedColor = embedType
        }    // custom color

        interaction.reply({
            embeds: [{
                title: `Notes list`,
                description: embedType === 0 ? notesString : `Here is your refreshed notes list:\n${notesString}`,
                color: finalEmbedColor
            }],
            ephemeral: true
        })
    },
    embedErrorInvalidRemoveIndex(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid index to remove was given.`)
    }
}
