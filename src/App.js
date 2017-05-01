import React, {Component} from 'react';
import './App.css';
import d3 from 'd3';
import d3Tip from 'd3-tip';

var vienna_json = require('./../public/data/vienna.json');

var svgd3;
var projection;
const VIENNA = {
    lat: 48.210033,
    lng: 16.363449
};

var stationRadius = 2;
var colorMap = new Map([["U1", "Red"], ["U2", "BlueViolet"], ["U3", "Orange"], ["U4", "Green"], ["U6", "SaddleBrown"]]);

function createArray(length) {
    var arr = new Array(length || 0),
        i = length;

    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while (i--) arr[length - 1 - i] = createArray.apply(this, args);
    }

    return arr;
}

var u1RBL_H = ["4101", "4103", "4105", "4107", "4109", "4111", "4113", "4115", "4117", "4119",
    "4121", "4123", "4125", "4127", "4181", "4182", "4183", "4184"
];

var proxyUrl = "http://localhost:3001/?url=";
var dev_senderKey = "ZHRktKjHZU7c5aQ9";
var baseUrl = "http://www.wienerlinien.at";
var google;
var d3proj;

var width = 1000;
var height = 1000;

var all_stations = [];
var paths = [];

export class App extends Component {

    constructor(props) {
        super(props);
        this.map = null;
    }

    componentDidMount() {
        google = window.google;
        /*this.map = new google.maps.Map(this.refs.map, {
         center: VIENNA,
         zoom: 13
         });*/


        var styledMapType = new google.maps.StyledMapType(
            [
                {
                    "featureType": "administrative.land_parcel",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "administrative.neighborhood",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "poi",
                    "elementType": "labels.text",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "poi.business",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "road",
                    "elementType": "labels",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "road",
                    "elementType": "labels.icon",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "transit",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                },
                {
                    "featureType": "water",
                    "elementType": "labels.text",
                    "stylers": [
                        {
                            "visibility": "off"
                        }
                    ]
                }
            ],
            {name: 'Styled Map'});

        var map = new google.maps.Map(this.refs.map, {
            zoom: 13,
            center: VIENNA,
            mapTypeControlOptions: {
                mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain',
                    'styled_map']
            },
            disableDefaultUI: true,
            backgroundColor: '#002732'
        });

        map.mapTypes.set('styled_map', styledMapType);
        map.setMapTypeId('styled_map');


        map.data.addGeoJson(vienna_json);
        map.data.setStyle({
            strokeWeight: 2,
            strokeOpacity: 0.9
        });
        setupOverlay(map);
        sendRequest(u1RBL_H);
    }

    render() {
        const mapStyle = {
            width: 1000,
            height: 1000,
        };

        return (
            <div>
                <div ref="map" style={mapStyle}>I should be a map!</div>
            </div>
        );
    }
}

var tip;
function setupOverlay(map) {
    function SVGOverlay(map) {
        this.map = map;
        this.svg = null;

        this.onPan = this.onPan.bind(this);

        this.setMap(map);
    }

    SVGOverlay.prototype = new google.maps.OverlayView();

    SVGOverlay.prototype.onAdd = function () {
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.svg.style.position = 'absolute';
        this.svg.style.top = 0;
        this.svg.style.left = 0;
        this.svg.style.width = '100%';
        this.svg.style.height = '100%';
        this.svg.style.pointerEvents = 'none';

        projection = this.getProjection();
        all_stations = [];

        /*d3.select(this.svg)
         .attr('width', 960)
         .attr('height', 500)
         .append('g')
         .attr('class', 'dots')
         .selectAll('circle')
         .data(this.dots, (d) => d.id)
         .enter().append('circle')
         .attr('cx', (d) => projection.fromLatLngToContainerPixel(d.latLng).x)
         .attr('cy', (d) => projection.fromLatLngToContainerPixel(d.latLng).y)
         .attr('r', 5)
         .attr('fill', (d) => d.color);*/

        document.body.appendChild(this.svg);
        this.map.addListener('center_changed', this.onPan);


        console.log("Creating d3");

        svgd3 = d3.select(this.svg)
            .attr('width', 960)
            .attr('height', 500)
            .append('g')
            .attr('class', 'dots');

        var layer = d3.select(this.getPanes().overlayMouseTarget).append("div").attr("class", "stations");


        tip = d3Tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                return "test";
            });
        svgd3.call(tip);

        console.log("projection");
        console.log(projection);
    };

    SVGOverlay.prototype.onRemove = function () {
        this.map.removeListener('center_changed', this.onPan);
        this.svg.parentNode.removeChild(this.svg);
        this.svg = null;
    };

    SVGOverlay.prototype.draw = function () {
        projection = this.getProjection();
        console.log('draw');
    };

    SVGOverlay.prototype.onPan = function () {
        projection = this.getProjection();
        svgd3.selectAll('*').remove();
        drawStations();
        drawPaths();

    };

    var overlay = new SVGOverlay(map);
}

function buildUri(rbls) {
    var uri = "/ogd_realtime/monitor?";
    var sender = "&sender=" + dev_senderKey;

    for (var i = 0; i < rbls.length; i++) {
        uri += "rbl=" + rbls[i];
        if (i != rbls.length - 1) {
            uri += "&";
        }
    }
    uri += sender;
    return uri;
}

function sendRequest(rbls) {
    var uri = proxyUrl + baseUrl + buildUri(rbls);
    console.log(rbls + "\n");
    console.log(uri);

    fetch(uri)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            handleLine(data, rbls);
        }).catch(function (error) {
        console.log(error);
    });
}

function handleLine(json, rbls) {
    console.log(json);
    var data = json.data;
    var monitors = data.monitors;

    var allRBLCoordsMap = new Map();

    for (var i = 0; i < monitors.length; i++) {
        var station = monitors[i];
        console.log("Processing: ");
        console.log(station);

        var location = station.locationStop;
        var lines = station.lines;
        var attr = station.attributes;

        console.log(location);
        console.log(lines);

        var rbl = location.properties.attributes.rbl;
        var color = colorMap.get(lines[0].name);
        addStation(location,lines, stationRadius);
        allRBLCoordsMap.set(rbl, location.geometry.coordinates);
    }

    addPath(allRBLCoordsMap, rbls, color);
    drawStations();
    drawPaths();
}

function addPath(allRBLcoords, rbls, color) {

    var lineCoords = createArray(rbls.length - 1, 2);
    for (var i = 0; i < rbls.length - 1; i++) {
        lineCoords[i][0] = allRBLcoords.get(parseInt(rbls[i]));
        lineCoords[i][1] = allRBLcoords.get(parseInt(rbls[i + 1]));
    }
    paths.push({
        lineCoords: lineCoords,
        color: color
    });
    drawPaths();
}

function drawPaths() {
    var _lineCoords = paths[0].lineCoords;
    var _color = paths[0].color;
    for (var i = 0; i < _lineCoords.length; i++) {
        var line = d3.svg.line()
                .x(function (d, i, data) {
                    var latLng = new google.maps.LatLng(d[1], d[0]);
                    return projection.fromLatLngToContainerPixel(latLng).x;
                })
                .y(function (d, i, data) {
                    var latLng = new google.maps.LatLng(d[1], d[0]);
                    return projection.fromLatLngToContainerPixel(latLng).y;
                })
            ;//.curve(d3.curveBasis);

        svgd3.append("path")
            .attr("d", line(_lineCoords[i]))
            .style("fill", _color)
            .style("fill-opacity", .2)
            .style("stroke-width", .7)
            .style("stroke", _color);
    }

}

function drawStations() {
    svgd3.selectAll("circles")
        .data(all_stations)
        .enter().append('circle')
        .attr('cx', (d) => projection.fromLatLngToContainerPixel(d.latLng).x)
        .attr('cy', (d) => projection.fromLatLngToContainerPixel(d.latLng).y)
        .attr("r", (d) => d.r + "px")
        .attr("fill", (d) => d.color)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide);
}

function addStation(location,lines, r,color) {
    /*console.log("Adding Station");
    console.log(location);
    console.log(lines);
    console.log(color);*/
    var geometry = location.geometry.coordinates;
    let latLng = new google.maps.LatLng(geometry[1], geometry[0]);
    all_stations.push({
        location: location,
        lines: lines,
        color: color,
        latLng: latLng,
        r: r
    });
}


export default App
