# @slsplus/db

Serverless JSON database using
[COS(Cloud Object Storage)](https://cloud.tencent.com/product/cos), forked by
[lowdb](https://github.com/typicode/lowdb)

## Usage

```sh
npm install @slsplus/db --save
```

```js
const slsdb = require('@slsplus/db');

const COSAsync = require('@slsplus/db/adapters/COSAsync');
const adapter = new COSAsync('serverless-db.json', {
  region: 'COS region',
  bucket: 'COS bucket name with appid',
  secretId: 'COS SecretId',
  secretKey: 'COS SecretKey',
});
const db = await slsdb(adapter);

// Set some defaults (required if your JSON file is empty)
await db.defaults({ posts: [], user: {}, count: 0 }).write();

// Add a post
await db
  .get('posts')
  .push({ id: 1, title: 'lowdb is awesome' })
  .write();

// Set a user using Lodash shorthand syntax
await db.set('user.name', 'typicode').write();

// Increment count
await db.update('count', (n) => n + 1).write();

// Get all posts
await db.get('posts').value();
```

Data is saved to `serverless-db.json` in `COS`

```json
{
  "posts": [{ "id": 1, "title": "lowdb is awesome" }],
  "user": {
    "name": "typicode"
  },
  "count": 1
}
```

You can use any of the powerful [lodash](https://lodash.com/docs) functions,
like [`_.get`](https://lodash.com/docs#get) and
[`_.find`](https://lodash.com/docs#find) with shorthand syntax.

```js
// For performance, use .value() instead of .write() if you're only reading from db
await db
  .get('posts')
  .find({ id: 1 })
  .value();
```

It only supports **Node** and uses **lodash API**, so it's very simple to learn.
Actually, if you know Lodash, you already know how to use lowdb :wink:

## **Important**

> - Because `@slsplus/db` interacts with cloud, so it's suggested to call
>   `write()` method(save data to cloud), after all database operations.
> - `@slsplus/db` doesn't support Cluster and may have issues with very large
>   JSON files (~200MB).

## Install

```sh
npm install @slsplus/db --save
```

Alternatively, if you're using [yarn](https://yarnpkg.com/)

```sh
yarn add @slsplus/db
```

A UMD build is also available on unpkg for testing and quick prototyping:

```html
<script src="https://unpkg.com/lodash/lodash.min.js"></script>
<script src="https://unpkg.com/@slsplus/db/dist/slsdb.min.js"></script>
<script src="https://unpkg.com/@slsplus/db/dist/LocalStorage.min.js"></script>
<script>
  var adapter = new LocalStorage('db')
  var db = low(adapter)
</script>
```

## API

**low(adapter)**

Returns a lodash [chain](https://lodash.com/docs/4.17.4#chain) with additional
properties and functions described below.

**db.[...].write()** and **db.[...].value()**

`write()` writes database to state.

On the other hand, `value()` is just
[\_.prototype.value()](https://lodash.com/docs/4.17.4#prototype-value) and
should be used to execute a chain that doesn't change database state.

```js
await db.set('user.name', 'yugasun').write();
```

Please note that `db.[...].write()` is syntactic sugar and equivalent to

```js
await db.set('user.name', 'yugasun').value();

await db.write();
```

**db.\_**

Database lodash instance. Use it to add your own utility functions or
third-party mixins like
[underscore-contrib](https://github.com/documentcloud/underscore-contrib) or
[lodash-id](https://github.com/typicode/lodash-id).

```js
db._.mixin({
  second: function(array) {
    return array[1];
  },
});

db.get('posts')
  .second()
  .value();
```

**db.getState()**

Returns database state.

```js
db.getState(); // { posts: [ ... ] }
```

**db.setState(newState)**

Replaces database state.

```js
const newState = {};
db.setState(newState);
```

**db.write()**

Persists database using `adapter.write`, it will write data to a JSON file, and
upload to COS.

```js
db.write().then(() => console.log('State has been saved'));
```

**db.read()**

Reads source using `storage.read` option, it will download a JSON file from COS,
and read data from it.

```js
db.read().then(() => console.log('State has been updated'));
```

## Adapters API

Please note this only applies to adapters bundled with Lowdb. Third-party
adapters may have different options.

For convenience, `COSAsync` accept the following options:

- **defaultValue** if file doesn't exist, this value will be used to set the
  initial state (default: `{}`)
- **serialize/deserialize** functions used before writing and after reading
  (default: `JSON.stringify` and `JSON.parse`)

```js
const adapter = new COSAsync('array.yaml', {
  region: 'COS region',
  bucket: 'COS bucket name with appid',
  secretId: 'COS SecretId',
  secretKey: 'COS SecretKey',
  defaultValue: [],
  serialize: (array) => toYamlString(array),
  deserialize: (string) => fromYamlString(string),
});
```

## Guide

### Examples

Check if posts exists.

```js
db.has('posts').value();
```

Set posts.

```js
db.set('posts', []).write();
```

Sort the top five posts.

```js
db.get('posts')
  .filter({ published: true })
  .sortBy('views')
  .take(5)
  .value();
```

Get post titles.

```js
db.get('posts')
  .map('title')
  .value();
```

Get the number of posts.

```js
db.get('posts')
  .size()
  .value();
```

Get the title of first post using a path.

```js
db.get('posts[0].title').value();
```

Update a post.

```js
db.get('posts')
  .find({ title: 'low!' })
  .assign({ title: 'hi!' })
  .write();
```

Remove posts.

```js
db.get('posts')
  .remove({ title: 'low!' })
  .write();
```

Remove a property.

```js
db.unset('user.name').write();
```

Make a deep clone of posts.

```js
db.get('posts')
  .cloneDeep()
  .value();
```

### How to use id based resources

Being able to get data using an id can be quite useful, particularly in servers.
To add id-based resources support to lowdb, you have 2 options.

[shortid](https://github.com/dylang/shortid) is more minimalist and returns a
unique id that you can use when creating resources.

```js
const shortid = require('shortid');

const postId = await db
  .get('posts')
  .push({ id: shortid.generate(), title: 'low!' })
  .write().id;

const post = await db
  .get('posts')
  .find({ id: postId })
  .value();
```

[lodash-id](https://github.com/typicode/lodash-id) provides a set of helpers for
creating and manipulating id-based resources.

```js
const lodashId = require('lodash-id');
const COSAsync = require('@slsplus/db/adapters/COSAsync');

const adapter = new COSAsync('serverless-db.json', {
  region: 'COS region',
  bucket: 'COS bucket name with appid',
  secretId: 'COS SecretId',
  secretKey: 'COS SecretKey',
});
const db = await low(adapter);

db._.mixin(lodashId);

// We need to set some default values, if the collection does not exist yet
// We also can store our collection
const collection = db.defaults({ posts: [] }).get('posts');

// Insert a new post...
const newPost = collection.insert({ title: 'low!' }).write();

// ...and retrieve it using its id
const post = collection.getById(newPost.id).value();
```

### How to encrypt data

`COSAsync`, `FileAsync` and `LocalStorage` accept custom `serialize` and
`deserialize` functions. You can use them to add encryption logic.

```js
const adapter = new COSAsync('serverless-db.json', {
  region: 'COS region',
  bucket: 'COS bucket name with appid',
  secretId: 'COS SecretId',
  secretKey: 'COS SecretKey',
  serialize: (data) => encrypt(JSON.stringify(data)),
  deserialize: (data) => JSON.parse(decrypt(data)),
});
```

## Limits

`@slsplus/db` is a convenient method for storing data without setting up a
database server. It is fast enough and safe to be used as an embedded database.

However, if you seek high performance and scalability more than simplicity, you
should probably stick to traditional databases like MongoDB.

## License

MIT
