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
