let current;
export function withWindowContext(context, render) {
    const previous = current;
    current = context;
    try {
        return render();
    }
    finally {
        current = previous;
    }
}
export function renderingWindow() { return current; }
