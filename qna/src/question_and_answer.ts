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
import * as tfconv from '@tensorflow/tfjs-converter';
import * as tf from '@tensorflow/tfjs-core';

import {BertTokenizer, CLS_INDEX, loadTokenizer, SEP_INDEX, Token} from './bert_tokenizer';

const MODEL_URL = 'https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1';
const INPUT_SIZE = 384;
const MAX_ANSWER_LEN = 32;
const MAX_QUERY_LEN = 64;
const MAX_SEQ_LEN = 384;
const PREDICT_ANSWER_NUM = 5;
const OUTPUT_OFFSET = 1;
// This is threshold value for determining if a question is irrelevant to the
// context. This value comes from the QnA model, and is generated by the
// training process based on the SQUaD 2.0 dataset.
const NO_ANSWER_THRESHOLD = 4.3980759382247925;

export interface QuestionAndAnswer {
  /**
   * Given the question and context, find the best answers.
   * @param question the question to find answers for.
   * @param context context where the answers are looked up from.
   * @return array of answers
   */
  findAnswers(question: string, context: string): Promise<Answer[]>;
}

/**
 * MobileBert model loading is configurable using the following config
 * dictionary.
 *
 * `modelUrl`: An optional string that specifies custom url of the model. This
 * is useful for area/countries that don't have access to the model hosted on
 * GCP.
 */
export interface ModelConfig {
  /**
   * An optional string that specifies custom url of the model. This
   * is useful for area/countries that don't have access to the model hosted on
   * GCP.
   */
  modelUrl: string;
  /**
   * Wheter the url is from tfhub.
   */
  fromTFHub?: boolean;
}

/**
 * Answer object returned by the model.
 * `text`: string, the text of the answer.
 * `startIndex`: number, the index of the starting character of the answer in
 *     the passage.
 * `endIndex`: number, index of the last character of the answer text.
 * `score`: number, indicates the confident
 * level.
 */
export interface Answer {
  text: string;
  startIndex: number;
  endIndex: number;
  score: number;
  context: string;
  id?: string;
}

interface Feature {
  inputIds: number[];
  inputMask: number[];
  segmentIds: number[];
  origTokens: Token[];
  tokenToOrigMap: {[key: number]: number};
}

interface AnswerIndex {
  start: number;
  end: number;
  score: number;
}

class QuestionAndAnswerImpl implements QuestionAndAnswer {
  private model: tfconv.GraphModel;
  private tokenizer: BertTokenizer;

  constructor(private modelConfig: ModelConfig) {
    if (this.modelConfig == null) {
      this.modelConfig = {modelUrl: MODEL_URL, fromTFHub: true};
    }
    if (this.modelConfig.fromTFHub == null) {
      this.modelConfig.fromTFHub = false;
    }
  }
  private process(
      query: string, context: string, maxQueryLen: number, maxSeqLen: number,
      docStride = 128): Feature[] {
    // always add the question mark to the end of the query.
    query = query.replace(/\?/g, '');
    query = query.trim();
    query = query + '?';

    const queryTokens = this.tokenizer.tokenize(query);
    if (queryTokens.length > maxQueryLen) {
      throw new Error(
          `The length of question token exceeds the limit (${maxQueryLen}).`);
    }

    const origTokens = this.tokenizer.processInput(context.trim());
    const tokenToOrigIndex: number[] = [];
    const allDocTokens: number[] = [];
    for (let i = 0; i < origTokens.length; i++) {
      const token = origTokens[i].text;
      const subTokens = this.tokenizer.tokenize(token);
      for (let j = 0; j < subTokens.length; j++) {
        const subToken = subTokens[j];
        tokenToOrigIndex.push(i);
        allDocTokens.push(subToken);
      }
    }
    // The -3 accounts for [CLS], [SEP] and [SEP]
    const maxContextLen = maxSeqLen - queryTokens.length - 3;

    // We can have documents that are longer than the maximum sequence
    // length. To deal with this we do a sliding window approach, where we
    // take chunks of the up to our max length with a stride of
    // `doc_stride`.
    const docSpans: Array<{start: number, length: number}> = [];
    let startOffset = 0;
    while (startOffset < allDocTokens.length) {
      let length = allDocTokens.length - startOffset;
      if (length > maxContextLen) {
        length = maxContextLen;
      }
      docSpans.push({start: startOffset, length});
      if (startOffset + length === allDocTokens.length) {
        break;
      }
      startOffset += Math.min(length, docStride);
    }

    const features = docSpans.map(docSpan => {
      const tokens = [];
      const segmentIds = [];
      const tokenToOrigMap: {[index: number]: number} = {};
      tokens.push(CLS_INDEX);
      segmentIds.push(0);
      for (let i = 0; i < queryTokens.length; i++) {
        const queryToken = queryTokens[i];
        tokens.push(queryToken);
        segmentIds.push(0);
      }
      tokens.push(SEP_INDEX);
      segmentIds.push(0);
      for (let i = 0; i < docSpan.length; i++) {
        const splitTokenIndex = i + docSpan.start;
        const docToken = allDocTokens[splitTokenIndex];
        tokens.push(docToken);
        segmentIds.push(1);
        tokenToOrigMap[tokens.length] = tokenToOrigIndex[splitTokenIndex];
      }
      tokens.push(SEP_INDEX);
      segmentIds.push(1);
      const inputIds = tokens;
      const inputMask = inputIds.map(id => 1);
      while ((inputIds.length < maxSeqLen)) {
        inputIds.push(0);
        inputMask.push(0);
        segmentIds.push(0);
      }
      return {inputIds, inputMask, segmentIds, origTokens, tokenToOrigMap};
    });
    return features;
  }

  async load() {
    this.model = await tfconv.loadGraphModel(
        this.modelConfig.modelUrl, {fromTFHub: this.modelConfig.fromTFHub});
    // warm up the backend
    const batchSize = 1;
    const inputIds = tf.ones([batchSize, INPUT_SIZE], 'int32');
    const segmentIds = tf.ones([1, INPUT_SIZE], 'int32');
    const inputMask = tf.ones([1, INPUT_SIZE], 'int32');
    this.model.execute({
      input_ids: inputIds,
      segment_ids: segmentIds,
      input_mask: inputMask,
      global_step: tf.scalar(1, 'int32')
    });

    this.tokenizer = await loadTokenizer();
  }

  /**
   * Given the question and context, find the best answers.
   * @param question the question to find answers for.
   * @param context context where the answers are looked up from.
   * @param id? context id where the answers are looked up from.
   * @return array of answers
   */
  // tslint:disable-next-line:max-line-length
  async findAnswers(question: string, context: string, id?: string): Promise<Answer[]> {
    if (question == null || context == null) {
      throw new Error(
          'The input to findAnswers call is null, ' +
          'please pass a string as input.');
    }

    const features =
        this.process(question, context, MAX_QUERY_LEN, MAX_SEQ_LEN);
    const inputIdArray = features.map(f => f.inputIds);
    const segmentIdArray = features.map(f => f.segmentIds);
    const inputMaskArray = features.map(f => f.inputMask);
    const globalStep = tf.scalar(1, 'int32');
    const batchSize = features.length;
    const result = tf.tidy(() => {
      const inputIds =
          tf.tensor2d(inputIdArray, [batchSize, INPUT_SIZE], 'int32');
      const segmentIds =
          tf.tensor2d(segmentIdArray, [batchSize, INPUT_SIZE], 'int32');
      const inputMask =
          tf.tensor2d(inputMaskArray, [batchSize, INPUT_SIZE], 'int32');
      return this.model.execute(
                 {
                   input_ids: inputIds,
                   segment_ids: segmentIds,
                   input_mask: inputMask,
                   global_step: globalStep
                 },
                 ['start_logits', 'end_logits']) as [tf.Tensor2D, tf.Tensor2D];
    });
    const logits = await Promise.all([result[0].array(), result[1].array()]);
    // dispose all intermediate tensors
    globalStep.dispose();
    result[0].dispose();
    result[1].dispose();

    const answers = [];
    for (let i = 0; i < batchSize; i++) {
      answers.push(this.getBestAnswers(
          logits[0][i], logits[1][i], features[i].origTokens,
          features[i].tokenToOrigMap, context, i, id));
    }

    return answers.reduce((flatten, array) => flatten.concat(array), [])
        // @ts-ignore
        .sort((logitA, logitB) => logitB.score - logitA.score)
        .slice(0, PREDICT_ANSWER_NUM);
  }

  /**
   * Find the Best N answers & logits from the logits array and input feature.
   * @param startLogits start index for the answers
   * @param endLogits end index for the answers
   * @param origTokens original tokens of the passage
   * @param tokenToOrigMap token to index mapping
   */
  getBestAnswers(
      startLogits: number[], endLogits: number[], origTokens: Token[],
      tokenToOrigMap: {[key: string]: number}, context: string,
      docIndex = 0, id: string): Answer[] {
    // Model uses the closed interval [start, end] for indices.
    const startIndexes = this.getBestIndex(startLogits);
    const endIndexes = this.getBestIndex(endLogits);
    const origResults: AnswerIndex[] = [];
    startIndexes.forEach(start => {
      endIndexes.forEach(end => {
        // tslint:disable-next-line:max-line-length
        if (tokenToOrigMap[start + OUTPUT_OFFSET] && tokenToOrigMap[end + OUTPUT_OFFSET] && end >= start) {
          const length = end - start + 1;
          if (length < MAX_ANSWER_LEN) {
            origResults.push(
                {start, end, score: startLogits[start] + endLogits[end]});
          }
        }
      });
    });

    origResults.sort((a, b) => b.score - a.score);
    const answers: Answer[] = [];
    for (let i = 0; i < origResults.length; i++) {
      if (i >= PREDICT_ANSWER_NUM ||
          origResults[i].score < NO_ANSWER_THRESHOLD) {
        break;
      }

      let convertedText = '';
      let startIndex = 0;
      let endIndex = 0;
      if (origResults[i].start > 0) {
        [convertedText, startIndex, endIndex] = this.convertBack(
            origTokens, tokenToOrigMap, origResults[i].start,
            origResults[i].end, context);
      } else {
        convertedText = '';
      }
      answers.push({
        text: convertedText,
        score: origResults[i].score,
        startIndex,
        endIndex,
        context,
        id
      });
    }
    return answers;
  }

  /** Get the n-best logits from a list of all the logits. */
  getBestIndex(logits: number[]): number[] {
    const tmpList = [];
    for (let i = 0; i < MAX_SEQ_LEN; i++) {
      tmpList.push([i, i, logits[i]]);
    }
    tmpList.sort((a, b) => b[2] - a[2]);

    const indexes = [];
    for (let i = 0; i < PREDICT_ANSWER_NUM; i++) {
      indexes.push(tmpList[i][0]);
    }

    return indexes;
  }

  /** Convert the answer back to original text form. */
  convertBack(
      origTokens: Token[], tokenToOrigMap: {[key: string]: number},
      start: number, end: number, context: string): [string, number, number] {
    // Shifted index is: index of logits + offset.
    const shiftedStart = start + OUTPUT_OFFSET;
    const shiftedEnd = end + OUTPUT_OFFSET;
    const startIndex = tokenToOrigMap[shiftedStart];
    const endIndex = tokenToOrigMap[shiftedEnd];
    const startCharIndex = origTokens[startIndex].index;

    const endCharIndex = endIndex < origTokens.length - 1 ?
        origTokens[endIndex + 1].index - 1 :
        origTokens[endIndex].index + origTokens[endIndex].text.length;

    return [
      context.slice(startCharIndex, endCharIndex + 1).trim(), startCharIndex,
      endCharIndex
    ];
  }
}

export async function load(modelConfig?: ModelConfig):
    Promise<QuestionAndAnswer> {
  const mobileBert = new QuestionAndAnswerImpl(modelConfig);
  await mobileBert.load();
  return mobileBert;
}
