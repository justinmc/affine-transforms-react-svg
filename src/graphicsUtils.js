import math from 'mathjs';

/**
 * Return the angle between the two points, in radians.
 * @param {Point} pointA
 * @param {Point} pointB
 * @returns {Number}
 */
export function angleBetween(pointA, pointB) {
  return Math.atan2(pointB.y - pointA.y, pointB.x - pointA.x);
}

export function matrixToSvgTransform(matrix) {
  const { _data } = matrix;
  return `${_data[0][0]} ${_data[1][0]} ${_data[0][1]} ${_data[1][1]} ${_data[0][2]} ${_data[1][2]}`;
}

export function isHit(rect, point) {
  if (point.x < rect.x) {
    return false;
  }
  if (point.y < rect.y) {
    return false;
  }
  if (point.x > rect.x + rect.width) {
    return false;
  }
  if (point.y > rect.y + rect.height) {
    return false;
  }
  return true;
};

/**
 * Return the axis aligned bounding box of the rect after the transformation is
 * applied.
 * @param {Rect} rect
 * @param {Matrix} transformationMatrix
 * @returns {Rect}
 */
export function getBoundingBox(rect, transformationMatrix) {
  const points = [];
  points.push(applyMatrixToPoint(
    { x: rect.x, y: rect.y },
    transformationMatrix,
  ));
  points.push(applyMatrixToPoint(
    { x: rect.x + rect.width, y: rect.y },
    transformationMatrix,
  ));
  points.push(applyMatrixToPoint(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    transformationMatrix,
  ));
  points.push(applyMatrixToPoint(
    { x: rect.x, y: rect.y + rect.height },
    transformationMatrix,
  ));

  const xMin = points.reduce((lowestX, point) => {
    if (point.x < lowestX) {
      return point.x;
    }
    return lowestX;
  }, Infinity);
  const yMin = points.reduce((lowestY, point) => {
    if (point.y < lowestY) {
      return point.y;
    }
    return lowestY;
  }, Infinity);
  const xMax = points.reduce((highestX, point) => {
    if (point.x > highestX) {
      return point.x;
    }
    return highestX;
  }, -Infinity);
  const yMax = points.reduce((highestY, point) => {
    if (point.y > highestY) {
      return point.y;
    }
    return highestY;
  }, -Infinity);

  return {
    x: xMin,
    y: yMin,
    width: xMax - xMin,
    height: yMax - yMin,
  };
}

/**
 * @param {Point} point
 * @param {Matrix} transformationMatrix
 * @returns {Point}
 */
export function applyMatrixToPoint(point, transformationMatrix) {
  const pointMatrix = math.matrix([
    point.x,
    point.y,
    1,
  ]);
  const transformedPointMatrix = math.multiply(
    transformationMatrix,
    pointMatrix,
  );
  return {
    x: transformedPointMatrix._data[0],
    y: transformedPointMatrix._data[1],
  };
}

/**
 * From translation, rotation, and scale, create a combined matrix representing
 * an overall transform
 * @param {Point} translation
 * @param {Number} rotation
 * @param {Point} scale
 * @param {Rect} rect initial rect before transformation
 * @returns {Matrix}
 */
export function getTransformationMatrix(translation, rotation, scale, rect) {
  // http://roccobalsamo.com/gfx/matrix.html
  const translationMatrix = math.matrix([
    [1, 0, translation.x],
    [0, 1, translation.y],
    [0, 0, 1],
  ]);
  const scaleMatrix = math.matrix([
    [scale.x, 0, 0],
    [0, scale.y, 0],
    [0, 0, 1],
  ]);

  // Width and height of bounding box after scale
  const { width, height } = getBoundingBox(
    rect,
    scaleMatrix,
  );

  // To rotate about the center, must be translated to the origin, rotated,
  // and then translated back.
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
