# can-parse

[![Greenkeeper badge](https://badges.greenkeeper.io/canjs/can-parse.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/canjs/can-parse.png?branch=master)](https://travis-ci.org/canjs/can-parse)

A simple context-free parser generator

## Usage

This is similar to use as [Jison](http://zaa.ch/jison/), but it's designed to be
tiny (<1k `min+gip`) and fast (while being less expressive than Jison).

To create a parser, first create a `grammar` with `lex`ical tokens and
an expression `tree` as follows:

```js
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
```

`EXPRESSION` is a key word and is the starting point of the expression tree.  

Once you built your grammar, build a parser like:

```js
var parse = require("can-parse");

var parser = parse(grammar);
```


Then parse something:

```js
parser("<my-element bar='car'/>" ,function(token, expressions){
	token //-> { lex: "<", match: "<", index: 0 }
	expressions.end // -> []
	expressions.start
	// ->[
	// 	{
	//		"expression": "EXPRESSION",
	//		"ruleIndexes": [ 0, 3 ]
	// 	},
	// 	{
	//		"expression": "TAG",
	//		"ruleIndexes": [ 0, 1, 2, 3, 4, 5]
	// 	}
	// ]
});
```

The `parser` function takes:

 - The `string` to be parsed 
 - A callback which will be called back with each
lexical token as it's matched , what was matched, and where it's matched, and the expressions that have started and ended with the matching of that token.
