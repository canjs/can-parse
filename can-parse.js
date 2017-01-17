var each = require("can-util/js/each/each");
var assign = require("can-util/js/assign/assign");
/*
 *
 */

var eachBreak = function(obj, callback){
	for(var prop in obj) {
		var res = callback(obj[prop], prop);
		if(res !== undefined) {
			return res;
		}
	}
};




// want to know available lex options at all times ...

function makeParser(grammar){
	var startLexTree = getExpressionStartLex(grammar);

	return function(text, callbacks) {


		var lexPossibilities = getLexPossibilities("EXPRESSION", "*")

		lexPossibilities = {
			"<": {
				EXPRESSION: [0,3],
				TAG: [0,1,2,3,4,5]
			},
			"</": {
				EXPRESSION: [1,4],
				CLOSING: [1]
			},
			"SPACE": {
				EXPRESSION: [2,5],
				MAGIC_OR_TEXT: [0, 2],
				TEXT: [0,1]
			},
			"NOT_SPACE": {
				EXPRESSION: [2,5],
				MAGIC_OR_TEXT: [0, 2],
				TEXT: [2,3]
			},
			"{":{
				EXPRESSION: [2,5],
				MAGIC_OR_TEXT: [1, 3],
				MAGIC: [0]
			}
		};

		// given lex ... which "rule" is it ?
		var matchedLex = "<";

		var rule = {
			EXPRESSION: [0,3],
			TAG: [0,1,2,3,4,5]
		}

		// now we move the text
		var text = "my-element bar='car'/>";
		// we want to check the "next" step in magic first ...

		var lexPossibilities = getLexPossibilities("TAG",[0,1,2,3,4,5], 1);
		lexPossibilities = {
			TAGNAME: {
				TAG: [0,1,2,3,4,5]
			}
		}; // might need some way of saying it MUST be a tag here or previous lex
		matchedLex = "TAGNAME"

		text = " bar='car'/>";
		rule = {
			TAG: [0,1,2,3,4,5]
		};
		lexPossibilities = getLexPossibilities("TAG",[0,1,2,3,4,5], 2)
		lexPossibilities = {
			">": {
				TAG: [0]
			},
			"/>": {
				TAG: [1]
			},
			SPACE: {
				TAG: [2,3,4,5]
			}
		};
		matchedLex = "SPACE";

		text = "bar='car'/>";
		rule = {
			TAG: [2,3,4,5]
		}
		lexPossibilities = getLexPossibilities("TAG",[2,3,4,5], 3)
		lexPossibilities = {
			">": {
				TAG: [2]
			},
			"/>": {
				TAG: [3]
			},
			"'": {
				TAG: [4,5],
				ATTRS: [0,1],
				ATTR: [0],
				QUOTE: [0]
			},
			'"': {
				TAG: [4,5],
				ATTRS: [0,1],
				ATTR: [0],
				QUOTE: [1]
			},
			NOT_SPACE_RIGHT_CARROT: {
				TAG: [4,5],
				ATTRS: [0,1],
				ATTR: [1,2,3,4],
			},
			"{": {
				TAG: [4,5],
				ATTRS: [2,3],
				MAGIC: [1],
			}
		};
		matchedLex = "NOT_SPACE_RIGHT_CARROT";

		text = "='car'/>";
		matchedRule = {
			TAG: [4,5],
			ATTRS: [0,1],
			ATTR: [1,2,3,4],
		};
		lexPossibilities = getLexPossibilities("ATTR",[1,2,3,4], 1);
		lexPossibilities = {
			"=": {
				ATTR: [1,2,3]
			},
			BREAK: [4]
		}
		lexPossibilities = "=";

		return ruleMatch;
	};

}

// lowest next has first priority
var res = {
	EXPRESSION: {
		"*": "anything"
	},
	MAGIC_OR_TEXT: [
		"{", "MAGIC"
	],
	TEXT: [
		"SPACE","NOT_SPACE"
	]
};
// provide the possibilities for a given position
function getLexPossibilities(expression, rule, position, startLexTree, grammar){
	startLexTree[expression]
}

function getRulesMatch(text, startLex, grammar) {
	return eachBreak(startLex, function(rules, lexKey){
		var result = grammar.lex[lexKey].exec(text);
		if(result) {
			return {
				match: result[0],
				rules: rules,
				lex: lexKey
			};
		}

	});
}


var addRulesForExpression, addExpression, recurseCount = 0;;

addExpression = function(rule, startLexes, grammar) {
	recurseCount++;
	if(recurseCount > 500) {
		console.warn("too much recursion");
		return;
	}
	var firstExpr = rule[0];
	if(startLexes[firstExpr]) {
		return startLexes[firstExpr];
	}
	var lexes = {};

	if(grammar.lex[firstExpr]) {
		lexes[firstExpr] = true;
	} else if(grammar.tree[firstExpr]){
		assign(lexes, addRulesForExpression(firstExpr, startLexes, grammar) );
	} else {
		console.warn("there is no ", firstExpr, "in the grammar tree");
	}
	return lexes;
};

addRulesForExpression = function(expression, startLexes, grammar) {
	recurseCount++;
	if(recurseCount > 500) {
		console.warn("too much recursion");
		return;
	}

	startLexes[expression] = {};
	var expressionLexes = {};
	grammar.tree[expression].forEach(function(rule, index){
		var lexes = addExpression(rule, startLexes, grammar);
		each(lexes, function(v, lex){
			if( !startLexes[expression][lex] ) {
				startLexes[expression][lex] = [];
			}
			startLexes[expression][lex].push(index);
		});
		assign(expressionLexes, lexes);
	});
	return expressionLexes;
};

function getExpressionStartLex(grammar) {
	var startLexes = {};
	addRulesForExpression("EXPRESSION", startLexes, grammar);
	return startLexes;
}

makeParser.getExpressionStartLex = getExpressionStartLex;

module.exports = makeParser;
