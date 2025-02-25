import exifr from 'exifr'
const { parse } = exifr
import { imageSize } from 'image-size'
import { performance } from 'perf_hooks'
import dynamicImport from './dynamicImport.mjs'
import { getAspectRatio, getAspectRatioApprox, getModelName, getShutterSpeed } from './utils.mjs'


const setUpReaders = async (url, options) => {
    const HTTP_CHUNK_LIMIT = 5
    const HTTP_CHUNK_SIZE = 65536 // 64 KB
    const LOCAL_CHUNK_SIZE = 20480 // 20 KB
    const LOCAL_CHUNK_LIMIT = 11

    if (url.toLowerCase().startsWith("http")) {
        const UrlFetcher = dynamicImport("./UrlFetcher.mjs", m => m.UrlFetcher)
        const fetcher = new (await UrlFetcher)(url, { chunked: true, chunkSize: HTTP_CHUNK_SIZE, firstChunkSize: HTTP_CHUNK_SIZE, chunkLimit: HTTP_CHUNK_LIMIT })
        return { fetcher, chunkLimit: HTTP_CHUNK_LIMIT }
    } else if (url.toLowerCase().startsWith("s3://")) {
        const S3Fetcher = dynamicImport("./S3Fetcher.mjs", m => m.S3Fetcher)
        const fetcher = new (await S3Fetcher)(url, {
            chunked: true, chunkSize: HTTP_CHUNK_SIZE, firstChunkSize: HTTP_CHUNK_SIZE, chunkLimit: HTTP_CHUNK_LIMIT,
            s3config: options ? options.s3config : undefined
        })
        return { fetcher, chunkLimit: HTTP_CHUNK_LIMIT }
    }
    const FsReader = dynamicImport("./FsReader.mjs", m => m.FsReader)
    const fetcher = new (await FsReader)(url, { chunked: true, chunkSize: LOCAL_CHUNK_SIZE, firstChunkSize: LOCAL_CHUNK_SIZE, chunkLimit: LOCAL_CHUNK_LIMIT })
    return { fetcher, chunkLimit: LOCAL_CHUNK_LIMIT }
}

const getImageProperties = async (url, options) => {
    const timeStart = performance.now()
    const { fetcher, chunkLimit } = await setUpReaders(url, options)

    try {
        await fetcher.read();
    }
    catch (e) {
        await fetcher.close()
        throw e
    }
    let exif = undefined;
    let dimensions = undefined;
    let iterations = 0;
    for (let i = 0; i < chunkLimit; ++i) {
        iterations = i + 1
        const buffer = fetcher.toUint8()
        try {
            if (dimensions === undefined)
                dimensions = imageSize(buffer)
        } catch (e) {
            if (e instanceof TypeError)
                dimensions = undefined;
            console.debug(e);
        }
        try {
            if (exif === undefined || exif.errors !== undefined)
                exif = await parse(buffer)
        } catch (e) {
            console.debug(e);
        }
        if (exif !== undefined && dimensions !== undefined && exif.errors === undefined) {
            break;
        }
        try {
            await fetcher.readNextChunk()
        }
        catch (e) {
            await fetcher.close()
            throw e
        }
    }
    await fetcher.close()
    const duration = performance.now() - timeStart

    return { exif, dimensions, iterations, duration }
}



export const getPhotoData = async (imageUrl, options) => {
    const props = await getImageProperties(imageUrl, options);
    if (props.iterations > 1)
        console.debug("took more than 1 chunk to fetch enough data, chunks read: " + props.iterations)
    console.debug(`getting image properties took ${props.duration} ms`);
    // exifTags definitions here: https://exiftool.org/TagNames/EXIF.html
    const exifTags = ["Make", "Model", "ExposureTime", "FNumber", "ISO", "DateTimeOriginal", "OffsetTimeOriginal",
        "ShutterSpeedValue", "FocalLength", "FocalLengthIn35mmFormat", "LensModel"]
    const data = {}
    exifTags.map((prop) => {
        if (prop in props.exif) {
            data[prop] = props.exif[prop]
        }
    })
    data.width = props.dimensions.width
    data.height = props.dimensions.height

    if (data.Make !== undefined && data.Model !== undefined)
        data.PDBModel = getModelName(data.Make, data.Model)
    if (data.ExposureTime !== undefined)
        data.PDBShutterSpeed = getShutterSpeed(data.ExposureTime)
    data.PDBAspectRatio = getAspectRatio(data.width, data.height)
    data.PDBAspectRatioApprox = getAspectRatioApprox(data.width, data.height)

    return data;
}