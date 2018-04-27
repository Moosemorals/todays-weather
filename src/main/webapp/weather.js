import {
    buildElement,
    $,
    $$,
    replaceContent,
    textNode
} from "./lib.js";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const wants = {
    "T": {color: "red", name: "Temprature"},
    "Pp": {color: "green", name: "Rain Chance %"},
    "H": {color: "#0064fa", name: "Humidity %"},
    "S": {color:"#8c8cc8", name: "Wind speed"},
    "G": {color: "#acacca", name: "Wind gust"}
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

        if (!(f in wants)) {
            continue;
        } 

        const u = fields[i]["units"];
        dataSets[f] = {
            name: wants[f].name,
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

function buildCircle(x, y, r, ...args) {
    return buildSVG("circle", "cx", x, "cy", y, "r", r, ...args);
}

function buildDataSetPath(dataSet, which) {
    const range = dataSet.normalise ? dataSet.limits.max - dataSet.limits.min : 1;

    let points = [];

    for (let i = 0; i < dataSet.data.length; i += 1) {
        const v = dataSet.data[i];
        const t = dataSet.normalise ? 300 * (v - dataSet.limits.min) / range : 3 * v;
        points.push(new Point(i * 20, 300 - t));
    }

    const p2 = polyLine(points);
    
    const path = buildPath(["M", points[0].x, points[0].y, "C", ...p2]);

    path.id = "path-" + which;
    return path;
}

function sameDay(left, right) {
    return left.getUTCFullYear() === right.getUTCFullYear() &&
        left.getUTCMonth() === right.getUTCMonth() &&
        left.getUTCDate() === right.getUTCDate();
}

function buildAxes(dates) {
    const axes = buildSVG("g", "stroke", "black", "fill", "none", "stroke-width", "0.5");

    const width = dates.length * 20;

    axes.appendChild(buildPath([
        "M", width, "300 h", -width, "v -300"
    ]));

    let date = dates[0];

    for (let i = 1; i < dates.length; i += 1) {
        if (sameDay(date, dates[i])) {
            continue;
        }
        date = dates[i];

        axes.appendChild(buildPath([
            "M " + 20 * i + " 0 v 300"
        ]))
    }

    return axes;
}

function drawGraph(json) {
    const dataSets = extractWeather(json);

    const width = dataSets.dates.length * 20;

    const svg = buildSVG("svg",
        "width", width * 2,
        "height", "600",
        "viewBox", "0 0 " + width + " 300"
    );

    const graph = buildSVG("g" /*, "transform", "translate(3, 97) scale(0.9, -1)" */);

    graph.appendChild(buildAxes(dataSets.dates));

    const defs = buildSVG("defs");
    const texts = buildSVG("text", "font-size", "3", "font-family", "Sans", "dominant-baseline", "central");
    const paths = buildSVG("g", "fill", "none", "stroke", "#e0e0e0", "stroke-width", "4", "stroke-opacity", "0.5");

    Object.keys(wants).forEach(f => {
        defs.appendChild(buildDataSetPath(dataSets[f], f))

        const textPath = buildSVG("textPath", 
            "href", "#path-" + f, 
            "method", "stretch", 
            "fill", wants[f].color, 
            "spacing", "auto"
        );

        const name = dataSets[f].name + " - "
        textPath.appendChild(textNode(name.toUpperCase().repeat(200)));
        texts.appendChild(textPath);

        paths.appendChild(buildSVG("use", "href", "#path-" + f));
    });

    svg.appendChild(defs);

    graph.appendChild(paths);
    graph.appendChild(texts);

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