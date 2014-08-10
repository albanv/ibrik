(function() {
  var Instrumenter, coffee, crypto, escodegen, esprima, estraverse, fs, generateTrackerVar, istanbul, path,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  coffee = require('coffee-script');

  istanbul = require('istanbul');

  crypto = require('crypto');

  escodegen = require('escodegen');

  estraverse = require('estraverse');

  esprima = require('esprima');

  path = require('path');

  fs = require('fs');

  generateTrackerVar = function(filename, omitSuffix) {
    var hash, suffix;
    if (omitSuffix) {
      return '__cov_';
    }
    hash = crypto.createHash('md5');
    hash.update(filename);
    suffix = hash.digest('base64');
    suffix = suffix.replace(/\=/g, '').replace(/\+/g, '_').replace(/\//g, '$');
    return "__cov_" + suffix;
  };

  Instrumenter = (function(_super) {
    __extends(Instrumenter, _super);

    function Instrumenter(opt) {
      istanbul.Instrumenter.call(this, opt);
    }

    Instrumenter.prototype.instrumentSync = function(code, filename) {
      var codegenOptions, e, program;
      filename = filename || ("" + (Date.now()) + ".js");
      this.coverState = {
        path: filename,
        s: {},
        b: {},
        f: {},
        fnMap: {},
        statementMap: {},
        branchMap: {}
      };
      this.currentState = {
        trackerVar: generateTrackerVar(filename, this.omitTrackerSuffix),
        func: 0,
        branch: 0,
        variable: 0,
        statement: 0
      };
      if (typeof code !== 'string') {
        throw new Error('Code must be string');
      }
      try {
        code = coffee.compile(code, {
          sourceMap: true
        });
        program = esprima.parse(code.js, {
          loc: true
        });
        this.attachLocation(program, code.sourceMap);
      } catch (_error) {
        e = _error;
        e.message = "Error compiling " + filename + ": " + e.message;
        throw e;
      }
      this.walker.startWalk(program);
      codegenOptions = this.opts.codeGenerationOptions || {
        format: {
          compact: !this.opts.noCompact
        }
      };
      return "" + (this.getPreamble(code)) + "\n" + (escodegen.generate(program, codegenOptions)) + "\n";
    };

    Instrumenter.prototype.include = function(filename) {
      var code;
      filename = path.resolve(filename);
      code = fs.readFileSync(filename, 'utf8');
      this.instrumentSync(code, filename);
      eval("" + (this.getPreamble(null)));
    };

    Instrumenter.prototype.attachLocation = function(program, sourceMap) {
      return estraverse.traverse(program, {
        leave: function(node, parent) {
          var mappedLocation, _ref, _ref1;
          mappedLocation = function(location) {
            var column, line, locArray;
            locArray = sourceMap.sourceLocation([location.line - 1, location.column]);
            line = 0;
            column = 0;
            if (locArray) {
              line = locArray[0] + 1;
              column = locArray[1];
            }
            return {
              line: line,
              column: column
            };
          };
          if ((_ref = node.loc) != null ? _ref.start : void 0) {
            node.loc.start = mappedLocation(node.loc.start);
          }
          if ((_ref1 = node.loc) != null ? _ref1.end : void 0) {
            node.loc.end = mappedLocation(node.loc.end);
          }
        }
      });
    };

    return Instrumenter;

  })(istanbul.Instrumenter);

  module.exports = Instrumenter;

}).call(this);
