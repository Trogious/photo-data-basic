import util from 'node:util'

const inspect = (msg, obj) => {
    console.log(msg + ": " + util.inspect(obj, { showHidden: true, depth: 20, colors: true }))
}

export default inspect