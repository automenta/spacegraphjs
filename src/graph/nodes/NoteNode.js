import {Utils} from '../../utils.js';
import {HtmlNode} from './HtmlNode.js';

export class NoteNode extends HtmlNode {
    static typeName = 'note';

    constructor(id, pos, data = {content: ''}) {
        super(id, pos, Utils.mergeDeep({type: NoteNode.typeName, editable: true}, data));
    }
}
