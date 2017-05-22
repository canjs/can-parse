var each = require("can-util/js/each/each");
var last = require("can-util/js/last/last");
var deepAssign = require("can-util/js/deep-assign/deep-assign");

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

		// when you have two ... you add a branch
		// if multiple options
		// create 3 branches
		// start moving on 1st ... record callbacks until you reach the "end" of the text
		// or you don't have a match anymore.  If you reached the end ... fire callbacks
		// if you didn't reach the end ... try next (up) branch


		// the number of other branches we can explore





		var currentBranch = {
			// the index of the lex token ... this probably needs to be reset for cycles ...
			index: 0,
			endedExpressions: [],

			// The `expressionStack` tracks the state of where we are in the grammar's
			// expression tree.
			// We keep each `expression`, which `rules` are available, and the last `token`
			// to be processed.
			expressionStack: [],
			// where in the stack we should check for matches
			stackDepth: 0,
			text: text,
			callbacks: []
		};
		var branches = parser.getNextBranches(currentBranch);
		while(branches.length) {
			recurseCount++;
			if(recurseCount >= 500) {
				return;
			}
			currentBranch = branches.pop();
			var result = parser.processBranch(currentBranch);
			if(result) {
				// found a path we can't fix ... backtrack
				console.log("BACKTRACKING");
			} else {
				var newBranches = parser.getNextBranches(currentBranch);
				if(newBranches === null) {
					break;
				}
				branches.push.apply(branches, newBranches);
			}

		}
		currentBranch.callbacks.forEach(function(args){
			callback.apply(null, args);
		});
		callback({lex: null, token: null, match: null, index: currentBranch.index}, {
			end: currentBranch.endedExpressions
		}, currentBranch.expressionStack);
		/*

		// Get the list of possible first lexical tokens.
		// Each lexical token is mapped to the new stack entries that
		// would need to be created.
		// For example `<` might be within `TAG` which is within `EXPRESSION`
		var lexPossibilities = parser.getLexPossibilities(nextTokenIndex(expressionStack[0]));

		// Get the matching lexical token, and the corresponding stack entries that need to be created.
		var lexMatch = parser.getLexMatches(text, lexPossibilities, index);

		if(lexMatch.expressions.length) {
			// BRANCH

			throw "branch";
		}

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
				var lexMatch = parser.getLexMatches(text, lexToNextExpressions, index);

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
		}, expressionStack);*/
	};

	// gets the next "branch" states that come after getting lex matches for this state
	parser.getNextBranches = function(branch){
		// if there's nothing in the stack, we start with EXPRESSIOn
		var stackExpression;
		if(branch.expressionStack.length) {
			stackExpression = branch.expressionStack[branch.stackDepth];
		} else {
			if(!branch.text) {
				// we've ended
				return null;
			} else {
				stackExpression = {
					// EXPRESSION is the starting point of the grammar.
					expression :"EXPRESSION",
					ruleIndexes: numberKeys(grammar.tree.EXPRESSION),
					// It starts at -1 because the `updateStack` will move it to 0.
					// Any future work in the "EXPRESSION" expression should then move on
					// to 1.
				 	tokenIndex: -1
				};
			}

		}


		var lexToNextExpressions = parser.getLexPossibilities(nextTokenIndex(stackExpression));


		// Get the lexical token that matches the start of `text`.
		var lexMatches = parser.getLexMatches(branch.text, lexToNextExpressions, branch.index);

		var branches;

		if(!lexMatches) {
			branch.lexMatch = null;
			return [branch];
		}else if(lexMatches.expressions.length > 1) {

			branches = lexMatches.expressions.map(function(expressions, i){
				var lexMatch = copyMatch(lexMatches);
				lexMatch.expressions = expressions;
				// don't copy branch unless we need to
				var branchCopy = i === 0 ?
					branch : deepAssign({}, branch);

				// TODO: .. object.create so we don't need to change everything?
				branch.lexMatch = lexMatch;
				return branchCopy;
			});
		} else {
			var lexMatch = copyMatch(lexMatches);
			lexMatch.expressions = lexMatches.expressions[0];
			branch.lexMatch = lexMatch;
			branches = [branch];
		}
		console.log("getNextBranches",branch.text.substr(0,5), branches.map(function(branch){
			return prettyLexmatch(branch.lexMatch);
		}));
		return branches;
	};
	var prettyLexmatch = function(lexMatch){
		if(!lexMatch) {
			return lexMatch;
		}
		return lexMatch.lex+" in "+lexMatch.expressions.map(function(expression){
			return expression.expression;
		}).join(",");
	};

	// this needs to return something that can get to `getNetBranchs`
	parser.processBranch = function(branch){
		console.log("processBranch", branch.stackDepth, prettyLexmatch(branch.lexMatch))
		// we are still walking up the stack
		if(branch.stackDepth >= 0) {
			// walk up the stack
			if( !branch.lexMatch ) {
				branch.state = "nomatch";
				return branch;
			} else 	if( branch.lexMatch.lex === "EXPRESSION_COMPLETED" ) {
				// update the ruleIndexes with the rule that actually completed
				var lastExpression = branch.expressionStack.pop();
				// as this is an expression complete, use the expression complete's ruleIndexes
				lastExpression.ruleIndexes = branch.lexMatch.expressions[0].ruleIndexes;
				branch.endedExpressions.push( lastExpression );
				branch.stackDepth--;
				// go to next step
				return;
			} else {
				// we have something else
				var startedExpressions = parser.updateStack(branch.expressionStack, branch.lexMatch);

				// If it is the last of an expression, pop the stack.
				if(parser.isLastMatch(last(branch.expressionStack) )) {
					branch.endedExpressions.push( branch.expressionStack.pop() );
				}
				// so we start at the next spot
				branch.stackDepth = branch.expressionStack.length - 1;

				// todo ... make this faster later
				branch.callbacks.push([
					copyMatch(branch.lexMatch),
					{
						end: branch.endedExpressions,
						start: startedExpressions
					},
					deepAssign({},branch.expressionStack)
				]);
				/*callback(copyMatch(branch.lexMatch), {
					end: branch.endedExpressions,
					start: startedExpressions
				}, branch.expressionStack);*/

				branch.endedExpressions = [];
				// Update text to the remainder to be parsed.
				branch.text = branch.text.substr(branch.lexMatch.match.length);
				// console.log(text);
				branch.index += branch.lexMatch.match.length;

			}
		} else {
			// reset ?
			debugger;
		}

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
				expressionLexes[token] = [[{expression: stackExpression.expression, ruleIndexes: subExpressionRules[token], tokenIndex: stackExpression.tokenIndex }]];
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
					each(subExpressionAndRules, function(subExpressionAndRules){
						subExpressionAndRules = subExpressionAndRules.slice(0);

						// Add this expression so we know this lex is within this expression.
						subExpressionAndRules.unshift({expression: stackExpression.expression, ruleIndexes: subExpressionRules[token], tokenIndex: 0});
						if(!expressionLexes[lex]) {
							expressionLexes[lex] = []
						}
						expressionLexes[lex].push(subExpressionAndRules);
					});
				});
			}
		});

		return expressionLexes;
	};


	// Given the list of lexical tokens,
	// try each one against `text` and see which one matches.
	// If none match, and there's an `EXPRESSION_COMPLETED` possibility,
	// return that.
	parser.getLexMatches = function(text, lexPossibilities, index) {
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
	// Returns the expressions that were added to the stack
	parser.updateStack = function(stack, lexMatch) {
		var startedExpressions = [];
		if(stack.length === 0 ) {
			// we're adding to the stack the entire lexmatch.expressions
			for(var i = 0; i < lexMatch.expressions.length; i++) {
				var expr = lexMatch.expressions[i];
				stack.push({expression: expr.expression,ruleIndexes: expr.ruleIndexes, tokenIndex: 0});
				startedExpressions.push({expression: expr.expression,ruleIndexes: expr.ruleIndexes});
			}
			return startedExpressions;
		}
		var topOfStack = last(stack);
		var lastRule = last(lexMatch.expressions);


		// If the lexMatch was the same as the current item in the stack,
		// move the stack to the new tokenIndex.
		if(lastRule.expression === topOfStack.expression) {
			topOfStack.ruleIndexes = lastRule.ruleIndexes;

			// stack points to where this rule is
			topOfStack.tokenIndex = lastRule.tokenIndex;


		} else {


			var firstMatchExpression = lexMatch.expressions[0];

			// If the lexMatch adds to the stack, it's first expression will be the same as the
			// current item in the stack.
			if(firstMatchExpression.expression === topOfStack.expression && lexMatch.expressions.length > 1) {
				// Move teh top of the stack along.
				topOfStack.ruleIndexes = firstMatchExpression.ruleIndexes;
				// stack points to where this rule is
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
