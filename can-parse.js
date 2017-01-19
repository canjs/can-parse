var each = require("can-util/js/each/each");
var assign = require("can-util/js/assign/assign");
var last = require("can-util/js/last/last");
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
var eachBackwardsBreak = function(arr,callback){
	for(var len = arr.length, i = len - 1; i >= 0; i--) {
		var res = callback(arr[i], i);
		if(res !== undefined) {
			return res;
		}
	}
};



// want to know available lex options at all times ...

function makeParser(grammar){
	var recurseCount = 0;

	var parser = function(text, callbacks) {
		recurseCount = 0;

		var indexStack = [["EXPRESSION",1]];
		var lexPossibilities = parser.getLexPossibilities("EXPRESSION", Object.keys(grammar.tree.EXPRESSION), 0);

		var lexMatch = parser.getLexMatch(text, lexPossibilities);
		parser.updateStack(indexStack, lexMatch);
		while(lexMatch) {
			recurseCount++;
			if(recurseCount >= 500) {
				return;
			}

			text = text.substr(lexMatch.match.length);
			// update the stack

			// [EXPRESSION, TAG]

			//
			// rules for processing the next value
			var rules = lexMatch.rules;
			var newLexMatch = eachBackwardsBreak(lexMatch.rules, function(rule){
				// how does this become 1?
				var subRulePossibilities = parser.getLexPossibilities(
					rule[0],
					rule[1],
					parser.startingIndex(indexStack, rule));

				return parser.getLexMatch(text, subRulePossibilities);
			});
			parser.updateStack(indexStack, newLexMatch);
			lexMatch = newLexMatch;

		}


		return;
		var lexPossibilities = parser.getLexPossibilities("EXPRESSION", "*");

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
		};

		// now we move the text
		text = "my-element bar='car'/>";
		// we want to check the "next" step in magic first ...

		lexPossibilities = parser.getLexPossibilities("TAG",[0,1,2,3,4,5], 1);
		lexPossibilities = {
			TAGNAME: {
				TAG: [0,1,2,3,4,5]
			}
		}; // might need some way of saying it MUST be a tag here or previous lex
		matchedLex = "TAGNAME";

		text = " bar='car'/>";
		rule = {
			TAG: [0,1,2,3,4,5]
		};
		lexPossibilities = parser.getLexPossibilities("TAG",[0,1,2,3,4,5], 2);
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
		};
		lexPossibilities = parser.getLexPossibilities("TAG",[2,3,4,5], 3);
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
		rule = {
			TAG: [4,5],
			ATTRS: [0,1],
			ATTR: [1,2,3,4],
		};
		lexPossibilities = parser.getLexPossibilities("ATTR",[1,2,3,4], 1);
		lexPossibilities = {
			"=": {
				ATTR: [1,2,3]
			},
			BREAK: [4]
		};
		lexPossibilities = "=";

		return ruleMatch;
	};



	parser.getLexPossibilities = function(expression, rules, INDEX){
		recurseCount++;
		if(recurseCount > 500) {
			console.warn("too much recursion");
			return;
		}

		var expressionLexes = {};
		// map of which rules were at a given sub-expression
		var subExpressionRules = {}; //{ATTRS: [4,5]}
		rules.forEach(function(index){
			index = +index;
			// we are going to get ATTRS
			var rule = grammar.tree[expression][index][INDEX];
			if(!rule) {
				// this might be a "EXPRESSION_COMPLETED" rule ...
				if(grammar.tree[expression][index].length === INDEX) {
					rule = "EXPRESSION_COMPLETED";
				} else {
					throw new Error("Expression "+expression+", Rule: "+index+" has no futher tokens");
				}
			}
			if(!subExpressionRules[rule]) {
				subExpressionRules[rule] = [];
			}
			subExpressionRules[rule].push(index);
			// returns the available lexes ... we need to add these to expression lexes
			// probably make sure there's no conflict.

			// we only need to get this once
			if(grammar.lex[rule] || rule === "EXPRESSION_COMPLETED") {
				expressionLexes[rule] = [[expression, subExpressionRules[rule]]];
			}
			else if( subExpressionRules[rule].length === 1 ) {
				var lexes = parser.getLexPossibilities(rule,Object.keys(grammar.tree[rule]), 0);

				each(lexes, function(subExpressionAndRules, lex){
					subExpressionAndRules = subExpressionAndRules.slice(0);
					subExpressionAndRules.unshift([expression, subExpressionRules[rule] ]);
					expressionLexes[lex] = subExpressionAndRules;
				});
			}
		});

		return expressionLexes;
	};

	parser.getLexMatch = function(text, lexPossibilities) {
		return eachBreak(lexPossibilities, function(rules, lexKey){
			var result = grammar.lex[lexKey].exec(text);
			if(result) {
				return {
					match: result[0],
					rules: rules,
					lex: lexKey
				};
			}

		});
	};
	parser.updateStack = function(stack, lexMatch) {
		var topOfStack = last(stack);
		var lastRule = last(lexMatch.rules);
		if(lastRule[0] !== topOfStack[0]) {
			stack.push([lastRule[0],0]);
		} else {
			topOfStack[1]++;
		}
	};
	parser.ruleSameAsCurrent = function(indexStack, rule) {
		var topOfStack = last(indexStack);
		return topOfStack[0] === rule[0];
	};
	parser.startingIndex = function(indexStack, rule) {
		if(parser.ruleSameAsCurrent(indexStack, rule)) {
			return last(indexStack)[1]+1;
		} else {
			return 1;
		}
	};

	return parser;

}





module.exports = makeParser;
