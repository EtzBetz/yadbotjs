import yadBot from '../classes/YadBot.js'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"
import config from '../config.json'
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
                    type: 'SUB_COMMAND'
                },
                {
                    name: "add",
                    description: "Add a note to your notes list.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "note",
                        description: "Note to add",
                        type: "STRING",
                        required: true
                    }]
                },
                {
                    name: "remove",
                    description: "Remove a note from your notes list.",
                    type: 'SUB_COMMAND',
                    options: [{
                        name: "note-number",
                        description: "Index-number of the note to remove",
                        type: "INTEGER",
                        required: true
                    }]
                }
            ]
        }
    },
    execute(interaction) {
        files.readJson(
            `./notes/notes.json`,
            interaction.user.id,
            false,
            []
        )

        let notesString = ""
        let notes = undefined

        if (interaction.options.get('list') !== undefined) {
            notes = files.readJson(
                `./notes/notes.json`,
                interaction.user.id,
                false,
                []
            )

            notes.forEach((noteEntry, index) => {
                notesString += ` \`${(index + 1)}:\` ${noteEntry}\n`
            })
            if (notesString === "") notesString = "Deine Notizliste ist leer."

            this.embedNotes(interaction, interaction, notesString, 0)
        } else if (interaction.options.get('add') !== undefined) {
            notes = files.readJson(`./notes/notes.json`, interaction.user.id, false, [])
            notes.push(interaction.options.get('add').options.get('note').value)
            files.writeJson(`./notes/notes.json`, interaction.user.id, notes)

            notes.forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index + 1 === notes.length ? "**" : ""}${entry}${index + 1 === notes.length ? "**" : ""}\n`
            })
            this.embedNotes(interaction, interaction, notesString, 1)
        } else if (interaction.options.get('remove') !== undefined) {
            notes = files.readJson(`./notes/notes.json`, interaction.user.id, false, [])

            let indexToRemove = interaction.options.get('remove').options.get('note-number').value
            if (notes.length < indexToRemove) {
                this.embedErrorInvalidRemoveIndex(interaction, interaction)
                return
            }

            let oldNotes = JSON.stringify(notes) // stringify to copy by value
            notes.splice(interaction.options.get('remove').options.get('note-number').value - 1, 1)
            files.writeJson(`./notes/notes.json`, interaction.user.id, notes)

            notesString = ""
            JSON.parse(oldNotes).forEach((entry, index) => {
                notesString += ` \`${(index + 1)}:\` ${index + 1 === interaction.options.get('remove').options.get('note-number').value ? "**~~" : ""}${entry}${index + 1 === interaction.options.get('remove').options.get('note-number').value ? "~~**" : ""}\n`
            })
            if (notesString === "") notesString = "Deine Notizliste ist leer."

            this.embedNotes(interaction, interaction, notesString, 2)

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
                title: `Notizliste`,
                description: embedType === 0 ? notesString : `Hier ist deine neue Notizliste:\n${notesString}`,
                color: finalEmbedColor
            }],
            ephemeral: true
        })
    }
    ,
    embedErrorInvalidArguments(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid arguments were given.\n Use \`${config.prefix}help\` for more information`)
    }
    ,
    embedErrorInvalidRemoveIndex(message, args) {
        yadBot.sendCommandErrorEmbed(message, `Invalid index to remove was given.`)
    }
}
