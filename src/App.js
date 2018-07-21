// @flow
import React, { Component } from "react";
import Gradient from "linear-gradient";

import background from "./background.svg";
import "./App.css";

const homePath = `M87.8,33.8L47.7,1.6c-2.1-2.1-5.4-2.1-7.5,0l-40,32.2c-2.1,2.1,10.1,3.9,10.1,3.9v30.8c0,2.2,0.1,4,0.1,4h25.5V50.8h16.4
v21.8h25.5c0,0,0.1-1.8,0.1-4V37.7C77.8,37.7,89.9,35.9,87.8,33.8z`;

const MAX_POSSIBLE_PRICE = 3000;
const MIN_POSSIBLE_PRICE = 500;
const SIMULATION_SPACE_SCALE = 100;

const STATION_CATCHMENT_AREA = 15;
const SIMULATION_PRICE_ORIGIN = {x: 23.4, y: -6.4};
const MIN_SELECTION_RADIUS = 10;
const MAX_SELECTION_RADIUS = 100;

const pr = arg => {
    console.log(arg);
    return arg;
};

const distance = (a, b) => {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return Math.sqrt(dx * dx + dy * dy);
};

const psuedorandom = lastSeed => {
    const LARGE_PRIME_NUMBER = 2147483647;
    const SMALLER_COMPOSITE_NUMBER = Math.pow(7, 5);
    return () => {
        lastSeed = (lastSeed * SMALLER_COMPOSITE_NUMBER) % LARGE_PRIME_NUMBER;
        return (lastSeed - 1) / (LARGE_PRIME_NUMBER - 1);
    };
};

const priceAtLocation = (location, stations) => {
    const pricePerUnitDistance = 2000;
    const priceByDistance =  MAX_POSSIBLE_PRICE - (
        pricePerUnitDistance * (
            distance(location, SIMULATION_PRICE_ORIGIN) /
            SIMULATION_SPACE_SCALE
        )
    );
    const distancesToStations = stations
        .map(station => distance(location, station))
        .sort((d1, d2) => d1 - d2);
    const stationPremium = distancesToStations.length > 0
        ? Math.max(STATION_CATCHMENT_AREA - distancesToStations[0], 0) * 100
        : 0;
    const totalPrice = priceByDistance + stationPremium
    return Math.min(
        MAX_POSSIBLE_PRICE,
        Math.max(MIN_POSSIBLE_PRICE, totalPrice)
    );
};

const normalizePrice = price =>
    (price - MIN_POSSIBLE_PRICE) / (MAX_POSSIBLE_PRICE - MIN_POSSIBLE_PRICE);

const buildTOD = (station, count) => {
    const dTheta = Math.PI * 2 / count;
    const varyRadius = 0.1;
    const varyTheta = 0.05 * 2 * Math.PI;
    const baseRadius = (SIMULATION_SPACE_SCALE / 15);
    const prng = psuedorandom(Math.abs(station.x * station.y));
    const homes = [];
    for (let i = 0; i < count ; i++) {
        const theta = i * dTheta + (-varyTheta / 2 + varyTheta * prng());
        const radius = baseRadius* ((1 - varyRadius) + 2 * varyRadius * prng());
        const x = station.x + Math.cos(theta) * radius;
        const y = station.y + Math.sin(theta) * radius;
        homes.push({x, y, isTOD: true});
    }
    return homes;
}

const priceGradient = new Gradient([[0, 0, 255], [255, 0, 0]]);

const Home = ({onClick, position: {x, y}, size, index, color}) =>
    <svg
        key={index}
        viewBox="0 0 88.1 72.6"
        style={{cursor: "pointer"}}
        x={x - size / 2}
        y={y - size / 2}
        width={size}
        height={size}
        onClick={onClick}
        preserveAspectRatio="none"
    >
        <path d={homePath} fill={color}/>
    </svg>;

const Station = ({onClick, position: {x, y}, size, index, selected, visible}) =>
    <circle
        style={{cursor: visible && "pointer", opacity: visible ? 0.2 : 0}}
        cx={x}
        cy={y}
        r={size}
        fill={selected ? "red" : "black"}
        onClick={onClick}
        key={index}
    />;

class SimulationView extends Component {
    static defaultProps = {
        homeSize: 20,
        stationSize: 30,
        editMode: false,
    };

    lsInitialState = (...keys) => {
        const res = {};
        keys.forEach(key =>
            res[key] = JSON.parse(localStorage.getItem(key)) || []
        );
        return res;
    }

    lsStateSetter = (key) => (value) => this.setState(
        {[key]: value},
        () => localStorage.setItem(key, JSON.stringify(value)),
    );

    state = {
        ...this.lsInitialState("homes", "stations"),
        selectingRadius: false,
        selectionRadius: 10,
        mode: "homes",
    };

    mapFromViewMetric = n => (SIMULATION_SPACE_SCALE / this.props.height) * n;
    mapToViewMetric = n => (this.props.height / SIMULATION_SPACE_SCALE) * n;

    mapFromViewCoordinates({x, y}) {
        const {width, height} = this.props;
        return {
            x: this.mapFromViewMetric(x - (width / 2)),
            y: this.mapFromViewMetric(y - (height / 2)),
        };
    }

    mapToViewCoordinates({x, y}) {
        const {width, height} = this.props;
        return {
            x: width / 2 + this.mapToViewMetric(x),
            y: height / 2 + this.mapToViewMetric(y),
        };
    }

    setHomes = this.lsStateSetter("homes");
    setStations = this.lsStateSetter("stations");

    addHome = home => {
        const {homes} = this.state;
        console.log("AH", home);
        this.setHomes([...homes, home]);
    }

    removeHome = home => {
        this.setHomes(this.state.homes.filter(h => h !== home));
    }

    addStation = station => {
        const {stations} = this.state;
        this.setStations([...stations, station]);
    }

    removeStation = station => {
        this.setStations(this.state.stations.filter(s => s !== station));
    }

    selectStation = station => {
        this.setStations(this.state.stations.map(s => ({
            ...s,
            selected: s === station,
        })));
    }

    getSelectedStation = station => {
        return this.state.stations.find(s => s.selected);
    }

    setSelectedRadius(station, mouse) {
        console.log(station, mouse);
        this.setState({
            selectionRadius: Math.min(
                MAX_SELECTION_RADIUS,
                Math.max(distance(station, mouse), MIN_SELECTION_RADIUS),
            ),
        });
    }

    handleMouseMove = ({nativeEvent: {offsetX, offsetY}}) => {
        const {selectingRadius} = this.state;
        const selectedStation = this.getSelectedStation();
        const mousePosition = this.mapFromViewCoordinates({
            x: offsetX,
            y: offsetY,
        });
        this.setState({mousePosition});
        console.log(selectedStation);
        if (selectingRadius && selectedStation) {
            this.setSelectedRadius(selectedStation, mousePosition);
        }
    };

    handleClick = ({nativeEvent: {offsetX, offsetY}}) => {
        const {mode} = this.state;
        const item = this.mapFromViewCoordinates({x: offsetX, y: offsetY});
        if (mode === "homes") {
            this.addHome(item);
        } else if (mode === "stations") {
            this.addStation(item);
        }
    };

    handleSelectRadiusStart = () => this.setState({selectingRadius: true});
    handleselectRadiusEnd = () => this.setState({selectingRadius: false});

    renderControls() {
        const {editMode} = this.props;
        return editMode && <div style={{position: "absolute", bottom: 10, left: 10, zIndex: 1}}>
            <button onClick={() => this.setHomes([])}>clear</button>
            <button onClick={() => console.log(JSON.stringify(this.state.homes))}>log</button>
            <select onChange={e => this.setState({mode: e.target.value})} value={this.state.mode}>
                <option value="homes">adding homes</option>
                <option value="stations">adding stations</option>
                <option value="tod">building tod</option>
            </select>
        </div>;
    }

    renderMousePosition() {
        const {editMode} = this.props;
        const {mousePosition} = this.state;
        const roundTo = (x, n) =>
            Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
        if (mousePosition) {
            const {x ,y } = mousePosition;
            const mousePositionString = `${roundTo(x, 2)} ${roundTo(y, 2)}`;
            return editMode && (
                <div style={{position: "absolute", top: 10, left: 10}}>
                    {mousePositionString}
                </div>
            );
        }
        return null;
    }

    renderBackground() {
        const {width, height} = this.props;
        return <img
            src={background}
            width={width}
            height={height}
            style={{position: "absolute", pointerEvents: "none"}}
        />;
    }

    renderRadiusSelector(center) {
        const {selectionRadius} = this.state;
        const {x, y} = this.mapToViewCoordinates(center);
        const viewRadius = this.mapToViewMetric(selectionRadius);
        const {mousePosition} = this.state;
        let handle = null;
        if (mousePosition) {
            const thetaToMouse = Math.atan2(
                mousePosition.y - center.y,
                mousePosition.x - center.x
            );
            const handlePosition = this.mapToViewCoordinates({
                x: center.x + selectionRadius * Math.cos(thetaToMouse),
                y: center.y + selectionRadius * Math.sin(thetaToMouse),
            });
            handle = <circle
                cx={handlePosition.x}
                cy={handlePosition.y}
                r={8}
                fill={"white"}
                stroke={"black"}
                strokeWidth={3}
                style={{cursor: "pointer"}}
                onMouseDown={this.handleSelectRadiusStart}
                onMouseUp={this.handleselectRadiusEnd}
            />;
        }
        return <g key="selector" style={{filter: "url(#shadow)"}}>
            <circle
                cx={x}
                cy={y}
                r={viewRadius}
                stroke={"black"}
                strokeWidth={3}
                fill={"rgba(0, 0, 0, 0.1)"}
            />;
            {handle}
        </g>;
    }

    renderHomes() {
        const {
            width,
            height,
            homeSize,
            stationSize,
            editMode,
        } = this.props;
        const selectedStation = this.getSelectedStation();
        let {homes, stations, mode} = this.state;
        if (selectedStation) {
            homes = [...homes, ...buildTOD(selectedStation, 8)];
        }
        return <svg
            width={width}
            height={height}
            onClick={editMode ? this.handleClick : null}
            onMouseUp={this.handleSelectRadiusEnd}
            style={{position: "absolute"}}
        >
            <defs>
                <filter id="shadow">
                    <feDropShadow
                        dx="2"
                        dy="2" 
                        stdDeviation="1"
                        floodOpacity={0.2}
                    />
                </filter>
            </defs>
            <g>
            {homes.map((home, i) => {
                const {x, y} = this.mapToViewCoordinates(home)
                return <Home
                    position={{x, y}}
                    size={homeSize}
                    index={i}
                    key={i}
                    onClick={e => {
                        e.stopPropagation();
                        editMode && this.removeHome(home);
                    }}
                    color={priceGradient.calcHex(
                        normalizePrice(priceAtLocation(home, stations))
                    )}
                />;
            })}
            </g>
            {<g>
                {selectedStation && this.renderRadiusSelector(selectedStation)}
                {stations.map((station, i) => {
                    const {x, y} = this.mapToViewCoordinates(station);
                    return <Station
                        position={{x,y}}
                        size={stationSize}
                        index={i}
                        key={i}
                        visible={editMode && mode === "stations"}
                        selected={selectedStation === station}
                        onClick={e => {
                            e.stopPropagation();
                            if (editMode) {
                                if (mode === "tod") {
                                    this.selectStation(station);
                                } else if(mode === "stations") {
                                    this.removeStation(station);
                                }
                            }
                        }}
                    />;
                })}
            </g>}
        </svg>;
    }

    render() {
        const {simulation, width, height, homes, homeSize} = this.props;
        return <div
            style={{background: "#EEE", position: "relative", width, height}}
            onMouseMove={this.handleMouseMove}
        >
            {this.renderControls()}
            {this.renderMousePosition()}
            {this.renderBackground()}
            {this.renderHomes()}
        </div>;
    }
}

class App extends Component {
    static defaultProps = {
        width: 1000,
        height: 500,
    };

    render() {
        const {width, height} = this.props;
        return <SimulationView
            width={width}
            height={height}
        />;
    }
}

export default App;
