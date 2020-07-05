// Not using async/await on purpose to avoid adding regenerator-runtime
// to lowdb dependencies
const fs = require('graceful-fs')
const pify = require('pify')
const COS = require('cos-nodejs-sdk-v5')
const steno = require('steno')
const assert = require('assert')
const stringify = require('./_stringify')
const Base = require('./Base')
const readFile = pify(fs.readFile)
const writeFile = pify(steno.writeFile)

class CosAsync extends Base {
  constructor(
    source,
    {
      region,
      bucket,
      secretId,
      secretKey,
      defaultValue = {},
      serialize = stringify,
      deserialize = JSON.parse
    } = {}
  ) {
    super(source, {
      defaultValue,
      serialize,
      deserialize
    })

    this.source = source
    this.defaultValue = defaultValue
    this.serialize = serialize
    this.deserialize = deserialize

    assert(region, 'options.region is required')
    assert(bucket, 'options.bucket is required')
    assert(secretId, 'options.secretId is required')
    assert(secretKey, 'options.secretKey is required')

    this.region = region
    this.bucket = bucket
    this.filename = this.source

    this.cosClient = new COS({
      SecretId: secretId,
      SecretKey: secretKey
    })

    this.downloaded = false
  }
  async read() {
    // if not download, downloaded it
    if (!this.downloaded) {
      await this.download()
    }
    // fs.exists is deprecated but not fs.existsSync
    if (fs.existsSync(this.source)) {
      // Read database
      try {
        const data = await readFile(this.source, 'utf-8')
        // Handle blank file
        const trimmed = data.trim()
        return trimmed ? this.deserialize(trimmed) : this.defaultValue
      } catch (e) {
        if (e instanceof SyntaxError) {
          e.message = `Malformed JSON in file: ${this.source}\n${e.message}`
        }
        throw e
      }
    } else {
      // Initialize
      await writeFile(this.source, this.serialize(this.defaultValue))
      return this.defaultValue
    }
  }

  async write(data) {
    await writeFile(this.source, this.serialize(data))
    await this.upload()
  }

  async objectExist() {
    return new Promise((resolve, reject) => {
      this.cosClient.headObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: this.filename
        },
        (err, res) => {
          if (err) {
            reject(err)
          }
          resolve(res)
        }
      )
    })
  }

  async download() {
    try {
      // clean local file cache
      fs.unlinkSync(this.filename)
      await this.objectExist()
      return new Promise((resolve, reject) => {
        this.cosClient.getObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: this.filename,
            Output: this.source
          },
          (_, res) => {
            resolve(res)
            this.downloaded = true
          }
        )
      })
    } catch (e) {
      // no op
    }
  }

  async upload() {
    return new Promise((resolve, reject) => {
      this.cosClient.putObject(
        {
          Bucket: this.bucket,
          Region: this.region,
          Key: this.filename,
          StorageClass: 'STANDARD',
          Body: fs.createReadStream(this.source)
        },
        (err, res) => {
          if (err) {
            reject(err)
          }

          resolve(res)
        }
      )
    })
  }

  async clean() {
    try {
      fs.unlinkSync(this.source)
      return new Promise((resolve, reject) => {
        this.cosClient.deleteObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: this.filename
          },
          (err, res) => {
            if (err) {
              reject(err)
            }

            resolve(res)
          }
        )
      })
    } catch (e) {
      // no op
    }
  }
}

module.exports = CosAsync
