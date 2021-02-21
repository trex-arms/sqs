import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import instantiate_sqs from './index.mjs'

const aws_sqs_auth = {
	region: `us-east-2`,
	access_key_id: ``,
	secret_access_key: ``,
}

const test = suite(`SQS`)

test(`create_queue, get_queue_url, delete_queue, error parsing`, async() => {
	const sqs = instantiate_sqs(aws_sqs_auth)

	const test_queue_name = `test_automated_queue`

	const result_of_create = await sqs.create_queue(test_queue_name, {
		message_retention_period: 1209600,
	})

	assert.type(result_of_create, `string`)
	assert.ok(result_of_create.startsWith(`https://`), `result is a url`)

	const result_of_get_queue_url = await sqs.get_queue_url(test_queue_name)

	assert.type(result_of_create, `string`)
	assert.is(result_of_get_queue_url, result_of_create)

	await sqs.delete_queue(result_of_get_queue_url)

	try {
		await sqs.get_queue_url(test_queue_name)
		assert.unreachable(`Should throw an error`)
	} catch (err) {
		assert.ok(err.message.includes(`AWS.SimpleQueueService.NonExistentQueue`))
		assert.is(err.code, `AWS.SimpleQueueService.NonExistentQueue`)
	}
})

test(`send, receive`, async() => {
	const sqs = instantiate_sqs(aws_sqs_auth)

	const queue_url = await sqs.create_queue(`test_automated_read_write`)

	const message_body = { test: `yes`, number: 2 }

	const result_of_send = await sqs.send_message(queue_url, message_body)

	assert.type(result_of_send.message_id, `string`)
	assert.type(result_of_send.md5_of_body, `string`)

	const [ result_of_receive ] = await sqs.receive_message(queue_url, { wait_time_seconds: 10 })

	assert.type(result_of_receive.receipt_handle, `string`)

	assert.is(result_of_send.message_id, result_of_receive.message_id)
	assert.is(result_of_send.md5_of_body, result_of_receive.md5_of_body)

	assert.equal(result_of_receive.body, message_body)

	await sqs.delete_message(queue_url, result_of_receive.receipt_handle)

	await sqs.delete_queue(queue_url)
})

test(`send_message_batch`, async() => {
	const sqs = instantiate_sqs(aws_sqs_auth)

	const queue_url = await sqs.create_queue(`test_send_message_batch`)

	const result_of_send = await sqs.send_message_batch(queue_url, [{
		number: 1,
	}, {
		number: 2,
	}, {
		number: 3,
	}])

	assert.is(result_of_send.length, 3)

	await sqs.delete_queue(queue_url)
})

test.run()
