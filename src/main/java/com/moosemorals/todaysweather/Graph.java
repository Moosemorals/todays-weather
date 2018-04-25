package com.moosemorals.todaysweather;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.StringWriter;

final class Graph {

    private static final String SVG_NS = "http://www.w3.org/2000/svg";
    private final Logger log = LoggerFactory.getLogger(Graph.class);
    private final Document doc;
    private final Element root;

    Graph(int width, int height) {
        DocumentBuilderFactory docFactory = DocumentBuilderFactory.newInstance();
        DocumentBuilder docBuilder;
        try {
            docBuilder = docFactory.newDocumentBuilder();
        } catch (ParserConfigurationException e) {
            throw new RuntimeException("Can't create DOM", e);
        }

        // root elements
        doc = docBuilder.newDocument();
        root = buildElement("svg", "xmlns", SVG_NS, "version", "1.1", "width", Integer.toString(width), "height", Integer.toString(height));

        doc.appendChild(root);
    }

    void addDataSet(String name, float ...values) {



    }



    public String toString() {
        try {
            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            Transformer transformer = transformerFactory.newTransformer();
            DOMSource source = new DOMSource(doc);

            StringWriter result = new StringWriter();

            StreamResult streamResult = new StreamResult(result);

            transformer.transform(source, streamResult);

            return result.toString();
        } catch (javax.xml.transform.TransformerException e) {
            log.warn("Can't generate string version of doc", e);
            return "";
        }
    }

    private Element buildElement(String tag, String... atr) {
        if (atr != null && atr.length % 2 != 0) {
            throw new IllegalArgumentException("Attributes must come in pairs");
        }

        Element element = doc.createElement(tag);

        if (atr != null) {
            for (int i = 0; i < atr.length; i += 2) {
                element.setAttribute(atr[i], atr[i + 1]);
            }
        }

        return element;
    }

    private static class DataSet {
        private final String name;
        private final float[] values;

        DataSet(String name, float[] values) {
            this.name = name;
            this.values = values;
        }

        float getMinValue() {
            float min = Float.MAX_VALUE;
            for (int i =0 ; i < values.length; i += 1) {
                if (min < )
            }
        }
    }

}
