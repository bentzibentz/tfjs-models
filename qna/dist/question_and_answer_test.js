"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
var tfconv = require("@tensorflow/tfjs-converter");
var tf = require("@tensorflow/tfjs-core");
require("@tensorflow/tfjs-backend-cpu");
var jasmine_util_1 = require("@tensorflow/tfjs-core/dist/jasmine_util");
require("jasmine");
var index_1 = require("./index");
jasmine_util_1.describeWithFlags('qna', jasmine_util_1.NODE_ENVS, function () {
    var model;
    var executeSpy;
    beforeEach(function () {
        spyOn(tfconv, 'loadGraphModel').and.callFake(function (modelUrl) {
            model = new tfconv.GraphModel(modelUrl);
            executeSpy = spyOn(model, 'execute')
                .and.callFake(function (x) {
                return [tf.tensor2d(__spreadArrays([
                        0, 0, 0, 0, 10, 20, 30, 20, 10, 0
                    ], Array(374).fill(0)), [1, 384]),
                    tf.tensor2d(__spreadArrays([
                        0, 0, 0, 0, 10, 20, 30, 20, 10, 20
                    ], Array(374).fill(0)), [1, 384])];
            });
            return Promise.resolve(model);
        });
    });
    it('qna detect method should not leak', function () { return __awaiter(void 0, void 0, void 0, function () {
        var qna, numOfTensorsBefore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load()];
                case 1:
                    qna = _a.sent();
                    numOfTensorsBefore = tf.memory().numTensors;
                    return [4 /*yield*/, qna.findAnswers('question', 'context')];
                case 2:
                    _a.sent();
                    expect(tf.memory().numTensors).toEqual(numOfTensorsBefore);
                    return [2 /*return*/];
            }
        });
    }); });
    it('qna detect method should generate output', function () { return __awaiter(void 0, void 0, void 0, function () {
        var qna, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load()];
                case 1:
                    qna = _a.sent();
                    return [4 /*yield*/, qna.findAnswers('question', 'context')];
                case 2:
                    data = _a.sent();
                    expect(data).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    it('qna detect method should throw error if question is too long', function () { return __awaiter(void 0, void 0, void 0, function () {
        var qna, question, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load()];
                case 1:
                    qna = _a.sent();
                    question = 'question '.repeat(300);
                    result = undefined;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, qna.findAnswers(question, 'context')];
                case 3:
                    result = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    expect(error_1.message)
                        .toEqual('The length of question token exceeds the limit (64).');
                    return [3 /*break*/, 5];
                case 5:
                    expect(result).toBeUndefined();
                    return [2 /*return*/];
            }
        });
    }); });
    it('qna detect method should work for long context', function () { return __awaiter(void 0, void 0, void 0, function () {
        var qna, context, data;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load()];
                case 1:
                    qna = _a.sent();
                    context = 'text '.repeat(1000);
                    executeSpy.and.returnValue([tf.tensor2d(__spreadArrays([
                            0, 0, 0, 0, 10, 20, 30, 20, 10, 0
                        ], Array(384 * 6 - 10).fill(0)), [6, 384]),
                        tf.tensor2d(__spreadArrays([
                            0, 0, 0, 0, 10, 20, 30, 20, 10, 20
                        ], Array(384 * 6 - 10).fill(0)), [6, 384])]);
                    return [4 /*yield*/, qna.findAnswers('question', context)];
                case 2:
                    data = _a.sent();
                    expect(data.length).toEqual(5);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should allow custom model url', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load({ modelUrl: 'https://google.com/model.json' })];
                case 1:
                    _a.sent();
                    expect(tfconv.loadGraphModel)
                        .toHaveBeenCalledWith('https://google.com/model.json', { fromTFHub: false });
                    return [2 /*return*/];
            }
        });
    }); });
    it('should populate the startIndex and endIndex', function () { return __awaiter(void 0, void 0, void 0, function () {
        var qna, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, index_1.load()];
                case 1:
                    qna = _a.sent();
                    return [4 /*yield*/, qna.findAnswers('question', 'this is answer for you!')];
                case 2:
                    result = _a.sent();
                    expect(result).toEqual([
                        { text: 'answer', score: 60, startIndex: 8, endIndex: 14, context: 'this is answer for you!', id: 'xyz' },
                        { text: 'answer for', score: 50, startIndex: 8, endIndex: 18, context: 'this is answer for you!', id: 'xyz' },
                        { text: 'answer for you!', score: 50, startIndex: 8, endIndex: 23, context: 'this is answer for you!', id: 'xyz' },
                        { text: 'is answer', score: 50, startIndex: 5, endIndex: 14, context: 'this is answer for you!', id: 'xyz' },
                        { text: 'is', score: 40, startIndex: 5, endIndex: 7, context: 'this is answer for you!', id: 'xyz' }
                    ]);
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=question_and_answer_test.js.map