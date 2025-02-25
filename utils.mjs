import { CAMERA_MODEL_MAP } from "./cameraModelMap.mjs";

export const getShutterSpeed = (exposureTime) => (exposureTime <= 1.0) ? ("1/" + parseInt(1.0 / exposureTime)) : exposureTime.toFixed(2)

const gcd = (u, v) => {
    if (u === v) return u;
    if (u === 0) return v;
    if (v === 0) return u;

    if (~u & 1)
        if (v & 1)
            return gcd(u >> 1, v);
        else
            return gcd(u >> 1, v >> 1) << 1;

    if (~v & 1) return gcd(u, v >> 1);

    if (u > v) return gcd((u - v) >> 1, v);

    return gcd((v - u) >> 1, u);
}

export const getAspectRatio = (width, height) => {
    const d = gcd(width, height)
    return [width / d, height / d];
}

export const getAspectRatioApprox = (width, height, limit = 20) => {
    const val = width / height;
    let lower = [0, 1];
    let upper = [1, 0];

    while (true) {
        const mediant = [lower[0] + upper[0], lower[1] + upper[1]];

        if (val * mediant[1] > mediant[0]) {
            if (limit < mediant[1]) {
                return upper;
            }
            lower = mediant;
        } else if (val * mediant[1] == mediant[0]) {
            if (limit >= mediant[1]) {
                return mediant;
            }
            if (lower[1] < upper[1]) {
                return lower;
            }
            return upper;
        } else {
            if (limit < mediant[1]) {
                return lower;
            }
            upper = mediant;
        }
    }
}

export const getModelName = (make, model) => {
    return make + " " + ((model in CAMERA_MODEL_MAP) ? CAMERA_MODEL_MAP[model] : model);
}