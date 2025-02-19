import { getPhotoData } from "./index.mjs";
import inspect from './inspect.mjs'

(async () => {
    // const data = await getPhotoData("https://some.site.net/test.jpg")
    const data = await getPhotoData("./test.jpg")
    inspect("getPhotoData", data);
})();;