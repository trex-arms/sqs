type Attributes = { [key: string]: any }

type MessageResponse = { message_id: string, md5_of_body: string }

export type Sqs = {
	create_queue: (name: string, attributes?: Attributes) => Promise<string>
	get_queue_url: (name: string) => Promise<string>
	get_queue_attributes: (queue_url: string, attribute_names: string[]) => Promise<Attributes>
	delete_queue: (queue_url: string) => Promise<void>
	send_message: (queue_url: string, message: string, opts?: { delay_seconds?: number, message_attribute?: Attributes }) => Promise<MessageResponse>
	send_message_batch: (queue_url: string, messages: string[]) => Promise<MessageResponse[]>
	receive_message: (queue_url: string, opts?: {
		max_number_of_messages?: number
		visibility_timeout?: number
		wait_time_seconds?: number
		attribute_names?: string[]
	}) => Promise<{
		body: string
		message_id: string
		md5_of_body: string
		receipt_handle: string
		attributes: Attributes
	}[]>
	delete_message: (queue_url: string, receipt_handle: string) => Promise<void>
}

type CreateSqs = (args: {
	access_key_id: string
	secret_access_key: string
	region: string
}) => Sqs

const sqs: CreateSqs

export default sqs
