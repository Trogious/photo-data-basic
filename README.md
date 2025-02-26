## The module
This is a NPM module (for both nodejs and React) to retrieve basic data about a photo. Using [exifr](https://github.com/MikeKovarik/exifr) and [image-size](https://github.com/image-size/image-size) it retrieves the following:
- some EXIF tags,
- width & height,
- additional details reformatted from the above (prefixed with: PDB).

Its efficiency comes from reading files in chunked mode, only minimum bytes needed to extract EXIF and dimensions. Chunked reading is based on [exifr](https://github.com/MikeKovarik/exifr)'s code.

While one might just use the [exifr](https://github.com/MikeKovarik/exifr) and then [image-size](https://github.com/image-size/image-size) directly, that would lead to reading the file 2 times and [image-size](https://github.com/image-size/image-size) actually reads the entire file. With `photo-data-basic` the file is being read only once and up to the minimum bytes needed. It then calls [exifr](https://github.com/MikeKovarik/exifr) and [image-size](https://github.com/image-size/image-size) using the buffered chunks. This is much better, especially for when reading from HTTP or S3 as it limits the number of network calls needed.

## Usage
```js
import { getPhotoData } from "photo-data-basic";

const data = await getPhotoData("./test.jpg")
console.log(data);
```
<img src="test/output.png"/>

## Supported protocols
The `getPhotoData` function can handle these types inputs:
- local file path,
- HTTP/HTTPS URL,
- AWS S3 bucket.

### S3 example
```js
import { getPhotoData } from "photo-data-basic";

const data = await getPhotoData("s3://bucket-name/path/image.jpg",
    {
        s3config: {
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'youraccesskey',
                secretAccessKey: 'yoursecretkey'
            }
        }
    }
)
```