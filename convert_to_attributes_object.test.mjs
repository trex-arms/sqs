import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import { convert_to_attributes_object, generic_attributes_builder } from './convert_to_attributes_object.mjs'

const test = suite(`convert_to_attributes_object`)

test(`Empty object becomes an empty object`, async() => {
	const output = convert_to_attributes_object({})
	assert.equal(output, {})
})

test(`Two attributes`, async() => {
	const output = convert_to_attributes_object({
		fancy: `pants`,
		foo: `bar`,
	})
	assert.equal(output, {
		'Attribute.1.Name': `Fancy`,
		'Attribute.1.Value': `pants`,
		'Attribute.2.Name': `Foo`,
		'Attribute.2.Value': `bar`,
	})
})

test(`Custom attribute name name`, async() => {
	const output = convert_to_attributes_object({
		fancy: `pants`,
	}, { name: `MessageAttribute` })

	assert.equal(output, {
		'MessageAttribute.1.Name': `Fancy`,
		'MessageAttribute.1.Value': `pants`,
	})
})

test(`Specify attribute type`, async() => {
	const output = convert_to_attributes_object({
		fancy: `pants`,
		foo: 13,
	}, { type: true })

	assert.equal(output, {
		'Attribute.1.Name': `Fancy`,
		'Attribute.1.Value': `pants`,
		'Attribute.1.Type': `String`,
		'Attribute.2.Name': `Foo`,
		'Attribute.2.Value': 13,
		'Attribute.2.Type': `Number`,
	})
})

test(`generic attributes builder`, () => {
	const output = generic_attributes_builder([
		{ Id: `test_msg_001`, MessageBody: `test message body 1` },
		{ Id: `test_msg_002`, MessageBody: `test message body 2`, DelaySeconds: `60` },
	], { name: `SendMessageBatchRequestEntry` })

	assert.equal(output, {
		'SendMessageBatchRequestEntry.1.Id': `test_msg_001`,
		'SendMessageBatchRequestEntry.1.MessageBody': `test message body 1`,
		'SendMessageBatchRequestEntry.2.Id': `test_msg_002`,
		'SendMessageBatchRequestEntry.2.MessageBody': `test message body 2`,
		'SendMessageBatchRequestEntry.2.DelaySeconds': `60`,
	})
})

test.run()
