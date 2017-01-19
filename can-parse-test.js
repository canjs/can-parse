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
		NOT_SPACE: /^[^\s\{\}<]+/,
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
			["NOT_SPACE", "TEXT"]
		]
	}
};

/*
QUnit.test('parse.getExpressionLex', function(){

	var expressionLex = parse.getExpressionStartLex(grammar);

	console.log(expressionLex);

});*/

QUnit.test("parse.getLexPossibilities", function(){
	var parser = parse(grammar);

	var lexPossibilities = parser.getLexPossibilities("TAG",[2,3,4,5], 3);
	console.log(lexPossibilities);
	QUnit.deepEqual(lexPossibilities, {
		">": [
			["TAG", [2]]
		],
		"/>": [
			["TAG", [3]]
		],
		"'": [
			["TAG", [4,5]],
			["ATTRS", [0,1]],
			["ATTR", [0]],
			["QUOTE", [0]],
		],
		'"': [
			["TAG", [4,5]],
			["ATTRS", [0,1]],
			["ATTR", [0]],
			["QUOTE", [1]]
		],
		NOT_SPACE_RIGHT_CARROT: [
			["TAG", [4,5]],
			["ATTRS", [0,1]],
			["ATTR", [1,2,3,4]],
		],
		"{": [
			["TAG", [4,5]],
			["ATTRS", [2,3]],
			["MAGIC", [0]]
		]
	});

});
/*
QUnit.test("COMPLETED", function(){
	var parser = parse(grammar);

	QUnit.deepEqual(parser.getLexPossibilities("ATTR",[1,2,3,4], 1),{
		"=": [
			["ATTR", [1,2,3]]
		],
		EXPRESSION_COMPLETED: [
			["ATTR", [4]]
		]
	});
});*/

QUnit.test("basics", function(){
	var parser = parse(grammar);
	parser("<my-element bar='car'/>");

});
