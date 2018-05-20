import React, { Component } from 'react';
import math from 'mathjs';
import './Svg.css';
import {
  angleBetween,
  applyMatrixToPoint,
  getBoundingBox,
  getTransformationMatrix,
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
      translationDragPoint: null, // Point to measure translation from during drag
      rotationHandleDragPoint: null, // Point to measure rotation from during drag
      scaleHandleDragPoint: null, // Point to measure scaling from during drag
      translation: {
        x: 0,
        y: 0,
      },
      rotation: 0.0,
      scale: {
        x: 1,
        y: 1,
      },
    };
  }

  /**
   * Convert from raw browser coordinates to SVG viewbox coordinates/
   * @param {Point} browserPoint
   * @param {Rect} container the svg element itself
   * @returns {Point}
   */
  static browserCoordsToViewBox(browserPoint, container) {
    return {
      x: VIEW_BOX_WIDTH * browserPoint.x / container.width,
      y: VIEW_BOX_HEIGHT * browserPoint.y / container.height,
    };
  }

  /**
   * Convert from a rect in browser coordinates to one in viewbox coordinates
   * @param {Rect} rect
   * @param {Rect} container the svg element itself
   * @returns {Rect}
   */
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
      // Scale will be calculated based on the distance from the click on the
      // scale handle to the new mouse position.
      this.setState({
        scaleHandleDragPoint: {
          x: viewBoxPoint.x,
          y: viewBoxPoint.y,
        },
      });
      return;
    }

    // If on the rotate handle
    const transformationMatrix = getTransformationMatrix(
      this.state.translation,
      this.state.rotation,
      this.state.scale,
      INITIAL_RECT,
    );
    const rotationHandlePoint = applyMatrixToPoint(
      INITIAL_ROTATION_HANDLE_POINT,
      transformationMatrix,
    );
    const viewBoxRotateHandle = {
      x: rotationHandlePoint.x,
      y: rotationHandlePoint.y,
      width: HANDLE_SIZE,
      height: HANDLE_SIZE,
    };
    if (isHit(viewBoxRotateHandle, viewBoxPoint)) {
      // Angle of rotation will need to be measured from the midpoint of the
      // rect at the time of dragging.
      const centerPoint = applyMatrixToPoint(
        {
          x: INITIAL_RECT.width / 2,
          y: INITIAL_RECT.height / 2,
        },
        transformationMatrix,
      );
      this.setState({
        rotationHandleDragPoint: centerPoint,
      });
      return;
    }

    // If click happened on the rect
    if (isHit(viewBoxRect, viewBoxPoint)) {
      // Translation will be calculated based on previous position.
      this.setState({
        translationDragPoint: {
          x: this.state.translation.x - viewBoxPoint.x,
          y: this.state.translation.y - viewBoxPoint.y,
        },
      });
      return;
    }
  }

  /**
   * Update transforms when dragging
   * @param {Event} event
   */
  onMouseMove(event) {
    if (!this.state.translationDragPoint && !this.state.rotationHandleDragPoint && !this.state.scaleHandleDragPoint) {
      return;
    }

    // Calculate viewbox coords of event
    const container = this.svg.current.getBoundingClientRect();
    const viewBoxPoint = Svg.browserCoordsToViewBox({
      x: event.clientX,
      y: event.clientY,
    }, container);

    // Calculate translate
    if (this.state.translationDragPoint) {
      this.setState({
        translation: {
          x: viewBoxPoint.x + this.state.translationDragPoint.x,
          y: viewBoxPoint.y + this.state.translationDragPoint.y,
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
          x: this.state.scale.x + (viewBoxPoint.x - this.state.scaleHandleDragPoint.x) / INITIAL_RECT.width,
          y: this.state.scale.y + (viewBoxPoint.y - this.state.scaleHandleDragPoint.y) / INITIAL_RECT.height,
        },
      });
    }
  }

  /**
   * Stop any drag
   */
  onMouseUp() {
    this.setState({
      translationDragPoint: null,
      rotationHandleDragPoint: null,
      scaleHandleDragPoint: null,
    });
  }

  render() {
    const transformationMatrix = getTransformationMatrix(
      this.state.translation,
      this.state.rotation,
      this.state.scale,
      INITIAL_RECT,
    );
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
