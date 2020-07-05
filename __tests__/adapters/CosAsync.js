const path = require('path')
const sinon = require('sinon')
const COSAsync = require('../../src/adapters/CosAsync')
require('dotenv').config({ path: path.join(__dirname, '../..', '.env') })

const obj = { a: 1 }
const credentials = {
  region: process.env.region,
  bucket: process.env.bucket,
  secretId: process.env.secretId,
  secretKey: process.env.secretKey
}
const testFile = 'serverless-db-test.json'

describe('COSAsync', () => {
  it('should read and write', async () => {
    const file = new COSAsync(testFile, credentials)

    expect(await file.read()).toEqual({})

    await file.write(obj)
    expect(await file.read()).toEqual(obj)

    // clean
    await file.clean()
  })

  it('should support options', async () => {
    const serialize = sinon.spy(JSON.stringify)
    const deserialize = sinon.spy(JSON.parse)

    const file = new COSAsync(testFile, {
      serialize,
      deserialize,
      ...credentials
    })

    await file.read() // The first time, an empty file is created and deserialize doesn't need to called
    await file.write(obj)
    const res = await file.read() // to ensure, deserialize is called, we call file.read() a second time

    expect(res).toEqual(obj)
    expect(serialize.calledWith(obj)).toBeTruthy()
    expect(deserialize.calledOnce).toBeTruthy()
    // clean
    await file.clean()
  })
})
