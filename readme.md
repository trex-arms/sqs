Talk to the SQS API from node or browsers/Cloudflare Workers.

## API

All the code is .mjs, so you'll probably need node 14+.

A single function is exported.  Pass in your credentials, get back an object with a bunch of functions.

```js
import make_sqs from '@trex-arms/sqs'

const sqs = make_sqs({
	access_key_id: process.env.AWS_ACCESS_KEY_ID,
	secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
	region: 'us-west-1',
})

sqs.create_queue('roflcopter', {
	message_retention_period: 1209600,
}).then(queue_url => {
	console.log('the queue url is', queue_url)
})
```

All API functions return a promise.

Functions on the `sqs` object:

- `create_queue(name, attributes = {})`
	- returns queue url (string)
- `get_queue_url(queue_name)`
	- returns queue url (string)
- `get_queue_attributes(queue_url, attribute_names = [])`
	- returns attributes (object)
- `delete_queue(queue_url)`
- `send_message(queue_url, message, { delay_seconds, message_attribute = {} } = {})`
	- returns `{ message_id, md5_of_body }`
- `send_message_batch(queue_url, messages)`
	- returns an array of `{ message_id, md5_of_body }`
- `receive_message(queue_url, { max_number_of_messages, visibility_timeout, wait_time_seconds, attribute_names = [] } = {})`
	- returns `{ body, message_id, md5_of_body, receipt_handle, attributes }`
- `delete_message(queue_url, receipt_handle)`

Attribute objects are expected to have `snake_case` properties.

## To run the tests

Paste your credentials into the strings at the top of the [index.test.mjs](./index.test.mjs) file.

Then

```sh
npm t
```
