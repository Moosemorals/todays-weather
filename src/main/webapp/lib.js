export function $(selector, base) {
    base = base || document;
    return base.querySelector(selector);
}

export function $$(selector, base) {
    base = base || document;
    return base.querySelectorAll(selector);
}

export function textNode(text) {
    return document.createTextNode(text);
}

// Copied from https://stackoverflow.com/a/15030117/195833
function flatten(arr) {
    return arr.reduce(function (flat, toFlatten) {
        return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
    }, []);
}

export function closest(node, selector) {
    let target = node;

    while (target !== null && target !== document.documentElement) {
        if (target.matches(selector)) {
            return target;
        }
        target = target.parentNode;
    }
    return undefined;
}

export function buildElement(tag, classes, ...args) {
    const el = document.createElement(tag);

    if (classes) {
        classes = classes.split(/\s+/);
        for (let i = 0; i < classes.length; i += 1) {
            if (classes[i]) {
                el.classList.add(classes[i]);
            }
        }
    }

    args = flatten(args);

    for (let index = 0; index < args.length; index += 1) {
        switch (typeof args[index]) {
            case 'undefined':
                // skip it
                break;
            case 'string':
            case 'number':
                el.appendChild(textNode(args[index]));
                break;
            default:
                el.appendChild(args[index]);
                break;
        }
    }
    return el;
}

export function replaceContent(node, ...content) {
    while (node.lastChild) {
        node.removeChild(node.lastChild);
    }

    if (content === undefined) {
        return;
    }

    for (let i = 0; i < content.length; i += 1) {
        const c = content[i];
        switch (typeof c) {
            case "undefined":
                // skip it
                break;
            case "string":
            case "number":
                node.appendChild(textNode(c));
                break;
            default:
                node.appendChild(c);
                break;
        }
    }
}
