/**
 * Open source luhn-algorithm from https://simplycalc.com/luhn-source.php
 * with modifications.
 */

/**
 * luhnChecksum
 * Implement the Luhn algorithm to calculate the Luhn check digit.
 * Return the check digit.
 */
const luhnChecksum = (num) => {
  const arr = (`${num}`)
    .split('')
    .reverse()
    .map((x) => parseInt(x, 10));
  const lastDigit = arr.splice(0, 1)[0];
  let sum = arr.reduce(
    (acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9),
    0,
  );
  sum += lastDigit;
  return sum % 10;
};

/**
 * luhnCalculate
 * Return a full code (including check digit), from the specified partial code
 * (without check digit).
 */
const luhnCalculate = (partcode) => {
  const checksum = luhnChecksum(`${partcode}0`);
  const checkDigit = checksum === 0 ? 0 : 10 - checksum;
  return `${partcode}${checkDigit}`;
};

/**
 * luhnValidate
 * Return true if specified code (with check digit) is valid.
 */
const luhnValidate = (fullcode) => luhnChecksum(fullcode) === 0;

module.exports = {
  calculate: luhnCalculate,
  checksum: luhnChecksum,
  validate: luhnValidate,
};
