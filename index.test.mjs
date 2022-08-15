import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import instantiate_sqs from './index.mjs'

const region = `us-east-2`
const account_id = ``

const aws_sqs_auth = {
	region,
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

test(`get_queue_redrive_policy not null`, async() => {
	const sqs = instantiate_sqs(aws_sqs_auth)

	const dlq_name = `test_automated_dead_letter_queue`
	const dlq_arn = `arn:aws:sqs:${ region }:${ account_id }:${dlq_name}`
	const dlq_url = await sqs.create_queue(dlq_name)

	const queue_url = await sqs.create_queue(`test_automated_queue_redrive_policy`, { redrive_policy: JSON.stringify({ deadLetterTargetArn: dlq_arn, maxReceiveCount: 2 }) })

	const redrive_policy = await sqs.get_queue_redrive_policy(queue_url)

	assert.ok(redrive_policy)
	assert.type(redrive_policy.dead_letter_target_arn, `string`)
	assert.equal(redrive_policy.dead_letter_target_arn, dlq_arn)
	assert.type(redrive_policy.max_receive_count, `number`)
	assert.equal(redrive_policy.max_receive_count, 2)

	await sqs.delete_queue(queue_url)
	await sqs.delete_queue(dlq_url)
})

test(`get_queue_redrive_policy null`, async() => {
	const sqs = instantiate_sqs(aws_sqs_auth)

	const queue_url = await sqs.create_queue(`test_automated_queue_no_redrive_policy`)

	const redrive_policy = await sqs.get_queue_redrive_policy(queue_url)

	assert.not(redrive_policy)

	await sqs.delete_queue(queue_url)
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
	assert.type(result_of_receive.approximate_receive_count, `number`)

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
