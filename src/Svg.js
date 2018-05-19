import React, { Component } from 'react';
import math from 'mathjs';
import './Svg.css';
import {
  angleBetween,
  isHit,
  matrixToSvgTransform,
} from './graphicsUtils';

const VIEW_BOX_WIDTH = 100;
const VIEW_BOX_HEIGHT = 100;
const RECT_WIDTH = 10;
const RECT_HEIGHT = 10;

class Svg extends Component {
  constructor(props) {
    super(props);

    this.svg = React.createRef();
    this.rect = React.createRef();
    this.circle = React.createRef();

    this.state = {
      draggingOffset: null,
      // Point where dragging the rotate handle started
      rotateHandleDragPoint: null,
      transform: math.matrix([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]),
    };
  }

  static browserToViewBoxRect(rect, container) {
    const point = Svg.browserCoordsToViewBox({
      x: rect.x,
      y: rect.y,
    }, container);
    const dimensions = Svg.browserCoordsToViewBox({
      x: rect.width,
      y: rect.height,
    }, container);

    return {
      x: point.x,
      y: point.y,
      width: dimensions.x,
      height: dimensions.y,
    };
  }

  static browserCoordsToViewBox(browserPoint, container) {
    return {
      x: VIEW_BOX_WIDTH * browserPoint.x / container.width,
      y: VIEW_BOX_HEIGHT * browserPoint.y / container.height,
    };
  }

  onMouseDown(event) {
    const container = this.svg.current.getBoundingClientRect();
    const viewBoxRect = Svg.browserToViewBoxRect(
      this.rect.current.getBoundingClientRect(),
      container,
    );
    const viewBoxPoint = Svg.browserCoordsToViewBox({
      x: event.clientX,
      y: event.clientY,
    }, container);

    // If click happened on the rect
    if (isHit(viewBoxRect, viewBoxPoint)) {
      this.setState({
        draggingOffset: {
          x: this.state.transform._data[0][2] - viewBoxPoint.x,
          y: this.state.transform._data[1][2] - viewBoxPoint.y,
        },
      });
      return;
    }

    // If click happened on the rotate handle
    const viewBoxRotateHandle = Svg.browserToViewBoxRect(
      this.circle.current.getBoundingClientRect(),
      container,
    );
    if (isHit(viewBoxRotateHandle, viewBoxPoint)) {
      this.setState({
        rotateHandleDragPoint: {
          x: viewBoxRect.x + RECT_WIDTH / 2,
          y: viewBoxRect.y + RECT_HEIGHT / 2,
        },
      });
    }
  }

  onMouseMove(event) {
    if (!this.state.draggingOffset && !this.state.rotateHandleDragPoint) {
      return;
    }

    let transformationMatrix = math.matrix([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);

    // Calculate viewbox coords of event
    const container = this.svg.current.getBoundingClientRect();
    const viewBoxPoint = Svg.browserCoordsToViewBox({
      x: event.clientX,
      y: event.clientY,
    }, container);

    // Calculate translate
    if (this.state.draggingOffset) {
      transformationMatrix._data[0][2] = viewBoxPoint.x + this.state.draggingOffset.x;
      transformationMatrix._data[1][2] = viewBoxPoint.y + this.state.draggingOffset.y;
    } else {
      transformationMatrix._data[0][2] = this.state.transform._data[0][2];
      transformationMatrix._data[1][2] = this.state.transform._data[1][2];
    }

    // Calculate rotation
    if (this.state.rotateHandleDragPoint) {
      const angle = angleBetween(this.state.rotateHandleDragPoint, viewBoxPoint);
      const rotationMatrix = math.matrix([
        [Math.cos(angle), -Math.sin(angle), 0],
        [Math.sin(angle), Math.cos(angle), 0],
        [0, 0, 1],
      ]);
      transformationMatrix = math.multiply(transformationMatrix, rotationMatrix);
    } else {
      transformationMatrix._data[0][0] = this.state.transform._data[0][0];
      transformationMatrix._data[0][1] = this.state.transform._data[0][1];
      transformationMatrix._data[1][0] = this.state.transform._data[1][0];
      transformationMatrix._data[1][1] = this.state.transform._data[1][1];
    }

    this.setState({
      transform: transformationMatrix,
    });
  }

  onMouseUp() {
    this.setState({
      draggingOffset: null,
      rotateHandleDragPoint: null,
    });
  }

  render() {
    const transformString = matrixToSvgTransform(this.state.transform);
    return (
      <svg
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
        onMouseDown={(event) => this.onMouseDown(event)}
        onMouseMove={(event) => this.onMouseMove(event)}
        onMouseUp={(event) => this.onMouseUp(event)}
        ref={this.svg}
      >
        <g
          transform={`matrix(${transformString})`}
        >
          <rect
            width={RECT_WIDTH}
            height={RECT_HEIGHT}
            ref={this.rect}
          />
          <circle
            r="1"
            cx="11"
            cy="5"
            ref={this.circle}
          />
        </g>
      </svg>
    );
  }
}

export default Svg;
