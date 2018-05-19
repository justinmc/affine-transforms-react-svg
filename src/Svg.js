import React, { Component } from 'react';
import './Svg.css';

const VIEW_BOX_WIDTH = 100;
const VIEW_BOX_HEIGHT = 100;

class Svg extends Component {
  constructor(props) {
    super(props);

    this.svg = React.createRef();

    this.state = {
      draggingOffset: null,
      transform: [1, 0, 0, 1, 0, 0],
    };
  }

  browserCoordsToViewBox(browserPoint) {
    const svgRect = this.svg.current.getBoundingClientRect();
    return {
      x: VIEW_BOX_WIDTH * browserPoint.x / svgRect.width,
      y: VIEW_BOX_HEIGHT * browserPoint.y / svgRect.height,
    };
  }

  onMouseDown(event) {
    const viewBoxPoint = this.browserCoordsToViewBox({
      x: event.clientX,
      y: event.clientY,
    });
    this.setState({
      draggingOffset: {
        x: this.state.transform[4] - viewBoxPoint.x,
        y: this.state.transform[5] - viewBoxPoint.y,
      },
    });
  }

  onMouseMove(event) {
    if (!this.state.draggingOffset) {
      return;
    }

    const viewBoxPoint = this.browserCoordsToViewBox({
      x: event.clientX,
      y: event.clientY,
    });
    const viewBoxPointAdjusted = {
      x: viewBoxPoint.x + this.state.draggingOffset.x,
      y: viewBoxPoint.y + this.state.draggingOffset.y,
    };
    this.setState({
      transform: [1, 0, 0, 1, viewBoxPointAdjusted.x, viewBoxPointAdjusted.y],
    });
  }

  onMouseUp() {
    this.setState({
      draggingOffset: null,
    });
  }

  render() {
    return (
      <svg
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
        onMouseDown={(event) => this.onMouseDown(event)}
        onMouseMove={(event) => this.onMouseMove(event)}
        onMouseUp={(event) => this.onMouseUp(event)}
        ref={this.svg}
      >
        <rect
          width="10"
          height="10"
          transform={`matrix(${this.state.transform.join(' ')})`}
        />
      </svg>
    );
  }
}

export default Svg;
