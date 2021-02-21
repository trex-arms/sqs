import make_pascal_case from 'just-pascal-case'

export const generic_attributes_builder = (entries, { name }) => Object.fromEntries(
	entries.flatMap(
		(entry_items, entry_element_number) => Object.entries(entry_items).map(
			([ key, value ]) => [ `${name}.${entry_element_number + 1}.${key}`, value ],
		),
	),
)

export const convert_to_attributes_object = (obj, {
	name = `Attribute`,
	type = false,
} = {}) => {
	const entries = Object.entries(obj).map(([ key, value ]) => {
		const entry = {
			Name: make_pascal_case(key),
			Value: value,
		}

		if (type) {
			return {
				...entry,
				Type: typeof value === `number` ? `Number` : `String`,
			}
		}

		return entry
	})

	return generic_attributes_builder(entries, { name })
}
