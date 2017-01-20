var each = require("can-util/js/each/each");
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

function numberKeys(obj) {
	return Object.keys(obj).map(function(num){
		return +num;
	});
}


// want to know available lex options at all times ...

function makeParser(grammar){
	var recurseCount = 0;

	var parser = function(text) {
		recurseCount = 0;

		var indexStack = [{expression :"EXPRESSION", tokenIndex: -1, ruleIndexes: numberKeys(grammar.tree.EXPRESSION) }];
		var lexPossibilities = parser.getLexPossibilities("EXPRESSION", numberKeys(grammar.tree.EXPRESSION), 0);

		var lexMatch = parser.getLexMatch(text, lexPossibilities, 0);

		parser.updateStack(indexStack, lexMatch);
		console.log("  after stack ",  JSON.stringify(indexStack));
		while(lexMatch) {
			recurseCount++;
			if(recurseCount >= 500) {
				return;
			}

			text = text.substr(lexMatch.match.length);
			console.log(text);
			// update the stack

			// [EXPRESSION, TAG]


			// go through each of the next steps ruleIndexes, starting at the
			// "lowest" expression
			var newLexMatch = eachBackwardsBreak(indexStack, function(stackExpression){

				// get which token index we should start at for this stackExpression
				var tokenIndex = stackExpression.tokenIndex + 1;

				var lexToNextExpressions = parser.getLexPossibilities(
					stackExpression.expression,
					// rule indexes
					stackExpression.ruleIndexes,
					tokenIndex);
				console.log("    getLexPossibilities",JSON.stringify(stackExpression),tokenIndex,  lexToNextExpressions);

				var lexMatch = parser.getLexMatch(text, lexToNextExpressions, tokenIndex);
				// {match: "matched text", expressions: [[EXPR_NAME, RULE_tokenIndexES]], lex: matched}

				if(!lexMatch) {
					throw new Error("couldn't find a match for "+
						JSON.stringify(stackExpression)+":"+
						tokenIndex+
						" on "+text.substr(0,20));
				}

				if( lexMatch.lex === "EXPRESSION_COMPLETED" ) {
					parser.expressionCompleted(indexStack);
					return; // continues up the stack ... we might need to pop something
				} else {
					return lexMatch;
				}
			});
			console.log("  lexMatch", JSON.stringify(newLexMatch));
			console.log("  before stack", JSON.stringify(indexStack))
			if(newLexMatch) {
				parser.updateStack(indexStack, newLexMatch);
				if(parser.isLastMatch(last(indexStack), lexMatch)) {
					indexStack.pop();
				}

				console.log("  after stack ",  JSON.stringify(indexStack));
			}

			lexMatch = newLexMatch;

		}

	};


	// -> {lex: EXPRESSIONS[ [EXPRESSION, RULE_tokenIndexES[] ] ]}
	parser.getLexPossibilities = function(expression, ruleIndexes, tokenIndex){
		recurseCount++;
		if(recurseCount > 500) {
			console.warn("too much recursion");
			return;
		}

		var expressionLexes = {};
		// map of which ruleIndexes were at a given sub-expression
		var subExpressionRules = {}; //{ATTRS: [4,5]}
		ruleIndexes.forEach(function(index){
			index = +index;
			// we are going to get ATTRS
			var token = grammar.tree[expression][index][tokenIndex];
			if(!token) {
				// this might be a "EXPRESSION_COMPLETED" token ...
				if(grammar.tree[expression][index].length === tokenIndex) {
					token = "EXPRESSION_COMPLETED";
				} else {
					throw new Error("Expression "+expression+", Rule: "+index+" has no futher tokens");
				}
			}
			if(!subExpressionRules[token]) {
				subExpressionRules[token] = [];
			}
			subExpressionRules[token].push(index);
			// returns the available lexes ... we need to add these to expression lexes
			// probably make sure there's no conflict.

			// we only need to get this once
			if(grammar.lex[token] || token === "EXPRESSION_COMPLETED") {
				expressionLexes[token] = [{expression: expression, ruleIndexes: subExpressionRules[token] }];
			}
			else if( subExpressionRules[token].length === 1 ) {
				var lexes = parser.getLexPossibilities(token,Object.keys(grammar.tree[token]), 0);

				each(lexes, function(subExpressionAndRules, lex){
					subExpressionAndRules = subExpressionAndRules.slice(0);
					subExpressionAndRules.unshift({expression: expression, ruleIndexes: subExpressionRules[token]});
					expressionLexes[lex] = subExpressionAndRules;
				});
			}
		});

		return expressionLexes;
	};

	parser.getLexMatch = function(text, lexPossibilities) {
		var EXPRESSION_COMPLETED;
		var lexMatch = eachBreak(lexPossibilities, function(expressions, lexKey){
			if(lexKey === "EXPRESSION_COMPLETED") {
				EXPRESSION_COMPLETED = {
					expressions: expressions,
					lex: lexKey
				};
				return; // keep checking
			}
			var result = grammar.lex[lexKey].exec(text);
			if(result) {

				return {
					match: result[0],
					expressions: expressions,
					lex: lexKey
				};
			}
		});
		if(lexMatch) {
			return lexMatch;
		} else {
			return EXPRESSION_COMPLETED;
		}
	};
	parser.updateStack = function(stack, lexMatch) {
		var topOfStack = last(stack);
		var lastRule = last(lexMatch.expressions);
		if(lastRule.expression !== topOfStack.expression) {
			var firstMatchExpression = lexMatch.expressions[0];
			if(firstMatchExpression.expression === topOfStack.expression && lexMatch.expressions.length > 1) {
				topOfStack.ruleIndexes = firstMatchExpression.ruleIndexes;
				topOfStack.tokenIndex++
				for(var i = 1; i < lexMatch.expressions.length; i++) {
					var expr = lexMatch.expressions[i];
					stack.push({expression: expr.expression,ruleIndexes: expr.ruleIndexes, tokenIndex: 0});
				}
			} else {
				// we probably popped the stack
			}

		} else {
			topOfStack.ruleIndexes = lastRule.ruleIndexes;
			topOfStack.tokenIndex++;
		}
	};
	parser.ruleSameAsCurrent = function(indexStack, rule) {
		var topOfStack = last(indexStack);
		return topOfStack.expression === rule.expression;
	};
	parser.ruleInStack = function(indexStack, rule) {
		eachBackwardsBreak(indexStack, function(stackItem){
			if(stackItem.expression === rule.expression) {
				return stackItem;
			}
		});
	};
	parser.tokenIndex = function(indexStack, rule) {
		var stackItem = parser.ruleInStack(indexStack, rule);
		if(stackItem) {
			return stackItem.tokenIndex+1;
		}
		if(parser.ruleSameAsCurrent(indexStack, rule)) {
			return last(indexStack).tokenIndex+1;
		} else {
			return 1;
		}
	};
	parser.expressionCompleted = function(indexStack) {
		indexStack.pop();
	};
	parser.isLastMatch = function(expression, lexMatch){
		var expressionName = expression.expression;
		var expressionRulesIndexes = expression.ruleIndexes;

		// there has to have been a match, and only one expressionRule index could match for us to end it.
		// Something might be wrong if it should be a last match, but there are other matches.
		if(lexMatch && expressionRulesIndexes.length === 1) {
			var ruleIndex = expressionRulesIndexes[0];
			var ruleTokens = grammar.tree[expressionName][ruleIndex];
			return ruleTokens.length === expression.tokenIndex + 1;

		}
		return false;
	};

	return parser;

}





module.exports = makeParser;
