// @flow
import React, { Component } from "react";
import Gradient from "linear-gradient";

import background from "./background.svg";
import "./App.css";
import savedState from "./saved-state";

const homePath = {
    bounds: {x: 78.3, y: 76.2},
    path: `M77.8,40.6l-4.2,4.2c-0.8,0.8-2,0.8-2.8,0L39.2,13.2L7.6,44.8c-0.8,0.8-2,0.8-2.8,0l-4.2-4.2c-0.8-0.8-0.8-2,0-2.8L37.8,0.6
	c0.8-0.8,2-0.8,2.8,0l37.2,37.2C78.5,38.5,78.5,39.8,77.8,40.6z M39.2,17.2l28,28v29c0,1.1-0.9,2-2,2h-26c-1.1,0-2-0.9-2-2v-21
	c0-0.6-0.4-1-1-1h-14c-0.6,0-1,0.4-1,1v21c0,1.1-0.9,2-2,2h-6c-1.1,0-2-0.9-2-2v-29L39.2,17.2z M45.2,63.2c0,0.6,0.4,1,1,1h10
	c0.6,0,1-0.4,1-1v-10c0-0.6-0.4-1-1-1h-10c-0.6,0-1,0.4-1,1V63.2z`,
};

const apartmentPath = {
    bounds: {x: 42, y: 80},
    path: `M40,0H2C0.9,0,0,0.9,0,2v76c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-8c0-0.6,0.4-1,1-1h8c0.6,0,1,0.4,1,1v8c0,1.1,0.9,2,2,2h12
	c1.1,0,2-0.9,2-2V2C42,0.9,41.1,0,40,0z M14,60c0,0.6-0.4,1-1,1H7c-0.6,0-1-0.4-1-1V39c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V60z
	 M14,32c0,0.6-0.4,1-1,1H7c-0.6,0-1-0.4-1-1V11c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V32z M25,60c0,0.6-0.4,1-1,1h-6c-0.6,0-1-0.4-1-1
	V39c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V60z M25,32c0,0.6-0.4,1-1,1h-6c-0.6,0-1-0.4-1-1V11c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V32z
	 M36,60c0,0.6-0.4,1-1,1h-6c-0.6,0-1-0.4-1-1V39c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V60z M36,32c0,0.6-0.4,1-1,1h-6c-0.6,0-1-0.4-1-1
	V11c0-0.6,0.4-1,1-1h6c0.6,0,1,0.4,1,1V32z`,
};

const MAX_POSSIBLE_PRICE = 3000;
const MIN_POSSIBLE_PRICE = 500;
const SIMULATION_SPACE_SCALE = 100;

const TOD_HOME_COUNT = 6;
const STATION_CATCHMENT_AREA = 15;
const SIMULATION_PRICE_ORIGIN = {x: 23.4, y: -6.4};
const MIN_SELECTION_RADIUS = 20;
const MAX_SELECTION_RADIUS = 175;

const roundTo = (x, n) => Math.round(x * Math.pow(10, n)) / Math.pow(10, n);

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

const normalizePrice = (price, max = MAX_POSSIBLE_PRICE, min = MIN_POSSIBLE_PRICE) =>
    (price - min) / (max - min);

const formatPrice = price => {
    const negative = price < 0;
    price = Math.abs(price);
    const dollars = Math.round(price);
    const cents = (s => {
        if(s.length === 1) s = "0" + s;
        if(s.length > 2) s = s.slice(0, 2);
        return s;
    })((roundTo(price - Math.floor(price), 2) * 100).toString())
    const rounded = `${dollars}.${cents}`;
    return (negative ? "-" : "") + "$" + rounded;
};

const buildTOD = (station, count) => {
    const dTheta = Math.PI * 2 / count;
    const varyRadius = 0.0;
    const varyTheta = 0.0;
    const baseRadius = (SIMULATION_SPACE_SCALE / 12);
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

const Home = ({onClick, position: {x, y}, size, index, color, selected, isTOD}) => {
    const {path, bounds: {x: viewboxWidth, y: viewboxHeight}} = isTOD ? apartmentPath : homePath;
    return <svg
        key={index}
        viewBox={`0 0 ${viewboxWidth} ${viewboxHeight}`}
        style={{cursor: "pointer", opacity: selected ? 1 : 0.5}}
        x={x - size / 2}
        y={y - size}
        width={size}
        height={size * (viewboxHeight / viewboxWidth)}
        onClick={onClick}
        preserveAspectRatio="none"
    >
        <path d={path} fill={color} />
    </svg>;
};

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

const CounterWithArrow = ({price, label}) => {
    if (isNaN(price)) {
        return null;
    }
    const color = priceGradient.calcHex(normalizePrice(price, 300, -150));
    const rotateDeg = price < 0 ? 180 : 0;
    return <div style={{background: "white", padding: 4}}>
        <div>
            <i>{label}</i>
        </div>
        <div style={{display: "flex"}}>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginRight: 10,
                    transition: "0.2s transform ease-out",
                    transform: `rotate(${rotateDeg}deg)`
                }}
            >
                <svg width={20} height={10} viewBox="0 0 20 10">
                    <polygon points="0,10 20,10 10,0" fill={color} />
                </svg>
            </div>
            <div style={{fontSize: "1.5em", color}}>
                {formatPrice(price)}
            </div>
        </div>
    </div>;
}

const isLocked = window.location.search.includes("locked");

class SimulationView extends Component {
    static defaultProps = {
        homeSize: 20,
        stationSize: 30,
        editMode: !isLocked,
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

    state = isLocked ? savedState : {
        ...this.lsInitialState("homes", "stations"),
        selectingRadius: false,
        selectionRadius: MIN_SELECTION_RADIUS,
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
        this.setHomes([...homes, home]);
    }

    removeHome = home => {
        this.setHomes(this.state.homes.filter(h => h !== home));
    }

    isHomeSelected = (home, selectedStation) => {
        const {selectionRadius} = this.state;
        if (selectionRadius && selectedStation) {
            return distance(home, selectedStation) <= selectionRadius;
        }
        return false;
    }

    getCalculatedHomes = () => {
        const selectedStation = this.getSelectedStation();
        let {homes, stations} = this.state;
        if (selectedStation) {
            homes = [...homes, ...buildTOD(selectedStation, TOD_HOME_COUNT)];
        }
        return homes.map(home => ({
            ...home,
            basis: home,
            price: priceAtLocation(home, stations),
            selected: this.isHomeSelected(home, selectedStation),
        }));
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

    getSelectedStation = () => {
        return this.state.stations.find(s => s.selected);
    }

    setSelectedRadius(station, mouse) {
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
    handleSelectRadiusEnd = () => this.setState({selectingRadius: false});

    logState = () => {
        console.log(JSON.stringify(this.state));
    }

    renderControls() {
        const {editMode} = this.props;
        return editMode && <div style={{position: "absolute", bottom: 10, left: 10, zIndex: 1}}>
            <button onClick={() => this.setHomes([])}>clear</button>
            <button onClick={this.logState}>log</button>
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
            alt=""
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
                onMouseUp={this.handleSelectRadiusEnd}
            />;
        }
        return <g key="selector" style={{filter: "url(#shadow)"}}>
            <circle
                cx={x}
                cy={y}
                r={viewRadius}
                stroke={"black"}
                strokeWidth={3}
                fill={"rgba(0, 0, 0, 0.05)"}
            />;
            {handle}
        </g>;
    }

    renderPrices() {
        const sum = arr => arr.reduce((a, b) => a + b, 0);
        const averagePrice = homes => sum(homes.map(h => h.price)) / homes.length;

        const homes = this.getCalculatedHomes();
        const homesWithoutTOD = homes.filter(h => !h.isTOD);
        const selectedHomes = homes.filter(h => h.selected);
        const selectedHomesWithoutTOD = selectedHomes.filter(h => !h.isTOD);

        const homesTODDelta = averagePrice(homes) - averagePrice(homesWithoutTOD);
        const selectedHomesTODDelta = averagePrice(selectedHomes) - averagePrice(selectedHomesWithoutTOD);

        return <div style={{position: "absolute", userSelect: "none", right: 10, bottom: 10, background: "white", padding: 4, borderRadius: 4}}>
            Effect of
            {" "}
            <Home size={20} position={{x: 0, y: 0}} color={"black"} selected={true} isTOD={true} />
            {" "}
            on price of
            {" "}
            <Home size={20} position={{x: 0, y: 0}} color={"black"} selected={true} />
            {": "}
            <div>
                <CounterWithArrow price={selectedHomesTODDelta} label="In the selected radius" />
                <CounterWithArrow price={homesTODDelta} label="Across the region" />
            </div>
        </div>
    }

    renderHomes() {
        const {
            width,
            height,
            homeSize,
            stationSize,
            editMode,
        } = this.props;
        const {mode, stations} = this.state;
        const selectedStation = this.getSelectedStation();
        const homes = this.getCalculatedHomes();
        return <svg
            width={width}
            height={height}
            onClick={editMode ? this.handleClick : null}
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
            {<g>
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
            <g>
            {homes.map((home, i) => {
                const {x, y} = this.mapToViewCoordinates(home)
                return <Home
                    position={{x, y}}
                    isTOD={home.isTOD}
                    size={homeSize}
                    index={i}
                    key={i}
                    selected={home.selected}
                    onClick={e => {
                        e.stopPropagation();
                        editMode && this.removeHome(home.basis);
                    }}
                    color={priceGradient.calcHex(normalizePrice(home.price))}
                />;
            })}
            {selectedStation && (!editMode || mode !== "homes") && this.renderRadiusSelector(selectedStation)}
            </g>
        </svg>;
    }

    render() {
        const {width, height} = this.props;
        return <div
            style={{background: "#EEE", position: "relative", width, height}}
            onMouseMove={this.handleMouseMove}
            onMouseUp={this.handleSelectRadiusEnd}
        >
            {this.renderControls()}
            {this.renderMousePosition()}
            {this.renderBackground()}
            {this.renderHomes()}
            {this.renderPrices()}
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
