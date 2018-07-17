import React, { Component } from 'react';
import PD from 'probability-distributions';
import Gradient from 'linear-gradient';

import background from './background.svg';
import './App.css';

const priceGradient = new Gradient([[0, 0, 255], [255, 255, 0]]);

const runSimulation = (size, n, tod) => {
  const betaDist = () => PD.rbeta(n, 30, 5);
  const priceFn = (x, y) => {
    const veryExpensive = 2700;
    const fluctuation = 300;
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    const slope = 1000;
    const falloff = n => Math.pow(n, 1.2);
    return veryExpensive - (
      falloff(slope * (distanceFromCenter / size))
    ) * ((Math.random() - 0.5) * fluctuation);
  };
  const radii = PD.rexp(n, 0.5).map(n => n * size);
  const thetas = PD.runif(n).map(n => n * 2 * Math.PI);
  const homes = [];
  for (var i=0;i<n;i++) {
    const r = radii[i];
    console.log(r);
    const theta = thetas[i];
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    const price = priceFn(x, y);
    homes.push({x, y, price});
  }
  // Now let's build some TOD!
  const {position, radius, bmrRatio, count, premium} = tod;
  for (var i=0; i<count; i++) {
    // Create a random home within our TOD circle
    const r = Math.random() * radius;
    const theta = Math.random() * 2 * Math.PI;
    const x = position.x + Math.cos(theta) * r;
    const y = position.y + Math.sin(theta) * r;
    const isBmr = Math.random() <= bmrRatio;
    const price = priceFn(x, y) * premium * (isBmr ? 0.66 : 1);
    homes.push({x, y, price});
  }
  const sortedPrices = homes.map(h => h.price).sort((a, b) => a - b);
  const prices = {
    min: 0,
    max: 2700,
  };
  return {
    homes,
    normalizePrice: p => {
      const oof = (p - prices.min) / (prices.max - prices.min);
      if (oof < 0.1) {
        console.log("oof!", oof);
      }
      return oof;
    },
  };
}

const sim = runSimulation(100, 2000, {
  position: {x: 100, y: 100},
  radius: 25,
  bmrRatio: 0.3,
  count: 100,
  premium: 1.2,
});

class SimulationView extends Component {

  mapSimCoordinates(x, y) {
    const {width, height} = this.props;
    return {x: x + width / 2, y: y + height / 2};
  }

  render() {
    const {simulation, width, height} = this.props;
    return <div>
        <img src={background} width={width} height={height} style={{position: "absolute"}} />
        <svg width={width} height={height}>
        {simulation.homes.map((home, i) => {
          const {x, y} = this.mapSimCoordinates(home.x, home.y);
          return <circle
            cx={x}
            cy={y}
            r={3}
            key={i}
            fill={"black"}
          />;
        })}
      </svg>
    </div>;
  }
}

class App extends Component {
  static defaultProps = {
    width: 1000,
    height: 500,
  }

  render() {
    const {width, height} = this.props;
    return <SimulationView simulation={sim} width={width} height={height} />;
  }
}

export default App;
