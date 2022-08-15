// unexpected things about the SQS API:
// 1. even though the documentation describes the proper way to make
// GET and POST requests, every one of the 20 current actions
// happens via POST
// 2. unlike other AWS services, and even though this is not stated
// in the documentation, the body of each request *must* be
// form-urlencoded

import { post } from 'httpie'
import { createAwsSigner as create_aws_signer } from 'sign-aws-requests'
import parse_xml from '@rgrove/parse-xml'

import { convert_to_attributes_object, generic_attributes_builder } from './convert_to_attributes_object.mjs'
import catchify from './catchify.mjs'

const form_urlencode = value => encodeURIComponent(value).replace(/%20/g, `+`)

const make_form_lines_from_object = obj => Object.entries(obj).filter(
	([ , value ]) => value !== undefined,
).map(
	([ key, value ]) => `${ key }=${ form_urlencode(value) }`,
)
const elements_with_name = (elements, target_name) => elements.filter(
	({ type, name }) => type === `element` && name === target_name,
)
const drill_down_to_children = (response_element, next_target_name, ...rest_of_target_names) => {
	const nextChildren = elements_with_name(response_element.children, next_target_name)

	return rest_of_target_names.length
		? drill_down_to_children(nextChildren[0], ...rest_of_target_names)
		: nextChildren
}
const concat_text = element => element.children.filter(({ type }) => type === `text`).map(({ text }) => text).join(``)
const read_text_from_descendant = (response_element, ...rest_of_target_names) => concat_text(
	drill_down_to_children(response_element, ...rest_of_target_names)[0],
)
const read_text_from_attribute_value = (element, attribute_name) => {
	const attribute = elements_with_name(element.children, `Attribute`)
		.find(attribute => read_text_from_descendant(attribute, `Name`) === attribute_name)

	return attribute ? read_text_from_descendant(attribute, 'Value') : null
}

const get_urlencoded_params = params => [
	...make_form_lines_from_object(params),
	`Version=2012-11-05`,
].join(`&`)

const parse_xml_or_throw = hopefully_xml => {
	try {
		return parse_xml(hopefully_xml)
	} catch (err) {
		throw new Error(`Error parsing XML "${ hopefully_xml }"`)
	}
}

const get_response_text = async response => {
	if (response.text) {
		// this works in browsers/Workers
		return await response.text()
	} else {
		// this works in node via httpie
		return response.data
	}
}

const sign_and_request = async({ sign, host, url, body }) => {
	const body_string = get_urlencoded_params(body)

	const headers = {
		'content-type': `application/x-www-form-urlencoded`,
		host,
	}

	const { authorization } = await sign({
		url,
		method: `POST`,
		headers,
		body: body_string,
	})

	const [ failed_response, successful_response ] = await catchify(post(url, {
		headers: {
			...headers,
			authorization,
		},
		body: body_string,
	}))

	if (successful_response) {
		return parse_xml_or_throw(await get_response_text(successful_response))
	} else {
		let error_element
		try {
			error_element = drill_down_to_children(parse_xml_or_throw(await get_response_text(failed_response)), `ErrorResponse`, `Error`)[0]
		} catch (_) {
			throw new Error(`AWS error.  HTTP status ${ failed_response.statusCode } (${ failed_response.statusMessage })\n${ failed_response.data }`)
		}


		const type = read_text_from_descendant(error_element, `Type`)
		const code = read_text_from_descendant(error_element, `Code`)
		const message = read_text_from_descendant(error_element, `Message`)

		const error = new Error(`AWS error. type: "${ type }", code: "${ code }", message: "${ message }"`)
		error.code = code

		throw error
	}
}

export default ({ access_key_id, secret_access_key, region }) => {
	const host = `sqs.${ region }.amazonaws.com`
	const root_url = `https://${ host }`

	const sign = create_aws_signer({
		config: {
			service: `sqs`,
			region,
			secretAccessKey: secret_access_key,
			accessKeyId: access_key_id,
		},
	})

	const request = (url, body) => sign_and_request({ sign, host, url, body })

	return {
		create_queue: (name, attributes = {}) => request(root_url, {
			Action: `CreateQueue`,
			QueueName: name,
			...convert_to_attributes_object(attributes),
		}).then(
			response => read_text_from_descendant(
				response,
				`CreateQueueResponse`,
				`CreateQueueResult`,
				`QueueUrl`,
			),
		),
		get_queue_url: queue_name => request(root_url, {
			Action: `GetQueueUrl`,
			QueueName: queue_name,
		}).then(
			response => read_text_from_descendant(
				response,
				`GetQueueUrlResponse`,
				`GetQueueUrlResult`,
				`QueueUrl`,
			),
		),
		get_queue_redrive_policy: queue_url => request(queue_url, {
			Action: `GetQueueAttributes`,
			'AttributeName.1': `RedrivePolicy`
		}).then(
			response => {
				const redrive_policy = JSON.parse(read_text_from_attribute_value(
					drill_down_to_children(
						response,
						`GetQueueAttributesResponse`,
						`GetQueueAttributesResult`,
					)[0],
					`RedrivePolicy`
				))
				return redrive_policy && {
					dead_letter_target_arn: redrive_policy.deadLetterTargetArn,
					max_receive_count: redrive_policy.maxReceiveCount
				}
			},
		),
		delete_queue: queue_url => request(queue_url, {
			Action: `DeleteQueue`,
		}),
		send_message: (queue_url, message, { delay_seconds, message_attribute = {} } = {}) => request(queue_url, {
			Action: `SendMessage`,
			MessageBody: JSON.stringify(message),
			DelaySeconds: delay_seconds,
			...convert_to_attributes_object(message_attribute, { name: `MessageAttribute`, type: true }),
		}).then(
			response => ({
				message_id: read_text_from_descendant(
					response,
					`SendMessageResponse`,
					`SendMessageResult`,
					`MessageId`,
				),
				md5_of_body: read_text_from_descendant(
					response,
					`SendMessageResponse`,
					`SendMessageResult`,
					`MD5OfMessageBody`,
				),
			}),
		),
		send_message_batch: (queue_url, messages) => request(queue_url, {
			Action: `SendMessageBatch`,
			...generic_attributes_builder(
				messages.map((message, i) => ({
					Id: `message_${ i }`,
					MessageBody: JSON.stringify(message),
				})),
				{
					name: `SendMessageBatchRequestEntry`,
				},
			),
		}).then(
			response => drill_down_to_children(
				response,
				`SendMessageBatchResponse`,
				`SendMessageBatchResult`,
			)[0].children.map(result_entry => ({
				message_id: read_text_from_descendant(result_entry, `MessageId`),
				md5_of_body: read_text_from_descendant(result_entry, `MD5OfMessageBody`),
			})),
		),
		receive_message: (queue_url, { max_number_of_messages, visibility_timeout, wait_time_seconds } = {}) => request(queue_url, {
			Action: `ReceiveMessage`,
			MaxNumberOfMessages: max_number_of_messages,
			VisibilityTimeout: visibility_timeout,
			WaitTimeSeconds: wait_time_seconds,
			'AttributeName.1': `ApproximateReceiveCount`,
		}).then(
			response =>
				drill_down_to_children(
					response,
					`ReceiveMessageResponse`,
					`ReceiveMessageResult`,
					`Message`,
				).map(
					message => ({
						body: JSON.parse(read_text_from_descendant(message, `Body`)),
						message_id: read_text_from_descendant(message, `MessageId`),
						md5_of_body: read_text_from_descendant(message, `MD5OfBody`),
						receipt_handle: read_text_from_descendant(message, `ReceiptHandle`),
						approximate_receive_count: parseInt(read_text_from_attribute_value(message, `ApproximateReceiveCount`), 10),
					}),
				),
		),
		delete_message: (queue_url, receipt_handle) => request(queue_url, {
			Action: `DeleteMessage`,
			ReceiptHandle: receipt_handle,
		}),
	}
}
