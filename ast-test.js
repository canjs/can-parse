QUnit.test("basics", function(){

	"<my-element bar='car'/>"

	var ast = {
		type: "EXPRESSIONS",
		body: [
			type: "EXPRESSION":
		]
	}

	var calls = [
		[
			{ "lex": "<", "match": "<", "index": 0 },
			{
				"start": [
					{
						"expression": "EXPRESSION",
						"ruleIndexes": [ 0, 3 ]
					},
					{
						"expression": "TAG",
						"ruleIndexes": [ 0, 1, 2, 3, 4, 5]
					}
				],
				end: []
			}
		],
		[
			{ "lex": "TAGNAME", "match": "my-element", index: 1 },
			{ "end": [], "start": [] }
		],
		[
			{ "lex": "SPACE", "match": " ", index: 11 },
			{ "end": [], "start": [] }
		],
		[
			{ "lex": "NOT_SPACE_RIGHT_CARROT", "match": "bar", index: 12 },
			{
				"end": [],
				"start": [
					{ "expression": "ATTRS", "ruleIndexes": [ 0, 1 ] },
					{ "expression": "ATTR", "ruleIndexes": [ 1, 2, 3, 4 ] }
				]
			}
		],
		[
			{ "lex": "=", "match": "=", index: 15},
			{ "end": [], "start": [] }
		],
		[
			{ "lex": "'", "match": "'", index: 16 },
			{
				"end": [],
				"start": [
					{ "expression": "QUOTE", "ruleIndexes": [ 0 ] }
				]
			}
		],
		[
			{ "lex": "NOT_MAGIC_OR_SINGLE", "match": "car", index: 17 },
			{
				"end": [],
				"start": [
					{ "expression": "SINGLE_QUOTE_MAGIC_OR_TEXT", "ruleIndexes": [ 0, 1 ] }
				]
			}
		],
		[
			{ "lex": "'", "match": "'", index: 20 },
			{
				"end": [
					{ "expression": "SINGLE_QUOTE_MAGIC_OR_TEXT", "ruleIndexes": [ 0 ], tokenIndex: 0 },
					{ "expression": "QUOTE", "ruleIndexes": [ 0 ], tokenIndex: 2 }
				],
				"start": []
			}
		],
		[
			{ "lex": "/>", "match": "/>", index: 21 },
			{
				"end": [
					{ "expression": "ATTR", "ruleIndexes": [ 1 ], tokenIndex: 2 },
					{ "expression": "ATTRS", "ruleIndexes": [ 0 ], tokenIndex: 0, },
					{ "expression": "TAG", "ruleIndexes": [ 5 ], tokenIndex: 4 }
				],
				"start": []
			}
		],
		[
			{ "lex": null, "token": null, "match": null, "index": 23 },
			{
				"end": [
					{ "expression": "EXPRESSION", "ruleIndexes": [ 0 ], tokenIndex: 0 }
				]
			}
		]
	];
})
