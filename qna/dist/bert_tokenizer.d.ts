export declare const UNK_INDEX = 100;
export declare const CLS_INDEX = 101;
export declare const CLS_TOKEN = "[CLS]";
export declare const SEP_INDEX = 102;
export declare const SEP_TOKEN = "[SEP]";
export declare const NFKC_TOKEN = "NFKC";
export declare const VOCAB_BASE = "https://tfhub.dev/tensorflow/tfjs-model/mobilebert/1/";
export declare const VOCAB_URL: string;
export interface Token {
    text: string;
    index: number;
}
/**
 * Tokenizer for Bert.
 */
export declare class BertTokenizer {
    private vocab;
    private trie;
    /**
     * Load the vacabulary file and initialize the Trie for lookup.
     */
    load(): Promise<void>;
    private loadVocab;
    processInput(text: string): Token[];
    private cleanText;
    private runSplitOnPunc;
    /**
     * Generate tokens for the given vocalbuary.
     * @param text text to be tokenized.
     */
    tokenize(text: string): number[];
}
export declare function loadTokenizer(): Promise<BertTokenizer>;
