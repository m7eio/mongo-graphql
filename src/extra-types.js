import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";

export default class GraphQLLong extends GraphQLScalarType {
	constructor(mode = "Long") {
		const MAX_INT = Number.MAX_SAFE_INTEGER;
		const MIN_INT = Number.MIN_SAFE_INTEGER;

		const safeDescription =
			"The `Long` scalar type represents non-fractional signed whole numeric values." +
			"Long can represent values between -(2^53) + 1 and 2^53 - 1.";
		const longDescription =
			"The `Long` scalar type represents non-fractional signed whole numeric values." +
			"Long can represent values between -(2^63) + 1 and 2^63 - 1.";

		const LongParseLiteral = function(ast) {
			if (ast.kind === Kind.INT) {
				return global.BigInt(ast.value);
			} else {
				throw new TypeError(`Long cannot represent non-integer value: ${ast.value}`);
			}
		};

		const parseLongValue = function(value) {
			if (value === "") {
				throw new TypeError("The value cannot be converted from Long because it is empty string");
			}
			if (typeof value !== "number" && typeof value !== "bigint") {
				throw new TypeError(
					`The value ${value} cannot be converted to a Long because it is not an integer`
				);
			}

			return global.BigInt(value);
		};

		const serializeLongValue = function(value) {
			if (value === "") {
				throw new TypeError("The value cannot be converted from Long because it is empty string");
			}
			try {
				return global.BigInt(value.toString()).toString();
			} catch {
				throw new TypeError(
					`The value ${value} cannot be converted to a Long because it is not an integer`
				);
			}
		};

		const safeParseLiteral = function(ast) {
			if (ast.kind === Kind.INT) {
				const number = Number(ast.value);
				if (number <= MAX_INT && number >= MIN_INT) {
					return number;
				} else {
					throw new TypeError("Long number should be in the range from -(2^53) + 1 to 2^53 - 1");
				}
			} else {
				throw new TypeError(`Long cannot represent non-integer value: ${ast.value}`);
			}
		};

		const safeValue = function(value) {
			if (typeof value !== "number") {
				throw new TypeError(`Long cannot represent non-integer value: ${value}`);
			}
			const number = Number(value);
			if (number > MAX_INT || number < MIN_INT) {
				throw new TypeError("Long number should be in the range from -(2^53) + 1 to 2^53 - 1");
			}
			const int = Math.floor(number);
			if (int !== number) {
				throw new TypeError(`Long cannot represent non-integer value: ${value}`);
			}
			return number;
		};

		super({
			name: "Long",
			description: mode === "Long" ? longDescription : safeDescription,
			parseValue: mode === "Long" ? parseLongValue : safeValue,
			serialize: mode === "Long" ? serializeLongValue : safeValue,
			parseLiteral: mode === "Long" ? LongParseLiteral : safeParseLiteral
		});
	}
}