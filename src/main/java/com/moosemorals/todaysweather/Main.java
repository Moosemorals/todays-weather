package com.moosemorals.todaysweather;

import java.io.IOException;

public class Main {

    public static void main(String[] args) throws IOException {
        MetOfficeFetcher fetcher = new MetOfficeFetcher();

//        System.out.println(fetcher.drawRegionalForecast());

//        System.out.println(fetcher.getFiveDayForecast());

//        System.out.println(fetcher.getObservations());

    //    System.out.println(fetcher.getClosestObsLoc(54.984598f, -1.576997f));

        System.out.println(new Graph(500, 500).toString());
    }
}
