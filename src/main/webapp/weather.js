import {
    buildElement,
    $,
    $$,
    replaceContent
} from "./lib.js";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const styles = {
    "T": "stroke: red",
    "Pp": "stroke: green",
    "W": "stroke: #8c8cc8",
    "G": "stroke: #acacca; stroke-dasharray: 1%"
};

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

    const units = {};
    const dataSets = { };
    const dates = [];

    for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i]["name"];
        const u = fields[i]["units"];
        dataSets[f] = {
            name: fields[i]["$"],
            unit: u,
            normalise: "Cmph".indexOf(u) !== -1,
            parse: f !== "V",   // Don't parse visibility
            scale: f === "U" ? 10 : 1,  // Only uv index scales
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
                dataSets[f].data.push(v * dataSets[f].scale);
            }
        }
    }

    dataSets.dates = dates;
    return dataSets;
}


function drawDataSet(dataSet, which) {
    const group = buildSVG("g", "style", styles[which] );
    const path = [];

    let maxValue = Number.MIN_SAFE_INTEGER;
    let minValue = Number.MAX_SAFE_INTEGER;

    const values = dataSet.data.map(v => {
        if (v > maxValue) {
            maxValue = v;
        }
        if (v < minValue) {
            minValue = v;
        }
        return v;
    });

    const range = maxValue - minValue;

    for (let i = 0; i < values.length; i += 1) {
        const t = dataSet.normalise ? 100 * (values[i] - minValue) / range : values[i];
        path.push(i === 0 ? "M" : "L");
        path.push(i * 10);
        path.push(t);
    }
    group.appendChild(buildPath(path));

    return group;
}

function sameDay(left, right) {
    return left.getUTCFullYear() === right.getUTCFullYear() &&
        left.getUTCMonth() === right.getUTCMonth() &&
        left.getUTCDate() === right.getUTCDate();
}

function buildAxes(dates) {
    const axes = buildSVG("g", "stroke", "black", "fill", "none", "stroke-width", "1");
    axes.appendChild(buildPath([
        "M 350 0 h -350 v 100"
    ]));

    let date = dates[0];

    for (let i = 1; i < dates.length; i += 1) {
        if (sameDay(date, dates[i])) {
            continue;
        }
        date = dates[i];

        axes.appendChild(buildPath([
            "M " + 10 * i + " 0 v 100"
        ]))
    }

    return axes;
}

function drawGraph(json) {
    const dataSets = extractWeather(json);

    const width = 35 * 20;

    const svg = buildSVG("svg",
        "width", width,
        "height", "300",
        "viewBox", "0 0 350 100"
    );

    const graph = buildSVG("g", "transform", "translate(3, 97) scale(0.9, -1)");

    graph.appendChild(buildAxes(dataSets.dates));

    const dataLines = buildSVG("g", "stroke-linejoin", "round", "fill", "none", "stroke-width", "2");

    ["T", "Pp", "W", "G"].forEach(f => 
        dataLines.appendChild(drawDataSet(dataSets[f], f))
    );

    graph.appendChild(dataLines);

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