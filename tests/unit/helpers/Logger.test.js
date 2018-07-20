/* eslint-disable semi */
const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
//import chai from 'chai'
//import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
let should = chai.should()

console.log("SHOULD=")
//console.log(should)

//let assert = chai.assert;
//let expect = chai.expect;
//let should = chai.should;
//console.log('type of should is', typeof should);


describe('Logger', () => {
  it('should return a Winston logger', () => {
    let Logger = require('./../../../api/helpers/Logger')

    console.log("LOGGER=")
    //console.log(Logger)
    console.log('type of Logger=', typeof Logger);

    console.log("LOGGER.should=")
    console.log(Logger.should)

    return Logger.should.be.an('object')
  })
})
