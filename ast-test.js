QUnit.test("basics", function(assert) {

	"<my-element bar='car'/>"

	var ast = {
		type: "EXPRESSIONS",
		body: [
			{
				type: "EXPRESSION",
				body: [
					{
						type:"TAG",
						body: [
							{lex: "<", match: "<", index: 0},
							{lex: "TAGNAME", match: "my-element", index: 1 },
							{lex: "SPACE", match: " ", index: 11 },
							{
								type: "ATTRS",
								body: [
									{
										type: "ATTR",
										body: [
											{ lex: "NOT_SPACE_RIGHT_CARROT", "match": "bar", index: 12 },
											{ lex: "=", "match": "=", index: 15},
											{
												type: "QUOTE",
												body: [
													{ lex: "'", "match": "'", index: 16 },
													{
														type: "SINGLE_QUOTE_MAGIC_OR_TEXT",
														body: [
															{ "lex": "NOT_MAGIC_OR_SINGLE", "match": "car", index: 17 }
														]
													},
													{ "lex": "'", "match": "'", index: 20 }
												]
											}
										]
									}
								]
							},
							{ "lex": "/>", "match": "/>", index: 21 }
						]


					}
				]
			},
			{ "lex": null, "token": null, "match": null, "index": 23 }
		]
	};

})
