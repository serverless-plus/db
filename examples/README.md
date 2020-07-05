# Examples

## CLI

```js
const low = require('@slsplus/db');
const COSAsync = require('@slsplus/db/adapters/COSAsync');

const adapter = new COSAsync('serverless-db.json');
const db = await low(adapter);

await db.defaults({ posts: [] }).write();

const result = await db
  .get('posts')
  .push({ title: process.argv[2] })
  .write();

console.log(result);
```

```sh
$ node cli.js hello
# [ { title: 'hello' } ]
```

## Server

Please **note** that if you're developing a local server and don't expect to get
concurrent requests, it's often easier to use `file-sync` storage, which is the
default.

But if you need to avoid blocking requests, you can do so by using `file-async`
storage.

```js
const express = require('express');
const bodyParser = require('body-parser');
const low = require('@slsplus/db');
const COSAsync = require('@slsplus/db/adapters/COSAsync');

// Create server
const app = express();
app.use(bodyParser.json());

// Create database instance and start server
async function startServer() {
  const adapter = new COSAsync('db.json');
  const db = await low(adapter);
  // Routes
  // GET /posts/:id
  app.get('/posts/:id', async (req, res) => {
    const post = db
      .get('posts')
      .find({ id: req.params.id })
      .value();

    res.send(post);
  });

  // POST /posts
  app.post('/posts', (req, res) => {
    db.get('posts')
      .push(req.body)
      .last()
      .assign({ id: Date.now().toString() })
      .write()
      .then((post) => res.send(post));
  });

  // Set db default values
  await db.defaults({ posts: [] }).write();

  app.listen(3000, () => console.log('listening on port 3000'));
}

startServer();
```

## In-memory

With this adapter, calling `write` will do nothing. One use case for this
adapter can be for tests.

```js
const fs = require('fs');
const low = require('@slsplus/db');
const Memory = require('@slsplus/db/adapters/Memory');

const db = low(new Memory());

db.defaults({ posts: [] }).write();

db.get('posts')
  .push({ title: 'lowdb' })
  .write();
```
