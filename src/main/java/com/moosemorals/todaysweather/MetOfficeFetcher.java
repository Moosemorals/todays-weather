package com.moosemorals.todaysweather;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.json.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

final class MetOfficeFetcher {

    private static final String REGIONAL_FORECAST = "http://datapoint.metoffice.gov.uk/public/data/txt/wxfcs/regionalforecast/json/508";
    private static final String FIVE_DAY_FORECAST = "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/352790?res=3hourly";
    private static final String OBSERVATIONS = "http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/3238?res=hourly";
    private static final String OBS_LOCATIONS = "http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/sitelist";

    private final Logger log = LoggerFactory.getLogger(MetOfficeFetcher.class);

    private final String apiKey;

    MetOfficeFetcher() throws IOException {
        apiKey = readApiKey();
    }

    private JsonObject fetch(String target) {
        try {

            URL url = new URL(target + "?key=" + apiKey);

            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            try (JsonReader in = Json.createReader(new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8")))) {
                return in.readObject();
            }
        } catch (IOException e) {
            log.error("Can't fetch {}", target, e);
            return null;
        }
    }

    private float calcDist(float x1, float y1, float x2, float y2) {
        return (float) Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }

    String getClosestObsLoc(float lat, float lon) {

        JsonObject json = fetch(OBS_LOCATIONS + "?key=" + apiKey);

        if (json == null) {
            return null;
        }

        JsonArray locations = json.getJsonObject("Locations")
                .getJsonArray("Location");

        float minDist = Float.MAX_VALUE;
        JsonObject closest = null;

        for (int i = 0; i < locations.size(); i += 1) {
            JsonObject location = locations.getJsonObject(i);

            float locLat = Float.parseFloat(location.getString("latitude"));
            float locLon = Float.parseFloat(location.getString("longitude"));

            float dist = calcDist(lat, lon, locLat, locLon);

            log.debug("{}: {}", dist, location.getString("name"));
            if (dist < minDist) {
                closest = location;
                minDist = dist;
            }
        }
        if (closest != null) {
            return closest.toString();
        }
        return null;
    }

    String getObservations() {
        JsonObject json = fetch(OBSERVATIONS + "&key=" + apiKey);
        if (json != null) {
            return json.toString();
        } else {
            return null;
        }
    }

    String getFiveDayForecast() {

        JsonObject json = fetch(FIVE_DAY_FORECAST + "&key=" + apiKey);

        if (json == null) {
            return null;
        }

        StringWriter result = new StringWriter();
        JsonArray periods = json.getJsonObject("SiteRep")
                .getJsonObject("DV")
                .getJsonObject("Location")
                .getJsonArray("Period");

        for (int i = 0; i < periods.size(); i += 1) {
            JsonObject period = periods.getJsonObject(i);

            LocalDate date = LocalDate.parse(period.getString("value"), DateTimeFormatter.ISO_OFFSET_DATE);

            JsonArray reps = period.getJsonArray("Rep");

            for (int j = 0; j < reps.size(); j += 1) {
                JsonObject r = reps.getJsonObject(j);

                String rawOffset = r.getString("$");
                Long offset = Long.parseLong(rawOffset);

                LocalDateTime at = date.atStartOfDay().plus(offset, ChronoUnit.MINUTES);

                result.append(at.toString());
                result.append(" ");
                result.append("Temp ");
                result.append(r.getString("T"));
                result.append("C, Rain ");
                result.append(r.getString("Pp"));
                result.append("\n");
            }

        }

        return result.toString();
    }

    private void printParagraph(JsonObject paragraph, Writer out) throws IOException {
        out.write(paragraph.getString("title"));
        out.write(paragraph.getString("$"));
        out.write("\n");
    }

    String drawRegionalForecast() throws IOException {
        StringWriter result = new StringWriter();
        JsonObject rf = fetch(MetOfficeFetcher.REGIONAL_FORECAST);

        if (rf != null) {
            JsonArray periods = rf.getJsonObject("RegionalFcst")
                    .getJsonObject("FcstPeriods")
                    .getJsonArray("Period");

            for (int i = 0; i < periods.size(); i += 1) {
                JsonObject period = periods.getJsonObject(i);

                JsonValue rawParagraph = period.get("Paragraph");

                if (rawParagraph instanceof JsonArray) {

                    JsonArray paragraphs = (JsonArray) rawParagraph;

                    for (int j = 0; j < paragraphs.size(); j += 1) {
                        printParagraph(paragraphs.getJsonObject(j), result);
                    }
                } else {
                    printParagraph((JsonObject) rawParagraph, result);
                }
            }
        }
        return result.toString();
    }

    private String readApiKey() throws IOException {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(getClass().getResourceAsStream("/apiKey.txt")))) {
            return in.readLine();
        }
    }
}
