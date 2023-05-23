import fs from 'fs'
import editJsonFile from 'edit-json-file'

class Files {

    constructor() {}

    cutLastEntityFromPath(path) {
        return path.substring(0, path.lastIndexOf('/'))
    }

    ensureFolder(path) {
        try {
            let rootDir = fs.realpathSync('.')
            let targetDir = fs.realpathSync(path)

            if (targetDir.substring(0, rootDir.length) !== rootDir) {
                console.error(`accessed file is not child of yadbot root dir: '${targetDir}'`)
                process.exit(1)
            }
        } catch (e) {
            this.ensureFolder(this.cutLastEntityFromPath(path))
        }

        try {
            fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK)
        } catch (e) {
            try {
                fs.mkdirSync(path, {recursive: true})
                fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK)
            } catch (e) {
                console.error(e)
                process.exit(1)
            }
        }
    }

    ensureFile(path) {
        this.ensureFolder(this.cutLastEntityFromPath(path))

        try {
            fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK)
        } catch (e) {
            try {
                fs.closeSync(fs.openSync(path, 'w'));
                fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK)
            } catch (e) {
                console.error(e)
                process.exit(1)
            }
        }
    }

    readCompleteJson(path) {
        this.ensureFile(path)
        const file = editJsonFile(path)
        return file.get()
    }

    readJson(path, key, shutdownIfUndefined, defaultValue) {
        this.ensureFile(path)
        const file = editJsonFile(path)
        let content = file.get(key)
        if (
            content === undefined ||
            content === null ||
            (this.isObjectEmpty(content))
        ) {
            if (defaultValue !== undefined) this.writeJson(path, key, defaultValue)
            if (shutdownIfUndefined) {
                console.log(`Key ${key} was not found in file ${path}, shutting down.`)
                process.exit(1)
            }
            if (defaultValue !== undefined) return defaultValue
        }
        return content
    }

    writeJson(path, key, json) {
        this.ensureFile(path)
        const file = editJsonFile(path)
        file.set(key, json)
        file.save()
    }

    clearJson(filePath) {
        const file = editJsonFile(filePath)
        file.empty((callback) => {
            file.save()
        })
    }

    isObjectEmpty(object) {
        return Object.keys(object).length === 0 && object.constructor === Object
    }
}

export default new Files()
