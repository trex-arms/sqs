import make_pascal_case from 'just-pascal-case'

export default attribute_names => Object.fromEntries(
	attribute_names.map((name, index) => [`AttributeName.${index + 1}`, make_pascal_case(name)]
))
