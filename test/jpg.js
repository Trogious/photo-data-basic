"use strict";
// NOTE: we only support baseline and progressive JPGs here
// due to the structure of the loader class, we only get a buffer
// with a maximum size of 4096 bytes. so if the SOF marker is outside
// if this range we can't detect the file size correctly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.JPG = void 0;
const utils_1 = require("./utils");
const EXIF_MARKER = '45786966';
const APP1_DATA_SIZE_BYTES = 2;
const EXIF_HEADER_BYTES = 6;
const TIFF_BYTE_ALIGN_BYTES = 2;
const BIG_ENDIAN_BYTE_ALIGN = '4d4d';
const LITTLE_ENDIAN_BYTE_ALIGN = '4949';
// Each entry is exactly 12 bytes
const IDF_ENTRY_BYTES = 12;
const NUM_DIRECTORY_ENTRIES_BYTES = 2;
function isEXIF(input) {
    return (0, utils_1.toHexString)(input, 2, 6) === EXIF_MARKER;
}
function extractSize(input, index) {
    return {
        height: (0, utils_1.readUInt16BE)(input, index),
        width: (0, utils_1.readUInt16BE)(input, index + 2),
    };
}
function extractOrientation(exifBlock, isBigEndian) {
    // TODO: assert that this contains 0x002A
    // let STATIC_MOTOROLA_TIFF_HEADER_BYTES = 2
    // let TIFF_IMAGE_FILE_DIRECTORY_BYTES = 4
    // TODO: derive from TIFF_IMAGE_FILE_DIRECTORY_BYTES
    const idfOffset = 8;
    // IDF osset works from right after the header bytes
    // (so the offset includes the tiff byte align)
    const offset = EXIF_HEADER_BYTES + idfOffset;
    const idfDirectoryEntries = (0, utils_1.readUInt)(exifBlock, 16, offset, isBigEndian);
    for (let directoryEntryNumber = 0; directoryEntryNumber < idfDirectoryEntries; directoryEntryNumber++) {
        const start = offset +
            NUM_DIRECTORY_ENTRIES_BYTES +
            directoryEntryNumber * IDF_ENTRY_BYTES;
        const end = start + IDF_ENTRY_BYTES;
        // Skip on corrupt EXIF blocks
        if (start > exifBlock.length) {
            return;
        }
        const block = exifBlock.slice(start, end);
        const tagNumber = (0, utils_1.readUInt)(block, 16, 0, isBigEndian);
        // 0x0112 (decimal: 274) is the `orientation` tag ID
        if (tagNumber === 274) {
            const dataFormat = (0, utils_1.readUInt)(block, 16, 2, isBigEndian);
            if (dataFormat !== 3) {
                return;
            }
            // unsinged int has 2 bytes per component
            // if there would more than 4 bytes in total it's a pointer
            const numberOfComponents = (0, utils_1.readUInt)(block, 32, 4, isBigEndian);
            if (numberOfComponents !== 1) {
                return;
            }
            return (0, utils_1.readUInt)(block, 16, 8, isBigEndian);
        }
    }
}
function validateExifBlock(input, index) {
    // Skip APP1 Data Size
    const exifBlock = input.slice(APP1_DATA_SIZE_BYTES, index);
    // Consider byte alignment
    const byteAlign = (0, utils_1.toHexString)(exifBlock, EXIF_HEADER_BYTES, EXIF_HEADER_BYTES + TIFF_BYTE_ALIGN_BYTES);
    // Ignore Empty EXIF. Validate byte alignment
    const isBigEndian = byteAlign === BIG_ENDIAN_BYTE_ALIGN;
    const isLittleEndian = byteAlign === LITTLE_ENDIAN_BYTE_ALIGN;
    if (isBigEndian || isLittleEndian) {
        return extractOrientation(exifBlock, isBigEndian);
    }
}
function validateInput(input, index) {
    // index should be within buffer limits
    if (index > input.length) {
        throw new TypeError('Corrupt JPG, exceeded buffer limits');
    }
}
exports.JPG = {
    validate: (input) => (0, utils_1.toHexString)(input, 0, 2) === 'ffd8',
    calculate(input) {
        // Skip 4 chars, they are for signature
        input = input.slice(4);
        let orientation;
        let next;
        while (input.length) {
            // read length of the next block
            const i = (0, utils_1.readUInt16BE)(input, 0);
            validateInput(input, i);

            // Every JPEG block must begin with a 0xFF
            if (input[i] !== 0xff) {
                input = input.slice(1);
                continue;
            }
            if (isEXIF(input)) {
                orientation = validateExifBlock(input, i);
            }
            // ensure correct format
            validateInput(input, i);
            // 0xFFC0 is baseline standard(SOF)
            // 0xFFC1 is baseline optimized(SOF)
            // 0xFFC2 is progressive(SOF2)
            next = input[i + 1];
            if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
                const size = extractSize(input, i + 5);
                // TODO: is orientation=0 a valid answer here?

                if (!orientation) {
                    return size;
                }
                return {
                    height: size.height,
                    orientation,
                    width: size.width,
                };
            }
            // move to the next block
            input = input.slice(i + 2);
        }
        throw new TypeError('Invalid JPG, no size found');
    },
};
