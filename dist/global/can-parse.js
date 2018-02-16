/*[global-shim-start]*/
(function(exports, global, doEval){ // jshint ignore:line
	var origDefine = global.define;

	var get = function(name){
		var parts = name.split("."),
			cur = global,
			i;
		for(i = 0 ; i < parts.length; i++){
			if(!cur) {
				break;
			}
			cur = cur[parts[i]];
		}
		return cur;
	};
	var set = function(name, val){
		var parts = name.split("."),
			cur = global,
			i, part, next;
		for(i = 0; i < parts.length - 1; i++) {
			part = parts[i];
			next = cur[part];
			if(!next) {
				next = cur[part] = {};
			}
			cur = next;
		}
		part = parts[parts.length - 1];
		cur[part] = val;
	};
	var useDefault = function(mod){
		if(!mod || !mod.__esModule) return false;
		var esProps = { __esModule: true, "default": true };
		for(var p in mod) {
			if(!esProps[p]) return false;
		}
		return true;
	};
	var modules = (global.define && global.define.modules) ||
		(global._define && global._define.modules) || {};
	var ourDefine = global.define = function(moduleName, deps, callback){
		var module;
		if(typeof deps === "function") {
			callback = deps;
			deps = [];
		}
		var args = [],
			i;
		for(i =0; i < deps.length; i++) {
			args.push( exports[deps[i]] ? get(exports[deps[i]]) : ( modules[deps[i]] || get(deps[i]) )  );
		}
		// CJS has no dependencies but 3 callback arguments
		if(!deps.length && callback.length) {
			module = { exports: {} };
			var require = function(name) {
				return exports[name] ? get(exports[name]) : modules[name];
			};
			args.push(require, module.exports, module);
		}
		// Babel uses the exports and module object.
		else if(!args[0] && deps[0] === "exports") {
			module = { exports: {} };
			args[0] = module.exports;
			if(deps[1] === "module") {
				args[1] = module;
			}
		} else if(!args[0] && deps[0] === "module") {
			args[0] = { id: moduleName };
		}

		global.define = origDefine;
		var result = callback ? callback.apply(null, args) : undefined;
		global.define = ourDefine;

		// Favor CJS module.exports over the return value
		result = module && module.exports ? module.exports : result;
		modules[moduleName] = result;

		// Set global exports
		var globalExport = exports[moduleName];
		if(globalExport && !get(globalExport)) {
			if(useDefault(result)) {
				result = result["default"];
			}
			set(globalExport, result);
		}
	};
	global.define.orig = origDefine;
	global.define.modules = modules;
	global.define.amd = true;
	ourDefine("@loader", [], function(){
		// shim for @@global-helpers
		var noop = function(){};
		return {
			get: function(){
				return { prepareGlobal: noop, retrieveGlobal: noop };
			},
			global: global,
			__exec: function(__load){
				doEval(__load.source, global);
			}
		};
	});
}
)({},window,function(__$source__, __$global__) { // jshint ignore:line
	eval("(function() { " + __$source__ + " \n }).call(__$global__);");
}
)
/*can-parse@0.0.2#can-parse*/
define('can-parse', function (require, exports, module) {
    var each = require('can-util/js/each/each');
    var last = require('can-util/js/last/last');
    var deepAssign = require('can-util/js/deep-assign/deep-assign');
    var eachBreak = function (obj, callback) {
        for (var prop in obj) {
            var res = callback(obj[prop], prop);
            if (res !== undefined) {
                return res;
            }
        }
    };
    function numberKeys(obj) {
        return Object.keys(obj).map(function (num) {
            return +num;
        });
    }
    function nextTokenIndex(stackExpression) {
        return {
            expression: stackExpression.expression,
            ruleIndexes: stackExpression.ruleIndexes,
            tokenIndex: stackExpression.tokenIndex + 1
        };
    }
    function copyMatch(match) {
        return {
            lex: match.lex,
            match: match.match,
            index: match.index
        };
    }
    var prettyLexmatch = function (lexMatch) {
        if (!lexMatch) {
            return lexMatch;
        }
        return lexMatch.lex + ' in ' + lexMatch.expressions.map(function (expression) {
            return expression.expression;
        }).join(',');
    };
    function makeParser(grammar) {
        var recurseCount = 0;
        var parser = function (text, callback) {
            recurseCount = 0;
            var currentBranch = {
                index: 0,
                endedExpressions: [],
                expressionStack: [],
                stackDepth: 0,
                text: text,
                callbacks: []
            };
            var branches = parser.getNextBranches(currentBranch);
            while (branches.length) {
                recurseCount++;
                if (recurseCount >= 500) {
                    return;
                }
                currentBranch = branches.pop();
                var result = parser.processBranch(currentBranch);
                if (result) {
                    console.log('BACKTRACKING');
                } else {
                    var newBranches = parser.getNextBranches(currentBranch);
                    if (newBranches === null) {
                        break;
                    }
                    branches.push.apply(branches, newBranches);
                }
            }
            currentBranch.callbacks.forEach(function (args) {
                callback.apply(null, args);
            });
            callback({
                lex: null,
                token: null,
                match: null,
                index: currentBranch.index
            }, { end: currentBranch.endedExpressions }, currentBranch.expressionStack);
        };
        parser.getNextBranches = function (branch) {
            var stackExpression;
            if (branch.expressionStack.length) {
                stackExpression = branch.expressionStack[branch.stackDepth];
            } else {
                if (!branch.text) {
                    return null;
                } else {
                    stackExpression = {
                        expression: 'EXPRESSION',
                        ruleIndexes: numberKeys(grammar.tree.EXPRESSION),
                        tokenIndex: -1
                    };
                }
            }
            var lexToNextExpressions = parser.getLexPossibilities(nextTokenIndex(stackExpression));
            var lexMatches = parser.getLexMatches(branch.text, lexToNextExpressions, branch.index);
            var branches;
            if (!lexMatches) {
                branch.lexMatch = null;
                return [branch];
            } else if (lexMatches.expressions.length > 1) {
                branches = lexMatches.expressions.map(function (expressions, i) {
                    var lexMatch = copyMatch(lexMatches);
                    lexMatch.expressions = expressions;
                    var branchCopy = i === 0 ? branch : deepAssign({}, branch);
                    branch.lexMatch = lexMatch;
                    return branchCopy;
                });
            } else {
                var lexMatch = copyMatch(lexMatches);
                lexMatch.expressions = lexMatches.expressions[0];
                branch.lexMatch = lexMatch;
                branches = [branch];
            }
            console.log('getNextBranches', branch.text.substr(0, 5), branches.map(function (branch) {
                return prettyLexmatch(branch.lexMatch);
            }));
            return branches;
        };
        parser.processBranch = function (branch) {
            if (branch.stackDepth >= 0) {
                if (!branch.lexMatch) {
                    branch.state = 'nomatch';
                    return branch;
                } else if (branch.lexMatch.lex === 'EXPRESSION_COMPLETED') {
                    var lastExpression = branch.expressionStack.pop();
                    lastExpression.ruleIndexes = branch.lexMatch.expressions[0].ruleIndexes;
                    branch.endedExpressions.push(lastExpression);
                    branch.stackDepth--;
                    return;
                } else {
                    var startedExpressions = parser.updateStack(branch.expressionStack, branch.lexMatch);
                    if (parser.isLastMatch(last(branch.expressionStack))) {
                        branch.endedExpressions.push(branch.expressionStack.pop());
                    }
                    branch.stackDepth = branch.expressionStack.length - 1;
                    branch.callbacks.push([
                        copyMatch(branch.lexMatch),
                        {
                            end: branch.endedExpressions,
                            start: startedExpressions
                        },
                        deepAssign({}, branch.expressionStack)
                    ]);
                    branch.endedExpressions = [];
                    branch.text = branch.text.substr(branch.lexMatch.match.length);
                    branch.index += branch.lexMatch.match.length;
                }
            } else {
                throw 'what happens here';
            }
        };
        parser.getLexPossibilities = function (stackExpression) {
            recurseCount++;
            if (recurseCount > 500) {
                console.warn('too much recursion');
                return;
            }
            var expressionLexes = {};
            var subExpressionRules = {};
            stackExpression.ruleIndexes.forEach(function (index) {
                var token = grammar.tree[stackExpression.expression][index][stackExpression.tokenIndex];
                if (!token) {
                    if (grammar.tree[stackExpression.expression][index].length === stackExpression.tokenIndex) {
                        token = 'EXPRESSION_COMPLETED';
                    } else {
                        throw new Error('Expression ' + stackExpression.expression + ', Rule: ' + index + ' has no futher tokens');
                    }
                }
                if (!subExpressionRules[token]) {
                    subExpressionRules[token] = [];
                }
                subExpressionRules[token].push(index);
                if (grammar.lex[token] || token === 'EXPRESSION_COMPLETED') {
                    expressionLexes[token] = [[{
                                expression: stackExpression.expression,
                                ruleIndexes: subExpressionRules[token],
                                tokenIndex: stackExpression.tokenIndex
                            }]];
                } else if (subExpressionRules[token].length === 1) {
                    var lexes = parser.getLexPossibilities({
                        expression: token,
                        ruleIndexes: numberKeys(grammar.tree[token]),
                        tokenIndex: 0
                    });
                    each(lexes, function (subExpressionAndRules, lex) {
                        each(subExpressionAndRules, function (subExpressionAndRules) {
                            subExpressionAndRules = subExpressionAndRules.slice(0);
                            subExpressionAndRules.unshift({
                                expression: stackExpression.expression,
                                ruleIndexes: subExpressionRules[token],
                                tokenIndex: 0
                            });
                            if (!expressionLexes[lex]) {
                                expressionLexes[lex] = [];
                            }
                            expressionLexes[lex].push(subExpressionAndRules);
                        });
                    });
                }
            });
            return expressionLexes;
        };
        parser.getLexMatches = function (text, lexPossibilities, index) {
            var EXPRESSION_COMPLETED;
            var lexMatch = eachBreak(lexPossibilities, function (expressions, lexKey) {
                if (lexKey === 'EXPRESSION_COMPLETED') {
                    EXPRESSION_COMPLETED = {
                        expressions: expressions,
                        lex: lexKey,
                        index: index
                    };
                    return;
                }
                var result = grammar.lex[lexKey].exec(text);
                if (result) {
                    return {
                        match: result[0],
                        expressions: expressions,
                        lex: lexKey,
                        index: index
                    };
                }
            });
            if (lexMatch) {
                return lexMatch;
            } else {
                return EXPRESSION_COMPLETED;
            }
        };
        parser.updateStack = function (stack, lexMatch) {
            var startedExpressions = [];
            var i, expr;
            if (stack.length === 0) {
                for (i = 0; i < lexMatch.expressions.length; i++) {
                    expr = lexMatch.expressions[i];
                    stack.push({
                        expression: expr.expression,
                        ruleIndexes: expr.ruleIndexes,
                        tokenIndex: 0
                    });
                    startedExpressions.push({
                        expression: expr.expression,
                        ruleIndexes: expr.ruleIndexes
                    });
                }
                return startedExpressions;
            }
            var topOfStack = last(stack);
            var lastRule = last(lexMatch.expressions);
            if (lastRule.expression === topOfStack.expression) {
                topOfStack.ruleIndexes = lastRule.ruleIndexes;
                topOfStack.tokenIndex = lastRule.tokenIndex;
            } else {
                var firstMatchExpression = lexMatch.expressions[0];
                if (firstMatchExpression.expression === topOfStack.expression && lexMatch.expressions.length > 1) {
                    topOfStack.ruleIndexes = firstMatchExpression.ruleIndexes;
                    topOfStack.tokenIndex++;
                    for (i = 1; i < lexMatch.expressions.length; i++) {
                        expr = lexMatch.expressions[i];
                        stack.push({
                            expression: expr.expression,
                            ruleIndexes: expr.ruleIndexes,
                            tokenIndex: 0
                        });
                        startedExpressions.push({
                            expression: expr.expression,
                            ruleIndexes: expr.ruleIndexes
                        });
                    }
                } else {
                }
            }
            return startedExpressions;
        };
        parser.isLastMatch = function (stackExpression) {
            var expressionName = stackExpression.expression;
            var expressionRulesIndexes = stackExpression.ruleIndexes;
            if (expressionRulesIndexes.length === 1) {
                var ruleIndex = expressionRulesIndexes[0];
                var ruleTokens = grammar.tree[expressionName][ruleIndex];
                return ruleTokens.length === stackExpression.tokenIndex + 1;
            }
            return false;
        };
        return parser;
    }
    module.exports = makeParser;
});
/*[global-shim-end]*/
(function(){ // jshint ignore:line
	window._define = window.define;
	window.define = window.define.orig;
}
)();