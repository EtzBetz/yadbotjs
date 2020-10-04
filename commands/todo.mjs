import yadBot from './../classes/YadBot'
import Discord from "discord.js"
import editJsonFile from "edit-json-file"

export default {
    name: 'todo',
    enabled: true,
    description: "Lists, adds and removes entries of my todo-list",
    args: "(<add/remove>) (@add<note>) (@remove<note-number>)",
    onlyOwner: true,
    execute(message, args) {
        let file = editJsonFile(`./todo/todo.json`);

        if (args[0] === undefined) {
            let todo = ""
            file.get().todo?.forEach((entry, index) => {
                todo += ` \`${(index + 1)}:\` ${entry}\n`
            })
            if (todo === "") todo = "Deine To-Do Liste ist sauber."
            message.channel.send(
                new Discord.MessageEmbed({
                    title: `To-Do Liste`,
                    description: todo
                })
            )
        } else if (args[0] === "add") {
            let todo = file.get()
            let oneIndex = todo.todo?.push(args.shift() && args.join(' '))
            file.set("todo", todo.todo);
            file.save();

            let todoString = ""
            todo.todo?.forEach((entry, index) => {
                todoString += ` \`${(index + 1)}:\` ${index+1===todo.todo?.length?"**":""}${entry}${index+1===todo.todo?.length?"**":""}\n`
            })

            message.channel.send(
                new Discord.MessageEmbed({
                    title: `To-Do Liste`,
                    description: `Hier ist deine neue To-Do Liste:\n${todoString}`,
                    color: 0x4CAF50
                })
            )
        } else if (args[0] === "remove") {
            let todo = file.get()
            let oldTodo = JSON.stringify(todo.todo)
            let removed = todo.todo?.splice((parseInt(args[1]) - 1), 1)
            file.set("todo", todo.todo);
            file.save();

            let todoString = ""
            JSON.parse(oldTodo)?.forEach((entry, index) => {
                todoString += ` \`${(index + 1)}:\` ${index+1===(parseInt(args[1]))?"**~~":""}${entry}${index+1===(parseInt(args[1]))?"~~**":""}\n`
            })
            if (todoString === "") todoString = "Deine To-Do Liste ist sauber."

            message.channel.send(
                new Discord.MessageEmbed({
                    title: `To-Do Liste`,
                    description: `Hier ist deine neue To-Do Liste:\n${todoString}`,
                    color: 0xff6f00
                })
            )
        }
    }
}
