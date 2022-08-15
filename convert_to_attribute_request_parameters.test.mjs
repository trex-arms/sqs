import { suite } from 'uvu'
import * as assert from 'uvu/assert'

import convert_to_attribute_request_parameters from './convert_to_attribute_request_parameters.mjs'

const test = suite(`convert_to_attribute_request_parameters`)

test(`Empty list return empty object`, () => {
	const result = convert_to_attribute_request_parameters([])
	assert.equal(result, {})
})

test(`One item list`, () => {
	const result = convert_to_attribute_request_parameters([`snake_case`])
	assert.equal(result[`AttributeName.1`], `SnakeCase`)
})

test(`Multiple item list`, () => {
	const result = convert_to_attribute_request_parameters([`snakes`, `and`, `ladders`])
	assert.equal(result, {
		'AttributeName.1': `Snakes`,
		'AttributeName.2': `And`,
		'AttributeName.3': `Ladders`,
	})
})

test.run()
