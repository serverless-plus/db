const path = require('path')
const slsdb = require('./src/main')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

async function main() {
  const COSAsync = require('./src/adapters/COSAsync')
  const adapter = new COSAsync('serverless-db.json', {
    region: process.env.region,
    bucket: process.env.bucket,
    secretId: process.env.secretId,
    secretKey: process.env.secretKey
  })
  const db = await slsdb(adapter)

  // Set some defaults (required if your JSON file is empty)
  await db.defaults({ posts: [], user: {}, count: 0 }).write()

  // Add a post
  await db
    .get('posts')
    .push({ id: 1, title: 'lowdb is awesome' })
    .write()

  // Set a user using Lodash shorthand syntax
  await db.set('user.name', 'typicode').write()

  // Increment count
  await db.update('count', n => n + 1).write()

  // Get all posts
  await db.get('posts').value()
}

main()
