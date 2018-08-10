/* eslint-disable semi */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)
let should = chai.should()

describe('Logger', () => {
  it('should return a Winston logger', () => {
    let Logger = require('../../../api/helpers/Logger')

    expect(typeof Logger).toBe('object');
    expect(Logger.levels).toHaveProperty('info');
  })
})
