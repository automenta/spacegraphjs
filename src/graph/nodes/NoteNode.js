import { Utils } from '../../utils.js';
import { HtmlNode } from './HtmlNode.js';

export class NoteNode extends HtmlNode {
    constructor(id, pos, data = { content: '' }) {
        super(id, pos, Utils.mergeDeep({ type: 'note', editable: true }, data));
    }
}
