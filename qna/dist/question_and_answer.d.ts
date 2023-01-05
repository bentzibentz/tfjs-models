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
export declare function load(modelConfig?: ModelConfig): Promise<QuestionAndAnswer>;
