import React, { Component } from 'react';
import math from 'mathjs';
import './Svg.css';
import {
  angleBetween,
  applyMatrixToPoint,
  getBoundingBox,
  isHit,
  matrixToSvgTransform,
} from './graphicsUtils';

const VIEW_BOX_WIDTH = 100;
const VIEW_BOX_HEIGHT = 100;
const HANDLE_SIZE = 1;
const INITIAL_RECT = {
  x: 0,
  y: 0,
  width: 10,
  height: 10,
};
const INITIAL_ROTATION_HANDLE_POINT = {
  x: INITIAL_RECT.width,
  y: INITIAL_RECT.height / 2,
};

class Svg extends Component {
  constructor(props) {
    super(props);

    this.svg = React.createRef();
    this.rect = React.createRef();
    this.scaleHandle = React.createRef();

    this.state = {
      draggingOffset: null,
      rotationHandleDragPoint: null, // Point to measure rotation from during drag
      scaleHandleDragPoint: null, // Point to measure scaling from during drag
      scale: {
        x: 1,
        y: 1,
      },
      rotation: 0.0,
      translation: {
        x: 0,
        y: 0,
      },
      scaleHandlePoint: {
        x: 9,
        y: 9,
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

  /**
   * Convert from raw browser coordinates to SVG viewbox coordinates/
   */
  static browserCoordsToViewBox(browserPoint, container) {
    return {
      x: VIEW_BOX_WIDTH * browserPoint.x / container.width,
      y: VIEW_BOX_HEIGHT * browserPoint.y / container.height,
    };
  }

  /**
   * Identify mousedowns on handles and save relevant data
   */
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

    // If on scale handle
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

    // If on the rotate handle
    const rotationHandlePoint = applyMatrixToPoint(
      INITIAL_ROTATION_HANDLE_POINT,
      this.getTransformationMatrix(),
    );
    const viewBoxRotateHandle = {
      x: rotationHandlePoint.x,
      y: rotationHandlePoint.y,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    };
    if (isHit(viewBoxRotateHandle, viewBoxPoint)) {
      const centerPoint = applyMatrixToPoint(
        {
          x: INITIAL_RECT.width / 2,
          y: INITIAL_RECT.height / 2,
        },
        this.getTransformationMatrix(),
      );
      this.setState({
        rotationHandleDragPoint: centerPoint,
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
  }

  /**
   * Update transforms when dragging
   */
  onMouseMove(event) {
    if (!this.state.draggingOffset && !this.state.rotationHandleDragPoint && !this.state.scaleHandleDragPoint) {
      return;
    }

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
    if (this.state.rotationHandleDragPoint) {
      const angle = angleBetween(this.state.rotationHandleDragPoint, viewBoxPoint);
      this.setState({
        rotation: angle,
      });
    }

    // Calculate scale
    if (this.state.scaleHandleDragPoint) {
      this.setState({
        scaleHandleDragPoint: viewBoxPoint,
        scale: {
          // TODO this is wrong
          // Option 1: un-transform clicked point, but keep translation
          x: this.state.scale.x + (viewBoxPoint.x - this.state.scaleHandleDragPoint.x) / INITIAL_RECT.width,
          y: this.state.scale.y + (viewBoxPoint.y - this.state.scaleHandleDragPoint.y) / INITIAL_RECT.height,
        },
      });
    }
  }

  onMouseUp() {
    this.setState({
      draggingOffset: null,
      rotationHandleDragPoint: null,
      scaleHandleDragPoint: null,
    });
  }

  /**
   * Using the translation, scale, and rotation props, create a combined
   * matrix representing an overall transform.
   * @returns {Matrix}
   */
  getTransformationMatrix() {
    // http://roccobalsamo.com/gfx/matrix.html
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

    // Width and height of bounding box after scale
    const { width, height } = getBoundingBox(
      INITIAL_RECT,
      scaleMatrix,
    );

    // To rotate about the center, must be translated to the origin, rotated,
    // and then translated back.
    const { rotation } = this.state;
    const rawRotationMatrix = math.matrix([
      [Math.cos(rotation), -Math.sin(rotation),  0],
      [Math.sin(rotation), Math.cos(rotation),  0],
      [0, 0, 1],
    ]);
    const centerToOriginMatrix = math.matrix([
      [1, 0,  -width / 2],
      [0, 1, -height / 2],
      [0, 0, 1],
    ]);
    const centerToOriginInverseMatrix = math.matrix([
      [1, 0,  width / 2],
      [0, 1, height / 2],
      [0, 0, 1],
    ]);
    const rotationMatrix = math.multiply(
      centerToOriginInverseMatrix,
      rawRotationMatrix,
      centerToOriginMatrix,
    );

    return math.multiply(
      translationMatrix,
      rotationMatrix,
      scaleMatrix,
    );
  }

  render() {
    const transformationMatrix = this.getTransformationMatrix();
    const transform = matrixToSvgTransform(transformationMatrix);

    // Apply transformation on rotation handle point
    // (Not on the actual SVG element, because don't want to scale the shape)
    const rotationHandlePoint = applyMatrixToPoint(
      INITIAL_ROTATION_HANDLE_POINT,
      transformationMatrix,
    );

    const boundingBox = getBoundingBox(
      INITIAL_RECT,
      transformationMatrix,
    );

    return (
      <svg
        viewBox={`0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`}
        onMouseDown={(event) => this.onMouseDown(event)}
        onMouseMove={(event) => this.onMouseMove(event)}
        onMouseUp={(event) => this.onMouseUp(event)}
        ref={this.svg}
      >
        <rect
          className="rect"
          width={INITIAL_RECT.width}
          height={INITIAL_RECT.height}
          transform={`matrix(${transform})`}
          ref={this.rect}
        />
        <rect
          className="scale-handle"
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          x={boundingBox.x + boundingBox.width}
          y={boundingBox.y + boundingBox.height}
          ref={this.scaleHandle}
        />
        <circle
          className="rotation-handle"
          r={HANDLE_SIZE / 2}
          cx={rotationHandlePoint.x}
          cy={rotationHandlePoint.y}
        />
      </svg>
    );
  }
}

export default Svg;
