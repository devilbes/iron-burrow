export function listen(target, names, listener) {
    names.forEach((name) => target?.addEventListener(name, listener));
    return () => names.forEach((name) => target?.removeEventListener(name, listener));
}
