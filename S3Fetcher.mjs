import { ChunkedReader } from './ChunkedReader.mjs'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export class S3Fetcher extends ChunkedReader {

    // async readWhole() {
    //     this.chunked = false
    //     let chunk = await fetchUrlAsArrayBuffer(this.input)
    //     if (chunk instanceof ArrayBuffer)
    //         this._swapArrayBuffer(chunk)
    //     else if (chunk instanceof Uint8Array)
    //         this._swapBuffer(chunk)
    // }

    constructor(input, options) {
        super(input, options)
        const path = input.replace("s3://", "").replace(/^\/+/, "")
        const prefixSlash = path.indexOf("/")
        if (prefixSlash > 0) {
            this.bucketName = path.slice(0, prefixSlash)
            this.objectWithPrefix = path.slice(prefixSlash + 1)
        }
        this.s3Client = null
    }

    async _readChunkFromS3(Bucket, Key, Range) {
        this.s3Client = this.s3Client ?? new S3Client(this.options.s3config)
        return await this.s3Client.send(new GetObjectCommand({ Bucket, Key, Range }));
    }

    async _readChunk(offset, length) {
        const end = length ? offset + length - 1 : undefined
        // note: end in http (and therefore S3) range is inclusive, unlike APIs in node,
        const range = (offset || end) ? `bytes=${[offset, end].join('-')}` : undefined
        const res = await this._readChunkFromS3(this.bucketName, this.objectWithPrefix, range)
        const abChunk = await res.Body.transformToByteArray()
        const bytesRead = abChunk.byteLength
        if (res.statusCode === 416) return undefined
        if (bytesRead !== length) this.size = offset + bytesRead
        return this.set(abChunk, offset, true)
    }

}