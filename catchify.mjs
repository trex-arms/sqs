export default promise => promise.then(
	result => [ null, result ],
).catch(
	err => [ err, null ],
)