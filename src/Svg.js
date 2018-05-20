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
    this.rotationHandle = React.createRef();
    this.scaleHandle = React.createRef();

    this.state = {
      draggingOffset: null,
      // Point where dragging the rotate handle started
      rotateHandleDragPoint: null,
      scaleHandleDragPoint: null,
      scale: {
        x: 1,
        y: 1,
      },
      rotation: 0.0,
      translation: {
        x: 0,
        y: 0,
      },
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

    // If click happened on scale handle
    const viewBoxScaleHandle = Svg.browserToViewBoxRect(
      this.scaleHandle.current.getBoundingClientRect(),
      container,
    );
    if (isHit(viewBoxScaleHandle, viewBoxPoint)) {
      this.setState({
        scaleHandleDragPoint: {
          x: viewBoxPoint.x,
          y: viewBoxPoint.y,
        },
      });
      return;
    }

    // If click happened on the rect
    if (isHit(viewBoxRect, viewBoxPoint)) {
      this.setState({
        draggingOffset: {
          x: this.state.translation.x - viewBoxPoint.x,
          y: this.state.translation.y - viewBoxPoint.y,
        },
      });
      return;
    }

    // If click happened on the rotate handle
    const viewBoxRotateHandle = Svg.browserToViewBoxRect(
      this.rotationHandle.current.getBoundingClientRect(),
      container,
    );
    if (isHit(viewBoxRotateHandle, viewBoxPoint)) {
      this.setState({
        rotateHandleDragPoint: {
          x: viewBoxRect.x + RECT_WIDTH / 2,
          y: viewBoxRect.y + RECT_HEIGHT / 2,
        },
      });
      return;
    }
  }

  onMouseMove(event) {
    if (!this.state.draggingOffset && !this.state.rotateHandleDragPoint && !this.state.scaleHandleDragPoint) {
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
      this.setState({
        translation: {
          x: viewBoxPoint.x + this.state.draggingOffset.x,
          y: viewBoxPoint.y + this.state.draggingOffset.y,
        },
      });
    }

    // Calculate rotation
    if (this.state.rotateHandleDragPoint) {
      const angle = angleBetween(this.state.rotateHandleDragPoint, viewBoxPoint);
      this.setState({
        rotation: angle,
      });
    }

    // Calculate scale
    if (this.state.scaleHandleDragPoint) {
      this.setState({
        scale: {
          x: 1 + (viewBoxPoint.x - this.state.scaleHandleDragPoint.x) / RECT_WIDTH,
          y: 1 + (viewBoxPoint.y - this.state.scaleHandleDragPoint.y) / RECT_HEIGHT,
        },
      });
    }
  }

  onMouseUp() {
    this.setState({
      draggingOffset: null,
      rotateHandleDragPoint: null,
      scaleHandleDragPoint: null,
    });
  }

  render() {
    const translationMatrix = math.matrix([
      [1, 0, this.state.translation.x],
      [0, 1, this.state.translation.y],
      [0, 0, 1],
    ]);
    const scaleMatrix = math.matrix([
      [this.state.scale.x, 0, 0],
      [0, this.state.scale.y, 0],
      [0, 0, 1],
    ]);

    const { rotation } = this.state;
    const rawRotationMatrix = math.matrix([
      [Math.cos(rotation), -Math.sin(rotation),  0],
      [Math.sin(rotation), Math.cos(rotation),  0],
      [0, 0, 1],
    ]);
    const centerToOriginMatrix = math.matrix([
      [1, 0,  -RECT_WIDTH / 2],
      [0, 1, -RECT_HEIGHT / 2],
      [0, 0, 1],
    ]);
    const centerToOriginInverseMatrix = math.matrix([
      [1, 0,  RECT_WIDTH / 2],
      [0, 1, RECT_HEIGHT / 2],
      [0, 0, 1],
    ]);
    const rotationMatrix = math.multiply(
      centerToOriginInverseMatrix,
      rawRotationMatrix,
      centerToOriginMatrix,
    );

    const transformationMatrix = math.multiply(
      translationMatrix,
      scaleMatrix,
      rotationMatrix,
    );
    const transform = matrixToSvgTransform(transformationMatrix);

    return (
      <svg
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
        onMouseDown={(event) => this.onMouseDown(event)}
        onMouseMove={(event) => this.onMouseMove(event)}
        onMouseUp={(event) => this.onMouseUp(event)}
        ref={this.svg}
      >
        <g
          transform={`matrix(${transform})`}
        >
          <rect
            className="rect"
            width={RECT_WIDTH}
            height={RECT_HEIGHT}
            ref={this.rect}
          />
          <rect
            className="scale-handle"
            width="1"
            height="1"
            x="9"
            y="9"
            ref={this.scaleHandle}
          />
          <circle
            r="0.5"
            cx="10.5"
            cy="5"
            ref={this.rotationHandle}
          />
        </g>
      </svg>
    );
  }
}

export default Svg;
