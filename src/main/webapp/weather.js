import {
    buildElement,
    $,
    $$,
    replaceContent,
    textNode
} from "./lib.js";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const wantOrder = ["U", "H", "S", "G", "Pp", "T"];
const wants = {
    "T": {
        color: "red",
        name: "Temprature"
    },
    "Pp": {
        color: "green",
        name: "Rain Chance %"
    },
    "H": {
        color: "#0064fa",
        name: "Humidity %"
    },
    "S": {
        color: "#8c8cc8",
        name: "Wind speed"
    },
    "G": {
        color: "#acacca",
        name: "Wind gust"
    },
    "U": {
        color: "#7F00FF",
        name: "UV"
    }
};

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    get magnitude() {
        return Math.hypot(this.x, this.y);
    }

    /**
     *
     * @param {Point} p1 
     * @param {Point} p2 
     */
    static subtract(p1, p2) {
        return new Point(p1.x - p2.x, p1.y - p2.y);
    }

    static multiply(p1, dist) {

        return new Point(dist / 3, dist * p1.y / (3 * p1.x));
    }

    static add(p1, p2) {
        return new Point(p1.x + p2.x, p1.y + p2.y);
    }

    static unit(p1) {
        return new Point(p1.x / p1.magnitude, p1.y / p1.magnitude);
    }
}

function polyLine(points) {
    const result = [];
    for (let i = 1; i < points.length - 2; i += 1) {

        let dist = (points[i + 1].x - points[i].x);
        let v0 = Point.unit(Point.subtract(points[i + 1], points[i - 1]));
        let w0 = Point.multiply(v0, dist);
        let c0 = Point.add(points[i], w0);

        let v1 = Point.unit(Point.subtract(points[i + 2], points[i]));
        let w1 = Point.multiply(v1, dist);
        let c1 = Point.subtract(points[i + 1], w1);

        result.push(c0.x, c0.y, c1.x, c1.y, points[i + 1].x, points[i + 1].y);
    }
    return result;
}

function buildSVG(name) {
    var NS = "http://www.w3.org/2000/svg";
    var el = document.createElementNS(NS, name);
    var i;

    for (i = 1; i < arguments.length; i += 2) {
        el.setAttribute(arguments[i], arguments[i + 1]);
    }

    return el;
}

function buildPath(steps) {
    return buildSVG("path", "d", steps.join(" "));
}

function extractWeather(json) {
    const fields = json["SiteRep"]["Wx"]["Param"];
    const periods = json["SiteRep"]["DV"]["Location"]["Period"];

    const units = {
        "mph": {
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER
        },
        "C": {
            min: Number.MAX_SAFE_INTEGER,
            max: Number.MIN_SAFE_INTEGER
        }
    };
    const dataSets = {};
    const dates = [];

    for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i]["name"];
        const u = fields[i]["units"];
        dataSets[f] = {
            name: f in wants ? wants[f].name : fields[i]["$"],
            unit: u,
            normalise: u in units,
            parse: f !== "V", // Don't parse visibility
            scale: f === "U" ? 10 : 1, // Only uv index scales
            data: []
        }
    }

    for (let i = 0; i < periods.length; i += 1) {
        const period = periods[i];
        const date = new Date(period["value"]);
        const reps = period["Rep"];

        for (let j = 0; j < reps.length; j += 1) {
            const r = reps[j];
            const offset = parseInt(r["$"], 10);

            const at = new Date(date);
            at.setMinutes(offset);
            dates.push(at);

            for (let f in dataSets) {
                let v = r[f];
                if (dataSets[f].parse) {
                    v = parseFloat(v);
                }

                const u = dataSets[f].unit;

                if (u in units) {
                    if (units[u].max < v) {
                        units[u].max = v;
                    }
                    if (units[u].min > v) {
                        units[u].min = v;
                    }
                }

                dataSets[f].data.push(v * dataSets[f].scale);
            }
        }
    }

    for (let f in dataSets) {
        const u = dataSets[f].unit
        if (u in units) {
            dataSets[f].limits = units[u];
        }
    }

    dataSets.dates = dates;
    return dataSets;
}

function normalise(dataSet, index) {
    return 300 * (dataSet.data[index] - dataSet.limits.min) / (dataSet.limits.max - dataSet.limits.min);
}

function buildCircle(x, y, r, ...args) {
    return buildSVG("circle", "cx", x, "cy", y, "r", r, ...args);
}

function buildDataSetPath(dataSet, which) {
    let points = [];

    for (let i = 0; i < dataSet.data.length; i += 1) {
        const x = i * 20; 
        const y = dataSet.normalise ? normalise(dataSet, i) : 3 * dataSet.data[i];
        points.push(new Point(x, 300 - y));
    }

//    const p2 = polyLine(points);

    const path = buildPath(["M", points[0].x, points[0].y, "C", ...polyLine(points)]);

    path.id = "path-" + which;
    return path;
}

function buildText(text, ...args) {
    const result = buildSVG("text", ...args);
    result.appendChild(textNode(text));
    return result;
}

function buildValueMarkersOld(dataSet, f) {
    const g = buildSVG("g");
    const color = wants[f].color;

    for (let i = 0; i < dataSet.data.length; i += 1) {
        const x = i * 20;
        const y = dataSet.normalise ? normalise(dataSet, i) : 3 * dataSet.data[i];
        //g.appendChild(buildCircle(x, 300 - y, 5, "fill", "none", "class", "data-marker", "stroke", color ));
        g.appendChild(buildText(
            dataSet.data[i] + dataSet.unit, 
            "x", x, "y", 300 - y, 
            "alignment-baseline", "central",
            "text-anchor", "middle",
            "class", "data-text", "fill", "black"
        ));       
    }

    return g;
}

function buildValueMarkers(dataSets, index) {
    const g = buildSVG("g");
    for (let f in wants) {
        const dataSet = dataSets[f];
        const x = index * 20;
        const y = dataSet.normalise ? normalise(dataSet, index) : 3 * dataSet.data[index];
        //g.appendChild(buildCircle(x, 300 - y, 5, "fill", "none", "class", "data-marker", "stroke", color ));
        g.appendChild(buildText(
            dataSet.data[index] + dataSet.unit, 
            "x", x, "y", 300 - y, 
            "alignment-baseline", "central",
            "text-anchor", "middle",
            "class", "data-text", "fill", "black"
        ));       
    } 
    return g;
}

function sameDay(left, right) {
    return left.getUTCFullYear() === right.getUTCFullYear() &&
        left.getUTCMonth() === right.getUTCMonth() &&
        left.getUTCDate() === right.getUTCDate();
}

function pad(digit) {
    if (digit < 10) {
        return "0" +digit;
    } else {
        return "" + digit;
    }
}

function formatDate(date) {
    return dayNames[date.getUTCDay()] + " " + pad(date.getUTCHours()) + ":00Z";
}

function buildAxes(dataSets) {

    const dates = dataSets.dates;
    const holder = buildSVG("g");
    const periods = buildSVG("g");
    const axes = buildSVG("g", "stroke", "black", "fill", "none", "stroke-width", "0.5");

    const width = dates.length * 20;

    axes.appendChild(buildPath([
        "M", width, "300 h", -width, "v -300"
    ]));


    let date = dates[0];

    for (let i = 0; i < dates.length; i += 1) {
        const x = 20 * i;
        const period = buildSVG("g");

        const text = buildSVG("text", "class", "date", "transform", "translate(" + x  + ", 0) rotate(90)");
        text.appendChild(textNode(formatDate(dates[i])));
        period.appendChild(text);

        const g = buildSVG("g", "class", "period");

        g.appendChild(buildValueMarkers(dataSets, i));

        const background = buildPath(["M", x - 10, "0 h 20 v 300 h -20 Z"]);
        g.appendChild(background);
        period.appendChild(g);
        periods.appendChild(period);

        if (sameDay(date, dates[i])) {
            continue;
        }
        date = dates[i];
        axes.appendChild(buildPath([
            "M " + 20 * i + " 0 v 300"
        ]))
    }

    holder.appendChild(axes);
    holder.appendChild(periods);
    return holder;
}

function drawGraph(json) {
    const dataSets = extractWeather(json);

    const width = dataSets.dates.length * 20;

    const svg = buildSVG("svg",
        "width", width * 2,
        "height", "600",
        "viewBox", "0 0 " + width + " 300"
    );

    const graph = buildSVG("g" /*, "transform", "translate(3, 97) scale(0.9, -1)" */ );

    const defs = buildSVG("defs");
    const texts = buildSVG("text", "font-size", "3", "font-family", "Sans", "dominant-baseline", "central");
    const paths = buildSVG("g", "fill", "none", "stroke", "#e0e0e0", "stroke-width", "4", "stroke-opacity", "0.5");
    const valueMarkers = buildSVG("g");

    wantOrder.forEach(f => {
        defs.appendChild(buildDataSetPath(dataSets[f], f))

        const textPath = buildSVG("textPath",
            "href", "#path-" + f,
            "method", "stretch",
            "fill", wants[f].color,
            "spacing", "auto"
        );

        const name = dataSets[f].name + " - "
        textPath.appendChild(textNode(name.toUpperCase().repeat(250)));
        texts.appendChild(textPath);

        paths.appendChild(buildSVG("use", "href", "#path-" + f));
 //       valueMarkers.appendChild(buildValueMarkers(dataSets[f], f));
    });

    svg.appendChild(defs);

    graph.appendChild(paths);
    graph.appendChild(texts);
//    graph.appendChild(valueMarkers);
    graph.appendChild(buildAxes(dataSets));
    svg.appendChild(graph);

    replaceContent($("#graph"), svg);
}

function init() {
    fetch("backend?t=forecast")
        .then(response => response.json())
        .then(json => {
            if ("success" in json) {
                drawGraph(json["success"])
            } else {
                throw new Error(json.error);
            }
        })
}


document.addEventListener("DOMContentLoaded", init);