package com.moosemorals.todaysweather;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.json.*;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Map;

public class Backend extends HttpServlet {
    private static final String REGIONAL_FORECAST = "http://datapoint.metoffice.gov.uk/public/data/txt/wxfcs/regionalforecast/json/508";
    private static final String FIVE_DAY_FORECAST = "http://datapoint.metoffice.gov.uk/public/data/val/wxfcs/all/json/352790?res=3hourly";
    private static final String OBSERVATIONS = "http://datapoint.metoffice.gov.uk/public/data/val/wxobs/all/json/3238?res=hourly";

    private final Logger log = LoggerFactory.getLogger(Backend.class);
    private String apiKey;

    @Override
    public void init() throws ServletException {
        try {
            apiKey = readApiKey();
        } catch (IOException e) {
            throw new ServletException("Can't read api key", e);
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        String type = req.getParameter("t");

        if (type == null) {
            type = "forecast";
        }

        JsonObjectBuilder result = Json.createObjectBuilder();

        switch (type) {
            case "forecast":
                result.add("success", fetch(FIVE_DAY_FORECAST + "&key=" + apiKey ));
                break;
            case "observation":
                result.add("success", fetch(OBSERVATIONS + "&key=" + apiKey));
                break;
            case "narative":
                result.add("success", fetch(REGIONAL_FORECAST + "?key=" + apiKey));
                break;
            default:
                result.add("error", "Unknown type");
                break;
        }

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try (JsonWriter out = Json.createWriter(resp.getWriter())) {
            out.write(result.build());
        }
    }

    private JsonObject fetch(String target) throws IOException {
        URL url = new URL(target);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();

        conn.connect();

        for (Map.Entry<String, List<String>> header : conn.getHeaderFields().entrySet() ) {

            log.debug("Header: {}: {}", header.getKey(), header.getValue());

        }

        try (JsonReader in = Json.createReader(new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8")))) {
            return in.readObject();
        }

    }

    private String readApiKey() throws IOException {
        try (BufferedReader in = new BufferedReader(new InputStreamReader(getClass().getResourceAsStream("/apiKey.txt")))) {
            return in.readLine();
        }
    }
}
