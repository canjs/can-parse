var QUnit = require('steal-qunit');
var parse = require('can-parse');


QUnit.module('can-parse');

var grammar = {
	lex: {
		"{": /^\{/,
		"}": /^\}/,
		"<": /^</,
		"/>" : /^\/>/,
		"</" : /^<\//,
		">": /^>/,
		"SPACE": /^\s/,
		"'": /^'/,
		'"': /^"/,
		"=": /^=/,
		ALPHA_NUMERIC: /^[A-Za-z0-9]+/,
		TAGNAME: /^[a-z][-:_A-Za-z0-9]*/,
		NOT_END_MAGIC: /^([^\}]*)/,
		NOT_SPACE: /^[^\s\{\}]+/,
		NOT_SPACE_RIGHT_CARROT: /^[^\s>=\{]+/,
		NOT_MAGIC_OR_DOUBLE: /^[^"\{]+/,
		NOT_MAGIC_OR_SINGLE: /^[^'\{]+/
	},
	tree: {
		EXPRESSION: [
			["TAG"],
			["CLOSING"],
			["MAGIC_OR_TEXT"],
			["TAG", "EXPRESSION"],
			["CLOSING", "EXPRESSION"],
			["MAGIC_OR_TEXT", "EXPRESSION"]
		],
		TAG: [
			["<","TAGNAME",">"],
			["<","TAGNAME","/>"],
			["<","TAGNAME","SPACE",">"],
			["<","TAGNAME","SPACE","/>"],
			["<","TAGNAME","SPACE","ATTRS",">"],
			["<","TAGNAME","SPACE","ATTRS", "/>"]
		],
		CLOSING: [
			["</","TAGNAME",">"],
		],
		ATTRS: [
			["ATTR"],
			["ATTR", "SPACE", "ATTRS"],
			["MAGIC"],
			["MAGIC","ATTRS"]
		],
		ATTR: [
			["QUOTE","=","QUOTE"],
			["NOT_SPACE_RIGHT_CARROT","=","QUOTE"],
			["NOT_SPACE_RIGHT_CARROT","=","NOT_SPACE_RIGHT_CARROT"],
			["NOT_SPACE_RIGHT_CARROT","=","MAGIC"],
			["NOT_SPACE_RIGHT_CARROT"]
		],
		QUOTE: [
			["'","SINGLE_QUOTE_MAGIC_OR_TEXT","'"],
			['"',"DOUBLE_QUOTE_MAGIC_OR_TEXT",'"']
		],
		SINGLE_QUOTE_MAGIC_OR_TEXT: [
			["NOT_MAGIC_OR_SINGLE"],
			["NOT_MAGIC_OR_SINGLE","SINGLE_QUOTE_MAGIC_OR_TEXT" ],
			["MAGIC"],
			["MAGIC", "SINGLE_QUOTE_MAGIC_OR_TEXT"]
		],
		DOUBLE_QUOTE_MAGIC_OR_TEXT: [
			["NOT_MAGIC_OR_DOUBLE"],
			["NOT_MAGIC_OR_DOUBLE","DOUBLE_QUOTE_MAGIC_OR_TEXT" ],
			["MAGIC"],
			["MAGIC", "DOUBLE_QUOTE_MAGIC_OR_TEXT"]
		],
		MAGIC_OR_TEXT: [
			["TEXT"],
			["TEXT","MAGIC_OR_TEXT" ],
			["MAGIC"],
			["MAGIC", "MAGIC_OR_TEXT"]
		],
		MAGIC: [
			["{", "NOT_END_MAGIC", "}"],
		],
		TEXT: [
			["SPACE"],
			["SPACE", "TEXT"],
			["NOT_SPACE"],
			["NOT_SPACE", "TEXT"],
			["<"],
			["<","TEXT"]
		]
	}
};

/*
QUnit.test('parse.getExpressionLex', function(){

	var expressionLex = parse.getExpressionStartLex(grammar);

	console.log(expressionLex);

});*/

QUnit.test("parse.getLexPossibilities", function(assert) {
	var parser = parse(grammar);

	var lexPossibilities = parser.getLexPossibilities({expression: "TAG", ruleIndexes: [2,3,4,5], tokenIndex: 3});

	assert.deepEqual(lexPossibilities, {
		">": [[
			{expression:"TAG", ruleIndexes: [2], "tokenIndex": 3}
		]],
		"/>": [[
			{expression:"TAG", ruleIndexes: [3], tokenIndex: 3}
		]],
		"'": [[
			{expression:"TAG", ruleIndexes: [4,5], tokenIndex: 0},
			{expression:"ATTRS", ruleIndexes: [0,1], tokenIndex: 0},
			{expression:"ATTR", ruleIndexes: [0], tokenIndex: 0},
			{expression:"QUOTE", ruleIndexes: [0], tokenIndex: 0},
		]],
		'"': [[
			{expression:"TAG", ruleIndexes: [4,5], tokenIndex: 0},
			{expression:"ATTRS", ruleIndexes: [0,1], tokenIndex: 0},
			{expression:"ATTR", ruleIndexes: [0], tokenIndex: 0},
			{expression:"QUOTE", ruleIndexes: [1], tokenIndex: 0}
		]],
		NOT_SPACE_RIGHT_CARROT: [[
			{expression:"TAG", ruleIndexes: [4,5], tokenIndex: 0},
			{expression:"ATTRS", ruleIndexes: [0,1], tokenIndex: 0},
			{expression:"ATTR", ruleIndexes: [1,2,3,4], tokenIndex: 0},
		]],
		"{": [[
			{expression:"TAG", ruleIndexes: [4,5], tokenIndex: 0},
			{expression:"ATTRS", ruleIndexes: [2,3], tokenIndex: 0},
			{expression:"MAGIC", ruleIndexes: [0], tokenIndex: 0}
		]]
	});

});

QUnit.test("parse.getLexPossibilities for multiple expressions", function(assert) {
	var parser = parse(grammar);

	var lexPossibilities = parser.getLexPossibilities({expression: "EXPRESSION", ruleIndexes: [0,1,2,3,4,5], tokenIndex: 0});

	// it's possible it's text ...
	assert.deepEqual(lexPossibilities["<"], [
		[
			{ "expression": "EXPRESSION", "ruleIndexes": [ 0, 3 ], tokenIndex: 0 },
			{ "expression": "TAG", "ruleIndexes": [ 0, 1, 2, 3, 4, 5 ], tokenIndex: 0 }
		],
		[
			{ "expression": "EXPRESSION", "ruleIndexes": [ 2, 5 ], tokenIndex: 0 },
			{ "expression": "MAGIC_OR_TEXT", "ruleIndexes": [ 0, 1 ], tokenIndex: 0 },
			{ "expression": "TEXT", "ruleIndexes": [ 4, 5 ], tokenIndex: 0 }
		]
	]);


});

QUnit.test("parser.getLexMatches", function(assert) {
	var parser = parse(grammar);

	var lexPossibilities = parser.getLexPossibilities({expression: "EXPRESSION", ruleIndexes: [0,1,2,3,4,5], tokenIndex: 0});

	var lexMatch = parser.getLexMatches("<", lexPossibilities, 0);



	// it's possible it's text ...
	assert.deepEqual(lexMatch, {
		expressions: [
			[
				{ "expression": "EXPRESSION", "ruleIndexes": [ 0, 3 ], tokenIndex: 0 },
				{ "expression": "TAG", "ruleIndexes": [ 0, 1, 2, 3, 4, 5 ], tokenIndex: 0 }
			],
			[
				{ "expression": "EXPRESSION", "ruleIndexes": [ 2, 5 ], tokenIndex: 0 },
				{ "expression": "MAGIC_OR_TEXT", "ruleIndexes": [ 0, 1 ], tokenIndex: 0 },
				{ "expression": "TEXT", "ruleIndexes": [ 4, 5 ], tokenIndex: 0 }
			]
		],
		lex: "<",
		index: 0,
		match: "<"
	});
});


/*
QUnit.test("COMPLETED", function(){
	var parser = parse(grammar);

	assert.deepEqual(parser.getLexPossibilities("ATTR",[1,2,3,4], 1),{
		"=": [
			["ATTR", [1,2,3]]
		],
		EXPRESSION_COMPLETED: [
			["ATTR", [4]]
		]
	});
});*/

QUnit.test("basics", function(assert) {
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

	var parser = parse(grammar);


	var index = 0;

	parser("<my-element bar='car'/>", function(token, changes){
		console.log(token.match+"   ",changes.start);
		assert.deepEqual(token, calls[index][0], "token |"+token.match);
		assert.deepEqual(changes, calls[index][1], "changes |"+token.match);
		index++;
	});

	//console.log(JSON.stringify(parseOut, null, '\t'));

});

QUnit.test("updateStack", function(assert) {
	var parser = parse(grammar);
	var stack = [
		{expression: "EXPRESSION", ruleIndexes: [1], tokenIndex: 1},
		{expression: "TAG", ruleIndexes: [1,2,3,4,5], tokenIndex: 1}
	];
	parser.updateStack(stack, {
		"match":"bar",
		"expressions":[
			{expression: "TAG", ruleIndexes:[4,5]},
			{expression: "ATTRS", ruleIndexes:[0,1]},
			{expression: "ATTR", ruleIndexes: [1,2,3,4]}
		],
		"lex":"NOT_SPACE_RIGHT_CARROT"
	});
	assert.deepEqual(stack, [
		{expression: "EXPRESSION", ruleIndexes: [1], tokenIndex: 1},
		{expression: "TAG", ruleIndexes:[4,5], tokenIndex: 2},
		{expression: "ATTRS", ruleIndexes:[0,1], tokenIndex: 0},
		{expression: "ATTR", ruleIndexes: [1,2,3,4], tokenIndex: 0}
	]);
});


// < is an expression so it can't be a minimum match :-(
// foo<abc <
// foo<abc <
QUnit.test("handles conflicting expressions (#3)", function(assert) {
	var calls = [
		[
			{ "index": 0, "lex": "<", "match": "<" },
			{
				"end": [],
				"start": [
					{ "expression": "EXPRESSION", "ruleIndexes": [ 2, 5 ] },
					{ "expression": "MAGIC_OR_TEXT", "ruleIndexes": [ 0, 1 ] },
					{ "expression": "TEXT", "ruleIndexes": [4,5] }
				]
			}
		],
		[
			{ "index": 1, "lex": "NOT_SPACE", "match": "bar" },
			{
				"end": [],
				"start": []
			}
		],
		[
			{ "index": 4, "lex": null, "match": null, "token": null },
			{
				"end": [
			  		{  "expression": "TEXT", "ruleIndexes": [ 2 ], "tokenIndex": 0 },
		    		{ "expression": "MAGIC_OR_TEXT",  "ruleIndexes": [ 0 ], "tokenIndex": 0 },
		    		{ "expression": "EXPRESSION", "ruleIndexes": [ 2 ], "tokenIndex": 0 }
		  		]
			}
		]
	];

	var index = 0;

	var parser = parse(grammar);

	parser("<bar", function(token, changes){
		console.log(token.match+"   ",changes.start);
		var call = calls[index];
		if(call) {
			assert.deepEqual(token, call[0], "token |"+token.match);
			assert.deepEqual(changes, call[1], "changes |"+token.match);
		} else {
			assert.notOk(token,"token");
			assert.notOk(changes,"changes");
		}

		index++;
	});

});


QUnit.test("call expressions (recursive expressions)", function(assert) {
	var callExpressionGrammar = {
		lex: {
			"(": /^\(/,
			")": /^\)/,
			WORD:  /^\w+/
		},
		tree: {
			EXPRESSION: [
				["CALL_EXPRESSION"]
			],
			CALL_EXPRESSION: [
				["CALL_EXPRESSION","(","WORD",")"],
				["WORD","(","WORD",")"],
			]
		}
	};

	var parser = parse(callExpressionGrammar);
	parser("foo(first)(second)")
});
