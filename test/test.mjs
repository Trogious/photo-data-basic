import { getPhotoData } from "../index.mjs";
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import 'dotenv/config';
import { styleText } from 'node:util'

const log = (s) => console.log(styleText(["yellow", "dim"], s))

const appendFile = (url, file) => {
    return url.replace(/\/+$/, "") + "/" + file
}

const URLS = [
    {
        url: "./test/test.jpg"
    },
    {
        url: appendFile(process.env.PDB_URL_HTTP, "test.jpg")
    },
    {
        url: appendFile(process.env.PDB_URL_S3_PUBLIC, "test.jpg"),
        region: process.env.PDB_URL_S3_REGION,
        access_key_id: process.env.PDB_URL_S3_PRIVATE_ACCESS_KEY_ID,
        secret_key: process.env.PDB_URL_S3_PRIVATE_SECRET_KEY
    },
    {
        url: appendFile(process.env.PDB_URL_S3_PRIVATE, "test.jpg"),
        region: process.env.PDB_URL_S3_REGION,
        access_key_id: process.env.PDB_URL_S3_PRIVATE_ACCESS_KEY_ID,
        secret_key: process.env.PDB_URL_S3_PRIVATE_SECRET_KEY
    },
];

const EXPECTED = {
    "Make": "SONY", "Model": "ILCE-7RM5", "ExposureTime": 0.0015625, "FNumber": 6.3, "ISO": 2000,
    "DateTimeOriginal": new Date(Date.UTC(2024, 3, 30, 8, 4, 59)), "OffsetTimeOriginal": "+02:00",
    "ShutterSpeedValue": 9.321928, "FocalLength": 400, "FocalLengthIn35mmFormat": 400,
    "LensModel": "FE 200-600mm F5.6-6.3 G OSS", "width": 590, "height": 1049, "PDBShutterSpeed": "1/640",
    "PDBAspectRatioApprox": [9, 16]
};

const assertEqualFloat = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 0.0000001, message)

const assertEqualData = (data) => {
    Object.keys(EXPECTED).map(prop => {
        if (data[prop] instanceof Date) {
            assert.deepEqual(data[prop].getTime(), EXPECTED[prop].getTime(), prop)
        } else {
            const float = Number.parseFloat(data[prop]);
            (Number.isNaN(float) || Number.isInteger(float)) ? assert.deepEqual(data[prop], EXPECTED[prop], prop) : assertEqualFloat(data[prop], EXPECTED[prop], prop)
        }
    })
}

const fetchPhotoData = async (u) => {
    let config = undefined
    if (u.region !== undefined) {
        config = {}
        config.region = u.region;
    }
    if (u.access_key_id !== undefined && u.secret_key !== undefined)
        config.credentials = {
            accessKeyId: u.access_key_id,
            secretAccessKey: u.secret_key
        }
    return await getPhotoData(u.url, config ? { s3config: config } : undefined)
}

for (const u of URLS) {
    describe('image: ' + u.url, async () => {
        it("should have dimensions and exif", async () => {
            const data = await fetchPhotoData(u);
            assertEqualData(data);
        })
    });
}