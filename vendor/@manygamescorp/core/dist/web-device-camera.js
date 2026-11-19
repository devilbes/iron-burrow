import { listen } from './web-device-events.js';
import { browserError, stopStream, unsupported } from './web-device-permissions.js';
import { SDKError } from './error.js';
import { deviceOperation, operationSignal, checkOperation } from './device-operation.js';
export function webCamera({ navigator: nav, window: win, document: doc, imageFiles }, lifetime, images) {
    let current;
    let preview;
    const refs = new Map();
    const releaseFile = (uri) => {
        const ref = refs.get(uri);
        refs.delete(uri);
        images.delete(uri);
        if (ref) {
            try {
                imageFiles?.release(ref);
            }
            catch { }
        }
    };
    const begin = (scopes) => {
        const scope = operationSignal(lifetime, scopes);
        checkOperation(scope);
        if (doc?.visibilityState === 'hidden')
            throw new SDKError('SDK_PLATFORM_UNSUPPORTED');
        current?.stop();
        const controller = new AbortController();
        const cleanups = new Set();
        const operation = {
            signal: controller.signal, owner: scopes[0],
            own(release) { if (controller.signal.aborted)
                release();
            else
                cleanups.add(release); },
            stop() {
                if (controller.signal.aborted)
                    return;
                controller.abort();
                for (const off of cleanups) {
                    try {
                        off();
                    }
                    catch { }
                }
                cleanups.clear();
                if (current === operation)
                    current = undefined;
                if (preview === operation)
                    preview = undefined;
            },
        };
        const hidden = listen(doc, ['visibilitychange'], () => {
            if (doc?.visibilityState === 'hidden')
                operation.stop();
        });
        scope.addEventListener('abort', operation.stop, { once: true });
        operation.own(hidden);
        operation.own(() => scope.removeEventListener('abort', operation.stop));
        current = operation;
        return operation;
    };
    const wait = (promise, operation, ms = 10000) => new Promise((resolve, reject) => {
        let settled = false;
        const cancel = () => finish(() => reject(new SDKError('SDK_MODULE_CANCELLED')));
        const timer = setTimeout(() => {
            finish(() => reject(new SDKError('SDK_PLATFORM_UNSUPPORTED')));
            operation.stop();
        }, ms);
        const finish = (action) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            operation.signal.removeEventListener('abort', cancel);
            action();
        };
        operation.signal.addEventListener('abort', cancel, { once: true });
        promise.then((value) => finish(() => operation.signal.aborted
            ? reject(new SDKError('SDK_MODULE_CANCELLED')) : resolve(value)), (error) => finish(() => reject(browserError(error))));
        if (operation.signal.aborted)
            cancel();
    });
    const make = (tag) => {
        if (!doc?.createElement)
            return unsupported();
        return doc.createElement(tag);
    };
    const checkFacing = (facing) => {
        if (facing !== undefined && facing !== 'front' && facing !== 'back') {
            throw new SDKError('VALIDATION_FAILED');
        }
    };
    const validateFile = (blob) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(blob.type)
            || blob.size > 20 * 1024 * 1024 || blob.size === 0)
            throw new SDKError('VALIDATION_FAILED');
    };
    const save = async (blob, operation) => {
        if (!blob)
            return undefined;
        checkOperation(operation.signal);
        validateFile(blob);
        const saving = imageFiles ? imageFiles.save(blob) : Promise.resolve({
            uri: `mpg-image:${crypto.randomUUID()}`, mimeType: blob.type,
        });
        void saving.then((ref) => {
            if (operation.signal.aborted)
                imageFiles?.release(ref);
        }, () => { }).catch(() => { });
        const ref = await wait(saving, operation);
        if (operation.signal.aborted) {
            try {
                imageFiles?.release(ref);
            }
            catch { }
            checkOperation(operation.signal);
        }
        if (typeof ref.uri !== 'string' || !ref.uri || ref.uri.length > 8192
            || /^(?:blob|data):/i.test(ref.uri) || ref.mimeType !== blob.type || refs.has(ref.uri)) {
            if (!refs.has(ref.uri)) {
                try {
                    imageFiles?.release(ref);
                }
                catch { }
            }
            throw new SDKError('VALIDATION_FAILED');
        }
        if (imageFiles) {
            try {
                const url = new URL(ref.uri, win?.location?.href);
                if ((url.protocol !== 'https:' && !(url.protocol === 'http:'
                    && url.origin === new URL(win?.location?.href ?? '').origin))
                    || url.username || url.password)
                    throw new SDKError('VALIDATION_FAILED');
            }
            catch {
                try {
                    imageFiles.release(ref);
                }
                catch { }
                throw new SDKError('VALIDATION_FAILED');
            }
        }
        while (images.size >= 8) {
            const oldest = images.keys().next().value;
            releaseFile(oldest);
        }
        images.set(ref.uri, blob);
        const result = Object.freeze({ uri: ref.uri, mimeType: ref.mimeType });
        refs.set(result.uri, result);
        return result;
    };
    lifetime.addEventListener('abort', () => {
        current?.stop();
        for (const uri of [...images.keys()])
            releaseFile(uri);
    }, { once: true });
    const streamVideo = async (operation, facing) => {
        if (!nav?.mediaDevices)
            return unsupported();
        if (nav.permissions) {
            const status = await wait(nav.permissions.query({ name: 'camera' })
                .catch(() => undefined), operation);
            checkOperation(operation.signal);
            if (status?.state === 'denied')
                throw new SDKError('SDK_PERMISSION_DENIED');
        }
        const acquiring = nav.mediaDevices.getUserMedia({ audio: false,
            video: { facingMode: { ideal: facing === 'front' ? 'user' : 'environment' } } });
        void acquiring.then((stream) => {
            operation.own(() => stopStream(stream));
            for (const track of stream.getTracks()) {
                operation.own(listen(track, ['ended'], operation.stop));
            }
        }, () => { }).catch(() => { });
        const stream = await wait(acquiring, operation, 60000);
        checkOperation(operation.signal);
        const video = make('video');
        operation.own(() => { video.pause(); video.srcObject = null; video.remove(); });
        video.hidden = true;
        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        doc?.body?.appendChild(video);
        await wait(video.play(), operation);
        checkOperation(operation.signal);
        if (!video.videoWidth || !video.videoHeight) {
            await wait(new Promise((resolve) => {
                const off = listen(video, ['loadeddata'], () => { off(); resolve(); });
                operation.own(off);
            }), operation);
        }
        checkOperation(operation.signal);
        return video;
    };
    const pick = async (scopes, facing, options) => {
        const operation = begin(scopes);
        try {
            const input = make('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.hidden = true;
            if (facing)
                input.setAttribute('capture', facing === 'front' ? 'user' : 'environment');
            doc?.body?.appendChild(input);
            operation.own(() => input.remove());
            const chosen = new Promise((resolve) => {
                operation.own(listen(input, ['change', 'cancel'], () => resolve(input.files?.[0])));
                input.click();
            });
            const file = await wait(chosen, operation, 60000);
            checkOperation(operation.signal);
            if (!file)
                return undefined;
            validateFile(file);
            if (options?.maxSize !== undefined || options?.quality !== undefined) {
                const decode = win?.createImageBitmap ?? globalThis.createImageBitmap;
                if (!decode)
                    return unsupported();
                const decoding = decode(file);
                void decoding.then((bitmap) => operation.own(() => bitmap.close()), () => { });
                const image = await wait(decoding, operation);
                const blob = await encode(image, image.width, image.height, operation, options);
                return await save(blob, operation);
            }
            return await save(file, operation);
        }
        catch (error) {
            throw browserError(error);
        }
        finally {
            operation.stop();
        }
    };
    const encode = async (source, width, height, operation, options) => {
        checkOperation(operation.signal);
        if (!width || !height)
            return unsupported();
        const scale = Math.min(1, (options?.maxSize ?? 4096) / Math.max(width, height));
        const canvas = make('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context)
            return unsupported();
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const blob = await wait(new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', options?.quality ?? 0.9)), operation);
        if (!blob)
            return unsupported();
        return blob;
    };
    return {
        isSupported: () => !!doc?.createElement,
        capture: deviceOperation(async (scopes, options) => {
            checkFacing(options?.facing);
            if ((options?.quality !== undefined && (!Number.isFinite(options.quality)
                || options.quality < 0 || options.quality > 1))
                || (options?.maxSize !== undefined && (!Number.isInteger(options.maxSize)
                    || options.maxSize <= 0 || options.maxSize > 8192))) {
                throw new SDKError('VALIDATION_FAILED');
            }
            if (!nav?.mediaDevices)
                return pick(scopes, options?.facing ?? 'back', options);
            const operation = begin(scopes);
            try {
                const video = await streamVideo(operation, options?.facing);
                const blob = await encode(video, video.videoWidth, video.videoHeight, operation, options);
                return await save(blob, operation);
            }
            catch (error) {
                throw browserError(error);
            }
            finally {
                operation.stop();
            }
        }),
        pickFromGallery: deviceOperation((scopes) => pick(scopes)),
        scanCode: deviceOperation(async (scopes, { formats }) => {
            if (!Array.isArray(formats) || !formats.length || formats.length > 16
                || formats.some((format) => typeof format !== 'string' || format.length > 64)) {
                throw new SDKError('VALIDATION_FAILED');
            }
            if (!win?.BarcodeDetector || !nav?.mediaDevices)
                return unsupported();
            const operation = begin(scopes);
            try {
                const detector = new win.BarcodeDetector({ formats });
                const video = await streamVideo(operation, 'back');
                checkOperation(operation.signal);
                const deadline = Date.now() + 15000;
                while (!operation.signal.aborted && Date.now() < deadline) {
                    const codes = await wait(detector.detect(video), operation);
                    checkOperation(operation.signal);
                    if (codes[0])
                        return codes[0].rawValue;
                    await wait(new Promise((resolve) => {
                        const timer = setTimeout(resolve, 100);
                        operation.own(() => clearTimeout(timer));
                    }), operation);
                }
                return undefined;
            }
            catch (error) {
                throw browserError(error);
            }
            finally {
                operation.stop();
            }
        }),
        preview: {
            start: deviceOperation(async (scopes, options) => {
                checkFacing(options?.facing);
                if (!nav?.mediaDevices)
                    return unsupported();
                const operation = begin(scopes);
                preview = operation;
                try {
                    const video = await streamVideo(operation, options?.facing);
                    checkOperation(operation.signal);
                    video.hidden = false;
                    video.setAttribute('data-mpg-camera-preview', '');
                }
                catch (error) {
                    operation.stop();
                    throw browserError(error);
                }
            }),
            stop: deviceOperation(async (scopes) => {
                if (preview?.owner === scopes[0])
                    preview?.stop();
            }),
        },
    };
}
