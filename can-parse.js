var each = require("can-util/js/each/each");
var last = require("can-util/js/last/last");

// Goes through each property until a value is returned.
var eachBreak = function(obj, callback){
	for(var prop in obj) {
		var res = callback(obj[prop], prop);
		if(res !== undefined) {
			return res;
		}
	}
};
// Goes through an array backwards until a value is returned
var eachBackwardsBreak = function(arr,callback){
	for(var len = arr.length, i = len - 1; i >= 0; i--) {
		var res = callback(arr[i], i);
		if(res !== undefined) {
			return res;
		}
	}
};

// Gives all the indexes of an array as numbers.
function numberKeys(obj) {
	return Object.keys(obj).map(function(num){
		return +num;
	});
}
// Returns a stack item copy that is moved to the next tokenIndex
function nextTokenIndex(stackExpression) {
	return {
		expression :stackExpression.expression,
		ruleIndexes: stackExpression.ruleIndexes,
		tokenIndex: stackExpression.tokenIndex+1
	};
}
function copyMatch(match) {
	return {lex: match.lex, match: match.match, index: match.index};
}


// want to know available lex options at all times ...

function makeParser(grammar){
	// A flag to prevent recursion overflow issues.
	var recurseCount = 0;


	// The main parsing function.  I'm not sure how it should externally interface yet.
	// Perhaps it will write out an AST, or perhaps it will work via callbacks.
	var parser = function(text, callback) {


		recurseCount = 0;

		// the index of the lex token
		var index = 0;
		var endedExpressions;

		// The `expressionStack` tracks the state of where we are in the grammar's
		// expression tree.
		// We keep each `expression`, which `rules` are available, and the last `token`
		// to be processed.
		var expressionStack = [
			{
				// EXPRESSION is the starting point of the grammar.
				expression :"EXPRESSION",
				ruleIndexes: numberKeys(grammar.tree.EXPRESSION),
				// It starts at -1 because the `updateStack` will move it to 0.
				// Any future work in the "EXPRESSION" expression should then move on
				// to 1.
			 	tokenIndex: -1
			}
		];

		// Get the list of possible first lexical tokens.
		// Each lexical token is mapped to the new stack entries that
		// would need to be created.
		// For example `<` might be within `TAG` which is within `EXPRESSION`
		var lexPossibilities = parser.getLexPossibilities(nextTokenIndex(expressionStack[0]));

		// Get the matching lexical token, and the corresponding stack entries that need to be created.
		var lexMatch = parser.getLexMatch(text, lexPossibilities, index);

		// Update the stack with them
		parser.updateStack(expressionStack, lexMatch);


		callback(copyMatch(lexMatch), {
			start: lexMatch.expressions,
			end: []
		}, expressionStack);
		// console.log("  after stack ",  JSON.stringify(expressionStack));

		// While we have a match, keep parsing!
		while(lexMatch) {
			recurseCount++;
			if(recurseCount >= 500) {
				return;
			}

			endedExpressions = [];
			// Update text to the remainder to be parsed.
			text = text.substr(lexMatch.match.length);
			// console.log(text);
			index += lexMatch.match.length;
			// Start at the bottom of the stack, get the next lexical tokens that we might match
			// And see if we match them.
			// If the current expression has COMPLETED, we try the next item up the stack.
			var newLexMatch = eachBackwardsBreak(expressionStack, function(stackExpression){

				// Get the next lexical tokens
				var lexToNextExpressions = parser.getLexPossibilities(nextTokenIndex(stackExpression));
				//console.log("    getLexPossibilities",JSON.stringify(stackExpression),  lexToNextExpressions);

				// Get the lexical token that matches the start of `text`.
				var lexMatch = parser.getLexMatch(text, lexToNextExpressions, index);

				// If there isn't one, this means there's a parsing error.
				if(!lexMatch) {
					throw new Error("couldn't find a match for "+
						JSON.stringify(nextTokenIndex(stackExpression))+" on "+text.substr(0,20));
				}

				// If there were no lexical matches, but the current expression is complete,
				// We pop the stack and try the next item in the stack.
				if( lexMatch.lex === "EXPRESSION_COMPLETED" ) {
					// update the ruleIndexes with the rule that actually completed
					var last = expressionStack.pop();
					last.ruleIndexes = lexMatch.expressions[0].ruleIndexes;
					endedExpressions.push( last );
					return;
				} else {
					return lexMatch;
				}
			});
			// console.log("  lexMatch", JSON.stringify(newLexMatch));
			// console.log("  before stack", JSON.stringify(expressionStack));

			// If we got a lexMatch
			if(newLexMatch) {
				// update the stack with it.
				var startedExpressions = parser.updateStack(expressionStack, newLexMatch);

				// If it is the last of an expression, pop the stack.
				if(parser.isLastMatch(last(expressionStack) )) {
					endedExpressions.push( expressionStack.pop() );
				}
				callback(copyMatch(newLexMatch), {
					end: endedExpressions,
					start: startedExpressions
				}, expressionStack);
				//console.log("  after stack ",  JSON.stringify(expressionStack));
			}

			lexMatch = newLexMatch;

		}
		callback({lex: null, token: null, match: null, index: index}, {
			end: endedExpressions
		}, expressionStack);
	};


	// Given a stack expression like:
	// `{expression: "TAG", ruleIndexes: [2,3], tokenIndex: 3}`
	// Returns a map of each possible lexical token to the `expressions`
	// that contain those lexical tokens.  For example:
	// `{"<": [ {expression: "Tag", ruleIndexes: [1,2,3]}, ...], ... }`
	//
	// This is a recursive function that will:
	//  - Walk down the expression tree
	//  - Find the lexes at the bottom of the tree.
	//  - Build up the final result from the bottom up.
	parser.getLexPossibilities = function(stackExpression){
		recurseCount++;
		if(recurseCount > 500) {
			console.warn("too much recursion");
			return;
		}

		// Lexes for the current stack expression.
		var expressionLexes = {};

		// A map of which rules had a given token. Different rules for an expression
		// can have the same tokens in the same place.  For example:
		// TAG: [
		//   ["<","TAGNAME",">"],
		//   ["<","TAGNAME","/>"],
		// ]
		var subExpressionRules = {}; //{ATTRS: [4,5]}

		// For each of the rules in the expression we are trying to get a lexical token for ...
		stackExpression.ruleIndexes.forEach(function(index){

			// Look up the token in that spot.
			var token = grammar.tree[stackExpression.expression][index][stackExpression.tokenIndex];


			if(!token) {
				// If there is no token,
				// this might be a "EXPRESSION_COMPLETED" token.
				if(grammar.tree[stackExpression.expression][index].length === stackExpression.tokenIndex) {
					token = "EXPRESSION_COMPLETED";
				} else {
					throw new Error("Expression "+stackExpression.expression+", Rule: "+index+" has no futher tokens");
				}
			}

			// Add this rule to the map of tokens to rules.
			if(!subExpressionRules[token]) {
				subExpressionRules[token] = [];
			}
			subExpressionRules[token].push(index);


			// If the token is a lexical token (or a COMPLETED rule), add this expression.
			if(grammar.lex[token] || token === "EXPRESSION_COMPLETED") {
				expressionLexes[token] = [{expression: stackExpression.expression, ruleIndexes: subExpressionRules[token] }];
			}
			// We only need to process a token's children once.  So
			// We make sure this is the first time seeing that token.
			else if( subExpressionRules[token].length === 1 ) {

				// Recurse to get all the lexes for this token.
				var lexes = parser.getLexPossibilities({
					expression: token,
					ruleIndexes: numberKeys(grammar.tree[token]),
					tokenIndex: 0
				});

				// Add those lexes to this list of possibilities.
				each(lexes, function(subExpressionAndRules, lex){
					subExpressionAndRules = subExpressionAndRules.slice(0);

					// Add this expression so we know this lex is within this expression.
					subExpressionAndRules.unshift({expression: stackExpression.expression, ruleIndexes: subExpressionRules[token]});
					expressionLexes[lex] = subExpressionAndRules;
				});
			}
		});

		return expressionLexes;
	};


	// Given the list of lexical tokens,
	// try each one against `text` and see which one matches.
	// If none match, and there's an `EXPRESSION_COMPLETED` possibility,
	// return that.
	parser.getLexMatch = function(text, lexPossibilities, index) {
		var EXPRESSION_COMPLETED;
		var lexMatch = eachBreak(lexPossibilities, function(expressions, lexKey){
			if(lexKey === "EXPRESSION_COMPLETED") {
				EXPRESSION_COMPLETED = {
					expressions: expressions,
					lex: lexKey,
					index: index
				};
				return; // keep checking
			}
			var result = grammar.lex[lexKey].exec(text);
			if(result) {

				return {
					match: result[0],
					expressions: expressions,
					lex: lexKey,
					index: index
				};
			}
		});
		if(lexMatch) {
			return lexMatch;
		} else {
			return EXPRESSION_COMPLETED;
		}
	};

	// Updates the stack given the new lexical match.
	parser.updateStack = function(stack, lexMatch) {
		var topOfStack = last(stack);
		var lastRule = last(lexMatch.expressions);
		var startedExpressions = [];

		// If the lexMatch was the same as the current item in the stack,
		// move the stack to the new tokenIndex.
		if(lastRule.expression === topOfStack.expression) {
			topOfStack.ruleIndexes = lastRule.ruleIndexes;
			topOfStack.tokenIndex++;


		} else {


			var firstMatchExpression = lexMatch.expressions[0];

			// If the lexMatch adds to the stack, it's first expression will be the same as the
			// current item in the stack.
			if(firstMatchExpression.expression === topOfStack.expression && lexMatch.expressions.length > 1) {
				// Move teh top of the stack along.
				topOfStack.ruleIndexes = firstMatchExpression.ruleIndexes;
				topOfStack.tokenIndex++;

				// Add the other expressions into the stack.
				for(var i = 1; i < lexMatch.expressions.length; i++) {
					var expr = lexMatch.expressions[i];
					stack.push({expression: expr.expression,ruleIndexes: expr.ruleIndexes, tokenIndex: 0});
					startedExpressions.push({expression: expr.expression,ruleIndexes: expr.ruleIndexes});
				}
			} else {
				// we probably popped the stack
			}
		}
		return startedExpressions;
	};

	// Given a stack item, return true if its `tokenIndex`
	// is at the last token for its given rules.
	parser.isLastMatch = function(stackExpression){
		var expressionName = stackExpression.expression;
		var expressionRulesIndexes = stackExpression.ruleIndexes;

		// There has to have been a match, and only one expressionRule index could match for us to end it.
		// Something might be wrong if it should be a last match, but there are other matches.
		if(expressionRulesIndexes.length === 1) {
			var ruleIndex = expressionRulesIndexes[0];
			var ruleTokens = grammar.tree[expressionName][ruleIndex];
			return ruleTokens.length === stackExpression.tokenIndex + 1;

		}
		return false;
	};

	return parser;

}

module.exports = makeParser;
