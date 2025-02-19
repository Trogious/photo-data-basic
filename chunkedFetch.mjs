import dynamicImport from './dynamicImport.mjs'

const httpPromise = dynamicImport('http', http => http)
const httpsPromise = dynamicImport('https', https => https)

export const fetch = (url, { headers } = {}) => {
    return new Promise(async (resolve, reject) => {
        let { port, hostname, pathname, protocol, search } = new URL(url)
        const options = {
            method: 'GET',
            hostname,
            path: encodeURI(pathname) + search,
            headers
        }
        if (port !== '') options.port = Number(port)
        let lib = protocol === 'https:' ? await httpsPromise : await httpPromise
        const req = lib.request(options, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                let location = (new URL(res.headers.location, url)).toString()
                return fetch(location, { headers }).then(resolve).catch(reject)
            }
            resolve({
                status: res.statusCode,
                arrayBuffer: () => new Promise(resolveAb => {
                    let buffers = []
                    res.on('data', buffer => buffers.push(buffer))
                    res.on('end', () => resolveAb(Buffer.concat(buffers)))
                })
            })
        })
        req.on('error', reject)
        req.end()
    })
}