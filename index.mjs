import exifr from 'exifr';
const { parse } = exifr;
import { imageSize } from 'image-size';
import { UrlFetcher } from './UrlFetcher.mjs'
import { FsReader } from './FsReader.mjs';

const setUpReaders = (url) => {
    const HTTP_CHUNK_LIMIT = 5
    const HTTP_CHUNK_SIZE = 65536 // 64 KB
    const LOCAL_CHUNK_SIZE = 20480 // 20 KB
    const LOCAL_CHUNK_LIMIT = 11

    if (url.toLowerCase().includes("http")) {
        const fetcher = new UrlFetcher(url, { chunked: true, chunkSize: HTTP_CHUNK_SIZE, firstChunkSize: HTTP_CHUNK_SIZE, chunkLimit: CHUNK_LIMIT })
        return { fetcher, chunkLimit: HTTP_CHUNK_LIMIT }
    }
    const fetcher = new FsReader(url, { chunked: true, chunkSize: LOCAL_CHUNK_SIZE, firstChunkSize: LOCAL_CHUNK_SIZE, chunkLimit: LOCAL_CHUNK_LIMIT })
    return { fetcher, chunkLimit: LOCAL_CHUNK_LIMIT }
}

const getImageProperties = async (url) => {
    const { fetcher, chunkLimit } = setUpReaders(url)

    await fetcher.read();
    let exif = undefined;
    let dimensions = undefined;
    let iterations = 0;
    for (let i = 0; i < chunkLimit; ++i) {
        iterations = i + 1
        const buffer = fetcher.toUint8()
        try {
            if (exif === undefined || exif.errors !== undefined)
                exif = await parse(buffer)
            if (dimensions === undefined)
                dimensions = imageSize(buffer)
        } catch {
        }
        if (exif !== undefined && dimensions !== undefined && exif.errors === undefined) {
            break;
        }
        await fetcher.readNextChunk()
    }

    return { exif, dimensions, iterations };
}

export const getPhotoData = async (imageUrl) => {
    const props = await getImageProperties(imageUrl);
    // TODO: log instances of: props.iterations > 1
    const exifProps = ["Make", "Model", "FNumber", "ISO", "DateTimeOriginal", "CreateDate",
        "ShutterSpeedValue", "FocalLength", "FocalLengthIn35mmFormat", "LensModel"]
    const data = {}
    exifProps.map((prop) => {
        if (prop in props.exif) {
            data[prop] = props.exif[prop]
        }
    })
    data.width = props.dimensions.width
    data.height = props.dimensions.height
    return data;
}