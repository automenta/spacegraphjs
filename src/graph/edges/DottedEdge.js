import {Edge} from './Edge.js';
import {Utils} from '../../utils.js';

export class DottedEdge extends Edge {
    static typeName = 'dotted';

    constructor(id, sourceNode, targetNode, data = {}) {
        const dottedData = Utils.mergeDeep({
            dashed: true,
            dashScale: data.dashScale ?? 1, // User can still override
            dashSize: data.dashSize ?? 1,   // Small dash for dot appearance
            gapSize: data.gapSize ?? 2,    // Larger gap for dot appearance
            thickness: data.thickness ?? 2, // Dotted lines often look better a bit thinner
        }, data);

        super(id, sourceNode, targetNode, dottedData);
    }

    // Most functionality is inherited from Edge.js
    // Update will correctly use the dashed properties.
}
